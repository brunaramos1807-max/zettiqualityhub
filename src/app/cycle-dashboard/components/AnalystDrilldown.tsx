'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, AlertTriangle, ThumbsUp, Target, Zap } from 'lucide-react';
import type { Analyst } from '@/lib/mockData';
import { getScoreColor, getScoreBadgeClass, getScoreLabel } from '@/lib/mockData';
import { fetchNCRecords, fetchElogios } from '@/lib/services/dataService';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const AnalystRadarChart = dynamic(
  () => import('./AnalystRadarChart'),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg" style={{ backgroundColor: '#161B22' }} /> }
);

// Official pillar weights
const QA_WEIGHTS = { p1: 22, p2: 34, p3: 18, p4: 14, p5: 12 };
const IEPC_WEIGHTS = { e1: 30, e2: 20, e3: 20, e4: 15, e5: 15 };

const PILLAR_COLORS_QA = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];
const PILLAR_COLORS_IEPC = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6'];
const NC_COLORS = ['#3B82F6', '#06B6D4', '#F59E0B', '#EF4444', '#8B5CF6'];

function getScoreColorLocal(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#facc15';
  if (score >= 70) return '#f59e0b';
  return '#ef4444';
}

interface Props {
  analyst: Analyst;
  onClose: () => void;
}

// ─── Strategic Radar (weight-based) ──────────────────────────────────────────
function StrategicRadar({ data, color, name }: { data: { subject: string; value: number; fullName: string }[]; color: string; name: string }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="font-bold text-white mb-1">{d.fullName}</p>
        <p style={{ color }}>{d.value.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 15, right: 20, bottom: 15, left: 20 }}>
        <PolarGrid stroke="rgba(255,255,255,0.07)" gridType="polygon" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#8B949E', fontSize: 9 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          name={name}
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.12}
          strokeWidth={2.5}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── NC Donut ─────────────────────────────────────────────────────────────────
function NCDonut({ ncData, total }: { ncData: { name: string; value: number; color: string; pct: number }[]; total: number }) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl p-2 text-xs shadow-xl" style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.12)' }}>
        <p className="font-bold text-white">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.color }}>{payload[0].value} ({payload[0].payload.pct}%)</p>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-4">
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <PieChart width={110} height={110}>
          <Pie
            data={ncData.length > 0 ? ncData : [{ name: 'Sem NCs', value: 1, color: 'rgba(255,255,255,0.08)', pct: 0 }]}
            cx={50} cy={50}
            innerRadius={32} outerRadius={48}
            dataKey="value"
            paddingAngle={ncData.length > 0 ? 3 : 0}
            startAngle={90} endAngle={-270}
          >
            {(ncData.length > 0 ? ncData : [{ name: 'Sem NCs', value: 1, color: 'rgba(255,255,255,0.08)', pct: 0 }]).map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <p className="text-lg font-bold text-white leading-none">{total}</p>
          <p style={{ fontSize: 8, color: '#64748B' }}>NCs</p>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {ncData.length > 0 ? ncData.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs truncate" style={{ color: '#94A3B8', fontSize: 10 }}>{item.name.split(' ').slice(0, 3).join(' ')}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs font-bold text-white">{item.value}</span>
                <span className="text-xs" style={{ color: item.color, fontSize: 10 }}>{item.pct}%</span>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-xs" style={{ color: '#64748B' }}>Sem NCs no ciclo</p>
        )}
      </div>
    </div>
  );
}

export default function AnalystDrilldown({ analyst, onClose }: Props) {
  const qaColor = getScoreColor(analyst.qaScore);
  const iepcColor = getScoreColor(analyst.iepcScore);

  const [analystNCs, setAnalystNCs] = useState<any[]>([]);
  const [analystElogios, setAnalystElogios] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [ncs, elogios] = await Promise.all([
        fetchNCRecords(),
        fetchElogios(),
      ]);
      const firstName = analyst.name.split(' ')[0].toLowerCase();
      setAnalystNCs(ncs.filter((nc: any) => nc.analista?.toLowerCase().includes(firstName) || nc.analista === analyst.name));
      setAnalystElogios(elogios.filter((e: any) => e.colaborador?.toLowerCase().includes(firstName) || e.colaborador === analyst.name));
    };
    loadData();
  }, [analyst.name]);

  // QA Radar data — percentage of each pillar (raw/max * 100)
  const qaRadarData = [
    { subject: 'P1 Fluxo', value: Math.round(((analyst.p1 ?? 0) / QA_WEIGHTS.p1) * 100), fullName: 'P1 — Gestão do Fluxo' },
    { subject: 'P2 Tratativa', value: Math.round(((analyst.p2 ?? 0) / QA_WEIGHTS.p2) * 100), fullName: 'P2 — Gestão da Tratativa' },
    { subject: 'P3 Análise', value: Math.round(((analyst.p3 ?? 0) / QA_WEIGHTS.p3) * 100), fullName: 'P3 — Análise Técnica' },
    { subject: 'P4 Comunicação', value: Math.round(((analyst.p4 ?? 0) / QA_WEIGHTS.p4) * 100), fullName: 'P4 — Comunicação' },
    { subject: 'P5 Conduta', value: Math.round(((analyst.p5 ?? 0) / QA_WEIGHTS.p5) * 100), fullName: 'P5 — Conduta Relacional' },
  ];

  // IEPC Radar data
  const iepcRadarData = [
    { subject: 'E1 Resolução', value: Math.round(((analyst.e1 ?? 0) / IEPC_WEIGHTS.e1) * 100), fullName: 'E1 — Resolução Percebida' },
    { subject: 'E2 Compreensão', value: Math.round(((analyst.e2 ?? 0) / IEPC_WEIGHTS.e2) * 100), fullName: 'E2 — Compreensão e Segurança' },
    { subject: 'E3 Esforço', value: Math.round(((analyst.e3 ?? 0) / IEPC_WEIGHTS.e3) * 100), fullName: 'E3 — Esforço do Cliente' },
    { subject: 'E4 Tempo', value: Math.round(((analyst.e4 ?? 0) / IEPC_WEIGHTS.e4) * 100), fullName: 'E4 — Tempo e Fluidez' },
    { subject: 'E5 Relacional', value: Math.round(((analyst.e5 ?? 0) / IEPC_WEIGHTS.e5) * 100), fullName: 'E5 — Experiência Relacional' },
  ];

  // NC distribution by type
  const ncByType = (() => {
    const typeCounts: Record<string, number> = {};
    analystNCs.forEach((nc: any) => {
      const t = nc.tipo || nc.category || 'Outros';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const total = analystNCs.length;
    return Object.entries(typeCounts).map(([name, value], idx) => ({
      name,
      value,
      color: NC_COLORS[idx % NC_COLORS.length],
      pct: total > 0 ? Math.round((value / total) * 100) : 0,
    }));
  })();

  const pillarDetailsQA = [
    { key: 'P1', label: 'Fluxo e Rastreabilidade', raw: analyst.p1 ?? 0, max: QA_WEIGHTS.p1, color: PILLAR_COLORS_QA[0] },
    { key: 'P2', label: 'Tratativa da Demanda', raw: analyst.p2 ?? 0, max: QA_WEIGHTS.p2, color: PILLAR_COLORS_QA[1] },
    { key: 'P3', label: 'Assertividade Técnica', raw: analyst.p3 ?? 0, max: QA_WEIGHTS.p3, color: PILLAR_COLORS_QA[2] },
    { key: 'P4', label: 'Qualidade da Comunicação', raw: analyst.p4 ?? 0, max: QA_WEIGHTS.p4, color: PILLAR_COLORS_QA[3] },
    { key: 'P5', label: 'Conduta Relacional', raw: analyst.p5 ?? 0, max: QA_WEIGHTS.p5, color: PILLAR_COLORS_QA[4] },
  ];

  const pillarDetailsIEPC = [
    { key: 'E1', label: 'Resolução Percebida', raw: analyst.e1 ?? 0, max: IEPC_WEIGHTS.e1, color: PILLAR_COLORS_IEPC[0] },
    { key: 'E2', label: 'Compreensão e Segurança', raw: analyst.e2 ?? 0, max: IEPC_WEIGHTS.e2, color: PILLAR_COLORS_IEPC[1] },
    { key: 'E3', label: 'Esforço do Cliente', raw: analyst.e3 ?? 0, max: IEPC_WEIGHTS.e3, color: PILLAR_COLORS_IEPC[2] },
    { key: 'E4', label: 'Tempo e Fluidez', raw: analyst.e4 ?? 0, max: IEPC_WEIGHTS.e4, color: PILLAR_COLORS_IEPC[3] },
    { key: 'E5', label: 'Experiência Relacional', raw: analyst.e5 ?? 0, max: IEPC_WEIGHTS.e5, color: PILLAR_COLORS_IEPC[4] },
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

      <div className="p-6 space-y-6">
        {/* Score summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        {/* QA Radar + IEPC Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QA Radar */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Target size={13} style={{ color: '#38BDF8' }} />
              <p className="text-sm font-semibold text-white">Mapa Estratégico QA</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>Pilares QA</span>
            </div>
            <StrategicRadar data={qaRadarData} color="#38BDF8" name="QA" />
            <div className="space-y-1.5 mt-2">
              {pillarDetailsQA.map((p) => {
                const pct = p.max > 0 ? Math.round((p.raw / p.max) * 100) : 0;
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs flex-1" style={{ color: '#94A3B8' }}>{p.key} {p.label}</span>
                    <span className="text-xs font-bold" style={{ color: getScoreColorLocal(pct) }}>{p.raw}/{p.max}</span>
                    <span className="text-xs" style={{ color: '#64748B' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IEPC Radar */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} style={{ color: '#06B6D4' }} />
              <p className="text-sm font-semibold text-white">Mapa Estratégico IEPC</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06B6D4' }}>Pilares IEPC</span>
            </div>
            <StrategicRadar data={iepcRadarData} color="#06B6D4" name="IEPC" />
            <div className="space-y-1.5 mt-2">
              {pillarDetailsIEPC.map((p) => {
                const pct = p.max > 0 ? Math.round((p.raw / p.max) * 100) : 0;
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs flex-1" style={{ color: '#94A3B8' }}>{p.key} {p.label}</span>
                    <span className="text-xs font-bold" style={{ color: getScoreColorLocal(pct) }}>{p.raw}/{p.max}</span>
                    <span className="text-xs" style={{ color: '#64748B' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* NC Donut + Elogios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NC Distribution */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={13} style={{ color: '#EF4444' }} />
              <p className="text-sm font-semibold text-white">Distribuição de Não Conformidades</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{analystNCs.length} NCs</span>
            </div>
            <NCDonut ncData={ncByType} total={analystNCs.length} />
            {analystNCs.length > 0 && (
              <div className="mt-3 space-y-2">
                {analystNCs.slice(0, 3).map((nc: any) => (
                  <div key={`nc-drill-${nc.id}`}
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-mono text-white">{nc.protocolo}</span>
                      <span className="text-xs font-bold" style={{ color: '#EF4444' }}>{nc.pontosDescontados} pts</span>
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: '#8B949E' }}>{nc.descricao}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>{nc.tipo}</p>
                  </div>
                ))}
                {analystNCs.length > 3 && (
                  <p className="text-xs text-center" style={{ color: '#64748B' }}>+{analystNCs.length - 3} NCs adicionais</p>
                )}
              </div>
            )}
          </div>

          {/* Elogios */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.15)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ThumbsUp size={13} style={{ color: '#EAB308' }} />
              <p className="text-sm font-semibold text-white">Elogios</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#EAB308' }}>{analystElogios.length} elogios</span>
            </div>
            {analystElogios.length > 0 ? (
              <div className="space-y-2">
                {analystElogios.slice(0, 4).map((e: any) => (
                  <div key={`elogio-drill-${e.id}`}
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-white">{e.cliente}</span>
                      <span className="text-xs font-mono" style={{ color: '#8B949E' }}>{e.protocolo}</span>
                    </div>
                    <p className="text-xs line-clamp-2" style={{ color: '#8B949E' }}>{e.elogio}</p>
                  </div>
                ))}
                {analystElogios.length > 4 && (
                  <p className="text-xs text-center" style={{ color: '#64748B' }}>+{analystElogios.length - 4} elogios adicionais</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ThumbsUp size={24} style={{ color: 'rgba(234,179,8,0.3)' }} className="mb-2" />
                <p className="text-xs" style={{ color: '#64748B' }}>Nenhum elogio registrado neste ciclo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}