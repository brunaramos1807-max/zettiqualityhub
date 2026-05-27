'use client';

import { createClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RBACPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_import: boolean;
  can_export: boolean;
  can_generate_link: boolean;
  can_present: boolean;
  can_close_cycle: boolean;
  can_reopen_cycle: boolean;
  can_approve: boolean;
  can_admin: boolean;
}

export interface UserScopePermission {
  escopo_tipo: 'all' | 'squad' | 'analistas' | 'proprio';
  squads_visiveis: string[];
  squads_editaveis: string[];
  squads_gerenciaveis: string[];
}

const DEFAULT_PERMISSIONS: RBACPermissions = {
  can_view: true,   // fallback: visualizar = true
  can_edit: false,
  can_delete: false,
  can_import: false,
  can_export: false,
  can_generate_link: false,
  can_present: false,
  can_close_cycle: false,
  can_reopen_cycle: false,
  can_approve: false,
  can_admin: false,
};

// Cache to avoid repeated DB calls
const permCache = new Map<string, RBACPermissions>();
const scopeCache = new Map<string, UserScopePermission>();

// ─── Load permissions for a user + module from DB ────────────────────────────
export async function loadUserPermissions(userId: string, moduleName: string): Promise<RBACPermissions> {
  const cacheKey = `${userId}:${moduleName}`;
  if (permCache.has(cacheKey)) return permCache.get(cacheKey)!;

  const supabase = createClient();

  const { data } = await supabase
    .from('user_permissions')
    .select('can_view, can_edit, can_delete, can_import, can_export, can_generate_link, can_present, can_close_cycle, can_reopen_cycle, can_approve, can_admin')
    .eq('user_profile_id', userId)
    .eq('module_name', moduleName)
    .maybeSingle();

  const perms: RBACPermissions = data
    ? {
        can_view: data.can_view ?? true,
        can_edit: data.can_edit ?? false,
        can_delete: data.can_delete ?? false,
        can_import: data.can_import ?? false,
        can_export: data.can_export ?? false,
        can_generate_link: (data as any).can_generate_link ?? false,
        can_present: (data as any).can_present ?? false,
        can_close_cycle: data.can_close_cycle ?? false,
        can_reopen_cycle: data.can_reopen_cycle ?? false,
        can_approve: data.can_approve ?? false,
        can_admin: data.can_admin ?? false,
      }
    : { ...DEFAULT_PERMISSIONS };

  permCache.set(cacheKey, perms);
  return perms;
}

// ─── Load scope for a user ────────────────────────────────────────────────────
export async function loadUserScope(userId: string): Promise<UserScopePermission> {
  if (scopeCache.has(userId)) return scopeCache.get(userId)!;

  const supabase = createClient();

  const { data } = await supabase
    .from('user_scope_permissions')
    .select('escopo_tipo, squads_visiveis, squads_editaveis, squads_gerenciaveis')
    .eq('user_id', userId)
    .maybeSingle();

  const scope: UserScopePermission = data
    ? {
        escopo_tipo: (data.escopo_tipo as any) || 'proprio',
        squads_visiveis: data.squads_visiveis || [],
        squads_editaveis: data.squads_editaveis || [],
        squads_gerenciaveis: data.squads_gerenciaveis || [],
      }
    : {
        escopo_tipo: 'proprio',
        squads_visiveis: [],
        squads_editaveis: [],
        squads_gerenciaveis: [],
      };

  scopeCache.set(userId, scope);
  return scope;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function canAccess(perms: RBACPermissions): boolean {
  return perms.can_view;
}

export function canEdit(perms: RBACPermissions): boolean {
  return perms.can_edit;
}

export function canDelete(perms: RBACPermissions): boolean {
  return perms.can_delete;
}

export function canImport(perms: RBACPermissions): boolean {
  return perms.can_import;
}

export function canExport(perms: RBACPermissions): boolean {
  return perms.can_export;
}

export function canGeneratePublicLink(perms: RBACPermissions): boolean {
  return perms.can_generate_link;
}

export function canPresent(perms: RBACPermissions): boolean {
  return perms.can_present;
}

export function canCloseCycle(perms: RBACPermissions): boolean {
  return perms.can_close_cycle;
}

export function canReopenCycle(perms: RBACPermissions): boolean {
  return perms.can_reopen_cycle;
}

export function canApprove(perms: RBACPermissions): boolean {
  return perms.can_approve;
}

export function isAdmin(perms: RBACPermissions): boolean {
  return perms.can_admin;
}

// ─── Clear cache (call on logout) ────────────────────────────────────────────
export function clearPermissionsCache(): void {
  permCache.clear();
  scopeCache.clear();
}
