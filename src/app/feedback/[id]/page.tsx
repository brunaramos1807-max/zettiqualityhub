'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ArrowLeft, Download, Star, TrendingUp, Users, MessageSquare, BarChart2,
  CheckCircle, AlertCircle, Eye, X, Maximize2, Minimize2, ChevronDown, ChevronUp,
  Award, Target, Clock, Shield, GitBranch, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { exportFeedbackPDF, type FeedbackPDFData } from '@/lib/utils/pdfExport';

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
  evolucao_tecnica?: string | null;
  evolucao_comportamental?: string | null;
  risco_operacional?: string | null;
  tendencias: Record<string, unknown>;
  conquistas: ConquistaItem[];
  status: string;
  snapshot_json_completo?: Record<string, unknown> | null;
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
  foto_url?: string | null;
}

interface PilarItem { nome: string; pontuacao: number; max: number; variacao?: number; observacao?: string }
interface PontoItem { titulo: string; descricao: string }
interface ConquistaItem { titulo: string; valor: string; periodo?: string; icone?: string }
interface AtendimentoItem {
  id: string; protocolo: string; cliente: string; assunto: string;
  nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string;
  sup?: string; duracao?: string; canal?: string; solucao?: string; sintese?: string;
  comportamento?: string; criterios?: string[]; evidencias?: string; ncs?: string[]; tags?: string[];
}
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem {
  id: string; objetivo: string; acao_desenvolvimento: string; prazo: string;
  progresso: number; status: string; responsavel?: string; ciclo_origem?: string;
  evidencia?: string; ultima_atualizacao?: string;
}
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

const PILAR_COLORS = ['#38BDF8', '#22C55E', '#A78BFA', '#FB923C', '#FBBF24'];

const CLASSIFICACAO_COLORS: Record<string, string> = {
  excelente: '#22C55E',
  bom: '#38BDF8',
  regular: '#EAB308',
  critico: '#EF4444',
};

const PDI_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  nao_iniciado: { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', label: 'Não Iniciado' },
  pendente: { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', label: 'Não Iniciado' },
  em_andamento: { bg: 'rgba(56,189,248,0.15)', text: '#38BDF8', label: 'Em Andamento' },
  parcial: { bg: 'rgba(234,179,8,0.15)', text: '#EAB308', label: 'Parcial' },
  concluido: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', label: 'Concluído' },
  atrasado: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', label: 'Atrasado' },
  cancelado: { bg: 'rgba(239,68,68,0.12)', text: '#F87171', label: 'Cancelado' },
};

function tempoDeEmpresa(dataAdmissao: string | null): string {
  if (!dataAdmissao) return '—';
  const diff = Date.now() - new Date(dataAdmissao).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  if (years > 0) return `${years} ano${years !== 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`;
  return `${months} mês${months !== 1 ? 'es' : ''}`;
}

function CircleProgress({ value, color = '#22C55E', size = 90 }: { value: number; color?: string; size?: number }) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">{value}%</text>
    </svg>
  );
}

function SectionTitle({ icon, title, color = 'rgba(255,255,255,0.4)' }: { icon: React.ReactNode; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span style={{ color }}>{icon}</span>
      <h3 className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{title}</h3>
    </div>
  );
}

function AtendimentoModal({ atendimento, onClose }: { atendimento: AtendimentoItem; onClose: () => void }) {
  const classColor = CLASSIFICACAO_COLORS[atendimento.classificacao] || '#94A3B8';
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '90vh', overflowY: 'auto' }}>
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
            <p className="text-sm font-semibold text-white mt-0.5">{atendimento.cliente}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
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
          {[
            { label: 'Canal', value: atendimento.canal },
            { label: 'Duração', value: atendimento.duracao },
            { label: 'Assunto Completo', value: atendimento.assunto },
            { label: 'Solução', value: atendimento.solucao },
            { label: 'Síntese', value: atendimento.sintese },
            { label: 'Comportamento', value: atendimento.comportamento },
            { label: 'Evidências', value: atendimento.evidencias },
            { label: 'Observação', value: atendimento.observacao },
          ].filter((d) => d.value).map((d) => (
            <div key={d.label} className="p-3 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#8B949E' }}>{d.label}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{d.value}</p>
            </div>
          ))}
          {(atendimento.criterios?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#8B949E' }}>Critérios Avaliados</p>
              <div className="flex flex-wrap gap-2">
                {atendimento.criterios?.map((c, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.15)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {(atendimento.tags?.length || 0) > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#8B949E' }}>Tags</p>
              <div className="flex flex-wrap gap-2">
                {atendimento.tags?.map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>{tag}</span>
                ))}
              </div>
            </div>
          )}
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qa' | 'iepc'>('qa');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoItem | null>(null);
  const [showAllAtendimentos, setShowAllAtendimentos] = useState(false);

  const handleExportPDF = useCallback(() => {
    if (!feedback) return;
    const pdfData: FeedbackPDFData = {
      analista: {
        nome: feedback.analistas?.nome || 'Analista',
        cargo: feedback.analistas?.cargo_operacional || '—',
        equipe: feedback.analistas?.equipe || feedback.equipe || '—',
        coordenador: feedback.analistas?.coordenador || feedback.coordenador || '—',
        tempoEmpresa: tempoDeEmpresa(feedback.analistas?.data_admissao || null),
        fotoUrl: feedback.analistas?.foto_url || undefined,
      },
      ciclo: feedback.ciclo,
      periodoInicio: feedback.periodo_inicio || undefined,
      periodoFim: feedback.periodo_fim || undefined,
      qaScore: feedback.qa_score || undefined,
      iepcScore: feedback.iepc_score || undefined,
      aderenciaScore: feedback.aderencia_score || undefined,
      posicaoSquad: feedback.posicao_squad || undefined,
      totalSquad: feedback.total_squad || undefined,
      ciclosConsecutivos: feedback.ciclos_consecutivos_evolucao,
      resumoCiclo: feedback.resumo_ciclo || undefined,
      evolucaoTecnica: feedback.evolucao_tecnica || undefined,
      evolucaoComportamental: feedback.evolucao_comportamental || undefined,
      riscoOperacional: feedback.risco_operacional || undefined,
      pilares_qa: feedback.pilares_qa || [],
      pilares_iepc: feedback.pilares_iepc || [],
      pontosFortes: feedback.pontos_fortes || [],
      oportunidades: feedback.oportunidades || [],
      coaching: feedback.feedback_coaching?.map((c) => ({
        o_que_foi_dito: c.o_que_foi_dito,
        como_poderia_ser: c.como_poderia_ser,
        dica_de_ouro: c.dica_de_ouro,
      })),
      atendimentos: feedback.feedback_atendimentos?.map((a) => ({
        protocolo: a.protocolo,
        cliente: a.cliente,
        assunto: a.assunto,
        nota_qa: a.nota_qa,
        nota_iepc: a.nota_iepc,
        classificacao: a.classificacao,
        observacao: a.observacao,
      })),
      pdi: feedback.feedback_pdi?.map((p) => ({
        objetivo: p.objetivo,
        acao_desenvolvimento: p.acao_desenvolvimento,
        prazo: p.prazo,
        progresso: p.progresso,
        status: p.status,
      })),
      conquistas: feedback.conquistas || [],
      historico,
    };
    exportFeedbackPDF(pdfData);
  }, [feedback, historico]);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) { setError('ID não fornecido'); setLoading(false); return; }

    (async () => {
      try {
        // Try primary query with all relations
        const { data, error: queryError } = await supabase
          .from('feedbacks')
          .select(`
            *,
            analistas(nome, nome_completo, cargo_operacional, equipe, coordenador, data_admissao, analista_id, foto_url),
            feedback_atendimentos(*),
            feedback_coaching(*),
            feedback_pdi(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (queryError) {
          // Fallback: query without relations
          const { data: fallback } = await supabase
            .from('feedbacks')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (fallback) {
            // Try to get analista separately
            if (fallback.analista_id) {
              const { data: analistaData } = await supabase
                .from('analistas')
                .select('nome, nome_completo, cargo_operacional, equipe, coordenador, data_admissao, analista_id, foto_url')
                .eq('id', fallback.analista_id)
                .maybeSingle();
              (fallback as any).analistas = analistaData;
            }
            setFeedback(fallback as Feedback);
          } else {
            setError('Feedback não encontrado');
          }
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Feedback não encontrado');
          setLoading(false);
          return;
        }

        // Merge snapshot_json_completo fields if direct columns are empty
        const snap = (data as any).snapshot_json_completo as Record<string, unknown> | null;
        if (snap) {
          if (!data.evolucao_tecnica && snap.evolucao_tecnica) (data as any).evolucao_tecnica = snap.evolucao_tecnica;
          if (!data.evolucao_comportamental && snap.evolucao_comportamental) (data as any).evolucao_comportamental = snap.evolucao_comportamental;
          if (!data.risco_operacional && snap.risco_operacional) (data as any).risco_operacional = snap.risco_operacional;
          if ((!data.pilares_qa || (data.pilares_qa as any[]).length === 0) && snap.pilares_qa) (data as any).pilares_qa = snap.pilares_qa;
          if ((!data.pilares_iepc || (data.pilares_iepc as any[]).length === 0) && snap.pilares_iepc) (data as any).pilares_iepc = snap.pilares_iepc;
          if ((!data.pontos_fortes || (data.pontos_fortes as any[]).length === 0) && snap.pontos_fortes) (data as any).pontos_fortes = snap.pontos_fortes;
          if ((!data.oportunidades || (data.oportunidades as any[]).length === 0) && snap.oportunidades) (data as any).oportunidades = snap.oportunidades;
          if (!data.resumo_ciclo && snap.resumo_ciclo) (data as any).resumo_ciclo = snap.resumo_ciclo;
          if ((!data.conquistas || (data.conquistas as any[]).length === 0) && snap.conquistas) (data as any).conquistas = snap.conquistas;
          if (!data.tendencias || Object.keys(data.tendencias as object).length === 0) {
            if (snap.tendencias) (data as any).tendencias = snap.tendencias;
          }
        }

        setFeedback(data as Feedback);

        // Load historico
        if (data.analista_id) {
          // Try feedback_historico first
          const { data: hist } = await supabase
            .from('feedback_historico')
            .select('ciclo, qa_score, iepc_score')
            .eq('analista_id', data.analista_id)
            .order('created_at', { ascending: true })
            .limit(8);

          if (hist && hist.length > 0) {
            setHistorico(hist as HistoricoItem[]);
          } else {
            // Fallback: build historico from all feedbacks of this analista
            const { data: allFeedbacks } = await supabase
              .from('feedbacks')
              .select('ciclo, qa_score, iepc_score, created_at')
              .eq('analista_id', data.analista_id)
              .order('created_at', { ascending: true })
              .limit(8);

            if (allFeedbacks && allFeedbacks.length > 0) {
              setHistorico(allFeedbacks.map((f: any) => ({
                ciclo: f.ciclo,
                qa_score: f.qa_score || 0,
                iepc_score: f.iepc_score || 0,
              })));
            }
          }
        }
      } catch (err) {
        setError('Erro ao carregar feedback');
      }
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-96" style={{ color: 'rgba(255,255,255,0.3)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">Carregando feedback executivo...</p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Aguarde um momento</p>
        </div>
      </div>
    </EnterpriseLayout>
  );

  if (error || !feedback) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Feedback não encontrado</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {error || 'O feedback solicitado não foi encontrado ou ainda não foi gerado.'}
          </p>
          <Link href="/feedback"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1E40AF' }}>
            <ArrowLeft size={14} /> Voltar para Feedbacks
          </Link>
        </div>
      </div>
    </EnterpriseLayout>
  );

  const analista = feedback.analistas;
  const pilares = activeTab === 'qa' ? (feedback.pilares_qa || []) : (feedback.pilares_iepc || []);
  const initials = analista?.nome?.split(' ').slice(0, 2).map((n) => n[0]).join('') || '?';
  const tendencias = feedback.tendencias as Record<string, unknown>;
  const atendimentos = feedback.feedback_atendimentos || [];
  const visibleAtendimentos = showAllAtendimentos ? atendimentos : atendimentos.slice(0, 6);

  const content = (
    <div className={`max-w-5xl mx-auto print:max-w-full ${fullscreen ? 'px-6 py-4' : ''}`}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 print:hidden">
        {!fullscreen ? (
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <ArrowLeft size={14} /> Voltar para Analista
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Sair' : 'Apresentação'}
          </button>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)', boxShadow: '0 4px 12px rgba(30,64,175,0.4)' }}>
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      <div className={`px-6 pb-10 space-y-6 ${fullscreen ? 'text-base' : ''}`}>

        {/* ══ 1. HEADER EXECUTIVO ══ */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0c1e3e 0%, #071428 60%, #050f20 100%)',
            border: '1px solid rgba(56,189,248,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.05) inset',
          }}>
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar + Info */}
              <div className="flex items-start gap-5 flex-1">
                <div className="flex-shrink-0">
                  {analista?.foto_url ? (
                    <img src={analista.foto_url} alt={analista.nome}
                      className="rounded-2xl object-cover"
                      style={{ width: '96px', height: '96px', border: '3px solid rgba(56,189,248,0.35)', boxShadow: '0 0 20px rgba(56,189,248,0.15)' }} />
                  ) : (
                    <div className="rounded-2xl flex items-center justify-center font-bold text-white"
                      style={{ width: '96px', height: '96px', background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)', border: '3px solid rgba(56,189,248,0.25)', fontSize: '2rem', boxShadow: '0 0 20px rgba(56,189,248,0.1)' }}>
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="font-bold text-white" style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}>{analista?.nome || 'Analista'}</h1>
                    {feedback.posicao_squad === 1 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: 'rgba(234,179,8,0.18)', color: '#FCD34D', border: '1px solid rgba(234,179,8,0.35)' }}>
                        <Star size={10} fill="currentColor" /> Destaque do Ciclo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{analista?.cargo_operacional || '—'}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>Equipe: <span className="font-semibold text-white">{analista?.equipe || feedback.equipe || '—'}</span></span>
                    <span>Coordenadora: <span className="font-semibold text-white">{analista?.coordenador || feedback.coordenador || '—'}</span></span>
                  </div>
                  <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Clock size={11} /> Tempo de empresa: <span className="font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{tempoDeEmpresa(analista?.data_admissao || null)}</span>
                  </p>
                </div>
              </div>

              {/* Score cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:w-auto w-full">
                {/* Ciclo */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>CICLO</p>
                  <p className="text-base font-bold text-white">{feedback.ciclo}</p>
                  {feedback.periodo_inicio && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{feedback.periodo_inicio}</p>}
                  {feedback.periodo_fim && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>a {feedback.periodo_fim}</p>}
                  <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#86EFAC', fontSize: '10px' }}>
                    {feedback.status === 'approved' || feedback.status === 'sent' ? 'Concluído' : feedback.status === 'generated' ? 'Gerado' : 'Em Andamento'}
                  </span>
                </div>
                {/* QA */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', boxShadow: '0 0 20px rgba(56,189,248,0.05) inset' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(56,189,248,0.8)', fontSize: '9px' }}>QA</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.5rem' }}>{feedback.qa_score ?? '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>/100</p>
                  {(tendencias?.variacao_qa as number) !== undefined && (tendencias.variacao_qa as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: (tendencias.variacao_qa as number) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {(tendencias.variacao_qa as number) >= 0 ? '↑' : '↓'} {Math.abs(tendencias.variacao_qa as number)} pts
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>em relação ao ciclo anterior</p>
                </div>
                {/* IEPC */}
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 0 20px rgba(34,197,94,0.05) inset' }}>
                  <p className="text-xs font-bold tracking-widest mb-1" style={{ color: 'rgba(34,197,94,0.8)', fontSize: '9px' }}>IEPC</p>
                  <p className="font-bold text-white leading-none" style={{ fontSize: '2.5rem' }}>{feedback.iepc_score ?? '—'}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>%</p>
                  {(tendencias?.variacao_iepc as number) !== undefined && (tendencias.variacao_iepc as number) !== 0 && (
                    <p className="text-xs mt-1 font-semibold" style={{ color: (tendencias.variacao_iepc as number) >= 0 ? '#4ADE80' : '#F87171' }}>
                      {(tendencias.variacao_iepc as number) >= 0 ? '↑' : '↓'} {Math.abs(tendencias.variacao_iepc as number)} pts
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>em relação ao ciclo anterior</p>
                </div>
                {/* Aderência */}
                <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-bold tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px' }}>ADERÊNCIA</p>
                  {feedback.aderencia_score != null
                    ? <CircleProgress value={feedback.aderencia_score} size={80} />
                    : <p className="text-2xl font-bold text-white">—</p>}
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>aos critérios</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 2. RESUMO EXECUTIVO ══ */}
        {feedback.resumo_ciclo && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<BarChart2 size={14} />} title="Resumo do Ciclo" />
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.8' }}>{feedback.resumo_ciclo}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.12)' }}>
                  <TrendingUp size={18} className="mx-auto mb-2 text-sky-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Evolução</p>
                  {tendencias?.variacao_qa !== undefined && <p className="text-sm font-bold text-sky-400">+{tendencias.variacao_qa as number} pts no QA</p>}
                  {tendencias?.variacao_iepc !== undefined && <p className="text-xs text-green-400">+{tendencias.variacao_iepc as number} pts no IEPC</p>}
                </div>
              )}
              {feedback.posicao_squad != null && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}>
                  <Users size={18} className="mx-auto mb-2 text-yellow-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Posição no Squad</p>
                  <p className="text-sm font-bold text-yellow-400">Top {feedback.posicao_squad}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>entre {feedback.total_squad || '?'} analistas</p>
                </div>
              )}
              {(feedback.feedback_atendimentos?.length || 0) > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                  <MessageSquare size={18} className="mx-auto mb-2 text-purple-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Atendimentos</p>
                  <p className="text-sm font-bold text-purple-400">{feedback.feedback_atendimentos?.length} avaliados</p>
                  {feedback.qa_score != null && <p className="text-xs text-purple-300">Média: {feedback.qa_score} pts</p>}
                </div>
              )}
              {feedback.ciclos_consecutivos_evolucao > 0 && (
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <TrendingUp size={18} className="mx-auto mb-2 text-green-400" />
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Tendência</p>
                  <p className="text-sm font-bold text-green-400">Em evolução</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{feedback.ciclos_consecutivos_evolucao} ciclos consecutivos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ 3. PERFORMANCE POR PILAR + EVOLUÇÃO HISTÓRICA ══ */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Pilares */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between mb-5">
              <SectionTitle icon={<Target size={14} />} title="Performance por Pilar" />
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {(['qa', 'iepc'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className="px-3 py-1.5 text-xs font-semibold transition-colors"
                    style={{ backgroundColor: activeTab === tab ? 'rgba(56,189,248,0.18)' : 'transparent', color: activeTab === tab ? '#38BDF8' : 'rgba(255,255,255,0.4)' }}>
                    {tab === 'qa' ? 'QA - Qualidade' : 'IEPC - Experiência'}
                  </button>
                ))}
              </div>
            </div>
            {pilares.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>Nenhum pilar registrado</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                  <span>Pilar</span>
                  <div className="flex gap-6">
                    <span>Pontuação</span>
                    <span>Evolução</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {pilares.map((p, i) => {
                    const pct = p.max > 0 ? (p.pontuacao / p.max) * 100 : 0;
                    const color = PILAR_COLORS[i % PILAR_COLORS.length];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: `${color}20`, color }}>
                              {i + 1}
                            </div>
                            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{p.nome}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">{p.pontuacao}/{p.max}</span>
                            {p.variacao !== undefined && (
                              <span className={`font-semibold ${p.variacao >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {p.variacao >= 0 ? '↑' : '↓'} {Math.abs(p.variacao)} pts
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
                        </div>
                        {p.observacao && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.observacao}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Evolução Histórica */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<TrendingUp size={14} />} title="Evolução Histórica" />
            {historico.length > 1 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={historico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="ciclo" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis domain={[50, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f1f3d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: 'white' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="qa_score" stroke="#38BDF8" strokeWidth={2.5} dot={{ fill: '#38BDF8', r: 4 }} name="QA" />
                    <Line type="monotone" dataKey="iepc_score" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} name="IEPC" />
                  </LineChart>
                </ResponsiveContainer>
                {(tendencias?.variacao_qa !== undefined || tendencias?.variacao_iepc !== undefined) && (
                  <p className="text-xs text-center mt-2 font-medium" style={{ color: 'rgba(34,197,94,0.7)' }}>
                    {tendencias?.variacao_qa !== undefined && `Você evoluiu +${tendencias.variacao_qa} pts no QA`}
                    {tendencias?.variacao_qa !== undefined && tendencias?.variacao_iepc !== undefined && ' e '}
                    {tendencias?.variacao_iepc !== undefined && `+${tendencias.variacao_iepc} pts no IEPC`}
                    {' nos últimos ciclos.'}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                <TrendingUp size={28} style={{ opacity: 0.3 }} />
                <p className="text-sm">Histórico insuficiente para gráfico</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>Dados de múltiplos ciclos necessários</p>
              </div>
            )}
          </div>
        </div>

        {/* ══ 4. PONTOS FORTES + OPORTUNIDADES ══ */}
        {((feedback.pontos_fortes?.length || 0) > 0 || (feedback.oportunidades?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-5">
            {(feedback.pontos_fortes?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', boxShadow: '0 2px 12px rgba(34,197,94,0.05)' }}>
                <SectionTitle icon={<Award size={14} />} title="Pontos Fortes" color="rgba(34,197,94,0.8)" />
                <div className="space-y-4">
                  {(feedback.pontos_fortes || []).slice(0, 5).map((p, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                        <CheckCircle size={14} className="text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>{p.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(feedback.oportunidades?.length || 0) > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.15)', boxShadow: '0 2px 12px rgba(251,146,60,0.05)' }}>
                <SectionTitle icon={<Target size={14} />} title="Oportunidades de Evolução" color="rgba(251,146,60,0.8)" />
                <div className="space-y-4">
                  {(feedback.oportunidades || []).slice(0, 5).map((o, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(251,146,60,0.15)' }}>
                        <AlertCircle size={14} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{o.titulo}</p>
                        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>{o.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ 5. EVOLUÇÃO TÉCNICA ══ */}
        {feedback.evolucao_tecnica && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', boxShadow: '0 2px 12px rgba(56,189,248,0.04)' }}>
            <SectionTitle icon={<Zap size={14} />} title="Evolução Técnica" color="rgba(56,189,248,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_tecnica}</p>
          </div>
        )}

        {/* ══ 6. EVOLUÇÃO COMPORTAMENTAL ══ */}
        {feedback.evolucao_comportamental && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)', boxShadow: '0 2px 12px rgba(167,139,250,0.04)' }}>
            <SectionTitle icon={<Users size={14} />} title="Evolução Comportamental" color="rgba(167,139,250,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.evolucao_comportamental}</p>
          </div>
        )}

        {/* ══ 7. RISCO OPERACIONAL ══ */}
        {feedback.risco_operacional && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.14)', boxShadow: '0 2px 12px rgba(239,68,68,0.04)' }}>
            <SectionTitle icon={<Shield size={14} />} title="Risco Operacional" color="rgba(239,68,68,0.8)" />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.85', whiteSpace: 'pre-wrap' }}>{feedback.risco_operacional}</p>
          </div>
        )}

        {/* ══ 8. COACHING DE COMUNICAÇÃO ══ */}
        {(feedback.feedback_coaching?.length || 0) > 0 && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<MessageSquare size={14} />} title="Coaching de Comunicação" />
            <div className="space-y-5">
              {(feedback.feedback_coaching || []).map((c, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: '#38BDF8' }}>O Que Foi Dito</p>
                    <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.7' }}>&ldquo;{c.o_que_foi_dito}&rdquo;</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.25)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: '#EAB308' }}>Como Poderia Ser</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)', lineHeight: '1.7' }}>{c.como_poderia_ser}</p>
                  </div>
                  <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-1" style={{ color: '#38BDF8' }}>
                      <Star size={11} fill="currentColor" /> Dica de Ouro
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)', lineHeight: '1.7' }}>{c.dica_de_ouro}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 9. ATENDIMENTOS AVALIADOS ══ */}
        {atendimentos.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between p-5 pb-3">
              <SectionTitle icon={<Eye size={14} />} title={`Atendimentos Avaliados (${atendimentos.length})`} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Clique para ver detalhes completos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '700px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {['Protocolo', 'Cliente', 'Assunto', 'Nota QA', 'IEPC', 'Classificação', ''].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
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
                        <td className="py-3 px-4 font-mono text-xs font-bold whitespace-nowrap" style={{ color: '#38BDF8' }}>{a.protocolo || '—'}</td>
                        <td className="py-3 px-4 font-medium text-white text-sm whitespace-nowrap">{a.cliente}</td>
                        <td className="py-3 px-4 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {a.assunto}
                        </td>
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{a.nota_qa ?? '—'}</td>
                        <td className="py-3 px-4 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{a.nota_iepc != null ? `${a.nota_iepc}%` : '—'}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {a.classificacao && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: `${classColor}18`, color: classColor, border: `1px solid ${classColor}30` }}>
                              {a.classificacao.charAt(0).toUpperCase() + a.classificacao.slice(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Eye size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {atendimentos.length > 6 && (
              <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button onClick={() => setShowAllAtendimentos((v) => !v)}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 w-full justify-center transition-colors">
                  {showAllAtendimentos ? <><ChevronUp size={13} /> Mostrar menos</> : <><ChevronDown size={13} /> Ver todos os {atendimentos.length} atendimentos</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ 10. PDI ══ */}
        {(feedback.feedback_pdi?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between mb-5">
              <SectionTitle icon={<GitBranch size={14} />} title="Plano de Desenvolvimento (PDI)" />
              <Link href="/feedback/pdi" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Acompanhar PDI completo →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    {['Objetivo', 'Ação de Desenvolvimento', 'Prazo', 'Progresso', 'Status'].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(feedback.feedback_pdi || []).map((p) => {
                    const st = PDI_STATUS_COLORS[p.status] || PDI_STATUS_COLORS.pendente;
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-3 px-3 font-semibold text-white text-sm">{p.objetivo}</td>
                        <td className="py-3 px-3 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{p.acao_desenvolvimento}</td>
                        <td className="py-3 px-3 text-xs whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.45)' }}>{p.prazo}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${p.progresso}%`, backgroundColor: '#38BDF8', boxShadow: '0 0 6px rgba(56,189,248,0.4)' }} />
                            </div>
                            <span className="text-xs font-bold text-sky-400 w-8 text-right">{p.progresso}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ backgroundColor: st.bg, color: st.text }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ 11. CONQUISTAS E EVOLUÇÃO ══ */}
        {(feedback.conquistas?.length || 0) > 0 && (
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            <SectionTitle icon={<Award size={14} />} title="Conquistas e Evolução" />
            <div className="grid md:grid-cols-2 gap-3">
              {(feedback.conquistas || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{c.titulo}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-green-400">{c.valor}</span>
                    {c.periodo && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.periodo}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 12. FECHAMENTO ══ */}
        <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, rgba(30,64,175,0.18), rgba(7,20,40,0.85))', border: '1px solid rgba(56,189,248,0.15)', boxShadow: '0 4px 20px rgba(30,64,175,0.1)' }}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-orange-400">Desenvolvimento e evolução contínua.</p>
              <p className="text-sm font-semibold text-sky-400">Você está no caminho certo!</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Documento confidencial • Uso interno</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>QualiVisão People Analytics © 2026</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Ciclo: {feedback.ciclo} • Versão 1.0</p>
              <p className="text-sm font-extrabold mt-1 tracking-widest" style={{ color: 'rgba(56,189,248,0.7)' }}>QualiVisão</p>
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
          @page { margin: 12mm; size: A4; }
          .space-y-6 > * + * { page-break-inside: avoid; }
        }
      `}</style>
    </>
  );
}