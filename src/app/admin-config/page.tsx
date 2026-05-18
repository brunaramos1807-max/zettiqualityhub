'use client';
import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';

import { fetchUserProfiles, updateUserRole } from '@/lib/services/dataService';
import { Shield, User, Eye, CheckCircle, Loader2, RefreshCw, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_USERS } from '@/lib/mockData';
import RouteGuard from '@/components/RouteGuard';


interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  squad?: string;
  avatar?: string;
  created_at?: string;
}

const ROLE_OPTIONS = ['Admin', 'Coordenador', 'Diretoria'];
const SQUAD_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];

const ROLE_CONFIG: Record<string, { color: string; icon: React.ReactNode; description: string }> = {
  Admin: {
    color: '#22C55E',
    icon: <Shield size={14} />,
    description: 'Controle total — todas as squads, importação, gestão de usuários',
  },
  Coordenador: {
    color: '#60A5FA',
    icon: <User size={14} />,
    description: 'Visualiza apenas sua squad, pode importar dados',
  },
  Diretoria: {
    color: '#EAB308',
    icon: <Eye size={14} />,
    description: 'Leitura total — todas as squads, sem edição',
  },
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  cursor: 'pointer',
};

export default function AdminConfigPage() {
  return (
    <RouteGuard requireAdmin>
      <AdminConfigContent />
    </RouteGuard>
  );
}

function AdminConfigContent() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'Coordenador', squad: '' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUserProfiles();
      if (data.length > 0) {
        setUsers(data as UserProfile[]);
      } else {
        setUsers(
          MOCK_USERS.map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.name,
            role: u.role,
            squad: u.squad,
            avatar: u.avatar,
          }))
        );
      }
    } catch {
      setUsers(
        MOCK_USERS.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.name,
          role: u.role,
          squad: u.squad,
          avatar: u.avatar,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success('Perfil atualizado com sucesso');
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success('Perfil atualizado (local)');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddUser = () => {
    if (!newUser.email || !newUser.full_name) {
      toast.error('Preencha nome e e-mail');
      return;
    }
    const user: UserProfile = {
      id: `user-${Date.now()}`,
      email: newUser.email,
      full_name: newUser.full_name,
      role: newUser.role,
      squad: newUser.squad,
      avatar: newUser.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase(),
    };
    setUsers((prev) => [...prev, user]);
    setAddModal(false);
    setNewUser({ email: '', full_name: '', role: 'Coordenador', squad: '' });
    toast.success('Usuário adicionado');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success('Usuário removido');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0D1117' }}>
      <AppHeader activeTab="admin" userRole="Admin" />

      <main className="flex-1 px-6 py-8 max-w-screen-2xl mx-auto w-full xl:px-10">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Configurações
              </h1>
              <p className="text-sm mt-1" style={{ color: '#8B949E' }}>Gestão de usuários e controle de acesso (RBAC)</p>
            </div>
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ backgroundColor: '#1E40AF' }}
            >
              <Plus size={14} />
              Novo Usuário
            </button>
          </div>

          {/* Role legend */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
              <div key={role} className="rounded-xl p-4 flex items-start gap-3"
                style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                  {cfg.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{role}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{cfg.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Admin highlight */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle size={16} style={{ color: '#22C55E' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#22C55E' }}>Administradores Confirmados</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
                  <strong className="text-white">brunaramos1807@gmail.com</strong> e <strong className="text-white">bruna.silva@zetti.tech</strong> possuem acesso Admin completo ao sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Users table */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Usuários do Sistema
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#8B949E' }}>{users.length} usuários</span>
                <button onClick={loadUsers} className="p-1.5 rounded-lg transition-colors" style={{ color: '#8B949E' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin" style={{ color: '#8B949E' }} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Usuário', 'E-mail', 'Squad', 'Perfil', 'Ações'].map((h) => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.Coordenador;
                      const initials = user.avatar || user.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
                      return (
                        <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: cfg.color }}>
                                {initials}
                              </div>
                              <span className="font-medium text-white">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs" style={{ color: '#8B949E' }}>{user.email}</td>
                          <td className="py-3 px-4 text-sm" style={{ color: '#8B949E' }}>{user.squad || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                disabled={updatingId === user.id}
                                style={{ ...selectStyle, width: 'auto', color: cfg.color, borderColor: `${cfg.color}30` }}
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                              {updatingId === user.id && (
                                <Loader2 size={13} className="animate-spin" style={{ color: '#8B949E' }} />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#8B949E' }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#8B949E'; }}
                              title="Excluir usuário"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      <AppFooter />

      {/* Add User Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Novo Usuário
              </h2>
              <button onClick={() => setAddModal(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#8B949E' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nome Completo *</label>
                <input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Nome do usuário" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>E-mail *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@empresa.com" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Perfil</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={selectStyle}>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Squad</label>
                  <select value={newUser.squad} onChange={(e) => setNewUser({ ...newUser, squad: e.target.value })} style={selectStyle}>
                    <option value="">Todos</option>
                    {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAddModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancelar
                </button>
                <button onClick={handleAddUser}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                  style={{ backgroundColor: '#1E40AF' }}>
                  <Plus size={14} />
                  Criar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
