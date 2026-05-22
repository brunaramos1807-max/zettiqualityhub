'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentSession, loginUser, logoutUser, seedDefaultAdmin, type SessionData, ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS,  } from '@/lib/authSystem';
import { createClient } from '@/lib/supabase/client';

export type UserRole =
  | 'Admin' |'Coordenador' |'Diretoria' |'Gestor' |'Coordenador Geral' |'Auditor' |'Analista' |'QA' |'Supervisor' |'Gerente' |'Analista Qualidade' |'Coordenadora Qualidade' |'Visualizador';

export interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_import: boolean;
  can_export: boolean;
  can_close_cycle: boolean;
  can_reopen_cycle: boolean;
  can_approve: boolean;
  can_admin: boolean;
}

interface SystemAuthContextType {
  session: SessionData | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: UserRole | null;
  userSquad: string | null;
  userSquads: string[];
  userCargoId: string | null;
  userCargoNome: string | null;
  isAdminMaster: boolean;
  modulePermissions: ModulePermission[];
  canAccessModule: (module: string) => boolean;
  canEditModule: (module: string) => boolean;
  canDeleteModule: (module: string) => boolean;
  canImportModule: (module: string) => boolean;
  canAdminModule: (module: string) => boolean;
  canCloseCycle: () => boolean;
  isCoordinator: () => boolean;
  isGestor: () => boolean;
  getTeamFilter: () => string[] | null; // null = all teams, array = specific teams
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const SystemAuthContext = createContext<SystemAuthContextType>({
  session: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  userSquad: null,
  userSquads: [],
  userCargoId: null,
  userCargoNome: null,
  isAdminMaster: false,
  modulePermissions: [],
  canAccessModule: () => true,
  canEditModule: () => false,
  canDeleteModule: () => false,
  canImportModule: () => false,
  canAdminModule: () => false,
  canCloseCycle: () => false,
  isCoordinator: () => false,
  isGestor: () => false,
  getTeamFilter: () => null,
  login: async () => ({ success: false }),
  logout: () => {},
  refreshProfile: async () => {},
});

export const useSystemAuth = () => useContext(SystemAuthContext);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// Known admin emails
const ADMIN_EMAILS = ['brunaramos1807@gmail.com', 'bruna.silva@zetti.tech', 'admin@zetti.com.br'];

// Roles that are admin-level
const ADMIN_ROLES: string[] = ['Admin', 'Administrador'];

// Roles that are coordinator-level
const COORDINATOR_ROLES: string[] = ['Coordenador', 'Coordenador Geral', 'Coordenadora Qualidade', 'QA', 'Auditor'];

// Roles that are gestor-level (read-only broad access)
const GESTOR_ROLES: string[] = ['Gestor', 'Gerente', 'Diretoria'];

function buildSupabaseSession(supaUser: any): SessionData {
  const email: string = supaUser.email || '';
  const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
  const now = Date.now();
  return {
    userId: supaUser.id,
    email,
    nome: supaUser.user_metadata?.full_name || email.split('@')[0] || 'Usuário',
    cargo: isAdminEmail ? 'Administrador' : 'Coordenador',
    permissoes: isAdminEmail ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS,
    loginAt: now,
    lastActivity: now,
  };
}

interface UserProfileData {
  role: UserRole | null;
  squad: string | null;
  squads: string[];
  cargo_id: string | null;
  cargo_nome: string | null;
  is_admin_master: boolean;
  full_name: string | null;
}

// ─── Profile cache (sessionStorage) ─────────────────────────────────────────
const PROFILE_CACHE_KEY = 'zetti_user_profile_cache_v2';
const PERMS_CACHE_KEY = 'zetti_user_perms_cache_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

function clearProfileCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(PERMS_CACHE_KEY);
  } catch { /* ignore */ }
}

async function fetchFullUserProfile(userId: string, email: string): Promise<UserProfileData> {
  const cacheKey = `${PROFILE_CACHE_KEY}_${userId}`;
  const cached = readCache<UserProfileData>(cacheKey);
  if (cached) return cached;

  const empty: UserProfileData = {
    role: null, squad: null, squads: [], cargo_id: null,
    cargo_nome: null, is_admin_master: false, full_name: null,
  };
  try {
    const supabase = createClient();
    if (!supabase) return empty;

    // Run both queries in parallel
    const [profileResult, preRegResult] = await Promise.all([
      supabase.from('user_profiles').select('role, squad, squads, equipes, cargo_id, full_name').eq('id', userId).maybeSingle(),
      supabase.from('pre_registered_users').select('role, squad, squads, cargo_id, full_name').eq('email', email.toLowerCase()).maybeSingle(),
    ]);

    const source = profileResult.data || preRegResult.data;
    if (!source) {
      if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        const result: UserProfileData = { role: 'Admin', squad: null, squads: [], cargo_id: null, cargo_nome: 'Admin Master', is_admin_master: true, full_name: null };
        writeCache(cacheKey, result);
        return result;
      }
      return empty;
    }

    const role = (source.role as UserRole) || null;
    const squad = source.squad || null;
    const squads: string[] = Array.isArray(source.squads) && source.squads.length > 0
      ? source.squads
      : squad ? [squad] : [];
    const cargo_id = source.cargo_id || null;

    // Fetch cargo details only if needed
    let cargo_nome: string | null = null;
    let is_admin_master = false;
    if (cargo_id) {
      const { data: cargo } = await supabase
        .from('cargos')
        .select('nome, is_admin_master')
        .eq('id', cargo_id)
        .maybeSingle();
      if (cargo) {
        cargo_nome = cargo.nome;
        is_admin_master = cargo.is_admin_master || false;
      }
    }

    if (ADMIN_EMAILS.includes(email.toLowerCase())) is_admin_master = true;
    if (ADMIN_ROLES.includes(role || '')) is_admin_master = true;

    const result: UserProfileData = { role, squad, squads, cargo_id, cargo_nome, is_admin_master, full_name: source.full_name || null };
    writeCache(cacheKey, result);
    return result;
  } catch {
    return empty;
  }
}

async function fetchModulePermissions(userId: string): Promise<ModulePermission[]> {
  const cacheKey = `${PERMS_CACHE_KEY}_${userId}`;
  const cached = readCache<ModulePermission[]>(cacheKey);
  if (cached) return cached;

  try {
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_profile_id', userId);
    const result = (data || []) as ModulePermission[];
    if (result.length > 0) writeCache(cacheKey, result);
    return result;
  } catch {
    return [];
  }
}

// Build default permissions based on role
function buildDefaultPermissions(role: UserRole | null, isAdminMaster: boolean): ModulePermission[] {
  const ALL_MODULES = [
    'painel_executivo','evolucao','analytics','ciclo_atual','ciclos',
    'auditoria','importacoes','nao_conformidades','elogios','pdis',
    'calibragem','historico','logs','documentos_iso','gestao',
    'configuracoes','analistas',
  ];

  if (isAdminMaster || ADMIN_ROLES.includes(role || '')) {
    return ALL_MODULES.map((m) => ({
      module_name: m,
      can_view: true, can_edit: true, can_delete: true, can_import: true,
      can_export: true, can_close_cycle: true, can_reopen_cycle: true,
      can_approve: true, can_admin: true,
    }));
  }

  if (COORDINATOR_ROLES.includes(role || '')) {
    return ALL_MODULES.map((m) => ({
      module_name: m,
      can_view: true,
      can_edit: !['configuracoes'].includes(m),
      can_delete: false,
      can_import: ['importacoes','ciclo_atual','auditoria'].includes(m),
      can_export: true,
      can_close_cycle: ['ciclos','ciclo_atual','importacoes'].includes(m),
      can_reopen_cycle: false,
      can_approve: ['pdis','nao_conformidades','calibragem'].includes(m),
      can_admin: false,
    }));
  }

  if (GESTOR_ROLES.includes(role || '')) {
    return ALL_MODULES.map((m) => ({
      module_name: m,
      can_view: !['configuracoes'].includes(m),
      can_edit: false,
      can_delete: false,
      can_import: false,
      can_export: true,
      can_close_cycle: false,
      can_reopen_cycle: false,
      can_approve: false,
      can_admin: false,
    }));
  }

  // Default: minimal access — only executive panel
  return ALL_MODULES.map((m) => ({
    module_name: m,
    can_view: ['painel_executivo','evolucao','ciclo_atual','nao_conformidades','elogios','pdis','historico','analytics'].includes(m),
    can_edit: false, can_delete: false, can_import: false,
    can_export: false, can_close_cycle: false, can_reopen_cycle: false,
    can_approve: false, can_admin: false,
  }));
}

export function SystemAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userSquad, setUserSquad] = useState<string | null>(null);
  const [userSquads, setUserSquads] = useState<string[]>([]);
  const [userCargoId, setUserCargoId] = useState<string | null>(null);
  const [userCargoNome, setUserCargoNome] = useState<string | null>(null);
  const [isAdminMaster, setIsAdminMaster] = useState(false);
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = isAdminMaster || ADMIN_ROLES.includes(userRole || '') || ADMIN_EMAILS.includes(session?.email?.toLowerCase() || '');

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
      setModulePermissions([]);
    }, INACTIVITY_TIMEOUT);
  }, []);

  const resetTimer = useCallback(() => {
    if (session) startInactivityTimer();
  }, [session, startInactivityTimer]);

  const applyProfile = useCallback(
    async (userId: string, email: string, baseSession: SessionData) => {
      const profile = await fetchFullUserProfile(userId, email);

      // Update session name if we got a better one
      if (profile.full_name) {
        baseSession.nome = profile.full_name;
      }

      const role = profile.role || (ADMIN_EMAILS.includes(email.toLowerCase()) ? 'Admin' : 'Coordenador');
      setUserRole(role as UserRole);
      setUserSquad(profile.squad);
      setUserSquads(profile.squads);
      setUserCargoId(profile.cargo_id);
      setUserCargoNome(profile.cargo_nome);
      setIsAdminMaster(profile.is_admin_master);

      // Load module permissions from DB
      const dbPerms = await fetchModulePermissions(userId);
      if (dbPerms.length > 0) {
        setModulePermissions(dbPerms);
      } else {
        // Build default permissions based on role
        setModulePermissions(buildDefaultPermissions(role as UserRole, profile.is_admin_master));
      }
    },
    [],
  );

  const applySupabaseUser = useCallback(
    async (supaUser: any) => {
      const derived = buildSupabaseSession(supaUser);
      setSession(derived);
      startInactivityTimer();
      await applyProfile(supaUser.id, supaUser.email || '', derived);
    },
    [startInactivityTimer, applyProfile],
  );

  // ─── Whitelist check: verify user is pre-registered before granting access ──
  const checkWhitelist = useCallback(async (email: string): Promise<boolean> => {
    const lowerEmail = email.toLowerCase();
    // Admin emails always allowed
    if (ADMIN_EMAILS.includes(lowerEmail)) return true;
    try {
      const supabase = createClient();
      if (!supabase) return false;
      const { data, error } = await supabase
        .from('pre_registered_users')
        .select('id, is_active')
        .eq('email', lowerEmail)
        .maybeSingle();
      if (error) {
        console.warn('[AUTH] whitelist check error:', error.message);
        return false;
      }
      return !!(data && data.is_active !== false);
    } catch {
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session) return;
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await applyProfile(user.id, user.email || '', session);
    }
  }, [session, applyProfile]);

  useEffect(() => {
    const init = async () => {
      await seedDefaultAdmin();

      const supabase = createClient();
      if (supabase) {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user) {
          // ── Whitelist check for existing session ──────────────────────────
          const allowed = await checkWhitelist(supaSession.user.email || '');
          if (!allowed) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          await applySupabaseUser(supaSession.user);
          setLoading(false);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession?.user) {
              // ── Whitelist check on every sign-in event ───────────────────
              const ok = await checkWhitelist(newSession.user.email || '');
              if (!ok) {
                await supabase.auth.signOut();
                return;
              }
              await applySupabaseUser(newSession.user);
            } else if (event === 'SIGNED_OUT') {
              setSession(null);
              setUserRole(null);
              setUserSquad(null);
              setUserSquads([]);
              setModulePermissions([]);
              setIsAdminMaster(false);
            }
          });
          return () => subscription.unsubscribe();
        }

        // No Supabase session — check localStorage
        const localSession = getCurrentSession();
        if (localSession) {
          setSession(localSession);
          startInactivityTimer();

          // Map local cargo to role
          const cargoToRole: Record<string, UserRole> = {
            'Administrador': 'Admin',
            'Coordenador': 'Coordenador',
            'Coordenador Geral': 'Coordenador Geral',
            'Gestor': 'Gestor',
            'Auditor': 'Auditor',
            'Analista': 'Analista',
          };
          const derivedRole = (cargoToRole[localSession.cargo] || 'Coordenador') as UserRole;
          setUserRole(derivedRole);

          const isAdminLocal = ADMIN_EMAILS.includes(localSession.email.toLowerCase()) || derivedRole === 'Admin';
          setIsAdminMaster(isAdminLocal);

          // Try to enrich from Supabase
          try {
            const { data: preReg } = await supabase
              .from('pre_registered_users')
              .select('role, squad, squads, cargo_id')
              .eq('email', localSession.email.toLowerCase())
              .maybeSingle();
            if (preReg) {
              const r = (preReg.role as UserRole) || derivedRole;
              setUserRole(r);
              setUserSquad(preReg.squad || null);
              setUserSquads(Array.isArray(preReg.squads) ? preReg.squads : (preReg.squad ? [preReg.squad] : []));
              setUserCargoId(preReg.cargo_id || null);
              setModulePermissions(buildDefaultPermissions(r, isAdminLocal));
            } else {
              setModulePermissions(buildDefaultPermissions(derivedRole, isAdminLocal));
            }
          } catch {
            setModulePermissions(buildDefaultPermissions(derivedRole, isAdminLocal));
          }

          setLoading(false);
          return;
        }

        // Listen for auth state changes (handles Google OAuth redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            // ── Whitelist check ──────────────────────────────────────────────
            const ok = await checkWhitelist(newSession.user.email || '');
            if (!ok) {
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }
            await applySupabaseUser(newSession.user);
          } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUserRole(null);
            setUserSquad(null);
            setUserSquads([]);
            setModulePermissions([]);
            setIsAdminMaster(false);
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
      cleanup?.then?.((fn: any) => fn?.());
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
    const supabase = createClient();

    // Always check pre-registration first (except known admin emails)
    const isAdminEmail = ADMIN_EMAILS.includes(email.toLowerCase());
    if (!isAdminEmail && supabase) {
      const { data: preReg, error: preRegErr } = await supabase
        .from('pre_registered_users')
        .select('id, is_active')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (preRegErr) {
        console.warn('[AUTH] pre_registered_users check error:', preRegErr.message);
        // On DB error, fall through to credential check
      } else if (!preReg || preReg.is_active === false) {
        return { success: false, error: 'Acesso negado. Usuário não cadastrado no sistema. Entre em contato com o administrador.' };
      }
    }

    // Try Supabase email/password first
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        await applySupabaseUser(data.user);
        return { success: true };
      }
    }

    // Fallback: localStorage-based auth (for admin accounts seeded locally)
    const result = await loginUser(email, password);
    if (result.success && result.session) {
      setSession(result.session);
      startInactivityTimer();
      const cargoToRole: Record<string, UserRole> = {
        'Administrador': 'Admin', 'Coordenador': 'Coordenador',
        'Gestor': 'Gestor', 'Auditor': 'Auditor', 'Analista': 'Analista',
      };
      const role = (cargoToRole[result.session.cargo] || 'Coordenador') as UserRole;
      setUserRole(role);
      const isAdminLocal = ADMIN_EMAILS.includes(email.toLowerCase()) || role === 'Admin';
      setIsAdminMaster(isAdminLocal);
      setModulePermissions(buildDefaultPermissions(role, isAdminLocal));
      return { success: true };
    }

    return { success: false, error: result.error || 'Credenciais inválidas.' };
  };

  const logout = async () => {
    logoutUser();
    clearProfileCache();
    setSession(null);
    setUserRole(null);
    setUserSquad(null);
    setUserSquads([]);
    setUserCargoId(null);
    setUserCargoNome(null);
    setIsAdminMaster(false);
    setModulePermissions([]);
    clearTimer();
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
  };

  // Permission helpers
  const canAccessModule = useCallback((module: string): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === module);
    if (perm) return perm.can_view;
    // Fallback: coordinators and gestors can view most modules
    if (COORDINATOR_ROLES.includes(userRole || '') || GESTOR_ROLES.includes(userRole || '')) return true;
    // Minimum fallback: these modules are always accessible to any authenticated user
    return ['painel_executivo','ciclo_atual','evolucao','nao_conformidades','elogios','pdis','historico','analytics'].includes(module);
  }, [isAdminMaster, userRole, modulePermissions]);

  const canEditModule = useCallback((module: string): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === module);
    return perm?.can_edit || false;
  }, [isAdminMaster, userRole, modulePermissions]);

  const canDeleteModule = useCallback((module: string): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === module);
    return perm?.can_delete || false;
  }, [isAdminMaster, userRole, modulePermissions]);

  const canImportModule = useCallback((module: string): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === module);
    return perm?.can_import || false;
  }, [isAdminMaster, userRole, modulePermissions]);

  const canAdminModule = useCallback((module: string): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === module);
    return perm?.can_admin || false;
  }, [isAdminMaster, userRole, modulePermissions]);

  const canCloseCycle = useCallback((): boolean => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return true;
    const perm = modulePermissions.find((p) => p.module_name === 'ciclos' || p.module_name === 'importacoes');
    return perm?.can_close_cycle || false;
  }, [isAdminMaster, userRole, modulePermissions]);

  const isCoordinator = useCallback((): boolean => {
    return COORDINATOR_ROLES.includes(userRole || '');
  }, [userRole]);

  const isGestor = useCallback((): boolean => {
    return GESTOR_ROLES.includes(userRole || '');
  }, [userRole]);

  // Returns null for "all teams", or array of specific teams for filtered access
  const getTeamFilter = useCallback((): string[] | null => {
    if (isAdminMaster || ADMIN_ROLES.includes(userRole || '')) return null;
    if (GESTOR_ROLES.includes(userRole || '')) return null; // gestors see all
    if (userSquads.length > 0) return userSquads;
    if (userSquad) return [userSquad];
    return null; // no filter = see all (fallback)
  }, [isAdminMaster, userRole, userSquads, userSquad]);

  return (
    <SystemAuthContext.Provider
      value={{
        session,
        loading,
        isAdmin,
        userRole,
        userSquad,
        userSquads,
        userCargoId,
        userCargoNome,
        isAdminMaster,
        modulePermissions,
        canAccessModule,
        canEditModule,
        canDeleteModule,
        canImportModule,
        canAdminModule,
        canCloseCycle,
        isCoordinator,
        isGestor,
        getTeamFilter,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </SystemAuthContext.Provider>
  );
}
