'use client';
import React, { useState } from 'react';
import EnterpriseSidebar from '@/components/EnterpriseSidebar';
import EnterpriseTopbar from '@/components/EnterpriseTopbar';
import RouteGuard from '@/components/RouteGuard';

interface EnterpriseLayoutProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function EnterpriseLayout({ children, requireAdmin = false }: EnterpriseLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <RouteGuard requireAdmin={requireAdmin}>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#071426' }}>
        <EnterpriseSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <EnterpriseTopbar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
