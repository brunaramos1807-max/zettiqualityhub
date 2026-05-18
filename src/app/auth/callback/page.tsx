'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      router?.replace('/');
      return;
    }

    // Exchange the code in the URL for a session
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      if (session) {
        // Session established — redirect to home
        router?.replace('/');
      } else {
        // Try to exchange code from URL params
        const url = new URL(window.location.href);
        const code = url?.searchParams?.get('code');
        if (code) {
          supabase?.auth?.exchangeCodeForSession(code)?.then(({ data, error }) => {
            if (data?.session) {
              router?.replace('/');
            } else {
              router?.replace('/');
            }
          });
        } else {
          router?.replace('/');
        }
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#38BDF8' }} />
        <p className="text-sm font-medium text-white mb-1">Autenticando...</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Aguarde, verificando sua conta Google</p>
      </div>
    </div>
  );
}
