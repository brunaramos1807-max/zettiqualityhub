'use client';
import React from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import HomeExecutiveView from './components/HomeExecutiveView';

export default function HomePage() {
  return (
    <EnterpriseLayout>
      <HomeExecutiveView />
    </EnterpriseLayout>
  );
}