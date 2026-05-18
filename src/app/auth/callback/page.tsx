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

    const handleCallback = async () => {
      try {
        // Try to get existing session first
        const { data: { session } } = await supabase?.auth?.getSession();
        if (session) {
          router?.replace('/');
          return;
        }

        // Exchange PKCE code from URL
        const url = new URL(window.location.href);
        const code = url?.searchParams?.get('code');
        const error = url?.searchParams?.get('error');
        const errorDescription = url?.searchParams?.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router?.replace('/sign-up-login');
          return;
        }

        if (code) {
          const { data, error: exchangeError } = await supabase?.auth?.exchangeCodeForSession(code);
          if (data?.session) {
            router?.replace('/');
          } else {
            console.error('Code exchange error:', exchangeError);
            router?.replace('/');
          }
        } else {
          // No code — might be hash-based flow, let onAuthStateChange handle it
          const { data: { subscription } } = supabase?.auth?.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription?.unsubscribe();
              router?.replace('/');
            }
          });

          // Fallback redirect after 3s
          setTimeout(() => {
            subscription?.unsubscribe();
            router?.replace('/');
          }, 3000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        router?.replace('/');
      }
    };

    handleCallback();
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
