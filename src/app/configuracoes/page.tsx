'use client';

import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useSystemAuth } from '@/contexts/SystemAuthContext';
import { Users, Briefcase, Lock, Plus, Edit2, Trash2, X, Save, CheckCircle, Loader2, UserCheck, Clock, AlertTriangle, RefreshCw, Key, Database, Copy, ToggleLeft, ToggleRight, Search, Upload, History, Trash, Link, Activity, Eye, FileText, Presentation, ChevronDown, ChevronRight, Globe, UserX, Layers, BarChart3, ShieldCheck, SlidersHorizontal, Camera } from 'lucide-react';

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
  last_sign_in_at?: string;
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

type Tab = 'usuarios' | 'cargos' | 'permissoes' | 'escopos' | 'logs' | 'auditoria';

// ─── Constants ────────────────────────────────────────────────────────────────

const SQUAD_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal', 'Treinamento', 'Qualidade', 'Todas'];
const STATUS_OPTIONS = ['ativo', 'ferias', 'afastado', 'inativo'];
const NIVEL_OPTIONS = ['Trainee', 'Junior', 'Pleno', 'Senior', 'Especialista', 'Lider'];

const PERMISSION_ACTIONS = [
  { key: 'can_view', label: 'Visualizar', short: 'Ver', color: '#38BDF8' },
  { key: 'can_edit', label: 'Editar', short: 'Edit', color: '#A78BFA' },
  { key: 'can_delete', label: 'Excluir', short: 'Del', color: '#EF4444' },
  { key: 'can_import', label: 'Importar', short: 'Imp', color: '#F59E0B' },
  { key: 'can_export', label: 'PDF/Exp', short: 'PDF', color: '#22C55E' },
  { key: 'can_close_cycle', label: 'Fechar Ciclo', short: 'FC', color: '#06B6D4' },
  { key: 'can_reopen_cycle', label: 'Reabrir', short: 'RC', color: '#FB923C' },
  { key: 'can_approve', label: 'Aprovar', short: 'Apr', color: '#2DD4BF' },
  { key: 'can_admin', label: 'Admin', short: 'Adm', color: '#EF4444' },
];

const STATUS_COLORS: Record<string, string> = {
  ativo: '#22C55E',
  ferias: '#F59E0B',
  afastado: '#FB923C',
  inativo: '#EF4444',
};

const SYSTEM_MODULES = [
  { id: 'executivo', label: 'Executivo', color: '#38BDF8', pages: ['Painel Executivo', 'Evolução', 'Analytics'] },
  { id: 'operacao', label: 'Operação', color: '#A78BFA', pages: ['Ciclo Atual', 'Ciclos', 'Auditoria'] },
  { id: 'qualidade', label: 'Qualidade', color: '#2DD4BF', pages: ['QA & IEPC 360°', 'Não Conformidades', 'Elogios'] },
  { id: 'dh', label: 'Desenvolvimento Humano', color: '#F59E0B', pages: ['Feedback', 'PDI', 'Gestão de Pessoas', 'Advertências'] },
  { id: 'governanca', label: 'Governança', color: '#22C55E', pages: ['Documentos', 'Histórico'] },
  { id: 'admin', label: 'Admin', color: '#EF4444', pages: ['Configurações', 'Analistas', 'Integrações', 'Importações', 'Logs & Diagnóstico'] },
];

const PAGE_ACTIONS = [
  { key: 'visualizar', label: 'Visualizar', icon: <Eye size={10} />, color: '#38BDF8' },
  { key: 'editar', label: 'Editar', icon: <Edit2 size={10} />, color: '#A78BFA' },
  { key: 'excluir', label: 'Excluir', icon: <Trash2 size={10} />, color: '#EF4444' },
  { key: 'importar', label: 'Importar', icon: <Upload size={10} />, color: '#F59E0B' },
  { key: 'exportar_pdf', label: 'PDF', icon: <FileText size={10} />, color: '#22C55E' },
  { key: 'gerar_link', label: 'Link', icon: <Link size={10} />, color: '#06B6D4' },
  { key: 'apresentacao', label: 'Apresent.', icon: <Presentation size={10} />, color: '#FB923C' },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0F1B31',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '0.875rem',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.625rem',
  color: '#F8FAFC',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  height: '44px',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, color = '#22C55E' }: { value: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
      style={{ backgroundColor: value ? color : 'rgba(255,255,255,0.1)' }}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: value ? 'translateX(1.125rem)' : 'translateX(0.125rem)' }}
      />
    </button>
  );
}

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
            <Toggle value={isAdminMaster} onChange={setIsAdminMaster} color="#EF4444" />
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

// ─── Enterprise Edit Access Side Panel ───────────────────────────────────────

interface EditAccessPanelProps {
  user: UserProfile;
  cargos: Cargo[];
  modules: PermissionModule[];
  existingPermissions: UserPermission[];
  onClose: () => void;
  onSave: () => void;
  actorEmail: string;
}

function EditAccessPanel({ user, cargos, onClose, onSave, actorEmail, modules, existingPermissions }: EditAccessPanelProps) {
  const [role, setRole] = useState(user.role || '');
  const [cargoId, setCargoId] = useState(user.cargo_id || '');
  const [squad, setSquad] = useState(user.squad || '');
  const [squads, setSquads] = useState<string[]>(user.squads || []);
  const [editableSquads, setEditableSquads] = useState<string[]>([]);
  const [statusUsuario, setStatusUsuario] = useState(user.status_usuario || 'ativo');
  const [nivel, setNivel] = useState(user.nivel || 'Junior');
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [scopeType, setScopeType] = useState<'all' | 'squad' | 'analistas' | 'proprio'>('squad');
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    SYSTEM_MODULES.forEach((mod) => { m[mod.id] = false; });
    return m;
  });
  const [pageActions, setPageActions] = useState<Record<string, Record<string, boolean>>>(() => {
    const p: Record<string, Record<string, boolean>> = {};
    SYSTEM_MODULES.forEach((mod) => {
      mod.pages.forEach((page) => {
        p[page] = {};
        PAGE_ACTIONS.forEach((a) => { p[page][a.key] = false; });
      });
    });
    return p;
  });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['dh']));
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
  const [activeSection, setActiveSection] = useState<'identity' | 'squads' | 'scope' | 'modules' | 'pages' | 'matrix'>('identity');

  const toggleSquad = (sq: string) => setSquads((prev) => prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]);
  const toggleEditableSquad = (sq: string) => setEditableSquads((prev) => prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]);
  const toggleModule = (id: string) => setModuleToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  const togglePageAction = (page: string, action: string) => setPageActions((prev) => ({ ...prev, [page]: { ...prev[page], [action]: !prev[page][action] } }));
  const toggleExpandModule = (id: string) => setExpandedModules((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const grantAllModule = (modId: string) => {
    const mod = SYSTEM_MODULES.find((m) => m.id === modId);
    if (!mod) return;
    setPageActions((prev) => {
      let updated = { ...prev };
      mod.pages.forEach((page) => {
        updated[page] = {};
        PAGE_ACTIONS.forEach((a) => { updated[page][a.key] = true; });
      });
      return updated;
    });
  };

  const revokeAllModule = (modId: string) => {
    const mod = SYSTEM_MODULES.find((m) => m.id === modId);
    if (!mod) return;
    setPageActions((prev) => {
      let updated = { ...prev };
      mod.pages.forEach((page) => {
        updated[page] = {};
        PAGE_ACTIONS.forEach((a) => { updated[page][a.key] = false; });
      });
      return updated;
    });
  };

  const togglePerm = (moduleName: string, action: string) => {
    setPerms((prev) => ({
      ...prev,
      [moduleName]: { ...prev[moduleName], [action]: !prev[moduleName][action as keyof UserPermission] },
    }));
  };

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

      await supabase.from('user_profiles').update(payload).eq('id', user.id);
      await supabase.from('pre_registered_users').update({ role, cargo_id: cargoId || null, squad: squad || null, squads: payload.squads, is_active: isActive, status_usuario: statusUsuario, nivel, updated_at: new Date().toISOString() }).eq('email', user.email.toLowerCase());

      // Save module permissions
      if (modules.length > 0) {
        const upserts = Object.values(perms).map((p) => ({ ...p, updated_at: new Date().toISOString() }));
        await supabase.from('user_permissions').upsert(upserts, { onConflict: 'user_profile_id,module_name' }).then(() => {}).catch(() => {});
      }

      await supabase.from('permission_logs').insert({
        actor_email: actorEmail, target_email: user.email,
        action: 'acesso_editado', entity_type: 'usuario', entity_id: user.id,
        details: `Acesso de "${user.full_name || user.email}" atualizado — cargo: ${role}, escopo: ${scopeType}, status: ${statusUsuario}`,
      }).then(() => {}).catch(() => {});

      onSave();
    } catch (e: any) { setError(e?.message || 'Erro ao salvar'); }
    setLoading(false);
  };

  const selectedCargo = cargos.find((c) => c.id === cargoId);

  const sections = [
    { id: 'identity', label: 'Identidade', icon: <UserCheck size={13} /> },
    { id: 'squads', label: 'Squads', icon: <Users size={13} /> },
    { id: 'scope', label: 'Escopo', icon: <Globe size={13} /> },
    { id: 'modules', label: 'Módulos', icon: <Layers size={13} /> },
    { id: 'pages', label: 'Páginas', icon: <FileText size={13} /> },
    { id: 'matrix', label: 'Matriz', icon: <BarChart3 size={13} /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      {/* Backdrop click */}
      <div className="flex-1" onClick={onClose} />
      {/* Side Panel */}
      <div className="w-full max-w-2xl flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#07101F', borderLeft: '1px solid rgba(56,189,248,0.2)', boxShadow: '-24px 0 64px rgba(0,0,0,0.7)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(90deg, #0F1B31, #07101F)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: selectedCargo?.cor || '#1E40AF' }}>
              {(user.full_name || user.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{user.full_name || user.email}</h3>
              <p className="text-xs" style={{ color: '#94A3B8' }}>Editar Acesso Enterprise</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>

        {/* Section Nav */}
        <div className="flex gap-1 px-4 py-2 flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0A1525' }}>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id as any)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={{ backgroundColor: activeSection === s.id ? 'rgba(56,189,248,0.15)' : 'transparent', color: activeSection === s.id ? '#38BDF8' : '#64748B', border: activeSection === s.id ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent' }}>
              {s.icon}{s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* A. IDENTIDADE */}
          {activeSection === 'identity' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)' }}>
                <p className="text-xs font-semibold text-sky-400 mb-0.5">Identidade do Usuário</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Cargo, nível, status e ativação no sistema</p>
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
                  <label className="block text-xs font-semibold text-white mb-2">Role (Sistema)</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
                    <option value="">Selecionar...</option>
                    {['Admin','Coordenador','Coordenador Geral','Gestor','Gerente','Auditor','QA','Analista','Visualizador'].map((r) => <option key={r} value={r}>{r}</option>)}
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
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p className="text-sm font-medium text-white">Usuário Ativo</p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Usuários inativos não acessam o sistema</p>
                </div>
                <Toggle value={isActive} onChange={setIsActive} color="#22C55E" />
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold text-slate-400 mb-2">Informações do Usuário</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#64748B' }}>E-mail</span>
                    <span className="text-slate-300 font-mono">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#64748B' }}>Cadastrado em</span>
                    <span className="text-slate-300">{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. SQUADS */}
          {activeSection === 'squads' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)' }}>
                <p className="text-xs font-semibold text-purple-400 mb-0.5">Configuração de Squads</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Define quais squads o usuário pode ver, editar e gerenciar</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-2">Squad Principal</label>
                <select value={squad} onChange={(e) => setSquad(e.target.value)} style={selectStyle}>
                  <option value="">Sem squad específica</option>
                  {SQUAD_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-2">Squads Visíveis</label>
                <p className="text-xs mb-2" style={{ color: '#64748B' }}>Squads que o usuário pode visualizar dados</p>
                <div className="flex flex-wrap gap-2">
                  {SQUAD_OPTIONS.map((sq) => (
                    <button key={sq} type="button" onClick={() => toggleSquad(sq)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: squads.includes(sq) ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)', border: squads.includes(sq) ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.08)', color: squads.includes(sq) ? '#38BDF8' : '#94A3B8' }}>
                      {squads.includes(sq) ? '✓ ' : ''}{sq}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-2">Squads Editáveis</label>
                <p className="text-xs mb-2" style={{ color: '#64748B' }}>Squads onde o usuário pode editar registros</p>
                <div className="flex flex-wrap gap-2">
                  {SQUAD_OPTIONS.map((sq) => (
                    <button key={sq} type="button" onClick={() => toggleEditableSquad(sq)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: editableSquads.includes(sq) ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', border: editableSquads.includes(sq) ? '1px solid rgba(167,139,250,0.35)' : '1px solid rgba(255,255,255,0.08)', color: editableSquads.includes(sq) ? '#A78BFA' : '#94A3B8' }}>
                      {editableSquads.includes(sq) ? '✓ ' : ''}{sq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. ESCOPO */}
          {activeSection === 'scope' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.12)' }}>
                <p className="text-xs font-semibold text-teal-400 mb-0.5">Escopo de Dados</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Define quais registros o usuário consegue visualizar e operar</p>
              </div>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'Todos os dados', desc: 'Acesso irrestrito a todos os registros do sistema', color: '#EF4444', icon: '🌐' },
                  { value: 'squad', label: 'Apenas squads vinculadas', desc: 'Vê somente dados das squads configuradas acima', color: '#38BDF8', icon: '👥' },
                  { value: 'analistas', label: 'Apenas analistas vinculados', desc: 'Vê somente analistas diretamente vinculados ao usuário', color: '#A78BFA', icon: '👤' },
                  { value: 'proprio', label: 'Apenas próprios registros', desc: 'Acesso restrito aos próprios registros criados', color: '#22C55E', icon: '🔒' },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setScopeType(opt.value as any)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{
                      backgroundColor: scopeType === opt.value ? `${opt.color}10` : 'rgba(255,255,255,0.02)',
                      border: scopeType === opt.value ? `1px solid ${opt.color}35` : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    <span className="text-lg flex-shrink-0 mt-0.5">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{opt.label}</p>
                        {scopeType === opt.value && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${opt.color}20`, color: opt.color }}>Ativo</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{opt.desc}</p>
                    </div>
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center"
                      style={{ borderColor: scopeType === opt.value ? opt.color : 'rgba(255,255,255,0.2)', backgroundColor: scopeType === opt.value ? opt.color : 'transparent' }}>
                      {scopeType === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-xs font-semibold text-amber-400 mb-1">⚠️ Regras por Cargo</p>
                <div className="space-y-1 text-xs" style={{ color: '#94A3B8' }}>
                  <p><strong className="text-white">Coordenador:</strong> recomendado "Apenas squads vinculadas"</p>
                  <p><strong className="text-white">Gestor:</strong> pode ter múltiplas squads configuradas</p>
                  <p><strong className="text-white">Qualidade:</strong> pode ver todas ou squads específicas</p>
                  <p><strong className="text-white">Admin:</strong> acesso total recomendado</p>
                </div>
              </div>
            </div>
          )}

          {/* D. MÓDULOS */}
          {activeSection === 'modules' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <p className="text-xs font-semibold text-green-400 mb-0.5">Módulos do Sistema</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Ative os módulos que este usuário pode acessar</p>
              </div>
              <div className="space-y-2">
                {SYSTEM_MODULES.map((mod) => (
                  <div key={mod.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${moduleToggles[mod.id] ? mod.color + '30' : 'rgba(255,255,255,0.06)'}`, backgroundColor: moduleToggles[mod.id] ? `${mod.color}06` : 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15`, border: `1px solid ${mod.color}25` }}>
                          <Layers size={13} style={{ color: mod.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{mod.label}</p>
                          <p className="text-xs" style={{ color: '#64748B' }}>{mod.pages.length} páginas</p>
                        </div>
                      </div>
                      <Toggle value={moduleToggles[mod.id]} onChange={() => toggleModule(mod.id)} color={mod.color} />
                    </div>
                    {moduleToggles[mod.id] && (
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {mod.pages.map((page) => (
                          <span key={page} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${mod.color}12`, color: mod.color, border: `1px solid ${mod.color}20` }}>{page}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E. PÁGINAS */}
          {activeSection === 'pages' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <p className="text-xs font-semibold text-amber-400 mb-0.5">Permissões por Página</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Configure ações individuais por página do sistema</p>
              </div>
              {SYSTEM_MODULES.map((mod) => (
                <div key={mod.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    type="button"
                    onClick={() => toggleExpandModule(mod.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-all"
                    style={{ backgroundColor: '#0F1B31' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
                      <span className="text-sm font-semibold text-white">{mod.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${mod.color}15`, color: mod.color }}>{mod.pages.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); grantAllModule(mod.id); }} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>Tudo</button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); revokeAllModule(mod.id); }} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>Nada</button>
                      {expandedModules.has(mod.id) ? <ChevronDown size={14} style={{ color: '#64748B' }} /> : <ChevronRight size={14} style={{ color: '#64748B' }} />}
                    </div>
                  </button>
                  {expandedModules.has(mod.id) && (
                    <div className="border-t border-white/5">
                      {mod.pages.map((page, pi) => (
                        <div key={page} className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: pi < mod.pages.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', backgroundColor: pi % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                          <span className="text-xs text-slate-300 w-36 flex-shrink-0 font-medium">{page}</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {PAGE_ACTIONS.map((action) => (
                              <button key={action.key} type="button" onClick={() => togglePageAction(page, action.key)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                                style={{
                                  backgroundColor: pageActions[page]?.[action.key] ? `${action.color}18` : 'rgba(255,255,255,0.03)',
                                  border: pageActions[page]?.[action.key] ? `1px solid ${action.color}35` : '1px solid rgba(255,255,255,0.07)',
                                  color: pageActions[page]?.[action.key] ? action.color : '#64748B',
                                }}>
                                {action.icon}
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* F. MATRIZ */}
          {activeSection === 'matrix' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)' }}>
                <p className="text-xs font-semibold text-sky-400 mb-0.5">Matriz de Permissões por Módulo</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Permissões granulares por módulo do sistema</p>
              </div>
              {modules.length > 0 ? (
                <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: '#0A1525', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <th className="text-left py-3 px-3 font-semibold text-white" style={{ minWidth: '140px' }}>Módulo</th>
                        {PERMISSION_ACTIONS.map((a) => (
                          <th key={a.key} className="text-center py-3 px-2 font-semibold" style={{ color: a.color, minWidth: '52px', fontSize: '10px' }}>{a.short}</th>
                        ))}
                        <th className="text-center py-3 px-2 font-semibold text-slate-500" style={{ minWidth: '70px', fontSize: '10px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.sort((a, b) => a.sort_order - b.sort_order).map((mod, i) => {
                        const p = perms[mod.nome];
                        if (!p) return null;
                        return (
                          <tr key={mod.nome} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-white text-xs">{mod.label}</p>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => (
                              <td key={action.key} className="py-2.5 px-2 text-center">
                                <button
                                  onClick={() => togglePerm(mod.nome, action.key)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center mx-auto transition-all hover:scale-110"
                                  style={{
                                    backgroundColor: p[action.key as keyof UserPermission] ? `${action.color}20` : 'rgba(255,255,255,0.04)',
                                    border: p[action.key as keyof UserPermission] ? `1px solid ${action.color}45` : '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  {p[action.key as keyof UserPermission] && <CheckCircle size={11} style={{ color: action.color }} />}
                                </button>
                              </td>
                            ))}
                            <td className="py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => {
                                  setPerms((prev) => ({ ...prev, [mod.nome]: { ...prev[mod.nome], can_view: true, can_edit: true, can_delete: true, can_import: true, can_export: true, can_close_cycle: true, can_reopen_cycle: true, can_approve: true, can_admin: true } }));
                                }} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>✓</button>
                                <button onClick={() => {
                                  setPerms((prev) => ({ ...prev, [mod.nome]: { ...prev[mod.nome], can_view: false, can_edit: false, can_delete: false, can_import: false, can_export: false, can_close_cycle: false, can_reopen_cycle: false, can_approve: false, can_admin: false } }));
                                }} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>✗</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center" style={{ color: '#64748B' }}>
                  <Database size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Módulos não configurados no banco</p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', backgroundColor: '#0A1525' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#1E40AF' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {loading ? 'Salvando...' : 'Salvar Acesso'}
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
        email: email.trim().toLowerCase(), full_name: fullName.trim(), role: role || 'Coordenador',
        cargo_id: cargoId || null, squad: squad || null, squads: allSquads,
        is_active: true, status_usuario: 'ativo', nivel, updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      if (err) throw new Error(`Erro ao cadastrar: ${err.message}`);
      await supabase.from('permission_logs').insert({ actor_email: actorEmail, target_email: email, action: 'usuario_pre_cadastrado', entity_type: 'usuario', details: `Usuário "${fullName}" pré-cadastrado com role "${role}"` }).then(() => {}).catch(() => {});
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
          <div><label className="block text-xs font-semibold text-white mb-2">Nome Completo *</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" style={inputStyle} /></div>
          <div><label className="block text-xs font-semibold text-white mb-2">E-mail Google *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@gmail.com" style={inputStyle} /></div>
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
              {['Admin','Coordenador','Coordenador Geral','Gestor','Gerente','Auditor','QA','Analista','Visualizador'].map((r) => <option key={r} value={r}>{r}</option>)}
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

// ─── Profile Photo Upload Modal ───────────────────────────────────────────────

interface PhotoUploadModalProps {
  user: UserProfile;
  onClose: () => void;
  onSave: (url: string) => void;
}

function PhotoUploadModal({ user, onClose, onSave }: PhotoUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Arquivo muito grande. Máximo 5MB.'); return; }
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são permitidas.'); return; }

    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('analistas-avatar')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('analistas-avatar').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Erro ao obter URL pública');

      // Update user_profiles with avatar_url
      await supabase.from('user_profiles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id);

      onSave(publicUrl);
    } catch (err: any) {
      setError(err?.message || 'Erro ao fazer upload');
    }
    setUploading(false);
  };

  const initials = (user.full_name || user.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="font-bold text-white flex items-center gap-2"><Camera size={15} style={{ color: '#38BDF8' }} /> Foto de Perfil</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>
        <div className="p-5 flex flex-col items-center gap-4">
          {/* Preview */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: preview ? 'transparent' : 'linear-gradient(135deg, #1E40AF, #3B82F6)', border: '3px solid rgba(56,189,248,0.3)' }}>
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <Loader2 size={20} className="animate-spin text-sky-400" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white text-center">{user.full_name || user.email}</p>
            <p className="text-xs text-center mt-0.5" style={{ color: '#64748B' }}>{user.role || 'Usuário'}</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ backgroundColor: '#1E40AF', border: '1px solid rgba(56,189,248,0.3)' }}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Enviando...' : 'Selecionar Foto'}
          </button>
          <p className="text-xs text-center" style={{ color: '#64748B' }}>JPG, PNG ou WebP · Máximo 5MB</p>
          {error && <p className="text-xs px-3 py-2 rounded-lg w-full text-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}
        </div>
        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Fechar</button>
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
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((a) => a.id)));
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
          nome, email: (row['email'] || row['Email'] || '').toString().trim(),
          squad: (row['squad'] || row['Squad'] || row['equipe'] || row['Equipe'] || '').toString().trim(),
          equipe: (row['equipe'] || row['Equipe'] || row['squad'] || row['Squad'] || '').toString().trim(),
          coordenador: (row['coordenador'] || row['Coordenador'] || '').toString().trim(),
          nivel: (row['nivel'] || row['Nível'] || 'Junior').toString().trim(),
          status: (row['status'] || row['Status'] || 'ativo').toString().toLowerCase().trim(),
          updated_at: new Date().toISOString(),
        };
        const { data: existing } = await supabase.from('analistas').select('id').eq('nome', nome).maybeSingle();
        if (existing) { await supabase.from('analistas').update(payload).eq('id', existing.id); updated++; }
        else { await supabase.from('analistas').insert({ ...payload, created_at: new Date().toISOString() }); imported++; }
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
            Excluir {selectedIds.size}
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
                  <th className="py-3 px-4 text-left"><input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded" /></th>
                  {['Nome', 'Squad', 'Coordenador', 'Nível', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: selectedIds.has(a.id) ? 'rgba(56,189,248,0.04)' : 'transparent' }}>
                    <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="w-4 h-4 rounded" /></td>
                    <td className="py-3 px-4"><p className="font-medium text-white">{a.nome}</p>{a.email && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{a.email}</p>}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.squad || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.coordenador || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.nivel || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${STATUS_COLORS[a.status] || '#94A3B8'}15`, color: STATUS_COLORS[a.status] || '#94A3B8' }}>{a.status}</span>
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
                    <Users size={28} className="mx-auto mb-2 opacity-30" />Nenhum analista encontrado
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

// ─── Integrações Tab ──────────────────────────────────────────────────────────

interface IntegrationToken {
  id: string;
  label: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

interface IntegrationLog {
  id: string;
  received_at: string;
  source: string;
  periodo: string | null;
  analista: string | null;
  squad: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

function IntegracoesTab() {
  const [tokens, setTokens] = useState<IntegrationToken[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const [tokensRes, logsRes] = await Promise.all([
        supabase.from('integration_tokens').select('*').order('created_at', { ascending: false }),
        supabase.from('integration_request_logs').select('*').order('received_at', { ascending: false }).limit(100),
      ]);
      setTokens(tokensRes.data || []);
      setLogs(logsRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleCopyEndpoint = () => {
    const url = `${window.location.origin}/api/receber-avaliacao`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const statusColor = (status: string) => {
    if (status === 'success' || status === 'received') return '#22C55E';
    if (status === 'error') return '#EF4444';
    return '#F59E0B';
  };

  return (
    <div className="space-y-6">
      <div style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-1"><Activity size={16} style={{ color: '#38BDF8' }} /><h2 className="text-base font-semibold text-white">API de Integração</h2></div>
          <p className="text-xs" style={{ color: '#94A3B8' }}>Endpoint para receber avaliações de sistemas externos</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>ENDPOINT</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg text-xs font-mono text-white" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>POST /api/receber-avaliacao</code>
              <button onClick={handleCopyEndpoint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" style={{ backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'rgba(56,189,248,0.1)', color: copied ? '#22C55E' : '#38BDF8', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(56,189,248,0.2)'}` }}>
                <Copy size={12} />{copied ? 'Copiado!' : 'Copiar URL'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: '#94A3B8' }}>AUTENTICAÇÃO</label>
            <div className="px-3 py-2 rounded-lg text-xs font-mono" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
              Authorization: Bearer <span style={{ color: '#38BDF8' }}>{'{INTEGRATION_API_TOKEN}'}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div><h2 className="text-base font-semibold text-white">Tokens de Integração</h2><p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Tokens registrados no banco de dados</p></div>
          <button onClick={loadData} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
        {loading ? <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin" style={{ color: '#38BDF8' }} /></div> : tokens.length === 0 ? (
          <div className="py-10 text-center" style={{ color: '#94A3B8' }}><Key size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhum token registrado</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Label', 'Status', 'Criado em', 'Último uso', 'Expira em'].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>)}
              </tr></thead>
              <tbody>{tokens.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="py-3 px-4 font-medium text-white">{t.label}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: t.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: t.is_active ? '#22C55E' : '#EF4444' }}>{t.is_active ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{t.last_used_at ? new Date(t.last_used_at).toLocaleString('pt-BR') : '—'}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{t.expires_at ? new Date(t.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem' }}>
        <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-base font-semibold text-white">Logs de Requisições</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Últimas 100 chamadas à API de integração</p>
        </div>
        {loading ? <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin" style={{ color: '#38BDF8' }} /></div> : logs.length === 0 ? (
          <div className="py-10 text-center" style={{ color: '#94A3B8' }}><Database size={28} className="mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma requisição registrada</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Data/Hora', 'Analista', 'Squad', 'Período', 'Status', 'Duração'].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>)}
              </tr></thead>
              <tbody>{logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{new Date(log.received_at).toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-4 text-xs text-white">{log.analista || '—'}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.squad || '—'}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.periodo || '—'}</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${statusColor(log.status)}15`, color: statusColor(log.status) }}>{log.status}</span>{log.error_message && <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>{log.error_message.substring(0, 60)}</p>}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                </tr>
              ))}</tbody>
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
  const [showAddUser, setShowAddUser] = useState(false);
  const [photoUploadUser, setPhotoUploadUser] = useState<UserProfile | undefined>();
  const [editingCargo, setEditingCargo] = useState<Cargo | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'user' | 'cargo'; id: string; label?: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [rbacSearch, setRbacSearch] = useState('');
  const [rbacCollapsed, setRbacCollapsed] = useState<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      if (!supabase) return;
      fetch('/api/admin/sync-auth-users').catch(() => {});
      const [usersRes, preRegRes, cargosRes, modulesRes, permsRes, logsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('pre_registered_users').select('*').order('created_at', { ascending: false }),
        supabase.from('cargos').select('*').order('nome'),
        supabase.from('permission_modules').select('*').order('sort_order'),
        supabase.from('user_permissions').select('*'),
        supabase.from('permission_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ]);
      const profileUsers: UserProfile[] = (usersRes.data || []) as UserProfile[];
      const preRegUsers: UserProfile[] = ((preRegRes.data || []) as any[]).map((u: any) => ({ ...u, full_name: u.full_name || '', status_usuario: u.status_usuario || 'ativo', squads: u.squads || [], equipes: u.equipes || [], is_active: u.is_active !== false, _source: 'pre_registered' }));
      const profileEmails = new Set(profileUsers.map((u) => u.email?.toLowerCase()));
      const uniquePreReg = preRegUsers.filter((u) => !profileEmails.has(u.email?.toLowerCase()));
      const allUsers = [...profileUsers, ...uniquePreReg];
      setUsers(allUsers);
      if (cargosRes.data) {
        const cargosWithCount = (cargosRes.data as Cargo[]).map((c) => ({ ...c, _userCount: allUsers.filter((u: any) => u.cargo_id === c.id).length || 0 }));
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
        const user = users.find((u) => u.id === deleteConfirm.id);
        if (user?.email) await supabase.from('pre_registered_users').delete().eq('email', user.email.toLowerCase()).then(() => {}).catch(() => {});
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
      if (emails.length > 0) await supabase.from('pre_registered_users').delete().in('email', emails).then(() => {}).catch(() => {});
      setSelectedUserIds(new Set());
      setBulkDeleteConfirm(false);
      loadAll();
      showSuccessToast(`${ids.length} usuário${ids.length !== 1 ? 's' : ''} excluído${ids.length !== 1 ? 's' : ''}!`);
    } catch (e) { console.error(e); }
    setBulkDeleteLoading(false);
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const filteredUsers = users.filter((u) => {
    const q = searchUsers.toLowerCase();
    const matchSearch = !searchUsers || (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || u.status_usuario === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const toggleSelectAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'usuarios', label: 'Usuários', icon: <Users size={14} />, badge: users.length },
    { id: 'cargos', label: 'Cargos', icon: <Briefcase size={14} />, badge: cargos.length },
    { id: 'permissoes', label: 'Permissões', icon: <Lock size={14} /> },
    { id: 'escopos', label: 'Escopos', icon: <Globe size={14} /> },
    { id: 'logs', label: 'Logs de Acesso', icon: <History size={14} />, badge: permLogs.length },
    { id: 'auditoria', label: 'Auditoria RBAC', icon: <ShieldCheck size={14} /> },
  ];

  // RBAC matrix filtered pages
  const rbacFilteredModules = SYSTEM_MODULES.filter((mod) => {
    if (!rbacSearch) return true;
    const q = rbacSearch.toLowerCase();
    return mod.label.toLowerCase().includes(q) || mod.pages.some((p) => p.toLowerCase().includes(q));
  });

  const toggleRbacCollapse = (modId: string) => {
    setRbacCollapsed((prev) => { const n = new Set(prev); if (n.has(modId)) n.delete(modId); else n.add(modId); return n; });
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: '#166534', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <CheckCircle size={14} style={{ color: '#22C55E' }} />{saveSuccess}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05))', border: '1px solid rgba(56,189,248,0.25)' }}>
            <ShieldCheck size={22} style={{ color: '#38BDF8' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Controle de Acessos Enterprise</h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Centro de Governança do QualiVisão — RBAC visual, sem alterar código</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {[
            { label: 'Usuários', value: users.length, color: '#38BDF8', icon: <Users size={13} /> },
            { label: 'Cargos', value: cargos.length, color: '#A78BFA', icon: <Briefcase size={13} /> },
            { label: 'Ativos', value: users.filter((u) => u.is_active !== false).length, color: '#22C55E', icon: <UserCheck size={13} /> },
            { label: 'Inativos', value: users.filter((u) => u.is_active === false).length, color: '#EF4444', icon: <UserX size={13} /> },
            { label: 'Módulos', value: SYSTEM_MODULES.length, color: '#F59E0B', icon: <Layers size={13} /> },
            { label: 'Logs', value: permLogs.length, color: '#06B6D4', icon: <History size={13} /> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}15`, border: `1px solid ${s.color}20` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <p className="text-base font-bold text-white leading-none">{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto" style={{ backgroundColor: '#0A1525', border: '1px solid rgba(255,255,255,0.07)' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative"
            style={{ backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent', color: activeTab === tab.id ? '#FFFFFF' : '#64748B' }}>
            {tab.icon}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: activeTab === tab.id ? '#fff' : '#94A3B8' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Usuários ── */}
      {activeTab === 'usuarios' && (
        <div style={cardStyle}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-base font-bold text-white">Painel de Governança — Usuários</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} · {users.filter((u) => u.is_active !== false).length} ativo{users.filter((u) => u.is_active !== false).length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
                <input value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} placeholder="Buscar usuário..." style={{ ...inputStyle, paddingLeft: '2rem', width: '180px', height: '36px', fontSize: '0.8rem' }} />
              </div>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ ...selectStyle, width: '130px', height: '36px', fontSize: '0.8rem' }}>
                <option value="">Todos cargos</option>
                {['Admin','Coordenador','Coordenador Geral','Gestor','Gerente','Auditor','QA','Analista','Visualizador'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, width: '120px', height: '36px', fontSize: '0.8rem' }}>
                <option value="">Todos status</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
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
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="py-3 px-4 text-left">
                      <input type="checkbox" checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length} onChange={toggleSelectAllUsers} className="w-4 h-4 rounded" />
                    </th>
                    {['Usuário', 'Cargo / Role', 'Nível', 'Squads', 'Status', 'Módulos', 'Permissões', 'Ações'].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{h}</th>
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
                    const userPerms = userPermissions.filter((p) => p.user_profile_id === u.id);
                    const totalGranted = userPerms.reduce((acc, p) => acc + PERMISSION_ACTIONS.filter((a) => p[a.key as keyof UserPermission]).length, 0);
                    const modulesConfigured = userPerms.length;
                    const userSquads = u.squads?.length > 0 ? u.squads : (u.squad ? [u.squad] : []);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: isSelected ? 'rgba(56,189,248,0.04)' : 'transparent' }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? 'rgba(56,189,248,0.04)' : 'transparent'; }}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectUser(u.id)} className="w-4 h-4 rounded" />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: roleColor, opacity: u.is_active === false ? 0.5 : 1 }}>{initials}</div>
                            <div>
                              <p className="font-semibold text-white text-sm leading-tight">{u.full_name || '—'}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {cargo && <span className="block px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit" style={{ backgroundColor: `${cargo.cor}18`, color: cargo.cor, border: `1px solid ${cargo.cor}30` }}>{cargo.nome}</span>}
                            {u.role && <span className="block text-[10px]" style={{ color: '#64748B' }}>{u.role}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs" style={{ color: '#94A3B8' }}>{u.nivel || '—'}</td>
                        <td className="py-3 px-3">
                          {userSquads.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {userSquads.slice(0, 2).map((sq: string) => (
                                <span key={sq} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>{sq}</span>
                              ))}
                              {userSquads.length > 2 && <span className="text-[10px] text-slate-500">+{userSquads.length - 2}</span>}
                            </div>
                          ) : <span className="text-[10px]" style={{ color: '#475569' }}>—</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: statusColor }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                            {(u.status_usuario || 'ativo').charAt(0).toUpperCase() + (u.status_usuario || 'ativo').slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-semibold" style={{ color: modulesConfigured > 0 ? '#A78BFA' : '#475569' }}>
                            {modulesConfigured > 0 ? `${modulesConfigured} módulo${modulesConfigured !== 1 ? 's' : ''}` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-semibold" style={{ color: totalGranted > 0 ? '#22C55E' : '#475569' }}>
                            {totalGranted > 0 ? `${totalGranted} perm.` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => setEditingUser(u)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: '#38BDF8' }} title="Editar Acesso">
                              <SlidersHorizontal size={13} />
                            </button>
                            <button onClick={() => setDeleteConfirm({ type: 'user', id: u.id, label: u.full_name || u.email })} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: '#EF4444' }} title="Remover">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={9} className="py-16 text-center text-sm" style={{ color: '#64748B' }}>
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
              <h2 className="text-base font-bold text-white">Cargos Configuráveis</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Estrutura base — permissões são definidas individualmente por usuário</p>
            </div>
            <button onClick={() => setEditingCargo(null)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={14} /> Novo Cargo
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cargos.map((cargo) => (
              <div key={cargo.id} className="p-5 rounded-2xl" style={{ ...cardStyle, opacity: cargo.is_active ? 1 : 0.6, border: `1px solid ${cargo.cor}18` }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cargo.cor}15`, border: `1px solid ${cargo.cor}25` }}>
                    <Key size={16} style={{ color: cargo.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-white truncate">{cargo.nome}</h3>
                      {cargo.is_admin_master && <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>MASTER</span>}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{cargo.descricao || 'Sem descrição'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0" style={{ backgroundColor: `${cargo.cor}15`, color: cargo.cor }}>{cargo._userCount || 0} usr</span>
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
              <div className="col-span-3 py-16 text-center" style={{ color: '#64748B' }}>
                <Briefcase size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum cargo cadastrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Permissões — Visual RBAC Matrix ── */}
      {activeTab === 'permissoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Matriz Visual de Permissões RBAC</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Visão consolidada — clique em um usuário para editar acesso completo</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
              <input value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} placeholder="Filtrar usuários..." style={{ ...inputStyle, paddingLeft: '2rem', width: '200px', height: '36px', fontSize: '0.8rem' }} />
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: '#0A1525', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th className="text-left py-3 px-4 font-semibold text-white sticky left-0 z-10" style={{ minWidth: '200px', backgroundColor: '#0A1525' }}>Usuário</th>
                  <th className="text-left py-3 px-3 font-semibold" style={{ color: '#64748B', minWidth: '100px' }}>Cargo</th>
                  <th className="text-left py-3 px-3 font-semibold" style={{ color: '#64748B', minWidth: '80px' }}>Escopo</th>
                  {PERMISSION_ACTIONS.map((a) => (
                    <th key={a.key} className="text-center py-3 px-2 font-semibold" style={{ color: a.color, minWidth: '48px', fontSize: '10px' }}>{a.short}</th>
                  ))}
                  <th className="text-center py-3 px-3 font-semibold" style={{ color: '#64748B', minWidth: '60px' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const cargo = cargos.find((c) => c.id === u.cargo_id);
                  const userPerms = userPermissions.filter((p) => p.user_profile_id === u.id);
                  const initials = (u.full_name || u.email || 'U').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                  const statusColor = STATUS_COLORS[u.status_usuario || 'ativo'] || '#22C55E';
                  // Aggregate permissions across modules
                  const aggPerms: Record<string, boolean> = {};
                  PERMISSION_ACTIONS.forEach((a) => {
                    aggPerms[a.key] = userPerms.some((p) => p[a.key as keyof UserPermission] === true);
                  });
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(56,189,248,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}>
                      <td className="py-2.5 px-4 sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? '#07101F' : '#080f1c' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: cargo?.cor || '#1E40AF' }}>{initials}</div>
                          <div>
                            <p className="font-semibold text-white text-xs leading-tight">{u.full_name || '—'}</p>
                            <span className="text-[9px]" style={{ color: statusColor }}>● {u.status_usuario || 'ativo'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {cargo ? <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${cargo.cor}15`, color: cargo.cor }}>{cargo.nome}</span> : <span className="text-[10px]" style={{ color: '#475569' }}>{u.role || '—'}</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.15)' }}>
                          {u.squads?.length > 0 ? 'squad' : 'all'}
                        </span>
                      </td>
                      {PERMISSION_ACTIONS.map((a) => (
                        <td key={a.key} className="py-2.5 px-2 text-center">
                          <div className="w-5 h-5 rounded mx-auto flex items-center justify-center" style={{ backgroundColor: aggPerms[a.key] ? `${a.color}18` : 'rgba(255,255,255,0.03)', border: aggPerms[a.key] ? `1px solid ${a.color}35` : '1px solid rgba(255,255,255,0.06)' }}>
                            {aggPerms[a.key] && <CheckCircle size={10} style={{ color: a.color }} />}
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center">
                        <button onClick={() => setEditingUser(u)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: '#38BDF8' }} title="Editar Acesso">
                          <SlidersHorizontal size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={13} className="py-12 text-center text-sm" style={{ color: '#64748B' }}>
                    <Lock size={28} className="mx-auto mb-2 opacity-30" />Nenhum usuário encontrado
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {PERMISSION_ACTIONS.map((a) => (
              <span key={a.key} className="flex items-center gap-1.5 text-[10px]" style={{ color: '#64748B' }}>
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: a.color }} />
                <strong style={{ color: a.color }}>{a.short}</strong> = {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Escopos ── */}
      {activeTab === 'escopos' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Regras de Escopo de Dados</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Define o alcance de dados que cada cargo/usuário pode visualizar e operar</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { role: 'Coordenador', scope: 'Apenas squads vinculadas', color: '#38BDF8', icon: '👥', desc: 'Vê somente dados das squads configuradas no perfil. Não acessa dados de outras squads.', squads: 'Configurável por usuário', recommended: true },
              { role: 'Gestor', scope: 'Múltiplas squads', color: '#A78BFA', icon: '🏢', desc: 'Pode ter múltiplas squads configuradas. Acessa dados de todas as squads vinculadas.', squads: 'Múltiplas squads', recommended: true },
              { role: 'Qualidade / QA', scope: 'Todas ou específicas', color: '#2DD4BF', icon: '🔍', desc: 'Pode ver todas as squads para análise de qualidade, ou restrito a squads específicas.', squads: 'Configurável', recommended: false },
              { role: 'Admin', scope: 'Acesso total', color: '#EF4444', icon: '🌐', desc: 'Acesso irrestrito a todos os dados do sistema. Sem limitação de squad ou escopo.', squads: 'Todas', recommended: false },
            ].map((item) => (
              <div key={item.role} className="p-5 rounded-2xl" style={{ backgroundColor: '#0F1B31', border: `1px solid ${item.color}20` }}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-white">{item.role}</h3>
                      {item.recommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${item.color}15`, color: item.color }}>Padrão</span>}
                    </div>
                    <p className="text-xs" style={{ color: '#64748B' }}>{item.desc}</p>
                  </div>
                </div>
                <div className="space-y-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#64748B' }}>Escopo padrão</span>
                    <span className="font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${item.color}12`, color: item.color }}>{item.scope}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: '#64748B' }}>Squads</span>
                    <span className="font-medium text-slate-300">{item.squads}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-300 mb-1">Configuração Visual — Sem Código</p>
                <p className="text-xs" style={{ color: '#64748B' }}>
                  Todas as regras de escopo são configuráveis visualmente pelo admin. Para editar o escopo de um usuário específico, acesse a aba <strong className="text-slate-300">Usuários</strong> e clique em <strong className="text-slate-300">Editar Acesso</strong> → seção <strong className="text-slate-300">Escopo</strong>.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs font-semibold text-amber-400 mb-2">⚠️ Status de Enforcement</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              A interface de configuração está ativa. O enforcement real via <code className="text-amber-300 bg-amber-900/20 px-1 rounded">canAccess()</code> será ativado após validação completa da matriz RBAC. Atualmente, as permissões são salvas no banco mas não bloqueiam acesso.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB: Logs de Acesso ── */}
      {activeTab === 'logs' && (
        <div style={cardStyle}>
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-base font-bold text-white">Logs de Acesso e Auditoria</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Registro completo de alterações em permissões, cargos e usuários</p>
            </div>
            <button onClick={loadAll} className="p-2 rounded-lg hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}><RefreshCw size={14} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Data/Hora', 'Ator', 'Alvo', 'Ação', 'Detalhes'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td className="py-3 px-4 text-xs" style={{ color: '#64748B' }}>
                      <span className="flex items-center gap-1"><Clock size={11} />{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-white font-medium">{log.actor_email || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{log.target_email || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#64748B' }}>{log.details || '—'}</td>
                  </tr>
                ))}
                {permLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-16 text-center text-sm" style={{ color: '#64748B' }}>
                    <History size={32} className="mx-auto mb-3 opacity-30" />
                    Nenhum log registrado ainda
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Auditoria RBAC ── */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Auditoria RBAC — Matriz por Módulo</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Visão completa de módulos, páginas e ações configuráveis do sistema</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
              <input value={rbacSearch} onChange={(e) => setRbacSearch(e.target.value)} placeholder="Buscar módulo ou página..." style={{ ...inputStyle, paddingLeft: '2rem', width: '220px', height: '36px', fontSize: '0.8rem' }} />
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {SYSTEM_MODULES.map((mod) => (
              <div key={mod.id} className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                style={{ backgroundColor: '#0F1B31', border: `1px solid ${mod.color}20` }}
                onClick={() => toggleRbacCollapse(mod.id)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${mod.color}15` }}>
                    <Layers size={11} style={{ color: mod.color }} />
                  </div>
                  <span className="text-xs font-bold text-white truncate">{mod.label}</span>
                </div>
                <p className="text-[10px]" style={{ color: mod.color }}>{mod.pages.length} páginas</p>
              </div>
            ))}
          </div>

          {/* Detailed matrix */}
          {rbacFilteredModules.map((mod) => (
            <div key={mod.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${mod.color}18` }}>
              <button
                type="button"
                onClick={() => toggleRbacCollapse(mod.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-all hover:bg-white/5"
                style={{ background: `linear-gradient(90deg, ${mod.color}08, transparent)` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${mod.color}15`, border: `1px solid ${mod.color}25` }}>
                    <Layers size={14} style={{ color: mod.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{mod.label}</p>
                    <p className="text-[10px]" style={{ color: mod.color }}>{mod.pages.length} páginas · {PAGE_ACTIONS.length} ações por página</p>
                  </div>
                </div>
                {rbacCollapsed.has(mod.id) ? <ChevronRight size={16} style={{ color: '#64748B' }} /> : <ChevronDown size={16} style={{ color: '#64748B' }} />}
              </button>
              {!rbacCollapsed.has(mod.id) && (
                <div className="overflow-x-auto" style={{ borderTop: `1px solid ${mod.color}12` }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th className="text-left py-2.5 px-4 font-semibold text-white" style={{ minWidth: '160px' }}>Página</th>
                        {PAGE_ACTIONS.map((a) => (
                          <th key={a.key} className="text-center py-2.5 px-2 font-semibold" style={{ color: a.color, minWidth: '70px' }}>
                            <div className="flex flex-col items-center gap-0.5">
                              {a.icon}
                              <span style={{ fontSize: '9px' }}>{a.label}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mod.pages.filter((p) => !rbacSearch || p.toLowerCase().includes(rbacSearch.toLowerCase())).map((page, pi) => (
                        <tr key={page} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: pi % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td className="py-2.5 px-4">
                            <span className="text-xs font-semibold text-white">{page}</span>
                          </td>
                          {PAGE_ACTIONS.map((a) => (
                            <td key={a.key} className="py-2.5 px-2 text-center">
                              <div className="w-5 h-5 rounded mx-auto flex items-center justify-center" style={{ backgroundColor: `${a.color}10`, border: `1px solid ${a.color}20` }}>
                                <span style={{ color: a.color, fontSize: '8px' }}>✓</span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}

          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)' }}>
            <p className="text-xs font-semibold text-sky-400 mb-1">ℹ️ Sobre a Auditoria RBAC</p>
            <p className="text-xs" style={{ color: '#64748B' }}>
              Esta aba mostra a estrutura completa de módulos e páginas do sistema. Para configurar permissões individuais por usuário, use a aba <strong className="text-slate-300">Usuários</strong> → <strong className="text-slate-300">Editar Acesso</strong>. O enforcement real será ativado após validação da matriz.
            </p>
          </div>
        </div>
      )}

      {/* Enterprise Edit Access Side Panel */}
      {editingUser && (
        <EditAccessPanel
          user={editingUser}
          cargos={cargos}
          modules={modules}
          existingPermissions={userPermissions.filter((p) => p.user_profile_id === editingUser.id)}
          onClose={() => setEditingUser(undefined)}
          actorEmail={actorEmail}
          onSave={() => { showSuccessToast('Acesso atualizado!'); loadAll(); setEditingUser(undefined); }}
        />
      )}

      {/* Photo Upload Modal */}
      {photoUploadUser && (
        <PhotoUploadModal
          user={photoUploadUser}
          onClose={() => setPhotoUploadUser(undefined)}
          onSave={(url) => {
            showSuccessToast('Foto atualizada com sucesso!');
            setUsers((prev) => prev.map((u) => u.id === photoUploadUser.id ? { ...u, avatar_url: url } as any : u));
            setPhotoUploadUser(undefined);
          }}
        />
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
