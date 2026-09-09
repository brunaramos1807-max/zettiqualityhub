'use client';
import React from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import dynamic from 'next/dynamic';

const CycleDashboard = dynamic(() => import('./components/CycleDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Carregando analytics...</span>
      </div>
    </div>
  ),
});

export default function CycleDashboardPage() {
  return (
    <EnterpriseLayout>
      <CycleDashboard />
    </EnterpriseLayout>
  );
}
