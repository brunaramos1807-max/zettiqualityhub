import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { EquipeMetrics, getPerformanceClass } from '../hooks/useExecutiveData';
import { EmptyState } from '../components/EmptyState';

interface TeamsPerformanceTableProps {
  teams: EquipeMetrics[];
  onTeamSelect?: (teamName: string) => void;
  selectedTeam?: string | null;
}

type SortKey = 'name' | 'qa' | 'iepc' | 'ncs' | 'elogios';
type SortDirection = 'asc' | 'desc';

export function TeamsPerformanceTable({
  teams,
  onTeamSelect,
  selectedTeam,
}: TeamsPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('qa');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    let aVal: any = 0,
      bVal: any = 0;

    switch (sortKey) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'qa':
        aVal = a.qaAvg;
        bVal = b.qaAvg;
        break;
      case 'iepc':
        aVal = a.iepcAvg;
        bVal = b.iepcAvg;
        break;
      case 'ncs':
        aVal = a.ncCount;
        bVal = b.ncCount;
        break;
      case 'elogios':
        aVal = a.elogioCount;
        bVal = b.elogioCount;
        break;
    }

    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  if (teams.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Desempenho por Equipe
        </h3>
        <EmptyState
          title="Nenhuma equipe encontrada"
          description="Não há dados de equipes para este período."
        />
      </div>
    );
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <div className="w-4 h-4" />;
    }
    return sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Desempenho por Equipe
      </h3>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Equipe
                  <SortIcon column="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={() => handleSort('qa')}
                  className="flex items-center justify-end gap-2 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
                >
                  QA
                  <SortIcon column="qa" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={() => handleSort('iepc')}
                  className="flex items-center justify-end gap-2 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
                >
                  IEPC
                  <SortIcon column="iepc" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={() => handleSort('ncs')}
                  className="flex items-center justify-end gap-2 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
                >
                  NCs
                  <SortIcon column="ncs" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={() => handleSort('elogios')}
                  className="flex items-center justify-end gap-2 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
                >
                  Elogios
                  <SortIcon column="elogios" />
                </button>
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                Analistas
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team) => {
              const qaPerf = getPerformanceClass(team.qaAvg);
              const isSelected = selectedTeam === team.name;

              return (
                <tr
                  key={team.name}
                  onClick={() => onTeamSelect?.(team.name)}
                  className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800'} ${onTeamSelect ? 'cursor-pointer' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {team.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {team.qaAvg.toFixed(2)}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full mt-1"
                        style={{
                          color: qaPerf.color,
                          backgroundColor: qaPerf.bg,
                          border: `1px solid ${qaPerf.border}`,
                        }}
                      >
                        {qaPerf.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                    {team.iepcAvg.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {team.ncCount}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {team.elogioCount}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                    {team.analystCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
