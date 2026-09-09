'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import {
  fetchManualCycles,
  saveManualCycle,
  dispatchDataChanged,
} from '@/lib/services/dataService';
import { Clock, BarChart2, AlertTriangle, Pencil, Check, X } from 'lucide-react';

interface CycleRecord {
  id: string;
  label: string;
  periodo: string;
  status: 'encerrado' | 'ativo';
  analysts: number;
  avgQA: number;
  avgIEPC: number;
  totalNCs: number;
  totalElogios: number;
  isManual?: boolean;
}

const MANUAL_CYCLE_DEFAULTS: CycleRecord[] = [
  {
    id: 'cycle-jan-2026',
    label: 'JAN/2026',
    periodo: '01/2026',
    status: 'encerrado',
    analysts: 0,
    avgQA: 0,
    avgIEPC: 0,
    totalNCs: 0,
    totalElogios: 0,
    isManual: true,
  },
  {
    id: 'cycle-fev-2026',
    label: 'FEV/2026',
    periodo: '02/2026',
    status: 'encerrado',
    analysts: 0,
    avgQA: 0,
    avgIEPC: 0,
    totalNCs: 0,
    totalElogios: 0,
    isManual: true,
  },
  {
    id: 'cycle-mar-2026',
    label: 'MAR/2026',
    periodo: '03/2026',
    status: 'encerrado',
    analysts: 0,
    avgQA: 0,
    avgIEPC: 0,
    totalNCs: 0,
    totalElogios: 0,
    isManual: true,
  },
];

function HistoricoContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [cycles, setCycles] = useState<CycleRecord[]>(MANUAL_CYCLE_DEFAULTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CycleRecord>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCycles = async () => {
      setLoading(true);
      try {
        const saved = await fetchManualCycles();
        if (saved && saved.length > 0) {
          const merged = MANUAL_CYCLE_DEFAULTS.map((def) => {
            const found = saved.find((s: any) => s.id === def.id);
            return found ? { ...def, ...found } : def;
          });
          setCycles(merged);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    loadCycles();
  }, []);

  const startEdit = (cycle: CycleRecord) => {
    setEditingId(cycle.id);
    setEditValues({
      avgQA: cycle.avgQA,
      avgIEPC: cycle.avgIEPC,
      totalNCs: cycle.totalNCs,
      totalElogios: cycle.totalElogios,
      analysts: cycle.analysts,
    });
  };

  const saveEdit = async (cycle: CycleRecord) => {
    const updated = { ...cycle, ...editValues };
    setCycles((prev) => prev.map((c) => (c.id === cycle.id ? updated : c)));
    try {
      await saveManualCycle(updated);
      // saveManualCycle already dispatches zetti_data_changed, but dispatch explicitly for clarity
      dispatchDataChanged({ tipo: 'manual_cycle_edit', periodo: updated.periodo });
    } catch {
      /* ignore */
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const avgQA = useMemo(() => {
    const valid = cycles.filter((c) => c.avgQA > 0);
    return valid.length > 0 ? valid.reduce((s, c) => s + c.avgQA, 0) / valid.length : 0;
  }, [cycles]);

  const avgIEPC = useMemo(() => {
    const valid = cycles.filter((c) => c.avgIEPC > 0);
    return valid.length > 0 ? valid.reduce((s, c) => s + c.avgIEPC, 0) / valid.length : 0;
  }, [cycles]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Histórico de Ciclos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Registro histórico e evolução da operação
          </p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
          style={{ backgroundColor: '#1E40AF' }}
        >
          Importar
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Ciclos Registrados',
            value: cycles.length,
            color: '#38BDF8',
            icon: <Clock size={16} />,
          },
          {
            label: 'QA Médio Geral',
            value: `${avgQA.toFixed(1)}%`,
            color: '#22C55E',
            icon: <BarChart2 size={16} />,
          },
          {
            label: 'IEPC Médio Geral',
            value: `${avgIEPC.toFixed(1)}%`,
            color: '#06B6D4',
            icon: <BarChart2 size={16} />,
          },
          {
            label: 'Total NCs',
            value: cycles.reduce((s, c) => s + c.totalNCs, 0),
            color: '#EF4444',
            icon: <AlertTriangle size={16} />,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-5"
            style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                {s.label}
              </span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Cycles Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold text-white">Ciclos Históricos</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
            Clique no ícone de edição para atualizar dados manuais
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  'Ciclo',
                  'Status',
                  'Analistas',
                  'QA Médio',
                  'IEPC Médio',
                  'NCs',
                  'Elogios',
                  '',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold"
                    style={{ color: '#94A3B8' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => {
                const isEditing = editingId === cycle.id;
                return (
                  <tr
                    key={cycle.id}
                    className="hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <td className="px-4 py-3 font-semibold text-white">{cycle.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            cycle.status === 'ativo'
                              ? 'rgba(56,189,248,0.1)'
                              : 'rgba(148,163,184,0.1)',
                          color: cycle.status === 'ativo' ? '#38BDF8' : '#94A3B8',
                        }}
                      >
                        {cycle.status === 'ativo' ? 'Ativo' : 'Encerrado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.analysts ?? 0}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, analysts: Number(e.target.value) }))
                          }
                          className="w-16 px-2 py-1 rounded text-xs text-white outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#94A3B8' }}>{cycle.analysts}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editValues.avgQA ?? 0}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, avgQA: Number(e.target.value) }))
                          }
                          className="w-20 px-2 py-1 rounded text-xs text-white outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color:
                              cycle.avgQA >= 85
                                ? '#22C55E'
                                : cycle.avgQA >= 70
                                  ? '#F59E0B'
                                  : cycle.avgQA > 0
                                    ? '#EF4444'
                                    : '#94A3B8',
                          }}
                        >
                          {cycle.avgQA > 0 ? `${cycle.avgQA.toFixed(1)}%` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={editValues.avgIEPC ?? 0}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, avgIEPC: Number(e.target.value) }))
                          }
                          className="w-20 px-2 py-1 rounded text-xs text-white outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color:
                              cycle.avgIEPC >= 85
                                ? '#22C55E'
                                : cycle.avgIEPC >= 70
                                  ? '#F59E0B'
                                  : cycle.avgIEPC > 0
                                    ? '#EF4444'
                                    : '#94A3B8',
                          }}
                        >
                          {cycle.avgIEPC > 0 ? `${cycle.avgIEPC.toFixed(1)}%` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.totalNCs ?? 0}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, totalNCs: Number(e.target.value) }))
                          }
                          className="w-16 px-2 py-1 rounded text-xs text-white outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        />
                      ) : (
                        <span style={{ color: cycle.totalNCs > 10 ? '#EF4444' : '#94A3B8' }}>
                          {cycle.totalNCs}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.totalElogios ?? 0}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, totalElogios: Number(e.target.value) }))
                          }
                          className="w-16 px-2 py-1 rounded text-xs text-white outline-none"
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        />
                      ) : (
                        <span style={{ color: '#F59E0B' }}>{cycle.totalElogios}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => saveEdit(cycle)}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)' }}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        cycle.isManual && (
                          <button
                            onClick={() => startEdit(cycle)}
                            className="p-1.5 rounded transition-colors hover:bg-white/5"
                            style={{ color: '#94A3B8' }}
                          >
                            <Pencil size={12} />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <EnterpriseLayout>
      <HistoricoContent />
    </EnterpriseLayout>
  );
}
