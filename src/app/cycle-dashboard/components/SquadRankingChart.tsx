'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { Target } from 'lucide-react';
import type { RealAnalyst } from '@/lib/services/dataService';

const SquadRankingChartInner = dynamic(() => import('./SquadRankingChartInner'), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-lg" style={{ backgroundColor: '#1C2333' }} />
  ),
});

interface Props {
  selectedSquad: string;
  analysts?: RealAnalyst[];
}

export default function SquadRankingChart({ selectedSquad, analysts = [] }: Props) {
  // Build squad averages from real analyst data
  const squadMap: Record<string, { qa: number[]; iepc: number[] }> = {};
  analysts.forEach((a) => {
    if (!squadMap[a.squad]) squadMap[a.squad] = { qa: [], iepc: [] };
    squadMap[a.squad].qa.push(a.qaScore);
    squadMap[a.squad].iepc.push(a.iepcScore);
  });

  const data = Object.entries(squadMap).map(([squad, vals]) => ({
    squad,
    qa: vals.qa.reduce((s, v) => s + v, 0) / vals.qa.length,
    iepc: vals.iepc.reduce((s, v) => s + v, 0) / vals.iepc.length,
    analysts: vals.qa.length,
    highlighted: selectedSquad !== 'all' && squad === selectedSquad,
  }));

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
            Ranking por Squad
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
            QA Média e IEPC por squad — meta fixada em 85
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            backgroundColor: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            color: '#22C55E',
          }}
        >
          <Target size={13} />
          Meta: 85
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm" style={{ color: '#8B949E' }}>
            Nenhum dado disponível
          </p>
        </div>
      ) : (
        <SquadRankingChartInner data={data} />
      )}
    </div>
  );
}
