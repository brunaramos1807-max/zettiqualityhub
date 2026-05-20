'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import {
  fetchCycleScores, fetchAllPeriodos, fetchPDIRecords, savePDIRecord,
  updatePDIRecord, deletePDIRecord, type PDIRecord
} from '@/lib/services/dataService';
import { BookOpen, Plus, TrendingUp, CheckCircle, X, AlertTriangle, RefreshCw, Loader2, Trash2, Edit2, Paperclip, Upload, FileText, ChevronDown, ChevronUp, Search, Filter, Clock, Activity } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Em andamento': { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  'Atrasado': { label: 'Atrasado', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  'Concluído': { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  'Crítico': { label: 'Crítico', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  'Parcial': { label: 'Parcial', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  'Aderido': { label: 'Aderido', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'Em reavaliação': { label: 'Em Reavaliação', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  'Não aderido': { label: 'Não Aderido', color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
};

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
  objetivo: string;
  prazo: string;
  observacoes: string;
  status_pdi: PDIRecord['status_pdi'];
  evolucao_tecnica: string;
  evolucao_comportamental: string;
  performance_operacional: string;
  risco_operacional: string;
  plano_desenvolvimento: string;
  proxima_revisao: string;
}

const EMPTY_FORM: FormState = {
  analista: '', squad: '', coordenador: '', periodo: '',
  objetivo: '', prazo: '', observacoes: '', status_pdi: 'Em andamento',
  evolucao_tecnica: '', evolucao_comportamental: '',
  performance_operacional: '', risco_operacional: '',
  plano_desenvolvimento: '', proxima_revisao: '',
};

function AccordionSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
      />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-y"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minHeight: `${rows * 24}px` }}
      />
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
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterCiclo, setFilterCiclo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
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
    setPdis(pdiList);
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
  const analistasFilter = Array.from(new Set(pdis.map((p) => p.analista).filter(Boolean)));

  const filtered = pdis.filter((p) => {
    if (filterStatus !== 'all' && p.status_pdi !== filterStatus) return false;
    if (filterSquad !== 'all' && p.squad !== filterSquad) return false;
    if (filterCoordenador !== 'all' && p.coordenador !== filterCoordenador) return false;
    if (filterCiclo !== 'all' && p.periodo !== filterCiclo) return false;
    if (filterAnalista !== 'all' && p.analista !== filterAnalista) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const objetivo = (p.objetivo || p.metas?.[0]?.descricao || '').toLowerCase();
      if (!p.analista.toLowerCase().includes(q) && !objetivo.includes(q) && !p.squad?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: pdis.length,
    em_andamento: pdis.filter((p) => p.status_pdi === 'Em andamento').length,
    concluido: pdis.filter((p) => p.status_pdi === 'Concluído' || p.status_pdi === 'Aderido').length,
    critico: pdis.filter((p) => p.status_pdi === 'Crítico' || p.status_pdi === 'Não aderido').length,
    reavaliacao: pdis.filter((p) => p.status_pdi === 'Em reavaliação').length,
  };

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

  const handleSave = async () => {
    if (!form.analista || !form.objetivo || !form.prazo) return;
    setSaving(true);
    const analyst = analysts.find((a) => a.name === form.analista);
    const pdiData = {
      periodo: form.periodo || periodos[periodos.length - 1] || '',
      analista: form.analista,
      squad: form.squad || analyst?.squad || '',
      coordenador: form.coordenador || analyst?.coordenador || '',
      status_pdi: form.status_pdi,
      acoes: [],
      metas: [{ descricao: form.objetivo, prazo: form.prazo, status: 'pendente' }],
      evidencias: attachments.map((a) => a.name),
      feedback: form.observacoes || '',
      nc_reincidentes: [],
      qa_score: analyst?.qa || 0,
      iepc_score: analyst?.iepc || 0,
      source: 'manual',
      objetivo: form.objetivo,
      prazo: form.prazo,
      observacoes: form.observacoes,
      evolucao_tecnica: form.evolucao_tecnica,
      evolucao_comportamental: form.evolucao_comportamental,
      performance_operacional: form.performance_operacional,
      risco_operacional: form.risco_operacional,
      plano_desenvolvimento: form.plano_desenvolvimento,
      proxima_revisao: form.proxima_revisao,
    };

    const result = editingId
      ? await updatePDIRecord(editingId, pdiData)
      : await savePDIRecord(pdiData);

    if (!result.success) {
      alert(`Erro ao salvar PDI: ${result.error || 'Tente novamente'}`);
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
    setForm({
      analista: pdi.analista,
      squad: pdi.squad,
      coordenador: pdi.coordenador,
      periodo: pdi.periodo,
      objetivo: pdi.objetivo || pdi.metas?.[0]?.descricao || '',
      prazo: pdi.prazo || pdi.metas?.[0]?.prazo || '',
      observacoes: pdi.observacoes || pdi.feedback || '',
      status_pdi: pdi.status_pdi,
      evolucao_tecnica: pdi.evolucao_tecnica || '',
      evolucao_comportamental: pdi.evolucao_comportamental || '',
      performance_operacional: pdi.performance_operacional || '',
      risco_operacional: pdi.risco_operacional || '',
      plano_desenvolvimento: pdi.plano_desenvolvimento || '',
      proxima_revisao: pdi.proxima_revisao || '',
    });
    setAttachments([]);
    setEditingId(pdi.id);
    setShowForm(true);
  };

  const handleUpdateStatus = async (id: string, status: PDIRecord['status_pdi']) => {
    await updatePDIRecord(id, { status_pdi: status });
    setPdis((prev) => prev.map((p) => p.id === id ? { ...p, status_pdi: status } : p));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmar exclusão do PDI?')) return;
    setDeletingId(id);
    await deletePDIRecord(id);
    setDeletingId(null);
    await loadData();
  };

  const openNew = () => {
    setEditingId(null);
    setAttachments([]);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const selectStyle = { backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">PDIs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Planos de Desenvolvimento Individual</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
          {canEdit && (
            <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={13} /> Novo PDI
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total PDIs', value: stats.total, color: '#38BDF8', icon: <BookOpen size={15} /> },
          { label: 'Em Andamento', value: stats.em_andamento, color: '#38BDF8', icon: <Activity size={15} /> },
          { label: 'Concluídos', value: stats.concluido, color: '#22C55E', icon: <CheckCircle size={15} /> },
          { label: 'Críticos', value: stats.critico, color: '#EF4444', icon: <AlertTriangle size={15} /> },
          { label: 'Em Reavaliação', value: stats.reavaliacao, color: '#F97316', icon: <TrendingUp size={15} /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status Badges */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white mb-3">Distribuição por Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = pdis.filter((p) => p.status_pdi === key).length;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterStatus === key ? cfg.color : cfg.bg,
                  color: filterStatus === key ? '#fff' : cfg.color,
                  border: `1px solid ${cfg.color}40`,
                }}
              >
                <span>{cfg.label}</span>
                <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} style={{ color: '#94A3B8' }} />
          <span className="text-xs font-semibold text-white">Filtros</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar analista, objetivo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
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
        {(filterStatus !== 'all' || filterSquad !== 'all' || filterCoordenador !== 'all' || filterCiclo !== 'all' || searchText) && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterSquad('all'); setFilterCoordenador('all'); setFilterCiclo('all'); setFilterAnalista('all'); setSearchText(''); }}
            className="mt-2 text-xs px-2 py-1 rounded" style={{ color: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.08)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* PDI List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm font-medium text-white mb-1">Nenhum PDI encontrado</p>
          <p className="text-xs" style={{ color: '#64748B' }}>
            {pdis.length === 0 ? 'PDIs são criados automaticamente via NCs críticas ou manualmente pelo botão acima' : 'Tente ajustar os filtros'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pdi) => {
            const statusCfg = STATUS_CONFIG[pdi.status_pdi] || STATUS_CONFIG['Em andamento'];
            const objetivo = pdi.objetivo || pdi.metas?.[0]?.descricao || '—';
            const prazo = pdi.prazo || pdi.metas?.[0]?.prazo || '—';
            return (
              <div key={pdi.id} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: `1px solid ${statusCfg.color}20` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{pdi.analista}</span>
                      {pdi.squad && <span className="text-xs" style={{ color: '#94A3B8' }}>· {pdi.squad}</span>}
                      {pdi.coordenador && <span className="text-xs" style={{ color: '#64748B' }}>· {pdi.coordenador}</span>}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{objetivo}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
                        <Clock size={10} /> Prazo: {prazo}
                      </span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>Ciclo: {pdi.periodo}</span>
                      {pdi.qa_score > 0 && <span className="text-xs" style={{ color: '#38BDF8' }}>QA: {pdi.qa_score.toFixed(1)}%</span>}
                      {pdi.iepc_score > 0 && <span className="text-xs" style={{ color: '#06B6D4' }}>IEPC: {pdi.iepc_score.toFixed(1)}%</span>}
                    </div>
                    {(pdi.observacoes || pdi.feedback) && (
                      <p className="text-xs mt-2 leading-relaxed p-2 rounded-lg" style={{ color: '#94A3B8', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {pdi.observacoes || pdi.feedback}
                      </p>
                    )}
                    {pdi.evidencias && pdi.evidencias.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Paperclip size={11} style={{ color: '#64748B' }} />
                        {pdi.evidencias.map((ev, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38BDF8' }}>{ev}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={pdi.status_pdi}
                        onChange={(e) => handleUpdateStatus(pdi.id, e.target.value as PDIRecord['status_pdi'])}
                        className="px-2 py-1 rounded text-xs text-white outline-none"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button onClick={() => handleEdit(pdi)} className="p-1.5 rounded transition-colors hover:bg-sky-500/10" style={{ color: '#38BDF8' }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(pdi.id)} disabled={deletingId === pdi.id} className="p-1.5 rounded transition-colors hover:bg-red-500/10 disabled:opacity-50" style={{ color: '#94A3B8' }}>
                        {deletingId === pdi.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)', maxHeight: '92vh' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <h3 className="font-bold text-white">{editingId ? 'Editar PDI' : 'Novo PDI'}</h3>
                <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>Preencha os campos abaixo por seção</p>
              </div>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }} className="p-2 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
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

              {/* Objetivo e Prazo */}
              <AccordionSection title="Objetivo e Prazo" defaultOpen>
                <FieldTextarea label="Objetivo / Plano de Ação *" value={form.objetivo} onChange={(v) => setForm((f) => ({ ...f, objetivo: v }))} placeholder="Descreva o objetivo do PDI, ações esperadas e critérios de sucesso..." rows={4} />
                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </AccordionSection>

              {/* Evolução Técnica */}
              <AccordionSection title="Evolução Técnica">
                <FieldTextarea label="Evolução Técnica" value={form.evolucao_tecnica} onChange={(v) => setForm((f) => ({ ...f, evolucao_tecnica: v }))} placeholder="Descreva a evolução técnica observada..." rows={3} />
              </AccordionSection>

              {/* Evolução Comportamental */}
              <AccordionSection title="Evolução Comportamental">
                <FieldTextarea label="Evolução Comportamental" value={form.evolucao_comportamental} onChange={(v) => setForm((f) => ({ ...f, evolucao_comportamental: v }))} placeholder="Descreva a evolução comportamental observada..." rows={3} />
              </AccordionSection>

              {/* Performance Operacional */}
              <AccordionSection title="Performance Operacional">
                <FieldTextarea label="Performance Operacional" value={form.performance_operacional} onChange={(v) => setForm((f) => ({ ...f, performance_operacional: v }))} placeholder="Avalie a performance operacional..." rows={3} />
              </AccordionSection>

              {/* Risco Operacional */}
              <AccordionSection title="Risco Operacional">
                <FieldTextarea label="Risco Operacional" value={form.risco_operacional} onChange={(v) => setForm((f) => ({ ...f, risco_operacional: v }))} placeholder="Identifique riscos operacionais..." rows={3} />
              </AccordionSection>

              {/* Plano de Desenvolvimento */}
              <AccordionSection title="Plano de Desenvolvimento">
                <FieldTextarea label="Plano de Desenvolvimento" value={form.plano_desenvolvimento} onChange={(v) => setForm((f) => ({ ...f, plano_desenvolvimento: v }))} placeholder="Detalhe o plano de desenvolvimento..." rows={3} />
              </AccordionSection>

              {/* Acompanhamento do Coordenador */}
              <AccordionSection title="Acompanhamento do Coordenador">
                <FieldTextarea label="Feedback / Observações do Coordenador" value={form.observacoes} onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))} placeholder="Adicione feedback, observações e contexto adicional..." rows={3} />
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
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50 w-full justify-center"
                  style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px dashed rgba(56,189,248,0.3)', color: '#38BDF8' }}
                >
                  {uploadingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploadingFile ? 'Carregando...' : 'Clique para anexar arquivo (PDF, DOC, XLS, imagem)'}
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

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.analista || !form.objetivo || !form.prazo}
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
