'use client';
import React, { useEffect, useState } from 'react';
import { BarChart2, Star, AlertTriangle, ThumbsUp } from 'lucide-react';
import { fetchNCRecords, fetchElogios } from '@/lib/services/dataService';
import type { RealAnalyst } from '@/lib/services/dataService';

interface Props {
  analysts: RealAnalyst[];
}

function getScoreColor(score: number): string {
  return score >= 85 ? '#22C55E' : score >= 70 ? '#EAB308' : '#EF4444';
}

export default function CycleKPICards({ analysts }: Props) {
  const [totalNCs, setTotalNCs] = useState(0);
  const [totalElogios, setTotalElogios] = useState(0);

  useEffect(() => {
    if (analysts.length === 0) return;
    const periodo = analysts[0]?.periodo;
    Promise.all([
      fetchNCRecords(periodo),
      fetchElogios(periodo),
    ]).then(([ncs, elogios]) => {
      setTotalNCs(ncs.length);
      setTotalElogios(elogios.length);
    });
  }, [analysts]);

  if (analysts.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-sm" style={{ color: '#8B949E' }}>Nenhum analista encontrado com os filtros aplicados.</p>
      </div>
    );
  }

  const qaAvg = analysts.reduce((s, a) => s + a.qaScore, 0) / analysts.length;
  const iepcAvg = analysts.reduce((s, a) => s + a.iepcScore, 0) / analysts.length;
  const ncFromAnalysts = analysts.reduce((s, a) => s + a.ncs, 0);
  const displayNCs = totalNCs || ncFromAnalysts;

  const qaColor = getScoreColor(qaAvg);
  const iepcColor = getScoreColor(iepcAvg);

  const cards = [
    {
      id: 'cycle-kpi-qa',
      icon: BarChart2,
      label: 'Qualidade Média',
      sublabel: 'Nota Final QA',
      value: qaAvg.toFixed(2),
      suffix: '/100',
      color: qaColor,
      bg: qaAvg >= 85 ? 'rgba(34,197,94,0.08)' : qaAvg >= 70 ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
      border: qaAvg >= 85 ? 'rgba(34,197,94,0.2)' : qaAvg >= 70 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      id: 'cycle-kpi-iepc',
      icon: Star,
      label: 'IEPC Médio',
      sublabel: 'Experiência do Cliente',
      value: iepcAvg.toFixed(2),
      suffix: '/100',
      color: iepcColor,
      bg: iepcAvg >= 85 ? 'rgba(34,197,94,0.08)' : iepcAvg >= 70 ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)',
      border: iepcAvg >= 85 ? 'rgba(34,197,94,0.2)' : iepcAvg >= 70 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      id: 'cycle-kpi-ncs',
      icon: AlertTriangle,
      label: 'Total de NCs',
      sublabel: 'Não Conformidades',
      value: displayNCs.toString(),
      suffix: ' registros',
      color: displayNCs === 0 ? '#22C55E' : '#EF4444',
      bg: displayNCs === 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
      border: displayNCs === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
    },
    {
      id: 'cycle-kpi-elogios',
      icon: ThumbsUp,
      label: 'Total de Elogios',
      sublabel: 'Reconhecimentos recebidos',
      value: totalElogios.toString(),
      suffix: totalElogios === 1 ? ' elogio' : ' elogios',
      color: '#EAB308',
      bg: 'rgba(234,179,8,0.08)',
      border: 'rgba(234,179,8,0.2)',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-xl p-6 transition-all duration-200 hover:translate-y-[-2px]"
          style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: card.bg }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-white metric-value">{card.value}</span>
            <span className="text-sm ml-1" style={{ color: '#8B949E' }}>{card.suffix}</span>
          </div>
          <p className="text-xs font-medium text-white mb-0.5">{card.label}</p>
          <p className="text-xs" style={{ color: '#8B949E' }}>{card.sublabel}</p>
        </div>
      ))}
    </div>
  );
}