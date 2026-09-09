'use client';
import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Upload,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Database,
  Info,
  Layers,
  GitMerge,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  parseQAScoresCSV,
  parseNCsCSV,
  isCycleClosed,
  type CycleScoreRow,
  type NCRow,
} from '@/lib/services/dataService';
import { validarLoteCanonicoEmMemoria } from '@/lib/services/canonicalIngestionService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type ImportStep = 'choose-mode' | 'choose-type' | 'upload' | 'validate' | 'done';
type FileType = 'dataset_analitico' | 'scores' | 'ncs';
type ImportMode = 'ciclo-completo' | 'por-andamento';

interface FileEntry {
  type: FileType;
  label: string;
  name: string;
  status: 'pending' | 'success' | 'error';
  rows: Record<string, any>[];
  errorMsg?: string;
  validationWarnings?: string[];
}

interface ValidationSummary {
  totalRows: number;
  qaAvg: number | null;
  iepcAvg: number | null;
  totalNCs: number | null;
  ncRows: number | null;
  ncTotalPontos: number | null;
  parsedScores: CycleScoreRow[];
  parsedNCs: NCRow[];
  discardedRows?: number;
  discardedReasons?: string[];
  canonicalErrors?: string[];
}

const FILE_TYPE_OPTIONS: { type: FileType; label: string; description: string; color: string }[] = [
  {
    type: 'dataset_analitico',
    label: 'Dataset Analítico Completo (Pasta XLSX)',
    description: 'Importa todas as abas (Qualidade, Critérios, NCs) de forma integrada',
    color: '#1D4ED8',
  },
  {
    type: 'scores',
    label: 'Pontuações de Qualidade (QA & IEPC)',
    description: 'Pontuações dos analistas, pilares técnicos P1–P5 e dimensões E1–E5',
    color: '#0284C7',
  },
  {
    type: 'ncs',
    label: 'Não Conformidades (NC)',
    description: 'Registros de desvios operacionais com tipo, impacto e deduções',
    color: '#DC2626',
  },
];

function cleanColumnKey(key: string): string {
  return key.replace(/^\uFEFF/, '').trim();
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('choose-mode');
  const [importMode, setImportMode] = useState<ImportMode | null>('ciclo-completo');
  const [selectedType, setSelectedType] = useState<FileType | null>('dataset_analitico');
  const [periodo, setPeriodo] = useState<string>('08/2026');
  const [fileEntry, setFileEntry] = useState<FileEntry | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [cycleClosedWarning, setCycleClosedWarning] = useState(false);

  // Check cycle status whenever period changes
  useEffect(() => {
    if (!periodo) return;
    isCycleClosedInSupabase(periodo)
      .then((isClosed) => {
        setCycleClosedWarning(isClosed);
      })
      .catch(() => {
        setCycleClosedWarning(isCycleClosed(periodo));
      });
  }, [periodo]);

  const handleProcessWorkbook = async (
    file: File
  ): Promise<{ scores: CycleScoreRow[]; ncs: NCRow[] }> => {
    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: 'array' });

    let scoresRows: Record<string, any>[] = [];
    let ncRows: Record<string, any>[] = [];

    const sheetNames = workbook.SheetNames;
    const scoresSheetName =
      sheetNames.find(
        (s) =>
          normalizeStr(s).includes('resultado') ||
          normalizeStr(s).includes('qualidade') ||
          normalizeStr(s).includes('scores')
      ) || sheetNames[0];

    const ncSheetName = sheetNames.find(
      (s) =>
        normalizeStr(s).includes('naoconformidade') ||
        normalizeStr(s).includes('nao_conformidade') ||
        normalizeStr(s).includes('nc')
    );

    if (scoresSheetName && workbook.Sheets[scoresSheetName]) {
      scoresRows = XLSX.utils.sheet_to_json(workbook.Sheets[scoresSheetName], {
        defval: '',
      }) as Record<string, any>[];
    }

    if (ncSheetName && workbook.Sheets[ncSheetName]) {
      ncRows = XLSX.utils.sheet_to_json(workbook.Sheets[ncSheetName], { defval: '' }) as Record<
        string,
        any
      >[];
    }

    const parsedScores = parseQAScoresCSV(scoresRows, periodo);
    const parsedNCs = parseNCsCSV(ncRows, periodo);

    return { scores: parsedScores, ncs: parsedNCs };
  };

  const handleFileDrop = useCallback(
    async (file: File) => {
      setImportError(null);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        toast.error('Formato inválido. Envie um arquivo .xlsx, .xls ou .csv.');
        return;
      }

      try {
        let parsedScores: CycleScoreRow[] = [];
        let parsedNCs: NCRow[] = [];
        let totalRows = 0;

        if (selectedType === 'dataset_analitico' && (ext === 'xlsx' || ext === 'xls')) {
          const result = await handleProcessWorkbook(file);
          parsedScores = result.scores;
          parsedNCs = result.ncs;
          totalRows = parsedScores.length + parsedNCs.length;
        } else if (ext === 'csv') {
          const text = await file.text();
          const results = await new Promise<Papa.ParseResult<Record<string, any>>>(
            (resolve, reject) => {
              Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: resolve,
                error: reject,
              });
            }
          );
          const rows = results.data;
          totalRows = rows.length;
          if (selectedType === 'ncs') {
            parsedNCs = parseNCsCSV(rows, periodo);
          } else {
            parsedScores = parseQAScoresCSV(rows, periodo);
          }
        } else {
          // Fallback single sheet XLSX
          const data = new Uint8Array(await file.arrayBuffer());
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
          totalRows = rows.length;
          if (selectedType === 'ncs') {
            parsedNCs = parseNCsCSV(rows, periodo);
          } else {
            parsedScores = parseQAScoresCSV(rows, periodo);
          }
        }

        const qaAvg =
          parsedScores.length > 0
            ? parsedScores.reduce((s, r) => s + r.nota_final_qa, 0) / parsedScores.length
            : null;
        const iepcAvg =
          parsedScores.length > 0
            ? parsedScores.reduce((s, r) => s + r.iepc_total, 0) / parsedScores.length
            : null;
        const totalNCs =
          parsedNCs.length || parsedScores.reduce((s, r) => s + (r.total_ncs || 0), 0) || null;
        const ncTotalPontos =
          parsedNCs.length > 0 ? parsedNCs.reduce((s, r) => s + r.pontos_deduzidos, 0) : null;

        // Ingestão canônica pré-validação
        const canonicalPayload = parsedScores.map((s) => ({
          equipe_nome: s.squad,
          analista_identificador: s.analista.toLowerCase().replace(/\s+/g, '_'),
          analista_nome: s.analista,
          coordenador_nome: s.coordenador,
          auditor_nome: s.auditor,
          periodo: s.periodo || periodo,
          nota_final_qa: s.nota_final_qa,
          indice_iepc: s.iepc_total,
          total_ncs: s.total_ncs || 0,
          pontos_deduzidos_nc: s.pontos_deduzidos_nc || 0,
        }));

        const canonicalCheck = validarLoteCanonicoEmMemoria(canonicalPayload);

        setValidationSummary({
          totalRows,
          qaAvg,
          iepcAvg,
          totalNCs,
          ncRows: parsedNCs.length || null,
          ncTotalPontos,
          parsedScores,
          parsedNCs,
          discardedRows: canonicalCheck.totalRejeitado,
          canonicalErrors: canonicalCheck.erros,
        });

        setFileEntry({
          type: selectedType || 'dataset_analitico',
          label: FILE_TYPE_OPTIONS.find((t) => t.type === selectedType)?.label || 'Arquivo',
          name: file.name,
          status: 'pending',
          rows: [],
        });

        setStep('validate');
      } catch (err: any) {
        toast.error('Erro ao processar arquivo: ' + (err.message || 'Arquivo corrompido'));
      }
    },
    [selectedType, periodo]
  );

  const handleConfirmImport = async () => {
    if (!validationSummary) return;
    setImporting(true);
    setImportError(null);

    try {
      // Preparar payload canônico unificado
      const canonicalRows = validationSummary.parsedScores.map((s) => ({
        equipe_nome: s.squad,
        analista_identificador: s.analista.toLowerCase().replace(/\s+/g, '_'),
        analista_nome: s.analista,
        coordenador_nome: s.coordenador,
        auditor_nome: s.auditor,
        periodo: s.periodo || periodo,
        data_registro: s.data_registro,
        nota_final_qa: s.nota_final_qa,
        indice_iepc: s.iepc_total,
        total_ncs: s.total_ncs || 0,
        pontos_deduzidos_nc: s.pontos_deduzidos_nc || 0,
        p1: s.p1,
        p2: s.p2,
        p3: s.p3,
        p4: s.p4,
        p5: s.p5,
        e1: s.e1,
        e2: s.e2,
        e3: s.e3,
        e4: s.e4,
        e5: s.e5,
        nao_conformidades: validationSummary.parsedNCs
          .filter((n) => n.analista === s.analista)
          .map((n) => ({
            tipo_nc: n.tipo_nc,
            pontos_deduzidos: n.pontos_deduzidos,
            protocolo_referencia: n.protocolo_referencia,
            data_registro: n.data_registro,
          })),
      }));

      const { executarIngestaoCanonicaLote } =
        await import('@/lib/services/canonicalIngestionService');
      const result = await executarIngestaoCanonicaLote(
        'modal_upload',
        periodo,
        canonicalRows,
        fileEntry?.name || 'importacao.xlsx'
      );

      if (!result.sucesso) {
        throw new Error(result.erros.join(' | ') || result.mensagem);
      }

      setStep('done');
      toast.success(result.mensagem);
      onImportSuccess?.();
    } catch (err: any) {
      setImportError(err.message || 'Erro durante a persistência.');
      toast.error(err.message || 'Falha na importação.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setStep('choose-mode');
    setFileEntry(null);
    setValidationSummary(null);
    setImportError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Ingestão de Dados da Qualidade
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recebimento de avaliações técnicas, percepção e não conformidades
            </p>
          </div>
          <button
            onClick={handleReset}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {cycleClosedWarning && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-red-800">Ciclo {periodo} Homologado</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Este ciclo já foi fechado e homologado para integridade histórica. Reabra o ciclo
                  na governança antes de importar novos dados.
                </p>
              </div>
            </div>
          )}

          {/* STEP: Mode & Period */}
          {step === 'choose-mode' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Ciclo de Competência
                </label>
                <input
                  type="text"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  placeholder="MM/AAAA (ex: 08/2026)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Tipo de Ingestão
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setSelectedType(opt.type)}
                      className={`flex items-start gap-3 p-3.5 rounded-md border text-left transition-all ${
                        selectedType === opt.type
                          ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-white font-bold"
                        style={{ backgroundColor: opt.color }}
                      >
                        <FileSpreadsheet size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                          {selectedType === opt.type && (
                            <CheckCircle size={14} className="text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('upload')}
                disabled={cycleClosedWarning || !periodo}
                className="w-full mt-2 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1.5"
              >
                Avançar para Envio <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Ciclo: <strong className="text-slate-800">{periodo}</strong> | Tipo:{' '}
                  <strong className="text-slate-800">
                    {FILE_TYPE_OPTIONS.find((t) => t.type === selectedType)?.label}
                  </strong>
                </span>
                <button
                  onClick={() => setStep('choose-mode')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Alterar
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileDrop(file);
                }}
                className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/50'
                }`}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.xlsx,.xls,.csv';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileDrop(file);
                  };
                  input.click();
                }}
              >
                <Upload size={28} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  Clique ou arraste o arquivo XLSX / CSV aqui
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Exemplo:{' '}
                  <code className="text-blue-700 font-mono">dataset_analitico_qa_08-2026.xlsx</code>
                </p>
              </div>
            </div>
          )}

          {/* STEP: Validate */}
          {step === 'validate' && validationSummary && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-600" />
                  Arquivo Pré-Validado: <span className="font-mono">{fileEntry?.name}</span>
                </p>
              </div>

              {/* KPI metrics preview */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-white border border-slate-200 rounded-md">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Avaliações</p>
                  <p className="text-base font-bold text-slate-800 mt-0.5">
                    {validationSummary.parsedScores.length}
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-md">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Média QA</p>
                  <p className="text-base font-bold text-blue-700 mt-0.5">
                    {validationSummary.qaAvg !== null
                      ? `${validationSummary.qaAvg.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-md">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total NCs</p>
                  <p className="text-base font-bold text-red-600 mt-0.5">
                    {validationSummary.parsedNCs.length || validationSummary.totalNCs || 0}
                  </p>
                </div>
              </div>

              {validationSummary.canonicalErrors &&
                validationSummary.canonicalErrors.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-xs font-bold text-amber-800 mb-1">
                      Avisos de Ingestão ({validationSummary.canonicalErrors.length})
                    </p>
                    <ul className="text-[11px] text-amber-700 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                      {validationSummary.canonicalErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('upload')}
                  disabled={importing}
                  className="flex-1 py-2 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-md"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="flex-1 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center justify-center gap-1.5"
                >
                  {importing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Ingerindo Dados...
                    </>
                  ) : (
                    'Confirmar e Salvar Ingestão'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-md flex items-center justify-center mx-auto">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Ingestão Concluída com Sucesso!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Os resultados de qualidade do ciclo {periodo} foram devidamente processados e estão
                disponíveis para medição, Pareto e diagnósticos.
              </p>
              <div className="pt-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-md"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
