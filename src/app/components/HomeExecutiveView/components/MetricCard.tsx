import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  performance?: {
    label: string;
    color: string;
    bg: string;
    border: string;
  };
  trend?: 'up' | 'down' | 'stable' | 'unavailable';
  trendPercent?: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  performance,
  trend,
  trendPercent,
  icon,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex-1 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className="text-3xl font-bold text-slate-900 dark:text-white">
          {value.toFixed(value < 100 ? 2 : 0)}
          {unit && (
            <span className="text-lg font-normal text-slate-600 dark:text-slate-400 ml-1">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Performance Badge + Trend */}
      <div className="flex items-center gap-2">
        {performance && (
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{
              color: performance.color,
              backgroundColor: performance.bg,
              border: `1px solid ${performance.border}`,
            }}
          >
            {performance.label}
          </span>
        )}

        {trend && trend !== 'unavailable' && (
          <div className="flex items-center gap-1 ml-auto">
            {trend === 'up' && <TrendingUp size={16} className="text-green-600" />}
            {trend === 'down' && <TrendingDown size={16} className="text-red-600" />}
            {trend === 'stable' && <Minus size={16} className="text-slate-400" />}
            {trendPercent !== undefined && (
              <span
                className={`text-xs font-semibold ${
                  trend === 'up'
                    ? 'text-green-600'
                    : trend === 'down'
                      ? 'text-red-600'
                      : 'text-slate-600'
                }`}
              >
                {trendPercent > 0 ? '+' : ''}
                {trendPercent}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
