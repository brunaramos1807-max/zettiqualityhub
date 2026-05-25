'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Search, Target, Clock, CheckCircle, AlertCircle, TrendingUp, Users, Plus, Edit2, X, Save, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';

interface PdiItem {
  id: string;
  objetivo: string;
  acao_desenvolvimento: string | null;
  prazo: string | null;
  progresso: number;
  status: string;
  responsavel?: string | null;
  ciclo_origem?: string | null;
  evidencia?: string | null;
  created_at: string;
  updated_at?: string;
  analista_nome?: string | null;
  analista_id?: string | null;
  equipe?: string | null;
  ciclo?: string | null;
  source?: 'feedback_pdi' | 'pdi_records';
}

interface AnalistaOption {
  id: string;
  nome: string;
  email?: string | null;
  equipe?: string | null;
}

interface PdiFormData {
  objetivo: string;
  acao_desenvolvimento: string;
  prazo: string;
  responsavel: string;
  status: string;
  progresso: number;
  analista_id: string;
  analista_nome: string;
}

const EMPTY_FORM: PdiFormData = {
  objetivo: '',
  acao_desenvolvimento: '',
  prazo: '',
  responsavel: '',
  status: 'nao_iniciado',
  progresso: 0,
  analista_id: '',
  analista_nome: '',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  nao_iniciado: { label: 'Não Iniciado', color: '#94A3B8', bg: 'rgba(100,116,139,0.12)', icon: <Clock size={11} /> },
  pendente: { label: 'Não Iniciado', color: '#94A3B8', bg: 'rgba(100,116,139,0.12)', icon: <Clock size={11} /> },
  em_andamento: { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', icon: <TrendingUp size={11} /> },
  'Em andamento': { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', icon: <TrendingUp size={11} /> },
  parcial: { label: 'Parcial', color: '#EAB308', bg: 'rgba(234,179,8,0.12)', icon: <AlertCircle size={11} /> },
  concluido: { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={11} /> },
  'Concluído': { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={11} /> },
  atrasado: { label: 'Atrasado', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <AlertCircle size={11} /> },
  cancelado: { label: 'Cancelado', color: '#F87171', bg: 'rgba(248,113,113,0.1)', icon: <AlertCircle size={11} /> },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return '#22C55E';
  if (progress >= 50) return '#38BDF8';
  if (progress >= 20) return '#EAB308';
  return '#94A3B8';
}

// ─── PDI Form Modal ───────────────────────────────────────────────────────────

function PdiFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  analistas,
  isEditing,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PdiFormData) => Promise<void>;
  initialData?: Partial<PdiFormData>;
  analistas: AnalistaOption[];
  isEditing: boolean;
}) {
  const [form, setForm] = useState<PdiFormData>({ ...EMPTY_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [analistaSearch, setAnalistaSearch] = useState('');

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initialData });
    setAnalistaSearch(initialData?.analista_nome || '');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const filteredAnalistas = analistas.filter((a) =>
    a.nome.toLowerCase().includes(analistaSearch.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(analistaSearch.toLowerCase())
  ).slice(0, 8);

  const handleSubmit = async () => {
    if (!form.objetivo.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none';
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 my-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(56,189,248,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target size={16} style={{ color: '#38BDF8' }} />
            {isEditing ? 'Editar PDI' : 'Novo PDI'}
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {/* Analista */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Analista *</label>
            <input
              type="text"
              value={analistaSearch}
              onChange={(e) => { setAnalistaSearch(e.target.value); setForm((p) => ({ ...p, analista_nome: e.target.value, analista_id: '' })); }}
              placeholder="Buscar analista por nome ou email..."
              className={inputCls}
              style={inputStyle}
            />
            {analistaSearch.length > 1 && filteredAnalistas.length > 0 && !form.analista_id && (
              <div className="mt-1 rounded-lg overflow-hidden" style={{ backgroundColor: '#1a2332', border: '1px solid rgba(255,255,255,0.1)' }}>
                {filteredAnalistas.map((a) => (
                  <button
                    key={a.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                    onClick={() => { setForm((p) => ({ ...p, analista_id: a.id, analista_nome: a.nome })); setAnalistaSearch(a.nome); }}
                  >
                    <span className="font-medium">{a.nome}</span>
                    {a.email && <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.email}</span>}
                    {a.equipe && <span className="text-xs ml-2" style={{ color: '#38BDF8' }}>{a.equipe}</span>}
                  </button>
                ))}
              </div>
            )}
            {form.analista_id && (
              <p className="text-xs mt-1" style={{ color: '#22C55E' }}>✓ Analista vinculado por ID</p>
            )}
          </div>

          {/* Objetivo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Objetivo *</label>
            <input
              type="text"
              value={form.objetivo}
              onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}
              placeholder="Objetivo do PDI..."
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Ação */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Ação de Desenvolvimento</label>
            <textarea
              value={form.acao_desenvolvimento}
              onChange={(e) => setForm((p) => ({ ...p, acao_desenvolvimento: e.target.value }))}
              placeholder="Descreva as ações necessárias..."
              rows={3}
              className={inputCls}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Prazo */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Prazo</label>
              <input
                type="text"
                value={form.prazo}
                onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))}
                placeholder="Ex: 06/2026"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Responsável</label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              >
                <option value="nao_iniciado">Não Iniciado</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="parcial">Parcial</option>
                <option value="concluido">Concluído</option>
                <option value="atrasado">Atrasado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Progresso */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Progresso: <span style={{ color: getProgressColor(form.progresso) }}>{form.progresso}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.progresso}
                onChange={(e) => setForm((p) => ({ ...p, progresso: Number(e.target.value) }))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer mt-2"
                style={{ accentColor: getProgressColor(form.progresso) }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.objetivo.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#0369a1' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar PDI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline History ─────────────────────────────────────────────────────────

function PdiTimeline({ pdis }: { pdis: PdiItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const byAnalista: Record<string, PdiItem[]> = {};
  pdis.forEach((p) => {
    const key = p.analista_nome || 'Sem analista';
    if (!byAnalista[key]) byAnalista[key] = [];
    byAnalista[key].push(p);
  });

  const entries = Object.entries(byAnalista).slice(0, expanded ? undefined : 3);

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <History size={14} style={{ color: '#A78BFA' }} /> Histórico por Analista
        </h3>
        {Object.keys(byAnalista).length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {expanded ? <><ChevronUp size={12} /> Recolher</> : <><ChevronDown size={12} /> Ver todos ({Object.keys(byAnalista).length})</>}
          </button>
        )}
      </div>
      <div className="space-y-4">
        {entries.map(([analista, items]) => (
          <div key={analista}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#A78BFA' }}>{analista}</p>
            <div className="relative pl-4">
              <div className="absolute left-0 top-0 bottom-0 w-px" style={{ backgroundColor: 'rgba(167,139,250,0.2)' }} />
              <div className="space-y-2">
                {items.map((pdi, i) => {
                  const st = getStatusConfig(pdi.status);
                  return (
                    <div key={pdi.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: st.color }} />
                      <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-white">{pdi.objetivo}</span>
                          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: st.bg, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {pdi.ciclo_origem && <span>Ciclo {pdi.ciclo_origem}</span>}
                          {pdi.prazo && <span>Prazo: {pdi.prazo}</span>}
                          <span>{pdi.progresso}% concluído</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedbackPdiPage() {
  const supabase = createClient();
  const [pdis, setPdis] = useState<PdiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [analistas, setAnalistas] = useState<AnalistaOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPdi, setEditingPdi] = useState<PdiItem | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const loadAnalistas = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('analistas')
      .select('id, nome, email, equipe')
      .order('nome');
    if (data) setAnalistas(data as AnalistaOption[]);
  };

  const loadPdis = async () => {
    setLoading(true);
    try {
      // Load from feedback_pdi (linked to feedbacks)
      const { data: feedbackPdis } = await supabase
        .from('feedback_pdi')
        .select(`
          id, objetivo, acao_desenvolvimento, prazo, progresso, status,
          responsavel, ciclo_origem, evidencia, created_at, updated_at,
          analistas(id, nome, equipe),
          feedbacks(ciclo)
        `)
        .order('created_at', { ascending: false });

      // Load from pdi_records (from integration)
      const { data: pdiRecords } = await supabase
        .from('pdi_records')
        .select('id, objetivo, prazo, status_pdi, acoes, analista, squad, coordenador, ciclo, created_at, updated_at, qa_score, iepc_score')
        .order('created_at', { ascending: false });

      const combined: PdiItem[] = [];

      // Process feedback_pdi
      if (feedbackPdis) {
        feedbackPdis.forEach((p: any) => {
          combined.push({
            id: p.id,
            objetivo: p.objetivo,
            acao_desenvolvimento: p.acao_desenvolvimento,
            prazo: p.prazo,
            progresso: p.progresso || 0,
            status: p.status || 'pendente',
            responsavel: p.responsavel,
            ciclo_origem: p.ciclo_origem || p.feedbacks?.ciclo,
            evidencia: p.evidencia,
            created_at: p.created_at,
            updated_at: p.updated_at,
            analista_nome: p.analistas?.nome,
            analista_id: p.analistas?.id,
            equipe: p.analistas?.equipe,
            ciclo: p.feedbacks?.ciclo,
            source: 'feedback_pdi',
          });
        });
      }

      // Process pdi_records — try to resolve analista_id by name/email
      if (pdiRecords) {
        for (const p of pdiRecords) {
          const acoes = Array.isArray(p.acoes) ? p.acoes : [];
          const firstAcao = acoes[0];
          const totalAcoes = acoes.length;
          const concluidasAcoes = acoes.filter((a: any) => a.status === 'concluido' || a.status === 'Concluído').length;
          const progresso = totalAcoes > 0 ? Math.round((concluidasAcoes / totalAcoes) * 100) : 0;

          // Try to find analista_id by name match
          let resolvedAnalistaId: string | null = null;
          if (p.analista && analistas.length > 0) {
            const nameParts = p.analista.toLowerCase().split(' ');
            const match = analistas.find((a) => {
              const aName = a.nome.toLowerCase();
              return aName === p.analista.toLowerCase() ||
                (nameParts.length >= 2 && aName.includes(nameParts[0]) && aName.includes(nameParts[nameParts.length - 1])) ||
                (a.email && a.email.toLowerCase().includes(nameParts[0]));
            });
            if (match) resolvedAnalistaId = match.id;
          }

          combined.push({
            id: p.id,
            objetivo: p.objetivo || firstAcao?.descricao || 'PDI sem objetivo definido',
            acao_desenvolvimento: firstAcao?.descricao || null,
            prazo: p.prazo || firstAcao?.prazo || null,
            progresso,
            status: p.status_pdi || 'em_andamento',
            responsavel: p.coordenador,
            ciclo_origem: p.ciclo,
            created_at: p.created_at,
            updated_at: p.updated_at,
            analista_nome: p.analista,
            analista_id: resolvedAnalistaId,
            equipe: p.squad,
            ciclo: p.ciclo,
            source: 'pdi_records',
          });
        }
      }

      setPdis(combined);
    } catch (err) {
      console.error('Error loading PDIs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalistas().then(() => loadPdis());
  }, []);

  const updateStatus = async (pdi: PdiItem, newStatus: string) => {
    try {
      if (pdi.source === 'feedback_pdi') {
        await supabase.from('feedback_pdi').update({ status: newStatus }).eq('id', pdi.id);
      } else {
        await supabase.from('pdi_records').update({ status_pdi: newStatus }).eq('id', pdi.id);
      }
      setPdis((prev) => prev.map((p) => p.id === pdi.id ? { ...p, status: newStatus } : p));
    } catch { /* ignore */ }
  };

  const updateProgresso = async (pdi: PdiItem, progresso: number) => {
    try {
      if (pdi.source === 'feedback_pdi') {
        await supabase.from('feedback_pdi').update({ progresso }).eq('id', pdi.id);
      } else {
        await supabase.from('pdi_records').update({ progresso }).eq('id', pdi.id);
      }
      setPdis((prev) => prev.map((p) => p.id === pdi.id ? { ...p, progresso } : p));
    } catch { /* ignore */ }
  };

  const handleCreatePdi = async (data: PdiFormData) => {
    if (!supabase) return;
    // Resolve analista_id: try by id, then by name/email fallback
    let analistaId = data.analista_id || null;
    if (!analistaId && data.analista_nome) {
      const nameParts = data.analista_nome.toLowerCase().split(' ');
      const match = analistas.find((a) => {
        const aName = a.nome.toLowerCase();
        return aName === data.analista_nome.toLowerCase() ||
          (nameParts.length >= 2 && aName.includes(nameParts[0]) && aName.includes(nameParts[nameParts.length - 1])) ||
          (a.email && a.email.toLowerCase().includes(nameParts[0]));
      });
      if (match) analistaId = match.id;
    }

    const payload: any = {
      objetivo: data.objetivo,
      acao_desenvolvimento: data.acao_desenvolvimento || null,
      prazo: data.prazo || null,
      responsavel: data.responsavel || null,
      status: data.status,
      progresso: data.progresso,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (analistaId) payload.analista_id = analistaId;

    const { data: inserted, error } = await supabase
      .from('feedback_pdi')
      .insert(payload)
      .select()
      .single();

    if (!error && inserted) {
      const newPdi: PdiItem = {
        id: inserted.id,
        objetivo: inserted.objetivo,
        acao_desenvolvimento: inserted.acao_desenvolvimento,
        prazo: inserted.prazo,
        progresso: inserted.progresso || 0,
        status: inserted.status || 'nao_iniciado',
        responsavel: inserted.responsavel,
        created_at: inserted.created_at,
        analista_nome: data.analista_nome || null,
        analista_id: analistaId,
        source: 'feedback_pdi',
      };
      setPdis((prev) => [newPdi, ...prev]);
    }
  };

  const handleEditPdi = async (data: PdiFormData) => {
    if (!supabase || !editingPdi) return;
    let analistaId = data.analista_id || editingPdi.analista_id || null;
    if (!analistaId && data.analista_nome) {
      const nameParts = data.analista_nome.toLowerCase().split(' ');
      const match = analistas.find((a) => {
        const aName = a.nome.toLowerCase();
        return aName === data.analista_nome.toLowerCase() ||
          (nameParts.length >= 2 && aName.includes(nameParts[0]) && aName.includes(nameParts[nameParts.length - 1]));
      });
      if (match) analistaId = match.id;
    }

    const updatePayload: any = {
      objetivo: data.objetivo,
      acao_desenvolvimento: data.acao_desenvolvimento || null,
      prazo: data.prazo || null,
      responsavel: data.responsavel || null,
      status: data.status,
      progresso: data.progresso,
      updated_at: new Date().toISOString(),
    };
    if (analistaId) updatePayload.analista_id = analistaId;

    const table = editingPdi.source === 'feedback_pdi' ? 'feedback_pdi' : 'pdi_records';
    if (editingPdi.source === 'pdi_records') {
      updatePayload.status_pdi = data.status;
      delete updatePayload.status;
    }

    await supabase.from(table).update(updatePayload).eq('id', editingPdi.id);
    setPdis((prev) => prev.map((p) => p.id === editingPdi.id ? {
      ...p,
      objetivo: data.objetivo,
      acao_desenvolvimento: data.acao_desenvolvimento || null,
      prazo: data.prazo || null,
      responsavel: data.responsavel || null,
      status: data.status,
      progresso: data.progresso,
      analista_id: analistaId,
      analista_nome: data.analista_nome || p.analista_nome,
    } : p));
    setEditingPdi(null);
  };

  const equipes = ['', ...Array.from(new Set(pdis.map((p) => p.equipe).filter(Boolean)))];

  const filtered = pdis.filter((p) => {
    if (search && !p.objetivo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.analista_nome?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterEquipe && p.equipe !== filterEquipe) return false;
    return true;
  });

  // KPI counts
  const kpis = {
    total: pdis.length,
    emAndamento: pdis.filter((p) => p.status === 'em_andamento' || p.status === 'Em andamento').length,
    concluidos: pdis.filter((p) => p.status === 'concluido' || p.status === 'Concluído').length,
    atrasados: pdis.filter((p) => p.status === 'atrasado').length,
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen size={22} className="text-sky-400" /> Plano de Desenvolvimento (PDI)
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acompanhamento contínuo dos planos de desenvolvimento individuais
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTimeline((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: showTimeline ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}
            >
              <History size={14} /> Histórico
            </button>
            <button
              onClick={() => { setEditingPdi(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: '#0369a1' }}
            >
              <Plus size={14} /> Novo PDI
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total PDIs', value: kpis.total, color: '#38BDF8', bg: 'rgba(56,189,248,0.08)', icon: <Target size={16} /> },
            { label: 'Em Andamento', value: kpis.emAndamento, color: '#38BDF8', bg: 'rgba(56,189,248,0.08)', icon: <TrendingUp size={16} /> },
            { label: 'Concluídos', value: kpis.concluidos, color: '#22C55E', bg: 'rgba(34,197,94,0.08)', icon: <CheckCircle size={16} /> },
            { label: 'Atrasados', value: kpis.atrasados, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: <AlertCircle size={16} /> },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{k.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.bg, color: k.color }}>{k.icon}</div>
              </div>
              <p className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Timeline History */}
        {showTimeline && pdis.length > 0 && <PdiTimeline pdis={pdis} />}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por analista ou objetivo..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="">Todos os status</option>
            <option value="nao_iniciado">Não Iniciado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="parcial">Parcial</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {equipes.length > 1 && (
            <select
              value={filterEquipe}
              onChange={(e) => setFilterEquipe(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <option value="">Todas as equipes</option>
              {equipes.filter(Boolean).map((e) => <option key={e!} value={e!}>{e}</option>)}
            </select>
          )}
        </div>

        {/* PDI List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando PDIs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <BookOpen size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white font-medium">Nenhum PDI encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {pdis.length === 0
                ? 'Clique em "Novo PDI" para criar o primeiro plano de desenvolvimento' :'Tente ajustar os filtros de busca'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((pdi) => {
              const st = getStatusConfig(pdi.status);
              const progressColor = getProgressColor(pdi.progresso);
              return (
                <div key={pdi.id} className="rounded-xl p-5 transition-all hover:border-white/10"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-semibold text-white text-base">{pdi.objetivo}</span>
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: st.bg, color: st.color }}>
                          {st.icon} {st.label}
                        </span>
                        {pdi.analista_id && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
                            ✓ vinculado
                          </span>
                        )}
                      </div>
                      {pdi.acao_desenvolvimento && (
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{pdi.acao_desenvolvimento}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {pdi.analista_nome && <span className="flex items-center gap-1"><Users size={11} /> {pdi.analista_nome}</span>}
                        {pdi.equipe && <span>{pdi.equipe}</span>}
                        {pdi.ciclo_origem && <span className="flex items-center gap-1"><BookOpen size={11} /> Ciclo {pdi.ciclo_origem}</span>}
                        {pdi.prazo && <span className="flex items-center gap-1"><Clock size={11} /> Prazo: {pdi.prazo}</span>}
                        {pdi.responsavel && <span>Responsável: {pdi.responsavel}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingPdi(pdi); setModalOpen(true); }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
                      >
                        <Edit2 size={11} /> Editar
                      </button>
                      <select
                        value={pdi.status}
                        onChange={(e) => updateStatus(pdi, e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="nao_iniciado">Não Iniciado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="parcial">Parcial</option>
                        <option value="concluido">Concluído</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>Progresso</span>
                      <span className="font-bold" style={{ color: progressColor }}>{pdi.progresso}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pdi.progresso}%`, backgroundColor: progressColor, boxShadow: `0 0 8px ${progressColor}40` }} />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pdi.progresso}
                      onChange={(e) => updateProgresso(pdi, Number(e.target.value))}
                      className="w-full mt-2 h-1 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: progressColor }}
                    />
                  </div>

                  {pdi.evidencia && (
                    <div className="mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                      📎 Evidência: {pdi.evidencia}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <PdiFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPdi(null); }}
        onSave={editingPdi ? handleEditPdi : handleCreatePdi}
        initialData={editingPdi ? {
          objetivo: editingPdi.objetivo,
          acao_desenvolvimento: editingPdi.acao_desenvolvimento || '',
          prazo: editingPdi.prazo || '',
          responsavel: editingPdi.responsavel || '',
          status: editingPdi.status,
          progresso: editingPdi.progresso,
          analista_id: editingPdi.analista_id || '',
          analista_nome: editingPdi.analista_nome || '',
        } : undefined}
        analistas={analistas}
        isEditing={!!editingPdi}
      />
    </EnterpriseLayout>
  );
}
