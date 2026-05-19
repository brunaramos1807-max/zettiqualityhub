'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';



import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchAnalystProfiles, saveAnalystProfile, updateAnalystProfile, deleteAnalystProfile, getAnalystHistory, deleteAnalystFromData, fetchManualCycles, saveManualCycle, deleteManualCycle, exportFullBackup, importFullBackup, fetchCycleScores, deleteAllData, type AnalystProfile, type ManualCycleEntry, upsertAnalista, fetchAnalistas, calcTempoEmpresa, type AnalistaRecord } from '@/lib/services/dataService';
import { clearAllDataFromSupabase } from '@/lib/services/supabaseDataService';
import { getScoreColor } from '@/lib/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, X, Edit2, Trash2, ChevronDown, ChevronUp, User, TrendingUp,
  Star, AlertTriangle, Save, Users, Clock, Award, Shield,
  Download, Upload, Database, Calendar, BarChart2, UserMinus, RefreshCw,
} from 'lucide-react';

interface FormState {
  nome: string;
  cargo: string;
  nivel: string;
  coordenador: string;
  equipe: string;
  tempo_empresa_meses: number;
  data_admissao: string;
  ativo: boolean;
}

const EMPTY_FORM: FormState = {
  nome: '',
  cargo: 'Analista',
  nivel: 'Júnior',
  coordenador: '',
  equipe: '',
  tempo_empresa_meses: 0,
  data_admissao: '',
  ativo: true,
};

const CARGO_OPTIONS = ['Analista', 'Analista Sênior', 'Especialista', 'Coordenador', 'Supervisor', 'Gerente'];
const NIVEL_OPTIONS = ['Júnior', 'Pleno', 'Sênior', 'Especialista'];
const EQUIPE_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];

const cardStyle: React.CSSProperties = {
  backgroundColor: '#161B22',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

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

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

function tempoEmpresaLabel(meses: number): string {
  if (meses < 12) return `${meses} mês${meses !== 1 ? 'es' : ''}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto > 0 ? `${anos} ano${anos !== 1 ? 's' : ''} e ${resto} mês${resto !== 1 ? 'es' : ''}` : `${anos} ano${anos !== 1 ? 's' : ''}`;
}

/** Safely convert a squad value (string or string[]) to a display string */
function squadToString(squad: any): string {
  if (!squad) return '—';
  if (Array.isArray(squad)) return squad.join(', ') || '—';
  return String(squad);
}

interface AnalystHistoryPanelProps {
  profile: AnalystProfile;
  onClose: () => void;
}

function AnalystHistoryPanel({ profile, onClose }: AnalystHistoryPanelProps) {
  const history = useMemo(() => getAnalystHistory(profile?.nome ?? ''), [profile?.nome]);

  const trendData = (history?.scores ?? []).map((s) => ({
    periodo: s?.periodo ?? '',
    qa: s?.nota_final_qa ?? 0,
    iepc: s?.iepc_total ?? 0,
  }));

  const scores = history?.scores ?? [];
  const avgQA = scores.length > 0
    ? (scores.reduce((acc, s) => acc + (s?.nota_final_qa ?? 0), 0) / scores.length).toFixed(1)
    : '—';
  const avgIEPC = scores.length > 0
    ? (scores.reduce((acc, s) => acc + (s?.iepc_total ?? 0), 0) / scores.length).toFixed(1)
    : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl h-full overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-6"
          style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: '#1E40AF' }}>
              {(profile?.nome ?? 'AN').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                {profile?.nome ?? ''}
              </h2>
              <p className="text-xs" style={{ color: '#8B949E' }}>
                {profile?.cargo ?? ''} · {profile?.nivel ?? ''} · {squadToString(profile?.equipe)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ciclos Avaliados', value: scores.length, icon: <TrendingUp size={14} />, color: '#60A5FA' },
              { label: 'Média QA', value: avgQA, icon: <Award size={14} />, color: '#22C55E' },
              { label: 'Média IEPC', value: avgIEPC, icon: <TrendingUp size={14} />, color: '#A78BFA' },
              { label: 'Total NCs', value: (history?.ncs ?? []).length, icon: <AlertTriangle size={14} />, color: '#EF4444' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                  {kpi.icon}
                  <span className="text-xs font-medium">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {trendData.length > 0 ? (
            <div style={cardStyle}>
              <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Evolução QA / IEPC por Ciclo
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="periodo" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                      itemStyle={{ color: '#8B949E' }}
                    />
                    <Line type="monotone" dataKey="qa" name="QA" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
                    <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl text-center" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <TrendingUp size={28} className="mx-auto mb-2" style={{ color: '#30363D' }} />
              <p className="text-sm" style={{ color: '#8B949E' }}>Nenhum dado de QA/IEPC importado para este analista ainda.</p>
            </div>
          )}

          {scores.length > 0 && (
            <div style={cardStyle}>
              <h3 className="text-sm font-semibold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Histórico de Avaliações QA
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Ciclo', 'QA', 'IEPC', 'NCs', 'Pts Ded.'].map((h) => (
                        <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2 px-2 text-white">{s?.periodo ?? '—'}</td>
                        <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s?.nota_final_qa ?? 0) }}>{(s?.nota_final_qa ?? 0).toFixed(1)}</td>
                        <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s?.iepc_total ?? 0) }}>{(s?.iepc_total ?? 0).toFixed(1)}</td>
                        <td className="py-2 px-2" style={{ color: (s?.total_ncs ?? 0) > 0 ? '#EF4444' : '#22C55E' }}>{s?.total_ncs ?? 0}</td>
                        <td className="py-2 px-2" style={{ color: '#8B949E' }}>{s?.pontos_deduzidos_nc ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Star size={15} style={{ color: '#EAB308' }} />
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Elogios Recebidos ({(history?.elogios ?? []).length})
              </h3>
            </div>
            {(history?.elogios ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: '#8B949E' }}>Nenhum elogio registrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {(history?.elogios ?? []).map((e, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#EAB308' }}>{e?.periodo ?? '—'}</span>
                      {e?.cliente && <span className="text-xs" style={{ color: '#8B949E' }}>Cliente: {e.cliente}</span>}
                    </div>
                    <p className="text-xs text-white leading-relaxed">{e?.elogio ?? ''}</p>
                    {e?.protocolo && <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Protocolo: {e.protocolo}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} style={{ color: '#EF4444' }} />
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Não Conformidades ({(history?.ncs ?? []).length})
              </h3>
            </div>
            {(history?.ncs ?? []).length === 0 ? (
              <p className="text-xs" style={{ color: '#8B949E' }}>Nenhuma não conformidade registrada.</p>
            ) : (
              <div className="space-y-2">
                {(history?.ncs ?? []).map((nc, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>{nc?.tipo_nc ?? '—'}</span>
                      <span className="text-xs" style={{ color: '#8B949E' }}>{nc?.periodo ?? '—'}</span>
                    </div>
                    {nc?.descricao && <p className="text-xs text-white leading-relaxed">{nc.descricao}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: '#F97316' }}>Pts deduzidos: {nc?.pontos_deduzidos ?? 0}</span>
                      {nc?.protocolo_referencia && <span className="text-xs" style={{ color: '#8B949E' }}>Protocolo: {nc.protocolo_referencia}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Analyst from Data Modal ──────────────────────────────────────────

interface DeleteAnalystDataModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

function DeleteAnalystDataModal({ onClose, onDeleted }: DeleteAnalystDataModalProps) {
  const [importedAnalysts, setImportedAnalysts] = useState<{ name: string; squad: string; periodo: string }[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState('all');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCycleScores().then((scores) => {
      const map = new Map<string, { name: string; squad: string; periodo: string }>();
      (scores ?? []).forEach((s: any) => {
        if (!s?.analista) return;
        const key = `${s.analista}__${s?.periodo ?? ''}`;
        if (!map.has(key)) {
          map.set(key, {
            name: s.analista,
            squad: squadToString(s?.squad),
            periodo: s?.periodo ?? '',
          });
        }
      });
      setImportedAnalysts(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const uniqueNames = useMemo(() => [...new Set((importedAnalysts ?? []).map((a) => a.name))], [importedAnalysts]);
  const periodsForName = useMemo(() => {
    if (!selectedName) return [];
    return [...new Set((importedAnalysts ?? []).filter((a) => a.name === selectedName).map((a) => a.periodo))];
  }, [importedAnalysts, selectedName]);

  const handleDelete = () => {
    if (!selectedName) return;
    deleteAnalystFromData(selectedName, selectedPeriodo === 'all' ? undefined : selectedPeriodo);
    setDone(true);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
              <UserMinus size={16} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Excluir Analista Importado</h2>
              <p className="text-xs" style={{ color: '#8B949E' }}>Remove dados de QA/NC/Elogios do analista</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin" style={{ color: '#60A5FA' }} />
              <p className="text-sm" style={{ color: '#8B949E' }}>Carregando dados importados...</p>
            </div>
          ) : done ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
                <Shield size={20} style={{ color: '#22C55E' }} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Dados excluídos com sucesso</p>
              <p className="text-xs" style={{ color: '#8B949E' }}>
                Os registros de <strong className="text-white">{selectedName}</strong> foram removidos.
              </p>
              <button onClick={onClose} className="mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: '#1E40AF' }}>
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                  Analista *
                </label>
                <select
                  value={selectedName}
                  onChange={(e) => { setSelectedName(e.target.value); setSelectedPeriodo('all'); setConfirming(false); }}
                  style={selectStyle}
                >
                  <option value="">Selecione o analista...</option>
                  {(uniqueNames ?? []).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {selectedName && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>
                    Período (opcional)
                  </label>
                  <select
                    value={selectedPeriodo}
                    onChange={(e) => { setSelectedPeriodo(e.target.value); setConfirming(false); }}
                    style={selectStyle}
                  >
                    <option value="all">Todos os períodos</option>
                    {(periodsForName ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p className="text-xs mt-1" style={{ color: '#8B949E' }}>
                    Deixe "Todos os períodos" para remover o analista de todos os ciclos importados.
                  </p>
                </div>
              )}

              {selectedName && !confirming && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <p className="text-xs" style={{ color: '#FCA5A5' }}>
                    ⚠️ Esta ação irá remover permanentemente todos os dados de QA, NCs e Elogios de{' '}
                    <strong>{selectedName}</strong>
                    {selectedPeriodo !== 'all' ? ` no período ${selectedPeriodo}` : ' em todos os períodos'}.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancelar
                </button>
                {!confirming ? (
                  <button
                    onClick={() => setConfirming(true)}
                    disabled={!selectedName}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
                    Excluir Dados
                  </button>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ backgroundColor: '#DC2626' }}>
                    Confirmar Exclusão
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Manual Cycles Panel ──────────────────────────────────────────────────────

function ManualCyclesPanel() {
  const [entries, setEntries] = useState<ManualCycleEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ periodo: '', qa_media: '', iepc_media: '', total_ncs: '', total_analistas: '', observacoes: '' });

  const reload = () => setEntries(fetchManualCycles());
  useEffect(() => { reload(); }, []);

  const handleSave = () => {
    if (!form.periodo.trim()) return;
    saveManualCycle({
      periodo: form.periodo.trim(),
      qa_media: parseFloat(form.qa_media) || 0,
      iepc_media: parseFloat(form.iepc_media) || 0,
      total_ncs: parseInt(form.total_ncs) || 0,
      total_analistas: parseInt(form.total_analistas) || undefined,
      observacoes: form.observacoes.trim() || undefined,
    });
    reload();
    setShowForm(false);
    setEditingId(null);
    setForm({ periodo: '', qa_media: '', iepc_media: '', total_ncs: '', total_analistas: '', observacoes: '' });
  };

  const handleEdit = (entry: ManualCycleEntry) => {
    setForm({
      periodo: entry.periodo,
      qa_media: String(entry.qa_media),
      iepc_media: String(entry.iepc_media),
      total_ncs: String(entry.total_ncs),
      total_analistas: entry.total_analistas ? String(entry.total_analistas) : '',
      observacoes: entry.observacoes || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteManualCycle(id);
    reload();
  };

  const sortedEntries = useMemo(() =>
    [...(entries ?? [])].sort((a, b) => (a?.periodo ?? '').localeCompare(b?.periodo ?? '')),
    [entries]
  );

  return (
    <div style={cardStyle}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(167,139,250,0.12)' }}>
            <Calendar size={16} style={{ color: '#A78BFA' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Ciclos Anteriores (Entrada Manual)
            </h2>
            <p className="text-xs" style={{ color: '#8B949E' }}>
              Registre médias de QA, IEPC e NCs de ciclos antes do site existir
            </p>
          </div>
        </div>
        <button
          onClick={() => { setForm({ periodo: '', qa_media: '', iepc_media: '', total_ncs: '', total_analistas: '', observacoes: '' }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ backgroundColor: '#1E40AF' }}>
          <Plus size={13} />
          Adicionar Ciclo
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 className="text-sm font-semibold text-white mb-3">
            {editingId ? 'Editar Ciclo' : 'Novo Ciclo Anterior'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Período * (MM/AAAA)</label>
              <input
                type="text"
                placeholder="Ex: 02/2026"
                value={form.periodo}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Média QA (0-100)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ex: 78.5"
                value={form.qa_media}
                onChange={(e) => setForm({ ...form, qa_media: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Média IEPC (0-100)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ex: 76.2"
                value={form.iepc_media}
                onChange={(e) => setForm({ ...form, iepc_media: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Total de NCs</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 12"
                value={form.total_ncs}
                onChange={(e) => setForm({ ...form, total_ncs: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Nº de Analistas</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 18"
                value={form.total_analistas}
                onChange={(e) => setForm({ ...form, total_analistas: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#8B949E' }}>Observações</label>
              <input
                type="text"
                placeholder="Opcional"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.periodo.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E40AF' }}>
              <Save size={12} />
              {editingId ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {sortedEntries.length === 0 ? (
        <div className="text-center py-8">
          <BarChart2 size={28} className="mx-auto mb-2" style={{ color: '#30363D' }} />
          <p className="text-sm" style={{ color: '#8B949E' }}>
            Nenhum ciclo anterior registrado. Clique em "Adicionar Ciclo" para inserir dados históricos.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Período', 'Média QA', 'Média IEPC', 'Total NCs', 'Analistas', 'Observações', ''].map((h) => (
                  <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="py-2.5 px-2 font-semibold text-white">{entry?.periodo ?? '—'}</td>
                  <td className="py-2.5 px-2 font-bold" style={{ color: getScoreColor(entry?.qa_media ?? 0) }}>
                    {(entry?.qa_media ?? 0).toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2 font-bold" style={{ color: getScoreColor(entry?.iepc_media ?? 0) }}>
                    {(entry?.iepc_media ?? 0).toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2" style={{ color: (entry?.total_ncs ?? 0) > 0 ? '#EF4444' : '#22C55E' }}>
                    {entry?.total_ncs ?? 0}
                  </td>
                  <td className="py-2.5 px-2" style={{ color: '#C9D1D9' }}>
                    {entry?.total_analistas ?? '—'}
                  </td>
                  <td className="py-2.5 px-2 max-w-xs truncate" style={{ color: '#8B949E' }}>
                    {entry?.observacoes || '—'}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(entry)}
                        className="p-1 rounded hover:bg-white/10" style={{ color: '#8B949E' }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(entry.id)}
                        className="p-1 rounded hover:bg-red-500/10" style={{ color: '#8B949E' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#8B949E'; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Backup Panel ─────────────────────────────────────────────────────────────

function BackupPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [clearingAll, setClearingAll] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'confirm' | 'success' | 'error'>('idle');
  const [clearMsg, setClearMsg] = useState('');

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFullBackup(file);
    if (result.success) {
      setRestoreStatus('success');
      setRestoreMsg('Backup restaurado com sucesso! Recarregue a página para ver os dados.');
    } else {
      setRestoreStatus('error');
      setRestoreMsg(result.error || 'Erro ao restaurar backup.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    setClearStatus('idle');
    try {
      // Clear localStorage
      deleteAllData();
      // Clear Supabase
      const result = await clearAllDataFromSupabase();
      if (result.success) {
        setClearStatus('success');
        setClearMsg('Todos os dados importados foram removidos. Você pode iniciar novas importações do zero.');
      } else {
        // localStorage cleared but Supabase had an error — still partial success
        setClearStatus('success');
        setClearMsg('Dados locais removidos. ' + (result.error ? `Aviso Supabase: ${result.error}` : 'Supabase também limpo.'));
      }
    } catch (err: any) {
      setClearStatus('error');
      setClearMsg(err?.message || 'Erro ao limpar dados.');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div style={cardStyle}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'rgba(96,165,250,0.12)' }}>
          <Database size={16} style={{ color: '#60A5FA' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Backup e Restauração de Dados
          </h2>
          <p className="text-xs" style={{ color: '#8B949E' }}>
            Exporte todos os dados para um arquivo JSON e restaure quando necessário
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Download size={14} style={{ color: '#22C55E' }} />
            <h3 className="text-sm font-semibold text-white">Exportar Backup</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B949E' }}>
            Baixa um arquivo <code className="text-green-400">.json</code> com todos os dados: analistas, ciclos, NCs, elogios, ciclos manuais e configurações.
          </p>
          <button
            onClick={exportFullBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white w-full justify-center transition-all"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }}>
            <Download size={14} />
            Baixar Backup Completo
          </button>
        </div>

        {/* Restore */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Upload size={14} style={{ color: '#60A5FA' }} />
            <h3 className="text-sm font-semibold text-white">Restaurar Backup</h3>
          </div>
          <p className="text-xs mb-3" style={{ color: '#8B949E' }}>
            Selecione um arquivo <code className="text-blue-400">.json</code> de backup exportado anteriormente para restaurar todos os dados.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition-all"
            style={{ backgroundColor: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#60A5FA' }}>
            <Upload size={14} />
            Selecionar Arquivo de Backup
          </button>
        </div>
      </div>

      {restoreStatus !== 'idle' && (
        <div className="mt-3 p-3 rounded-lg"
          style={{
            backgroundColor: restoreStatus === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${restoreStatus === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
          <p className="text-xs" style={{ color: restoreStatus === 'success' ? '#22C55E' : '#EF4444' }}>
            {restoreMsg}
          </p>
          {restoreStatus === 'success' && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: '#1E40AF' }}>
              Recarregar Página
            </button>
          )}
        </div>
      )}

      {/* Clear All Data */}
      <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={14} style={{ color: '#EF4444' }} />
          <h3 className="text-sm font-semibold text-white">Limpar Todos os Dados Importados</h3>
        </div>
        <p className="text-xs mb-3" style={{ color: '#8B949E' }}>
          Remove <strong className="text-white">todos</strong> os ciclos, pontuações, NCs e elogios importados — tanto do armazenamento local quanto do Supabase. Use para começar importações do zero.
        </p>

        {clearStatus === 'idle' && (
          <button
            onClick={() => setClearStatus('confirm')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition-all"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}>
            <Trash2 size={14} />
            Limpar Todos os Dados
          </button>
        )}

        {clearStatus === 'confirm' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-xs font-semibold" style={{ color: '#FCA5A5' }}>
                ⚠️ ATENÇÃO: Esta ação é irreversível. Todos os dados de ciclos, pontuações QA, NCs e elogios serão permanentemente excluídos. Faça um backup antes de continuar.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setClearStatus('idle')}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#DC2626' }}>
                {clearingAll ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {clearingAll ? 'Limpando...' : 'Confirmar e Limpar Tudo'}
              </button>
            </div>
          </div>
        )}

        {clearStatus === 'success' && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-xs" style={{ color: '#22C55E' }}>✅ {clearMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: '#1E40AF' }}>
              Recarregar Página
            </button>
          </div>
        )}

        {clearStatus === 'error' && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs" style={{ color: '#EF4444' }}>❌ {clearMsg}</p>
            <button
              onClick={() => setClearStatus('idle')}
              className="mt-2 px-3 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
        <p className="text-xs" style={{ color: '#EAB308' }}>
          💡 <strong>Dica:</strong> Faça backup regularmente antes de importar novos dados ou ao final de cada ciclo. O arquivo JSON pode ser armazenado em qualquer lugar (Google Drive, e-mail, etc.) e restaurado a qualquer momento.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'analistas' | 'ciclos-anteriores' | 'backup';

export default function GestaoPage() {
  return (
    <EnterpriseLayout requireAdmin>
      <GestaoContent />
    </EnterpriseLayout>
  );
}

function GestaoContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analistas');
  const [profiles, setProfiles] = useState<AnalystProfile[]>([]);
  const [analistasDB, setAnalistasDB] = useState<AnalistaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [historyProfile, setHistoryProfile] = useState<AnalystProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDeleteDataModal, setShowDeleteDataModal] = useState(false);
  const [importingAnalistas, setImportingAnalistas] = useState(false);
  const [importAnalistasResult, setImportAnalistasResult] = useState<{ success: number; errors: string[] } | null>(null);
  const importAnalistasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setProfiles(fetchAnalystProfiles() ?? []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
    // Also load from Supabase analistas table
    fetchAnalistas().then(setAnalistasDB).catch(() => {});
  }, []);

  const reload = () => {
    try {
      setProfiles(fetchAnalystProfiles() ?? []);
    } catch {
      setProfiles([]);
    }
    fetchAnalistas().then(setAnalistasDB).catch(() => {});
  };

  const handleImportAnalistasCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingAnalistas(true);
    setImportAnalistasResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) { setImportAnalistasResult({ success: 0, errors: ['Arquivo vazio ou sem dados'] }); return; }
      const headers = lines[0].split(',').map((h) => h.replace(/^\uFEFF/, '').trim().replace(/"/g, ''));
      const getCol = (row: string[], ...keys: string[]) => {
        for (const k of keys) {
          const idx = headers.findIndex((h) => h.toLowerCase().includes(k.toLowerCase()));
          if (idx >= 0) return row[idx]?.replace(/"/g, '').trim() || '';
        }
        return '';
      };
      let success = 0;
      const errors: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        const nome = getCol(row, 'nome', 'name');
        if (!nome) continue;
        const email = getCol(row, 'email');
        const squad = getCol(row, 'squad', 'equipe', 'team');
        const coordenador = getCol(row, 'coordenador', 'coordinator', 'gestor');
        const cargo = getCol(row, 'cargo', 'role', 'função', 'funcao');
        const nivel = getCol(row, 'nivel', 'nível', 'level');
        const dataAdmissaoRaw = getCol(row, 'admissão', 'admissao', 'admission', 'data admissão', 'data_admissao');
        const ultimaPromocaoRaw = getCol(row, 'promoção', 'promocao', 'promotion', 'última promoção');
        const aniversarioRaw = getCol(row, 'aniversário', 'aniversario', 'birthday', 'nascimento');
        // Parse date
        const parseDate = (raw: string): string | undefined => {
          if (!raw) return undefined;
          // Try DD/MM/YYYY
          const parts = raw.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          // Try YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
          return undefined;
        };
        const dataAdmissao = parseDate(dataAdmissaoRaw);
        const tempoEmpresa = dataAdmissao ? calcTempoEmpresa(dataAdmissao) : { texto: '', meses: 0 };
        const analista: Omit<AnalistaRecord, 'id' | 'created_at' | 'updated_at'> = {
          nome,
          email: email || undefined,
          squad: squad || undefined,
          equipe: squad || undefined,
          coordenador: coordenador || undefined,
          cargo_operacional: cargo || 'Analista',
          nivel: nivel || 'Junior',
          status: 'ativo',
          aniversario: parseDate(aniversarioRaw) || undefined,
          tempo_empresa: tempoEmpresa.texto || undefined,
          tempo_empresa_calculado: tempoEmpresa.texto || undefined,
          tempo_empresa_meses: tempoEmpresa.meses || 0,
          ultima_promocao: parseDate(ultimaPromocaoRaw) || undefined,
          data_admissao: dataAdmissao || undefined,
        };
        const result = await upsertAnalista(analista);
        if (result.success) { success++; }
        else { errors.push(`${nome}: ${result.error}`); }
      }
      setImportAnalistasResult({ success, errors });
      reload();
    } catch (err: any) {
      setImportAnalistasResult({ success: 0, errors: [err.message] });
    } finally {
      setImportingAnalistas(false);
      if (importAnalistasRef.current) importAnalistasRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!form.nome.trim() || !form.coordenador.trim() || !form.equipe.trim()) return;
    if (editingId) {
      updateAnalystProfile(editingId, form);
    } else {
      saveAnalystProfile(form);
    }
    reload();
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleEdit = (profile: AnalystProfile) => {
    setForm({
      nome: profile?.nome ?? '',
      cargo: profile?.cargo ?? 'Analista',
      nivel: profile?.nivel ?? 'Júnior',
      coordenador: profile?.coordenador ?? '',
      equipe: profile?.equipe ?? '',
      tempo_empresa_meses: profile?.tempo_empresa_meses ?? 0,
      data_admissao: profile?.data_admissao || '',
      ativo: profile?.ativo ?? true,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteAnalystProfile(id);
    reload();
  };

  const filtered = useMemo(() => {
    return (profiles ?? []).filter((p) => {
      if (!p) return false;
      const matchSearch = !searchTerm || (p.nome ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.coordenador ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEquipe = !filterEquipe || p.equipe === filterEquipe;
      return matchSearch && matchEquipe;
    });
  }, [profiles, searchTerm, filterEquipe]);

  const stats = useMemo(() => ({
    total: (profiles ?? []).length,
    ativos: (profiles ?? []).filter((p) => p?.ativo).length,
    equipes: new Set((profiles ?? []).map((p) => p?.equipe).filter(Boolean)).size,
  }), [profiles]);

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'analistas', label: 'Analistas', icon: <Users size={14} /> },
    { id: 'ciclos-anteriores', label: 'Ciclos Anteriores', icon: <Calendar size={14} /> },
    { id: 'backup', label: 'Backup & Restauração', icon: <Database size={14} /> },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Gestão
              </h1>
              <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
                Analistas, ciclos históricos e backup de dados
              </p>
            </div>
            {activeTab === 'analistas' && (
              <div className="flex items-center gap-2">
                <input ref={importAnalistasRef} type="file" accept=".csv" className="hidden" onChange={handleImportAnalistasCSV} />
                <button
                  onClick={() => importAnalistasRef.current?.click()}
                  disabled={importingAnalistas}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }}>
                  <Upload size={14} />
                  {importingAnalistas ? 'Importando...' : 'Importar CSV'}
                </button>
                <button
                  onClick={() => setShowDeleteDataModal(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <UserMinus size={14} />
                  Excluir Analista Importado
                </button>
                <button
                  onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ backgroundColor: '#1E40AF' }}>
                  <Plus size={15} />
                  Novo Analista
                </button>
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#8B949E',
                }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Analistas */}
          {activeTab === 'analistas' && (
            <>
              {/* Import result */}
              {importAnalistasResult && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: importAnalistasResult.errors.length > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(34,197,94,0.06)', border: `1px solid ${importAnalistasResult.errors.length > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        ✅ {importAnalistasResult.success} analistas importados com sucesso
                        {importAnalistasResult.errors.length > 0 && ` · ⚠️ ${importAnalistasResult.errors.length} erros`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Tempo de empresa calculado automaticamente a partir da data de admissão</p>
                      {importAnalistasResult.errors.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {importAnalistasResult.errors.slice(0, 5).map((e, i) => <li key={i} className="text-xs" style={{ color: '#F59E0B' }}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                    <button onClick={() => setImportAnalistasResult(null)} className="p-1 rounded hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={14} /></button>
                  </div>
                </div>
              )}
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total de Analistas', value: stats.total, icon: <Users size={16} />, color: '#60A5FA' },
                  { label: 'Analistas Ativos', value: stats.ativos, icon: <User size={16} />, color: '#22C55E' },
                  { label: 'Equipes', value: stats.equipes, icon: <Shield size={16} />, color: '#A78BFA' },
                ].map((s) => (
                  <div key={s.label} style={cardStyle} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${s.color}18` }}>
                      <span style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{s.value}</p>
                      <p className="text-xs" style={{ color: '#8B949E' }}>{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  placeholder="Buscar por nome ou coordenador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, maxWidth: 280 }}
                />
                <select
                  value={filterEquipe}
                  onChange={(e) => setFilterEquipe(e.target.value)}
                  style={{ ...selectStyle, maxWidth: 200 }}
                >
                  <option value="">Todas as equipes</option>
                  {EQUIPE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              {/* Loading state */}
              {loading ? (
                <div style={cardStyle} className="text-center py-12">
                  <RefreshCw size={28} className="mx-auto mb-3 animate-spin" style={{ color: '#60A5FA' }} />
                  <p className="text-sm" style={{ color: '#8B949E' }}>Carregando analistas...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div style={cardStyle} className="text-center py-12">
                  <Users size={36} className="mx-auto mb-3" style={{ color: '#30363D' }} />
                  <p className="text-sm font-medium text-white mb-1">Nenhum analista cadastrado</p>
                  <p className="text-xs" style={{ color: '#8B949E' }}>
                    Clique em "Novo Analista" para começar a cadastrar os membros da equipe.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((profile) => {
                    if (!profile) return null;
                    const history = getAnalystHistory(profile?.nome ?? '');
                    const scores = history?.scores ?? [];
                    const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
                    const isExpanded = expandedId === profile.id;

                    return (
                      <div key={profile.id} style={cardStyle} className="transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: profile?.ativo ? '#1E40AF' : '#374151' }}>
                            {(profile?.nome ?? 'AN').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{profile?.nome ?? '—'}</span>
                              {!profile?.ativo && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                              {profile?.cargo ?? '—'} · {profile?.nivel ?? '—'} · {squadToString(profile?.equipe)} · Coord: {profile?.coordenador ?? '—'}
                            </p>
                          </div>
                          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0" style={{ color: '#8B949E' }}>
                            <Clock size={12} />
                            <span className="text-xs">{tempoEmpresaLabel(profile?.tempo_empresa_meses ?? 0)}</span>
                          </div>
                          {lastScore && (
                            <div className="hidden md:block text-right flex-shrink-0">
                              <p className="text-xs font-bold" style={{ color: getScoreColor(lastScore?.nota_final_qa ?? 0) }}>
                                QA {(lastScore?.nota_final_qa ?? 0).toFixed(1)}
                              </p>
                              <p className="text-xs" style={{ color: '#8B949E' }}>{lastScore?.periodo ?? '—'}</p>
                            </div>
                          )}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            {(history?.elogios ?? []).length > 0 && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(234,179,8,0.12)', color: '#EAB308' }}>
                                <Star size={10} />
                                {(history?.elogios ?? []).length}
                              </span>
                            )}
                            {(history?.ncs ?? []).length > 0 && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                                <AlertTriangle size={10} />
                                {(history?.ncs ?? []).length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setHistoryProfile(profile)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ backgroundColor: 'rgba(43,79,129,0.2)', color: '#60A5FA', border: '1px solid rgba(43,79,129,0.3)' }}>
                              Histórico
                            </button>
                            <button onClick={() => handleEdit(profile)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button
                              onClick={() => handleDelete(profile.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                              style={{ color: '#8B949E' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#8B949E'; }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {[
                              { label: 'Cargo', value: profile?.cargo ?? '—' },
                              { label: 'Nível', value: profile?.nivel ?? '—' },
                              { label: 'Coordenador', value: profile?.coordenador ?? '—' },
                              { label: 'Equipe', value: squadToString(profile?.equipe) },
                              { label: 'Tempo de Empresa', value: tempoEmpresaLabel(profile?.tempo_empresa_meses ?? 0) },
                              { label: 'Data de Admissão', value: profile?.data_admissao || '—' },
                              { label: 'Ciclos Avaliados', value: String(scores.length) },
                              { label: 'Status', value: profile?.ativo ? 'Ativo' : 'Inativo' },
                            ].map((item) => (
                              <div key={item.label}>
                                <p className="text-xs font-medium mb-0.5" style={{ color: '#8B949E' }}>{item.label}</p>
                                <p className="text-sm text-white">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tab: Ciclos Anteriores */}
          {activeTab === 'ciclos-anteriores' && <ManualCyclesPanel />}

          {/* Tab: Backup */}
          {activeTab === 'backup' && <BackupPanel />}
        </div>
      </main>

      {/* Analyst Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
            style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {editingId ? 'Editar Analista' : 'Novo Analista'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>Preencha os dados do analista</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nome Completo *</label>
                <input type="text" placeholder="Nome do analista" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Cargo *</label>
                  <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} style={selectStyle}>
                    {CARGO_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nível *</label>
                  <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} style={selectStyle}>
                    {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Coordenador *</label>
                  <input type="text" placeholder="Nome do coordenador" value={form.coordenador}
                    onChange={(e) => setForm({ ...form, coordenador: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Equipe *</label>
                  <select value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} style={selectStyle}>
                    <option value="">Selecione...</option>
                    {EQUIPE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Tempo de Empresa (meses)</label>
                  <input type="number" min={0} placeholder="Ex: 24" value={form.tempo_empresa_meses || ''}
                    onChange={(e) => setForm({ ...form, tempo_empresa_meses: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Data de Admissão</label>
                  <input type="date" value={form.data_admissao}
                    onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>Status</label>
                <button
                  onClick={() => setForm({ ...form, ativo: !form.ativo })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: form.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                    color: form.ativo ? '#22C55E' : '#EF4444',
                    border: `1px solid ${form.ativo ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  {form.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancelar
                </button>
                <button onClick={handleSave}
                  disabled={!form.nome.trim() || !form.coordenador.trim() || !form.equipe.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#1E40AF' }}>
                  <Save size={14} />
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Analista'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {historyProfile && (
        <AnalystHistoryPanel profile={historyProfile} onClose={() => setHistoryProfile(null)} />
      )}

      {/* Delete Analyst Data Modal */}
      {showDeleteDataModal && (
        <DeleteAnalystDataModal
          onClose={() => setShowDeleteDataModal(false)}
          onDeleted={() => {
            window.dispatchEvent(new Event('zetti_import_done'));
          }}
        />
      )}
    </div>
  );
}
