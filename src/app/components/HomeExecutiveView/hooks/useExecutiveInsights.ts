'use client';

import { useMemo } from 'react';
import { ExecutiveMetrics, getTrendPercent } from './useExecutiveData';
import { EXECUTIVE_TARGETS } from '../config/targets';

export interface Insight {
  id: string;
  text: string;
  context?: string;
  icon: string; // icon name from lucide
  metric?: {
    value: number | string;
    unit?: string;
  };
}

export interface ExecutiveInsights {
  positiveHighlights: Insight[];
  evolutionOpportunities: Insight[];
}

const INSIGHT_ICONS = {
  upTrend: 'TrendingUp',
  downTrend: 'TrendingDown',
  consistent: 'CheckCircle',
  improvement: 'Zap',
  alert: 'AlertTriangle',
  growth: 'Star',
  users: 'Users',
  target: 'Target',
  barChart: 'BarChart2',
};

export function useExecutiveInsights(
  current: ExecutiveMetrics | null,
  previous: ExecutiveMetrics | null
): ExecutiveInsights {
  return useMemo(() => {
    const positiveHighlights: Insight[] = [];
    const evolutionOpportunities: Insight[] = [];

    if (!current) return { positiveHighlights, evolutionOpportunities };

    // ─── POSITIVE HIGHLIGHTS ────────────────────────────────────────────────

    // 1. QA Evolution
    if (current.prevPeriodQA !== undefined && current.qaAvg > current.prevPeriodQA) {
      const percent = getTrendPercent(current.qaAvg, current.prevPeriodQA);
      positiveHighlights.push({
        id: 'qa-evolution',
        text: `QA evoluiu ${percent > 0 ? '+' : ''}${percent}%`,
        context: `de ${current.prevPeriodQA} para ${current.qaAvg}`,
        icon: INSIGHT_ICONS.upTrend,
        metric: { value: current.qaAvg, unit: 'pontos' },
      });
    }

    // 2. QA Above Target
    if (current.qaAvg >= EXECUTIVE_TARGETS.QA.target) {
      positiveHighlights.push({
        id: 'qa-above-target',
        text: `QA acima da meta (≥${EXECUTIVE_TARGETS.QA.target})`,
        context: `Resultado: ${current.qaAvg} pontos`,
        icon: INSIGHT_ICONS.target,
        metric: { value: current.qaAvg, unit: 'pontos' },
      });
    }

    // 3. IEPC Evolution
    if (current.prevPeriodIEPC !== undefined && current.iepcAvg > current.prevPeriodIEPC) {
      const percent = getTrendPercent(current.iepcAvg, current.prevPeriodIEPC);
      positiveHighlights.push({
        id: 'iepc-evolution',
        text: `IEPC evoluiu ${percent > 0 ? '+' : ''}${percent}%`,
        context: `de ${current.prevPeriodIEPC} para ${current.iepcAvg}`,
        icon: INSIGHT_ICONS.upTrend,
        metric: { value: current.iepcAvg, unit: 'pontos' },
      });
    }

    // 4. IEPC Above Target
    if (current.iepcAvg >= EXECUTIVE_TARGETS.IEPC.target) {
      positiveHighlights.push({
        id: 'iepc-above-target',
        text: `IEPC acima da meta (≥${EXECUTIVE_TARGETS.IEPC.target})`,
        context: `Resultado: ${current.iepcAvg} pontos`,
        icon: INSIGHT_ICONS.target,
        metric: { value: current.iepcAvg, unit: 'pontos' },
      });
    }

    // 5. Reduced NCs
    if (current.validNCs <= EXECUTIVE_TARGETS.NC.low) {
      positiveHighlights.push({
        id: 'low-ncs',
        text: `Baixa ocorrência de NCs`,
        context: `${current.validNCs} ocorrência${current.validNCs !== 1 ? 's' : ''} registrada${current.validNCs !== 1 ? 's' : ''}`,
        icon: INSIGHT_ICONS.checkCircle,
        metric: { value: current.validNCs },
      });
    }

    // 6. High Recognition
    if (current.totalElogios >= EXECUTIVE_TARGETS.RECOGNITION.high) {
      positiveHighlights.push({
        id: 'high-recognition',
        text: `Nível elevado de reconhecimentos`,
        context: `${current.totalElogios} elogios registrados`,
        icon: INSIGHT_ICONS.growth,
        metric: { value: current.totalElogios },
      });
    }

    // 7. Consistent Performance (all teams above threshold)
    if (
      current.equipes.length > 0 &&
      current.equipes.every((eq) => eq.qaAvg >= EXECUTIVE_TARGETS.TEAMS.consistentThreshold)
    ) {
      positiveHighlights.push({
        id: 'consistent-performance',
        text: `Desempenho consistente entre equipes`,
        context: `Todas as ${current.equipes.length} equipe${current.equipes.length !== 1 ? 's' : ''} ≥${EXECUTIVE_TARGETS.TEAMS.consistentThreshold} pontos`,
        icon: INSIGHT_ICONS.consistent,
      });
    }

    // Limit to 3
    const limitedPositives = positiveHighlights.slice(0, 3);

    // ─── EVOLUTION OPPORTUNITIES ────────────────────────────────────────────

    // 1. QA Below Target
    if (
      current.qaAvg < EXECUTIVE_TARGETS.QA.target &&
      current.qaAvg >= EXECUTIVE_TARGETS.QA.operational
    ) {
      const gap = (EXECUTIVE_TARGETS.QA.target - current.qaAvg).toFixed(1);
      evolutionOpportunities.push({
        id: 'qa-gap',
        text: `QA pode evoluir para atingir meta`,
        context: `Faltam ${gap} pontos para ${EXECUTIVE_TARGETS.QA.target}`,
        icon: INSIGHT_ICONS.upTrend,
        metric: { value: current.qaAvg, unit: 'pontos' },
      });
    }

    // 2. QA Critical
    if (current.qaAvg < EXECUTIVE_TARGETS.QA.critical) {
      evolutionOpportunities.push({
        id: 'qa-critical',
        text: `QA requer ação imediata`,
        context: `Resultado: ${current.qaAvg} (crítico <${EXECUTIVE_TARGETS.QA.critical})`,
        icon: INSIGHT_ICONS.alert,
        metric: { value: current.qaAvg, unit: 'pontos' },
      });
    }

    // 3. IEPC Below Target
    if (
      current.iepcAvg < EXECUTIVE_TARGETS.IEPC.target &&
      current.iepcAvg >= EXECUTIVE_TARGETS.IEPC.operational
    ) {
      const gap = (EXECUTIVE_TARGETS.IEPC.target - current.iepcAvg).toFixed(1);
      evolutionOpportunities.push({
        id: 'iepc-gap',
        text: `IEPC pode evoluir para atingir meta`,
        context: `Faltam ${gap} pontos para ${EXECUTIVE_TARGETS.IEPC.target}`,
        icon: INSIGHT_ICONS.upTrend,
        metric: { value: current.iepcAvg, unit: 'pontos' },
      });
    }

    // 4. High NCs
    if (current.validNCs > EXECUTIVE_TARGETS.NC.moderate) {
      evolutionOpportunities.push({
        id: 'high-ncs',
        text: `Elevada ocorrência de não conformidades`,
        context: `${current.validNCs} ocorrências no período`,
        icon: INSIGHT_ICONS.alert,
        metric: { value: current.validNCs },
      });
    }

    // 5. NC Distribution Insight
    if (current.ncByType.length > 0) {
      const topNC = current.ncByType[0];
      evolutionOpportunities.push({
        id: 'nc-concentration',
        text: `${topNC.type} concentra ${topNC.pct}% das NCs`,
        context: `Oportunidade de foco específico`,
        icon: INSIGHT_ICONS.barChart,
        metric: { value: topNC.count },
      });
    }

    // 6. Teams below target
    const belowTargetTeams = current.equipes.filter((eq) => eq.qaAvg < 70);
    if (belowTargetTeams.length > 0) {
      evolutionOpportunities.push({
        id: 'teams-below-target',
        text: `${belowTargetTeams.length} equipe${belowTargetTeams.length !== 1 ? 's' : ''} requer${belowTargetTeams.length !== 1 ? 'em' : ''} suporte`,
        context: `${belowTargetTeams.map((t) => t.name).join(', ')} <70 QA`,
        icon: INSIGHT_ICONS.alert,
      });
    }

    // Limit to 3
    const limitedOpportunities = evolutionOpportunities.slice(0, 3);

    return {
      positiveHighlights: limitedPositives,
      evolutionOpportunities: limitedOpportunities,
    };
  }, [current, previous]);
}
