'use client';
import React, { useState, useEffect, useCallback } from 'react';

import ImportModal from '@/components/ImportModal';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { fetchCycleScores, fetchAllPeriodos, type RealAnalyst, exportCycleToCSV, deletePeriodData, dispatchDataChanged } from '@/lib/services/dataService';
import { createClient } from '@/lib/supabase/client';
import { BarChart2, Activity, Plus, Save, X, Loader2, Trash2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ManualEvalForm {
  analista: string;
  squad: string;
  coordenador: string;
  auditor: string;
  nota_final_qa: string;
  iepc_total: string;
  total_ncs: string;
  pontos_deduzidos_nc: string;
  p1: string; p2: string; p3: string; p4: string; p5: string;
  e1: string; e2: string; e3: string; e4: string; e5: string;
  observacoes: string;
}

interface ImportRecord {
  id: string;
  fileName: string;
  tipo: string;
  modo: string;
  periodo: string;
  data: string;
  rows: number;
}

const EMPTY_FORM: ManualEvalForm = {
  analista: '', squad: '', coordenador: '', auditor: '',
  nota_final_qa: '', iepc_total: '', total_ncs: '0', pontos_deduzidos_nc: '0',
  p1: '0', p2: '0', p3: '0', p4: '0', p5: '0',
  e1: '0', e2: '0', e3: '0', e4: '0', e5: '0',
  observacoes: '',
};

const SQUADS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];
const IMPORT_STORAGE_KEY = 'zetti_import_records';

function loadImportRecords(): ImportRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function deleteImportRecord(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadImportRecords();
    localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(existing.filter((r) => r.id !== id)));
  } catch { /* ignore */ }
}

function ImportacoesContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const { session } = useSystemAuth();
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState('');
  const [newPeriodo, setNewPeriodo] = useState('');
  const [form, setForm] = useState<ManualEvalForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [analysts, setAnalysts] = useState<RealAnalyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canImport = session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral';

  // Load import records from Supabase first, then merge with localStorage
  const loadImports = useCallback(async () => {
    const supabase = createClient();
    if (supabase) {
      try {
        // Load CSV/manual imports from import_cycles
        const { data: cycleData, error: cycleError } = await supabase
          .from('import_cycles')
          .select('id, periodo, file_name, record_count, imported_at, data_type, metadata')
          .order('imported_at', { ascending: false });

        // Load integration records grouped by periodo from cycle_scores
        const { data: integrationData } = await supabase
          .from('cycle_scores')
          .select('periodo, source, created_at')
          .eq('source', 'integration')
          .order('created_at', { ascending: false });

        const supabaseRecords: ImportRecord[] = [];

        if (!cycleError && cycleData && cycleData.length > 0) {
          cycleData.forEach((d: any) => {
            supabaseRecords.push({
              id: d.id,
              fileName: d.file_name || 'Importação',
              tipo: 'Qualidade',
              modo: d.data_type === 'integration' ? 'Integração API' : 'Ciclo Completo',
              periodo: d.periodo,
              data: d.imported_at || new Date().toISOString(),
              rows: d.record_count || 0,
            });
          });
        }

        // Add integration-sourced periods not already in import_cycles
        if (integrationData && integrationData.length > 0) {
          const periodMap: Record<string, { count: number; date: string }> = {};
          integrationData.forEach((r: any) => {
            if (!periodMap[r.periodo]) {
              periodMap[r.periodo] = { count: 0, date: r.created_at };
            }
            periodMap[r.periodo].count++;
          });

          Object.entries(periodMap).forEach(([periodo, info]) => {
            const alreadyExists = supabaseRecords.some((sr) => sr.periodo === periodo);
            if (!alreadyExists) {
              supabaseRecords.push({
                id: `integration-${periodo}`,
                fileName: `Integração API — ${periodo}`,
                tipo: 'Qualidade',
                modo: 'Integração API',
                periodo,
                data: info.date,
                rows: info.count,
              });
            }
          });
        }

        if (supabaseRecords.length > 0) {
          // Merge with localStorage records (for manual entries not yet in Supabase)
          const lsRecords = loadImportRecords();
          const lsOnly = lsRecords.filter(
            (lr) => !supabaseRecords.some((sr) => sr.periodo === lr.periodo)
          );
          setImports([...supabaseRecords, ...lsOnly]);
          return;
        }
      } catch { /* fall through to localStorage */ }
    }
    // Fallback: localStorage only
    setImports(loadImportRecords());
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [scores, allPeriodos] = await Promise.all([
      fetchCycleScores(),
      fetchAllPeriodos(),
    ]);
    setPeriodos(allPeriodos);
    if (allPeriodos.length > 0 && !selectedPeriodo) {
      setSelectedPeriodo(allPeriodos[allPeriodos.length - 1]);
    }

    await loadImports();
    setLoading(false);
  }, [selectedPeriodo, loadImports]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_data_changed', handler);
    window.addEventListener('zetti_import_done', handler);
    return () => {
      window.removeEventListener('zetti_data_changed', handler);
      window.removeEventListener('zetti_import_done', handler);
    };
  }, [loadData]);

  const handleFormChange = (field: keyof ManualEvalForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const calcQAFromPillars = () => {
    const p1 = parseFloat(form.p1) || 0;
    const p2 = parseFloat(form.p2) || 0;
    const p3 = parseFloat(form.p3) || 0;
    const p4 = parseFloat(form.p4) || 0;
    const p5 = parseFloat(form.p5) || 0;
    const total = p1 + p2 + p3 + p4 + p5;
    const maxTotal = 22 + 34 + 18 + 14 + 12;
    const qa = (total / maxTotal) * 100;
    setForm((prev) => ({ ...prev, nota_final_qa: qa.toFixed(2) }));
  };

  const calcIEPCFromPillars = () => {
    const e1 = parseFloat(form.e1) || 0;
    const e2 = parseFloat(form.e2) || 0;
    const e3 = parseFloat(form.e3) || 0;
    const e4 = parseFloat(form.e4) || 0;
    const e5 = parseFloat(form.e5) || 0;
    const total = e1 + e2 + e3 + e4 + e5;
    const maxTotal = 30 + 20 + 20 + 15 + 15;
    const iepc = (total / maxTotal) * 100;
    setForm((prev) => ({ ...prev, iepc_total: iepc.toFixed(2) }));
  };

  const handleSaveManual = async () => {
    const periodo = newPeriodo || selectedPeriodo;
    if (!periodo) { toast.error('Selecione ou informe o período'); return; }
    if (!form.analista || !form.squad || !form.coordenador) {
      toast.error('Preencha analista, squad e coordenador');
      return;
    }

    setSaving(true);
    try {
      // Save to localStorage via dataService
      const { importCycleData } = await import('@/lib/services/dataService');
      const score = {
        periodo,
        analista: form.analista,
        squad: form.squad,
        coordenador: form.coordenador,
        auditor: form.auditor || '',
        nota_final_qa: parseFloat(form.nota_final_qa) || 0,
        iepc_total: parseFloat(form.iepc_total) || 0,
        total_ncs: parseInt(form.total_ncs) || 0,
        pontos_deduzidos_nc: parseFloat(form.pontos_deduzidos_nc) || 0,
        p1: parseFloat(form.p1) || 0,
        p2: parseFloat(form.p2) || 0,
        p3: parseFloat(form.p3) || 0,
        p4: parseFloat(form.p4) || 0,
        p5: parseFloat(form.p5) || 0,
        e1: parseFloat(form.e1) || 0,
        e2: parseFloat(form.e2) || 0,
        e3: parseFloat(form.e3) || 0,
        e4: parseFloat(form.e4) || 0,
        e5: parseFloat(form.e5) || 0,
      };
      const result = await importCycleData([score], [], [], periodo, 'Entrada Manual');
      if (!result.success) throw new Error(result.error || 'Erro ao salvar');

      // Save import record
      const existing = loadImportRecords();
      const newRecord: ImportRecord = {
        id: `import-${Date.now()}`,
        fileName: 'Entrada Manual',
        tipo: 'Qualidade',
        modo: 'Manual',
        periodo,
        data: new Date().toISOString(),
        rows: 1,
      };
      localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify([newRecord, ...existing]));

      toast.success(`Avaliação de ${form.analista} salva para ${periodo}!`);
      setForm(EMPTY_FORM);
      setManualOpen(false);
      // importCycleData already dispatches zetti_data_changed, but ensure it fires
      dispatchDataChanged({ tipo: 'manual_eval', periodo, analista: form.analista });
      loadData();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImport = (record: ImportRecord) => {
    setDeleteConfirm(record.id);
  };

  const confirmDelete = async (record: ImportRecord) => {
    // Remove from import records list (localStorage)
    deleteImportRecord(record.id);

    // If it's an integration record, delete from Supabase cycle_scores/nc_records/pdi_records
    if (record.modo === 'Integração API' || record.id.startsWith('integration-')) {
      const supabase = createClient();
      if (supabase) {
        try {
          await supabase.from('cycle_scores').delete().eq('periodo', record.periodo).eq('source', 'integration');
          await supabase.from('nc_records').delete().eq('periodo', record.periodo).eq('source', 'integration');
          await supabase.from('pdi_records').delete().eq('periodo', record.periodo).eq('source', 'integration');
          // Also remove the import_cycles record if it exists
          await supabase.from('import_cycles').delete().eq('periodo', record.periodo);
          toast.success(`Dados de integração do ciclo ${record.periodo} excluídos`);
        } catch (err: any) {
          toast.error('Erro ao excluir dados: ' + err.message);
          setDeleteConfirm(null);
          return;
        }
      }
    } else {
      // Remove period data from localStorage if no other imports for same period
      const remaining = loadImportRecords().filter((r) => r.id !== record.id && r.periodo === record.periodo);
      if (remaining.length === 0) {
        deletePeriodData(record.periodo);
      }
    }

    setDeleteConfirm(null);
    loadImports();
    toast.success(`Importação "${record.fileName}" excluída`);
    dispatchDataChanged({ tipo: 'delete_import', periodo: record.periodo });
  };

  const handleDownload = (record: ImportRecord) => {
    exportCycleToCSV(record.periodo);
    toast.success(`Download iniciado para o ciclo ${record.periodo}`);
  };

  const getTipoColor = (tipo: string) => {
    if (tipo === 'Qualidade') return { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)' };
    if (tipo === 'Não Conformidades') return { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)' };
    if (tipo === 'Elogios') return { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' };
    return { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' };
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all focus:ring-1 focus:ring-blue-500/40';
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Importações & Lançamentos</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Importação via CSV e lançamento manual de avaliações
              </p>
            </div>
            {canImport && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManualOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
                >
                  <Plus size={14} />
                  Lançamento Manual
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ backgroundColor: '#1E40AF' }}
                >
                  <BarChart2 size={14} />
                  Importar CSV
                </button>
              </div>
            )}
          </div>

          {/* Info banner */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="flex items-start gap-3">
              <Activity size={16} style={{ color: '#60A5FA' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#60A5FA' }}>Sistema Híbrido de Dados</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Use o <strong>Lançamento Manual</strong> para inserir avaliações individuais durante o ciclo ou cadastrar ciclos históricos.
                  Use <strong>Importar CSV</strong> para importar planilhas consolidadas ao final do ciclo.
                  Os dados são armazenados localmente e calculados automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Import history */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white">Histórico de Importações</h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                {imports.length} {imports.length === 1 ? 'importação' : 'importações'}
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: '#3B82F6' }} />
              </div>
            ) : imports.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma importação registrada</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Importe um CSV ou faça um lançamento manual para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Período', 'Arquivo', 'Tipo', 'Modo', 'Registros', 'Data de Importação', 'Ações'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {imports.map((imp) => {
                      const tipoStyle = getTipoColor(imp.tipo);
                      return (
                        <tr key={imp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td className="px-5 py-3 font-medium text-white">{imp.periodo}</td>
                          <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{imp.fileName || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: tipoStyle.color, backgroundColor: tipoStyle.bg, border: `1px solid ${tipoStyle.border}` }}>
                              {imp.tipo}
                            </span>
                          </td>
                          <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{imp.modo || 'Ciclo Completo'}</td>
                          <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{imp.rows || 0}</td>
                          <td className="px-5 py-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {imp.data ? new Date(imp.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-5 py-3">
                            {deleteConfirm === imp.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: '#EF4444' }}>Confirmar?</span>
                                <button
                                  onClick={() => confirmDelete(imp)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                                  style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDownload(imp)}
                                  title="Baixar dados do ciclo"
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                                  style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
                                >
                                  <Download size={11} />
                                  Baixar
                                </button>
                                {canImport && (
                                  <button
                                    onClick={() => handleDeleteImport(imp)}
                                    title="Excluir importação"
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-80"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                                  >
                                    <Trash2 size={11} />
                                    Excluir
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {canImport && <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}

      {/* Manual Entry Modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 my-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white">Lançamento Manual de Avaliação</h2>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Insira os dados manualmente — indicadores serão calculados automaticamente</p>
              </div>
              <button onClick={() => setManualOpen(false)} style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Período existente</label>
                  <select value={selectedPeriodo} onChange={(e) => setSelectedPeriodo(e.target.value)} className={inputCls} style={inputStyle}>
                    <option value="">Selecionar período</option>
                    {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Ou novo período (ex: 05/2026)</label>
                  <input type="text" value={newPeriodo} onChange={(e) => setNewPeriodo(e.target.value)} placeholder="MM/AAAA" className={inputCls} style={inputStyle} />
                </div>
              </div>

              {/* Analyst info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Analista *</label>
                  <input type="text" value={form.analista} onChange={(e) => handleFormChange('analista', e.target.value)} placeholder="Nome do analista" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Squad *</label>
                  <select value={form.squad} onChange={(e) => handleFormChange('squad', e.target.value)} className={inputCls} style={inputStyle}>
                    <option value="">Selecionar squad</option>
                    {SQUADS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Coordenador *</label>
                  <input type="text" value={form.coordenador} onChange={(e) => handleFormChange('coordenador', e.target.value)} placeholder="Nome do coordenador" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Auditor</label>
                  <input type="text" value={form.auditor} onChange={(e) => handleFormChange('auditor', e.target.value)} placeholder="Nome do auditor" className={inputCls} style={inputStyle} />
                </div>
              </div>

              {/* QA Score */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: '#60A5FA' }}>Pilares QA (P1–P5)</p>
                  <button onClick={calcQAFromPillars} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(59,130,246,0.2)', color: '#60A5FA' }}>
                    Calcular QA
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(['p1', 'p2', 'p3', 'p4', 'p5'] as const).map((p, i) => (
                    <div key={p}>
                      <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>P{i + 1} (/{[22,34,18,14,12][i]})</label>
                      <input type="number" value={form[p]} onChange={(e) => handleFormChange(p, e.target.value)} min="0" max={[22,34,18,14,12][i]} className={inputCls} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Nota Final QA (%)</label>
                  <input type="number" value={form.nota_final_qa} onChange={(e) => handleFormChange('nota_final_qa', e.target.value)} placeholder="0–100" className={inputCls} style={inputStyle} />
                </div>
              </div>

              {/* IEPC Score */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold" style={{ color: '#A78BFA' }}>Pilares IEPC (E1–E5)</p>
                  <button onClick={calcIEPCFromPillars} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(139,92,246,0.2)', color: '#A78BFA' }}>
                    Calcular IEPC
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {(['e1', 'e2', 'e3', 'e4', 'e5'] as const).map((e, i) => (
                    <div key={e}>
                      <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>E{i + 1} (/{[30,20,20,15,15][i]})</label>
                      <input type="number" value={form[e]} onChange={(e2) => handleFormChange(e, e2.target.value)} min="0" max={[30,20,20,15,15][i]} className={inputCls} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>IEPC Total (%)</label>
                  <input type="number" value={form.iepc_total} onChange={(e) => handleFormChange('iepc_total', e.target.value)} placeholder="0–100" className={inputCls} style={inputStyle} />
                </div>
              </div>

              {/* NCs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Total de NCs</label>
                  <input type="number" value={form.total_ncs} onChange={(e) => handleFormChange('total_ncs', e.target.value)} min="0" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Pontos Deduzidos (NCs)</label>
                  <input type="number" value={form.pontos_deduzidos_nc} onChange={(e) => handleFormChange('pontos_deduzidos_nc', e.target.value)} className={inputCls} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Observações</label>
                <textarea value={form.observacoes} onChange={(e) => handleFormChange('observacoes', e.target.value)} placeholder="Observações sobre esta avaliação..." rows={2} className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setManualOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                Cancelar
              </button>
              <button onClick={handleSaveManual} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#1E40AF' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Salvando...' : 'Salvar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportacoesPage() {
  return (
    <EnterpriseLayout>
      <ImportacoesContent />
    </EnterpriseLayout>
  );
}
