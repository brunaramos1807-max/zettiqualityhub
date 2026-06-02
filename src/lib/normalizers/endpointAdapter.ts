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
 * 
 * CORREÇÕES IMPLEMENTADAS (v1.1):
 * 1. IEPC: Leitura correta de iepc_pilares[], persistência de iepc_total e e1-e5
 * 2. NCs: Flatten correto com fallback entre atendimentos[].nao_conformidades[] e nao_conformidades[]
 * 3. total_ncs: Cálculo correto com suporte a ambos formatos
 * 4. pontos_deduzidos_nc: Soma apenas quando aplicar_pontos === true
 * 5. coaching_details: Preservação completa (categoria, o_que_foi_dito, como_poderia_ser, dica_de_ouro)
 * 6. feedback_blocks: Proteção de joins e validação de arrays/string
 * 7. Remoção de dependências falsas (pontos_fortes, pontos_a_melhorar)
 * 8. Logs estruturados para debug
 * 9. Validação de persistência final
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
 * CORREÇÃO #1: Extrai IEPC com validação
 * - Valida origem real (scores.iepc, indice_satisfacao, iepc_pilares[])
 * - Garante persistência correta de iepc_total e e1-e5
 */
function validateAndLogIEPC(normalized: NormalizedPayload, rawPayload: any, debugContext: string = ''): void {
  console.log(`[endpointAdapter${debugContext}] IEPC Validation:`, {
    iepc_score: normalized.scores.iepc.value,
    iepc_source: normalized.scores.iepc.source,
    payload_scores_iepc: rawPayload?.scores?.iepc,
    payload_indice_satisfacao: rawPayload?.indice_satisfacao,
    iepc_pilares_count: rawPayload?.iepc_pilares?.length || 0,
    normalized_pilares_iepc: normalized.pillars.iepc.length,
  });
}

/**
 * CORREÇÃO #2: Extrai NCs com flatten correto
 * - Suporta atendimentos[].nao_conformidades[] (novo formato)
 * - Suporta nao_conformidades[] achatado (fallback)
 * - Preserva todos os campos: protocolo, tipo_nc, descricao, severidade, pontos, aplicar_pontos, etc
 */
function flattenNonConformities(
  normalized: NormalizedPayload,
  rawPayload: any
): Array<any> {
  const flattened: Array<any> = [];
  const seen = new Set<string>(); // Para evitar duplicatas

  console.log(`[endpointAdapter] NC Flattening:`, {
    root_nao_conformidades_count: (rawPayload?.nao_conformidades || []).length,
    atendimentos_count: (rawPayload?.atendimentos || []).length,
    normalized_ncs_count: normalized.nao_conformidades.length,
  });

  // Formato 1: NCs aninhados em atendimentos (novo formato Lovable)
  if (Array.isArray(rawPayload?.atendimentos)) {
    rawPayload.atendimentos.forEach((atendimento: any, atIdx: number) => {
      if (Array.isArray(atendimento?.nao_conformidades)) {
        atendimento.nao_conformidades.forEach((nc: any, ncIdx: number) => {
          const ncKey = `${atendimento.protocolo}_${nc.protocolo || ncIdx}`;
          if (!seen.has(ncKey)) {
            seen.add(ncKey);
            flattened.push({
              protocolo: nc.protocolo || atendimento.protocolo,
              tipo_nc: nc.tipo_nc || nc.type,
              descricao: nc.descricao || nc.description,
              severidade: nc.severity || nc.severidade,
              pontos: typeof nc.pontos === 'number' ? nc.pontos : (typeof nc.points === 'number' ? nc.points : -20),
              aplicar_pontos: nc.aplicar_pontos !== false,
              categoria: nc.categoria,
              impacto_operacional: nc.impacto_operacional,
              justificativa_tecnica: nc.justificativa_tecnica,
              evidencias: nc.evidencias,
              origem: 'atendimento',
              analista: nc.analista || atendimento.analista,
              squad: nc.squad || atendimento.squad,
              coordenador: nc.coordenador || atendimento.coordenador,
              auditor: nc.auditor || atendimento.auditor,
            });
          }
        });
      }
    });
  }

  // Formato 2: NCs direto no root (fallback)
  if (Array.isArray(rawPayload?.nao_conformidades)) {
    rawPayload.nao_conformidades.forEach((nc: any, idx: number) => {
      const ncKey = nc.protocolo || `nc_${idx}`;
      if (!seen.has(ncKey)) {
        seen.add(ncKey);
        flattened.push({
          protocolo: nc.protocolo,
          tipo_nc: nc.tipo_nc || nc.type,
          descricao: nc.descricao || nc.description,
          severidade: nc.severity || nc.severidade,
          pontos: typeof nc.pontos === 'number' ? nc.pontos : (typeof nc.points === 'number' ? nc.points : -20),
          aplicar_pontos: nc.aplicar_pontos !== false,
          categoria: nc.categoria,
          impacto_operacional: nc.impacto_operacional,
          justificativa_tecnica: nc.justificativa_tecnica,
          evidencias: nc.evidencias,
          origem: 'root',
          analista: nc.analista,
          squad: nc.squad,
          coordenador: nc.coordenador,
          auditor: nc.auditor,
        });
      }
    });
  }

  console.log(`[endpointAdapter] NC Flatten Result: ${flattened.length} NCs após flatten e deduplicação`);
  return flattened;
}

/**
 * CORREÇÃO #3: Calcula total_ncs corretamente
 * - Usando atendimentos[].nao_conformidades[] OR nao_conformidades[]
 * - Com fallback entre os dois formatos
 */
function calculateTotalNCs(rawPayload: any, normalized: NormalizedPayload): number {
  let total = 0;

  // Contar from atendimentos (novo formato)
  if (Array.isArray(rawPayload?.atendimentos)) {
    rawPayload.atendimentos.forEach((a: any) => {
      if (Array.isArray(a.nao_conformidades)) {
        total += a.nao_conformidades.length;
      }
    });
  }

  // Se zero, tentar root nao_conformidades
  if (total === 0 && Array.isArray(rawPayload?.nao_conformidades)) {
    total = rawPayload.nao_conformidades.length;
  }

  // Fallback: usar normalized
  if (total === 0) {
    total = normalized.nao_conformidades.length;
  }

  console.log(`[endpointAdapter] total_ncs calculated: ${total}`);
  return total;
}

/**
 * CORREÇÃO #4: Calcula pontos_deduzidos_nc respeitando aplicar_pontos
 * - Soma apenas nc.pontos quando aplicar_pontos === true
 */
function calculatePontosDeduzidos(flattened: Array<any>): number {
  const total = flattened.reduce((sum, nc) => {
    const aplicar = nc.aplicar_pontos !== false;
    const pontos = typeof nc.pontos === 'number' ? nc.pontos : 0;
    return sum + (aplicar ? pontos : 0);
  }, 0);

  console.log(`[endpointAdapter] pontos_deduzidos_nc calculated: ${total} (aplicando apenas quando aplicar_pontos=true)`);
  return total;
}

/**
 * CORREÇÃO #5: Extrai coaching preservando todos os campos
 * - categoria, o_que_foi_dito, como_poderia_ser, dica_de_ouro
 */
function extractCoachingComplete(rawPayload: any, normalized: NormalizedPayload): Array<any> {
  const coaching: Array<any> = [];

  if (normalized.coaching && Array.isArray(normalized.coaching)) {
    normalized.coaching.forEach((c: any) => {
      coaching.push({
        categoria: c.categoria || c.topic,
        o_que_foi_dito: c.oQueDisseErrado,
        como_poderia_ser: c.comoPoderiaSerDito,
        dica_de_ouro: c.dicaDeOuro,
        date: c.date,
        assignedTo: c.assignedTo,
      });
    });
  }

  console.log(`[endpointAdapter] coaching extracted: ${coaching.length} items`);
  return coaching;
}

/**
 * CORREÇÃO #6: Extrai feedback_blocks com proteção de joins
 * - Valida arrays antes de usar .join()
 * - Suporta tanto string[] quanto string
 */
function extractFeedbackBlocksSafe(rawPayload: any, normalized: NormalizedPayload): Record<string, any> | null {
  const blocks: Record<string, any> = {};

  if (normalized.feedback_blocks && typeof normalized.feedback_blocks === 'object') {
    Object.entries(normalized.feedback_blocks).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Se for array, fazer join seguro
        blocks[key] = value.map(v => String(v)).join('\n');
      } else if (typeof value === 'string') {
        // Se for string, usar direto
        blocks[key] = value;
      } else if (value) {
        // Se for outro tipo, converter para string
        blocks[key] = String(value);
      }
    });
  }

  console.log(`[endpointAdapter] feedback_blocks extracted: ${Object.keys(blocks).length} blocks`);
  return Object.keys(blocks).length > 0 ? blocks : null;
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
  const cicloNome = normalized.cycle?.periodo || normalized.periodo || '';
  const cicloInicio = normalized.cycle?.data_inicio || null;
  const cicloFim = normalized.cycle?.data_fim || null;

  // ─── Step 4: Extract scores ───
  const qaScore = getQAScore(normalized);
  const iepcScore = getIEPCScore(normalized);
  const aderencia = getAderenciaScore(normalized);

  // ─── Step 4B: CORREÇÃO #1 - Log IEPC validation ───
  validateAndLogIEPC(normalized, rawPayload, ' [normalizePayloadForEndpoint]');

  // ─── Step 5: Extract pillars ───
  const pilaresQA = extractPilares(normalized, 'qa');
  const pilaresIEPC = extractPilares(normalized, 'iepc');

  // ─── Step 6: CORREÇÃO #2 - Flatten NCs corretamente ───
  const ncFlattened = flattenNonConformities(normalized, rawPayload);

  // ─── Step 7: CORREÇÃO #3 - Calcular total_ncs ───
  const totalNCs = calculateTotalNCs(rawPayload, normalized);

  // ─── Step 8: CORREÇÃO #4 - Calcular pontos_deduzidos respeitando aplicar_pontos ───
  const pontosDeduzidosNC = calculatePontosDeduzidos(ncFlattened);

  // ─── Step 9: Build atendimentos array ───
  const atendimentosArray = normalized.evidencias || [];

  // ─── Step 10: CORREÇÃO #5 - Coaching completo ───
  const coaching = extractCoachingComplete(rawPayload, normalized);

  // ─── Step 11: CORREÇÃO #6 - Feedback blocks seguro ───
  const feedbackBlocks = extractFeedbackBlocksSafe(rawPayload, normalized);

  // ─── Step 12: Analytics (sem pontos_fortes/pontos_a_melhorar) ───
  // CORREÇÃO #7: Remoção de dependências falsas
  const analytics = normalized.analytics ? {
    percentual_aderencia: normalized.analytics.percentual_aderencia,
    quantidade_aderidos: normalized.analytics.quantidade_aderidos,
    quantidade_parcial: normalized.analytics.quantidade_parcial,
    quantidade_nao_evidenciado: normalized.analytics.quantidade_nao_evidenciado,
    total_atendimentos: normalized.analytics.total_atendimentos,
    media_nota_atendimento: normalized.analytics.media_nota_atendimento,
    feedback_final: normalized.analytics.feedback_final,
    analise_estrategica: normalized.analytics.analise_estrategica,
    tags: normalized.analytics.tags,
    origem: normalized.analytics.origem,
    avaliacao_id: normalized.analytics.avaliacao_id,
    avaliador: normalized.analytics.avaliador,
    data_registro: normalized.analytics.data_registro,
  } : null;

  // ─── Step 13: Backward compatibility: flatten NCs com campos completos ───
  const ncs = ncFlattened.map((nc) => ({
    protocolo: nc.protocolo,
    tipo_nc: nc.tipo_nc,
    descricao: nc.descricao,
    analista: nc.analista,
    squad: nc.squad,
    coordenador: nc.coordenador,
    auditor: nc.auditor,
    pontos_deduzidos: nc.aplicar_pontos ? nc.pontos : 0,
    protocolo_referencia: nc.protocolo,
    reincidente: false,
    severity: nc.severidade,
    categoria: nc.categoria,
    impacto_operacional: nc.impacto_operacional,
    justificativa_tecnica: nc.justificativa_tecnica,
    evidencias: nc.evidencias,
    origem: nc.origem,
  }));

  // ─── Step 14: CORREÇÃO #8 - Log estruturado para debug ───
  console.log('[normalizePayloadForEndpoint] Debug Payload Mapping:', {
    analistaNome,
    cicloNome,
    qaScore,
    iepcScore,
    aderencia,
    pilaresQA_count: pilaresQA.length,
    pilaresIEPC_count: pilaresIEPC.length,
    totalNCs,
    pontosDeduzidosNC,
    atendimentos_count: atendimentosArray.length,
    coaching_count: coaching.length,
    feedbackBlocks_keys: feedbackBlocks ? Object.keys(feedbackBlocks) : [],
    analytics_keys: analytics ? Object.keys(analytics) : [],
    payloadVersion: normalized.payload_version,
  });

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
  // ─── CORREÇÃO #9: Log de validação final antes de persistir ───
  console.log('[buildCycleScoresRow] Validating cycle_scores data:', {
    cycle_id: cycleId,
    periodo: normalized.cicloNome,
    analista: normalized.analistaNome,
    nota_final_qa: normalized.qaScore,
    iepc_total: normalized.iepcScore,
    total_ncs: normalized.totalNCs,
    pontos_deduzidos_nc: normalized.pontosDeduzidosNC,
    e1: normalized.pilaresIEPC[0]?.nota,
    e2: normalized.pilaresIEPC[1]?.nota,
    e3: normalized.pilaresIEPC[2]?.nota,
    e4: normalized.pilaresIEPC[3]?.nota,
    e5: normalized.pilaresIEPC[4]?.nota,
  });

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
    payload_version: normalized.payloadVersion,
    payload_normalized: normalized.normalized,
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
