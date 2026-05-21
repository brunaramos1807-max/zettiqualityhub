'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell, ScatterChart, Scatter,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import { Activity, TrendingDown, AlertTriangle, Star, Users, Target, ChevronDown, ChevronRight, X, Filter, RefreshCw, Zap, Award, Shield, Info, Layers, ArrowUpRight, ArrowDownRight,  } from 'lucide-react';
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
}

interface NCRow {
  periodo: string;
  analista: string;
  squad: string;
  coordenador: string;
  tipo_nc: string;
  pontos_deduzidos: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QA_PILLARS = [
  { key: 'p1', label: 'P1 Fluxo', fullName: 'P1 — Gestão do Fluxo e Rastreabilidade', color: '#38BDF8', desc: 'Avalia identificação, protocolo, rastreabilidade e encerramento do atendimento.' },
  { key: 'p2', label: 'P2 Tratativa', fullName: 'P2 — Tratativa e Resolução', color: '#818CF8', desc: 'Avalia a qualidade da solução entregue, precisão técnica e efetividade.' },
  { key: 'p3', label: 'P3 Análise', fullName: 'P3 — Análise e Diagnóstico', color: '#34D399', desc: 'Avalia a capacidade analítica, diagnóstico correto e profundidade técnica.' },
  { key: 'p4', label: 'P4 Comunicação', fullName: 'P4 — Comunicação e Clareza', color: '#FBBF24', desc: 'Avalia clareza, objetividade, linguagem adequada e comunicação com o cliente.' },
  { key: 'p5', label: 'P5 Conduta', fullName: 'P5 — Conduta e Postura', color: '#F87171', desc: 'Avalia postura profissional, ética, empatia e comportamento no atendimento.' },
];

const IEPC_DIMS = [
  { key: 'e1', label: 'E1 Resolução', fullName: 'E1 — Resolução Percebida', color: '#38BDF8', desc: 'Percepção do cliente sobre a resolução efetiva do problema.' },
  { key: 'e2', label: 'E2 Clareza', fullName: 'E2 — Clareza e Confiança', color: '#A78BFA', desc: 'Clareza das informações transmitidas e confiança gerada no cliente.' },
  { key: 'e3', label: 'E3 Esforço', fullName: 'E3 — Esforço do Cliente', color: '#34D399', desc: 'Nível de esforço exigido do cliente para resolver sua demanda.' },
  { key: 'e4', label: 'E4 Tempo', fullName: 'E4 — Tempo e Fluidez', color: '#FBBF24', desc: 'Percepção de agilidade e fluidez no atendimento.' },
  { key: 'e5', label: 'E5 Relacional', fullName: 'E5 — Experiência Relacional', color: '#FB923C', desc: 'Qualidade da relação humana e experiência emocional do cliente.' },
];

const SUBPILARES = [
  { pilar: 'P1', pillarKey: 'p1', color: '#38BDF8', items: [
    { id: '1.1', label: 'Identificação e Boas-vindas', max: 5 },
    { id: '1.2', label: 'Comunicação do protocolo SUP', max: 9 },
    { id: '1.3', label: 'Encerramento', max: 8 },
  ]},
  { pilar: 'P2', pillarKey: 'p2', color: '#818CF8', items: [
    { id: '2.1', label: 'Diagnóstico da demanda', max: 8 },
    { id: '2.2', label: 'Solução técnica aplicada', max: 10 },
    { id: '2.3', label: 'Validação com o cliente', max: 7 },
  ]},
  { pilar: 'P3', pillarKey: 'p3', color: '#34D399', items: [
    { id: '3.1', label: 'Análise de causa raiz', max: 8 },
    { id: '3.2', label: 'Profundidade técnica', max: 9 },
    { id: '3.3', label: 'Registro de evidências', max: 6 },
  ]},
  { pilar: 'P4', pillarKey: 'p4', color: '#FBBF24', items: [
    { id: '4.1', label: 'Clareza e objetividade', max: 8 },
    { id: '4.2', label: 'Linguagem adequada', max: 7 },
    { id: '4.3', label: 'Retorno proativo', max: 8 },
  ]},
  { pilar: 'P5', pillarKey: 'p5', color: '#F87171', items: [
    { id: '5.1', label: 'Postura e ética', max: 8 },
    { id: '5.2', label: 'Empatia e escuta ativa', max: 9 },
    { id: '5.3', label: 'Comprometimento', max: 6 },
  ]},
];

const CARD_BG = '#0F1B31';
const BORDER = '1px solid rgba(255,255,255,0.06)';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', minWidth: 140 }}>
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
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `linear-gradient(135deg, ${data.color || '#1E40AF'}20, transparent)` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: data.color || '#38BDF8' }}>{data.type.toUpperCase()}</p>
            <h2 className="text-xl font-bold text-white">{data.label}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors hover:bg-white/5" style={{ color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* KPIs */}
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

        {/* Trend + Details */}
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

function GaugeChart({ value, max = 10, color, label }: { value: number; max?: number; color: string; label: string }) {
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
        <path d={arcPath(-180, 0, r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(-180, endAngle, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        <line x1={cx} y1={cy} x2={cx + (r - 12) * Math.cos(toRad(angle - 90))} y2={cy + (r - 12) * Math.sin(toRad(angle - 90))}
          stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{value.toFixed(1)}</text>
      </svg>
      <p className="text-xs font-medium mt-1" style={{ color: '#94A3B8' }}>{label}</p>
    </div>
  );
}

// ─── Heatmap Component ────────────────────────────────────────────────────────

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? value / max : 0;
  const alpha = 0.1 + pct * 0.8;
  const color = pct >= 0.8 ? `rgba(52,211,153,${alpha})` : pct >= 0.6 ? `rgba(251,191,36,${alpha})` : `rgba(248,113,113,${alpha})`;
  return (
    <div className="rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: color, minHeight: 32, minWidth: 40 }}>
      {value.toFixed(0)}
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
  const qaMedia = avg(filtered.map((s) => s.nota_final_qa));
  const iepcMedia = avg(filtered.map((s) => s.iepc_total));
  const conformidade = filtered.length > 0 ? (filtered.filter((s) => s.nota_final_qa >= 7).length / filtered.length) * 100 : 0;
  const totalNC = filteredNCs.length;

  const pillarAvgs = useMemo(() => QA_PILLARS.map((p) => ({ ...p, value: avg(filtered.map((s) => (s as any)[p.key] || 0)) })), [filtered]);
  const iepcAvgs = useMemo(() => IEPC_DIMS.map((d) => ({ ...d, value: avg(filtered.map((s) => (s as any)[d.key] || 0)) })), [filtered]);

  const bestPilar = pillarAvgs.reduce((a, b) => a.value > b.value ? a : b, pillarAvgs[0]);
  const worstPilar = pillarAvgs.reduce((a, b) => a.value < b.value ? a : b, pillarAvgs[0]);

  // Squad ranking
  const squadRanking = useMemo(() => {
    const map: Record<string, { squad: string; qa: number[]; iepc: number[]; ncs: number }> = {};
    filtered.forEach((s) => {
      if (!map[s.squad]) map[s.squad] = { squad: s.squad, qa: [], iepc: [], ncs: 0 };
      map[s.squad].qa.push(s.nota_final_qa);
      map[s.squad].iepc.push(s.iepc_total);
    });
    filteredNCs.forEach((n) => { if (map[n.squad]) map[n.squad].ncs++; });
    return Object.values(map).map((s) => ({ squad: s.squad, qa: avg(s.qa), iepc: avg(s.iepc), ncs: s.ncs })).sort((a, b) => b.qa - a.qa);
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
    return Object.values(map).map((a) => ({ ...a, qa: avg(a.qa), iepc: avg(a.iepc) })).sort((a, b) => b.qa - a.qa);
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
    return Object.values(map).map((c) => ({ name: c.name, qa: avg(c.qa), iepc: avg(c.iepc) })).sort((a, b) => b.qa - a.qa);
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
      periodo, qa: avg(d.qa), iepc: avg(d.iepc), ncs: d.ncs,
    }));
  }, [scores, ncs]);

  // Radar data
  const qaRadarData = pillarAvgs.map((p) => ({ subject: p.label, value: p.value, fullMark: 10 }));
  const iepcRadarData = iepcAvgs.map((d) => ({ subject: d.label, value: d.value, fullMark: 10 }));

  // Heatmap: analista x pilar
  const heatmapAnalistas = analystRanking.slice(0, 8);
  const heatmapMax = 10;

  // Donut conformidade
  const donutData = [
    { name: 'Conformes', value: conformidade, color: '#34D399' },
    { name: 'Não Conformes', value: 100 - conformidade, color: '#F87171' },
  ];

  // NC by pilar
  const ncByPilar = useMemo(() => {
    const map: Record<string, number> = {};
    filteredNCs.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value })).sort((a, b) => b.value - a.value);
  }, [filteredNCs]);

  // Scatter: QA vs IEPC
  const scatterData = analystRanking.slice(0, 20).map((a) => ({ x: a.qa, y: a.iepc, name: a.name, ncs: a.ncs }));

  // Stacked bar: squad x pilares
  const stackedData = squadRanking.slice(0, 6).map((s) => {
    const squadScores = filtered.filter((f) => f.squad === s.squad);
    return {
      squad: s.squad.length > 10 ? s.squad.slice(0, 10) + '…' : s.squad,
      p1: avg(squadScores.map((f) => f.p1)),
      p2: avg(squadScores.map((f) => f.p2)),
      p3: avg(squadScores.map((f) => f.p3)),
      p4: avg(squadScores.map((f) => f.p4)),
      p5: avg(squadScores.map((f) => f.p5)),
    };
  });

  // Risco operacional
  const riscoOp = qaMedia < 6 ? 'Alto' : qaMedia < 7.5 ? 'Médio' : 'Baixo';
  const riscoColor = riscoOp === 'Alto' ? '#F87171' : riscoOp === 'Médio' ? '#FBBF24' : '#34D399';

  const openDrilldown = (type: DrilldownData['type'], label: string, qa: number, iepc: number, ncs: number, color?: string) => {
    const trend = trendData.length >= 2
      ? (trendData[trendData.length - 1].qa > trendData[trendData.length - 2].qa ? 'up' : 'down')
      : 'stable';
    setDrilldown({ type, label, qa, iepc, ncs, trend, color, details: `Análise detalhada de ${label}: QA médio de ${qa.toFixed(1)}, IEPC de ${iepc.toFixed(1)} e ${ncs} não conformidades registradas no período selecionado.` });
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #38BDF8, #818CF8)', boxShadow: '0 0 16px rgba(56,189,248,0.3)' }}>
              <Zap size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">QA & IEPC 360°</h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>COCKPIT ESTRATÉGICO</span>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>Visão analítica completa de qualidade operacional</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#94A3B8', border: BORDER }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Global Filters */}
      <div className="rounded-xl p-4" style={{ backgroundColor: CARD_BG, border: BORDER }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#38BDF8' }} />
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
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="all">Todos {f.label}s</option>
              {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <select value={filterPilar} onChange={(e) => setFilterPilar(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs text-white outline-none flex-1 min-w-32"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos Pilares</option>
            {QA_PILLARS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm" style={{ color: '#64748B' }}>Carregando dados operacionais…</p>
          </div>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: 'QA Médio', value: qaMedia.toFixed(1), color: '#38BDF8', icon: <Target size={15} />, sub: `${filtered.length} avaliações`, glow: 'rgba(56,189,248,0.15)' },
              { label: 'IEPC Médio', value: iepcMedia.toFixed(1), color: '#818CF8', icon: <Zap size={15} />, sub: 'Experiência percebida', glow: 'rgba(129,140,248,0.15)' },
              { label: '% Conformidade', value: `${conformidade.toFixed(0)}%`, color: '#34D399', icon: <Shield size={15} />, sub: 'QA ≥ 7.0', glow: 'rgba(52,211,153,0.15)' },
              { label: 'Total NC', value: totalNC, color: '#F87171', icon: <AlertTriangle size={15} />, sub: 'Não conformidades', glow: 'rgba(248,113,113,0.15)' },
              { label: 'Melhor Pilar', value: bestPilar?.label || '—', color: '#FBBF24', icon: <Star size={15} />, sub: `Score: ${bestPilar?.value.toFixed(1) || '—'}`, glow: 'rgba(251,191,36,0.15)' },
              { label: 'Pilar Crítico', value: worstPilar?.label || '—', color: '#FB923C', icon: <TrendingDown size={15} />, sub: `Score: ${worstPilar?.value.toFixed(1) || '—'}`, glow: 'rgba(251,146,60,0.15)' },
              { label: 'Melhor Squad', value: bestSquad?.squad || '—', color: '#38BDF8', icon: <Users size={15} />, sub: `QA: ${bestSquad?.qa.toFixed(1) || '—'}`, glow: 'rgba(56,189,248,0.15)' },
              { label: 'Analista Destaque', value: bestAnalista?.name?.split(' ')[0] || '—', color: '#A78BFA', icon: <Award size={15} />, sub: `QA: ${bestAnalista?.qa.toFixed(1) || '—'}`, glow: 'rgba(167,139,250,0.15)' },
              { label: 'Risco Operacional', value: riscoOp, color: riscoColor, icon: <Activity size={15} />, sub: 'Baseado em QA médio', glow: `${riscoColor}20` },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-default" style={{ backgroundColor: CARD_BG, border: BORDER, boxShadow: `0 4px 20px ${k.glow}` }}>
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
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Mapa Estratégico QA</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Radar por Pilares de Qualidade</p>
                </div>
                <div className="flex gap-1">
                  {QA_PILLARS.map((p) => (
                    <div key={p.key} className="group relative">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-help" style={{ backgroundColor: `${p.color}20`, color: p.color }}>{p.key.toUpperCase()}</div>
                      <div className="absolute right-0 top-7 z-10 hidden group-hover:block w-56 rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="font-bold text-white mb-1">{p.fullName}</p>
                        <p style={{ color: '#94A3B8' }}>{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={qaRadarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                  <Radar name="QA" dataKey="value" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-3">
                {pillarAvgs.map((p) => (
                  <button key={p.key} onClick={() => openDrilldown('pilar', p.fullName, p.value, iepcMedia, totalNC, p.color)}
                    className="rounded-lg p-2 text-center transition-all hover:scale-105" style={{ backgroundColor: `${p.color}10`, border: `1px solid ${p.color}25` }}>
                    <p className="text-xs font-bold" style={{ color: p.color }}>{p.value.toFixed(1)}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B', fontSize: 9 }}>{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* IEPC Radar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Mapa Estratégico IEPC</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Radar por Dimensões de Experiência</p>
                </div>
                <div className="flex gap-1">
                  {IEPC_DIMS.map((d) => (
                    <div key={d.key} className="group relative">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-help" style={{ backgroundColor: `${d.color}20`, color: d.color }}>{d.key.toUpperCase()}</div>
                      <div className="absolute right-0 top-7 z-10 hidden group-hover:block w-56 rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="font-bold text-white mb-1">{d.fullName}</p>
                        <p style={{ color: '#94A3B8' }}>{d.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={iepcRadarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                  <Radar name="IEPC" dataKey="value" stroke="#818CF8" fill="#818CF8" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-2 mt-3">
                {iepcAvgs.map((d) => (
                  <div key={d.key} className="rounded-lg p-2 text-center" style={{ backgroundColor: `${d.color}10`, border: `1px solid ${d.color}25` }}>
                    <p className="text-xs font-bold" style={{ color: d.color }}>{d.value.toFixed(1)}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B', fontSize: 9 }}>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subpilares Accordion */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: CARD_BG, border: BORDER }}>
            <div className="flex items-center gap-3 p-5" style={{ borderBottom: BORDER }}>
              <Layers size={15} style={{ color: '#38BDF8' }} />
              <h3 className="text-sm font-bold text-white">Subpilares — Análise Detalhada</h3>
              <span className="text-xs" style={{ color: '#64748B' }}>Clique para expandir</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {SUBPILARES.map((section) => {
                const pillarScore = pillarAvgs.find((p) => p.key === section.pillarKey)?.value || 0;
                const isOpen = expandedPillar === section.pilar;
                return (
                  <div key={section.pilar}>
                    <button onClick={() => setExpandedPillar(isOpen ? null : section.pilar)}
                      className="w-full flex items-center justify-between px-5 py-4 transition-all hover:bg-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: `${section.color}20`, border: `1px solid ${section.color}30`, color: section.color }}>{section.pilar}</div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{QA_PILLARS.find((p) => p.key === section.pillarKey)?.fullName}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{section.items.length} subpilares</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: section.color }}>{pillarScore.toFixed(1)}</p>
                          <p className="text-xs" style={{ color: '#64748B' }}>{pillarScore >= 8 ? 'Excelente' : pillarScore >= 6 ? 'Regular' : 'Crítico'}</p>
                        </div>
                        {isOpen ? <ChevronDown size={14} style={{ color: '#64748B' }} /> : <ChevronRight size={14} style={{ color: '#64748B' }} />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        {section.items.map((item) => {
                          const score = Math.round(pillarScore * item.max / 10);
                          const pct = item.max > 0 ? (score / item.max) * 100 : 0;
                          const barColor = pct >= 80 ? '#34D399' : pct >= 60 ? '#FBBF24' : '#F87171';
                          return (
                            <div key={item.id} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${section.color}15`, color: section.color }}>{item.id}</span>
                                  <span className="text-sm text-white">{item.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white">{score} / {item.max}</span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${barColor}15`, color: barColor }}>{pct.toFixed(0)}%</span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}60` }} />
                              </div>
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
              <h3 className="text-sm font-bold text-white mb-4">Evolução QA por Ciclo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="qaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="qa" name="QA" stroke="#38BDF8" fill="url(#qaGrad)" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Evolução IEPC por Ciclo</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="iepcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <YAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="iepc" name="IEPC" stroke="#818CF8" fill="url(#iepcGrad)" strokeWidth={2} dot={{ fill: '#818CF8', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Squad + Stacked + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Squad Ranking Bar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Ranking QA por Squad</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={squadRanking.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qa" name="QA" fill="#38BDF8" radius={[0, 4, 4, 0]}
                    onClick={(d) => openDrilldown('squad', d.squad, d.qa, d.iepc, d.ncs, '#38BDF8')} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stacked Bar: Squad x Pilares */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Pilares por Squad</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stackedData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {QA_PILLARS.map((p) => <Bar key={p.key} dataKey={p.key} name={p.label} stackId="a" fill={p.color} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Conformidade */}
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
            <h3 className="text-sm font-bold text-white mb-5">Gauges de Performance — Pilares QA</h3>
            <div className="flex flex-wrap justify-around gap-4">
              {pillarAvgs.map((p) => <GaugeChart key={p.key} value={p.value} max={10} color={p.color} label={p.label} />)}
            </div>
          </div>

          {/* Heatmap + Scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heatmap: Analista x Pilar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Heatmap — Analista × Pilar</h3>
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
                            const val = avg(aScores.map((s) => (s as any)[p.key] || 0));
                            return <td key={p.key} className="px-1 py-1"><HeatmapCell value={val} max={heatmapMax} /></td>;
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

            {/* Scatter: QA vs IEPC */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4">Scatter — QA vs IEPC por Analista</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" dataKey="x" name="QA" domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} label={{ value: 'QA', position: 'insideBottom', fill: '#64748B', fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="IEPC" domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} label={{ value: 'IEPC', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 10 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-xl p-3 text-xs shadow-2xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <p className="font-bold text-white">{d?.name}</p>
                        <p style={{ color: '#38BDF8' }}>QA: {d?.x?.toFixed(1)}</p>
                        <p style={{ color: '#818CF8' }}>IEPC: {d?.y?.toFixed(1)}</p>
                        <p style={{ color: '#F87171' }}>NCs: {d?.ncs}</p>
                      </div>
                    );
                  }} />
                  <Scatter data={scatterData} fill="#38BDF8" fillOpacity={0.7} />
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
                  <Line type="monotone" dataKey="ncs" name="NCs" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rankings Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Analyst Ranking */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Award size={14} style={{ color: '#FBBF24' }} /> Ranking Analistas</h3>
              <div className="space-y-2">
                {analystRanking.slice(0, 8).map((a, i) => (
                  <button key={a.name} onClick={() => openDrilldown('analista', a.name, a.qa, a.iepc, a.ncs, '#A78BFA')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#FBBF24' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>{a.squad}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#38BDF8' }}>{a.qa.toFixed(1)}</span>
                  </button>
                ))}
                {analystRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>

            {/* Squad Ranking */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users size={14} style={{ color: '#38BDF8' }} /> Ranking Squads</h3>
              <div className="space-y-2">
                {squadRanking.slice(0, 8).map((s, i) => (
                  <button key={s.squad} onClick={() => openDrilldown('squad', s.squad, s.qa, s.iepc, s.ncs, '#38BDF8')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#FBBF24' : i === 1 ? '#94A3B8' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{s.squad}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>IEPC: {s.iepc.toFixed(1)}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#34D399' }}>{s.qa.toFixed(1)}</span>
                  </button>
                ))}
                {squadRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>

            {/* Coordinator Ranking */}
            <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield size={14} style={{ color: '#818CF8' }} /> Ranking Coordenadores</h3>
              <div className="space-y-2">
                {coordRanking.slice(0, 8).map((c, i) => (
                  <button key={c.name} onClick={() => openDrilldown('coordenador', c.name, c.qa, c.iepc, 0, '#818CF8')}
                    className="w-full flex items-center gap-3 py-2 px-2 rounded-lg transition-all hover:bg-white/[0.03]">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#FBBF24' : '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>IEPC: {c.iepc.toFixed(1)}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#818CF8' }}>{c.qa.toFixed(1)}</span>
                  </button>
                ))}
                {coordRanking.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>
          </div>

          {/* Comparative: QA vs IEPC by Ciclo */}
          <div className="rounded-xl p-5" style={{ backgroundColor: CARD_BG, border: BORDER }}>
            <h3 className="text-sm font-bold text-white mb-4">Comparativo QA × IEPC por Ciclo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <YAxis domain={[0, 10]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 11 }} />
                <Bar dataKey="ncs" name="NCs" fill="rgba(248,113,113,0.3)" radius={[4, 4, 0, 0]} yAxisId={0} />
                <Line type="monotone" dataKey="qa" name="QA" stroke="#38BDF8" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 4 }} />
                <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#818CF8" strokeWidth={2.5} dot={{ fill: '#818CF8', r: 4 }} />
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
