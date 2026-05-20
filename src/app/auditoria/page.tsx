'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchCycleScores } from '@/lib/services/dataService';
import { ClipboardCheck, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, RefreshCw, GitMerge, UserMinus } from 'lucide-react';

const EMBEDDED_ANALYSTS = [
  { id: 'Fabiano Feliz', name: 'Fabiano Feliz', squad: 'Financeiro Fiscal', coordenador: 'Amanda Cristina' },
  { id: 'Jherik Jesus', name: 'Jherik Jesus', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Fabiano Teste', name: 'Fabiano Teste', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Thalisson Silva', name: 'Thalisson Silva', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Gabriel Vieira', name: 'Gabriel Vieira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Bruno Reis', name: 'Bruno Reis', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Fernando Carvalho', name: 'Fernando Carvalho', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Rafael Andrade', name: 'Rafael Andrade', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Milena Santos', name: 'Milena Santos', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Adriel Sanches', name: 'Adriel Sanches', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Giovanna Oliveira', name: 'Giovanna Oliveira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Danilo Cerqueira', name: 'Danilo Cerqueira', squad: 'Compras e Estoque', coordenador: 'Jonatas Jesus' },
  { id: 'Wyamar Milhomem', name: 'Wyamar Milhomem', squad: 'Financeiro Fiscal', coordenador: 'Amanda Cristina' },
  { id: 'Bruno Ribeiro', name: 'Bruno Ribeiro', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Francisco Pereira', name: 'Francisco Pereira', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Alair Filho', name: 'Alair Filho', squad: 'PDV', coordenador: 'Ayron Silva' },
  { id: 'Artur Carvalho', name: 'Artur Carvalho', squad: 'PDV N1', coordenador: 'Ayron Silva' },
  { id: 'Gustavo Moreira', name: 'Gustavo Moreira', squad: 'PDV', coordenador: 'Ayron Silva' },
];

const REMOVED_ANALYSTS_KEY = 'zetti_audit_removed_analysts';

interface AuditEntry {
  analystId: string;
  analystName: string;
  squad: string;
  coordenador: string;
  interactions: number;
}

function getAuditStatus(interactions: number): { label: string; color: string } {
  if (interactions === 0) return { label: 'Pendente', color: '#EF4444' };
  if (interactions < 5) return { label: 'Em andamento', color: '#F59E0B' };
  return { label: 'Concluído', color: '#22C55E' };
}

const STORAGE_KEY = 'zetti_audit_data';

function loadAuditData(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAuditData(data: Record<string, number>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadRemovedAnalysts(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REMOVED_ANALYSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRemovedAnalysts(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMOVED_ANALYSTS_KEY, JSON.stringify(ids));
}

function AuditoriaContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'squad' | 'interactions' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [interactions, setInteractions] = useState<Record<string, number>>(() => loadAuditData());
  const [analysts, setAnalysts] = useState<{ id: string; name: string; squad: string; coordenador: string }[]>([]);
  const [removedAnalysts, setRemovedAnalysts] = useState<string[]>(() => loadRemovedAnalysts());
  const [loading, setLoading] = useState(true);
  const [andamentoCount, setAndamentoCount] = useState(0);
  const [currentPeriodo] = useState('04/2026');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const loadAnalysts = async () => {
    setLoading(true);
    try {
      const scores = await fetchCycleScores();
      if (scores.length > 0) {
        const map: Record<string, { id: string; name: string; squad: string; coordenador: string }> = {};
        scores.forEach((s: any) => {
          if (!map[s.analista]) {
            map[s.analista] = { id: s.analista, name: s.analista, squad: s.squad || '', coordenador: s.coordenador || '' };
          }
        });
        setAnalysts(Object.values(map));
      } else {
        setAnalysts(EMBEDDED_ANALYSTS);
      }
    } catch {
      setAnalysts(EMBEDDED_ANALYSTS);
    }
    try {
      const key = `zetti_andamento_${currentPeriodo}`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      setAndamentoCount(data.length);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalysts();
    const handler = () => loadAnalysts();
    window.addEventListener('zetti_import_done', handler);
    window.addEventListener('zetti_andamento_update', handler);
    return () => {
      window.removeEventListener('zetti_import_done', handler);
      window.removeEventListener('zetti_andamento_update', handler);
    };
  }, []);

  const activeAnalysts = useMemo(() =>
    analysts.filter((a) => !removedAnalysts.includes(a.id)),
    [analysts, removedAnalysts]
  );

  const squads = useMemo(() => ['all', ...Array.from(new Set(activeAnalysts.map((a) => a.squad).filter(Boolean)))], [activeAnalysts]);

  const entries: AuditEntry[] = useMemo(() =>
    activeAnalysts.map((a) => ({
      analystId: a.id,
      analystName: a.name,
      squad: a.squad,
      coordenador: a.coordenador,
      interactions: interactions[a.id] || 0,
    })),
    [activeAnalysts, interactions]
  );

  const filtered = useMemo(() => {
    let list = entries;
    if (filterSquad !== 'all') list = list.filter((e) => e.squad === filterSquad);
    if (filterStatus !== 'all') {
      list = list.filter((e) => {
        const s = getAuditStatus(e.interactions).label;
        return filterStatus === 'pendente' ? s === 'Pendente' : filterStatus === 'andamento' ? s === 'Em andamento' : s === 'Concluído';
      });
    }
    return [...list].sort((a, b) => {
      let va: any = a.analystName, vb: any = b.analystName;
      if (sortField === 'squad') { va = a.squad; vb = b.squad; }
      if (sortField === 'interactions') { va = a.interactions; vb = b.interactions; }
      if (sortField === 'status') { va = getAuditStatus(a.interactions).label; vb = getAuditStatus(b.interactions).label; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [entries, filterSquad, filterStatus, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = entries.length;
    const done = entries.filter((e) => getAuditStatus(e.interactions).label === 'Concluído').length;
    const inProgress = entries.filter((e) => getAuditStatus(e.interactions).label === 'Em andamento').length;
    const pending = entries.filter((e) => getAuditStatus(e.interactions).label === 'Pendente').length;
    return { total, done, inProgress, pending, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [entries]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const updateInteractions = (id: string, delta: number) => {
    setInteractions((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
      saveAuditData(next);
      return next;
    });
  };

  const handleRemoveAnalyst = (id: string) => {
    setConfirmRemoveId(id);
  };

  const confirmRemove = () => {
    if (!confirmRemoveId) return;
    const updated = [...removedAnalysts, confirmRemoveId];
    setRemovedAnalysts(updated);
    saveRemovedAnalysts(updated);
    setConfirmRemoveId(null);
  };

  const handleRestoreAll = () => {
    setRemovedAnalysts([]);
    saveRemovedAnalysts([]);
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const analystToRemove = analysts.find((a) => a.id === confirmRemoveId);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Auditoria</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Central operacional de auditoria de qualidade · Ciclo {currentPeriodo}</p>
        </div>
        <div className="flex items-center gap-2">
          {removedAnalysts.length > 0 && (
            <button
              onClick={handleRestoreAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              Restaurar {removedAnalysts.length} removido{removedAnalysts.length !== 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}>
            Importar Por Andamento
          </button>
          <button onClick={loadAnalysts} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Por Andamento Banner */}
      {andamentoCount > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(8,145,178,0.15)' }}>
            <GitMerge size={14} style={{ color: '#0891B2' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Importação Por Andamento ativa</p>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{andamentoCount} avaliações acumuladas no ciclo {currentPeriodo}. Continue importando conforme as auditorias são realizadas.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Analistas', value: stats.total, icon: <ClipboardCheck size={16} />, color: '#38BDF8' },
          { label: 'Concluídos', value: stats.done, icon: <CheckCircle size={16} />, color: '#22C55E' },
          { label: 'Em Andamento', value: stats.inProgress, icon: <Clock size={16} />, color: '#F59E0B' },
          { label: 'Pendentes', value: stats.pending, icon: <AlertCircle size={16} />, color: '#EF4444' },
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

      {/* Progress */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">Progresso Geral</span>
          <span className="text-sm font-bold" style={{ color: '#22C55E' }}>{stats.pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: '#22C55E' }} />
        </div>
        <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>{stats.done} de {stats.total} analistas auditados{removedAnalysts.length > 0 ? ` · ${removedAnalysts.length} removido(s) da lista` : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterSquad}
          onChange={(e) => setFilterSquad(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <option value="all">Todos os Status</option>
          <option value="pendente">Pendente</option>
          <option value="andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { label: 'Analista', field: 'name' as const },
                  { label: 'Squad', field: 'squad' as const },
                  { label: 'Coordenador', field: null },
                  { label: 'Interações', field: 'interactions' as const },
                  { label: 'Status', field: 'status' as const },
                  { label: 'Ações', field: null },
                ].map((col) => (
                  <th
                    key={col.label}
                    className="text-left px-4 py-3 text-xs font-semibold cursor-pointer select-none"
                    style={{ color: '#94A3B8' }}
                    onClick={() => col.field && handleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const status = getAuditStatus(entry.interactions);
                return (
                  <tr key={entry.analystId} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td className="px-4 py-3 font-medium text-white">{entry.analystName}</td>
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{entry.squad}</td>
                    <td className="px-4 py-3" style={{ color: '#94A3B8' }}>{entry.coordenador || '—'}</td>
                    <td className="px-4 py-3 text-white">{entry.interactions}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateInteractions(entry.analystId, 1)} className="px-2 py-1 rounded text-xs font-medium transition-colors" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>+1</button>
                        <button onClick={() => updateInteractions(entry.analystId, -1)} className="px-2 py-1 rounded text-xs font-medium transition-colors" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>-1</button>
                        <button
                          onClick={() => handleRemoveAnalyst(entry.analystId)}
                          title="Remover da lista de auditoria"
                          className="p-1.5 rounded transition-colors hover:bg-red-500/10"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs" style={{ color: '#94A3B8' }}>
                    Nenhum analista encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Remove Dialog */}
      {confirmRemoveId && analystToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
                  <UserMinus size={18} style={{ color: '#EF4444' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Remover da Auditoria</h3>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>Esta ação pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-white mb-1">
                Remover <strong>{analystToRemove.name}</strong> da lista de auditoria?
              </p>
              <p className="text-xs mb-5" style={{ color: '#94A3B8' }}>
                O analista será ocultado da lista. Você pode restaurar todos os removidos usando o botão "Restaurar" no topo da página.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRemoveId(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRemove}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <EnterpriseLayout>
      <AuditoriaContent />
    </EnterpriseLayout>
  );
}
