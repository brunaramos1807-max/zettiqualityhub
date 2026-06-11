'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { fetchCycleScores, fetchNCRecords, fetchElogios } from '@/lib/services/dataService';
import { getActiveCycle } from '@/lib/services/supabaseDataService';
import {
  Users, Award, TrendingUp, AlertTriangle, Star, BarChart2,
  Mail, Phone, Calendar, Clock, ChevronDown, ChevronUp,
  Building2, GitBranch, Shield, Crown, Briefcase, Settings,
  Save, X, Plus, Trash2, RefreshCw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type NivelType = 'gerente' | 'coordenacao_geral' | 'qualidade' | 'coordenador' | 'analista';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  squad: string | null;
  photo_url: string | null;
  phone: string | null;
  birth_date: string | null;
  job_title: string | null;
  admission_date: string | null;
  promotion_history: any[];
}

interface OrgNode {
  userId: string;
  nivel: NivelType;
  cargo: string;
}

interface OrgConfig {
  nodes: OrgNode[];
}

interface CoordMetrics {
  nome: string;
  squad: string;
  qaMedia: number | null;
  iepcMedia: number | null;
  totalNCs: number;
  totalElogios: number;
  totalAnalistas: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NIVEL_CONFIG: Record<NivelType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  gerente: { label: 'Gerente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: <Crown size={14} /> },
  coordenacao_geral: { label: 'Coordenação Geral', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', icon: <Building2 size={14} /> },
  qualidade: { label: 'Qualidade', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: <Shield size={14} /> },
  coordenador: { label: 'Coordenador', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', icon: <Briefcase size={14} /> },
  analista: { label: 'Analista', color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: <Users size={14} /> },
};

const NIVEL_ORDER: NivelType[] = ['gerente', 'coordenacao_geral', 'qualidade', 'coordenador', 'analista'];

const APP_SETTINGS_KEY = 'org_chart_config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function calcTempoEmpresa(admissionDate: string | null): string | null {
  if (!admissionDate) return null;
  const start = new Date(admissionDate);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} ano${years > 1 ? 's' : ''} e ${rem} mês${rem > 1 ? 'es' : ''}` : `${years} ano${years > 1 ? 's' : ''}`;
}

// ─── MemberCard ───────────────────────────────────────────────────────────────

function MemberCard({ user, nivel, cargo, expanded, onToggle }: {
  user: UserProfile;
  nivel: NivelType;
  cargo: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = NIVEL_CONFIG[nivel];
  const tempoEmpresa = calcTempoEmpresa(user.admission_date);
  const promotionHistory: string[] = Array.isArray(user.promotion_history)
    ? user.promotion_history.map((p: any) => p?.cargo || p?.role || String(p)).filter(Boolean)
    : [];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#0F1B31',
        border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: expanded ? `0 8px 32px ${cfg.bg}` : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        {user.photo_url ? (
          <img
            src={user.photo_url}
            alt={user.full_name}
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
            style={{ border: `2px solid ${cfg.border}` }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${cfg.color}40, ${cfg.color}20)`, border: `2px solid ${cfg.border}` }}
          >
            {getInitials(user.full_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-base font-bold text-white">{user.full_name}</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{cargo || user.job_title || user.role}{user.squad ? ` · ${user.squad}` : ''}</p>
        </div>
        <div style={{ color: '#64748B', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {user.email && (
              <div className="flex items-center gap-2 col-span-2">
                <Mail size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{user.phone}</span>
              </div>
            )}
            {user.birth_date && (
              <div className="flex items-center gap-2">
                <Calendar size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{new Date(user.birth_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {tempoEmpresa && (
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{tempoEmpresa} na empresa</span>
              </div>
            )}
          </div>
          {promotionHistory.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white mb-2">Funções Anteriores</p>
              <div className="flex flex-wrap gap-1.5">
                {promotionHistory.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OrgChartVisual ───────────────────────────────────────────────────────────

function OrgChartVisual({ nodes, usersMap }: { nodes: OrgNode[]; usersMap: Record<string, UserProfile> }) {
  const grouped: Partial<Record<NivelType, OrgNode[]>> = {};
  NIVEL_ORDER.forEach((n) => {
    const group = nodes.filter((nd) => nd.nivel === n);
    if (group.length > 0) grouped[n] = group;
  });

  const levels = NIVEL_ORDER.filter((n) => grouped[n]);

  if (levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GitBranch size={32} className="mx-auto mb-3 opacity-20 text-white" />
        <p className="text-sm text-white mb-1">Organograma não configurado</p>
        <p className="text-xs" style={{ color: '#94A3B8' }}>Use o painel de configuração para definir a hierarquia.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-4 overflow-x-auto">
      {levels.map((nivel, idx) => {
        const cfg = NIVEL_CONFIG[nivel];
        const group = grouped[nivel]!;
        return (
          <React.Fragment key={nivel}>
            <div className="flex flex-wrap justify-center gap-3">
              {group.map((nd) => {
                const user = usersMap[nd.userId];
                if (!user) return null;
                return (
                  <div key={nd.userId} className="flex flex-col items-center">
                    <div
                      className="rounded-2xl px-5 py-4 text-center"
                      style={{ backgroundColor: cfg.bg, border: `2px solid ${cfg.border}`, minWidth: '140px', maxWidth: '180px' }}
                    >
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.full_name} className="w-12 h-12 rounded-full object-cover mx-auto mb-2" style={{ border: `2px solid ${cfg.border}` }} />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white mx-auto mb-2" style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}99)` }}>
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      <p className="text-sm font-bold text-white leading-tight">{user.full_name.split(' ')[0]}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: cfg.color }}>{nd.cargo || cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {idx < levels.length - 1 && (
              <div className="w-0.5 h-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

function ConfigPanel({ users, config, onSave, onClose }: {
  users: UserProfile[];
  config: OrgConfig;
  onSave: (cfg: OrgConfig) => Promise<void>;
  onClose: () => void;
}) {
  const [nodes, setNodes] = useState<OrgNode[]>(config.nodes);
  const [saving, setSaving] = useState(false);

  const addNode = () => {
    setNodes((prev) => [...prev, { userId: '', nivel: 'coordenador', cargo: '' }]);
  };

  const removeNode = (idx: number) => {
    setNodes((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateNode = (idx: number, field: keyof OrgNode, value: string) => {
    setNodes((prev) => prev.map((n, i) => i === idx ? { ...n, [field]: value } : n));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ nodes: nodes.filter((n) => n.userId) });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
              <Settings size={15} style={{ color: '#38BDF8' }} />
            </div>
            <h2 className="text-base font-bold text-white">Configurar Organograma</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#64748B' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-xs mb-4" style={{ color: '#64748B' }}>
            Selecione os usuários cadastrados no sistema e defina o nível hierárquico de cada um.
          </p>

          {nodes.map((node, idx) => (
            <div key={idx} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Membro {idx + 1}</span>
                <button onClick={() => removeNode(idx)} className="p-1 rounded hover:bg-red-500/10 transition-colors" style={{ color: '#EF4444' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* User select */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#94A3B8' }}>Usuário</label>
                  <select
                    value={node.userId}
                    onChange={(e) => updateNode(idx, 'userId', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                    style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="">Selecionar usuário...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                {/* Nivel select */}
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#94A3B8' }}>Nível Hierárquico</label>
                  <select
                    value={node.nivel}
                    onChange={(e) => updateNode(idx, 'nivel', e.target.value as NivelType)}
                    className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                    style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    {NIVEL_ORDER.map((n) => (
                      <option key={n} value={n}>{NIVEL_CONFIG[n].label}</option>
                    ))}
                  </select>
                </div>
                {/* Cargo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: '#94A3B8' }}>Cargo / Título (opcional)</label>
                  <input
                    type="text"
                    value={node.cargo}
                    onChange={(e) => updateNode(idx, 'cargo', e.target.value)}
                    placeholder="Ex: Gerente de Operações"
                    className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none placeholder-gray-600"
                    style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addNode}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-colors hover:bg-white/5"
            style={{ border: '1px dashed rgba(255,255,255,0.15)', color: '#64748B' }}
          >
            <Plus size={13} /> Adicionar membro
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5" style={{ color: '#94A3B8' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{ backgroundColor: '#1E40AF', color: '#fff', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? 'Salvando...' : 'Salvar Organograma'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CoordMetricCard ──────────────────────────────────────────────────────────

function CoordMetricCard({ metrics }: { metrics: CoordMetrics }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}>
          {getInitials(metrics.nome)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{metrics.nome}</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{metrics.squad} · {metrics.totalAnalistas} analistas</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'QA Médio', value: metrics.qaMedia != null ? `${metrics.qaMedia}` : '—', color: metrics.qaMedia != null && metrics.qaMedia >= 90 ? '#22C55E' : metrics.qaMedia != null && metrics.qaMedia >= 70 ? '#F59E0B' : '#94A3B8', icon: <BarChart2 size={12} /> },
          { label: 'IEPC Médio', value: metrics.iepcMedia != null ? `${metrics.iepcMedia}%` : '—', color: metrics.iepcMedia != null && metrics.iepcMedia >= 90 ? '#22C55E' : metrics.iepcMedia != null && metrics.iepcMedia >= 70 ? '#F59E0B' : '#94A3B8', icon: <TrendingUp size={12} /> },
          { label: 'NCs', value: metrics.totalNCs, color: metrics.totalNCs > 5 ? '#EF4444' : metrics.totalNCs > 0 ? '#F59E0B' : '#22C55E', icon: <AlertTriangle size={12} /> },
          { label: 'Elogios', value: metrics.totalElogios, color: '#F59E0B', icon: <Star size={12} /> },
        ].map((m) => (
          <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ color: '#64748B' }}>
              {m.icon}
              <span className="text-xs">{m.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuportePage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [orgConfig, setOrgConfig] = useState<OrgConfig>({ nodes: [] });
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [coordMetrics, setCoordMetrics] = useState<CoordMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [activeTab, setActiveTab] = useState<'organograma' | 'coordenadores' | 'suporte'>('organograma');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      // Load users
      const { data: profilesData } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, squad, photo_url, phone, birth_date, job_title, admission_date, promotion_history')
        .eq('is_active', true)
        .order('full_name');

      const profiles: UserProfile[] = (profilesData || []).map((p: any) => ({
        ...p,
        promotion_history: Array.isArray(p.promotion_history) ? p.promotion_history : [],
      }));
      setUsers(profiles);
      const map: Record<string, UserProfile> = {};
      profiles.forEach((u) => { map[u.id] = u; });
      setUsersMap(map);

      // Load org config from app_settings
      const { data: settingData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', APP_SETTINGS_KEY)
        .maybeSingle();

      if (settingData?.value) {
        try {
          const parsed = JSON.parse(settingData.value);
          setOrgConfig(parsed);
        } catch {
          setOrgConfig({ nodes: [] });
        }
      }

      // Load coordinator metrics
      const activeCycle = await getActiveCycle();
      const [scores, ncs, elogios] = await Promise.all([
        fetchCycleScores(activeCycle || undefined),
        fetchNCRecords(activeCycle || undefined),
        fetchElogios(activeCycle || undefined),
      ]);

      const coordMap: Record<string, CoordMetrics> = {};
      scores.forEach((s: any) => {
        const coord = s.coordenador;
        if (!coord) return;
        if (!coordMap[coord]) {
          coordMap[coord] = { nome: coord, squad: s.squad || '', qaMedia: null, iepcMedia: null, totalNCs: 0, totalElogios: 0, totalAnalistas: 0 };
        }
        coordMap[coord].totalAnalistas++;
        if (s.qa_score != null) {
          const prev = coordMap[coord].qaMedia;
          coordMap[coord].qaMedia = prev == null ? s.qa_score : Math.round((prev + s.qa_score) / 2);
        }
        if (s.iepc_score != null) {
          const prev = coordMap[coord].iepcMedia;
          coordMap[coord].iepcMedia = prev == null ? s.iepc_score : Math.round((prev + s.iepc_score) / 2);
        }
      });
      ncs.forEach((nc: any) => {
        const coord = nc.coordenador;
        if (coord && coordMap[coord]) coordMap[coord].totalNCs++;
      });
      elogios.forEach((e: any) => {
        const squad = e.squad;
        const coordEntry = Object.values(coordMap).find((c) => c.squad === squad);
        if (coordEntry) coordEntry.totalElogios++;
      });
      setCoordMetrics(Object.values(coordMap).sort((a, b) => (b.qaMedia || 0) - (a.qaMedia || 0)));
    } catch (err) {
      console.error('Suporte page error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveConfig = async (cfg: OrgConfig) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase
      .from('app_settings')
      .upsert({ key: APP_SETTINGS_KEY, value: JSON.stringify(cfg), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setOrgConfig(cfg);
  };

  const tabs = [
    { id: 'organograma', label: 'Organograma', icon: <GitBranch size={13} /> },
    { id: 'coordenadores', label: 'Métricas Coordenadores', icon: <BarChart2 size={13} /> },
    { id: 'suporte', label: 'Suporte', icon: <Building2 size={13} /> },
  ] as const;

  // Build sorted nodes for display
  const sortedNodes = [...orgConfig.nodes].sort(
    (a, b) => NIVEL_ORDER.indexOf(a.nivel) - NIVEL_ORDER.indexOf(b.nivel)
  );

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Building2 size={18} style={{ color: '#38BDF8' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Suporte & Organograma</h1>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Estrutura organizacional e métricas de equipe</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8' }}
          >
            <Settings size={13} /> Configurar Hierarquia
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94A3B8',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-3" />
            <span className="text-sm" style={{ color: '#94A3B8' }}>Carregando...</span>
          </div>
        ) : (
          <>
            {/* Organograma Tab */}
            {activeTab === 'organograma' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Org Chart */}
                <div className="rounded-2xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <GitBranch size={14} style={{ color: '#38BDF8' }} />
                    Hierarquia Organizacional
                  </h2>
                  <OrgChartVisual nodes={orgConfig.nodes} usersMap={usersMap} />
                </div>

                {/* Member Cards */}
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users size={14} style={{ color: '#A78BFA' }} />
                    Membros da Hierarquia
                    <span className="text-xs font-normal" style={{ color: '#64748B' }}>({sortedNodes.length})</span>
                  </h2>
                  {sortedNodes.length === 0 ? (
                    <div className="rounded-xl p-10 text-center" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Users size={28} className="mx-auto mb-3 opacity-20 text-white" />
                      <p className="text-sm text-white mb-1">Nenhum membro definido</p>
                      <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>Clique em "Configurar Hierarquia" para adicionar membros reais ao organograma.</p>
                      <button
                        onClick={() => setShowConfig(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#1E40AF', color: '#fff' }}
                      >
                        <Settings size={12} /> Configurar agora
                      </button>
                    </div>
                  ) : (
                    sortedNodes.map((node) => {
                      const user = usersMap[node.userId];
                      if (!user) return null;
                      return (
                        <MemberCard
                          key={node.userId}
                          user={user}
                          nivel={node.nivel}
                          cargo={node.cargo}
                          expanded={expandedMember === node.userId}
                          onToggle={() => setExpandedMember(expandedMember === node.userId ? null : node.userId)}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Coordinator Metrics Tab */}
            {activeTab === 'coordenadores' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award size={14} style={{ color: '#F59E0B' }} />
                    Ranking de Coordenadores
                  </h2>
                  <p className="text-xs" style={{ color: '#64748B' }}>Baseado na média consolidada das equipes</p>
                </div>
                {coordMetrics.length === 0 ? (
                  <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <BarChart2 size={32} className="mx-auto mb-3 opacity-20 text-white" />
                    <p className="text-sm text-white mb-1">Nenhuma métrica disponível</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>Importe dados do ciclo para visualizar as métricas dos coordenadores.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {coordMetrics.map((m, i) => (
                      <div key={m.nome} className="relative">
                        {i < 3 && (
                          <div className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : '#CD7F32' }}>
                            {i + 1}
                          </div>
                        )}
                        <CoordMetricCard metrics={m} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Support Tab */}
            {activeTab === 'suporte' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                      <Mail size={15} style={{ color: '#38BDF8' }} />
                    </div>
                    <h3 className="text-sm font-semibold text-white">E-mail</h3>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Para suporte técnico e dúvidas gerais:</p>
                  <a href="mailto:suporte@qualivisao.tec.br" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
                    suporte@qualivisao.tec.br
                  </a>
                </div>
                <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                      <Building2 size={15} style={{ color: '#38BDF8' }} />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Documentação</h3>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Acesse os manuais e guias do sistema:</p>
                  <a href="/documentos" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
                    Ver documentos →
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Config Modal */}
      {showConfig && (
        <ConfigPanel
          users={users}
          config={orgConfig}
          onSave={handleSaveConfig}
          onClose={() => setShowConfig(false)}
        />
      )}
    </EnterpriseLayout>
  );
}
