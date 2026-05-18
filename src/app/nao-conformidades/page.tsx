'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchNCRecords } from '@/lib/services/dataService';
import { AlertTriangle, Search, BarChart2, RefreshCw, TrendingUp } from 'lucide-react';

const NC_TYPES = [
  { key: 'Postura e Ética Profissional', color: '#7C3AED', short: 'Postura' },
  { key: 'Acuracidade e Rigor Técnico', color: '#EF4444', short: 'Técnico' },
  { key: 'Conformidade de Registro e Rastreabilidade', color: '#F59E0B', short: 'Registro' },
  { key: 'Integridade do Fluxo Operacional', color: '#38BDF8', short: 'Fluxo' },
  { key: 'Segurança da Informação', color: '#22C55E', short: 'Segurança' },
];

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
}

function NCContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchNCRecords();
      setNcs(data as NCRecord[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const squads = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.squad).filter(Boolean)))], [ncs]);

  const filtered = useMemo(() => {
    let list = ncs;
    if (filterSquad !== 'all') list = list.filter((n) => n.squad === filterSquad);
    if (filterType !== 'all') list = list.filter((n) => n.tipo_nc === filterType);
    if (search) list = list.filter((n) => n.analista.toLowerCase().includes(search.toLowerCase()) || (n.descricao || '').toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [ncs, filterSquad, filterType, search]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return map;
  }, [ncs]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; count: number }> = {};
    ncs.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = { name: n.analista, squad: n.squad, count: 0 };
      map[n.analista].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [ncs]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
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
          { label: 'Total NCs', value: ncs.length, color: '#EF4444', icon: <AlertTriangle size={16} /> },
          { label: 'Analistas com NC', value: new Set(ncs.map((n) => n.analista)).size, color: '#F59E0B', icon: <BarChart2 size={16} /> },
          { label: 'Squads Afetados', value: new Set(ncs.map((n) => n.squad)).size, color: '#38BDF8', icon: <TrendingUp size={16} /> },
          { label: 'Tipos de NC', value: Object.keys(byType).length, color: '#22C55E', icon: <AlertTriangle size={16} /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* By Type */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Por Categoria</h3>
          <div className="space-y-3">
            {NC_TYPES.map((t) => {
              const count = byType[t.key] || 0;
              const pct = ncs.length > 0 ? Math.round((count / ncs.length) * 100) : 0;
              return (
                <div key={t.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{t.short}</span>
                    <span className="text-xs font-medium text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Analysts */}
        <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white mb-4">Ranking NCs</h3>
          <div className="space-y-3">
            {topAnalysts.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#EF4444' : '#94A3B8' }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{a.name}</p>
                  <p className="text-xs" style={{ color: '#94A3B8', fontSize: '10px' }}>{a.squad}</p>
                </div>
                <span className="text-xs font-bold" style={{ color: '#EF4444' }}>{a.count}</span>
              </div>
            ))}
            {topAnalysts.length === 0 && <p className="text-xs" style={{ color: '#94A3B8' }}>Nenhum dado</p>}
          </div>
        </div>

        {/* NC Table */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-4 flex flex-wrap gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="relative flex-1 min-w-40">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos' : s}</option>)}
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="all">Todos os tipos</option>
              {NC_TYPES.map((t) => <option key={t.key} value={t.key}>{t.short}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ backgroundColor: '#0F1B31' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Analista', 'Squad', 'Tipo', 'Período'].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((nc) => {
                    const typeInfo = NC_TYPES.find((t) => t.key === nc.tipo_nc);
                    return (
                      <tr key={nc.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="px-4 py-2 font-medium text-white">{nc.analista}</td>
                        <td className="px-4 py-2" style={{ color: '#94A3B8' }}>{nc.squad}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${typeInfo?.color || '#64748B'}15`, color: typeInfo?.color || '#64748B' }}>
                            {typeInfo?.short || nc.tipo_nc}
                          </span>
                        </td>
                        <td className="px-4 py-2" style={{ color: '#94A3B8' }}>{nc.periodo}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#94A3B8' }}>Nenhuma NC encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
