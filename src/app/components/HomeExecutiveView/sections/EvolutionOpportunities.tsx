import React from 'react';
import { Insight } from '../hooks/useExecutiveInsights';
import { InsightItem } from '../components/InsightItem';
import { EmptyState } from '../components/EmptyState';

interface EvolutionOpportunitiesProps {
  insights: Insight[];
}

export function EvolutionOpportunities({
  insights,
}: EvolutionOpportunitiesProps) {
  if (insights.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Oportunidades de Evolução
        </h3>
        <EmptyState
          title="Sem oportunidades identificadas"
          description="O desempenho está acima das metas em todos os indicadores."
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Oportunidades de Evolução ({insights.length})
      </h3>
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightItem
            key={insight.id}
            icon={insight.icon}
            text={insight.text}
            context={insight.context}
            type="opportunity"
            metric={insight.metric}
          />
        ))}
      </div>
    </div>
  );
}
