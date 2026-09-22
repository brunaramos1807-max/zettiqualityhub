'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { MONTHLY_TREND } from '@/lib/mockData';

const MonthlyTrendChartInner = dynamic(() => import('./MonthlyTrendChartInner'), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-lg" style={{ backgroundColor: '#161B22' }} />
  ),
});

export default function MonthlyTrendChart() {
  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className="font-display text-base font-semibold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Evolução Mensal
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
            QA Média vs IEPC Médio — últimos 3 meses
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#22C55E' }} />
            <span style={{ color: '#8B949E' }}>Nota QA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#2B4F81' }} />
            <span style={{ color: '#8B949E' }}>IEPC</span>
          </div>
        </div>
      </div>
      <MonthlyTrendChartInner data={MONTHLY_TREND} />
    </div>
  );
}
