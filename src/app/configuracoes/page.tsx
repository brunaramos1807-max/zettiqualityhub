'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { Shield, Users, Briefcase, Lock, Plus, Edit2, Trash2, X, Save, CheckCircle, Loader2, UserCheck, Clock, AlertTriangle, RefreshCw, Key, Database, Copy, ToggleLeft, ToggleRight, Search, Upload, Star, History, Trash } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cargo {
  id: string;
  nome: string;
  descricao: string;
  cor: string;
  is_active: boolean;
  is_admin_master: boolean;
  created_at: string;
  _userCount?: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  squad: string | null;
  squads: string[];
  equipes: string[];
  is_active: boolean;
  status_usuario: string;
  nivel: string;
  cargo_id: string | null;
  created_at: string;
  _source?: string;
}

interface PermissionModule {
  nome: string;
  label: string;
  descricao: string;
  sort_order: number;
}

interface UserPermission {
  id?: string;
  user_profile_id: string;
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

interface PermissionLog {
  id: string;
  actor_email: string;
  target_email: string;
  action: string;
  entity_type: string;
  details: string;
  created_at: string;
}

type Tab = 'usuarios' | 'cargos' | 'permissoes' | 'analistas' | 'logs';

// ─── Constants ────────────────────────────────────────────────────────────────

const SQUAD_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal', 'Treinamento', 'Qualidade', 'Todas'];
const STATUS_OPTIONS = ['ativo', 'ferias', 'afastado', 'inativo'];
const NIVEL_OPTIONS = ['Trainee', 'Junior', 'Pleno', 'Senior', 'Especialista', 'Lider'];

const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'Visualizar', short: 'Ver' },
  { key: 'can_edit', label: 'Editar', short: 'Edit' },
  { key: 'can_delete', label: 'Excluir', short: 'Del' },
  { key: 'can_import', label: 'Importar', short: 'Imp' },
  { key: 'can_export', label: 'Exportar', short: 'Exp' },
  { key: 'can_close_cycle', label: 'Fechar Ciclo', short: 'FC' },
  { key: 'can_reopen_cycle', label: 'Reabrir Ciclo', short: 'RC' },
  { key: 'can_approve', label: 'Aprovar', short: 'Apr' },
  { key: 'can_admin', label: 'Administrar', short: 'Adm' },
];

const STATUS_COLORS: Record<string, string> = {
  ativo: '#22C55E',
  ferias: '#F59E0B',
  afastado: '#FB923C',
  inativo: '#EF4444',
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

// ─── Cargo Modal ──────────────────────────────────────────────────────────────

interface CargoModalProps {
  cargo?: Cargo | null;
  onClose: () => void;
  onSave: () => void;
  actorEmail: string;
}

function CargoModal({ cargo, onClose, onSave, actorEmail }: CargoModalProps) {
  const [nome, setNome] = useState(cargo?.nome || '');
  const [descricao, setDescricao] = useState(cargo?.descricao || '');
  const [cor, setCor] = useState(cargo?.cor || '#38BDF8');
  const [isAdminMaster, setIsAdminMaster] = useState(cargo?.is_admin_master || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nome.trim()) { setError('Nome do cargo é obrigatório.'); return; }
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');
      const payload = { nome: nome.trim(), descricao: descricao.trim(), cor, is_admin_master: isAdminMaster, updated_at: new Date().toISOString() };
      if (cargo?.id) {
        const { error: err } = await supabase.from('cargos').update(payload).eq('id', cargo.id);
        if (err) throw err;
        await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: 'cargo_editado', entity_type: 'cargo', entity_id: cargo.id, details: `Cargo "${nome}" editado` });
      } else {
        const { error: err } = await supabase.from('cargos').insert({ ...payload, is_active: true });
        if (err) throw err;
        await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: 'cargo_criado', entity_type: 'cargo', details: `Cargo "${nome}" criado` });
      }
      onSave();
    } catch (e: any) { setError(e?.message || 'Erro ao salvar'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white">{cargo ? 'Editar Cargo' : 'Novo Cargo'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Nome do Cargo *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Coordenador, Gestor..." style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva as responsabilidades..." rows={3}
              style={{ ...inputStyle, height: 'auto', resize: 'none', padding: '0.625rem 0.875rem' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Cor de Identificação</label>
            <div className="flex items-center gap-3">
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0" style={{ backgroundColor: 'transparent' }} />
              <input value={cor} onChange={(e) => setCor(e.target.value)} style={{ ...inputStyle, width: '120px' }} />
              <div className="flex gap-1.5">
                {['#22C55E','#38BDF8','#A78BFA','#F59E0B','#60A5FA','#FB923C','#EF4444','#06B6D4'].map((c) => (
                  <button key={c} onClick={() => setCor(c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: cor === c ? '#fff' : 'transparent' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div>
              <p className="text-sm font-medium text-white">Admin Master</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Acesso total irrestrito ao sistema</p>
            </div>
            <button type="button" onClick={() => setIsAdminMaster(!isAdminMaster)} className="relative w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: isAdminMaster ? '#EF4444' : 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm" style={{ transform: isAdminMaster ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }} />
            </button>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar Cargo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

interface EditUserModalProps {
  user: UserProfile;
  cargos: Cargo[];
  onClose: () => void;
  onSave: () => void;
  actorEmail: string;
}

function EditUserModal({ user, cargos, onClose, onSave, actorEmail }: EditUserModalProps) {
  const [role, setRole] = useState(user.role || '');
  const [cargoId, setCargoId] = useState(user.cargo_id || '');
  const [squad, setSquad] = useState(user.squad || '');
  const [squads, setSquads] = useState<string[]>(user.squads || []);
  const [statusUsuario, setStatusUsuario] = useState(user.status_usuario || 'ativo');
  const [nivel, setNivel] = useState(user.nivel || 'Junior');
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSquad = (sq: string) => setSquads((prev) => prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]);

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');

      const payload = {
        role, cargo_id: cargoId || null,
        squad: squad || null,
        squads: squads.length > 0 ? squads : (squad ? [squad] : []),
        equipes: squads.length > 0 ? squads : (squad ? [squad] : []),
        is_active: isActive, status_usuario: statusUsuario, nivel,
        updated_at: new Date().toISOString(),
      };

      // Try user_profiles first
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', user.id);

      // Also update pre_registered_users
      const { error: preRegErr } = await supabase
        .from('pre_registered_users')
        .update({ role, cargo_id: cargoId || null, squad: squad || null, squads: payload.squads, is_active: isActive, status_usuario: statusUsuario, nivel, updated_at: new Date().toISOString() })
        .eq('email', user.email.toLowerCase());

      if (profileErr && preRegErr) {
        // Last resort: upsert pre_registered_users
        const { error: upsertErr } = await supabase.from('pre_registered_users').upsert({
          id: user.id, email: user.email, full_name: user.full_name, ...payload,
        }, { onConflict: 'email' });
        if (upsertErr) throw new Error(`Erro ao salvar: ${upsertErr.message}`);
      }

      await supabase.from('permission_logs').insert({
        actor_email: actorEmail, target_email: user.email,
        action: 'usuario_editado', entity_type: 'usuario', entity_id: user.id,
        details: `Usuário "${user.full_name}" editado — cargo: ${role}, status: ${statusUsuario}`,
      }).then(() => {}).catch(() => {});

      onSave();
    } catch (e: any) { setError(e?.message || 'Erro ao salvar'); }
    setLoading(false);
  };

  const selectedCargo = cargos.find((c) => c.id === cargoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="font-bold text-white">Editar Perfil de Acesso</h3>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Cargo</label>
              <select value={cargoId} onChange={(e) => setCargoId(e.target.value)} style={selectStyle}>
                <option value="">Sem cargo</option>
                {cargos.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Role (Sistema)</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
                <option value="">Selecionar...</option>
                <option value="Admin">Admin</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Coordenador Geral">Coordenador Geral</option>
                <option value="Gestor">Gestor</option>
                <option value="Gerente">Gerente</option>
                <option value="Auditor">Auditor</option>
                <option value="QA">QA</option>
                <option value="Analista">Analista</option>
                <option value="Visualizador">Visualizador</option>
              </select>
            </div>
          </div>
          {selectedCargo && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${selectedCargo.cor}10`, border: `1px solid ${selectedCargo.cor}25` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: selectedCargo.cor }}>{selectedCargo.nome}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedCargo.descricao}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Status</label>
              <select value={statusUsuario} onChange={(e) => setStatusUsuario(e.target.value)} style={selectStyle}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Nível</label>
              <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={selectStyle}>
                {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Squad Principal</label>
            <select value={squad} onChange={(e) => setSquad(e.target.value)} style={selectStyle}>
              <option value="">Sem squad específica</option>
              {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Squads Visíveis (múltiplas)</label>
            <div className="flex flex-wrap gap-2">
              {SQUAD_OPTIONS.map((sq) => (
                <button key={sq} type="button" onClick={() => toggleSquad(sq)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: squads.includes(sq) ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', border: squads.includes(sq) ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)', color: squads.includes(sq) ? '#38BDF8' : '#94A3B8' }}>
                  {sq}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <p className="text-sm font-medium text-white">Usuário Ativo</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Usuários inativos não acessam o sistema</p>
            </div>
            <button type="button" onClick={() => setIsActive(!isActive)} className="relative w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: isActive ? '#22C55E' : 'rgba(255,255,255,0.1)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm" style={{ transform: isActive ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }} />
            </button>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Permissions Matrix Modal ─────────────────────────────────────────────────

interface PermissionsMatrixModalProps {
  user: UserProfile;
  modules: PermissionModule[];
  existingPermissions: UserPermission[];
  onClose: () => void;
  onSave: () => void;
  actorEmail: string;
}

function PermissionsMatrixModal({ user, modules, existingPermissions, onClose, onSave, actorEmail }: PermissionsMatrixModalProps) {
  const [perms, setPerms] = useState<Record<string, UserPermission>>(() => {
    const map: Record<string, UserPermission> = {};
    modules.forEach((m) => {
      const existing = existingPermissions.find((p) => p.module_name === m.nome);
      map[m.nome] = existing || {
        user_profile_id: user.id, module_name: m.nome,
        can_view: false, can_edit: false, can_delete: false, can_import: false,
        can_export: false, can_close_cycle: false, can_reopen_cycle: false,
        can_approve: false, can_admin: false,
      };
    });
    return map;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePerm = (moduleName: string, action: string) => {
    setPerms((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], [action]: !prev[moduleName][action as keyof UserPermission] },
    }));
  };

  const grantAll = (moduleName: string) => {
    setPerms((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], can_view: true, can_edit: true, can_delete: true, can_import: true, can_export: true, can_close_cycle: true, can_reopen_cycle: true, can_approve: true, can_admin: true },
    }));
  };

  const revokeAll = (moduleName: string) => {
    setPerms((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], can_view: false, can_edit: false, can_delete: false, can_import: false, can_export: false, can_close_cycle: false, can_reopen_cycle: false, can_approve: false, can_admin: false },
    }));
  };

  const grantAllModules = () => {
    let updated: Record<string, UserPermission> = {};
    Object.keys(perms).forEach((k) => {
      updated[k] = { ...perms[k], can_view: true, can_edit: true, can_delete: true, can_import: true, can_export: true, can_close_cycle: true, can_reopen_cycle: true, can_approve: true, can_admin: true };
    });
    setPerms(updated);
  };

  const handleSave = async () => {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');

      // Ensure user exists in user_profiles
      await supabase.from('user_profiles').upsert({
        id: user.id, email: user.email, full_name: user.full_name,
        role: user.role || 'Coordenador', is_active: user.is_active !== false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      const upserts = Object.values(perms).map((p) => ({ ...p, updated_at: new Date().toISOString() }));
      const { error: err } = await supabase.from('user_permissions').upsert(upserts, { onConflict: 'user_profile_id,module_name' });
      if (err) throw err;

      await supabase.from('permission_logs').insert({
        actor_email: actorEmail, target_email: user.email,
        action: 'permissoes_atualizadas', entity_type: 'permissao', entity_id: user.id,
        details: `Permissões de "${user.full_name || user.email}" atualizadas manualmente`,
        new_value: perms,
      }).then(() => {}).catch(() => {});
      onSave();
    } catch (e: any) { setError(e?.message || 'Erro ao salvar permissões'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2"><Lock size={16} style={{ color: '#38BDF8' }} /> Permissões Individuais</h3>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{user.full_name || user.email} — configuração manual por módulo</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={grantAllModules} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
              Conceder Tudo
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th className="text-left py-3 px-3 font-semibold text-white" style={{ minWidth: '160px' }}>Módulo</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a.key} className="text-center py-3 px-2 font-semibold" style={{ color: '#94A3B8', minWidth: '60px' }}>{a.short}</th>
                  ))}
                  <th className="text-center py-3 px-2 font-semibold" style={{ color: '#94A3B8', minWidth: '80px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {modules.sort((a, b) => a.sort_order - b.sort_order).map((mod, i) => {
                  const p = perms[mod.nome];
                  if (!p) return null;
                  return (
                    <tr key={mod.nome} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-white">{mod.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{mod.descricao}</p>
                      </td>
                      {PERMISSION_ACTIONS.map((action) => (
                        <td key={action.key} className="py-3 px-2 text-center">
                          <button
                            onClick={() => togglePerm(mod.nome, action.key)}
                            className="w-5 h-5 rounded flex items-center justify-center mx-auto transition-all"
                            style={{
                              backgroundColor: p[action.key as keyof UserPermission] ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)',
                              border: p[action.key as keyof UserPermission] ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            }}
                          >
                            {p[action.key as keyof UserPermission] && <CheckCircle size={11} style={{ color: '#22C55E' }} />}
                          </button>
                        </td>
                      ))}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => grantAll(mod.nome)} className="px-1.5 py-0.5 rounded text-xs transition-all" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }} title="Conceder tudo">✓</button>
                          <button onClick={() => revokeAll(mod.nome)} className="px-1.5 py-0.5 rounded text-xs transition-all" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }} title="Revogar tudo">✗</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 rounded-xl flex flex-wrap gap-4" style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.1)' }}>
            {PERMISSION_ACTIONS.map((a) => (
              <span key={a.key} className="text-xs" style={{ color: '#94A3B8' }}><strong className="text-white">{a.short}</strong> = {a.label}</span>
            ))}
          </div>
          {error && <p className="text-xs px-3 py-2 mt-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>
        <div className="flex gap-3 p-5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────

interface AddUserModalProps {
  cargos: Cargo[];
  onClose: () => void;
  onSave: () => void;
  actorEmail: string;
}

function AddUserModal({ cargos, onClose, onSave, actorEmail }: AddUserModalProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Coordenador');
  const [cargoId, setCargoId] = useState('');
  const [squad, setSquad] = useState('');
  const [squads, setSquads] = useState<string[]>([]);
  const [nivel, setNivel] = useState('Junior');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSquad = (sq: string) => setSquads((prev) => prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]);

  const handleSave = async () => {
    if (!email.trim() || !fullName.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');

      const allSquads = squads.length > 0 ? squads : (squad ? [squad] : []);

      const { error: err } = await supabase.from('pre_registered_users').upsert({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role: role || 'Coordenador',
        cargo_id: cargoId || null,
        squad: squad || null,
        squads: allSquads,
        is_active: true,
        status_usuario: 'ativo',
        nivel,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      if (err) throw new Error(`Erro ao cadastrar: ${err.message}`);

      await supabase.from('permission_logs').insert({
        actor_email: actorEmail, target_email: email,
        action: 'usuario_pre_cadastrado', entity_type: 'usuario',
        details: `Usuário "${fullName}" pré-cadastrado com role "${role}"`,
      }).then(() => {}).catch(() => {});

      onSave();
    } catch (e: any) { setError(e?.message || 'Erro ao criar usuário'); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white">Pré-cadastrar Usuário</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', color: '#94A3B8' }}>
            O usuário precisa fazer login via Google para criar a conta. Este cadastro define o perfil de acesso aplicado automaticamente.
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Nome Completo *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">E-mail Google *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@gmail.com" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Cargo</label>
              <select value={cargoId} onChange={(e) => setCargoId(e.target.value)} style={selectStyle}>
                <option value="">Sem cargo</option>
                {cargos.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-2">Nível</label>
              <select value={nivel} onChange={(e) => setNivel(e.target.value)} style={selectStyle}>
                {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Role (Sistema)</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
              <option value="Admin">Admin</option>
              <option value="Coordenador">Coordenador</option>
              <option value="Coordenador Geral">Coordenador Geral</option>
              <option value="Gestor">Gestor</option>
              <option value="Gerente">Gerente</option>
              <option value="Auditor">Auditor</option>
              <option value="QA">QA</option>
              <option value="Analista">Analista</option>
              <option value="Visualizador">Visualizador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Squad Principal</label>
            <select value={squad} onChange={(e) => setSquad(e.target.value)} style={selectStyle}>
              <option value="">Nenhuma</option>
              {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-2">Squads Visíveis</label>
            <div className="flex flex-wrap gap-2">
              {SQUAD_OPTIONS.map((sq) => (
                <button key={sq} type="button" onClick={() => toggleSquad(sq)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: squads.includes(sq) ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', border: squads.includes(sq) ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)', color: squads.includes(sq) ? '#38BDF8' : '#94A3B8' }}>
                  {sq}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>
        <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? 'Salvando...' : 'Pré-cadastrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analistas Tab ────────────────────────────────────────────────────────────

interface AnalistasTabProps {
  actorEmail: string;
}

interface Analista {
  id: string;
  nome: string;
  email: string;
  squad: string;
  equipe: string;
  coordenador: string;
  nivel: string;
  status: string;
  aniversario: string;
  tempo_empresa: string;
  ultima_promocao: string;
  observacoes: string;
  created_at: string;
}

function AnalistasTab({ actorEmail }: AnalistasTabProps) {
  const [analistas, setAnalistas] = useState<Analista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnalista, setEditingAnalista] = useState<Analista | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', squad: '', equipe: '', coordenador: '', nivel: 'Junior', status: 'ativo', aniversario: '', tempo_empresa: '', ultima_promocao: '', observacoes: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const loadAnalistas = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.from('analistas').select('*').order('nome');
      if (data) setAnalistas(data as Analista[]);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAnalistas(); }, [loadAnalistas]);

  const handleSaveAnalista = async () => {
    if (!form.nome.trim()) { setFormError('Nome é obrigatório.'); return; }
    setFormLoading(true); setFormError('');
    try {
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (editingAnalista) {
        await supabase.from('analistas').update(payload).eq('id', editingAnalista.id);
      } else {
        await supabase.from('analistas').insert({ ...payload, created_at: new Date().toISOString() });
      }
      setShowForm(false); setEditingAnalista(null);
      setForm({ nome: '', email: '', squad: '', equipe: '', coordenador: '', nivel: 'Junior', status: 'ativo', aniversario: '', tempo_empresa: '', ultima_promocao: '', observacoes: '' });
      loadAnalistas();
    } catch (e: any) { setFormError(e?.message || 'Erro ao salvar'); }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('analistas').delete().eq('id', id);
    loadAnalistas();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from('analistas').delete().in('id', Array.from(selectedIds));
      setSelectedIds(new Set());
      loadAnalistas();
    } catch { /* ignore */ }
    setBulkDeleteLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const STATUS_ANALISTA = ['ativo', 'ferias', 'afastado', 'desligado'];

  const filtered = analistas.filter((a) => {
    const matchSearch = !search || a.nome.toLowerCase().includes(search.toLowerCase()) || (a.squad || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true); setImportMsg('');
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = utils.sheet_to_json(ws, { defval: '' });
      const supabase = createClient();
      if (!supabase) throw new Error('Supabase indisponível');
      let imported = 0; let updated = 0;
      for (const row of rows) {
        const nome = (row['nome'] || row['Nome'] || row['NOME'] || row['nome_completo'] || row['Nome Completo'] || '').toString().trim();
        if (!nome) continue;
        const payload = {
          nome,
          email: (row['email'] || row['Email'] || row['E-mail'] || '').toString().trim(),
          squad: (row['squad'] || row['Squad'] || row['equipe'] || row['Equipe'] || '').toString().trim(),
          equipe: (row['equipe'] || row['Equipe'] || row['squad'] || row['Squad'] || '').toString().trim(),
          coordenador: (row['coordenador'] || row['Coordenador'] || '').toString().trim(),
          nivel: (row['nivel'] || row['Nível'] || row['nivel_cargo'] || 'Junior').toString().trim(),
          status: (row['status'] || row['Status'] || 'ativo').toString().toLowerCase().trim(),
          updated_at: new Date().toISOString(),
        };
        const { data: existing } = await supabase.from('analistas').select('id').eq('nome', nome).maybeSingle();
        if (existing) {
          await supabase.from('analistas').update(payload).eq('id', existing.id);
          updated++;
        } else {
          await supabase.from('analistas').insert({ ...payload, created_at: new Date().toISOString() });
          imported++;
        }
      }
      setImportMsg(`✓ ${imported} importados, ${updated} atualizados`);
      loadAnalistas();
    } catch (e: any) { setImportMsg(`Erro: ${e?.message}`); }
    setImportLoading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar analista..." style={{ ...inputStyle, paddingLeft: '2.25rem' }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: '140px' }}>
          <option value="">Todos status</option>
          {STATUS_ANALISTA.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} disabled={bulkDeleteLoading} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: '#DC2626' }}>
            {bulkDeleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
            Excluir {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </button>
        )}
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
          {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Importar XLSX/CSV
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        </label>
        <button onClick={() => { setEditingAnalista(null); setForm({ nome: '', email: '', squad: '', equipe: '', coordenador: '', nivel: 'Junior', status: 'ativo', aniversario: '', tempo_empresa: '', ultima_promocao: '', observacoes: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
          <Plus size={14} /> Novo Analista
        </button>
      </div>

      {importMsg && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: importMsg.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: importMsg.startsWith('✓') ? '#22C55E' : '#EF4444', border: `1px solid ${importMsg.startsWith('✓') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {importMsg}
        </div>
      )}

      {showForm && (
        <div className="p-5 rounded-2xl space-y-4" style={cardStyle}>
          <h3 className="text-sm font-bold text-white">{editingAnalista ? 'Editar Analista' : 'Novo Analista'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold text-white mb-1.5">Nome *</label><input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={inputStyle} /></div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">E-mail</label><input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} /></div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">Squad</label><input value={form.squad} onChange={(e) => setForm((f) => ({ ...f, squad: e.target.value }))} style={inputStyle} /></div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">Equipe</label><input value={form.equipe} onChange={(e) => setForm((f) => ({ ...f, equipe: e.target.value }))} style={inputStyle} /></div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">Coordenador</label><input value={form.coordenador} onChange={(e) => setForm((f) => ({ ...f, coordenador: e.target.value }))} style={inputStyle} /></div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">Nível</label>
              <select value={form.nivel} onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))} style={selectStyle}>
                {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={selectStyle}>
                {STATUS_ANALISTA.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">Aniversário</label><input type="date" value={form.aniversario} onChange={(e) => setForm((f) => ({ ...f, aniversario: e.target.value }))} style={inputStyle} /></div>
            <div><label className="block text-xs font-semibold text-white mb-1.5">Tempo de Empresa</label><input value={form.tempo_empresa} onChange={(e) => setForm((f) => ({ ...f, tempo_empresa: e.target.value }))} placeholder="Ex: 2 anos" style={inputStyle} /></div>
          </div>
          {formError && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{formError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
            <button onClick={handleSaveAnalista} disabled={formLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
              {formLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar
            </button>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm font-semibold text-white">{filtered.length} analista{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Perfis operacionais — sem acesso ao sistema</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th className="py-3 px-4 text-left">
                    <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                  </th>
                  {['Nome', 'Squad', 'Coordenador', 'Nível', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: selectedIds.has(a.id) ? 'rgba(56,189,248,0.04)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!selectedIds.has(a.id)) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedIds.has(a.id) ? 'rgba(56,189,248,0.04)' : 'transparent'; }}>
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="w-4 h-4 rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{a.nome}</p>
                      {a.email && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{a.email}</p>}
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.squad || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.coordenador || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.nivel || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${STATUS_COLORS[a.status] || '#94A3B8'}15`, color: STATUS_COLORS[a.status] || '#94A3B8' }}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingAnalista(a); setForm({ nome: a.nome, email: a.email || '', squad: a.squad || '', equipe: a.equipe || '', coordenador: a.coordenador || '', nivel: a.nivel || 'Junior', status: a.status || 'ativo', aniversario: a.aniversario || '', tempo_empresa: a.tempo_empresa || '', ultima_promocao: a.ultima_promocao || '', observacoes: a.observacoes || '' }); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#60A5FA' }}><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#EF4444' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-sm" style={{ color: '#94A3B8' }}>
                    <Users size={28} className="mx-auto mb-2 opacity-30" />
                    Nenhum analista encontrado
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ConfiguracoesContent() {
  const { session, userRole, isAdminMaster } = useSystemAuth();
  const actorEmail = session?.email || 'sistema';
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [permLogs, setPermLogs] = useState<PermissionLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | undefined>();
  const [permissionsUser, setPermissionsUser] = useState<UserProfile | undefined>();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'cargo'; id: string; label?: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const loadAll = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      // Sync auth users in background (non-blocking)
      fetch('/api/admin/sync-auth-users').catch(() => {});

      const [usersRes, preRegRes, cargosRes, modulesRes, permsRes, logsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('pre_registered_users').select('*').order('created_at', { ascending: false }),
        supabase.from('cargos').select('*').order('nome'),
        supabase.from('permission_modules').select('*').order('sort_order'),
        supabase.from('user_permissions').select('*'),
        supabase.from('permission_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      const profileUsers: UserProfile[] = (usersRes.data || []) as UserProfile[];
      const preRegUsers: UserProfile[] = ((preRegRes.data || []) as any[]).map((u: any) => ({
        ...u,
        full_name: u.full_name || '',
        status_usuario: u.status_usuario || 'ativo',
        squads: u.squads || [],
        equipes: u.equipes || [],
        is_active: u.is_active !== false,
        _source: 'pre_registered',
      }));
      const profileEmails = new Set(profileUsers.map((u) => u.email?.toLowerCase()));
      const uniquePreReg = preRegUsers.filter((u) => !profileEmails.has(u.email?.toLowerCase()));
      const allUsers = [...profileUsers, ...uniquePreReg];

      setUsers(allUsers);
      if (cargosRes.data) {
        const cargosWithCount = (cargosRes.data as Cargo[]).map((c) => ({
          ...c,
          _userCount: allUsers.filter((u: any) => u.cargo_id === c.id).length || 0,
        }));
        setCargos(cargosWithCount);
      }
      if (modulesRes.data) setModules(modulesRes.data as PermissionModule[]);
      if (permsRes.data) setUserPermissions(permsRes.data as UserPermission[]);
      if (logsRes.data) setPermLogs(logsRes.data as PermissionLog[]);
    } catch (e) { console.error(e); }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      if (deleteConfirm.type === 'user') {
        await supabase.from('user_permissions').delete().eq('user_profile_id', deleteConfirm.id).then(() => {}).catch(() => {});
        await supabase.from('user_profiles').delete().eq('id', deleteConfirm.id).then(() => {}).catch(() => {});
        await supabase.from('pre_registered_users').delete().eq('id', deleteConfirm.id).then(() => {}).catch(() => {});
        // Also try by email if we have it
        const user = users.find((u) => u.id === deleteConfirm.id);
        if (user?.email) {
          await supabase.from('pre_registered_users').delete().eq('email', user.email.toLowerCase()).then(() => {}).catch(() => {});
        }
      } else {
        await supabase.from('cargos').delete().eq('id', deleteConfirm.id);
      }
      setDeleteConfirm(null);
      loadAll();
    } catch (e) { console.error(e); }
    setDeleteLoading(false);
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleteLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const ids = Array.from(selectedUserIds);
      const emails = users.filter((u) => ids.includes(u.id)).map((u) => u.email?.toLowerCase()).filter(Boolean);

      await supabase.from('user_permissions').delete().in('user_profile_id', ids).then(() => {}).catch(() => {});
      await supabase.from('user_profiles').delete().in('id', ids).then(() => {}).catch(() => {});
      await supabase.from('pre_registered_users').delete().in('id', ids).then(() => {}).catch(() => {});
      if (emails.length > 0) {
        await supabase.from('pre_registered_users').delete().in('email', emails).then(() => {}).catch(() => {});
      }

      setSelectedUserIds(new Set());
      setBulkDeleteConfirm(false);
      loadAll();
      showSuccessToast(`${ids.length} usuário${ids.length !== 1 ? 's' : ''} excluído${ids.length !== 1 ? 's' : ''}!`);
    } catch (e) { console.error(e); }
    setBulkDeleteLoading(false);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredUsers = users.filter((u) => {
    if (!searchUsers) return true;
    const q = searchUsers.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
  });

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleToggleCargo = async (cargo: Cargo) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('cargos').update({ is_active: !cargo.is_active, updated_at: new Date().toISOString() }).eq('id', cargo.id);
    await supabase.from('permission_logs').insert({ actor_email: actorEmail, action: cargo.is_active ? 'cargo_inativado' : 'cargo_ativado', entity_type: 'cargo', entity_id: cargo.id, details: `Cargo "${cargo.nome}" ${cargo.is_active ? 'inativado' : 'ativado'}` });
    loadAll();
  };

  const handleDuplicateCargo = async (cargo: Cargo) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('cargos').insert({ nome: `${cargo.nome} (cópia)`, descricao: cargo.descricao, cor: cargo.cor, is_active: true, is_admin_master: false });
    loadAll();
    showSuccessToast('Cargo duplicado com sucesso!');
  };

  const showSuccessToast = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(''), 3000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'usuarios', label: 'Usuários', icon: <Users size={14} /> },
    { id: 'cargos', label: 'Cargos', icon: <Briefcase size={14} /> },
    { id: 'permissoes', label: 'Permissões', icon: <Lock size={14} /> },
    { id: 'analistas', label: 'Analistas', icon: <Star size={14} /> },
    { id: 'logs', label: 'Logs de Auditoria', icon: <History size={14} /> },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />{saveSuccess}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <Shield size={20} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Controle de Acessos</h1>
            <p className="text-sm" style={{ color: '#94A3B8' }}>RBAC Enterprise — cargos, usuários, permissões individuais e analistas</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Usuários', value: users.length, color: '#38BDF8', icon: <Users size={14} /> },
            { label: 'Cargos', value: cargos.length, color: '#A78BFA', icon: <Briefcase size={14} /> },
            { label: 'Ativos', value: users.filter((u) => u.is_active !== false).length, color: '#22C55E', icon: <UserCheck size={14} /> },
            { label: 'Logs', value: permLogs.length, color: '#F59E0B', icon: <History size={14} /> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{ backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent', color: activeTab === tab.id ? '#FFFFFF' : '#94A3B8' }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Usuários ── */}
      {activeTab === 'usuarios' && (
        <div style={cardStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-base font-semibold text-white">Usuários Cadastrados</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} · {users.filter((u) => u.is_active !== false).length} ativo{users.filter((u) => u.is_active !== false).length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                <input value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, paddingLeft: '2rem', width: '180px', height: '36px', fontSize: '0.8rem' }} />
              </div>
              {selectedUserIds.size > 0 && (
                <button onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#DC2626' }}>
                  <Trash size={13} /> Excluir {selectedUserIds.size}
                </button>
              )}
              <button onClick={loadAll} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}><RefreshCw size={14} /></button>
              <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
                <Plus size={14} /> Pré-cadastrar
              </button>
            </div>
          </div>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th className="py-3 px-4 text-left">
                      <input type="checkbox" checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length} onChange={toggleSelectAllUsers} className="w-4 h-4 rounded" />
                    </th>
                    {['Usuário', 'E-mail', 'Cargo / Role', 'Squad', 'Status', 'Nível', 'Ações'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const cargo = cargos.find((c) => c.id === u.cargo_id);
                    const roleColor = cargo?.cor || '#94A3B8';
                    const initials = (u.full_name || u.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                    const statusColor = STATUS_COLORS[u.status_usuario || 'ativo'] || '#22C55E';
                    const isSelected = selectedUserIds.has(u.id);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: isSelected ? 'rgba(56,189,248,0.04)' : 'transparent' }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(56,189,248,0.04)' : 'transparent'; }}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectUser(u.id)} className="w-4 h-4 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: roleColor, opacity: u.is_active === false ? 0.5 : 1 }}>{initials}</div>
                            <span className="font-medium text-white">{u.full_name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{u.email}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {cargo && <span className="block px-2 py-0.5 rounded-full text-xs font-semibold w-fit" style={{ backgroundColor: `${cargo.cor}18`, color: cargo.cor, border: `1px solid ${cargo.cor}30` }}>{cargo.nome}</span>}
                            {u.role && <span className="block text-xs" style={{ color: '#94A3B8' }}>{u.role}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{u.squad || (u.squads?.length > 0 ? u.squads.join(', ') : '—')}</td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: statusColor }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                            {(u.status_usuario || 'ativo').charAt(0).toUpperCase() + (u.status_usuario || 'ativo').slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{u.nivel || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingUser(u)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#60A5FA' }} title="Editar"><Edit2 size={13} /></button>
                            <button onClick={() => setPermissionsUser(u)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#A78BFA' }} title="Permissões"><Lock size={13} /></button>
                            <button onClick={() => setDeleteConfirm({ type: 'user', id: u.id, label: u.full_name || u.email })} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#EF4444' }} title="Remover"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={8} className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
                      <Database size={32} className="mx-auto mb-3 opacity-30" />
                      Nenhum usuário encontrado
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Cargos ── */}
      {activeTab === 'cargos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Cargos Configuráveis</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Estrutura base — permissões são definidas individualmente por usuário</p>
            </div>
            <button onClick={() => setEditingCargo(null)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={14} /> Novo Cargo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cargos.map((cargo) => (
              <div key={cargo.id} className="p-5 rounded-2xl" style={{ ...cardStyle, opacity: cargo.is_active ? 1 : 0.6 }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cargo.cor}15`, border: `1px solid ${cargo.cor}25` }}>
                    <Key size={16} style={{ color: cargo.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-white truncate">{cargo.nome}</h3>
                      {cargo.is_admin_master && <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>MASTER</span>}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{cargo.descricao || 'Sem descrição'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: `${cargo.cor}15`, color: cargo.cor }}>{cargo._userCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setEditingCargo(cargo)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ color: '#60A5FA' }}><Edit2 size={11} /> Editar</button>
                  <button onClick={() => handleDuplicateCargo(cargo)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ color: '#94A3B8' }}><Copy size={11} /> Duplicar</button>
                  <button onClick={() => handleToggleCargo(cargo)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ color: cargo.is_active ? '#F59E0B' : '#22C55E' }}>
                    {cargo.is_active ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                    {cargo.is_active ? 'Inativar' : 'Ativar'}
                  </button>
                  <button onClick={() => setDeleteConfirm({ type: 'cargo', id: cargo.id, label: cargo.nome })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5 ml-auto" style={{ color: '#EF4444' }}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
            {cargos.length === 0 && (
              <div className="col-span-3 py-16 text-center" style={{ color: '#94A3B8' }}>
                <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum cargo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Permissões ── */}
      {activeTab === 'permissoes' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">Matriz de Permissões por Usuário</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Permissões individuais — independentes do cargo. Clique em um usuário para configurar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {users.map((u) => {
              const cargo = cargos.find((c) => c.id === u.cargo_id);
              const userPerms = userPermissions.filter((p) => p.user_profile_id === u.id);
              const totalGranted = userPerms.reduce((acc, p) => {
                return acc + PERMISSION_ACTIONS.filter((a) => p[a.key as keyof UserPermission]).length;
              }, 0);
              const initials = (u.full_name || u.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
              return (
                <div key={u.id} className="p-4 rounded-xl cursor-pointer transition-all hover:border-sky-500/30" style={{ ...cardStyle, border: '1px solid rgba(255,255,255,0.07)' }}
                  onClick={() => setPermissionsUser(u)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: cargo?.cor || '#1E40AF' }}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.full_name || u.email}</p>
                      <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{cargo?.nome || u.role || 'Sem cargo'}</p>
                    </div>
                    <Lock size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{userPerms.length} módulo{userPerms.length !== 1 ? 's' : ''} configurado{userPerms.length !== 1 ? 's' : ''}</span>
                    <span className="text-xs font-semibold" style={{ color: totalGranted > 0 ? '#22C55E' : '#94A3B8' }}>{totalGranted} permissão{totalGranted !== 1 ? 'ões' : ''}</span>
                  </div>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="col-span-3 py-16 text-center" style={{ color: '#94A3B8' }}>
                <Lock size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum usuário para configurar permissões</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Analistas ── */}
      {activeTab === 'analistas' && <AnalistasTab actorEmail={actorEmail} />}

      {/* ── TAB: Logs ── */}
      {activeTab === 'logs' && (
        <div style={cardStyle}>
          <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-base font-semibold text-white">Logs de Auditoria</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Registro completo de alterações em permissões, cargos e usuários</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Data/Hora', 'Ator', 'Alvo', 'Ação', 'Detalhes'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>
                      <span className="flex items-center gap-1"><Clock size={11} />{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-white">{log.actor_email || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.target_email || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.details || '—'}</td>
                  </tr>
                ))}
                {permLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>
                    <History size={32} className="mx-auto mb-3 opacity-30" />
                    Nenhum log registrado ainda
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <EditUserModal user={editingUser} cargos={cargos} onClose={() => setEditingUser(undefined)} actorEmail={actorEmail}
          onSave={() => { showSuccessToast('Usuário atualizado!'); loadAll(); setEditingUser(undefined); }} />
      )}

      {permissionsUser && (
        <PermissionsMatrixModal user={permissionsUser} modules={modules}
          existingPermissions={userPermissions.filter((p) => p.user_profile_id === permissionsUser.id)}
          onClose={() => setPermissionsUser(undefined)} actorEmail={actorEmail}
          onSave={() => { showSuccessToast('Permissões salvas!'); loadAll(); setPermissionsUser(undefined); }} />
      )}

      {showAddUser && (
        <AddUserModal cargos={cargos} onClose={() => setShowAddUser(false)} actorEmail={actorEmail}
          onSave={() => { showSuccessToast('Usuário pré-cadastrado!'); loadAll(); setShowAddUser(false); }} />
      )}

      {editingCargo !== undefined && (
        <CargoModal cargo={editingCargo} onClose={() => setEditingCargo(undefined)} actorEmail={actorEmail}
          onSave={() => { showSuccessToast(editingCargo ? 'Cargo atualizado!' : 'Cargo criado!'); loadAll(); setEditingCargo(undefined); }} />
      )}

      {/* Single delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Confirmar Exclusão</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{deleteConfirm.label || 'Este item'} será removido permanentemente.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleteLoading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#DC2626' }}>
                {deleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <AlertTriangle size={18} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Excluir em Massa</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{selectedUserIds.size} usuário{selectedUserIds.size !== 1 ? 's' : ''} serão removidos permanentemente.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={handleBulkDeleteUsers} disabled={bulkDeleteLoading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#DC2626' }}>
                {bulkDeleteLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash size={13} />}
                Excluir Todos
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
