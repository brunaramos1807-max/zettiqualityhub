/**
 * Integration Adapter for normalizePayload
 * 
 * This file adapts the comprehensive normalizePayload from @/lib/normalizers/normalizePayload.ts
 * to the specific data structures needed by receber-avaliacao endpoint.
 * 
 * It bridges between:
 * - New normalized format (rich types, variable penalties, new fields)
 * - Existing cycle_scores schema (legacy p1-p5, e1-e5, fixed -20 penalty)
 * - Existing dashboard queries (assumes no breaking changes)
 * 
 * NO refactoring of frontend, NO recalculation of history, NO breaking changes.
 */

import {
  normalizePayload as normalizePayloadCore,
  NormalizedPayload,
  getQAScore,
  getIEPCScore,
  getAderenciaScore,
  calculateTotalPenalty,
  groupNCBySeverity,
  isValidNormalizedPayload,
} from '@/lib/normalizers/normalizePayload';

/**
 * Represents the internal data structure the endpoint works with.
 * This is backward-compatible with both old and new payloads.
 */
export interface NormalizedEndpointPayload {
  // ─── Normalized core data ───
  normalized: NormalizedPayload;

  // ─── Flat extracted fields for immediate use ───
  analistaNome: string;
  analistaEmail: string | null;
  coordenador: string;
  squad: string;
  auditor: string | null;
  cicloNome: string;
  cicloInicio: string | null;
  cicloFim: string | null;

  // ─── Scores (both formats for compatibility) ───
  qaScore: number;
  iepcScore: number;
  aderencia: number | null;

  // ─── Pillars for cycle_scores table (p1-p5, e1-e5) ───
  pilaresQA: Array<{ codigo?: string; nome: string; nota: number; maximo?: number }>;
  pilaresIEPC: Array<{ codigo?: string; nome: string; nota: number; maximo?: number }>;

  // ─── Non-conformity handling ───
  ncs: Array<any>; // Raw NCs for backward compatibility
  totalNCs: number;
  pontosDeduzidosNC: number; // Real sum of variable penalties, not count * 20

  // ─── Atendimentos ───
  atendimentosArray: Array<any>;

  // ─── Coaching & Feedback ───
  coaching: Array<any>;
  feedbackBlocks: Record<string, any> | null;

  // ─── Analytics ───
  analytics: Record<string, any> | null;

  // ─── Payload metadata ───
  payloadVersion: 'v1_legacy' | 'v2_lovable';
  hasNewFormat: boolean;
  hasLegacyFormat: boolean;
  warnings: string[];
}

/**
 * Parses analyst name into nome/nome_completo safely
 */
function parseAnalistName(name: string | { nome?: string; nome_completo?: string }): string {
  if (typeof name === 'string') return name;
  if (typeof name === 'object') {
    return name.nome || name.nome_completo || '';
  }
  return '';
}

/**
 * Safely extracts pillar arrays, handling both old and new formats
 */
function extractPilares(
  normalized: NormalizedPayload,
  type: 'qa' | 'iepc'
): Array<{ codigo?: string; nome: string; nota: number; maximo?: number }> {
  const sourcePilars = type === 'qa' ? normalized.pillars.qa : normalized.pillars.iepc;

  return sourcePilars.map((p) => ({
    codigo: p.code, // P1-P5 or E1-E5
    nome: p.name,
    nota: p.points,
    maximo: p.maxPoints,
  }));
}

/**
 * Main adapter function.
 * Normalizes any payload (old or new) and returns structured data for the endpoint.
 * 
 * This is the single point of integration for the normalizePayload layer.
 */
export function normalizePayloadForEndpoint(rawPayload: any): NormalizedEndpointPayload {
  // ─── Step 1: Apply core normalization ───
  let normalized: NormalizedPayload;
  try {
    normalized = normalizePayloadCore(rawPayload);
  } catch (err) {
    console.error('[normalizePayloadForEndpoint] Core normalization error:', err);
    throw new Error(`Payload normalization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // ─── Step 2: Validate normalized payload ───
  if (!isValidNormalizedPayload(normalized)) {
    throw new Error('Normalized payload failed validation');
  }

  // ─── Step 3: Extract flat fields ───
  const analistaNome = normalized.analista || normalized.analyst?.nome || '';
  const analistaEmail = normalized.analyst?.email || null;
  const coordenador = normalized.analyst?.coordenador || normalized.cycle?.nome || '';
  const squad = normalized.analyst?.squad || '';
  const auditor = normalized.analyst?.auditor || null;
  const cicloNome = normalized.cycle?.periodo || normalized.period || '';
  const cicloInicio = normalized.cycle?.data_inicio || null;
  const cicloFim = normalized.cycle?.data_fim || null;

  // ─── Step 4: Extract scores ───
  const qaScore = getQAScore(normalized);
  const iepcScore = getIEPCScore(normalized);
  const aderencia = getAderenciaScore(normalized);

  // ─── Step 5: Extract pillars ───
  const pilaresQA = extractPilares(normalized, 'qa');
  const pilaresIEPC = extractPilares(normalized, 'iepc');

  // ─── Step 6: Calculate NC totals using REAL penalties ───
  // ⚠️ CRITICAL: Do NOT assume -20 fixed. Use actual points from payload.
  const totalNCs = normalized.nao_conformidades.length;
  const pontosDeduzidosNC = calculateTotalPenalty(normalized); // Real sum, respecting aplicar_pontos

  // ─── Step 7: Build atendimentos array ───
  const atendimentosArray = normalized.evidencias || [];

  // ─── Step 8: Coaching & feedback ───
  const coaching = normalized.coaching || [];
  const feedbackBlocks = normalized.feedback_blocks || null;

  // ─── Step 9: Analytics ───
  const analytics = normalized.analytics || null;

  // ─── Step 10: Backward compatibility: flatten NCs ───
  // Some code paths expect ncs as flat array with pontos_deduzidos
  const ncs = normalized.nao_conformidades.map((nc) => ({
    protocolo: nc.protocolo,
    tipo_nc: nc.type,
    descricao: nc.description,
    analista: nc.analista,
    squad: nc.squad,
    coordenador: nc.coordenador,
    auditor: nc.auditor,
    pontos_deduzidos: nc.points, // Use variable points, not -20
    protocolo_referencia: nc.protocolo,
    reincidente: false,
    // Add new fields if present
    severity: nc.severity,
    impacto_operacional: nc.impacto_operacional,
    justificativa_tecnica: nc.justificativa_tecnica,
  }));

  return {
    normalized,
    analistaNome,
    analistaEmail,
    coordenador,
    squad,
    auditor,
    cicloNome,
    cicloInicio,
    cicloFim,
    qaScore,
    iepcScore,
    aderencia,
    pilaresQA,
    pilaresIEPC,
    ncs,
    totalNCs,
    pontosDeduzidosNC,
    atendimentosArray,
    coaching,
    feedbackBlocks,
    analytics,
    payloadVersion: normalized.payload_version,
    hasNewFormat: normalized.metadata.has_new_format,
    hasLegacyFormat: normalized.metadata.has_legacy_format,
    warnings: normalized.metadata.warnings,
  };
}

/**
 * Helper: Extract non-conformities with awareness of variable penalties
 * Used in step 14 of the endpoint handler
 */
export function extractNonConformities(
  normalized: NormalizedPayload,
  cicloNome: string,
  analistaNome: string,
  squad: string,
  coordenador: string,
  auditor: string | null
): Array<any> {
  return normalized.nao_conformidades.map((nc) => ({
    periodo: cicloNome,
    analista: nc.analista || analistaNome,
    squad: nc.squad || squad,
    coordenador: nc.coordenador || coordenador,
    auditor: auditor,
    tipo_nc: nc.type || 'Não Especificado',
    descricao: nc.description || null,
    pontos_deduzidos: nc.aplicar_pontos !== false ? nc.points : 0, // Respect flag
    protocolo_referencia: nc.protocolo || null,
    // NEW: Store additional fields for future use
    severity: nc.severity,
    impacto_operacional: nc.impacto_operacional,
    justificativa_tecnica: nc.justificativa_tecnica,
    penaltySource: nc.penaltySource,
    source: 'integration',
  }));
}

/**
 * Helper: Build cycle_scores row with correct penalty calculation
 */
export function buildCycleScoresRow(
  normalized: NormalizedEndpointPayload,
  rawPayload: any,
  cycleId: string,
  criteriosMap: Record<string, any> = {}
): Record<string, any> {
  return {
    cycle_id: cycleId,
    periodo: normalized.cicloNome,
    analista: normalized.analistaNome,
    squad: normalized.squad,
    coordenador: normalized.coordenador,
    auditor: normalized.auditor,
    data_registro: rawPayload.data_registro ?? new Date().toISOString().split('T')[0],
    nota_final_qa: normalized.qaScore,
    iepc_total: normalized.iepcScore,
    total_ncs: normalized.totalNCs,
    pontos_deduzidos_nc: normalized.pontosDeduzidosNC, // Real sum, not count * -20
    p1: normalized.pilaresQA[0]?.nota || 0,
    p2: normalized.pilaresQA[1]?.nota || 0,
    p3: normalized.pilaresQA[2]?.nota || 0,
    p4: normalized.pilaresQA[3]?.nota || 0,
    p5: normalized.pilaresQA[4]?.nota || 0,
    e1: normalized.pilaresIEPC[0]?.nota || 0,
    e2: normalized.pilaresIEPC[1]?.nota || 0,
    e3: normalized.pilaresIEPC[2]?.nota || 0,
    e4: normalized.pilaresIEPC[3]?.nota || 0,
    e5: normalized.pilaresIEPC[4]?.nota || 0,
    tipo_demanda: rawPayload.tipo_demanda ?? null,
    qtd_atendimentos_avaliados: normalized.atendimentosArray.length,
    protocolo: rawPayload.protocolo ?? null,
    sintese_ia: normalized.normalized.raw_payload.sintese_ia || null,
    tendencias: rawPayload.tendencias ?? null,
    reincidencia: rawPayload.reincidencia ?? null,
    criterios: Object.keys(criteriosMap).length > 0 ? criteriosMap : null,
    evidencias: rawPayload.evidencias ? JSON.parse(JSON.stringify(rawPayload.evidencias)) : null,
    // IMPORTANT: Store both normalized payload and raw for audit
    payload_version: normalized.payloadVersion,
    payload_normalized: normalized.normalized, // Full normalized structure
    analytics: normalized.analytics ? JSON.parse(JSON.stringify(normalized.analytics)) : null,
    source: 'integration',
    is_manual: false,
  };
}

/**
 * Helper: Log warnings from normalization process
 */
export function logNormalizationWarnings(normalized: NormalizedEndpointPayload, logContext: string = ''): void {
  if (normalized.warnings.length > 0) {
    console.warn(`[normalizePayloadForEndpoint${logContext}] Normalization warnings:`, normalized.warnings);
  }
}

/**
 * Audit trail: Check for potential compatibility issues
 */
export function auditPayloadCompatibility(normalized: NormalizedEndpointPayload): {
  isFullyNew: boolean;
  isFullyLegacy: boolean;
  isMixed: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (normalized.hasNewFormat && !normalized.hasLegacyFormat) {
    // Pure new format — good
    if (normalized.pilaresQA.length === 0) issues.push('New format with no QA pillars');
    if (normalized.pilaresIEPC.length === 0) issues.push('New format with no IEPC pillars');
    return { isFullyNew: true, isFullyLegacy: false, isMixed: false, issues };
  }

  if (normalized.hasLegacyFormat && !normalized.hasNewFormat) {
    // Pure legacy — fine, backward compatible
    return { isFullyNew: false, isFullyLegacy: true, isMixed: false, issues };
  }

  if (normalized.hasNewFormat && normalized.hasLegacyFormat) {
    // Mixed format — may have conflicts, new takes precedence
    issues.push('Mixed payload format detected: both new and legacy fields present. New format will be used.');
    return { isFullyNew: false, isFullyLegacy: false, isMixed: true, issues };
  }

  // Neither format detected
  issues.push('Payload format not recognized (neither new nor legacy)');
  return { isFullyNew: false, isFullyLegacy: false, isMixed: false, issues };
}

/**
 * Validate that the normalized endpoint payload is safe to save
 */
export function validateEndpointPayload(payload: NormalizedEndpointPayload): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!payload.analistaNome) errors.push('Missing analistaNome');
  if (!payload.cicloNome) errors.push('Missing cicloNome');
  if (payload.qaScore < 0 || payload.qaScore > 100) errors.push(`Invalid qaScore: ${payload.qaScore}`);
  if (payload.iepcScore < 0 || payload.iepcScore > 100) errors.push(`Invalid iepcScore: ${payload.iepcScore}`);

  // Pillars
  if (payload.pilaresQA.length === 0) errors.push('No QA pillars provided');
  if (payload.pilaresIEPC.length === 0) errors.push('No IEPC pillars provided');

  // Penalty consistency
  if (Math.abs(payload.pontosDeduzidosNC) > 1000) errors.push(`Suspiciously high penalty: ${payload.pontosDeduzidosNC}`);

  return { valid: errors.length === 0, errors };
}
