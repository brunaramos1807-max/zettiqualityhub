'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, fetchNCRecords, fetchElogios, buildAnalystsFromScores } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Lock, Unlock, BarChart2, Users, ChevronRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { useChat } from '@/lib/hooks/useChat';

interface CycleSummary {
  periodo: string;
  analistas: number;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  isClosed: boolean;
  cycleId?: string;
}

function CiclosContent() {
  const { session } = useSystemAuth();
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const { response: aiResponse, isLoading: aiLoading, sendMessage } = useChat('GEMINI', 'gemini/gemini-2.5-flash', false);
  const [pendingAiPeriodo, setPendingAiPeriodo] = useState<string | null>(null);

  const canClose = session?.permissoes?.acesso_total || session?.cargo === 'Administrador';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scores, periodos, ncs, elogios] = await Promise.all([
        fetchCycleScores(),
        fetchAllPeriodos(),
        fetchNCRecords(),
        fetchElogios(),
      ]);

      const supabase = createClient();
      let closedPeriodos: Set<string> = new Set();
      if (supabase) {
        const { data } = await supabase.from('import_cycles').select('periodo, is_closed').eq('is_closed', true);
        if (data) data.forEach((d: any) => closedPeriodos.add(d.periodo));
      }

      const summaries: CycleSummary[] = periodos.map((periodo) => {
        const pScores = scores.filter((s: any) => s.periodo === periodo);
        const pNCs = ncs.filter((n: any) => n.periodo === periodo);
        const pElogios = elogios.filter((e: any) => e.periodo === periodo);
        const analysts = buildAnalystsFromScores(pScores);
        const qa = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.qaScore, 0) / analysts.length : 0;
        const iepc = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.iepcScore, 0) / analysts.length : 0;
        return {
          periodo,
          analistas: analysts.length,
          qa: parseFloat(qa.toFixed(2)),
          iepc: parseFloat(iepc.toFixed(2)),
          ncs: pNCs.length,
          elogios: pElogios.length,
          isClosed: closedPeriodos.has(periodo),
        };
      });

      setCycles([...summaries].reverse());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (aiResponse && pendingAiPeriodo) {
      setAiSummary((prev) => ({ ...prev, [pendingAiPeriodo]: aiResponse }));
    }
  }, [aiResponse, pendingAiPeriodo]);

  const handleCloseCycle = async (periodo: string) => {
    if (!canClose) return;
    setClosingId(periodo);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('import_cycles').update({ is_closed: true, closed_at: new Date().toISOString() }).eq('periodo', periodo);
      }
      await loadData();
    } catch { /* ignore */ }
    setClosingId(null);
  };

  const handleGenerateSummary = (cycle: CycleSummary) => {
    setPendingAiPeriodo(cycle.periodo);
    const prompt = `Gere um resumo executivo em 2 frases do ciclo ${cycle.periodo}: QA ${cycle.qa.toFixed(1)}%, IEPC ${cycle.iepc.toFixed(1)}%, ${cycle.ncs} NCs, ${cycle.elogios} elogios, ${cycle.analistas} analistas. Seja objetivo e destaque o ponto mais crítico.`;
    sendMessage([{ role: 'user', content: prompt }], { temperature: 0.5, max_tokens: 150 });
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ciclos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Gestão e acompanhamento de ciclos operacionais</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Ciclos', value: cycles.length, color: '#38BDF8', icon: <Activity size={16} /> },
          { label: 'Ciclos Fechados', value: cycles.filter((c) => c.isClosed).length, color: '#22C55E', icon: <Lock size={16} /> },
          { label: 'Ciclos Abertos', value: cycles.filter((c) => !c.isClosed).length, color: '#F59E0B', icon: <Unlock size={16} /> },
          { label: 'Total Analistas', value: cycles.reduce((s, c) => s + c.analistas, 0), color: '#06B6D4', icon: <Users size={16} /> },
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

      {/* Cycles List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-16">
          <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum ciclo encontrado. Importe dados para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <div key={cycle.periodo} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: `1px solid ${cycle.isClosed ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{cycle.periodo}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: cycle.isClosed ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: cycle.isClosed ? '#22C55E' : '#F59E0B' }}>
                        {cycle.isClosed ? <><Lock size={10} className="mr-1" />Fechado</> : <><Unlock size={10} className="mr-1" />Aberto</>}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{cycle.analistas} analistas avaliados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!cycle.isClosed && canClose && (
                    <button
                      onClick={() => handleCloseCycle(cycle.periodo)}
                      disabled={closingId === cycle.periodo}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                    >
                      {closingId === cycle.periodo ? <RefreshCw size={11} className="animate-spin" /> : <Lock size={11} />}
                      Fechar Ciclo
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerateSummary(cycle)}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
                  >
                    <Activity size={11} />
                    IA
                  </button>
                  <Link href={`/cycle-dashboard?periodo=${encodeURIComponent(cycle.periodo)}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }}>
                    Detalhes <ChevronRight size={11} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'QA Médio', value: `${cycle.qa.toFixed(1)}%`, color: cycle.qa >= 85 ? '#22C55E' : cycle.qa >= 70 ? '#F59E0B' : '#EF4444' },
                  { label: 'IEPC Médio', value: `${cycle.iepc.toFixed(1)}%`, color: cycle.iepc >= 85 ? '#22C55E' : cycle.iepc >= 70 ? '#F59E0B' : '#EF4444' },
                  { label: 'NCs', value: cycle.ncs, color: cycle.ncs > 10 ? '#EF4444' : '#94A3B8' },
                  { label: 'Elogios', value: cycle.elogios, color: '#F59E0B' },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{m.label}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>

              {aiSummary[cycle.periodo] && (
                <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                  <p className="text-xs" style={{ color: '#94A3B8' }}><span style={{ color: '#38BDF8' }}>IA:</span> {aiSummary[cycle.periodo]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CiclosPage() {
  return (
    <EnterpriseLayout>
      <CiclosContent />
    </EnterpriseLayout>
  );
}
