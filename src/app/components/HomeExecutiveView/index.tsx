// Main component
export { HomeExecutiveView } from './HomeExecutiveView';
export { default } from './HomeExecutiveView';

// Hooks
export { useExecutiveData } from './hooks/useExecutiveData';
export { useExecutiveFilters } from './hooks/useExecutiveFilters';
export { useExecutiveInsights } from './hooks/useExecutiveInsights';

// Types
export type { ExecutiveMetrics, EquipeMetrics, ExecutiveDataState } from './hooks/useExecutiveData';
export type { ExecutiveFilters } from './hooks/useExecutiveFilters';
export type { Insight, ExecutiveInsights } from './hooks/useExecutiveInsights';

// Components
export { MetricCard } from './components/MetricCard';
export { InsightItem } from './components/InsightItem';
export { EmptyState } from './components/EmptyState';
export { LoadingState } from './components/LoadingState';

// Sections
export { ExecutiveSummary } from './sections/ExecutiveSummary';
export { ExecutiveKPIs } from './sections/ExecutiveKPIs';
export { PositiveHighlights } from './sections/PositiveHighlights';
export { EvolutionOpportunities } from './sections/EvolutionOpportunities';
export { TeamsPerformanceTable } from './sections/TeamsPerformanceTable';
