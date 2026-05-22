'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MessageSquare, Plus, Upload, Search, Eye, Edit2, Trash2, History, X } from 'lucide-react';

interface Feedback {
  id: string;
  ciclo: string;
  qa_score: number | null;
  iepc_score: number | null;
  aderencia_score: number | null;
  posicao_squad: number | null;
  total_squad: number | null;
  status: string;
  origem: string;
  created_at: string;
  analistas?: { nome: string; equipe: string; coordenador: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300',
  generated: 'bg-blue-500/20 text-blue-300',
  reviewed: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-300',
  sent: 'bg-purple-500/20 text-purple-300',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  generated: 'Gerado',
  reviewed: 'Revisado',
  approved: 'Aprovado',
  sent: 'Enviado',
};

export default function FeedbackListPage() {
  const supabase = createClient();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterCiclo, setFilterCiclo] = useState('');
  const [equipes, setEquipes] = useState<string[]>([]);
  const [ciclos, setCiclos] = useState<string[]>([]);

  const fetchFeedbacks = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('feedbacks')
      .select('id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, total_squad, status, origem, created_at, analistas(nome, equipe, coordenador)')
      .order('created_at', { ascending: false });

    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterEquipe) query = query.eq('analistas.equipe', filterEquipe);
    if (filterCiclo) query = query.eq('ciclo', filterCiclo);

    const { data } = await query;
    const list = (data || []) as Feedback[];

    const filtered = search
      ? list.filter((f) => f.analistas?.nome?.toLowerCase().includes(search.toLowerCase()) || f.ciclo?.toLowerCase().includes(search.toLowerCase()))
      : list;

    setFeedbacks(filtered);

    const eq = [...new Set(list.map((f) => f.analistas?.equipe).filter(Boolean))] as string[];
    const cq = [...new Set(list.map((f) => f.ciclo).filter(Boolean))] as string[];
    setEquipes(eq);
    setCiclos(cq);
    setLoading(false);
  }, [filterStatus, filterEquipe, filterCiclo, search]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este feedback?')) return;
    await supabase.from('feedbacks').delete().eq('id', id);
    fetchFeedbacks();
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare size={24} className="text-sky-400" />
              Feedback Experience
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Módulo de feedback individual e people analytics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/feedback/import"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
            >
              <Upload size={14} /> Importar JSON
            </Link>
            <Link
              href="/feedback/manual"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Plus size={14} /> Novo Feedback
            </Link>
          </div>
        </div>

        {/* API Info */}
        <div className="rounded-lg p-3 text-xs flex items-center gap-3" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <span className="text-sky-400 font-mono">POST /api/feedbacks/import</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>— Endpoint para integração automática com Lovable</span>
          <span className="ml-auto text-sky-400">Bearer {'{INTEGRATION_API_TOKEN}'}</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar analista ou ciclo..."
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
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterEquipe}
            onChange={(e) => setFilterEquipe(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="">Todas as equipes</option>
            {equipes.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            value={filterCiclo}
            onChange={(e) => setFilterCiclo(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="">Todos os ciclos</option>
            {ciclos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {(filterStatus || filterEquipe || filterCiclo || search) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterEquipe(''); setFilterCiclo(''); setSearch(''); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                {['Analista', 'Equipe', 'Ciclo', 'QA', 'IEPC', 'Aderência', 'Posição', 'Status', 'Origem', 'Ações'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.05em' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando...</td></tr>
              ) : feedbacks.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                  <p>Nenhum feedback encontrado</p>
                  <p className="text-xs mt-1 opacity-60">Importe um JSON ou crie manualmente</p>
                </td></tr>
              ) : feedbacks.map((fb) => (
                <tr key={fb.id} className="border-t transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <td className="px-4 py-3 font-medium text-white">{fb.analistas?.nome || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{fb.analistas?.equipe || '—'}</td>
                  <td className="px-4 py-3 text-sky-400 font-mono text-xs">{fb.ciclo}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white">{fb.qa_score ?? '—'}</span>
                    <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-white">{fb.iepc_score ?? '—'}</span>
                    <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>%</span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>{fb.aderencia_score ? `${fb.aderencia_score}%` : '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {fb.posicao_squad ? `${fb.posicao_squad}/${fb.total_squad || '?'}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[fb.status] || 'bg-gray-500/20 text-gray-300'}`}>
                      {STATUS_LABELS[fb.status] || fb.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{fb.origem}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/feedback/${fb.id}`} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Visualizar" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <Eye size={13} />
                      </Link>
                      <Link href={`/feedback/manual?id=${fb.id}`} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Editar" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <Edit2 size={13} />
                      </Link>
                      <Link href={`/feedback/historico?analista=${fb.analistas?.nome}`} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Histórico" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <History size={13} />
                      </Link>
                      <button onClick={() => handleDelete(fb.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Excluir" style={{ color: 'rgba(239,68,68,0.6)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} encontrado{feedbacks.length !== 1 ? 's' : ''}
        </p>
      </div>
    </EnterpriseLayout>
  );
}
