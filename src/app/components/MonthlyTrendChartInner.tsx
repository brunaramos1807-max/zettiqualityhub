'use client';
import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  month: string;
  qa: number;
  iepc: number;
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-sm shadow-xl"
      style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={`tooltip-${entry.name}`} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: '#8B949E' }}>{entry.name}:</span>
          <span className="font-semibold text-white metric-value">{entry.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MonthlyTrendChartInner({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="qaGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#8B949E', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[70, 95]}
          tick={{ fill: '#8B949E', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine y={85} stroke="rgba(34,197,94,0.3)" strokeDasharray="4 4" label={{ value: 'Meta 85', fill: '#22C55E', fontSize: 10, position: 'right' }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="qa"
          name="Nota QA"
          stroke="#22C55E"
          strokeWidth={2.5}
          dot={{ fill: '#22C55E', r: 4, strokeWidth: 2, stroke: '#0D1117' }}
          activeDot={{ r: 6, fill: '#22C55E' }}
        />
        <Line
          type="monotone"
          dataKey="iepc"
          name="IEPC"
          stroke="#2B4F81"
          strokeWidth={2.5}
          dot={{ fill: '#2B4F81', r: 4, strokeWidth: 2, stroke: '#0D1117' }}
          activeDot={{ r: 6, fill: '#2B4F81' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}