'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Star, TrendingUp, Users, MessageSquare, BarChart2, CheckCircle, AlertCircle, Eye, X, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface Feedback {
  id: string;
  analista_id: string;
  ciclo: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  coordenador: string | null;
  equipe: string | null;
  qa_score: number | null;
  iepc_score: number | null;
  aderencia_score: number | null;
  posicao_squad: number | null;
  total_squad: number | null;
  ciclos_consecutivos_evolucao: number;
  pilares_qa: PilarItem[];
  pilares_iepc: PilarItem[];
  pontos_fortes: PontoItem[];
  oportunidades: PontoItem[];
  resumo_ciclo: string | null;
  tendencias: Record<string, unknown>;
  conquistas: ConquistaItem[];
  status: string;
  analistas?: AnalistaInfo | null;
  feedback_atendimentos?: AtendimentoItem[];
  feedback_coaching?: CoachingItem[];
  feedback_pdi?: PdiItem[];
}

interface AnalistaInfo {
  nome: string;
  nome_completo: string | null;
  cargo_operacional: string | null;
  equipe: string | null;
  coordenador: string | null;
  data_admissao: string | null;
  analista_id: string | null;
}

interface PilarItem { nome: string; pontuacao: number; max: number; variacao?: number; observacao?: string }
interface PontoItem { titulo: string; descricao: string }
interface ConquistaItem { titulo: string; valor: string; periodo?: string; icone?: string }
interface AtendimentoItem {
  id: string;
  protocolo: string;
  cliente: string;
  assunto: string;
  nota_qa: number;
  nota_iepc: number;
  classificacao: string;
  observacao?: string;
  sup?: string;
  duracao?: string;
  solucao?: string;
  sintese?: string;
  comportamento?: string;
  criterios?: string[];
  evidencias?: string;
  ncs?: string[];
  tags?: string[];
}
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem { id: string; objetivo: string; acao_desenvolvimento: string; prazo: string; progresso: number; status: string }
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

const PILAR_COLORS = ['#38BDF8', '#22C55E', '#A78BFA', '#FB923C', '#FBBF24'];

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: '#22C55E',
  bom: '#38BDF8',
  regular: '#EAB308',
  critico: '#EF4444',
};

const PDI_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-gray-500/20 text-gray-300',
  em_andamento: 'bg-blue-500/20 text-blue-300',
  concluido: 'bg-green-500/20 text-green-300',
  nao_iniciado: 'bg-gray-500/20 text-gray-400',
  cancelado: 'bg-red-500/20 text-red-300',
};

function tempoDeEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const diff = Date.now() - new Date(dataAdmissao).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  if (years > 0) return `${years} anos e ${months} meses`;
  return `${months} meses`;
}

function CircleProgress({ value, color = '#22C55E' }: { value: number; color?: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 45 45)" />
      <text x="45" y="50" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{value}%</text>
    </svg>
  );
}

// ─── Atendimento Detail Modal ─────────────────────────────────────────────────

function AtendimentoModal({ atendimento, onClose }: { atendimento: AtendimentoItem; onClose: () => void }) {
  const classColor = CLASSIFICACAO_COLORS[atendimento.classificacao] || '#94A3B8';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="sticky top-0 p-5 flex items-center justify-between"
          style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold" style={{ color: '#38BDF8' }}>{atendimento.protocolo || '—'}</span>
              {atendimento.classificacao && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: `${classColor}18`, color: classColor, border: `1px solid ${classColor}30` }}>
                  {atendimento.classificacao.charAt(0).toUpperCase() + atendimento.classificacao.slice(1)}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{atendimento.cliente}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Nota QA', value: atendimento.nota_qa ?? '—', color: '#38BDF8' },
              { label: 'IEPC', value: atendimento.nota_iepc != null ? `${atendimento.nota_iepc}%` : '—', color: '#22C55E' },
              { label: 'SUP', value: atendimento.sup || '—', color: '#A78BFA' },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs mb-1" style={{ color: '#8B949E' }}>{s.label}</p>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Details */}
          {[
            { label: 'Assunto', value: atendimento.assunto },
            { label: 'Duração', value: atendimento.duracao },
            { label: 'Solução', value: atendimento.solucao },
            { label: 'Síntese', value: atendimento.sintese },
            { label: 'Comportamento', value: atendimento.comportamento },
            { label: 'Evidências', value: atendimento.evidencias },
            { label: 'Observação', value: atendimento.observacao },
          ].filter((d) => d.value).map((d) => (
            <div key={d.label} className="p-3 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#8B949E' }}>{d.label}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>{d.value}</p>
            </div>
          ))}

          {/* Tags */}
          {(atendimento.tags?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#8B949E' }}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {atendimento.tags?.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* NCs */}
          {(atendimento.ncs?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#EF4444' }}>Não Conformidades</p>
              <div className="space-y-1">
                {atendimento.ncs?.map((nc, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertCircle size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{nc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackViewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qa' | 'iepc'>('qa');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoItem | null>(null);
  const [showAllAtendimentos, setShowAllAtendimentos] = useState(false);

  const handlePrint = () => { window.print(); };

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select(`*, analistas(nome, nome_completo, cargo_operacional, equipe, coordenador, data_admissao, analista_id), feedback_atendimentos(*), feedback_coaching(*), feedback_pdi(*)`)
        .eq('id', id)
        .single();
      if (data) {
        setFeedback(data as Feedback);
        if (data.analista_id) {
          const { data: hist } = await supabase
            .from('feedback_historico')
            .select('ciclo, qa_score, iepc_score')
            .eq('analista_id', data.analista_id)
            .order('created_at', { ascending: true })
            .limit(6);
          if (hist) setHistorico(hist as HistoricoItem[]);
        }
      }
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-64" style={{ color: 'rgba(255,255,255,0.3)' }}>Carregando feedback...</div>
    </EnterpriseLayout>
  );

  if (!feedback) return (
    <EnterpriseLayout>
      <div className="p-6 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Feedback não encontrado. <Link href="/feedback" className="text-sky-400">Voltar</Link></div>
    </EnterpriseLayout>
  );

  const analista = feedback.analistas;
  const pilares = activeTab === 'qa' ? (feedback.pilares_qa || []) : (feedback.pilares_iepc || []);
  const initials = analista?.nome?.split(' ').slice(0, 2).map((n) => n[0]).join('') || '?';
  const tendencias = feedback.tendencias as Record<string, unknown>;
  const atendimentos = feedback.feedback_atendimentos || [];
  const visibleAtendimentos = showAllAtendimentos ? atendimentos : atendimentos.slice(0, 5);

  const content = (
    <div className={`max-w-5xl mx-auto print:max-w-full ${fullscreen ? 'px-8 py-6' : ''}`}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 print:hidden">
        {!fullscreen ? (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={14} /> Voltar
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Sair' : 'Apresentação'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      <div className={`px-6 pb-8 space-y-6 ${fullscreen ? 'text-lg' : ''}`}>
        {/* ── HEADER ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1e3e 0%, #071428 100%)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className={`${fullscreen ? 'w-28 h-28 text-3xl' : 'w-20 h-20 text-2xl'} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
                  style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className={`${fullscreen ? 'text-4xl' : 'text-2xl'} font-bold text-white`}>{analista?.nome || 'Analista'}</h1>
                    {feedback.posicao_squad === 1 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.3)' }}>
                        <Star size={10} fill="currentColor" /> Destaque do Ciclo
                      </span>
                    )}
                  </div>
                  <p className={`${fullscreen ? 'text-base' : 'text-sm'} mt-0.5`} style={{ color: 'rgba(255,255,255,0.5)' }}>{analista?.cargo_operacional || '—'}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>Equipe: <span className="text-white">{analista?.equipe || feedback.equipe || '—'}</span></span>
                    <span>Coordenadora: <span className="text-white">{analista?.coordenador || feedback.coordenador || '—'}</span></span>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    ⏱ Tempo de empresa: {tempoDeEmpresa(analista?.data_admissao || null)}
                  </p>
                </div>
              </div>

              {/* Score cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:w-auto w-full">
                <div className="rounded-xl p-4 min-w-[110px]" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>CICLO</p>
                  <p className={`${fullscreen ? 'text-xl' : 'text-base'} font-bold text-white`}>{feedback.ciclo}</p>
                  {feedback.periodo_inicio && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{feedback.periodo_inicio}</p>}
                  {feedback.periodo_fim && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>a {feedback.periodo_fim}</p>}
                  <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86EFAC' }}>Concluído</span>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(56,189,248,0.7)' }}>QA</p>
                  <p className={`${fullscreen ? 'text-5xl' : 'text-4xl'} font-bold text-white leading-none`}>{feedback.qa_score ?? '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</p>
                  {(tendencias?.variacao_qa as number) !== undefined && (
                    <p className="text-xs mt-1 text-green-400">↑ {tendencias.variacao_qa as number} pts</p>
                  )}
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.7)' }}>IEPC</p>
                  <p className={`${fullscreen ? 'text-5xl' : 'text-4xl'} font-bold text-white leading-none`}>{feedback.iepc_score ?? '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>%</p>
                  {(tendencias?.variacao_iepc as number) !== undefined && (
                    <p className="text-xs mt-1 text-green-400">↑ {tendencias.variacao_iepc as number} pts</p>
                  )}
                </div>
                <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>ADERÊNCIA</p>
                  {feedback.aderencia_score != null
                    ? <CircleProgress value={feedback.aderencia_score} />
                    : <p className="text-2xl font-bold text-white">—</p>}
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>aos critérios</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RESUMO DO CICLO ── */}
        {feedback.resumo_ciclo && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <BarChart2 size={14} /> RESUMO DO CICLO
            </h3>
            <p className={`${fullscreen ? 'text-base' : 'text-sm'} leading-relaxed`} style={{ color: 'rgba(255,255,255,0.8)' }}>{feedback.resumo_ciclo}</p>
            {(feedback.posicao_squad != null || (feedback.feedback_atendimentos?.length || 0) > 0 || feedback.ciclos_consecutivos_evolucao > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.1)' }}>
                    <TrendingUp size={18} className="mx-auto mb-1 text-sky-400" />
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Evolução</p>
                    {tendencias?.variacao_qa !== undefined && <p className="text-sm font-bold text-sky-400">+{tendencias.variacao_qa as number} pts no QA</p>}
                    {tendencias?.variacao_iepc !== undefined && <p className="text-xs text-green-400">+{tendencias.variacao_iepc as number} pts no IEPC</p>}
                  </div>
                )}
                {feedback.posicao_squad != null && (
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.1)' }}>
                    <Users size={18} className="mx-auto mb-1 text-yellow-400" />
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Posição no Squad</p>
                    <p className="text-sm font-bold text-yellow-400">Top {feedback.posicao_squad}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>entre {feedback.total_squad || '?'} analistas</p>
                  </div>
                )}
                {(feedback.feedback_atendimentos?.length || 0) > 0 && (
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.1)' }}>
                    <MessageSquare size={18} className="mx-auto mb-1 text-purple-400" />
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Atendimentos</p>
                    <p className="text-sm font-bold text-purple-400">{feedback.feedback_atendimentos?.length} avaliados</p>
                  </div>
                )}
                {feedback.ciclos_consecutivos_evolucao > 0 && (
                  <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
                    <TrendingUp size={18} className="mx-auto mb-1 text-green-400" />
                    <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Tendência</p>
                    <p className="text-sm font-bold text-green-400">Em evolução</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{feedback.ciclos_consecutivos_evolucao} ciclos consecutivos</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PILARES + EVOLUÇÃO ── */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PERFORMANCE POR PILAR</h3>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['qa', 'iepc'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1 text-xs font-medium transition-colors"
                    style={{ backgroundColor: activeTab === tab ? 'rgba(56,189,248,0.15)' : 'transparent', color: activeTab === tab ? '#38BDF8' : 'rgba(255,255,255,0.4)' }}>
                    {tab === 'qa' ? 'QA' : 'IEPC'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {pilares.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhum pilar registrado</p>
              ) : pilares.map((p, i) => {
                const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                const color = PILAR_COLORS[i % PILAR_COLORS.length];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{i + 1}. {p.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                        {p.variacao !== undefined && (
                          <span className={p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {p.variacao >= 0 ? '↑' : '↓'} {Math.abs(p.variacao)} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    {p.observacao && (
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.observacao}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>EVOLUÇÃO HISTÓRICA</h3>
            {historico.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <YAxis domain={[50, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="qa_score" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} name="QA" />
                  <Line type="monotone" dataKey="iepc_score" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} name="IEPC" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <p className="text-sm">Histórico insuficiente</p>
              </div>
            )}
          </div>
        </div>

        {/* ── PONTOS FORTES / OPORTUNIDADES ── */}
        {((feedback.pontos_fortes?.length || 0) > 0 || (feedback.oportunidades?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {(feedback.pontos_fortes?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <h3 className="text-xs font-bold tracking-widest mb-4 flex items-center gap-2" style={{ color: 'rgba(34,197,94,0.7)' }}>
                  🏆 PONTOS FORTES
                </h3>
                <div className="space-y-4">
                  {(feedback.pontos_fortes || []).map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`${fullscreen ? 'text-base' : 'text-sm'} font-semibold text-white`}>{p.titulo}</p>
                        <p className={`${fullscreen ? 'text-sm' : 'text-xs'} mt-1 leading-relaxed`} style={{ color: 'rgba(255,255,255,0.55)' }}>{p.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(feedback.oportunidades?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.12)' }}>
                <h3 className="text-xs font-bold tracking-widest mb-4 flex items-center gap-2" style={{ color: 'rgba(251,146,60,0.7)' }}>
                  🎯 OPORTUNIDADES DE EVOLUÇÃO
                </h3>
                <div className="space-y-4">
                  {(feedback.oportunidades || []).map((o, i) => (
                    <div key={i} className="flex gap-3">
                      <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className={`${fullscreen ? 'text-base' : 'text-sm'} font-semibold text-white`}>{o.titulo}</p>
                        <p className={`${fullscreen ? 'text-sm' : 'text-xs'} mt-1 leading-relaxed`} style={{ color: 'rgba(255,255,255,0.55)' }}>{o.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COACHING ── */}
        {(feedback.feedback_coaching?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-xs font-bold tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>💬 COACHING DE COMUNICAÇÃO</h3>
            <div className="space-y-6">
              {(feedback.feedback_coaching || []).map((c, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-3">
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(56,189,248,0.7)' }}>O QUE FOI DITO</p>
                    <p className={`${fullscreen ? 'text-base' : 'text-sm'} italic leading-relaxed`} style={{ color: 'rgba(255,255,255,0.6)' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(234,179,8,0.8)' }}>COMO PODERIA SER</p>
                    <p className={`${fullscreen ? 'text-base' : 'text-sm'} leading-relaxed`} style={{ color: 'rgba(255,255,255,0.85)' }}>{c.como_poderia_ser}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(56,189,248,0.7)' }}>⭐ DICA DE OURO</p>
                    <p className={`${fullscreen ? 'text-base' : 'text-sm'} leading-relaxed`} style={{ color: 'rgba(255,255,255,0.7)' }}>{c.dica_de_ouro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATENDIMENTOS AVALIADOS (clickable) ── */}
        {atendimentos.length > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                📋 ATENDIMENTOS AVALIADOS <span style={{ color: 'rgba(255,255,255,0.25)' }}>({atendimentos.length})</span>
              </h3>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Clique para detalhes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Protocolo', 'Cliente', 'Assunto', 'Nota QA', 'IEPC', 'Classificação', ''].map((h) => (
                      <th key={h} className="text-left pb-3 pr-4 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleAtendimentos.map((a) => {
                    const classColor = CLASSIFICACAO_COLORS[a.classificacao] || '#94A3B8';
                    return (
                      <tr key={a.id}
                        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onClick={() => setSelectedAtendimento(a)}>
                        <td className="py-3 pr-4 font-mono text-xs" style={{ color: '#38BDF8' }}>{a.protocolo || '—'}</td>
                        <td className="py-3 pr-4 font-medium text-white">{a.cliente}</td>
                        <td className="py-3 pr-4 max-w-[200px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <span className="block truncate">{a.assunto}</span>
                        </td>
                        <td className="py-3 pr-4 font-bold text-white">{a.nota_qa ?? '—'}</td>
                        <td className="py-3 pr-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{a.nota_iepc != null ? `${a.nota_iepc}%` : '—'}</td>
                        <td className="py-3 pr-4">
                          {a.classificacao && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${classColor}18`, color: classColor, border: `1px solid ${classColor}30` }}>
                              {a.classificacao.charAt(0).toUpperCase() + a.classificacao.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <Eye size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {atendimentos.length > 5 && (
              <button
                onClick={() => setShowAllAtendimentos((v) => !v)}
                className="mt-3 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 w-full justify-center transition-colors">
                {showAllAtendimentos ? <><ChevronUp size={13} /> Mostrar menos</> : <><ChevronDown size={13} /> Ver todos os {atendimentos.length} atendimentos</>}
              </button>
            )}
          </div>
        )}

        {/* ── PDI + CONQUISTAS ── */}
        <div className="grid md:grid-cols-2 gap-5">
          {(feedback.feedback_pdi?.length || 0) > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>📈 PLANO DE DESENVOLVIMENTO (PDI)</h3>
              <div className="space-y-4">
                {(feedback.feedback_pdi || []).map((p) => (
                  <div key={p.id} className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <p className={`${fullscreen ? 'text-base' : 'text-sm'} font-semibold text-white`}>{p.objetivo}</p>
                        <p className={`${fullscreen ? 'text-sm' : 'text-xs'} mt-1 leading-relaxed`} style={{ color: 'rgba(255,255,255,0.5)' }}>{p.acao_desenvolvimento}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {p.prazo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.prazo}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PDI_STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-300'}`}>
                          {p.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${p.progresso}%` }} />
                      </div>
                      <span className="text-xs font-bold text-sky-400">{p.progresso}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/feedback/pdi" className="mt-3 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">Acompanhar PDI completo →</Link>
            </div>
          )}

          {(feedback.conquistas?.length || 0) > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>🏅 CONQUISTAS E EVOLUÇÃO</h3>
              <div className="space-y-2">
                {(feedback.conquistas || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className={`${fullscreen ? 'text-base' : 'text-sm'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>{c.titulo}</span>
                    <div className="flex items-center gap-2">
                      <span className={`${fullscreen ? 'text-base' : 'text-sm'} font-bold text-green-400`}>{c.valor}</span>
                      {c.periodo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.periodo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RODAPÉ ── */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-orange-400">Desenvolvimento e evolução contínua.</p>
              <p className="text-xs text-sky-400">Você está no caminho certo!</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Documento confidencial • Uso interno</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>QualiVisão People Analytics © 2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ciclo: {feedback.ciclo} • Versão 1.0</p>
              <p className="text-xs font-bold mt-1" style={{ color: 'rgba(56,189,248,0.7)' }}>QualiVisão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {fullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: '#060E1E' }}>
          {content}
        </div>
      ) : (
        <EnterpriseLayout>{content}</EnterpriseLayout>
      )}

      {selectedAtendimento && (
        <AtendimentoModal atendimento={selectedAtendimento} onClose={() => setSelectedAtendimento(null)} />
      )}

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          aside, nav, header { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .max-w-5xl { max-width: 100% !important; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>
    </>
  );
}
