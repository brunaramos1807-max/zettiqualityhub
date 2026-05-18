'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { X, AlertTriangle, ThumbsUp } from 'lucide-react';
import type { Analyst } from '@/lib/mockData';
import { getScoreColor, getScoreBadgeClass, getScoreLabel, ELOGIOS, NC_RECORDS } from '@/lib/mockData';

const AnalystRadarChart = dynamic(
  () => import('./AnalystRadarChart'),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg" style={{ backgroundColor: '#161B22' }} /> }
);

interface Props {
  analyst: Analyst;
  onClose: () => void;
}

export default function AnalystDrilldown({ analyst, onClose }: Props) {
  const qaColor = getScoreColor(analyst.qaScore);
  const iepcColor = getScoreColor(analyst.iepcScore);

  const analystElogios = ELOGIOS.filter(
    (e) => e.colaborador.toLowerCase().includes(analyst.name.split(' ')[0].toLowerCase())
  );
  const analystNCs = NC_RECORDS.filter((nc) => nc.analista === analyst.name);

  const radarData = [
    { pillar: 'P1', value: ((analyst.p1 ?? 0) / 22) * 100, label: 'Fluxo' },
    { pillar: 'P2', value: ((analyst.p2 ?? 0) / 34) * 100, label: 'Tratativa' },
    { pillar: 'P3', value: ((analyst.p3 ?? 0) / 18) * 100, label: 'Técnico' },
    { pillar: 'P4', value: ((analyst.p4 ?? 0) / 14) * 100, label: 'Comunicação' },
    { pillar: 'P5', value: ((analyst.p5 ?? 0) / 12) * 100, label: 'Relacional' },
  ];

  const pillarDetails = [
    { key: 'P1', label: 'Fluxo e Rastreabilidade', raw: analyst.p1 ?? 0, max: 22 },
    { key: 'P2', label: 'Tratativa da Demanda', raw: analyst.p2 ?? 0, max: 34 },
    { key: 'P3', label: 'Assertividade Técnica', raw: analyst.p3 ?? 0, max: 18 },
    { key: 'P4', label: 'Qualidade da Comunicação', raw: analyst.p4 ?? 0, max: 14 },
    { key: 'P5', label: 'Conduta Relacional', raw: analyst.p5 ?? 0, max: 12 },
    { key: 'E1', label: 'Resolução Percebida', raw: analyst.e1 ?? 0, max: 30 },
    { key: 'E2', label: 'Compreensão e Segurança', raw: analyst.e2 ?? 0, max: 20 },
    { key: 'E3', label: 'Esforço do Cliente', raw: analyst.e3 ?? 0, max: 20 },
    { key: 'E4', label: 'Tempo e Fluidez', raw: analyst.e4 ?? 0, max: 15 },
    { key: 'E5', label: 'Experiência Relacional', raw: analyst.e5 ?? 0, max: 15 },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden animate-slide-up"
      style={{ border: '1px solid rgba(43,79,129,0.3)', backgroundColor: '#161B22' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'linear-gradient(135deg, rgba(30,58,95,0.6) 0%, rgba(22,32,50,0.8) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold"
            style={{ backgroundColor: '#1E3A5F', color: '#FFFFFF' }}
          >
            {analyst.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-white">{analyst.name}</h2>
              <span className={getScoreBadgeClass(analyst.qaScore)}>{getScoreLabel(analyst.qaScore)}</span>
            </div>
            <p className="text-sm" style={{ color: '#8B949E' }}>
              {analyst.squad} · Coord. {analyst.coordenador}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
          <X size={18} />
        </button>
      </div>

      <div className="p-6">
        {/* Score summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Nota QA Final', value: (analyst.qaScore ?? 0).toFixed(2), color: qaColor, suffix: '/100' },
            { label: 'IEPC Total', value: (analyst.iepcScore ?? 0).toFixed(2), color: iepcColor, suffix: '/100' },
            { label: 'NCs no Ciclo', value: (analyst.ncs ?? 0).toString(), color: (analyst.ncs ?? 0) === 0 ? '#22C55E' : '#EF4444', suffix: (analyst.ncs ?? 0) === 1 ? ' NC' : ' NCs' },
            { label: 'Pts Deduzidos', value: (analyst.ncPoints ?? 0).toString(), color: (analyst.ncPoints ?? 0) === 0 ? '#22C55E' : '#EF4444', suffix: ' pts' },
          ].map((stat) => (
            <div key={`analyst-stat-${stat.label}`}
              className="p-4 rounded-xl text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs mb-1.5" style={{ color: '#8B949E' }}>{stat.label}</p>
              <p className="text-2xl font-bold metric-value" style={{ color: stat.color }}>
                {stat.value}<span className="text-sm font-normal">{stat.suffix}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Radar + Pillar bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6 mb-8">
          {/* Radar chart */}
          <div>
            <p className="text-sm font-semibold text-white mb-4">Radar de Pilares QA</p>
            <AnalystRadarChart data={radarData} analystName={analyst.name} />
          </div>

          {/* Pillar breakdown */}
          <div>
            <p className="text-sm font-semibold text-white mb-4">Desempenho por Pilar</p>
            <div className="space-y-2.5">
              {pillarDetails.map((p) => {
                const pct = (p.raw / p.max) * 100;
                const color = getScoreColor(pct);
                const isIEPC = p.key.startsWith('E');
                return (
                  <div key={`pillar-detail-${p.key}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold w-6 text-center px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: isIEPC ? 'rgba(234,179,8,0.12)' : 'rgba(43,79,129,0.15)',
                            color: isIEPC ? '#EAB308' : '#2B4F81',
                          }}
                        >
                          {p.key}
                        </span>
                        <span className="text-xs text-white">{p.label}</span>
                      </div>
                      <span className="text-xs font-bold metric-value" style={{ color }}>
                        {p.raw}/{p.max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* NCs and Elogios */}
        {(analystNCs.length > 0 || analystElogios.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NCs */}
            {analystNCs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                  <p className="text-sm font-semibold text-white">Não Conformidades ({analystNCs.length})</p>
                </div>
                <div className="space-y-2">
                  {analystNCs.map((nc) => (
                    <div key={`nc-drill-${nc.id}`}
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-white">{nc.protocolo}</span>
                        <span className="badge-danger text-xs">{nc.pontosDescontados} pts</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#8B949E' }}>{nc.descricao}</p>
                      <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{nc.tipo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elogios */}
            {analystElogios.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ThumbsUp size={14} style={{ color: '#EAB308' }} />
                  <p className="text-sm font-semibold text-white">Elogios ({analystElogios.length})</p>
                </div>
                <div className="space-y-2">
                  {analystElogios.map((e) => (
                    <div key={`elogio-drill-${e.id}`}
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{e.cliente}</span>
                        <span className="text-xs font-mono" style={{ color: '#8B949E' }}>{e.protocolo}</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#8B949E' }}>{e.elogio}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}