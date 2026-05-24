'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Search, Target, Clock, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';

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
  equipe?: string | null;
  ciclo?: string | null;
  source?: 'feedback_pdi' | 'pdi_records';
}

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

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return '#22C55E';
  if (progress >= 50) return '#38BDF8';
  if (progress >= 20) return '#EAB308';
  return '#94A3B8';
}

export default function FeedbackPdiPage() {
  const supabase = createClient();
  const [pdis, setPdis] = useState<PdiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');

  const loadPdis = async () => {
    setLoading(true);
    try {
      // Load from feedback_pdi (linked to feedbacks)
      const { data: feedbackPdis } = await supabase
        .from('feedback_pdi')
        .select(`
          id, objetivo, acao_desenvolvimento, prazo, progresso, status,
          responsavel, ciclo_origem, evidencia, created_at, updated_at,
          analistas(nome, equipe),
          feedbacks(ciclo)
        `)
        .order('created_at', { ascending: false });

      // Load from pdi_records (from integration)
      const { data: pdiRecords } = await supabase
        .from('pdi_records')
        .select('id, objetivo, prazo, status_pdi, acoes, analista, squad, coordenador, ciclo, created_at, updated_at, qa_score, iepc_score')
        .order('created_at', { ascending: false });

      const combined: PdiItem[] = [];

      // Process feedback_pdi
      if (feedbackPdis) {
        feedbackPdis.forEach((p: any) => {
          combined.push({
            id: p.id,
            objetivo: p.objetivo,
            acao_desenvolvimento: p.acao_desenvolvimento,
            prazo: p.prazo,
            progresso: p.progresso || 0,
            status: p.status || 'pendente',
            responsavel: p.responsavel,
            ciclo_origem: p.ciclo_origem || p.feedbacks?.ciclo,
            evidencia: p.evidencia,
            created_at: p.created_at,
            updated_at: p.updated_at,
            analista_nome: p.analistas?.nome,
            equipe: p.analistas?.equipe,
            ciclo: p.feedbacks?.ciclo,
            source: 'feedback_pdi',
          });
        });
      }

      // Process pdi_records
      if (pdiRecords) {
        pdiRecords.forEach((p: any) => {
          // Extract actions from acoes jsonb
          const acoes = Array.isArray(p.acoes) ? p.acoes : [];
          const firstAcao = acoes[0];

          // Calculate progress from actions
          const totalAcoes = acoes.length;
          const concluidasAcoes = acoes.filter((a: any) => a.status === 'concluido' || a.status === 'Concluído').length;
          const progresso = totalAcoes > 0 ? Math.round((concluidasAcoes / totalAcoes) * 100) : 0;

          combined.push({
            id: p.id,
            objetivo: p.objetivo || firstAcao?.descricao || 'PDI sem objetivo definido',
            acao_desenvolvimento: firstAcao?.descricao || null,
            prazo: p.prazo || firstAcao?.prazo || null,
            progresso,
            status: p.status_pdi || 'em_andamento',
            responsavel: p.coordenador,
            ciclo_origem: p.ciclo,
            created_at: p.created_at,
            updated_at: p.updated_at,
            analista_nome: p.analista,
            equipe: p.squad,
            ciclo: p.ciclo,
            source: 'pdi_records',
          });
        });
      }

      setPdis(combined);
    } catch (err) {
      console.error('Error loading PDIs:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadPdis(); }, []);

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

  const updateProgresso = async (pdi: PdiItem, progresso: number) => {
    try {
      if (pdi.source === 'feedback_pdi') {
        await supabase.from('feedback_pdi').update({ progresso }).eq('id', pdi.id);
      }
      setPdis((prev) => prev.map((p) => p.id === pdi.id ? { ...p, progresso } : p));
    } catch { /* ignore */ }
  };

  const equipes = ['', ...Array.from(new Set(pdis.map((p) => p.equipe).filter(Boolean)))];

  const filtered = pdis.filter((p) => {
    if (search && !p.objetivo?.toLowerCase().includes(search.toLowerCase()) &&
        !p.analista_nome?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterEquipe && p.equipe !== filterEquipe) return false;
    return true;
  });

  // KPI counts
  const kpis = {
    total: pdis.length,
    emAndamento: pdis.filter((p) => p.status === 'em_andamento' || p.status === 'Em andamento').length,
    concluidos: pdis.filter((p) => p.status === 'concluido' || p.status === 'Concluído').length,
    atrasados: pdis.filter((p) => p.status === 'atrasado').length,
  };

  return (
    <EnterpriseLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen size={22} className="text-sky-400" /> Plano de Desenvolvimento (PDI)
            </h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Acompanhamento contínuo dos planos de desenvolvimento individuais
            </p>
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
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
            <option value="nao_iniciado">Não Iniciado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="parcial">Parcial</option>
            <option value="concluido">Concluído</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          {equipes.length > 1 && (
            <select
              value={filterEquipe}
              onChange={(e) => setFilterEquipe(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
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
              {pdis.length === 0
                ? 'PDIs são criados automaticamente ao receber feedbacks com plano de desenvolvimento'
                : 'Tente ajustar os filtros de busca'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((pdi) => {
              const st = getStatusConfig(pdi.status);
              const progressColor = getProgressColor(pdi.progresso);
              return (
                <div key={pdi.id} className="rounded-xl p-5 transition-all hover:border-white/10"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-semibold text-white text-base">{pdi.objetivo}</span>
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                          style={{ backgroundColor: st.bg, color: st.color }}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      {pdi.acao_desenvolvimento && (
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{pdi.acao_desenvolvimento}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {pdi.analista_nome && <span className="flex items-center gap-1"><Users size={11} /> {pdi.analista_nome}</span>}
                        {pdi.equipe && <span>{pdi.equipe}</span>}
                        {pdi.ciclo_origem && <span className="flex items-center gap-1"><BookOpen size={11} /> Ciclo {pdi.ciclo_origem}</span>}
                        {pdi.prazo && <span className="flex items-center gap-1"><Clock size={11} /> Prazo: {pdi.prazo}</span>}
                        {pdi.responsavel && <span>Responsável: {pdi.responsavel}</span>}
                      </div>
                    </div>
                    {pdi.source === 'feedback_pdi' && (
                      <select
                        value={pdi.status}
                        onChange={(e) => updateStatus(pdi, e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs text-white outline-none flex-shrink-0"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="nao_iniciado">Não Iniciado</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="parcial">Parcial</option>
                        <option value="concluido">Concluído</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>Progresso</span>
                      <span className="font-bold" style={{ color: progressColor }}>{pdi.progresso}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pdi.progresso}%`, backgroundColor: progressColor, boxShadow: `0 0 8px ${progressColor}40` }} />
                    </div>
                    {pdi.source === 'feedback_pdi' && (
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={pdi.progresso}
                        onChange={(e) => updateProgresso(pdi, Number(e.target.value))}
                        className="w-full mt-2 h-1 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: progressColor }}
                      />
                    )}
                  </div>

                  {pdi.evidencia && (
                    <div className="mt-3 p-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                      📎 Evidência: {pdi.evidencia}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
