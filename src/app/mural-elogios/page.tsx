'use client';
import React, { useEffect, useState, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchElogios, toggleElogioDestaque } from '@/lib/services/dataService';
import { Star, Search, Award, Users, Heart, RefreshCw, TrendingUp, BarChart2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,  } from 'recharts';

interface ElogioItem {
  id: string;
  colaborador: string;
  squad: string;
  cliente?: string;
  protocolo?: string;
  atendimento?: string;
  elogio: string;
  destaque: boolean;
  periodo?: string;
}

const SQUAD_COLORS: Record<string, string> = {
  PDV: '#1E40AF',
  'PDV N1': '#3B82F6',
  'Compras e Estoque': '#16A34A',
  'Financeiro Fiscal': '#D97706',
};

function getSquadColor(squad: string): string {
  return SQUAD_COLORS[squad] || '#64748B';
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#F59E0B' }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

function MuralContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [elogios, setElogios] = useState<ElogioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterDestaque, setFilterDestaque] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'mural' | 'charts'>('charts');

  // Medal config for top 3
  const MEDALS = ['🥇', '🥈', '🥉'];

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchElogios();
      setElogios(data as ElogioItem[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const squads = useMemo(() => ['all', ...Array.from(new Set(elogios.map((e) => e.squad).filter(Boolean)))], [elogios]);
  const periodos = useMemo(() => ['all', ...Array.from(new Set(elogios.map((e) => e.periodo).filter(Boolean))).sort().reverse()], [elogios]);
  const analistas = useMemo(() => ['all', ...Array.from(new Set(elogios.map((e) => e.colaborador).filter(Boolean))).sort()], [elogios]);

  const filtered = useMemo(() => {
    let list = elogios;
    if (filterDestaque) list = list.filter((e) => e.destaque);
    if (filterSquad !== 'all') list = list.filter((e) => e.squad === filterSquad);
    if (filterPeriodo !== 'all') list = list.filter((e) => e.periodo === filterPeriodo);
    if (filterAnalista !== 'all') list = list.filter((e) => e.colaborador === filterAnalista);
    if (search) list = list.filter((e) => e.colaborador.toLowerCase().includes(search.toLowerCase()) || e.elogio.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [elogios, filterDestaque, filterSquad, filterPeriodo, filterAnalista, search]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number; destaques: number }> = {};
    filtered.forEach((e) => {
      if (!map[e.colaborador]) map[e.colaborador] = { name: e.colaborador, squad: e.squad, count: 0, destaques: 0 };
      map[e.colaborador].count++;
      if (e.destaque) map[e.colaborador].destaques++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  const bySquadData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.squad] = (map[e.squad] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([squad, count]) => ({ squad: squad.length > 12 ? squad.slice(0, 12) + '…' : squad, count }));
  }, [filtered]);

  const byPeriodData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { if (e.periodo) map[e.periodo] = (map[e.periodo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => ({ periodo, count }));
  }, [filtered]);

  const rankingBarData = useMemo(() => topAnalysts.slice(0, 8).map((a) => ({ name: a.name.split(' ')[0], elogios: a.count, destaques: a.destaques })), [topAnalysts]);

  const donutData = useMemo(() => {
    const destaques = filtered.filter((e) => e.destaque).length;
    return [
      { name: 'Destaques', value: destaques, color: '#F59E0B' },
      { name: 'Regulares', value: filtered.length - destaques, color: '#38BDF8' },
    ].filter((d) => d.value > 0);
  }, [filtered]);

  const handleToggleDestaque = async (elogio: ElogioItem) => {
    setTogglingId(elogio.id);
    try {
      const newDestaque = !elogio.destaque;
      await toggleElogioDestaque(elogio.id, newDestaque);
      setElogios((prev) => prev.map((e) => e.id === elogio.id ? { ...e, destaque: newDestaque } : e));
      toast.success(newDestaque ? 'Elogio marcado como destaque' : 'Destaque removido');
    } catch { toast.error('Erro ao atualizar destaque'); }
    setTogglingId(null);
  };

  const destaqueMes = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number }> = {};
    filtered.forEach((e) => {
      if (!map[e.colaborador]) map[e.colaborador] = { name: e.colaborador, squad: e.squad, count: 0 };
      map[e.colaborador].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count)[0];
  }, [filtered]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Elogios & Reconhecimentos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Analytics de reconhecimento e performance positiva</p>
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
          { label: 'Total Elogios', value: filtered.length, icon: <Heart size={16} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Destaques', value: filtered.filter((e) => e.destaque).length, icon: <Star size={16} />, color: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
          { label: 'Analistas Reconhecidos', value: new Set(filtered.map((e) => e.colaborador)).size, icon: <Users size={16} />, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Squads Ativos', value: new Set(filtered.map((e) => e.squad)).size, icon: <TrendingUp size={16} />, color: '#818CF8', bg: 'rgba(129,140,248,0.08)' },
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

      {/* Destaque do Mês */}
      {destaqueMes && (
        <div className="rounded-xl p-5 mb-6 flex items-center gap-5" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 4px 20px rgba(245,158,11,0.08)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ backgroundColor: getSquadColor(destaqueMes.squad), boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
            {getInitials(destaqueMes.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Star size={14} fill="#F59E0B" style={{ color: '#F59E0B' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Destaque do Ciclo</span>
            </div>
            <p className="text-lg font-bold text-white">{destaqueMes.name}</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>{destaqueMes.squad} · {destaqueMes.count} elogio{destaqueMes.count !== 1 ? 's' : ''}</p>
          </div>
          <Award size={32} style={{ color: 'rgba(245,158,11,0.3)' }} />
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94A3B8' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar analista ou elogio..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {periodos.map((p) => <option key={p} value={p}>{p === 'all' ? 'Todos os Ciclos' : p}</option>)}
          </select>
          <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
          </select>
          <select value={filterAnalista} onChange={(e) => setFilterAnalista(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="all">Todos os Analistas</option>
            {analistas.filter((a) => a !== 'all').map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setFilterDestaque((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: filterDestaque ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', color: filterDestaque ? '#F59E0B' : '#94A3B8', border: `1px solid ${filterDestaque ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <Star size={12} /> Destaques
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[{ id: 'charts', label: 'Analytics', icon: <BarChart2 size={13} /> }, { id: 'mural', label: 'Mural', icon: <Heart size={13} /> }].map((v) => (
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
          {/* Row 1: Ranking + Squad + Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ranking Bar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Award size={14} style={{ color: '#F59E0B' }} /> Ranking Elogios</h3>
              {rankingBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rankingBarData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="elogios" name="Elogios" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="destaques" name="Destaques" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>

            {/* By Squad */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users size={14} style={{ color: '#38BDF8' }} /> Elogios por Squad</h3>
              {bySquadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bySquadData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Elogios" fill="#22C55E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>

            {/* Donut */}
            <div className="rounded-xl p-5 flex flex-col" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Distribuição Reconhecimento</h3>
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
                    <p className="text-xl font-bold text-white">{elogios.length}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Total</p>
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

          {/* Row 2: Top Performers + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Star size={14} style={{ color: '#F59E0B' }} /> Top Performers</h3>
              <div className="space-y-2">
                {topAnalysts.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 py-2 px-2 rounded-lg" style={{ backgroundColor: i === 0 ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#475569' }}>#{i + 1}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getSquadColor(a.squad) }}>
                      {getInitials(a.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                      <p className="text-xs" style={{ color: '#64748B', fontSize: 10 }}>{a.squad}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.destaques > 0 && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontSize: 9 }}>⭐ {a.destaques}</span>}
                      <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{a.count}</span>
                    </div>
                  </div>
                ))}
                {topAnalysts.length === 0 && <p className="text-xs text-center py-4" style={{ color: '#64748B' }}>Sem dados</p>}
              </div>
            </div>

            {/* Trend */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp size={14} style={{ color: '#22C55E' }} /> Evolução Mensal</h3>
              {byPeriodData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={byPeriodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="elogioGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name="Elogios" stroke="#F59E0B" fill="url(#elogioGrad)" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Dados insuficientes para tendência</p></div>}
            </div>
          </div>
        </div>
      ) : (
        /* Mural View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Top Analysts Sidebar */}
          <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Award size={14} style={{ color: '#F59E0B' }} /> Ranking Analistas
            </h3>
            <div className="space-y-3">
              {topAnalysts.map((a, i) => (
                <div key={a.name} className="flex items-center gap-3 p-2 rounded-xl transition-all"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(245,158,11,0.08)' : i === 1 ? 'rgba(148,163,184,0.05)' : i === 2 ? 'rgba(205,127,50,0.05)' : 'transparent',
                    border: i < 3 ? `1px solid ${i === 0 ? 'rgba(245,158,11,0.2)' : i === 1 ? 'rgba(148,163,184,0.15)' : 'rgba(205,127,50,0.15)'}` : '1px solid transparent',
                  }}>
                  <span className="text-base w-6 text-center flex-shrink-0">{i < 3 ? MEDALS[i] : `#${i + 1}`}</span>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getSquadColor(a.squad) }}>
                    {getInitials(a.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                    <p className="text-xs" style={{ color: '#94A3B8', fontSize: '10px' }}>{a.squad}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-bold" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : '#64748B' }}>{a.count}</span>
                    {a.destaques > 0 && <span className="text-xs" style={{ color: '#F59E0B', fontSize: '9px' }}>⭐ {a.destaques}</span>}
                  </div>
                </div>
              ))}
              {topAnalysts.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado disponível</p>}
            </div>
          </div>

          {/* Elogios Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((elogio) => (
                  <div key={elogio.id}
                    className="rounded-2xl p-5 transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: elogio.destaque ? 'rgba(245,158,11,0.06)' : '#0F1B31',
                      border: `1px solid ${elogio.destaque ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: elogio.destaque ? '0 8px 32px rgba(245,158,11,0.12), 0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${getSquadColor(elogio.squad)}, ${getSquadColor(elogio.squad)}80)`,
                              boxShadow: `0 4px 12px ${getSquadColor(elogio.squad)}40`,
                            }}>
                            {getInitials(elogio.colaborador)}
                          </div>
                          {elogio.destaque && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                              style={{ backgroundColor: '#F59E0B', boxShadow: '0 2px 6px rgba(245,158,11,0.5)' }}>
                              ⭐
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{elogio.colaborador}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${getSquadColor(elogio.squad)}20`, color: getSquadColor(elogio.squad), border: `1px solid ${getSquadColor(elogio.squad)}30` }}>{elogio.squad}</span>
                            {elogio.periodo && <span className="text-xs font-mono" style={{ color: '#64748B' }}>{elogio.periodo}</span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleToggleDestaque(elogio)} disabled={togglingId === elogio.id}
                        title={elogio.destaque ? 'Remover destaque' : 'Marcar como destaque'}
                        className="p-1.5 rounded-xl transition-all hover:scale-110 disabled:opacity-50"
                        style={{ color: elogio.destaque ? '#F59E0B' : 'rgba(255,255,255,0.2)', backgroundColor: elogio.destaque ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${elogio.destaque ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                        <Star size={14} fill={elogio.destaque ? '#F59E0B' : 'none'} />
                      </button>
                    </div>

                    {/* Quote */}
                    <div className="rounded-xl p-3.5 mb-3 relative" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="absolute top-2 left-3 text-2xl leading-none" style={{ color: 'rgba(255,255,255,0.08)', fontFamily: 'Georgia, serif' }}>"</span>
                      <p className="text-sm leading-relaxed pl-4" style={{ color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>{elogio.elogio}</p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {elogio.cliente && (
                        <p className="text-xs flex items-center gap-1" style={{ color: '#64748B' }}>
                          <span style={{ color: '#475569' }}>Cliente:</span> <span style={{ color: '#94A3B8' }}>{elogio.cliente}</span>
                        </p>
                      )}
                      {elogio.protocolo && (
                        <p className="text-xs flex items-center gap-1" style={{ color: '#64748B' }}>
                          <span style={{ color: '#475569' }}>Protocolo:</span> <span className="font-mono" style={{ color: '#94A3B8' }}>{elogio.protocolo}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-2 text-center py-16">
                    <Heart size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.08)' }} />
                    <p className="text-sm font-medium text-white mb-1">Nenhum elogio encontrado</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>Ajuste os filtros ou importe dados de elogios</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function MuralElogiosPage() {
  return (
    <EnterpriseLayout>
      <MuralContent />
    </EnterpriseLayout>
  );
}
