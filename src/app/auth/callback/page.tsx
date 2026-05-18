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
      router?.replace('/sign-up-login');
      return;
    }

    // Exchange the code in the URL for a session
    supabase?.auth?.getSession()?.then(({ data: { session } }) => {
      if (session) {
        // Session established — redirect to home (RouteGuard will handle access)
        router?.replace('/');
      } else {
        router?.replace('/sign-up-login');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0F1E' }}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#3B82F6' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Verificando confirmação de e-mail...</p>
      </div>
    </div>
  );
}
