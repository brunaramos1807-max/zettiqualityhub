'use client';
import React, { useEffect, useState } from 'react';
import { Award, Medal, Trophy } from 'lucide-react';
import { fetchCycleScores } from '@/lib/services/dataService';
import { getScoreBadgeClass } from '@/lib/mockData';

interface AnalystRow {
  analista: string;
  squad: string;
  nota_final_qa: number;
  iepc_total: number;
}

interface SquadAvg {
  squad: string;
  avgQA: number;
  avgIEPC: number;
}

export default function TopAnalysts() {
  const [top3, setTop3] = useState<AnalystRow[]>([]);
  const [squadOuroQA, setSquadOuroQA] = useState<SquadAvg | null>(null);
  const [squadOuroIEPC, setSquadOuroIEPC] = useState<SquadAvg | null>(null);
  const [hasData, setHasData] = useState(false);

  const loadData = async () => {
    const scores: AnalystRow[] = await fetchCycleScores();
    if (scores.length === 0) {
      setHasData(false);
      return;
    }

    setHasData(true);
    const sorted = [...scores].sort((a, b) => b.nota_final_qa - a.nota_final_qa);
    setTop3(sorted.slice(0, 3));

    // Compute squad averages
    const squadMap: Record<string, { qa: number[]; iepc: number[] }> = {};
    scores.forEach((s) => {
      if (!squadMap[s.squad]) squadMap[s.squad] = { qa: [], iepc: [] };
      squadMap[s.squad].qa.push(s.nota_final_qa);
      squadMap[s.squad].iepc.push(s.iepc_total);
    });

    const avgs: SquadAvg[] = Object.entries(squadMap).map(([squad, vals]) => ({
      squad,
      avgQA: vals.qa.reduce((a, b) => a + b, 0) / vals.qa.length,
      avgIEPC: vals.iepc.reduce((a, b) => a + b, 0) / vals.iepc.length,
    }));

    if (avgs.length > 0) {
      setSquadOuroQA(avgs.reduce((best, s) => (s.avgQA > best.avgQA ? s : best)));
      setSquadOuroIEPC(avgs.reduce((best, s) => (s.avgIEPC > best.avgIEPC ? s : best)));
    }
  };

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, []);

  const rankIcons = [Trophy, Medal, Award];
  const rankColors = ['#EAB308', '#8B949E', '#CD7F32'];

  if (!hasData) {
    return (
      <div
        className="rounded-xl p-6 h-full flex flex-col items-center justify-center text-center"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Trophy size={28} style={{ color: '#8B949E' }} className="mb-3" />
        <p className="text-sm font-medium text-white mb-1">Destaques do Ciclo</p>
        <p className="text-xs" style={{ color: '#8B949E' }}>
          Importe dados para ver os analistas em destaque
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 h-full flex flex-col"
      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mb-4">
        <h3
          className="font-display text-base font-semibold text-white"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Destaques do Ciclo
        </h3>
        <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
          Top 3 analistas e Squad Ouro
        </p>
      </div>
      {/* Top 3 analysts */}
      <div className="space-y-2 mb-4 flex-1">
        {top3.map((analyst, idx) => {
          const RankIcon = rankIcons[idx];
          return (
            <div
              key={`top-${analyst.analista}-${idx}`}
              className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/5"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <RankIcon size={18} style={{ color: rankColors[idx], flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{analyst.analista}</p>
                <p className="text-xs truncate" style={{ color: '#8B949E' }}>
                  {analyst.squad}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-white metric-value">
                  {analyst.nota_final_qa.toFixed(1)}
                </p>
                <span className={getScoreBadgeClass(analyst.nota_final_qa)}>QA</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Divider */}
      {(squadOuroQA || squadOuroIEPC) && (
        <>
          <div className="border-t mb-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide mb-3"
              style={{ color: '#8B949E' }}
            >
              Squad Ouro
            </p>
            <div className="grid grid-cols-2 gap-2">
              {squadOuroQA && (
                <div
                  className="p-3 rounded-xl text-center"
                  style={{
                    backgroundColor: 'rgba(234,179,8,0.08)',
                    border: '1px solid rgba(234,179,8,0.2)',
                  }}
                >
                  <Trophy size={16} className="mx-auto mb-1.5" style={{ color: '#EAB308' }} />
                  <p className="text-xs font-semibold text-white leading-tight">
                    {squadOuroQA.squad}
                  </p>
                  <p className="text-lg font-bold metric-value" style={{ color: '#EAB308' }}>
                    {squadOuroQA.avgQA.toFixed(1)}
                  </p>
                  <p className="text-xs" style={{ color: '#8B949E' }}>
                    QA Média
                  </p>
                </div>
              )}
              {squadOuroIEPC && (
                <div
                  className="p-3 rounded-xl text-center"
                  style={{
                    backgroundColor: 'rgba(43,79,129,0.12)',
                    border: '1px solid rgba(43,79,129,0.3)',
                  }}
                >
                  <Award size={16} className="mx-auto mb-1.5" style={{ color: '#60A5FA' }} />
                  <p className="text-xs font-semibold text-white leading-tight">
                    {squadOuroIEPC.squad}
                  </p>
                  <p className="text-lg font-bold metric-value" style={{ color: '#60A5FA' }}>
                    {squadOuroIEPC.avgIEPC.toFixed(1)}
                  </p>
                  <p className="text-xs" style={{ color: '#8B949E' }}>
                    IEPC Médio
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
