/**
 * Executive Panel Target Configuration
 *
 * ⚠️ PENDENTE DE VALIDAÇÃO
 *
 * Os valores abaixo foram extraídos da implementação atual
 * e devem ser validados contra a Base de Conhecimento (Notion)
 * antes de serem considerados OFICIALMENTE VIGENTES.
 *
 * Fonte: Regras hardcoded nos componentes (ExecutiveSummary, ExecutiveKPIs, etc.)
 * Data: 2026-07-10
 * Status: IMPLEMENTAÇÃO ATUAL — PENDENTE DE VALIDAÇÃO
 */

export const EXECUTIVE_TARGETS = {
  // QA Targets (pontos de 0-100)
  QA: {
    target: 85, // Meta ideal
    operational: 70, // Mínimo operacional
    critical: 70, // Abaixo disso é crítico
  },

  // IEPC Targets (pontos de 0-100)
  IEPC: {
    target: 85, // Meta ideal
    operational: 70, // Mínimo operacional
  },

  // NC (Não Conformidades) Counts
  NC: {
    low: 5, // ≤5: Baixa
    moderate: 15, // ≤15: Moderada
    high: 15, // >15: Elevada
  },

  // Recognition (Elogios) Counts
  RECOGNITION: {
    high: 10, // ≥10: Nível elevado
    good: 5, // ≥5: Bom
    limited: 5, // <5: Limitado
  },

  // Teams Performance
  TEAMS: {
    consistentThreshold: 70, // Todos ≥70: Desempenho consistente
    belowThreshold: 70, // <70: Requer suporte
  },
};

export const TARGET_VALIDATION_STATUS = `
⚠️ Atenção: Todos os valores acima devem ser validados contra:
1. Base de Conhecimento no Notion (qualivisao-base-conhecimento)
2. Histórico de metas aprovadas pela Diretoria
3. SLAs e KPIs oficiais da empresa

Implementação atual segue regras extraídas de componentes anteriores.
Até que sejam validados, todos os insights devem incluir marca de "PENDENTE".
`;
