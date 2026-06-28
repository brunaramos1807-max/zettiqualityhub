'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Search, Target, Clock, CheckCircle, AlertCircle, TrendingUp, Users, Plus, Edit2, X, Save, Loader2, History, ChevronDown, ChevronUp, Trash2, Circle, Download } from 'lucide-react';

// ── Types ──
interface ObjectiveBlock {
  id: string;
  categoria: string;
  objetivo: string;
  acao_esperada: string;
  resultado_esperado: string;
  status: 'cumprido' | 'parcial' | 'nao_cumprido';
  observacao_coordenador: string;
}

function newObjectiveBlock(): ObjectiveBlock {
  return { id: Math.random().toString(36).slice(2), categoria: '', objetivo: '', acao_esperada: '', resultado_esperado: '', status: 'nao_cumprido', observacao_coordenador: '' };
}

function calcProgressFromObjectives(objectives: ObjectiveBlock[]): number {
  if (objectives.length === 0) return 0;
  const total = objectives.reduce((acc, o) => acc + (o.status === 'cumprido' ? 100 : o.status === 'parcial' ? 50 : 0), 0);
  return Math.round(total / objectives.length);
}

function generateMensagemEvolutiva(analista: string, qa: number, iepc: number, ncs: number, elogios: number, aderencia: number): string {
  const qaLabel = qa >= 90 ? 'excelente' : qa >= 75 ? 'sólido' : qa >= 60 ? 'em desenvolvimento' : 'abaixo do esperado';
  const iepcLabel = iepc >= 90 ? 'alta' : iepc >= 70 ? 'adequada' : 'em evolução';
  const ncText = ncs > 0 ? ` Foram identificadas ${ncs} não conformidade${ncs > 1 ? 's' : ''} que demandam atenção e plano de ação estruturado.` : ' Não foram registradas não conformidades no ciclo, demonstrando consistência operacional.';
  const elogioText = elogios > 0 ? ` O analista recebeu ${elogios} elogio${elogios > 1 ? 's' : ''}, evidenciando reconhecimento positivo da equipe e clientes.` : '';
  return `${analista || 'O analista'} apresentou desempenho ${qaLabel} em QA (${qa > 0 ? qa.toFixed(1) : '—'}) com aderência ${iepcLabel} no IEPC (${iepc > 0 ? iepc.toFixed(1) + '%' : '—'}).${ncText}${elogioText} O presente PDI visa estruturar o desenvolvimento contínuo, fortalecendo competências técnicas e comportamentais para evolução sustentada nos próximos ciclos.`;
}

function extractPdiObjectivesFromSnapshot(snapshot: any): ObjectiveBlock[] {
  const blocks = snapshot?.feedback_blocks || snapshot?.feedbackBlocks || {};
  const blockObjectives = blocks?.pdi_objetivos || blocks?.pdiObjetivos || [];
  if (Array.isArray(blockObjectives) && blockObjectives.length > 0) {
    return blockObjectives;
  }

  const rawPdi = snapshot?.pdi;
  if (Array.isArray(rawPdi)) {
    return rawPdi
      .map((item: any) => ({
        id: Math.random().toString(36).slice(2),
        categoria: item.categoria || 'PDI',
        objetivo: item.objetivo || item.objetivo_desenvolvimento || '',
        acao_esperada: item.acao_esperada || item.acao || item.acao_desenvolvimento || '',
        resultado_esperado: item.resultado_esperado || item.resultadoEsperado || '',
        status: 'nao_cumprido' as const,
        observacao_coordenador: '',
      }))
      .filter((item: ObjectiveBlock) => item.objetivo || item.acao_esperada);
  }

  if (rawPdi && typeof rawPdi === 'object') {
    const acoes = Array.isArray(rawPdi.acoes) ? rawPdi.acoes : [];
    const metas = Array.isArray(rawPdi.metas) ? rawPdi.metas : [];
    return acoes.map((acao: string, index: number) => ({
      id: Math.random().toString(36).slice(2),
      categoria: 'PDI',
      objetivo: acao,
      acao_esperada: acao,
      resultado_esperado: metas[index] || '',
      status: 'nao_cumprido' as const,
      observacao_coordenador: '',
    }));
  }

  return [];
}

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
  enterprise_objectives?: ObjectiveBlock[];
  mensagem_evolutiva?: string | null;
}

interface AnalistaOption {
  id: string;
  nome: string;
  email?: string | null;
  equipe?: string | null;
  qa_score?: number;
  iepc_score?: number;
  total_ncs?: number;
  total_elogios?: number;
}

interface PdiFormData {
  analista_id: string;
  analista_nome: string;
  objectives: ObjectiveBlock[];
  mensagem_evolutiva: string;
  prazo: string;
  responsavel: string;
  status: string;
}

const EMPTY_FORM: PdiFormData = {
  analista_id: '',
  analista_nome: '',
  objectives: [newObjectiveBlock()],
  mensagem_evolutiva: '',
  prazo: '',
  responsavel: '',
  status: 'nao_iniciado',
};

const OBJECTIVE_STATUS_CONFIG = {
  cumprido: { label: 'Cumprido', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={12} /> },
  parcial: { label: 'Parcial', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Circle size={12} /> },
  nao_cumprido: { label: 'Não Cumprido', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <X size={12} /> },
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

function getStatusConfig(status: string) { return STATUS_CONFIG[status] || STATUS_CONFIG.pendente; }
function getProgressColor(progress: number): string {
  if (progress >= 80) return '#22C55E';
  if (progress >= 50) return '#38BDF8';
  if (progress >= 20) return '#EAB308';
  return '#94A3B8';
}

// ── Objective Block Card ──
function ObjectiveBlockCard({ block, index, onChange, onRemove, canRemove }: {
  block: ObjectiveBlock; index: number; onChange: (u: ObjectiveBlock) => void; onRemove: () => void; canRemove: boolean;
}) {
  const statusCfg = OBJECTIVE_STATUS_CONFIG[block.status];
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none';

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.18)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Objetivo {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-500/10" style={{ color: '#EF4444' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Categoria</label>
          <input value={block.categoria} onChange={(e) => onChange({ ...block, categoria: e.target.value })} placeholder="Ex: Técnico, Comportamental..." className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Status</label>
          <select value={block.status} onChange={(e) => onChange({ ...block, status: e.target.value as ObjectiveBlock['status'] })} className={inputCls} style={{ ...inputStyle, color: statusCfg.color }}>
            <option value="nao_cumprido">Não Cumprido</option>
            <option value="parcial">Parcial</option>
            <option value="cumprido">Cumprido</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Objetivo *</label>
        <input value={block.objetivo} onChange={(e) => onChange({ ...block, objetivo: e.target.value })} placeholder="Descreva o objetivo..." className={inputCls} style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Ação Esperada</label>
        <textarea value={block.acao_esperada} onChange={(e) => onChange({ ...block, acao_esperada: e.target.value })} placeholder="Ação esperada..." rows={2} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Resultado Esperado</label>
        <textarea value={block.resultado_esperado} onChange={(e) => onChange({ ...block, resultado_esperado: e.target.value })} placeholder="Resultado esperado..." rows={2} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={inputStyle} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Observação do Coordenador</label>
        <textarea value={block.observacao_coordenador} onChange={(e) => onChange({ ...block, observacao_coordenador: e.target.value })} placeholder="Observações do coordenador..." rows={2} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={inputStyle} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
          {statusCfg.icon} {statusCfg.label}
        </span>
        <span className="text-xs" style={{ color: '#64748B' }}>{block.status === 'cumprido' ? '100%' : block.status === 'parcial' ? '50%' : '0%'} de contribuição</span>
      </div>
    </div>
  );
}

// ── PDI Form Modal ──
function PdiFormModal({ isOpen, onClose, onSave, initialData, analistas, isEditing }: {
  isOpen: boolean; onClose: () => void; onSave: (data: PdiFormData) => Promise<void>;
  initialData?: Partial<PdiFormData>; analistas: AnalistaOption[]; isEditing: boolean;
}) {
  const [form, setForm] = useState<PdiFormData>({ ...EMPTY_FORM, ...initialData });
  const [saving, setSaving] = useState(false);
  const [analistaSearch, setAnalistaSearch] = useState('');
  const [generatingMsg, setGeneratingMsg] = useState(false);

  useEffect(() => {
    setForm({ ...EMPTY_FORM, ...initialData, objectives: initialData?.objectives?.length ? initialData.objectives : [newObjectiveBlock()] });
    setAnalistaSearch(initialData?.analista_nome || '');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const filteredAnalistas = analistas.filter((a) =>
    a.nome.toLowerCase().includes(analistaSearch.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(analistaSearch.toLowerCase())
  ).slice(0, 8);

  const autoProgress = calcProgressFromObjectives(form.objectives);

  const handleGenerateMensagem = () => {
    const analista = analistas.find(a => a.id === form.analista_id || a.nome === form.analista_nome);
    const msg = generateMensagemEvolutiva(
      form.analista_nome,
      analista?.qa_score || 0,
      analista?.iepc_score || 0,
      analista?.total_ncs || 0,
      analista?.total_elogios || 0,
      0
    );
    setForm(p => ({ ...p, mensagem_evolutiva: msg }));
  };

  const handleSubmit = async () => {
    if (!form.objectives.some(o => o.objetivo.trim())) return;
    // Auto-generate mensagem if empty
    let finalForm = { ...form };
    if (!finalForm.mensagem_evolutiva.trim()) {
      const analista = analistas.find(a => a.id === form.analista_id || a.nome === form.analista_nome);
      finalForm.mensagem_evolutiva = generateMensagemEvolutiva(
        form.analista_nome,
        analista?.qa_score || 0,
        analista?.iepc_score || 0,
        analista?.total_ncs || 0,
        analista?.total_elogios || 0,
        0
      );
    }
    setSaving(true);
    try { await onSave(finalForm); onClose(); } catch { /* ignore */ }
    setSaving(false);
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none';
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 my-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(56,189,248,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target size={16} style={{ color: '#38BDF8' }} />
            {isEditing ? 'Editar PDI' : 'Novo PDI — Estrutura Enterprise'}
          </h2>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
        </div>

        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Analista */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Analista *</label>
            <input type="text" value={analistaSearch}
              onChange={(e) => { setAnalistaSearch(e.target.value); setForm((p) => ({ ...p, analista_nome: e.target.value, analista_id: '' })); }}
              placeholder="Buscar analista..." className={inputCls} style={inputStyle} />
            {analistaSearch.length > 1 && filteredAnalistas.length > 0 && !form.analista_id && (
              <div className="mt-1 rounded-lg overflow-hidden" style={{ backgroundColor: '#1a2332', border: '1px solid rgba(255,255,255,0.1)' }}>
                {filteredAnalistas.map((a) => (
                  <button key={a.id} className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}
                    onClick={() => { setForm((p) => ({ ...p, analista_id: a.id, analista_nome: a.nome })); setAnalistaSearch(a.nome); }}>
                    <span className="font-medium">{a.nome}</span>
                    {a.email && <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.email}</span>}
                    {a.equipe && <span className="text-xs ml-2" style={{ color: '#38BDF8' }}>{a.equipe}</span>}
                  </button>
                ))}
              </div>
            )}
            {form.analista_id && <p className="text-xs mt-1" style={{ color: '#22C55E' }}>✓ Analista vinculado</p>}
          </div>

          {/* Auto progress preview */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
            <span className="text-xs text-sky-400 font-semibold">Progresso Automático</span>
            <div className="flex items-center gap-3">
              <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${autoProgress}%`, backgroundColor: autoProgress >= 80 ? '#22C55E' : autoProgress >= 50 ? '#F59E0B' : '#EF4444' }} />
              </div>
              <span className="text-sm font-bold" style={{ color: autoProgress >= 80 ? '#22C55E' : autoProgress >= 50 ? '#F59E0B' : '#EF4444' }}>{autoProgress}%</span>
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Objetivos do Ciclo ({form.objectives.length})</label>
            <div className="space-y-4">
              {form.objectives.map((obj, i) => (
                <ObjectiveBlockCard key={obj.id} block={obj} index={i}
                  onChange={(updated) => setForm(f => ({ ...f, objectives: f.objectives.map((o, idx) => idx === i ? updated : o) }))}
                  onRemove={() => setForm(f => ({ ...f, objectives: f.objectives.filter((_, idx) => idx !== i) }))}
                  canRemove={form.objectives.length > 1} />
              ))}
            </div>
            <button type="button" onClick={() => setForm(f => ({ ...f, objectives: [...f.objectives, newObjectiveBlock()] }))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center mt-3 transition-all hover:bg-sky-500/10"
              style={{ color: '#38BDF8', border: '1px dashed rgba(56,189,248,0.4)', backgroundColor: 'rgba(56,189,248,0.04)' }}>
              <Plus size={14} /> Adicionar Objetivo
            </button>
          </div>

          {/* Mensagem Evolutiva */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Mensagem Evolutiva</label>
              <button type="button" onClick={handleGenerateMensagem}
                className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-purple-500/10"
                style={{ color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)' }}>
                ✨ Gerar automaticamente
              </button>
            </div>
            <textarea value={form.mensagem_evolutiva} onChange={(e) => setForm(p => ({ ...p, mensagem_evolutiva: e.target.value }))}
              placeholder="Deixe em branco para geração automática baseada em QA, IEPC, NCs e elogios..." rows={3}
              className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
            <p className="text-[10px] mt-1" style={{ color: '#64748B' }}>
              💡 Se não preenchida, será gerada automaticamente ao salvar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Prazo</label>
              <input type="text" value={form.prazo} onChange={(e) => setForm((p) => ({ ...p, prazo: e.target.value }))} placeholder="Ex: 06/2026" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Responsável</label>
              <input type="text" value={form.responsavel} onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do responsável" className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Status</label>
            <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={inputCls} style={inputStyle}>
              <option value="nao_iniciado">Não Iniciado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="parcial">Parcial</option>
              <option value="concluido">Concluído</option>
              <option value="atrasado">Atrasado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving || !form.objectives.some(o => o.objetivo.trim())}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#0369a1' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar PDI'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline History ──
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
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
                {items.map((pdi) => {
                  const st = getStatusConfig(pdi.status);
                  const objs = pdi.enterprise_objectives || [];
                  const progress = objs.length > 0 ? calcProgressFromObjectives(objs) : pdi.progresso;
                  return (
                    <div key={pdi.id} className="relative flex items-start gap-3">
                      <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                      <div className="flex-1 rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-white">{pdi.objetivo}</span>
                          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                          {objs.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA' }}>{objs.length} obj.</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {pdi.ciclo_origem && <span>Ciclo {pdi.ciclo_origem}</span>}
                          {pdi.prazo && <span>Prazo: {pdi.prazo}</span>}
                          <span>{progress}% concluído</span>
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

// ── Main Page ──
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
    // Also fetch scores to enrich analista data for auto-mensagem
    const [analistasRes, scoresRes] = await Promise.all([
      supabase.from('analistas').select('id, nome, email, equipe').order('nome'),
      supabase.from('cycle_scores').select('analista, nota_final_qa, iepc_total, total_ncs').order('created_at', { ascending: false }),
    ]);
    const analistasData = (analistasRes.data || []) as AnalistaOption[];
    const scoresData = scoresRes.data || [];

    // Enrich with latest scores
    const enriched = analistasData.map((a) => {
      const scores = (scoresData as any[]).filter((s: any) => (s.analista || '').toLowerCase().includes((a.nome || '').toLowerCase().split(' ')[0]));
      const latest = scores[0];
      return {
        ...a,
        qa_score: latest?.nota_final_qa || 0,
        iepc_score: latest?.iepc_total || 0,
        total_ncs: scores.reduce((sum: number, s: any) => sum + (s.total_ncs || 0), 0),
        total_elogios: 0,
      };
    });
    setAnalistas(enriched);
  };

  const loadPdis = async () => {
    setLoading(true);
    try {
      const { data: feedbackPdis } = await supabase
        .from('feedback_pdi')
        .select(`id, objetivo, acao_desenvolvimento, prazo, progresso, status, responsavel, ciclo_origem, evidencia, created_at, updated_at, analistas(id, nome, equipe), feedbacks(ciclo)`)
        .order('created_at', { ascending: false });

      const { data: pdiRecords } = await supabase
        .from('pdi_records')
        .select('id, feedback_id, objetivo, prazo, status_pdi, acoes, analista, squad, coordenador, ciclo, created_at, updated_at, qa_score, iepc_score, enterprise_objectives, mensagem_evolutiva')
        .order('created_at', { ascending: false });

      const combined: PdiItem[] = [];

      if (feedbackPdis) {
        feedbackPdis.forEach((p: any) => {
          combined.push({
            id: p.id, objetivo: p.objetivo, acao_desenvolvimento: p.acao_desenvolvimento,
            prazo: p.prazo, progresso: p.progresso || 0, status: p.status || 'pendente',
            responsavel: p.responsavel, ciclo_origem: p.ciclo_origem || p.feedbacks?.ciclo,
            evidencia: p.evidencia, created_at: p.created_at, updated_at: p.updated_at,
            analista_nome: p.analistas?.nome, analista_id: p.analistas?.id, equipe: p.analistas?.equipe,
            ciclo: p.feedbacks?.ciclo, source: 'feedback_pdi',
            enterprise_objectives: Array.isArray(p.enterprise_objectives) ? p.enterprise_objectives : [],
            mensagem_evolutiva: p.mensagem_evolutiva,
          });
        });
      }

      if (pdiRecords) {
        for (const p of pdiRecords) {
          const enterpriseObjs: ObjectiveBlock[] = Array.isArray(p.enterprise_objectives) ? p.enterprise_objectives : [];
          const acoes = Array.isArray(p.acoes) ? p.acoes : [];
          const firstAcao = acoes[0];
          const progresso = enterpriseObjs.length > 0 ? calcProgressFromObjectives(enterpriseObjs) : 0;
          let resolvedAnalistaId: string | null = null;
          if (p.analista && analistas.length > 0) {
            const nameParts = p.analista.toLowerCase().split(' ');
            const match = analistas.find((a) => {
              const aName = a.nome.toLowerCase();
              return aName === p.analista.toLowerCase() || (nameParts.length >= 2 && aName.includes(nameParts[0]) && aName.includes(nameParts[nameParts.length - 1]));
            });
            if (match) resolvedAnalistaId = match.id;
          }
          combined.push({
            id: p.id, objetivo: p.objetivo || firstAcao?.descricao || 'PDI sem objetivo definido',
            acao_desenvolvimento: firstAcao?.descricao || null, prazo: p.prazo || firstAcao?.prazo || null,
            progresso, status: p.status_pdi || 'em_andamento', responsavel: p.coordenador,
            ciclo_origem: p.ciclo, created_at: p.created_at, updated_at: p.updated_at,
            analista_nome: p.analista, analista_id: resolvedAnalistaId, equipe: p.squad, ciclo: p.ciclo,
            source: 'pdi_records', enterprise_objectives: enterpriseObjs, mensagem_evolutiva: p.mensagem_evolutiva,
          });
        }
      }

      // ── Backfill: feedbacks with pdi_objetivos in snapshot but no pdi_records entry ──
      const existingFeedbackIds = new Set([
        ...(pdiRecords || []).map((p: any) => p.feedback_id).filter(Boolean),
      ]);
      const { data: feedbacksWithPdi } = await supabase
        .from('feedbacks')
        .select('id, ciclo, analista_id, analistas(nome, equipe), snapshot_json_completo, qa_score, iepc_score, mensagem_evolutiva')
        .not('snapshot_json_completo', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (feedbacksWithPdi) {
        for (const fb of feedbacksWithPdi) {
          if (existingFeedbackIds.has(fb.id)) continue;
          const snap = Array.isArray(fb.snapshot_json_completo) ? fb.snapshot_json_completo[0] : (fb.snapshot_json_completo || {});
          const pdiObjs = extractPdiObjectivesFromSnapshot(snap);
          if (!Array.isArray(pdiObjs) || pdiObjs.length === 0) continue;
          const hasObjective = pdiObjs.some((o: any) => o.objetivo?.trim());
          if (!hasObjective) continue;
          const analistaNome = (fb.analistas as any)?.nome || snap?.analista?.nome || '';
          const equipe = (fb.analistas as any)?.equipe || snap?.analista?.equipe || '';
          const ciclo = fb.ciclo || snap?.analista?.ciclo || '';
          const progresso = calcProgressFromObjectives(pdiObjs);
          const mensagem = snap?.feedback_blocks?.mensagem_evolutiva || fb.mensagem_evolutiva || '';
          combined.push({
            id: `fb-snap-${fb.id}`,
            objetivo: pdiObjs[0]?.objetivo || 'PDI do feedback',
            acao_desenvolvimento: pdiObjs[0]?.acao_esperada || null,
            prazo: null,
            progresso,
            status: 'aguardando alinhamento',
            responsavel: null,
            ciclo_origem: ciclo,
            created_at: fb.created_at || new Date().toISOString(),
            analista_nome: analistaNome,
            analista_id: fb.analista_id || null,
            equipe,
            ciclo,
            source: 'pdi_records',
            enterprise_objectives: pdiObjs,
            mensagem_evolutiva: mensagem,
          });
        }
      }

      setPdis(combined);
    } catch (err) { console.error('Error loading PDIs:', err); }
    setLoading(false);
  };

  useEffect(() => { loadAnalistas().then(() => loadPdis()); }, []);

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

  const handleCreatePdi = async (data: PdiFormData) => {
    if (!supabase) return;
    let analistaId = data.analista_id || null;
    if (!analistaId && data.analista_nome) {
      const match = analistas.find((a) => a.nome.toLowerCase() === data.analista_nome.toLowerCase());
      if (match) analistaId = match.id;
    }
    const progress = calcProgressFromObjectives(data.objectives);
    const firstObj = data.objectives[0];
    const payload: any = {
      objetivo: firstObj?.objetivo || data.objectives.map(o => o.objetivo).join('; '),
      acao_desenvolvimento: firstObj?.acao_esperada || null,
      prazo: data.prazo || null,
      responsavel: data.responsavel || null,
      status: data.status,
      progresso: progress,
      enterprise_objectives: data.objectives,
      mensagem_evolutiva: data.mensagem_evolutiva || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (analistaId) payload.analista_id = analistaId;

    const { data: inserted, error } = await supabase.from('feedback_pdi').insert(payload).select().single();
    if (!error && inserted) {
      const newPdi: PdiItem = {
        id: inserted.id, objetivo: inserted.objetivo, acao_desenvolvimento: inserted.acao_desenvolvimento,
        prazo: inserted.prazo, progresso: progress, status: inserted.status || 'nao_iniciado',
        responsavel: inserted.responsavel, created_at: inserted.created_at,
        analista_nome: data.analista_nome || null, analista_id: analistaId, source: 'feedback_pdi',
        enterprise_objectives: data.objectives, mensagem_evolutiva: data.mensagem_evolutiva,
      };
      setPdis((prev) => [newPdi, ...prev]);
    }
  };

  const handleEditPdi = async (data: PdiFormData) => {
    if (!supabase || !editingPdi) return;
    let analistaId = data.analista_id || editingPdi.analista_id || null;
    const progress = calcProgressFromObjectives(data.objectives);
    const firstObj = data.objectives[0];
    const updatePayload: any = {
      objetivo: firstObj?.objetivo || data.objectives.map(o => o.objetivo).join('; '),
      acao_desenvolvimento: firstObj?.acao_esperada || null,
      prazo: data.prazo || null,
      responsavel: data.responsavel || null,
      status: data.status,
      progresso: progress,
      enterprise_objectives: data.objectives,
      mensagem_evolutiva: data.mensagem_evolutiva || null,
      updated_at: new Date().toISOString(),
    };
    if (analistaId) updatePayload.analista_id = analistaId;

    const table = editingPdi.source === 'feedback_pdi' ? 'feedback_pdi' : 'pdi_records';
    if (editingPdi.source === 'pdi_records') { updatePayload.status_pdi = data.status; delete updatePayload.status; }

    await supabase.from(table).update(updatePayload).eq('id', editingPdi.id);
    setPdis((prev) => prev.map((p) => p.id === editingPdi.id ? {
      ...p, objetivo: updatePayload.objetivo, prazo: data.prazo || null, status: data.status,
      progresso: progress, enterprise_objectives: data.objectives, mensagem_evolutiva: data.mensagem_evolutiva,
      analista_id: analistaId, analista_nome: data.analista_nome || p.analista_nome,
    } : p));
    setEditingPdi(null);
  };

  const equipes = ['', ...Array.from(new Set(pdis.map((p) => p.equipe).filter(Boolean)))];
  const filtered = pdis.filter((p) => {
    if (search && !p.objetivo?.toLowerCase().includes(search.toLowerCase()) && !p.analista_nome?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterEquipe && p.equipe !== filterEquipe) return false;
    return true;
  });

  const downloadPdiTxt = (pdi: PdiItem) => {
    const objs = pdi.enterprise_objectives || [];
    const lines: string[] = [
      '═══════════════════════════════════════════════════════',
      '  PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI)',
      '═══════════════════════════════════════════════════════',
      '',
      `Analista:   ${pdi.analista_nome || '—'}`,
      `Equipe:     ${pdi.equipe || '—'}`,
      `Ciclo:      ${pdi.ciclo_origem || pdi.ciclo || '—'}`,
      `Status:     ${pdi.status || '—'}`,
      `Prazo:      ${pdi.prazo || '—'}`,
      `Responsável:${pdi.responsavel || '—'}`,
      '',
    ];
    if (pdi.mensagem_evolutiva) {
      lines.push('── MENSAGEM EVOLUTIVA ──────────────────────────────────');
      lines.push(pdi.mensagem_evolutiva);
      lines.push('');
    }
    if (objs.length > 0) {
      lines.push('── OBJETIVOS DO CICLO ──────────────────────────────────');
      objs.forEach((obj: any, i: number) => {
        lines.push('');
        lines.push(`Objetivo ${i + 1}${obj.categoria ? ` [${obj.categoria}]` : ''}`);
        lines.push(`  Descrição:         ${obj.objetivo || '—'}`);
        lines.push(`  Ação Esperada:     ${obj.acao_esperada || '—'}`);
        lines.push(`  Resultado Esperado:${obj.resultado_esperado || '—'}`);
        lines.push(`  Status:            ${obj.status === 'cumprido' ? 'Cumprido' : obj.status === 'parcial' ? 'Parcial' : 'Não Cumprido'}`);
        if (obj.observacao_coordenador) lines.push(`  Obs. Coordenador:  ${obj.observacao_coordenador}`);
      });
      lines.push('');
    }
    lines.push('═══════════════════════════════════════════════════════');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PDI_${(pdi.analista_nome || 'analista').replace(/\s+/g, '_')}_${pdi.ciclo_origem || 'ciclo'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = {
    total: pdis.length,
    emAndamento: pdis.filter((p) => p.status === 'em_andamento' || p.status === 'Em andamento').length,
    concluidos: pdis.filter((p) => p.status === 'concluido' || p.status === 'Concluído').length,
    atrasados: pdis.filter((p) => p.status === 'atrasado').length,
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
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
            <button onClick={() => setShowTimeline((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: showTimeline ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.25)' }}>
              <History size={14} /> Histórico
            </button>
            <button onClick={() => { setEditingPdi(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: '#0369a1' }}>
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

        {showTimeline && pdis.length > 0 && <PdiTimeline pdis={pdis} />}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por analista ou objetivo..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <option value="">Todos os status</option>
            <option value="nao_iniciado">Não Iniciado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="parcial">Parcial</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
          </select>
          {equipes.length > 1 && (
            <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
              {pdis.length === 0 ? 'Clique em "Novo PDI" para criar o primeiro plano de desenvolvimento' : 'Tente ajustar os filtros de busca'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((pdi) => {
              const st = getStatusConfig(pdi.status);
              const objs = pdi.enterprise_objectives || [];
              const progress = objs.length > 0 ? calcProgressFromObjectives(objs) : pdi.progresso;
              const progressColor = getProgressColor(progress);
              return (
                <div key={pdi.id} className="rounded-xl p-5 transition-all hover:border-white/10"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-semibold text-white text-base">{pdi.objetivo}</span>
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: st.bg, color: st.color }}>
                          {st.icon} {st.label}
                        </span>
                        {objs.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>{objs.length} objetivo{objs.length !== 1 ? 's' : ''}</span>}
                        {pdi.analista_id && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>✓ vinculado</span>}
                      </div>
                      {/* Show objectives summary */}
                      {objs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                          {objs.slice(0, 3).map((obj, i) => (
                            <span key={obj.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(56,189,248,0.06)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {i + 1}. {obj.objetivo.substring(0, 40)}{obj.objetivo.length > 40 ? '...' : ''}
                            </span>
                          ))}
                          {objs.length > 3 && <span className="text-xs" style={{ color: '#64748B' }}>+{objs.length - 3} mais</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {pdi.analista_nome && <span className="flex items-center gap-1"><Users size={11} /> {pdi.analista_nome}</span>}
                        {pdi.equipe && <span>{pdi.equipe}</span>}
                        {pdi.ciclo_origem && <span className="flex items-center gap-1"><BookOpen size={11} /> Ciclo {pdi.ciclo_origem}</span>}
                        {pdi.prazo && <span className="flex items-center gap-1"><Clock size={11} /> Prazo: {pdi.prazo}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => downloadPdiTxt(pdi)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: 'rgba(45,212,191,0.1)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.2)' }}
                        title="Baixar PDI em TXT">
                        <Download size={11} /> TXT
                      </button>
                      <button onClick={() => { setEditingPdi(pdi); setModalOpen(true); }}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <Edit2 size={11} /> Editar
                      </button>
                      <select value={pdi.status} onChange={(e) => updateStatus(pdi, e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs text-white outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <option value="nao_iniciado">Não Iniciado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="parcial">Parcial</option>
                        <option value="concluido">Concluído</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                    </div>
                  </div>

                  {/* Auto progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>Progresso {objs.length > 0 ? '(automático)' : ''}</span>
                      <span className="font-bold" style={{ color: progressColor }}>{progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: progressColor, boxShadow: `0 0 8px ${progressColor}40` }} />
                    </div>
                  </div>

                  {pdi.mensagem_evolutiva && (
                    <div className="mt-3 p-2 rounded-lg text-xs italic" style={{ backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', color: '#A78BFA' }}>
                      💬 {pdi.mensagem_evolutiva.substring(0, 120)}{pdi.mensagem_evolutiva.length > 120 ? '...' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PdiFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingPdi(null); }}
        onSave={editingPdi ? handleEditPdi : handleCreatePdi}
        initialData={editingPdi ? {
          objectives: editingPdi.enterprise_objectives?.length ? editingPdi.enterprise_objectives : [newObjectiveBlock()],
          mensagem_evolutiva: editingPdi.mensagem_evolutiva || '',
          prazo: editingPdi.prazo || '',
          responsavel: editingPdi.responsavel || '',
          status: editingPdi.status,
          analista_id: editingPdi.analista_id || '',
          analista_nome: editingPdi.analista_nome || '',
        } : undefined}
        analistas={analistas}
        isEditing={!!editingPdi}
      />
    </EnterpriseLayout>
  );
}
