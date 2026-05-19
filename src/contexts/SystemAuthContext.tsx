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

export type UserRole = 'Admin' | 'Coordenador' | 'Diretoria' | 'Gestor' | 'Coordenador Geral' | 'Auditor' | 'Analista';

interface SystemAuthContextType {
  session: SessionData | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  userSquad: string | null;
  userSquads: string[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const SystemAuthContext = createContext<SystemAuthContextType>({
  session: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  userSquad: null,
  userSquads: [],
  login: async () => ({ success: false }),
  logout: () => {},
});

export const useSystemAuth = () => useContext(SystemAuthContext);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

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

async function fetchUserProfile(userId: string): Promise<{ role: UserRole | null; squad: string | null; squads: string[] }> {
  try {
    const supabase = createClient();
    if (!supabase) return { role: null, squad: null, squads: [] };
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, squad, squads')
      .eq('id', userId)
      .single();
    if (error || !data) return { role: null, squad: null, squads: [] };
    return {
      role: (data.role as UserRole) || null,
      squad: data.squad || null,
      squads: Array.isArray(data.squads) ? data.squads : (data.squad ? [data.squad] : []),
    };
  } catch {
    return { role: null, squad: null, squads: [] };
  }
}

export function SystemAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userSquad, setUserSquad] = useState<string | null>(null);
  const [userSquads, setUserSquads] = useState<string[]>([]);
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
      setUserRole(null);
      setUserSquad(null);
      setUserSquads([]);
    }, INACTIVITY_TIMEOUT);
  }, []);

  const resetTimer = useCallback(() => {
    if (session) startInactivityTimer();
  }, [session, startInactivityTimer]);

  const applySupabaseUser = useCallback(
    async (supaUser: any) => {
      const derived = buildSupabaseSession(supaUser);
      setSession(derived);
      startInactivityTimer();
      // Load role from DB
      const profile = await fetchUserProfile(supaUser.id);
      if (profile.role) {
        setUserRole(profile.role);
        // Override cargo with DB role
        derived.cargo = profile.role;
      } else {
        // Fallback: admin emails get Admin role
        const email: string = supaUser.email || '';
        setUserRole(ADMIN_EMAILS.includes(email.toLowerCase()) ? 'Admin' : 'Auditor');
      }
      setUserSquad(profile.squad);
      setUserSquads(profile.squads);
    },
    [startInactivityTimer],
  );

  useEffect(() => {
    const init = async () => {
      await seedDefaultAdmin();

      const localSession = getCurrentSession();
      if (localSession) {
        setSession(localSession);
        setLoading(false);
        startInactivityTimer();
        // Derive userRole from local session cargo
        const cargoToRole: Record<string, UserRole> = {
          'Administrador': 'Admin',
          'Coordenador': 'Coordenador',
          'Coordenador Geral': 'Coordenador Geral',
          'Gestor': 'Gestor',
          'Auditor': 'Auditor',
          'Analista': 'Analista',
        };
        const derivedRole = cargoToRole[localSession.cargo] || null;
        setUserRole(derivedRole as UserRole | null);
        // Also try to load squad info from Supabase for local session users
        const supabase = createClient();
        if (supabase) {
          try {
            const { data } = await supabase
              .from('pre_registered_users')
              .select('role, squad, squads')
              .eq('email', localSession.email)
              .maybeSingle();
            if (data) {
              if (data.role) setUserRole(data.role as UserRole);
              setUserSquad(data.squad || null);
              setUserSquads(Array.isArray(data.squads) ? data.squads : (data.squad ? [data.squad] : []));
            }
          } catch { /* ignore */ }
        }
        return;
      }

      const supabase = createClient();
      if (supabase) {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user) {
          await applySupabaseUser(supaSession.user);
          setLoading(false);
          return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, supaSession) => {
          if (supaSession?.user) {
            await applySupabaseUser(supaSession.user);
          } else if (!getCurrentSession()) {
            setSession(null);
            setUserRole(null);
            setUserSquad(null);
            setUserSquads([]);
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
  }, [applySupabaseUser, startInactivityTimer]);

  // Reset inactivity timer on user activity
  useEffect(() => {
    if (!session) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, resetTimer));
  }, [session, resetTimer]);

  const login = async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (result.success && result.session) {
      setSession(result.session);
      startInactivityTimer();
      return { success: true };
    }

    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        await applySupabaseUser(data.user);
        return { success: true };
      }
      if (error) return { success: false, error: result.error || error.message };
    }

    return { success: false, error: result.error || 'Credenciais inválidas.' };
  };

  const logout = async () => {
    logoutUser();
    setSession(null);
    setUserRole(null);
    setUserSquad(null);
    setUserSquads([]);
    clearTimer();
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <SystemAuthContext.Provider
      value={{
        session,
        loading,
        isAdmin: checkIsAdmin(session) || userRole === 'Admin',
        userRole,
        userSquad,
        userSquads,
        login,
        logout,
      }}
    >
      {children}
    </SystemAuthContext.Provider>
  );
}
