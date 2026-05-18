'use client';
import React from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import CycleDashboard from './components/CycleDashboard';

export default function CycleDashboardPage() {
  return (
    <EnterpriseLayout>
      <CycleDashboard />
    </EnterpriseLayout>
  );
}