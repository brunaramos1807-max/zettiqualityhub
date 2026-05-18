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
 * Build a case-insensitive lookup map from a raw row.
 * Keys are lowercased+trimmed, values are the original cell values.
 * Also builds an exact-key map for direct access.
 */
function buildRowMap(row: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  Object.keys(row).forEach((k) => {
    const cleaned = cleanKey(k);
    r[cleaned] = row[k];                      // exact cleaned key
    r[cleaned.toLowerCase()] = row[k];        // lowercase key for fallback
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

    const rowPeriodo = String(r['Período'] || r['Periodo'] || r['período'] || r['periodo'] || '').trim();

    const qtdRaw = r['Qtd de Atendimentos Avaliados'] ?? r['qtd de atendimentos avaliados'] ??
      r['Qtd Atendimentos Avaliados'] ?? r['qtd atendimentos avaliados'] ??
      r['Quantidade de Atendimentos Avaliados'] ?? r['quantidade de atendimentos avaliados'];
    const qtdNum = parseNum(qtdRaw);

    const tipoDemanda = String(
      r['Tipo de Demanda'] ?? r['tipo de demanda'] ?? r['Tipo Demanda'] ?? r['tipo demanda'] ?? ''
    ).trim();

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      data_registro: String(r['Data do Registro'] || r['data do registro'] || '').trim(),
      analista: String(r['Analista'] || r['analista'] || '').trim(),
      squad: String(r['Squad'] || r['squad'] || '').trim(),
      coordenador: String(r['Coordenador'] || r['coordenador'] || '').trim(),
      auditor: String(r['Auditor'] || r['auditor'] || '').trim(),
      nota_final_qa: parseNum(r['Nota Final QA (0-100)'] ?? r['nota final qa (0-100)']),
      iepc_total: parseNum(
        r['IEPC - Índice de Experiência Percebida pelo Cliente (0-100)'] ??
        r['iepc - índice de experiência percebida pelo cliente (0-100)'] ??
        r['iepc - indice de experiencia percebida pelo cliente (0-100)']
      ),
      total_ncs: parseNum(r['Total de Não Conformidades'] ?? r['total de não conformidades'] ?? r['total de nao conformidades']),
      pontos_deduzidos_nc: parseNum(r['Pontos Deduzidos por NC'] ?? r['pontos deduzidos por nc']),
      p1: parseNum(r['QA P1 | Gestão do Fluxo e Rastreabilidade do Atendimento - Pontos'] ?? r['qa p1 | gestão do fluxo e rastreabilidade do atendimento - pontos'] ?? r['qa p1 | gestao do fluxo e rastreabilidade do atendimento - pontos']),
      p2: parseNum(r['QA P2 | Gestão da Tratativa da Demanda - Pontos'] ?? r['qa p2 | gestão da tratativa da demanda - pontos'] ?? r['qa p2 | gestao da tratativa da demanda - pontos']),
      p3: parseNum(r['QA P3 | Análise e Assertividade Técnica da Demanda - Pontos'] ?? r['qa p3 | análise e assertividade técnica da demanda - pontos'] ?? r['qa p3 | analise e assertividade tecnica da demanda - pontos']),
      p4: parseNum(r['QA P4 | Qualidade da Comunicação no Atendimento - Pontos'] ?? r['qa p4 | qualidade da comunicação no atendimento - pontos'] ?? r['qa p4 | qualidade da comunicacao no atendimento - pontos']),
      p5: parseNum(r['QA P5 | Conduta Relacional no Atendimento - Pontos'] ?? r['qa p5 | conduta relacional no atendimento - pontos']),
      e1: parseNum(r['IEPC E1 – Resolução Percebida - Pontos'] ?? r['iepc e1 – resolução percebida - pontos'] ?? r['iepc e1 - resolução percebida - pontos'] ?? r['iepc e1 – resolucao percebida - pontos']),
      e2: parseNum(r['IEPC E2 – Compreensão e Segurança - Pontos'] ?? r['iepc e2 – compreensão e segurança - pontos'] ?? r['iepc e2 - compreensão e segurança - pontos'] ?? r['iepc e2 – compreensao e seguranca - pontos']),
      e3: parseNum(r['IEPC E3 – Esforço do Cliente - Pontos'] ?? r['iepc e3 – esforço do cliente - pontos'] ?? r['iepc e3 - esforço do cliente - pontos'] ?? r['iepc e3 – esforco do cliente - pontos']),
      e4: parseNum(r['IEPC E4 – Tempo e Fluidez - Pontos'] ?? r['iepc e4 – tempo e fluidez - pontos'] ?? r['iepc e4 - tempo e fluidez - pontos']),
      e5: parseNum(r['IEPC E5 – Experiência Relacional - Pontos'] ?? r['iepc e5 – experiência relacional - pontos'] ?? r['iepc e5 - experiência relacional - pontos'] ?? r['iepc e5 – experiencia relacional - pontos']),
      tipo_demanda: tipoDemanda || undefined,
      qtd_atendimentos_avaliados: qtdNum > 0 ? qtdNum : undefined,
    };
  }).filter((r) => r.analista && r.squad);
}

export function parseNCsCSV(rows: Record<string, any>[], fallbackPeriodo?: string): NCRow[] {
  return rows.map((row) => {
    const r = buildRowMap(row);

    const rowPeriodo = String(r['Período'] || r['Periodo'] || r['período'] || r['periodo'] || '').trim();

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      data_registro: String(r['Data do Registro'] || r['data do registro'] || '').trim(),
      analista: String(r['Analista'] || r['analista'] || '').trim(),
      squad: String(r['Squad'] || r['squad'] || '').trim(),
      coordenador: String(r['Coordenador'] || r['coordenador'] || '').trim(),
      auditor: String(r['Auditor'] || r['auditor'] || '').trim(),
      tipo_nc: String(r['Tipo de Não Conformidade'] || r['tipo de não conformidade'] || r['tipo de nao conformidade'] || '').trim(),
      descricao: String(r['Descrição'] || r['descricao'] || r['Descricao'] || r['descrição'] || '').trim(),
      pontos_deduzidos: parseNum(r['Pontos Deduzidos'] ?? r['pontos deduzidos']),
      protocolo_referencia: String(r['Protocolo Referência'] || r['protocolo referência'] || r['protocolo referencia'] || r['Protocolo Referencia'] || '').trim(),
      avaliacao_id: String(r['ID da Avaliação'] || r['id da avaliação'] || r['id da avaliacao'] || r['ID da Avaliacao'] || '').trim(),
    };
  }).filter((r) => r.analista && r.tipo_nc);
}

export function parseElogiosCSV(rows: Record<string, any>[], fallbackPeriodo?: string): ElogioRow[] {
  return rows.map((row) => {
    const r = buildRowMap(row);

    const rowPeriodo = String(r['Período'] || r['Periodo'] || r['período'] || r['periodo'] || '').trim();

    // Support multiple column name variants for colaborador/name
    const colaborador = String(
      r['Colaborador'] || r['colaborador'] || r['COLABORADOR'] || r['Nome'] || r['NOME'] || r['nome'] || ''
    ).trim();

    // Support multiple column name variants for elogio/text
    const elogio = String(
      r['Elogio'] || r['elogio'] || r['ELOGIO'] || r['Descrição do Elogio'] || r['Descricao'] || r['DESCRICAO'] || r['Texto'] || ''
    ).trim();

    return {
      periodo: rowPeriodo || fallbackPeriodo || '',
      colaborador,
      squad: String(r['SQUAD'] || r['Squad'] || r['squad'] || '').trim(),
      cliente: String(r['CLIENTE'] || r['Cliente'] || r['cliente'] || '').trim(),
      protocolo: String(r['PROTOCOLO'] || r['Protocolo'] || r['protocolo'] || '').trim(),
      elogio,
    };
  }).filter((r) => r.colaborador && r.elogio);
}

// ─── Import (localStorage only) ──────────────────────────────────────────────

export async function importCycleData(
  scores: CycleScoreRow[],
  ncs: NCRow[],
  elogios: ElogioRow[],
  periodo: string,
  fileName: string
): Promise<{ success: boolean; error?: string; cycleId?: string }> {
  try {
    const cycleId = `cycle-${Date.now()}`;

    // Only overwrite data types that are actually being imported (non-empty arrays).
    // This prevents importing scores from wiping previously imported NCs/elogios for the same period.
    if (scores.length > 0) {
      const existingScores = lsGet<any>(LS_SCORES).filter((r) => r.periodo !== periodo);
      lsSet(LS_SCORES, [...existingScores, ...scores.map((s) => ({ ...s, cycle_id: cycleId, id: `s-${Date.now()}-${Math.random()}` }))]);
    }

    if (ncs.length > 0) {
      const existingNCs = lsGet<any>(LS_NCS).filter((r) => r.periodo !== periodo);
      lsSet(LS_NCS, [...existingNCs, ...ncs.map((n) => ({ ...n, cycle_id: cycleId, id: `n-${Date.now()}-${Math.random()}` }))]);
    }

    if (elogios.length > 0) {
      const existingElogios = lsGet<any>(LS_ELOGIOS).filter((r) => r.periodo !== periodo);
      lsSet(LS_ELOGIOS, [...existingElogios, ...elogios.map((e) => ({ ...e, cycle_id: cycleId, id: `e-${Date.now()}-${Math.random()}`, destaque: false }))]);
    }

    // Save cycle record (upsert — remove old entry for this period first)
    const existingCycles = lsGet<any>(LS_CYCLES).filter((r) => r.periodo !== periodo);
    lsSet(LS_CYCLES, [
      ...existingCycles,
      {
        id: cycleId,
        periodo,
        file_name: fileName,
        record_count: scores.length + ncs.length + elogios.length,
        imported_at: new Date().toISOString(),
      },
    ]);

    return { success: true, cycleId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Delete functions ─────────────────────────────────────────────────────────

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
}

export function isCycleClosed(periodo: string): boolean {
  return lsGet<ClosedCycle>(LS_CLOSED_CYCLES).some((c) => c.periodo === periodo);
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
    pontosDeduzidos: s.pontos_deduzidos_nc || 0,
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

// ─── Fetch functions (localStorage only) ─────────────────────────────────────

export async function fetchCycleScores(periodo?: string) {
  const data = lsGet<any>(LS_SCORES);
  if (periodo) return data.filter((r) => r.periodo === periodo);
  return data.sort((a: any, b: any) => b.nota_final_qa - a.nota_final_qa);
}

export async function fetchNCRecords(periodo?: string) {
  const data = lsGet<any>(LS_NCS);
  if (periodo) return data.filter((r) => r.periodo === periodo);
  return data;
}

export async function fetchElogios(periodo?: string) {
  const data = lsGet<any>(LS_ELOGIOS);
  if (periodo) return data.filter((r) => r.periodo === periodo);
  return data;
}

export async function fetchAllPeriodos(): Promise<string[]> {
  const cycles = lsGet<any>(LS_CYCLES);
  const periodos = [...new Set(cycles.map((c: any) => c.periodo as string))];
  return periodos;
}

export async function toggleElogioDestaque(id: string, destaque: boolean) {
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
    return updated;
  }
  const newEntry: ManualCycleEntry = {
    ...entry,
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: now,
    updated_at: now,
  };
  lsSet(LS_MANUAL_CYCLES, [...existing, newEntry]);
  return newEntry;
}

export function deleteManualCycle(id: string): void {
  lsSet(LS_MANUAL_CYCLES, lsGet<ManualCycleEntry>(LS_MANUAL_CYCLES).filter((e) => e.id !== id));
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
        resolve({ success: true });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Erro ao ler o arquivo.' });
    reader.readAsText(file);
  });
}
