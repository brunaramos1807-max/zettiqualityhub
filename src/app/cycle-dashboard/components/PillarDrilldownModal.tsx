'use client';
import React from 'react';
import { X, BookOpen, TrendingUp } from 'lucide-react';
import type { Analyst } from '@/lib/mockData';
import { getScoreColor } from '@/lib/mockData';

interface PillarInfo {
  title: string;
  description: string;
  maxPoints: number;
  type: 'QA' | 'IEPC';
}

interface Props {
  pillar: string;
  pillarInfo: PillarInfo;
  analysts: Analyst[];
  onClose: () => void;
}

export default function PillarDrilldownModal({ pillar, pillarInfo, analysts, onClose }: Props) {
  const pillarKey = pillar.toLowerCase() as keyof Analyst;

  const analystScores = analysts
    .map((a) => ({
      id: a.id,
      name: a.name,
      squad: a.squad,
      raw: Number(a[pillarKey]) || 0,
      pct: (Number(a[pillarKey]) / pillarInfo.maxPoints) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl animate-slide-up"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{
                backgroundColor: pillarInfo.type === 'QA' ? 'rgba(43,79,129,0.2)' : 'rgba(234,179,8,0.15)',
                color: pillarInfo.type === 'QA' ? '#2B4F81' : '#EAB308',
                border: `1px solid ${pillarInfo.type === 'QA' ? 'rgba(43,79,129,0.4)' : 'rgba(234,179,8,0.3)'}`,
              }}
            >
              {pillar}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pillarInfo.type === 'QA' ? 'badge-warning' : 'badge-success'}`}>
                  {pillarInfo.type}
                </span>
                <span className="text-xs" style={{ color: '#8B949E' }}>Máx. {pillarInfo.maxPoints} pts</span>
              </div>
              <h2 className="font-display text-lg font-semibold text-white leading-tight">{pillarInfo.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5 flex-shrink-0" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#8B949E' }} />
            <p className="text-sm leading-relaxed" style={{ color: '#8B949E' }}>{pillarInfo.description}</p>
          </div>
        </div>

        {/* Analyst scores */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: '#8B949E' }} />
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#8B949E' }}>
              Performance por Analista — {analysts.length} analistas
            </p>
          </div>
          <div className="space-y-2">
            {analystScores.map((item, idx) => {
              const color = getScoreColor(item.pct);
              return (
                <div
                  key={`drill-${item.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                >
                  <span className="text-xs font-bold w-5 text-center" style={{ color: '#8B949E' }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-medium text-white">{item.name}</span>
                        <span className="text-xs ml-2" style={{ color: '#8B949E' }}>{item.squad}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold metric-value" style={{ color }}>
                          {item.raw}/{pillarInfo.maxPoints}
                        </span>
                        <span className="text-xs font-semibold metric-value" style={{ color }}>
                          ({item.pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}