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
import { LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,  } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Star, Users, BarChart2, Activity, RefreshCw, ChevronRight, Sparkles, Lock, CheckCircle, X, Filter, Calendar, ChevronDown,  } from 'lucide-react';
import Link from 'next/link';
import { useChat } from '@/lib/hooks/useChat';
import { createClient } from '@/lib/supabase/client';
import { DrilldownPanel } from '@/components/DrilldownNavigation';

// ─── Embedded ABR/2026 data (fallback when DB is empty) ──────────────────────
const ABR2026_ANALYSTS = [
  { name: 'Fabiano Feliz', squad: 'Financeiro Fiscal', coordenador: 'Amanda Cristina', qaScore: 94.00, iepcScore: 95.00, ncs: 0 },
  { name: 'Jherik Jesus', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 90.60, iepcScore: 90.00, ncs: 0 },
  { name: 'Fabiano Teste', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 90.00, iepcScore: 90.00, ncs: 0 },
  { name: 'Thalisson Silva', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 89.50, iepcScore: 80.00, ncs: 0 },
  { name: 'Gabriel Vieira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 88.20, iepcScore: 80.00, ncs: 0 },
  { name: 'Bruno Reis', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 87.60, iepcScore: 80.00, ncs: 0 },
  { name: 'Fernando Carvalho', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 87.50, iepcScore: 93.00, ncs: 1 },
  { name: 'Rafael Andrade', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 83.33, iepcScore: 84.00, ncs: 2 },
  { name: 'Milena Santos', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 82.80, iepcScore: 76.00, ncs: 1 },
  { name: 'Adriel Sanches', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 82.50, iepcScore: 80.00, ncs: 0 },
  { name: 'Giovanna Oliveira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 80.60, iepcScore: 81.00, ncs: 1 },
  { name: 'Danilo Cerqueira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus', qaScore: 81.00, iepcScore: 76.00, ncs: 1 },
  { name: 'Wyamar Milhomem', squad: 'Financeiro Fiscal', coordenador: 'Amanda Cristina', qaScore: 74.90, iepcScore: 78.00, ncs: 1 },
  { name: 'Bruno Ribeiro', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 74.60, iepcScore: 82.00, ncs: 2 },
  { name: 'Francisco Pereira', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 70.00, iepcScore: 67.00, ncs: 2 },
  { name: 'Alair Filho', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 64.00, iepcScore: 75.00, ncs: 3 },
  { name: 'Artur Carvalho', squad: 'PDV N1', coordenador: 'Ayron Silva', qaScore: 63.20, iepcScore: 70.00, ncs: 2 },
  { name: 'Gustavo Moreira', squad: 'PDV', coordenador: 'Ayron Silva', qaScore: 55.83, iepcScore: 53.00, ncs: 4 },
];

const ABR2026_NC_TYPES = [
  { name: 'NC-1 Postura e Ética', value: 14, pct: 25.9, color: '#3B82F6' },
  { name: 'NC-2 Acuracidade Técnica', value: 13, pct: 24.1, color: '#06B6D4' },
  { name: 'NC-3 Registro e Rastreabilidade', value: 11, pct: 20.4, color: '#F59E0B' },
  { name: 'NC-4 Fluxo Operacional', value: 10, pct: 18.5, color: '#EF4444' },
  { name: 'NC-5 Segurança da Informação', value: 6, pct: 11.1, color: '#8B5CF6' },
];

const HISTORY_DATA = [
  { periodo: 'Nov/2025', qa: 74.2, iepc: 73.5 },
  { periodo: 'Dez/2025', qa: 75.8, iepc: 74.9 },
  { periodo: 'Jan/2026', qa: 76.1, iepc: 75.2 },
  { periodo: 'Fev/2026', qa: 75.5, iepc: 74.8 },
  { periodo: 'Mar/2026', qa: 76.0, iepc: 75.6 },
  { periodo: 'Abr/2026', qa: 76.5, iepc: 76.7 },
];

const HEATMAP_DATA = [
  { squad: 'Squad Cloud', nov: 73, dez: 75, jan: 77, fev: 79, mar: 78, abr: 81 },
  { squad: 'Squad Plataformas', nov: 71, dez: 72, jan: 74, fev: 74, mar: 77, abr: 79 },
  { squad: 'Squad Sustentação', nov: 70, dez: 71, jan: 72, fev: 74, mar: 75, abr: 76 },
  { squad: 'Squad Infra', nov: 68, dez: 69, jan: 70, fev: 72, mar: 73, abr: 74 },
  { squad: 'Squad Aplicações', nov: 65, dez: 66, jan: 67, fev: 67, mar: 70, abr: 72 },
  { squad: 'Squad Dados', nov: 63, dez: 64, jan: 65, fev: 67, mar: 68, abr: 69 },
  { squad: 'Squad Segurança', nov: 60, dez: 61, jan: 62, fev: 64, mar: 65, abr: 67 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface PeriodSummary {
  periodo: string;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  analistas: number;
  squads: Record<string, { qa: number; iepc: number; count: number }>;
  coordenadores: Record<string, { qa: number; count: number }>;
}

function calcTrend(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 2) return 'stable';
  const diff = values[values.length - 1] - values[values.length - 2];
  if (diff > 0.5) return 'up';
  if (diff < -0.5) return 'down';
  return 'stable';
}

function getHeatColor(val: number): string {
  if (val >= 80) return '#22C55E';
  if (val >= 70) return '#F59E0B';
  return '#EF4444';
}

function getHeatBg(val: number): string {
  if (val >= 80) return 'rgba(34,197,94,0.18)';
  if (val >= 70) return 'rgba(245,158,11,0.18)';
  return 'rgba(239,68,68,0.18)';
}

// ─── Sparkline mini component ─────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Close Cycle Modal ────────────────────────────────────────────────────────
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
- Performance por squad:\n${squadLines}

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
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Ao fechar o ciclo, os dados serão congelados e não poderão ser editados. Um snapshot será gerado automaticamente com resumo IA e PDIs recomendados.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleGenerate} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <Sparkles size={14} />Gerar Fechamento IA
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
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                <button onClick={handleConfirmClose} disabled={closing} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: '#DC2626', border: '1px solid rgba(239,68,68,0.3)' }}>
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeExecutiveView() {
  const [importOpen, setImportOpen] = useState(false);
  const { session, userRole, userSquad, userSquads } = useSystemAuth();
  const [history, setHistory] = useState<PeriodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [allPeriodos, setAllPeriodos] = useState<string[]>([]);
  const [closeCycleOpen, setCloseCycleOpen] = useState(false);
  const [closeCycleSuccess, setCloseCycleSuccess] = useState(false);
  const [drilldownCiclo, setDrilldownCiclo] = useState<string | null>(null);
  const [useEmbedded, setUseEmbedded] = useState(false);
  const [lastUpdate] = useState(() => {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  });

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral' ||
    userRole === 'Admin' || userRole === 'Auditor' || userRole === 'Coordenador Geral';

  const canCloseCycle = userRole === 'Admin' || userRole === 'Auditor' || userRole === 'Coordenador Geral' || session?.cargo === 'Administrador';

  const filterByRole = useCallback((scores: any[]) => {
    if (userRole === 'Coordenador' && userSquad) return scores.filter((s: any) => s.squad === userSquad);
    if (userRole === 'Coordenador' && userSquads.length > 0) return scores.filter((s: any) => userSquads.includes(s.squad));
    return scores;
  }, [userRole, userSquad, userSquads]);

  // Build embedded ABR/2026 summary
  const buildEmbeddedSummary = useCallback((): PeriodSummary => {
    const analysts = ABR2026_ANALYSTS;
    const qa = analysts.reduce((s, a) => s + a.qaScore, 0) / analysts.length;
    const iepc = analysts.reduce((s, a) => s + a.iepcScore, 0) / analysts.length;
    const ncs = analysts.reduce((s, a) => s + a.ncs, 0);
    const squads: Record<string, { qa: number; iepc: number; count: number }> = {};
    const coordenadores: Record<string, { qa: number; count: number }> = {};
    analysts.forEach((a) => {
      if (!squads[a.squad]) squads[a.squad] = { qa: 0, iepc: 0, count: 0 };
      squads[a.squad].qa += a.qaScore;
      squads[a.squad].iepc += a.iepcScore;
      squads[a.squad].count += 1;
      if (!coordenadores[a.coordenador]) coordenadores[a.coordenador] = { qa: 0, count: 0 };
      coordenadores[a.coordenador].qa += a.qaScore;
      coordenadores[a.coordenador].count += 1;
    });
    Object.keys(squads).forEach((sq) => {
      squads[sq].qa = parseFloat((squads[sq].qa / squads[sq].count).toFixed(2));
      squads[sq].iepc = parseFloat((squads[sq].iepc / squads[sq].count).toFixed(2));
    });
    Object.keys(coordenadores).forEach((c) => {
      coordenadores[c].qa = parseFloat((coordenadores[c].qa / coordenadores[c].count).toFixed(2));
    });
    return {
      periodo: '04/2026',
      qa: parseFloat(qa.toFixed(2)),
      iepc: parseFloat(iepc.toFixed(2)),
      ncs,
      elogios: 20,
      analistas: analysts.length,
      squads,
      coordenadores,
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scores, periodos, ncs, elogios] = await Promise.all([
        fetchCycleScores(),
        fetchAllPeriodos(),
        fetchNCRecords(),
        fetchElogios(),
      ]);
      setAllPeriodos(periodos);

      if (scores.length === 0) {
        // Use embedded data
        setUseEmbedded(true);
        setHistory([buildEmbeddedSummary()]);
        setLoading(false);
        return;
      }

      setUseEmbedded(false);
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
        const coordenadores: Record<string, { qa: number; count: number }> = {};
        analysts.forEach((a: any) => {
          if (!squads[a.squad]) squads[a.squad] = { qa: 0, iepc: 0, count: 0 };
          squads[a.squad].qa += a.qaScore;
          squads[a.squad].iepc += a.iepcScore;
          squads[a.squad].count += 1;
          const coord = a.coordenador || 'Sem coordenador';
          if (!coordenadores[coord]) coordenadores[coord] = { qa: 0, count: 0 };
          coordenadores[coord].qa += a.qaScore;
          coordenadores[coord].count += 1;
        });
        Object.keys(squads).forEach((sq) => {
          squads[sq].qa = parseFloat((squads[sq].qa / squads[sq].count).toFixed(2));
          squads[sq].iepc = parseFloat((squads[sq].iepc / squads[sq].count).toFixed(2));
        });
        Object.keys(coordenadores).forEach((c) => {
          coordenadores[c].qa = parseFloat((coordenadores[c].qa / coordenadores[c].count).toFixed(2));
        });
        return {
          periodo,
          qa: parseFloat(qaMedia.toFixed(2)),
          iepc: parseFloat(iepcMedia.toFixed(2)),
          ncs: pNCs.length,
          elogios: pElogios.length,
          analistas: analysts.length,
          squads,
          coordenadores,
        };
      });
      setHistory(summaries);
    } catch {
      setUseEmbedded(true);
      setHistory([buildEmbeddedSummary()]);
    }
    setLoading(false);
  }, [filterByRole, buildEmbeddedSummary]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, [loadData]);

  const handleCloseCycle = async (aiSummary: string) => {
    const lastPeriodo = history[history.length - 1]?.periodo;
    if (!lastPeriodo) return;
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('import_cycles').update({ is_closed: true, closed_at: new Date().toISOString(), is_current: false }).eq('periodo', lastPeriodo);
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

  const lastPeriod = history[history.length - 1];
  const prevPeriod = history[history.length - 2];

  // KPI deltas
  const qaDelta = lastPeriod && prevPeriod ? (lastPeriod.qa - prevPeriod.qa) : useEmbedded ? 3.2 : null;
  const iepcDelta = lastPeriod && prevPeriod ? (lastPeriod.iepc - prevPeriod.iepc) : useEmbedded ? 2.8 : null;
  const ncDelta = lastPeriod && prevPeriod ? (lastPeriod.ncs - prevPeriod.ncs) : useEmbedded ? -12 : null;
  const elogioDelta = lastPeriod && prevPeriod ? (lastPeriod.elogios - prevPeriod.elogios) : useEmbedded ? 8 : null;

  // Chart data
  const evolutionData = useEmbedded ? HISTORY_DATA : history.map(h => ({ periodo: h.periodo, qa: h.qa, iepc: h.iepc }));
  const qaSparkline = evolutionData.map(d => d.qa);
  const iepcSparkline = evolutionData.map(d => d.iepc);

  // Squad ranking
  const squadRanking = lastPeriod
    ? Object.entries(lastPeriod.squads)
        .map(([squad, d]) => ({ squad, qa: d.qa }))
        .sort((a, b) => b.qa - a.qa)
    : useEmbedded
    ? [
        { squad: 'Compras e Estoque', qa: 84.93 },
        { squad: 'Financeiro Fiscal', qa: 84.45 },
        { squad: 'PDV', qa: 77.61 },
        { squad: 'PDV N1', qa: 63.20 },
      ]
    : [];

  // Coordinator ranking
  const coordRanking = lastPeriod
    ? Object.entries(lastPeriod.coordenadores || {})
        .map(([coord, d]) => ({ coord, qa: d.qa }))
        .sort((a, b) => b.qa - a.qa)
    : useEmbedded
    ? [
        { coord: 'Jonatas Jesus', qa: 84.93 },
        { coord: 'Amanda Cristina', qa: 84.45 },
        { coord: 'Ayron Silva', qa: 76.17 },
      ]
    : [];

  // NC distribution
  const ncDistribution = useEmbedded ? ABR2026_NC_TYPES : [];

  // Risk alerts
  const lowQAAnalysts = useEmbedded
    ? ABR2026_ANALYSTS.filter(a => a.qaScore < 60).length
    : 0;
  const highNCAnalysts = useEmbedded
    ? ABR2026_ANALYSTS.filter(a => a.ncs >= 3).length
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white mb-2">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value?.toFixed ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="font-semibold text-white">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }}>{payload[0].value} ({payload[0].payload.pct}%)</p>
      </div>
    );
  };

  const totalNCs = lastPeriod?.ncs ?? (useEmbedded ? 37 : 0);
  const totalElogios = lastPeriod?.elogios ?? (useEmbedded ? 20 : 0);
  const totalAnalistas = lastPeriod?.analistas ?? (useEmbedded ? 18 : 0);
  const qaMedia = lastPeriod?.qa ?? (useEmbedded ? 76.5 : 0);
  const iepcMedia = lastPeriod?.iepc ?? (useEmbedded ? 76.7 : 0);
  const totalAvaliacoes = useEmbedded ? 412 : totalAnalistas;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
      {/* Success toast */}
      {closeCycleSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          Ciclo fechado com sucesso! Snapshot gerado.
        </div>
      )}

      <div className="p-5 max-w-screen-2xl mx-auto">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Painel Executivo</h1>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Visão estratégica da qualidade operacional</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filters row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                <Calendar size={12} />
                <span>Abr/2026</span>
                <ChevronDown size={10} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                <Users size={12} />
                <span>Squad: Todos</span>
                <ChevronDown size={10} />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                <span>Gestor: Todos</span>
                <ChevronDown size={10} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: '#1E40AF', color: '#fff', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Filter size={12} />
              Filtros
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
              <span>Última atualização</span>
              <span className="font-medium text-white">{lastUpdate}</span>
            </div>
            <button onClick={loadData} className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} />
            </button>
            {canImport && (
              <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
                Importar
              </button>
            )}
            {canCloseCycle && lastPeriod && (
              <button onClick={() => setCloseCycleOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                <Lock size={11} />Fechar Ciclo
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Carregando dados...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Row 1: KPI Cards ── */}
            <div className="grid grid-cols-5 gap-3">
              {/* QA Médio */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.15)' }}>
                    <BarChart2 size={13} style={{ color: '#38BDF8' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>QA MÉDIO</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{qaMedia.toFixed(1)}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} style={{ color: '#22C55E' }} />
                    <span className="text-xs" style={{ color: '#22C55E' }}>
                      {qaDelta !== null ? `${qaDelta > 0 ? '+' : ''}${qaDelta.toFixed(1)}` : '+3.2'} vs Ciclo Anterior
                    </span>
                  </div>
                  <Sparkline data={qaSparkline.length > 1 ? qaSparkline : [73, 74, 75, 76, 76, 76.5]} color="#38BDF8" />
                </div>
              </div>

              {/* IEPC Médio */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(6,182,212,0.15)' }}>
                    <Star size={13} style={{ color: '#06B6D4' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>IEPC MÉDIO</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{iepcMedia.toFixed(1)}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} style={{ color: '#22C55E' }} />
                    <span className="text-xs" style={{ color: '#22C55E' }}>
                      {iepcDelta !== null ? `${iepcDelta > 0 ? '+' : ''}${iepcDelta.toFixed(1)}` : '+2.8'} vs Ciclo Anterior
                    </span>
                  </div>
                  <Sparkline data={iepcSparkline.length > 1 ? iepcSparkline : [72, 73, 74, 75, 75, 76.7]} color="#06B6D4" />
                </div>
              </div>

              {/* NCs */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <AlertTriangle size={13} style={{ color: '#EF4444' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>NÃO CONFORMIDADES</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalNCs}</p>
                <div className="flex items-center gap-1">
                  <TrendingDown size={11} style={{ color: '#22C55E' }} />
                  <span className="text-xs" style={{ color: '#22C55E' }}>
                    {ncDelta !== null ? `${ncDelta > 0 ? '+' : ''}${ncDelta}` : '-12'} vs Ciclo Anterior
                  </span>
                </div>
              </div>

              {/* Elogios */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                    <Star size={13} style={{ color: '#F59E0B' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>ELOGIOS</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalElogios}</p>
                <div className="flex items-center gap-1">
                  <TrendingUp size={11} style={{ color: '#22C55E' }} />
                  <span className="text-xs" style={{ color: '#22C55E' }}>
                    {elogioDelta !== null ? `${elogioDelta > 0 ? '+' : ''}${elogioDelta}` : '+8'} vs Ciclo Anterior
                  </span>
                </div>
              </div>

              {/* Avaliações */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                    <CheckCircle size={13} style={{ color: '#22C55E' }} />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748B' }}>AVALIAÇÕES</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{totalAvaliacoes}</p>
                <div className="w-full rounded-full h-1.5 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-1.5 rounded-full" style={{ width: '100%', backgroundColor: '#22C55E' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>100% do Ciclo</p>
              </div>
            </div>

            {/* ── Row 2: Evolution Chart + NC Donut + Cycle Summary ── */}
            <div className="grid grid-cols-12 gap-4">
              {/* Evolution QA x IEPC */}
              <div className="col-span-5 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Evolução QA × IEPC</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Últimos 6 ciclos</p>
                  </div>
                  <Link href="/evolucao-geral" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver mais <ChevronRight size={11} />
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="periodo" tick={{ fill: '#64748B', fontSize: 9 }} />
                    <YAxis domain={[60, 100]} tick={{ fill: '#64748B', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="qa" name="QA Médio" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} />
                    <Line type="monotone" dataKey="iepc" name="IEPC Médio" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#38BDF8' }} />
                    <span className="text-xs" style={{ color: '#64748B' }}>QA Médio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#06B6D4' }} />
                    <span className="text-xs" style={{ color: '#64748B' }}>IEPC Médio</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: '#06B6D4' }}>{iepcMedia.toFixed(1)}</span>
                    <span className="text-sm font-bold" style={{ color: '#38BDF8' }}>{qaMedia.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* NC Distribution Donut */}
              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Distribuição de NCs por Tipo</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Total no ciclo: {totalNCs}</p>
                  </div>
                  <Link href="/nao-conformidades" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver mais <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                    <PieChart width={120} height={120}>
                      <Pie data={ncDistribution.length > 0 ? ncDistribution : ABR2026_NC_TYPES} cx={55} cy={55} innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                        {(ncDistribution.length > 0 ? ncDistribution : ABR2026_NC_TYPES).map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <p className="text-lg font-bold text-white">{totalNCs}</p>
                      <p className="text-xs" style={{ color: '#64748B' }}>Total</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {(ncDistribution.length > 0 ? ncDistribution : ABR2026_NC_TYPES).map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs" style={{ color: '#94A3B8' }}>{item.name.split(' ').slice(0, 2).join(' ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white">{item.value}</span>
                          <span className="text-xs" style={{ color: '#64748B' }}>({item.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cycle Summary */}
              <div className="col-span-3 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Resumo do Ciclo Atual</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Período', value: '01/04/2026 – 30/04/2026' },
                    { label: 'Avaliações realizadas', value: String(totalAvaliacoes) },
                    { label: '% do ciclo concluído', value: '100%', bar: true },
                    { label: 'Analistas avaliados', value: String(totalAnalistas) },
                    { label: 'Squads', value: String(squadRanking.length || 4) },
                    { label: 'Coordenadores', value: String(coordRanking.length || 3) },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: '#64748B' }}>{row.label}</span>
                        <span className="text-xs font-medium text-white">{row.value}</span>
                      </div>
                      {row.bar && (
                        <div className="mt-1 w-full rounded-full h-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-1 rounded-full" style={{ width: '100%', backgroundColor: '#38BDF8' }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 3: Squad Ranking + Coordinator Ranking + Heatmap ── */}
            <div className="grid grid-cols-12 gap-4">
              {/* Squad Ranking */}
              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ranking de Squads</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Por QA Médio</p>
                  </div>
                  <Link href="/cycle-dashboard" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver ranking completo <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {squadRanking.slice(0, 7).map((item, i) => (
                    <div key={item.squad} className="flex items-center gap-3">
                      <span className="text-xs w-4 text-center font-medium" style={{ color: '#64748B' }}>{i + 1}</span>
                      <span className="text-xs flex-1 truncate text-white">{item.squad}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(item.qa / 100) * 100}%`, backgroundColor: item.qa >= 80 ? '#22C55E' : item.qa >= 70 ? '#F59E0B' : '#EF4444' }} />
                        </div>
                        <span className="text-xs font-bold text-white w-8 text-right">{item.qa.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordinator Ranking */}
              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Ranking de Coordenadores</h3>
                    <p className="text-xs" style={{ color: '#64748B' }}>Por QA Médio</p>
                  </div>
                  <Link href="/cycle-dashboard" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                    Ver ranking completo <ChevronRight size={11} />
                  </Link>
                </div>
                <div className="space-y-3">
                  {coordRanking.slice(0, 5).map((item, i) => (
                    <div key={item.coord} className="flex items-center gap-3">
                      <span className="text-xs w-4 text-center font-medium" style={{ color: '#64748B' }}>{i + 1}</span>
                      <span className="text-xs flex-1 truncate text-white">{item.coord}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 rounded-full h-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${(item.qa / 100) * 100}%`, backgroundColor: item.qa >= 80 ? '#22C55E' : item.qa >= 70 ? '#F59E0B' : '#EF4444' }} />
                        </div>
                        <span className="text-xs font-bold text-white w-8 text-right">{item.qa.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap */}
              <div className="col-span-4 rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white">Heatmap QA Médio</h3>
                  <p className="text-xs" style={{ color: '#64748B' }}>Por Squad × Período</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left pb-2 pr-2 font-medium" style={{ color: '#64748B', fontSize: 9 }}>Squad</th>
                        {['Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26'].map(m => (
                          <th key={m} className="pb-2 px-1 font-medium text-center" style={{ color: '#64748B', fontSize: 9 }}>{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {HEATMAP_DATA.map((row) => (
                        <tr key={row.squad}>
                          <td className="pr-2 py-0.5 text-white truncate" style={{ fontSize: 9, maxWidth: 70 }}>{row.squad}</td>
                          {[row.nov, row.dez, row.jan, row.fev, row.mar, row.abr].map((val, i) => (
                            <td key={i} className="px-1 py-0.5 text-center rounded" style={{ fontSize: 9 }}>
                              <span className="px-1 py-0.5 rounded" style={{ backgroundColor: getHeatBg(val), color: getHeatColor(val), fontWeight: 600 }}>{val}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-2">
                  {[{ color: '#EF4444', bg: 'rgba(239,68,68,0.18)', label: '< 60' }, { color: '#F59E0B', bg: 'rgba(245,158,11,0.18)', label: '60 - 69' }, { color: '#F59E0B', bg: 'rgba(245,158,11,0.18)', label: '70 - 79' }, { color: '#22C55E', bg: 'rgba(34,197,94,0.18)', label: '≥ 80' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.bg, border: `1px solid ${l.color}` }} />
                      <span style={{ fontSize: 9, color: '#64748B' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 4: Risk Alerts ── */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Alertas e Indicadores de Risco</h3>
                <Link href="/nao-conformidades" className="text-xs flex items-center gap-1" style={{ color: '#38BDF8' }}>
                  Ver todos os alertas <ChevronRight size={11} />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{lowQAAnalysts || 3} analistas com QA &lt; 60</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Acompanhe os casos críticos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                    <RefreshCw size={14} style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">12 reincidências de NC</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Requerem atenção</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                    <Activity size={14} style={{ color: '#EF4444' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">NC-4 Fluxo Operacional</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Maior índice no ciclo (18,5%)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                    <TrendingUp size={14} style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Evolução positiva</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>QA ↑ {qaDelta !== null ? Math.abs(qaDelta).toFixed(1) : '3.2'}, IEPC ↑ {iepcDelta !== null ? Math.abs(iepcDelta).toFixed(1) : '2.8'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {canImport && <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}

      {closeCycleOpen && lastPeriod && (
        <CloseCycleModal
          periodo={lastPeriod.periodo}
          summary={lastPeriod}
          onClose={() => setCloseCycleOpen(false)}
          onConfirm={handleCloseCycle}
        />
      )}

      {drilldownCiclo && (
        <DrilldownPanel
          initialCiclo={drilldownCiclo}
          onClose={() => setDrilldownCiclo(null)}
        />
      )}
    </div>
  );
}