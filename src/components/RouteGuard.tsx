'use client';

import React, { useEffect, useState } from 'react';

import { useSystemAuth } from '@/contexts/SystemAuthContext';
import SystemLoginScreen from '@/components/SystemLoginScreen';
import { Loader2, AlertTriangle } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function isPreviewMode(): boolean {
  try {
    const inIframe = window.self !== window.top;
    const bypassFlag = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    return inIframe || bypassFlag;
  } catch {
    return true;
  }
}

export default function RouteGuard({ children, requireAdmin = false }: RouteGuardProps) {
  const { session, loading, isAdmin, isAdminMaster } = useSystemAuth();
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    setPreview(isPreviewMode());
    setMounted(true);
  }, []);

  // Before client hydration completes, render nothing to avoid mismatch
  if (!mounted) {
    return null;
  }

  // In preview/editor mode, skip auth entirely
  if (preview) {
    return <>{children}</>;
  }

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

  // requireAdmin: only block if explicitly not admin
  if (requireAdmin && !isAdmin && !isAdminMaster) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <div className="text-center p-8 rounded-2xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: '#F59E0B' }} />
          <p className="text-lg font-semibold text-white mb-2">Acesso Restrito</p>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Esta área requer permissões de administrador.</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Entre em contato com o administrador do sistema.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
