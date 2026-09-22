import React from 'react';
import { Insight } from '../hooks/useExecutiveInsights';
import { InsightItem } from '../components/InsightItem';
import { EmptyState } from '../components/EmptyState';

interface PositiveHighlightsProps {
  insights: Insight[];
}

export function PositiveHighlights({ insights }: PositiveHighlightsProps) {
  if (insights.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Destaques Positivos
        </h3>
        <EmptyState
          title="Sem destaques positivos"
          description="Continue trabalhando para alcançar as metas estabelecidas."
        />
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Destaques Positivos ({insights.length})
      </h3>
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightItem
            key={insight.id}
            icon={insight.icon}
            text={insight.text}
            context={insight.context}
            type="positive"
            metric={insight.metric}
          />
        ))}
      </div>
    </div>
  );
}
