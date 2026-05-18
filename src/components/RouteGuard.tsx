'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import SystemLoginScreen from '@/components/SystemLoginScreen';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { session, loading, isAdmin } = useSystemAuth();
  const router = useRouter();

  // If already authenticated and somehow on login page, redirect to home
  useEffect(() => {
    if (!loading && session) {
      // Session exists — user is authenticated, nothing to do
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <div className="text-center">
          <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: '#38BDF8' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Verificando sessão...</p>
        </div>
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
