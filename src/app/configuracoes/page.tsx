'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { Shield, Users, Briefcase, Lock, Plus, Edit2, Trash2, X, Save, CheckCircle, Loader2, UserCheck, UserX, Clock, AlertTriangle, RefreshCw, Key, Database,  } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RBACRole = 'Admin' | 'Coordenador' | 'Coordenador Geral' | 'Gestor' | 'Analista Qualidade' | 'Coordenadora Qualidade' | 'Auditor';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: RBACRole;
  squad: string | null;
  squads: string[];
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RBAC_ROLES: RBACRole[] = [
  'Admin',
  'Coordenadora Qualidade',
  'Coordenador Geral',
  'Gestor',
  'Analista Qualidade',
  'Coordenador',
  'Auditor',
];

const SQUAD_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal', 'Todas'];

const ROLE_META: Record<RBACRole, { color: string; description: string; permissions: string[] }> = {
  Admin: {
    color: '#22C55E',
    description: 'Controle total do sistema — todas as equipes, usuários e configurações',
    permissions: ['Acesso total', 'Gerenciar usuários', 'Fechar ciclos', 'Auditoria ISO', 'Exclusões'],
  },
  'Coordenadora Qualidade': {
    color: '#38BDF8',
    description: 'Acesso total à governança, fechamento de ciclo, exclusões e auditoria ISO',
    permissions: ['Acesso total', 'Governança', 'Fechar ciclos', 'Auditoria ISO', 'Exclusões'],
  },
  'Coordenador Geral': {
    color: '#A78BFA',
    description: 'Supervisiona todos os coordenadores e equipes — visão completa',
    permissions: ['Visualizar todas squads', 'Relatórios', 'Analytics', 'Importar'],
  },
  Gestor: {
    color: '#F59E0B',
    description: 'Visão executiva completa — todos os indicadores e dashboards',
    permissions: ['Visualizar tudo', 'Relatórios executivos', 'Analytics', 'Exportar'],
  },
  'Analista Qualidade': {
    color: '#06B6D4',
    description: 'Auditoria, avaliações, NC e consolidação de ciclos',
    permissions: ['Auditoria', 'Avaliações', 'Não conformidades', 'Consolidação'],
  },
  Coordenador: {
    color: '#60A5FA',
    description: 'Visualiza apenas sua squad — dados operacionais da equipe',
    permissions: ['Visualizar squad própria', 'Importar ciclos', 'Relatórios da squad'],
  },
  Auditor: {
    color: '#FB923C',
    description: 'Realiza auditorias e registra não conformidades',
    permissions: ['Auditoria', 'Registrar NCs', 'Visualizar avaliações'],
  },
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0F1B31',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '0.875rem',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.625rem',
  color: '#F8FAFC',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  height: '44px',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

type Tab = 'usuarios' | 'cargos' | 'permissoes' | 'painel';

// ─── Edit User Modal ──────────────────────────────────────────────────────────

interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: () => void;
}

function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [role, setRole] = useState<RBACRole>(user.role);
  const [squad, setSquad] = useState(user.squad || '');
  const [squads, setSquads] = useState<string[]>(user.squads || []);
  const [isActive, setIsActive] = useState(user.is_active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSquad = (sq: string) => {
    setSquads((prev) => prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase não disponível');
      const { error: err } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role,
          squad: squad || null,
          squads: squads.length > 0 ? squads : (squad ? [squad] : []),
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (err) throw err;
      onSave();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar');
    }
    setLoading(false);
  };

  const roleColor = ROLE_META[role]?.color || '#94A3B8';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="font-bold text-white text-base">Editar Perfil de Acesso</h3>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Perfil de Acesso (Role)</label>
            <select value={role} onChange={(e) => setRole(e.target.value as RBACRole)} style={selectStyle}>
              {RBAC_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {role && (
              <div className="mt-2 p-3 rounded-xl" style={{ backgroundColor: `${roleColor}10`, border: `1px solid ${roleColor}25` }}>
                <p className="text-xs mb-1.5" style={{ color: roleColor, fontWeight: 600 }}>{role}</p>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{ROLE_META[role]?.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_META[role]?.permissions.map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}15`, color: roleColor }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Squad (primary) */}
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Squad Principal</label>
            <select value={squad} onChange={(e) => setSquad(e.target.value)} style={selectStyle}>
              <option value="">Sem squad específica</option>
              {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Multi-squad (for Coordenador Geral / Admin) */}
          {(role === 'Coordenador Geral' || role === 'Admin' || role === 'Coordenadora Qualidade') && (
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Squads Visíveis</label>
              <div className="flex flex-wrap gap-2">
                {SQUAD_OPTIONS.map((sq) => (
                  <button
                    key={sq}
                    type="button"
                    onClick={() => toggleSquad(sq)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: squads.includes(sq) ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                      border: squads.includes(sq) ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      color: squads.includes(sq) ? '#38BDF8' : '#94A3B8',
                    }}
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-sm font-medium text-white">Status do Usuário</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Usuários inativos não conseguem acessar o sistema</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: isActive ? '#22C55E' : 'rgba(255,255,255,0.1)' }}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
                style={{ transform: isActive ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
              />
            </button>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

interface AddUserModalProps {
  onClose: () => void;
  onSave: () => void;
}

function AddUserModal({ onClose, onSave }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<RBACRole>('Auditor');
  const [squad, setSquad] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!email.trim() || !fullName.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase não disponível');
      // Insert into user_profiles (user must sign in via Google first to get auth.users entry)
      const { error: err } = await supabase
        .from('user_profiles')
        .insert({
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
          squad: squad || null,
          squads: squad ? [squad] : [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      if (err) throw err;
      onSave();
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar usuário');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white text-base">Pré-cadastrar Usuário</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', color: '#94A3B8' }}>
            O usuário precisa fazer login via Google para criar a conta. Este cadastro define o perfil de acesso que será aplicado automaticamente.
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Nome Completo *</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">E-mail Google *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@gmail.com" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Perfil (Role)</label>
              <select value={role} onChange={(e) => setRole(e.target.value as RBACRole)} style={selectStyle}>
                {RBAC_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Squad</label>
              <select value={squad} onChange={(e) => setSquad(e.target.value)} style={selectStyle}>
                <option value="">Nenhuma</option>
                {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? 'Salvando...' : 'Pré-cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ConfiguracoesContent() {
  const { userRole } = useSystemAuth();
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>();
  const [showAddUser, setShowAddUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setUsers(data as UserProfile[]);
      }
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (userId: string) => {
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('user_profiles').delete().eq('id', userId);
      setDeleteConfirm(null);
      loadUsers();
    } catch (e) {
      console.error('Erro ao excluir:', e);
    }
    setDeleteLoading(false);
  };

  const handleSaveSuccess = (msg: string) => {
    setSaveSuccess(msg);
    loadUsers();
    setEditingUser(undefined);
    setShowAddUser(false);
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'usuarios', label: 'Usuários & Acessos', icon: <Users size={14} /> },
    { id: 'cargos', label: 'Perfis de Acesso', icon: <Briefcase size={14} /> },
    { id: 'permissoes', label: 'Matriz de Permissões', icon: <Lock size={14} /> },
    { id: 'painel', label: 'Painel Admin', icon: <Shield size={14} /> },
  ];

  const activeUsers = users.filter((u) => u.is_active !== false);
  const inactiveUsers = users.filter((u) => u.is_active === false);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Success toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />
          {saveSuccess}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Shield size={20} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-sm" style={{ color: '#94A3B8' }}>Gerenciamento RBAC — usuários, perfis e controle de acesso</p>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <Database size={13} style={{ color: '#38BDF8' }} />
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Dados sincronizados com <strong className="text-white">Supabase</strong> · Perfis de acesso aplicados em tempo real via RBAC
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
              color: activeTab === tab.id ? '#FFFFFF' : '#94A3B8',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Usuários & Acessos ── */}
      {activeTab === 'usuarios' && (
        <div style={cardStyle}>
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-base font-semibold text-white">Usuários Cadastrados</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {users.length} usuário{users.length !== 1 ? 's' : ''} · {activeUsers.length} ativo{activeUsers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadUsers} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.2)' }}
              >
                <Plus size={14} /> Pré-cadastrar
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Usuário', 'E-mail', 'Perfil (Role)', 'Squad', 'Status', 'Cadastrado em', 'Ações'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const roleMeta = ROLE_META[u.role] || { color: '#94A3B8' };
                    const initials = (u.full_name || u.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: roleMeta.color, opacity: u.is_active === false ? 0.5 : 1 }}
                            >
                              {initials}
                            </div>
                            <span className="font-medium text-white text-sm">{u.full_name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: `${roleMeta.color}18`, color: roleMeta.color, border: `1px solid ${roleMeta.color}30` }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{u.squad || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: u.is_active !== false ? '#22C55E' : '#EF4444' }}>
                            {u.is_active !== false ? <UserCheck size={12} /> : <UserX size={12} />}
                            {u.is_active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>
                          {u.created_at ? (
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(u.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#60A5FA' }}
                              title="Editar perfil"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#EF4444' }}
                              title="Remover"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
                        <Database size={32} className="mx-auto mb-3 opacity-30" />
                        Nenhum usuário cadastrado no Supabase
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Perfis de Acesso ── */}
      {activeTab === 'cargos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {RBAC_ROLES.map((role) => {
              const meta = ROLE_META[role];
              const count = users.filter((u) => u.role === role).length;
              return (
                <div key={role} className="p-5 rounded-2xl" style={cardStyle}>
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}25` }}
                    >
                      <Key size={18} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white">{role}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                          {count}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: '#94A3B8' }}>{meta.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {meta.permissions.map((p) => (
                          <span key={p} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${meta.color}10`, color: meta.color }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {count > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>Usuários:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {users.filter((u) => u.role === role).map((u) => (
                          <span key={u.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#F8FAFC' }}>
                            {(u.full_name || u.email || '').split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Matriz de Permissões ── */}
      {activeTab === 'permissoes' && (
        <div style={cardStyle}>
          <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white">Matriz de Permissões por Perfil</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Visão consolidada das permissões por role no sistema</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="text-left py-3 px-4 font-semibold uppercase tracking-wide" style={{ color: '#94A3B8', minWidth: '180px' }}>Permissão</th>
                  {RBAC_ROLES.map((r) => (
                    <th key={r} className="text-center py-3 px-3 font-semibold" style={{ color: ROLE_META[r].color, minWidth: '100px' }}>
                      {r.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Acesso Total', key: 'total', roles: ['Admin', 'Coordenadora Qualidade'] },
                  { label: 'Visualizar Todas Squads', key: 'all_squads', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral', 'Gestor'] },
                  { label: 'Visualizar Squad Própria', key: 'own_squad', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral', 'Gestor', 'Analista Qualidade', 'Coordenador', 'Auditor'] },
                  { label: 'Importar Ciclos', key: 'import', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral', 'Analista Qualidade', 'Coordenador'] },
                  { label: 'Fechar Ciclo', key: 'close_cycle', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral'] },
                  { label: 'Auditoria ISO', key: 'audit', roles: ['Admin', 'Coordenadora Qualidade', 'Analista Qualidade', 'Auditor'] },
                  { label: 'Gerenciar Usuários', key: 'manage_users', roles: ['Admin'] },
                  { label: 'Excluir Registros', key: 'delete', roles: ['Admin', 'Coordenadora Qualidade'] },
                  { label: 'Exportar Relatórios', key: 'export', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral', 'Gestor', 'Analista Qualidade'] },
                  { label: 'Analytics Executivo', key: 'analytics', roles: ['Admin', 'Coordenadora Qualidade', 'Coordenador Geral', 'Gestor'] },
                ].map((row, i) => (
                  <tr
                    key={row.key}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  >
                    <td className="py-3 px-4 font-medium text-white">{row.label}</td>
                    {RBAC_ROLES.map((r) => (
                      <td key={r} className="py-3 px-3 text-center">
                        {row.roles.includes(r) ? (
                          <span style={{ color: '#22C55E', fontSize: '1rem' }}>✓</span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Painel Admin ── */}
      {activeTab === 'painel' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Usuários', value: users.length, color: '#38BDF8', icon: <Users size={18} /> },
              { label: 'Usuários Ativos', value: activeUsers.length, color: '#22C55E', icon: <UserCheck size={18} /> },
              { label: 'Usuários Inativos', value: inactiveUsers.length, color: '#EF4444', icon: <UserX size={18} /> },
              { label: 'Admins', value: users.filter((u) => u.role === 'Admin').length, color: '#F59E0B', icon: <Shield size={18} /> },
            ].map((card) => (
              <div key={card.label} className="p-5 rounded-2xl" style={cardStyle}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{card.value}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{card.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Role distribution */}
          <div className="p-5 rounded-2xl" style={cardStyle}>
            <h3 className="text-sm font-semibold text-white mb-4">Distribuição por Perfil</h3>
            <div className="space-y-3">
              {RBAC_ROLES.map((role) => {
                const count = users.filter((u) => u.role === role).length;
                const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                const meta = ROLE_META[role];
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-40 flex-shrink-0" style={{ color: meta.color }}>{role}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: meta.color, opacity: 0.7 }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: '#94A3B8' }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent users */}
          <div className="p-5 rounded-2xl" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Usuários Recentes</h3>
              <button
                onClick={() => setActiveTab('usuarios')}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}
              >
                Ver todos
              </button>
            </div>
            <div className="space-y-2">
              {users.slice(0, 5).map((u) => {
                const meta = ROLE_META[u.role] || { color: '#94A3B8' };
                return (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: meta.color }}>
                      {(u.full_name || u.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.full_name || u.email}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>{u.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                      {u.role}
                    </span>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-center py-6 text-sm" style={{ color: '#94A3B8' }}>Nenhum usuário cadastrado</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="p-5 rounded-2xl" style={cardStyle}>
            <h3 className="text-sm font-semibold text-white mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Pré-cadastrar Usuário', icon: <Plus size={15} />, color: '#1E40AF', action: () => setShowAddUser(true) },
                { label: 'Gerenciar Perfis', icon: <Key size={15} />, color: '#7C3AED', action: () => setActiveTab('cargos') },
                { label: 'Matriz de Permissões', icon: <Lock size={15} />, color: '#D97706', action: () => setActiveTab('permissoes') },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium text-left transition-all hover:opacity-90"
                  style={{ backgroundColor: `${action.color}15`, border: `1px solid ${action.color}25`, color: action.color }}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(undefined)}
          onSave={() => handleSaveSuccess('Perfil de acesso atualizado com sucesso!')}
        />
      )}

      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSave={() => handleSaveSuccess('Usuário pré-cadastrado com sucesso!')}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Remover Usuário</h3>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#DC2626' }}
              >
                {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <EnterpriseLayout requireAdmin>
      <ConfiguracoesContent />
    </EnterpriseLayout>
  );
}
