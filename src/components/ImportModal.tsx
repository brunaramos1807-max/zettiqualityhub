'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { X, Upload, CheckCircle, Loader2, AlertCircle, ChevronRight, Database, Info, ShieldCheck, BarChart2, TrendingUp, Hash, Layers, GitMerge, Clock } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseQAScoresCSV, parseNCsCSV, parseElogiosCSV, isCycleClosed, type CycleScoreRow, type NCRow, type ElogioRow,  } from '@/lib/services/dataService';
import { importCycleDataToSupabase, isCycleClosedInSupabase } from '@/lib/services/supabaseDataService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

type ImportStep = 'choose-mode' | 'choose-type' | 'upload' | 'validate' | 'done';
type FileType = 'scores' | 'ncs' | 'elogios';
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
  elogioRows: number | null;
  parsedScores: CycleScoreRow[];
  parsedNCs: NCRow[];
  parsedElogios: ElogioRow[];
}

const FILE_TYPE_OPTIONS: { type: FileType; label: string; description: string; color: string; required?: boolean }[] = [
  { type: 'scores', label: 'Qualidade (QA/IEPC)', description: 'Pontuações de qualidade e IEPC por analista', color: '#1E40AF', required: true },
  { type: 'ncs', label: 'Não Conformidades', description: 'Registros de NCs com tipo e pontos deduzidos', color: '#DC2626' },
  { type: 'elogios', label: 'Elogios', description: 'Elogios recebidos pelos analistas', color: '#16A34A' },
];

const REQUIRED_COLUMNS: Record<FileType, string[]> = {
  scores: ['Analista', 'Squad', 'Nota Final QA (0-100)', 'IEPC - Índice de Experiência Percebida pelo Cliente (0-100)'],
  ncs: ['Analista', 'Squad', 'Tipo de Não Conformidade', 'Pontos Deduzidos'],
  elogios: ['Colaborador', 'Elogio'],
};

const OPTIONAL_COLUMNS: Record<FileType, string[]> = {
  scores: ['Período', 'Periodo', 'Data do Registro', 'Auditor', 'Total de Não Conformidades', 'Pontos Deduzidos por NC'],
  ncs: ['Período', 'Periodo', 'Coordenador', 'Auditor', 'Descrição', 'Protocolo Referência', 'ID da Avaliação'],
  elogios: ['SQUAD', 'Squad', 'CLIENTE', 'Cliente', 'PROTOCOLO', 'Protocolo', 'Período', 'Periodo'],
};

function cleanColumnKey(key: string): string {
  return key.replace(/^\uFEFF/, '').trim();
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function validateColumns(rows: Record<string, any>[], type: FileType): { valid: boolean; missing: string[]; warnings: string[] } {
  if (rows.length === 0) return { valid: false, missing: [], warnings: ['Arquivo vazio — nenhuma linha encontrada.'] };
  const fileColumns = Object.keys(rows[0]).map(cleanColumnKey);

  if (type === 'scores') {
    // Accept either old verbose column names OR new short column names
    const hasAnalista = fileColumns.some((fc) =>
      normalizeStr(fc) === normalizeStr('Analista') ||
      normalizeStr(fc) === normalizeStr('analista_nome') ||
      normalizeStr(fc) === normalizeStr('analista')
    );
    const hasSquad = fileColumns.some((fc) =>
      normalizeStr(fc) === normalizeStr('Squad') ||
      normalizeStr(fc) === normalizeStr('squad')
    );
    const hasQA = fileColumns.some((fc) =>
      normalizeStr(fc) === normalizeStr('Nota Final QA (0-100)') ||
      normalizeStr(fc) === normalizeStr('nota_final_qa') ||
      normalizeStr(fc) === normalizeStr('nota final qa')
    );
    const hasIEPC = fileColumns.some((fc) =>
      normalizeStr(fc).includes('iepc') ||
      normalizeStr(fc) === normalizeStr('Nota Final QA (0-100)')
    );
    const missing: string[] = [];
    if (!hasAnalista) missing.push('Analista / analista_nome');
    if (!hasSquad) missing.push('Squad / squad');
    if (!hasQA) missing.push('Nota Final QA (0-100) / nota_final_qa');
    if (!hasIEPC) missing.push('IEPC (coluna iepc ou similar)');
    const warnings: string[] = [];
    const hasPeriod = fileColumns.some((fc) =>
      normalizeStr(fc) === 'periodo' ||
      normalizeStr(fc) === 'period' ||
      normalizeStr(fc) === 'competencia' ||
      normalizeStr(fc) === 'ciclo'
    );
    if (!hasPeriod) warnings.push('Coluna "Período" não encontrada — o período será definido pelo campo acima.');
    if (missing.length > 0) return { valid: false, missing, warnings };
    return { valid: true, missing: [], warnings };
  }

  // For ncs and elogios: use original logic
  const required = REQUIRED_COLUMNS[type];
  const missing = required.filter(
    (col) => !fileColumns.some((fc) => normalizeStr(fc) === normalizeStr(col))
  );
  const warnings: string[] = [];
  if (missing.length > 0) return { valid: false, missing, warnings };
  const hasPeriod = fileColumns.some((fc) => normalizeStr(fc) === 'periodo' || normalizeStr(fc) === 'period');
  if (!hasPeriod) warnings.push('Coluna "Período" não encontrada — o período será definido pelo campo acima.');
  return { valid: true, missing: [], warnings };
}

async function parseFile(file: File): Promise<Record<string, any>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        const firstLine = text.split('\n')[0] || '';
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ';' : ',';
        Papa.parse(text, {
          header: true, skipEmptyLines: true, delimiter,
          complete: (results) => resolve(results.data as Record<string, any>[]),
          error: (err: any) => reject(err),
        });
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
          resolve(rows);
        } catch (err: any) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error('Formato não suportado. Use CSV ou XLSX.');
}

function buildValidationSummary(type: FileType, rows: Record<string, any>[], periodo: string): ValidationSummary {
  let parsedScores = type === 'scores' ? parseQAScoresCSV(rows, periodo) : [];
  const parsedNCs = type === 'ncs' ? parseNCsCSV(rows, periodo) : [];
  const parsedElogios = type === 'elogios' ? parseElogiosCSV(rows, periodo) : [];

  if (type === 'scores') {
    const qaAvg = parsedScores.length > 0 ? parsedScores.reduce((s, r) => s + r.nota_final_qa, 0) / parsedScores.length : 0;
    const iepcAvg = parsedScores.length > 0 ? parsedScores.reduce((s, r) => s + r.iepc_total, 0) / parsedScores.length : 0;
    const totalNCs = parsedScores.reduce((s, r) => s + r.total_ncs, 0);
    return { totalRows: parsedScores.length, qaAvg, iepcAvg, totalNCs, ncRows: null, ncTotalPontos: null, elogioRows: null, parsedScores, parsedNCs: [], parsedElogios: [] };
  }
  if (type === 'ncs') {
    const ncTotalPontos = parsedNCs.reduce((s, r) => s + r.pontos_deduzidos, 0);
    return { totalRows: parsedNCs.length, qaAvg: null, iepcAvg: null, totalNCs: parsedNCs.length, ncRows: parsedNCs.length, ncTotalPontos, elogioRows: null, parsedScores: [], parsedNCs, parsedElogios: [] };
  }
  return { totalRows: parsedElogios.length, qaAvg: null, iepcAvg: null, totalNCs: null, ncRows: null, ncTotalPontos: null, elogioRows: parsedElogios.length, parsedScores: [], parsedNCs: [], parsedElogios };
}

// ─── Por Andamento: get accumulated count from localStorage ──────────────────
function getAndamentoCount(periodo: string): number {
  try {
    const key = `zetti_andamento_${periodo}`;
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    return data.length;
  } catch { return 0; }
}

function accumulateAndamento(scores: CycleScoreRow[], periodo: string): CycleScoreRow[] {
  try {
    const key = `zetti_andamento_${periodo}`;
    const existing: CycleScoreRow[] = JSON.parse(localStorage.getItem(key) || '[]');
    // Merge: new scores override existing by analista name
    const merged = [...existing];
    scores.forEach((s) => {
      const idx = merged.findIndex((e) => e.analista === s.analista);
      if (idx >= 0) merged[idx] = s;
      else merged.push(s);
    });
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  } catch { return scores; }
}

export default function ImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('choose-mode');
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [selectedType, setSelectedType] = useState<FileType | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileEntry, setFileEntry] = useState<FileEntry | null>(null);
  const [periodo, setPeriodo] = useState('04/2026');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [andamentoCount, setAndamentoCount] = useState(0);
  const [cycleClosedWarning, setCycleClosedWarning] = useState(false);

  // Check initial period closed status when modal opens
  React.useEffect(() => {
    if (isOpen && periodo) {
      isCycleClosedInSupabase(periodo)
        .then((closed) => setCycleClosedWarning(closed || isCycleClosed(periodo)))
        .catch(() => setCycleClosedWarning(isCycleClosed(periodo)));
    }
  }, [isOpen]);

  // Check if the selected period is closed — check Supabase first, then localStorage
  const handlePeriodoChange = async (value: string) => {
    setPeriodo(value);
    // Check Supabase first for authoritative closed status
    try {
      const closedInSupabase = await isCycleClosedInSupabase(value);
      setCycleClosedWarning(closedInSupabase || isCycleClosed(value));
    } catch {
      setCycleClosedWarning(isCycleClosed(value));
    }
  };

  const selectedTypeInfo = FILE_TYPE_OPTIONS.find((o) => o.type === selectedType);

  const handleFileForType = async (file: File, type: FileType) => {
    const label = FILE_TYPE_OPTIONS.find((f) => f.type === type)!.label;
    try {
      const rows = await parseFile(file);
      const validation = validateColumns(rows, type);
      if (!validation.valid) {
        const errorMsg = `Colunas obrigatórias ausentes: ${validation.missing.join(', ')}`;
        setFileEntry({ type, label, name: file.name, status: 'error', rows: [], errorMsg });
        toast.error(`Arquivo inválido: ${file.name}`, { description: errorMsg });
        return;
      }
      setFileEntry({ type, label, name: file.name, status: 'pending', rows, validationWarnings: validation.warnings });
      if (validation.warnings.length > 0) toast.warning('Aviso de importação', { description: validation.warnings[0] });
    } catch (err: any) {
      setFileEntry({ type, label, name: file.name, status: 'error', rows: [], errorMsg: err.message });
      toast.error(`Erro ao ler ${file.name}`, { description: err.message });
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!selectedType) return;
    const file = e.dataTransfer.files[0];
    if (file) await handleFileForType(file, selectedType);
  }, [selectedType]);

  if (!isOpen) return null;

  const handleClick = () => {
    if (!selectedType) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) await handleFileForType(file, selectedType);
    };
    input.click();
  };

  const handleProceedToValidate = () => {
    if (!fileEntry || fileEntry.rows.length === 0 || !selectedType) { toast.error('Nenhum arquivo carregado'); return; }
    const summary = buildValidationSummary(selectedType, fileEntry.rows, periodo);
    if (summary.totalRows === 0) { setImportError('Nenhum registro válido encontrado. Verifique se as colunas obrigatórias estão preenchidas.'); return; }
    setImportError(null);
    setValidationSummary(summary);
    setStep('validate');
  };

  const handleConfirmImport = async () => {
    if (!validationSummary || !fileEntry || !selectedType) return;
    setImporting(true);
    setImportError(null);

    try {
      let { parsedScores, parsedNCs, parsedElogios } = validationSummary;

      // Por Andamento: accumulate scores progressively
      if (importMode === 'por-andamento' && selectedType === 'scores') {
        parsedScores = accumulateAndamento(parsedScores, periodo);
        setAndamentoCount(parsedScores.length);
      }

      console.log(`[IMPORT MODAL] Iniciando importação — período: ${periodo}, tipo: ${selectedType}`);
      console.log(`[IMPORT MODAL] Dados: ${parsedScores.length} scores, ${parsedNCs.length} NCs, ${parsedElogios.length} elogios`);

      // PRIMARY: Save to Supabase — single source of truth
      const supabaseResult = await importCycleDataToSupabase(parsedScores, parsedNCs, parsedElogios, periodo, fileEntry.name);

      if (!supabaseResult.success) {
        console.error('[IMPORT MODAL] Falha no Supabase:', supabaseResult.error);
        setImportError(`Erro ao salvar no banco de dados: ${supabaseResult.error || 'Erro desconhecido'}`);
        setImporting(false);
        return;
      }

      console.log(`[IMPORT MODAL] ✅ Supabase OK — cycleId: ${supabaseResult.cycleId}`);

      // Clear stale localStorage data for this period
      try {
        const LS_SCORES = 'zetti_cycle_scores';
        const LS_NCS = 'zetti_nc_records';
        const LS_ELOGIOS = 'zetti_elogios';
        const LS_CYCLES = 'zetti_import_cycles';
        const parse = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
        localStorage.setItem(LS_SCORES, JSON.stringify(parse(LS_SCORES).filter((r: any) => r.periodo !== periodo)));
        localStorage.setItem(LS_NCS, JSON.stringify(parse(LS_NCS).filter((r: any) => r.periodo !== periodo)));
        localStorage.setItem(LS_ELOGIOS, JSON.stringify(parse(LS_ELOGIOS).filter((r: any) => r.periodo !== periodo)));
        localStorage.setItem(LS_CYCLES, JSON.stringify(parse(LS_CYCLES).filter((r: any) => r.periodo !== periodo)));
      } catch { /* ignore localStorage errors */ }

      const IMPORT_STORAGE_KEY = 'zetti_import_records';
      const count = parsedScores.length || parsedNCs.length || parsedElogios.length;
      const tipoLabel = selectedType === 'scores' ? 'Qualidade' : selectedType === 'ncs' ? 'Não Conformidades' : 'Elogios';
      try {
        const existing = JSON.parse(localStorage.getItem(IMPORT_STORAGE_KEY) || '[]');
        const newRecord = {
          id: `import-${Date.now()}`,
          fileName: fileEntry.name,
          tipo: tipoLabel,
          modo: importMode === 'por-andamento' ? 'Por Andamento' : 'Ciclo Completo',
          periodo,
          data: new Date().toISOString(),
          rows: count,
        };
        localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify([newRecord, ...existing]));
      } catch { /* ignore */ }

      setFileEntry((prev) => prev ? { ...prev, status: 'success' } : prev);
      setStep('done');

      window.dispatchEvent(new CustomEvent('zetti_import_done', { detail: { tipo: tipoLabel, periodo, count, modo: importMode } }));
      if (importMode === 'por-andamento') {
        window.dispatchEvent(new CustomEvent('zetti_andamento_update', { detail: { periodo, count: parsedScores.length } }));
      }

      toast.success('Dados importados com sucesso!', { description: `${count} registros de ${selectedTypeInfo?.label} — Ciclo ${periodo}${importMode === 'por-andamento' ? ' (Por Andamento)' : ''}` });
      onImportSuccess?.();
    } catch (err: any) {
      console.error('[IMPORT MODAL] Erro inesperado:', err);
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setStep('choose-mode');
    setImportMode(null);
    setSelectedType(null);
    setFileEntry(null);
    setImportError(null);
    setValidationSummary(null);
    onClose();
  };

  const handleImportAnother = () => {
    setStep('choose-mode');
    setImportMode(null);
    setSelectedType(null);
    setFileEntry(null);
    setImportError(null);
    setValidationSummary(null);
  };

  const fmt = (n: number) => n.toFixed(2).replace('.', ',');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Importar Dados do Ciclo
            </h2>
            <p className="text-sm mt-0.5 text-slate-500">
              {step === 'choose-mode' ? 'Selecione o modo de importação'
                : step === 'choose-type' ? `Modo: ${importMode === 'por-andamento' ? 'Por Andamento' : 'Ciclo Completo'} — Selecione o tipo`
                : step === 'upload' ? `Importando: ${selectedTypeInfo?.label}`
                : step === 'validate' ? 'Revise os dados antes de confirmar'
                : 'Importação concluída'}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg transition-colors hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* STEP 0: Choose Mode */}
          {step === 'choose-mode' && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 block">
                  Período do Ciclo
                </label>
                <input type="text" value={periodo} onChange={(e) => handlePeriodoChange(e.target.value)} placeholder="Ex: 04/2026" className="input-field" />
              </div>

              {/* Closed cycle warning */}
              {cycleClosedWarning && (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>Ciclo Fechado — Importação Bloqueada</p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>O ciclo <strong>{periodo}</strong> está fechado. Somente um ADM pode reabri-lo na aba Ciclos.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 block">
                  Modo de Importação *
                </label>
                <div className="space-y-3">
                  {/* Ciclo Completo */}
                  <button
                    onClick={() => setImportMode('ciclo-completo')}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: `2px solid ${importMode === 'ciclo-completo' ? '#1E40AF' : '#E2E8F0'}`,
                      backgroundColor: importMode === 'ciclo-completo' ? 'rgba(30,64,175,0.05)' : '#FAFAFA',
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(30,64,175,0.12)' }}>
                      <Layers size={16} style={{ color: '#1E40AF' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Ciclo Completo</p>
                        {importMode === 'ciclo-completo' && <CheckCircle size={15} style={{ color: '#1E40AF' }} />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Importa todos os dados do ciclo de uma vez. Substitui dados existentes do período.</p>
                    </div>
                  </button>

                  {/* Por Andamento */}
                  <button
                    onClick={() => { setImportMode('por-andamento'); setAndamentoCount(getAndamentoCount(periodo)); }}
                    className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all"
                    style={{
                      border: `2px solid ${importMode === 'por-andamento' ? '#0891B2' : '#E2E8F0'}`,
                      backgroundColor: importMode === 'por-andamento' ? 'rgba(8,145,178,0.05)' : '#FAFAFA',
                    }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(8,145,178,0.12)' }}>
                      <GitMerge size={16} style={{ color: '#0891B2' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">Por Andamento</p>
                        {importMode === 'por-andamento' && <CheckCircle size={15} style={{ color: '#0891B2' }} />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Importa avaliações progressivamente conforme as auditorias são feitas. Acumula na aba Auditoria até o ciclo ser fechado.</p>
                      {importMode === 'por-andamento' && andamentoCount > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.2)' }}>
                          <Clock size={11} style={{ color: '#0891B2' }} />
                          <span className="text-xs font-medium" style={{ color: '#0891B2' }}>{andamentoCount} avaliações já acumuladas neste ciclo</span>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {importMode === 'por-andamento' && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                  <div className="flex items-start gap-2">
                    <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      <strong>Como funciona:</strong> Cada importação adiciona ou atualiza avaliações individuais. Os dados acumulam na aba <strong>Auditoria</strong> e o painel é atualizado em tempo real. O ciclo só é fechado manualmente.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => importMode && !cycleClosedWarning && setStep('choose-type')}
                disabled={!importMode || cycleClosedWarning}
                className="w-full btn-primary justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continuar <ChevronRight size={15} />
              </button>
            </>
          )}

          {/* STEP 1: Choose type */}
          {step === 'choose-type' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setStep('choose-mode')} className="text-xs text-blue-600 hover:underline">← Voltar</button>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: importMode === 'por-andamento' ? 'rgba(8,145,178,0.1)' : 'rgba(30,64,175,0.1)', color: importMode === 'por-andamento' ? '#0891B2' : '#1E40AF' }}>
                  {importMode === 'por-andamento' ? 'Por Andamento' : 'Ciclo Completo'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 block">Tipo de Planilha *</label>
                <div className="space-y-2">
                  {FILE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setSelectedType(opt.type)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                      style={{ border: `2px solid ${selectedType === opt.type ? opt.color : '#E2E8F0'}`, backgroundColor: selectedType === opt.type ? `${opt.color}08` : '#FAFAFA' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${opt.color}15` }}>
                        <Database size={15} style={{ color: opt.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.description}</p>
                      </div>
                      {selectedType === opt.type && <CheckCircle size={16} style={{ color: opt.color }} />}
                    </button>
                  ))}
                </div>
              </div>

              {selectedType && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                  <div className="flex items-start gap-2">
                    <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-blue-800 mb-1">Colunas obrigatórias:</p>
                      <p className="text-xs text-blue-700">{REQUIRED_COLUMNS[selectedType].join(' · ')}</p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => selectedType && setStep('upload')} disabled={!selectedType} className="w-full btn-primary justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar <ChevronRight size={15} />
              </button>
            </>
          )}

          {/* STEP 2: Upload */}
          {step === 'upload' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setStep('choose-type'); setFileEntry(null); }} className="text-xs text-blue-600 hover:underline">← Voltar</button>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${selectedTypeInfo?.color}15`, color: selectedTypeInfo?.color }}>{selectedTypeInfo?.label}</span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 block">Período do Ciclo</label>
                <input type="text" value={periodo} onChange={handlePeriodoChange} placeholder="Ex: 04/2026" className="input-field" />
              </div>

              {selectedType && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Colunas obrigatórias:</p>
                  <p className="text-xs text-slate-500">{REQUIRED_COLUMNS[selectedType].join(' · ')}</p>
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={handleClick}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
                style={{
                  border: `2px dashed ${dragOver ? selectedTypeInfo?.color : fileEntry?.status === 'error' ? '#DC2626' : fileEntry ? '#16A34A' : '#CBD5E1'}`,
                  backgroundColor: dragOver ? `${selectedTypeInfo?.color}06` : fileEntry?.status === 'error' ? '#FEF2F2' : fileEntry ? '#F0FDF4' : '#FAFAFA',
                }}
              >
                {fileEntry?.status === 'error' ? (
                  <>
                    <AlertCircle size={28} style={{ color: '#DC2626' }} />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-red-700">{fileEntry.name}</p>
                      <p className="text-xs text-red-500 mt-0.5">{fileEntry.errorMsg}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFileEntry(null); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Tentar outro arquivo</button>
                  </>
                ) : fileEntry && fileEntry.status === 'pending' ? (
                  <>
                    <CheckCircle size={28} style={{ color: '#16A34A' }} />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-800">{fileEntry.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{fileEntry.rows.length} linhas detectadas</p>
                    </div>
                    {fileEntry.validationWarnings && fileEntry.validationWarnings.length > 0 && (
                      <div className="w-full p-2 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                        {fileEntry.validationWarnings.map((w, i) => <p key={i} className="text-xs text-amber-700">{w}</p>)}
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setFileEntry(null); }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Remover arquivo</button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedTypeInfo?.color}12` }}>
                      <Upload size={22} style={{ color: selectedTypeInfo?.color }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">Clique ou arraste o arquivo aqui</p>
                      <p className="text-xs text-slate-400 mt-0.5">CSV, XLSX ou XLS</p>
                    </div>
                  </>
                )}
              </div>

              {importMode === 'por-andamento' && (
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                  <GitMerge size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    <strong>Modo Por Andamento:</strong> Esta importação será <strong>acumulada</strong> às avaliações já existentes no ciclo {periodo}. Analistas já importados serão atualizados.
                  </p>
                </div>
              )}

              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              <button
                onClick={handleProceedToValidate}
                disabled={!fileEntry || fileEntry.status === 'error' || fileEntry.rows.length === 0}
                className="w-full btn-primary justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={15} />
                Revisar antes de importar
              </button>
            </>
          )}

          {/* STEP 3: Validation Summary */}
          {step === 'validate' && validationSummary && (
            <div className="space-y-4">
              <button onClick={() => { setStep('upload'); setImportError(null); }} className="text-xs text-blue-600 hover:underline">← Voltar ao arquivo</button>

              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#DBEAFE' }}>
                  <ShieldCheck size={20} style={{ color: '#1E40AF' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">Resumo de Validação</p>
                  <p className="text-xs text-blue-600">
                    {fileEntry?.name} · Ciclo <strong>{periodo}</strong>
                    {importMode === 'por-andamento' && <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(8,145,178,0.15)', color: '#0891B2' }}>Por Andamento</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={14} className="text-slate-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linhas importadas</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{validationSummary.totalRows}</p>
                  <p className="text-xs text-slate-400 mt-0.5">registros válidos</p>
                </div>

                {validationSummary.qaAvg !== null && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart2 size={14} style={{ color: '#1E40AF' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#1E40AF' }}>Média QA</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#1E3A8A' }}>{fmt(validationSummary.qaAvg)}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#3B82F6' }}>calculado da planilha</p>
                  </div>
                )}

                {validationSummary.iepcAvg !== null && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={14} style={{ color: '#16A34A' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#16A34A' }}>Média IEPC</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#14532D' }}>{fmt(validationSummary.iepcAvg)}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>calculado da planilha</p>
                  </div>
                )}

                {validationSummary.totalNCs !== null && selectedType === 'scores' && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} style={{ color: '#EA580C' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#EA580C' }}>Total NCs</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#7C2D12' }}>{validationSummary.totalNCs}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#F97316' }}>soma da coluna</p>
                  </div>
                )}

                {validationSummary.ncRows !== null && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle size={14} style={{ color: '#DC2626' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#DC2626' }}>Registros NC</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#7F1D1D' }}>{validationSummary.ncRows}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>linhas válidas</p>
                  </div>
                )}

                {validationSummary.ncTotalPontos !== null && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF1F2', border: '1px solid #FECDD3' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Hash size={14} style={{ color: '#BE123C' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#BE123C' }}>Pts Deduzidos</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#881337' }}>{validationSummary.ncTotalPontos}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#F43F5E' }}>soma total</p>
                  </div>
                )}

                {validationSummary.elogioRows !== null && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={14} style={{ color: '#16A34A' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#16A34A' }}>Elogios</p>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: '#14532D' }}>{validationSummary.elogioRows}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>registros válidos</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <Info size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {importMode === 'por-andamento'
                    ? <>Os dados serão <strong>acumulados</strong> às avaliações existentes do ciclo <strong>{periodo}</strong>. Analistas já importados serão atualizados.</>
                    : <>Os valores acima foram <strong>calculados diretamente da planilha</strong>. Ao confirmar, os dados existentes para o ciclo <strong>{periodo}</strong> serão substituídos.</>
                  }
                </p>
              </div>

              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setStep('upload'); setImportError(null); }} className="flex-1 btn-secondary justify-center py-3" disabled={importing}>Cancelar</button>
                <button onClick={handleConfirmImport} disabled={importing} className="flex-1 btn-primary justify-center py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                  {importing ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : <><CheckCircle size={15} />Confirmar e Salvar</>}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Done */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#F0FDF4' }}>
                <CheckCircle size={32} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>Importação concluída!</p>
                <p className="text-sm text-slate-500 mt-1">
                  {validationSummary?.totalRows ?? fileEntry?.rows.length} registros de <strong>{selectedTypeInfo?.label}</strong> importados para o ciclo <strong>{periodo}</strong>.
                </p>
                {importMode === 'por-andamento' && (
                  <div className="mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg mx-auto" style={{ backgroundColor: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)', display: 'inline-flex' }}>
                    <GitMerge size={13} style={{ color: '#0891B2' }} />
                    <span className="text-xs font-medium" style={{ color: '#0891B2' }}>
                      {andamentoCount > 0 ? `${andamentoCount} avaliações acumuladas na aba Auditoria` : 'Dados acumulados na aba Auditoria'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={handleImportAnother} className="flex-1 btn-secondary justify-center py-2.5">Importar outro tipo</button>
                <button onClick={handleClose} className="flex-1 btn-primary justify-center py-2.5">Concluir</button>
              </div>
              <p className="text-xs text-slate-400">💡 Dados armazenados localmente. Limite aproximado: 5MB</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}