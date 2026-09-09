import React from 'react';

export function LoadingState() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 animate-pulse mb-6" />

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3 animate-pulse" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3 animate-pulse" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Insights skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
            {[...Array(3)].map((_, j) => (
              <div
                key={j}
                className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2 animate-pulse" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex gap-4 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
