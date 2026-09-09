'use client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SystemRole =
  'Administrador' | 'Coordenador' | 'Gestor' | 'Coordenador Geral' | 'Auditor';

export interface UserPermissions {
  acesso_total: boolean;
  visualizar_todas_equipes: boolean;
  visualizar_equipes_especificas: string[]; // list of team names
  permissao_editar: boolean;
  permissao_visualizar: boolean;
  permissao_cadastrar_usuarios: boolean;
  permissao_excluir_usuarios: boolean;
  permissao_acessar_relatorios: boolean;
}

export interface SystemUser {
  id: string;
  nome_completo: string;
  email: string;
  senha_hash: string; // bcrypt-style hash stored as base64 encoded
  status: 'Ativo' | 'Inativo';
  cargo: SystemRole;
  equipe: string;
  permissoes: UserPermissions;
  ultimo_acesso?: string; // ISO date string
  criado_em: string;
  atualizado_em: string;
}

export interface SessionData {
  userId: string;
  email: string;
  nome: string;
  cargo: SystemRole;
  permissoes: UserPermissions;
  loginAt: number; // timestamp
  lastActivity: number; // timestamp
}

// ─── Constants ───────────────────────────────────────────────────────────────

const USERS_KEY = 'zetti_system_users';
const SESSION_KEY = 'zetti_session';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const SYSTEM_ROLES: SystemRole[] = [
  'Administrador',
  'Coordenador',
  'Gestor',
  'Coordenador Geral',
  'Auditor',
];

export const TEAM_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal', 'Todas'];

export const DEFAULT_PERMISSIONS: UserPermissions = {
  acesso_total: false,
  visualizar_todas_equipes: false,
  visualizar_equipes_especificas: [],
  permissao_editar: false,
  permissao_visualizar: true,
  permissao_cadastrar_usuarios: false,
  permissao_excluir_usuarios: false,
  permissao_acessar_relatorios: false,
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  acesso_total: true,
  visualizar_todas_equipes: true,
  visualizar_equipes_especificas: [],
  permissao_editar: true,
  permissao_visualizar: true,
  permissao_cadastrar_usuarios: true,
  permissao_excluir_usuarios: true,
  permissao_acessar_relatorios: true,
};

// ─── Password Utilities ───────────────────────────────────────────────────────

// Simple but secure enough for localStorage: SHA-256 via Web Crypto
async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined') return btoa(password);
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'zetti_salt_2026');
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getUsers(): SystemUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: SystemUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: SessionData = JSON.parse(raw);
    // Check inactivity timeout
    if (Date.now() - session.lastActivity > INACTIVITY_TIMEOUT) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveSession(session: SessionData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  const session = getSession();
  if (session) {
    session.lastActivity = Date.now();
    saveSession(session);
  }
}

// ─── Seed Default Admin ───────────────────────────────────────────────────────

export async function seedDefaultAdmin(): Promise<void> {
  const users = getUsers();

  // Always ensure the primary admin exists
  const adminExists = users.some((u) => u.email.toLowerCase() === 'admin@zetti.com.br');
  if (!adminExists) {
    const adminHash = await hashPassword('ZettiAdmin@2026');
    const now = new Date().toISOString();
    const admin: SystemUser = {
      id: 'user-admin-001',
      nome_completo: 'Administrador Zetti',
      email: 'admin@zetti.com.br',
      senha_hash: adminHash,
      status: 'Ativo',
      cargo: 'Administrador',
      equipe: 'Todas',
      permissoes: ADMIN_PERMISSIONS,
      criado_em: now,
      atualizado_em: now,
    };
    saveUsers([...getUsers(), admin]);
  }

  // Always ensure brunaramos1807@gmail.com exists as Admin with correct password
  const brunaIdx = getUsers().findIndex(
    (u) => u.email.toLowerCase() === 'brunaramos1807@gmail.com'
  );
  if (brunaIdx === -1) {
    const brunaHash = await hashPassword('ZettiAdmin@2026');
    const now = new Date().toISOString();
    const bruna: SystemUser = {
      id: 'user-admin-bruna',
      nome_completo: 'Bruna Ramos',
      email: 'brunaramos1807@gmail.com',
      senha_hash: brunaHash,
      status: 'Ativo',
      cargo: 'Administrador',
      equipe: 'Todas',
      permissoes: ADMIN_PERMISSIONS,
      criado_em: now,
      atualizado_em: now,
    };
    saveUsers([...getUsers(), bruna]);
  } else {
    // Ensure existing bruna account has admin permissions and is active
    const currentUsers = getUsers();
    const bruna = currentUsers[brunaIdx];
    if (
      bruna.cargo !== 'Administrador' ||
      !bruna.permissoes.acesso_total ||
      bruna.status !== 'Ativo'
    ) {
      currentUsers[brunaIdx] = {
        ...bruna,
        cargo: 'Administrador',
        status: 'Ativo',
        permissoes: ADMIN_PERMISSIONS,
        atualizado_em: new Date().toISOString(),
      };
      saveUsers(currentUsers);
    }
  }
}

// ─── Auth Functions ───────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; session?: SessionData }> {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'Ativo'
  );

  if (!user) {
    return { success: false, error: 'E-mail não encontrado ou usuário inativo.' };
  }

  const valid = await verifyPassword(password, user.senha_hash);
  if (!valid) {
    return { success: false, error: 'Senha incorreta.' };
  }

  const now = Date.now();
  const session: SessionData = {
    userId: user.id,
    email: user.email,
    nome: user.nome_completo,
    cargo: user.cargo,
    permissoes: user.permissoes,
    loginAt: now,
    lastActivity: now,
  };

  saveSession(session);

  // Update last access
  const updatedUsers = users.map((u) =>
    u.id === user.id ? { ...u, ultimo_acesso: new Date().toISOString() } : u
  );
  saveUsers(updatedUsers);

  return { success: true, session };
}

export function logoutUser(): void {
  clearSession();
}

export function getCurrentSession(): SessionData | null {
  const session = getSession();
  if (session) {
    updateLastActivity();
  }
  return session;
}

export function isAdmin(session: SessionData | null): boolean {
  if (!session) return false;
  return session.cargo === 'Administrador' || session.permissoes.acesso_total === true;
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export async function createUser(data: {
  nome_completo: string;
  email: string;
  senha: string;
  status: 'Ativo' | 'Inativo';
  cargo: SystemRole;
  equipe: string;
  permissoes?: UserPermissions;
}): Promise<{ success: boolean; error?: string; user?: SystemUser }> {
  const users = getUsers();
  const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (exists) {
    return { success: false, error: 'E-mail já cadastrado.' };
  }

  const hash = await hashPassword(data.senha);
  const now = new Date().toISOString();
  const newUser: SystemUser = {
    id: `user-${Date.now()}`,
    nome_completo: data.nome_completo,
    email: data.email,
    senha_hash: hash,
    status: data.status,
    cargo: data.cargo,
    equipe: data.equipe,
    permissoes: data.permissoes ?? DEFAULT_PERMISSIONS,
    criado_em: now,
    atualizado_em: now,
  };

  saveUsers([...users, newUser]);
  return { success: true, user: newUser };
}

export async function updateUser(
  userId: string,
  data: Partial<Omit<SystemUser, 'id' | 'criado_em' | 'senha_hash'>> & { senha?: string }
): Promise<{ success: boolean; error?: string }> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

  const updated = { ...users[idx], ...data, atualizado_em: new Date().toISOString() };

  if (data.senha && data.senha.trim()) {
    updated.senha_hash = await hashPassword(data.senha);
  }
  delete (updated as any).senha;

  users[idx] = updated;
  saveUsers(users);
  return { success: true };
}

export function deleteUser(userId: string): { success: boolean; error?: string } {
  const users = getUsers();
  const filtered = users.filter((u) => u.id !== userId);
  if (filtered.length === users.length) {
    return { success: false, error: 'Usuário não encontrado.' };
  }
  saveUsers(filtered);
  return { success: true };
}

export function getAllUsers(): SystemUser[] {
  return getUsers();
}

export function getUserById(userId: string): SystemUser | undefined {
  return getUsers().find((u) => u.id === userId);
}

// ─── Password Recovery (mock — stores reset token in localStorage) ────────────

export function requestPasswordReset(email: string): { success: boolean; token?: string } {
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false };

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const resets = JSON.parse(localStorage.getItem('zetti_resets') || '{}');
  resets[token] = { email, expires: Date.now() + 15 * 60 * 1000 };
  localStorage.setItem('zetti_resets', JSON.stringify(resets));
  return { success: true, token };
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const resets = JSON.parse(localStorage.getItem('zetti_resets') || '{}');
  const entry = resets[token];
  if (!entry || Date.now() > entry.expires) {
    return { success: false, error: 'Token inválido ou expirado.' };
  }

  const users = getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === entry.email.toLowerCase());
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' };

  users[idx].senha_hash = await hashPassword(newPassword);
  users[idx].atualizado_em = new Date().toISOString();
  saveUsers(users);

  delete resets[token];
  localStorage.setItem('zetti_resets', JSON.stringify(resets));

  return { success: true };
}
