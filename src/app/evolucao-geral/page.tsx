'use client';
import React, { useEffect, useState, useMemo } from 'react';


import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchCycleScores, fetchNCRecords, dispatchDataChanged } from '@/lib/services/dataService';
import { MONTHLY_TREND, getScoreColor } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { TrendingUp, Activity, AlertTriangle, RefreshCw, Plus, X, Save, Users, BarChart2, Globe } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


interface ScoreRow {
  periodo: string;
  analista: string;
  squad: string;
  nota_final_qa: number;
  iepc_total: number;
  total_ncs: number;
}

interface NCRow {
  periodo: string;
  squad: string;
  tipo_nc: string;
}

interface ManualEntry {
  id: string;
  mode: 'analyst' | 'squad' | 'sector';
  periodo: string;
  squad: string;
  analista: string;
  nota_final_qa: number;
  iepc_total: number;
  total_ncs: number;
  label?: string; // display label for squad/sector entries
}

const SQUAD_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];

const MANUAL_STORAGE_KEY = 'zetti_manual_entries';

function loadManualEntries(): ManualEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveManualEntries(entries: ManualEntry[]) {
  localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(entries));
}

function getHeatColor(score: number): string {
  if (score === 0) return 'rgba(255,255,255,0.04)';
  if (score >= 90) return 'rgba(34,197,94,0.35)';
  if (score >= 80) return 'rgba(34,197,94,0.18)';
  if (score >= 70) return 'rgba(234,179,8,0.25)';
  return 'rgba(239,68,68,0.25)';
}

const NC_TYPE_COLORS = ['#EF4444', '#F97316', '#EAB308', '#8B5CF6', '#06B6D4'];

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#161B22',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

// ─── Supabase persistence ────────────────────────────────────────────────────

async function saveEntryToSupabase(entry: ManualEntry): Promise<void> {
  try {
    const supabase = createClient();
    if (!supabase) return;

    if (entry.mode === 'analyst') {
      // Save as a cycle_score row
      await supabase.from('cycle_scores').insert({
        periodo: entry.periodo,
        analista: entry.analista,
        squad: entry.squad,
        coordenador: '',
        nota_final_qa: entry.nota_final_qa,
        iepc_total: entry.iepc_total,
        total_ncs: entry.total_ncs,
        pontos_deduzidos_nc: 0,
        p1: 0, p2: 0, p3: 0, p4: 0, p5: 0,
        e1: 0, e2: 0, e3: 0, e4: 0, e5: 0,
      });
    } else {
      // Save as a manual_cycle summary
      await supabase.from('manual_evaluations').insert({
        periodo: entry.periodo,
        squad: entry.mode === 'squad' ? entry.squad : 'SETOR SUPORTE',
        analista: entry.mode === 'analyst' ? entry.analista : (entry.mode === 'squad' ? `[Squad] ${entry.squad}` : '[Setor] Suporte Todos'),
        nota_final_qa: entry.nota_final_qa,
        iepc_total: entry.iepc_total,
        total_ncs: entry.total_ncs,
        source: entry.mode,
      });
    }
  } catch {
    // Silently fail — localStorage is the fallback
  }
}

async function deleteEntryFromSupabase(entry: ManualEntry): Promise<void> {
  try {
    const supabase = createClient();
    if (!supabase) return;
    if (entry.mode === 'analyst') {
      await supabase.from('cycle_scores')
        .delete()
        .eq('periodo', entry.periodo)
        .eq('analista', entry.analista)
        .eq('squad', entry.squad);
    } else {
      await supabase.from('manual_evaluations')
        .delete()
        .eq('periodo', entry.periodo)
        .eq('squad', entry.mode === 'squad' ? entry.squad : 'SETOR SUPORTE');
    }
  } catch {
    // Silently fail
  }
}

// ─── Entry form defaults ─────────────────────────────────────────────────────

type EntryMode = 'analyst' | 'squad' | 'sector';

interface FormState {
  periodo: string;
  squad: string;
  analista: string;
  nota_final_qa: number;
  iepc_total: number;
  total_ncs: number;
}

const defaultForm: FormState = {
  periodo: '',
  squad: 'PDV',
  analista: '',
  nota_final_qa: 0,
  iepc_total: 0,
  total_ncs: 0,
};

// ─── Main page ───────────────────────────────────────────────────────────────

export default function EvolucaoGeralPage() {
  return (
    <EnterpriseLayout>
      <EvolucaoGeralContent />
    </EnterpriseLayout>
  );
}

function EvolucaoGeralContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [ncs, setNCs] = useState<NCRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualCycles, setManualCycles] = useState<{ periodo: string; qa_media: number; iepc_media: number; total_ncs: number }[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('analyst');
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [scoresData, ncsData] = await Promise.all([
        fetchCycleScores(),
        fetchNCRecords(),
      ]);
      setScores(scoresData as ScoreRow[]);
      setNCs(ncsData as NCRow[]);
      // Manual cycles from Supabase app_settings (no localStorage dependency)
      try {
        const supabase = createClient();
        const { data: manualData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'manual_cycles')
          .maybeSingle();
        if (manualData?.value && Array.isArray(manualData.value)) {
          setManualCycles(manualData.value);
        }
      } catch { /* ignore — manual cycles are optional */ }
    } catch {
      // use mock fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setManualEntries(loadManualEntries());

    const handleImportDone = () => { loadData(); setManualEntries(loadManualEntries()); };
    window.addEventListener('zetti_data_changed', handleImportDone);
    window.addEventListener('zetti_import_done', handleImportDone);
    return () => {
      window.removeEventListener('zetti_data_changed', handleImportDone);
      window.removeEventListener('zetti_import_done', handleImportDone);
    };
  }, []);

  const handleAddEntry = async () => {
    if (!form.periodo) return;
    if (entryMode === 'analyst' && !form.analista) return;

    setSaving(true);
    const entry: ManualEntry = {
      id: `manual-${Date.now()}`,
      mode: entryMode,
      periodo: form.periodo,
      squad: entryMode === 'sector' ? 'SETOR SUPORTE' : form.squad,
      analista: entryMode === 'analyst' ? form.analista : '',
      nota_final_qa: form.nota_final_qa,
      iepc_total: form.iepc_total,
      total_ncs: form.total_ncs,
      label: entryMode === 'squad'
        ? `[Squad] ${form.squad}`
        : entryMode === 'sector' ?'[Setor] Suporte Todos'
        : form.analista,
    };

    const updated = [...manualEntries, entry];
    setManualEntries(updated);
    saveManualEntries(updated);
    await saveEntryToSupabase(entry);

    setForm(defaultForm);
    setShowManualForm(false);
    setSaving(false);
    dispatchDataChanged({ tipo: 'manual_entry', periodo: entry.periodo });
  };

  const handleDeleteEntry = async (entry: ManualEntry) => {
    const updated = manualEntries.filter((e) => e.id !== entry.id);
    setManualEntries(updated);
    saveManualEntries(updated);
    await deleteEntryFromSupabase(entry);
    dispatchDataChanged({ tipo: 'delete_manual_entry', periodo: entry.periodo });
  };

  // Combine supabase scores + manual entries
  const allScores: ScoreRow[] = useMemo(() => {
    const supabaseScores = scores.length > 0 ? scores : [];
    const manual: ScoreRow[] = manualEntries
      .filter((e) => e.mode === 'analyst')
      .map((e) => ({
        periodo: e.periodo,
        analista: e.analista,
        squad: e.squad,
        nota_final_qa: e.nota_final_qa,
        iepc_total: e.iepc_total,
        total_ncs: e.total_ncs,
      }));
    return [...supabaseScores, ...manual];
  }, [scores, manualEntries]);

  // Squad/sector manual entries feed into trend data
  const squadSectorEntries = useMemo(() => manualEntries.filter((e) => e.mode === 'squad' || e.mode === 'sector'), [manualEntries]);

  // Multi-cycle trend data
  const trendData = useMemo(() => {
    const byPeriodo: Record<string, { qa: number[]; iepc: number[] }> = {};

    allScores.forEach((s) => {
      if (!byPeriodo[s.periodo]) byPeriodo[s.periodo] = { qa: [], iepc: [] };
      byPeriodo[s.periodo].qa.push(s.nota_final_qa);
      byPeriodo[s.periodo].iepc.push(s.iepc_total);
    });

    // Squad/sector entries contribute their values directly
    squadSectorEntries.forEach((e) => {
      if (!byPeriodo[e.periodo]) byPeriodo[e.periodo] = { qa: [], iepc: [] };
      byPeriodo[e.periodo].qa.push(e.nota_final_qa);
      byPeriodo[e.periodo].iepc.push(e.iepc_total);
    });

    manualCycles.forEach((mc) => {
      if (!byPeriodo[mc.periodo]) {
        byPeriodo[mc.periodo] = { qa: [mc.qa_media], iepc: [mc.iepc_media] };
      }
    });

    if (Object.keys(byPeriodo).length === 0) {
      return MONTHLY_TREND.map((m) => ({ month: m.month, qa: m.qa, iepc: m.iepc }));
    }

    return Object.entries(byPeriodo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, vals]) => ({
        month: periodo,
        qa: vals.qa.length ? +(vals.qa.reduce((a, b) => a + b, 0) / vals.qa.length).toFixed(2) : 0,
        iepc: vals.iepc.length ? +(vals.iepc.reduce((a, b) => a + b, 0) / vals.iepc.length).toFixed(2) : 0,
      }));
  }, [allScores, manualCycles, squadSectorEntries]);

  const allSquads = useMemo(() => {
    const s = new Set(allScores.map((r) => r.squad));
    return s.size > 0 ? [...s] : ['PDV', 'Compras e Estoque', 'Financeiro Fiscal', 'PDV N1'];
  }, [allScores]);

  const allPeriodos = useMemo(() => {
    const p = new Set([
      ...allScores.map((r) => r.periodo),
      ...squadSectorEntries.map((e) => e.periodo),
    ]);
    return p.size > 0 ? [...p].sort() : MONTHLY_TREND.map((m) => m.month);
  }, [allScores, squadSectorEntries]);

  const heatmapData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    allSquads.forEach((sq) => {
      map[sq] = {};
      allPeriodos.forEach((p) => { map[sq][p] = 0; });
    });

    if (allScores.length > 0) {
      const counts: Record<string, Record<string, number>> = {};
      allScores.forEach((s) => {
        if (!map[s.squad]) return;
        map[s.squad][s.periodo] = (map[s.squad][s.periodo] || 0) + s.nota_final_qa;
        if (!counts[s.squad]) counts[s.squad] = {};
        counts[s.squad][s.periodo] = (counts[s.squad][s.periodo] || 0) + 1;
      });
      allSquads.forEach((sq) => {
        allPeriodos.forEach((p) => {
          const cnt = counts[sq]?.[p] || 0;
          if (cnt > 0) map[sq][p] = +(map[sq][p] / cnt).toFixed(1);
        });
      });

      // Overlay squad-level manual entries
      squadSectorEntries.filter((e) => e.mode === 'squad').forEach((e) => {
        if (map[e.squad] && !map[e.squad][e.periodo]) {
          map[e.squad][e.periodo] = e.nota_final_qa;
        }
      });
    } else {
      const mockMap: Record<string, Record<string, number>> = {
        'PDV': { 'Fev/2026': 75.2, 'Mar/2026': 77.6, 'Abr/2026': 77.6 },
        'Compras e Estoque': { 'Fev/2026': 82.1, 'Mar/2026': 83.5, 'Abr/2026': 84.9 },
        'Financeiro Fiscal': { 'Fev/2026': 80.0, 'Mar/2026': 82.0, 'Abr/2026': 84.5 },
        'PDV N1': { 'Fev/2026': 60.0, 'Mar/2026': 61.5, 'Abr/2026': 63.2 },
      };
      allSquads.forEach((sq) => {
        allPeriodos.forEach((p) => {
          map[sq][p] = mockMap[sq]?.[p] || 0;
        });
      });
    }

    return map;
  }, [allScores, allSquads, allPeriodos, squadSectorEntries]);

  const ncBarData = useMemo(() => {
    if (ncs.length === 0) {
      return MONTHLY_TREND.map((m) => ({
        month: m.month,
        'Conformidade de Registro': Math.round(m.qa * 0.08),
        'Integridade do Fluxo': Math.round(m.qa * 0.05),
        'Outros': Math.round(m.qa * 0.02),
      }));
    }
    const byPeriodo: Record<string, Record<string, number>> = {};
    ncs.forEach((nc) => {
      if (!byPeriodo[nc.periodo]) byPeriodo[nc.periodo] = {};
      const tipo = nc.tipo_nc?.substring(0, 25) || 'Outros';
      byPeriodo[nc.periodo][tipo] = (byPeriodo[nc.periodo][tipo] || 0) + 1;
    });
    return Object.entries(byPeriodo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, tipos]) => ({ month: periodo, ...tipos }));
  }, [ncs]);

  const ncTypes = useMemo(() => {
    if (ncs.length === 0) return ['Conformidade de Registro', 'Integridade do Fluxo', 'Outros'];
    return [...new Set(ncs.map((nc) => nc.tipo_nc?.substring(0, 25) || 'Outros'))];
  }, [ncs]);

  // Mode config
  const modeConfig = {
    analyst: { label: 'Por Analista', icon: Users, desc: 'Lançar resultado individual de um analista' },
    squad: { label: 'Por Equipe', icon: BarChart2, desc: 'Lançar resultado consolidado de uma equipe/squad' },
    sector: { label: 'Setor Suporte Todos', icon: Globe, desc: 'Lançar resultado geral de todo o setor de suporte' },
  };

  const modeLabel = (e: ManualEntry) => {
    if (e.mode === 'analyst') return e.analista;
    if (e.mode === 'squad') return `[Squad] ${e.squad}`;
    return '[Setor] Suporte Todos';
  };

  const modeBadge = (mode: string) => {
    if (mode === 'analyst') return { bg: 'rgba(43,79,129,0.2)', color: '#60A5FA', text: 'Analista' };
    if (mode === 'squad') return { bg: 'rgba(139,92,246,0.2)', color: '#A78BFA', text: 'Equipe' };
    return { bg: 'rgba(234,179,8,0.15)', color: '#EAB308', text: 'Setor' };
  };

  const canSave = form.periodo && (entryMode !== 'analyst' || form.analista);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Evolução dos Indicadores
              </h1>
              <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
                Tendências e análise tática — {allPeriodos.length} ciclo{allPeriodos.length !== 1 ? 's' : ''} disponível{allPeriodos.length !== 1 ? 'is' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: 'rgba(43,79,129,0.2)', border: '1px solid rgba(43,79,129,0.4)', color: '#60A5FA' }}
              >
                <Plus size={14} />
                Lançar Ciclo Anterior
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
                style={{ color: '#8B949E', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Manual entries table */}
          {manualEntries.length > 0 && (
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Resultados de Ciclos Anteriores (Lançados Manualmente)
                </h3>
                <span className="text-xs" style={{ color: '#8B949E' }}>{manualEntries.length} registro{manualEntries.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Tipo', 'Período', 'Identificação', 'Squad', 'Nota QA', 'IEPC', 'NCs', ''].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {manualEntries.map((entry) => {
                      const badge = modeBadge(entry.mode);
                      return (
                        <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: badge.bg, color: badge.color }}>
                              {badge.text}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-white">{entry.periodo}</td>
                          <td className="py-2 px-3 text-white">{modeLabel(entry)}</td>
                          <td className="py-2 px-3" style={{ color: '#8B949E' }}>{entry.squad}</td>
                          <td className="py-2 px-3 font-bold" style={{ color: getScoreColor(entry.nota_final_qa) }}>{entry.nota_final_qa.toFixed(1)}</td>
                          <td className="py-2 px-3 font-bold" style={{ color: getScoreColor(entry.iepc_total) }}>{entry.iepc_total.toFixed(1)}</td>
                          <td className="py-2 px-3" style={{ color: entry.total_ncs > 0 ? '#EF4444' : '#22C55E' }}>{entry.total_ncs}</td>
                          <td className="py-2 px-3">
                            <button onClick={() => handleDeleteEntry(entry)} className="p-1 rounded transition-colors" style={{ color: '#8B949E' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#8B949E'; }}>
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: '#2B4F81', borderTopColor: 'transparent' }} />
                <p className="text-sm" style={{ color: '#8B949E' }}>Carregando dados históricos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Multi-cycle trend chart */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={18} style={{ color: '#2B4F81' }} />
                  <h3 className="font-display text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Evolução Multi-Ciclo — QA vs IEPC
                  </h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" tick={{ fill: '#8B949E', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[50, 100]} tick={{ fill: '#8B949E', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        labelStyle={{ color: '#fff', fontWeight: 600 }}
                        itemStyle={{ color: '#8B949E' }}
                      />
                      <Legend wrapperStyle={{ color: '#8B949E', fontSize: 12 }} />
                      <Line type="monotone" dataKey="qa" name="Nota QA Média" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="iepc" name="IEPC Médio" stroke="#2B4F81" strokeWidth={2.5} dot={{ fill: '#2B4F81', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Heatmap */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-5">
                  <Activity size={18} style={{ color: '#EAB308' }} />
                  <h3 className="font-display text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Heatmap de Performance — Squad × Ciclo
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#8B949E' }}>Squad</th>
                        {allPeriodos.map((p) => (
                          <th key={p} className="text-center py-2 px-3 text-xs font-medium uppercase tracking-wide" style={{ color: '#8B949E' }}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allSquads.map((squad) => (
                        <tr key={squad} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-3 px-3 font-medium text-white whitespace-nowrap">{squad}</td>
                          {allPeriodos.map((p) => {
                            const val = heatmapData[squad]?.[p] || 0;
                            return (
                              <td key={p} className="py-3 px-3 text-center">
                                <div
                                  className="inline-flex items-center justify-center w-16 h-9 rounded-lg text-xs font-bold"
                                  style={{ backgroundColor: getHeatColor(val), color: val === 0 ? '#8B949E' : getScoreColor(val) }}
                                >
                                  {val > 0 ? val.toFixed(1) : '—'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 flex-wrap" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { label: '≥ 90 — Excelente', color: 'rgba(34,197,94,0.35)' },
                    { label: '80–89 — Bom', color: 'rgba(34,197,94,0.18)' },
                    { label: '70–79 — Atenção', color: 'rgba(234,179,8,0.25)' },
                    { label: '< 70 — Crítico', color: 'rgba(239,68,68,0.25)' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-xs" style={{ color: '#8B949E' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NC stacked bar */}
              <div style={cardStyle}>
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle size={18} style={{ color: '#EF4444' }} />
                  <h3 className="font-display text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Tendência de Não Conformidades por Tipo
                  </h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ncBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="month" tick={{ fill: '#8B949E', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8B949E', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        labelStyle={{ color: '#fff', fontWeight: 600 }}
                        itemStyle={{ color: '#8B949E' }}
                      />
                      <Legend wrapperStyle={{ color: '#8B949E', fontSize: 12 }} />
                      {ncTypes.map((tipo, i) => (
                        <Bar key={tipo} dataKey={tipo} stackId="a" fill={NC_TYPE_COLORS[i % NC_TYPE_COLORS.length]}
                          radius={i === ncTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} onImportSuccess={loadData} />

      {/* ── Manual Entry Modal ── */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-xl rounded-2xl shadow-2xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Lançar Resultado de Ciclo Anterior
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                  Registre resultados históricos de QA e IEPC manualmente
                </p>
              </div>
              <button onClick={() => setShowManualForm(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#8B949E' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">

              {/* Mode selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: '#8B949E' }}>
                  Tipo de Lançamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(modeConfig) as [EntryMode, typeof modeConfig.analyst][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = entryMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => { setEntryMode(key); setForm(defaultForm); }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                        style={{
                          backgroundColor: active ? 'rgba(43,79,129,0.25)' : 'rgba(255,255,255,0.04)',
                          border: active ? '1px solid rgba(43,79,129,0.6)' : '1px solid rgba(255,255,255,0.08)',
                          color: active ? '#60A5FA' : '#8B949E',
                        }}
                      >
                        <Icon size={16} />
                        <span className="text-xs font-medium leading-tight">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  {modeConfig[entryMode].desc}
                </p>
              </div>

              {/* Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                    Período *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Jan/2026"
                    value={form.periodo}
                    onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                {/* Squad — shown for analyst and squad modes */}
                {entryMode !== 'sector' && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                      {entryMode === 'squad' ? 'Equipe / Squad *' : 'Squad *'}
                    </label>
                    <select
                      value={form.squad}
                      onChange={(e) => setForm({ ...form, squad: e.target.value })}
                      style={selectStyle}
                    >
                      {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}

                {/* Sector label */}
                {entryMode === 'sector' && (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                      Escopo
                    </label>
                    <div className="flex items-center h-9 px-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#EAB308' }}>
                      Setor Suporte — Todos
                    </div>
                  </div>
                )}
              </div>

              {/* Analyst name — only for analyst mode */}
              {entryMode === 'analyst' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                    Nome do Analista *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do analista"
                    value={form.analista}
                    onChange={(e) => setForm({ ...form, analista: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Scores */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: '#8B949E' }}>
                  Indicadores
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>
                      Nota QA (0–100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="0.0"
                      value={form.nota_final_qa || ''}
                      onChange={(e) => setForm({ ...form, nota_final_qa: parseFloat(e.target.value) || 0 })}
                      style={inputStyle}
                    />
                    {form.nota_final_qa > 0 && (
                      <div className="text-xs mt-1 font-semibold" style={{ color: getScoreColor(form.nota_final_qa) }}>
                        {form.nota_final_qa >= 85 ? 'Excelente' : form.nota_final_qa >= 70 ? 'Atenção' : 'Crítico'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>
                      IEPC (0–100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      placeholder="0.0"
                      value={form.iepc_total || ''}
                      onChange={(e) => setForm({ ...form, iepc_total: parseFloat(e.target.value) || 0 })}
                      style={inputStyle}
                    />
                    {form.iepc_total > 0 && (
                      <div className="text-xs mt-1 font-semibold" style={{ color: getScoreColor(form.iepc_total) }}>
                        {form.iepc_total >= 85 ? 'Excelente' : form.iepc_total >= 70 ? 'Atenção' : 'Crítico'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: '#6B7280' }}>
                      Total NCs
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.total_ncs || ''}
                      onChange={(e) => setForm({ ...form, total_ncs: parseInt(e.target.value) || 0 })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowManualForm(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!canSave || saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#1E40AF' }}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? 'Salvando...' : 'Salvar Resultado'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
