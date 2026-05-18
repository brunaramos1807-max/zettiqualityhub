'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchAllPeriodos } from '@/lib/services/dataService';
import { BookOpen, Plus, Target, TrendingUp, CheckCircle, X } from 'lucide-react';
import { useSystemAuth } from '@/contexts/SystemAuthContext';


interface PDI {
  id: string;
  analista: string;
  squad: string;
  periodo: string;
  objetivo: string;
  prazo: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes?: string;
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  em_andamento: { label: 'Em Andamento', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)' },
  concluido: { label: 'Concluído', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
};

const PDI_STORAGE_KEY = 'zetti_pdis';

function loadPDIs(): PDI[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(PDI_STORAGE_KEY) || '[]'); } catch { return []; }
}

function savePDIs(pdis: PDI[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PDI_STORAGE_KEY, JSON.stringify(pdis));
}

function PDIsContent() {
  const { session } = useSystemAuth();
  const [pdis, setPdis] = useState<PDI[]>([]);
  const [analysts, setAnalysts] = useState<{ name: string; squad: string }[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSquad, setFilterSquad] = useState<string>('all');
  const [form, setForm] = useState({ analista: '', squad: '', periodo: '', objetivo: '', prazo: '', observacoes: '' });

  const canEdit = session?.permissoes?.acesso_total || session?.permissoes?.permissao_editar || session?.cargo === 'Administrador';

  useEffect(() => {
    setPdis(loadPDIs());
    const loadAnalysts = async () => {
      const [scores, pList] = await Promise.all([fetchCycleScores(), fetchAllPeriodos()]);
      const map: Record<string, { name: string; squad: string }> = {};
      scores.forEach((s: any) => { if (!map[s.analista]) map[s.analista] = { name: s.analista, squad: s.squad }; });
      setAnalysts(Object.values(map));
      setPeriodos(pList);
    };
    loadAnalysts();
  }, []);

  const squads = ['all', ...Array.from(new Set(analysts.map((a) => a.squad).filter(Boolean)))];

  const filtered = pdis.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterSquad !== 'all' && p.squad !== filterSquad) return false;
    return true;
  });

  const handleAdd = () => {
    if (!form.analista || !form.objetivo || !form.prazo) return;
    const newPDI: PDI = {
      id: `pdi-${Date.now()}`,
      analista: form.analista,
      squad: form.squad || analysts.find((a) => a.name === form.analista)?.squad || '',
      periodo: form.periodo || periodos[periodos.length - 1] || '',
      objetivo: form.objetivo,
      prazo: form.prazo,
      status: 'pendente',
      observacoes: form.observacoes,
    };
    const updated = [...pdis, newPDI];
    setPdis(updated);
    savePDIs(updated);
    setForm({ analista: '', squad: '', periodo: '', objetivo: '', prazo: '', observacoes: '' });
    setShowForm(false);
  };

  const updateStatus = (id: string, status: PDI['status']) => {
    const updated = pdis.map((p) => (p.id === id ? { ...p, status } : p));
    setPdis(updated);
    savePDIs(updated);
  };

  const deletePDI = (id: string) => {
    const updated = pdis.filter((p) => p.id !== id);
    setPdis(updated);
    savePDIs(updated);
  };

  const stats = {
    total: pdis.length,
    pendente: pdis.filter((p) => p.status === 'pendente').length,
    em_andamento: pdis.filter((p) => p.status === 'em_andamento').length,
    concluido: pdis.filter((p) => p.status === 'concluido').length,
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">PDIs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Planos de Desenvolvimento Individual</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
            <Plus size={13} /> Novo PDI
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total PDIs', value: stats.total, color: '#38BDF8', icon: <BookOpen size={16} /> },
          { label: 'Pendentes', value: stats.pendente, color: '#F59E0B', icon: <Target size={16} /> },
          { label: 'Em Andamento', value: stats.em_andamento, color: '#38BDF8', icon: <TrendingUp size={16} /> },
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
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
        </select>
        <select value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} className="px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.08)' }}>
          {squads.map((s) => <option key={s} value={s}>{s === 'all' ? 'Todos os Squads' : s}</option>)}
        </select>
      </div>

      {/* PDI List */}
      <div className="space-y-3">
        {filtered.map((pdi) => {
          const statusCfg = STATUS_CONFIG[pdi.status];
          return (
            <div key={pdi.id} className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{pdi.analista}</span>
                    <span className="text-xs" style={{ color: '#94A3B8' }}>· {pdi.squad}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{pdi.objetivo}</p>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Prazo: {pdi.prazo} · Ciclo: {pdi.periodo}</p>
                  {pdi.observacoes && <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{pdi.observacoes}</p>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <select
                      value={pdi.status}
                      onChange={(e) => updateStatus(pdi.id, e.target.value as PDI['status'])}
                      className="px-2 py-1 rounded text-xs text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="concluido">Concluído</option>
                    </select>
                    <button onClick={() => deletePDI(pdi.id)} className="p-1.5 rounded transition-colors hover:bg-red-500/10" style={{ color: '#94A3B8' }}>
                      <X size={12} />
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
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Novo PDI</h3>
              <button onClick={() => setShowForm(false)} style={{ color: '#94A3B8' }}><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <select value={form.analista} onChange={(e) => setForm((v) => ({ ...v, analista: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Selecionar Analista</option>
                {analysts.map((a) => <option key={a.name} value={a.name}>{a.name} — {a.squad}</option>)}
              </select>
              <select value={form.periodo} onChange={(e) => setForm((v) => ({ ...v, periodo: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Selecionar Ciclo</option>
                {periodos.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <textarea value={form.objetivo} onChange={(e) => setForm((v) => ({ ...v, objetivo: e.target.value }))} placeholder="Objetivo do PDI..." rows={3} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <input type="text" value={form.prazo} onChange={(e) => setForm((v) => ({ ...v, prazo: e.target.value }))} placeholder="Prazo (ex: 30/06/2026)" className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
              <textarea value={form.observacoes} onChange={(e) => setForm((v) => ({ ...v, observacoes: e.target.value }))} placeholder="Observações (opcional)..." rows={2} className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>Salvar PDI</button>
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
