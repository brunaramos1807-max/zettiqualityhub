'use client';
import React, { useState, useEffect, useMemo } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Award,
  Search,
  RefreshCw,
  Activity,
  Minus,
  X,
  BarChart2,
  BookOpen,
  Phone,
  Clock,
  UserCheck,
  UserPlus,
  Gift,
  ChevronRight,
} from 'lucide-react';

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
  data_nascimento?: string;
  ultima_promocao?: string;
  status?: string;
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
  mesesEmpresa: number;
  pdiAtivo: boolean;
  reincidencia: number;
  scores: { periodo: string; qa: number; iepc: number }[];
}

function calcTempoEmpresa(dataAdmissao?: string): { label: string; meses: number } {
  if (!dataAdmissao) return { label: '—', meses: 0 };
  try {
    const admissao = new Date(dataAdmissao + 'T00:00:00');
    const hoje = new Date();
    const meses =
      (hoje.getFullYear() - admissao.getFullYear()) * 12 + (hoje.getMonth() - admissao.getMonth());
    if (meses < 1) return { label: 'Menos de 1 mês', meses: 0 };
    if (meses < 12) return { label: `${meses} mês${meses !== 1 ? 'es' : ''}`, meses };
    const anos = Math.floor(meses / 12);
    const resto = meses % 12;
    const label =
      resto > 0
        ? `${anos} ano${anos !== 1 ? 's' : ''} e ${resto} mês${resto !== 1 ? 'es' : ''}`
        : `${anos} ano${anos !== 1 ? 's' : ''}`;
    return { label, meses };
  } catch {
    return { label: '—', meses: 0 };
  }
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

function getBirthdayMonth(dataNascimento?: string): number | null {
  if (!dataNascimento) return null;
  try {
    return new Date(dataNascimento + 'T00:00:00').getMonth();
  } catch {
    return null;
  }
}

function formatBirthday(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  try {
    const d = new Date(dataNascimento + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  } catch {
    return '—';
  }
}

// ─── Analyst Detail Drawer ────────────────────────────────────────────────────

function AnalystDetailDrawer({
  analista,
  onClose,
}: {
  analista: AnalistaGestao;
  onClose: () => void;
}) {
  const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl h-full overflow-y-auto shadow-2xl"
        style={{ backgroundColor: '#0D1117', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div
          className="sticky top-0 z-10 p-6"
          style={{ backgroundColor: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
              >
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {analista.nome_completo || analista.nome}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
                  {analista.cargo_operacional || 'Analista'} ·{' '}
                  {analista.squad || analista.equipe || '—'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${getStatusColor(analista.status)}18`,
                      color: getStatusColor(analista.status),
                    }}
                  >
                    {getStatusLabel(analista.status)}
                  </span>
                  {analista.pdiAtivo && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}
                    >
                      PDI Ativo
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: '#8B949E' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* RH Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Coordenador',
                value: analista.coordenador || '—',
                icon: <UserCheck size={13} />,
              },
              {
                label: 'Tempo de Empresa',
                value: analista.tempoEmpresa,
                icon: <Clock size={13} />,
              },
              { label: 'Telefone', value: analista.telefone || '—', icon: <Phone size={13} /> },
              {
                label: 'Aniversário',
                value: formatBirthday(analista.data_nascimento),
                icon: <Gift size={13} />,
              },
              {
                label: 'Última Promoção',
                value: analista.ultima_promocao
                  ? new Date(analista.ultima_promocao + 'T00:00:00').toLocaleDateString('pt-BR')
                  : '—',
                icon: <Star size={13} />,
              },
              {
                label: 'PDI Ativo',
                value: analista.pdiAtivo ? 'Sim' : 'Não',
                icon: <BookOpen size={13} />,
              },
            ].map((info) => (
              <div
                key={info.label}
                className="p-3 rounded-xl"
                style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: '#8B949E' }}>
                  {info.icon}
                  <p className="text-xs">{info.label}</p>
                </div>
                <p className="text-sm font-semibold text-white">{info.value}</p>
              </div>
            ))}
          </div>

          {/* QA / IEPC — only in detail */}
          <div
            className="p-4 rounded-xl"
            style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3
              className="text-xs font-bold tracking-widest mb-3 uppercase"
              style={{ color: '#8B949E' }}
            >
              Performance QA / IEPC
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Ciclos', value: analista.ciclos, color: '#60A5FA' },
                {
                  label: 'Média QA',
                  value: analista.avgQA > 0 ? analista.avgQA.toFixed(1) : '—',
                  color: getScoreColor(analista.avgQA),
                },
                {
                  label: 'Média IEPC',
                  value: analista.avgIEPC > 0 ? analista.avgIEPC.toFixed(1) : '—',
                  color: getScoreColor(analista.avgIEPC),
                },
                {
                  label: 'Total NCs',
                  value: analista.totalNCs,
                  color: analista.totalNCs > 0 ? '#EF4444' : '#22C55E',
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="text-center p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <p className="text-xs mb-1" style={{ color: '#8B949E' }}>
                    {kpi.label}
                  </p>
                  <p className="text-lg font-bold" style={{ color: kpi.color }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Evolution Chart */}
          {analista.scores.length > 1 ? (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h3 className="text-sm font-semibold text-white mb-4">Evolução QA / IEPC</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analista.scores}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="periodo"
                      tick={{ fill: '#8B949E', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#8B949E', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161B22',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="qa"
                      name="QA"
                      stroke="#22C55E"
                      strokeWidth={2}
                      dot={{ fill: '#22C55E', r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="iepc"
                      name="IEPC"
                      stroke="#60A5FA"
                      strokeWidth={2}
                      dot={{ fill: '#60A5FA', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : analista.scores.length === 0 ? (
            <div
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <BarChart2
                size={28}
                className="mx-auto mb-2 opacity-30"
                style={{ color: '#8B949E' }}
              />
              <p className="text-sm" style={{ color: '#8B949E' }}>
                Nenhuma avaliação importada para este analista.
              </p>
            </div>
          ) : null}

          {/* Score History */}
          {analista.scores.length > 0 && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h3 className="text-sm font-semibold text-white mb-3">Histórico de Avaliações</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Ciclo', 'QA', 'IEPC', 'Tendência'].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2 px-2 font-semibold uppercase tracking-wide"
                          style={{ color: '#8B949E' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analista.scores.map((s, i) => {
                      const prev = analista.scores[i - 1];
                      const qaTrend = prev
                        ? s.qa > prev.qa
                          ? 'up'
                          : s.qa < prev.qa
                            ? 'down'
                            : 'stable'
                        : 'stable';
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td className="py-2 px-2 text-white">{s.periodo}</td>
                          <td
                            className="py-2 px-2 font-bold"
                            style={{ color: getScoreColor(s.qa) }}
                          >
                            {s.qa.toFixed(1)}
                          </td>
                          <td
                            className="py-2 px-2 font-bold"
                            style={{ color: getScoreColor(s.iepc) }}
                          >
                            {s.iepc.toFixed(1)}
                          </td>
                          <td className="py-2 px-2">
                            {qaTrend === 'up' && (
                              <TrendingUp size={13} style={{ color: '#22C55E' }} />
                            )}
                            {qaTrend === 'down' && (
                              <TrendingDown size={13} style={{ color: '#EF4444' }} />
                            )}
                            {qaTrend === 'stable' && (
                              <Minus size={13} style={{ color: '#8B949E' }} />
                            )}
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

// ─── Analyst Card (RH focus — no QA/IEPC) ────────────────────────────────────

function AnalystCard({ analista, onClick }: { analista: AnalistaGestao; onClick: () => void }) {
  const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();
  const currentMonth = new Date().getMonth();
  const birthdayMonth = getBirthdayMonth(analista.data_nascimento);
  const isBirthdayMonth = birthdayMonth === currentMonth;

  return (
    <div
      className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.01] hover:border-sky-500/30"
      style={{
        backgroundColor: '#0F1B31',
        border: `1px solid ${isBirthdayMonth ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
      onClick={onClick}
    >
      {/* Header */}
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
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {analista.nome}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
              {analista.cargo_operacional || 'Analista'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isBirthdayMonth && (
            <Gift size={14} style={{ color: '#F59E0B' }} title="Aniversariante do mês" />
          )}
          <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>

      {/* Squad / Coordenador */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(analista.squad || analista.equipe) && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8' }}
          >
            {analista.squad || analista.equipe}
          </span>
        )}
        {analista.coordenador && (
          <span className="text-xs" style={{ color: '#8B949E' }}>
            ↳ {analista.coordenador}
          </span>
        )}
      </div>

      {/* RH Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
          <Clock size={11} />
          <span>{analista.tempoEmpresa}</span>
        </div>
        {analista.telefone && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
            <Phone size={11} />
            <span>{analista.telefone}</span>
          </div>
        )}
        {analista.data_nascimento && (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: isBirthdayMonth ? '#F59E0B' : '#94A3B8' }}
          >
            <Gift size={11} />
            <span>{formatBirthday(analista.data_nascimento)}</span>
          </div>
        )}
      </div>

      {/* Bottom badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {analista.pdiAtivo && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(167,139,250,0.12)', color: '#A78BFA' }}
            >
              <BookOpen size={10} /> PDI
            </span>
          )}
          {analista.ciclos > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#8B949E' }}>
              <Activity size={10} /> {analista.ciclos} ciclo{analista.ciclos !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `${getStatusColor(analista.status)}15`,
            color: getStatusColor(analista.status),
          }}
        >
          {getStatusLabel(analista.status)}
        </span>
      </div>
    </div>
  );
}

// ─── Birthday Widget ──────────────────────────────────────────────────────────

function BirthdayWidget({ analistas }: { analistas: AnalistaGestao[] }) {
  const currentMonth = new Date().getMonth();
  const aniversariantes = analistas.filter(
    (a) => getBirthdayMonth(a.data_nascimento) === currentMonth && a.status !== 'desligado'
  );
  if (aniversariantes.length === 0) return null;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift size={16} style={{ color: '#F59E0B' }} />
        <h3 className="text-sm font-semibold text-white">Aniversariantes do Mês</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}
        >
          {aniversariantes.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {aniversariantes.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{
              backgroundColor: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
            >
              {a.nome.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">{a.nome.split(' ')[0]}</p>
              <p className="text-xs" style={{ color: '#F59E0B' }}>
                {formatBirthday(a.data_nascimento)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Company Time Ranking ─────────────────────────────────────────────────────

function CompanyTimeRanking({ analistas }: { analistas: AnalistaGestao[] }) {
  const ranked = [...analistas]
    .filter((a) => a.mesesEmpresa > 0 && a.status !== 'desligado')
    .sort((a, b) => b.mesesEmpresa - a.mesesEmpresa)
    .slice(0, 5);

  if (ranked.length === 0) return null;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} style={{ color: '#38BDF8' }} />
        <h3 className="text-sm font-semibold text-white">Maior Tempo de Empresa</h3>
      </div>
      <div className="space-y-2">
        {ranked.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3">
            <span
              className="text-xs font-bold w-5 text-center"
              style={{ color: i === 0 ? '#F59E0B' : '#8B949E' }}
            >
              #{i + 1}
            </span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2563EB)' }}
            >
              {a.nome.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{a.nome.split(' ')[0]}</p>
              <p className="text-xs" style={{ color: '#8B949E' }}>
                {a.squad || a.equipe || '—'}
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: '#38BDF8' }}>
              {a.tempoEmpresa}
            </span>
          </div>
        ))}
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
  const [sortBy, setSortBy] = useState<'nome' | 'tempo' | 'aniversario' | 'pdi'>('nome');
  const [selectedAnalista, setSelectedAnalista] = useState<AnalistaGestao | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      if (!supabase) return;

      const [analistasRes, scoresRes, pdisRes] = await Promise.all([
        supabase.from('analistas').select('*').order('nome'),
        supabase
          .from('cycle_scores')
          .select('analista, periodo, nota_final_qa, iepc_total, total_ncs')
          .order('periodo'),
        supabase.from('pdi_records').select('analista, status').eq('status', 'ativo'),
      ]);

      const analistasData = analistasRes.data || [];
      const scoresData = scoresRes.data || [];
      const pdisData = pdisRes.data || [];

      const activePdis = new Set(
        (pdisData as any[]).map((p: any) => (p.analista || '').toLowerCase().trim())
      );

      const computed: AnalistaGestao[] = analistasData.map((a: any) => {
        const nomeCompleto = (a.nome_completo || a.nome || '').toLowerCase().trim();
        const nomeShort = (a.nome || '').toLowerCase().trim();
        const firstName = nomeShort.split(' ')[0];
        const matchName = (n: string) => {
          const nl = (n || '').toLowerCase().trim();
          // Exact match first (most reliable)
          if (nl === nomeCompleto || nl === nomeShort) return true;
          // Prefix match: cycle_scores.analista starts with same first name AND last name token matches
          const nlParts = nl.split(' ');
          const nomeParts = nomeCompleto.split(' ');
          if (nlParts[0] === firstName && nlParts.length > 1 && nomeParts.length > 1) {
            return nlParts[nlParts.length - 1] === nomeParts[nomeParts.length - 1];
          }
          return false;
        };

        const analistaScores = (scoresData as any[])
          .filter((s: any) => matchName(s.analista || ''))
          .sort((a: any, b: any) => (a.periodo || '').localeCompare(b.periodo || ''));

        const avgQA =
          analistaScores.length > 0
            ? analistaScores.reduce((sum: number, s: any) => sum + (s.nota_final_qa || 0), 0) /
              analistaScores.length
            : 0;
        const avgIEPC =
          analistaScores.length > 0
            ? analistaScores.reduce((sum: number, s: any) => sum + (s.iepc_total || 0), 0) /
              analistaScores.length
            : 0;
        const totalNCs = analistaScores.reduce(
          (sum: number, s: any) => sum + (s.total_ncs || 0),
          0
        );

        const lastScore =
          analistaScores.length > 0 ? analistaScores[analistaScores.length - 1] : null;
        const prevScore =
          analistaScores.length > 1 ? analistaScores[analistaScores.length - 2] : null;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (lastScore && prevScore) {
          const diff = (lastScore.nota_final_qa || 0) - (prevScore.nota_final_qa || 0);
          if (diff > 2) trend = 'up';
          else if (diff < -2) trend = 'down';
        }

        let risco: 'alto' | 'medio' | 'baixo' = 'baixo';
        if (avgQA > 0 && avgQA < 60) risco = 'alto';
        else if (avgQA > 0 && avgQA < 75) risco = 'medio';
        else if (totalNCs > 5) risco = 'medio';

        const pdiAtivo = activePdis.has(nomeCompleto) || activePdis.has(nomeShort);
        const { label: tempoLabel, meses: mesesEmpresa } = calcTempoEmpresa(a.data_admissao);

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
          data_nascimento: a.data_nascimento || '',
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
          tempoEmpresa: tempoLabel,
          mesesEmpresa,
          pdiAtivo,
          reincidencia: analistaScores.filter((s: any) => (s.total_ncs || 0) > 0).length,
          scores: analistaScores.map((s: any) => ({
            periodo: s.periodo,
            qa: Number((s.nota_final_qa || 0).toFixed(1)),
            iepc: Number((s.iepc_total || 0).toFixed(1)),
          })),
        };
      });

      setAnalistas(computed);
    } catch (e) {
      console.error('Gestão load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const ativos = analistas.filter((a) => a.status === 'ativo').length;
    const comPdi = analistas.filter((a) => a.pdiAtivo).length;
    const currentMonth = new Date().getMonth();
    const aniversariantes = analistas.filter(
      (a) => getBirthdayMonth(a.data_nascimento) === currentMonth && a.status !== 'desligado'
    ).length;
    const avgTempo =
      analistas.filter((a) => a.mesesEmpresa > 0).length > 0
        ? Math.round(
            analistas.filter((a) => a.mesesEmpresa > 0).reduce((s, a) => s + a.mesesEmpresa, 0) /
              analistas.filter((a) => a.mesesEmpresa > 0).length
          )
        : 0;
    const avgTempoLabel = avgTempo < 12 ? `${avgTempo}m` : `${Math.floor(avgTempo / 12)}a`;
    const novos = analistas.filter((a) => a.mesesEmpresa <= 3 && a.mesesEmpresa > 0).length;
    return { total: analistas.length, ativos, comPdi, aniversariantes, avgTempoLabel, novos };
  }, [analistas]);

  const equipes = useMemo(() => {
    const set = new Set<string>();
    analistas.forEach((a) => {
      if (a.squad) set.add(a.squad);
      else if (a.equipe) set.add(a.equipe);
    });
    return Array.from(set).sort();
  }, [analistas]);

  const filtered = useMemo(() => {
    let list = analistas.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(
          a.nome.toLowerCase().includes(q) ||
          (a.nome_completo || '').toLowerCase().includes(q) ||
          (a.squad || '').toLowerCase().includes(q) ||
          (a.coordenador || '').toLowerCase().includes(q)
        ))
          return false;
      }
      if (filterEquipe && a.squad !== filterEquipe && a.equipe !== filterEquipe) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'tempo') return b.mesesEmpresa - a.mesesEmpresa;
      if (sortBy === 'aniversario') {
        const am = getBirthdayMonth(a.data_nascimento) ?? 99;
        const bm = getBirthdayMonth(b.data_nascimento) ?? 99;
        return am - bm;
      }
      if (sortBy === 'pdi') return (b.pdiAtivo ? 1 : 0) - (a.pdiAtivo ? 1 : 0);
      return 0;
    });

    return list;
  }, [analistas, search, filterEquipe, filterStatus, sortBy]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Pessoas</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
            Painel de acompanhamento humano e operacional — RH & Desenvolvimento
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
          {
            label: 'Total Analistas',
            value: stats.total,
            color: '#38BDF8',
            icon: <Users size={16} />,
          },
          { label: 'Ativos', value: stats.ativos, color: '#22C55E', icon: <UserCheck size={16} /> },
          {
            label: 'Aniversariantes',
            value: stats.aniversariantes,
            color: '#F59E0B',
            icon: <Gift size={16} />,
          },
          {
            label: 'Tempo Médio',
            value: stats.avgTempoLabel,
            color: '#A78BFA',
            icon: <Clock size={16} />,
          },
          {
            label: 'PDIs Ativos',
            value: stats.comPdi,
            color: '#818CF8',
            icon: <BookOpen size={16} />,
          },
          {
            label: 'Novos (≤3m)',
            value: stats.novos,
            color: '#34D399',
            icon: <UserPlus size={16} />,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-2xl"
            style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: kpi.color }}>
              {kpi.icon}
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                {kpi.label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BirthdayWidget analistas={analistas} />
        <CompanyTimeRanking analistas={analistas} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#94A3B8' }}
          />
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
            value: filterEquipe,
            onChange: setFilterEquipe,
            options: [
              { value: '', label: 'Todas equipes' },
              ...equipes.map((e) => ({ value: e, label: e })),
            ],
          },
          {
            value: filterStatus,
            onChange: setFilterStatus,
            options: [
              { value: '', label: 'Todos status' },
              { value: 'ativo', label: 'Ativo' },
              { value: 'ferias', label: 'Férias' },
              { value: 'afastado', label: 'Afastado' },
              { value: 'desligado', label: 'Desligado' },
            ],
          },
          {
            value: sortBy,
            onChange: (v: string) => setSortBy(v as typeof sortBy),
            options: [
              { value: 'nome', label: 'Ordenar: Nome' },
              { value: 'tempo', label: 'Ordenar: Tempo Empresa' },
              { value: 'aniversario', label: 'Ordenar: Aniversário' },
              { value: 'pdi', label: 'Ordenar: PDI Ativo' },
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
            {sel.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      <p className="text-sm" style={{ color: '#94A3B8' }}>
        {filtered.length} analista{filtered.length !== 1 ? 's' : ''} encontrado
        {filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin" style={{ color: '#38BDF8' }} />
          <span className="ml-3 text-sm" style={{ color: '#94A3B8' }}>
            Carregando dados...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="mb-3 opacity-20" style={{ color: '#94A3B8' }} />
          <p className="text-base font-semibold text-white mb-1">Nenhum analista encontrado</p>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {analistas.length === 0
              ? 'Cadastre analistas na página Analistas para visualizá-los aqui.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AnalystCard key={a.id} analista={a} onClick={() => setSelectedAnalista(a)} />
          ))}
        </div>
      )}

      {selectedAnalista && (
        <AnalystDetailDrawer
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
