'use client';

import React, { useState, useEffect, useCallback } from 'react';


import EnterpriseLayout from '@/components/EnterpriseLayout';
import { getAllUsers, createUser, updateUser, deleteUser, SYSTEM_ROLES, TEAM_OPTIONS, ADMIN_PERMISSIONS, type SystemUser, type SystemRole, type UserPermissions,  } from '@/lib/authSystem';
import {
  Shield,
  Users,
  Briefcase,
  Lock,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
} from 'lucide-react';

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: '#161B22',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.5rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

const ROLE_COLORS: Record<SystemRole, string> = {
  Administrador: '#22C55E',
  Coordenador: '#60A5FA',
  Gestor: '#A78BFA',
  'Coordenador Geral': '#F59E0B',
  Auditor: '#FB923C',
};

const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  Administrador: 'Controle total do sistema — todas as equipes, usuários e configurações',
  Coordenador: 'Gerencia sua equipe, visualiza dados e pode importar ciclos',
  Gestor: 'Visualiza indicadores e relatórios de todas as equipes',
  'Coordenador Geral': 'Supervisiona todos os coordenadores e equipes',
  Auditor: 'Realiza auditorias e registra não conformidades',
};

// ─── Permission Labels ────────────────────────────────────────────────────────

const PERMISSION_LABELS: { key: keyof UserPermissions; label: string; description: string }[] = [
  { key: 'acesso_total', label: 'Acesso Total ao Sistema', description: 'Todas as permissões habilitadas automaticamente' },
  { key: 'visualizar_todas_equipes', label: 'Visualizar Todas as Equipes', description: 'Acesso a dados de todas as squads' },
  { key: 'permissao_editar', label: 'Permissão para Editar', description: 'Pode editar registros e dados existentes' },
  { key: 'permissao_visualizar', label: 'Permissão para Visualizar', description: 'Acesso somente leitura ao sistema' },
  { key: 'permissao_cadastrar_usuarios', label: 'Cadastrar Usuários', description: 'Pode criar novos usuários no sistema' },
  { key: 'permissao_excluir_usuarios', label: 'Excluir Usuários', description: 'Pode remover usuários do sistema' },
  { key: 'permissao_acessar_relatorios', label: 'Acessar Relatórios', description: 'Visualiza relatórios e exportações' },
];

// ─── Tab Types ────────────────────────────────────────────────────────────────

type Tab = 'usuarios' | 'cargos' | 'permissoes' | 'painel';

// ─── User Form Modal ──────────────────────────────────────────────────────────

interface UserFormProps {
  user?: SystemUser;
  onClose: () => void;
  onSave: () => void;
}

function UserFormModal({ user, onClose, onSave }: UserFormProps) {
  const isEdit = !!user;
  const [nome, setNome] = useState(user?.nome_completo || '');
  const [email, setEmail] = useState(user?.email || '');
  const [senha, setSenha] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>(user?.status || 'Ativo');
  const [cargo, setCargo] = useState<SystemRole>(user?.cargo || 'Auditor');
  const [equipe, setEquipe] = useState(user?.equipe || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nome.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    if (!isEdit && !senha.trim()) { setError('Senha é obrigatória para novo usuário.'); return; }
    if (senha && senha.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setLoading(true);
    setError('');

    if (isEdit) {
      const result = await updateUser(user!.id, { nome_completo: nome, email, status, cargo, equipe, ...(senha ? { senha } : {}) });
      if (!result.success) { setError(result.error || 'Erro ao atualizar.'); setLoading(false); return; }
    } else {
      const result = await createUser({ nome_completo: nome, email, senha, status, cargo, equipe });
      if (!result.success) { setError(result.error || 'Erro ao criar usuário.'); setLoading(false); return; }
    }
    setLoading(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-white">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#8B949E' }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Nome Completo *</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do usuário" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">E-mail *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@zetti.com.br" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">
              Senha {isEdit ? '(deixe em branco para manter)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={isEdit ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
                style={{ ...inputStyle, paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: '#8B949E' }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')} style={selectStyle}>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Cargo</label>
              <select value={cargo} onChange={(e) => setCargo(e.target.value as SystemRole)} style={selectStyle}>
                {SYSTEM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white mb-1.5">Equipe Vinculada</label>
            <select value={equipe} onChange={(e) => setEquipe(e.target.value)} style={selectStyle}>
              <option value="">Selecione a equipe</option>
              {TEAM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/10" style={{ color: '#8B949E', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#1E40AF' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permissions Editor ───────────────────────────────────────────────────────

interface PermissionsEditorProps {
  user: SystemUser;
  onClose: () => void;
  onSave: () => void;
}

function PermissionsEditor({ user, onClose, onSave }: PermissionsEditorProps) {
  const [perms, setPerms] = useState<UserPermissions>({ ...user.permissoes });
  const [teamInput, setTeamInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (key: keyof UserPermissions) => {
    if (key === 'visualizar_equipes_especificas') return;
    setPerms((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'acesso_total' && next.acesso_total) {
        return { ...ADMIN_PERMISSIONS, visualizar_equipes_especificas: prev.visualizar_equipes_especificas };
      }
      return next;
    });
  };

  const addTeam = () => {
    if (!teamInput || perms.visualizar_equipes_especificas.includes(teamInput)) return;
    setPerms((prev) => ({ ...prev, visualizar_equipes_especificas: [...prev.visualizar_equipes_especificas, teamInput] }));
    setTeamInput('');
  };

  const removeTeam = (team: string) => {
    setPerms((prev) => ({ ...prev, visualizar_equipes_especificas: prev.visualizar_equipes_especificas.filter((t) => t !== team) }));
  };

  const handleSave = async () => {
    setLoading(true);
    await updateUser(user.id, { permissoes: perms });
    setLoading(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-lg font-bold text-white">Permissões</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#8B949E' }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs mb-6" style={{ color: '#8B949E' }}>{user.nome_completo} — {user.cargo}</p>

        <div className="space-y-3">
          {PERMISSION_LABELS.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-start justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => toggle(key)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{description}</p>
              </div>
              <div
                className="w-10 h-5 rounded-full flex-shrink-0 relative transition-colors mt-0.5"
                style={{ backgroundColor: (perms[key] as boolean) ? '#1E40AF' : 'rgba(255,255,255,0.1)' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: (perms[key] as boolean) ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Specific teams */}
        <div className="mt-4">
          <p className="text-xs font-medium text-white mb-2">Equipes específicas visíveis</p>
          <div className="flex gap-2 mb-2">
            <select value={teamInput} onChange={(e) => setTeamInput(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
              <option value="">Selecionar equipe</option>
              {TEAM_OPTIONS.filter((t) => !perms.visualizar_equipes_especificas.includes(t)).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button onClick={addTeam} className="px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {perms.visualizar_equipes_especificas.map((team) => (
              <span key={team} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                {team}
                <button onClick={() => removeTeam(team)} className="hover:text-white transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/10" style={{ color: '#8B949E', border: '1px solid rgba(255,255,255,0.1)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#1E40AF' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar Permissões
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ConfiguracoesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | undefined>();
  const [permissionsUser, setPermissionsUser] = useState<SystemUser | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    setUsers(getAllUsers());
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = (userId: string) => {
    deleteUser(userId);
    loadUsers();
    setDeleteConfirm(null);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'usuarios', label: 'Cadastro de Usuários', icon: <Users size={15} /> },
    { id: 'cargos', label: 'Cadastro de Cargos', icon: <Briefcase size={15} /> },
    { id: 'permissoes', label: 'Controle de Acessos', icon: <Lock size={15} /> },
    { id: 'painel', label: 'Painel Administrativo', icon: <Shield size={15} /> },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <main className="flex-1">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
              <Shield size={20} style={{ color: '#22C55E' }} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Configurações
              </h1>
              <p className="text-sm" style={{ color: '#8B949E' }}>Gerenciamento de usuários, cargos e controle de acesso</p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <CheckCircle size={14} style={{ color: '#22C55E' }} />
            <p className="text-xs" style={{ color: '#22C55E' }}>Área restrita — apenas Administradores têm acesso a esta seção.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#8B949E',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Cadastro de Usuários ── */}
        {activeTab === 'usuarios' && (
          <div style={cardStyle}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h2 className="text-base font-semibold text-white">Usuários Cadastrados</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} no sistema</p>
              </div>
              <button
                onClick={() => { setEditingUser(undefined); setShowUserForm(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ backgroundColor: '#1E40AF' }}
              >
                <Plus size={14} /> Novo Usuário
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Usuário', 'E-mail', 'Cargo', 'Equipe', 'Status', 'Último Acesso', 'Ações'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const roleColor = ROLE_COLORS[u.cargo] || '#8B949E';
                    const initials = u.nome_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: roleColor }}>
                              {initials}
                            </div>
                            <span className="font-medium text-white">{u.nome_completo}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                            {u.cargo}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>{u.equipe || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: u.status === 'Ativo' ? '#22C55E' : '#EF4444' }}>
                            {u.status === 'Ativo' ? <UserCheck size={12} /> : <UserX size={12} />}
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>
                          {u.ultimo_acesso ? (
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(u.ultimo_acesso).toLocaleDateString('pt-BR')}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingUser(u); setShowUserForm(true); }}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#60A5FA' }}
                              title="Editar"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => setPermissionsUser(u)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#A78BFA' }}
                              title="Permissões"
                            >
                              <Lock size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                              style={{ color: '#EF4444' }}
                              title="Excluir"
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
                      <td colSpan={7} className="py-12 text-center text-sm" style={{ color: '#8B949E' }}>
                        Nenhum usuário cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: Cadastro de Cargos ── */}
        {activeTab === 'cargos' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {SYSTEM_ROLES.map((role) => {
                const color = ROLE_COLORS[role];
                const count = users.filter((u) => u.cargo === role).length;
                return (
                  <div key={role} style={{ ...cardStyle, padding: '1.5rem' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                        <Briefcase size={20} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-white">{role}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}20`, color }}>
                            {count} usuário{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs mt-2 leading-relaxed" style={{ color: '#8B949E' }}>
                          {ROLE_DESCRIPTIONS[role]}
                        </p>
                      </div>
                    </div>
                    {/* Users in this role */}
                    {count > 0 && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: '#8B949E' }}>Usuários neste cargo:</p>
                        <div className="flex flex-wrap gap-2">
                          {users.filter((u) => u.cargo === role).map((u) => (
                            <span key={u.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9' }}>
                              {u.nome_completo.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} style={{ color: '#60A5FA' }} className="mt-0.5 flex-shrink-0" />
                <p className="text-xs" style={{ color: '#8B949E' }}>
                  Os cargos são fixos e pré-definidos pelo sistema. Para alterar o cargo de um usuário, acesse a aba <strong className="text-white">Cadastro de Usuários</strong> e edite o perfil desejado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Controle de Acessos ── */}
        {activeTab === 'permissoes' && (
          <div style={cardStyle}>
            <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-base font-semibold text-white">Controle de Acessos e Permissões</h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>Clique em um usuário para editar suas permissões individualmente</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {users.map((u) => {
                const roleColor = ROLE_COLORS[u.cargo] || '#8B949E';
                const activePerms = PERMISSION_LABELS.filter(({ key }) => key !== 'visualizar_equipes_especificas' && (u.permissoes[key] as boolean));
                return (
                  <div
                    key={u.id}
                    className="p-4 flex items-start gap-4 cursor-pointer transition-colors hover:bg-white/5"
                    onClick={() => setPermissionsUser(u)}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: roleColor }}>
                      {u.nome_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white">{u.nome_completo}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>{u.cargo}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePerms.map(({ label }) => (
                          <span key={label} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                            {label}
                          </span>
                        ))}
                        {u.permissoes.visualizar_equipes_especificas.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(96,165,250,0.1)', color: '#60A5FA' }}>
                            Equipes: {u.permissoes.visualizar_equipes_especificas.join(', ')}
                          </span>
                        )}
                        {activePerms.length === 0 && u.permissoes.visualizar_equipes_especificas.length === 0 && (
                          <span className="text-xs" style={{ color: '#8B949E' }}>Sem permissões ativas</span>
                        )}
                      </div>
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0" style={{ color: '#A78BFA' }}>
                      <Edit2 size={13} />
                    </button>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div className="py-12 text-center text-sm" style={{ color: '#8B949E' }}>Nenhum usuário cadastrado</div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Painel Administrativo ── */}
        {activeTab === 'painel' && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total de Usuários', value: users.length, color: '#60A5FA', icon: <Users size={18} /> },
                { label: 'Usuários Ativos', value: users.filter((u) => u.status === 'Ativo').length, color: '#22C55E', icon: <UserCheck size={18} /> },
                { label: 'Usuários Inativos', value: users.filter((u) => u.status === 'Inativo').length, color: '#EF4444', icon: <UserX size={18} /> },
                { label: 'Administradores', value: users.filter((u) => u.cargo === 'Administrador').length, color: '#F59E0B', icon: <Shield size={18} /> },
              ].map((card) => (
                <div key={card.label} style={{ ...cardStyle, padding: '1.25rem' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${card.color}20`, color: card.color }}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{card.value}</p>
                      <p className="text-xs" style={{ color: '#8B949E' }}>{card.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Users with last access */}
            <div style={cardStyle}>
              <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="text-base font-semibold text-white">Registro de Acessos</h2>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>Último acesso de cada usuário ao sistema</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Usuário', 'Cargo', 'Equipe', 'Status', 'Último Acesso', 'Cadastrado em'].map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const roleColor = ROLE_COLORS[u.cargo] || '#8B949E';
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: roleColor }}>
                                {u.nome_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-white text-xs">{u.nome_completo}</p>
                                <p className="text-xs" style={{ color: '#8B949E' }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>{u.cargo}</span>
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>{u.equipe || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="text-xs font-medium" style={{ color: u.status === 'Ativo' ? '#22C55E' : '#EF4444' }}>{u.status}</span>
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>
                            {u.ultimo_acesso ? (
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {new Date(u.ultimo_acesso).toLocaleString('pt-BR')}
                              </span>
                            ) : <span style={{ color: '#4B5563' }}>Nunca acessou</span>}
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>
                            {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ ...cardStyle, padding: '1.5rem' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Criar Novo Usuário', icon: <Plus size={15} />, color: '#1E40AF', action: () => { setActiveTab('usuarios'); setEditingUser(undefined); setShowUserForm(true); } },
                  { label: 'Gerenciar Permissões', icon: <Lock size={15} />, color: '#7C3AED', action: () => setActiveTab('permissoes') },
                  { label: 'Ver Cargos', icon: <Briefcase size={15} />, color: '#D97706', action: () => setActiveTab('cargos') },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium text-white text-left transition-all hover:opacity-90"
                    style={{ backgroundColor: `${action.color}20`, border: `1px solid ${action.color}30`, color: action.color }}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showUserForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setShowUserForm(false); setEditingUser(undefined); }}
          onSave={() => { loadUsers(); setShowUserForm(false); setEditingUser(undefined); }}
        />
      )}

      {permissionsUser && (
        <PermissionsEditor
          user={permissionsUser}
          onClose={() => setPermissionsUser(undefined)}
          onSave={() => { loadUsers(); setPermissionsUser(undefined); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Excluir Usuário</h3>
                <p className="text-xs" style={{ color: '#8B949E' }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors" style={{ color: '#8B949E', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#EF4444' }}>
                Excluir
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
