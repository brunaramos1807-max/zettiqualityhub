'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import ImportModal from '@/components/ImportModal';
import CycleFilters from './CycleFilters';
import CycleKPICards from './CycleKPICards';
import SquadRankingChart from './SquadRankingChart';
import PillarMatrix from './PillarMatrix';
import AnalystDrilldown from './AnalystDrilldown';
import PillarDrilldownModal from './PillarDrilldownModal';
import ExecutiveInsights from './ExecutiveInsights';
import CompareAnalystsModal from './CompareAnalystsModal';
import NonConformitiesGuide from './NonConformitiesGuide';
import { PILLAR_DESCRIPTIONS } from '@/lib/mockData';
import { getActiveCycle } from '@/lib/services/supabaseDataService';
import {
  fetchCycleScores,
  fetchAllPeriodos,
  buildAnalystsFromScores,
  exportCycleToCSV,
  fetchNCRecords,
  fetchElogios,
  type RealAnalyst,
} from '@/lib/services/dataService';
import { exportCyclePDF } from '@/lib/utils/pdfExport';
import { Download, FileText } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import type { ViewMode } from './CycleFilters';

export default function CycleDashboard() {
  const searchParams = useSearchParams();
  const { session, userRole, userSquad, userSquads } = useSystemAuth();
  const [importOpen, setImportOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<string>('all');
  const [selectedAnalyst, setSelectedAnalyst] = useState<string>('all');
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [drilldownAnalyst, setDrilldownAnalyst] = useState<RealAnalyst | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [compareOpen, setCompareOpen] = useState(false);
  const [allAnalysts, setAllAnalysts] = useState<RealAnalyst[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [activePeriodo, setActivePeriodo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Role-based permissions
  const canImport =
    session?.permissoes?.permissao_editar ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador' ||
    session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral';
  const canExport =
    session?.permissoes?.permissao_acessar_relatorios ||
    session?.permissoes?.acesso_total ||
    session?.cargo === 'Administrador';

  // Coordinators can see all squads general data but cannot drill into analysts from other squads
  const isCoordinator = userRole === 'Coordenador';
  const coordinatorSquads = isCoordinator
    ? userSquads.length > 0
      ? userSquads
      : userSquad
        ? [userSquad]
        : []
    : [];

  // allowedSquads: null = all squads visible; array = restricted to those squads
  const allowedSquads =
    session?.permissoes?.visualizar_todas_equipes || session?.permissoes?.acesso_total
      ? null // null = all squads
      : session?.permissoes?.visualizar_equipes_especificas?.length
        ? session.permissoes.visualizar_equipes_especificas
        : null; // coordinators see all squads (general data), restriction is only on analyst drilldown

  // Can a coordinator drill into a specific analyst's details?
  const canViewAnalystDetail = (analystSquad: string) => {
    if (!isCoordinator) return true; // non-coordinators: always allowed
    if (coordinatorSquads.length === 0) return true; // no squad restriction
    return coordinatorSquads.includes(analystSquad);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [scores, allPeriodos, activeCycle] = await Promise.all([
      fetchCycleScores(),
      fetchAllPeriodos(),
      getActiveCycle(),
    ]);

    const orderedPeriodos =
      activeCycle && !allPeriodos.includes(activeCycle)
        ? [activeCycle, ...allPeriodos]
        : allPeriodos;
    setPeriodos(orderedPeriodos);

    const paramPeriodo = searchParams?.get('periodo');
    const defaultPeriodo =
      (activeCycle && orderedPeriodos.includes(activeCycle) ? activeCycle : null) ||
      (orderedPeriodos.length > 0 ? orderedPeriodos[0] : '');
    const targetPeriodo = paramPeriodo || defaultPeriodo;
    setActivePeriodo(targetPeriodo);

    let periodScores = targetPeriodo
      ? scores.filter((s: any) => s.periodo === targetPeriodo)
      : scores;

    // Filter by allowed squads for non-admin roles
    if (allowedSquads && allowedSquads.length > 0) {
      periodScores = periodScores.filter((s: any) => allowedSquads.includes(s.squad));
    }

    setAllAnalysts(buildAnalystsFromScores(periodScores));
    setLoading(false);
  }, [searchParams, allowedSquads]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, [loadData]);

  const filteredAnalysts = allAnalysts.filter((a) => {
    // When 'all' is selected for squad, show ALL analysts regardless
    if (selectedSquad !== 'all' && a.squad !== selectedSquad) return false;
    // Only filter by specific analyst if one is explicitly selected
    if (selectedAnalyst !== 'all' && a.id !== selectedAnalyst) return false;
    return true;
  });

  const handleAnalystSelect = (analystId: string) => {
    const found = allAnalysts.find((a) => a.id === analystId) || null;
    // Coordinators can only drill into analysts from their own squads
    if (found && !canViewAnalystDetail(found.squad)) return;
    setDrilldownAnalyst(found);
    setSelectedAnalyst(analystId);
  };

  const handleSquadChange = (v: string) => {
    setSelectedSquad(v);
    setSelectedAnalyst('all');
    setDrilldownAnalyst(null);
  };

  const handlePeriodoChange = async (p: string) => {
    setActivePeriodo(p);
    setSelectedSquad('all');
    setSelectedAnalyst('all');
    setDrilldownAnalyst(null);
    let scores = await fetchCycleScores(p);
    if (allowedSquads && allowedSquads.length > 0) {
      scores = scores.filter((s: any) => allowedSquads.includes(s.squad));
    }
    setAllAnalysts(buildAnalystsFromScores(scores));
  };

  const handleExport = () => {
    if (!activePeriodo) return;
    setExporting(true);
    try {
      exportCycleToCSV(activePeriodo);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!activePeriodo) return;
    setExportingPDF(true);
    try {
      const [scores, ncs, elogios] = await Promise.all([
        fetchCycleScores(activePeriodo),
        fetchNCRecords(activePeriodo),
        fetchElogios(activePeriodo),
      ]);
      exportCyclePDF({ periodo: activePeriodo, scores, ncs, elogios });
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0F1E' }}>
        <AppHeader
          activeTab="dashboard"
          onImportClick={canImport ? () => setImportOpen(true) : undefined}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Carregando dados do ciclo...
            </p>
          </div>
        </main>
        <AppFooter />
        <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0A0F1E' }}>
      <AppHeader
        activeTab="dashboard"
        onImportClick={canImport ? () => setImportOpen(true) : undefined}
      />

      {/* Sticky filters */}
      <div
        className="sticky z-40 px-6 py-3"
        style={{
          top: '105px',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <CycleFilters
          selectedSquad={selectedSquad}
          selectedAnalyst={selectedAnalyst}
          viewMode={viewMode}
          onSquadChange={handleSquadChange}
          onAnalystChange={handleAnalystSelect}
          onViewModeChange={setViewMode}
          onCompareClick={() => setCompareOpen(true)}
          filteredAnalysts={filteredAnalysts as any}
        />
      </div>

      <main className="flex-1 px-6 py-8 max-w-screen-2xl mx-auto w-full xl:px-10 2xl:px-16">
        <div className="space-y-8">
          {/* Section title */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1
                className="font-display text-2xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Dashboard do Ciclo
              </h1>
              <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
                BI Operacional — {activePeriodo || 'Sem dados'} ·{' '}
                {selectedSquad !== 'all' ? selectedSquad : 'Todas as Squads'} ·{' '}
                {filteredAnalysts.length} analista{filteredAnalysts.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Period selector */}
              {periodos.length > 1 && (
                <select
                  value={activePeriodo}
                  onChange={(e) => handlePeriodoChange(e.target.value)}
                  className="text-xs rounded-lg px-3 py-2 font-medium"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                  }}
                >
                  {periodos.map((p) => (
                    <option key={p} value={p} style={{ backgroundColor: '#161B22' }}>
                      {p}
                    </option>
                  ))}
                </select>
              )}

              {/* CSV Export button */}
              {canExport && activePeriodo && allAnalysts.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    color: '#60A5FA',
                  }}
                >
                  <Download size={13} />
                  {exporting ? 'Exportando...' : 'CSV'}
                </button>
              )}

              {/* PDF Export button */}
              {canExport && activePeriodo && allAnalysts.length > 0 && (
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.35)',
                    color: '#F87171',
                  }}
                >
                  <FileText size={13} />
                  {exportingPDF ? 'Gerando PDF...' : 'PDF'}
                </button>
              )}
            </div>
          </div>

          {/* No data state */}
          {allAnalysts.length === 0 && (
            <div
              className="rounded-xl p-12 text-center"
              style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-base font-semibold text-white mb-2">Nenhum dado encontrado</p>
              <p className="text-sm" style={{ color: '#8B949E' }}>
                {canImport
                  ? 'Importe uma planilha de QA/IEPC para visualizar o dashboard do ciclo.'
                  : 'Nenhum dado disponível para sua equipe neste período.'}
              </p>
              {canImport && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: '#1E40AF', color: '#FFFFFF' }}
                >
                  Importar Dados
                </button>
              )}
            </div>
          )}

          {allAnalysts.length > 0 && (
            <>
              {/* KPI Cards — always visible */}
              <CycleKPICards analysts={filteredAnalysts as any} />

              {/* View mode: overview (default) */}
              {viewMode === 'overview' && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3">
                      <SquadRankingChart
                        selectedSquad={selectedSquad}
                        analysts={filteredAnalysts as any}
                      />
                    </div>
                    <div className="xl:col-span-2">
                      <PillarMatrix
                        onPillarClick={(pillar) => setSelectedPillar(pillar)}
                        analysts={filteredAnalysts as any}
                      />
                    </div>
                  </div>
                  {drilldownAnalyst ? (
                    <AnalystDrilldown
                      analyst={drilldownAnalyst as any}
                      onClose={() => {
                        setDrilldownAnalyst(null);
                        setSelectedAnalyst('all');
                      }}
                    />
                  ) : (
                    <AnalystsOverviewTable
                      analysts={filteredAnalysts}
                      onSelectAnalyst={handleAnalystSelect}
                      canViewDetail={canViewAnalystDetail}
                    />
                  )}
                </>
              )}

              {viewMode === 'ranking' && (
                <SquadRankingChart
                  selectedSquad={selectedSquad}
                  analysts={filteredAnalysts as any}
                />
              )}

              {viewMode === 'pillars' && (
                <PillarMatrix
                  onPillarClick={(pillar) => setSelectedPillar(pillar)}
                  analysts={filteredAnalysts as any}
                />
              )}

              {viewMode === 'radar' &&
                (drilldownAnalyst ? (
                  <AnalystDrilldown
                    analyst={drilldownAnalyst as any}
                    onClose={() => {
                      setDrilldownAnalyst(null);
                      setSelectedAnalyst('all');
                    }}
                  />
                ) : (
                  <div
                    className="rounded-xl p-10 text-center"
                    style={{
                      backgroundColor: '#161B22',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-sm mb-2 text-white/70">
                      Selecione um analista para ver o Radar individual
                    </p>
                    <p className="text-xs" style={{ color: '#8B949E' }}>
                      Use o filtro "Analista" acima ou clique em um analista na tabela
                    </p>
                    <div className="mt-4">
                      <AnalystsOverviewTable
                        analysts={filteredAnalysts}
                        onSelectAnalyst={handleAnalystSelect}
                        canViewDetail={canViewAnalystDetail}
                      />
                    </div>
                  </div>
                ))}

              <NonConformitiesGuide />
              <ExecutiveInsights analysts={filteredAnalysts as any} />
            </>
          )}
        </div>
      </main>

      <AppFooter />

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

      {selectedPillar && PILLAR_DESCRIPTIONS[selectedPillar] && (
        <PillarDrilldownModal
          pillar={selectedPillar}
          pillarInfo={PILLAR_DESCRIPTIONS[selectedPillar]}
          analysts={filteredAnalysts as any}
          onClose={() => setSelectedPillar(null)}
        />
      )}

      {compareOpen && <CompareAnalystsModal onClose={() => setCompareOpen(false)} />}
    </div>
  );
}

function AnalystsOverviewTable({
  analysts,
  onSelectAnalyst,
  canViewDetail,
}: {
  analysts: RealAnalyst[];
  onSelectAnalyst: (id: string) => void;
  canViewDetail?: (squad: string) => boolean;
}) {
  const getScoreColor = (score: number) =>
    score >= 85 ? '#22C55E' : score >= 70 ? '#EAB308' : '#EF4444';
  const getScoreLabel = (score: number) =>
    score >= 85 ? 'Excelente' : score >= 70 ? 'Regular' : 'Crítico';

  if (analysts.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm" style={{ color: '#8B949E' }}>
          Nenhum analista encontrado com os filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3
          className="font-display text-base font-semibold text-white"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Visão Geral — Analistas do Ciclo
        </h3>
        <span className="text-xs" style={{ color: '#8B949E' }}>
          {analysts.length} analistas exibidos
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {['Analista', 'Squad', 'Coordenador', 'Nota QA', 'IEPC', 'NCs', 'Status', 'Ação'].map(
                (h) => (
                  <th
                    key={`th-${h}`}
                    className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#8B949E' }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {analysts.map((analyst) => {
              const canDetail = !canViewDetail || canViewDetail(analyst.squad);
              return (
                <tr
                  key={`row-${analyst.id}`}
                  className={canDetail ? 'cursor-pointer transition-colors' : 'transition-colors'}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => canDetail && onSelectAnalyst(analyst.id)}
                >
                  <td className="py-3 px-3 font-medium text-white">{analyst.name}</td>
                  <td className="py-3 px-3" style={{ color: '#8B949E' }}>
                    {analyst.squad}
                  </td>
                  <td className="py-3 px-3" style={{ color: '#8B949E' }}>
                    {analyst.coordenador}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="font-bold metric-value"
                      style={{ color: getScoreColor(analyst.qaScore) }}
                    >
                      {analyst.qaScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="font-bold metric-value"
                      style={{ color: getScoreColor(analyst.iepcScore) }}
                    >
                      {analyst.iepcScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {analyst.ncs > 0 ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          color: '#EF4444',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}
                      >
                        {analyst.ncs} NC{analyst.ncs > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          color: '#22C55E',
                          border: '1px solid rgba(34,197,94,0.2)',
                        }}
                      >
                        0 NCs
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          analyst.qaScore >= 85
                            ? 'rgba(34,197,94,0.15)'
                            : analyst.qaScore >= 70
                              ? 'rgba(234,179,8,0.15)'
                              : 'rgba(239,68,68,0.15)',
                        color:
                          analyst.qaScore >= 85
                            ? '#22C55E'
                            : analyst.qaScore >= 70
                              ? '#EAB308'
                              : '#EF4444',
                        border: `1px solid ${analyst.qaScore >= 85 ? 'rgba(34,197,94,0.2)' : analyst.qaScore >= 70 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      }}
                    >
                      {getScoreLabel(analyst.qaScore)}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {canDetail ? (
                      <button className="text-xs font-medium" style={{ color: '#3B82F6' }}>
                        Ver detalhes →
                      </button>
                    ) : (
                      <span
                        className="text-xs font-medium"
                        style={{ color: '#64748B' }}
                        title="Acesso restrito — outra equipe"
                      >
                        🔒 Restrito
                      </span>
                    )}
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
