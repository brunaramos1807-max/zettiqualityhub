'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchNCRecords, fetchAllPeriodos } from '@/lib/services/dataService';
import { AlertTriangle, Search, BarChart2, RefreshCw, TrendingUp, Filter, ChevronRight, Shield, Activity, Layers, X, Eye, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, PieChart, Pie, Cell, AreaChart, Area,  } from 'recharts';

const NC_TYPES = [
  { key: 'NC-1', fullName: 'NC-1 — Postura e Ética Profissional', short: 'Postura e Ética', color: '#7C3AED', icon: '🤝', criticidade: 'Alta' },
  { key: 'NC-2', fullName: 'NC-2 — Acuracidade e Rigor Técnico', short: 'Rigor Técnico', color: '#EF4444', icon: '🎯', criticidade: 'Alta' },
  { key: 'NC-3', fullName: 'NC-3 — Registro e Rastreabilidade', short: 'Rastreabilidade', color: '#F59E0B', icon: '📋', criticidade: 'Média' },
  { key: 'NC-4', fullName: 'NC-4 — Integridade do Fluxo Operacional', short: 'Fluxo Operacional', color: '#38BDF8', icon: '⚙️', criticidade: 'Alta' },
  { key: 'NC-5', fullName: 'NC-5 — Segurança da Informação', short: 'Segurança', color: '#22C55E', icon: '🔒', criticidade: 'Crítica' },
];

// Map legacy names to new NC codes
const NC_NAME_MAP: Record<string, string> = {
  'Postura e Ética Profissional': 'NC-1',
  'Acuracidade e Rigor Técnico': 'NC-2',
  'Conformidade de Registro e Rastreabilidade': 'NC-3',
  'Registro e Rastreabilidade': 'NC-3',
  'Integridade do Fluxo Operacional': 'NC-4',
  'Segurança da Informação': 'NC-5',
  'Fluxo': 'NC-4',
  'Técnico': 'NC-2',
  'Registro': 'NC-3',
};

function resolveNCType(tipo: string): string {
  if (NC_TYPES.find((t) => t.key === tipo)) return tipo;
  return NC_NAME_MAP[tipo] || tipo;
}

function formatPontosDeduzidos(pts?: number | null): string {
  if (pts == null || pts === 0) return '—';
  return `-${Math.abs(pts)}`;
}

function parseNcDescricaoMeta(descricao?: string): {
  descricao: string;
  severity?: string;
  impacto?: string;
} {
  if (!descricao) return { descricao: '' };
  let clean = descricao;
  let severity: string | undefined;
  let impacto: string | undefined;

  const sevMatch = clean.match(/(?:^|\n\n)Severidade:\s*(.+?)(?:\n\n|$)/i);
  if (sevMatch) {
    severity = sevMatch[1].trim();
    clean = clean.replace(/(?:^|\n\n)Severidade:\s*.+?(?:\n\n|$)/i, '\n').trim();
  }

  const impMatch = clean.match(/(?:^|\n\n)Impacto operacional:\s*([\s\S]+)$/i);
  if (impMatch) {
    impacto = impMatch[1].trim();
    clean = clean.replace(/(?:^|\n\n)Impacto operacional:\s*[\s\S]+$/i, '').trim();
  }

  return { descricao: clean || descricao, severity, impacto };
}

interface NCRecord {
  id: string;
  analista: string;
  squad: string;
  coordenador?: string;
  tipo_nc: string;
  descricao?: string;
  pontos_deduzidos?: number;
  protocolo_referencia?: string;
  periodo: string;
  status?: string;
}

interface NCDetailModal {
  nc: NCRecord;
  typeInfo: typeof NC_TYPES[0] | undefined;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

function NCDetailModal({ data, onClose }: { data: NCDetailModal; onClose: () => void }) {
  const { nc, typeInfo } = data;
  const meta = parseNcDescricaoMeta(nc.descricao);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `linear-gradient(135deg, ${typeInfo?.color || '#EF4444'}15, transparent)` }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: typeInfo?.color || '#EF4444' }}>{typeInfo?.fullName || nc.tipo_nc}</p>
            <h2 className="text-lg font-bold text-white">{nc.analista}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Squad', value: nc.squad },
              { label: 'Coordenador', value: nc.coordenador || '—' },
              { label: 'Período', value: nc.periodo },
              { label: 'Criticidade', value: typeInfo?.criticidade || '—' },
              { label: 'Pts Deduzidos', value: formatPontosDeduzidos(nc.pontos_deduzidos) },
              { label: 'Severidade', value: meta.severity || '—' },
              { label: 'Protocolo', value: nc.protocolo_referencia || '—' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs mb-1" style={{ color: '#64748B' }}>{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
          {meta.descricao && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>Descrição / Evidência</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{meta.descricao}</p>
            </div>
          )}
          {meta.impacto && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs mb-2 font-semibold" style={{ color: '#F59E0B' }}>Impacto Operacional</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{meta.impacto}</p>
            </div>
          )}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#F87171' }}>Recomendação</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Revisar protocolo de {typeInfo?.short || nc.tipo_nc}. Considerar vinculação a PDI para acompanhamento contínuo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function NCContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterReincidente, setFilterReincidente] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'charts'>('charts');
  const [detailModal, setDetailModal] = useState<NCDetailModal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NCRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, pList] = await Promise.all([fetchNCRecords(), fetchAllPeriodos()]);
      const mapped = (data as NCRecord[]).map((n) => ({ ...n, tipo_nc: resolveNCType(n.tipo_nc) }));
      setNcs(mapped);
      setPeriodos(pList);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDeleteNC = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { deleteNCRecord } = await import('@/lib/services/dataService');
      const result = await deleteNCRecord(deleteConfirm.id);
      if (result.success) {
        setNcs((prev) => prev.filter((n) => n.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  useEffect(() => { loadData(); }, []);

  const squads = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.squad).filter(Boolean)))], [ncs]);
  const analistas = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.analista).filter(Boolean))).sort()], [ncs]);
  const coordenadores = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.coordenador).filter(Boolean))).sort()], [ncs]);

  // Detect reincidentes: analistas with 2+ NCs of same type
  const reincidenteSet = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    ncs.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = {};
      map[n.analista][n.tipo_nc] = (map[n.analista][n.tipo_nc] || 0) + 1;
    });
    const set = new Set<string>();
    Object.entries(map).forEach(([analista, types]) => {
      if (Object.values(types).some((c) => c >= 2)) set.add(analista);
    });
    return set;
  }, [ncs]);

  const filtered = useMemo(() => {
    let list = ncs;
    if (filterPeriodo !== 'all') list = list.filter((n) => n.periodo === filterPeriodo);
    if (filterSquad !== 'all') list = list.filter((n) => n.squad === filterSquad);
    if (filterType !== 'all') list = list.filter((n) => n.tipo_nc === filterType);
    if (filterAnalista !== 'all') list = list.filter((n) => n.analista === filterAnalista);
    if (filterCoordenador !== 'all') list = list.filter((n) => n.coordenador === filterCoordenador);
    if (filterReincidente) list = list.filter((n) => reincidenteSet.has(n.analista));
    if (search) list = list.filter((n) => n.analista.toLowerCase().includes(search.toLowerCase()) || (n.descricao || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [ncs, filterSquad, filterType, filterPeriodo, filterAnalista, filterCoordenador, filterReincidente, search, reincidenteSet]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return map;
  }, [filtered]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number; reincidente: boolean }> = {};
    filtered.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = { name: n.analista, squad: n.squad, count: 0, reincidente: reincidenteSet.has(n.analista) };
      map[n.analista].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered, reincidenteSet]);

  const barChartData = useMemo(() => topAnalysts.slice(0, 10).map((a) => ({ name: a.name.split(' ')[0], fullName: a.name, ncs: a.count, squad: a.squad })), [topAnalysts]);

  const radarData = useMemo(() => NC_TYPES.map((t) => ({ pilar: t.short, count: byType[t.key] || 0, fullKey: t.fullName })), [byType]);

  const donutData = NC_TYPES.map((t) => ({ name: t.short, value: byType[t.key] || 0, color: t.color })).filter((d) => d.value > 0);

  const byPeriodData = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach((n) => { map[n.periodo] = (map[n.periodo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => ({ periodo, count }));
  }, [ncs]);

  const bySquadData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { map[n.squad] = (map[n.squad] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([squad, count]) => ({ squad: squad.length > 12 ? squad.slice(0, 12) + '…' : squad, count }));
  }, [filtered]);

  const reincidenciaData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = {};
      map[n.analista][n.tipo_nc] = (map[n.analista][n.tipo_nc] || 0) + 1;
    });
    return Object.entries(map)
      .map(([analista, types]) => ({ analista: analista.split(' ')[0], reincidencias: Object.values(types).filter((c) => c >= 2).length }))
      .filter((a) => a.reincidencias > 0)
      .sort((a, b) => b.reincidencias - a.reincidencias)
      .slice(0, 8);
  }, [filtered]);

  const flowStages = useMemo(() => {
    const total = filtered.length;
    return [
      { label: 'Identificadas', count: total, color: '#EF4444', pct: 100 },
      { label: 'Em Tratativa', count: Math.round(total * 0.7), color: '#F59E0B', pct: 70 },
      { label: 'Resolvidas', count: Math.round(total * 0.4), color: '#22C55E', pct: 40 },
      { label: 'Reincidentes', count: reincidenteSet.size, color: '#7C3AED', pct: total > 0 ? (reincidenteSet.size / total) * 100 : 0 },
    ];
  }, [filtered, reincidenteSet]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Não Conformidades</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Central de gestão e análise de NCs — nomenclatura padronizada</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
            Importar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total NCs', value: filtered.length, color: '#EF4444', icon: <AlertTriangle size={16} />, bg: 'rgba(239,68,68,0.08)' },
          { label: 'Analistas com NC', value: new Set(filtered.map((n) => n.analista)).size, color: '#F59E0B', icon: <BarChart2 size={16} />, bg: 'rgba(245,158,11,0.08)' },
          { label: 'Squads Afetados', value: new Set(filtered.map((n) => n.squad)).size, color: '#38BDF8', icon: <TrendingUp size={16} />, bg: 'rgba(56,189,248,0.08)' },
          { label: 'Reincidentes', value: reincidenteSet.size, color: '#7C3AED', icon: <Layers size={16} />, bg: 'rgba(124,58,237,0.08)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* NC Type Legend */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white mb-3">Nomenclatura Padronizada de NCs</p>
        <div className="flex flex-wrap gap-2">
          {NC_TYPES.map((t) => (
            <div key={t.key} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: `${t.color}10`, border: `1px solid ${t.color}25` }}>
              <span>{t.icon}</span>
              <span className="text-xs font-bold" style={{ color: t.color }}>{t.key}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{t.short}</span>
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${t.color}20`, color: t.color, fontSize: 9 }}>{t.criticidade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94A3B8' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar analista ou descrição..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Ciclos</option>
            {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
          </select>
          <select value={filterCoordenador} onChange={(e) => setFilterCoordenador(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos Coordenadores</option>
            {coordenadores.filter((c) => c !== 'all').map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterAnalista} onChange={(e) => setFilterAnalista(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Analistas</option>
            {analistas.filter((a) => a !== 'all').map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Tipos</option>
            {NC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.key} — {t.short}</option>)}
          </select>
          <button onClick={() => setFilterReincidente((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: filterReincidente ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: filterReincidente ? '#A78BFA' : '#94A3B8', border: `1px solid ${filterReincidente ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <Layers size={12} /> Reincidentes
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ id: 'charts', label: 'Painéis & Gráficos', icon: <BarChart2 size={13} /> }, { id: 'table', label: 'Tabela', icon: <Layers size={13} /> }].map((v) => (
          <button key={v.id} onClick={() => setActiveView(v.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: activeView === v.id ? '#1E40AF' : 'transparent', color: activeView === v.id ? '#fff' : '#94A3B8' }}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeView === 'charts' ? (
        <div className="space-y-6">
          {/* Row 1: Summary + Flow + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Panel */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield size={14} style={{ color: '#38BDF8' }} /> Painel por Tipo NC</h3>
              <div className="space-y-3">
                {NC_TYPES.map((t) => {
                  const count = byType[t.key] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  return (
                    <div key={t.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                          <span>{t.icon}</span>
                          <span className="font-semibold" style={{ color: t.color }}>{t.key}</span>
                          <span>{t.short}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{count}</span>
                          <span className="text-xs" style={{ color: '#64748B' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NC Flow */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Activity size={14} style={{ color: '#22C55E' }} /> Fluxo Corretivo</h3>
              <div className="space-y-3">
                {flowStages.map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: stage.color }}>{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{stage.label}</span>
                        <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, backgroundColor: stage.color }} />
                      </div>
                    </div>
                    {i < flowStages.length - 1 && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Ranking NCs por Analista</h3>
              <div className="space-y-2">
                {topAnalysts.slice(0, 6).map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 py-1.5 rounded-lg px-2" style={{ backgroundColor: i === 0 ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#EF4444' : '#94A3B8' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{a.name}</p>
                      <p className="text-xs" style={{ color: '#94A3B8', fontSize: '10px' }}>{a.squad}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.reincidente && <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA', fontSize: 9 }}>R</span>}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>{a.count}</span>
                    </div>
                  </div>
                ))}
                {topAnalysts.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado</p>}
              </div>
            </div>
          </div>

          {/* Row 2: Bar + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">NCs por Analista</h3>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ncs" name="NCs" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Radar por Tipo NC</h3>
              {radarData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="pilar" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                    <Radar name="NCs" dataKey="count" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>
          </div>

          {/* Row 3: Donut + Squad + Reincidência */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut */}
            <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Distribuição por Tipo</h3>
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-bold text-white">{filtered.length}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Total</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1 mt-2">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs flex-1 truncate" style={{ color: '#94A3B8' }}>{d.name}</span>
                    <span className="text-xs font-bold text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NCs by Squad */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">NCs por Squad</h3>
              {bySquadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bySquadData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="NCs" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>

            {/* Reincidência */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Analytics de Reincidência</h3>
              {reincidenciaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reincidenciaData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="analista" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="reincidencias" name="Reincidências" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem reincidências</p></div>}
            </div>
          </div>

          {/* Row 4: Trend */}
          {byPeriodData.length > 1 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Tendência de NCs por Ciclo</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={byPeriodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="ncGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="NCs" stroke="#EF4444" fill="url(#ncGrad)" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-y-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0" style={{ backgroundColor: '#0F1B31' }}>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Analista', 'Squad', 'Tipo NC', 'Descrição', 'Período', 'Pts Ded.', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((nc) => {
                  const typeInfo = NC_TYPES.find((t) => t.key === nc.tipo_nc);
                  const meta = parseNcDescricaoMeta(nc.descricao);
                  return (
                    <tr key={nc.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-2.5 font-medium text-white">
                        <div className="flex items-center gap-1.5">
                          {reincidenteSet.has(nc.analista) && <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA', fontSize: 9 }}>R</span>}
                          {nc.analista}
                        </div>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: '#94A3B8' }}>{nc.squad}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${typeInfo?.color || '#64748B'}15`, color: typeInfo?.color || '#64748B' }}>
                          {typeInfo?.icon} {typeInfo?.fullName || nc.tipo_nc}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        <p className="truncate">{meta.descricao || '—'}</p>
                        {meta.severity && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#A78BFA' }}>Sev: {meta.severity}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: '#94A3B8' }}>{nc.periodo}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: nc.pontos_deduzidos ? '#EF4444' : '#94A3B8' }}>
                        {formatPontosDeduzidos(nc.pontos_deduzidos)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailModal({ nc, typeInfo })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#64748B' }}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(nc)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: '#64748B' }} title="Excluir NC">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#94A3B8' }}>Nenhuma NC encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 100 && (
            <div className="px-4 py-2 text-xs text-center" style={{ color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              Exibindo 100 de {filtered.length} registros
            </div>
          )}
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      {detailModal && <NCDetailModal data={detailModal} onClose={() => setDetailModal(null)} />}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
                  <Trash2 size={15} style={{ color: '#EF4444' }} />
                </div>
                <h2 className="text-sm font-bold text-white">Excluir NC</h2>
              </div>
              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#94A3B8' }}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Tem certeza que deseja excluir a NC de <span className="font-semibold text-white">{deleteConfirm.analista}</span>?
              </p>
              <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Tipo: <span className="text-white">{deleteConfirm.tipo_nc}</span></p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Período: <span className="text-white">{deleteConfirm.periodo}</span></p>
                {deleteConfirm.protocolo_referencia && (
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Protocolo: <span className="text-white">{deleteConfirm.protocolo_referencia}</span></p>
                )}
              </div>
              <p className="text-xs" style={{ color: '#EF4444' }}>Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
                <button onClick={handleDeleteNC} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: deleting ? 'rgba(239,68,68,0.4)' : '#EF4444', color: '#fff' }}>
                  {deleting ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NaoConformidadesPage() {
  return (
    <EnterpriseLayout>
      <NCContent />
    </EnterpriseLayout>
  );
}
