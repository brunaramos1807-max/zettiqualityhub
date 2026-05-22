'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Search } from 'lucide-react';

interface PdiItem {
  id: string;
  objetivo: string;
  acao_desenvolvimento: string | null;
  prazo: string | null;
  progresso: number;
  status: string;
  created_at: string;
  analistas?: { nome: string; equipe: string } | null;
  feedbacks?: { ciclo: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-gray-500/20 text-gray-300',
  em_andamento: 'bg-blue-500/20 text-blue-300',
  concluido: 'bg-green-500/20 text-green-300',
  cancelado: 'bg-red-500/20 text-red-300',
};

export default function FeedbackPdiPage() {
  const supabase = createClient();
  const [pdis, setPdis] = useState<PdiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    (async () => {
      let query = supabase
        .from('feedback_pdi')
        .select('*, analistas(nome, equipe), feedbacks(ciclo)')
        .order('created_at', { ascending: false });

      if (filterStatus) query = query.eq('status', filterStatus);

      const { data } = await query;
      const list = (data || []) as PdiItem[];
      const filtered = search
        ? list.filter((p) => p.objetivo?.toLowerCase().includes(search.toLowerCase()) || p.analistas?.nome?.toLowerCase().includes(search.toLowerCase()))
        : list;
      setPdis(filtered);
      setLoading(false);
    })();
  }, [filterStatus, search]);

  const updateProgresso = async (id: string, progresso: number, status: string) => {
    await supabase.from('feedback_pdi').update({ progresso, status }).eq('id', id);
    setPdis((prev) => prev.map((p) => p.id === id ? { ...p, progresso, status } : p));
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen size={24} className="text-sky-400" /> Plano de Desenvolvimento (PDI)
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acompanhamento contínuo dos planos de desenvolvimento individuais
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
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
            {['pendente', 'em_andamento', 'concluido', 'cancelado'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando PDIs...</div>
        ) : pdis.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <BookOpen size={40} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white">Nenhum PDI encontrado</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>PDIs são criados automaticamente ao salvar feedbacks com plano de desenvolvimento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pdis.map((pdi) => (
              <div key={pdi.id} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-white">{pdi.objetivo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pdi.status] || 'bg-gray-500/20 text-gray-300'}`}>
                        {pdi.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {pdi.acao_desenvolvimento && (
                      <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{pdi.acao_desenvolvimento}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {pdi.analistas?.nome && <span>👤 {pdi.analistas.nome}</span>}
                      {pdi.feedbacks?.ciclo && <span>📅 Ciclo {pdi.feedbacks.ciclo}</span>}
                      {pdi.prazo && <span>⏰ Prazo: {pdi.prazo}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={pdi.status}
                      onChange={(e) => updateProgresso(pdi.id, pdi.progresso, e.target.value)}
                      className="px-2 py-1 rounded text-xs text-white outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {['pendente', 'em_andamento', 'concluido', 'cancelado'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span>Progresso</span>
                    <span>{pdi.progresso}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pdi.progresso}
                    onChange={(e) => updateProgresso(pdi.id, Number(e.target.value), pdi.status)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: '#38BDF8' }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
