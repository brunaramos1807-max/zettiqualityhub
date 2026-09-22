'use client';
import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from 'recharts';

interface RadarDataPoint {
  pillar: string;
  value: number;
  label: string;
}

interface Props {
  data: RadarDataPoint[];
  analystName: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RadarDataPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl p-3 text-xs shadow-xl"
      style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="font-semibold text-white mb-1">{d.label}</p>
      <p className="metric-value" style={{ color: '#22C55E' }}>
        {d.value.toFixed(1)}%
      </p>
    </div>
  );
}

export default function AnalystRadarChart({ data, analystName }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Radar
          name={analystName}
          dataKey="value"
          stroke="#22C55E"
          fill="#22C55E"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ fill: '#22C55E', r: 3 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
