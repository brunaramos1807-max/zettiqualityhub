'use client';
import React from 'react';
import { PILLAR_DESCRIPTIONS } from '@/lib/mockData';
import { Info } from 'lucide-react';
import type { RealAnalyst } from '@/lib/services/dataService';

interface Props {
  onPillarClick: (pillar: string) => void;
  analysts?: RealAnalyst[];
}

function getPillarAverage(pillar: string, analysts: RealAnalyst[]): number {
  if (analysts.length === 0) return 0;
  const key = pillar.toLowerCase() as keyof RealAnalyst;
  const values = analysts.map((a) => Number(a[key]) || 0);
  const max = PILLAR_DESCRIPTIONS[pillar]?.maxPoints || 1;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return (avg / max) * 100;
}

function getPillarColor(pct: number): string {
  if (pct >= 85) return '#22C55E';
  if (pct >= 70) return '#EAB308';
  return '#EF4444';
}

const QA_PILLARS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const IEPC_PILLARS = ['E1', 'E2', 'E3', 'E4', 'E5'];

export default function PillarMatrix({ onPillarClick, analysts = [] }: Props) {
  return (
    <div
      className="rounded-xl p-6 h-full"
      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3
            className="font-display text-base font-semibold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Matriz de Pilares
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
            Clique em um pilar para ver o drill-down
          </p>
        </div>
        <Info size={15} style={{ color: '#8B949E' }} />
      </div>

      {/* QA Pillars */}
      <div className="mb-4">
        <p
          className="text-xs font-medium uppercase tracking-wide mb-3"
          style={{ color: '#8B949E' }}
        >
          Pilares QA
        </p>
        <div className="grid grid-cols-5 gap-2">
          {QA_PILLARS.map((pillar) => {
            const pct = getPillarAverage(pillar, analysts);
            const color = getPillarColor(pct);
            const info = PILLAR_DESCRIPTIONS[pillar];
            return (
              <button
                key={`pillar-qa-${pillar}`}
                onClick={() => onPillarClick(pillar)}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  aspectRatio: '1',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${color}15`;
                  e.currentTarget.style.borderColor = `${color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                title={info?.title}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {pillar}
                </div>
                <span className="text-xs font-bold metric-value" style={{ color }}>
                  {pct.toFixed(0)}%
                </span>
                <span
                  className="text-center leading-tight"
                  style={{ color: '#8B949E', fontSize: 10 }}
                >
                  {info?.maxPoints}pts
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* IEPC Pillars */}
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wide mb-3"
          style={{ color: '#8B949E' }}
        >
          Pilares IEPC
        </p>
        <div className="grid grid-cols-5 gap-2">
          {IEPC_PILLARS.map((pillar) => {
            const pct = getPillarAverage(pillar, analysts);
            const color = getPillarColor(pct);
            const info = PILLAR_DESCRIPTIONS[pillar];
            return (
              <button
                key={`pillar-iepc-${pillar}`}
                onClick={() => onPillarClick(pillar)}
                className="group flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  aspectRatio: '1',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${color}15`;
                  e.currentTarget.style.borderColor = `${color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                title={info?.title}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {pillar}
                </div>
                <span className="text-xs font-bold metric-value" style={{ color }}>
                  {pct.toFixed(0)}%
                </span>
                <span
                  className="text-center leading-tight"
                  style={{ color: '#8B949E', fontSize: 10 }}
                >
                  {info?.maxPoints}pts
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
