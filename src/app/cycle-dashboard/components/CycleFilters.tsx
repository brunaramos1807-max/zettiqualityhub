'use client';
import React from 'react';
import { Filter, Users, GitCompare, BarChart2, Radar, Table2, LayoutGrid } from 'lucide-react';
import type { RealAnalyst } from '@/lib/services/dataService';
import Icon from '@/components/ui/AppIcon';

export type ViewMode = 'overview' | 'ranking' | 'pillars' | 'radar';

interface CycleFiltersProps {
  selectedSquad: string;
  selectedAnalyst: string;
  viewMode: ViewMode;
  onSquadChange: (squad: string) => void;
  onAnalystChange: (analystId: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onCompareClick: () => void;
  filteredAnalysts: RealAnalyst[];
}

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'overview', label: 'Visão Geral', icon: Table2 },
  { value: 'ranking', label: 'Ranking', icon: BarChart2 },
  { value: 'pillars', label: 'Pilares', icon: LayoutGrid },
  { value: 'radar', label: 'Radar', icon: Radar },
];

const selectStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  cursor: 'pointer',
};

export default function CycleFilters({
  selectedSquad,
  selectedAnalyst,
  viewMode,
  onSquadChange,
  onAnalystChange,
  onViewModeChange,
  onCompareClick,
  filteredAnalysts,
}: CycleFiltersProps) {
  // Derive unique squads from real data
  const squads = Array.from(new Set(filteredAnalysts.map((a) => a.squad))).filter(Boolean);
  const analystOptions =
    selectedSquad === 'all'
      ? filteredAnalysts
      : filteredAnalysts.filter((a) => a.squad === selectedSquad);

  return (
    <div className="flex flex-wrap items-center gap-3 max-w-screen-2xl mx-auto">
      <div
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide flex-shrink-0"
        style={{ color: '#8B949E' }}
      >
        <Filter size={13} />
        Filtros
      </div>

      {/* Squad filter */}
      <select
        value={selectedSquad}
        onChange={(e) => onSquadChange(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Todas as Squads</option>
        {squads.map((s) => (
          <option key={`squad-opt-${s}`} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Analyst filter */}
      <select
        value={selectedAnalyst}
        onChange={(e) => onAnalystChange(e.target.value)}
        style={selectStyle}
      >
        <option value="all">Todos os Analistas</option>
        {analystOptions.map((a) => (
          <option key={`analyst-opt-${a.id}`} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div
        className="h-5 w-px flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      />

      {/* View mode */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        {VIEW_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = viewMode === opt.value;
          return (
            <button
              key={`view-${opt.value}`}
              onClick={() => onViewModeChange(opt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all font-medium"
              style={{
                backgroundColor: active ? '#1E40AF' : 'transparent',
                color: active ? '#FFFFFF' : '#8B949E',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              <Icon size={12} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div
        className="h-5 w-px flex-shrink-0"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      />

      {/* Compare button */}
      <button
        onClick={onCompareClick}
        className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all font-medium"
        style={{
          border: '1px solid rgba(43,79,129,0.5)',
          color: '#60A5FA',
          backgroundColor: 'rgba(43,79,129,0.2)',
        }}
      >
        <GitCompare size={13} />
        Comparar Analistas
      </button>

      {/* Active filter chips */}
      {selectedSquad !== 'all' && (
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'rgba(43,79,129,0.2)',
            border: '1px solid rgba(43,79,129,0.4)',
            color: '#60A5FA',
          }}
        >
          <Users size={11} />
          {selectedSquad}
          <button
            onClick={() => onSquadChange('all')}
            className="ml-1"
            style={{ color: '#60A5FA' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="ml-auto text-xs" style={{ color: '#8B949E' }}>
        {filteredAnalysts.length} analista{filteredAnalysts.length !== 1 ? 's' : ''} selecionado
        {filteredAnalysts.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
