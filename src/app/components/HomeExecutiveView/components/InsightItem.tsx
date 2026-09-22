import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Zap,
  AlertTriangle,
  Star,
  Users,
  Target,
  BarChart2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={18} />,
  TrendingDown: <TrendingDown size={18} />,
  CheckCircle: <CheckCircle size={18} />,
  Zap: <Zap size={18} />,
  AlertTriangle: <AlertTriangle size={18} />,
  Star: <Star size={18} />,
  Users: <Users size={18} />,
  Target: <Target size={18} />,
  BarChart2: <BarChart2 size={18} />,
};

interface InsightItemProps {
  icon: string;
  text: string;
  context?: string;
  type?: 'positive' | 'opportunity';
  metric?: {
    value: number | string;
    unit?: string;
  };
}

export function InsightItem({ icon, text, context, type = 'positive', metric }: InsightItemProps) {
  const iconElement = ICON_MAP[icon] || <Star size={18} />;

  const getIconColor = () => {
    switch (type) {
      case 'opportunity':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
      {/* Icon */}
      <div className={`flex-shrink-0 ${getIconColor()}`}>{iconElement}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Main text */}
        <p className="text-sm font-medium text-slate-900 dark:text-white">{text}</p>

        {/* Context (secondary text) */}
        {context && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{context}</p>}
      </div>

      {/* Metric (optional) */}
      {metric && (
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-bold text-slate-900 dark:text-white">{metric.value}</div>
          {metric.unit && (
            <div className="text-xs text-slate-600 dark:text-slate-400">{metric.unit}</div>
          )}
        </div>
      )}
    </div>
  );
}
