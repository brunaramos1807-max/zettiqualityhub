'use client';
import React, { useState, useEffect, useCallback } from 'react';


import ImportModal from '@/components/ImportModal';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  fetchCycleScores,
  fetchAllPeriodos,
  fetchNCRecords,
  fetchElogios,
  buildAnalystsFromScores,
  type RealAnalyst,
} from '@/lib/services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, Users, TrendingUp, RefreshCw, BarChart2, ChevronUp, ChevronDown } from 'lucide-react';

interface DailyPoint {
  day: string;
  qa: number;
  ncs: number;
}

function CicloAtualContent() {
  const [importOpen, setImportOpen] = useState(false);
  const { session } = useSystemAuth();
  const [loading, setLoading] = useState(true);
  const [analysts, setAnalysts] = useState<RealAnalyst[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [lastClosedAnalysts, setLastClosedAnalysts] = useState<RealAnalyst[]>([]);
  const [currentPeriodo, setCurrentPeriodo] = useState('');
  const [lastPeriodo, setLastPeriodo] = useState('');

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [scores, periodos, allNCs, allElogios] = await Promise.all([
      fetchCycleScores(),
      fetchAllPeriodos(),
      fetchNCRecords(),
      fetchElogios(),
    ]);

    if (periodos.length === 0) {
      setLoading(false);
      return;
    }

    // Current = latest period, last closed = second to last
    const current = periodos[periodos.length - 1];
    const lastClosed = periodos.length > 1 ? periodos[periodos.length - 2] : '';

    setCurrentPeriodo(current);
    setLastPeriodo(lastClosed);

    const currentScores = scores.filter((s: any) => s.periodo === current);
    const lastScores = lastClosed ? scores.filter((s: any) => s.periodo === lastClosed) : [];
    const currentNCs = allNCs.filter((n: any) => n.periodo === current);
    const currentElogios = allElogios.filter((e: any) => e.periodo === current);

    setAnalysts(buildAnalystsFromScores(currentScores));
    setLastClosedAnalysts(buildAnalystsFromScores(lastScores));
    setNcs(currentNCs);
    setElogios(currentElogios);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, [loadData]);

  const qaMedia = analysts.length > 0
    ? analysts.reduce((s, a) => s + a.qaScore, 0) / analysts.length
    : 0;
  const iepcMedia = analysts.length > 0
    ? analysts.reduce((s, a) => s + a.iepcScore, 0) / analysts.length
    : 0;

  const lastQaMedia = lastClosedAnalysts.length > 0
    ? lastClosedAnalysts.reduce((s, a) => s + a.qaScore, 0) / lastClosedAnalysts.length
    : 0;
  const lastIepcMedia = lastClosedAnalysts.length > 0
    ? lastClosedAnalysts.reduce((s, a) => s + a.iepcScore, 0) / lastClosedAnalysts.length
    : 0;

  const qaDiff = qaMedia - lastQaMedia;
  const iepcDiff = iepcMedia - lastIepcMedia;

  // Squad breakdown
  const squadMap: Record<string, { qa: number; iepc: number; count: number; ncs: number }> = {};
  analysts.forEach((a) => {
    if (!squadMap[a.squad]) squadMap[a.squad] = { qa: 0, iepc: 0, count: 0, ncs: 0 };
    squadMap[a.squad].qa += a.qaScore;
    squadMap[a.squad].iepc += a.iepcScore;
    squadMap[a.squad].count += 1;
    squadMap[a.squad].ncs += a.ncs;
  });
  const squadData = Object.entries(squadMap).map(([squad, d]) => ({
    squad: squad.length > 14 ? squad.substring(0, 14) + '…' : squad,
    qa: parseFloat((d.qa / d.count).toFixed(1)),
    iepc: parseFloat((d.iepc / d.count).toFixed(1)),
    ncs: d.ncs,
    count: d.count,
  }));

  // Top and critical analysts
  const sortedByQA = [...analysts].sort((a, b) => b.qaScore - a.qaScore);
  const topAnalysts = sortedByQA.slice(0, 5);
  const criticalAnalysts = sortedByQA.slice(-3).reverse();

  // NC types breakdown
  const ncTypes: Record<string, number> = {};
  ncs.forEach((nc) => {
    const tipo = nc.tipo_nc || 'Outros';
    ncTypes[tipo] = (ncTypes[tipo] || 0) + 1;
  });
  const ncTypeData = Object.entries(ncTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tipo, count]) => ({ tipo: tipo.length > 30 ? tipo.substring(0, 30) + '…' : tipo, count }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}{typeof p.value === 'number' && p.dataKey !== 'ncs' ? '%' : ''}</p>
        ))}
      </div>
    );
  };

  const DeltaBadge = ({ diff }: { diff: number }) => {
    if (Math.abs(diff) < 0.1) return <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>= estável</span>;
    return (
      <span className="flex items-center gap-0.5 text-xs" style={{ color: diff > 0 ? '#22C55E' : '#EF4444' }}>
        {diff > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs anterior
      </span>
    );
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h1 className="text-xl font-bold text-white">Ciclo Atual</h1>
              {currentPeriodo && (
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                  {currentPeriodo}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acompanhamento operacional em tempo real
              {lastPeriodo && ` · Comparativo com ${lastPeriodo}`}
            </p>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : analysts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Activity size={48} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-lg font-semibold text-white mb-2">Nenhum dado do ciclo atual</p>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Importe dados para acompanhar o ciclo em andamento</p>
            {canImport && (
              <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
                Importar dados
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'QA Parcial', value: `${qaMedia.toFixed(1)}%`, diff: qaDiff, color: '#3B82F6', icon: <BarChart2 size={16} /> },
                { label: 'IEPC Parcial', value: `${iepcMedia.toFixed(1)}%`, diff: iepcDiff, color: '#8B5CF6', icon: <Activity size={16} /> },
                { label: 'NCs Identificadas', value: String(ncs.length), diff: null, color: '#EF4444', icon: <AlertTriangle size={16} /> },
                { label: 'Analistas Avaliados', value: String(analysts.length), diff: null, color: '#10B981', icon: <Users size={16} /> },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{kpi.label}</span>
                    <span style={{ color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
                  {kpi.diff !== null && <DeltaBadge diff={kpi.diff} />}
                </div>
              ))}
            </div>

            {/* Squad + Analysts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Squad chart */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Performance por Squad</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={squadData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={85} stroke="rgba(34,197,94,0.3)" strokeDasharray="4 4" />
                    <Bar dataKey="qa" name="QA" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="iepc" name="IEPC" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* NC Types */}
              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Tipos de NC Mais Frequentes</h3>
                {ncTypeData.length > 0 ? (
                  <div className="space-y-3">
                    {ncTypeData.map((nc, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{nc.tipo}</p>
                          <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(nc.count / ncs.length) * 100}%`,
                                backgroundColor: '#EF4444',
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#EF4444' }}>{nc.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma NC registrada neste ciclo</p>
                )}
              </div>
            </div>

            {/* Top + Critical Analysts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} style={{ color: '#22C55E' }} />
                  <h3 className="text-sm font-semibold text-white">Analistas Destaque</h3>
                </div>
                <div className="space-y-2">
                  {topAnalysts.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span className="text-xs font-bold w-5 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{a.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.squad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: '#22C55E' }}>{a.qaScore.toFixed(1)}%</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>IEPC {a.iepcScore.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                  <h3 className="text-sm font-semibold text-white">Analistas Críticos</h3>
                </div>
                <div className="space-y-2">
                  {criticalAnalysts.length > 0 ? criticalAnalysts.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{a.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.squad}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>{a.qaScore.toFixed(1)}%</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{a.ncs} NCs</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum analista crítico identificado</p>
                  )}
                </div>
              </div>
            </div>

            {/* Full analyst table */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Ranking do Ciclo Atual — {currentPeriodo}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Analista', 'Squad', 'QA', 'IEPC', 'NCs', 'Elogios'].map((h) => (
                        <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByQA.map((a, i) => {
                      const analystElogios = elogios.filter((e) => e.colaborador === a.name).length;
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="py-2 pr-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</td>
                          <td className="py-2 pr-4 font-medium text-white">{a.name}</td>
                          <td className="py-2 pr-4" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.squad}</td>
                          <td className="py-2 pr-4 font-semibold" style={{ color: a.qaScore >= 85 ? '#22C55E' : a.qaScore >= 70 ? '#F59E0B' : '#EF4444' }}>{a.qaScore.toFixed(1)}%</td>
                          <td className="py-2 pr-4 font-semibold" style={{ color: a.iepcScore >= 85 ? '#22C55E' : a.iepcScore >= 70 ? '#F59E0B' : '#EF4444' }}>{a.iepcScore.toFixed(1)}%</td>
                          <td className="py-2 pr-4" style={{ color: a.ncs > 0 ? '#EF4444' : 'rgba(255,255,255,0.4)' }}>{a.ncs}</td>
                          <td className="py-2 pr-4" style={{ color: analystElogios > 0 ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}>{analystElogios}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      {canImport && <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}
    </div>
  );
}

export default function CicloAtualPage() {
  return (
    <EnterpriseLayout>
      <CicloAtualContent />
    </EnterpriseLayout>
  );
}
