'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Activity,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface ImportRecord {
  id: string;
  fileName: string;
  tipo: string;
  modo: string;
  periodo: string;
  data: string;
  rows: number;
  status: string;
}

interface ManualEvalForm {
  periodo: string;
  analista: string;
  squad: string;
  coordenador: string;
  auditor: string;
  nota_final_qa: string;
  iepc_total: string;
  total_ncs: string;
  pontos_deduzidos_nc: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  p5: string;
}

const EMPTY_FORM: ManualEvalForm = {
  periodo: '08/2026',
  analista: '',
  squad: 'PDV',
  coordenador: '',
  auditor: '',
  nota_final_qa: '85',
  iepc_total: '85',
  total_ncs: '0',
  pontos_deduzidos_nc: '0',
  p1: '20',
  p2: '30',
  p3: '16',
  p4: '12',
  p5: '10',
};

const SQUADS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];

export default function ImportacoesPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ManualEvalForm>(EMPTY_FORM);
  const [savingManual, setSavingManual] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { session } = useSystemAuth();

  const loadImports = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      if (supabase) {
        const { data: cycles, error } = await supabase
          .from('import_cycles')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && cycles && cycles.length > 0) {
          const mapped: ImportRecord[] = cycles.map((c: any) => ({
            id: c.id,
            fileName: c.file_name || 'Importação de Dados',
            tipo:
              c.data_type === 'scores'
                ? 'Qualidade QA/IEPC'
                : c.data_type === 'ncs'
                  ? 'Não Conformidades'
                  : 'Dataset Analítico',
            modo: c.status === 'em_andamento' ? 'Por Andamento' : 'Ciclo Consolidado',
            periodo: c.periodo,
            data: c.updated_at || c.created_at || new Date().toISOString(),
            rows: c.record_count || 0,
            status: c.is_closed ? 'Homologado' : 'Aberto',
          }));
          setImports(mapped);
          setLoading(false);
          return;
        } else {
          setImports([]);
          setLoading(false);
          return;
        }
      }
      setImports([]);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.analista || !form.periodo) {
      toast.error('Preencha ao menos o analista e o ciclo.');
      return;
    }

    setSavingManual(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('cycle_scores').upsert(
          {
            periodo: form.periodo,
            analista: form.analista,
            squad: form.squad,
            coordenador: form.coordenador || null,
            auditor: form.auditor || null,
            nota_final_qa: parseFloat(form.nota_final_qa) || 0,
            iepc_total: parseFloat(form.iepc_total) || 0,
            total_ncs: parseInt(form.total_ncs) || 0,
            pontos_deduzidos_nc: parseFloat(form.pontos_deduzidos_nc) || 0,
            p1: parseFloat(form.p1) || 0,
            p2: parseFloat(form.p2) || 0,
            p3: parseFloat(form.p3) || 0,
            p4: parseFloat(form.p4) || 0,
            p5: parseFloat(form.p5) || 0,
            source: 'manual',
          },
          { onConflict: 'periodo,analista,squad' }
        );
      }

      toast.success(`Avaliação de ${form.analista} registrada com sucesso!`);
      setManualOpen(false);
      setForm(EMPTY_FORM);
      loadImports();
    } catch (err: any) {
      toast.error('Erro ao registrar avaliação manual: ' + err.message);
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteCycle = async (id: string, periodo: string) => {
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('cycle_scores').delete().eq('periodo', periodo);
        await supabase.from('nc_records').delete().eq('periodo', periodo);
        await supabase.from('import_cycles').delete().eq('id', id);
      }
      toast.success(`Dados do ciclo ${periodo} removidos.`);
      setDeleteConfirm(null);
      loadImports();
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  return (
    <EnterpriseLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Central de Ingestão de Dados
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                Canônico
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Recepção, validação e auditoria de lotes de resultados externos (QA, IEPC e Não
              Conformidades).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadImports()}
              className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-md transition-colors"
              title="Recarregar histórico"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-md transition-colors"
            >
              <Plus size={14} />
              Registro Pontual
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white rounded-md transition-colors shadow-sm"
            >
              <Upload size={14} />
              Nova Ingestão (XLSX/CSV)
            </button>
          </div>
        </div>

        {/* Pipeline Architecture Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-100">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1 min-w-0 text-xs text-slate-600">
              <p className="font-bold text-slate-800 uppercase tracking-wide">
                Garantia de Integridade e Fronteira do Produto
              </p>
              <p className="mt-0.5">
                O QualiVisão processa estritamente dados consolidados da qualidade. Todas as
                entradas passam pelo contrato canônico de validação (Zod), preservando a separação
                metodológica entre QA (técnico), IEPC (percepção) e Não Conformidades (eventos com
                dedução configurável).
              </p>
            </div>
          </div>
        </div>

        {/* Ingestion History Table */}
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={15} className="text-slate-500" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Lotes de Ingestão Registrados
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {imports.length} {imports.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Ciclo</th>
                  <th className="px-5 py-3">Arquivo / Origem</th>
                  <th className="px-5 py-3">Tipo de Dado</th>
                  <th className="px-5 py-3">Modo</th>
                  <th className="px-5 py-3 text-right">Registros</th>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Governança</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Carregando histórico de ingestão...
                    </td>
                  </tr>
                ) : imports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      Nenhuma importação registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  imports.map((imp) => (
                    <tr key={imp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">
                        {imp.periodo}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{imp.fileName}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {imp.tipo}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{imp.modo}</td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-800">
                        {imp.rows}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(imp.data).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            imp.status === 'Homologado' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <CheckCircle2 size={12} /> {imp.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {deleteConfirm === imp.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[11px] text-red-600 font-bold">Excluir?</span>
                            <button
                              onClick={() => handleDeleteCycle(imp.id, imp.periodo)}
                              className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(imp.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Remover dados do lote"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Ingestão Canônica */}
        <ImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onImportSuccess={() => loadImports()}
        />

        {/* Modal de Registro Pontual */}
        {manualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Registro Pontual de Avaliação
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Inserção manual de resultado individual para contingência
                  </p>
                </div>
                <button
                  onClick={() => setManualOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveManual} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ciclo *</label>
                    <input
                      type="text"
                      value={form.periodo}
                      onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Squad / Equipe *
                    </label>
                    <select
                      value={form.squad}
                      onChange={(e) => setForm({ ...form, squad: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    >
                      {SQUADS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Analista *</label>
                    <input
                      type="text"
                      value={form.analista}
                      onChange={(e) => setForm({ ...form, analista: e.target.value })}
                      placeholder="Nome do analista"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Coordenador</label>
                    <input
                      type="text"
                      value={form.coordenador}
                      onChange={(e) => setForm({ ...form, coordenador: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-blue-700 mb-1">
                      Nota Final QA (0–100) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.nota_final_qa}
                      onChange={(e) => setForm({ ...form, nota_final_qa: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-blue-200 rounded-md font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-sky-700 mb-1">
                      Índice IEPC (0–100) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.iepc_total}
                      onChange={(e) => setForm({ ...form, iepc_total: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-sky-200 rounded-md font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-red-600 mb-1">Total de NCs</label>
                    <input
                      type="number"
                      min="0"
                      value={form.total_ncs}
                      onChange={(e) => setForm({ ...form, total_ncs: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-red-600 mb-1">
                      Pontos Deduzidos NC
                    </label>
                    <input
                      type="number"
                      value={form.pontos_deduzidos_nc}
                      onChange={(e) => setForm({ ...form, pontos_deduzidos_nc: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManualOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-md"
                  >
                    {savingManual ? 'Gravando...' : 'Gravar Avaliação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
