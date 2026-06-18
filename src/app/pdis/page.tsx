'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, fetchPDIRecords, savePDIRecord, updatePDIRecord, deletePDIRecord, fetchPDIObjectives, savePDIObjective, updatePDIObjective, deletePDIObjective, fetchPDITimeline, type PDIRecord, type PDIObjective, type PDITimelineEvent } from '@/lib/services/dataService';
import { BookOpen, Plus, TrendingUp, CheckCircle, X, AlertTriangle, RefreshCw, Loader2, Trash2, Edit2, Paperclip, Upload, FileText, ChevronDown, ChevronUp, Search, Filter, Clock, Activity, Target, Users, Award, Calendar, ArrowRight, Circle, CheckSquare, Shield, Eye } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

// ── Enterprise Status Config ──
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'aguardando alinhamento': { label: 'Aguardando Alinhamento', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)' },
  'em evolucao': { label: 'Em Evolução', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' },
  'em acompanhamento': { label: 'Em Acompanhamento', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  'em validacao': { label: 'Em Validação', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  'consolidado': { label: 'Consolidado', color: '#2DD4BF', bg: 'rgba(45,212,191,0.1)', border: 'rgba(45,212,191,0.3)' },
  'evolucao concluida': { label: 'Evolução Concluída', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  'reincidente': { label: 'Reincidente', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  'Em andamento': { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.3)' },
  'Atrasado': { label: 'Atrasado', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  'Concluído': { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
  'Crítico': { label: 'Crítico', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  'Parcial': { label: 'Parcial', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)' },
  'Aderido': { label: 'Aderido', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  'Em reavaliação': { label: 'Em Reavaliação', color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  'Não aderido': { label: 'Não Aderido', color: '#DC2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)' },
};

const OBJECTIVE_STATUS_CONFIG = {
  cumprido: { label: 'Cumprido', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={12} /> },
  parcial: { label: 'Parcial', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Circle size={12} /> },
  nao_cumprido: { label: 'Não Cumprido', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <X size={12} /> },
};

// ── Objective block for the form (multi-objective enterprise structure) ──
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
  return {
    id: Math.random().toString(36).slice(2),
    categoria: '',
    objetivo: '',
    acao_esperada: '',
    resultado_esperado: '',
    status: 'nao_cumprido',
    observacao_coordenador: '',
  };
}

function calcProgressFromObjectives(objectives: ObjectiveBlock[]): number {
  if (objectives.length === 0) return 0;
  const total = objectives.reduce((acc, o) => {
    if (o.status === 'cumprido') return acc + 100;
    if (o.status === 'parcial') return acc + 50;
    return acc;
  }, 0);
  return Math.round(total / objectives.length);
}

interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface FormState {
  analista: string;
  squad: string;
  coordenador: string;
  periodo: string;
  mensagem_evolutiva: string;
  comentario_coordenador: string;
  comentario_analista: string;
  prazo: string;
  observacoes: string;
  status_pdi: PDIRecord['status_pdi'];
  proxima_revisao: string;
  data_acompanhamento: string;
  objectives: ObjectiveBlock[];
}

const EMPTY_FORM: FormState = {
  analista: '', squad: '', coordenador: '', periodo: '',
  mensagem_evolutiva: '', comentario_coordenador: '',
  comentario_analista: '', prazo: '', observacoes: '',
  status_pdi: 'aguardando alinhamento' as any,
  proxima_revisao: '', data_acompanhamento: '',
  objectives: [newObjectiveBlock()],
};

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <span className="text-xs font-semibold text-white uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp size={14} style={{ color: '#94A3B8' }} /> : <ChevronDown size={14} style={{ color: '#94A3B8' }} />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white mb-1.5">{label}{required && ' *'}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white mb-1.5">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-y"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minHeight: `${rows * 24}px` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Em andamento'];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

// ── Multi-Objective Block Component ──
function ObjectiveBlockCard({
  block,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  block: ObjectiveBlock;
  index: number;
  onChange: (updated: ObjectiveBlock) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const statusCfg = OBJECTIVE_STATUS_CONFIG[block.status];
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-white outline-none';

  return (
    <div className="rounded-xl p-4 space-y-3 relative" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.18)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Objetivo {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-500/10 transition-colors" style={{ color: '#EF4444' }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Categoria</label>
          <input value={block.categoria} onChange={(e) => onChange({ ...block, categoria: e.target.value })}
            placeholder="Ex: Técnico, Comportamental..." className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Status</label>
          <select value={block.status} onChange={(e) => onChange({ ...block, status: e.target.value as ObjectiveBlock['status'] })}
            className={inputCls} style={{ ...inputStyle, color: statusCfg.color }}>
            <option value="nao_cumprido">Não Cumprido</option>
            <option value="parcial">Parcial</option>
            <option value="cumprido">Cumprido</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Objetivo *</label>
        <input value={block.objetivo} onChange={(e) => onChange({ ...block, objetivo: e.target.value })}
          placeholder="Descreva o objetivo..." className={inputCls} style={inputStyle} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Ação Esperada</label>
        <textarea value={block.acao_esperada} onChange={(e) => onChange({ ...block, acao_esperada: e.target.value })}
          placeholder="Descreva a ação esperada..." rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          style={inputStyle} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Resultado Esperado</label>
        <textarea value={block.resultado_esperado} onChange={(e) => onChange({ ...block, resultado_esperado: e.target.value })}
          placeholder="Qual resultado se espera alcançar..." rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          style={inputStyle} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1.5">Observação do Coordenador</label>
        <textarea value={block.observacao_coordenador} onChange={(e) => onChange({ ...block, observacao_coordenador: e.target.value })}
          placeholder="Observações do coordenador sobre este objetivo..." rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          style={inputStyle} />
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 pt-1">
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
          {statusCfg.icon} {statusCfg.label}
        </span>
        <span className="text-xs" style={{ color: '#64748B' }}>
          {block.status === 'cumprido' ? '100%' : block.status === 'parcial' ? '50%' : '0%'} de contribuição
        </span>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──
function DeleteConfirmModal({ pdiName, onConfirm, onCancel, deleting }: {
  pdiName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
            <AlertTriangle size={18} style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h3 className="font-bold text-white">Excluir PDI</h3>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
          Tem certeza que deseja excluir o PDI de <span className="font-semibold text-white">{pdiName}</span>?
          O registro será marcado como excluído e registrado no log de auditoria.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#DC2626' }}>
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Component ──
function PDITimeline({ events }: { events: PDITimelineEvent[] }) {
  if (!events.length) return (
    <div className="text-center py-6 text-slate-600 text-xs">Nenhum evento na timeline</div>
  );
  const typeColors: Record<string, string> = {
    criacao: '#38BDF8', atualizacao: '#A78BFA', melhoria: '#22C55E',
    validacao: '#F59E0B', conclusao: '#2DD4BF', evento: '#94A3B8',
  };
  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.4), rgba(56,189,248,0.05))' }} />
      <div className="space-y-4">
        {events.map((ev, i) => {
          const color = typeColors[ev.tipo] || '#94A3B8';
          return (
            <div key={ev.id || i} className="relative">
              <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full border-2 border-[#07101F]" style={{ backgroundColor: color }} />
              <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color }}>{ev.titulo}</span>
                  <span className="text-[10px] text-slate-600 font-mono">{ev.data_evento}</span>
                </div>
                {ev.descricao && <p className="text-xs text-slate-400 leading-relaxed">{ev.descricao}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Objectives Checklist (detail modal) ──
function PDIObjectivesChecklist({ pdiId, canEdit }: { pdiId: string; canEdit: boolean }) {
  const [objectives, setObjectives] = useState<PDIObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchPDIObjectives(pdiId);
    setObjectives(data);
    setLoading(false);
  }, [pdiId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newDesc.trim()) return;
    await savePDIObjective({ pdi_id: pdiId, descricao: newDesc, categoria: newCat, peso: 1, status: 'nao_cumprido' });
    setNewDesc(''); setNewCat(''); setAdding(false); load();
  };

  const handleStatusChange = async (id: string, status: PDIObjective['status']) => {
    await updatePDIObjective(id, { status });
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const handleDelete = async (id: string) => {
    await deletePDIObjective(id);
    setObjectives(prev => prev.filter(o => o.id !== id));
  };

  const progress = objectives.length > 0
    ? Math.round(objectives.reduce((acc, o) => acc + (o.status === 'cumprido' ? 100 : o.status === 'parcial' ? 50 : 0), 0) / objectives.length)
    : 0;

  if (loading) return <div className="flex items-center justify-center py-4"><Loader2 size={14} className="animate-spin text-sky-400" /></div>;

  return (
    <div>
      {objectives.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400">Progresso Real</span>
            <span className="text-sm font-bold" style={{ color: progress >= 80 ? '#22C55E' : progress >= 50 ? '#F59E0B' : '#EF4444' }}>{progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progress >= 80 ? '#22C55E' : progress >= 50 ? '#F59E0B' : '#EF4444' }} />
          </div>
        </div>
      )}
      <div className="space-y-2 mb-3">
        {objectives.map((obj) => {
          const cfg = OBJECTIVE_STATUS_CONFIG[obj.status];
          return (
            <div key={obj.id} className="flex items-start gap-3 p-3 rounded-lg group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-shrink-0 mt-0.5">
                {canEdit ? (
                  <select value={obj.status} onChange={(e) => handleStatusChange(obj.id, e.target.value as PDIObjective['status'])}
                    className="text-xs rounded px-1 py-0.5 outline-none"
                    style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                    <option value="nao_cumprido">Não Cumprido</option>
                    <option value="parcial">Parcial</option>
                    <option value="cumprido">Cumprido</option>
                  </select>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.icon} {cfg.label}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 leading-relaxed">{obj.descricao}</p>
                {obj.categoria && <span className="text-[10px] text-slate-600 mt-0.5 block">{obj.categoria}</span>}
              </div>
              {canEdit && (
                <button onClick={() => handleDelete(obj.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all flex-shrink-0" style={{ color: '#94A3B8' }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && (
        adding ? (
          <div className="space-y-2 p-3 rounded-lg" style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)' }}>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição do objetivo..."
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Categoria (opcional)..."
              className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>Adicionar</button>
              <button onClick={() => { setAdding(false); setNewDesc(''); setNewCat(''); }} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-white/5">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors">
            <Plus size={12} /> Adicionar objetivo
          </button>
        )
      )}
    </div>
  );
}

// ── PDI Detail Modal ──
function PDIDetailModal({ pdi, onClose, canEdit, onUpdate }: { pdi: PDIRecord; onClose: () => void; canEdit: boolean; onUpdate: () => void }) {
  const [timeline, setTimeline] = useState<PDITimelineEvent[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>(pdi.attachments || []);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'objectives' | 'timeline' | 'attachments'>('overview');
  const [commentCoord, setCommentCoord] = useState(pdi.comentario_coordenador || '');
  const [commentAnalista, setCommentAnalista] = useState(pdi.comentario_analista || '');
  const [savingComment, setSavingComment] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { fetchPDITimeline(pdi.id).then(setTimeline); }, [pdi.id]);

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      const newAtt = [...attachments, { name: file.name, url, type: file.type, size: file.size, uploadedAt: new Date().toISOString() }];
      setAttachments(newAtt);
      await updatePDIRecord(pdi.id, { attachments: newAtt });
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveComments = async () => {
    setSavingComment(true);
    await updatePDIRecord(pdi.id, { comentario_coordenador: commentCoord, comentario_analista: commentAnalista });
    setSavingComment(false);
    onUpdate();
  };

  const statusCfg = STATUS_CONFIG[pdi.status_pdi] || STATUS_CONFIG['Em andamento'];

  // Parse objectives from pdi.acoes or metas if stored as enterprise blocks
  const enterpriseObjectives: ObjectiveBlock[] = Array.isArray((pdi as any).enterprise_objectives)
    ? (pdi as any).enterprise_objectives
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', maxHeight: '94vh' }}>
        <div className="flex items-start justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg font-black text-white">{pdi.analista}</span>
              <StatusBadge status={pdi.status_pdi} />
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
              {pdi.squad && <span className="flex items-center gap-1"><Users size={10} /> {pdi.squad}</span>}
              {pdi.coordenador && <span className="flex items-center gap-1"><Shield size={10} /> {pdi.coordenador}</span>}
              {pdi.periodo && <span className="flex items-center gap-1"><Calendar size={10} /> {pdi.periodo}</span>}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {pdi.qa_score > 0 && <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8' }}>QA {pdi.qa_score.toFixed(1)}</span>}
              {pdi.iepc_score > 0 && <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: 'rgba(45,212,191,0.12)', color: '#2DD4BF' }}>IEPC {pdi.iepc_score.toFixed(1)}%</span>}
              {(pdi.total_ncs ?? 0) > 0 && <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>{pdi.total_ncs} NCs</span>}
              {(pdi.total_elogios ?? 0) > 0 && <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>{pdi.total_elogios} Elogios</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0 ml-4" style={{ color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'overview', label: 'Visão Geral', icon: <Eye size={12} /> },
            { id: 'objectives', label: 'Objetivos', icon: <CheckSquare size={12} /> },
            { id: 'timeline', label: 'Timeline', icon: <Activity size={12} /> },
            { id: 'attachments', label: 'Anexos', icon: <Paperclip size={12} /> },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#38BDF8' : '#64748B',
                border: activeTab === tab.id ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Enterprise Objectives Display */}
              {enterpriseObjectives.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-sky-400">Objetivos do Ciclo</p>
                  {enterpriseObjectives.map((obj, i) => {
                    const cfg = OBJECTIVE_STATUS_CONFIG[obj.status];
                    return (
                      <div key={obj.id} className="rounded-xl p-4" style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.15)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">Objetivo {i + 1}{obj.categoria ? ` — ${obj.categoria}` : ''}</span>
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-3">
                          {obj.objetivo && <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1">Objetivo</p><p className="text-xs text-slate-300">{obj.objetivo}</p></div>}
                          {obj.acao_esperada && <div><p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1">Ação Esperada</p><p className="text-xs text-slate-300">{obj.acao_esperada}</p></div>}
                          {obj.resultado_esperado && <div><p className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1">Resultado Esperado</p><p className="text-xs text-slate-300">{obj.resultado_esperado}</p></div>}
                        </div>
                        {obj.observacao_coordenador && (
                          <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">Obs. Coordenador</p>
                            <p className="text-xs text-slate-400 italic">{obj.observacao_coordenador}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legacy single objective display */}
              {enterpriseObjectives.length === 0 && (pdi.objetivo_desenvolvimento || pdi.acao_desenvolvimento || pdi.resultado_esperado) && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)' }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(56,189,248,0.12)' }}>
                    <Target size={14} className="text-sky-400" />
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Plano de Desenvolvimento</span>
                  </div>
                  <div className="p-4 grid md:grid-cols-3 gap-3">
                    {pdi.objetivo_desenvolvimento && <div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1.5">Objetivo</p><p className="text-xs text-slate-300 leading-relaxed">{pdi.objetivo_desenvolvimento}</p></div>}
                    {pdi.acao_desenvolvimento && <div><p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-1.5">Ação Esperada</p><p className="text-xs text-slate-300 leading-relaxed">{pdi.acao_desenvolvimento}</p></div>}
                    {pdi.resultado_esperado && <div><p className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1.5">Resultado Esperado</p><p className="text-xs text-slate-300 leading-relaxed">{pdi.resultado_esperado}</p></div>}
                  </div>
                  {pdi.mensagem_evolutiva && (
                    <div className="px-4 pb-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Mensagem Evolutiva</p>
                      <p className="text-xs text-slate-300 leading-relaxed italic">&ldquo;{pdi.mensagem_evolutiva}&rdquo;</p>
                    </div>
                  )}
                </div>
              )}

              {pdi.mensagem_evolutiva && enterpriseObjectives.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-2">Mensagem Evolutiva</p>
                  <p className="text-sm text-slate-300 leading-relaxed italic">&ldquo;{pdi.mensagem_evolutiva}&rdquo;</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-2">Comentário do Coordenador</label>
                  {canEdit ? (
                    <textarea value={commentCoord} onChange={(e) => setCommentCoord(e.target.value)} rows={4}
                      placeholder="Adicione observações do coordenador..."
                      className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {commentCoord || 'Sem comentários'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-2">Comentário do Analista</label>
                  <textarea value={commentAnalista} onChange={(e) => setCommentAnalista(e.target.value)} rows={4}
                    placeholder="Adicione observações do analista..."
                    className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              {canEdit && (
                <button onClick={handleSaveComments} disabled={savingComment}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: '#1E40AF' }}>
                  {savingComment ? <Loader2 size={12} className="animate-spin" /> : null}
                  Salvar Comentários
                </button>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pdi.prazo && <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><p className="text-[10px] text-slate-600 mb-1">Prazo</p><p className="text-xs font-semibold text-white">{pdi.prazo}</p></div>}
                {pdi.proxima_revisao && <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><p className="text-[10px] text-slate-600 mb-1">Próxima Revisão</p><p className="text-xs font-semibold text-white">{pdi.proxima_revisao}</p></div>}
                {pdi.data_acompanhamento && <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><p className="text-[10px] text-slate-600 mb-1">Acompanhamento</p><p className="text-xs font-semibold text-white">{pdi.data_acompanhamento}</p></div>}
              </div>
            </div>
          )}
          {activeTab === 'objectives' && <PDIObjectivesChecklist pdiId={pdi.id} canEdit={canEdit} />}
          {activeTab === 'timeline' && <PDITimeline events={timeline} />}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" />
              {canEdit && (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 w-full justify-center"
                  style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px dashed rgba(56,189,248,0.3)', color: '#38BDF8' }}>
                  {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingFile ? 'Carregando...' : 'Clique para anexar arquivo (PDF, DOC, XLS, imagem)'}
                </button>
              )}
              {attachments.length === 0 ? (
                <div className="text-center py-8 text-slate-600 text-xs">Nenhum anexo adicionado</div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <FileText size={16} style={{ color: '#38BDF8' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-600">{(att.size / 1024).toFixed(0)} KB · {new Date(att.uploadedAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      {att.url && <a href={att.url} download={att.name} className="p-1.5 rounded hover:bg-sky-500/10 transition-colors" style={{ color: '#38BDF8' }}><ArrowRight size={12} /></a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PDIsContent() {
  const { session } = useSystemAuth();
  const [pdis, setPdis] = useState<PDIRecord[]>([]);
  const [analysts, setAnalysts] = useState<{ name: string; squad: string; coordenador: string; qa: number; iepc: number }[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPDI, setSelectedPDI] = useState<PDIRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterCiclo, setFilterCiclo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmPDI, setDeleteConfirmPDI] = useState<PDIRecord | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeCycleFilter, setActiveCycleFilter] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canEdit = session?.permissoes?.acesso_total || session?.permissoes?.permissao_editar ||
    session?.cargo === 'Administrador' || session?.cargo === 'Coordenador' ||
    session?.cargo === 'Coordenador Geral' || session?.cargo === 'Coordenadora Qualidade';

  const loadData = useCallback(async () => {
    setLoading(true);
    const [pdiList, scores, pList] = await Promise.all([
      fetchPDIRecords(),
      fetchCycleScores(),
      fetchAllPeriodos(),
    ]);

    // Backfill: also load feedbacks with pdi_objetivos in snapshot that don't have pdi_records entries
    // This ensures ALL historical PDIs from ALL cycles are shown
    let allPdis = [...pdiList];
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if (supabase) {
        const existingFeedbackIds = new Set(pdiList.map((p: any) => p.feedback_id).filter(Boolean));
        // Fetch ALL feedbacks with PDI data — no limit to ensure historical cycles appear
        const { data: feedbacksWithPdi } = await supabase
          .from('feedbacks')
          .select('id, ciclo, analista_id, analistas(nome, equipe, coordenador), snapshot_json_completo, qa_score, iepc_score, mensagem_evolutiva, created_at, updated_at')
          .not('snapshot_json_completo', 'is', null)
          .order('created_at', { ascending: false });

        if (feedbacksWithPdi) {
          for (const fb of feedbacksWithPdi) {
            if (existingFeedbackIds.has(fb.id)) continue;
            const snap = Array.isArray(fb.snapshot_json_completo) ? fb.snapshot_json_completo[0] : (fb.snapshot_json_completo || {});
            const pdiObjs = snap?.feedback_blocks?.pdi_objetivos;
            if (!Array.isArray(pdiObjs) || pdiObjs.length === 0) continue;
            const hasObjective = pdiObjs.some((o: any) => o.objetivo?.trim());
            if (!hasObjective) continue;
            const analistaNome = (fb.analistas as any)?.nome || snap?.analista?.nome || '';
            const equipe = (fb.analistas as any)?.equipe || snap?.analista?.equipe || '';
            const coordenador = (fb.analistas as any)?.coordenador || snap?.analista?.coordenador || '';
            const ciclo = fb.ciclo || snap?.analista?.ciclo || '';
            const mensagem = snap?.feedback_blocks?.mensagem_evolutiva || fb.mensagem_evolutiva || '';
            // Synthesize a PDIRecord-compatible object
            const syntheticPdi: any = {
              id: `fb-snap-${fb.id}`,
              feedback_id: fb.id,
              analista: analistaNome,
              squad: equipe,
              coordenador,
              periodo: ciclo,
              objetivo: pdiObjs[0]?.objetivo || 'PDI do feedback',
              status_pdi: 'aguardando alinhamento',
              mensagem_evolutiva: mensagem,
              enterprise_objectives: pdiObjs,
              acoes: [],
              metas: [],
              evidencias: [],
              nc_reincidentes: [],
              qa_score: fb.qa_score,
              iepc_score: fb.iepc_score,
              created_at: fb.created_at || new Date().toISOString(),
              updated_at: fb.updated_at || fb.created_at || new Date().toISOString(),
              source: 'feedback_snapshot',
            };
            allPdis.push(syntheticPdi);
          }
        }

        // Also load from feedback_pdi table (legacy source — read-only snapshot, NOT a second PDI system)
        // feedback_pdi is treated as a historical snapshot/read-only link to pdi_records
        // It is NOT a second PDI management system. PDI management lives exclusively in pdi_records.
        const { data: feedbackPdiData } = await supabase
          .from('feedback_pdi')
          .select('id, feedback_id, analista, squad, coordenador, ciclo, periodo, objetivo, objetivo_desenvolvimento, status, mensagem_evolutiva, enterprise_objectives, metas, qa_score, iepc_score, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (feedbackPdiData && feedbackPdiData.length > 0) {
          const existingIds = new Set(allPdis.map((p: any) => p.id));
          // Only include feedback_pdi entries that have NO corresponding pdi_records entry
          // This prevents duplication — feedback_pdi is a read-only snapshot, not a management record
          const existingAnalistaPeriodo = new Set(
            allPdis.map((p: any) => `${(p.analista || '').toLowerCase().trim()}__${(p.periodo || '').trim()}`)
          );
          for (const fp of feedbackPdiData) {
            const syntheticId = `fp-${fp.id}`;
            if (existingIds.has(syntheticId)) continue;
            const analistaKey = `${(fp.analista || '').toLowerCase().trim()}__${(fp.ciclo || fp.periodo || '').trim()}`;
            // Skip if a real pdi_records entry already covers this analista+periodo
            if (existingAnalistaPeriodo.has(analistaKey)) continue;
            const syntheticPdi: any = {
              id: syntheticId,
              feedback_id: fp.feedback_id,
              analista: fp.analista || '',
              squad: fp.squad || '',
              coordenador: fp.coordenador || '',
              periodo: fp.ciclo || fp.periodo || '',
              objetivo: fp.objetivo || fp.objetivo_desenvolvimento || '',
              status_pdi: fp.status || 'aguardando alinhamento',
              mensagem_evolutiva: fp.mensagem_evolutiva || '',
              enterprise_objectives: fp.enterprise_objectives || [],
              acoes: [],
              metas: fp.metas || [],
              evidencias: [],
              nc_reincidentes: [],
              qa_score: fp.qa_score || 0,
              iepc_score: fp.iepc_score || 0,
              created_at: fp.created_at || new Date().toISOString(),
              updated_at: fp.updated_at || fp.created_at || new Date().toISOString(),
              source: 'feedback_pdi_snapshot', // clearly marked as read-only snapshot
            };
            allPdis.push(syntheticPdi);
          }
        }
      }
    } catch (err) {
      console.error('PDI backfill error:', err);
    }

    // Deduplicate by analista+periodo combination — keep pdi_records over synthetic
    const seen = new Map<string, any>();
    for (const p of allPdis) {
      const key = `${(p.analista || '').toLowerCase().trim()}__${(p.periodo || '').trim()}`;
      if (!seen.has(key)) {
        seen.set(key, p);
      } else {
        // Prefer real pdi_records over synthetic
        const existing = seen.get(key);
        if (existing.source && !p.source) {
          seen.set(key, p);
        }
      }
    }
    allPdis = Array.from(seen.values());

    setPdis(allPdis);
    const map: Record<string, { name: string; squad: string; coordenador: string; qa: number; iepc: number; count: number }> = {};
    scores.forEach((s: any) => {
      if (!map[s.analista]) {
        map[s.analista] = { name: s.analista, squad: s.squad, coordenador: s.coordenador || '', qa: 0, iepc: 0, count: 0 };
      }
      map[s.analista].qa += s.nota_final_qa || 0;
      map[s.analista].iepc += s.iepc_total || 0;
      map[s.analista].count += 1;
    });
    setAnalysts(Object.values(map).map((a) => ({ ...a, qa: a.count > 0 ? a.qa / a.count : 0, iepc: a.count > 0 ? a.iepc / a.count : 0 })));
    setPeriodos(pList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('zetti_data_changed', handler);
    return () => window.removeEventListener('zetti_data_changed', handler);
  }, [loadData]);

  const squads = Array.from(new Set(pdis.map((p) => p.squad).filter(Boolean)));
  const coordenadores = Array.from(new Set(pdis.map((p) => p.coordenador).filter(Boolean)));
  const ciclos = Array.from(new Set(pdis.map((p) => p.periodo).filter(Boolean)));

  const filtered = pdis.filter((p) => {
    if (filterStatus !== 'all' && p.status_pdi !== filterStatus) return false;
    if (filterSquad !== 'all' && p.squad !== filterSquad) return false;
    if (filterCoordenador !== 'all' && p.coordenador !== filterCoordenador) return false;
    if (filterCiclo !== 'all' && p.periodo !== filterCiclo) return false;
    if (activeCycleFilter && p.periodo !== activeCycleFilter) return false;
    if (filterAnalista !== 'all' && p.analista !== filterAnalista) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const objetivo = (p.objetivo || p.metas?.[0]?.descricao || '').toLowerCase();
      if (!p.analista.toLowerCase().includes(q) && !objetivo.includes(q) && !p.squad?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const isCompleted = (p: PDIRecord) => ['Concluído', 'Aderido', 'evolucao concluida', 'consolidado'].includes(p.status_pdi);
  const isCritical = (p: PDIRecord) => ['Crítico', 'Não aderido', 'reincidente'].includes(p.status_pdi);
  const isInProgress = (p: PDIRecord) => ['Em andamento', 'em evolucao', 'em acompanhamento', 'em validacao'].includes(p.status_pdi);

  const stats = {
    total: pdis.length,
    em_aberto: pdis.filter((p) => p.status_pdi === 'aguardando alinhamento').length,
    em_andamento: pdis.filter(isInProgress).length,
    concluido: pdis.filter(isCompleted).length,
    critico: pdis.filter(isCritical).length,
    reincidente: pdis.filter((p) => p.status_pdi === 'reincidente').length,
    taxa_aderencia: pdis.length > 0 ? Math.round((pdis.filter(isCompleted).length / pdis.length) * 100) : 0,
  };

  const cycleData = ciclos.map((ciclo) => {
    const cyclePdis = pdis.filter((p) => p.periodo === ciclo);
    return {
      ciclo,
      total: cyclePdis.length,
      aderencia: cyclePdis.length > 0 ? Math.round((cyclePdis.filter(isCompleted).length / cyclePdis.length) * 100) : 0,
      reincidencias: cyclePdis.filter((p) => p.status_pdi === 'reincidente').length,
      concluidos: cyclePdis.filter(isCompleted).length,
    };
  }).sort((a, b) => {
    const parseC = (c: string) => { const m = c.match(/^(\d{2})\/(\d{4})$/); if (m) return parseInt(m[2]) * 100 + parseInt(m[1]); return 0; };
    return parseC(b.ciclo) - parseC(a.ciclo);
  });

  const handleAnalystChange = (name: string) => {
    const analyst = analysts.find((a) => a.name === name);
    setForm((f) => ({ ...f, analista: name, squad: analyst?.squad || f.squad, coordenador: analyst?.coordenador || f.coordenador }));
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setAttachments((prev) => [...prev, { name: file.name, url, type: file.type, size: file.size, uploadedAt: new Date().toISOString() }]);
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-calculate progress from objectives
  const autoProgress = calcProgressFromObjectives(form.objectives);

  const handleSave = async () => {
    if (!form.analista || !form.objectives.some(o => o.objetivo.trim())) return;
    setSaving(true);
    const analyst = analysts.find((a) => a.name === form.analista);
    // Use first objective as the main objetivo field for backward compat
    const firstObj = form.objectives[0];
    const pdiData = {
      periodo: form.periodo || periodos[periodos.length - 1] || '',
      ciclo: form.periodo || periodos[periodos.length - 1] || '',
      analista: form.analista,
      squad: form.squad || analyst?.squad || '',
      coordenador: form.coordenador || analyst?.coordenador || '',
      status_pdi: form.status_pdi,
      acoes: [],
      metas: form.objectives.map(o => ({ descricao: o.objetivo, prazo: form.prazo, status: o.status })),
      evidencias: attachments.map((a) => a.name),
      feedback: form.observacoes || '',
      nc_reincidentes: [],
      qa_score: analyst?.qa || 0,
      iepc_score: analyst?.iepc || 0,
      source: 'manual',
      objetivo: firstObj?.objetivo || '',
      objetivo_desenvolvimento: firstObj?.objetivo || '',
      acao_desenvolvimento: firstObj?.acao_esperada || '',
      resultado_esperado: firstObj?.resultado_esperado || '',
      mensagem_evolutiva: form.mensagem_evolutiva,
      comentario_coordenador: form.comentario_coordenador,
      comentario_analista: form.comentario_analista,
      prazo: form.prazo,
      observacoes: form.observacoes,
      proxima_revisao: form.proxima_revisao,
      data_acompanhamento: form.data_acompanhamento || null,
      attachments: attachments,
      enterprise_objectives: form.objectives,
      progresso: autoProgress,
    };

    const result = editingId
      ? await updatePDIRecord(editingId, pdiData)
      : await savePDIRecord(pdiData);

    if (!result.success) {
      alert(`Erro ao salvar PDI: ${(result as any).error || 'Tente novamente'}`);
      setSaving(false);
      return;
    }
    setForm(EMPTY_FORM);
    setAttachments([]);
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    await loadData();
  };

  const handleEdit = (pdi: PDIRecord) => {
    const enterpriseObjectives: ObjectiveBlock[] = Array.isArray((pdi as any).enterprise_objectives) && (pdi as any).enterprise_objectives.length > 0
      ? (pdi as any).enterprise_objectives
      : [{
          id: Math.random().toString(36).slice(2),
          categoria: '',
          objetivo: pdi.objetivo || pdi.metas?.[0]?.descricao || '',
          acao_esperada: pdi.acao_desenvolvimento || '',
          resultado_esperado: pdi.resultado_esperado || '',
          status: 'nao_cumprido' as const,
          observacao_coordenador: pdi.comentario_coordenador || '',
        }];

    setForm({
      analista: pdi.analista,
      squad: pdi.squad,
      coordenador: pdi.coordenador,
      periodo: pdi.periodo,
      mensagem_evolutiva: pdi.mensagem_evolutiva || '',
      comentario_coordenador: pdi.comentario_coordenador || '',
      comentario_analista: pdi.comentario_analista || '',
      prazo: pdi.prazo || pdi.metas?.[0]?.prazo || '',
      observacoes: (pdi as any).observacoes || pdi.feedback || '',
      status_pdi: pdi.status_pdi,
      proxima_revisao: pdi.proxima_revisao || '',
      data_acompanhamento: pdi.data_acompanhamento || '',
      objectives: enterpriseObjectives,
    });
    setAttachments(pdi.attachments || []);
    setEditingId(pdi.id);
    setShowForm(true);
  };

  const handleUpdateStatus = async (id: string, status: PDIRecord['status_pdi']) => {
    await updatePDIRecord(id, { status_pdi: status });
    setPdis((prev) => prev.map((p) => p.id === id ? { ...p, status_pdi: status } : p));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPDI) return;
    setDeletingId(deleteConfirmPDI.id);
    await deletePDIRecord(deleteConfirmPDI.id);
    setDeletingId(null);
    setDeleteConfirmPDI(null);
    await loadData();
  };

  const openNew = () => {
    setEditingId(null);
    setAttachments([]);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const updateObjective = (index: number, updated: ObjectiveBlock) => {
    setForm(f => ({ ...f, objectives: f.objectives.map((o, i) => i === index ? updated : o) }));
  };

  const addObjective = () => {
    setForm(f => ({ ...f, objectives: [...f.objectives, newObjectiveBlock()] }));
  };

  const removeObjective = (index: number) => {
    setForm(f => ({ ...f, objectives: f.objectives.filter((_, i) => i !== index) }));
  };

  const selectStyle = { backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* ── EXECUTIVE HEADER ── */}
      <div className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0B1E35 0%, #091828 60%, #071525 100%)', border: '1px solid rgba(56,189,248,0.2)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(45,212,191,0.3), transparent)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(45,212,191,0.15))', border: '1px solid rgba(56,189,248,0.35)' }}>
                <BookOpen size={18} className="text-sky-300" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Módulo PDI</h1>
                <p className="text-[10px] uppercase tracking-widest text-sky-400/70">People Analytics Enterprise · Desenvolvimento Contínuo</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
              O módulo de desenvolvimento acompanha a evolução técnica, comportamental e operacional dos analistas ao longo dos ciclos avaliativos.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={14} />
            </button>
            {canEdit && (
              <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #1E40AF, #1D4ED8)' }}>
                <Plus size={14} /> Novo PDI
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Total PDIs', value: stats.total, color: '#38BDF8', icon: <BookOpen size={14} />, sub: 'registrados' },
          { label: 'Em Aberto', value: stats.em_aberto, color: '#94A3B8', icon: <Circle size={14} />, sub: 'aguardando' },
          { label: 'Em Andamento', value: stats.em_andamento, color: '#A78BFA', icon: <Activity size={14} />, sub: 'em evolução' },
          { label: 'Concluídos', value: stats.concluido, color: '#22C55E', icon: <CheckCircle size={14} />, sub: 'finalizados' },
          { label: 'Críticos', value: stats.critico, color: '#EF4444', icon: <AlertTriangle size={14} />, sub: 'atenção' },
          { label: 'Reincidentes', value: stats.reincidente, color: '#F97316', icon: <TrendingUp size={14} />, sub: 'recorrência' },
          { label: 'Taxa Aderência', value: `${stats.taxa_aderencia}%`, color: '#2DD4BF', icon: <Award size={14} />, sub: 'conclusão' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 relative overflow-hidden" style={{ backgroundColor: '#0F1B31', border: `1px solid ${s.color}20` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#64748B' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-black text-white leading-none mb-1">{s.value}</p>
            <p className="text-[10px]" style={{ color: '#475569' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── CYCLE CARDS ── */}
      {cycleData.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-sky-400" />
            <h2 className="text-sm font-bold text-white">PDIs por Ciclo</h2>
            {activeCycleFilter && (
              <button onClick={() => setActiveCycleFilter(null)} className="text-xs px-2 py-0.5 rounded" style={{ color: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.08)' }}>
                Limpar filtro
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {cycleData.map((cd) => (
              <button key={cd.ciclo} onClick={() => setActiveCycleFilter(activeCycleFilter === cd.ciclo ? null : cd.ciclo)}
                className="rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
                style={{ backgroundColor: activeCycleFilter === cd.ciclo ? 'rgba(56,189,248,0.12)' : '#0F1B31', border: activeCycleFilter === cd.ciclo ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold text-sky-300 mb-2">{cd.ciclo}</p>
                <p className="text-xl font-black text-white mb-1">{cd.total}</p>
                <p className="text-[10px] text-slate-500 mb-2">PDIs</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">Aderência</span>
                    <span className="text-[10px] font-bold" style={{ color: cd.aderencia >= 70 ? '#22C55E' : '#F59E0B' }}>{cd.aderencia}%</span>
                  </div>
                  {cd.reincidencias > 0 && <div className="flex items-center justify-between"><span className="text-[10px] text-slate-600">Reincid.</span><span className="text-[10px] font-bold text-red-400">{cd.reincidencias}</span></div>}
                  <div className="flex items-center justify-between"><span className="text-[10px] text-slate-600">Concluídos</span><span className="text-[10px] font-bold text-green-400">{cd.concluidos}</span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STATUS DISTRIBUTION ── */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white mb-3">Distribuição por Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = pdis.filter((p) => p.status_pdi === key).length;
            if (count === 0) return null;
            return (
              <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{ backgroundColor: filterStatus === key ? cfg.color : cfg.bg, color: filterStatus === key ? '#fff' : cfg.color, border: `1px solid ${cfg.border}` }}>
                <span>{cfg.label}</span>
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94A3B8' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <div className="lg:col-span-2 relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar analista, objetivo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={selectStyle}>
            <option value="all">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={selectStyle}>
            <option value="all">Todos os Squads</option>
            {squads.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterCoordenador} onChange={(e) => setFilterCoordenador(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={selectStyle}>
            <option value="all">Todos Coordenadores</option>
            {coordenadores.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterCiclo} onChange={(e) => setFilterCiclo(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={selectStyle}>
            <option value="all">Todos os Ciclos</option>
            {ciclos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {(filterStatus !== 'all' || filterSquad !== 'all' || filterCoordenador !== 'all' || filterCiclo !== 'all' || searchText || activeCycleFilter) && (
          <button onClick={() => { setFilterStatus('all'); setFilterSquad('all'); setFilterCoordenador('all'); setFilterCiclo('all'); setFilterAnalista('all'); setSearchText(''); setActiveCycleFilter(null); }}
            className="mt-2 text-xs px-2 py-1 rounded" style={{ color: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.08)' }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── PDI LIST ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum PDI encontrado</p>
          <p className="text-xs" style={{ color: '#64748B' }}>
            {pdis.length === 0 ? 'PDIs são criados automaticamente via feedback ou manualmente pelo botão acima' : 'Tente ajustar os filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pdi) => {
            const statusCfg = STATUS_CONFIG[pdi.status_pdi] || STATUS_CONFIG['Em andamento'];
            const objetivo = pdi.objetivo || pdi.metas?.[0]?.descricao || '—';
            const prazo = pdi.prazo || pdi.metas?.[0]?.prazo || '—';
            const isAutoGenerated = pdi.source === 'feedback_auto';
            const enterpriseObjs: ObjectiveBlock[] = Array.isArray((pdi as any).enterprise_objectives) ? (pdi as any).enterprise_objectives : [];
            const displayProgress = enterpriseObjs.length > 0 ? calcProgressFromObjectives(enterpriseObjs) : ((pdi as any).progresso || 0);

            return (
              <div key={pdi.id} className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                style={{ backgroundColor: '#0F1B31', border: `1px solid ${statusCfg.color}25` }}>
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${statusCfg.color}60, transparent)` }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{pdi.analista}</span>
                        {pdi.squad && <span className="text-xs text-slate-500">· {pdi.squad}</span>}
                        {pdi.coordenador && <span className="text-xs text-slate-600">· {pdi.coordenador}</span>}
                        <StatusBadge status={pdi.status_pdi} />
                        {isAutoGenerated && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>Auto</span>}
                        {enterpriseObjs.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.2)' }}>{enterpriseObjs.length} objetivo{enterpriseObjs.length !== 1 ? 's' : ''}</span>}
                      </div>
                      <p className="text-sm leading-relaxed mb-2.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{objetivo}</p>
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}><Clock size={10} /> {prazo}</span>
                        <span className="text-xs text-slate-600">Ciclo: {pdi.periodo}</span>
                        {pdi.qa_score > 0 && <span className="text-xs font-semibold" style={{ color: '#38BDF8' }}>QA {pdi.qa_score.toFixed(1)}</span>}
                        {pdi.iepc_score > 0 && <span className="text-xs font-semibold" style={{ color: '#2DD4BF' }}>IEPC {pdi.iepc_score.toFixed(1)}%</span>}
                        {(pdi.total_ncs ?? 0) > 0 && <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>{pdi.total_ncs} NCs</span>}
                      </div>
                      {/* Auto progress bar */}
                      {displayProgress > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <span>Progresso {enterpriseObjs.length > 0 ? '(automático)' : ''}</span>
                            <span className="font-bold" style={{ color: displayProgress >= 80 ? '#22C55E' : displayProgress >= 50 ? '#F59E0B' : '#EF4444' }}>{displayProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${displayProgress}%`, backgroundColor: displayProgress >= 80 ? '#22C55E' : displayProgress >= 50 ? '#F59E0B' : '#EF4444' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setSelectedPDI(pdi)} className="p-1.5 rounded transition-colors hover:bg-sky-500/10" style={{ color: '#38BDF8' }} title="Ver detalhes">
                        <Eye size={13} />
                      </button>
                      {canEdit && (
                        <>
                          <select value={pdi.status_pdi} onChange={(e) => handleUpdateStatus(pdi.id, e.target.value as PDIRecord['status_pdi'])}
                            className="px-2 py-1 rounded text-xs text-white outline-none"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <button onClick={() => handleEdit(pdi)} className="p-1.5 rounded transition-colors hover:bg-sky-500/10" style={{ color: '#38BDF8' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirmPDI(pdi)} disabled={deletingId === pdi.id}
                            className="p-1.5 rounded transition-colors hover:bg-red-500/10 disabled:opacity-50" style={{ color: '#EF4444' }}>
                            {deletingId === pdi.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PDI DETAIL MODAL ── */}
      {selectedPDI && (
        <PDIDetailModal pdi={selectedPDI} onClose={() => setSelectedPDI(null)} canEdit={canEdit} onUpdate={loadData} />
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirmPDI && (
        <DeleteConfirmModal
          pdiName={deleteConfirmPDI.analista}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmPDI(null)}
          deleting={deletingId === deleteConfirmPDI.id}
        />
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', maxHeight: '92vh' }}>
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h3 className="font-bold text-white">{editingId ? 'Editar PDI' : 'Novo PDI'}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Estrutura enterprise com múltiplos objetivos por ciclo</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}>
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {/* Dados do Colaborador */}
              <AccordionSection title="Dados do Colaborador" defaultOpen>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">Analista *</label>
                    <select value={form.analista} onChange={(e) => handleAnalystChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <option value="">Selecionar...</option>
                      {analysts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">Ciclo</label>
                    <select value={form.periodo} onChange={(e) => setForm((f) => ({ ...f, periodo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <option value="">Último ciclo</option>
                      {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <FieldInput label="Squad" value={form.squad} onChange={(v) => setForm((f) => ({ ...f, squad: v }))} placeholder="Squad" />
                  <FieldInput label="Coordenador" value={form.coordenador} onChange={(v) => setForm((f) => ({ ...f, coordenador: v }))} placeholder="Coordenador" />
                </div>
              </AccordionSection>

              {/* Objetivos do Ciclo — Enterprise Multi-Objective */}
              <AccordionSection title={`Objetivos do Ciclo (${form.objectives.length})`} defaultOpen>
                {/* Auto progress preview */}
                <div className="flex items-center justify-between p-3 rounded-lg mb-2" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                  <span className="text-xs text-sky-400 font-semibold">Progresso Automático</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${autoProgress}%`, backgroundColor: autoProgress >= 80 ? '#22C55E' : autoProgress >= 50 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: autoProgress >= 80 ? '#22C55E' : autoProgress >= 50 ? '#F59E0B' : '#EF4444' }}>{autoProgress}%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {form.objectives.map((obj, i) => (
                    <ObjectiveBlockCard
                      key={obj.id}
                      block={obj}
                      index={i}
                      onChange={(updated) => updateObjective(i, updated)}
                      onRemove={() => removeObjective(i)}
                      canRemove={form.objectives.length > 1}
                    />
                  ))}
                </div>

                <button type="button" onClick={addObjective}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center mt-3 transition-all hover:bg-sky-500/10"
                  style={{ color: '#38BDF8', border: '1px dashed rgba(56,189,248,0.4)', backgroundColor: 'rgba(56,189,248,0.04)' }}>
                  <Plus size={14} /> Adicionar Objetivo
                </button>
              </AccordionSection>

              {/* Mensagem Evolutiva */}
              <AccordionSection title="Mensagem Evolutiva">
                <div className="p-3 rounded-lg mb-2 text-xs" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', color: '#A78BFA' }}>
                  💡 Se não preenchida, a mensagem será gerada automaticamente com base nos dados de QA, IEPC, aderência, NCs e elogios do analista.
                </div>
                <FieldTextarea label="Mensagem Evolutiva (opcional)" value={form.mensagem_evolutiva} onChange={(v) => setForm((f) => ({ ...f, mensagem_evolutiva: v }))}
                  placeholder="Deixe em branco para geração automática baseada em QA, IEPC, NCs e elogios..." rows={3} />
              </AccordionSection>

              {/* Datas e Prazos */}
              <AccordionSection title="Datas e Prazos" defaultOpen>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">Prazo *</label>
                    <input type="date" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">Próxima Revisão</label>
                    <input type="date" value={form.proxima_revisao} onChange={(e) => setForm((f) => ({ ...f, proxima_revisao: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white mb-1.5">Data Acompanhamento</label>
                    <input type="date" value={form.data_acompanhamento} onChange={(e) => setForm((f) => ({ ...f, data_acompanhamento: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                  </div>
                </div>
              </AccordionSection>

              {/* Comentários */}
              <AccordionSection title="Comentários">
                <FieldTextarea label="Comentário do Coordenador" value={form.comentario_coordenador} onChange={(v) => setForm((f) => ({ ...f, comentario_coordenador: v }))} placeholder="Observações do coordenador..." rows={3} />
                <FieldTextarea label="Comentário do Analista" value={form.comentario_analista} onChange={(v) => setForm((f) => ({ ...f, comentario_analista: v }))} placeholder="Observações do analista..." rows={3} />
                <FieldTextarea label="Observações Gerais" value={form.observacoes} onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))} placeholder="Contexto adicional..." rows={2} />
              </AccordionSection>

              {/* Status Geral */}
              <AccordionSection title="Status Geral">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">Status do PDI</label>
                  <select value={form.status_pdi} onChange={(e) => setForm((f) => ({ ...f, status_pdi: e.target.value as PDIRecord['status_pdi'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </AccordionSection>

              {/* Anexos */}
              <AccordionSection title="Anexos">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 w-full justify-center"
                  style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px dashed rgba(56,189,248,0.3)', color: '#38BDF8' }}>
                  {uploadingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingFile ? 'Carregando...' : 'Clique para anexar arquivo'}
                </button>
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <FileText size={12} style={{ color: '#38BDF8' }} />
                        <span className="text-xs text-white flex-1 truncate">{att.name}</span>
                        <span className="text-xs" style={{ color: '#64748B' }}>{(att.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))} className="p-0.5 rounded hover:bg-red-500/10" style={{ color: '#94A3B8' }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionSection>
            </div>

            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.analista || !form.objectives.some(o => o.objetivo.trim())}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors"
                style={{ backgroundColor: '#1E40AF' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Salvando...' : editingId ? 'Atualizar PDI' : 'Criar PDI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PDIsPage() {
  return (
    <EnterpriseLayout>
      <PDIsContent />
    </EnterpriseLayout>
  );
}
