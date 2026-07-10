import React from 'react';
import { ExecutiveMetrics } from '../hooks/useExecutiveData';

interface ExecutiveSummaryProps {
  data: ExecutiveMetrics;
}

export function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const getPeriodicSummary = (): string => {
    const parts: string[] = [];

    // QA summary
    if (data.qaAvg >= 85) {
      parts.push('desempenho de QA acima da meta');
    } else if (data.qaAvg >= 70) {
      parts.push('desempenho de QA operacional');
    } else {
      parts.push('desempenho de QA crítico');
    }

    // IEPC summary
    if (data.iepcAvg >= 85) {
      parts.push('satisfação do cliente elevada');
    } else if (data.iepcAvg >= 70) {
      parts.push('satisfação do cliente operacional');
    }

    // NC summary
    if (data.validNCs <= 5) {
      parts.push('baixa incidência de não conformidades');
    } else if (data.validNCs <= 15) {
      parts.push('moderada incidência de não conformidades');
    } else {
      parts.push('alta incidência de não conformidades');
    }

    // Teams summary
    if (data.teamsCount > 0) {
      const teamsAboveTarget = data.equipes.filter((e) => e.qaAvg >= 85)
        .length;
      if (teamsAboveTarget === data.teamsCount) {
        parts.push('todas as equipes acima da meta');
      } else if (teamsAboveTarget > 0) {
        parts.push(
          `${teamsAboveTarget} de ${data.teamsCount} equipes acima da meta`
        );
      }
    }

    return parts.join('; ') + '.';
  };

  return (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border border-blue-200 dark:border-slate-600">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Período: {data.periodo}
      </h2>
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {getPeriodicSummary()} {data.totalElogios > 0 && `Total de ${data.totalElogios} reconhecimento${data.totalElogios !== 1 ? 's' : ''} registrado${data.totalElogios !== 1 ? 's' : ''}.`}
      </p>
      {data.divergentNCs > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
          ⓘ {data.divergentNCs} registro{data.divergentNCs !== 1 ? 's' : ''} pendente{data.divergentNCs !== 1 ? 's' : ''} de classificação (não incluído{data.divergentNCs !== 1 ? 's' : ''} nos indicadores acima)
        </p>
      )}
    </div>
  );
}
