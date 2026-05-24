'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { ArrowLeft, Download, Star, TrendingUp, TrendingDown, Users, MessageSquare, BarChart2, CheckCircle, AlertCircle, Eye, X, Maximize2, Minimize2, ChevronDown, ChevronUp, Award, Target, Clock, Shield, Zap, Activity, Grid,  } from 'lucide-react';
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
  // Raw API fields
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
}
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem {
  id: string; objetivo: string; acao_desenvolvimento: string; prazo: string;
  progresso: number; status: string; responsavel?: string; ciclo_origem?: string;
  evidencia?: string; ultima_atualizacao?: string;
}
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const PILAR_COLORS_QA = ['#38BDF8', '#22C55E', '#A78BFA', '#FB923C', '#FBBF24'];
const PILAR_COLORS_IEPC = ['#34D399', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA'];

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: '#22C55E',
  bom: '#38BDF8',
  regular: '#EAB308',
  critico: '#EF4444',
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

function SectionTitle({ icon, title, color = 'rgba(255,255,255,0.4)' }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span style={{ color }}>{icon}</span>
      <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{title}</h3>
    </div>
  );
}

function CircleProgress({ value, color = '#22C55E', size = 90 }: { value: number; color?: string; size?: number }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">{value}%</text>
    </svg>
  );
}

// ─── Criteria label map ───────────────────────────────────────────────────────

const CRITERIO_LABELS: Record<string, { label: string; group: 'qa' | 'iepc' }> = {
  qa_solucao_resolucao: { label: 'Solução / Resolução', group: 'qa' },
  qa_solucao_orientacao: { label: 'Orientação ao Cliente', group: 'qa' },
  qa_precisao_diagnostico: { label: 'Precisão no Diagnóstico', group: 'qa' },
  qa_precisao_ferramentas: { label: 'Uso de Ferramentas', group: 'qa' },
  qa_solucao_documentacao: { label: 'Documentação', group: 'qa' },
  qa_comunicacao_tompostura: { label: 'Tom e Postura', group: 'qa' },
  qa_atendimento_encerramento: { label: 'Encerramento', group: 'qa' },
  qa_solucao_validacaoduvidas: { label: 'Validação de Dúvidas', group: 'qa' },
  qa_atendimento_identificacao: { label: 'Identificação', group: 'qa' },
  qa_atendimento_comunicacaosup: { label: 'Comunicação SUP', group: 'qa' },
  qa_relacionamento_cordialidade: { label: 'Cordialidade', group: 'qa' },
  qa_relacionamento_overdelivery: { label: 'Overdelivery', group: 'qa' },
  qa_relacionamento_proatividade: { label: 'Proatividade', group: 'qa' },
  qa_comunicacao_linguaportuguesa: { label: 'Língua Portuguesa', group: 'qa' },
  qa_comunicacao_clarezacontinuidade: { label: 'Clareza e Continuidade', group: 'qa' },
  iepc_tempo_fluidez: { label: 'Tempo e Fluidez', group: 'iepc' },
  iepc_esforco_cliente: { label: 'Esforço do Cliente', group: 'iepc' },
  iepc_clareza_confianca: { label: 'Clareza e Confiança', group: 'iepc' },
  iepc_resolucao_percebida: { label: 'Resolução Percebida', group: 'iepc' },
  iepc_experiencia_relacional: { label: 'Experiência Relacional', group: 'iepc' },
};

// ─── 9-Box Matrix ─────────────────────────────────────────────────────────────

function NineBoxMatrix({ qaScore, iepcScore }: { qaScore: number; iepcScore: number }) {
  // X = comportamento/IEPC (0-100), Y = performance/QA (0-100)
  const xPct = Math.min(100, Math.max(0, iepcScore));
  const yPct = Math.min(100, Math.max(0, qaScore));

  // Determine cell (0-2 for x, 0-2 for y)
  const xCell = xPct >= 80 ? 2 : xPct >= 60 ? 1 : 0;
  const yCell = yPct >= 80 ? 2 : yPct >= 60 ? 1 : 0;

  const cells = [
    // row 2 (top) - high performance
    [
      { label: 'Acompanhamento', sub: 'Alto desempenho\nBaixa experiência', color: '#EAB308', bg: 'rgba(234,179,8,0.08)' },
      { label: 'Evolução', sub: 'Alto desempenho\nMédia experiência', color: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
      { label: 'Destaque', sub: 'Alto desempenho\nAlta experiência', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    ],
    // row 1 (mid)
    [
      { label: 'Atenção', sub: 'Médio desempenho\nBaixa experiência', color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
      { label: 'Consistente', sub: 'Médio desempenho\nMédia experiência', color: '#A78BFA', bg: 'rgba(167,139,250,0.08)' },
      { label: 'Evolução', sub: 'Médio desempenho\nAlta experiência', color: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
    ],
    // row 0 (bottom) - low performance
    [
      { label: 'Crítico', sub: 'Baixo desempenho\nBaixa experiência', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
      { label: 'Atenção', sub: 'Baixo desempenho\nMédia experiência', color: '#FB923C', bg: 'rgba(251,146,60,0.08)' },
      { label: 'Acompanhamento', sub: 'Baixo desempenho\nAlta experiência', color: '#EAB308', bg: 'rgba(234,179,8,0.08)' },
    ],
  ];

  // Active cell: xCell = col, yCell = row (from bottom)
  const activeRow = 2 - yCell;
  const activeCol = xCell;
  const activeCell = cells[activeRow][activeCol];

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionTitle icon={<Grid size={14} />} title="Matriz 9Box — People Analytics" color="rgba(167,139,250,0.8)" />
      <div className="flex gap-4 items-start">
        {/* Matrix grid */}
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginRight: '4px' }}>
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
                          border: isActive ? `2px solid ${cell.color}` : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: isActive ? `0 0 16px ${cell.color}30` : 'none',
                          minHeight: '72px',
                        }}>
                        <p className="text-xs font-bold mb-1" style={{ color: isActive ? cell.color : 'rgba(255,255,255,0.3)' }}>
                          {cell.label}
                        </p>
                        <p className="text-xs leading-tight whitespace-pre-line" style={{ color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)', fontSize: '9px' }}>
                          {cell.sub}
                        </p>
                        {isActive && (
                          <div className="mt-1.5 w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: cell.color, boxShadow: `0 0 6px ${cell.color}` }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between mt-1 px-1">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>Baixa Experiência</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>Comportamento / IEPC →</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>Alta Experiência</span>
              </div>
            </div>
          </div>
        </div>
        {/* Active classification */}
        <div className="w-40 rounded-xl p-4 text-center flex-shrink-0"
          style={{ backgroundColor: activeCell.bg, border: `1px solid ${activeCell.color}40` }}>
          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Classificação</p>
          <p className="text-lg font-bold mb-3" style={{ color: activeCell.color }}>{activeCell.label}</p>
          <div className="space-y-2">
            <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>QA</p>
              <p className="text-base font-bold text-sky-400">{qaScore}</p>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>IEPC</p>
              <p className="text-base font-bold text-green-400">{iepcScore}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Accordion Attendance Item ────────────────────────────────────────────────

function AtendimentoAccordion({ atendimento, index }: { atendimento: AtendimentoItem; index: number }) {
  const [open, setOpen] = useState(false);
  const classColor = CLASSIFICACAO_COLORS[atendimento.classificacao?.toLowerCase()] || '#94A3B8';

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        backgroundColor: open ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)',
        border: open ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(255,255,255,0.06)',
        marginBottom: '8px',
      }}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setOpen((v) => !v)}>
        <span className="text-xs font-bold w-6 text-center flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{index + 1}</span>
        <span className="font-mono text-xs font-bold flex-shrink-0" style={{ color: '#38BDF8', minWidth: '80px' }}>
          {atendimento.protocolo || atendimento.sup || '—'}
        </span>
        <span className="text-sm font-medium flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)', minWidth: '120px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {atendimento.cliente}
        </span>
        <span className="text-sm flex-1 text-left" style={{ color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {atendimento.assunto}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold text-sky-400">{atendimento.nota_qa ?? '—'}</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{atendimento.nota_iepc != null ? `${atendimento.nota_iepc}%` : '—'}</span>
          {atendimento.classificacao && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline"
              style={{ backgroundColor: `${classColor}18`, color: classColor, border: `1px solid ${classColor}30` }}>
              {atendimento.classificacao.charAt(0).toUpperCase() + atendimento.classificacao.slice(1)}
            </span>
          )}
          {open ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Scores row */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-4">
            {[
              { label: 'Nota QA', value: atendimento.nota_qa ?? '—', color: '#38BDF8' },
              { label: 'IEPC', value: atendimento.nota_iepc != null ? `${atendimento.nota_iepc}%` : '—', color: '#22C55E' },
              { label: 'SUP', value: atendimento.sup || '—', color: '#A78BFA' },
              { label: 'Canal', value: atendimento.canal || '—', color: '#FBBF24' },
              { label: 'Duração', value: atendimento.duracao || '—', color: '#FB923C' },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Text fields */}
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { label: 'Assunto Completo', value: atendimento.assunto },
              { label: 'Solução Aplicada', value: atendimento.solucao },
              { label: 'Síntese Operacional', value: atendimento.sintese },
              { label: 'Comportamento', value: atendimento.comportamento },
              { label: 'Observação', value: atendimento.observacao },
              { label: 'Evidências', value: atendimento.evidencias },
            ].filter((d) => d.value).map((d) => (
              <div key={d.label} className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{d.label}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{d.value}</p>
              </div>
            ))}
          </div>

          {/* Criteria */}
          {(atendimento.criterios?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>Critérios Avaliados</p>
              <div className="flex flex-wrap gap-2">
                {atendimento.criterios?.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.15)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          {/* NCs */}
          {(atendimento.ncs?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#EF4444' }}>Não Conformidades</p>
              <div className="space-y-1">
                {atendimento.ncs?.map((nc, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{nc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {(atendimento.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {atendimento.tags?.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>{tag}</span>
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
      atendimentos: feedback.feedback_atendimentos?.map((a) => ({
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
    exportFeedbackPDF(pdfData);
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
      <div className="flex items-center justify-center h-96" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Feedback não encontrado</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {error || 'O feedback solicitado não foi encontrado.'}
          </p>
          <Link href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1E40AF' }}>
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

  // Build criteria heatmap from raw criterios
  const criteriosRaw = feedback.criterios || (feedback.snapshot_json_completo as any)?.criterios || {};
  const criteriosList = Object.entries(criteriosRaw).map(([key, val]) => {
    const v = val as CriterioData;
    const info = CRITERIO_LABELS[key] || { label: key, group: 'qa' as const };
    const maxVal = v.max && v.max > 0 ? v.max : 20;
    const pct = maxVal > 0 ? Math.round((v.pts / maxVal) * 100) : 0;
    return { key, label: info.label, group: info.group, pts: v.pts, max: maxVal, pct, class: v.class, evidencia: v.evidencia };
  });

  // Build radar data for QA
  const qaRadarData = (feedback.pilares_qa || []).map((p, i) => ({
    subject: p.nome.replace(/^\d+\.\s*/, '').substring(0, 18),
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : 0,
    fullMark: 100,
  }));

  // Build radar data for IEPC
  const iepcRadarData = (feedback.pilares_iepc || []).map((p) => ({
    subject: p.nome.replace(/^\d+\.\s*/, '').substring(0, 18),
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : 0,
    fullMark: 100,
  }));

  // Fallback IEPC radar from criterios
  const iepcCriterios = criteriosList.filter((c) => c.group === 'iepc');
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
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <ArrowLeft size={14} /> Voltar para Analista
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Sair da Apresentação' : 'Modo Apresentação'}
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)', boxShadow: '0 4px 12px rgba(30,64,175,0.4)' }}>
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      <div className="px-6 pb-10 space-y-6">

        {/* ══ 1. HERO EXECUTIVO ══ */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0c1e3e 0%, #071428 60%, #050f20 100%)',
            border: '1px solid rgba(56,189,248,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.05) inset',
          }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">

              {/* LEFT: Photo + Info */}
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {analista?.foto_url ? (
                    <img src={analista.foto_url} alt={analista.nome}
                      className="rounded-2xl object-cover"
                      style={{ width: '110px', height: '110px', border: '3px solid rgba(56,189,248,0.4)', boxShadow: '0 0 24px rgba(56,189,248,0.2)' }} />
                  ) : (
                    <div className="rounded-2xl flex items-center justify-center font-bold text-white"
                      style={{ width: '110px', height: '110px', background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)', border: '3px solid rgba(56,189,248,0.3)', fontSize: '2.2rem', boxShadow: '0 0 24px rgba(56,189,248,0.15)' }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="font-bold text-white" style={{ fontSize: '1.85rem', letterSpacing: '-0.02em' }}>
                      {analista?.nome || feedback.analista || 'Analista'}
                    </h1>
                    {feedback.posicao_squad === 1 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'rgba(234,179,8,0.18)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.35)' }}>
                        <Star size={10} fill="currentColor" /> Destaque do Ciclo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {analista?.cargo_operacional || '—'}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>Equipe: <span className="font-semibold text-white">{analista?.equipe || feedback.equipe || feedback.squad || '—'}</span></span>
                    <span>Coordenadora: <span className="font-semibold text-white">{analista?.coordenador || feedback.coordenador || '—'}</span></span>
                  </div>
                  {feedback.auditor && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Auditor: <span className="font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{feedback.auditor}</span>
                    </p>
                  )}
                  <p className="text-xs mt-1.5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Clock size={11} /> Tempo de empresa:
                    <span className="font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {tempoDeEmpresa(analista?.data_admissao || null)}
                    </span>
                  </p>
                </div>
              </div>

              {/* CENTER: Ciclo */}
              <div className="flex-shrink-0 rounded-xl p-4 text-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '120px' }}>
                <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>CICLO</p>
                <p className="text-lg font-bold text-white">{cicloLabel}</p>
                {feedback.periodo_inicio && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                    {feedback.periodo_inicio}{feedback.periodo_fim ? ` a ${feedback.periodo_fim}` : ''}
                  </p>
                )}
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86EFAC', fontSize: '10px' }}>
                  {feedback.status === 'approved' || feedback.status === 'sent' || feedback.status === 'success' ? 'Concluído' : feedback.status === 'generated' ? 'Gerado' : 'Em Andamento'}
                </span>
              </div>

              {/* RIGHT: Scores */}
              <div className="flex gap-3 flex-shrink-0">
                {/* QA */}
                <div className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', boxShadow: '0 0 20px rgba(56,189,248,0.08) inset', minWidth: '90px' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(56,189,248,0.8)', fontSize: '9px' }}>QA</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.8rem' }}>{qaScore || '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>/100</p>
                  {(tendencias?.variacao_qa as number) != null && (tendencias.variacao_qa as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold flex items-center justify-center gap-0.5"
                      style={{ color: (tendencias.variacao_qa as number) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {(tendencias.variacao_qa as number) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(tendencias.variacao_qa as number)} pts
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>ciclo anterior</p>
                </div>

                {/* IEPC */}
                <div className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 20px rgba(34,197,94,0.08) inset', minWidth: '90px' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.8)', fontSize: '9px' }}>IEPC</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.8rem' }}>{iepcScore || '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>%</p>
                  {(tendencias?.variacao_iepc as number) != null && (tendencias.variacao_iepc as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold flex items-center justify-center gap-0.5"
                      style={{ color: (tendencias.variacao_iepc as number) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {(tendencias.variacao_iepc as number) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(tendencias.variacao_iepc as number)} pts
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>ciclo anterior</p>
                </div>

                {/* Aderência */}
                <div className="rounded-xl p-4 flex flex-col items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', minWidth: '90px' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>ADERÊNCIA</p>
                  {aderenciaScore != null
                    ? <CircleProgress value={aderenciaScore} size={72} />
                    : <p className="text-2xl font-bold text-white">—</p>}
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>aos critérios</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 2. RESUMO EXECUTIVO ══ */}
        {resumo && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}>
            <SectionTitle icon={<BarChart2 size={14} />} title="Resumo Executivo do Ciclo" />
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85' }}>{resumo}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)' }}>
                  <TrendingUp size={18} className="mx-auto mb-2 text-sky-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Evolução</p>
                  {tendencias?.variacao_qa !== undefined && <p className="text-sm font-bold text-sky-400">+{tendencias.variacao_qa as number} pts QA</p>}
                  {tendencias?.variacao_iepc !== undefined && <p className="text-xs text-green-400">+{tendencias.variacao_iepc as number} pts IEPC</p>}
                </div>
              )}
              {feedback.posicao_squad != null && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}>
                  <Users size={18} className="mx-auto mb-2 text-yellow-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Posição no Squad</p>
                  <p className="text-sm font-bold text-yellow-400">Top {feedback.posicao_squad}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>entre {feedback.total_squad || '?'} analistas</p>
                </div>
              )}
              {atendimentos.length > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                  <MessageSquare size={18} className="mx-auto mb-2 text-purple-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Atendimentos</p>
                  <p className="text-sm font-bold text-purple-400">{atendimentos.length} avaliados</p>
                  {qaScore > 0 && <p className="text-xs text-purple-300">Média: {qaScore} pts</p>}
                </div>
              )}
              {feedback.ciclos_consecutivos_evolucao > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <TrendingUp size={18} className="mx-auto mb-2 text-green-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Tendência</p>
                  <p className="text-sm font-bold text-green-400">Em evolução</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{feedback.ciclos_consecutivos_evolucao} ciclos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 3. QA + IEPC SIDE BY SIDE ══ */}
        <div className="grid lg:grid-cols-2 gap-5">

          {/* QA */}
          <div className="rounded-xl p-5"
            style={{ backgroundColor: 'rgba(56,189,248,0.03)', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 2px 16px rgba(56,189,248,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Target size={14} />} title="QA — Qualidade" color="rgba(56,189,248,0.8)" />
              <span className="text-2xl font-bold text-sky-400">{qaScore || '—'}<span className="text-sm font-normal text-sky-400/60">/100</span></span>
            </div>

            {/* Horizontal bars */}
            {(feedback.pilares_qa || []).length > 0 ? (
              <div className="space-y-3 mb-5">
                {(feedback.pilares_qa || []).map((p, i) => {
                  const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                  const color = PILAR_COLORS_QA[i % PILAR_COLORS_QA.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {i + 1}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{p.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                          {p.variacao !== undefined && p.variacao !== 0 && (
                            <span className={`font-semibold text-xs ${p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {p.variacao >= 0 ? '↑' : '↓'}{Math.abs(p.variacao)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum pilar QA registrado</p>
            )}

            {/* Radar QA */}
            {qaRadarData.length >= 3 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wider text-center" style={{ color: 'rgba(56,189,248,0.6)' }}>Radar QA</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={qaRadarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="QA" dataKey="value" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* IEPC */}
          <div className="rounded-xl p-5"
            style={{ backgroundColor: 'rgba(34,197,94,0.03)', border: '1px solid rgba(34,197,94,0.15)', boxShadow: '0 2px 16px rgba(34,197,94,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Activity size={14} />} title="IEPC — Experiência" color="rgba(34,197,94,0.8)" />
              <span className="text-2xl font-bold text-green-400">{iepcScore || '—'}<span className="text-sm font-normal text-green-400/60">%</span></span>
            </div>

            {/* Horizontal bars */}
            {(feedback.pilares_iepc || []).length > 0 ? (
              <div className="space-y-3 mb-5">
                {(feedback.pilares_iepc || []).map((p, i) => {
                  const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                  const color = PILAR_COLORS_IEPC[i % PILAR_COLORS_IEPC.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: `${color}20`, color }}>
                            {i + 1}
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{p.nome}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                          {p.variacao !== undefined && p.variacao !== 0 && (
                            <span className={`font-semibold text-xs ${p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {p.variacao >= 0 ? '↑' : '↓'}{Math.abs(p.variacao)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
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
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>{c.label}</span>
                        <span className="font-bold text-white">{c.pts}/{c.max}</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum pilar IEPC registrado</p>
            )}

            {/* Radar IEPC */}
            {iepcRadarFinal.length >= 3 && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wider text-center" style={{ color: 'rgba(34,197,94,0.6)' }}>Radar IEPC</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={iepcRadarFinal}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="IEPC" dataKey="value" stroke="#22C55E" fill="#22C55E" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ══ 4. HEATMAP DE CRITÉRIOS ══ */}
        {criteriosList.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<BarChart2 size={14} />} title="Heatmap de Critérios — Analytics Evolutivo" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Critério', 'Grupo', 'Pts', 'Máx', 'Aderência', 'Tendência', 'Evidência'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 font-semibold uppercase tracking-wide"
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteriosList.map((c) => {
                    const isGood = c.pct >= 80;
                    const isMid = c.pct >= 50 && c.pct < 80;
                    const color = isGood ? '#22C55E' : isMid ? '#EAB308' : '#EF4444';
                    const bgColor = isGood ? 'rgba(34,197,94,0.06)' : isMid ? 'rgba(234,179,8,0.06)' : 'rgba(239,68,68,0.06)';
                    const trendIcon = c.class === 'nao_pontuou' ? '↓' : c.pct >= 80 ? '↑' : c.pct >= 60 ? '→' : '↓';
                    const trendColor = trendIcon === '↑' ? '#22C55E' : trendIcon === '→' ? '#EAB308' : '#EF4444';
                    return (
                      <tr key={c.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: bgColor }}>
                        <td className="py-2.5 px-3 font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.label}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ backgroundColor: c.group === 'qa' ? 'rgba(56,189,248,0.1)' : 'rgba(34,197,94,0.1)', color: c.group === 'qa' ? '#38BDF8' : '#22C55E' }}>
                            {c.group.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{ color }}>{c.pts}</td>
                        <td className="py-2.5 px-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.max}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: color }} />
                            </div>
                            <span className="font-bold" style={{ color }}>{c.pct}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-bold" style={{ color: trendColor }}>{trendIcon}</td>
                        <td className="py-2.5 px-3 max-w-xs" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
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
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<TrendingUp size={14} />} title="Evolução Histórica" />
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <YAxis domain={[50, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="qa_score" stroke="#38BDF8" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 4 }} name="QA" />
                <Line type="monotone" dataKey="iepc_score" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} name="IEPC" />
              </LineChart>
            </ResponsiveContainer>
            {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
              <p className="text-xs text-center mt-2 font-medium" style={{ color: 'rgba(34,197,94,0.7)' }}>
                {tendencias?.variacao_qa !== undefined && `Você evoluiu +${tendencias.variacao_qa} pts no QA`}
                {tendencias?.variacao_qa !== undefined && tendencias?.variacao_iepc !== undefined && ' e '}
                {tendencias?.variacao_iepc !== undefined && `+${tendencias.variacao_iepc} pts no IEPC`}
                {' nos últimos ciclos.'}
              </p>
            )}
          </div>
        )}

        {/* ══ 6. PONTOS FORTES + OPORTUNIDADES ══ */}
        {((feedback.pontos_fortes?.length || 0) > 0 || (feedback.oportunidades?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-5">
            {(feedback.pontos_fortes?.length || 0) > 0 && (
              <div className="rounded-xl p-5"
                style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', boxShadow: '0 2px 12px rgba(34,197,94,0.05)' }}>
                <SectionTitle icon={<Award size={14} />} title="Pontos Fortes" color="rgba(34,197,94,0.8)" />
                <div className="space-y-4">
                  {(feedback.pontos_fortes || []).slice(0, 5).map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                        <CheckCircle size={14} className="text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>{p.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(feedback.oportunidades?.length || 0) > 0 && (
              <div className="rounded-xl p-5"
                style={{ backgroundColor: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.15)', boxShadow: '0 2px 12px rgba(251,146,60,0.05)' }}>
                <SectionTitle icon={<Target size={14} />} title="Oportunidades de Evolução" color="rgba(251,146,60,0.8)" />
                <div className="space-y-4">
                  {(feedback.oportunidades || []).slice(0, 5).map((o, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: 'rgba(251,146,60,0.15)' }}>
                        <AlertCircle size={14} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{o.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>{o.descricao}</p>
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
            style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 2px 12px rgba(56,189,248,0.04)' }}>
            <SectionTitle icon={<Zap size={14} />} title="Evolução Técnica" color="rgba(56,189,248,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_tecnica}</p>
          </div>
        )}

        {/* ══ 8. EVOLUÇÃO COMPORTAMENTAL ══ */}
        {feedback.evolucao_comportamental && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)', boxShadow: '0 2px 12px rgba(167,139,250,0.04)' }}>
            <SectionTitle icon={<Users size={14} />} title="Evolução Comportamental" color="rgba(167,139,250,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_comportamental}</p>
          </div>
        )}

        {/* ══ 9. RISCO OPERACIONAL ══ */}
        {feedback.risco_operacional && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.14)', boxShadow: '0 2px 12px rgba(239,68,68,0.04)' }}>
            <SectionTitle icon={<Shield size={14} />} title="Risco Operacional" color="rgba(239,68,68,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.risco_operacional}</p>
          </div>
        )}

        {/* ══ 10. COACHING DE COMUNICAÇÃO ══ */}
        {(feedback.feedback_coaching?.length || 0) > 0 && (
          <div className="rounded-xl p-6"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<MessageSquare size={14} />} title="Coaching de Comunicação" />
            <div className="space-y-5">
              {(feedback.feedback_coaching || []).map((c, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.18)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: '#38BDF8' }}>O Que Foi Dito</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.7' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                  </div>
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.28)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: '#EAB308' }}>Como Poderia Ser</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: '1.7' }}>{c.como_poderia_ser}</p>
                  </div>
                  <div className="rounded-xl p-5"
                    style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.22)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-1" style={{ color: '#38BDF8' }}>
                      <Star size={11} fill="currentColor" /> Dica de Ouro
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.7' }}>{c.dica_de_ouro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 11. ATENDIMENTOS AVALIADOS — ACCORDION ══ */}
        {atendimentos.length > 0 && (
          <div className="rounded-xl p-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={<Eye size={14} />} title={`Atendimentos Avaliados (${atendimentos.length})`} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Clique para expandir</span>
            </div>
            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)' }}>
              <span className="w-6 text-center">#</span>
              <span style={{ minWidth: '80px' }}>Protocolo</span>
              <span style={{ minWidth: '120px' }}>Cliente</span>
              <span className="flex-1">Assunto</span>
              <span className="flex-shrink-0">QA</span>
              <span className="flex-shrink-0 ml-3">IEPC</span>
              <span className="flex-shrink-0 ml-3 hidden sm:block">Classificação</span>
              <span className="w-4" />
            </div>
            {atendimentos.map((a, i) => (
              <AtendimentoAccordion key={a.id || i} atendimento={a} index={i} />
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
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<Award size={14} />} title="Conquistas e Evolução" />
            <div className="grid md:grid-cols-2 gap-3">
              {(feedback.conquistas || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{c.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-green-400">{c.valor}</span>
                    {c.periodo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.periodo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 14. FECHAMENTO ══ */}
        <div className="rounded-xl p-6"
          style={{ background: 'linear-gradient(135deg, rgba(30,64,175,0.18), rgba(7,20,40,0.85))', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 4px 20px rgba(30,64,175,0.1)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-orange-400">Desenvolvimento e evolução contínua.</p>
              <p className="text-sm font-semibold text-sky-400">Você está no caminho certo!</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Documento confidencial • Uso interno</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>QualiVisão People Analytics © 2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ciclo: {cicloLabel} • Versão 1.0</p>
              <p className="text-sm font-extrabold mt-1 tracking-widest" style={{ color: 'rgba(56,189,248,0.7)' }}>QualiVisão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {fullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: '#060E1E' }}>
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
    // Merge raw API fields from snapshot
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
  // Primary: feedback_atendimentos table
  if (feedback.feedback_atendimentos && feedback.feedback_atendimentos.length > 0) {
    return feedback.feedback_atendimentos;
  }

  // Fallback: evidencias from raw payload
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
    }));
  }

  return [];
}