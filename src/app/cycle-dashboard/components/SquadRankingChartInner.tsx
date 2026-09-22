'use client';
import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';

interface SquadData {
  squad: string;
  qa: number;
  iepc: number;
  analysts: number;
  highlighted: boolean;
}

interface Props {
  data: SquadData[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 text-sm shadow-xl"
      style={{ backgroundColor: '#1C2333', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="font-semibold text-white mb-2 text-xs">{label}</p>
      {payload.map((entry) => (
        <div key={`squad-tooltip-${entry.name}`} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: '#8B949E' }} className="text-xs">
            {entry.name}:
          </span>
          <span className="font-semibold text-white text-xs metric-value">
            {Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function getQABarColor(value: number) {
  if (value >= 85) return '#22C55E';
  if (value >= 70) return '#EAB308';
  return '#EF4444';
}

export default function SquadRankingChartInner({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        barCategoryGap="20%"
      >
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: '#8B949E', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="squad"
          tick={{ fill: '#8B949E', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <ReferenceLine
          x={85}
          stroke="rgba(34,197,94,0.5)"
          strokeDasharray="4 4"
          label={{ value: '85', fill: '#22C55E', fontSize: 10, position: 'top' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: '#8B949E', fontSize: 12, paddingTop: 12 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="qa" name="Nota QA" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((entry) => (
            <Cell
              key={`qa-cell-${entry.squad}`}
              fill={getQABarColor(entry.qa)}
              fillOpacity={entry.highlighted ? 1 : 0.75}
            />
          ))}
        </Bar>
        <Bar dataKey="iepc" name="IEPC" radius={[0, 4, 4, 0]} maxBarSize={16}>
          {data.map((entry) => (
            <Cell
              key={`iepc-cell-${entry.squad}`}
              fill="#2B4F81"
              fillOpacity={entry.highlighted ? 1 : 0.65}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
