'use client';
import React, { useEffect, useState } from 'react';
import { BarChart2, Star, AlertTriangle, ThumbsUp } from 'lucide-react';
import { fetchCycleScores, fetchNCRecords, fetchElogios, fetchAllPeriodos } from '@/lib/services/dataService';

interface KPIData {
  qaAvg: number;
  iepcAvg: number;
  totalNCs: number;
  totalElogios: number;
  hasData: boolean;
}

export default function HomeKPICards() {
  const [kpis, setKpis] = useState<KPIData>({ qaAvg: 0, iepcAvg: 0, totalNCs: 0, totalElogios: 0, hasData: false });

  const loadKPIs = async () => {
    // Get the most recent period to filter correctly
    const periodos = await fetchAllPeriodos();
    const activePeriodo = periodos.length > 0 ? periodos[0] : undefined;

    const [scores, ncs, elogios] = await Promise.all([
      fetchCycleScores(activePeriodo),
      fetchNCRecords(activePeriodo),
      fetchElogios(activePeriodo),
    ]);

    if (scores.length === 0) {
      setKpis({ qaAvg: 0, iepcAvg: 0, totalNCs: 0, totalElogios: 0, hasData: false });
      return;
    }

    const qaAvg = scores.reduce((s: number, a: any) => s + (a.nota_final_qa || 0), 0) / scores.length;
    const iepcAvg = scores.reduce((s: number, a: any) => {
      // Defensive fallback: iepc_total → iepc → indice_satisfacao → iepc_total_calculado → 0
      const iepc =
        a?.iepc_total ??
        a?.iepc ??
        a?.indice_satisfacao ??
        a?.iepc_total_calculado ??
        0;
      return s + Number(iepc);
    }, 0) / scores.length;

    setKpis({
      qaAvg,
      iepcAvg,
      totalNCs: ncs.length,
      totalElogios: elogios.length,
      hasData: true,
    });
  };

  useEffect(() => {
    loadKPIs();
    const handler = () => loadKPIs();
    window.addEventListener('zetti_import_done', handler);
    return () => window.removeEventListener('zetti_import_done', handler);
  }, []);

  if (!kpis.hasData) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhum dado importado. Importe uma planilha para visualizar os KPIs.</p>
      </div>
    );
  }

  const cards = [
    {
      id: 'kpi-qa',
      icon: BarChart2,
      label: 'Qualidade Média (QA)',
      value: kpis.qaAvg.toFixed(2),
      suffix: '/100',
      color: '#22C55E',
      bgColor: 'rgba(34,197,94,0.08)',
      borderColor: 'rgba(34,197,94,0.15)',
      description: 'Média de todos os analistas no ciclo atual',
    },
    {
      id: 'kpi-iepc',
      icon: Star,
      label: 'IEPC Médio',
      value: kpis.iepcAvg.toFixed(2),
      suffix: '/100',
      color: '#60A5FA',
      bgColor: 'rgba(96,165,250,0.08)',
      borderColor: 'rgba(96,165,250,0.15)',
      description: 'Índice de Experiência Percebida pelo Cliente',
    },
    {
      id: 'kpi-ncs',
      icon: AlertTriangle,
      label: 'Total de NCs',
      value: kpis.totalNCs.toString(),
      suffix: ' registros',
      color: '#EF4444',
      bgColor: 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.15)',
      description: 'Não Conformidades registradas no ciclo',
    },
    {
      id: 'kpi-elogios',
      icon: ThumbsUp,
      label: 'Total de Elogios',
      value: kpis.totalElogios.toString(),
      suffix: ' recebidos',
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.08)',
      borderColor: 'rgba(245,158,11,0.15)',
      description: 'Reconhecimentos de clientes no ciclo',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="rounded-xl p-5 transition-all"
          style={{ backgroundColor: '#111827', border: `1px solid ${card.borderColor}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: card.bgColor }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-bold text-white metric-value">{card.value}</span>
            <span className="text-sm ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.suffix}</span>
          </div>
          <p className="text-xs font-medium text-white mb-0.5">{card.label}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.description}</p>
        </div>
      ))}
    </div>
  );
}