'use client';
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import EnterpriseLayout from '@/components/EnterpriseLayout';

const HomeExecutiveView = dynamic(() => import('./components/HomeExecutiveView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Carregando painel...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <EnterpriseLayout>
      <HomeExecutiveView />
    </EnterpriseLayout>
  );
}
