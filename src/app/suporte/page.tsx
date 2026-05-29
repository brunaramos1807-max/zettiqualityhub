'use client';
import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { fetchCycleScores, fetchNCRecords, fetchElogios } from '@/lib/services/dataService';
import { getActiveCycle } from '@/lib/services/supabaseDataService';
import {
  Users, Award, TrendingUp, AlertTriangle, Star, BarChart2,
  Mail, Phone, Calendar, Clock, ChevronDown, ChevronUp,
  Building2, GitBranch, Shield, Crown, Briefcase
} from 'lucide-react';

interface OrgMember {
  id: string;
  nome: string;
  cargo: string;
  nivel: 'gerente' | 'coordenacao_geral' | 'qualidade' | 'coordenador' | 'analista';
  squad?: string;
  email?: string;
  telefone?: string;
  aniversario?: string;
  tempoEmpresa?: string;
  funcoesAnteriores?: string[];
  avatar?: string;
  subordinados?: string[];
}

interface CoordMetrics {
  nome: string;
  squad: string;
  qaMedia: number | null;
  iepcMedia: number | null;
  totalNCs: number;
  totalElogios: number;
  totalAnalistas: number;
}

const ORG_HIERARCHY: OrgMember[] = [
  {
    id: 'pedro',
    nome: 'Pedro',
    cargo: 'Gerente',
    nivel: 'gerente',
    email: 'pedro@qualivisao.tec.br',
    funcoesAnteriores: ['Coordenador Geral'],
    subordinados: ['fabiano'],
  },
  {
    id: 'fabiano',
    nome: 'Fabiano',
    cargo: 'Coordenação Geral',
    nivel: 'coordenacao_geral',
    email: 'fabiano@qualivisao.tec.br',
    funcoesAnteriores: ['Coordenador de Operações'],
    subordinados: ['bruna'],
  },
  {
    id: 'bruna',
    nome: 'Bruna',
    cargo: 'Qualidade',
    nivel: 'qualidade',
    email: 'bruna@qualivisao.tec.br',
    funcoesAnteriores: ['Analista de Qualidade Sênior'],
    subordinados: [],
  },
];

const NIVEL_CONFIG = {
  gerente: { label: 'Gerente', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Crown size={14} />, border: 'rgba(245,158,11,0.3)' },
  coordenacao_geral: { label: 'Coordenação Geral', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', icon: <Building2 size={14} />, border: 'rgba(56,189,248,0.3)' },
  qualidade: { label: 'Qualidade', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <Shield size={14} />, border: 'rgba(34,197,94,0.3)' },
  coordenador: { label: 'Coordenador', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: <Briefcase size={14} />, border: 'rgba(167,139,250,0.3)' },
  analista: { label: 'Analista', color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', icon: <Users size={14} />, border: 'rgba(148,163,184,0.2)' },
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function MemberCard({ member, expanded, onToggle }: { member: OrgMember; expanded: boolean; onToggle: () => void }) {
  const cfg = NIVEL_CONFIG[member.nivel];
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: '#0F1B31',
        border: `1px solid ${expanded ? cfg.border : 'rgba(255,255,255,0.07)'}`,
        boxShadow: expanded ? `0 8px 32px ${cfg.bg}` : '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${cfg.color}40, ${cfg.color}20)`, border: `2px solid ${cfg.border}` }}
        >
          {getInitials(member.nome)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-base font-bold text-white">{member.nome}</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{member.cargo}{member.squad ? ` · ${member.squad}` : ''}</p>
        </div>
        <div style={{ color: '#64748B', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {member.email && (
              <div className="flex items-center gap-2">
                <Mail size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{member.email}</span>
              </div>
            )}
            {member.telefone && (
              <div className="flex items-center gap-2">
                <Phone size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{member.telefone}</span>
              </div>
            )}
            {member.aniversario && (
              <div className="flex items-center gap-2">
                <Calendar size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{member.aniversario}</span>
              </div>
            )}
            {member.tempoEmpresa && (
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: '#64748B' }} />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{member.tempoEmpresa} na empresa</span>
              </div>
            )}
          </div>
          {member.funcoesAnteriores && member.funcoesAnteriores.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white mb-2">Funções Anteriores</p>
              <div className="flex flex-wrap gap-1.5">
                {member.funcoesAnteriores.map((f, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CoordMetricCard({ metrics }: { metrics: CoordMetrics }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}>
          {getInitials(metrics.nome)}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{metrics.nome}</p>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{metrics.squad} · {metrics.totalAnalistas} analistas</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'QA Médio', value: metrics.qaMedia != null ? `${metrics.qaMedia}` : '—', color: metrics.qaMedia != null && metrics.qaMedia >= 90 ? '#22C55E' : metrics.qaMedia != null && metrics.qaMedia >= 70 ? '#F59E0B' : '#94A3B8', icon: <BarChart2 size={12} /> },
          { label: 'IEPC Médio', value: metrics.iepcMedia != null ? `${metrics.iepcMedia}%` : '—', color: metrics.iepcMedia != null && metrics.iepcMedia >= 90 ? '#22C55E' : metrics.iepcMedia != null && metrics.iepcMedia >= 70 ? '#F59E0B' : '#94A3B8', icon: <TrendingUp size={12} /> },
          { label: 'NCs', value: metrics.totalNCs, color: metrics.totalNCs > 5 ? '#EF4444' : metrics.totalNCs > 0 ? '#F59E0B' : '#22C55E', icon: <AlertTriangle size={12} /> },
          { label: 'Elogios', value: metrics.totalElogios, color: '#F59E0B', icon: <Star size={12} /> },
        ].map((m) => (
          <div key={m.label} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-1.5 mb-1" style={{ color: '#64748B' }}>
              {m.icon}
              <span className="text-xs">{m.label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgChart() {
  return (
    <div className="flex flex-col items-center gap-0 py-4">
      {/* Gerente */}
      <div className="flex flex-col items-center">
        <div className="rounded-2xl px-6 py-4 text-center" style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.4)', minWidth: '160px' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white mx-auto mb-2" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
            P
          </div>
          <p className="text-sm font-bold text-white">Pedro</p>
          <p className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>Gerente</p>
        </div>
        <div className="w-0.5 h-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Coordenação Geral */}
      <div className="flex flex-col items-center">
        <div className="rounded-2xl px-6 py-4 text-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '2px solid rgba(56,189,248,0.4)', minWidth: '160px' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white mx-auto mb-2" style={{ background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)' }}>
            F
          </div>
          <p className="text-sm font-bold text-white">Fabiano</p>
          <p className="text-xs mt-0.5" style={{ color: '#38BDF8' }}>Coordenação Geral</p>
        </div>
        <div className="w-0.5 h-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Qualidade */}
      <div className="flex flex-col items-center">
        <div className="rounded-2xl px-6 py-4 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.4)', minWidth: '160px' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white mx-auto mb-2" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
            B
          </div>
          <p className="text-sm font-bold text-white">Bruna</p>
          <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>Qualidade</p>
        </div>
        <div className="w-0.5 h-8" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Coordenadores label */}
      <div className="flex items-center gap-3">
        <div className="h-0.5 w-16" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="rounded-xl px-4 py-2" style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: '#A78BFA' }}>Coordenadores de Equipes</p>
        </div>
        <div className="h-0.5 w-16" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
      </div>
    </div>
  );
}

export default function SuportePage() {
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [coordMetrics, setCoordMetrics] = useState<CoordMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'organograma' | 'coordenadores' | 'suporte'>('organograma');

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      try {
        const activeCycle = await getActiveCycle();
        const [scores, ncs, elogios] = await Promise.all([
          fetchCycleScores(activeCycle || undefined),
          fetchNCRecords(activeCycle || undefined),
          fetchElogios(activeCycle || undefined),
        ]);

        // Build coordinator metrics from cycle scores
        const coordMap: Record<string, CoordMetrics> = {};
        scores.forEach((s: any) => {
          const coord = s.coordenador;
          if (!coord) return;
          if (!coordMap[coord]) {
            coordMap[coord] = { nome: coord, squad: s.squad || '', qaMedia: null, iepcMedia: null, totalNCs: 0, totalElogios: 0, totalAnalistas: 0 };
          }
          coordMap[coord].totalAnalistas++;
          if (s.qa_score != null) {
            const prev = coordMap[coord].qaMedia;
            coordMap[coord].qaMedia = prev == null ? s.qa_score : Math.round((prev + s.qa_score) / 2);
          }
          if (s.iepc_score != null) {
            const prev = coordMap[coord].iepcMedia;
            coordMap[coord].iepcMedia = prev == null ? s.iepc_score : Math.round((prev + s.iepc_score) / 2);
          }
        });

        ncs.forEach((nc: any) => {
          const coord = nc.coordenador;
          if (coord && coordMap[coord]) coordMap[coord].totalNCs++;
        });

        elogios.forEach((e: any) => {
          // Try to match elogio to coordinator via squad
          const squad = e.squad;
          const coordEntry = Object.values(coordMap).find((c) => c.squad === squad);
          if (coordEntry) coordEntry.totalElogios++;
        });

        setCoordMetrics(Object.values(coordMap).sort((a, b) => (b.qaMedia || 0) - (a.qaMedia || 0)));
      } catch (err) {
        console.error('Suporte metrics error:', err);
      }
      setLoading(false);
    };
    loadMetrics();
  }, []);

  const tabs = [
    { id: 'organograma', label: 'Organograma', icon: <GitBranch size={13} /> },
    { id: 'coordenadores', label: 'Métricas Coordenadores', icon: <BarChart2 size={13} /> },
    { id: 'suporte', label: 'Suporte', icon: <Building2 size={13} /> },
  ] as const;

  return (
    <EnterpriseLayout>
      <div className="p-6 max-w-screen-2xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Building2 size={18} style={{ color: '#38BDF8' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Suporte & Organograma</h1>
              <p className="text-sm" style={{ color: '#94A3B8' }}>Estrutura organizacional e métricas de equipe</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#94A3B8',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Organograma Tab */}
        {activeTab === 'organograma' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visual Org Chart */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <GitBranch size={14} style={{ color: '#38BDF8' }} />
                Hierarquia Organizacional
              </h2>
              <OrgChart />
            </div>

            {/* Member Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={14} style={{ color: '#A78BFA' }} />
                Liderança
              </h2>
              {ORG_HIERARCHY.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  expanded={expandedMember === member.id}
                  onToggle={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Coordinator Metrics Tab */}
        {activeTab === 'coordenadores' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Award size={14} style={{ color: '#F59E0B' }} />
                Ranking de Coordenadores
              </h2>
              <p className="text-xs" style={{ color: '#64748B' }}>Baseado na média consolidada das equipes</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mr-3" />
                <span className="text-sm" style={{ color: '#94A3B8' }}>Carregando métricas...</span>
              </div>
            ) : coordMetrics.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <BarChart2 size={32} className="mx-auto mb-3 opacity-20 text-white" />
                <p className="text-sm text-white mb-1">Nenhuma métrica disponível</p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Importe dados do ciclo para visualizar as métricas dos coordenadores.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {coordMetrics.map((m, i) => (
                  <div key={m.nome} className="relative">
                    {i < 3 && (
                      <div className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : '#CD7F32' }}>
                        {i + 1}
                      </div>
                    )}
                    <CoordMetricCard metrics={m} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'suporte' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                  <Mail size={15} style={{ color: '#38BDF8' }} />
                </div>
                <h3 className="text-sm font-semibold text-white">E-mail</h3>
              </div>
              <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Para suporte técnico e dúvidas gerais:</p>
              <a href="mailto:suporte@qualivisao.tec.br" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
                suporte@qualivisao.tec.br
              </a>
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}>
                  <Building2 size={15} style={{ color: '#38BDF8' }} />
                </div>
                <h3 className="text-sm font-semibold text-white">Documentação</h3>
              </div>
              <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Acesse os manuais e guias do sistema:</p>
              <a href="/documentos" className="text-sm font-medium" style={{ color: '#38BDF8' }}>
                Ver documentos →
              </a>
            </div>
          </div>
        )}
      </div>
    </EnterpriseLayout>
  );
}
