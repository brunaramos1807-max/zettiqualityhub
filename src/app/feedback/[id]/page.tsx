'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Download, Star, TrendingUp, Users, MessageSquare, BarChart2, CheckCircle, AlertCircle, Eye } from 'lucide-react';
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
interface AtendimentoItem { id: string; protocolo: string; cliente: string; assunto: string; nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string }
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem { id: string; objetivo: string; acao_desenvolvimento: string; prazo: string; progresso: number; status: string }
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

const PILAR_COLORS = ['#38BDF8', '#22C55E', '#A78BFA', '#FB923C', '#FBBF24'];

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: 'text-green-400',
  bom: 'text-blue-400',
  regular: 'text-yellow-400',
  critico: 'text-red-400',
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

function CircleProgress({ value }: { value: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx="45" cy="45" r={r} fill="none" stroke="#22C55E" strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 45 45)" />
      <text x="45" y="50" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{value}%</text>
    </svg>
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

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <EnterpriseLayout>
      <div className="max-w-5xl mx-auto print:max-w-full">
        {/* Top nav */}
        <div className="flex items-center justify-between px-6 py-4 print:hidden">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <ArrowLeft size={14} /> Voltar para Analista
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors">
            <Download size={14} /> Baixar PDF
          </button>
        </div>

        <div className="px-6 pb-8 space-y-5">
          {/* ── HEADER ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1e3e 0%, #071428 100%)', border: '1px solid rgba(56,189,248,0.15)' }}>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                {/* Avatar + info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)' }}>
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-bold text-white">{analista?.nome || 'Analista'}</h1>
                      {feedback.posicao_squad === 1 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(234,179,8,0.15)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.3)' }}>
                          <Star size={10} fill="currentColor" /> Destaque do Ciclo
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{analista?.cargo_operacional || '—'}</p>
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
                  {/* Ciclo */}
                  <div className="rounded-xl p-4 min-w-[110px]" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>CICLO</p>
                    <p className="text-base font-bold text-white">{feedback.ciclo}</p>
                    {feedback.periodo_inicio && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{feedback.periodo_inicio}</p>}
                    {feedback.periodo_fim && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>a {feedback.periodo_fim}</p>}
                    <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86EFAC' }}>Concluído</span>
                  </div>
                  {/* QA */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(56,189,248,0.7)' }}>QA</p>
                    <p className="text-4xl font-bold text-white leading-none">{feedback.qa_score ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>/100</p>
                    {(tendencias?.variacao_qa as number) !== undefined && (
                      <p className="text-xs mt-1 text-green-400">↑ {tendencias.variacao_qa as number} pts<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>em relação ao ciclo anterior</span></p>
                    )}
                  </div>
                  {/* IEPC */}
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.7)' }}>IEPC</p>
                    <p className="text-4xl font-bold text-white leading-none">{feedback.iepc_score ?? '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>%</p>
                    {(tendencias?.variacao_iepc as number) !== undefined && (
                      <p className="text-xs mt-1 text-green-400">↑ {tendencias.variacao_iepc as number} pts<br /><span style={{ color: 'rgba(255,255,255,0.3)' }}>em relação ao ciclo anterior</span></p>
                    )}
                  </div>
                  {/* Aderência */}
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
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <BarChart2 size={14} /> RESUMO DO CICLO
              </h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{feedback.resumo_ciclo}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                    {feedback.qa_score != null && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Média: {feedback.qa_score} pts</p>}
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
            </div>
          )}

          {/* ── PERFORMANCE POR PILAR + EVOLUÇÃO HISTÓRICA ── */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Pilares */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PERFORMANCE POR PILAR</h3>
                <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['qa', 'iepc'] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1 text-xs font-medium transition-colors"
                      style={{ backgroundColor: activeTab === tab ? 'rgba(56,189,248,0.15)' : 'transparent', color: activeTab === tab ? '#38BDF8' : 'rgba(255,255,255,0.4)' }}>
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
                  const color = PILAR_COLORS[i % PILAR_COLORS.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{i + 1}. {p.nome}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{p.pontuacao}/{p.max}</span>
                          {p.variacao !== undefined && (
                            <span className={`${p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {p.variacao >= 0 ? '↑' : '↓'} {Math.abs(p.variacao)} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {pilares.length > 0 && (
                <button className="mt-3 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">Ver detalhamento dos critérios →</button>
              )}
            </div>

            {/* Evolução histórica */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>EVOLUÇÃO HISTÓRICA</h3>
              {historico.length > 1 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={historico}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                      <YAxis domain={[50, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="qa_score" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} name="QA" label={{ fill: '#38BDF8', fontSize: 10 }} />
                      <Line type="monotone" dataKey="iepc_score" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} name="IEPC" />
                    </LineChart>
                  </ResponsiveContainer>
                  {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                    <p className="text-xs text-center mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Você evoluiu {tendencias?.variacao_qa !== undefined ? `+${tendencias.variacao_qa} pts no QA` : ''}{tendencias?.variacao_iepc !== undefined ? ` e +${tendencias.variacao_iepc} pts no IEPC` : ''} nos últimos {historico.length} ciclos.
                    </p>
                  )}
                </>
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
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-xs font-bold tracking-widest mb-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    🏆 PONTOS FORTES
                  </h3>
                  <div className="space-y-3">
                    {(feedback.pontos_fortes || []).map((p, i) => (
                      <div key={i} className="flex gap-3">
                        <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-white">{p.titulo}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.descricao}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(feedback.oportunidades?.length || 0) > 0 && (
                <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="text-xs font-bold tracking-widest mb-4 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    🎯 OPORTUNIDADES DE EVOLUÇÃO
                  </h3>
                  <div className="space-y-3">
                    {(feedback.oportunidades || []).map((o, i) => (
                      <div key={i} className="flex gap-3">
                        <AlertCircle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-white">{o.titulo}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{o.descricao}</p>
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
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>💬 COACHING DE COMUNICAÇÃO</h3>
              <div className="space-y-5">
                {(feedback.feedback_coaching || []).map((c, i) => (
                  <div key={i} className="grid md:grid-cols-3 gap-3">
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'rgba(56,189,248,0.7)' }}>O QUE FOI DITO</p>
                      <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.6)' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'rgba(234,179,8,0.8)' }}>COMO PODERIA SER</p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.como_poderia_ser}</p>
                    </div>
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                      <p className="text-xs font-bold mb-2" style={{ color: 'rgba(56,189,248,0.7)' }}>⭐ DICA DE OURO</p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{c.dica_de_ouro}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ATENDIMENTOS ── */}
          {(feedback.feedback_atendimentos?.length || 0) > 0 && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>📋 ATENDIMENTOS AVALIADOS</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Protocolo', 'Cliente', 'Assunto', 'Nota QA', 'IEPC', 'Classificação', 'Ações'].map((h) => (
                        <th key={h} className="text-left pb-2 pr-4 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(feedback.feedback_atendimentos || []).slice(0, 6).map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2 pr-4 font-mono text-xs text-sky-400">{a.protocolo || '—'}</td>
                        <td className="py-2 pr-4 text-white">{a.cliente}</td>
                        <td className="py-2 pr-4 max-w-[200px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>{a.assunto}</td>
                        <td className="py-2 pr-4 font-semibold text-white">{a.nota_qa ?? '—'}</td>
                        <td className="py-2 pr-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{a.nota_iepc != null ? `${a.nota_iepc}%` : '—'}</td>
                        <td className="py-2 pr-4">
                          {a.classificacao && (
                            <span className={`font-semibold ${CLASSIFICACAO_COLORS[a.classificacao] || 'text-gray-400'}`}>
                              {a.classificacao.charAt(0).toUpperCase() + a.classificacao.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-2">
                          <button style={{ color: 'rgba(255,255,255,0.3)' }} className="hover:text-white transition-colors"><Eye size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(feedback.feedback_atendimentos?.length || 0) > 6 && (
                <button className="mt-3 text-xs text-sky-400 hover:text-sky-300 w-full text-center">Ver todos os atendimentos</button>
              )}
            </div>
          )}

          {/* ── PDI + CONQUISTAS ── */}
          <div className="grid md:grid-cols-2 gap-5">
            {(feedback.feedback_pdi?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>📈 PLANO DE DESENVOLVIMENTO (PDI)</h3>
                </div>
                <div className="space-y-3">
                  {(feedback.feedback_pdi || []).map((p) => (
                    <div key={p.id} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">{p.objetivo}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{p.acao_desenvolvimento}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {p.prazo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.prazo}</span>}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PDI_STATUS_COLORS[p.status] || 'bg-gray-500/20 text-gray-300'}`}>
                            {p.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${p.progresso}%` }} />
                        </div>
                        <span className="text-xs font-medium text-sky-400">{p.progresso}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/feedback/pdi" className="mt-3 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">Acompanhar meu PDI →</Link>
              </div>
            )}

            {(feedback.conquistas?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>🏅 CONQUISTAS E EVOLUÇÃO</h3>
                <div className="space-y-2">
                  {(feedback.conquistas || []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{c.titulo}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-400">{c.valor}</span>
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
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Feedback gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>Ciclo: {feedback.ciclo} • Versão 1.0</p>
                <p className="text-xs font-bold mt-1" style={{ color: 'rgba(56,189,248,0.7)' }}>QualiVisão</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </EnterpriseLayout>
  );
}
