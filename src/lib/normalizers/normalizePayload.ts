/**
 * Payload Normalization Layer for Lovable ↔ Rocket Compatibility
 * 
 * Centralizes compatibility between legacy (Rocket) and new (Lovable) payload formats.
 * Handles the actual structures sent from Lovable as documented in payloads_qualivisao.md
 * 
 * This module handles:
 * - Score normalization (QA, IEPC, Aderência) from nested/flat structures
 * - Pillar compatibility (qa_pilares, iepc_pilares) with codigo/nome/nota/maximo
 * - Non-conformity mapping (nao_conformidades ↔ penalidades)
 * - Evidence/Atendimento data with nested NCs, IEPC details, operational alerts
 * - Feedback and coaching blocks
 * - Analytics data preservation
 * - Payload version tracking and raw payload preservation
 * 
 * IMPORTANT: This layer does NOT modify any existing components, dashboards, or frontend logic.
 * It purely provides data transformation for incremental adoption.
 */

/**
 * Defines the structure of a normalized score object
 */
export interface NormalizedScore {
  value: number;
  source: 'scores.qa' | 'scores.iepc' | 'scores.aderencia' | 'qa_score'| 'iepc_score' | 'analytics.percentual_aderencia' | 'qa_atual' | 'iepc_atual'; // Legacy export format
}

/**
 * Defines a pillar (dimensão) within QA or IEPC evaluation
 */
export interface NormalizedPillar {
  id: string;
  code: string; // P1..P5, E1..E5
  name: string;
  points: number;
  maxPoints: number;
  percentage?: number;
}

/**
 * Defines a non-conformity with flexible penalty calculation
 */
export interface NormalizedNonConformity {
  id: string;
  codigo?: string; // NC code from Lovable
  protocolo?: string; // Protocol from evidence
  description: string;
  analista?: string;
  squad?: string;
  coordenador?: string;
  auditor?: string;
  type?: string; // tipo_nc
  date?: string;
  evaluationId?: string;
  // Lovable format fields
  severity?: 'baixa' | 'media' | 'alta' | 'critica' | 'leve' | 'moderada' | 'severa'; // Map to standard set
  points: number; // Variable penalty - can be 6, 10, 15, etc
  impacto_operacional?: string;
  justificativa_tecnica?: string;
  aplicar_pontos?: boolean; // Whether to apply points deduction
  penaltySource: 'fixed' | 'variable'; // Tracks penalty origin
}

/**
 * Defines IEPC evaluation with detailed pillar breakdown
 */
export interface NormalizedIEPCEvaluation {
  notaIEPC: number;
  criterios?: Array<{
    pilar_codigo: string;
    pilar_nome: string;
    criterio_codigo: string;
    criterio_nome: string;
    status: 'aderido' | 'parcial' | 'nao_aderido' | 'nao_avaliado';
  }>;
  pilaresDetalhamento?: Record<string, any>;
}

/**
 * Defines an evidence/atendimento record
 */
export interface NormalizedEvidence {
  id: string;
  protocolo: string;
  sup?: string;
  numero?: string; // Alternative to protocolo
  cliente: string;
  assunto?: string;
  solucao?: string;
  comportamento?: string;
  sintese?: string;
  canal?: string;
  duracao?: string;
  data?: string;
  ordem?: number;
  
  // Scores
  notaQA?: number;
  notaIEPC?: number;
  notaFinal?: number;
  nota_qa?: number;
  nota_iepc?: number;
  nota_final?: number;
  
  // Criteria
  criterios?: Array<{
    pilar_codigo: string;
    pilar_nome: string;
    criterio_codigo: string;
    criterio_nome: string;
    status: 'aderido' | 'parcial' | 'nao_aderido' | 'nao_avaliado' | 'pontuou' | 'parcial' | 'nao_pontuou' | 'sem_oportunidade';
  }>;
  criterios_avaliados?: Record<string, any>; // Legacy format
  
  // IEPC evaluation
  iepc_avaliado?: NormalizedIEPCEvaluation;
  
  // Non-conformities
  ncs?: NormalizedNonConformity[];
  nao_conformidades?: NormalizedNonConformity[];
  penalidades?: NormalizedNonConformity[];
  
  // Operational alerts
  alertas_operacionais?: Array<{
    id?: string;
    tipo: string;
    descricao: string;
    origem?: 'ia' | 'auditor';
  }>;
  
  // Additional fields
  informou_sup?: boolean;
  pontos_fortes?: string[];
  pontos_a_melhorar?: string[];
}

/**
 * Defines feedback block structure
 */
export interface NormalizedFeedbackBlock {
  type: string;
  content: string;
  severity?: 'baixa' | 'media' | 'alta';
  actionable?: boolean;
}

/**
 * Defines coaching record
 */
export interface NormalizedCoaching {
  id: string;
  categoria?: string;
  topic?: string;
  oQueDisseErrado?: string; // "o que foi dito"
  comoPoderiaSerDito?: string; // "como poderia ser"
  dicaDeOuro?: string; // "dica de ouro"
  content?: string;
  date?: string;
  assignedTo?: string;
}

/**
 * Defines analytics/aderencia data
 */
export interface NormalizedAnalytics {
  percentual_aderencia?: number;
  quantidade_aderidos?: number;
  quantidade_parcial?: number;
  quantidade_nao_evidenciado?: number;
  total_atendimentos?: number;
  media_nota_atendimento?: number;
  pontos_positivos?: string[];
  melhorias?: Array<{
    topico: string;
    oQueDisseErrado?: string;
    comoPoderiaSerDito?: string;
    dicaDeOuro?: string;
  }>;
  feedback_final?: string;
  analise_estrategica?: string;
  tags?: string[];
  origem?: string; // 'lovable'
  avaliacao_id?: string;
  avaliador?: string;
  data_registro?: string;
  [key: string]: any; // Allow for future analytics fields
}

/**
 * Defines cycle metadata
 */
export interface NormalizedCycleMetadata {
  nome?: string;
  periodo?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: 'em_andamento' | 'concluido';
}

/**
 * Defines analyst metadata
 */
export interface NormalizedAnalystMetadata {
  nome?: string;
  nome_completo?: string;
  email?: string;
  equipe?: string;
  squad?: string;
  coordenador?: string;
  auditor?: string;
}

/**
 * The main normalized payload object that both old and new formats converge to
 */
export interface NormalizedPayload {
  // Metadata
  payload_version: 'v1_legacy' | 'v2_lovable';
  normalized_at: string;
  raw_payload: any; // Preserve original payload for audit/debugging

  // Analyst & Cycle info
  analyst?: NormalizedAnalystMetadata;
  cycle?: NormalizedCycleMetadata;
  periodo?: string; // Flattened from cycle
  analista?: string; // Flattened from analyst

  // Core scores
  scores: {
    qa: NormalizedScore;
    iepc: NormalizedScore;
    aderencia: NormalizedScore;
  };

  // Pillars/Dimensions
  pillars: {
    qa: NormalizedPillar[];
    iepc: NormalizedPillar[];
  };

  // Criteria scores mapping (for QualiVisão compatibility)
  criterios?: Record<string, {
    pts: number;
    max: number;
    class?: 'pontuou' | 'parcial' | 'nao_pontuou' | 'sem_oportunidade';
    evidencia?: string;
  }>;

  // Non-conformities
  nao_conformidades: NormalizedNonConformity[];
  total_ncs?: number;
  pontos_deduzidos_nc?: number;

  // Evidence/Atendimentos
  evidencias?: NormalizedEvidence[];
  atendimentos?: NormalizedEvidence[];

  // Feedback and coaching
  feedback_blocks?: Record<string, string>;
  coaching?: NormalizedCoaching[];

  // Analytics
  analytics?: NormalizedAnalytics;

  // Historical data
  historico?: Array<{
    ciclo: string;
    qa: number;
    iepc: number;
  }>;

  // Original format detection
  metadata: {
    has_new_format: boolean;
    has_legacy_format: boolean;
    warnings: string[];
  };
}

/**
 * Normalizes score from either legacy or new format
 */
function normalizeScore(
  payload: any,
  scoreType: 'qa' | 'iepc' | 'aderencia'
): NormalizedScore {
  let value = 0;
  let source: NormalizedScore['source'] = 'qa_score';

  switch (scoreType) {
    case 'qa':
      // Try new nested format first (scores.qa)
      if (payload?.scores?.qa !== undefined) {
        value = payload.scores.qa;
        source = 'scores.qa';
      }
      // Try old nested from feedbacks (scores.qa)
      else if (payload?.qa !== undefined && !payload?.scores) {
        value = payload.qa;
        source = 'scores.qa';
      }
      // Fallback to legacy flat format (qa_score)
      else if (payload?.qa_score !== undefined) {
        value = payload.qa_score;
        source = 'qa_score';
      }
      // Fallback to export format (qa_atual)
      else if (payload?.qa_atual !== undefined) {
        value = payload.qa_atual;
        source = 'qa_atual';
      }
      break;

    case 'iepc':
      // Try new nested format first (scores.iepc)
      if (payload?.scores?.iepc !== undefined) {
        value = payload.scores.iepc;
        source = 'scores.iepc';
      }
      // Try old nested from feedbacks (scores.iepc)
      else if (payload?.iepc !== undefined && !payload?.scores) {
        value = payload.iepc;
        source = 'scores.iepc';
      }
      // Fallback to legacy flat format (iepc_score)
      else if (payload?.iepc_score !== undefined) {
        value = payload.iepc_score;
        source = 'iepc_score';
      }
      // Fallback to export format (iepc_atual)
      else if (payload?.iepc_atual !== undefined) {
        value = payload.iepc_atual;
        source = 'iepc_atual';
      }
      // FIX: Fallback — derive IEPC from iepc_pilares average if scores.iepc missing
      else if (Array.isArray(payload?.iepc_pilares) && payload.iepc_pilares.length > 0) {
        const total = payload.iepc_pilares.reduce((s: number, p: any) => s + (p.nota || p.pontuacao || 0), 0);
        const max = payload.iepc_pilares.reduce((s: number, p: any) => s + (p.maximo || p.max || 100), 0);
        value = max > 0 ? Math.round((total / max) * 100) : 0;
        source = 'scores.iepc';
      }
      // FIX: Fallback — derive IEPC from atendimentos[].nota_iepc average
      else if (Array.isArray(payload?.atendimentos) && payload.atendimentos.length > 0) {
        const withIEPC = payload.atendimentos.filter((a: any) => a.nota_iepc != null || a.iepc_avaliado?.notaIEPC != null);
        if (withIEPC.length > 0) {
          const avg = withIEPC.reduce((s: number, a: any) => s + (a.nota_iepc || a.iepc_avaliado?.notaIEPC || 0), 0) / withIEPC.length;
          value = Math.round(avg);
          source = 'scores.iepc';
        }
      }
      break;

    case 'aderencia':
      // Try new format first (scores.aderencia)
      if (payload?.scores?.aderencia !== undefined) {
        value = payload.scores.aderencia;
        source = 'scores.aderencia';
      }
      // Fallback to analytics format (analytics.percentual_aderencia)
      else if (payload?.analytics?.percentual_aderencia !== undefined) {
        value = payload.analytics.percentual_aderencia;
        source = 'analytics.percentual_aderencia';
      }
      break;
  }

  // Ensure value is a valid number
  if (typeof value !== 'number' || isNaN(value)) {
    value = 0;
  }

  return { value: Math.min(100, Math.max(0, value)), source };
}

/**
 * Normalizes pillars array from both formats
 */
function normalizePillars(
  pillarsData: any[] | undefined,
  type: 'qa' | 'iepc'
): NormalizedPillar[] {
  if (!Array.isArray(pillarsData)) {
    return [];
  }

  const expectedCodes = type === 'qa' ? ['P1', 'P2', 'P3', 'P4', 'P5'] : ['E1', 'E2', 'E3', 'E4', 'E5'];

  return pillarsData
    .map((pillar, index) => {
      const code = pillar.codigo || pillar.code || expectedCodes[index];
      const pointsField = pillar.nota || pillar.points || pillar.pts || 0;
      const maxField = pillar.maximo || pillar.maxPoints || pillar.max || pillar.max_pts || 100;

      return {
        id: code || `pillar-${index}`,
        code: code || expectedCodes[index] || `P${index + 1}`,
        name: pillar.nome || pillar.name || pillar.title || `Pilar ${index + 1}`,
        points: typeof pointsField === 'number' ? pointsField : 0,
        maxPoints: typeof maxField === 'number' ? maxField : 100,
        percentage: pillar.percentage || (maxField > 0 ? (pointsField / maxField) * 100 : 0),
      };
    })
    .filter((pillar) => {
      // Only include pillars with valid structure
      return typeof pillar.points === 'number' && typeof pillar.maxPoints === 'number';
    });
}

/**
 * Normalizes severity labels
 */
function normalizeSeverity(severity: string | undefined): 'baixa' | 'media' | 'alta' | 'critica' {
  if (!severity) return 'media';
  
  const normalized = severity.toLowerCase().trim();
  
  // Map Lovable severities to standard ones
  if (normalized === 'leve' || normalized === 'baixa') return 'baixa';
  if (normalized === 'moderada' || normalized === 'media') return 'media';
  if (normalized === 'severa' || normalized === 'alta') return 'alta';
  if (normalized === 'critica') return 'critica';
  
  return 'media';
}

/**
 * Normalizes non-conformities from either format
 */
function normalizeNonConformities(payload: any): NormalizedNonConformity[] {
  const ncs: NormalizedNonConformity[] = [];

  // Handle new Lovable format (nao_conformidades)
  if (Array.isArray(payload?.nao_conformidades)) {
    payload.nao_conformidades.forEach((nc: any, index: number) => {
      ncs.push({
        id: nc.id || nc.codigo || `nc-${index}`,
        codigo: nc.codigo,
        protocolo: nc.protocolo,
        description: nc.description || nc.descricao || '',
        analista: nc.analista,
        squad: nc.squad || nc.equipe,
        coordenador: nc.coordenador,
        auditor: nc.auditor,
        type: nc.type || nc.tipo_nc,
        date: nc.date || nc.data,
        evaluationId: nc.evaluationId || nc.avaliacaoId,
        severity: normalizeSeverity(nc.severity),
        points: typeof nc.pontos === 'number' ? nc.pontos : (typeof nc.points === 'number' ? nc.points : -20),
        impacto_operacional: nc.impacto_operacional || nc.impactOperacional,
        justificativa_tecnica: nc.justificativa_tecnica || nc.justificativaTecnica,
        aplicar_pontos: nc.aplicar_pontos !== false && nc.aplicarPontos !== false,
        penaltySource: 'variable',
      });
    });
  }

  // Handle legacy format (penalidades)
  if (Array.isArray(payload?.penalidades)) {
    payload.penalidades.forEach((penalty: any, index: number) => {
      ncs.push({
        id: penalty.id || penalty.codigo || `penalty-${index}`,
        codigo: penalty.codigo,
        protocolo: penalty.protocolo,
        description: penalty.description || penalty.descricao || '',
        analista: penalty.analista,
        squad: penalty.squad || penalty.equipe,
        coordenador: penalty.coordenador,
        auditor: penalty.auditor,
        type: penalty.type || penalty.tipo_nc,
        date: penalty.date || penalty.data,
        evaluationId: penalty.evaluationId || penalty.avaliacaoId,
        severity: normalizeSeverity(penalty.severity),
        points: typeof penalty.pontos === 'number' ? penalty.pontos : (typeof penalty.points === 'number' ? penalty.points : -20),
        impacto_operacional: penalty.impacto_operacional || penalty.impactOperacional,
        justificativa_tecnica: penalty.justificativa_tecnica || penalty.justificativaTecnica,
        aplicar_pontos: penalty.aplicar_pontos !== false && penalty.aplicarPontos !== false,
        penaltySource: 'fixed',
      });
    });
  }

  return ncs;
}

/**
 * Normalizes evidence/atendimento records including nested NCs
 */
function normalizeEvidences(evidencesData: any[] | undefined): NormalizedEvidence[] {
  if (!Array.isArray(evidencesData)) {
    return [];
  }

  return evidencesData.map((evidence, index) => {
    const normalized: NormalizedEvidence = {
      id: evidence.id || evidence.protocolo || `evidence-${index}`,
      protocolo: evidence.protocolo || evidence.numero || evidence.sup || `#${index}`,
      sup: evidence.sup,
      numero: evidence.numero || evidence.protocolo,
      cliente: evidence.cliente || '',
      assunto: evidence.assunto || evidence.subject,
      solucao: evidence.solucao || evidence.solution,
      comportamento: evidence.comportamento || evidence.behavior,
      sintese: evidence.sintese || evidence.sintese_tecnica || evidence.summary,
      canal: evidence.canal || evidence.channel,
      duracao: evidence.duracao || evidence.duration,
      data: evidence.data || evidence.date,
      ordem: evidence.ordem || evidence.order,

      // Scores
      notaQA: evidence.nota_qa || evidence.notaQA,
      notaIEPC: evidence.nota_iepc || evidence.notaIEPC,
      notaFinal: evidence.nota_final || evidence.notaFinal || evidence.nota,
      nota_qa: evidence.nota_qa,
      nota_iepc: evidence.nota_iepc,
      nota_final: evidence.nota_final || evidence.nota,

      // Criteria
      criterios: evidence.criterios || evidence.criterios_avaliados,
      criterios_avaliados: evidence.criterios_avaliados,

      // IEPC evaluation
      iepc_avaliado: evidence.iepc_avaliado,

      // Non-conformities (multiple formats)
      ncs: Array.isArray(evidence.ncs) ? evidence.ncs.map((nc: any) => ({
        id: nc.id || nc.codigo || '',
        codigo: nc.codigo,
        protocolo: evidence.protocolo,
        description: nc.descricao || nc.description || '',
        severity: normalizeSeverity(nc.severidade || nc.severity),
        points: typeof nc.pontos === 'number' ? nc.pontos : (typeof nc.points === 'number' ? nc.points : -20),
        impacto_operacional: nc.impacto_operacional || nc.impactOperacional,
        justificativa_tecnica: nc.justificativa_tecnica || nc.justificativaTecnica,
        aplicar_pontos: nc.aplicar_pontos !== false && nc.aplicarPontos !== false,
        penaltySource: 'variable',
      })) : undefined,

      nao_conformidades: Array.isArray(evidence.nao_conformidades) ? evidence.nao_conformidades : undefined,
      penalidades: Array.isArray(evidence.penalidades) ? evidence.penalidades : undefined,

      // Operational alerts
      alertas_operacionais: evidence.alertas_operacionais,

      // Additional
      informou_sup: evidence.informou_sup ?? true,
      pontos_fortes: evidence.pontos_fortes || evidence.strongPoints,
      pontos_a_melhorar: evidence.pontos_a_melhorar || evidence.pointsToImprove,
    };

    return normalized;
  });
}

/**
 * Normalizes feedback blocks from various formats
 */
function normalizeFeedbackBlocks(
  feedbackData: any[] | Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!feedbackData) {
    return undefined;
  }

  // If array format (old)
  if (Array.isArray(feedbackData)) {
    const blocks: Record<string, string> = {};
    feedbackData.forEach((block, index) => {
      const key = block.type || block.categoria || `feedback_${index}`;
      blocks[key] = block.content || block.texto || '';
    });
    return Object.keys(blocks).length > 0 ? blocks : undefined;
  }

  // If object/map format (Lovable)
  if (typeof feedbackData === 'object') {
    return Object.keys(feedbackData).length > 0 ? feedbackData : undefined;
  }

  return undefined;
}

/**
 * Normalizes coaching data from various formats
 */
function normalizeCoaching(coachingData: any[] | undefined): NormalizedCoaching[] {
  if (!Array.isArray(coachingData)) {
    return [];
  }

  return coachingData
    .map((coaching, index) => ({
      id: coaching.id || `coaching-${index}`,
      categoria: coaching.categoria,
      topic: coaching.topic || coaching.categoria || '',
      oQueDisseErrado: coaching.o_que_foi_dito || coaching.oQueDisseErrado || coaching.what_was_said,
      comoPoderiaSerDito: coaching.como_poderia_ser || coaching.comoPoderiaSerDito || coaching.how_it_could_be,
      dicaDeOuro: coaching.dica_de_ouro || coaching.dicaDeOuro || coaching.golden_tip,
      content: coaching.content || '',
      date: coaching.date || coaching.data,
      assignedTo: coaching.assignedTo || coaching.assigned_to,
    }))
    .filter((coaching) => coaching.oQueDisseErrado || coaching.comoPoderiaSerDito || coaching.topic);
}

/**
 * Normalizes analytics data
 */
function normalizeAnalytics(analyticsData: any | undefined): NormalizedAnalytics | undefined {
  if (typeof analyticsData !== 'object' || analyticsData === null) {
    return undefined;
  }

  const result: NormalizedAnalytics = {
    percentual_aderencia: analyticsData.percentual_aderencia,
    quantidade_aderidos: analyticsData.quantidade_aderidos,
    quantidade_parcial: analyticsData.quantidade_parcial,
    quantidade_nao_evidenciado: analyticsData.quantidade_nao_evidenciado,
    total_atendimentos: analyticsData.total_atendimentos,
    media_nota_atendimento: analyticsData.media_nota_atendimento,
    pontos_positivos: analyticsData.pontos_positivos,
    melhorias: analyticsData.melhorias,
    feedback_final: analyticsData.feedback_final,
    analise_estrategica: analyticsData.analise_estrategica,
    tags: analyticsData.tags,
    origem: analyticsData.origem,
    avaliacao_id: analyticsData.avaliacao_id,
    avaliador: analyticsData.avaliador,
    data_registro: analyticsData.data_registro,
  };

  return Object.keys(result).some(k => result[k as keyof NormalizedAnalytics] !== undefined) ? result : undefined;
}

/**
 * Detects which payload format is being used
 */
function detectPayloadFormat(payload: any): {
  version: 'v1_legacy' | 'v2_lovable';
  hasLegacy: boolean;
  hasNew: boolean;
} {
  const hasNewFormat =
    payload?.scores?.qa !== undefined ||
    payload?.scores?.iepc !== undefined ||
    payload?.scores?.aderencia !== undefined ||
    Array.isArray(payload?.nao_conformidades) ||
    Array.isArray(payload?.evidencias) ||
    Array.isArray(payload?.atendimentos) ||
    payload?.qa_pilares?.some((p: any) => p.codigo) ||
    payload?.iepc_pilares?.some((p: any) => p.codigo);

  const hasLegacyFormat =
    payload?.qa_score !== undefined ||
    payload?.iepc_score !== undefined ||
    Array.isArray(payload?.penalidades) ||
    payload?.qa_atual !== undefined ||
    payload?.iepc_atual !== undefined;

  // If both formats present, prefer new format (incremental migration)
  const version = hasNewFormat ? 'v2_lovable' : 'v1_legacy';

  return {
    version,
    hasLegacy: hasLegacyFormat,
    hasNew: hasNewFormat,
  };
}

/**
 * Main normalization function
 * 
 * Accepts either legacy or new payload format and returns a standardized object.
 * Handles structures from:
 * - Lovable: /api/feedbacks/import and /api/receber-avaliacao
 * - Rocket legacy: Direct database format
 * - Base44 export: Local JSON download format
 * 
 * @param payload - The raw payload from any source
 * @returns Normalized payload with unified structure
 */
export function normalizePayload(payload: any): NormalizedPayload {
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // Detect payload format
  const { version, hasLegacy, hasNew } = detectPayloadFormat(payload);

  // Validate input
  if (!payload || typeof payload !== 'object') {
    warnings.push('Empty or invalid payload provided');
    payload = {}; // Use empty object as fallback
  }

  // Normalize analyst and cycle metadata
  // FIX: Handle Lovable format where analista is an object {nome, email, equipe, coordenador, auditor}
  const analistaObj = typeof payload.analista === 'object' && payload.analista !== null ? payload.analista as Record<string, unknown> : null;
  const analistaStr = typeof payload.analista === 'string' ? payload.analista : null;

  const analyst: NormalizedAnalystMetadata = {
    nome: analistaObj?.nome as string || analistaObj?.nome_completo as string || analistaStr || payload.analyst?.nome,
    nome_completo: analistaObj?.nome_completo as string || analistaStr || payload.analyst?.nome_completo || payload.analista_nome_completo,
    email: analistaObj?.email as string || payload.analyst?.email || payload.analista_email,
    equipe: analistaObj?.equipe as string || payload.analyst?.equipe || payload.equipe,
    squad: analistaObj?.equipe as string || analistaObj?.squad as string || payload.analyst?.squad || payload.squad,
    coordenador: analistaObj?.coordenador as string || payload.analyst?.coordenador || payload.coordenador,
    auditor: analistaObj?.auditor as string || payload.analyst?.auditor || payload.auditor,
  };

  // FIX: Handle Lovable format where ciclo is an object {nome, data_inicio, data_fim, status}
  const cicloObj = typeof payload.ciclo === 'object' && payload.ciclo !== null ? payload.ciclo as Record<string, unknown> : null;
  const cicloStr = typeof payload.ciclo === 'string' ? payload.ciclo : null;

  const cycle: NormalizedCycleMetadata = {
    nome: cicloObj?.nome as string || cicloStr || payload.periodo || payload.cycle?.nome,
    periodo: cicloObj?.nome as string || cicloStr || payload.periodo || payload.cycle?.nome,
    data_inicio: cicloObj?.data_inicio as string || payload.ciclo?.data_inicio || payload.cycle?.data_inicio,
    data_fim: cicloObj?.data_fim as string || payload.ciclo?.data_fim || payload.cycle?.data_fim,
    status: cicloObj?.status as 'em_andamento' | 'concluido' || payload.ciclo?.status || payload.cycle?.status,
  };

  // Normalize scores
  const scores = {
    qa: normalizeScore(payload, 'qa'),
    iepc: normalizeScore(payload, 'iepc'),
    aderencia: normalizeScore(payload, 'aderencia'),
  };

  // Validate scores were properly extracted
  if (scores.qa.value === 0 && !payload.scores?.qa && !payload.qa_score && !payload.qa_atual && !payload.qa) {
    warnings.push('No QA score found in payload');
  }
  if (scores.iepc.value === 0 && !payload.scores?.iepc && !payload.iepc_score && !payload.iepc_atual && !payload.iepc) {
    warnings.push('No IEPC score found in payload');
  }

  // Normalize pillars
  const pillars = {
    qa: normalizePillars(payload.qa_pilares || payload.pillars?.qa, 'qa'),
    iepc: normalizePillars(payload.iepc_pilares || payload.pillars?.iepc, 'iepc'),
  };

  if (pillars.qa.length === 0) {
    warnings.push('No valid QA pillars found');
  }
  if (pillars.iepc.length === 0) {
    warnings.push('No valid IEPC pillars found');
  }

  // Normalize non-conformities (from both root and evidences)
  let nao_conformidades = normalizeNonConformities(payload);
  
  // Also extract NCs from evidences
  const evidencias = normalizeEvidences(payload.evidencias || payload.atendimentos);
  evidencias.forEach((evidence) => {
    if (evidence.ncs && Array.isArray(evidence.ncs)) {
      nao_conformidades.push(
        ...evidence.ncs.map((nc: any) => ({
          ...nc,
          protocolo: evidence.protocolo,
        }))
      );
    }
  });

  // Calculate totals
  const total_ncs = payload.total_ncs !== undefined ? payload.total_ncs : nao_conformidades.length;
  const pontos_deduzidos_nc = payload.pontos_deduzidos_nc !== undefined 
    ? payload.pontos_deduzidos_nc 
    : nao_conformidades.reduce((sum, nc) => sum + (nc.aplicar_pontos !== false ? nc.points : 0), 0);

  // Normalize feedback, coaching, and analytics
  const feedback_blocks = normalizeFeedbackBlocks(payload.feedback_blocks || payload.feedback);
  const coaching = normalizeCoaching(payload.coaching);
  const analytics = normalizeAnalytics(payload.analytics);

  // Build the normalized payload
  const normalized: NormalizedPayload = {
    payload_version: version,
    normalized_at: now,
    raw_payload: payload, // Preserve for audit/debugging

    analyst,
    cycle,
    periodo: cycle.periodo,
    analista: analyst.nome,

    scores,
    pillars,
    nao_conformidades,
    total_ncs,
    pontos_deduzidos_nc,

    evidencias,
    feedback_blocks: feedback_blocks,
    coaching: coaching.length > 0 ? coaching : undefined,
    analytics: analytics,

    historico: payload.historico,

    metadata: {
      has_new_format: hasNew,
      has_legacy_format: hasLegacy,
      warnings,
    },
  };

  return normalized;
}

/**
 * Extracts QA score from normalized payload
 */
export function getQAScore(normalized: NormalizedPayload): number {
  return normalized.scores.qa.value;
}

/**
 * Extracts IEPC score from normalized payload
 */
export function getIEPCScore(normalized: NormalizedPayload): number {
  return normalized.scores.iepc.value;
}

/**
 * Extracts Aderência score from normalized payload
 */
export function getAderenciaScore(normalized: NormalizedPayload): number {
  return normalized.scores.aderencia.value;
}

/**
 * Calculates total penalty from non-conformities
 * Respects variable penalties and aplicar_pontos flag
 */
export function calculateTotalPenalty(normalized: NormalizedPayload): number {
  return normalized.nao_conformidades.reduce((total, nc) => {
    // Only apply penalty if aplicar_pontos is true (or not explicitly false)
    return total + (nc.aplicar_pontos !== false ? nc.points : 0);
  }, 0);
}

/**
 * Groups non-conformities by severity
 */
export function groupNCBySeverity(
  normalized: NormalizedPayload
): Record<string, NormalizedNonConformity[]> {
  const grouped: Record<string, NormalizedNonConformity[]> = {
    baixa: [],
    media: [],
    alta: [],
    critica: [],
  };

  normalized.nao_conformidades.forEach((nc) => {
    const severity = nc.severity || 'media';
    if (grouped[severity]) {
      grouped[severity].push(nc);
    }
  });

  return grouped;
}

/**
 * Validates normalized payload structure
 */
export function isValidNormalizedPayload(normalized: any): normalized is NormalizedPayload {
  if (!normalized || typeof normalized !== 'object') {
    return false;
  }

  // Check required fields
  if (!normalized.payload_version || !normalized.normalized_at) {
    return false;
  }

  if (!normalized.scores || typeof normalized.scores !== 'object') {
    return false;
  }

  if (!normalized.pillars || typeof normalized.pillars !== 'object') {
    return false;
  }

  if (!Array.isArray(normalized.nao_conformidades)) {
    return false;
  }

  if (!normalized.metadata || typeof normalized.metadata !== 'object') {
    return false;
  }

  return true;
}

/**
 * Export helper: Converts normalized payload to Lovable feedback API format
 * This is used when sending data back to QualiVisão
 */
export function toLovableFormat(normalized: NormalizedPayload): any {
  return {
    metadata: {
      origem: 'lovable',
      versao: '1.0',
      gerado_em: normalized.normalized_at,
      avaliacao_id: normalized.analytics?.avaliacao_id,
    },
    analista: normalized.analyst,
    analista_email: normalized.analyst?.email,
    ciclo: normalized.cycle,
    scores: {
      qa: normalized.scores.qa.value,
      iepc: normalized.scores.iepc.value,
      aderencia: normalized.scores.aderencia.value,
    },
    qa_pilares: normalized.pillars.qa,
    iepc_pilares: normalized.pillars.iepc,
    atendimentos: normalized.evidencias,
    coaching: normalized.coaching,
    nao_conformidades: normalized.nao_conformidades,
    feedback_blocks: normalized.feedback_blocks,
    historico: normalized.historico,
  };
}
