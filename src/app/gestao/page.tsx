'use client';
import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { Users, TrendingUp, TrendingDown, AlertTriangle, Star, Award, Search, RefreshCw, Activity, Target, Shield, Minus, Eye, X, BarChart2, BookOpen,  } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalistaGestao {
  id: string;
  analista_id?: string;
  nome: string;
  nome_completo?: string;
  cargo_operacional?: string;
  squad?: string;
  equipe?: string;
  coordenador?: string;
  email?: string;
  telefone?: string;
  data_admissao?: string;
  ultima_promocao?: string;
  status?: string;
  // computed
  avgQA: number;
  avgIEPC: number;
  totalNCs: number;
  ciclos: number;
  lastQA: number;
  lastIEPC: number;
  trend: 'up' | 'down' | 'stable';
  risco: 'alto' | 'medio' | 'baixo';
  ranking: number;
  tempoEmpresa: string;
  pdiAtivo: boolean;
  reincidencia: number;
  scores: { periodo: string; qa: number; iepc: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTempoEmpresa(dataAdmissao?: string): string {
  if (!dataAdmissao) return '—';
  try {
    const admissao = new Date(dataAdmissao + 'T00:00:00');
    const hoje = new Date();
    const meses = (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth());
    if (meses < 1) return 'Menos de 1 mês';
    if (meses < 12) return `${meses} mês${meses !== 1 ? 'es' : ''}`;
    const anos = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0 ? `${anos} ano${anos !== 1 ? 's' : ''} e ${resto} mês${resto !== 1 ? 'es' : ''}` : `${anos} ano${anos !== 1 ? 's' : ''}`;
  } catch { return '—'; }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#22C55E';
  if (score >= 75) return '#84CC16';
  if (score >= 60) return '#EAB308';
  if (score >= 45) return '#F97316';
  return '#EF4444';
}

function getRiscoColor(risco: string): string {
  if (risco === 'alto') return '#EF4444';
  if (risco === 'medio') return '#F59E0B';
  return '#22C55E';
}

function getRiscoLabel(risco: string): string {
  if (risco === 'alto') return 'Alto';
  if (risco === 'medio') return 'Médio';
  return 'Baixo';
}

function getStatusColor(status?: string): string {
  if (status === 'ativo') return '#22C55E';
  if (status === 'ferias') return '#EAB308';
  if (status === 'afastado') return '#F97316';
  if (status === 'desligado') return '#EF4444';
  return '#94A3B8';
}

function getStatusLabel(status?: string): string {
  if (status === 'ativo') return 'Ativo';
  if (status === 'ferias') return 'Férias';
  if (status === 'afastado') return 'Afastado';
  if (status === 'desligado') return 'Desligado';
  return status || '—';
}

// ─── Analyst Detail Panel ─────────────────────────────────────────────────────

function AnalystDetailPanel({ analista, onClose }: { analista: AnalistaGestao; onClose: () => void }) {
  const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        style={{ backgroundColor: '#0D1117', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 p-6" style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
              >
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-white">{analista.nome_completo || analista.nome}</h2>
                  {analista.analista_id && (
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                      style={{ backgroundColor: 'rgba(56,189,248,0.12)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }}>
                      {analista.analista_id}
                    </span>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
                  {analista.cargo_operacional || 'Analista'} · {analista.squad || analista.equipe || '—'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${getStatusColor(analista.status)}18`, color: getStatusColor(analista.status) }}>
                    {getStatusLabel(analista.status)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${getRiscoColor(analista.risco)}15`, color: getRiscoColor(analista.risco) }}>
                    Risco {getRiscoLabel(analista.risco)}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8B949E' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ciclos', value: analista.ciclos, color: '#60A5FA', icon: <Activity size={13} /> },
              { label: 'Média QA', value: analista.avgQA > 0 ? analista.avgQA.toFixed(1) : '—', color: getScoreColor(analista.avgQA), icon: <Award size={13} /> },
              { label: 'Média IEPC', value: analista.avgIEPC > 0 ? analista.avgIEPC.toFixed(1) : '—', color: getScoreColor(analista.avgIEPC), icon: <Target size={13} /> },
              { label: 'Total NCs', value: analista.totalNCs, color: analista.totalNCs > 0 ? '#EF4444' : '#22C55E', icon: <AlertTriangle size={13} /> },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                  {kpi.icon}
                  <span className="text-xs font-medium">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Coordenador', value: analista.coordenador || '—' },
              { label: 'Tempo de Empresa', value: analista.tempoEmpresa },
              { label: 'Última Promoção', value: analista.ultima_promocao ? new Date(analista.ultima_promocao + 'T00:00:00').toLocaleDateString('pt-BR') : '—' },
              { label: 'Ranking', value: analista.ranking > 0 ? `#${analista.ranking}` : '—' },
              { label: 'Reincidência NCs', value: analista.reincidencia > 0 ? `${analista.reincidencia}x` : 'Sem reincidência' },
              { label: 'PDI Ativo', value: analista.pdiAtivo ? 'Sim' : 'Não' },
            ].map((info) => (
              <div key={info.label} className="p-3 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs mb-1" style={{ color: '#8B949E' }}>{info.label}</p>
                <p className="text-sm font-semibold text-white">{info.value}</p>
              </div>
            ))}
          </div>

          {/* Evolution Chart */}
          {analista.scores.length > 0 ? (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Evolução QA / IEPC</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analista.scores} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="periodo" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                    />
                    <Line type="monotone" dataKey="qa" name="QA" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 3 }} />
                    <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl text-center" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <BarChart2 size={28} className="mx-auto mb-2 opacity-30" style={{ color: '#8B949E' }} />
              <p className="text-sm" style={{ color: '#8B949E' }}>Nenhuma avaliação importada para este analista.</p>
            </div>
          )}

          {/* Score History Table */}
          {analista.scores.length > 0 && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-semibold text-white mb-3">Histórico de Avaliações</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Ciclo', 'QA', 'IEPC', 'Tendência'].map((h) => (
                        <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analista.scores.map((s, i) => {
                      const prev = analista.scores[i - 1];
                      const qaTrend = prev ? (s.qa > prev.qa ? 'up' : s.qa < prev.qa ? 'down' : 'stable') : 'stable';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-2 text-white">{s.periodo}</td>
                          <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.qa) }}>{s.qa.toFixed(1)}</td>
                          <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.iepc) }}>{s.iepc.toFixed(1)}</td>
                          <td className="py-2 px-2">
                            {qaTrend === 'up' && <TrendingUp size={13} style={{ color: '#22C55E' }} />}
                            {qaTrend === 'down' && <TrendingDown size={13} style={{ color: '#EF4444' }} />}
                            {qaTrend === 'stable' && <Minus size={13} style={{ color: '#8B949E' }} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Analyst Card ─────────────────────────────────────────────────────────────

function AnalystCard({ analista, rank, onClick }: { analista: AnalistaGestao; rank: number; onClick: () => void }) {
  const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();
  const trendIcon = analista.trend === 'up'
    ? <TrendingUp size={13} style={{ color: '#22C55E' }} />
    : analista.trend === 'down'
    ? <TrendingDown size={13} style={{ color: '#EF4444' }} />
    : <Minus size={13} style={{ color: '#8B949E' }} />;

  return (
    <div
      className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: '#0F1B31',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}
            >
              {initials}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ backgroundColor: getStatusColor(analista.status), borderColor: '#0F1B31' }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{analista.nome}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>{analista.cargo_operacional || 'Analista'}</p>
            {analista.analista_id && (
              <span className="text-xs font-mono" style={{ color: '#38BDF8', opacity: 0.7 }}>{analista.analista_id}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold" style={{ color: '#94A3B8' }}>#{rank}</span>
          {trendIcon}
        </div>
      </div>

      {/* Squad / Coordenador */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(analista.squad || analista.equipe) && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}>
            {analista.squad || analista.equipe}
          </span>
        )}
        {analista.coordenador && (
          <span className="text-xs" style={{ color: '#8B949E' }}>↳ {analista.coordenador}</span>
        )}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-0.5" style={{ color: '#8B949E' }}>QA</p>
          <p className="text-base font-bold" style={{ color: analista.avgQA > 0 ? getScoreColor(analista.avgQA) : '#8B949E' }}>
            {analista.avgQA > 0 ? analista.avgQA.toFixed(1) : '—'}
          </p>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-0.5" style={{ color: '#8B949E' }}>IEPC</p>
          <p className="text-base font-bold" style={{ color: analista.avgIEPC > 0 ? getScoreColor(analista.avgIEPC) : '#8B949E' }}>
            {analista.avgIEPC > 0 ? analista.avgIEPC.toFixed(1) : '—'}
          </p>
        </div>
      </div>

      {/* Bottom indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs" style={{ color: analista.totalNCs > 0 ? '#EF4444' : '#22C55E' }}>
            <AlertTriangle size={11} />
            {analista.totalNCs} NC{analista.totalNCs !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <Activity size={11} />
            {analista.ciclos} ciclo{analista.ciclos !== 1 ? 's' : ''}
          </span>
          {analista.pdiAtivo && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#A78BFA' }}>
              <BookOpen size={11} />
              PDI
            </span>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${getRiscoColor(analista.risco)}15`, color: getRiscoColor(analista.risco) }}
        >
          {getRiscoLabel(analista.risco)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function GestaoContent() {
  const [analistas, setAnalistas] = useState<AnalistaGestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRisco, setFilterRisco] = useState('');
  const [sortBy, setSortBy] = useState<'ranking' | 'qa' | 'iepc' | 'ncs' | 'nome'>('ranking');
  const [selectedAnalista, setSelectedAnalista] = useState<AnalistaGestao | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const [analistasRes, scoresRes, pdisRes] = await Promise.all([
        supabase.from('analistas').select('*').order('nome'),
        supabase.from('cycle_scores').select('analista, periodo, nota_final_qa, iepc_total, total_ncs').order('periodo'),
        supabase.from('pdi_records').select('analista, status').eq('status', 'ativo'),
      ]);

      const analistasData = analistasRes.data || [];
      const scoresData = scoresRes.data || [];
      const pdisData = pdisRes.data || [];

      const activePdis = new Set((pdisData as any[]).map((p: any) => (p.analista || '').toLowerCase().trim()));

      const computed: AnalistaGestao[] = analistasData.map((a: any) => {
        const nomeLower = (a.nome_completo || a.nome || '').toLowerCase().trim();
        const nomeShort = (a.nome || '').toLowerCase().trim();

        const matchName = (n: string) => {
          const nl = (n || '').toLowerCase().trim();
          return nl === nomeLower || nl === nomeShort || nomeLower.includes(nl) || (nl.length > 3 && nl.includes(nomeShort));
        };

        const analistaScores = (scoresData as any[])
          .filter((s: any) => matchName(s.analista || ''))
          .sort((a: any, b: any) => (a.periodo || '').localeCompare(b.periodo || ''));

        const avgQA = analistaScores.length > 0
          ? analistaScores.reduce((sum: number, s: any) => sum + (s.nota_final_qa || 0), 0) / analistaScores.length
          : 0;
        const avgIEPC = analistaScores.length > 0
          ? analistaScores.reduce((sum: number, s: any) => sum + (s.iepc_total || 0), 0) / analistaScores.length
          : 0;
        const totalNCs = analistaScores.reduce((sum: number, s: any) => sum + (s.total_ncs || 0), 0);

        const lastScore = analistaScores.length > 0 ? analistaScores[analistaScores.length - 1] : null;
        const prevScore = analistaScores.length > 1 ? analistaScores[analistaScores.length - 2] : null;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (lastScore && prevScore) {
          const diff = (lastScore.nota_final_qa || 0) - (prevScore.nota_final_qa || 0);
          if (diff > 2) trend = 'up';
          else if (diff < -2) trend = 'down';
        }

        // Risk: based on avg QA and NC count
        let risco: 'alto' | 'medio' | 'baixo' = 'baixo';
        if (avgQA > 0 && avgQA < 60) risco = 'alto';
        else if (avgQA > 0 && avgQA < 75) risco = 'medio';
        else if (totalNCs > 5) risco = 'medio';

        // Reincidência: count NCs across cycles
        const ncCycles = analistaScores.filter((s: any) => (s.total_ncs || 0) > 0).length;

        const pdiAtivo = activePdis.has(nomeLower) || activePdis.has(nomeShort);

        return {
          id: a.id,
          analista_id: a.analista_id,
          nome: a.nome || '',
          nome_completo: a.nome_completo || a.nome || '',
          cargo_operacional: a.cargo_operacional || a.cargo || 'Analista',
          squad: a.squad || '',
          equipe: a.equipe || '',
          coordenador: a.coordenador || '',
          email: a.email || '',
          telefone: a.telefone || '',
          data_admissao: a.data_admissao || '',
          ultima_promocao: a.ultima_promocao || '',
          status: a.status || 'ativo',
          avgQA: Math.round(avgQA * 10) / 10,
          avgIEPC: Math.round(avgIEPC * 10) / 10,
          totalNCs,
          ciclos: analistaScores.length,
          lastQA: lastScore?.nota_final_qa || 0,
          lastIEPC: lastScore?.iepc_total || 0,
          trend,
          risco,
          ranking: 0,
          tempoEmpresa: calcTempoEmpresa(a.data_admissao),
          pdiAtivo,
          reincidencia: ncCycles,
          scores: analistaScores.map((s: any) => ({
            periodo: s.periodo,
            qa: Number((s.nota_final_qa || 0).toFixed(1)),
            iepc: Number((s.iepc_total || 0).toFixed(1)),
          })),
        };
      });

      // Assign rankings by avgQA (only those with scores)
      const withScores = computed.filter((a) => a.ciclos > 0).sort((a, b) => b.avgQA - a.avgQA);
      withScores.forEach((a, i) => { a.ranking = i + 1; });

      setAnalistas(computed);
    } catch (e) {
      console.error('Gestão load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Derived stats
  const stats = useMemo(() => {
    const withScores = analistas.filter((a) => a.ciclos > 0);
    const avgQA = withScores.length > 0 ? withScores.reduce((s, a) => s + a.avgQA, 0) / withScores.length : 0;
    const avgIEPC = withScores.length > 0 ? withScores.reduce((s, a) => s + a.avgIEPC, 0) / withScores.length : 0;
    const totalNCs = analistas.reduce((s, a) => s + a.totalNCs, 0);
    const riscoAlto = analistas.filter((a) => a.risco === 'alto').length;
    const ativos = analistas.filter((a) => a.status === 'ativo').length;
    const comPdi = analistas.filter((a) => a.pdiAtivo).length;
    return { avgQA, avgIEPC, totalNCs, riscoAlto, ativos, comPdi, total: analistas.length };
  }, [analistas]);

  // Equipes for filter
  const equipes = useMemo(() => {
    const set = new Set<string>();
    analistas.forEach((a) => { if (a.squad) set.add(a.squad); else if (a.equipe) set.add(a.equipe); });
    return Array.from(set).sort();
  }, [analistas]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = analistas.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(a.nome.toLowerCase().includes(q) || (a.nome_completo || '').toLowerCase().includes(q) || (a.squad || '').toLowerCase().includes(q) || (a.coordenador || '').toLowerCase().includes(q))) return false;
      }
      if (filterEquipe && a.squad !== filterEquipe && a.equipe !== filterEquipe) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterRisco && a.risco !== filterRisco) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'ranking') return (a.ranking || 999) - (b.ranking || 999);
      if (sortBy === 'qa') return b.avgQA - a.avgQA;
      if (sortBy === 'iepc') return b.avgIEPC - a.avgIEPC;
      if (sortBy === 'ncs') return b.totalNCs - a.totalNCs;
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      return 0;
    });

    return list;
  }, [analistas, search, filterEquipe, filterStatus, filterRisco, sortBy]);

  // Top performers for ranking chart
  const topPerformers = useMemo(() =>
    analistas.filter((a) => a.ciclos > 0).sort((a, b) => b.avgQA - a.avgQA).slice(0, 8),
    [analistas]
  );

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de People Analytics</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
            Painel estratégico de RH operacional — visão executiva dos analistas avaliados
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Analistas', value: stats.total, color: '#38BDF8', icon: <Users size={16} /> },
          { label: 'Ativos', value: stats.ativos, color: '#22C55E', icon: <Activity size={16} /> },
          { label: 'Média QA', value: stats.avgQA > 0 ? stats.avgQA.toFixed(1) : '—', color: getScoreColor(stats.avgQA), icon: <Award size={16} /> },
          { label: 'Média IEPC', value: stats.avgIEPC > 0 ? stats.avgIEPC.toFixed(1) : '—', color: getScoreColor(stats.avgIEPC), icon: <Target size={16} /> },
          { label: 'Risco Alto', value: stats.riscoAlto, color: stats.riscoAlto > 0 ? '#EF4444' : '#22C55E', icon: <Shield size={16} /> },
          { label: 'PDIs Ativos', value: stats.comPdi, color: '#A78BFA', icon: <BookOpen size={16} /> },
        ].map((kpi) => (
          <div key={kpi.label} className="p-4 rounded-2xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: kpi.color }}>
              {kpi.icon}
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Ranking Chart */}
      {topPerformers.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Star size={16} style={{ color: '#EAB308' }} />
            Ranking de Performance — Top {topPerformers.length}
          </h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers.map((a) => ({ nome: a.nome.split(' ')[0], qa: a.avgQA, iepc: a.avgIEPC }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="nome" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#fff', fontWeight: 600 }}
                />
                <Bar dataKey="qa" name="QA" fill="#22C55E" radius={[4, 4, 0, 0]}>
                  {topPerformers.map((a, i) => (
                    <Cell key={i} fill={getScoreColor(a.avgQA)} />
                  ))}
                </Bar>
                <Bar dataKey="iepc" name="IEPC" fill="#60A5FA" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar analista, equipe, coordenador..."
            style={{
              backgroundColor: '#0F1B31',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
              padding: '0.625rem 0.875rem 0.625rem 2.25rem',
              fontSize: '0.875rem',
              width: '100%',
              outline: 'none',
            }}
          />
        </div>

        {[
          {
            value: filterEquipe, onChange: setFilterEquipe,
            options: [{ value: '', label: 'Todas equipes' }, ...equipes.map((e) => ({ value: e, label: e }))],
          },
          {
            value: filterStatus, onChange: setFilterStatus,
            options: [
              { value: '', label: 'Todos status' },
              { value: 'ativo', label: 'Ativo' },
              { value: 'ferias', label: 'Férias' },
              { value: 'afastado', label: 'Afastado' },
              { value: 'desligado', label: 'Desligado' },
            ],
          },
          {
            value: filterRisco, onChange: setFilterRisco,
            options: [
              { value: '', label: 'Todos riscos' },
              { value: 'alto', label: 'Risco Alto' },
              { value: 'medio', label: 'Risco Médio' },
              { value: 'baixo', label: 'Risco Baixo' },
            ],
          },
          {
            value: sortBy, onChange: (v: string) => setSortBy(v as typeof sortBy),
            options: [
              { value: 'ranking', label: 'Ordenar: Ranking' },
              { value: 'qa', label: 'Ordenar: QA' },
              { value: 'iepc', label: 'Ordenar: IEPC' },
              { value: 'ncs', label: 'Ordenar: NCs' },
              { value: 'nome', label: 'Ordenar: Nome' },
            ],
          },
        ].map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={(e) => sel.onChange(e.target.value)}
            style={{
              backgroundColor: '#0F1B31',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['cards', 'table'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-2 text-xs font-medium transition-all"
              style={{
                backgroundColor: viewMode === mode ? '#1E40AF' : '#0F1B31',
                color: viewMode === mode ? '#fff' : '#94A3B8',
              }}
            >
              {mode === 'cards' ? 'Cards' : 'Tabela'}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          {filtered.length} analista{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {(search || filterEquipe || filterStatus || filterRisco) && ' (filtrado)'}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin" style={{ color: '#38BDF8' }} />
          <span className="ml-3 text-sm" style={{ color: '#94A3B8' }}>Carregando dados...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="mb-3 opacity-20" style={{ color: '#94A3B8' }} />
          <p className="text-base font-semibold text-white mb-1">Nenhum analista encontrado</p>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {analistas.length === 0
              ? 'Cadastre analistas na página Analistas para visualizá-los aqui.' :'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a, i) => (
            <AnalystCard
              key={a.id}
              analista={a}
              rank={a.ranking > 0 ? a.ranking : i + 1}
              onClick={() => setSelectedAnalista(a)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#', 'Analista', 'Equipe', 'Coordenador', 'QA', 'IEPC', 'NCs', 'Ciclos', 'Tendência', 'Risco', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-bold" style={{ color: '#94A3B8' }}>
                      {a.ranking > 0 ? `#${a.ranking}` : `—`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}>
                          {(a.nome_completo || a.nome || 'AN').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white text-xs">{a.nome}</p>
                          {a.analista_id && <p className="text-xs font-mono" style={{ color: '#38BDF8', opacity: 0.7 }}>{a.analista_id}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.squad || a.equipe || '—'}</td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.coordenador || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold" style={{ color: a.avgQA > 0 ? getScoreColor(a.avgQA) : '#8B949E' }}>
                        {a.avgQA > 0 ? a.avgQA.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold" style={{ color: a.avgIEPC > 0 ? getScoreColor(a.avgIEPC) : '#8B949E' }}>
                        {a.avgIEPC > 0 ? a.avgIEPC.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold" style={{ color: a.totalNCs > 0 ? '#EF4444' : '#22C55E' }}>{a.totalNCs}</span>
                    </td>
                    <td className="py-3 px-4 text-xs" style={{ color: '#94A3B8' }}>{a.ciclos}</td>
                    <td className="py-3 px-4">
                      {a.trend === 'up' && <TrendingUp size={14} style={{ color: '#22C55E' }} />}
                      {a.trend === 'down' && <TrendingDown size={14} style={{ color: '#EF4444' }} />}
                      {a.trend === 'stable' && <Minus size={14} style={{ color: '#8B949E' }} />}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${getRiscoColor(a.risco)}15`, color: getRiscoColor(a.risco) }}>
                        {getRiscoLabel(a.risco)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${getStatusColor(a.status)}15`, color: getStatusColor(a.status) }}>
                        {getStatusLabel(a.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedAnalista(a)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: '#38BDF8' }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedAnalista && (
        <AnalystDetailPanel
          analista={selectedAnalista}
          onClose={() => setSelectedAnalista(null)}
        />
      )}
    </div>
  );
}

export default function GestaoPage() {
  return (
    <EnterpriseLayout>
      <GestaoContent />
    </EnterpriseLayout>
  );
}
