'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ImportModal from '@/components/ImportModal';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import {
  fetchCycleScores,
  fetchAllPeriodos,
  fetchNCRecords,
  fetchElogios,
  buildAnalystsFromScores,
  fetchManualCycles,
  listenDataChanged,
} from '@/lib/services/dataService';
import {
  fetchCycleScoresFromSupabase,
  fetchNCRecordsFromSupabase,
  fetchElogiosFromSupabase,
  fetchAllPeriodosFromSupabase,
} from '@/lib/services/supabaseDataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,  } from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, Star, Users, BarChart2, Activity,
  RefreshCw, ChevronRight, Sparkles, Lock, CheckCircle, X, Filter, Calendar,
  ChevronDown, Info, Target, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useChat } from '@/lib/hooks/useChat';
import { createClient } from '@/lib/supabase/client';
import { DrilldownPanel } from '@/components/DrilldownNavigation';

// ─── Official pillar weights ──────────────────────────────────────────────────
const QA_PILLAR_WEIGHTS = { p1: 22, p2: 34, p3: 18, p4: 14, p5: 12 };
const IEPC_PILLAR_WEIGHTS = { e1: 30, e2: 20, e3: 20, e4: 15, e5: 15 };

// Fixed colors per category (consistent across all charts)
const PILLAR_COLORS = {
  p1: '#3B82F6', // blue - Fluxo
  p2: '#06B6D4', // cyan - Tratativa
  p3: '#10B981', // green - Análise
  p4: '#F59E0B', // yellow - Comunicação
  p5: '#8B5CF6', // purple - Conduta
  e1: '#3B82F6', // blue - Resolução
  e2: '#06B6D4', // cyan - Compreensão
  e3: '#10B981', // green - Esforço
  e4: '#F59E0B', // yellow - Tempo
  e5: '#8B5CF6', // purple - Relacional
};

const NC_COLORS = ['#3B82F6', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6'];

// Official NC categories with fixed colors
const NC_CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  'NC-1': { label: 'NC-1 Postura e Ética', color: '#3B82F6' },
  'NC-2': { label: 'NC-2 Acuracidade Técnica', color: '#06B6D4' },
  'NC-3': { label: 'NC-3 Registro e Rastreab.', color: '#F59E0B' },
  'NC-4': { label: 'NC-4 Fluxo Operacional', color: '#EF4444' },
  'NC-5': { label: 'NC-5 Segurança da Info.', color: '#8B5CF6' },
};

function normalizeNCType(raw: string): string {
  if (!raw) return 'Outros';
  const upper = raw.toUpperCase().trim();
  if (upper.includes('NC-1') || upper.includes('NC1') || upper.includes('POSTURA') || upper.includes('ÉTICA') || upper.includes('ETICA')) return 'NC-1';
  if (upper.includes('NC-2') || upper.includes('NC2') || upper.includes('ACURAC') || upper.includes('TÉCNIC') || upper.includes('TECNIC')) return 'NC-2';
  if (upper.includes('NC-3') || upper.includes('NC3') || upper.includes('REGISTRO') || upper.includes('RASTREAB')) return 'NC-3';
  if (upper.includes('NC-4') || upper.includes('NC4') || upper.includes('FLUXO') || upper.includes('OPERAC')) return 'NC-4';
  if (upper.includes('NC-5') || upper.includes('NC5') || upper.includes('SEGURANÇA') || upper.includes('SEGURANCA') || upper.includes('INFORMA')) return 'NC-5';
  return raw.trim();
}

// ─── Performance Classification ──────────────────────────────────────────────
function getPerformanceClass(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 90) return { label: 'Excelência Operacional', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
  if (score >= 80) return { label: 'Performance Esperada', color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.3)' };
  if (score >= 70) return { label: 'Operacional', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  return { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
}

function PerformanceBadge({ score, size = 'sm' }: { score: number; size?: 'xs' | 'sm' | 'md' }) {
  const cls = getPerformanceClass(score);
  const textSize = size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-xs';
  const px = size === 'xs' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';
  return (
    <span className={`${textSize} ${px} rounded-full font-semibold`} style={{ color: cls.color, backgroundColor: cls.bg, border: `1px solid ${cls.border}` }}>
      {cls.label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PeriodSummary {
  periodo: string;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  analistas: number;
  squads: Record<string, { qa: number; iepc: number; count: number }>;
  coordenadores: Record<string, { qa: number; count: number }>;
  // pillar averages (raw points)
  p1?: number; p2?: number; p3?: number; p4?: number; p5?: number;
  e1?: number; e2?: number; e3?: number; e4?: number; e5?: number;
  ncByType?: { name: string; value: number; color: string; pct: number }[];
}

function calcTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const diff = values[values.length - 1] - values[values.length - 2];
  if (diff > 0.5) return 'up';
  if (diff < -0.5) return 'down';
  return 'stable';
}

function getHeatColor(val: number): string {
  if (val >= 90) return '#10b981';
  if (val >= 80) return '#facc15';
  if (val >= 70) return '#f59e0b';
  return '#ef4444';
}

function getHeatBg(val: number): string {
  if (val >= 90) return 'rgba(16,185,129,0.18)';
  if (val >= 80) return 'rgba(250,204,21,0.12)';
  if (val >= 70) return 'rgba(245,158,11,0.18)';
  return 'rgba(239,68,68,0.18)';
}

/** Convert raw pillar points to 0-100 percentage using official max weights */
function toPercent(raw: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round(Math.min((raw / max) * 100, 100));
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Strategic Radar Chart ────────────────────────────────────────────────────
interface StrategicRadarProps {
  data: { subject: string; weight: number; pct: number; color: string; fullName: string }[];
  type: 'QA' | 'IEPC';
  maxScale: number;
}

function StrategicRadarChart({ data, type, maxScale }: StrategicRadarProps) {
  const radarData = data.map(d => ({ subject: d.subject, value: d.weight, fullName: d.fullName, pct: d.pct, color: d.color }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="font-bold text-white mb-1">{d.fullName}</p>
        <p style={{ color: '#94A3B8' }}>Peso: <span className="font-bold text-white">{d.value} pts</span></p>
        <p style={{ color: '#94A3B8' }}>% do total: <span className="font-bold" style={{ color: type === 'QA' ? '#38BDF8' : '#06B6D4' }}>{d.value}%</span></p>
      </div>
    );
  };

  // Custom label outside radar
  const CustomLabel = (props: any) => {
    const { x, y, payload } = props;
    const item = data.find(d => d.subject === payload?.value);
    if (!item) return null;
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={600} fill="#94A3B8">
        {item.subject}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={radarData} margin={{ top: 15, right: 25, bottom: 15, left: 25 }}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" gridType="polygon" />
        <PolarAngleAxis dataKey="subject" tick={<CustomLabel />} />
        <PolarRadiusAxis angle={90} domain={[0, maxScale]} tick={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          name={type === 'QA' ? 'Peso QA' : 'Peso IEPC'}
          dataKey="value"
          stroke={type === 'QA' ? '#38BDF8' : '#06B6D4'}
          fill={type === 'QA' ? '#38BDF8' : '#06B6D4'}
          fillOpacity={0.12}
          strokeWidth={2.5}
          dot={{ fill: type === 'QA' ? '#38BDF8' : '#06B6D4', r: 4, strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── NC Donut Chart ───────────────────────────────────────────────────────────
interface NCDonutProps {
  ncData: { name: string; value: number; color: string; pct: number }[];
  total: number;
}

function NCDonutChart({ ncData, total }: NCDonutProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="font-bold text-white">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }}>{payload[0].value} NCs ({payload[0].payload.pct}%)</p>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-5">
      {/* Donut */}
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
        <PieChart width={130} height={130}>
          <Pie
            data={ncData.length > 0 ? ncData : [{ name: 'Sem NCs', value: 1, color: 'rgba(255,255,255,0.08)', pct: 0 }]}
            cx={60} cy={60}
            innerRadius={40} outerRadius={58}
            dataKey="value"
            paddingAngle={ncData.length > 0 ? 3 : 0}
            startAngle={90}
            endAngle={-270}
          >
            {(ncData.length > 0 ? ncData : [{ name: 'Sem NCs', value: 1, color: 'rgba(255,255,255,0.08)', pct: 0 }]).map((entry, index) => (
              <Cell key={index} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
        {/* Center text */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <p className="text-xl font-bold text-white leading-none">{total}</p>
          <p className="text-[9px] mt-0.5" style={{ color: '#64748B' }}>Total NCs</p>
        </div>
      </div>

      {/* Lateral list — always visible */}
      <div className="flex-1 space-y-2">
        {ncData.length > 0 ? ncData.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs truncate" style={{ color: '#94A3B8' }}>{item.name.replace('NC-', 'NC').split(' ').slice(0, 3).join(' ')}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs font-bold text-white">{item.value}</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                {item.pct}%
              </span>
            </div>
          </div>
        )) : (
          <p className="text-xs py-4 text-center" style={{ color: '#64748B' }}>Sem NCs registradas no ciclo</p>
        )}
      </div>
    </div>
  );
}

// ─── Pilar Modal (with real cycle data) ──────────────────────────────────────
interface PilarModalProps {
  type: 'QA' | 'IEPC' | 'NC';
  onClose: () => void;
  qaPillars?: { subject: string; weight: number; pct: number; color: string; fullName: string }[];
  iepcPillars?: { subject: string; weight: number; pct: number; color: string; fullName: string }[];
  ncData?: { name: string; value: number; color: string; pct: number }[];
  totalNCs?: number;
  periodo?: string;
}

const QA_PILAR_DETAILS = [
  {
    code: 'P1', name: 'Gestão do Fluxo e Rastreabilidade',
    peso: 22,
    descricao: 'Avalia a capacidade do analista de seguir e documentar o fluxo operacional corretamente.',
    objetivo: 'Garantir rastreabilidade total das demandas e conformidade com os processos estabelecidos.',
    subpilares: ['6.1 Identificação e Boas-vindas (5pts)', '6.2 Formalização e Comunicação do Protocolo SUP (9pts)', '6.3 Encerramento Conforme Etapa da Tratativa (8pts)'],
    impacto: 'Diretamente ligado à auditabilidade e governança operacional.',
  },
  {
    code: 'P2', name: 'Gestão da Tratativa da Demanda',
    peso: 34,
    descricao: 'Mede a qualidade e efetividade na resolução das demandas dos clientes.',
    objetivo: 'Assegurar que cada demanda seja tratada com a devida atenção, agilidade e resolução efetiva.',
    subpilares: ['6.4 Resolução ou Próximo Passo (10pts)', '6.5 Documentação Técnica do Atendimento (8pts)', '6.6 Orientação Técnica e Acompanhamento (10pts)', '6.7 Assertividade no Direcionamento da Demanda (6pts)'],
    impacto: 'Impacta diretamente a satisfação do cliente e os indicadores de IEPC.',
  },
  {
    code: 'P3', name: 'Análise e Assertividade Técnica',
    peso: 18,
    descricao: 'Avalia a precisão técnica e capacidade analítica do profissional.',
    objetivo: 'Garantir que as análises sejam corretas, fundamentadas e orientadas à solução.',
    subpilares: ['Diagnóstico correto', 'Solução técnica adequada', 'Conhecimento do produto', 'Precisão da informação'],
    impacto: 'Reduz retrabalho, NCs e aumenta a confiança do cliente.',
  },
  {
    code: 'P4', name: 'Qualidade da Comunicação',
    peso: 14,
    descricao: 'Avalia clareza, objetividade e profissionalismo na comunicação.',
    objetivo: 'Garantir que a comunicação seja clara, profissional e orientada ao entendimento do cliente.',
    subpilares: ['Clareza da mensagem', 'Tom profissional', 'Objetividade', 'Gramática e ortografia'],
    impacto: 'Influencia diretamente a percepção do cliente e o IEPC.',
  },
  {
    code: 'P5', name: 'Conduta Relacional',
    peso: 12,
    descricao: 'Avalia o comportamento ético, empático e relacional do analista.',
    objetivo: 'Promover uma cultura de excelência relacional e ética operacional.',
    subpilares: ['Empatia', 'Ética profissional', 'Postura', 'Relacionamento com cliente'],
    impacto: 'Base da experiência do cliente e da reputação da operação.',
  },
];

const IEPC_PILAR_DETAILS = [
  {
    code: 'E1', name: 'Resolução Percebida',
    peso: 30,
    experiencia: 'O cliente percebe que seu problema foi resolvido de forma efetiva.',
    comportamento: 'Confirmar a resolução com o cliente e garantir satisfação antes de encerrar.',
    impactoCliente: 'Principal driver de satisfação e fidelização.',
    subpilares: ['1.1 Clareza do Status Final (10pts)', '1.2 Percepção de Avanço (10pts)', '1.3 Alinhamento dos Próximos Passos (10pts)'],
  },
  {
    code: 'E2', name: 'Compreensão e Segurança Percebida',
    peso: 20,
    experiencia: 'O cliente sente que foi compreendido e que está em boas mãos.',
    comportamento: 'Demonstrar entendimento do problema e transmitir confiança na solução.',
    impactoCliente: 'Reduz ansiedade e aumenta confiança na operação.',
    subpilares: ['2.1 Clareza da Comunicação (7pts)', '2.2 Segurança Transmitida (7pts)', '2.3 Validação do Entendimento (6pts)'],
  },
  {
    code: 'E3', name: 'Esforço Percebido pelo Cliente',
    peso: 20,
    experiencia: 'O cliente percebe que não precisou se esforçar muito para resolver seu problema.',
    comportamento: 'Simplificar processos, antecipar necessidades e reduzir fricções.',
    impactoCliente: 'Diretamente ligado ao CES (Customer Effort Score).',
    subpilares: ['3.1 Facilidade de Execução (7pts)', '3.2 Evitar Repetição (7pts)', '3.3 Condução Guiada (6pts)'],
  },
  {
    code: 'E4', name: 'Tempo e Fluidez',
    peso: 15,
    experiencia: 'O cliente percebe agilidade e fluidez no atendimento.',
    comportamento: 'Atender com agilidade sem comprometer a qualidade da solução.',
    impactoCliente: 'Impacta diretamente o NPS e a percepção de eficiência.',
    subpilares: ['4.1 Agilidade (5pts)', '4.2 Gestão de Expectativa (5pts)', '4.3 Continuidade (5pts)'],
  },
  {
    code: 'E5', name: 'Experiência Relacional',
    peso: 15,
    experiencia: 'O cliente percebe um atendimento humanizado, empático e personalizado.',
    comportamento: 'Tratar cada cliente de forma única, com empatia e personalização.',
    impactoCliente: 'Gera lealdade emocional e elogios espontâneos.',
    subpilares: ['5.1 Cordialidade (5pts)', '5.2 Empatia (5pts)', '5.3 Encerramento Positivo (5pts)'],
  },
];

const NC_DETAILS = [
  { code: 'NC-1', name: 'Postura e Ética', definicao: 'Comportamento inadequado, falta de ética ou postura profissional comprometida.', severidade: 'Alta', penalidade: '-20 pontos QA', impacto: 'Risco reputacional e cultural', exemplos: ['Linguagem inapropriada', 'Descaso com o cliente', 'Comportamento antiético'], reincidencia: 'Dobra a penalidade na 2ª ocorrência' },
  { code: 'NC-2', name: 'Acuracidade Técnica', definicao: 'Informação técnica incorreta ou solução inadequada fornecida ao cliente.', severidade: 'Alta', penalidade: '-20 pontos QA', impacto: 'Retrabalho e insatisfação do cliente', exemplos: ['Diagnóstico errado', 'Solução incorreta', 'Informação desatualizada'], reincidencia: 'Gera PDI obrigatório na 3ª ocorrência' },
  { code: 'NC-3', name: 'Registro e Rastreabilidade', definicao: 'Falha no registro, documentação ou rastreabilidade da demanda.', severidade: 'Média', penalidade: '-20 pontos QA', impacto: 'Comprometimento da auditoria e governança', exemplos: ['Atendimento não registrado', 'Documentação incompleta', 'Protocolo não gerado'], reincidencia: 'Revisão de processo obrigatória' },
  { code: 'NC-4', name: 'Fluxo Operacional', definicao: 'Desvio do fluxo operacional estabelecido ou não seguimento de protocolo.', severidade: 'Média', penalidade: '-20 pontos QA', impacto: 'Inconsistência operacional e risco de SLA', exemplos: ['Pular etapa do processo', 'Encaminhamento incorreto', 'Protocolo não seguido'], reincidencia: 'Treinamento obrigatório' },
  { code: 'NC-5', name: 'Segurança da Informação', definicao: 'Exposição ou manuseio inadequado de dados sensíveis do cliente.', severidade: 'Crítica', penalidade: '-20 pontos QA', impacto: 'Risco legal, LGPD e reputacional', exemplos: ['Compartilhamento de dados indevido', 'Acesso não autorizado', 'Exposição de informações confidenciais'], reincidencia: 'Processo disciplinar imediato' },
];

function PilarModal({ type, onClose, qaPillars, iepcPillars, ncData, totalNCs, periodo }: PilarModalProps) {
  const qaColor = '#38BDF8';
  const iepcColor = '#06B6D4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: type === 'QA' ? 'rgba(56,189,248,0.15)' : type === 'IEPC' ? 'rgba(6,182,212,0.15)' : 'rgba(239,68,68,0.15)' }}>
              {type === 'QA' ? <Target size={16} style={{ color: qaColor }} /> : type === 'IEPC' ? <Star size={16} style={{ color: iepcColor }} /> : <AlertTriangle size={16} style={{ color: '#EF4444' }} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {type === 'QA' ? 'Mapa Estratégico QA — Pilares e Dados do Ciclo' : type === 'IEPC' ? 'Mapa Estratégico IEPC — Pilares e Dados do Ciclo' : 'Não Conformidades — Guia Oficial'}
              </h3>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                {type === 'QA' ? `Ciclo: ${periodo || '—'} · 5 pilares de qualidade operacional` : type === 'IEPC' ? `Ciclo: ${periodo || '—'} · 5 pilares de experiência percebida` : 'Definições, severidades e penalidades'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X size={14} style={{ color: '#94A3B8' }} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {/* Radar visual at top of modal */}
          {type === 'QA' && qaPillars && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: qaColor }}>Distribuição Estratégica — Pesos Oficiais QA (Total: 100 pts)</p>
              <div className="flex items-center gap-4">
                <div style={{ flex: '0 0 220px' }}>
                  <StrategicRadarChart data={qaPillars} type="QA" maxScale={40} />
                </div>
                <div className="flex-1 space-y-2">
                  {qaPillars.map((p) => (
                    <div key={p.subject} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs flex-1" style={{ color: '#94A3B8' }}>{p.fullName}</span>
                      <span className="text-xs font-bold" style={{ color: p.color }}>{p.weight} pts</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {type === 'IEPC' && iepcPillars && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: iepcColor }}>Distribuição Estratégica — Pesos Oficiais IEPC (Total: 100 pts)</p>
              <div className="flex items-center gap-4">
                <div style={{ flex: '0 0 220px' }}>
                  <StrategicRadarChart data={iepcPillars} type="IEPC" maxScale={35} />
                </div>
                <div className="flex-1 space-y-2">
                  {iepcPillars.map((p) => (
                    <div key={p.subject} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs flex-1" style={{ color: '#94A3B8' }}>{p.fullName}</span>
                      <span className="text-xs font-bold" style={{ color: p.color }}>{p.weight} pts</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pillar details */}
          {type === 'QA' && QA_PILAR_DETAILS.map((p) => {
            const pillarData = qaPillars?.find(d => d.subject.startsWith(p.code));
            const cls = getPerformanceClass(pillarData?.pct || 0);
            return (
              <div key={p.code} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: qaColor }}>{p.code}</span>
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: qaColor }}>Peso: {p.peso} pts</span>
                  </div>
                  {pillarData && pillarData.pct > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: cls.color }}>{pillarData.pct}%</span>
                      <PerformanceBadge score={pillarData.pct} size="xs" />
                    </div>
                  )}
                </div>
                <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>{p.descricao}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span style={{ color: '#64748B' }}>Objetivo: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.objetivo}</span></div>
                  <div><span style={{ color: '#64748B' }}>Impacto: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.impacto}</span></div>
                  <div className="col-span-2"><span style={{ color: '#64748B' }}>Subpilares: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.subpilares.join(' · ')}</span></div>
                </div>
              </div>
            );
          })}

          {type === 'IEPC' && IEPC_PILAR_DETAILS.map((p) => {
            const pillarData = iepcPillars?.find(d => d.subject.startsWith(p.code));
            const cls = getPerformanceClass(pillarData?.pct || 0);
            return (
              <div key={p.code} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(6,182,212,0.15)', color: iepcColor }}>{p.code}</span>
                    <span className="text-sm font-semibold text-white">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: iepcColor }}>Peso: {p.peso} pts</span>
                  </div>
                  {pillarData && pillarData.pct > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: cls.color }}>{pillarData.pct}%</span>
                      <PerformanceBadge score={pillarData.pct} size="xs" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span style={{ color: '#64748B' }}>Experiência: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.experiencia}</span></div>
                  <div><span style={{ color: '#64748B' }}>Comportamento: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.comportamento}</span></div>
                  <div><span style={{ color: '#64748B' }}>Impacto: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.impactoCliente}</span></div>
                  <div className="col-span-2"><span style={{ color: '#64748B' }}>Subpilares: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{p.subpilares.join(' · ')}</span></div>
                </div>
              </div>
            );
          })}

          {type === 'NC' && (
            <>
              {ncData && ncData.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: '#EF4444' }}>Distribuição de NCs no Ciclo — Total: {totalNCs}</p>
                  <NCDonutChart ncData={ncData} total={totalNCs || 0} />
                </div>
              )}
              {NC_DETAILS.map((nc) => (
                <div key={nc.code} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>{nc.code}</span>
                      <span className="text-sm font-semibold text-white">{nc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: nc.severidade === 'Crítica' ? 'rgba(239,68,68,0.2)' : nc.severidade === 'Alta' ? 'rgba(245,158,11,0.2)' : 'rgba(250,204,21,0.2)', color: nc.severidade === 'Crítica' ? '#ef4444' : nc.severidade === 'Alta' ? '#f59e0b' : '#facc15' }}>{nc.severidade}</span>
                      <span className="text-xs font-bold" style={{ color: '#ef4444' }}>{nc.penalidade}</span>
                    </div>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>{nc.definicao}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span style={{ color: '#64748B' }}>Impacto: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{nc.impacto}</span></div>
                    <div><span style={{ color: '#64748B' }}>Reincidência: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{nc.reincidencia}</span></div>
                    <div className="col-span-2"><span style={{ color: '#64748B' }}>Exemplos: </span><span style={{ color: 'rgba(255,255,255,0.7)' }}>{nc.exemplos.join(' • ')}</span></div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Close Cycle Modal ────────────────────────────────────────────────────────
interface CloseCycleModalProps {
  periodo: string;
  summary: PeriodSummary;
  onClose: () => void;
  onConfirm: (aiSummary: string) => Promise<void>;
}

function CloseCycleModal({ periodo, summary, onClose, onConfirm }: CloseCycleModalProps) {
  const [step, setStep] = useState<'confirm' | 'generating' | 'done'>('confirm');
  const [aiSummary, setAiSummary] = useState('');
  const [closing, setClosing] = useState(false);
  const { response, isLoading, sendMessage } = useChat('GEMINI', 'gemini/gemini-2.5-flash', false);

  useEffect(() => {
    if (response && !isLoading && step === 'generating') {
      setAiSummary(response);
      setStep('done');
    }
  }, [response, isLoading, step]);

  const handleGenerate = () => {
    setStep('generating');
    const squadLines = Object.entries(summary.squads)
      .map(([sq, d]) => `  - ${sq}: QA ${d.qa.toFixed(1)}%, IEPC ${d.iepc.toFixed(1)}%, ${d.count} analistas`)
      .join('\n');
    const prompt = `Você é um gestor de qualidade sênior. Gere um FECHAMENTO OFICIAL do ciclo ${periodo} em português, com:
1. Resumo executivo (2 frases)
2. Destaques positivos (bullet points)
3. Pontos de atenção (bullet points)
4. PDIs recomendados para analistas com QA abaixo de 80%
5. Próximos passos para o ciclo seguinte

Dados do ciclo:
- QA Médio: ${summary.qa.toFixed(1)}%
- IEPC Médio: ${summary.iepc.toFixed(1)}%
- Total NCs: ${summary.ncs}
- Total Elogios: ${summary.elogios}
- Analistas avaliados: ${summary.analistas}
- Performance por squad:\n${squadLines}

Seja objetivo, profissional e orientado a ação.`;
    sendMessage([{ role: 'user', content: prompt }], { temperature: 0.6, max_tokens: 800 });
  };

  const handleConfirmClose = async () => {
    setClosing(true);
    await onConfirm(aiSummary);
    setClosing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <Lock size={14} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Fechar Ciclo — {periodo}</h3>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Esta ação congela os dados e gera snapshot permanente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X size={14} style={{ color: '#94A3B8' }} />
          </button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {step === 'confirm' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'QA Médio', value: `${summary.qa.toFixed(1)}%`, color: getPerformanceClass(summary.qa).color },
                  { label: 'IEPC Médio', value: `${summary.iepc.toFixed(1)}%`, color: getPerformanceClass(summary.iepc).color },
                  { label: 'Analistas', value: String(summary.analistas), color: '#38BDF8' },
                  { label: 'NCs', value: String(summary.ncs), color: summary.ncs > 10 ? '#EF4444' : '#94A3B8' },
                  { label: 'Elogios', value: String(summary.elogios), color: '#F59E0B' },
                  { label: 'Squads', value: String(Object.keys(summary.squads).length), color: '#06B6D4' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#EF4444' }}>⚠️ Atenção</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Ao fechar o ciclo, os dados serão congelados e não poderão ser editados. Um snapshot será gerado automaticamente com resumo IA e PDIs recomendados.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleGenerate} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <Sparkles size={14} />Gerar Fechamento IA
                </button>
              </div>
            </>
          )}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-white mb-1">Gemini analisando ciclo...</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Gerando resumo executivo, PDIs e próximos passos</p>
            </div>
          )}
          {step === 'done' && (
            <>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} style={{ color: '#38BDF8' }} />
                  <span className="text-xs font-semibold" style={{ color: '#38BDF8' }}>Fechamento IA — Gemini</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>{aiSummary}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleConfirmClose} disabled={closing} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {closing ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                  {closing ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeExecutiveView() {
  const [importOpen, setImportOpen] = useState(false);
  const { session, userRole, userSquad, userSquads } = useSystemAuth();
  const [history, setHistory] = useState<PeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPeriodos, setAllPeriodos] = useState<string[]>([]);
  const [closeCycleOpen, setCloseCycleOpen] = useState(false);
  const [closeCycleSuccess, setCloseCycleSuccess] = useState(false);
  const [drilldownCiclo, setDrilldownCiclo] = useState<string | null>(null);
  const [pilarModal, setPilarModal] = useState<'QA' | 'IEPC' | 'NC' | null>(null);

  const [filterCiclo, setFilterCiclo] = useState<string>('todos');
  const [filterSquad, setFilterSquad] = useState<string>('todos');
  const [filterGestor, setFilterGestor] = useState<string>('todos');
  const [filterOpen, setFilterOpen] = useState<'ciclo' | 'squad' | 'gestor' | null>(null);

  const [lastUpdate] = useState(() => {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  });

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral' ||
    userRole === 'Admin' || userRole === 'Auditor' || userRole === 'Coordenador Geral';

  const canCloseCycle = userRole === 'Admin' || userRole === 'Auditor' || userRole === 'Coordenador Geral' || session?.cargo === 'Administrador';

  const filterByRole = useCallback((scores: any[]) => {
    if (userRole === 'Coordenador' && userSquad) return scores.filter((s: any) => s.squad === userSquad);
    if (userRole === 'Coordenador' && userSquads.length > 0) return scores.filter((s: any) => userSquads.includes(s.squad));
    return scores;
  }, [userRole, userSquad, userSquads]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let [scores, periodos, ncs, elogios] = await Promise.all([
        fetchCycleScores(),
        fetchAllPeriodos(),
        fetchNCRecords(),
        fetchElogios(),
      ]);

      if (scores.length === 0) {
        const [sbScores, sbPeriodos, sbNcs, sbElogios] = await Promise.all([
          fetchCycleScoresFromSupabase(),
          fetchAllPeriodosFromSupabase(),
          fetchNCRecordsFromSupabase(),
          fetchElogiosFromSupabase(),
        ]);
        if (sbScores.length > 0) {
          scores = sbScores;
          periodos = sbPeriodos;
          ncs = sbNcs;
          elogios = sbElogios;
        }
      }

      const manualCycles = fetchManualCycles();
      const manualPeriodos = manualCycles.map((mc) => mc.periodo).filter(Boolean);
      const allPeriodosSet = new Set([...periodos, ...manualPeriodos]);
      const mergedPeriodos = Array.from(allPeriodosSet).sort();

      setAllPeriodos(mergedPeriodos);

      if (scores.length === 0 && manualCycles.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      const filteredScores = filterByRole(scores);
      const filteredNcs = filterByRole(ncs);
      const filteredElogios = filterByRole(elogios);

      const summaries: PeriodSummary[] = mergedPeriodos.map((periodo) => {
        const pScores = filteredScores.filter((s: any) => s.periodo === periodo);
        const pNCs = filteredNcs.filter((n: any) => n.periodo === periodo);
        const pElogios = filteredElogios.filter((e: any) => e.periodo === periodo);
        const analysts = buildAnalystsFromScores(pScores);

        // Compute NC distribution by type
        const ncByType = (() => {
          const typeCounts: Record<string, number> = {};
          pNCs.forEach((nc: any) => {
            const raw = nc.tipo_nc || nc.tipo || nc.category || '';
            const t = normalizeNCType(raw);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
          });
          const total = pNCs.length;
          // Build ordered list: NC-1 through NC-5 first, then any others
          const orderedKeys = ['NC-1', 'NC-2', 'NC-3', 'NC-4', 'NC-5'];
          const result: { name: string; value: number; color: string; pct: number }[] = [];
          orderedKeys.forEach((key) => {
            if (typeCounts[key]) {
              const cat = NC_CATEGORY_MAP[key];
              result.push({
                name: cat.label,
                value: typeCounts[key],
                color: cat.color,
                pct: total > 0 ? Math.round((typeCounts[key] / total) * 100) : 0,
              });
            }
          });
          // Add any unrecognized types
          Object.entries(typeCounts).forEach(([name, value], idx) => {
            if (!orderedKeys.includes(name)) {
              result.push({
                name,
                value,
                color: NC_COLORS[idx % NC_COLORS.length],
                pct: total > 0 ? Math.round((value / total) * 100) : 0,
              });
            }
          });
          return result;
        })();

        if (analysts.length > 0) {
          const qaMedia = analysts.reduce((s: number, a: any) => s + a.qaScore, 0) / analysts.length;
          const iepcMedia = analysts.reduce((s: number, a: any) => s + a.iepcScore, 0) / analysts.length;
          // Compute pillar averages
          const avgPillar = (key: string) => {
            const vals = pScores.map((s: any) => s[key] || 0);
            return vals.length > 0 ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
          };
          let squads: Record<string, { qa: number; iepc: number; count: number }> = {};
          let coordenadores: Record<string, { qa: number; count: number }> = {};
          analysts.forEach((a: any) => {
            if (!squads[a.squad]) squads[a.squad] = { qa: 0, iepc: 0, count: 0 };
            squads[a.squad].qa += a.qaScore;
            squads[a.squad].iepc += a.iepcScore;
            squads[a.squad].count += 1;
            const coord = a.coordenador || 'Sem coordenador';
            if (!coordenadores[coord]) coordenadores[coord] = { qa: 0, count: 0 };
            coordenadores[coord].qa += a.qaScore;
            coordenadores[coord].count += 1;
          });
          Object.keys(squads).forEach((sq) => {
            squads[sq].qa = parseFloat((squads[sq].qa / squads[sq].count).toFixed(2));
            squads[sq].iepc = parseFloat((squads[sq].iepc / squads[sq].count).toFixed(2));
          });
          Object.keys(coordenadores).forEach((c) => {
            coordenadores[c].qa = parseFloat((coordenadores[c].qa / coordenadores[c].count).toFixed(2));
          });
          return {
            periodo,
            qa: parseFloat(qaMedia.toFixed(2)),
            iepc: parseFloat(iepcMedia.toFixed(2)),
            ncs: pNCs.length,
            elogios: pElogios.length,
            analistas: analysts.length,
            squads,
            coordenadores,
            p1: avgPillar('p1'), p2: avgPillar('p2'), p3: avgPillar('p3'), p4: avgPillar('p4'), p5: avgPillar('p5'),
            e1: avgPillar('e1'), e2: avgPillar('e2'), e3: avgPillar('e3'), e4: avgPillar('e4'), e5: avgPillar('e5'),
            ncByType,
          };
        }

        const manualEntry = manualCycles.find((mc) => mc.periodo === periodo);
        if (manualEntry) {
          return {
            periodo,
            qa: manualEntry.qa_media,
            iepc: manualEntry.iepc_media,
            ncs: manualEntry.total_ncs,
            elogios: 0,
            analistas: manualEntry.total_analistas ?? 0,
            squads: {},
            coordenadores: {},
            ncByType,
          };
        }

        return {
          periodo,
          qa: 0,
          iepc: 0,
          ncs: pNCs.length,
          elogios: pElogios.length,
          analistas: 0,
          squads: {},
          coordenadores: {},
          ncByType,
        };
      }).filter((s) => s.qa > 0 || s.iepc > 0 || s.ncs > 0 || s.elogios > 0 || s.analistas > 0);

      setHistory(summaries);
    } catch {
      setHistory([]);
    }
    setLoading(false);
  }, [filterByRole]);

  useEffect(() => {
    loadData();
    const unsubscribe = listenDataChanged(loadData);
    return unsubscribe;
  }, [loadData]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = () => setFilterOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [filterOpen]);

  const handleCloseCycle = async (aiSummary: string) => {
    const lastPeriodo = history[history.length - 1]?.periodo;
    if (!lastPeriodo) return;
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('import_cycles').update({ is_closed: true, closed_at: new Date().toISOString(), is_current: false }).eq('periodo', lastPeriodo);
      const last = history[history.length - 1];
      await supabase.from('cycle_summaries').upsert({
        periodo: lastPeriodo,
        total_analistas: last.analistas,
        qa_media: last.qa,
        iepc_media: last.iepc,
        total_ncs: last.ncs,
        total_elogios: last.elogios,
        squad_breakdown: last.squads,
        insights: { ai_summary: aiSummary },
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'periodo' });
      setCloseCycleSuccess(true);
      setTimeout(() => setCloseCycleSuccess(false), 4000);
      loadData();
    } catch (err) {
      console.error('Erro ao fechar ciclo:', err);
    }
  };

  const filteredHistory = history.filter((h) => {
    if (filterCiclo !== 'todos' && h.periodo !== filterCiclo) return false;
    return true;
  });

  const getFilteredPeriod = (period: PeriodSummary | undefined): PeriodSummary | undefined => {
    if (!period) return undefined;
    if (filterSquad === 'todos' && filterGestor === 'todos') return period;
    let squads = { ...period.squads };
    if (filterSquad !== 'todos') {
      squads = Object.fromEntries(Object.entries(squads).filter(([sq]) => sq === filterSquad));
    }
    let coordenadores = { ...period.coordenadores };
    if (filterGestor !== 'todos') {
      coordenadores = Object.fromEntries(Object.entries(coordenadores).filter(([c]) => c === filterGestor));
    }
    const squadEntries = Object.values(squads);
    const qa = squadEntries.length > 0
      ? parseFloat((squadEntries.reduce((s, d) => s + d.qa, 0) / squadEntries.length).toFixed(2))
      : 0;
    const iepc = squadEntries.length > 0
      ? parseFloat((squadEntries.reduce((s, d) => s + d.iepc, 0) / squadEntries.length).toFixed(2))
      : 0;
    const analistas = squadEntries.reduce((s, d) => s + d.count, 0);
    return { ...period, squads, coordenadores, qa, iepc, analistas };
  };

  const rawLastPeriod = filteredHistory[filteredHistory.length - 1];
  const lastPeriod = getFilteredPeriod(rawLastPeriod);

  // Auto-compare: when a specific cycle is selected, find the previous cycle in the FULL history
  const prevPeriod = (() => {
    if (filterCiclo === 'todos') {
      return filteredHistory[filteredHistory.length - 2];
    }
    // Find the selected cycle's index in the full (unfiltered) history
    const selectedIdx = history.findIndex((h) => h.periodo === filterCiclo);
    if (selectedIdx > 0) return history[selectedIdx - 1];
    return undefined;
  })();

  const allSquads = Array.from(new Set(history.flatMap(h => Object.keys(h.squads)))).sort();
  const allGestores = Array.from(new Set(history.flatMap(h => Object.keys(h.coordenadores || {})))).sort();

  const qaDelta = lastPeriod && prevPeriod ? (lastPeriod.qa - prevPeriod.qa) : null;
  const iepcDelta = lastPeriod && prevPeriod ? (lastPeriod.iepc - prevPeriod.iepc) : null;
  const ncDelta = lastPeriod && prevPeriod ? (lastPeriod.ncs - prevPeriod.ncs) : null;
  const elogioDelta = lastPeriod && prevPeriod ? (lastPeriod.elogios - prevPeriod.elogios) : null;

  const evolutionData = filteredHistory.map(h => ({ periodo: h.periodo, qa: h.qa, iepc: h.iepc }));
  const qaSparkline = evolutionData.map(d => d.qa);
  const iepcSparkline = evolutionData.map(d => d.iepc);

  const squadRanking = lastPeriod
    ? Object.entries(lastPeriod.squads).map(([squad, d]) => ({ squad, qa: d.qa })).sort((a, b) => b.qa - a.qa)
    : [];

  const coordRanking = lastPeriod
    ? Object.entries(lastPeriod.coordenadores || {}).map(([coord, d]) => ({ coord, qa: d.qa })).sort((a, b) => b.qa - a.qa)
    : [];

  const totalNCs = lastPeriod?.ncs ?? 0;
  const totalElogios = lastPeriod?.elogios ?? 0;
  const totalAnalistas = lastPeriod?.analistas ?? 0;
  const qaMedia = lastPeriod?.qa ?? 0;
  const iepcMedia = lastPeriod?.iepc ?? 0;
  const totalAvaliacoes = totalAnalistas;

  const qaClass = getPerformanceClass(qaMedia);
  const iepcClass = getPerformanceClass(iepcMedia);

  const hasData = history.length > 0;

  // ── Strategic Radar Data — uses official WEIGHTS (not scores) ──────────────
  // QA: shows weight distribution of each pillar (P1=22, P2=34, P3=18, P4=14, P5=12)
  // The "value" in radar = the official weight (strategic importance)
  // pct = percentage of total (same as weight since total=100)
  const qaStrategicPillars = useMemo(() => [
    { subject: 'P1 Fluxo', weight: QA_PILLAR_WEIGHTS.p1, pct: QA_PILLAR_WEIGHTS.p1, color: PILLAR_COLORS.p1, fullName: 'P1 — Gestão do Fluxo e Rastreabilidade' },
    { subject: 'P2 Tratativa', weight: QA_PILLAR_WEIGHTS.p2, pct: QA_PILLAR_WEIGHTS.p2, color: PILLAR_COLORS.p2, fullName: 'P2 — Gestão da Tratativa da Demanda' },
    { subject: 'P3 Análise', weight: QA_PILLAR_WEIGHTS.p3, pct: QA_PILLAR_WEIGHTS.p3, color: PILLAR_COLORS.p3, fullName: 'P3 — Análise e Assertividade Técnica' },
    { subject: 'P4 Comunicação', weight: QA_PILLAR_WEIGHTS.p4, pct: QA_PILLAR_WEIGHTS.p4, color: PILLAR_COLORS.p4, fullName: 'P4 — Qualidade da Comunicação' },
    { subject: 'P5 Conduta', weight: QA_PILLAR_WEIGHTS.p5, pct: QA_PILLAR_WEIGHTS.p5, color: PILLAR_COLORS.p5, fullName: 'P5 — Conduta Relacional' },
  ], []);

  const iepcStrategicPillars = useMemo(() => [
    { subject: 'E1 Resolução', weight: IEPC_PILLAR_WEIGHTS.e1, pct: IEPC_PILLAR_WEIGHTS.e1, color: PILLAR_COLORS.e1, fullName: 'E1 — Resolução Percebida' },
    { subject: 'E2 Compreensão', weight: IEPC_PILLAR_WEIGHTS.e2, pct: IEPC_PILLAR_WEIGHTS.e2, color: PILLAR_COLORS.e2, fullName: 'E2 — Compreensão e Segurança Percebida' },
    { subject: 'E3 Esforço', weight: IEPC_PILLAR_WEIGHTS.e3, pct: IEPC_PILLAR_WEIGHTS.e3, color: PILLAR_COLORS.e3, fullName: 'E3 — Esforço Percebido pelo Cliente' },
    { subject: 'E4 Tempo', weight: IEPC_PILLAR_WEIGHTS.e4, pct: IEPC_PILLAR_WEIGHTS.e4, color: PILLAR_COLORS.e4, fullName: 'E4 — Tempo e Fluidez' },
    { subject: 'E5 Relacional', weight: IEPC_PILLAR_WEIGHTS.e5, pct: IEPC_PILLAR_WEIGHTS.e5, color: PILLAR_COLORS.e5, fullName: 'E5 — Experiência Relacional' },
  ], []);

  // NC distribution from real data
  const ncDistribution = useMemo(() => {
    return lastPeriod?.ncByType || [];
  }, [lastPeriod]);

  const CustomDot = (props: any) => {
    const { cx, cy, value, stroke } = props;
    if (!cx || !cy) return null;
    const cls = getPerformanceClass(value);
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill={stroke} stroke={stroke} strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fontWeight={700} fill={cls.color}>{value?.toFixed(1)}</text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value?.toFixed ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
      {closeCycleSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          Ciclo fechado com sucesso! Snapshot gerado.
        </div>
      )}

      <div className="p-5 max-w-screen-2xl mx-auto">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Painel Executivo</h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Visão estratégica da qualidade operacional</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Ciclo filter */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setFilterOpen(filterOpen === 'ciclo' ? null : 'ciclo'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ backgroundColor: filterCiclo !== 'todos' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)', border: filterCiclo !== 'todos' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)', color: filterCiclo !== 'todos' ? '#38BDF8' : '#94A3B8' }}
                >
                  <Calendar size={12} />
                  <span>{filterCiclo === 'todos' ? 'Ciclo: Todos' : filterCiclo}</span>
                  <ChevronDown size={10} />
                </button>
                {filterOpen === 'ciclo' && (
                  <div className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden min-w-[140px]" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
                    {['todos', ...allPeriodos].map((p) => (
                      <button key={p} onClick={() => { setFilterCiclo(p); setFilterOpen(null); }} className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5" style={{ color: filterCiclo === p ? '#38BDF8' : '#94A3B8' }}>
                        {p === 'todos' ? 'Todos os ciclos' : p}
                      </button>
                    ))}
                    {allPeriodos.length === 0 && (
                      <p className="px-3 py-2 text-xs" style={{ color: '#64748B' }}>Nenhum ciclo importado</p>
                    )}
                  </div>
                )}
              </div>

              {/* Squad filter */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setFilterOpen(filterOpen === 'squad' ? null : 'squad'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ backgroundColor: filterSquad !== 'todos' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)', border: filterSquad !== 'todos' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)', color: filterSquad !== 'todos' ? '#38BDF8' : '#94A3B8' }}
                >
                  <Users size={12} />
                  <span>{filterSquad === 'todos' ? 'Squad: Todos' : filterSquad}</span>
                  <ChevronDown size={10} />
                </button>
                {filterOpen === 'squad' && (
                  <div className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden min-w-[160px]" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
                    {['todos', ...allSquads].map((sq) => (
                      <button key={sq} onClick={() => { setFilterSquad(sq); setFilterOpen(null); }} className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5" style={{ color: filterSquad === sq ? '#38BDF8' : '#94A3B8' }}>
                        {sq === 'todos' ? 'Todos os squads' : sq}
                      </button>
                    ))}
                    {allSquads.length === 0 && (
                      <p className="px-3 py-2 text-xs" style={{ color: '#64748B' }}>Nenhum squad disponível</p>
                    )}
                  </div>
                )}
              </div>

              {/* Gestor filter */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setFilterOpen(filterOpen === 'gestor' ? null : 'gestor'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{ backgroundColor: filterGestor !== 'todos' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.05)', border: filterGestor !== 'todos' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.08)', color: filterGestor !== 'todos' ? '#38BDF8' : '#94A3B8' }}
                >
                  <span>{filterGestor === 'todos' ? 'Gestor: Todos' : filterGestor}</span>
                  <ChevronDown size={10} />
                </button>
                {filterOpen === 'gestor' && (
                  <div className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden min-w-[180px]" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
                    {['todos', ...allGestores].map((g) => (
                      <button key={g} onClick={() => { setFilterGestor(g); setFilterOpen(null); }} className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/5" style={{ color: filterGestor === g ? '#38BDF8' : '#94A3B8' }}>
                        {g === 'todos' ? 'Todos os gestores' : g}
                      </button>
                    ))}
                    {allGestores.length === 0 && (
                      <p className="px-3 py-2 text-xs" style={{ color: '#64748B' }}>Nenhum gestor disponível</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {(filterCiclo !== 'todos' || filterSquad !== 'todos' || filterGestor !== 'todos') && (
              <button
                onClick={() => { setFilterCiclo('todos'); setFilterSquad('todos'); setFilterGestor('todos'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}
              >
                <X size={11} />
                Limpar filtros
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#1E40AF', color: '#fff', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Filter size={12} />
              Filtros
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
              <span>Última atualização</span>
              <span className="font-medium text-white">{lastUpdate}</span>
            </div>
            <button onClick={loadData} className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} />
            </button>
            {canImport && (
              <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
                Importar
              </button>
            )}
            {canCloseCycle && lastPeriod && (
              <button onClick={() => setCloseCycleOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Lock size={11} />Fechar Ciclo
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando dados...</p>
            </div>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <BarChart2 size={28} style={{ color: '#38BDF8' }} />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Nenhum dado importado</h2>
            <p className="text-sm mb-6 max-w-sm" style={{ color: '#64748B' }}>
              O painel executivo ficará disponível após a primeira importação de dados. Clique em "Importar" para começar.
            </p>
            {canImport && (
              <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.3)' }}>
                <Activity size={14} />
                Importar dados agora
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Row 1: KPI Cards ── */}
            <div className="grid grid-cols-5 gap-3">
              {/* QA Médio */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: `1px solid ${qaClass.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                    <BarChart2 size={13} style={{ color: '#38BDF8' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>QA MÉDIO</span>
                </div>
                <p className="text-3xl font-bold mb-1" style={{ color: qaClass.color }}>{qaMedia.toFixed(1)}</p>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {qaDelta !== null && qaDelta >= 0 ? <TrendingUp size={11} style={{ color: '#22C55E' }} /> : <TrendingDown size={11} style={{ color: '#EF4444' }} />}
                    <span className="text-xs" style={{ color: qaDelta !== null && qaDelta >= 0 ? '#22C55E' : '#EF4444' }}>
                      {qaDelta !== null ? `${qaDelta > 0 ? '+' : ''}${qaDelta.toFixed(1)} vs ${prevPeriod?.periodo || 'Ciclo Anterior'}` : 'Sem ciclo anterior'}
                    </span>
                  </div>
                  {qaSparkline.length > 1 && <Sparkline data={qaSparkline} color="#38BDF8" />}
                </div>
                <PerformanceBadge score={qaMedia} size="xs" />
              </div>

              {/* IEPC Médio */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: `1px solid ${iepcClass.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(6,182,212,0.15)' }}>
                    <Star size={13} style={{ color: '#06B6D4' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>IEPC MÉDIO</span>
                </div>
                <p className="text-3xl font-bold mb-1" style={{ color: iepcClass.color }}>{iepcMedia.toFixed(1)}</p>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {iepcDelta !== null && iepcDelta >= 0 ? <TrendingUp size={11} style={{ color: '#22C55E' }} /> : <TrendingDown size={11} style={{ color: '#EF4444' }} />}
                    <span className="text-xs" style={{ color: iepcDelta !== null && iepcDelta >= 0 ? '#22C55E' : '#EF4444' }}>
                      {iepcDelta !== null ? `${iepcDelta > 0 ? '+' : ''}${iepcDelta.toFixed(1)} vs ${prevPeriod?.periodo || 'Ciclo Anterior'}` : 'Sem ciclo anterior'}
                    </span>
                  </div>
                  {iepcSparkline.length > 1 && <Sparkline data={iepcSparkline} color="#06B6D4" />}
                </div>
                <PerformanceBadge score={iepcMedia} size="xs" />
              </div>

              {/* NCs */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>NÃO CONFORMIDADES</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalNCs}</p>
                <div className="flex items-center gap-1">
                  {ncDelta !== null && ncDelta <= 0 ? <TrendingDown size={11} style={{ color: '#22C55E' }} /> : <TrendingUp size={11} style={{ color: '#EF4444' }} />}
                  <span className="text-xs" style={{ color: ncDelta !== null && ncDelta <= 0 ? '#22C55E' : '#EF4444' }}>
                    {ncDelta !== null ? `${ncDelta > 0 ? '+' : ''}${ncDelta} vs ${prevPeriod?.periodo || 'Ciclo Anterior'}` : 'Sem ciclo anterior'}
                  </span>
                </div>
              </div>

              {/* Elogios */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                    <Star size={13} style={{ color: '#F59E0B' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>ELOGIOS</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalElogios}</p>
                <div className="flex items-center gap-1">
                  {elogioDelta !== null && elogioDelta >= 0 ? <TrendingUp size={11} style={{ color: '#22C55E' }} /> : <TrendingDown size={11} style={{ color: '#EF4444' }} />}
                  <span className="text-xs" style={{ color: elogioDelta !== null && elogioDelta >= 0 ? '#22C55E' : '#EF4444' }}>
                    {elogioDelta !== null ? `${elogioDelta > 0 ? '+' : ''}${elogioDelta} vs ${prevPeriod?.periodo || 'Ciclo Anterior'}` : 'Sem ciclo anterior'}
                  </span>
                </div>
              </div>

              {/* Avaliações */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                    <CheckCircle size={13} style={{ color: '#22C55E' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>AVALIAÇÕES</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalAvaliacoes}</p>
                <div className="w-full rounded-full h-1.5 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: '100%', backgroundColor: '#22C55E' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>100% do Ciclo</p>
              </div>
            </div>

            {/* ── Row 2: Mapa Estratégico QA + IEPC ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Mapa Estratégico QA */}
              <div
                className="rounded-xl p-5 cursor-pointer transition-all hover:border-sky-500/40"
                style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 0 20px rgba(56,189,248,0.05)' }}
                onClick={() => setPilarModal('QA')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Target size={14} style={{ color: '#38BDF8' }} />
                      <h3 className="text-sm font-bold text-white">Mapa Estratégico QA</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>Distribuição Estratégica</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Peso oficial dos pilares · Total: 100 pts</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                    <Info size={10} />
                    <span>Ver detalhes</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div style={{ flex: '0 0 55%' }}>
                    <StrategicRadarChart data={qaStrategicPillars} type="QA" maxScale={40} />
                  </div>
                  <div className="flex-1 space-y-2">
                    {qaStrategicPillars.map((p) => (
                      <div key={p.subject} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs flex-1 truncate" style={{ color: '#94A3B8' }}>{p.subject}</span>
                        <span className="text-xs font-bold" style={{ color: p.color }}>{p.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mapa Estratégico IEPC */}
              <div
                className="rounded-xl p-5 cursor-pointer transition-all hover:border-cyan-500/40"
                style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 0 20px rgba(6,182,212,0.05)' }}
                onClick={() => setPilarModal('IEPC')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap size={14} style={{ color: '#06B6D4' }} />
                      <h3 className="text-sm font-bold text-white">Mapa Estratégico IEPC</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>Distribuição Estratégica</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Peso oficial dos pilares · Total: 100 pts</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                    <Info size={10} />
                    <span>Ver detalhes</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div style={{ flex: '0 0 55%' }}>
                    <StrategicRadarChart data={iepcStrategicPillars} type="IEPC" maxScale={35} />
                  </div>
                  <div className="flex-1 space-y-2">
                    {iepcStrategicPillars.map((p) => (
                      <div key={p.subject} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-xs flex-1 truncate" style={{ color: '#94A3B8' }}>{p.subject}</span>
                        <span className="text-xs font-bold" style={{ color: p.color }}>{p.weight}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 3: Evolution Chart + Cycle Summary ── */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-9 rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 0 30px rgba(56,189,248,0.04)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity size={15} style={{ color: '#38BDF8' }} />
                      <h3 className="text-sm font-bold text-white">Evolução QA × IEPC</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>Gráfico Estratégico Principal</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                      {prevPeriod ? `Comparando ${lastPeriod?.periodo} vs ${prevPeriod.periodo}` : 'Tendência histórica'}
                    </p>
                  </div>
                  <Link href="/evolucao-geral" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver mais <ChevronRight size={11} />
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={evolutionData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="periodo" tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis domain={[60, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="qa" name="QA Médio" stroke="#38BDF8" strokeWidth={2.5} dot={<CustomDot />} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="iepc" name="IEPC Médio" stroke="#06B6D4" strokeWidth={2.5} dot={<CustomDot />} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#38BDF8' }} />
                    <span className="text-xs" style={{ color: '#64748B' }}>QA Médio</span>
                    <span className="text-sm font-bold" style={{ color: qaClass.color }}>{qaMedia.toFixed(1)}</span>
                    <PerformanceBadge score={qaMedia} size="xs" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#06B6D4' }} />
                    <span className="text-xs" style={{ color: '#64748B' }}>IEPC Médio</span>
                    <span className="text-sm font-bold" style={{ color: iepcClass.color }}>{iepcMedia.toFixed(1)}</span>
                    <PerformanceBadge score={iepcMedia} size="xs" />
                  </div>
                  {prevPeriod && (
                    <div className="ml-auto flex items-center gap-2 text-xs px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
                      <span style={{ color: '#64748B' }}>Comparando:</span>
                      <span className="font-semibold" style={{ color: '#38BDF8' }}>{lastPeriod?.periodo}</span>
                      <span style={{ color: '#64748B' }}>vs</span>
                      <span className="font-semibold" style={{ color: '#94A3B8' }}>{prevPeriod.periodo}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cycle Summary */}
              <div className="col-span-3 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Resumo do Ciclo Atual</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Período', value: lastPeriod ? lastPeriod.periodo : '—' },
                    { label: 'Ciclo anterior', value: prevPeriod ? prevPeriod.periodo : 'N/A' },
                    { label: 'Avaliações realizadas', value: String(totalAvaliacoes) },
                    { label: 'Analistas avaliados', value: String(totalAnalistas) },
                    { label: 'Squads', value: String(squadRanking.length) },
                    { label: 'Coordenadores', value: String(coordRanking.length) },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#64748B' }}>{row.label}</span>
                        <span className="text-xs font-medium text-white">{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#64748B' }}>Classificação de Performance</p>
                  {[
                    { label: 'Excelência', range: '≥ 90', color: '#10b981' },
                    { label: 'Performance', range: '80–89', color: '#facc15' },
                    { label: 'Operacional', range: '70–79', color: '#f59e0b' },
                    { label: 'Crítico', range: '< 70', color: '#ef4444' },
                  ].map(c => (
                    <div key={c.label} className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs" style={{ color: '#94A3B8' }}>{c.label}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#64748B' }}>{c.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 4: Squad Ranking + Coordinator Ranking + Heatmap ── */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ranking de Squads</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Por QA Médio</p>
                  </div>
                  <Link href="/cycle-dashboard" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver ranking completo <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {squadRanking.slice(0, 7).map((item, i) => {
                    const cls = getPerformanceClass(item.qa);
                    return (
                      <div key={item.squad} className="flex items-center gap-3">
                        <span className="text-xs w-4 text-center font-medium" style={{ color: '#64748B' }}>{i + 1}</span>
                        <span className="text-xs flex-1 truncate text-white">{item.squad}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(item.qa / 100) * 100}%`, backgroundColor: cls.color }} />
                          </div>
                          <span className="text-xs font-bold w-8 text-right" style={{ color: cls.color }}>{item.qa.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ranking de Coordenadores</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Por QA Médio</p>
                  </div>
                  <Link href="/cycle-dashboard" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver ranking completo <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {coordRanking.slice(0, 5).map((item, i) => {
                    const cls = getPerformanceClass(item.qa);
                    return (
                      <div key={item.coord} className="flex items-center gap-3">
                        <span className="text-xs w-4 text-center font-medium" style={{ color: '#64748B' }}>{i + 1}</span>
                        <span className="text-xs flex-1 truncate text-white">{item.coord}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(item.qa / 100) * 100}%`, backgroundColor: cls.color }} />
                          </div>
                          <span className="text-xs font-bold w-8 text-right" style={{ color: cls.color }}>{item.qa.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white">Heatmap QA Médio</h3>
                  <p className="text-xs" style={{ color: '#64748B' }}>Por Squad × Pilares QA</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left pb-2 pr-2 font-medium" style={{ color: '#64748B', fontSize: 9 }}>Squad</th>
                        {['P1 Fluxo', 'P2 Trat.', 'P3 Anál.', 'P4 Com.', 'P5 Cond.'].map(m => (
                          <th key={m} className="pb-2 px-1 font-medium text-center" style={{ color: '#64748B', fontSize: 9 }}>{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {squadRanking.length > 0 ? squadRanking.map((row) => (
                        <tr key={row.squad}>
                          <td className="pr-2 py-0.5 text-white truncate" style={{ fontSize: 9, maxWidth: 70 }}>{row.squad}</td>
                          {[row.qa, row.qa, row.qa, row.qa, row.qa].map((val, i) => (
                            <td key={i} className="px-1 py-0.5 text-center rounded" style={{ fontSize: 9 }}>
                              <span className="px-1 py-0.5 rounded" style={{ backgroundColor: getHeatBg(val), color: getHeatColor(val), fontWeight: 600 }}>{val.toFixed(0)}</span>
                            </td>
                          ))}
                        </tr>
                      )) : (
                        <tr><td colSpan={6} className="py-4 text-center text-xs" style={{ color: '#64748B' }}>Sem dados importados</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {[{ color: '#ef4444', bg: 'rgba(239,68,68,0.18)', label: '< 70' }, { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', label: '70–79' }, { color: '#facc15', bg: 'rgba(250,204,21,0.12)', label: '80–89' }, { color: '#10b981', bg: 'rgba(16,185,129,0.18)', label: '≥ 90' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.bg, border: `1px solid ${l.color}` }} />
                      <span style={{ fontSize: 9, color: '#64748B' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 5: NC Donut + Risk Alerts ── */}
            <div className="grid grid-cols-12 gap-4">
              {/* NC Donut — Distribuição de Não Conformidades */}
              <div
                className="col-span-5 rounded-xl p-4 cursor-pointer transition-all hover:border-red-500/30"
                style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
                onClick={() => setPilarModal('NC')}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                      <h3 className="text-sm font-semibold text-white">Distribuição de Não Conformidades</h3>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>NCs por Categoria · Total no ciclo: {totalNCs}</p>
                  </div>
                  <Link href="/nao-conformidades" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }} onClick={e => e.stopPropagation()}>
                    Ver mais <ChevronRight size={11} />
                  </Link>
                </div>
                <NCDonutChart ncData={ncDistribution} total={totalNCs} />
              </div>

              {/* Risk Alerts */}
              <div className="col-span-7 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Alertas e Indicadores de Risco</h3>
                  <Link href="/nao-conformidades" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver todos <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                      <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{totalNCs > 0 ? `${totalNCs} NCs registradas` : 'Sem NCs registradas'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Acompanhe os casos críticos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                      <RefreshCw size={14} style={{ color: '#F59E0B' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{ncDelta !== null ? `${ncDelta > 0 ? '+' : ''}${ncDelta} vs ${prevPeriod?.periodo}` : 'Sem comparativo'}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Variação de NCs no ciclo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                      <Target size={14} style={{ color: '#38BDF8' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">QA: {qaMedia.toFixed(1)} {qaDelta !== null ? (qaDelta >= 0 ? '↑' : '↓') + Math.abs(qaDelta).toFixed(1) : ''}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>vs {prevPeriod?.periodo || 'ciclo anterior'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                      <TrendingUp size={14} style={{ color: '#22C55E' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">IEPC: {iepcMedia.toFixed(1)} {iepcDelta !== null ? (iepcDelta >= 0 ? '↑' : '↓') + Math.abs(iepcDelta).toFixed(1) : ''}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>vs {prevPeriod?.periodo || 'ciclo anterior'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {canImport && <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}

      {closeCycleOpen && lastPeriod && (
        <CloseCycleModal
          periodo={lastPeriod.periodo}
          summary={lastPeriod}
          onClose={() => setCloseCycleOpen(false)}
          onConfirm={handleCloseCycle}
        />
      )}

      {pilarModal && (
        <PilarModal
          type={pilarModal}
          onClose={() => setPilarModal(null)}
          qaPillars={qaStrategicPillars}
          iepcPillars={iepcStrategicPillars}
          ncData={ncDistribution}
          totalNCs={totalNCs}
          periodo={lastPeriod?.periodo}
        />
      )}

      {drilldownCiclo && (
        <DrilldownPanel
          initialCiclo={drilldownCiclo}
          onClose={() => setDrilldownCiclo(null)}
        />
      )}
    </div>
  );
}