'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { Eye, ChevronDown, ChevronUp, Star, TrendingUp, AlertTriangle, Award, User, Calendar, Shield, Zap } from 'lucide-react';

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

const C = { bg: '#0B1426', surface: '#0F1B31', border: '#1E2D4A', borderAccent: '#38BDF8', text: '#F8FAFC', textMuted: '#94A3B8', textFaint: '#64748B', blue: '#38BDF8', blueLight: 'rgba(56,189,248,0.1)', blueBorder: 'rgba(56,189,248,0.2)', teal: '#2DD4BF', tealLight: 'rgba(45,212,191,0.1)', green: '#22C55E', greenLight: 'rgba(34,197,94,0.1)', greenBorder: 'rgba(34,197,94,0.2)', amber: '#F59E0B', amberLight: 'rgba(245,158,11,0.1)', amberBorder: 'rgba(245,158,11,0.2)', red: '#EF4444', redLight: 'rgba(239,68,68,0.1)', redBorder: 'rgba(239,68,68,0.2)', purple: '#A78BFA', purpleLight: 'rgba(167,139,250,0.1)' };
const PILAR_COLORS_QA = [C.blue, C.teal, C.purple, C.amber, C.green];
const CLASSIFICACAO_COLORS: Record<string, string> = { excelente: C.green, bom: C.blue, regular: C.amber, critico: C.red };

function tempoDeEmpresa(dataAdmissao: string | null): string { if (!dataAdmissao) return '—'; const diff = Date.now() - new Date(dataAdmissao).getTime(); const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365)); const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)); if (years > 0) return `${years} ano${years !== 1 ? 's' : ''} e ${months} mês${months !== 1 ? 'es' : ''}`; return `${months} mês${months !== 1 ? 'es' : ''}`; }
function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color?: string }) { return <div className="flex items-center gap-2 mb-5"><span style={{ color: color || C.textMuted }}>{icon}</span><h3 className="text-xs font-bold tracking-widest uppercase" style={{ color: color || C.textMuted }}>{title}</h3></div>; }
function CircleProgress({ value, color = C.green, size = 90 }: { value: number; color?: string; size?: number }) { const r = size * 0.4; const circ = 2 * Math.PI * r; const offset = circ - (value / 100) * circ; return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E2D4A" strokeWidth="7" /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} /><text x={size/2} y={size/2 + 5} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="bold">{value}%</text></svg>; }
const CRITERIO_LABELS: Record<string, { label: string; group: 'qa' | 'iepc'; pilar?: string }> = { qa_atendimento_identificacao: { label: 'Identificação', group: 'qa', pilar: 'Atendimento' }, qa_solucao_resolucao: { label: 'Resolução', group: 'qa', pilar: 'Solução' }, iepc_resolucao_percebida: { label: 'Resolução Percebida', group: 'iepc', pilar: 'IEPC' } };
function getStatusFromEvidence(ev: string | undefined, pts: number, max: number): 'aderido' | 'parcial' | 'nao_aderido' { if (!ev) return pts/max >= 0.85 ? 'aderido' : pts/max >= 0.5 ? 'parcial' : 'nao_aderido'; const e = ev.toLowerCase(); if (e.includes('aderido')) return 'aderido'; if (e.includes('parcial')) return 'parcial'; return 'nao_aderido'; }
function StatusBadge({ status }: { status: 'aderido' | 'parcial' | 'nao_aderido' }) { const map = { aderido: { label: '🟢 Aderido', class: 'bg-[#052E16] text-[#22C55E] border-[#14532D]' }, parcial: { label: '🟡 Parcial', class: 'bg-[#422006] text-[#F59E0B] border-[#78350F]' }, nao_aderido: { label: '🔴 Não Aderido', class: 'bg-[#450A0A] text-[#EF4444] border-[#7F1D1D]' } }; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[status].class}`}>{map[status].label}</span>; }

// ─── Block 1: Hero Header ─────────────────────────────────────────────────────
function HeroHeader({ feedback }: { feedback: Feedback }) {
  const analista = feedback.analistas;
  const nome = analista?.nome_completo || analista?.nome || feedback.analista || '—';
  const squad = analista?.equipe || feedback.equipe || feedback.squad || '—';
  const coordenador = analista?.coordenador || feedback.coordenador || '—';
  const cargo = analista?.cargo_operacional || 'Analista de Atendimento';
  const fotoUrl = analista?.foto_url;
  const tempo = tempoDeEmpresa(analista?.data_admissao || null);
  const posicao = feedback.posicao_squad;
  const total = feedback.total_squad;
  const ciclosEvolucao = feedback.ciclos_consecutivos_evolucao || 0;

  const qaScore = feedback.qa_score ?? feedback.nota_final_qa ?? 0;
  const iepcScore = feedback.iepc_score ?? feedback.iepc_total ?? 0;
  const scoreColor = qaScore >= 85 ? C.green : qaScore >= 70 ? C.blue : qaScore >= 55 ? C.amber : C.red;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, #0F1B31 0%, #0B1426 100%)`, border: `1px solid ${C.border}` }}>
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.teal}, ${C.purple})` }} />
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ border: `3px solid ${C.blue}`, boxShadow: `0 0 20px rgba(56,189,248,0.3)` }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ background: `linear-gradient(135deg, #1E3A5F, #0F1B31)`, color: C.blue }}>
                  {nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: scoreColor, border: `2px solid ${C.bg}` }}>
              <Shield size={12} color="white" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-white truncate">{nome}</h1>
              {ciclosEvolucao > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: C.greenLight, color: C.green, border: `1px solid ${C.greenBorder}` }}>
                  🔥 {ciclosEvolucao} ciclo{ciclosEvolucao !== 1 ? 's' : ''} em evolução
                </span>
              )}
            </div>
            <p className="text-sm mb-3" style={{ color: C.textMuted }}>{cargo}</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <User size={13} style={{ color: C.blue }} />
                <span className="text-xs" style={{ color: C.textMuted }}>Squad: <span className="text-white font-medium">{squad}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield size={13} style={{ color: C.purple }} />
                <span className="text-xs" style={{ color: C.textMuted }}>Coord: <span className="text-white font-medium">{coordenador}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={13} style={{ color: C.teal }} />
                <span className="text-xs" style={{ color: C.textMuted }}>Empresa: <span className="text-white font-medium">{tempo}</span></span>
              </div>
              {posicao && total && (
                <div className="flex items-center gap-1.5">
                  <Award size={13} style={{ color: C.amber }} />
                  <span className="text-xs" style={{ color: C.textMuted }}>Ranking: <span className="text-white font-medium">{posicao}º/{total}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Scores */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <CircleProgress value={Math.round(qaScore)} color={scoreColor} size={80} />
              <p className="text-xs mt-1 font-bold" style={{ color: C.textMuted }}>QA Score</p>
            </div>
            <div className="text-center">
              <CircleProgress value={Math.round(iepcScore)} color={C.teal} size={80} />
              <p className="text-xs mt-1 font-bold" style={{ color: C.textMuted }}>IEPC</p>
            </div>
          </div>
        </div>

        {/* Ciclo info bar */}
        <div className="mt-5 pt-4 flex flex-wrap gap-4 items-center" style={{ borderTop: `1px solid ${C.border}` }}>
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: C.blueLight, color: C.blue, border: `1px solid ${C.blueBorder}` }}>
            📅 Ciclo: {feedback.ciclo || '—'}
          </span>
          {feedback.periodo_inicio && (
            <span className="text-xs" style={{ color: C.textFaint }}>
              {feedback.periodo_inicio} → {feedback.periodo_fim || 'atual'}
            </span>
          )}
          {feedback.status && (
            <span className="text-xs font-bold px-3 py-1 rounded-full ml-auto" style={{ backgroundColor: feedback.status === 'publicado' ? C.greenLight : C.amberLight, color: feedback.status === 'publicado' ? C.green : C.amber, border: `1px solid ${feedback.status === 'publicado' ? C.greenBorder : C.amberBorder}` }}>
              {feedback.status === 'publicado' ? '✅ Publicado' : '⏳ ' + feedback.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Block 2: Radar Charts QA + IEPC ─────────────────────────────────────────
function RadarBlock({ feedback }: { feedback: Feedback }) {
  const pilaresQA: PilarItem[] = Array.isArray(feedback.pilares_qa) ? feedback.pilares_qa : [];
  const pilaresIEPC: PilarItem[] = Array.isArray(feedback.pilares_iepc) ? feedback.pilares_iepc : [];

  const qaData = pilaresQA.map((p, i) => ({
    subject: p.nome?.length > 14 ? p.nome.substring(0, 14) + '…' : p.nome,
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : p.pontuacao,
    fullMark: 100,
    color: PILAR_COLORS_QA[i % PILAR_COLORS_QA.length],
  }));

  const iepcData = pilaresIEPC.map((p, i) => ({
    subject: p.nome?.length > 14 ? p.nome.substring(0, 14) + '…' : p.nome,
    value: p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : p.pontuacao,
    fullMark: 100,
    color: PILAR_COLORS_QA[i % PILAR_COLORS_QA.length],
  }));

  const qaScore = feedback.qa_score ?? feedback.nota_final_qa ?? 0;
  const iepcScore = feedback.iepc_score ?? feedback.iepc_total ?? 0;
  const qaColor = qaScore >= 85 ? C.green : qaScore >= 70 ? C.blue : qaScore >= 55 ? C.amber : C.red;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* QA Radar */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={<Zap size={14} />} title="Radar QA — Pilares" color={C.blue} />
          <span className="text-2xl font-black" style={{ color: qaColor }}>{Math.round(qaScore)}<span className="text-sm font-normal text-gray-400">/100</span></span>
        </div>
        {qaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={qaData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 10 }} />
              <Radar name="QA" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={(v: number) => [`${v}%`, 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center" style={{ color: C.textFaint }}>
            <p className="text-sm">Sem dados de pilares QA</p>
          </div>
        )}
        {/* Pilar bars */}
        {pilaresQA.length > 0 && (
          <div className="mt-4 space-y-2">
            {pilaresQA.map((p, i) => {
              const pct = p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : p.pontuacao;
              const col = PILAR_COLORS_QA[i % PILAR_COLORS_QA.length];
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: C.textMuted }}>{p.nome}</span>
                    <span style={{ color: col }} className="font-bold">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: C.border }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* IEPC Radar */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle icon={<Star size={14} />} title="Radar IEPC — Pilares" color={C.teal} />
          <span className="text-2xl font-black" style={{ color: C.teal }}>{Math.round(iepcScore)}<span className="text-sm font-normal text-gray-400">%</span></span>
        </div>
        {iepcData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={iepcData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: C.textMuted, fontSize: 10 }} />
              <Radar name="IEPC" dataKey="value" stroke={C.teal} fill={C.teal} fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={(v: number) => [`${v}%`, 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center" style={{ color: C.textFaint }}>
            <p className="text-sm">Sem dados de pilares IEPC</p>
          </div>
        )}
        {pilaresIEPC.length > 0 && (
          <div className="mt-4 space-y-2">
            {pilaresIEPC.map((p, i) => {
              const pct = p.max > 0 ? Math.round((p.pontuacao / p.max) * 100) : p.pontuacao;
              const col = PILAR_COLORS_QA[i % PILAR_COLORS_QA.length];
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: C.textMuted }}>{p.nome}</span>
                    <span style={{ color: col }} className="font-bold">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: C.border }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Block 3: KPI Summary Cards ───────────────────────────────────────────────
function KPISummaryCards({ feedback }: { feedback: Feedback }) {
  const totalNCs = feedback.total_ncs ?? 0;
  const ptsDeduzidos = feedback.pontos_deduzidos_nc ?? 0;
  const aderencia = feedback.aderencia_score ?? 0;
  const qaScore = feedback.qa_score ?? feedback.nota_final_qa ?? 0;
  const qaColor = qaScore >= 85 ? C.green : qaScore >= 70 ? C.blue : qaScore >= 55 ? C.amber : C.red;

  const cards = [
    { label: 'QA Score', value: `${Math.round(qaScore)}`, unit: '/100', color: qaColor, icon: <Shield size={16} /> },
    { label: 'IEPC', value: `${Math.round(feedback.iepc_score ?? feedback.iepc_total ?? 0)}`, unit: '%', color: C.teal, icon: <Star size={16} /> },
    { label: 'Aderência', value: `${Math.round(aderencia)}`, unit: '%', color: C.purple, icon: <TrendingUp size={16} /> },
    { label: 'Não Conformidades', value: `${totalNCs}`, unit: '', color: totalNCs > 0 ? C.red : C.green, icon: <AlertTriangle size={16} /> },
    { label: 'Pts Deduzidos NC', value: `${ptsDeduzidos}`, unit: 'pts', color: ptsDeduzidos > 0 ? C.amber : C.green, icon: <Zap size={16} /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex justify-center mb-2" style={{ color: card.color }}>{card.icon}</div>
          <div className="text-2xl font-black" style={{ color: card.color }}>{card.value}<span className="text-xs font-normal text-gray-400">{card.unit}</span></div>
          <div className="text-xs mt-1" style={{ color: C.textMuted }}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Block 4: Panorama do Ciclo ───────────────────────────────────────────────
function PanoramaCiclo({ feedback }: { feedback: Feedback }) {
  const pontosFortes: PontoItem[] = Array.isArray(feedback.pontos_fortes) ? feedback.pontos_fortes : [];
  const oportunidades: PontoItem[] = Array.isArray(feedback.oportunidades) ? feedback.oportunidades : [];
  const conquistas: ConquistaItem[] = Array.isArray(feedback.conquistas) ? feedback.conquistas : [];
  const resumo = feedback.resumo_ciclo || feedback.sintese_ia || '';

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <SectionTitle icon={<Award size={14} />} title="Panorama do Ciclo" color={C.amber} />

      {/* Resumo */}
      {resumo && (
        <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
          <p className="text-xs font-bold uppercase mb-2" style={{ color: C.textFaint }}>Síntese Executiva</p>
          <p className="text-sm leading-relaxed" style={{ color: C.text }}>{resumo}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Pontos Fortes */}
        <div>
          <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5" style={{ color: C.green }}>
            <TrendingUp size={12} /> Pontos Fortes
          </p>
          {pontosFortes.length > 0 ? (
            <div className="space-y-2">
              {pontosFortes.map((p, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: C.greenLight, border: `1px solid ${C.greenBorder}` }}>
                  <p className="text-xs font-bold text-white mb-0.5">{p.titulo}</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{p.descricao}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: C.textFaint }}>Sem dados</p>
          )}
        </div>

        {/* Oportunidades */}
        <div>
          <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5" style={{ color: C.amber }}>
            <AlertTriangle size={12} /> Oportunidades de Melhoria
          </p>
          {oportunidades.length > 0 ? (
            <div className="space-y-2">
              {oportunidades.map((p, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
                  <p className="text-xs font-bold text-white mb-0.5">{p.titulo}</p>
                  <p className="text-xs" style={{ color: C.textMuted }}>{p.descricao}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: C.textFaint }}>Sem dados</p>
          )}
        </div>
      </div>

      {/* Conquistas */}
      {conquistas.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase mb-3 flex items-center gap-1.5" style={{ color: C.purple }}>
            <Award size={12} /> Conquistas do Ciclo
          </p>
          <div className="flex flex-wrap gap-2">
            {conquistas.map((c, i) => (
              <div key={i} className="px-3 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: C.purpleLight, border: `1px solid rgba(167,139,250,0.2)` }}>
                <span className="text-base">{c.icone || '🏆'}</span>
                <div>
                  <p className="text-xs font-bold text-white">{c.titulo}</p>
                  <p className="text-xs" style={{ color: C.purple }}>{c.valor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolução */}
      {(feedback.evolucao_tecnica || feedback.evolucao_comportamental) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          {feedback.evolucao_tecnica && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
              <p className="text-xs font-bold mb-1" style={{ color: C.blue }}>📈 Evolução Técnica</p>
              <p className="text-xs" style={{ color: C.textMuted }}>{feedback.evolucao_tecnica}</p>
            </div>
          )}
          {feedback.evolucao_comportamental && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: C.tealLight, border: `1px solid rgba(45,212,191,0.2)` }}>
              <p className="text-xs font-bold mb-1" style={{ color: C.teal }}>🌱 Evolução Comportamental</p>
              <p className="text-xs" style={{ color: C.textMuted }}>{feedback.evolucao_comportamental}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AtendimentoAccordion (UNCHANGED) ─────────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeedbackViewPage() {
  const params = useParams();
  const supabase = createClient();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('feedbacks')
        .select('*, analistas(*)')
        .eq('id', params?.id as string)
        .maybeSingle();
      if (data) setFeedback(mergeFeedbackData(data as Feedback));
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: C.blue }} />
          <p className="text-sm" style={{ color: C.textMuted }}>Carregando feedback...</p>
        </div>
      </div>
    </EnterpriseLayout>
  );

  if (!feedback) return (
    <EnterpriseLayout>
      <div className="p-10 text-center">
        <p className="text-white text-lg">Feedback não encontrado.</p>
      </div>
    </EnterpriseLayout>
  );

  const atendimentos = buildAtendimentos(feedback);
  const criteriosRaw = feedback.criterios || (feedback.snapshot_json_completo as any)?.criterios || {};

  return (
    <EnterpriseLayout>
      <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {/* Block 1: Hero Header */}
          <HeroHeader feedback={feedback} />

          {/* Block 2: KPI Summary Cards */}
          <KPISummaryCards feedback={feedback} />

          {/* Block 3: Radar Charts */}
          <RadarBlock feedback={feedback} />

          {/* Block 4: Panorama do Ciclo */}
          <PanoramaCiclo feedback={feedback} />

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
            <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ color: C.blue, backgroundColor: C.blueLight, border: `1px solid ${C.blueBorder}` }}>
              Atendimentos Avaliados
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
          </div>

          {/* Atendimentos Section (UNCHANGED) */}
          <div className="space-y-2">
            {atendimentos.length > 0 ? (
              atendimentos.map((a, i) => (
                <AtendimentoAccordion key={a.id || i} atendimento={a} index={i} globalCriterios={criteriosRaw as Record<string, CriterioData>} />
              ))
            ) : (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <Eye size={24} className="mx-auto mb-2" style={{ color: C.textFaint }} />
                <p className="text-sm" style={{ color: C.textMuted }}>Nenhum atendimento registrado neste ciclo.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </EnterpriseLayout>
  );
}

// ─── Helper Functions (UNCHANGED) ─────────────────────────────────────────────
function mergeFeedbackData(data: Feedback): Feedback {
  const snap = data.snapshot_json_completo as Record<string, unknown> | null;
  if (snap) {
    if (!data.pilares_qa && (snap as any).pilares_qa) (data as any).pilares_qa = (snap as any).pilares_qa;
    if (!data.pilares_iepc && (snap as any).pilares_iepc) (data as any).pilares_iepc = (snap as any).pilares_iepc;
    if (!data.pontos_fortes && (snap as any).pontos_fortes) (data as any).pontos_fortes = (snap as any).pontos_fortes;
    if (!data.oportunidades && (snap as any).oportunidades) (data as any).oportunidades = (snap as any).oportunidades;
    if (!data.conquistas && (snap as any).conquistas) (data as any).conquistas = (snap as any).conquistas;
    if (!data.resumo_ciclo && (snap as any).resumo_ciclo) (data as any).resumo_ciclo = (snap as any).resumo_ciclo;
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
      nota_iepc: Number(a.nota_iepc || 0),
      classificacao: a.classificacao || '',
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