'use client';
import React, { useEffect, useState, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchElogios, toggleElogioDestaque } from '@/lib/services/dataService';
import { Award, Search, Users, TrendingUp, RefreshCw, Filter, Star, CheckCircle, BarChart2, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const SQUAD_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899'];
function getSquadColor(squad: string, index: number): string {
  return SQUAD_PALETTE[index % SQUAD_PALETTE.length];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#F59E0B' }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

function ReconhecimentoContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [elogios, setElogios] = useState<ElogioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterDestaque, setFilterDestaque] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'lista'>('overview');

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
    if (search) list = list.filter((e) =>
      e.colaborador.toLowerCase().includes(search.toLowerCase()) ||
      e.elogio.toLowerCase().includes(search.toLowerCase())
    );
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
    const squadsArr: string[] = [];
    filtered.forEach((e) => {
      if (!map[e.squad]) squadsArr.push(e.squad);
      map[e.squad] = (map[e.squad] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([squad, count], i) => ({
      squad: squad.length > 14 ? squad.slice(0, 14) + '…' : squad,
      count,
      fill: SQUAD_PALETTE[i % SQUAD_PALETTE.length],
    }));
  }, [filtered]);

  const byPeriodData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { if (e.periodo) map[e.periodo] = (map[e.periodo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => ({ periodo, count }));
  }, [filtered]);

  const destaqueMes = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number }> = {};
    filtered.forEach((e) => {
      if (!map[e.colaborador]) map[e.colaborador] = { name: e.colaborador, squad: e.squad, count: 0 };
      map[e.colaborador].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count)[0];
  }, [filtered]);

  const squadDestaque = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.squad] = (map[e.squad] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { squad: sorted[0][0], count: sorted[0][1] } : null;
  }, [filtered]);

  const handleToggleDestaque = async (elogio: ElogioItem) => {
    setTogglingId(elogio.id);
    try {
      const newDestaque = !elogio.destaque;
      await toggleElogioDestaque(elogio.id, newDestaque);
      setElogios((prev) => prev.map((e) => e.id === elogio.id ? { ...e, destaque: newDestaque } : e));
      toast.success(newDestaque ? 'Marcado como destaque' : 'Destaque removido');
    } catch { toast.error('Erro ao atualizar'); }
    setTogglingId(null);
  };

  const cardBase: React.CSSProperties = {
    backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '0.75rem',
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award size={20} style={{ color: '#F59E0B' }} />
            <h1 className="text-xl font-bold text-white">Central de Reconhecimento</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748B' }}>
            Boas práticas, comportamentos referência e evolução positiva da operação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#64748B', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          { label: 'Total de Reconhecimentos', value: filtered.length, icon: <Award size={15} />, color: '#F59E0B' },
          { label: 'Destaques do Ciclo', value: filtered.filter((e) => e.destaque).length, icon: <Star size={15} />, color: '#3B82F6' },
          { label: 'Colaboradores Reconhecidos', value: new Set(filtered.map((e) => e.colaborador)).size, icon: <Users size={15} />, color: '#22C55E' },
          { label: 'Squads com Reconhecimento', value: new Set(filtered.map((e) => e.squad)).size, icon: <TrendingUp size={15} />, color: '#8B5CF6' },
        ].map((s) => (
          <div key={s.label} style={cardBase} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>{s.label}</span>
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: `${s.color}14`, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Highlights Row */}
      {(destaqueMes || squadDestaque) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {destaqueMes && (
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1E3A5F' }}>
                {getInitials(destaqueMes.name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Star size={12} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>Colaborador Destaque</span>
                </div>
                <p className="text-base font-bold text-white">{destaqueMes.name}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{destaqueMes.squad} · {destaqueMes.count} reconhecimento{destaqueMes.count !== 1 ? 's' : ''}</p>
              </div>
              <Award size={28} style={{ color: 'rgba(245,158,11,0.25)' }} />
            </div>
          )}
          {squadDestaque && (
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                <Users size={20} style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUp size={12} style={{ color: '#22C55E' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22C55E' }}>Squad Destaque</span>
                </div>
                <p className="text-base font-bold text-white">{squadDestaque.squad}</p>
                <p className="text-xs" style={{ color: '#64748B' }}>{squadDestaque.count} reconhecimento{squadDestaque.count !== 1 ? 's' : ''} no período</p>
              </div>
              <CheckCircle size={28} style={{ color: 'rgba(34,197,94,0.25)' }} />
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 mb-6" style={cardBase}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={12} style={{ color: '#64748B' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador ou reconhecimento..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
          </div>
          <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {periodos.map((p) => <option key={p} value={p}>{p === 'all' ? 'Todos os Ciclos' : p}</option>)}
          </select>
          <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
          </select>
          <select value={filterAnalista} onChange={(e) => setFilterAnalista(e.target.value)} className="px-3 py-2 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <option value="all">Todos os Colaboradores</option>
            {analistas.filter((a) => a !== 'all').map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setFilterDestaque((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: filterDestaque ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', color: filterDestaque ? '#F59E0B' : '#64748B', border: `1px solid ${filterDestaque ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
            <Star size={11} /> Destaques
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit mb-6" style={cardBase}>
        {[{ id: 'overview', label: 'Visão Geral', icon: <BarChart2 size={12} /> }, { id: 'lista', label: 'Lista', icon: <Award size={12} /> }].map((v) => (
          <button key={v.id} onClick={() => setActiveView(v.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-all"
            style={{ backgroundColor: activeView === v.id ? '#1E40AF' : 'transparent', color: activeView === v.id ? '#fff' : '#64748B' }}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeView === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking */}
            <div style={cardBase} className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Award size={14} style={{ color: '#F59E0B' }} /> Top Colaboradores
              </h3>
              {topAnalysts.length > 0 ? (
                <div className="space-y-2">
                  {topAnalysts.slice(0, 6).map((a, i) => (
                    <div key={a.name} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? '#F59E0B' : '#475569' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1E3A5F' }}>
                        {getInitials(a.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{a.name}</p>
                        <p className="text-[10px]" style={{ color: '#475569' }}>{a.squad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{a.count}</p>
                        {a.destaques > 0 && <p className="text-[10px]" style={{ color: '#F59E0B' }}>{a.destaques} destaque{a.destaques !== 1 ? 's' : ''}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: '#475569' }}>Nenhum dado disponível</p>
              )}
            </div>

            {/* Por Squad */}
            <div style={cardBase} className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users size={14} style={{ color: '#22C55E' }} /> Reconhecimentos por Squad
              </h3>
              {bySquadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySquadData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="squad" tick={{ fill: '#94A3B8', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Reconhecimentos" radius={[0, 4, 4, 0]}>
                      {bySquadData.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-center py-8" style={{ color: '#475569' }}>Nenhum dado disponível</p>
              )}
            </div>
          </div>

          {/* Evolução por Período */}
          {byPeriodData.length > 1 && (
            <div style={cardBase} className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={14} style={{ color: '#3B82F6' }} /> Evolução de Reconhecimentos por Ciclo
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={byPeriodData}>
                  <defs>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Reconhecimentos" stroke="#F59E0B" strokeWidth={2} fill="url(#recGrad)" dot={{ fill: '#F59E0B', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : (
        /* Lista */
        <div style={cardBase} className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Award size={32} className="mx-auto mb-3" style={{ color: '#1E293B' }} />
              <p className="text-sm font-medium" style={{ color: '#475569' }}>Nenhum reconhecimento encontrado</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {filtered.map((e) => (
                <div key={e.id} className="flex items-start gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#1E3A5F' }}>
                    {getInitials(e.colaborador)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{e.colaborador}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>{e.squad}</span>
                      {e.periodo && <span className="text-xs" style={{ color: '#475569' }}>{e.periodo}</span>}
                      {e.destaque && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                          Destaque
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{e.elogio}</p>
                    {e.protocolo && <p className="text-xs mt-1" style={{ color: '#475569' }}>Protocolo: {e.protocolo}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleDestaque(e)}
                    disabled={togglingId === e.id}
                    className="p-1.5 rounded-md transition-all flex-shrink-0"
                    style={{ color: e.destaque ? '#F59E0B' : '#334155' }}
                    title={e.destaque ? 'Remover destaque' : 'Marcar como destaque'}
                  >
                    <Star size={14} fill={e.destaque ? '#F59E0B' : 'none'} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function ReconhecimentoPage() {
  return (
    <EnterpriseLayout>
      <ReconhecimentoContent />
    </EnterpriseLayout>
  );
}
