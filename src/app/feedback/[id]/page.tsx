'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import {  } from 'recharts';
import { Eye, ChevronDown, ChevronUp, Grid } from 'lucide-react';

import { type FeedbackPDFData } from '@/lib/utils/pdfExport';


// ─── Interfaces ───────────────────────────────────────────────────────────────
interface CriterioData { max?: number; pts: number; class?: string; evidencia?: string; }
interface EvidenciaData { sup?: string; nota?: number; canal?: string; assunto?: string; cliente?: string; duracao?: string; sintese?: string; criterios?: Record<string, unknown>; ncs?: string[]; tags?: string[]; solucao?: string; comportamento?: string; observacao?: string; nota_iepc?: number; classificacao?: string; }
interface Feedback { id: string; analista_id: string; ciclo: string; periodo_inicio: string | null; periodo_fim: string | null; coordenador: string | null; equipe: string | null; qa_score: number | null; iepc_score: number | null; aderencia_score: number | null; posicao_squad: number | null; total_squad: number | null; ciclos_consecutivos_evolucao: number; pilares_qa: PilarItem[]; pilares_iepc: PilarItem[]; pontos_fortes: PontoItem[]; oportunidades: PontoItem[]; resumo_ciclo: string | null; evolucao_tecnica?: string | null; evolucao_comportamental?: string | null; risco_operacional?: string | null; tendencias: Record<string, unknown>; conquistas: ConquistaItem[]; status: string; snapshot_json_completo?: Record<string, unknown> | null; analistas?: AnalistaInfo | null; feedback_atendimentos?: AtendimentoItem[]; feedback_coaching?: CoachingItem[]; feedback_pdi?: PdiItem[]; nota_final_qa?: number | null; iepc_total?: number | null; total_ncs?: number | null; pontos_deduzidos_nc?: number | null; criterios?: Record<string, CriterioData> | null; evidencias?: EvidenciaData[] | null; sintese_ia?: string | null; reincidencia?: string | null; analista?: string | null; squad?: string | null; auditor?: string | null; periodo?: string | null; }
interface AnalistaInfo { nome: string; nome_completo: string | null; cargo_operacional: string | null; equipe: string | null; coordenador: string | null; data_admissao: string | null; analista_id: string | null; foto_url?: string | null; }
interface PilarItem { nome: string; pontuacao: number; max: number; variacao?: number; observacao?: string }
interface PontoItem { titulo: string; descricao: string }
interface ConquistaItem { titulo: string; valor: string; periodo?: string; icone?: string }
interface AtendimentoItem { id: string; protocolo: string; cliente: string; assunto: string; nota_qa: number; nota_iepc: number; classificacao: string; observacao?: string; sup?: string; duracao?: string; canal?: string; solucao?: string; sintese?: string; comportamento?: string; criterios?: string[]; evidencias?: string; ncs?: string[]; tags?: string[]; aderencia?: number; criterios_raw?: Record<string, unknown>; }
interface CoachingItem { id: string; o_que_foi_dito: string; como_poderia_ser: string; dica_de_ouro: string }
interface PdiItem { id: string; objetivo: string; acao_desenvolvimento: string; prazo: string; progresso: number; status: string; responsavel?: string; ciclo_origem?: string; evidencia?: string; ultima_atualizacao?: string; }
interface HistoricoItem { ciclo: string; qa_score: number; iepc_score: number }

const C = { bg: '#0B1426', surface: '#0F1B31', border: '#1E2D4A', borderAccent: '#38BDF8', text: '#F8FAFC', textMuted: '#94A3B8', textFaint: '#64748B', blue: '#38BDF8', blueLight: 'rgba(56,189,248,0.1)', blueBorder: 'rgba(56,189,248,0.2)', teal: '#2DD4BF', tealLight: 'rgba(45,212,191,0.1)', green: '#22C55E', greenLight: 'rgba(34,197,94,0.1)', greenBorder: 'rgba(34,197,94,0.2)', amber: '#F59E0B', amberLight: 'rgba(245,158,11,0.1)', amberBorder: 'rgba(245,158,11,0.2)', red: '#EF4444', redLight: 'rgba(239,68,68,0.1)', redBorder: 'rgba(239,68,68,0.2)', purple: '#A78BFA', purpleLight: 'rgba(167,139,250,0.1)' };
const PILAR_COLORS_QA = [C.blue, C.teal, C.purple, C.amber, C.green];
const CLASSIFICACAO_COLORS: Record<string, string> = { excelente: C.green, bom: C.blue, regular: C.amber, critico: C.red };

function tempoDeEmpresa(dataAdmissao: string | null): string { if (!dataAdmissao) return '—'; const diff = Date.now() - new Date(dataAdmissao).getTime(); const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365)); const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)); if (years > 0) return `${years} ano${years !== 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`; return `${months} mês${months !== 1 ? 'es' : ''}`; }
function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color?: string }) { return <div className="flex items-center gap-2 mb-5"><span style={{ color: color || C.textMuted }}>{icon}</span><h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: color || C.textMuted }}>{title}</h3></div>; }
function CircleProgress({ value, color = C.green, size = 90 }: { value: number; color?: string; size?: number }) { const r = size * 0.4; const circ = 2 * Math.PI * r; const offset = circ - (value / 100) * circ; return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E2D4A" strokeWidth="7" /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} /><text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">{value}%</text></svg>; }
const CRITERIO_LABELS: Record<string, { label: string; group: 'qa' | 'iepc'; pilar?: string }> = { qa_atendimento_identificacao: { label: 'Identificação', group: 'qa', pilar: 'Atendimento' }, qa_solucao_resolucao: { label: 'Resolução', group: 'qa', pilar: 'Solução' }, iepc_resolucao_percebida: { label: 'Resolução Percebida', group: 'iepc', pilar: 'IEPC' } };
function getStatusFromEvidence(ev: string | undefined, pts: number, max: number): 'aderido' | 'parcial' | 'nao_aderido' { if (!ev) return pts/max >= 0.85 ? 'aderido' : pts/max >= 0.5 ? 'parcial' : 'nao_aderido'; const e = ev.toLowerCase(); if (e.includes('aderido')) return 'aderido'; if (e.includes('parcial')) return 'parcial'; return 'nao_aderido'; }
function StatusBadge({ status }: { status: 'aderido' | 'parcial' | 'nao_aderido' }) { const map = { aderido: { label: '🟢 Aderido', class: 'bg-[#052E16] text-[#22C55E] border-[#14532D]' }, parcial: { label: '🟡 Parcial', class: 'bg-[#422006] text-[#F59E0B] border-[#78350F]' }, nao_aderido: { label: '🔴 Não Aderido', class: 'bg-[#450A0A] text-[#EF4444] border-[#7F1D1D]' } }; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status].class}`}>{map[status].label}</span>; }

function NineBoxMatrix({ qaScore, iepcScore }: { qaScore: number; iepcScore: number }) { return <div className="rounded-xl p-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}><SectionTitle icon={<Grid size={14} />} title="Matriz 9Box" color={C.purple} /><div className="text-sm text-white">Matriz individual: QA {qaScore} / IEPC {iepcScore}%</div></div>; }

function AtendimentoAccordion({ atendimento, index, globalCriterios }: { atendimento: AtendimentoItem; index: number; globalCriterios?: Record<string, CriterioData> }) {
  const [open, setOpen] = useState(false);
  const rawCriterios = (atendimento.criterios_raw as Record<string, CriterioData>) || globalCriterios || {};
  const criterioEntries = Object.entries(rawCriterios).map(([key, val]) => {
    const v = val as CriterioData;
    const status = getStatusFromEvidence(v.evidencia, v.pts, v.max || 20);
    return { key, label: CRITERIO_LABELS[key]?.label || key, group: 'qa', pilar: 'Pilar Operacional', pts: v.pts, max: v.max || 20, statusTexto: status === 'aderido' ? 'Aderido' : status === 'parcial' ? 'Parcial' : 'Não', statusClass: status === 'aderido' ? 'bg-[#052E16] text-[#22C55E] border-[#14532D]' : status === 'parcial' ? 'bg-[#422006] text-[#F59E0B] border-[#78350F]' : 'bg-[#450A0A] text-[#EF4444] border-[#7F1D1D]' };
  });
  const pilarGroups: Record<string, typeof criterioEntries> = { "Atendimento": criterioEntries };
  return (
    <div className="rounded-xl overflow-hidden mb-2" style={{ backgroundColor: open ? '#0B1426' : C.surface, border: `1px solid ${open ? C.blue : C.border}` }}>
      <button className="w-full flex items-center p-4 text-left" onClick={() => setOpen(!open)}>
        <span className="text-xs font-bold w-8 text-[#64748B]">{index + 1}</span>
        <span className="font-mono text-sm font-bold text-[#38BDF8] w-28">{atendimento.protocolo}</span>
        <span className="text-sm font-medium text-white flex-1 truncate px-4">{atendimento.cliente}</span>
        <div className="flex items-center gap-6">
          <span className="text-sm font-bold text-[#22C55E]">QA {atendimento.nota_qa}</span>
          {open ? <ChevronUp size={16} className="text-[#64748B]" /> : <ChevronDown size={16} className="text-[#64748B]" />}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-[#1E2D4A]">
          <div className="mt-5 p-4 rounded-lg bg-[#111C33] border border-[#1E2D4A]">
            <p className="text-xs font-bold uppercase text-[#64748B] mb-2">Síntese do Atendimento</p>
            <p className="text-sm text-[#E2E8F0]">{atendimento.sintese || 'Sem síntese.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedbackViewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('feedbacks').select('*').eq('id', params?.id as string).maybeSingle();
      if (data) setFeedback(mergeFeedbackData(data as Feedback));
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return <div className="p-10 text-white">Carregando...</div>;
  if (!feedback) return <div className="p-10 text-white">Feedback não encontrado.</div>;

  const atendimentos = buildAtendimentos(feedback);
  const criteriosRaw = feedback.criterios || (feedback.snapshot_json_completo as any)?.criterios || {};

  return (
    <EnterpriseLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white">Feedback Experience</h1>
        <div className="space-y-4">
          <SectionTitle icon={<Eye size={16} />} title="Atendimentos Avaliados" color={C.blue} />
          {atendimentos.map((a, i) => (
            <AtendimentoAccordion key={a.id || i} atendimento={a} index={i} globalCriterios={criteriosRaw as Record<string, CriterioData>} />
          ))}
        </div>
      </div>
    </EnterpriseLayout>
  );
}

function mergeFeedbackData(data: Feedback): Feedback {
  const snap = data.snapshot_json_completo as Record<string, unknown> | null;
  if (snap) {
    if (!data.pilares_qa && (snap as any).pilares_qa) (data as any).pilares_qa = (snap as any).pilares_qa;
  }
  return data;
}

function buildAtendimentos(feedback: Feedback): AtendimentoItem[] {
  const snapAtendimentos = (feedback.snapshot_json_completo as any)?.atendimentos;
  if (Array.isArray(snapAtendimentos)) {
    return snapAtendimentos.map((a: any, i: number) => ({
      id: `snap-${i}`,
      protocolo: a.protocolo || a.sup || `#${i + 1}`,
      cliente: a.cliente || '—',
      assunto: a.assunto || '—',
      nota_qa: Number(a.nota_qa || 0),
      sintese: a.sintese || '',
      criterios_raw: Array.isArray(a.criterios) ? buildCriteriosFromArray(a.criterios) : undefined,
    }));
  }
  return [];
}

function buildCriteriosFromArray(criterios: Array<any>): Record<string, { pts: number; max: number; evidencia?: string }> {
  const result: Record<string, { pts: number; max: number; evidencia?: string }> = {};
  if (!Array.isArray(criterios)) return result;
  criterios.forEach((c, i) => {
    if (!c.criterio_nome || c.pilar_nome === "0") return;
    const key = `criterio_${i}_${c.criterio_nome.toLowerCase().replace(/\s+/g, '_')}`;
    result[key] = { pts: c.status === 'aderido' ? 20 : 10, max: 20, evidencia: `${c.pilar_nome} — ${c.status}` };
  });
  return result;
}