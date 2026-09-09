import React from 'react';
import { Activity, Target, AlertTriangle, Star } from 'lucide-react';
import {
  ExecutiveMetrics,
  getPerformanceClass,
  calcTrend,
  getTrendPercent,
} from '../hooks/useExecutiveData';
import { MetricCard } from '../components/MetricCard';
import { EXECUTIVE_TARGETS } from '../config/targets';

interface ExecutiveKPIsProps {
  data: ExecutiveMetrics;
}

export function ExecutiveKPIs({ data }: ExecutiveKPIsProps) {
  const qaPerformance = getPerformanceClass(data.qaAvg);
  const iepcPerformance = getPerformanceClass(data.iepcAvg);

  const qaTrend = calcTrend(data.qaAvg, data.prevPeriodQA);
  const iepcTrend = calcTrend(data.iepcAvg, data.prevPeriodIEPC);

  const qaPercent = getTrendPercent(data.qaAvg, data.prevPeriodQA);
  const iepcPercent = getTrendPercent(data.iepcAvg, data.prevPeriodIEPC);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* QA Score */}
      <MetricCard
        label="QA (Qualidade)"
        value={data.qaAvg}
        unit="pontos"
        performance={qaPerformance}
        trend={qaTrend}
        trendPercent={qaPercent}
        icon={<Activity size={16} />}
      />

      {/* IEPC Score */}
      <MetricCard
        label="IEPC (Satisfação)"
        value={data.iepcAvg}
        unit="pontos"
        performance={iepcPerformance}
        trend={iepcTrend}
        trendPercent={iepcPercent}
        icon={<Target size={16} />}
      />

      {/* NCs (Valid only) */}
      <MetricCard
        label="Não Conformidades"
        value={data.validNCs}
        unit="registros"
        performance={
          data.validNCs <= EXECUTIVE_TARGETS.NC.low
            ? {
                label: 'Baixa',
                color: '#10b981',
                bg: 'rgba(16,185,129,0.12)',
                border: 'rgba(16,185,129,0.3)',
              }
            : data.validNCs <= EXECUTIVE_TARGETS.NC.moderate
              ? {
                  label: 'Moderada',
                  color: '#f59e0b',
                  bg: 'rgba(245,158,11,0.12)',
                  border: 'rgba(245,158,11,0.3)',
                }
              : {
                  label: 'Elevada',
                  color: '#ef4444',
                  bg: 'rgba(239,68,68,0.12)',
                  border: 'rgba(239,68,68,0.3)',
                }
        }
        icon={<AlertTriangle size={16} />}
      />

      {/* Reconhecimentos */}
      <MetricCard
        label="Reconhecimentos"
        value={data.totalElogios}
        unit="elogios"
        performance={
          data.totalElogios >= EXECUTIVE_TARGETS.RECOGNITION.high
            ? {
                label: 'Elevado',
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.12)',
                border: 'rgba(139,92,246,0.3)',
              }
            : data.totalElogios >= EXECUTIVE_TARGETS.RECOGNITION.good
              ? {
                  label: 'Bom',
                  color: '#06b6d4',
                  bg: 'rgba(6,182,212,0.12)',
                  border: 'rgba(6,182,212,0.3)',
                }
              : {
                  label: 'Limitado',
                  color: '#f59e0b',
                  bg: 'rgba(245,158,11,0.12)',
                  border: 'rgba(245,158,11,0.3)',
                }
        }
        icon={<Star size={16} />}
      />
    </div>
  );
}
