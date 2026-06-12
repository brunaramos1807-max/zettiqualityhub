'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

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
import { getActiveCycle } from '@/lib/services/supabaseDataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';
import { Activity, AlertTriangle, Users, TrendingUp, RefreshCw, BarChart2, ChevronUp, ChevronDown, X, BookOpen, Star, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DailyPoint {
  day: string;
  qa: number;
  ncs: number;
}

// ─── Analyst Detail Modal ─────────────────────────────────────────────────────
function AnalystDetailModal({ analyst, periodo, onClose }: { analyst: RealAnalyst; periodo: string; onClose: () => void }) {
  const [ncs, setNcs] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any>(null);
  const [pdi, setPdi] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;

        const [allNCs, allElogios, allScores, feedbackRes, pdiRes] = await Promise.all([
          fetchNCRecords(),
          fetchElogios(),
          fetchCycleScores(),
          supabase.from('feedbacks').select('*').ilike('analista_id', `%${analyst.name}%`).order('created_at', { ascending: false }).limit(1),
          supabase.from('pdi_records').select('*').ilike('analista', `%${analyst.name}%`).order('created_at', { ascending: false }).limit(1),
        ]);

        const analystNCs = (allNCs as any[]).filter((n: any) =>
          (n.analista || '').toLowerCase().includes(analyst.name.toLowerCase()) ||
          analyst.name.toLowerCase().includes((n.analista || '').toLowerCase().split(' ')[0])
        );
        const analystElogios = (allElogios as any[]).filter((e: any) =>
          (e.colaborador || '').toLowerCase().includes(analyst.name.toLowerCase()) ||
          analyst.name.toLowerCase().includes((e.colaborador || '').toLowerCase().split(' ')[0])
        );
        const analystHistory = (allScores as any[])
          .filter((s: any) =>
            (s.analista || '').toLowerCase().includes(analyst.name.toLowerCase()) ||
            analyst.name.toLowerCase().includes((s.analista || '').toLowerCase().split(' ')[0])
          )
          .sort((a: any, b: any) => (a.periodo || '').localeCompare(b.periodo || ''));

        setNcs(analystNCs);
        setElogios(analystElogios);
        setHistory(analystHistory);
        setFeedback(feedbackRes.data?.[0] || null);
        setPdi(pdiRes.data?.[0] || null);
      } catch (e) {
        console.error('Analyst detail load error:', e);
      }
      setLoading(false);
    };
    load();
  }, [analyst.name]);

  const getScoreColor = (s: number) => s >= 90 ? '#22C55E' : s >= 75 ? '#84CC16' : s >= 60 ? '#EAB308' : '#EF4444';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">{analyst.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>{analyst.squad} · Ciclo {periodo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'QA', value: analyst.qaScore.toFixed(1) + '%', color: getScoreColor(analyst.qaScore) },
              { label: 'IEPC', value: analyst.iepcScore.toFixed(1) + '%', color: getScoreColor(analyst.iepcScore) },
              { label: 'NCs', value: String(analyst.ncs), color: analyst.ncs > 0 ? '#EF4444' : '#22C55E' },
              { label: 'Elogios', value: String(elogios.filter(e => e.periodo === periodo).length), color: '#F59E0B' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>{kpi.label}</p>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* NCs do ciclo */}
              {ncs.filter(n => n.periodo === periodo).length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                    <span className="text-xs font-bold text-white">Não Conformidades — {periodo}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                      {ncs.filter(n => n.periodo === periodo).length}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {ncs.filter(n => n.periodo === periodo).map((nc: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', flexShrink: 0 }}>{nc.tipo_nc}</span>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{nc.descricao || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Elogios do ciclo */}
              {elogios.filter(e => e.periodo === periodo).length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Star size={13} style={{ color: '#F59E0B' }} />
                    <span className="text-xs font-bold text-white">Elogios — {periodo}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {elogios.filter(e => e.periodo === periodo).map((el: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{el.elogio}</p>
                        {el.cliente && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Cliente: {el.cliente}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <BookOpen size={13} style={{ color: '#38BDF8' }} />
                    <span className="text-xs font-bold text-white">Feedback</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8' }}>{feedback.status || 'gerado'}</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>QA</p>
                        <p className="text-lg font-bold" style={{ color: getScoreColor(feedback.qa_score || 0) }}>{(feedback.qa_score || 0).toFixed(1)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>IEPC</p>
                        <p className="text-lg font-bold" style={{ color: getScoreColor(feedback.iepc_score || 0) }}>{(feedback.iepc_score || 0).toFixed(1)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>Ciclo</p>
                        <p className="text-sm font-bold text-white">{feedback.ciclo || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PDI */}
              {pdi && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Shield size={13} style={{ color: '#A78BFA' }} />
                    <span className="text-xs font-bold text-white">PDI Ativo</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}>{pdi.status_pdi || 'em andamento'}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{pdi.objetivo || pdi.metas?.[0]?.descricao || 'PDI em andamento'}</p>
                    {pdi.prazo && <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Prazo: {pdi.prazo}</p>}
                  </div>
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs font-bold text-white">Histórico de Ciclos</span>
                  </div>
                  <div className="p-4">
                    {history.length > 1 && (
                      <div className="h-32 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history.map(s => ({ periodo: s.periodo, qa: s.nota_final_qa || 0, iepc: s.iepc_total || 0 }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                            <Line type="monotone" dataKey="qa" name="QA" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 2 }} />
                            <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {['Ciclo', 'QA', 'IEPC', 'NCs'].map(h => (
                            <th key={h} className="text-left py-2 px-2 font-semibold" style={{ color: '#94A3B8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((s: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="py-2 px-2 font-medium" style={{ color: s.periodo === periodo ? '#38BDF8' : '#fff' }}>{s.periodo}</td>
                            <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.nota_final_qa || 0) }}>{(s.nota_final_qa || 0).toFixed(1)}</td>
                            <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.iepc_total || 0) }}>{(s.iepc_total || 0).toFixed(1)}</td>
                            <td className="py-2 px-2" style={{ color: (s.total_ncs || 0) > 0 ? '#EF4444' : '#94A3B8' }}>{s.total_ncs || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
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
  const [allPeriodos, setAllPeriodos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [activeCycleDefault, setActiveCycleDefault] = useState<string>('');
  const [noOpenCycle, setNoOpenCycle] = useState(false);
  const [selectedAnalyst, setSelectedAnalyst] = useState<RealAnalyst | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedPeriodoRef = useRef<string>('');

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral';

  const loadData = useCallback(async (overridePeriodo?: string) => {
    setLoading(true);
    const [scores, periodos, allNCs, allElogios, savedActiveCycle] = await Promise.all([
      fetchCycleScores(),
      fetchAllPeriodos(),
      fetchNCRecords(),
      fetchElogios(),
      getActiveCycle(),
    ]);

    const activeCycleFromSettings = savedActiveCycle || '';
    setActiveCycleDefault(activeCycleFromSettings);

    // If no active/open cycle is set, show empty state
    if (!activeCycleFromSettings && !overridePeriodo) {
      setNoOpenCycle(true);
      setAllPeriodos(periodos);
      setLoading(false);
      return;
    }
    setNoOpenCycle(false);

    const allPeriodsWithActive = activeCycleFromSettings && !periodos.includes(activeCycleFromSettings)
      ? [activeCycleFromSettings, ...periodos]
      : periodos;

    if (allPeriodsWithActive.length === 0) {
      setLoading(false);
      return;
    }

    setAllPeriodos(allPeriodsWithActive);

    // Default to the OPEN/active cycle — never default to a closed cycle
    const currentSelected = selectedPeriodoRef.current;
    const current = overridePeriodo
      ? overridePeriodo
      : (currentSelected && allPeriodsWithActive.includes(currentSelected))
        ? currentSelected
        : activeCycleFromSettings || allPeriodsWithActive[0];

    const currentIdx = allPeriodsWithActive.indexOf(current);
    const lastClosed = currentIdx < allPeriodsWithActive.length - 1 ? allPeriodsWithActive[currentIdx + 1] : '';

    setCurrentPeriodo(current);
    setLastPeriodo(lastClosed);
    if (!currentSelected) {
      setSelectedPeriodo(current);
      selectedPeriodoRef.current = current;
    }

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

    const handleImport = () => loadData();
    const handleCycleChange = () => {
      selectedPeriodoRef.current = '';
      setSelectedPeriodo('');
      loadData();
    };
    window.addEventListener('zetti_import_done', handleImport);
    window.addEventListener('zetti_active_cycle_changed', handleCycleChange);

    pollingRef.current = setInterval(() => {
      loadData();
    }, 30000);

    return () => {
      window.removeEventListener('zetti_import_done', handleImport);
      window.removeEventListener('zetti_active_cycle_changed', handleCycleChange);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadData]);

  const handlePeriodoChange = (periodo: string) => {
    setSelectedPeriodo(periodo);
    selectedPeriodoRef.current = periodo;
    setNoOpenCycle(false);
    loadData(periodo);
  };

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

  const sortedByQA = [...analysts].sort((a, b) => b.qaScore - a.qaScore);
  const topAnalysts = sortedByQA.slice(0, 5);
  const criticalAnalysts = sortedByQA.filter(a => a.qaScore < 70).slice(0, 5);

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
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h1 className="text-xl font-bold text-white">Ciclo Atual</h1>
              {currentPeriodo && !noOpenCycle && (
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                  {currentPeriodo}
                </span>
              )}
              {currentPeriodo === activeCycleDefault && !noOpenCycle && (
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                  ● Ciclo Aberto
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acompanhamento operacional em tempo real
              {lastPeriodo && !noOpenCycle && ` · Comparativo com ${lastPeriodo}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {allPeriodos.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Ver ciclo:</label>
                <select
                  value={selectedPeriodo || currentPeriodo}
                  onChange={(e) => handlePeriodoChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {allPeriodos.map((p) => (
                    <option key={p} value={p}>
                      {p}{p === activeCycleDefault ? ' ★ Aberto' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button onClick={() => loadData(selectedPeriodo || undefined)} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : noOpenCycle ? (
          /* ── NO OPEN CYCLE STATE ── */
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Activity size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <p className="text-lg font-semibold text-white mb-2">Nenhum ciclo aberto</p>
            <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Não há ciclo ativo no momento. Configure um ciclo aberto em Configurações ou Ciclos.
            </p>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Ciclos fechados não aparecem como ciclo atual.
            </p>
            {allPeriodos.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Visualizar ciclo fechado:</span>
                <select
                  onChange={(e) => e.target.value && handlePeriodoChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <option value="">Selecionar...</option>
                  {allPeriodos.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : analysts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Activity size={48} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-lg font-semibold text-white mb-2">Nenhum dado para o ciclo {currentPeriodo || 'selecionado'}</p>
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

            {/* Squad + NC Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Tipos de NC Mais Frequentes</h3>
                {ncTypeData.length > 0 ? (
                  <div className="space-y-3">
                    {ncTypeData.map((nc, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white truncate">{nc.tipo}</p>
                          <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${(nc.count / ncs.length) * 100}%`, backgroundColor: '#EF4444' }} />
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

            {/* Top + Critical Analysts — clickable */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} style={{ color: '#22C55E' }} />
                  <h3 className="text-sm font-semibold text-white">Analistas Destaque</h3>
                  <span className="text-xs" style={{ color: '#64748B' }}>· clique para detalhes</span>
                </div>
                <div className="space-y-2">
                  {topAnalysts.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 py-2 cursor-pointer rounded-lg px-2 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onClick={() => setSelectedAnalyst(a)}>
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
                  <span className="text-xs" style={{ color: '#64748B' }}>· QA &lt; 70%</span>
                </div>
                <div className="space-y-2">
                  {criticalAnalysts.length > 0 ? criticalAnalysts.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-2 cursor-pointer rounded-lg px-2 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onClick={() => setSelectedAnalyst(a)}>
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
                    <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhum analista crítico identificado ✓</p>
                  )}
                </div>
              </div>
            </div>

            {/* Full analyst table */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Ranking do Ciclo — {currentPeriodo}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Analista', 'Squad', 'QA', 'IEPC', 'NCs', 'Elogios', ''].map((h) => (
                        <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedByQA.map((a, i) => {
                      const analystElogios = elogios.filter((e) => e.colaborador === a.name).length;
                      return (
                        <tr key={a.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onClick={() => setSelectedAnalyst(a)}>
                          <td className="py-2 pr-4" style={{ color: 'rgba(255,255,255,0.3)' }}>{i + 1}</td>
                          <td className="py-2 pr-4 font-medium text-white">{a.name}</td>
                          <td className="py-2 pr-4" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.squad}</td>
                          <td className="py-2 pr-4 font-semibold" style={{ color: a.qaScore >= 85 ? '#22C55E' : a.qaScore >= 70 ? '#F59E0B' : '#EF4444' }}>{a.qaScore.toFixed(1)}%</td>
                          <td className="py-2 pr-4 font-semibold" style={{ color: a.iepcScore >= 85 ? '#22C55E' : a.iepcScore >= 70 ? '#F59E0B' : '#EF4444' }}>{a.iepcScore.toFixed(1)}%</td>
                          <td className="py-2 pr-4" style={{ color: a.ncs > 0 ? '#EF4444' : 'rgba(255,255,255,0.4)' }}>{a.ncs}</td>
                          <td className="py-2 pr-4" style={{ color: analystElogios > 0 ? '#F59E0B' : 'rgba(255,255,255,0.3)' }}>{analystElogios}</td>
                          <td className="py-2 pr-4 text-xs" style={{ color: '#38BDF8' }}>→</td>
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
      {selectedAnalyst && (
        <AnalystDetailModal analyst={selectedAnalyst} periodo={currentPeriodo} onClose={() => setSelectedAnalyst(null)} />
      )}
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
