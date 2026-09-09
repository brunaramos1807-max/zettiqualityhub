'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Users } from 'lucide-react';
import { useExecutiveData } from './hooks/useExecutiveData';
import { useExecutiveFilters } from './hooks/useExecutiveFilters';
import { useExecutiveInsights } from './hooks/useExecutiveInsights';
import { LoadingState } from './components/LoadingState';
import { EmptyState } from './components/EmptyState';
import { ExecutiveSummary } from './sections/ExecutiveSummary';
import { ExecutiveKPIs } from './sections/ExecutiveKPIs';
import { PositiveHighlights } from './sections/PositiveHighlights';
import { EvolutionOpportunities } from './sections/EvolutionOpportunities';
import { TeamsPerformanceTable } from './sections/TeamsPerformanceTable';
import { getActiveCycle } from '@/lib/services/supabaseDataService';

interface HomeExecutiveViewProps {
  defaultPeriodo?: string;
}

export function HomeExecutiveView({ defaultPeriodo = '02/2026' }: HomeExecutiveViewProps) {
  // Filters state
  const filters = useExecutiveFilters(defaultPeriodo);
  const { periodo, squad, setSquad } = filters;

  // Data fetching
  const currentData = useExecutiveData(periodo);
  const previousPeriodo = getPreviousPeriodo(periodo);
  const previousData = useExecutiveData(previousPeriodo);

  // Insights generation
  const insights = useExecutiveInsights(currentData.data, previousData.data);

  // Filtered teams (by squad if selected)
  const filteredTeams =
    currentData.data?.equipes.filter((team) => !squad || team.name === squad) || [];

  if (currentData.loading) {
    return (
      <div className="w-full space-y-6">
        <LoadingState />
      </div>
    );
  }

  if (currentData.error) {
    return (
      <div className="w-full">
        <EmptyState
          title="Erro ao carregar dados"
          description={currentData.error}
          action={{
            label: 'Tentar novamente',
            onClick: currentData.refresh,
          }}
        />
      </div>
    );
  }

  if (!currentData.data) {
    return (
      <div className="w-full">
        <EmptyState
          title="Nenhum dado disponível"
          description="Não há dados para o período selecionado."
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Painel Executivo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Visão consolidada de desempenho e indicadores
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" />
            <select
              value={periodo}
              onChange={(e) => filters.setPeriodo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="02/2026">Fevereiro 2026</option>
              <option value="01/2026">Janeiro 2026</option>
              <option value="12/2025">Dezembro 2025</option>
              <option value="11/2025">Novembro 2025</option>
            </select>
          </div>

          {/* Equipe */}
          {currentData.data.equipes.length > 0 && (
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-500" />
              <select
                value={squad || ''}
                onChange={(e) => setSquad(e.target.value || null)}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filtrar por equipe"
              >
                <option value="">Todas as Equipes</option>
                {currentData.data.equipes.map((team) => (
                  <option key={team.name} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary data={currentData.data} />

      {/* KPI Cards */}
      <ExecutiveKPIs data={currentData.data} />

      {/* Insights Grid: Positives (left) + Opportunities (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <PositiveHighlights insights={insights.positiveHighlights} />
        </div>
        <div>
          <EvolutionOpportunities insights={insights.evolutionOpportunities} />
        </div>
      </div>

      {/* Teams Performance Table */}
      {filteredTeams.length > 0 ? (
        <TeamsPerformanceTable
          teams={filteredTeams}
          selectedTeam={squad}
          onTeamSelect={(teamName) => {
            if (squad === teamName) {
              setSquad(null);
            } else {
              setSquad(teamName);
            }
          }}
        />
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Desempenho por Equipe
          </h3>
          <EmptyState
            title="Nenhuma equipe encontrada"
            description={
              squad
                ? `Nenhuma equipe corresponde ao filtro "${squad}".`
                : 'Não há dados de equipes para este período.'
            }
          />
        </div>
      )}
    </div>
  );
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function getPreviousPeriodo(periodo: string): string {
  const [month, year] = periodo.split('/');
  let m = parseInt(month, 10);
  let y = parseInt(year, 10);

  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }

  return `${String(m).padStart(2, '0')}/${y}`;
}

export default HomeExecutiveView;
