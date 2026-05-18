'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getCurrentSession,
  loginUser,
  logoutUser,
  seedDefaultAdmin,
  isAdmin as checkIsAdmin,
  type SessionData,
  ADMIN_PERMISSIONS,
  DEFAULT_PERMISSIONS,
} from '@/lib/authSystem';
import { createClient } from '@/lib/supabase/client';

interface SystemAuthContextType {
  session: SessionData | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SystemAuthContext = createContext<SystemAuthContextType>({
  session: null,
  loading: true,
  isAdmin: false,
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useSystemAuth = () => useContext(SystemAuthContext);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 min

// Known admin emails for Supabase Auth fallback
const ADMIN_EMAILS = ['brunaramos1807@gmail.com', 'bruna.silva@zetti.tech', 'admin@zetti.com.br'];

function buildSupabaseSession(supaUser: any): SessionData {
  const email: string = supaUser.email || '';
  const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
  const now = Date.now();
  return {
    userId: supaUser.id,
    email,
    nome: supaUser.user_metadata?.full_name || email.split('@')[0] || 'Usuário',
    cargo: isAdminEmail ? 'Administrador' : 'Auditor',
    permissoes: isAdminEmail ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
    loginAt: now,
    lastActivity: now,
  };
}

export function SystemAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  };

  const startInactivityTimer = useCallback(() => {
    clearTimer();
    inactivityTimer.current = setTimeout(() => {
      logoutUser();
      setSession(null);
    }, INACTIVITY_TIMEOUT);
  }, []);

  const resetTimer = useCallback(() => {
    if (session) {
      startInactivityTimer();
    }
  }, [session, startInactivityTimer]);

  useEffect(() => {
    const init = async () => {
      await seedDefaultAdmin();

      // 1. Check localStorage session first
      const localSession = getCurrentSession();
      if (localSession) {
        setSession(localSession);
        setLoading(false);
        startInactivityTimer();
        return;
      }

      // 2. Fall back to Supabase Auth session
      const supabase = createClient();
      if (supabase) {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user) {
          const derived = buildSupabaseSession(supaSession.user);
          setSession(derived);
          setLoading(false);
          startInactivityTimer();
          return;
        }

        // Listen for Supabase auth state changes (e.g. after email confirmation redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
          if (supaSession?.user) {
            const derived = buildSupabaseSession(supaSession.user);
            setSession(derived);
            startInactivityTimer();
          } else if (!getCurrentSession()) {
            setSession(null);
          }
          setLoading(false);
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      }

      setLoading(false);
    };

    const cleanup = init();
    return () => {
      clearTimer();
      cleanup?.then?.((fn) => fn?.());
    };
  }, [startInactivityTimer]);

  // Reset inactivity timer on user activity
  useEffect(() => {
    if (!session) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, resetTimer));
  }, [session, resetTimer]);

  const login = async (email: string, password: string) => {
    // 1. Try localStorage-based auth first
    const result = await loginUser(email, password);
    if (result.success && result.session) {
      setSession(result.session);
      startInactivityTimer();
      return { success: true };
    }

    // 2. Fall back to Supabase Auth (for users who confirmed email)
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const derived = buildSupabaseSession(data.user);
        setSession(derived);
        startInactivityTimer();
        return { success: true };
      }
      if (error) {
        // Return the most helpful error message
        return { success: false, error: result.error || error.message };
      }
    }

    return { success: false, error: result.error || 'Credenciais inválidas.' };
  };

  const logout = async () => {
    logoutUser();
    setSession(null);
    clearTimer();
    // Also sign out from Supabase
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <SystemAuthContext.Provider
      value={{
        session,
        loading,
        isAdmin: checkIsAdmin(session),
        login,
        logout,
      }}
    >
      {children}
    </SystemAuthContext.Provider>
  );
}
