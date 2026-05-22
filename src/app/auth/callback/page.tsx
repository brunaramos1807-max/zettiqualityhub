'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ShieldX } from 'lucide-react';
import { useState } from 'react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [blockedEmail, setBlockedEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      router?.replace('/');
      return;
    }

    const handleCallback = async () => {
      try {
        // Try to get existing session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const allowed = await checkAndEnsureProfile(supabase, session.user);
          if (!allowed) {
            await supabase.auth.signOut();
            setBlockedEmail(session.user.email || '');
            setBlocked(true);
            return;
          }
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
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session) {
            const allowed = await checkAndEnsureProfile(supabase, data.session.user);
            if (!allowed) {
              await supabase.auth.signOut();
              setBlockedEmail(data.session.user.email || '');
              setBlocked(true);
              return;
            }
            router?.replace('/');
          } else {
            console.error('Code exchange error:', exchangeError);
            router?.replace('/');
          }
        } else {
          // No code — might be hash-based flow, let onAuthStateChange handle it
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              const allowed = await checkAndEnsureProfile(supabase, session.user);
              subscription?.unsubscribe();
              if (!allowed) {
                await supabase.auth.signOut();
                setBlockedEmail(session.user.email || '');
                setBlocked(true);
                return;
              }
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

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#071426' }}>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <ShieldX size={32} style={{ color: '#EF4444' }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-3">Acesso Negado</h1>
          <p className="text-sm mb-2" style={{ color: '#94A3B8' }}>
            O e-mail <strong className="text-white">{blockedEmail}</strong> não está cadastrado no sistema.
          </p>
          <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>
            Somente usuários pré-cadastrados pelo administrador podem acessar a plataforma QualiVisão.
          </p>
          <button
            onClick={() => router?.replace('/sign-up-login')}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: '#1E3A5F', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#071426' }}>
      <div className="text-center">
        <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: '#38BDF8' }} />
        <p className="text-sm font-medium text-white mb-1">Autenticando...</p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Aguarde, verificando sua conta</p>
      </div>
    </div>
  );
}

// Check if user is pre-registered; if yes, ensure profile exists. Returns true if allowed.
async function checkAndEnsureProfile(supabase: any, user: any): Promise<boolean> {
  if (!user?.id || !user?.email) return false;

  const email = user.email.toLowerCase();

  // Admin emails are always allowed
  const adminEmails = ['brunaramos1807@gmail.com', 'bruna.silva@zetti.tech', 'admin@zetti.com.br'];
  const isAdmin = adminEmails.includes(email);

  if (!isAdmin) {
    // Check pre_registered_users AND user_profiles (by email) in parallel
    const [preRegResult, profileByEmailResult] = await Promise.all([
      supabase
        .from('pre_registered_users')
        .select('id, email, full_name, role, cargo_id, squad, squads, is_active, status_usuario, nivel')
        .eq('email', email)
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('id, email, full_name, role, cargo_id, squad, squads, is_active')
        .eq('email', email)
        .maybeSingle(),
    ]);

    const preReg = preRegResult.data;
    const existingProfile = profileByEmailResult.data;

    // Allow if: in pre_registered_users (active) OR already has a profile by email
    const inPreReg = !!(preReg && preReg.is_active !== false);
    const inProfiles = !!(existingProfile && existingProfile.is_active !== false);

    if (!inPreReg && !inProfiles) {
      // Not registered anywhere — block
      return false;
    }

    // User is allowed — ensure profile exists
    await ensureUserProfile(supabase, user, preReg || existingProfile);
    return true;
  }

  // Admin — ensure profile exists with admin role
  await ensureUserProfile(supabase, user, null);
  return true;
}

// Ensure user profile exists in user_profiles table
async function ensureUserProfile(supabase: any, user: any, preReg: any) {
  if (!user?.id || !user?.email) return;
  try {
    const email = user.email.toLowerCase();
    const adminEmails = ['brunaramos1807@gmail.com', 'bruna.silva@zetti.tech', 'admin@zetti.com.br'];
    const isAdmin = adminEmails.includes(email);

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const profileData: Record<string, any> = {
        id: user.id,
        email: user.email,
        full_name: preReg?.full_name || user.user_metadata?.full_name || user.email.split('@')[0],
        role: isAdmin ? 'Admin' : (preReg?.role || 'Coordenador'),
        cargo_id: preReg?.cargo_id || null,
        squad: preReg?.squad || null,
        squads: preReg?.squads || [],
        equipes: preReg?.squads || [],
        is_active: true,
        status_usuario: preReg?.status_usuario || 'ativo',
        nivel: preReg?.nivel || 'Junior',
        updated_at: new Date().toISOString(),
      };

      await supabase.from('user_profiles').upsert(profileData, { onConflict: 'id' });
    }
  } catch (e) {
    console.error('ensureUserProfile error:', e);
  }
}
