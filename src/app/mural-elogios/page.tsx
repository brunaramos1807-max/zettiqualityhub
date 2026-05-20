'use client';
import React, { useEffect, useState, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchElogios, toggleElogioDestaque } from '@/lib/services/dataService';
import { Star, Search, Award, Users, Heart, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ElogioItem {
  id: string;
  colaborador: string;
  squad: string;
  cliente?: string;
  protocolo?: string;
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

function MuralContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [elogios, setElogios] = useState<ElogioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('all');
  const [filterDestaque, setFilterDestaque] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let list = elogios;
    if (filterDestaque) list = list.filter((e) => e.destaque);
    if (filterSquad !== 'all') list = list.filter((e) => e.squad === filterSquad);
    if (filterPeriodo !== 'all') list = list.filter((e) => e.periodo === filterPeriodo);
    if (search) list = list.filter((e) => e.colaborador.toLowerCase().includes(search.toLowerCase()) || e.elogio.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [elogios, filterDestaque, filterSquad, filterPeriodo, search]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number }> = {};
    elogios.forEach((e) => {
      if (!map[e.colaborador]) map[e.colaborador] = { name: e.colaborador, squad: e.squad, count: 0 };
      map[e.colaborador].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [elogios]);

  const handleToggleDestaque = async (elogio: ElogioItem) => {
    setTogglingId(elogio.id);
    try {
      const newDestaque = !elogio.destaque;
      await toggleElogioDestaque(elogio.id, newDestaque);
      // Optimistic update
      setElogios((prev) => prev.map((e) => e.id === elogio.id ? { ...e, destaque: newDestaque } : e));
      toast.success(newDestaque ? 'Elogio marcado como destaque' : 'Destaque removido');
    } catch { toast.error('Erro ao atualizar destaque'); }
    setTogglingId(null);
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Mural de Elogios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Reconhecimentos e destaques da operação</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Elogios', value: elogios.length, icon: <Heart size={16} />, color: '#F59E0B' },
          { label: 'Destaques', value: elogios.filter((e) => e.destaque).length, icon: <Star size={16} />, color: '#38BDF8' },
          { label: 'Analistas Reconhecidos', value: new Set(elogios.map((e) => e.colaborador)).size, icon: <Users size={16} />, color: '#22C55E' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Top Analysts */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={14} style={{ color: '#F59E0B' }} /> Top Analistas
          </h3>
          <div className="space-y-3">
            {topAnalysts.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)' }}>#{i + 1}</span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: getSquadColor(a.squad) }}>
                  {getInitials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{a.name}</p>
                  <p className="text-xs" style={{ color: '#94A3B8', fontSize: '10px' }}>{a.squad}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: '#F59E0B' }}>{a.count}</span>
              </div>
            ))}
            {topAnalysts.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado disponível</p>}
          </div>
        </div>

        {/* Elogios Grid */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar analista ou elogio..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm text-white outline-none"
                style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {periodos.map((p) => <option key={p} value={p}>{p === 'all' ? 'Todos os Ciclos' : p}</option>)}
            </select>
            <select
              value={filterSquad}
              onChange={(e) => setFilterSquad(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
            </select>
            <button
              onClick={() => setFilterDestaque((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: filterDestaque ? 'rgba(245,158,11,0.15)' : '#0F1B31',
                color: filterDestaque ? '#F59E0B' : '#94A3B8',
                border: `1px solid ${filterDestaque ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <Star size={12} /> Destaques
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((elogio) => (
                <div
                  key={elogio.id}
                  className="rounded-xl p-5 transition-all"
                  style={{
                    backgroundColor: elogio.destaque ? 'rgba(245,158,11,0.08)' : '#0F1B31',
                    border: `1px solid ${elogio.destaque ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: elogio.destaque
                      ? '0 4px 16px rgba(245,158,11,0.12), 0 1px 4px rgba(0,0,0,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: getSquadColor(elogio.squad), boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
                      >
                        {getInitials(elogio.colaborador)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{elogio.colaborador}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${getSquadColor(elogio.squad)}20`, color: getSquadColor(elogio.squad) }}>{elogio.squad}</span>
                          {elogio.periodo && <span className="text-xs" style={{ color: '#64748B' }}>{elogio.periodo}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleDestaque(elogio)}
                      disabled={togglingId === elogio.id}
                      title={elogio.destaque ? 'Remover destaque' : 'Marcar como destaque'}
                      className="p-1.5 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                      style={{
                        color: elogio.destaque ? '#F59E0B' : 'rgba(255,255,255,0.25)',
                        backgroundColor: elogio.destaque ? 'rgba(245,158,11,0.12)' : 'transparent',
                      }}
                    >
                      <Star size={15} fill={elogio.destaque ? '#F59E0B' : 'none'} />
                    </button>
                  </div>

                  <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.75)' }}>"{elogio.elogio}"</p>
                  </div>

                  {(elogio.cliente || elogio.protocolo) && (
                    <div className="flex items-center gap-3 flex-wrap">
                      {elogio.cliente && (
                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                          <span style={{ color: '#64748B' }}>Cliente:</span> {elogio.cliente}
                        </p>
                      )}
                      {elogio.protocolo && (
                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                          <span style={{ color: '#64748B' }}>Protocolo:</span> {elogio.protocolo}
                        </p>
                      )}
                    </div>
                  )}

                  {elogio.destaque && (
                    <div className="mt-2 flex items-center gap-1">
                      <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                      <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>Destaque</span>
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 text-center py-12">
                  <Heart size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum elogio encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
