'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  MessageSquare, Plus, Upload, Search, Eye, Edit2, Trash2,
  History, X, CheckSquare, Square, Trash, Users, BarChart2,
  TrendingUp, Sparkles, ArrowUpDown, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react';

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

type SortField = 'nome' | 'ciclo' | 'qa_score' | 'created_at';
type SortDir = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400 border border-gray-600/20',
  generated: 'bg-blue-500/20 text-blue-300 border border-blue-600/20',
  reviewed: 'bg-yellow-500/20 text-yellow-300 border border-yellow-600/20',
  approved: 'bg-green-500/20 text-green-300 border border-green-600/20',
  sent: 'bg-purple-500/20 text-purple-300 border border-purple-600/20',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', generated: 'Gerado', reviewed: 'Revisado',
  approved: 'Aprovado', sent: 'Enviado',
};

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'nome', label: 'Nome' },
  { value: 'ciclo', label: 'Ciclo' },
  { value: 'qa_score', label: 'Score QA' },
  { value: 'created_at', label: 'Data' },
];

function parseCiclo(c: string): number {
  if (!c) return 0;
  const m = c.match(/^(\d{2})\/(\d{4})$/);
  if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
  return 0;
}

function sortFeedbacks(list: Feedback[], field: SortField, dir: SortDir): Feedback[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (field === 'nome') {
      cmp = (a.analistas?.nome || '').localeCompare(b.analistas?.nome || '', 'pt-BR');
    } else if (field === 'ciclo') {
      cmp = parseCiclo(a.ciclo) - parseCiclo(b.ciclo);
    } else if (field === 'qa_score') {
      cmp = (a.qa_score ?? -1) - (b.qa_score ?? -1);
    } else if (field === 'created_at') {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

export default function FeedbackListPage() {
  const supabase = createClient();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterCiclo, setFilterCiclo] = useState('');
  const [equipes, setEquipes] = useState<string[]>([]);
  const [ciclos, setCiclos] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [userName, setUserName] = useState('Coordenador');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchFeedbacks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    let query = supabase
      .from('feedbacks')
      .select('id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, total_squad, status, origem, created_at, analistas(nome, equipe, coordenador)');

    if (filterStatus) query = query.eq('status', filterStatus);
    if (filterCiclo) query = query.eq('ciclo', filterCiclo);

    const { data } = await query;
    const list = (data || []) as Feedback[];

    const filtered = search
      ? list.filter((f) =>
          f.analistas?.nome?.toLowerCase().includes(search.toLowerCase()) ||
          f.ciclo?.toLowerCase().includes(search.toLowerCase()) ||
          f.analistas?.equipe?.toLowerCase().includes(search.toLowerCase())
        )
      : list;

    const filteredByEquipe = filterEquipe
      ? filtered.filter((f) => f.analistas?.equipe === filterEquipe)
      : filtered;

    setFeedbacks(filteredByEquipe);
    const eq = [...new Set(list.map((f) => f.analistas?.equipe).filter(Boolean))] as string[];
    const cq = [...new Set(list.map((f) => f.ciclo).filter(Boolean))] as string[];
    setEquipes(eq);
    setCiclos(cq);
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [filterStatus, filterEquipe, filterCiclo, search]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        const name = data.user.user_metadata?.full_name || data.user.email.split('@')[0];
        setUserName(name);
      }
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este feedback?')) return;
    await supabase.from('feedbacks').delete().eq('id', id);
    fetchFeedbacks();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} feedback(s) selecionado(s)?`)) return;
    setDeleting(true);
    await supabase.from('feedbacks').delete().in('id', Array.from(selected));
    setSelected(new Set());
    setDeleting(false);
    fetchFeedbacks();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === feedbacks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(feedbacks.map((f) => f.id)));
    }
  };

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedFeedbacks = sortFeedbacks(feedbacks, sortField, sortDir);

  // KPI totals from filtered list
  const totalFeedbacks = feedbacks.length;
  const totalEquipes = new Set(feedbacks.map((f) => f.analistas?.equipe).filter(Boolean)).size;
  const avgQA = feedbacks.length > 0
    ? Math.round(feedbacks.filter(f => f.qa_score).reduce((a, f) => a + (f.qa_score || 0), 0) / (feedbacks.filter(f => f.qa_score).length || 1))
    : 0;

  const hasFilters = !!(filterStatus || filterEquipe || filterCiclo || search);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={10} className="text-slate-700 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="text-sky-400 ml-1" />
      : <ChevronDown size={10} className="text-sky-400 ml-1" />;
  };

  return (
    <EnterpriseLayout>
      <div className="p-5 space-y-4 min-h-screen" style={{ backgroundColor: '#07101F' }}>

        {/* ── WELCOME BANNER ── */}
        <div className="relative overflow-hidden rounded-xl border border-[#1E3050] bg-[#0F1B31] px-5 py-4 shadow-lg">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 blur-[60px] rounded-full pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-sky-400" />
                <p className="text-xs text-sky-400 font-medium">Feedback Experience · QualiVisão</p>
              </div>
              <h1 className="text-lg font-bold text-white">Seja bem-vindo, {userName} 👋</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhe os feedbacks do mês, analise a performance das equipes e gerencie devolutivas individuais.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => fetchFeedbacks(true)}
                disabled={refreshing}
                title="Atualizar lista"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-[#1E3050] text-slate-400 hover:text-slate-200 hover:bg-[#1E3050]/60 disabled:opacity-50"
              >
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </button>
              <Link
                href="/feedback/import"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-[#1E3050] text-slate-400 hover:text-slate-200 hover:bg-[#1E3050]/60"
              >
                <Upload size={12} /> Importar JSON
              </Link>
              <Link
                href="/feedback/manual"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                <Plus size={12} /> Novo Feedback
              </Link>
            </div>
          </div>
        </div>

        {/* ── KPI TOTALS ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Total de Feedbacks', value: totalFeedbacks, icon: <MessageSquare size={14} />, color: 'text-sky-400', note: hasFilters ? 'filtrado' : 'total' },
            { label: 'Equipes', value: totalEquipes, icon: <Users size={14} />, color: 'text-teal-400', note: 'equipes distintas' },
            { label: 'QA Médio', value: avgQA ? `${avgQA}` : '—', icon: <BarChart2 size={14} />, color: 'text-purple-400', note: 'score médio' },
            { label: 'Ciclos', value: ciclos.length, icon: <TrendingUp size={14} />, color: 'text-amber-400', note: 'ciclos ativos' },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl border border-[#1E3050] bg-[#0F1B31] px-4 py-3 hover:border-sky-900/40 transition-all">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={kpi.color}>{kpi.icon}</span>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-white leading-none mb-0.5">{kpi.value}</p>
              <p className="text-[10px] text-slate-600">{kpi.note}</p>
            </div>
          ))}
        </div>

        {/* ── FILTERS + SORT ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-44">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar analista, equipe ou ciclo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none bg-[#0F1B31] border border-[#1E3050] focus:border-sky-700/50 transition-colors"
            />
          </div>
          {[
            { value: filterStatus, onChange: setFilterStatus, options: Object.entries(STATUS_LABELS), placeholder: 'Todos os status' },
            { value: filterEquipe, onChange: setFilterEquipe, options: equipes.map(e => [e, e]), placeholder: 'Todas as equipes' },
            { value: filterCiclo, onChange: setFilterCiclo, options: ciclos.map(c => [c, c]), placeholder: 'Todos os ciclos' },
          ].map((sel, i) => (
            <select
              key={i}
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs text-white outline-none bg-[#0F1B31] border border-[#1E3050] focus:border-sky-700/50 transition-colors"
            >
              <option value="">{sel.placeholder}</option>
              {sel.options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          ))}
          {/* Sort selector */}
          <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0F1B31] border border-[#1E3050]">
            <ArrowUpDown size={11} className="text-slate-500 flex-shrink-0" />
            <select
              value={sortField}
              onChange={(e) => { setSortField(e.target.value as SortField); setSortDir('asc'); }}
              className="text-xs text-white outline-none bg-transparent"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="ml-1 text-slate-400 hover:text-sky-400 transition-colors"
              title={sortDir === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterStatus(''); setFilterEquipe(''); setFilterCiclo(''); setSearch(''); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        {/* ── BULK ACTIONS ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-sky-900/20 border border-sky-700/30">
            <span className="text-xs text-sky-300 font-medium">{selected.size} selecionado(s)</span>
            <button
              onClick={handleBulkDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 border border-red-700/30 hover:bg-red-800/40 transition-all disabled:opacity-50"
            >
              <Trash size={11} /> {deleting ? 'Excluindo...' : 'Excluir Selecionados'}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* ── TABLE ── */}
        <div className="rounded-xl overflow-hidden border border-[#1E3050]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#0F1B31]/80">
                <th className="px-3 py-2.5 text-left w-8">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-slate-300 transition-colors">
                    {selected.size === feedbacks.length && feedbacks.length > 0
                      ? <CheckSquare size={13} className="text-sky-400" />
                      : <Square size={13} />}
                  </button>
                </th>
                {/* Sortable column headers */}
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">
                  <button onClick={() => handleSortClick('nome')} className="flex items-center hover:text-slate-300 transition-colors">
                    Analista <SortIcon field="nome" />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">Equipe</th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">
                  <button onClick={() => handleSortClick('ciclo')} className="flex items-center hover:text-slate-300 transition-colors">
                    Ciclo <SortIcon field="ciclo" />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">
                  <button onClick={() => handleSortClick('qa_score')} className="flex items-center hover:text-slate-300 transition-colors">
                    QA <SortIcon field="qa_score" />
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">IEPC</th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">Aderência</th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">Status</th>
                <th className="px-3 py-2.5 text-left font-medium text-[10px] uppercase tracking-widest text-slate-600">
                  <button onClick={() => handleSortClick('created_at')} className="flex items-center hover:text-slate-300 transition-colors">
                    Ações <SortIcon field="created_at" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-600">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    Carregando...
                  </div>
                </td></tr>
              ) : sortedFeedbacks.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-600">
                  <MessageSquare size={28} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum feedback encontrado</p>
                  <p className="text-xs mt-1 opacity-60">Importe um JSON ou crie manualmente</p>
                </td></tr>
              ) : sortedFeedbacks.map((fb) => (
                <tr
                  key={fb.id}
                  className={`border-t border-[#1E3050]/60 transition-colors hover:bg-[#0F1B31]/40 ${selected.has(fb.id) ? 'bg-sky-900/10' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleSelect(fb.id)} className="text-slate-500 hover:text-sky-400 transition-colors">
                      {selected.has(fb.id) ? <CheckSquare size={13} className="text-sky-400" /> : <Square size={13} />}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-white">{fb.analistas?.nome || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{fb.analistas?.equipe || '—'}</td>
                  <td className="px-3 py-2.5 text-sky-400 font-mono">{fb.ciclo}</td>
                  <td className="px-3 py-2.5">
                    <span className={`font-bold ${(fb.qa_score || 0) >= 90 ? 'text-green-400' : (fb.qa_score || 0) >= 70 ? 'text-amber-400' : 'text-white'}`}>
                      {fb.qa_score ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{fb.iepc_score != null ? `${fb.iepc_score}%` : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{fb.aderencia_score ? `${fb.aderencia_score}%` : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[fb.status] || 'bg-gray-500/20 text-gray-400'}`}>
                      {STATUS_LABELS[fb.status] || fb.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      <Link href={`/feedback/${fb.id}`} className="p-1.5 rounded hover:bg-sky-900/30 transition-colors text-slate-500 hover:text-sky-400" title="Visualizar">
                        <Eye size={12} />
                      </Link>
                      <Link href={`/feedback/manual?id=${fb.id}`} className="p-1.5 rounded hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-300" title="Editar">
                        <Edit2 size={12} />
                      </Link>
                      <Link href={`/feedback/historico?analista=${fb.analistas?.nome}`} className="p-1.5 rounded hover:bg-white/5 transition-colors text-slate-500 hover:text-slate-300" title="Histórico">
                        <History size={12} />
                      </Link>
                      <button onClick={() => handleDelete(fb.id)} className="p-1.5 rounded hover:bg-red-900/20 transition-colors text-slate-600 hover:text-red-400" title="Excluir">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-slate-700">
          {feedbacks.length} feedback{feedbacks.length !== 1 ? 's' : ''} {hasFilters ? 'filtrado' : 'total'}
          {selected.size > 0 && ` · ${selected.size} selecionado(s)`}
          {' · '}ordenado por {SORT_OPTIONS.find(o => o.value === sortField)?.label} ({sortDir === 'asc' ? 'crescente' : 'decrescente'})
        </p>
      </div>
    </EnterpriseLayout>
  );
}
