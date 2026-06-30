export type ExecutiveInsightType = 'positive' | 'risk' | 'action' | 'governance' | 'diagnosis';
export type ExecutiveInsightSeverity = 'info' | 'positive' | 'attention' | 'critical';
export type ExecutiveInsightPriority = 'alta' | 'media' | 'baixa';

export interface ExecutiveInsight {
  type: ExecutiveInsightType;
  title: string;
  description: string;
  severity: ExecutiveInsightSeverity;
  priority?: ExecutiveInsightPriority;
  relatedMetric?: string;
  relatedKnowledgeKey?: string;
  targetRoute: string;
  recommendedAction?: string;
}

interface BuildExecutiveInsightsInput {
  periodo?: string;
  qa: number;
  iepc: number;
  ncs: number;
  elogios: number;
  avaliacoes: number;
  qaDelta: number | null;
  iepcDelta: number | null;
  ncDelta: number | null;
  elogioDelta: number | null;
  strongestSquad?: { squad: string; qa: number };
  weakestSquad?: { squad: string; qa: number };
  strongestCoordinator?: { coord: string; qa: number };
  weakestQaPillar?: { fullName: string; pct: number };
  weakestIepcPillar?: { fullName: string; pct: number };
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
}

export function buildExecutiveInsights(input: BuildExecutiveInsightsInput): {
  health: { label: string; tone: string; bg: string; border: string; summary: string };
  diagnosis: ExecutiveInsight;
  positiveHighlights: ExecutiveInsight[];
  attentionPoints: ExecutiveInsight[];
  recommendedActions: ExecutiveInsight[];
  governanceAlerts: ExecutiveInsight[];
} {
  const hasData = input.avaliacoes > 0;
  const health = !hasData
    ? { label: 'Dados insuficientes', tone: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', summary: 'Ainda não há volume suficiente para leitura executiva do ciclo.' }
    : input.qa >= 85 && input.iepc >= 85 && input.ncs <= 5
      ? { label: 'Saudável', tone: '#047857', bg: '#ECFDF5', border: '#A7F3D0', summary: 'Operação em patamar saudável para o ciclo selecionado.' }
      : input.qa < 70 || input.iepc < 70 || input.ncs > 15
        ? { label: 'Crítica', tone: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', summary: 'Há indicadores que exigem priorização de gestão neste ciclo.' }
        : { label: 'Estável com atenção', tone: '#B45309', bg: '#FFFBEB', border: '#FDE68A', summary: 'Operação estável, com pontos específicos para acompanhamento.' };

  const trendParts = [
    input.qaDelta !== null ? `QA ${formatDelta(input.qaDelta)}` : null,
    input.iepcDelta !== null ? `IEPC ${formatDelta(input.iepcDelta)}` : null,
    input.ncDelta !== null ? `NC ${input.ncDelta > 0 ? '+' : ''}${input.ncDelta}` : null,
    input.elogioDelta !== null ? `reconhecimentos ${input.elogioDelta > 0 ? '+' : ''}${input.elogioDelta}` : null,
  ].filter(Boolean).join(', ');

  const diagnosis: ExecutiveInsight = {
    type: 'diagnosis',
    title: `Diagnóstico do ciclo ${input.periodo || 'selecionado'}`,
    description: hasData
      ? `A operação está classificada como ${health.label.toLowerCase()}. ${trendParts ? `Comparativo: ${trendParts}.` : 'Ainda não há ciclo anterior suficiente para comparação.'} ${input.weakestSquad ? `Squad que pede maior atenção: ${input.weakestSquad.squad}.` : ''}`
      : 'Dados insuficientes para diagnóstico automático neste ciclo.',
    severity: health.label === 'Crítica' ? 'critical' : health.label === 'Saudável' ? 'positive' : 'attention',
    relatedMetric: 'operation_health',
    relatedKnowledgeKey: 'executive.operation_health',
    targetRoute: '/cycle-dashboard',
    recommendedAction: 'Validar tendência e priorizar ações do ciclo.',
  };

  const positiveHighlights: ExecutiveInsight[] = [
    input.qaDelta !== null && input.qaDelta > 0 ? {
      type: 'positive', title: 'QA em evolução', description: `QA evoluiu ${input.qaDelta.toFixed(1)} ponto(s) frente ao ciclo anterior.`, severity: 'positive', relatedMetric: 'qa', relatedKnowledgeKey: 'qa.overview', targetRoute: '/qa-iepc', recommendedAction: 'Identificar práticas que geraram a evolução.'
    } : null,
    input.iepcDelta !== null && input.iepcDelta > 0 ? {
      type: 'positive', title: 'IEPC em evolução', description: `IEPC evoluiu ${input.iepcDelta.toFixed(1)} ponto(s), indicando melhora percebida.`, severity: 'positive', relatedMetric: 'iepc', relatedKnowledgeKey: 'iepc.overview', targetRoute: '/qa-iepc', recommendedAction: 'Reconhecer práticas de atendimento que melhoraram a percepção.'
    } : null,
    input.ncDelta !== null && input.ncDelta < 0 ? {
      type: 'positive', title: 'Redução de NCs', description: `Não conformidades reduziram ${Math.abs(input.ncDelta)} registro(s).`, severity: 'positive', relatedMetric: 'nc', relatedKnowledgeKey: 'nc.reduction', targetRoute: '/nao-conformidades', recommendedAction: 'Reforçar controles que reduziram ocorrências.'
    } : null,
    input.elogioDelta !== null && input.elogioDelta > 0 ? {
      type: 'positive', title: 'Reconhecimento em alta', description: `Reconhecimentos aumentaram ${input.elogioDelta} registro(s).`, severity: 'positive', relatedMetric: 'recognition', relatedKnowledgeKey: 'recognition.trends', targetRoute: '/mural-elogios', recommendedAction: 'Compartilhar boas práticas com as squads.'
    } : null,
    input.strongestSquad ? {
      type: 'positive', title: 'Squad destaque', description: `${input.strongestSquad.squad} lidera o ciclo em QA (${input.strongestSquad.qa.toFixed(1)}).`, severity: 'positive', relatedMetric: 'squad', relatedKnowledgeKey: 'squad.performance', targetRoute: '/cycle-dashboard', recommendedAction: 'Mapear práticas replicáveis da squad.'
    } : null,
    input.strongestCoordinator ? {
      type: 'positive', title: 'Coordenação destaque', description: `${input.strongestCoordinator.coord} aparece com maior QA médio (${input.strongestCoordinator.qa.toFixed(1)}).`, severity: 'positive', relatedMetric: 'coordinator', relatedKnowledgeKey: 'coordinator.performance', targetRoute: '/cycle-dashboard', recommendedAction: 'Registrar e disseminar padrões de acompanhamento.'
    } : null,
  ].filter(Boolean) as ExecutiveInsight[];

  const attentionPoints: ExecutiveInsight[] = [
    input.qaDelta !== null && input.qaDelta < 0 ? {
      type: 'risk', title: 'Queda de QA', description: `QA caiu ${Math.abs(input.qaDelta).toFixed(1)} ponto(s).`, severity: 'attention', priority: 'alta', relatedMetric: 'qa', relatedKnowledgeKey: 'qa.drop_alert', targetRoute: '/qa-iepc', recommendedAction: 'Analisar pilares com queda e acionar plano de melhoria.'
    } : null,
    input.iepcDelta !== null && input.iepcDelta < 0 ? {
      type: 'risk', title: 'Queda de IEPC', description: `IEPC caiu ${Math.abs(input.iepcDelta).toFixed(1)} ponto(s).`, severity: 'attention', priority: 'alta', relatedMetric: 'iepc', relatedKnowledgeKey: 'iepc.drop_alert', targetRoute: '/qa-iepc', recommendedAction: 'Revisar experiência percebida pelo cliente.'
    } : null,
    input.ncDelta !== null && input.ncDelta > 0 ? {
      type: 'risk', title: 'NCs em alta', description: `NCs aumentaram ${input.ncDelta} registro(s) no ciclo.`, severity: 'critical', priority: 'alta', relatedMetric: 'nc', relatedKnowledgeKey: 'nc.increase_alert', targetRoute: '/nao-conformidades', recommendedAction: 'Priorizar análise de recorrência e causa raiz.'
    } : null,
    input.weakestSquad ? {
      type: 'risk', title: 'Squad em atenção', description: `${input.weakestSquad.squad} tem menor QA médio (${input.weakestSquad.qa.toFixed(1)}).`, severity: 'attention', priority: 'media', relatedMetric: 'squad', relatedKnowledgeKey: 'squad.risk', targetRoute: '/cycle-dashboard', recommendedAction: 'Acompanhar evolução e suporte da coordenação.'
    } : null,
    input.weakestQaPillar ? {
      type: 'risk', title: 'Pilar QA frágil', description: `${input.weakestQaPillar.fullName} está com menor aderência (${input.weakestQaPillar.pct}%).`, severity: 'attention', priority: 'media', relatedMetric: 'qa_pillar', relatedKnowledgeKey: 'qa.pillars', targetRoute: '/qa-iepc', recommendedAction: 'Conectar treinamento e feedback ao pilar crítico.'
    } : null,
    input.weakestIepcPillar ? {
      type: 'risk', title: 'Dimensão IEPC frágil', description: `${input.weakestIepcPillar.fullName} está com menor aderência (${input.weakestIepcPillar.pct}%).`, severity: 'attention', priority: 'media', relatedMetric: 'iepc_dimension', relatedKnowledgeKey: 'iepc.dimensions', targetRoute: '/qa-iepc', recommendedAction: 'Revisar experiência e comunicação percebida.'
    } : null,
  ].filter(Boolean) as ExecutiveInsight[];

  const recommendedActions: ExecutiveInsight[] = [
    { type: 'action', title: 'Analisar QA & IEPC', description: 'Validar pilares/dimensões que explicam o status do ciclo.', severity: 'info', priority: 'alta', relatedMetric: 'qa_iepc', relatedKnowledgeKey: 'qa_iepc.executive_review', targetRoute: '/qa-iepc', recommendedAction: 'Abrir diagnóstico QA & IEPC.' },
    input.ncs > 0 ? { type: 'action', title: 'Revisar Não Conformidades', description: `${input.ncs} NC(s) exigem acompanhamento operacional.`, severity: input.ncs > 10 ? 'critical' : 'attention', priority: input.ncs > 10 ? 'alta' : 'media', relatedMetric: 'nc', relatedKnowledgeKey: 'nc.management', targetRoute: '/nao-conformidades', recommendedAction: 'Abrir a tela de NCs.' } : null,
    { type: 'action', title: 'Acompanhar PDI', description: 'Verificar se há planos ativos vinculados aos feedbacks e ciclos.', severity: 'info', priority: 'media', relatedMetric: 'pdi', relatedKnowledgeKey: 'pdi.follow_up', targetRoute: '/feedback/pdi', recommendedAction: 'Abrir Central de PDI.' },
    { type: 'action', title: 'Ver Gestão de Ciclos', description: 'Fechamento, reabertura e correções ficam centralizados em Gestão de Ciclos.', severity: 'info', priority: 'media', relatedMetric: 'cycle', relatedKnowledgeKey: 'cycle.governance', targetRoute: '/ciclos', recommendedAction: 'Abrir Gestão de Ciclos.' },
    input.elogios > 0 ? { type: 'action', title: 'Valorizar reconhecimentos', description: `${input.elogios} reconhecimento(s) podem virar boas práticas compartilhadas.`, severity: 'positive', priority: 'baixa', relatedMetric: 'recognition', relatedKnowledgeKey: 'recognition.action', targetRoute: '/mural-elogios', recommendedAction: 'Abrir Reconhecimentos.' } : null,
    { type: 'action', title: 'Ver Feedbacks', description: 'Acompanhar feedbacks pendentes e registros do ciclo.', severity: 'info', priority: 'media', relatedMetric: 'feedback', relatedKnowledgeKey: 'feedback.follow_up', targetRoute: '/feedback', recommendedAction: 'Abrir Gestão de Feedbacks.' },
  ].filter(Boolean) as ExecutiveInsight[];

  const governanceAlerts: ExecutiveInsight[] = [
    { type: 'governance', title: 'Ações de ciclo fora da Home', description: 'Fechamento, reabertura e correção de ciclos devem ser feitos em Gestão de Ciclos.', severity: 'info', priority: 'media', relatedMetric: 'cycle', relatedKnowledgeKey: 'cycle.governance', targetRoute: '/ciclos', recommendedAction: 'Abrir Gestão de Ciclos.' },
    input.ncs > 0 ? { type: 'governance', title: 'NCs exigem acompanhamento', description: 'Há registros de não conformidade que precisam de leitura operacional.', severity: 'attention', priority: 'media', relatedMetric: 'nc', relatedKnowledgeKey: 'nc.follow_up', targetRoute: '/nao-conformidades', recommendedAction: 'Abrir Não Conformidades.' } : null,
  ].filter(Boolean) as ExecutiveInsight[];

  return { health, diagnosis, positiveHighlights, attentionPoints, recommendedActions, governanceAlerts };
}
