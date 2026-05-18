'use client';

import React from 'react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import SystemLoginScreen from '@/components/SystemLoginScreen';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { session, loading, isAdmin } = useSystemAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#38BDF8' }} />
      </div>
    );
  }

  if (!session) {
    return <SystemLoginScreen />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-lg font-semibold text-white mb-2">Acesso Negado</p>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Você não tem permissão para acessar esta área.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
