'use client';
import React, { useState } from 'react';
import { X, GitCompare, ChevronDown } from 'lucide-react';
import { ANALYSTS, getScoreColor, getScoreLabel, getScoreBadgeClass } from '@/lib/mockData';
import type { Analyst } from '@/lib/mockData';

interface Props {
  onClose: () => void;
}

const PILLAR_LABELS: { key: keyof Analyst; label: string; max: number; type: 'QA' | 'IEPC' }[] = [
  { key: 'p1', label: 'P1 — Fluxo e Rastreabilidade', max: 22, type: 'QA' },
  { key: 'p2', label: 'P2 — Tratativa da Demanda', max: 34, type: 'QA' },
  { key: 'p3', label: 'P3 — Assertividade Técnica', max: 18, type: 'QA' },
  { key: 'p4', label: 'P4 — Qualidade da Comunicação', max: 14, type: 'QA' },
  { key: 'p5', label: 'P5 — Conduta Relacional', max: 12, type: 'QA' },
  { key: 'e1', label: 'E1 — Resolução Percebida', max: 30, type: 'IEPC' },
  { key: 'e2', label: 'E2 — Compreensão e Segurança', max: 20, type: 'IEPC' },
  { key: 'e3', label: 'E3 — Esforço do Cliente', max: 20, type: 'IEPC' },
  { key: 'e4', label: 'E4 — Tempo e Fluidez', max: 15, type: 'IEPC' },
  { key: 'e5', label: 'E5 — Experiência Relacional', max: 15, type: 'IEPC' },
];

export default function CompareAnalystsModal({ onClose }: Props) {
  const [analystAId, setAnalystAId] = useState<string>(ANALYSTS[0].id);
  const [analystBId, setAnalystBId] = useState<string>(ANALYSTS[1].id);

  const analystA = ANALYSTS.find((a) => a.id === analystAId) || ANALYSTS[0];
  const analystB = ANALYSTS.find((a) => a.id === analystBId) || ANALYSTS[1];

  const AnalystSelect = ({ value, onChange, exclude }: { value: string; onChange: (v: string) => void; exclude: string }) => (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full pl-3 pr-8 py-2 text-sm rounded-lg cursor-pointer focus:outline-none"
        style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}
      >
        {ANALYSTS.filter((a) => a.id !== exclude).map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B949E' }} />
    </div>
  );

  const AnalystHeader = ({ analyst }: { analyst: Analyst }) => (
    <div className="text-center p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold mx-auto mb-2"
        style={{ backgroundColor: '#1E3A5F', color: '#FFFFFF' }}>
        {analyst.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
      </div>
      <p className="font-display font-bold text-white text-sm">{analyst.name}</p>
      <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{analyst.squad}</p>
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-lg font-bold metric-value" style={{ color: getScoreColor(analyst.qaScore) }}>
          {analyst.qaScore.toFixed(1)}
        </span>
        <span className="text-xs" style={{ color: '#8B949E' }}>QA</span>
        <span className="text-lg font-bold metric-value ml-2" style={{ color: getScoreColor(analyst.iepcScore) }}>
          {analyst.iepcScore.toFixed(1)}
        </span>
        <span className="text-xs" style={{ color: '#8B949E' }}>IEPC</span>
      </div>
      <span className={`text-xs mt-1 inline-block ${getScoreBadgeClass(analyst.qaScore)}`}>{getScoreLabel(analyst.qaScore)}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(43,79,129,0.3)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ backgroundColor: '#161B22', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(43,79,129,0.2)' }}>
              <GitCompare size={16} style={{ color: '#5B8FD4' }} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Comparar Analistas</h2>
              <p className="text-xs" style={{ color: '#8B949E' }}>Análise lado a lado por pilar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#8B949E' }}>Analista A</p>
              <AnalystSelect value={analystAId} onChange={setAnalystAId} exclude={analystBId} />
            </div>
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#8B949E' }}>Analista B</p>
              <AnalystSelect value={analystBId} onChange={setAnalystBId} exclude={analystAId} />
            </div>
          </div>

          {/* Headers */}
          <div className="grid grid-cols-2 gap-4">
            <AnalystHeader analyst={analystA} />
            <AnalystHeader analyst={analystB} />
          </div>

          {/* Pillar comparison */}
          <div>
            <p className="text-sm font-semibold text-white mb-4">Comparativo por Pilar</p>
            <div className="space-y-4">
              {PILLAR_LABELS.map((p) => {
                const valA = analystA[p.key] as number;
                const valB = analystB[p.key] as number;
                const pctA = (valA / p.max) * 100;
                const pctB = (valB / p.max) * 100;
                const colorA = getScoreColor(pctA);
                const colorB = getScoreColor(pctB);
                const isIEPC = p.type === 'IEPC';
                const winner = valA > valB ? 'A' : valB > valA ? 'B' : 'tie';

                return (
                  <div key={`cmp-${p.key}`} className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: isIEPC ? 'rgba(234,179,8,0.12)' : 'rgba(43,79,129,0.15)',
                            color: isIEPC ? '#EAB308' : '#5B8FD4',
                          }}>
                          {p.key.toUpperCase()}
                        </span>
                        <span className="text-xs text-white">{p.label.split(' — ')[1]}</span>
                      </div>
                      {winner !== 'tie' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                          {winner === 'A' ? analystA.name.split(' ')[0] : analystB.name.split(' ')[0]} +{Math.abs(valA - valB)}pts
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Analista A bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#8B949E' }}>{analystA.name.split(' ')[0]}</span>
                          <span className="font-bold metric-value" style={{ color: colorA }}>{valA}/{p.max}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pctA, 100)}%`, backgroundColor: colorA }} />
                        </div>
                      </div>
                      {/* Analista B bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span style={{ color: '#8B949E' }}>{analystB.name.split(' ')[0]}</span>
                          <span className="font-bold metric-value" style={{ color: colorB }}>{valB}/{p.max}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pctB, 100)}%`, backgroundColor: colorB }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { analyst: analystA, other: analystB },
              { analyst: analystB, other: analystA },
            ].map(({ analyst, other }) => {
              const wins = PILLAR_LABELS.filter((p) => (analyst[p.key] as number) > (other[p.key] as number)).length;
              const diff = analyst.qaScore - other.qaScore;
              return (
                <div key={`summary-${analyst.id}`} className="p-4 rounded-xl text-center"
                  style={{ backgroundColor: 'rgba(43,79,129,0.08)', border: '1px solid rgba(43,79,129,0.2)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#8B949E' }}>{analyst.name.split(' ')[0]}</p>
                  <p className="text-2xl font-bold text-white metric-value">{wins}</p>
                  <p className="text-xs" style={{ color: '#8B949E' }}>pilares vencidos</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: diff >= 0 ? '#22C55E' : '#EF4444' }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)} pts QA
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
