'use client';
import React, { useState, useEffect, useRef } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Star, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Feedback {
  id: string;
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
  cargo: string | null;
  equipe: string | null;
  coordenador: string | null;
  data_admissao: string | null;
  analista_id: string | null;
}

interface PilarItem { nome: string; pontuacao: number; max: number; variacao?: number; observacao?: string }
interface PontoItem { titulo: string; descricao: string }
interface ConquistaItem { titulo: string; valor: string; icone?: string }
interface AtendimentoItem { id: string; protocolo: string; cliente: string; assunto: string; nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string }
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem { id: string; objetivo: string; acao_desenvolvimento: string; prazo: string; progresso: number; status: string }
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: 'bg-green-500/20 text-green-300',
  bom: 'bg-blue-500/20 text-blue-300',
  regular: 'bg-yellow-500/20 text-yellow-300',
  critico: 'bg-red-500/20 text-red-300',
};

const PDI_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-gray-500/20 text-gray-300',
  em_andamento: 'bg-blue-500/20 text-blue-300',
  concluido: 'bg-green-500/20 text-green-300',
  cancelado: 'bg-red-500/20 text-red-300',
};

function tempoDeEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const diff = Date.now() - new Date(dataAdmissao).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  if (years > 0) return `${years}a ${months}m`;
  return `${months} meses`;
}

export default function FeedbackViewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'qa' | 'iepc'>('qa');
  const [expandedAtendimento, setExpandedAtendimento] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;

    (async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select(`
          *,
          analistas(nome, nome_completo, cargo, equipe, coordenador, data_admissao, analista_id),
          feedback_atendimentos(*),
          feedback_coaching(*),
          feedback_pdi(*)
        `)
        .eq('id', id)
        .single();

      if (data) {
        setFeedback(data as Feedback);

        // Fetch historico
        if (data.analistas?.id || data.analista_id) {
          const analistaId = data.analista_id;
          const { data: hist } = await supabase
            .from('feedback_historico')
            .select('ciclo, qa_score, iepc_score')
            .eq('analista_id', analistaId)
            .order('created_at', { ascending: true })
            .limit(6);
          if (hist) setHistorico(hist as HistoricoItem[]);
        }
      }
      setLoading(false);
    })();
  }, [params?.id]);

  const handlePrint = () => window.print();

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

  return (
    <EnterpriseLayout>
      <div ref={printRef} className="p-6 max-w-5xl mx-auto space-y-6 print:p-4">
        {/* Nav */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={14} /> Voltar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
          >
            <Download size={14} /> Baixar PDF
          </button>
        </div>

        {/* ── HEADER ANALISTA ── */}
        <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #0a1628 100%)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
              {analista?.nome?.split(' ').slice(0, 2).map((n) => n[0]).join('') || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{analista?.nome || 'Analista'}</h2>
                {feedback.posicao_squad === 1 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.3)' }}>
                    <Star size={10} fill="currentColor" /> Destaque do Ciclo
                  </span>
                )}
              </div>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{analista?.cargo || '—'}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span>Equipe: <span className="text-white">{analista?.equipe || feedback.equipe || '—'}</span></span>
                <span>Coord: <span className="text-white">{analista?.coordenador || feedback.coordenador || '—'}</span></span>
                <span>Empresa: <span className="text-white">{tempoDeEmpresa(analista?.data_admissao || null)}</span></span>
                {analista?.analista_id && <span className="font-mono text-xs" style={{ color: 'rgba(56,189,248,0.6)' }}>{analista.analista_id}</span>}
              </div>
            </div>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>CICLO</p>
              <p className="text-lg font-bold text-white">{feedback.ciclo}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {feedback.periodo_inicio && feedback.periodo_fim
                  ? `${feedback.periodo_inicio} → ${feedback.periodo_fim}`
                  : 'Período não definido'}
              </p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86EFAC' }}>Concluído</span>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: 'rgba(56,189,248,0.6)' }}>QA</p>
              <p className="text-3xl font-bold text-white">{feedback.qa_score ?? '—'}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.6)' }}>IEPC</p>
              <p className="text-3xl font-bold text-white">{feedback.iepc_score ?? '—'}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>%</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <p className="text-xs font-semibold tracking-widest mb-1" style={{ color: 'rgba(168,85,247,0.6)' }}>ADERÊNCIA</p>
              <p className="text-3xl font-bold text-white">{feedback.aderencia_score ?? '—'}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>%</p>
            </div>
          </div>
        </div>

        {/* ── RESUMO ── */}
        {feedback.resumo_ciclo && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>RESUMO DO CICLO</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{feedback.resumo_ciclo}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {feedback.posicao_squad && (
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Posição no Squad</p>
                  <p className="text-xl font-bold text-sky-400">#{feedback.posicao_squad}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>de {feedback.total_squad || '?'}</p>
                </div>
              )}
              {feedback.ciclos_consecutivos_evolucao > 0 && (
                <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Ciclos em Evolução</p>
                  <p className="text-xl font-bold text-green-400">{feedback.ciclos_consecutivos_evolucao}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>consecutivos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PILARES ── */}
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PERFORMANCE POR PILAR</h3>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['qa', 'iepc'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === tab ? 'rgba(56,189,248,0.15)' : 'transparent',
                    color: activeTab === tab ? '#38BDF8' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {tab === 'qa' ? 'QA - Qualidade' : 'IEPC - Experiência'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {pilares.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Nenhum pilar registrado</p>
            ) : pilares.map((p, i) => {
              const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-36 text-sm truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{p.nome}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: activeTab === 'qa' ? '#38BDF8' : '#22C55E' }} />
                  </div>
                  <div className="text-sm font-medium text-white w-16 text-right">{p.pontuacao}/{p.max}</div>
                  {p.variacao !== undefined && (
                    <div className={`text-xs w-12 text-right ${p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.variacao >= 0 ? '↑' : '↓'} {Math.abs(p.variacao)}pts
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── EVOLUÇÃO HISTÓRICA ── */}
        {historico.length > 1 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>EVOLUÇÃO HISTÓRICA</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historico}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="qa_score" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 4 }} name="QA" />
                <Line type="monotone" dataKey="iepc_score" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 4 }} name="IEPC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── PONTOS FORTES / OPORTUNIDADES ── */}
        {((feedback.pontos_fortes?.length || 0) > 0 || (feedback.oportunidades?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <h3 className="text-sm font-semibold tracking-widest mb-3" style={{ color: 'rgba(34,197,94,0.7)' }}>✅ PONTOS FORTES</h3>
              <div className="space-y-3">
                {(feedback.pontos_fortes || []).map((p, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-white">{p.titulo}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.12)' }}>
              <h3 className="text-sm font-semibold tracking-widest mb-3" style={{ color: 'rgba(251,146,60,0.7)' }}>⚠️ OPORTUNIDADES DE EVOLUÇÃO</h3>
              <div className="space-y-3">
                {(feedback.oportunidades || []).map((o, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium text-white">{o.titulo}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{o.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── COACHING ── */}
        {(feedback.feedback_coaching?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>COACHING DE COMUNICAÇÃO</h3>
            <div className="space-y-4">
              {(feedback.feedback_coaching || []).map((c, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>O QUE FOI DITO</p>
                    <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.6)' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(234,179,8,0.6)' }}>COMO PODERIA SER</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{c.como_poderia_ser}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(56,189,248,0.6)' }}>💡 DICA DE OURO</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.dica_de_ouro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATENDIMENTOS (cards expansíveis) ── */}
        {(feedback.feedback_atendimentos?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>ATENDIMENTOS AVALIADOS</h3>
            <div className="space-y-2">
              {(feedback.feedback_atendimentos || []).map((a) => (
                <div key={a.id} className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setExpandedAtendimento(expandedAtendimento === a.id ? null : a.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-sky-400">{a.protocolo || '—'}</span>
                      <span className="text-sm text-white">{a.cliente}</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.assunto}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">QA {a.nota_qa ?? '—'}</span>
                      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>IEPC {a.nota_iepc ?? '—'}</span>
                      {a.classificacao && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLASSIFICACAO_COLORS[a.classificacao] || 'bg-gray-500/20 text-gray-300'}`}>
                          {a.classificacao.charAt(0).toUpperCase() + a.classificacao.slice(1)}
                        </span>
                      )}
                      {expandedAtendimento === a.id ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </div>
                  </button>
                  {expandedAtendimento === a.id && a.observacao && (
                    <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{a.observacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PDI ── */}
        {(feedback.feedback_pdi?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PLANO DE DESENVOLVIMENTO (PDI)</h3>
              <Link href="/feedback/pdi" className="text-xs text-sky-400 flex items-center gap-1 hover:text-sky-300">
                Acompanhar PDI <ExternalLink size={10} />
              </Link>
            </div>
            <div className="space-y-3">
              {(feedback.feedback_pdi || []).map((p) => (
                <div key={p.id} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{p.objetivo}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.acao_desenvolvimento}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.prazo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.prazo}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PDI_STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-300'}`}>
                        {p.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>Progresso</span><span>{p.progresso}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${p.progresso}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONQUISTAS ── */}
        {(feedback.conquistas?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.12)' }}>
            <h3 className="text-sm font-semibold tracking-widest mb-4" style={{ color: 'rgba(234,179,8,0.6)' }}>🏆 CONQUISTAS E EVOLUÇÃO</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(feedback.conquistas || []).map((c, i) => (
                <div key={i} className="text-center p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.titulo}</p>
                  <p className="text-lg font-bold text-yellow-400">{c.valor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RODAPÉ ── */}
        <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs font-medium text-white mb-1">Continue evoluindo — cada ciclo é uma nova oportunidade de crescimento.</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Documento confidencial • Uso interno • Gerado em {new Date().toLocaleDateString('pt-BR')} • Ciclo {feedback.ciclo} • QualiVisão Enterprise
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          aside, nav { display: none !important; }
        }
      `}</style>
    </EnterpriseLayout>
  );
}
