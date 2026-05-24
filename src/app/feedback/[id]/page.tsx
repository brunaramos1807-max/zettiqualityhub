'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { ArrowLeft, Download, Star, TrendingUp, TrendingDown, Users, MessageSquare, BarChart2, CheckCircle, AlertCircle, Eye, Maximize2, Minimize2, ChevronDown, ChevronUp, Award, Target, Clock, Shield, Zap, Activity, Grid } from 'lucide-react';
import Link from 'next/link';
import { exportFeedbackPDF, type FeedbackPDFData } from '@/lib/utils/pdfExport';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CriterioData {
  max?: number;
  pts: number;
  class?: string;
  evidencia?: string;
}

interface EvidenciaData {
  sup?: string;
  nota?: number;
  canal?: string;
  assunto?: string;
  cliente?: string;
  duracao?: string;
  sintese?: string;
  criterios?: Record<string, unknown>;
  ncs?: string[];
  tags?: string[];
  solucao?: string;
  comportamento?: string;
  observacao?: string;
  nota_iepc?: number;
  classificacao?: string;
}

interface Feedback {
  id: string;
  analista_id: string;
  ciclo: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  coordenador: string | null;
  equipe: string | null;
  qa_score: number | null;
  iepc_score: number | null;
  aderencia_score: number | null;
  posicao_squad: number | null;
  total_squad: number | null;
  ciclos_consecutivos_evolucao: number;
  pilares_qa: PilarItem[];
  pilares_iepc: PilarItem[];
  pontos_fortes: PontoItem[];
  oportunidades: PontoItem[];
  resumo_ciclo: string | null;
  evolucao_tecnica?: string | null;
  evolucao_comportamental?: string | null;
  risco_operacional?: string | null;
  tendencias: Record<string, unknown>;
  conquistas: ConquistaItem[];
  status: string;
  snapshot_json_completo?: Record<string, unknown> | null;
  analistas?: AnalistaInfo | null;
  feedback_atendimentos?: AtendimentoItem[];
  feedback_coaching?: CoachingItem[];
  feedback_pdi?: PdiItem[];
  nota_final_qa?: number | null;
  iepc_total?: number | null;
  total_ncs?: number | null;
  pontos_deduzidos_nc?: number | null;
  criterios?: Record<string, CriterioData> | null;
  evidencias?: EvidenciaData[] | null;
  sintese_ia?: string | null;
  reincidencia?: string | null;
  analista?: string | null;
  squad?: string | null;
  auditor?: string | null;
  periodo?: string | null;
}

interface AnalistaInfo {
  nome: string;
  nome_completo: string | null;
  cargo_operacional: string | null;
  equipe: string | null;
  coordenador: string | null;
  data_admissao: string | null;
  analista_id: string | null;
  foto_url?: string | null;
}

interface PilarItem { nome: string; pontuacao: number; max: number; variacao?: number; observacao?: string }
interface PontoItem { titulo: string; descricao: string }
interface ConquistaItem { titulo: string; valor: string; periodo?: string; icone?: string }
interface AtendimentoItem {
  id: string; protocolo: string; cliente: string; assunto: string;
  nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string;
  sup?: string; duracao?: string; canal?: string; solucao?: string; sintese?: string;
  comportamento?: string; criterios?: string[]; evidencias?: string; ncs?: string[]; tags?: string[];
  aderencia?: number;
  criterios_raw?: Record<string, unknown>;
}
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem {
  id: string; objetivo: string; acao_desenvolvimento: string; prazo: string;
  progresso: number; status: string; responsavel?: string; ciclo_origem?: string;
  evidencia?: string; ultima_atualizacao?: string;
}
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

// ─── Color palette — corporate/muted ─────────────────────────────────────────

const C = {
  bg: '#0a1628',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  borderAccent: 'rgba(99,130,191,0.25)',
  text: 'rgba(255,255,255,0.82)',
  textMuted: 'rgba(255,255,255,0.42)',
  textFaint: 'rgba(255,255,255,0.22)',
  blue: '#5B8DEF',
  blueLight: 'rgba(91,141,239,0.12)',
  blueBorder: 'rgba(91,141,239,0.25)',
  teal: '#4ECDC4',
  tealLight: 'rgba(78,205,196,0.1)',
  green: '#52B788',
  greenLight: 'rgba(82,183,136,0.1)',
  greenBorder: 'rgba(82,183,136,0.25)',
  amber: '#D4A853',
  amberLight: 'rgba(212,168,83,0.1)',
  amberBorder: 'rgba(212,168,83,0.25)',
  red: '#C0392B',
  redLight: 'rgba(192,57,43,0.1)',
  redBorder: 'rgba(192,57,43,0.25)',
  purple: '#8B7EC8',
  purpleLight: 'rgba(139,126,200,0.1)',
};

const PILAR_COLORS_QA = [C.blue, C.teal, C.purple, C.amber, C.green];
const PILAR_COLORS_IEPC = [C.teal, C.blue, C.purple, C.amber, C.green];

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: C.green,
  bom: C.blue,
  regular: C.amber,
  critico: C.red,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tempoDeEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const diff = Date.now() - new Date(dataAdmissao).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  if (years > 0) return `${years} ano${years !== 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`;
  return `${months} mês${months !== 1 ? 'es' : ''}`;
}

function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color?: string }) {
  const c = color || C.textMuted;
  return (
    <div className="flex items-center gap-2 mb-5">
      <span style={{ color: c }}>{icon}</span>
      <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: c }}>{title}</h3>
    </div>
  );
}

function CircleProgress({ value, color = C.green, size = 90 }: { value: number; color?: string; size?: number }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">{value}%</text>
    </svg>
  );
}

// ─── Criteria label map ───────────────────────────────────────────────────────

const CRITERIO_LABELS: Record<string, { label: string; group: 'qa' | 'iepc'; pilar?: string }> = {
  qa_atendimento_identificacao: { label: 'Identificação', group: 'qa', pilar: 'Pilar 1 — Atendimento' },
  qa_atendimento_encerramento: { label: 'Encerramento', group: 'qa', pilar: 'Pilar 1 — Atendimento' },
  qa_atendimento_comunicacaosup: { label: 'Comunicação SUP', group: 'qa', pilar: 'Pilar 1 — Atendimento' },
  qa_solucao_resolucao: { label: 'Resolução', group: 'qa', pilar: 'Pilar 2 — Solução' },
  qa_solucao_orientacao: { label: 'Orientação ao Cliente', group: 'qa', pilar: 'Pilar 2 — Solução' },
  qa_solucao_validacaoduvidas: { label: 'Validação de Dúvidas', group: 'qa', pilar: 'Pilar 2 — Solução' },
  qa_solucao_documentacao: { label: 'Documentação', group: 'qa', pilar: 'Pilar 2 — Solução' },
  qa_precisao_diagnostico: { label: 'Diagnóstico', group: 'qa', pilar: 'Pilar 3 — Precisão' },
  qa_precisao_ferramentas: { label: 'Uso de Ferramentas', group: 'qa', pilar: 'Pilar 3 — Precisão' },
  qa_comunicacao_tompostura: { label: 'Tom e Postura', group: 'qa', pilar: 'Pilar 4 — Comunicação' },
  qa_comunicacao_linguaportuguesa: { label: 'Língua Portuguesa', group: 'qa', pilar: 'Pilar 4 — Comunicação' },
  qa_comunicacao_clarezacontinuidade: { label: 'Clareza e Continuidade', group: 'qa', pilar: 'Pilar 4 — Comunicação' },
  qa_relacionamento_cordialidade: { label: 'Cordialidade', group: 'qa', pilar: 'Pilar 5 — Relacionamento' },
  qa_relacionamento_proatividade: { label: 'Proatividade', group: 'qa', pilar: 'Pilar 5 — Relacionamento' },
  qa_relacionamento_overdelivery: { label: 'Overdelivery', group: 'qa', pilar: 'Pilar 5 — Relacionamento' },
  iepc_resolucao_percebida: { label: 'Resolução Percebida', group: 'iepc', pilar: 'IEPC' },
  iepc_clareza_confianca: { label: 'Clareza e Confiança', group: 'iepc', pilar: 'IEPC' },
  iepc_esforco_cliente: { label: 'Esforço do Cliente', group: 'iepc', pilar: 'IEPC' },
  iepc_tempo_fluidez: { label: 'Tempo e Fluidez', group: 'iepc', pilar: 'IEPC' },
  iepc_experiencia_relacional: { label: 'Experiência Relacional', group: 'iepc', pilar: 'IEPC' },
};

// ─── Status badge helper ──────────────────────────────────────────────────────

function getStatusFromEvidence(evidencia: string | undefined, pts: number, max: number): 'aderido' | 'parcial' | 'nao_aderido' {
  if (!evidencia) {
    const pct = max > 0 ? pts / max : 0;
    if (pct >= 0.85) return 'aderido';
    if (pct >= 0.5) return 'parcial';
    return 'nao_aderido';
  }
  const ev = evidencia.toLowerCase();
  if (ev.includes('não aderido') || ev.includes('nao_pontuou') || ev.includes('0 aderidos')) return 'nao_aderido';
  if (ev.includes('parcial') || ev.includes('parciais')) return 'parcial';
  if (ev.includes('aderido') || ev.includes('aderidos')) return 'aderido';
  const pct = max > 0 ? pts / max : 0;
  if (pct >= 0.85) return 'aderido';
  if (pct >= 0.5) return 'parcial';
  return 'nao_aderido';
}

function StatusBadge({ status }: { status: 'aderido' | 'parcial' | 'nao_aderido' }) {
  const map = {
    aderido: { label: '🟢 Aderido', color: C.green, bg: C.greenLight, border: C.greenBorder },
    parcial: { label: '🟡 Parcial', color: C.amber, bg: C.amberLight, border: C.amberBorder },
    nao_aderido: { label: '🔴 Não Aderido', color: C.red, bg: C.redLight, border: C.redBorder },
  };
  const s = map[status];
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

// ─── 9-Box Matrix ─────────────────────────────────────────────────────────────

function NineBoxMatrix({ qaScore, iepcScore }: { qaScore: number; iepcScore: number }) {
  const xPct = Math.min(100, Math.max(0, iepcScore));
  const yPct = Math.min(100, Math.max(0, qaScore));
  const xCell = xPct >= 80 ? 2 : xPct >= 60 ? 1 : 0;
  const yCell = yPct >= 80 ? 2 : yPct >= 60 ? 1 : 0;

  const cells = [
    [
      { label: 'Acompanhamento', sub: 'Alto desempenho\nBaixa experiência', color: C.amber, bg: C.amberLight },
      { label: 'Evolução', sub: 'Alto desempenho\nMédia experiência', color: C.blue, bg: C.blueLight },
      { label: 'Destaque', sub: 'Alto desempenho\nAlta experiência', color: C.green, bg: C.greenLight },
    ],
    [
      { label: 'Atenção', sub: 'Médio desempenho\nBaixa experiência', color: C.red, bg: C.redLight },
      { label: 'Consistente', sub: 'Médio desempenho\nMédia experiência', color: C.purple, bg: C.purpleLight },
      { label: 'Evolução', sub: 'Médio desempenho\nAlta experiência', color: C.blue, bg: C.blueLight },
    ],
    [
      { label: 'Crítico', sub: 'Baixo desempenho\nBaixa experiência', color: C.red, bg: C.redLight },
      { label: 'Atenção', sub: 'Baixo desempenho\nMédia experiência', color: C.amber, bg: C.amberLight },
      { label: 'Acompanhamento', sub: 'Baixo desempenho\nAlta experiência', color: C.amber, bg: C.amberLight },
    ],
  ];

  const activeRow = 2 - yCell;
  const activeCol = xCell;
  const activeCell = cells[activeRow][activeCol];

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <SectionTitle icon={<Grid size={14} />} title="Matriz 9Box — People Analytics" color={C.purple} />
      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs font-bold" style={{ color: C.textFaint, writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginRight: '4px' }}>
              Performance / QA ↑
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-1.5">
                {cells.map((row, ri) =>
                  row.map((cell, ci) => {
                    const isActive = ri === activeRow && ci === activeCol;
                    return (
                      <div key={`${ri}-${ci}`}
                        className="rounded-lg p-3 text-center transition-all"
                        style={{
                          backgroundColor: isActive ? cell.bg : 'rgba(255,255,255,0.02)',
                          border: isActive ? `1.5px solid ${cell.color}` : `1px solid ${C.border}`,
                          minHeight: '72px',
                        }}>
                        <p className="text-xs font-bold mb-1" style={{ color: isActive ? cell.color : C.textFaint }}>
                          {cell.label}
                        </p>
                        <p className="text-xs leading-tight whitespace-pre-line" style={{ color: isActive ? C.textMuted : C.textFaint, fontSize: '9px' }}>
                          {cell.sub}
                        </p>
                        {isActive && (
                          <div className="mt-1.5 w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: cell.color }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between mt-1 px-1">
                <span style={{ color: C.textFaint, fontSize: '9px' }}>Baixa Experiência</span>
                <span style={{ color: C.textFaint, fontSize: '9px' }}>Comportamento / IEPC →</span>
                <span style={{ color: C.textFaint, fontSize: '9px' }}>Alta Experiência</span>
              </div>
            </div>
          </div>
        </div>
        <div className="w-40 rounded-xl p-4 text-center flex-shrink-0"
          style={{ backgroundColor: activeCell.bg, border: `1px solid ${activeCell.color}40` }}>
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: C.textFaint }}>Classificação</p>
          <p className="text-lg font-bold mb-3" style={{ color: activeCell.color }}>{activeCell.label}</p>
          <div className="space-y-2">
            <div className="rounded-lg p-2" style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
              <p className="text-xs" style={{ color: C.textFaint }}>QA</p>
              <p className="text-base font-bold" style={{ color: C.blue }}>{qaScore}</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}` }}>
              <p className="text-xs" style={{ color: C.textFaint }}>IEPC</p>
              <p className="text-base font-bold" style={{ color: C.green }}>{iepcScore}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Deep Operational Accordion ──────────────────────────────────────────────

function AtendimentoAccordion({
  atendimento,
  index,
  globalCriterios,
}: {
  atendimento: AtendimentoItem;
  index: number;
  globalCriterios?: Record<string, CriterioData>;
}) {
  const [open, setOpen] = useState(false);
  const classColor = CLASSIFICACAO_COLORS[atendimento.classificacao?.toLowerCase()] || C.textMuted;

  // Build per-attendance criteria from criterios_raw or global criterios
  const rawCriterios: Record<string, CriterioData> =
    (atendimento.criterios_raw as Record<string, CriterioData>) ||
    globalCriterios ||
    {};

  const criterioEntries = Object.entries(rawCriterios).map(([key, val]) => {
    const v = val as CriterioData;
    const info = CRITERIO_LABELS[key] || { label: key, group: 'qa' as const, pilar: 'Outros' };
    const maxVal = v.max && v.max > 0 ? v.max : 20;
    const status = getStatusFromEvidence(v.evidencia, v.pts, maxVal);
    return { key, label: info.label, group: info.group, pilar: info.pilar || 'Outros', pts: v.pts, max: maxVal, status, evidencia: v.evidencia };
  });

  // Group by pilar
  const pilarGroups: Record<string, typeof criterioEntries> = {};
  criterioEntries.forEach((c) => {
    if (!pilarGroups[c.pilar]) pilarGroups[c.pilar] = [];
    pilarGroups[c.pilar].push(c);
  });

  const qaCriterios = criterioEntries.filter((c) => c.group === 'qa');
  const iepcCriterios = criterioEntries.filter((c) => c.group === 'iepc');

  // Radar data per attendance
  const qaRadar = qaCriterios.slice(0, 6).map((c) => ({
    subject: c.label.substring(0, 14),
    value: c.max > 0 ? Math.round((c.pts / c.max) * 100) : 0,
    fullMark: 100,
  }));
  const iepcRadar = iepcCriterios.map((c) => ({
    subject: c.label.substring(0, 16),
    value: c.max > 0 ? Math.round((c.pts / c.max) * 100) : 0,
    fullMark: 100,
  }));

  // NCs
  const ncs = atendimento.ncs || [];

  // Aderência count
  const totalCrit = criterioEntries.length;
  const aderidoCount = criterioEntries.filter((c) => c.status === 'aderido').length;
  const parcialCount = criterioEntries.filter((c) => c.status === 'parcial').length;
  const naoAderidoCount = criterioEntries.filter((c) => c.status === 'nao_aderido').length;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: open ? 'rgba(91,141,239,0.03)' : C.surface,
        border: open ? `1px solid ${C.blueBorder}` : `1px solid ${C.border}`,
        marginBottom: '6px',
      }}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
        style={{ background: 'transparent' }}
        onClick={() => setOpen((v) => !v)}>
        <span className="text-xs font-bold w-5 text-center flex-shrink-0" style={{ color: C.textFaint }}>{index + 1}</span>
        <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: C.blue, minWidth: '80px' }}>
          {atendimento.protocolo || atendimento.sup || '—'}
        </span>
        <span className="text-sm font-medium flex-shrink-0" style={{ color: C.text, minWidth: '110px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {atendimento.cliente}
        </span>
        <span className="text-sm flex-1 text-left" style={{ color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {atendimento.assunto}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-bold" style={{ color: C.blue }}>{atendimento.nota_qa ?? '—'}</span>
          <span className="text-xs" style={{ color: C.textMuted }}>{atendimento.nota_iepc != null ? `${atendimento.nota_iepc}%` : '—'}</span>
          {atendimento.classificacao && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline"
              style={{ backgroundColor: `${classColor}15`, color: classColor, border: `1px solid ${classColor}30` }}>
              {atendimento.classificacao.charAt(0).toUpperCase() + atendimento.classificacao.slice(1)}
            </span>
          )}
          {ncs.length > 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: C.redLight, color: C.red, border: `1px solid ${C.redBorder}` }}>
              {ncs.length} NC
            </span>
          )}
          {open ? <ChevronUp size={13} style={{ color: C.textFaint }} /> : <ChevronDown size={13} style={{ color: C.textFaint }} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="pb-6" style={{ borderTop: `1px solid ${C.border}` }}>

          {/* ── HEADER DO ATENDIMENTO ── */}
          <div className="px-5 pt-4 pb-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Protocolo', value: atendimento.protocolo || atendimento.sup || '—', color: C.blue },
              { label: 'Cliente', value: atendimento.cliente || '—', color: C.text },
              { label: 'Canal', value: atendimento.canal || '—', color: C.teal },
              { label: 'Duração', value: atendimento.duracao || '—', color: C.amber },
              { label: 'Nota QA', value: String(atendimento.nota_qa ?? '—'), color: C.blue },
              { label: 'IEPC', value: atendimento.nota_iepc != null ? `${atendimento.nota_iepc}%` : '—', color: C.green },
            ].map((s) => (
              <div key={s.label} className="p-2.5 rounded-lg text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                <p className="text-xs mb-1" style={{ color: C.textFaint, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p className="text-sm font-bold truncate" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* ── ASSUNTO + SÍNTESE ── */}
          <div className="px-5 grid md:grid-cols-2 gap-3 mb-4">
            {atendimento.assunto && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: C.textFaint }}>Assunto</p>
                <p className="text-sm leading-relaxed" style={{ color: C.text }}>{atendimento.assunto}</p>
              </div>
            )}
            {atendimento.sintese && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: C.textFaint }}>Síntese Operacional</p>
                <p className="text-sm leading-relaxed" style={{ color: C.text }}>{atendimento.sintese}</p>
              </div>
            )}
            {atendimento.solucao && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: C.textFaint }}>Solução Aplicada</p>
                <p className="text-sm leading-relaxed" style={{ color: C.text }}>{atendimento.solucao}</p>
              </div>
            )}
            {atendimento.observacao && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: C.textFaint }}>Observação</p>
                <p className="text-sm leading-relaxed" style={{ color: C.text }}>{atendimento.observacao}</p>
              </div>
            )}
          </div>

          {/* ── RADARES QA + IEPC ── */}
          {(qaRadar.length >= 3 || iepcRadar.length >= 3) && (
            <div className="px-5 grid md:grid-cols-2 gap-4 mb-4">
              {qaRadar.length >= 3 && (
                <div className="rounded-lg p-4" style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
                  <p className="text-xs font-bold mb-3 uppercase tracking-wider text-center" style={{ color: C.blue }}>Radar QA — Este Atendimento</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={qaRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 8 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="QA" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {iepcRadar.length >= 3 && (
                <div className="rounded-lg p-4" style={{ backgroundColor: C.tealLight, border: `1px solid rgba(78,205,196,0.25)` }}>
                  <p className="text-xs font-bold mb-3 uppercase tracking-wider text-center" style={{ color: C.teal }}>Radar IEPC — Este Atendimento</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <RadarChart data={iepcRadar}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 8 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="IEPC" dataKey="value" stroke={C.teal} fill={C.teal} fillOpacity={0.15} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── SUBCRITÉRIOS DETALHADOS ── */}
          {criterioEntries.length > 0 && (
            <div className="px-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.textFaint }}>Subcritérios Detalhados</p>
                {totalCrit > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <span style={{ color: C.green }}>🟢 {aderidoCount}</span>
                    <span style={{ color: C.amber }}>🟡 {parcialCount}</span>
                    <span style={{ color: C.red }}>🔴 {naoAderidoCount}</span>
                  </div>
                )}
              </div>
              {Object.entries(pilarGroups).map(([pilar, items]) => (
                <div key={pilar} className="mb-4">
                  <p className="text-xs font-semibold mb-2 px-2 py-1 rounded"
                    style={{ color: C.blue, backgroundColor: C.blueLight, display: 'inline-block' }}>
                    {pilar}
                  </p>
                  <div className="space-y-2">
                    {items.map((c) => (
                      <div key={c.key} className="flex items-start gap-3 p-3 rounded-lg"
                        style={{
                          backgroundColor: c.status === 'aderido' ? C.greenLight : c.status === 'parcial' ? C.amberLight : C.redLight,
                          border: `1px solid ${c.status === 'aderido' ? C.greenBorder : c.status === 'parcial' ? C.amberBorder : C.redBorder}`,
                        }}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold" style={{ color: C.text }}>{c.label}</span>
                            <StatusBadge status={c.status} />
                            <span className="text-xs font-bold ml-auto" style={{ color: C.textMuted }}>{c.pts}/{c.max} pts</span>
                          </div>
                          {c.evidencia && (
                            <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>{c.evidencia}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── NÃO CONFORMIDADES ── */}
          {ncs.length > 0 && (
            <div className="px-5 mb-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: C.redLight, border: `1px solid ${C.redBorder}` }}>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2" style={{ color: C.red }}>
                  <AlertCircle size={12} /> Não Conformidades — Oportunidade de Evolução
                </p>
                <div className="space-y-3">
                  {ncs.map((nc, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.15)', border: `1px solid ${C.redBorder}` }}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: C.red }}>NC {i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm leading-relaxed" style={{ color: C.text }}>{nc}</p>
                          <p className="text-xs mt-1.5 italic" style={{ color: C.textMuted }}>
                            💡 Esta NC é uma oportunidade de fortalecimento operacional para o próximo ciclo.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAGS ── */}
          {(atendimento.tags?.length || 0) > 0 && (
            <div className="px-5 flex flex-wrap gap-2">
              {atendimento.tags?.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: C.purpleLight, color: C.purple, border: `1px solid rgba(139,126,200,0.25)` }}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedbackViewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const handleExportPDF = useCallback(() => {
    if (!feedback) return;
    const pdfData: FeedbackPDFData = {
      analista: {
        nome: feedback.analistas?.nome || feedback.analista || 'Analista',
        cargo: feedback.analistas?.cargo_operacional || '—',
        equipe: feedback.analistas?.equipe || feedback.equipe || feedback.squad || '—',
        coordenador: feedback.analistas?.coordenador || feedback.coordenador || '—',
        tempoEmpresa: tempoDeEmpresa(feedback.analistas?.data_admissao || null),
        fotoUrl: feedback.analistas?.foto_url || undefined,
      },
      ciclo: feedback.ciclo || feedback.periodo || '—',
      periodoInicio: feedback.periodo_inicio || undefined,
      periodoFim: feedback.periodo_fim || undefined,
      qaScore: feedback.qa_score ?? feedback.nota_final_qa ?? undefined,
      iepcScore: feedback.iepc_score ?? feedback.iepc_total ?? undefined,
      aderenciaScore: feedback.aderencia_score ?? undefined,
      posicaoSquad: feedback.posicao_squad ?? undefined,
      totalSquad: feedback.total_squad ?? undefined,
      ciclosConsecutivos: feedback.ciclos_consecutivos_evolucao,
      resumoCiclo: feedback.resumo_ciclo ?? feedback.sintese_ia ?? undefined,
      evolucaoTecnica: feedback.evolucao_tecnica ?? undefined,
      evolucaoComportamental: feedback.evolucao_comportamental ?? undefined,
      riscoOperacional: feedback.risco_operacional ?? undefined,
      pilares_qa: feedback.pilares_qa || [],
      pilares_iepc: feedback.pilares_iepc || [],
      pontosFortes: feedback.pontos_fortes || [],
      oportunidades: feedback.oportunidades || [],
      coaching: feedback.feedback_coaching?.map((c) => ({
        o_que_foi_dito: c.o_que_foi_dito,
        como_poderia_ser: c.como_poderia_ser,
        dica_de_ouro: c.dica_de_ouro,
      })),
      atendimentos: buildAtendimentos(feedback).map((a) => ({
        protocolo: a.protocolo,
        cliente: a.cliente,
        assunto: a.assunto,
        nota_qa: a.nota_qa,
        nota_iepc: a.nota_iepc,
        classificacao: a.classificacao,
        observacao: a.observacao,
      })),
      conquistas: feedback.conquistas || [],
      historico,
    };
    exportFeedbackPDF(pdfData).catch(console.error);
  }, [feedback, historico]);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) { setError('ID não fornecido'); setLoading(false); return; }

    (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('feedbacks')
          .select(`
            *,
            analistas(nome, nome_completo, cargo_operacional, equipe, coordenador, data_admissao, analista_id, foto_url),
            feedback_atendimentos(*),
            feedback_coaching(*),
            feedback_pdi(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (queryError || !data) {
          const { data: fallback } = await supabase
            .from('feedbacks')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (fallback) {
            if (fallback.analista_id) {
              const { data: analistaData } = await supabase
                .from('analistas')
                .select('nome, nome_completo, cargo_operacional, equipe, coordenador, data_admissao, analista_id, foto_url')
                .eq('id', fallback.analista_id)
                .maybeSingle();
              (fallback as any).analistas = analistaData;
            }
            setFeedback(mergeFeedbackData(fallback as Feedback));
          } else {
            setError('Feedback não encontrado');
          }
          setLoading(false);
          return;
        }

        setFeedback(mergeFeedbackData(data as Feedback));

        if (data.analista_id) {
          const { data: hist } = await supabase
            .from('feedback_historico')
            .select('ciclo, qa_score, iepc_score')
            .eq('analista_id', data.analista_id)
            .order('created_at', { ascending: true })
            .limit(8);

          if (hist && hist.length > 0) {
            setHistorico(hist as HistoricoItem[]);
          } else {
            const { data: allFeedbacks } = await supabase
              .from('feedbacks')
              .select('ciclo, qa_score, iepc_score, nota_final_qa, iepc_total, created_at')
              .eq('analista_id', data.analista_id)
              .order('created_at', { ascending: true })
              .limit(8);

            if (allFeedbacks && allFeedbacks.length > 0) {
              setHistorico(allFeedbacks.map((f: any) => ({
                ciclo: f.ciclo || f.periodo || '—',
                qa_score: f.qa_score || f.nota_final_qa || 0,
                iepc_score: f.iepc_score || f.iepc_total || 0,
              })));
            }
          }
        }
      } catch {
        setError('Erro ao carregar feedback');
      }
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-96" style={{ color: C.textFaint }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: `${C.blue} transparent transparent transparent` }} />
          <p className="text-sm font-medium">Carregando feedback executivo...</p>
        </div>
      </div>
    </EnterpriseLayout>
  );

  if (error || !feedback) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: C.redLight, border: `1px solid ${C.redBorder}` }}>
            <AlertCircle size={28} style={{ color: C.red }} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Feedback não encontrado</h2>
          <p className="text-sm mb-6" style={{ color: C.textMuted }}>
            {error || 'O feedback solicitado não foi encontrado.'}
          </p>
          <Link href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: C.blue }}>
            <ArrowLeft size={14} /> Voltar para Feedbacks
          </Link>
        </div>
      </div>
    </EnterpriseLayout>
  );

  const analista = feedback.analistas;
  const initials = (analista?.nome || feedback.analista || '?').split(' ').slice(0, 2).map((n: string) => n[0]).join('');
  const tendencias = feedback.tendencias as Record<string, unknown>;
  const atendimentos = buildAtendimentos(feedback);
  const qaScore = feedback.qa_score ?? feedback.nota_final_qa ?? 0;
  const iepcScore = feedback.iepc_score ?? feedback.iepc_total ?? 0;
  const aderenciaScore = feedback.aderencia_score ?? null;
  const cicloLabel = feedback.ciclo || feedback.periodo || '—';
  const resumo = feedback.resumo_ciclo || feedback.sintese_ia || null;

  const criteriosRaw = feedback.criterios || (feedback.snapshot_json_completo as any)?.criterios || {};
  const criteriosList = Object.entries(criteriosRaw).map(([key, val]) => {
    const v = val as CriterioData;
    const info = CRITERIO_LABELS[key] || { label: key, group: 'qa' as const };
    const maxVal = v.max && v.max > 0 ? v.max : 20;
    const pct = maxVal > 0 ? Math.round((v.pts / maxVal) * 100) : 0;
    return { key, label: info.label, group: info.group, pts: v.pts, max: maxVal, pct, class: v.class, evidencia: v.evidencia };
  });

  const qaRadarData = (feedback.pilares_qa || []).map((p) => ({
    subject: p.nome.replace(/^\d+\.\s*/, '').substring(0, 18),
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : 0,
    fullMark: 100,
  }));

  const iepcCriterios = criteriosList.filter((c) => c.group === 'iepc');
  const iepcRadarData = (feedback.pilares_iepc || []).map((p) => ({
    subject: p.nome.replace(/^\d+\.\s*/, '').substring(0, 18),
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : 0,
    fullMark: 100,
  }));
  const iepcRadarFinal = iepcRadarData.length > 0 ? iepcRadarData : iepcCriterios.map((c) => ({
    subject: c.label.substring(0, 18),
    value: c.pct,
    fullMark: 100,
  }));

  const content = (
    <div className={`max-w-6xl mx-auto ${fullscreen ? 'px-6 py-4' : ''}`}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 print:hidden">
        {!fullscreen ? (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: C.textMuted }}>
            <ArrowLeft size={14} /> Voltar
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: C.surface, color: C.textMuted, border: `1px solid ${C.border}` }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Sair da Apresentação' : 'Modo Apresentação'}
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: C.blue }}>
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-5">

        {/* ══ 1. HERO EXECUTIVO ══ */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0d1f3c 0%, #071428 60%, #050f20 100%)',
            border: `1px solid ${C.borderAccent}`,
          }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {analista?.foto_url ? (
                    <img src={analista.foto_url} alt={analista.nome}
                      className="rounded-xl object-cover"
                      style={{ width: '100px', height: '100px', border: `2px solid ${C.blueBorder}` }} />
                  ) : (
                    <div className="rounded-xl flex items-center justify-center font-bold text-white"
                      style={{ width: '100px', height: '100px', background: `linear-gradient(135deg, #1a3a6e, #2a5298)`, border: `2px solid ${C.blueBorder}`, fontSize: '2rem' }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="font-bold text-white" style={{ fontSize: '1.7rem', letterSpacing: '-0.02em' }}>
                      {analista?.nome || feedback.analista || 'Analista'}
                    </h1>
                    {feedback.posicao_squad === 1 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: C.amberLight, color: C.amber, border: `1px solid ${C.amberBorder}` }}>
                        <Star size={10} fill="currentColor" /> Destaque do Ciclo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: C.textMuted }}>
                    {analista?.cargo_operacional || '—'}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: C.textMuted }}>
                    <span>Equipe: <span className="font-semibold text-white">{analista?.equipe || feedback.equipe || feedback.squad || '—'}</span></span>
                    <span>Coordenadora: <span className="font-semibold text-white">{analista?.coordenador || feedback.coordenador || '—'}</span></span>
                  </div>
                  {feedback.auditor && (
                    <p className="text-xs mt-1" style={{ color: C.textFaint }}>
                      Auditor: <span className="font-medium" style={{ color: C.textMuted }}>{feedback.auditor}</span>
                    </p>
                  )}
                  <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: C.textFaint }}>
                    <Clock size={11} /> Tempo de empresa:
                    <span className="font-medium" style={{ color: C.textMuted }}>
                      {tempoDeEmpresa(analista?.data_admissao || null)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex-shrink-0 rounded-xl p-4 text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, minWidth: '110px' }}>
                <p className="text-xs font-bold tracking-widest mb-2" style={{ color: C.textFaint, fontSize: '9px' }}>CICLO</p>
                <p className="text-lg font-bold text-white">{cicloLabel}</p>
                {feedback.periodo_inicio && (
                  <p className="text-xs mt-0.5" style={{ color: C.textFaint, fontSize: '10px' }}>
                    {feedback.periodo_inicio}{feedback.periodo_fim ? ` a ${feedback.periodo_fim}` : ''}
                  </p>
                )}
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: C.greenLight, color: C.green, fontSize: '10px' }}>
                  {feedback.status === 'approved' || feedback.status === 'sent' || feedback.status === 'success' ? 'Concluído' : feedback.status === 'generated' ? 'Gerado' : 'Em Andamento'}
                </span>
              </div>

              <div className="flex gap-3 flex-shrink-0">
                <div className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}`, minWidth: '85px' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: C.blue, fontSize: '9px' }}>QA</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.5rem' }}>{qaScore || '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.textFaint, fontSize: '10px' }}>/100</p>
                  {(tendencias?.variacao_qa as number) != null && (tendencias.variacao_qa as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold flex items-center justify-center gap-0.5"
                      style={{ color: (tendencias.variacao_qa as number) >= 0 ? C.green : C.red }}>
                      {(tendencias.variacao_qa as number) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(tendencias.variacao_qa as number)} pts
                    </p>
                  )}
                </div>

                <div className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}`, minWidth: '85px' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: C.green, fontSize: '9px' }}>IEPC</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.5rem' }}>{iepcScore || '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.textFaint, fontSize: '10px' }}>%</p>
                  {(tendencias?.variacao_iepc as number) != null && (tendencias.variacao_iepc as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold flex items-center justify-center gap-0.5"
                      style={{ color: (tendencias.variacao_iepc as number) >= 0 ? C.green : C.red }}>
                      {(tendencias.variacao_iepc as number) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(tendencias.variacao_iepc as number)} pts
                    </p>
                  )}
                </div>

                <div className="rounded-xl p-4 flex flex-col items-center justify-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, minWidth: '85px' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: C.textFaint, fontSize: '9px' }}>ADERÊNCIA</p>
                  {aderenciaScore != null
                    ? <CircleProgress value={aderenciaScore} size={68} color={C.teal} />
                    : <p className="text-2xl font-bold text-white">—</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 2. RESUMO EXECUTIVO ══ */}
        {resumo && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <SectionTitle icon={<BarChart2 size={14} />} title="Resumo Executivo do Ciclo" color={C.blue} />
            <p className="text-sm leading-relaxed mb-5" style={{ color: C.text, lineHeight: '1.85' }}>{resumo}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
                  <TrendingUp size={16} className="mx-auto mb-2" style={{ color: C.blue }} />
                  <p className="text-xs mb-1" style={{ color: C.textFaint }}>Evolução</p>
                  {tendencias?.variacao_qa !== undefined && <p className="text-sm font-bold" style={{ color: C.blue }}>+{tendencias.variacao_qa as number} pts QA</p>}
                  {tendencias?.variacao_iepc !== undefined && <p className="text-xs" style={{ color: C.green }}>+{tendencias.variacao_iepc as number} pts IEPC</p>}
                </div>
              )}
              {feedback.posicao_squad != null && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
                  <Users size={16} className="mx-auto mb-2" style={{ color: C.amber }} />
                  <p className="text-xs mb-1" style={{ color: C.textFaint }}>Posição no Squad</p>
                  <p className="text-sm font-bold" style={{ color: C.amber }}>Top {feedback.posicao_squad}</p>
                  <p className="text-xs" style={{ color: C.textFaint }}>entre {feedback.total_squad || '?'} analistas</p>
                </div>
              )}
              {atendimentos.length > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: C.purpleLight, border: `1px solid rgba(139,126,200,0.25)` }}>
                  <MessageSquare size={16} className="mx-auto mb-2" style={{ color: C.purple }} />
                  <p className="text-xs mb-1" style={{ color: C.textFaint }}>Atendimentos</p>
                  <p className="text-sm font-bold" style={{ color: C.purple }}>{atendimentos.length} avaliados</p>
                </div>
              )}
              {feedback.ciclos_consecutivos_evolucao > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}` }}>
                  <TrendingUp size={16} className="mx-auto mb-2" style={{ color: C.green }} />
                  <p className="text-xs mb-1" style={{ color: C.textFaint }}>Tendência</p>
                  <p className="text-sm font-bold" style={{ color: C.green }}>Em evolução</p>
                  <p className="text-xs" style={{ color: C.textFaint }}>{feedback.ciclos_consecutivos_evolucao} ciclos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 3. QA + IEPC SIDE BY SIDE ══ */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Target size={14} />} title="QA — Qualidade" color={C.blue} />
              <span className="text-2xl font-bold" style={{ color: C.blue }}>{qaScore || '—'}<span className="text-sm font-normal opacity-60">/100</span></span>
            </div>
            {(feedback.pilares_qa || []).length > 0 ? (
              <div className="space-y-3 mb-5">
                {(feedback.pilares_qa || []).map((p, i) => {
                  const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                  const color = PILAR_COLORS_QA[i % PILAR_COLORS_QA.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {i + 1}
                          </div>
                          <span style={{ color: C.text }}>{p.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                          {p.variacao !== undefined && p.variacao !== 0 && (
                            <span className="font-semibold text-xs" style={{ color: p.variacao >= 0 ? C.green : C.red }}>
                              {p.variacao >= 0 ? '↑' : '↓'}{Math.abs(p.variacao)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: C.textFaint }}>Nenhum pilar QA registrado</p>
            )}
            {qaRadarData.length >= 3 && (
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wider text-center" style={{ color: C.blue }}>Radar QA</p>
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={qaRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="QA" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.tealLight, border: `1px solid rgba(78,205,196,0.25)` }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Activity size={14} />} title="IEPC — Experiência" color={C.teal} />
              <span className="text-2xl font-bold" style={{ color: C.teal }}>{iepcScore || '—'}<span className="text-sm font-normal opacity-60">%</span></span>
            </div>
            {(feedback.pilares_iepc || []).length > 0 ? (
              <div className="space-y-3 mb-5">
                {(feedback.pilares_iepc || []).map((p, i) => {
                  const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                  const color = PILAR_COLORS_IEPC[i % PILAR_COLORS_IEPC.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {i + 1}
                          </div>
                          <span style={{ color: C.text }}>{p.nome}</span>
                        </div>
                        <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : iepcCriterios.length > 0 ? (
              <div className="space-y-3 mb-5">
                {iepcCriterios.map((c, i) => {
                  const color = PILAR_COLORS_IEPC[i % PILAR_COLORS_IEPC.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: C.text }}>{c.label}</span>
                        <span className="font-bold text-white">{c.pts}/{c.max}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: C.textFaint }}>Nenhum pilar IEPC registrado</p>
            )}
            {iepcRadarFinal.length >= 3 && (
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wider text-center" style={{ color: C.teal }}>Radar IEPC</p>
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={iepcRadarFinal}>
                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="IEPC" dataKey="value" stroke={C.teal} fill={C.teal} fillOpacity={0.15} strokeWidth={1.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ══ 4. HEATMAP DE CRITÉRIOS ══ */}
        {criteriosList.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <SectionTitle icon={<BarChart2 size={14} />} title="Heatmap de Critérios — Analytics Evolutivo" color={C.blue} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Critério', 'Grupo', 'Pts', 'Máx', 'Aderência', 'Tendência', 'Evidência'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 font-semibold uppercase tracking-wide"
                        style={{ color: C.textFaint, fontSize: '10px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteriosList.map((c) => {
                    const isGood = c.pct >= 80;
                    const isMid = c.pct >= 50 && c.pct < 80;
                    const color = isGood ? C.green : isMid ? C.amber : C.red;
                    const bgColor = isGood ? C.greenLight : isMid ? C.amberLight : C.redLight;
                    const trendIcon = c.class === 'nao_pontuou' ? '↓' : c.pct >= 80 ? '↑' : c.pct >= 60 ? '→' : '↓';
                    const trendColor = trendIcon === '↑' ? C.green : trendIcon === '→' ? C.amber : C.red;
                    return (
                      <tr key={c.key} style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: bgColor }}>
                        <td className="py-2.5 px-3 font-medium" style={{ color: C.text }}>{c.label}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ backgroundColor: c.group === 'qa' ? C.blueLight : C.tealLight, color: c.group === 'qa' ? C.blue : C.teal }}>
                            {c.group.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{ color }}>{c.pts}</td>
                        <td className="py-2.5 px-3" style={{ color: C.textFaint }}>{c.max}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="font-bold" style={{ color }}>{c.pct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{ color: trendColor }}>{trendIcon}</td>
                        <td className="py-2.5 px-3 max-w-xs" style={{ color: C.textMuted, fontSize: '10px' }}>
                          <span className="line-clamp-2">{c.evidencia || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ 5. EVOLUÇÃO HISTÓRICA ══ */}
        {historico.length > 1 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <SectionTitle icon={<TrendingUp size={14} />} title="Evolução Histórica" color={C.green} />
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={historico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="ciclo" tick={{ fill: C.textFaint, fontSize: 10 }} />
                <YAxis domain={[50, 100]} tick={{ fill: C.textFaint, fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1f3c', border: `1px solid ${C.border}`, borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="qa_score" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} name="QA" />
                <Line type="monotone" dataKey="iepc_score" stroke={C.teal} strokeWidth={2} dot={{ fill: C.teal, r: 3 }} name="IEPC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ══ 6. PONTOS FORTES + OPORTUNIDADES ══ */}
        {((feedback.pontos_fortes?.length || 0) > 0 || (feedback.oportunidades?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-5">
            {(feedback.pontos_fortes?.length || 0) > 0 && (
              <div className="rounded-xl p-5"
                style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}` }}>
                <SectionTitle icon={<Award size={14} />} title="Pontos Fortes" color={C.green} />
                <div className="space-y-4">
                  {(feedback.pontos_fortes || []).slice(0, 5).map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'rgba(82,183,136,0.2)' }}>
                        <CheckCircle size={12} style={{ color: C.green }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.textMuted, lineHeight: '1.6' }}>{p.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(feedback.oportunidades?.length || 0) > 0 && (
              <div className="rounded-xl p-5"
                style={{ backgroundColor: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
                <SectionTitle icon={<Target size={14} />} title="Oportunidades de Evolução" color={C.amber} />
                <div className="space-y-4">
                  {(feedback.oportunidades || []).slice(0, 5).map((o, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'rgba(212,168,83,0.2)' }}>
                        <Zap size={12} style={{ color: C.amber }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{o.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.textMuted, lineHeight: '1.6' }}>{o.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ 7. EVOLUÇÃO TÉCNICA ══ */}
        {feedback.evolucao_tecnica && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
            <SectionTitle icon={<Zap size={14} />} title="Evolução Técnica" color={C.blue} />
            <p className="text-sm leading-relaxed" style={{ color: C.text, lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_tecnica}</p>
          </div>
        )}

        {/* ══ 8. EVOLUÇÃO COMPORTAMENTAL ══ */}
        {feedback.evolucao_comportamental && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: C.purpleLight, border: `1px solid rgba(139,126,200,0.25)` }}>
            <SectionTitle icon={<Users size={14} />} title="Evolução Comportamental" color={C.purple} />
            <p className="text-sm leading-relaxed" style={{ color: C.text, lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_comportamental}</p>
          </div>
        )}

        {/* ══ 9. RISCO OPERACIONAL ══ */}
        {feedback.risco_operacional && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: C.redLight, border: `1px solid ${C.redBorder}` }}>
            <SectionTitle icon={<Shield size={14} />} title="Risco Operacional" color={C.red} />
            <p className="text-sm leading-relaxed" style={{ color: C.text, lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.risco_operacional}</p>
          </div>
        )}

        {/* ══ 10. COACHING DE COMUNICAÇÃO ══ */}
        {(feedback.feedback_coaching?.length || 0) > 0 && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <SectionTitle icon={<MessageSquare size={14} />} title="Coaching de Comunicação" color={C.blue} />
            <div className="space-y-5">
              {(feedback.feedback_coaching || []).map((c, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: C.blue }}>O Que Foi Dito</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: C.textMuted, lineHeight: '1.7' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                  </div>
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: C.amber }}>Como Poderia Ser</p>
                    <p className="text-sm leading-relaxed" style={{ color: C.text, lineHeight: '1.7' }}>{c.como_poderia_ser}</p>
                  </div>
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: C.tealLight, border: `1px solid rgba(78,205,196,0.25)` }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-1" style={{ color: C.teal }}>
                      <Star size={11} fill="currentColor" /> Dica de Ouro
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: C.text, lineHeight: '1.7' }}>{c.dica_de_ouro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 11. ATENDIMENTOS AVALIADOS — ACCORDION OPERACIONAL ══ */}
        {atendimentos.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Eye size={14} />} title={`Atendimentos Avaliados (${atendimentos.length})`} color={C.blue} />
              <span className="text-xs" style={{ color: C.textFaint }}>Clique para expandir devolutiva completa</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: C.textFaint }}>
              <span className="w-5 text-center">#</span>
              <span style={{ minWidth: '80px' }}>Protocolo</span>
              <span style={{ minWidth: '110px' }}>Cliente</span>
              <span className="flex-1">Assunto</span>
              <span className="flex-shrink-0">QA</span>
              <span className="flex-shrink-0 ml-2">IEPC</span>
              <span className="flex-shrink-0 ml-2 hidden sm:block">Classificação</span>
              <span className="w-4" />
            </div>
            {atendimentos.map((a, i) => (
              <AtendimentoAccordion
                key={a.id || i}
                atendimento={a}
                index={i}
                globalCriterios={criteriosRaw as Record<string, CriterioData>}
              />
            ))}
          </div>
        )}

        {/* ══ 12. 9-BOX MATRIX ══ */}
        {(qaScore > 0 || iepcScore > 0) && (
          <NineBoxMatrix qaScore={qaScore} iepcScore={iepcScore} />
        )}

        {/* ══ 13. CONQUISTAS E EVOLUÇÃO ══ */}
        {(feedback.conquistas?.length || 0) > 0 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
            <SectionTitle icon={<Award size={14} />} title="Conquistas e Evolução" color={C.amber} />
            <div className="grid md:grid-cols-2 gap-3">
              {(feedback.conquistas || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                  <span className="text-sm" style={{ color: C.text }}>{c.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: C.green }}>{c.valor}</span>
                    {c.periodo && <span className="text-xs" style={{ color: C.textFaint }}>{c.periodo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 14. FECHAMENTO ══ */}
        <div className="rounded-xl p-6"
          style={{ background: 'linear-gradient(135deg, rgba(26,58,110,0.4), rgba(7,20,40,0.8))', border: `1px solid ${C.borderAccent}` }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold" style={{ color: C.amber }}>Desenvolvimento e evolução contínua.</p>
              <p className="text-sm font-semibold" style={{ color: C.blue }}>Você está no caminho certo!</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: C.textFaint }}>Documento confidencial • Uso interno</p>
              <p className="text-xs" style={{ color: C.textFaint }}>QualiVisão People Analytics © 2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: C.textFaint }}>Ciclo: {cicloLabel} • Versão 1.0</p>
              <p className="text-sm font-extrabold mt-1 tracking-widest" style={{ color: C.blue }}>QualiVisão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {fullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: C.bg }}>
          <div className="min-h-screen" style={{ scrollBehavior: 'smooth' }}>
            {content}
          </div>
        </div>
      ) : (
        <EnterpriseLayout>{content}</EnterpriseLayout>
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .max-w-6xl { max-width: 100% !important; }
          @page { margin: 12mm; size: A4; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

// ─── Data merge helper ────────────────────────────────────────────────────────

function mergeFeedbackData(data: Feedback): Feedback {
  const snap = data.snapshot_json_completo as Record<string, unknown> | null;
  if (snap) {
    if (!data.evolucao_tecnica && snap.evolucao_tecnica) (data as any).evolucao_tecnica = snap.evolucao_tecnica;
    if (!data.evolucao_comportamental && snap.evolucao_comportamental) (data as any).evolucao_comportamental = snap.evolucao_comportamental;
    if (!data.risco_operacional && snap.risco_operacional) (data as any).risco_operacional = snap.risco_operacional;
    if ((!data.pilares_qa || (data.pilares_qa as any[]).length === 0) && snap.pilares_qa) (data as any).pilares_qa = snap.pilares_qa;
    if ((!data.pilares_iepc || (data.pilares_iepc as any[]).length === 0) && snap.pilares_iepc) (data as any).pilares_iepc = snap.pilares_iepc;
    if ((!data.pontos_fortes || (data.pontos_fortes as any[]).length === 0) && snap.pontos_fortes) (data as any).pontos_fortes = snap.pontos_fortes;
    if ((!data.oportunidades || (data.oportunidades as any[]).length === 0) && snap.oportunidades) (data as any).oportunidades = snap.oportunidades;
    if (!data.resumo_ciclo && snap.resumo_ciclo) (data as any).resumo_ciclo = snap.resumo_ciclo;
    if ((!data.conquistas || (data.conquistas as any[]).length === 0) && snap.conquistas) (data as any).conquistas = snap.conquistas;
    if (!data.tendencias || Object.keys(data.tendencias as object).length === 0) {
      if (snap.tendencias) (data as any).tendencias = snap.tendencias;
    }
    if (!data.criterios && snap.criterios) (data as any).criterios = snap.criterios;
    if (!data.evidencias && snap.evidencias) (data as any).evidencias = snap.evidencias;
    if (!data.sintese_ia && snap.sintese_ia) (data as any).sintese_ia = snap.sintese_ia;
    if (!data.nota_final_qa && snap.nota_final_qa) (data as any).nota_final_qa = snap.nota_final_qa;
    if (!data.iepc_total && snap.iepc_total) (data as any).iepc_total = snap.iepc_total;
  }
  return data;
}

// ─── Build attendance list from multiple sources ──────────────────────────────

function buildAtendimentos(feedback: Feedback): AtendimentoItem[] {
  if (feedback.feedback_atendimentos && feedback.feedback_atendimentos.length > 0) {
    return feedback.feedback_atendimentos;
  }

  const evidencias = feedback.evidencias || (feedback.snapshot_json_completo as any)?.evidencias || [];
  if (evidencias.length > 0) {
    return evidencias.map((e: EvidenciaData, i: number) => ({
      id: `ev-${i}`,
      protocolo: e.sup || `#${i + 1}`,
      sup: e.sup || '',
      cliente: e.cliente || '—',
      assunto: e.assunto || '—',
      nota_qa: e.nota || 0,
      nota_iepc: e.nota_iepc || 0,
      classificacao: e.classificacao || (e.nota && e.nota >= 90 ? 'excelente' : e.nota && e.nota >= 75 ? 'bom' : 'regular'),
      canal: e.canal || '',
      duracao: e.duracao || '',
      sintese: e.sintese || '',
      solucao: e.solucao || '',
      comportamento: e.comportamento || '',
      observacao: e.observacao || '',
      ncs: e.ncs || [],
      tags: e.tags || [],
      criterios_raw: (e.criterios as Record<string, unknown>) || undefined,
    }));
  }

  return [];
}