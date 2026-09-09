'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchCycleScores, fetchNCRecords, fetchElogios } from '@/lib/services/dataService';
import { getActiveCycle } from '@/lib/services/supabaseDataService';
import { createClient } from '@/lib/supabase/client';
import {
  ClipboardCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Star,
  Users,
  Activity,
  BarChart2,
  Target,
} from 'lucide-react';

interface AnalystAuditData {
  analista: string;
  squad: string;
  coordenador: string;
  avaliacoes: number;
  qa_medio: number | null;
  iepc_medio: number | null;
  ncs: number;
  elogios: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  ultima_atualizacao: string | null;
}

function getAuditStatus(avaliacoes: number): {
  label: string;
  color: string;
  status: AnalystAuditData['status'];
} {
  if (avaliacoes === 0) return { label: 'Pendente', color: '#EF4444', status: 'pendente' };
  if (avaliacoes < 3) return { label: 'Em Andamento', color: '#F59E0B', status: 'em_andamento' };
  return { label: 'Concluído', color: '#22C55E', status: 'concluido' };
}

function AuditoriaContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState<
    'analista' | 'squad' | 'avaliacoes' | 'qa_medio' | 'iepc_medio' | 'ncs' | 'elogios' | 'status'
  >('analista');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [analystData, setAnalystData] = useState<AnalystAuditData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriodo, setCurrentPeriodo] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const activeCycle = await getActiveCycle();
      const periodo = activeCycle || '';
      if (periodo) setCurrentPeriodo(periodo);

      // Fetch all data in parallel
      const [scores, ncs, elogios] = await Promise.all([
        fetchCycleScores(periodo || undefined),
        fetchNCRecords(periodo || undefined),
        fetchElogios(periodo || undefined),
      ]);

      // Also fetch feedbacks for last update time
      const feedbackMap: Record<string, string> = {};
      try {
        const { data: feedbacks } = await supabase
          .from('feedbacks')
          .select('id, ciclo, updated_at, analistas(nome)')
          .eq('ciclo', periodo);
        if (feedbacks) {
          feedbacks.forEach((f: any) => {
            const nome = f.analistas?.nome;
            if (nome && f.updated_at) {
              if (!feedbackMap[nome] || f.updated_at > feedbackMap[nome]) {
                feedbackMap[nome] = f.updated_at;
              }
            }
          });
        }
      } catch {
        /* ignore */
      }

      // Build analyst map from cycle scores
      const analystMap: Record<string, AnalystAuditData> = {};

      scores.forEach((s: any) => {
        const key = s.analista;
        if (!analystMap[key]) {
          analystMap[key] = {
            analista: s.analista,
            squad: s.squad || '',
            coordenador: s.coordenador || '',
            avaliacoes: 0,
            qa_medio: null,
            iepc_medio: null,
            ncs: 0,
            elogios: 0,
            status: 'pendente',
            ultima_atualizacao: feedbackMap[key] || null,
          };
        }
        analystMap[key].avaliacoes += s.total_avaliacoes || 1;
        if (s.qa_score != null) {
          const prev = analystMap[key].qa_medio;
          analystMap[key].qa_medio =
            prev == null ? s.qa_score : Math.round((prev + s.qa_score) / 2);
        }
        if (s.iepc_score != null) {
          const prev = analystMap[key].iepc_medio;
          analystMap[key].iepc_medio =
            prev == null ? s.iepc_score : Math.round((prev + s.iepc_score) / 2);
        }
      });

      // Count NCs per analyst
      ncs.forEach((nc: any) => {
        const key = nc.colaborador || nc.analista;
        if (key && analystMap[key]) {
          analystMap[key].ncs++;
        }
      });

      // Count elogios per analyst
      elogios.forEach((e: any) => {
        const key = e.colaborador || e.analista;
        if (key && analystMap[key]) {
          analystMap[key].elogios++;
        }
      });

      // Set status based on avaliacoes
      Object.values(analystMap).forEach((a) => {
        const s = getAuditStatus(a.avaliacoes);
        a.status = s.status;
      });

      setAnalystData(Object.values(analystMap));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Auditoria load error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    window.addEventListener('zetti_active_cycle_changed', handler);
    return () => {
      window.removeEventListener('zetti_import_done', handler);
      window.removeEventListener('zetti_active_cycle_changed', handler);
    };
  }, [loadData]);

  const squads = useMemo(
    () => ['all', ...Array.from(new Set(analystData.map((a) => a.squad).filter(Boolean)))],
    [analystData]
  );

  const filtered = useMemo(() => {
    let list = analystData;
    if (filterSquad !== 'all') list = list.filter((a) => a.squad === filterSquad);
    if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus);
    return [...list].sort((a, b) => {
      let va: any = a.analista,
        vb: any = b.analista;
      if (sortField === 'squad') {
        va = a.squad;
        vb = b.squad;
      }
      if (sortField === 'avaliacoes') {
        va = a.avaliacoes;
        vb = b.avaliacoes;
      }
      if (sortField === 'qa_medio') {
        va = a.qa_medio ?? -1;
        vb = b.qa_medio ?? -1;
      }
      if (sortField === 'iepc_medio') {
        va = a.iepc_medio ?? -1;
        vb = b.iepc_medio ?? -1;
      }
      if (sortField === 'ncs') {
        va = a.ncs;
        vb = b.ncs;
      }
      if (sortField === 'elogios') {
        va = a.elogios;
        vb = b.elogios;
      }
      if (sortField === 'status') {
        va = a.status;
        vb = b.status;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [analystData, filterSquad, filterStatus, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = analystData.length;
    const done = analystData.filter((a) => a.status === 'concluido').length;
    const inProgress = analystData.filter((a) => a.status === 'em_andamento').length;
    const pending = analystData.filter((a) => a.status === 'pendente').length;
    const totalAvaliacoes = analystData.reduce((s, a) => s + a.avaliacoes, 0);
    const totalNCs = analystData.reduce((s, a) => s + a.ncs, 0);
    const totalElogios = analystData.reduce((s, a) => s + a.elogios, 0);
    const avgQA =
      analystData.filter((a) => a.qa_medio != null).length > 0
        ? Math.round(
            analystData
              .filter((a) => a.qa_medio != null)
              .reduce((s, a) => s + (a.qa_medio || 0), 0) /
              analystData.filter((a) => a.qa_medio != null).length
          )
        : null;
    return {
      total,
      done,
      inProgress,
      pending,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      totalAvaliacoes,
      totalNCs,
      totalElogios,
      avgQA,
    };
  }, [analystData]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortDir === 'asc' ? (
        <ChevronUp size={12} />
      ) : (
        <ChevronDown size={12} />
      )
    ) : null;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Auditoria</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Central operacional de auditoria de qualidade · Ciclo {currentPeriodo || '—'}
            {lastRefresh && (
              <span className="ml-2 text-xs" style={{ color: '#64748B' }}>
                · Atualizado{' '}
                {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            Importar Dados
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
            title="Atualizar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {[
          {
            label: 'Analistas',
            value: stats.total,
            icon: <Users size={14} />,
            color: '#38BDF8',
            bg: 'rgba(56,189,248,0.08)',
          },
          {
            label: 'Avaliações',
            value: stats.totalAvaliacoes,
            icon: <ClipboardCheck size={14} />,
            color: '#A78BFA',
            bg: 'rgba(167,139,250,0.08)',
          },
          {
            label: 'Auditados',
            value: stats.done,
            icon: <CheckCircle size={14} />,
            color: '#22C55E',
            bg: 'rgba(34,197,94,0.08)',
          },
          {
            label: 'Em Andamento',
            value: stats.inProgress,
            icon: <Clock size={14} />,
            color: '#F59E0B',
            bg: 'rgba(245,158,11,0.08)',
          },
          {
            label: 'Pendentes',
            value: stats.pending,
            icon: <AlertCircle size={14} />,
            color: '#EF4444',
            bg: 'rgba(239,68,68,0.08)',
          },
          {
            label: 'NCs Registradas',
            value: stats.totalNCs,
            icon: <AlertTriangle size={14} />,
            color: '#FB923C',
            bg: 'rgba(251,146,60,0.08)',
          },
          {
            label: 'Elogios',
            value: stats.totalElogios,
            icon: <Star size={14} />,
            color: '#F59E0B',
            bg: 'rgba(245,158,11,0.08)',
          },
          {
            label: 'QA Médio',
            value: stats.avgQA != null ? `${stats.avgQA}` : '—',
            icon: <BarChart2 size={14} />,
            color: '#2DD4BF',
            bg: 'rgba(45,212,191,0.08)',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium leading-tight" style={{ color: '#94A3B8' }}>
                {s.label}
              </span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: s.bg, color: s.color }}
              >
                {s.icon}
              </div>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} style={{ color: '#38BDF8' }} />
            <span className="text-sm font-semibold text-white">
              Progresso do Ciclo {currentPeriodo}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              Status Operacional:
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor:
                  stats.pct >= 80
                    ? 'rgba(34,197,94,0.15)'
                    : stats.pct >= 50
                      ? 'rgba(245,158,11,0.15)'
                      : 'rgba(239,68,68,0.15)',
                color: stats.pct >= 80 ? '#22C55E' : stats.pct >= 50 ? '#F59E0B' : '#EF4444',
              }}
            >
              {stats.pct >= 80 ? '✓ Em dia' : stats.pct >= 50 ? '⚡ Em andamento' : '⚠ Atenção'}
            </span>
            <span className="text-sm font-bold" style={{ color: '#22C55E' }}>
              {stats.pct}%
            </span>
          </div>
        </div>
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${stats.pct}%`,
              background:
                stats.pct >= 80
                  ? 'linear-gradient(90deg, #22C55E, #2DD4BF)'
                  : stats.pct >= 50
                    ? 'linear-gradient(90deg, #F59E0B, #FB923C)'
                    : 'linear-gradient(90deg, #EF4444, #F59E0B)',
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            {stats.done} de {stats.total} analistas auditados
          </p>
          <div className="flex items-center gap-3 ml-auto">
            {[
              { label: 'Concluído', color: '#22C55E', count: stats.done },
              { label: 'Em Andamento', color: '#F59E0B', count: stats.inProgress },
              { label: 'Pendente', color: '#EF4444', count: stats.pending },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  {s.label}: <span className="text-white font-medium">{s.count}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterSquad}
          onChange={(e) => setFilterSquad(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {squads.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Todos os Squads' : s}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm text-white outline-none"
          style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <option value="all">Todos os Status</option>
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
        </select>
        <div className="ml-auto text-xs flex items-center gap-1.5" style={{ color: '#64748B' }}>
          <Target size={12} />
          {filtered.length} analista{filtered.length !== 1 ? 's' : ''} exibido
          {filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Operational Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-sm" style={{ color: '#94A3B8' }}>
              Carregando dados do ciclo...
            </span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                }}
              >
                {[
                  { label: 'Analista', field: 'analista' as const },
                  { label: 'Squad', field: 'squad' as const },
                  { label: 'Coordenador', field: null },
                  { label: 'Avaliações', field: 'avaliacoes' as const },
                  { label: 'QA Médio', field: 'qa_medio' as const },
                  { label: 'IEPC Médio', field: 'iepc_medio' as const },
                  { label: 'NCs', field: 'ncs' as const },
                  { label: 'Elogios', field: 'elogios' as const },
                  { label: 'Status', field: 'status' as const },
                  { label: 'Última Atualização', field: null },
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
                const statusInfo = getAuditStatus(entry.avaliacoes);
                return (
                  <tr
                    key={entry.analista}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-4 py-3 font-medium text-white">{entry.analista}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>
                      {entry.squad || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#94A3B8' }}>
                      {entry.coordenador || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{entry.avaliacoes}</span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.qa_medio != null ? (
                        <span
                          className="font-bold"
                          style={{
                            color:
                              entry.qa_medio >= 90
                                ? '#22C55E'
                                : entry.qa_medio >= 70
                                  ? '#F59E0B'
                                  : '#EF4444',
                          }}
                        >
                          {entry.qa_medio}
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.iepc_medio != null ? (
                        <span
                          className="font-bold"
                          style={{
                            color:
                              entry.iepc_medio >= 90
                                ? '#22C55E'
                                : entry.iepc_medio >= 70
                                  ? '#F59E0B'
                                  : '#EF4444',
                          }}
                        >
                          {entry.iepc_medio}%
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.ncs > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: 'rgba(251,146,60,0.12)', color: '#FB923C' }}
                        >
                          <AlertTriangle size={10} /> {entry.ncs}
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.elogios > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                        >
                          <Star size={10} /> {entry.elogios}
                        </span>
                      ) : (
                        <span style={{ color: '#64748B' }}>0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${statusInfo.color}15`,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#64748B' }}>
                      {formatDate(entry.ultima_atualizacao)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <ClipboardCheck size={32} className="mx-auto mb-3 opacity-20 text-white" />
                    <p className="text-sm text-white mb-1">Nenhum dado encontrado</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>
                      Importe dados do ciclo para visualizar a auditoria operacional.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
