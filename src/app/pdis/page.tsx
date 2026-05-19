'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos, fetchPDIRecords, savePDIRecord, updatePDIRecord, deletePDIRecord, type PDIRecord } from '@/lib/services/dataService';
import { BookOpen, Plus, TrendingUp, CheckCircle, X, AlertTriangle, Clock, RefreshCw, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Em andamento': { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  'Atrasado': { label: 'Atrasado', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  'Concluído': { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  'Crítico': { label: 'Crítico', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
};

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
    // Build analyst list from real scores
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
      evidencias: [],
      feedback: form.observacoes || '',
      nc_reincidentes: [],
      qa_score: analyst?.qa || 0,
      iepc_score: analyst?.iepc || 0,
      source: 'manual',
      // Legacy compat fields
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
    atrasado: pdis.filter((p) => p.status_pdi === 'Atrasado').length,
    critico: pdis.filter((p) => p.status_pdi === 'Crítico').length,
    concluido: pdis.filter((p) => p.status_pdi === 'Concluído').length,
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">PDIs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Planos de Desenvolvimento Individual — dados persistidos globalmente</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} />
          </button>
          {canEdit && (
            <button onClick={() => { setEditingId(null); setForm({ analista: '', squad: '', coordenador: '', periodo: '', objetivo: '', prazo: '', observacoes: '', status_pdi: 'Em andamento' }); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
              <Plus size={13} /> Novo PDI
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total PDIs', value: stats.total, color: '#38BDF8', icon: <BookOpen size={16} /> },
          { label: 'Em Andamento', value: stats.em_andamento, color: '#38BDF8', icon: <TrendingUp size={16} /> },
          { label: 'Atrasados', value: stats.atrasado, color: '#F59E0B', icon: <Clock size={16} /> },
          { label: 'Críticos', value: stats.critico, color: '#EF4444', icon: <AlertTriangle size={16} /> },
          { label: 'Concluídos', value: stats.concluido, color: '#22C55E', icon: <CheckCircle size={16} /> },
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
              <div key={pdi.id} className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-white">{pdi.analista}</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>· {pdi.squad}</span>
                      {pdi.coordenador && <span className="text-xs" style={{ color: '#64748B' }}>· {pdi.coordenador}</span>}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{objetivo}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Prazo: {prazo}</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Ciclo: {pdi.periodo}</p>
                      {pdi.qa_score > 0 && <p className="text-xs" style={{ color: '#38BDF8' }}>QA: {pdi.qa_score.toFixed(1)}%</p>}
                      {pdi.iepc_score > 0 && <p className="text-xs" style={{ color: '#06B6D4' }}>IEPC: {pdi.iepc_score.toFixed(1)}%</p>}
                    </div>
                    {(pdi.observacoes || pdi.feedback) && (
                      <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{pdi.observacoes || pdi.feedback}</p>
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
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(56,189,248,0.2)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-bold text-white">{editingId ? 'Editar PDI' : 'Novo PDI'}</h3>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#94A3B8' }}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
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
                <textarea value={form.objetivo} onChange={(e) => setForm((f) => ({ ...f, objetivo: e.target.value }))} placeholder="Descreva o objetivo do PDI..." rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">Prazo *</label>
                  <input type="date" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white mb-1.5">Observações</label>
                  <input value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Observações..."
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:bg-white/5" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
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
