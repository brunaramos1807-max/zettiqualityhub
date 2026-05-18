'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import SystemLoginScreen from '@/components/SystemLoginScreen';
import { Loader2 } from 'lucide-react';

export default function SignUpLoginPage() {
  const { session, loading } = useSystemAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router?.replace('/');
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#38BDF8' }} />
      </div>
    );
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#38BDF8' }} />
      </div>
    );
  }

  return <SystemLoginScreen />;
}