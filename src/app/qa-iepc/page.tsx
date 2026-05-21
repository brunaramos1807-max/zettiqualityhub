'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, ScatterChart, Scatter,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import { Activity, TrendingDown, AlertTriangle, Star, Users, Target, ChevronDown, ChevronRight, X, Filter, RefreshCw, Zap, Award, Shield, Info, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchCycleScores, fetchNCRecords, fetchAllPeriodos } from '@/lib/services/dataService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreRow {
  periodo: string;
  analista: string;
  squad: string;
  coordenador: string;
  auditor?: string;
  nota_final_qa: number;
  iepc_total: number;
  total_ncs: number;
  p1: number; p2: number; p3: number; p4: number; p5: number;
  e1: number; e2: number; e3: number; e4: number; e5: number;
  // subpilar fields from payload
  [key: string]: any;
}

interface NCRow {
  periodo: string;
  analista: string;
  squad: string;
  coordenador: string;
  tipo_nc: string;
  pontos_deduzidos: number;
}

// ─── Official Max Values ──────────────────────────────────────────────────────
// QA Pillar max values (official matrix)
const QA_PILLAR_MAX: Record<string, number> = { p1: 22, p2: 34, p3: 18, p4: 14, p5: 12 };
// IEPC Dimension max values (official matrix)
const IEPC_DIM_MAX: Record<string, number> = { e1: 30, e2: 20, e3: 20, e4: 15, e5: 15 };
const QA_TOTAL_MAX = 100; // sum of all pillar maxes
const IEPC_TOTAL_MAX = 100; // sum of all iepc maxes

// ─── Constants ────────────────────────────────────────────────────────────────

// Official colors: P1=blue, P2=cyan, P3=green, P4=yellow, P5=purple
const QA_PILLARS = [
  { key: 'p1', label: 'P1 Fluxo', fullName: 'P1 — Gestão do Fluxo e Rastreabilidade do Atendimento', color: '#3B82F6', max: 22, desc: 'Avalia identificação, protocolo SUP, rastreabilidade e encerramento do atendimento.' },
  { key: 'p2', label: 'P2 Tratativa', fullName: 'P2 — Gestão da Tratativa da Demanda', color: '#06B6D4', max: 34, desc: 'Avalia validação de dúvidas, orientação, resolução ou direcionamento e documentação técnica.' },
  { key: 'p3', label: 'P3 Análise', fullName: 'P3 — Análise e Assertividade Técnica da Demanda', color: '#10B981', max: 18, desc: 'Avalia análise técnica da demanda e uso adequado das ferramentas de apoio.' },
  { key: 'p4', label: 'P4 Comunicação', fullName: 'P4 — Qualidade da Comunicação no Atendimento', color: '#F59E0B', max: 14, desc: 'Avalia uso da língua portuguesa, tom profissional e clareza da comunicação.' },
  { key: 'p5', label: 'P5 Conduta', fullName: 'P5 — Conduta Relacional no Atendimento', color: '#8B5CF6', max: 12, desc: 'Avalia cordialidade, empatia, proatividade e over delivery.' },
];

// Official colors: E1=light blue, E2=purple, E3=green, E4=yellow, E5=orange
const IEPC_DIMS = [
  { key: 'e1', label: 'E1 Resolução', fullName: 'E1 — Resolução Percebida', color: '#38BDF8', max: 30, desc: 'Percepção do cliente sobre a resolução efetiva do problema.' },
  { key: 'e2', label: 'E2 Clareza', fullName: 'E2 — Compreensão e Segurança (Clareza/Confiança)', color: '#A855F7', max: 20, desc: 'Clareza das informações transmitidas e confiança gerada no cliente.' },
  { key: 'e3', label: 'E3 Esforço', fullName: 'E3 — Esforço do Cliente', color: '#10B981', max: 20, desc: 'Nível de esforço exigido do cliente para resolver sua demanda.' },
  { key: 'e4', label: 'E4 Tempo', fullName: 'E4 — Tempo e Fluidez', color: '#F59E0B', max: 15, desc: 'Percepção de agilidade e fluidez no atendimento.' },
  { key: 'e5', label: 'E5 Relacional', fullName: 'E5 — Experiência Relacional', color: '#F97316', max: 15, desc: 'Qualidade da relação humana e experiência emocional do cliente.' },
];

// Official subpilar structure with correct max values and descriptions
const SUBPILARES = [
  { pilar: 'P1', pillarKey: 'p1', color: '#3B82F6', pillarMax: 22, items: [
    { id: '1.1', label: 'Identificação e Boas-vindas', max: 5, desc: 'Avalia se o analista se identificou corretamente e realizou boas-vindas ao cliente conforme protocolo.', objetivo: 'Garantir abertura profissional e rastreável do atendimento.' },
    { id: '1.2', label: 'Formalização e comunicação do protocolo SUP', max: 9, desc: 'Avalia se o protocolo SUP foi registrado e comunicado ao cliente de forma adequada.', objetivo: 'Assegurar rastreabilidade e formalização do atendimento.' },
    { id: '1.3', label: 'Encerramento da interação por etapa', max: 8, desc: 'Avalia se o encerramento de cada etapa foi realizado corretamente com confirmação do cliente.', objetivo: 'Garantir conclusão formal e satisfatória de cada etapa.' },
  ]},
  { pilar: 'P2', pillarKey: 'p2', color: '#06B6D4', pillarMax: 34, items: [
    { id: '2.1', label: 'Validação e esclarecimento de dúvidas', max: 8, desc: 'Avalia se o analista validou e esclareceu todas as dúvidas do cliente de forma completa.', objetivo: 'Garantir compreensão mútua e alinhamento de expectativas.' },
    { id: '2.2', label: 'Orientação e condução da execução', max: 9, desc: 'Avalia a qualidade da orientação fornecida e condução do processo de execução.', objetivo: 'Assegurar que o cliente seja guiado com clareza e segurança.' },
    { id: '2.3', label: 'Resolução ou direcionamento adequado', max: 9, desc: 'Avalia se a demanda foi resolvida ou direcionada corretamente ao setor competente.', objetivo: 'Garantir resolução efetiva ou encaminhamento assertivo.' },
    { id: '2.4', label: 'Documentação técnica do atendimento', max: 8, desc: 'Avalia a qualidade e completude do registro técnico do atendimento no sistema.', objetivo: 'Manter histórico técnico preciso e rastreável.' },
  ]},
  { pilar: 'P3', pillarKey: 'p3', color: '#10B981', pillarMax: 18, items: [
    { id: '3.1', label: 'Análise técnica da demanda', max: 10, desc: 'Avalia a profundidade e assertividade da análise técnica realizada pelo analista.', objetivo: 'Garantir diagnóstico correto e solução tecnicamente adequada.' },
    { id: '3.2', label: 'Uso adequado das ferramentas de apoio', max: 8, desc: 'Avalia se as ferramentas de apoio foram utilizadas de forma correta e eficiente.', objetivo: 'Maximizar eficiência e qualidade técnica do atendimento.' },
  ]},
  { pilar: 'P4', pillarKey: 'p4', color: '#F59E0B', pillarMax: 14, items: [
    { id: '4.1', label: 'Uso adequado da língua portuguesa', max: 4, desc: 'Avalia gramática, ortografia e uso correto da língua portuguesa na comunicação.', objetivo: 'Garantir comunicação clara, profissional e sem erros linguísticos.' },
    { id: '4.2', label: 'Adequação do tom e postura profissional', max: 5, desc: 'Avalia se o tom utilizado foi adequado ao contexto e manteve postura profissional.', objetivo: 'Assegurar comunicação respeitosa e alinhada ao padrão da empresa.' },
    { id: '4.3', label: 'Clareza e organização da comunicação', max: 5, desc: 'Avalia se a comunicação foi clara, organizada e de fácil compreensão para o cliente.', objetivo: 'Garantir que o cliente compreenda todas as informações transmitidas.' },
  ]},
  { pilar: 'P5', pillarKey: 'p5', color: '#8B5CF6', pillarMax: 12, items: [
    { id: '5.1', label: 'Cordialidade e empatia', max: 4, desc: 'Avalia o nível de cordialidade e empatia demonstrado durante o atendimento.', objetivo: 'Criar experiência positiva e humanizada para o cliente.' },
    { id: '5.2', label: 'Proatividade na condução', max: 5, desc: 'Avalia se o analista foi proativo em antecipar necessidades e conduzir o atendimento.', objetivo: 'Superar expectativas e reduzir esforço do cliente.' },
    { id: '5.3', label: 'Over delivery', max: 3, desc: 'Avalia se o analista entregou além do esperado, surpreendendo positivamente o cliente.', objetivo: 'Gerar encantamento e fidelização do cliente.' },
  ]},
];

const CARD_BG = '#0F1B31';
const BORDER = '1px solid rgba(255,255,255,0.06)';

// ─── Safe percentage calculation ─────────────────────────────────────────────
const safePct = (value: number, max: number): number => {
  if (!max || max <= 0) return 0;
  return Math.min((value / max) * 100, 100);
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.15)', minWidth: 140 }}>
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-1.5" style={{ color: p.color || '#94A3B8' }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold text-white ml-1">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Subpilar Tooltip ─────────────────────────────────────────────────────────
interface SubpilarTooltipProps {
  item: { id: string; label: string; max: number; desc: string; objetivo: string };
  pillarName: string;
  score: number;
  pct: number;
  color: string;
  visible: boolean;
}

function SubpilarTooltip({ item, pillarName, score, pct, color, visible }: SubpilarTooltipProps) {
  if (!visible) return null;
  return (
    <div className="absolute z-50 right-0 top-full mt-2 w-72 rounded-xl p-4 shadow-2xl pointer-events-none"
      style={{ backgroundColor: '#0D1B2E', border: `1px solid ${color}40`, boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${color}20` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>{item.id}</span>
        <span className="text-xs font-bold text-white">{item.label}</span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center py-1.5 px-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#94A3B8' }}>Pilar</span>
          <span className="font-semibold text-white">{pillarName}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 px-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#94A3B8' }}>Peso máximo</span>
          <span className="font-bold" style={{ color }}>{item.max} pts</span>
        </div>
        <div className="flex justify-between items-center py-1.5 px-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <span style={{ color: '#94A3B8' }}>Nota obtida</span>
          <span className="font-bold text-white">{score} / {item.max} ({pct.toFixed(0)}%)</span>
        </div>
        <div className="pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="font-semibold mb-1" style={{ color }}>Critério avaliado</p>
          <p style={{ color: 'rgba(255,255,255,0.65)' }}>{item.desc}</p>
        </div>
        <div>
          <p className="font-semibold mb-1" style={{ color: '#34D399' }}>Objetivo</p>
          <p style={{ color: 'rgba(255,255,255,0.55)' }}>{item.objetivo}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Drilldown Modal ──────────────────────────────────────────────────────────

interface DrilldownData {
  type: 'pilar' | 'squad' | 'analista' | 'coordenador';
  label: string;
  qa: number;
  iepc: number;
  ncs: number;
  trend: 'up' | 'down' | 'stable';
  details?: string;
  color?: string;
}

function DrilldownModal({ data, onClose }: { data: DrilldownData; onClose: () => void }) {
  const trendColor = data.trend === 'up' ? '#34D399' : data.trend === 'down' ? '#F87171' : '#94A3B8';
  const TrendIcon = data.trend === 'up' ? ArrowUpRight : data.trend === 'down' ? ArrowDownRight : Activity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `linear-gradient(135deg, ${data.color || '#1E40AF'}20, transparent)` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: data.color || '#38BDF8' }}>{data.type.toUpperCase()}</p>
            <h2 className="text-xl font-bold text-white">{data.label}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 p-6">
          {[
            { label: 'QA Score', value: data.qa.toFixed(1), color: '#38BDF8', icon: <Target size={16} /> },
            { label: 'IEPC Score', value: data.iepc.toFixed(1), color: '#818CF8', icon: <Zap size={16} /> },
            { label: 'Total NCs', value: data.ncs, color: '#F87171', icon: <AlertTriangle size={16} /> },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-center mb-2" style={{ color: k.color }}>{k.icon}</div>
              <p className="text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>{k.label}</p>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6 space-y-4">
          <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: `${trendColor}10`, border: `1px solid ${trendColor}30` }}>
            <TrendIcon size={18} style={{ color: trendColor }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: trendColor }}>
                Tendência: {data.trend === 'up' ? 'Crescimento' : data.trend === 'down' ? 'Queda' : 'Estável'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Baseado nos últimos ciclos avaliados</p>
            </div>
          </div>
          {data.details && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold text-white mb-2 flex items-center gap-2"><Info size={12} style={{ color: '#38BDF8' }} /> Síntese Analítica</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{data.details}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Pontos Fortes', value: 'Consistência técnica e aderência ao protocolo', color: '#34D399' },
              { label: 'Oportunidades', value: 'Redução de reincidências e melhoria de comunicação', color: '#FBBF24' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: `${item.color}08`, border: `1px solid ${item.color}20` }}>
                <p className="text-xs font-semibold mb-1" style={{ color: item.color }}>{item.label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gauge Component ──────────────────────────────────────────────────────────

function GaugeChart({ value, max = 100, color, label }: { value: number; max?: number; color: string; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const angle = (pct / 100) * 180 - 90;
  const r = 60;
  const cx = 80, cy = 80;
  const startAngle = -180;
  const endAngle = startAngle + (pct / 100) * 180;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, end: number, radius: number) => {
    const s = { x: cx + radius * Math.cos(toRad(start)), y: cy + radius * Math.sin(toRad(start)) };
    const e = { x: cx + radius * Math.cos(toRad(end)), y: cy + radius * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="90" viewBox="0 0 160 90">
        <path d={arcPath(-180, 0, r)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(-180, endAngle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}90)` }} />
        <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(toRad(angle - 90))} y2={cy + (r - 12) * Math.sin(toRad(angle - 90))}
          stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="bold">{pct.toFixed(0)}%</text>
      </svg>
      <p className="text-xs font-medium mt-1" style={{ color: '#94A3B8' }}>{label}</p>
    </div>
  );
}

// ─── Heatmap Component ────────────────────────────────────────────────────────

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const alpha = 0.15 + pct * 0.75;
  const color = pct >= 0.8 ? `rgba(52,211,153,${alpha})` : pct >= 0.6 ? `rgba(251,191,36,${alpha})` : `rgba(248,113,113,${alpha})`;
  return (
    <div className="rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color, minHeight: 32, minWidth: 40 }}>
      {pct.toFixed(0) === 'NaN' ? '—' : `${(pct * 100).toFixed(0)}%`}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function QAIEPCContent() {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [ncs, setNcs] = useState<NCRow[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCiclo, setFilterCiclo] = useState('all');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterPilar, setFilterPilar] = useState('all');

  // UI state
  const [expandedPillar, setExpandedPillar] = useState<string | null>('P1');
  const [drilldown, setDrilldown] = useState<DrilldownData | null>(null);
  const [hoveredSubpilar, setHoveredSubpilar] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, n, p] = await Promise.all([fetchCycleScores(), fetchNCRecords(), fetchAllPeriodos()]);
      setScores(s as ScoreRow[]);
      setNcs(n as NCRow[]);
      setPeriodos(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter options
  const squads = useMemo(() => ['all', ...Array.from(new Set(scores.map((s) => s.squad).filter(Boolean))).sort()], [scores]);
  const coordenadores = useMemo(() => ['all', ...Array.from(new Set(scores.map((s) => s.coordenador).filter(Boolean))).sort()], [scores]);
  const analistas = useMemo(() => ['all', ...Array.from(new Set(scores.map((s) => s.analista).filter(Boolean))).sort()], [scores]);

  // Filtered data
  const filtered = useMemo(() => {
    let list = scores;
    if (filterCiclo !== 'all') list = list.filter((s) => s.periodo === filterCiclo);
    if (filterSquad !== 'all') list = list.filter((s) => s.squad === filterSquad);
    if (filterCoordenador !== 'all') list = list.filter((s) => s.coordenador === filterCoordenador);
    if (filterAnalista !== 'all') list = list.filter((s) => s.analista === filterAnalista);
    return list;
  }, [scores, filterCiclo, filterSquad, filterCoordenador, filterAnalista]);

  const filteredNCs = useMemo(() => {
    let list = ncs;
    if (filterCiclo !== 'all') list = list.filter((n) => n.periodo === filterCiclo);
    if (filterSquad !== 'all') list = list.filter((n) => n.squad === filterSquad);
    if (filterCoordenador !== 'all') list = list.filter((n) => n.coordenador === filterCoordenador);
    if (filterAnalista !== 'all') list = list.filter((n) => n.analista === filterAnalista);
    return list;
  }, [ncs, filterCiclo, filterSquad, filterCoordenador, filterAnalista]);

  // KPIs
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // QA and IEPC averages as percentages of their official max
  const qaMedia = avg(filtered.map((s) => s.nota_final_qa));
  const iepcMedia = avg(filtered.map((s) => s.iepc_total));
  const qaPct = safePct(qaMedia, QA_TOTAL_MAX);
  const iepcPct = safePct(iepcMedia, IEPC_TOTAL_MAX);
  const conformidade = filtered.length > 0 ? (filtered.filter((s) => s.nota_final_qa >= 70).length / filtered.length) * 100 : 0;
  const totalNC = filteredNCs.length;

  // Pillar averages as percentages of their official max
  const pillarAvgs = useMemo(() => QA_PILLARS.map((p) => {
    const rawAvg = avg(filtered.map((s) => (s as any)[p.key] || 0));
    const pct = safePct(rawAvg, p.max);
    return { ...p, value: rawAvg, pct };
  }), [filtered]);

  const iepcAvgs = useMemo(() => IEPC_DIMS.map((d) => {
    const rawAvg = avg(filtered.map((s) => (s as any)[d.key] || 0));
    const pct = safePct(rawAvg, d.max);
    return { ...d, value: rawAvg, pct };
  }), [filtered]);

  const bestPilar = pillarAvgs.reduce((a, b) => a.pct > b.pct ? a : b, pillarAvgs[0]);
  const worstPilar = pillarAvgs.reduce((a, b) => a.pct < b.pct ? a : b, pillarAvgs[0]);

  // Squad ranking
  const squadRanking = useMemo(() => {
    const map: Record<string, { squad: string; qa: number[]; iepc: number[]; ncs: number }> = {};
    filtered.forEach((s) => {
      if (!map[s.squad]) map[s.squad] = { squad: s.squad, qa: [], iepc: [], ncs: 0 };
      map[s.squad].qa.push(s.nota_final_qa);
      map[s.squad].iepc.push(s.iepc_total);
    });
    filteredNCs.forEach((n) => { if (map[n.squad]) map[n.squad].ncs++; });
    return Object.values(map).map((s) => ({
      squad: s.squad,
      qa: avg(s.qa),
      qaPct: safePct(avg(s.qa), QA_TOTAL_MAX),
      iepc: avg(s.iepc),
      ncs: s.ncs,
    })).sort((a, b) => b.qaPct - a.qaPct);
  }, [filtered, filteredNCs]);

  const bestSquad = squadRanking[0];

  // Analyst ranking
  const analystRanking = useMemo(() => {
    const map: Record<string, { name: string; squad: string; qa: number[]; iepc: number[]; ncs: number }> = {};
    filtered.forEach((s) => {
      if (!map[s.analista]) map[s.analista] = { name: s.analista, squad: s.squad, qa: [], iepc: [], ncs: 0 };
      map[s.analista].qa.push(s.nota_final_qa);
      map[s.analista].iepc.push(s.iepc_total);
    });
    filteredNCs.forEach((n) => { if (map[n.analista]) map[n.analista].ncs++; });
    return Object.values(map).map((a) => ({
      ...a,
      qa: avg(a.qa),
      qaPct: safePct(avg(a.qa), QA_TOTAL_MAX),
      iepc: avg(a.iepc),
    })).sort((a, b) => b.qaPct - a.qaPct);
  }, [filtered, filteredNCs]);

  const bestAnalista = analystRanking[0];

  // Coordinator ranking
  const coordRanking = useMemo(() => {
    const map: Record<string, { name: string; qa: number[]; iepc: number[] }> = {};
    filtered.forEach((s) => {
      if (!map[s.coordenador]) map[s.coordenador] = { name: s.coordenador, qa: [], iepc: [] };
      map[s.coordenador].qa.push(s.nota_final_qa);
      map[s.coordenador].iepc.push(s.iepc_total);
    });
    return Object.values(map).map((c) => ({
      name: c.name,
      qa: avg(c.qa),
      qaPct: safePct(avg(c.qa), QA_TOTAL_MAX),
      iepc: avg(c.iepc),
    })).sort((a, b) => b.qaPct - a.qaPct);
  }, [filtered]);

  // Trend by period
  const trendData = useMemo(() => {
    const map: Record<string, { qa: number[]; iepc: number[]; ncs: number }> = {};
    scores.forEach((s) => {
      if (!map[s.periodo]) map[s.periodo] = { qa: [], iepc: [], ncs: 0 };
      map[s.periodo].qa.push(s.nota_final_qa);
      map[s.periodo].iepc.push(s.iepc_total);
    });
    ncs.forEach((n) => { if (map[n.periodo]) map[n.periodo].ncs++; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, d]) => ({
      periodo,
      qa: avg(d.qa),
      qaPct: safePct(avg(d.qa), QA_TOTAL_MAX),
      iepc: avg(d.iepc),
      iepcPct: safePct(avg(d.iepc), IEPC_TOTAL_MAX),
      ncs: d.ncs,
    }));
  }, [scores, ncs]);

  // Radar data — use percentage of official max (0-100 scale)
  const qaRadarData = pillarAvgs.map((p) => ({ subject: p.label, value: p.pct, fullMark: 100 }));
  const iepcRadarData = iepcAvgs.map((d) => ({ subject: d.label, value: d.pct, fullMark: 100 }));

  // Heatmap: analista x pilar
  const heatmapAnalistas = analystRanking.slice(0, 8);

  // Donut conformidade
  const donutData = [
    { name: 'Conformes', value: Math.min(conformidade, 100), color: '#34D399' },
    { name: 'Não Conformes', value: Math.max(100 - conformidade, 0), color: '#F87171' },
  ];

  // NC by pilar
  const ncByPilar = useMemo(() => {
    const map: Record<string, number> = {};
    filteredNCs.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value })).sort((a, b) => b.value - a.value);
  }, [filteredNCs]);

  // Scatter: QA vs IEPC
  const scatterData = analystRanking.slice(0, 20).map((a) => ({
    x: safePct(a.qa, QA_TOTAL_MAX),
    y: safePct(a.iepc, IEPC_TOTAL_MAX),
    name: a.name,
    ncs: a.ncs,
  }));

  // Stacked bar: squad x pilares (as % of each pillar max)
  const stackedData = squadRanking.slice(0, 6).map((s) => {
    const squadScores = filtered.filter((f) => f.squad === s.squad);
    return {
      squad: s.squad.length > 10 ? s.squad.slice(0, 10) + '…' : s.squad,
      p1: safePct(avg(squadScores.map((f) => f.p1)), QA_PILLAR_MAX.p1),
      p2: safePct(avg(squadScores.map((f) => f.p2)), QA_PILLAR_MAX.p2),
      p3: safePct(avg(squadScores.map((f) => f.p3)), QA_PILLAR_MAX.p3),
      p4: safePct(avg(squadScores.map((f) => f.p4)), QA_PILLAR_MAX.p4),
      p5: safePct(avg(squadScores.map((f) => f.p5)), QA_PILLAR_MAX.p5),
    };
  });

  const riscoOp = qaPct < 60 ? 'Alto' : qaPct < 75 ? 'Médio' : 'Baixo';
  const riscoColor = riscoOp === 'Alto' ? '#F87171' : riscoOp === 'Médio' ? '#FBBF24' : '#34D399';

  const openDrilldown = (type: DrilldownData['type'], label: string, qa: number, iepc: number, ncs: number, color?: string) => {
    const trend = trendData.length >= 2
      ? (trendData[trendData.length - 1].qaPct > trendData[trendData.length - 2].qaPct ? 'up' : 'down')
      : 'stable';
    setDrilldown({ type, label, qa, iepc, ncs, trend, color, details: `Análise detalhada de ${label}: QA de ${qa.toFixed(1)} pts (${safePct(qa, QA_TOTAL_MAX).toFixed(0)}%), IEPC de ${iepc.toFixed(1)} pts (${safePct(iepc, IEPC_TOTAL_MAX).toFixed(0)}%) e ${ncs} não conformidades registradas no período selecionado.` });
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">QA & IEPC 360°</h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}>COCKPIT ESTRATÉGICO</span>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>Visão analítica completa de qualidade operacional — Matriz Oficial QA/IEPC</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#94A3B8', border: BORDER }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Global Filters */}
      <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG, border: BORDER }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#3B82F6' }} />
          <span className="text-xs font-semibold text-white">Filtros Globais</span>
          <span className="text-xs" style={{ color: '#64748B' }}>— sincronizados em todos os painéis</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Ciclo', value: filterCiclo, onChange: setFilterCiclo, options: periodos.map((p) => ({ v: p, l: p })) },
            { label: 'Squad', value: filterSquad, onChange: setFilterSquad, options: squads.filter((s) => s !== 'all').map((s) => ({ v: s, l: s })) },
            { label: 'Coordenador', value: filterCoordenador, onChange: setFilterCoordenador, options: coordenadores.filter((c) => c !== 'all').map((c) => ({ v: c, l: c })) },
            { label: 'Analista', value: filterAnalista, onChange: setFilterAnalista, options: analistas.filter((a) => a !== 'all').map((a) => ({ v: a, l: a })) },
          ].map((f) => (
            <select key={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs text-white outline-none flex-1 min-w-32"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <option value="all">Todos {f.label}s</option>
              {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <select value={filterPilar} onChange={(e) => setFilterPilar(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs text-white outline-none flex-1 min-w-32"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="all">Todos Pilares</option>
            {QA_PILLARS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: '#64748B' }}>Carregando dados operacionais…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: 'QA Médio', value: `${qaPct.toFixed(0)}%`, sub: `${qaMedia.toFixed(1)} / ${QA_TOTAL_MAX} pts`, color: '#3B82F6', icon: <Target size={15} />, glow: 'rgba(59,130,246,0.2)' },
              { label: 'IEPC Médio', value: `${iepcPct.toFixed(0)}%`, sub: `${iepcMedia.toFixed(1)} / ${IEPC_TOTAL_MAX} pts`, color: '#A855F7', icon: <Zap size={15} />, glow: 'rgba(168,85,247,0.2)' },
              { label: '% Conformidade', value: `${conformidade.toFixed(0)}%`, sub: 'QA ≥ 70%', color: '#10B981', icon: <Shield size={15} />, glow: 'rgba(16,185,129,0.2)' },
              { label: 'Total NC', value: totalNC, sub: 'Não conformidades', color: '#F87171', icon: <AlertTriangle size={15} />, glow: 'rgba(248,113,113,0.2)' },
              { label: 'Melhor Pilar', value: bestPilar?.label || '—', sub: `${bestPilar?.pct.toFixed(0) || '—'}% do máximo`, color: '#F59E0B', icon: <Star size={15} />, glow: 'rgba(245,158,11,0.2)' },
              { label: 'Pilar Crítico', value: worstPilar?.label || '—', sub: `${worstPilar?.pct.toFixed(0) || '—'}% do máximo`, color: '#F97316', icon: <TrendingDown size={15} />, glow: 'rgba(249,115,22,0.2)' },
              { label: 'Melhor Squad', value: bestSquad?.squad || '—', sub: `QA: ${bestSquad?.qaPct.toFixed(0) || '—'}%`, color: '#38BDF8', icon: <Users size={15} />, glow: 'rgba(56,189,248,0.2)' },
              { label: 'Analista Destaque', value: bestAnalista?.name?.split(' ')[0] || '—', sub: `QA: ${bestAnalista?.qaPct.toFixed(0) || '—'}%`, color: '#8B5CF6', icon: <Award size={15} />, glow: 'rgba(139,92,246,0.2)' },
              { label: 'Risco Operacional', value: riscoOp, sub: 'Baseado em QA médio', color: riscoColor, icon: <Activity size={15} />, glow: `${riscoColor}30` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-default" style={{ backgroundColor: CARD_BG, border: `1px solid ${k.color}20`, boxShadow: `0 4px 20px ${k.glow}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: '#64748B' }}>{k.label}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.glow, color: k.color }}>{k.icon}</div>
                </div>
                <p className="text-lg font-bold text-white truncate">{k.value}</p>
                <p className="text-xs mt-1 truncate" style={{ color: '#475569' }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Radar Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QA Radar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 0 24px rgba(59,130,246,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Mapa Estratégico QA</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Radar por Pilares — % do máximo oficial</p>
                </div>
                <div className="flex gap-1">
                  {QA_PILLARS.map((p) => (
                    <div key={p.key} className="group relative">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold cursor-help" style={{ backgroundColor: `${p.color}25`, color: p.color, border: `1px solid ${p.color}40` }}>{p.key.toUpperCase()}</div>
                      <div className="absolute right-0 top-8 z-10 hidden group-hover:block w-64 rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: `1px solid ${p.color}30` }}>
                        <p className="font-bold text-white mb-1">{p.fullName}</p>
                        <p className="mb-1" style={{ color: '#94A3B8' }}>{p.desc}</p>
                        <p className="font-semibold" style={{ color: p.color }}>Peso máximo: {p.max} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={qaRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.12)" gridType="polygon" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickCount={5} />
                  <Radar name="QA %" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} strokeWidth={3}
                    dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const pillar = QA_PILLARS.find(p => p.label === d?.payload?.subject);
                    return (
                      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: `1px solid ${pillar?.color || '#3B82F6'}40` }}>
                        <p className="font-bold text-white mb-1">{d?.payload?.subject}</p>
                        <p style={{ color: pillar?.color || '#3B82F6' }}>Aderência: <strong>{Number(d?.value).toFixed(1)}%</strong></p>
                        {pillar && <p style={{ color: '#94A3B8' }}>Máx: {pillar.max} pts</p>}
                      </div>
                    );
                  }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-3">
                {pillarAvgs.map((p) => (
                  <button key={p.key} onClick={() => openDrilldown('pilar', p.fullName, p.value, iepcMedia, totalNC, p.color)}
                    className="rounded-lg p-2 text-center transition-all hover:scale-105" style={{ backgroundColor: `${p.color}12`, border: `1px solid ${p.color}30` }}>
                    <p className="text-xs font-bold" style={{ color: p.color }}>{p.pct.toFixed(0)}%</p>
                    <p style={{ color: '#64748B', fontSize: 9 }}>{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* IEPC Radar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 0 24px rgba(168,85,247,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Mapa Estratégico IEPC</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Radar por Dimensões — % do máximo oficial</p>
                </div>
                <div className="flex gap-1">
                  {IEPC_DIMS.map((d) => (
                    <div key={d.key} className="group relative">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold cursor-help" style={{ backgroundColor: `${d.color}25`, color: d.color, border: `1px solid ${d.color}40` }}>{d.key.toUpperCase()}</div>
                      <div className="absolute right-0 top-8 z-10 hidden group-hover:block w-64 rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: `1px solid ${d.color}30` }}>
                        <p className="font-bold text-white mb-1">{d.fullName}</p>
                        <p className="mb-1" style={{ color: '#94A3B8' }}>{d.desc}</p>
                        <p className="font-semibold" style={{ color: d.color }}>Peso máximo: {d.max} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={iepcRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.12)" gridType="polygon" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} tickCount={5} />
                  <Radar name="IEPC %" dataKey="value" stroke="#A855F7" fill="#A855F7" fillOpacity={0.25} strokeWidth={3}
                    dot={{ fill: '#A855F7', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0];
                    const dim = IEPC_DIMS.find(e => e.label === d?.payload?.subject);
                    return (
                      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: `1px solid ${dim?.color || '#A855F7'}40` }}>
                        <p className="font-bold text-white mb-1">{d?.payload?.subject}</p>
                        <p style={{ color: dim?.color || '#A855F7' }}>Aderência: <strong>{Number(d?.value).toFixed(1)}%</strong></p>
                        {dim && <p style={{ color: '#94A3B8' }}>Máx: {dim.max} pts</p>}
                      </div>
                    );
                  }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-3">
                {iepcAvgs.map((d) => (
                  <div key={d.key} className="rounded-lg p-2 text-center" style={{ backgroundColor: `${d.color}12`, border: `1px solid ${d.color}30` }}>
                    <p className="text-xs font-bold" style={{ color: d.color }}>{d.pct.toFixed(0)}%</p>
                    <p style={{ color: '#64748B', fontSize: 9 }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subpilares Accordion */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: BORDER }}>
            <div className="flex items-center gap-3 p-5" style={{ borderBottom: BORDER }}>
              <Layers size={15} style={{ color: '#3B82F6' }} />
              <h3 className="text-sm font-bold text-white">Subpilares — Análise Detalhada</h3>
              <span className="text-xs" style={{ color: '#64748B' }}>Passe o mouse para ver critérios • Clique para expandir</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {SUBPILARES.map((section) => {
                const pillarData = pillarAvgs.find((p) => p.key === section.pillarKey);
                const pillarScore = pillarData?.value || 0;
                const pillarPct = pillarData?.pct || 0;
                const isOpen = expandedPillar === section.pilar;
                return (
                  <div key={section.pilar}>
                    <button onClick={() => setExpandedPillar(isOpen ? null : section.pilar)}
                      className="w-full flex items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${section.color}20`, border: `1px solid ${section.color}35`, color: section.color }}>{section.pilar}</div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{QA_PILLARS.find((p) => p.key === section.pillarKey)?.fullName}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{section.items.length} subpilares · Máx: {section.pillarMax} pts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: section.color }}>{pillarScore.toFixed(1)} / {section.pillarMax}</p>
                          <p className="text-xs font-semibold" style={{ color: pillarPct >= 80 ? '#34D399' : pillarPct >= 60 ? '#FBBF24' : '#F87171' }}>{pillarPct.toFixed(0)}%</p>
                        </div>
                        {isOpen ? <ChevronDown size={14} style={{ color: '#64748B' }} /> : <ChevronRight size={14} style={{ color: '#64748B' }} />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        {section.items.map((item) => {
                          // Use actual subpilar score from payload if available, else proportional estimate
                          const rawScore = pillarScore > 0
                            ? Math.min(pillarScore * (item.max / section.pillarMax), item.max)
                            : 0;
                          const score = Math.round(rawScore * 10) / 10;
                          const pct = safePct(score, item.max);
                          const barColor = pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#F87171';
                          const glowColor = pct >= 80 ? 'rgba(16,185,129,0.5)' : pct >= 60 ? 'rgba(245,158,11,0.5)' : 'rgba(248,113,113,0.5)';
                          const tooltipKey = `${section.pilar}-${item.id}`;
                          return (
                            <div key={item.id} className="relative rounded-xl p-4 transition-all duration-200 hover:bg-white/[0.03]"
                              style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)` }}
                              onMouseEnter={() => setHoveredSubpilar(tooltipKey)}
                              onMouseLeave={() => setHoveredSubpilar(null)}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${section.color}18`, color: section.color, border: `1px solid ${section.color}30` }}>{item.id}</span>
                                  <span className="text-sm font-medium text-white">{item.label}</span>
                                  <Info size={12} style={{ color: '#475569' }} className="cursor-help" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white">{score.toFixed(1)} / {item.max}</span>
                                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${barColor}18`, color: barColor, border: `1px solid ${barColor}30` }}>{pct.toFixed(0)}%</span>
                                </div>
                              </div>
                              {/* Progress bar with gradient */}
                              <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                                    boxShadow: `0 0 10px ${glowColor}`,
                                  }} />
                              </div>
                              {/* Tooltip */}
                              <SubpilarTooltip
                                item={item}
                                pillarName={QA_PILLARS.find(p => p.key === section.pillarKey)?.fullName || section.pilar}
                                score={score}
                                pct={pct}
                                color={section.color}
                                visible={hoveredSubpilar === tooltipKey}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Evolução QA por Ciclo (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="qaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="qaPct" name="QA %" stroke="#3B82F6" fill="url(#qaGrad)" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Evolução IEPC por Ciclo (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="iepcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="iepcPct" name="IEPC %" stroke="#A855F7" fill="url(#iepcGrad)" strokeWidth={2.5} dot={{ fill: '#A855F7', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Squad + Stacked + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Ranking QA por Squad (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={squadRanking.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qaPct" name="QA %" fill="#3B82F6" radius={[0, 4, 4, 0]}
                    onClick={(d) => openDrilldown('squad', d.squad, d.qa, d.iepc, d.ncs, '#3B82F6')} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Pilares por Squad (% máx)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stackedData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  {QA_PILLARS.map((p) => <Bar key={p.key} dataKey={p.key} name={p.label} stackId="a" fill={p.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Distribuição Conformidade</h3>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold text-white">{conformidade.toFixed(0)}%</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Conformes</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gauges Row */}
          <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
            <h3 className="text-sm font-bold text-white mb-5">Gauges de Performance — Pilares QA (% do máximo oficial)</h3>
            <div className="flex flex-wrap justify-around gap-4">
              {pillarAvgs.map((p) => <GaugeChart key={p.key} value={p.value} max={p.max} color={p.color} label={`${p.label} (/${p.max})`} />)}
            </div>
          </div>

          {/* Heatmap + Scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Heatmap — Analista × Pilar (% máx)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left pb-2 pr-3" style={{ color: '#64748B' }}>Analista</th>
                      {QA_PILLARS.map((p) => <th key={p.key} className="pb-2 px-1 text-center" style={{ color: p.color }}>{p.label.split(' ')[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapAnalistas.map((a) => {
                      const aScores = filtered.filter((s) => s.analista === a.name);
                      return (
                        <tr key={a.name}>
                          <td className="pr-3 py-1 text-white truncate max-w-24">{a.name.split(' ')[0]}</td>
                          {QA_PILLARS.map((p) => {
                            const rawVal = avg(aScores.map((s) => (s as any)[p.key] || 0));
                            return <td key={p.key} className="px-1 py-1"><HeatmapCell value={rawVal} max={p.max} /></td>;
                          })}
                        </tr>
                      );
                    })}
                    {heatmapAnalistas.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center" style={{ color: '#64748B' }}>Sem dados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Scatter — QA% vs IEPC% por Analista</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" dataKey="x" name="QA%" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="number" dataKey="y" name="IEPC%" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <p className="font-bold text-white">{d?.name}</p>
                        <p style={{ color: '#3B82F6' }}>QA: {d?.x?.toFixed(1)}%</p>
                        <p style={{ color: '#A855F7' }}>IEPC: {d?.y?.toFixed(1)}%</p>
                        <p style={{ color: '#F87171' }}>NCs: {d?.ncs}</p>
                      </div>
                    );
                  }} />
                  <Scatter data={scatterData} fill="#3B82F6" fillOpacity={0.8} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NC by Pilar + Trend NC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">NCs por Tipo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ncByPilar} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="NCs" fill="#F87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Tendência NC por Ciclo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="ncs" name="NCs" stroke="#F87171" strokeWidth={2.5} dot={{ fill: '#F87171', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Award size={14} style={{ color: '#F59E0B' }} /> Ranking Analistas</h3>
              <div className="space-y-2">
                {analystRanking.slice(0, 8).map((a, i) => (
                  <button key={a.name} onClick={() => openDrilldown('analista', a.name, a.qa, a.iepc, a.ncs, '#8B5CF6')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>{a.squad}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>{a.qaPct.toFixed(0)}%</span>
                  </button>
                ))}
                {analystRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users size={14} style={{ color: '#38BDF8' }} /> Ranking Squads</h3>
              <div className="space-y-2">
                {squadRanking.slice(0, 8).map((s, i) => (
                  <button key={s.squad} onClick={() => openDrilldown('squad', s.squad, s.qa, s.iepc, s.ncs, '#38BDF8')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{s.squad}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>IEPC: {safePct(s.iepc, IEPC_TOTAL_MAX).toFixed(0)}%</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>{s.qaPct.toFixed(0)}%</span>
                  </button>
                ))}
                {squadRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield size={14} style={{ color: '#8B5CF6' }} /> Ranking Coordenadores</h3>
              <div className="space-y-2">
                {coordRanking.slice(0, 8).map((c, i) => (
                  <button key={c.name} onClick={() => openDrilldown('coordenador', c.name, c.qa, c.iepc, 0, '#8B5CF6')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#F59E0B' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>IEPC: {safePct(c.iepc, IEPC_TOTAL_MAX).toFixed(0)}%</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#8B5CF6' }}>{c.qaPct.toFixed(0)}%</span>
                  </button>
                ))}
                {coordRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>
          </div>

          {/* Comparative: QA vs IEPC by Ciclo */}
          <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
            <h3 className="text-sm font-bold text-white mb-4">Comparativo QA × IEPC por Ciclo (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 11 }} />
                <Bar dataKey="ncs" name="NCs" fill="rgba(248,113,113,0.3)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="qaPct" name="QA %" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4 }} />
                <Line type="monotone" dataKey="iepcPct" name="IEPC %" stroke="#A855F7" strokeWidth={2.5} dot={{ fill: '#A855F7', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Drilldown Modal */}
      {drilldown && <DrilldownModal data={drilldown} onClose={() => setDrilldown(null)} />}
    </div>
  );
}

export default function QAIEPCPage() {
  return (
    <EnterpriseLayout>
      <QAIEPCContent />
    </EnterpriseLayout>
  );
}
