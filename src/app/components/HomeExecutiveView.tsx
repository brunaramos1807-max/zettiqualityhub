'use client';
import React, { useState, useEffect, useCallback } from 'react';
import ImportModal from '@/components/ImportModal';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import {
  fetchCycleScores,
  fetchAllPeriodos,
  fetchNCRecords,
  fetchElogios,
  buildAnalystsFromScores,
} from '@/lib/services/dataService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Star, Users, BarChart2, Activity, RefreshCw, ChevronRight, Sparkles, Lock, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useChat } from '@/lib/hooks/useChat';
import { createClient } from '@/lib/supabase/client';

interface PeriodSummary {
  periodo: string;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  analistas: number;
  squads: Record<string, { qa: number; iepc: number; count: number }>;
}

interface StrategicInsight {
  type: 'positive' | 'negative' | 'neutral';
  text: string;
}

function calcTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const diff = last - prev;
  if (diff > 1) return 'up';
  if (diff < -1) return 'down';
  return 'stable';
}

function generateInsights(history: PeriodSummary[]): StrategicInsight[] {
  const insights: StrategicInsight[] = [];
  if (history.length < 2) return insights;
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const qaDiff = last.qa - prev.qa;
  const iepcDiff = last.iepc - prev.iepc;
  const ncDiff = last.ncs - prev.ncs;
  if (qaDiff > 2) insights.push({ type: 'positive', text: `QA médio subiu ${qaDiff.toFixed(1)}% em relação ao ciclo anterior` });
  if (qaDiff < -2) insights.push({ type: 'negative', text: `QA médio caiu ${Math.abs(qaDiff).toFixed(1)}% em relação ao ciclo anterior` });
  if (iepcDiff > 2) insights.push({ type: 'positive', text: `IEPC médio melhorou ${iepcDiff.toFixed(1)}% no último ciclo` });
  if (iepcDiff < -2) insights.push({ type: 'negative', text: `IEPC médio reduziu ${Math.abs(iepcDiff).toFixed(1)}% — atenção à experiência do cliente` });
  if (ncDiff < 0) insights.push({ type: 'positive', text: `Redução de ${Math.abs(ncDiff)} NCs em relação ao ciclo anterior` });
  if (ncDiff > 0) insights.push({ type: 'negative', text: `Aumento de ${ncDiff} NCs — reincidência requer atenção` });
  if (last.elogios > prev.elogios) insights.push({ type: 'positive', text: `Elogios aumentaram de ${prev.elogios} para ${last.elogios} no último ciclo` });
  Object.entries(last.squads).forEach(([squad, data]) => {
    const prevSquad = prev.squads[squad];
    if (prevSquad) {
      const diff = data.qa - prevSquad.qa;
      if (diff > 3) insights.push({ type: 'positive', text: `Squad ${squad} apresentou melhora de ${diff.toFixed(1)}% no QA` });
      if (diff < -3) insights.push({ type: 'negative', text: `Squad ${squad} apresentou queda de ${Math.abs(diff).toFixed(1)}% no QA` });
    }
  });
  return insights.slice(0, 6);
}

interface CloseCycleModalProps {
  periodo: string;
  summary: PeriodSummary;
  onClose: () => void;
  onConfirm: (aiSummary: string) => Promise<void>;
}

function CloseCycleModal({ periodo, summary, onClose, onConfirm }: CloseCycleModalProps) {
  const [step, setStep] = useState<'confirm' | 'generating' | 'done'>('confirm');
  const [aiSummary, setAiSummary] = useState('');
  const [closing, setClosing] = useState(false);
  const { response, isLoading, sendMessage } = useChat('GEMINI', 'gemini/gemini-2.5-flash', false);

  useEffect(() => {
    if (response && !isLoading && step === 'generating') {
      setAiSummary(response);
      setStep('done');
    }
  }, [response, isLoading, step]);

  const handleGenerate = () => {
    setStep('generating');
    const squadLines = Object.entries(summary.squads)
      .map(([sq, d]) => `  - ${sq}: QA ${d.qa.toFixed(1)}%, IEPC ${d.iepc.toFixed(1)}%, ${d.count} analistas`)
      .join('\n');
    const prompt = `Você é um gestor de qualidade sênior. Gere um FECHAMENTO OFICIAL do ciclo ${periodo} em português, com:
1. Resumo executivo (2 frases)
2. Destaques positivos (bullet points)
3. Pontos de atenção (bullet points)
4. PDIs recomendados para analistas com QA abaixo de 80%
5. Próximos passos para o ciclo seguinte

Dados do ciclo:
- QA Médio: ${summary.qa.toFixed(1)}%
- IEPC Médio: ${summary.iepc.toFixed(1)}%
- Total NCs: ${summary.ncs}
- Total Elogios: ${summary.elogios}
- Analistas avaliados: ${summary.analistas}
- Performance por squad:
${squadLines}

Seja objetivo, profissional e orientado a ação.`;
    sendMessage([{ role: 'user', content: prompt }], { temperature: 0.6, max_tokens: 800 });
  };

  const handleConfirmClose = async () => {
    setClosing(true);
    await onConfirm(aiSummary);
    setClosing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
              <Lock size={14} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Fechar Ciclo — {periodo}</h3>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Esta ação congela os dados e gera snapshot permanente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X size={14} style={{ color: '#94A3B8' }} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {step === 'confirm' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'QA Médio', value: `${summary.qa.toFixed(1)}%`, color: summary.qa >= 85 ? '#22C55E' : '#F59E0B' },
                  { label: 'IEPC Médio', value: `${summary.iepc.toFixed(1)}%`, color: summary.iepc >= 85 ? '#22C55E' : '#F59E0B' },
                  { label: 'Analistas', value: String(summary.analistas), color: '#38BDF8' },
                  { label: 'NCs', value: String(summary.ncs), color: summary.ncs > 10 ? '#EF4444' : '#94A3B8' },
                  { label: 'Elogios', value: String(summary.elogios), color: '#F59E0B' },
                  { label: 'Squads', value: String(Object.keys(summary.squads).length), color: '#06B6D4' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: '#EF4444' }}>⚠️ Atenção</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Ao fechar o ciclo, os dados serão congelados e não poderão ser editados. Um snapshot será gerado automaticamente com resumo IA e PDIs recomendados.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
                <button onClick={handleGenerate} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <Sparkles size={14} />
                  Gerar Fechamento IA
                </button>
              </div>
            </>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-white mb-1">Gemini analisando ciclo...</p>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Gerando resumo executivo, PDIs e próximos passos</p>
            </div>
          )}

          {step === 'done' && (
            <>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} style={{ color: '#38BDF8' }} />
                  <span className="text-xs font-semibold" style={{ color: '#38BDF8' }}>Fechamento IA — Gemini</span>
                </div>
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>{aiSummary}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmClose}
                  disabled={closing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  {closing ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                  {closing ? 'Fechando...' : 'Confirmar Fechamento'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeExecutiveView() {
  const [importOpen, setImportOpen] = useState(false);
  const { session, userRole, userSquad, userSquads } = useSystemAuth();
  const [history, setHistory] = useState<PeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<'all' | '3m' | '6m'>('all');
  const [allPeriodos, setAllPeriodos] = useState<string[]>([]);
  const [aiInsight, setAiInsight] = useState('');
  const [consolidating, setConsolidating] = useState(false);
  const [consolidateResult, setConsolidateResult] = useState('');
  const [closeCycleOpen, setCloseCycleOpen] = useState(false);
  const [closeCycleSuccess, setCloseCycleSuccess] = useState(false);

  const { response: aiResponse, isLoading: aiChatLoading, sendMessage } = useChat('GEMINI', 'gemini/gemini-2.5-flash', false);
  const { response: consolidateResponse, isLoading: consolidateLoading, sendMessage: sendConsolidate } = useChat('GEMINI', 'gemini/gemini-2.5-flash', false);

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral' ||
    userRole === 'Admin' ||
    userRole === 'Auditor' ||
    userRole === 'Coordenador Geral';

  const canCloseCycle = userRole === 'Admin' || userRole === 'Auditor' || userRole === 'Coordenador Geral' ||
    session?.cargo === 'Administrador';

  // RBAC filter: Coordenador sees only their squad
  const filterByRole = useCallback((scores: any[]) => {
    if (userRole === 'Coordenador' && userSquad) {
      return scores.filter((s: any) => s.squad === userSquad);
    }
    if (userRole === 'Coordenador' && userSquads.length > 0) {
      return scores.filter((s: any) => userSquads.includes(s.squad));
    }
    return scores;
  }, [userRole, userSquad, userSquads]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [scores, periodos, ncs, elogios] = await Promise.all([
      fetchCycleScores(),
      fetchAllPeriodos(),
      fetchNCRecords(),
      fetchElogios(),
    ]);
    setAllPeriodos(periodos);

    const filteredScores = filterByRole(scores);
    const filteredNcs = filterByRole(ncs);
    const filteredElogios = filterByRole(elogios);

    const summaries: PeriodSummary[] = periodos.map((periodo) => {
      const pScores = filteredScores.filter((s: any) => s.periodo === periodo);
      const pNCs = filteredNcs.filter((n: any) => n.periodo === periodo);
      const pElogios = filteredElogios.filter((e: any) => e.periodo === periodo);
      const analysts = buildAnalystsFromScores(pScores);
      const qaMedia = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.qaScore, 0) / analysts.length : 0;
      const iepcMedia = analysts.length > 0 ? analysts.reduce((s: number, a: any) => s + a.iepcScore, 0) / analysts.length : 0;
      const squads: Record<string, { qa: number; iepc: number; count: number }> = {};
      analysts.forEach((a: any) => {
        if (!squads[a.squad]) squads[a.squad] = { qa: 0, iepc: 0, count: 0 };
        squads[a.squad].qa += a.qaScore;
        squads[a.squad].iepc += a.iepcScore;
        squads[a.squad].count += 1;
      });
      Object.keys(squads).forEach((sq) => {
        squads[sq].qa = squads[sq].qa / squads[sq].count;
        squads[sq].iepc = squads[sq].iepc / squads[sq].count;
      });
      return {
        periodo,
        qa: parseFloat(qaMedia.toFixed(2)),
        iepc: parseFloat(iepcMedia.toFixed(2)),
        ncs: pNCs.length,
        elogios: pElogios.length,
        analistas: analysts.length,
        squads,
      };
    });
    setHistory(summaries);
    setLoading(false);
  }, [filterByRole]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, [loadData]);

  useEffect(() => {
    if (aiResponse) setAiInsight(aiResponse);
  }, [aiResponse]);

  useEffect(() => {
    if (consolidateResponse && !consolidateLoading) {
      setConsolidateResult(consolidateResponse);
      setConsolidating(false);
    }
  }, [consolidateResponse, consolidateLoading]);

  const handleGenerateAiInsight = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    const prompt = `Você é um analista de qualidade operacional sênior. Analise estes dados do último ciclo e gere um insight executivo em 3 frases curtas em português:
- QA Médio: ${last.qa.toFixed(1)}%
- IEPC Médio: ${last.iepc.toFixed(1)}%
- Total NCs: ${last.ncs}
- Total Elogios: ${last.elogios}
- Analistas: ${last.analistas}
- Squads: ${Object.entries(last.squads).map(([s, d]) => `${s}: QA ${d.qa.toFixed(1)}%`).join(', ')}
Foque em riscos operacionais, destaques positivos e recomendações prioritárias.`;
    sendMessage([{ role: 'user', content: prompt }], { temperature: 0.7, max_tokens: 300 });
  };

  const handleConsolidateAnalytics = () => {
    if (history.length === 0) return;
    setConsolidating(true);
    setConsolidateResult('');
    const allData = history.map(h => `${h.periodo}: QA ${h.qa.toFixed(1)}%, IEPC ${h.iepc.toFixed(1)}%, NCs ${h.ncs}, Elogios ${h.elogios}, Analistas ${h.analistas}`).join('\n');
    const last = history[history.length - 1];
    const squadBreakdown = Object.entries(last.squads).map(([sq, d]) => `${sq}: QA ${d.qa.toFixed(1)}%, IEPC ${d.iepc.toFixed(1)}%`).join(' | ');
    const prompt = `Você é um diretor de qualidade corporativa. Consolide e analise TODOS os ciclos abaixo e gere um relatório executivo completo em português com:

1. **Tendência Geral** — evolução de QA e IEPC ao longo dos ciclos
2. **Performance por Squad** — ranking e análise comparativa
3. **Análise de Risco** — analistas e squads em zona crítica (QA < 80%)
4. **Reincidência de NCs** — padrões identificados
5. **Destaques Positivos** — top performers e melhores práticas
6. **Recomendações Estratégicas** — 5 ações prioritárias para o próximo ciclo
7. **Score de Saúde Operacional** — nota de 0 a 10 com justificativa

Histórico completo:
${allData}

Último ciclo por squad: ${squadBreakdown}

Seja analítico, preciso e orientado a dados.`;
    sendConsolidate([{ role: 'user', content: prompt }], { temperature: 0.5, max_tokens: 1200 });
  };

  const handleCloseCycle = async (aiSummary: string) => {
    const lastPeriodo = history[history.length - 1]?.periodo;
    if (!lastPeriodo) return;
    try {
      const supabase = createClient();
      if (!supabase) return;
      // Mark cycle as closed in import_cycles
      await supabase
        .from('import_cycles')
        .update({ is_closed: true, closed_at: new Date().toISOString(), is_current: false })
        .eq('periodo', lastPeriodo);
      // Save snapshot to cycle_summaries
      const last = history[history.length - 1];
      await supabase.from('cycle_summaries').upsert({
        periodo: lastPeriodo,
        total_analistas: last.analistas,
        qa_media: last.qa,
        iepc_media: last.iepc,
        total_ncs: last.ncs,
        total_elogios: last.elogios,
        squad_breakdown: last.squads,
        insights: { ai_summary: aiSummary },
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'periodo' });
      setCloseCycleSuccess(true);
      setTimeout(() => setCloseCycleSuccess(false), 4000);
      loadData();
    } catch (err) {
      console.error('Erro ao fechar ciclo:', err);
    }
  };

  const filteredHistory = filterPeriod === 'all' ? history : filterPeriod === '6m' ? history.slice(-6) : history.slice(-3);
  const lastPeriod = history[history.length - 1];
  const prevPeriod = history[history.length - 2];
  const qaTrend = calcTrend(history.map((h) => h.qa));
  const iepcTrend = calcTrend(history.map((h) => h.iepc));
  const ncTrend = calcTrend(history.map((h) => h.ncs));
  const insights = generateInsights(history);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp size={14} style={{ color: '#22C55E' }} />;
    if (trend === 'down') return <TrendingDown size={14} style={{ color: '#EF4444' }} />;
    return <Minus size={14} style={{ color: '#94A3B8' }} />;
  };

  const squadChartData = lastPeriod
    ? Object.entries(lastPeriod.squads).map(([squad, data]) => ({
        squad: squad.length > 12 ? squad.substring(0, 12) + '…' : squad,
        fullSquad: squad,
        qa: parseFloat(data.qa.toFixed(1)),
        iepc: parseFloat(data.iepc.toFixed(1)),
      }))
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}%</p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Success toast */}
      {closeCycleSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          Ciclo fechado com sucesso! Snapshot gerado.
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Painel Executivo</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            {userRole === 'Coordenador' && userSquad ? `Squad: ${userSquad} · ` : ''}
            Visão histórica consolidada · {allPeriodos.length} ciclo{allPeriodos.length !== 1 ? 's' : ''} registrado{allPeriodos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {(['all', '6m', '3m'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterPeriod === p ? '#1E40AF' : 'transparent',
                  color: filterPeriod === p ? '#fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                {p === 'all' ? 'Todos' : p === '6m' ? '6 meses' : '3 meses'}
              </button>
            ))}
          </div>
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
          {/* Consolidar Analytics */}
          {history.length > 0 && (
            <button
              onClick={handleConsolidateAnalytics}
              disabled={consolidateLoading || consolidating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }}
            >
              {(consolidateLoading || consolidating) ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {(consolidateLoading || consolidating) ? 'Analisando...' : 'Consolidar Analytics'}
            </button>
          )}
          {/* Fechar Ciclo */}
          {canCloseCycle && lastPeriod && (
            <button
              onClick={() => setCloseCycleOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <Lock size={11} />
              Fechar Ciclo
            </button>
          )}
          {canImport && (
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
              style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}
            >
              Importar
            </button>
          )}
        </div>
      </div>

      {/* Consolidar Analytics Result */}
      {consolidateResult && (
        <div className="mb-6 rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: '#38BDF8' }} />
              <h3 className="text-sm font-bold text-white">Consolidação Analytics — Gemini AI</h3>
            </div>
            <button onClick={() => setConsolidateResult('')} className="p-1 rounded" style={{ color: '#94A3B8' }}>
              <X size={12} />
            </button>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>{consolidateResult}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando dados...</p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32">
          <BarChart2 size={48} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-lg font-semibold text-white mb-2">Nenhum dado disponível</p>
          <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>Importe dados de ciclos para visualizar o painel executivo</p>
          {canImport && (
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              Importar primeiro ciclo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'QA Médio', value: lastPeriod ? `${lastPeriod.qa.toFixed(1)}%` : '—', delta: lastPeriod && prevPeriod ? (lastPeriod.qa - prevPeriod.qa).toFixed(1) : null, trend: qaTrend, color: '#38BDF8', icon: <BarChart2 size={16} /> },
              { label: 'IEPC Médio', value: lastPeriod ? `${lastPeriod.iepc.toFixed(1)}%` : '—', delta: lastPeriod && prevPeriod ? (lastPeriod.iepc - prevPeriod.iepc).toFixed(1) : null, trend: iepcTrend, color: '#06B6D4', icon: <Activity size={16} /> },
              { label: 'NCs Último Ciclo', value: lastPeriod ? String(lastPeriod.ncs) : '—', delta: lastPeriod && prevPeriod ? String(lastPeriod.ncs - prevPeriod.ncs) : null, trend: (ncTrend === 'up' ? 'down' : ncTrend === 'down' ? 'up' : 'stable') as any, color: '#EF4444', icon: <AlertTriangle size={16} /> },
              { label: 'Elogios Último Ciclo', value: lastPeriod ? String(lastPeriod.elogios) : '—', delta: lastPeriod && prevPeriod ? String(lastPeriod.elogios - prevPeriod.elogios) : null, trend: calcTrend(history.map((h) => h.elogios)), color: '#F59E0B', icon: <Star size={16} /> },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{kpi.label}</span>
                  <span style={{ color: kpi.color }}>{kpi.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{kpi.value}</p>
                {kpi.delta !== null && (
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={kpi.trend as any} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>
                      {Number(kpi.delta) > 0 ? '+' : ''}{kpi.delta} vs anterior
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* AI Insight Panel */}
          <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.15)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                  <Activity size={12} style={{ color: '#38BDF8' }} />
                </div>
                <h3 className="text-sm font-semibold text-white">Inteligência Gerencial — Gemini AI</h3>
              </div>
              <button
                onClick={handleGenerateAiInsight}
                disabled={aiChatLoading || history.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
              >
                {aiChatLoading ? <RefreshCw size={11} className="animate-spin" /> : <Activity size={11} />}
                {aiChatLoading ? 'Analisando...' : 'Gerar Insight'}
              </button>
            </div>
            {aiInsight ? (
              <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{aiInsight}</p>
            ) : (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Clique em "Gerar Insight" para que a IA analise os dados do último ciclo e gere recomendações executivas.
              </p>
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Evolução QA & IEPC</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Tendência histórica por ciclo</p>
                </div>
                <TrendIcon trend={qaTrend} />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis domain={[50, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={85} stroke="rgba(34,197,94,0.3)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="qa" name="QA" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} />
                  <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Performance por Squad</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Último ciclo registrado</p>
                </div>
                <Users size={14} style={{ color: '#94A3B8' }} />
              </div>
              {squadChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={squadChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="squad" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="qa" name="QA" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="iepc" name="IEPC" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados de squad disponíveis</p>
                </div>
              )}
            </div>
          </div>

          {/* NC + Elogios */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Evolução de NCs</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Não conformidades por ciclo</p>
                </div>
                <AlertTriangle size={14} style={{ color: '#EF4444' }} />
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ncs" name="NCs" fill="#EF4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-white">Evolução de Elogios</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Reconhecimentos por ciclo</p>
                </div>
                <Star size={14} style={{ color: '#F59E0B' }} />
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={filteredHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="periodo" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="elogios" name="Elogios" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insights + History Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Insights Gerenciais</h3>
              {insights.length === 0 ? (
                <p className="text-xs" style={{ color: '#94A3B8' }}>Importe mais de um ciclo para gerar insights automáticos.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-lg"
                      style={{
                        backgroundColor: insight.type === 'positive' ? 'rgba(34,197,94,0.06)' : insight.type === 'negative' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${insight.type === 'positive' ? 'rgba(34,197,94,0.15)' : insight.type === 'negative' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <span className="flex-shrink-0 mt-0.5">
                        {insight.type === 'positive' ? <TrendingUp size={12} style={{ color: '#22C55E' }} /> : insight.type === 'negative' ? <TrendingDown size={12} style={{ color: '#EF4444' }} /> : <Minus size={12} style={{ color: '#94A3B8' }} />}
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{insight.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Histórico de Ciclos</h3>
                <Link href="/historico" className="flex items-center gap-1 text-xs" style={{ color: '#38BDF8' }}>
                  Ver completo <ChevronRight size={12} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Período', 'QA Médio', 'IEPC Médio', 'NCs', 'Elogios', 'Analistas'].map((h) => (
                        <th key={h} className="text-left py-2 pr-4 font-medium" style={{ color: '#94A3B8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().slice(0, 8).map((row) => (
                      <tr key={row.periodo} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td className="py-2 pr-4 font-medium text-white">{row.periodo}</td>
                        <td className="py-2 pr-4" style={{ color: row.qa >= 85 ? '#22C55E' : row.qa >= 70 ? '#F59E0B' : '#EF4444' }}>{row.qa.toFixed(1)}%</td>
                        <td className="py-2 pr-4" style={{ color: row.iepc >= 85 ? '#22C55E' : row.iepc >= 70 ? '#F59E0B' : '#EF4444' }}>{row.iepc.toFixed(1)}%</td>
                        <td className="py-2 pr-4" style={{ color: row.ncs > 10 ? '#EF4444' : 'rgba(255,255,255,0.6)' }}>{row.ncs}</td>
                        <td className="py-2 pr-4" style={{ color: '#F59E0B' }}>{row.elogios}</td>
                        <td className="py-2 pr-4" style={{ color: '#94A3B8' }}>{row.analistas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {history.length === 0 && (
                  <p className="text-center py-6 text-xs" style={{ color: '#94A3B8' }}>Nenhum ciclo registrado</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {canImport && <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}

      {closeCycleOpen && lastPeriod && (
        <CloseCycleModal
          periodo={lastPeriod.periodo}
          summary={lastPeriod}
          onClose={() => setCloseCycleOpen(false)}
          onConfirm={handleCloseCycle}
        />
      )}
    </div>
  );
}