'use client';

// ─── localStorage keys ───────────────────────────────────────────────────────
const LS_SCORES   = 'zetti_cycle_scores';
const LS_NCS      = 'zetti_nc_records';
const LS_ELOGIOS  = 'zetti_elogios';
const LS_CYCLES   = 'zetti_import_cycles';
const LS_USERS    = 'zetti_user_profiles';
const LS_CLOSED_CYCLES = 'zetti_closed_cycles';
const LS_ANALYST_PROFILES = 'zetti_analyst_profiles';
const LS_MANUAL_CYCLES = 'zetti_manual_cycles';

/** Parse MM/YYYY or M/YYYY into sortable YYYYMM number. */
export function parsePeriodoMMYYYY(periodo: string): number {
  const m = String(periodo || '').trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return 0;
  return parseInt(m[2], 10) * 100 + parseInt(m[1], 10);
}

/** Newest cycle first (06/2026 before 05/2026). */
export function sortPeriodosDesc(periodos: string[]): string[] {
  return [...periodos].sort((a, b) => parsePeriodoMMYYYY(b) - parsePeriodoMMYYYY(a));
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CycleScoreRow {
  periodo: string;
  data_registro?: string;
  analista: string;
  squad: string;
  coordenador: string;
  auditor?: string;
  nota_final_qa: number;
  iepc_total: number;
  total_ncs: number;
  pontos_deduzidos_nc: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  e5: number;
  tipo_demanda?: string;
  qtd_atendimentos_avaliados?: number;
}

export interface NCRow {
  periodo: string;
  data_registro?: string;
  analista: string;
  squad: string;
  coordenador: string;
  auditor?: string;
  tipo_nc: string;
  descricao?: string;
  pontos_deduzidos: number;
  protocolo_referencia?: string;
  avaliacao_id?: string;
}

export interface ElogioRow {
  periodo: string;
  colaborador: string;
  squad: string;
  cliente?: string;
  protocolo?: string;
  elogio: string;
}

export interface ClosedCycle {
  id: string;
  periodo: string;
  closed_at: string;
  summary: {
    totalAnalistas: number;
    qaMedia: number;
    iepcMedia: number;
    totalNCs: number;
    totalElogios: number;
  };
}

export interface AnalystProfile {
  id: string;
  nome: string;
  cargo: string;
  nivel: string;
  coordenador: string;
  equipe: string;
  tempo_empresa_meses: number;
  data_admissao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function cleanKey(key: string): string {
  return key.replace(/^\uFEFF/, '').trim();
}

/**
 * Normalize a string: lowercase + remove accents/diacritics.
 * Used as an additional fallback key in buildRowMap.
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Build a case-insensitive lookup map from a raw row.
 * Stores: exact cleaned key, lowercase key, and accent-normalized key.
 */
function buildRowMap(row: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  Object.keys(row).forEach((k) => {
    const cleaned = cleanKey(k);
    r[cleaned] = row[k];                        // exact cleaned key
    r[cleaned.toLowerCase()] = row[k];          // lowercase key
    r[normalizeKey(cleaned)] = row[k];          // accent-normalized key
  });
  return r;
}

function lsGet<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSet<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── CSV Parsers ──────────────────────────────────────────────────────────────

export function parseQAScoresCSV(rows: Record<string, any>[], fallbackPeriodo?: string): CycleScoreRow[] {
  return rows.map((row) => {
    const r = buildRowMap(row);

    // Helper: get value by trying multiple key variants (exact, lowercase, normalized)
    const get = (...keys: string[]): any => {
      for (const k of keys) {
        const v = r[k] ?? r[k.toLowerCase()] ?? r[normalizeKey(k)];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    // Period: accept Período, Periodo, competencia, ciclo, mes/ano combo
    const rowPeriodo = String(get('Período', 'Periodo', 'período', 'periodo', 'competencia', 'ciclo') ?? '').trim();

    const qtdRaw = get(
      'Qtd de Atendimentos Avaliados', 'Qtd Atendimentos Avaliados',
      'Quantidade de Atendimentos Avaliados',
      'qtd_atendimentos', 'qtd_protocolos'
    );
    const qtdNum = parseNum(qtdRaw);

    const tipoDemanda = String(get('Tipo de Demanda', 'Tipo Demanda') ?? '').trim();

    // Analista: accept old "Analista" or new "analista_nome" / "analista"
    const analista = String(get('Analista', 'analista_nome', 'analista') ?? '').trim();

    // Squad / coordenador
    const squad = String(get('Squad', 'squad') ?? '').trim();
    const coordenador = String(get('Coordenador', 'coordenador') ?? '').trim();
    const auditor = String(get('Auditor', 'auditor') ?? '').trim();

    // Data: accept old "Data do Registro" or new "data_avaliacao"
    const dataRegistro = String(get('Data do Registro', 'data_avaliacao', 'data_registro') ?? '').trim();

    // Nota Final QA: accept old verbose name or new short name
    const notaFinalQA = parseNum(get(
      'Nota Final QA (0-100)',
      'nota_final_qa',
      'nota final qa'
    ));

    // IEPC total: accept old verbose name or new short "iepc"
    const iepcTotal = parseNum(get(
      'IEPC - Índice de Experiência Percebida pelo Cliente (0-100)',
      'IEPC - Indice de Experiencia Percebida pelo Cliente (0-100)',
      'IEPC',
      'iepc'
    ));

    // Total NCs
    const totalNCs = parseNum(get(
      'Total de Não Conformidades', 'Total de Nao Conformidades', 'Total NCs',
      'total_nao_conformidades', 'total_ncs'
    ));

    // Pontos deduzidos NC
    const pontosDeduzidosNC = parseNum(get(
      'Pontos Deduzidos por NC', 'Pontos Deduzidos',
      'pontos_deduzidos_nc'
    ));

    // QA Pillars — accept old verbose names OR new short names
    const p1 = parseNum(get(
      'QA P1 | Gestão do Fluxo e Rastreabilidade do Atendimento - Pontos',
      'QA P1 | Gestao do Fluxo e Rastreabilidade do Atendimento - Pontos',
      'qa_atendimento_pontos'
    ));
    const p2 = parseNum(get(
      'QA P2 | Gestão da Tratativa da Demanda - Pontos',
      'QA P2 | Gestao da Tratativa da Demanda - Pontos',
      'qa_solucao_pontos'
    ));
    const p3 = parseNum(get(
      'QA P3 | Análise e Assertividade Técnica da Demanda - Pontos',
      'QA P3 | Analise e Assertividade Tecnica da Demanda - Pontos',
      'qa_precisao_pontos'
    ));
    const p4 = parseNum(get(
      'QA P4 | Qualidade da Comunicação no Atendimento - Pontos',
      'QA P4 | Qualidade da Comunicacao no Atendimento - Pontos',
      'qa_comunicacao_pontos'
    ));
    const p5 = parseNum(get(
      'QA P5 | Conduta Relacional no Atendimento - Pontos',
      'qa_relacionamento_pontos'
    ));

    // IEPC dimensions — accept old verbose names OR new short names
    const e1 = parseNum(get(
      'IEPC E1 – Resolução Percebida - Pontos',
      'IEPC E1 - Resolução Percebida - Pontos',
      'IEPC E1 – Resolucao Percebida - Pontos',
      'IEPC E1 - Resolucao Percebida - Pontos',
      'iepc_resolucaoPercebida_pontos',
      'iepc_resolucaopercebida_pontos'
    ));
    const e2 = parseNum(get(
      'IEPC E2 – Compreensão e Segurança - Pontos',
      'IEPC E2 - Compreensão e Segurança - Pontos',
      'IEPC E2 – Compreensao e Seguranca - Pontos',
      'IEPC E2 - Compreensao e Seguranca - Pontos',
      'iepc_clarezaConfianca_pontos',
      'iepc_clarezaconfianca_pontos'
    ));
    const e3 = parseNum(get(
      'IEPC E3 – Esforço do Cliente - Pontos',
      'IEPC E3 - Esforço do Cliente - Pontos',
      'IEPC E3 – Esforco do Cliente - Pontos',
      'IEPC E3 - Esforco do Cliente - Pontos',
      'iepc_esforcoCliente_pontos',
      'iepc_esforcocliente_pontos'
    ));
    const e4 = parseNum(get(
      'IEPC E4 – Tempo e Fluidez - Pontos',
      'IEPC E4 - Tempo e Fluidez - Pontos',
      'iepc_tempoFluidez_pontos',
      'iepc_tempofluidez_pontos'
    ));
    const e5 = parseNum(get(
      'IEPC E5 – Experiência Relacional - Pontos',
      'IEPC E5 - Experiência Relacional - Pontos',
      'IEPC E5 – Experiencia Relacional - Pontos',
      'IEPC E5 - Experiencia Relacional - Pontos',
      'iepc_experienciaRelacional_pontos',
      'iepc_experienciarelacional_pontos'
    ));

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      data_registro: dataRegistro,
      analista,
      squad,
      coordenador,
      auditor: auditor || undefined,
      nota_final_qa: notaFinalQA,
      iepc_total: iepcTotal,
      total_ncs: totalNCs,
      pontos_deduzidos_nc: pontosDeduzidosNC,
      p1,
      p2,
      p3,
      p4,
      p5,
      e1,
      e2,
      e3,
      e4,
      e5,
      tipo_demanda: tipoDemanda || undefined,
      qtd_atendimentos_avaliados: qtdNum > 0 ? qtdNum : undefined,
    };
  }).filter((r) => r.analista && r.squad);
}

export function parseNCsCSV(rows: Record<string, any>[], fallbackPeriodo?: string): NCRow[] {
  return rows.map((row) => {
    const r = buildRowMap(row);

    const get = (...keys: string[]): any => {
      for (const k of keys) {
        const v = r[k] ?? r[k.toLowerCase()] ?? r[normalizeKey(k)];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    const rowPeriodo = String(get('Período', 'Periodo') ?? '').trim();

    const tipo_nc_raw = String(get(
      'Tipo de Não Conformidade',
      'Tipo de Nao Conformidade',
      'Tipo NC',
      'Tipo de NC',
      'Tipo Não Conformidade',
      'Tipo Nao Conformidade',
      'NC',
      'Tipo',
    ) ?? '').trim();

    const descricao_raw = String(get(
      'Descrição',
      'Descricao',
      'Descrição da NC',
      'Descricao da NC',
      'Desc',
      'Observação',
      'Observacao',
      'Observações',
      'Observacoes',
    ) ?? '').trim();

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      data_registro: String(get('Data do Registro') ?? '').trim(),
      analista: String(get('Analista') ?? '').trim(),
      squad: String(get('Squad') ?? '').trim(),
      coordenador: String(get('Coordenador') ?? '').trim(),
      auditor: String(get('Auditor') ?? '').trim(),
      tipo_nc: tipo_nc_raw || 'Não Especificado',
      descricao: descricao_raw || undefined,
      pontos_deduzidos: parseNum(get('Pontos Deduzidos', 'Pontos Deduzidos por NC', 'pontos_deduzidos')),
      protocolo_referencia: String(get('Protocolo Referência', 'Protocolo Referencia', 'Protocolo') ?? '').trim(),
      avaliacao_id: String(get('ID da Avaliação', 'ID da Avaliacao', 'ID Avaliação') ?? '').trim(),
    };
  }).filter((r) => r.analista); // Only require analista — tipo_nc now has fallback
}

export function parseElogiosCSV(rows: Record<string, any>[], fallbackPeriodo?: string): ElogioRow[] {
  return rows.map((row) => {
    const r = buildRowMap(row);

    const get = (...keys: string[]): any => {
      for (const k of keys) {
        const v = r[k] ?? r[k.toLowerCase()] ?? r[normalizeKey(k)];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };

    const rowPeriodo = String(get('Período', 'Periodo') ?? '').trim();

    const colaborador = String(get('Colaborador', 'COLABORADOR', 'Nome', 'NOME') ?? '').trim();
    const elogio = String(get('Elogio', 'ELOGIO', 'Descrição do Elogio', 'Descricao', 'DESCRICAO', 'Texto') ?? '').trim();

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      colaborador,
      squad: String(get('SQUAD', 'Squad') ?? '').trim(),
      cliente: String(get('CLIENTE', 'Cliente') ?? '').trim(),
      protocolo: String(get('PROTOCOLO', 'Protocolo') ?? '').trim(),
      elogio,
    };
  }).filter((r) => r.colaborador && r.elogio);
}

// ─── Import (Supabase-first, localStorage removed as primary store) ───────────

export async function importCycleData(
  scores: CycleScoreRow[],
  ncs: NCRow[],
  elogios: ElogioRow[],
  periodo: string,
  fileName: string
): Promise<{ success: boolean; error?: string; cycleId?: string }> {
  // Always try Supabase first — it is the single source of truth
  try {
    const { importCycleDataToSupabase } = await import('./supabaseDataService');
    const result = await importCycleDataToSupabase(scores, ncs, elogios, periodo, fileName);
    if (result.success) {
      // Clear any stale localStorage data for this period so reads come from Supabase
      if (typeof window !== 'undefined') {
        try {
          const existingScores = lsGet<any>(LS_SCORES).filter((r) => r.periodo !== periodo);
          lsSet(LS_SCORES, existingScores);
          const existingNCs = lsGet<any>(LS_NCS).filter((r) => r.periodo !== periodo);
          lsSet(LS_NCS, existingNCs);
          const existingElogios = lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo !== periodo);
          lsSet(LS_ELOGIOS, existingElogios);
          const existingCycles = lsGet<any>(LS_CYCLES).filter((r) => r.periodo !== periodo);
          lsSet(LS_CYCLES, existingCycles);
        } catch { /* ignore */ }
      }
      dispatchDataChanged({ tipo: 'import', periodo, fileName });
      return result;
    }
    // Supabase failed — do NOT fall back to localStorage for imports
    return { success: false, error: result.error || 'Falha ao salvar no banco de dados.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Delete functions ─────────────────────────────────────────────────────────

/**
 * Delete all data for a specific period from SUPABASE (scores, NCs, elogios, cycle record)
 */
export async function deletePeriodDataFromDB(periodo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      // Delete child tables first, then parent
      await supabase.from('cycle_scores').delete().eq('periodo', periodo);
      await supabase.from('nc_records').delete().eq('periodo', periodo);
      await supabase.from('elogios').delete().eq('periodo', periodo);
      await supabase.from('pdi_records').delete().eq('periodo', periodo);
      await supabase.from('cycle_summaries').delete().eq('periodo', periodo);
      await supabase.from('import_cycles').delete().eq('periodo', periodo);
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  // Also clear localStorage
  lsSet(LS_SCORES,  lsGet<any>(LS_SCORES).filter((r) => r.periodo !== periodo));
  lsSet(LS_NCS,     lsGet<any>(LS_NCS).filter((r) => r.periodo !== periodo));
  lsSet(LS_ELOGIOS, lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo !== periodo));
  lsSet(LS_CYCLES,  lsGet<any>(LS_CYCLES).filter((r) => r.periodo !== periodo));
  dispatchDataChanged({ tipo: 'delete', periodo });
  return { success: true };
}

/**
 * Delete all data for a specific period (scores, NCs, elogios, cycle record, import records)
 */
export function deletePeriodData(periodo: string): void {
  lsSet(LS_SCORES,  lsGet<any>(LS_SCORES).filter((r) => r.periodo !== periodo));
  lsSet(LS_NCS,     lsGet<any>(LS_NCS).filter((r) => r.periodo !== periodo));
  lsSet(LS_ELOGIOS, lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo !== periodo));
  lsSet(LS_CYCLES,  lsGet<any>(LS_CYCLES).filter((r) => r.periodo !== periodo));

  // Also remove from import records
  if (typeof window !== 'undefined') {
    try {
      const IMPORT_KEY = 'zetti_import_records';
      const existing = JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]');
      localStorage.setItem(IMPORT_KEY, JSON.stringify(existing.filter((r: any) => r.periodo !== periodo)));
    } catch { /* ignore */ }
  }
  dispatchDataChanged({ tipo: 'delete', periodo });
}

/**
 * Delete a single import record by id (removes from import list only, keeps cycle data)
 */
export function deleteImportRecord(importId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const IMPORT_KEY = 'zetti_import_records';
    const existing = JSON.parse(localStorage.getItem(IMPORT_KEY) || '[]');
    localStorage.setItem(IMPORT_KEY, JSON.stringify(existing.filter((r: any) => r.id !== importId)));
  } catch { /* ignore */ }
}

/**
 * Delete ALL imported data (full reset)
 */
export function deleteAllData(): void {
  lsSet(LS_SCORES, []);
  lsSet(LS_NCS, []);
  lsSet(LS_ELOGIOS, []);
  lsSet(LS_CYCLES, []);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('zetti_import_records');
    localStorage.removeItem('zetti_audit_data');
  }
  dispatchDataChanged({ tipo: 'delete_all' });
}

// ─── Cycle closing ────────────────────────────────────────────────────────────

export async function closeCycle(periodo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const scores = lsGet<any>(LS_SCORES).filter((r) => r.periodo === periodo);
    const ncs = lsGet<any>(LS_NCS).filter((r) => r.periodo === periodo);
    const elogios = lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo === periodo);

    const qaMedia = scores.length > 0
      ? scores.reduce((s: number, r: any) => s + (r.nota_final_qa || 0), 0) / scores.length
      : 0;
    const iepcMedia = scores.length > 0
      ? scores.reduce((s: number, r: any) => s + (r.iepc_total || 0), 0) / scores.length
      : 0;

    const closedCycle: ClosedCycle = {
      id: `closed-${Date.now()}`,
      periodo,
      closed_at: new Date().toISOString(),
      summary: {
        totalAnalistas: scores.length,
        qaMedia: Math.round(qaMedia * 100) / 100,
        iepcMedia: Math.round(iepcMedia * 100) / 100,
        totalNCs: ncs.length,
        totalElogios: elogios.length,
      },
    };

    const existing = lsGet<ClosedCycle>(LS_CLOSED_CYCLES).filter((c) => c.periodo !== periodo);
    lsSet(LS_CLOSED_CYCLES, [...existing, closedCycle]);
    dispatchDataChanged({ tipo: 'cycle_closed', periodo });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function fetchClosedCycles(): ClosedCycle[] {
  return lsGet<ClosedCycle>(LS_CLOSED_CYCLES);
}

export function reopenCycle(periodo: string): void {
  const existing = lsGet<ClosedCycle>(LS_CLOSED_CYCLES).filter((c) => c.periodo !== periodo);
  lsSet(LS_CLOSED_CYCLES, existing);
  dispatchDataChanged({ tipo: 'cycle_reopened', periodo });
}

export function isCycleClosed(periodo: string): boolean {
  // Sync check: read from localStorage cache that was populated by syncClosedCyclesFromSupabase
  // This is intentionally sync — callers that need real-time should use the async version
  const cycles = lsGet<any>(LS_CYCLES);
  const cycle = cycles.find((c: any) => c.periodo === periodo);
  if (cycle?.is_closed !== undefined) return !!cycle.is_closed;
  // Also check closed cycles list
  const closed = lsGet<ClosedCycle>(LS_CLOSED_CYCLES);
  return closed.some((c) => c.periodo === periodo);
}

/**
 * Async version: checks Supabase directly for real-time cycle status.
 * Use this when you need guaranteed accuracy (e.g., before allowing import).
 */
export async function isCycleClosedAsync(periodo: string): Promise<boolean> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase
        .from('import_cycles')
        .select('is_closed, status')
        .eq('periodo', periodo)
        .maybeSingle();
      if (data) return !!data.is_closed || data.status === 'fechado';
    }
  } catch { /* fall through */ }
  return isCycleClosed(periodo);
}

/**
 * Sync closed cycle status from Supabase into localStorage cache.
 * Call this on app init or after loading cycle data from Supabase.
 */
export function syncClosedCyclesFromSupabase(supabaseCycles: { periodo: string; is_closed: boolean; closed_at?: string; status?: string }[]): void {
  // Update LS_CLOSED_CYCLES (legacy list)
  const existing = lsGet<ClosedCycle>(LS_CLOSED_CYCLES);
  const existingPeriodos = new Set(existing.map((c) => c.periodo));

  const toAdd: ClosedCycle[] = supabaseCycles
    .filter((c) => c.is_closed && !existingPeriodos.has(c.periodo))
    .map((c) => ({
      id: `closed-supabase-${c.periodo}`,
      periodo: c.periodo,
      closed_at: c.closed_at || new Date().toISOString(),
      summary: { totalAnalistas: 0, qaMedia: 0, iepcMedia: 0, totalNCs: 0, totalElogios: 0 },
    }));

  // Remove from closed list if Supabase says it's reopened
  const reopenedPeriodos = new Set(supabaseCycles.filter((c) => !c.is_closed).map((c) => c.periodo));
  const filtered = existing.filter((c) => !reopenedPeriodos.has(c.periodo));

  if (toAdd.length > 0 || reopenedPeriodos.size > 0) {
    lsSet(LS_CLOSED_CYCLES, [...filtered, ...toAdd]);
  }

  // Also update LS_CYCLES cache with is_closed flag so isCycleClosed() works
  const cachedCycles = lsGet<any>(LS_CYCLES);
  const updatedCycles = cachedCycles.map((c: any) => {
    const supaEntry = supabaseCycles.find((s) => s.periodo === c.periodo);
    if (supaEntry) {
      return { ...c, is_closed: supaEntry.is_closed, status: supaEntry.status || c.status };
    }
    return c;
  });
  // Add any periods from Supabase not yet in cache
  supabaseCycles.forEach((s) => {
    if (!updatedCycles.find((c: any) => c.periodo === s.periodo)) {
      updatedCycles.push({ periodo: s.periodo, is_closed: s.is_closed, status: s.status || 'aberto' });
    }
  });
  lsSet(LS_CYCLES, updatedCycles);
}

// ─── Build Analyst objects from real score data ───────────────────────────────

export interface RealAnalyst {
  id: string;
  name: string;
  squad: string;
  coordenador: string;
  auditor: string;
  qaScore: number;
  iepcScore: number;
  ncs: number;
  pontosDeduzidos: number;
  ncPoints?: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  e1: number;
  e2: number;
  e3: number;
  e4: number;
  e5: number;
  periodo: string;
  avatar: string;
  role: string;
}

export function buildAnalystsFromScores(scores: any[]): RealAnalyst[] {
  return scores.map((s, i) => ({
    id: s.id || `analyst-${i}`,
    name: s.analista || '',
    squad: s.squad || '',
    coordenador: s.coordenador || '',
    auditor: s.auditor || '',
    qaScore: s.nota_final_qa || 0,
    iepcScore: s.iepc_total || 0,
    ncs: s.total_ncs || 0,
    pontosDeduzidos: Math.abs(Number(s.pontos_deduzidos_nc) || 0),
    ncPoints: Math.abs(Number(s.pontos_deduzidos_nc) || 0),
    p1: s.p1 || 0,
    p2: s.p2 || 0,
    p3: s.p3 || 0,
    p4: s.p4 || 0,
    p5: s.p5 || 0,
    e1: s.e1 || 0,
    e2: s.e2 || 0,
    e3: s.e3 || 0,
    e4: s.e4 || 0,
    e5: s.e5 || 0,
    periodo: s.periodo || '',
    avatar: (s.analista || 'A').substring(0, 2).toUpperCase(),
    role: 'Analista',
  }));
}

// ─── Export cycle data as CSV ─────────────────────────────────────────────────

export function exportCycleToCSV(periodo: string): void {
  const scores = lsGet<any>(LS_SCORES).filter((r) => r.periodo === periodo);
  const ncs = lsGet<any>(LS_NCS).filter((r) => r.periodo === periodo);
  const elogios = lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo === periodo);

  if (scores.length === 0 && ncs.length === 0 && elogios.length === 0) return;

  // Export scores
  if (scores.length > 0) {
    const headers = ['Período','Analista','Squad','Coordenador','Auditor','Nota Final QA','IEPC Total','Total NCs','Pontos Deduzidos','P1','P2','P3','P4','P5','E1','E2','E3','E4','E5','Tipo de Demanda','Qtd Atendimentos Avaliados'];
    const rows = scores.map((s: any) => [
      s.periodo, s.analista, s.squad, s.coordenador, s.auditor || '',
      s.nota_final_qa, s.iepc_total, s.total_ncs, s.pontos_deduzidos_nc,
      s.p1, s.p2, s.p3, s.p4, s.p5, s.e1, s.e2, s.e3, s.e4, s.e5,
      s.tipo_demanda || '', s.qtd_atendimentos_avaliados || '',
    ]);
    downloadCSV(`pontuacoes_qa_${periodo.replace('/', '-')}.csv`, headers, rows);
  }

  // Export NCs
  if (ncs.length > 0) {
    const headers = ['Período','Analista','Squad','Coordenador','Auditor','Tipo de NC','Descrição','Pontos Deduzidos','Protocolo Referência','ID da Avaliação'];
    const rows = ncs.map((n: any) => [
      n.periodo, n.analista, n.squad, n.coordenador, n.auditor || '',
      n.tipo_nc, n.descricao || '', n.pontos_deduzidos, n.protocolo_referencia || '', n.avaliacao_id || '',
    ]);
    downloadCSV(`nao_conformidades_${periodo.replace('/', '-')}.csv`, headers, rows);
  }

  // Export elogios
  if (elogios.length > 0) {
    const headers = ['Período','Colaborador','Squad','Cliente','Protocolo','Elogio'];
    const rows = elogios.map((e: any) => [
      e.periodo, e.colaborador, e.squad, e.cliente || '', e.protocolo || '', e.elogio,
    ]);
    downloadCSV(`elogios_${periodo.replace('/', '-')}.csv`, headers, rows);
  }
}

function downloadCSV(filename: string, headers: string[], rows: any[][]): void {
  if (typeof window === 'undefined') return;
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Fetch functions (Supabase-first, localStorage fallback) ──────────────────

export async function fetchCycleScores(periodo?: string): Promise<any[]> {
  // Try Supabase first
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('cycle_scores').select('*');
      if (periodo) query = query.eq('periodo', periodo);
      const { data, error } = await query.order('nota_final_qa', { ascending: false });
      if (error) {
        console.error('[fetchCycleScores] Supabase error:', error.message, error.code);
      } else {
        console.log(`[fetchCycleScores] ${data?.length || 0} registros${periodo ? ` para ${periodo}` : ''}`);
        // Supabase is authoritative — return its data (even if empty)
        return (data || []);
      }
    }
  } catch (err: any) {
    console.error('[fetchCycleScores] Supabase unreachable:', err.message);
  }

  // Fallback: localStorage (only when Supabase is unreachable)
  const data = lsGet<any>(LS_SCORES);
  if (periodo) return data.filter((r: any) => r.periodo === periodo);
  return data.sort((a: any, b: any) => b.nota_final_qa - a.nota_final_qa);
}

export async function fetchNCRecords(periodo?: string): Promise<any[]> {
  // Supabase is the single source of truth
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('nc_records').select('*');
      if (periodo) query = query.eq('periodo', periodo);
      const { data, error } = await query;
      if (!error) {
        return (data || []);
      }
    }
  } catch { /* fall through to localStorage */ }

  // Fallback: localStorage (only when Supabase is unreachable)
  const data = lsGet<any>(LS_NCS);
  if (periodo) return data.filter((r) => r.periodo === periodo);
  return data;
}

export async function deleteNCRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('nc_records').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: false, error: 'Supabase não disponível' };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Erro desconhecido' };
  }
}

export async function fetchElogios(periodo?: string): Promise<any[]> {
  // Supabase is the single source of truth
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('elogios').select('*');
      if (periodo) query = query.eq('periodo', periodo);
      const { data, error } = await query;
      if (!error) {
        return (data || []);
      }
    }
  } catch { /* fall through to localStorage */ }

  // Fallback: localStorage (only when Supabase is unreachable)
  const data = lsGet<any>(LS_ELOGIOS);
  if (periodo) return data.filter((r) => r.periodo === periodo);
  return data;
}

export async function fetchAllPeriodos(): Promise<string[]> {
  // Supabase is the single source of truth
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const [cyclesRes, scoresRes] = await Promise.all([
        supabase.from('import_cycles').select('periodo').order('periodo', { ascending: false }),
        supabase.from('cycle_scores').select('periodo'),
      ]);

      if (cyclesRes.error) console.error('[fetchAllPeriodos] import_cycles error:', cyclesRes.error.message, cyclesRes.error.code);
      if (scoresRes.error) console.error('[fetchAllPeriodos] cycle_scores error:', scoresRes.error.message, scoresRes.error.code);

      // Use Supabase data exclusively (even if empty — empty means no data imported yet)
      const all = [
        ...(cyclesRes.data || []).map((r: any) => r.periodo),
        ...(scoresRes.data || []).map((r: any) => r.periodo),
      ].filter(Boolean);
      const unique = sortPeriodosDesc([...new Set(all)] as string[]);
      console.log('[fetchAllPeriodos] Períodos do Supabase:', unique.join(', ') || 'nenhum');
      return unique;
    }
  } catch (err: any) {
    console.error('[fetchAllPeriodos] Supabase unreachable:', err.message);
  }

  // Fallback: localStorage (only when Supabase is unreachable)
  const cycles = lsGet<any>(LS_CYCLES);
  let periodos = [...new Set(cycles.map((c: any) => c.periodo as string))].filter(Boolean);

  if (periodos.length === 0) {
    const scores = lsGet<any>(LS_SCORES);
    const ncs = lsGet<any>(LS_NCS);
    const elogios = lsGet<any>(LS_ELOGIOS);
    const allPeriodos = [
      ...scores.map((s: any) => s.periodo),
      ...ncs.map((n: any) => n.periodo),
      ...elogios.map((e: any) => e.periodo),
    ].filter(Boolean);
    periodos = sortPeriodosDesc([...new Set(allPeriodos)] as string[]);
  }

  return sortPeriodosDesc(periodos);
}

export async function toggleElogioDestaque(id: string, destaque: boolean) {
  // Update in Supabase (single source of truth)
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      await supabase.from('elogios').update({ destaque }).eq('id', id);
      return;
    }
  } catch { /* fall through */ }
  // Fallback: localStorage
  const data = lsGet<any>(LS_ELOGIOS).map((e: any) =>
    e.id === id ? { ...e, destaque } : e
  );
  lsSet(LS_ELOGIOS, data);
}

// ─── User Profiles (localStorage only) ───────────────────────────────────────

const DEFAULT_USERS = [
  { id: 'admin-1', email: 'brunaramos1807@gmail.com', full_name: 'Bruna Ramos', role: 'Admin', squad: '', avatar: 'BR' },
  { id: 'admin-2', email: 'bruna.silva@zetti.tech',   full_name: 'Bruna Silva',  role: 'Admin', squad: '', avatar: 'BS' },
];

export async function fetchUserProfiles() {
  const stored = lsGet<any>(LS_USERS);
  if (stored.length > 0) return stored;
  // Seed defaults on first call
  lsSet(LS_USERS, DEFAULT_USERS);
  return DEFAULT_USERS;
}

export async function updateUserRole(id: string, role: string) {
  const users = lsGet<any>(LS_USERS).map((u: any) =>
    u.id === id ? { ...u, role } : u
  );
  lsSet(LS_USERS, users);
}

// ─── Analyst Profiles (Gestão) ────────────────────────────────────────────────

export function fetchAnalystProfiles(): AnalystProfile[] {
  return lsGet<AnalystProfile>(LS_ANALYST_PROFILES);
}

export function saveAnalystProfile(profile: Omit<AnalystProfile, 'id' | 'created_at' | 'updated_at'>): AnalystProfile {
  const existing = lsGet<AnalystProfile>(LS_ANALYST_PROFILES);
  const now = new Date().toISOString();
  const newProfile: AnalystProfile = {
    ...profile,
    id: `analyst-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: now,
    updated_at: now,
  };
  lsSet(LS_ANALYST_PROFILES, [...existing, newProfile]);
  return newProfile;
}

export function updateAnalystProfile(id: string, updates: Partial<Omit<AnalystProfile, 'id' | 'created_at'>>): void {
  const existing = lsGet<AnalystProfile>(LS_ANALYST_PROFILES);
  lsSet(
    LS_ANALYST_PROFILES,
    existing.map((p) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
  );
}

export function deleteAnalystProfile(id: string): void {
  lsSet(LS_ANALYST_PROFILES, lsGet<AnalystProfile>(LS_ANALYST_PROFILES).filter((p) => p.id !== id));
}

export function getAnalystHistory(nomeAnalista: string): {
  scores: any[];
  ncs: any[];
  elogios: any[];
} {
  const nameLower = nomeAnalista.toLowerCase().trim();
  const scores = lsGet<any>(LS_SCORES).filter((r) =>
    (r.analista || '').toLowerCase().trim() === nameLower
  ).sort((a: any, b: any) => a.periodo.localeCompare(b.periodo));

  const ncs = lsGet<any>(LS_NCS).filter((r) =>
    (r.analista || '').toLowerCase().trim() === nameLower
  ).sort((a: any, b: any) => (a.periodo || '').localeCompare(b.periodo || ''));

  const elogios = lsGet<any>(LS_ELOGIOS).filter((r) =>
    (r.colaborador || '').toLowerCase().trim() === nameLower
  ).sort((a: any, b: any) => (a.periodo || '').localeCompare(b.periodo || ''));

  return { scores, ncs, elogios };
}

// ─── Manual Cycle Entry (previous cycles before site existed) ─────────────────

export interface ManualCycleEntry {
  id: string;
  periodo: string;
  qa_media: number;
  iepc_media: number;
  total_ncs: number;
  total_analistas?: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export function fetchManualCycles(): ManualCycleEntry[] {
  return lsGet<ManualCycleEntry>(LS_MANUAL_CYCLES);
}

export function saveManualCycle(entry: Omit<ManualCycleEntry, 'id' | 'created_at' | 'updated_at'>): ManualCycleEntry {
  const existing = lsGet<ManualCycleEntry>(LS_MANUAL_CYCLES);
  const now = new Date().toISOString();
  // Upsert by periodo
  const idx = existing.findIndex((e) => e.periodo === entry.periodo);
  if (idx >= 0) {
    const updated = { ...existing[idx], ...entry, updated_at: now };
    existing[idx] = updated;
    lsSet(LS_MANUAL_CYCLES, existing);
    dispatchDataChanged({ tipo: 'manual_cycle', periodo: entry.periodo });
    return updated;
  }
  const newEntry: ManualCycleEntry = {
    ...entry,
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: now,
    updated_at: now,
  };
  lsSet(LS_MANUAL_CYCLES, [...existing, newEntry]);
  dispatchDataChanged({ tipo: 'manual_cycle', periodo: entry.periodo });
  return newEntry;
}

export function deleteManualCycle(id: string): void {
  lsSet(LS_MANUAL_CYCLES, lsGet<ManualCycleEntry>(LS_MANUAL_CYCLES).filter((e) => e.id !== id));
  dispatchDataChanged({ tipo: 'delete_manual_cycle' });
}

// ─── Delete analyst from imported scores ──────────────────────────────────────

/**
 * Delete all score/NC/elogio records for a specific analyst name in a given period.
 * If periodo is omitted, removes the analyst from ALL periods.
 */
export function deleteAnalystFromData(analystName: string, periodo?: string): void {
  const nameLower = analystName.toLowerCase().trim();
  const matchFn = (r: any) => {
    const nameMatch = (r.analista || r.colaborador || '').toLowerCase().trim() === nameLower;
    if (!nameMatch) return false;
    if (periodo) return r.periodo === periodo;
    return true;
  };
  lsSet(LS_SCORES,  lsGet<any>(LS_SCORES).filter((r) => !matchFn(r)));
  lsSet(LS_NCS,     lsGet<any>(LS_NCS).filter((r) => !matchFn(r)));
  lsSet(LS_ELOGIOS, lsGet<any>(LS_ELOGIOS).filter((r) => !matchFn(r)));
  dispatchDataChanged({ tipo: 'delete_analyst', analystName, periodo });
}

// ─── PDI Supabase functions ───────────────────────────────────────────────────

export interface PDIRecord {
  id: string;
  cycle_id?: string;
  periodo: string;
  analista: string;
  squad: string;
  coordenador: string;
  status_pdi: 'Em andamento' | 'Atrasado' | 'Concluído' | 'Crítico' | 'Parcial' | 'Aderido' | 'Em reavaliação' | 'Não aderido' | 'aguardando alinhamento' | 'em evolucao' | 'em acompanhamento' | 'em validacao' | 'consolidado' | 'evolucao concluida' | 'reincidente';
  acoes: any[];
  metas: any[];
  evidencias: any[];
  feedback?: string;
  nc_reincidentes: any[];
  qa_score: number;
  iepc_score: number;
  sintese_ia?: string;
  source: string;
  created_at: string;
  updated_at: string;
  // Core fields
  objetivo?: string;
  prazo?: string;
  observacoes?: string;
  // Extended PDI fields
  evolucao_tecnica?: string;
  evolucao_comportamental?: string;
  performance_operacional?: string;
  risco_operacional?: string;
  plano_desenvolvimento?: string;
  proxima_revisao?: string;
  ciclo?: string;
  // Enterprise PDI fields (from feedback)
  feedback_id?: string;
  analista_id?: string;
  aderencia_score?: number;
  total_ncs?: number;
  total_elogios?: number;
  objetivo_desenvolvimento?: string;
  acao_desenvolvimento?: string;
  resultado_esperado?: string;
  mensagem_evolutiva?: string;
  comentario_coordenador?: string;
  comentario_analista?: string;
  data_acompanhamento?: string;
  proxima_revisao_date?: string;
  attachments?: any[];
}

export interface PDIObjective {
  id: string;
  pdi_id: string;
  descricao: string;
  categoria?: string;
  peso: number;
  status: 'cumprido' | 'parcial' | 'nao_cumprido';
  observacao_coordenador?: string;
  data_atualizacao?: string;
  created_at?: string;
}

export interface PDITimelineEvent {
  id: string;
  pdi_id: string;
  data_evento: string;
  titulo: string;
  descricao?: string;
  tipo: 'criacao' | 'atualizacao' | 'melhoria' | 'validacao' | 'conclusao' | 'evento';
  created_at?: string;
}

export async function fetchPDIRecords(filters?: { periodo?: string; squad?: string; analista?: string }): Promise<PDIRecord[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('pdi_records').select('*').order('created_at', { ascending: false });
      if (filters?.periodo) query = query.eq('periodo', filters.periodo);
      if (filters?.squad) query = query.eq('squad', filters.squad);
      if (filters?.analista) query = query.eq('analista', filters.analista);
      const { data, error } = await query;
      if (!error && data) return data as PDIRecord[];
    }
  } catch { /* fall through */ }
  // Fallback: localStorage legacy
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('zetti_pdis');
      const pdis = raw ? JSON.parse(raw) : [];
      return pdis.map((p: any) => ({
        ...p,
        status_pdi: p.status === 'concluido' ? 'Concluído' : p.status === 'em_andamento' ? 'Em andamento' : 'Em andamento',
        acoes: [], metas: [], evidencias: [], nc_reincidentes: [],
        qa_score: 0, iepc_score: 0, source: 'manual',
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      }));
    } catch { return []; }
  }
  return [];
}

export async function savePDIRecord(pdi: Omit<PDIRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: PDIRecord; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('pdi_records').insert({
        ...pdi,
        acoes: pdi.acoes || [],
        metas: pdi.metas || [],
        evidencias: pdi.evidencias || [],
        nc_reincidentes: pdi.nc_reincidentes || [],
      }).select().single();
      if (error) return { success: false, error: error.message };
      dispatchDataChanged({ tipo: 'pdi_saved', analista: pdi.analista });
      return { success: true, data: data as PDIRecord };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function updatePDIRecord(id: string, updates: Partial<PDIRecord>): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('pdi_records').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return { success: false, error: error.message };
      dispatchDataChanged({ tipo: 'pdi_updated' });
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function deletePDIRecord(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('pdi_records').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      dispatchDataChanged({ tipo: 'pdi_deleted' });
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function fetchPDIObjectives(pdiId: string): Promise<PDIObjective[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('pdi_objectives')
        .select('*')
        .eq('pdi_id', pdiId)
        .order('created_at', { ascending: true });
      if (!error && data) return data as PDIObjective[];
    }
  } catch { /* fall through */ }
  return [];
}

export async function savePDIObjective(obj: Omit<PDIObjective, 'id' | 'created_at'>): Promise<{ success: boolean; data?: PDIObjective; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('pdi_objectives').insert(obj).select().single();
      if (error) return { success: false, error: error.message };
      return { success: true, data: data as PDIObjective };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function updatePDIObjective(id: string, updates: Partial<PDIObjective>): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('pdi_objectives').update({ ...updates, data_atualizacao: new Date().toISOString() }).eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function deletePDIObjective(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('pdi_objectives').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function fetchPDITimeline(pdiId: string): Promise<PDITimelineEvent[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('pdi_timeline')
        .select('*')
        .eq('pdi_id', pdiId)
        .order('data_evento', { ascending: true });
      if (!error && data) return data as PDITimelineEvent[];
    }
  } catch { /* fall through */ }
  return [];
}

export async function addPDITimelineEvent(event: Omit<PDITimelineEvent, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('pdi_timeline').insert(event);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function autoCreatePDIFromFeedback(params: {
  feedbackId: string;
  analistaId?: string;
  analistaNome: string;
  squad: string;
  coordenador: string;
  ciclo: string;
  qaScore?: number;
  iepcScore?: number;
  aderenciaScore?: number;
  totalNcs?: number;
  totalElogios?: number;
  objetivoDesenvolvimento?: string;
  acaoDesenvolvimento?: string;
  resultadoEsperado?: string;
  mensagemEvolutiva?: string;
  enterpriseObjectives?: any[];
}): Promise<{ success: boolean; data?: PDIRecord; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase não disponível' };

    // Check if PDI already exists for this feedback
    const { data: existing } = await supabase
      .from('pdi_records')
      .select('id')
      .eq('feedback_id', params.feedbackId)
      .maybeSingle();

    if (existing) return { success: true, data: existing as any };

    const pdiData = {
      feedback_id: params.feedbackId,
      analista_id: params.analistaId || null,
      periodo: params.ciclo,
      ciclo: params.ciclo,
      analista: params.analistaNome,
      squad: params.squad || '',
      coordenador: params.coordenador || '',
      status_pdi: 'aguardando alinhamento' as const,
      acoes: [],
      metas: [],
      evidencias: [],
      nc_reincidentes: [],
      qa_score: params.qaScore || 0,
      iepc_score: params.iepcScore || 0,
      aderencia_score: params.aderenciaScore || 0,
      total_ncs: params.totalNcs || 0,
      total_elogios: params.totalElogios || 0,
      objetivo_desenvolvimento: params.objetivoDesenvolvimento || '',
      acao_desenvolvimento: params.acaoDesenvolvimento || '',
      resultado_esperado: params.resultadoEsperado || '',
      mensagem_evolutiva: params.mensagemEvolutiva || '',
      objetivo: params.objetivoDesenvolvimento || '',
      enterprise_objectives: params.enterpriseObjectives && params.enterpriseObjectives.length > 0 ? params.enterpriseObjectives : null,
      source: 'feedback_auto',
      attachments: [],
    };

    const { data, error } = await supabase.from('pdi_records').insert(pdiData).select().single();
    if (error) return { success: false, error: error.message };

    // Auto-create timeline entry
    if (data) {
      await supabase.from('pdi_timeline').insert({
        pdi_id: data.id,
        data_evento: new Date().toISOString().split('T')[0],
        titulo: 'PDI criado',
        descricao: `PDI gerado automaticamente a partir do feedback do ciclo ${params.ciclo}`,
        tipo: 'criacao',
      });
    }

    dispatchDataChanged({ tipo: 'pdi_saved', analista: params.analistaNome });
    return { success: true, data: data as PDIRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Analistas Supabase functions ─────────────────────────────────────────────

export interface AnalistaRecord {
  id: string;
  analista_id?: string; // ANL-0001 format — auto-generated, never changes
  nome: string;
  nome_completo?: string;
  nome_curto?: string;
  email?: string;
  telefone?: string;
  squad?: string;
  equipe?: string;
  coordenador?: string;
  cargo_operacional?: string;
  nivel: string;
  nivel_profissional?: string; // Júnior I, Júnior II, ... Especialista
  status: 'ativo' | 'ferias' | 'afastado' | 'desligado';
  aniversario?: string;
  tempo_empresa?: string;
  tempo_empresa_calculado?: string;
  tempo_empresa_meses?: number;
  ultima_promocao?: string;
  data_admissao?: string;
  observacoes?: string;
  foto_url?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchAnalistas(filters?: { squad?: string; status?: string }): Promise<AnalistaRecord[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('analistas').select('*').order('nome', { ascending: true });
      if (filters?.squad) query = query.eq('squad', filters.squad);
      if (filters?.status) query = query.eq('status', filters.status);
      const { data, error } = await query;
      if (!error && data) return data as AnalistaRecord[];
    }
  } catch { /* fall through */ }
  return [];
}

export async function upsertAnalista(analista: Omit<AnalistaRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: AnalistaRecord }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const now = new Date().toISOString();
      // Ensure nome_completo is populated
      const payload = {
        ...analista,
        nome_completo: analista.nome_completo || analista.nome,
        nome_curto: analista.nome_curto || analista.nome,
        updated_at: now,
      };

      // Upsert strategy: email > nome_completo > nome
      if (analista.email && analista.email.trim()) {
        // Check if exists by email
        const { data: existing } = await supabase
          .from('analistas')
          .select('id, analista_id')
          .eq('email', analista.email.trim().toLowerCase())
          .maybeSingle();

        if (existing?.id) {
          // Update — preserve analista_id
          const { data, error } = await supabase
            .from('analistas')
            .update({ ...payload, analista_id: existing.analista_id || payload.analista_id })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) return { success: false, error: error.message };
          dispatchDataChanged({ tipo: 'analista_updated' });
          return { success: true, data: data as AnalistaRecord };
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('analistas')
            .insert({ ...payload, email: analista.email.trim().toLowerCase() })
            .select()
            .single();
          if (error) return { success: false, error: error.message };
          dispatchDataChanged({ tipo: 'analista_created' });
          return { success: true, data: data as AnalistaRecord };
        }
      } else {
        // No email — match by nome_completo or nome
        const matchName = analista.nome_completo || analista.nome;
        const { data: existing } = await supabase
          .from('analistas')
          .select('id, analista_id')
          .or(`nome_completo.eq.${matchName},nome.eq.${matchName}`)
          .maybeSingle();

        if (existing?.id) {
          const { data, error } = await supabase
            .from('analistas')
            .update({ ...payload, email: null, analista_id: existing.analista_id || payload.analista_id })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) return { success: false, error: error.message };
          dispatchDataChanged({ tipo: 'analista_updated' });
          return { success: true, data: data as AnalistaRecord };
        } else {
          const { data, error } = await supabase
            .from('analistas')
            .insert({ ...payload, email: null })
            .select()
            .single();
          if (error) return { success: false, error: error.message };
          dispatchDataChanged({ tipo: 'analista_created' });
          return { success: true, data: data as AnalistaRecord };
        }
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export async function deleteAnalista(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('analistas').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      dispatchDataChanged({ tipo: 'analista_deleted' });
      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
  return { success: false, error: 'Supabase não disponível' };
}

export function calcTempoEmpresa(dataAdmissao: string): { texto: string; meses: number } {
  if (!dataAdmissao) return { texto: '', meses: 0 };
  const admissao = new Date(dataAdmissao);
  const hoje = new Date();
  const totalMeses = (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth());
  const anos = Math.floor(totalMeses / 12);
  const meses = totalMeses % 12;
  let texto = '';
  if (anos === 0) texto = `${meses} mes(es)`;
  else if (meses === 0) texto = `${anos} ano(s)`;
  else texto = `${anos} ano(s) e ${meses} mes(es)`;
  return { texto, meses: totalMeses };
}

// ─── Admin Logs ───────────────────────────────────────────────────────────────

export interface AdminLog {
  id: string;
  created_at: string;
  log_type: string;
  category: string;
  actor_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  duration_ms?: number;
  error_message?: string;
  severity: string;
}

export async function fetchAdminLogs(filters?: { category?: string; severity?: string; limit?: number }): Promise<AdminLog[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      let query = supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(filters?.limit || 200);
      if (filters?.category && filters.category !== 'all') query = query.eq('category', filters.category);
      if (filters?.severity && filters.severity !== 'all') query = query.eq('severity', filters.severity);
      const { data, error } = await query;
      if (!error && data) return data as AdminLog[];
    }
  } catch { /* fall through */ }
  return [];
}

export async function writeAdminLog(log: Omit<AdminLog, 'id' | 'created_at'>): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    if (supabase) {
      await supabase.from('admin_logs').insert(log);
    }
  } catch { /* silently ignore */ }
}

// ─── Full Backup / Restore ────────────────────────────────────────────────────

const ALL_LS_KEYS = [
  LS_SCORES, LS_NCS, LS_ELOGIOS, LS_CYCLES, LS_USERS,
  LS_CLOSED_CYCLES, LS_ANALYST_PROFILES, LS_MANUAL_CYCLES,
  'zetti_import_records', 'zetti_audit_data',
];

export interface BackupData {
  version: string;
  exported_at: string;
  data: Record<string, any[]>;
}

export function exportFullBackup(): void {
  if (typeof window === 'undefined') return;
  const backup: BackupData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: {},
  };
  ALL_LS_KEYS.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      backup.data[key] = raw ? JSON.parse(raw) : [];
    } catch {
      backup.data[key] = [];
    }
  });
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zetti_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFullBackup(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backup: BackupData = JSON.parse(text);
        if (!backup.data || typeof backup.data !== 'object') {
          resolve({ success: false, error: 'Arquivo de backup inválido.' });
          return;
        }
        Object.entries(backup.data).forEach(([key, value]) => {
          if (ALL_LS_KEYS.includes(key) && Array.isArray(value)) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        });
        dispatchDataChanged({ tipo: 'backup_restore' });
        resolve({ success: true });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Erro ao ler o arquivo.' });
    reader.readAsText(file);
  });
}

// ─── Global Data Sync ─────────────────────────────────────────────────────────

/**
 * Dispatch a global data-changed event so all pages/dashboards can reload.
 * Use this after ANY mutation to localStorage data.
 */
export function dispatchDataChanged(detail?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zetti_data_changed', { detail: detail ?? {} }));
  // Also fire the legacy event so existing listeners keep working
  window.dispatchEvent(new CustomEvent('zetti_import_done', { detail: detail ?? {} }));
}

/**
 * Subscribe to global data-changed events.
 * Returns an unsubscribe function.
 */
export function listenDataChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('zetti_data_changed', handler);
  return () => window.removeEventListener('zetti_data_changed', handler);
}
