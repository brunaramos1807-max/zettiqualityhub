'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { ShieldAlert, Plus, X, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

interface Advertencia {
  id: string;
  analista_nome: string;
  data: string;
  categoria: string;
  severidade: 'leve' | 'moderada' | 'grave';
  motivo: string;
  descricao: string;
  responsavel: string;
  evidencia?: string;
  status: 'aberta' | 'em_acompanhamento' | 'encerrada';
  created_at: string;
}

const CATEGORIAS = ['Comportamento', 'Qualidade', 'Pontualidade', 'Comunicação', 'Processo', 'Ética', 'Outro'];
const SEVERIDADES = [
  { value: 'leve', label: 'Leve', color: '#EAB308', bg: 'rgba(234,179,8,0.1)' },
  { value: 'moderada', label: 'Moderada', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
  { value: 'grave', label: 'Grave', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
];
const STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta', color: '#EF4444', icon: <AlertTriangle size={12} /> },
  { value: 'em_acompanhamento', label: 'Em Acompanhamento', color: '#F59E0B', icon: <Clock size={12} /> },
  { value: 'encerrada', label: 'Encerrada', color: '#22C55E', icon: <CheckCircle size={12} /> },
];

const EMPTY_FORM = {
  analista_nome: '', data: '', categoria: 'Comportamento', severidade: 'leve' as const,
  motivo: '', descricao: '', responsavel: '', evidencia: '', status: 'aberta' as const,
};

function getSeveridade(v: string) { return SEVERIDADES.find((s) => s.value === v) || SEVERIDADES[0]; }
function getStatus(v: string) { return STATUS_OPTIONS.find((s) => s.value === v) || STATUS_OPTIONS[0]; }

export default function AdvertenciasPage() {
  const supabase = createClient();
  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeveridade, setFilterSeveridade] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('advertencias')
        .select('*')
        .order('data', { ascending: false });
      if (data) setAdvertencias(data as Advertencia[]);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = advertencias.filter((a) => {
    if (search && !a.analista_nome.toLowerCase().includes(search.toLowerCase()) && !a.motivo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterSeveridade !== 'all' && a.severidade !== filterSeveridade) return false;
    return true;
  });

  const handleSave = async () => {
    if (!form.analista_nome || !form.data || !form.motivo) return;
    setSaving(true);
    try {
      await supabase.from('advertencias').insert([{ ...form }]);
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      await load();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta advertência?')) return;
    await supabase.from('advertencias').delete().eq('id', id);
    setAdvertencias((prev) => prev.filter((a) => a.id !== id));
  };

  const counts = {
    total: advertencias.length,
    abertas: advertencias.filter((a) => a.status === 'aberta').length,
    acompanhamento: advertencias.filter((a) => a.status === 'em_acompanhamento').length,
    graves: advertencias.filter((a) => a.severidade === 'grave').length,
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={20} style={{ color: '#F97316' }} />
              <h1 className="text-xl font-bold text-white">Advertências</h1>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Registro e acompanhamento de advertências disciplinares</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1E40AF' }}>
            <Plus size={15} /> Nova Advertência
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: counts.total, color: '#38BDF8', bg: 'rgba(56,189,248,0.08)' },
            { label: 'Abertas', value: counts.abertas, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
            { label: 'Em Acompanhamento', value: counts.acompanhamento, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Graves', value: counts.graves, color: '#F97316', bg: 'rgba(249,115,22,0.08)' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>{k.label}</p>
              <p className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar analista ou motivo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-transparent text-white"
              style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', color: 'white' }} />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', outline: 'none' }}>
            <option value="all">Todos os status</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterSeveridade} onChange={(e) => setFilterSeveridade(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', outline: 'none' }}>
            <option value="all">Todas as severidades</option>
            {SEVERIDADES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Timeline list */}
        {loading ? (
          <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ShieldAlert size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Nenhuma advertência registrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const sev = getSeveridade(a.severidade);
              const st = getStatus(a.status);
              return (
                <div key={a.id} className="rounded-xl p-5" style={{ backgroundColor: '#0D1117', border: `1px solid ${sev.color}22` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: sev.bg, color: sev.color }}>
                        {a.analista_nome.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-white">{a.analista_nome}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: sev.bg, color: sev.color }}>{sev.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                            style={{ backgroundColor: `${st.color}15`, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>{a.categoria}</span>
                        </div>
                        <p className="text-sm font-medium text-white mb-1">{a.motivo}</p>
                        {a.descricao && <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.descricao}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          <span>📅 {new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                          <span>👤 {a.responsavel}</span>
                          {a.evidencia && <span>📎 {a.evidencia}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="sticky top-0 p-5 flex items-center justify-between" style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-base font-bold text-white flex items-center gap-2"><ShieldAlert size={16} style={{ color: '#F97316' }} /> Nova Advertência</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#8B949E' }}><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Analista *</label>
                    <input value={form.analista_nome} onChange={(e) => setForm((f) => ({ ...f, analista_nome: e.target.value }))}
                      placeholder="Nome do analista" className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Data *</label>
                    <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Categoria</label>
                    <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
                      {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Severidade</label>
                    <select value={form.severidade} onChange={(e) => setForm((f) => ({ ...f, severidade: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
                      {SEVERIDADES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Motivo *</label>
                    <input value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                      placeholder="Motivo da advertência" className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Descrição</label>
                    <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                      rows={3} placeholder="Descrição detalhada..." className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Responsável</label>
                    <input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                      placeholder="Nome do responsável" className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Evidência</label>
                    <input value={form.evidencia} onChange={(e) => setForm((f) => ({ ...f, evidencia: e.target.value }))}
                      placeholder="Link ou referência" className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving || !form.analista_nome || !form.data || !form.motivo}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: '#1E40AF' }}>
                    {saving ? 'Salvando...' : 'Registrar Advertência'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
