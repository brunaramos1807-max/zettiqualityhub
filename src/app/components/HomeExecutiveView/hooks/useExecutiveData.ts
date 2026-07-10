'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCycleScores,
  fetchNCRecords,
  fetchElogios,
  fetchAllPeriodos,
  buildAnalystsFromScores,
} from '@/lib/services/dataService';
import { getActiveCycle } from '@/lib/services/supabaseDataService';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ExecutiveMetrics {
  periodo: string;
  qaAvg: number;
  iepcAvg: number;
  totalNCs: number;
  validNCs: number; // NC-1~5 only
  divergentNCs: number; // -1 records excluded from aggregation
  totalElogios: number;
  teamsCount: number;
  analystCount: number;
  ncByType: { type: string; count: number; pct: number }[];
  equipes: EquipeMetrics[];
  prevPeriodQA?: number;
  prevPeriodIEPC?: number;
}

export interface EquipeMetrics {
  name: string;
  qaAvg: number;
  iepcAvg: number;
  analystCount: number;
  ncCount: number;
  elogioCount: number;
}

export interface ExecutiveDataState {
  data: ExecutiveMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const QA_PILLAR_WEIGHTS = { p1: 22, p2: 34, p3: 18, p4: 14, p5: 12 };
const IEPC_PILLAR_WEIGHTS = { e1: 30, e2: 20, e3: 20, e4: 15, e5: 15 };

// ─── Normalization ──────────────────────────────────────────────────────────

function normalizeNCType(raw: string): string {
  if (!raw) return 'Outros';
  const upper = raw.toUpperCase().trim();
  if (upper.includes('NC-1') || upper.includes('POSTURA') || upper.includes('ÉTICA') || upper.includes('ETICA')) return 'NC-1';
  if (upper.includes('NC-2') || upper.includes('ACURAC') || upper.includes('TÉCNIC') || upper.includes('TECNIC')) return 'NC-2';
  if (upper.includes('NC-3') || upper.includes('REGISTRO') || upper.includes('RASTREAB')) return 'NC-3';
  if (upper.includes('NC-4') || upper.includes('FLUXO') || upper.includes('OPERAC')) return 'NC-4';
  if (upper.includes('NC-5') || upper.includes('SEGURANÇA') || upper.includes('SEGURANCA') || upper.includes('INFORMA')) return 'NC-5';
  return 'Outros';
}

function isValidNCType(type: string): boolean {
  return ['NC-1', 'NC-2', 'NC-3', 'NC-4', 'NC-5'].includes(type);
}

// ─── Classification ────────────────────────────────────────────────────────

export function getPerformanceClass(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score >= 90) return { label: 'Excelência', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
  if (score >= 80) return { label: 'Performance Esperada', color: '#facc15', bg: 'rgba(250,204,21,0.12)', border: 'rgba(250,204,21,0.3)' };
  if (score >= 70) return { label: 'Operacional', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  return { label: 'Crítico', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useExecutiveData(periodo: string): ExecutiveDataState {
  const [data, setData] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scores, ncs, elogios, prevScores] = await Promise.all([
        fetchCycleScores(periodo),
        fetchNCRecords(periodo),
        fetchElogios(periodo),
        fetchCycleScores(getPreviousPeriodo(periodo)),
      ]);

      // Aggregate scores by equipe
      const equipeMap = new Map<string, EquipeMetrics>();

      scores.forEach((score) => {
        const squad = score.squad || 'Sem Equipe';
        if (!equipeMap.has(squad)) {
          equipeMap.set(squad, {
            name: squad,
            qaAvg: 0,
            iepcAvg: 0,
            analystCount: 0,
            ncCount: 0,
            elogioCount: 0,
          });
        }
        const eq = equipeMap.get(squad)!;
        eq.qaAvg += score.nota_final_qa || 0;
        eq.iepcAvg += score.iepc_total || 0;
        eq.analystCount += 1;
      });

      // Finalize equipe averages
      equipeMap.forEach((eq) => {
        if (eq.analystCount > 0) {
          eq.qaAvg = Math.round((eq.qaAvg / eq.analystCount) * 100) / 100;
          eq.iepcAvg = Math.round((eq.iepcAvg / eq.analystCount) * 100) / 100;
        }
      });

      // Count NCs by equipe
      ncs.forEach((nc) => {
        const squad = nc.squad || 'Sem Equipe';
        const eq = equipeMap.get(squad);
        if (eq) eq.ncCount += 1;
      });

      // Count Elogios by equipe
      elogios.forEach((elogio) => {
        const squad = elogio.squad || 'Sem Equipe';
        const eq = equipeMap.get(squad);
        if (eq) eq.elogioCount += 1;
      });

      // Separate valid NCs (NC-1~5) from divergent (-1 records)
      const validNCs = ncs.filter(
        (nc) => isValidNCType(normalizeNCType(nc.tipo_nc))
      );
      const divergentNCs = ncs.filter(
        (nc) => !isValidNCType(normalizeNCType(nc.tipo_nc))
      );

      // NC distribution (valid only)
      const ncByTypeMap = new Map<string, number>();
      validNCs.forEach((nc) => {
        const type = normalizeNCType(nc.tipo_nc);
        ncByTypeMap.set(type, (ncByTypeMap.get(type) || 0) + 1);
      });

      const ncByType = Array.from(ncByTypeMap.entries())
        .map(([type, count]) => ({
          type,
          count,
          pct: Math.round((count / Math.max(validNCs.length, 1)) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate averages
      const qaAvg =
        scores.length > 0
          ? Math.round(
              (scores.reduce((sum, s) => sum + (s.nota_final_qa || 0), 0) /
                scores.length) *
                100
            ) / 100
          : 0;

      const iepcAvg =
        scores.length > 0
          ? Math.round(
              (scores.reduce((sum, s) => sum + (s.iepc_total || 0), 0) /
                scores.length) *
                100
            ) / 100
          : 0;

      // Previous period averages for trend
      const prevPeriodQA =
        prevScores.length > 0
          ? Math.round(
              (prevScores.reduce((sum, s) => sum + (s.nota_final_qa || 0), 0) /
                prevScores.length) *
                100
            ) / 100
          : undefined;

      const prevPeriodIEPC =
        prevScores.length > 0
          ? Math.round(
              (prevScores.reduce((sum, s) => sum + (s.iepc_total || 0), 0) /
                prevScores.length) *
                100
            ) / 100
          : undefined;

      setData({
        periodo,
        qaAvg,
        iepcAvg,
        totalNCs: ncs.length,
        validNCs: validNCs.length,
        divergentNCs: divergentNCs.length,
        totalElogios: elogios.length,
        teamsCount: equipeMap.size,
        analystCount: scores.length,
        ncByType,
        equipes: Array.from(equipeMap.values()).sort(
          (a, b) => b.qaAvg - a.qaAvg
        ),
        prevPeriodQA,
        prevPeriodIEPC,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
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

export function calcTrend(
  current: number,
  previous?: number
): 'up' | 'down' | 'stable' {
  if (!previous) return 'stable';
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export function getTrendPercent(
  current: number,
  previous?: number
): number {
  if (!previous) return 0;
  return Math.round(((current - previous) / Math.max(Math.abs(previous), 1)) * 100);
}
