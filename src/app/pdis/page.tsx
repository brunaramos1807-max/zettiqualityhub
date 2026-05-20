'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, fetchPDIRecords, savePDIRecord, updatePDIRecord, deletePDIRecord, type PDIRecord } from '@/lib/services/dataService';
import { BookOpen, Plus, TrendingUp, CheckCircle, X, AlertTriangle, RefreshCw, Loader2, Trash2, Edit2, Paperclip, Upload, FileText } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Em andamento': { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  'Atrasado': { label: 'Atrasado', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Concluído': { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  'Crítico': { label: 'Crítico', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  'Parcial': { label: 'Parcial', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)' },
  'Aderido': { label: 'Aderido', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  'Em reavaliação': { label: 'Em Reavaliação', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  'Não aderido': { label: 'Não Aderido', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
};

interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

function PDIsContent() {
  const { session } = useSystemAuth();
  const [pdis, setPdis] = useState<PDIRecord[]>([]);
  const [analysts, setAnalysts] = useState<{ name: string; squad: string; coordenador: string; qa: number; iepc: number }[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSquad, setFilterSquad] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    analista: '', squad: '', coordenador: '', periodo: '',
    objetivo: '', prazo: '', observacoes: '', status_pdi: 'Em andamento' as PDIRecord['status_pdi'],
  });

  const canEdit = session?.permissoes?.acesso_total || session?.permissoes?.permissao_editar ||
    session?.cargo === 'Administrador' || session?.cargo === 'Coordenador' || session?.cargo === 'Coordenador Geral' || session?.cargo === 'Coordenadora Qualidade';

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

  const squads = ['all', ...Array.from(new Set(analysts.map((a) => a.squad).filter(Boolean)))];

  const filtered = pdis.filter((p) => {
    if (filterStatus !== 'all' && p.status_pdi !== filterStatus) return false;
    if (filterSquad !== 'all' && p.squad !== filterSquad) return false;
    return true;
  });

  const handleAnalystChange = (name: string) => {
    const analyst = analysts.find((a) => a.name === name);
    setForm((f) => ({
      ...f,
      analista: name,
      squad: analyst?.squad || f.squad,
      coordenador: analyst?.coordenador || f.coordenador,
    }));
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      // Store file as base64 data URL for local attachment
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        const newAttachment: AttachmentItem = {
          name: file.name,
          url,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };
        setAttachments((prev) => [...prev, newAttachment]);
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingFile(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = async () => {
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
    };

    if (editingId) {
      await updatePDIRecord(editingId, pdiData);
    } else {
      await savePDIRecord(pdiData);
    }
    setForm({ analista: '', squad: '', coordenador: '', periodo: '', objetivo: '', prazo: '', observacoes: '', status_pdi: 'Em andamento' });
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
      objetivo: pdi.objetivo || (pdi.metas?.[0]?.descricao) || '',
      prazo: pdi.prazo || (pdi.metas?.[0]?.prazo) || '',
      observacoes: pdi.observacoes || pdi.feedback || '',
      status_pdi: pdi.status_pdi,
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
    setDeletingId(id);
    await deletePDIRecord(id);
    setDeletingId(null);
    await loadData();
  };

  const stats = {
    total: pdis.length,
    em_andamento: pdis.filter((p) => p.status_pdi === 'Em andamento').length,
    aderido: pdis.filter((p) => p.status_pdi === 'Aderido').length,
    parcial: pdis.filter((p) => p.status_pdi === 'Parcial').length,
    reavaliacao: pdis.filter((p) => p.status_pdi === 'Em reavaliação').length,
    nao_aderido: pdis.filter((p) => p.status_pdi === 'Não aderido').length,
    concluido: pdis.filter((p) => p.status_pdi === 'Concluído').length,
    atrasado: pdis.filter((p) => p.status_pdi === 'Atrasado').length,
    critico: pdis.filter((p) => p.status_pdi === 'Crítico').length,
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
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
            <button onClick={() => { setEditingId(null); setAttachments([]); setForm({ analista: '', squad: '', coordenador: '', periodo: '', objetivo: '', prazo: '', observacoes: '', status_pdi: 'Em andamento' }); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={13} /> Novo PDI
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total PDIs', value: stats.total, color: '#38BDF8', icon: <BookOpen size={16} /> },
          { label: 'Aderidos', value: stats.aderido, color: '#10B981', icon: <CheckCircle size={16} /> },
          { label: 'Em Reavaliação', value: stats.reavaliacao, color: '#F97316', icon: <TrendingUp size={16} /> },
          { label: 'Não Aderidos', value: stats.nao_aderido, color: '#DC2626', icon: <AlertTriangle size={16} /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white mb-3">Distribuição por Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = pdis.filter((p) => p.status_pdi === key).length;
            return (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                <span>{cfg.label}</span>
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
          <option value="all">Todos os Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
          {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
        </select>
      </div>

      {/* PDI List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pdi) => {
            const statusCfg = STATUS_CONFIG[pdi.status_pdi] || STATUS_CONFIG['Em andamento'];
            const objetivo = pdi.objetivo || pdi.metas?.[0]?.descricao || '—';
            const prazo = pdi.prazo || pdi.metas?.[0]?.prazo || '—';
            return (
              <div key={pdi.id} className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: `1px solid ${statusCfg.color}20`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{pdi.analista}</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>· {pdi.squad}</span>
                      {pdi.coordenador && <span className="text-xs" style={{ color: '#64748B' }}>· {pdi.coordenador}</span>}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    </div>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>{objetivo}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Prazo: {prazo}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Ciclo: {pdi.periodo}</p>
                      {pdi.qa_score > 0 && <p className="text-xs" style={{ color: '#38BDF8' }}>QA: {pdi.qa_score.toFixed(1)}%</p>}
                      {pdi.iepc_score > 0 && <p className="text-xs" style={{ color: '#06B6D4' }}>IEPC: {pdi.iepc_score.toFixed(1)}%</p>}
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
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
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
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <BookOpen size={36} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>Nenhum PDI encontrado</p>
              <p className="text-xs mt-1" style={{ color: '#64748B' }}>PDIs são criados automaticamente ao importar dados com NCs ou manualmente pelo botão acima</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-bold text-white">{editingId ? 'Editar PDI' : 'Novo PDI'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">Squad</label>
                  <input value={form.squad} onChange={(e) => setForm((f) => ({ ...f, squad: e.target.value }))} placeholder="Squad"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">Status</label>
                  <select value={form.status_pdi} onChange={(e) => setForm((f) => ({ ...f, status_pdi: e.target.value as PDIRecord['status_pdi'] }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Objetivo / Plano de Ação *</label>
                <textarea value={form.objetivo} onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))} placeholder="Descreva detalhadamente o objetivo do PDI, ações esperadas e critérios de sucesso..." rows={5}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-y"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '100px' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Observações / Feedback</label>
                <textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Adicione observações, feedback do coordenador, contexto adicional..." rows={4}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-y"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', minHeight: '80px' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">Prazo *</label>
                <input type="date" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                  <Paperclip size={12} /> Anexos
                </label>
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
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <FileText size={12} style={{ color: '#38BDF8' }} />
                        <span className="text-xs text-white flex-1 truncate">{att.name}</span>
                        <span className="text-xs" style={{ color: '#64748B' }}>{(att.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => removeAttachment(i)} className="p-0.5 rounded hover:bg-red-500/10" style={{ color: '#94A3B8' }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); setAttachments([]); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving || !form.analista || !form.objetivo || !form.prazo}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: '#1E40AF' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar PDI'}
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
