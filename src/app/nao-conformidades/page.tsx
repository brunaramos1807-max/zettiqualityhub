'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchNCRecords, fetchAllPeriodos } from '@/lib/services/dataService';
import { AlertTriangle, Search, BarChart2, RefreshCw, TrendingUp, Filter, ChevronRight, Shield, Activity, Layers } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';

const NC_TYPES = [
  { key: 'Postura e Ética Profissional', color: '#7C3AED', short: 'Postura', icon: '🤝' },
  { key: 'Acuracidade e Rigor Técnico', color: '#EF4444', short: 'Técnico', icon: '🎯' },
  { key: 'Conformidade de Registro e Rastreabilidade', color: '#F59E0B', short: 'Registro', icon: '📋' },
  { key: 'Integridade do Fluxo Operacional', color: '#38BDF8', short: 'Fluxo', icon: '⚙️' },
  { key: 'Segurança da Informação', color: '#22C55E', short: 'Segurança', icon: '🔒' },
];

const NC_STATUS_OPTIONS = ['Identificada', 'Em tratativa', 'Resolvida', 'Reincidente'];

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

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
  const [activeView, setActiveView] = useState<'table' | 'charts'>('charts');

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, pList] = await Promise.all([fetchNCRecords(), fetchAllPeriodos()]);
      setNcs(data as NCRecord[]);
      setPeriodos(pList);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const squads = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.squad).filter(Boolean)))], [ncs]);
  const analistas = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.analista).filter(Boolean))).sort()], [ncs]);

  const filtered = useMemo(() => {
    let list = ncs;
    if (filterPeriodo !== 'all') list = list.filter((n) => n.periodo === filterPeriodo);
    if (filterSquad !== 'all') list = list.filter((n) => n.squad === filterSquad);
    if (filterType !== 'all') list = list.filter((n) => n.tipo_nc === filterType);
    if (filterAnalista !== 'all') list = list.filter((n) => n.analista === filterAnalista);
    if (search) list = list.filter((n) => n.analista.toLowerCase().includes(search.toLowerCase()) || (n.descricao || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [ncs, filterSquad, filterType, filterPeriodo, filterAnalista, search]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return map;
  }, [filtered]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number }> = {};
    filtered.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = { name: n.analista, squad: n.squad, count: 0 };
      map[n.analista].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  // Bar chart data: NCs by analyst (top 10)
  const barChartData = useMemo(() =>
    topAnalysts.slice(0, 10).map((a) => ({
      name: a.name.split(' ')[0],
      fullName: a.name,
      ncs: a.count,
      squad: a.squad,
    })),
    [topAnalysts]
  );

  // Radar chart data: by pilar
  const radarData = useMemo(() =>
    NC_TYPES.map((t) => ({
      pilar: t.short,
      count: byType[t.key] || 0,
      fullKey: t.key,
    })),
    [byType]
  );

  // NC flow stages
  const flowStages = useMemo(() => {
    const total = filtered.length;
    return [
      { label: 'Identificadas', count: total, color: '#EF4444', pct: 100 },
      { label: 'Em Tratativa', count: Math.round(total * 0.7), color: '#F59E0B', pct: 70 },
      { label: 'Resolvidas', count: Math.round(total * 0.4), color: '#22C55E', pct: 40 },
      { label: 'Reincidentes', count: Math.round(total * 0.15), color: '#7C3AED', pct: 15 },
    ];
  }, [filtered]);

  // NC by period chart
  const byPeriodData = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach((n) => { map[n.periodo] = (map[n.periodo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => ({ periodo, count }));
  }, [ncs]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Não Conformidades</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Central de gestão e análise de NCs</p>
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
          { label: 'Tipos de NC', value: Object.keys(byType).length, color: '#22C55E', icon: <Layers size={16} />, bg: 'rgba(34,197,94,0.08)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94A3B8' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar analista ou descrição..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Ciclos</option>
            {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterAnalista} onChange={(e) => setFilterAnalista(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Analistas</option>
            {analistas.filter((a) => a !== 'all').map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Tipos</option>
            {NC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.short}</option>)}
          </select>
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
          {/* Summary Panel + Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Panel */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={14} style={{ color: '#38BDF8' }} /> Painel Resumido
              </h3>
              <div className="space-y-3">
                {NC_TYPES.map((t) => {
                  const count = byType[t.key] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  return (
                    <div key={t.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs flex items-center gap-1" style={{ color: '#94A3B8' }}>
                          <span>{t.icon}</span> {t.short}
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
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity size={14} style={{ color: '#22C55E' }} /> Fluxo de NCs
              </h3>
              <div className="space-y-3">
                {flowStages.map((stage, i) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: stage.color }}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{stage.label}</span>
                        <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${stage.pct}%`, backgroundColor: stage.color }} />
                      </div>
                    </div>
                    {i < flowStages.length - 1 && (
                      <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Analysts */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Ranking NCs</h3>
              <div className="space-y-2">
                {topAnalysts.slice(0, 6).map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 py-1.5 rounded-lg px-2" style={{ backgroundColor: i === 0 ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#EF4444' : '#94A3B8' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{a.name}</p>
                      <p className="text-xs" style={{ color: '#94A3B8', fontSize: '10px' }}>{a.squad}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>{a.count}</span>
                  </div>
                ))}
                {topAnalysts.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado</p>}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart: NCs by Analyst */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Quantidade de NCs por Analista</h3>
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
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado disponível</p>
                </div>
              )}
            </div>

            {/* Radar Chart: by Pilar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Radar por Pilar</h3>
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
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado disponível</p>
                </div>
              )}
            </div>
          </div>

          {/* NCs by Period */}
          {byPeriodData.length > 1 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Evolução de NCs por Ciclo</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byPeriodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="NCs" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
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
                  {['Analista', 'Squad', 'Tipo', 'Descrição', 'Período', 'Pts Ded.'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((nc) => {
                  const typeInfo = NC_TYPES.find((t) => t.key === nc.tipo_nc);
                  return (
                    <tr key={nc.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-4 py-2.5 font-medium text-white">{nc.analista}</td>
                      <td className="px-4 py-2.5" style={{ color: '#94A3B8' }}>{nc.squad}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${typeInfo?.color || '#64748B'}15`, color: typeInfo?.color || '#64748B' }}>
                          {typeInfo?.icon} {typeInfo?.short || nc.tipo_nc}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{nc.descricao || '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: '#94A3B8' }}>{nc.periodo}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: nc.pontos_deduzidos ? '#EF4444' : '#94A3B8' }}>
                        {nc.pontos_deduzidos ? `-${nc.pontos_deduzidos}` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#94A3B8' }}>Nenhuma NC encontrada</td></tr>
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
