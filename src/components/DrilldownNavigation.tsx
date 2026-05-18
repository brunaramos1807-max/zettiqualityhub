'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, BarChart2, User, ClipboardList, Phone, CheckSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DrilldownLevel = 'painel' | 'ciclo' | 'analista' | 'avaliacao' | 'atendimento' | 'criterios';

export interface DrilldownState {
  level: DrilldownLevel;
  ciclo?: string;
  analista?: { id: string; nome: string; squad: string };
  avaliacao?: { id: string; periodo: string; qa: number; iepc: number };
  atendimento?: { id: string; protocolo: string; data: string };
}

interface DrilldownBreadcrumbProps {
  state: DrilldownState;
  onNavigate: (level: DrilldownLevel) => void;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<DrilldownLevel, string> = {
  painel: 'Painel Executivo',
  ciclo: 'Ciclo',
  analista: 'Analista',
  avaliacao: 'Avaliação',
  atendimento: 'Atendimento',
  criterios: 'Critérios',
};

const LEVEL_ICONS: Record<DrilldownLevel, React.ReactNode> = {
  painel: <BarChart2 size={12} />,
  ciclo: <ClipboardList size={12} />,
  analista: <User size={12} />,
  avaliacao: <CheckSquare size={12} />,
  atendimento: <Phone size={12} />,
  criterios: <AlertTriangle size={12} />,
};

const LEVEL_ORDER: DrilldownLevel[] = ['painel', 'ciclo', 'analista', 'avaliacao', 'atendimento', 'criterios'];

export function DrilldownBreadcrumb({ state, onNavigate }: DrilldownBreadcrumbProps) {
  const currentIdx = LEVEL_ORDER.indexOf(state.level);
  const visibleLevels = LEVEL_ORDER.slice(0, currentIdx + 1);

  if (visibleLevels.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 flex-wrap mb-4">
      {visibleLevels.map((level, idx) => {
        const isLast = idx === visibleLevels.length - 1;
        const label = level === 'ciclo' && state.ciclo
          ? state.ciclo
          : level === 'analista' && state.analista ? state.analista.nome.split(' ')[0]
          : level === 'atendimento' && state.atendimento
          ? state.atendimento.protocolo
          : LEVEL_LABELS[level];

        return (
          <React.Fragment key={level}>
            <button
              onClick={() => !isLast && onNavigate(level)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color: isLast ? '#38BDF8' : 'rgba(255,255,255,0.45)',
                backgroundColor: isLast ? 'rgba(56,189,248,0.1)' : 'transparent',
                border: isLast ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                cursor: isLast ? 'default' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isLast) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)';
              }}
              onMouseLeave={(e) => {
                if (!isLast) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
              }}
            >
              {LEVEL_ICONS[level]}
              <span>{label}</span>
            </button>
            {!isLast && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── Ciclo Level ──────────────────────────────────────────────────────────────

interface CicloLevelProps {
  ciclo: string;
  onSelectAnalista: (analista: DrilldownState['analista']) => void;
  onBack: () => void;
}

export function CicloLevel({ ciclo, onSelectAnalista, onBack }: CicloLevelProps) {
  const [analistas, setAnalistas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('cycle_scores')
          .select('analista_nome, squad, qa_score, iepc_score, periodo')
          .eq('periodo', ciclo)
          .order('analista_nome');
        if (data) {
          // Group by analista
          const map: Record<string, any> = {};
          data.forEach((row: any) => {
            if (!map[row.analista_nome]) {
              map[row.analista_nome] = {
                id: row.analista_nome,
                nome: row.analista_nome,
                squad: row.squad,
                qa: 0,
                iepc: 0,
                count: 0,
              };
            }
            map[row.analista_nome].qa += row.qa_score || 0;
            map[row.analista_nome].iepc += row.iepc_score || 0;
            map[row.analista_nome].count += 1;
          });
          const list = Object.values(map).map((a: any) => ({
            ...a,
            qa: a.count > 0 ? a.qa / a.count : 0,
            iepc: a.count > 0 ? a.iepc / a.count : 0,
          }));
          setAnalistas(list.sort((a: any, b: any) => b.qa - a.qa));
        }
      } catch (e) {
        console.error('Erro ao carregar analistas:', e);
      }
      setLoading(false);
    };
    load();
  }, [ciclo]);

  const filtered = analistas.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.squad.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">Analistas — {ciclo}</h3>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{analistas.length} analistas neste ciclo</p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar analista ou squad..."
        className="w-full mb-4 px-3 py-2.5 rounded-xl text-sm"
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#F8FAFC',
          outline: 'none',
        }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelectAnalista({ id: a.id, nome: a.nome, squad: a.squad })}
              className="w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all group"
              style={{
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(56,189,248,0.06)';
                (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(56,189,248,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.06)';
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: a.qa >= 85 ? 'rgba(34,197,94,0.3)' : a.qa >= 70 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)' }}
                >
                  {a.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{a.nome}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{a.squad}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: a.qa >= 85 ? '#22C55E' : a.qa >= 70 ? '#F59E0B' : '#EF4444' }}>
                    {a.qa.toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>QA</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold" style={{ color: a.iepc >= 85 ? '#22C55E' : a.iepc >= 70 ? '#F59E0B' : '#EF4444' }}>
                    {a.iepc.toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>IEPC</p>
                </div>
                <ChevronRight size={14} style={{ color: '#94A3B8' }} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: '#94A3B8' }}>Nenhum analista encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Analista Level ───────────────────────────────────────────────────────────

interface AnalistaLevelProps {
  analista: NonNullable<DrilldownState['analista']>;
  ciclo: string;
  onSelectAvaliacao: (avaliacao: DrilldownState['avaliacao']) => void;
  onBack: () => void;
}

export function AnalistaLevel({ analista, ciclo, onSelectAvaliacao, onBack }: AnalistaLevelProps) {
  const [scores, setScores] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;
        const [scoresRes, ncsRes, elogiosRes] = await Promise.all([
          supabase.from('cycle_scores').select('*').eq('analista_nome', analista.nome).order('periodo', { ascending: false }),
          supabase.from('nc_records').select('*').eq('analista_nome', analista.nome).order('periodo', { ascending: false }),
          supabase.from('elogios').select('*').eq('analista_nome', analista.nome).order('periodo', { ascending: false }),
        ]);
        setScores(scoresRes.data || []);
        setNcs(ncsRes.data || []);
        setElogios(elogiosRes.data || []);
      } catch (e) {
        console.error('Erro ao carregar dados do analista:', e);
      }
      setLoading(false);
    };
    load();
  }, [analista.nome]);

  const currentScore = scores.find((s) => s.periodo === ciclo);
  const qaMedia = scores.length > 0 ? scores.reduce((acc, s) => acc + (s.qa_score || 0), 0) / scores.length : 0;
  const iepcMedia = scores.length > 0 ? scores.reduce((acc, s) => acc + (s.iepc_score || 0), 0) / scores.length : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">{analista.nome}</h3>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{analista.squad} · Ciclo {ciclo}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'QA Ciclo', value: currentScore ? `${(currentScore.qa_score || 0).toFixed(1)}%` : '—', color: currentScore?.qa_score >= 85 ? '#22C55E' : '#F59E0B' },
              { label: 'IEPC Ciclo', value: currentScore ? `${(currentScore.iepc_score || 0).toFixed(1)}%` : '—', color: currentScore?.iepc_score >= 85 ? '#22C55E' : '#F59E0B' },
              { label: 'NCs Total', value: String(ncs.length), color: ncs.length > 5 ? '#EF4444' : '#94A3B8' },
              { label: 'Elogios', value: String(elogios.length), color: '#F59E0B' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Histórico de avaliações */}
          <div>
            <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">Histórico de Avaliações</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {scores.map((score) => (
                <button
                  key={score.id || score.periodo}
                  onClick={() => onSelectAvaliacao({
                    id: score.id || score.periodo,
                    periodo: score.periodo,
                    qa: score.qa_score || 0,
                    iepc: score.iepc_score || 0,
                  })}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(56,189,248,0.06)';
                    (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(56,189,248,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.06)';
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{score.periodo}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{score.squad || analista.squad}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{ color: (score.qa_score || 0) >= 85 ? '#22C55E' : '#F59E0B' }}>
                        {(score.qa_score || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>QA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold" style={{ color: (score.iepc_score || 0) >= 85 ? '#22C55E' : '#F59E0B' }}>
                        {(score.iepc_score || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>IEPC</p>
                    </div>
                    <ChevronRight size={14} style={{ color: '#94A3B8' }} />
                  </div>
                </button>
              ))}
              {scores.length === 0 && (
                <p className="text-center py-6 text-sm" style={{ color: '#94A3B8' }}>Nenhuma avaliação encontrada</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Avaliação Level ──────────────────────────────────────────────────────────

interface AvaliacaoLevelProps {
  avaliacao: NonNullable<DrilldownState['avaliacao']>;
  analista: NonNullable<DrilldownState['analista']>;
  onSelectAtendimento: (atendimento: DrilldownState['atendimento']) => void;
  onBack: () => void;
}

export function AvaliacaoLevel({ avaliacao, analista, onSelectAtendimento, onBack }: AvaliacaoLevelProps) {
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('cycle_scores')
          .select('*')
          .eq('analista_nome', analista.nome)
          .eq('periodo', avaliacao.periodo)
          .order('created_at', { ascending: false });
        setAtendimentos(data || []);
      } catch (e) {
        console.error('Erro ao carregar atendimentos:', e);
      }
      setLoading(false);
    };
    load();
  }, [analista.nome, avaliacao.periodo]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">Avaliação — {avaliacao.periodo}</h3>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{analista.nome} · {analista.squad}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <p className="text-2xl font-bold" style={{ color: avaliacao.qa >= 85 ? '#22C55E' : '#F59E0B' }}>{avaliacao.qa.toFixed(1)}%</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>QA Médio</p>
        </div>
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
          <p className="text-2xl font-bold" style={{ color: avaliacao.iepc >= 85 ? '#22C55E' : '#F59E0B' }}>{avaliacao.iepc.toFixed(1)}%</p>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>IEPC Médio</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
        </div>
      ) : (
        <div>
          <h4 className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">Atendimentos Avaliados</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {atendimentos.map((at, idx) => (
              <button
                key={at.id || idx}
                onClick={() => onSelectAtendimento({
                  id: at.id || String(idx),
                  protocolo: at.protocolo || at.atendimento_id || `AT-${idx + 1}`,
                  data: at.data_avaliacao || at.created_at || avaliacao.periodo,
                })}
                className="w-full flex items-center justify-between p-3 rounded-xl text-left transition-all"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(56,189,248,0.06)';
                  (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(56,189,248,0.15)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(255,255,255,0.06)';
                }}
              >
                <div>
                  <p className="text-sm font-medium text-white">{at.protocolo || at.atendimento_id || `Atendimento ${idx + 1}`}</p>
                  <p className="text-xs" style={{ color: '#94A3B8' }}>{at.data_avaliacao ? new Date(at.data_avaliacao).toLocaleDateString('pt-BR') : avaliacao.periodo}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold" style={{ color: (at.qa_score || 0) >= 85 ? '#22C55E' : '#F59E0B' }}>
                    {(at.qa_score || 0).toFixed(1)}%
                  </span>
                  <ChevronRight size={14} style={{ color: '#94A3B8' }} />
                </div>
              </button>
            ))}
            {atendimentos.length === 0 && (
              <p className="text-center py-6 text-sm" style={{ color: '#94A3B8' }}>Nenhum atendimento encontrado</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Atendimento Level ────────────────────────────────────────────────────────

interface AtendimentoLevelProps {
  atendimento: NonNullable<DrilldownState['atendimento']>;
  analista: NonNullable<DrilldownState['analista']>;
  avaliacao: NonNullable<DrilldownState['avaliacao']>;
  onViewCriterios: () => void;
  onBack: () => void;
}

export function AtendimentoLevel({ atendimento, analista, avaliacao, onViewCriterios, onBack }: AtendimentoLevelProps) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('cycle_scores')
          .select('*')
          .eq('id', atendimento.id)
          .single();
        setRecord(data);
      } catch (e) {
        console.error('Erro ao carregar atendimento:', e);
      }
      setLoading(false);
    };
    load();
  }, [atendimento.id]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">Atendimento — {atendimento.protocolo}</h3>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{analista.nome} · {avaliacao.periodo}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Protocolo', value: atendimento.protocolo },
              { label: 'Data', value: atendimento.data ? new Date(atendimento.data).toLocaleDateString('pt-BR') : '—' },
              { label: 'QA Score', value: record ? `${(record.qa_score || 0).toFixed(1)}%` : '—' },
              { label: 'IEPC Score', value: record ? `${(record.iepc_score || 0).toFixed(1)}%` : '—' },
              { label: 'Squad', value: analista.squad },
              { label: 'Período', value: avaliacao.periodo },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>{item.label}</p>
                <p className="text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {record?.observacoes && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-semibold text-white mb-2">Observações</p>
              <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{record.observacoes}</p>
            </div>
          )}

          <button
            onClick={onViewCriterios}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            <CheckSquare size={15} style={{ color: '#38BDF8' }} />
            <span style={{ color: '#38BDF8' }}>Ver Critérios de Avaliação</span>
            <ChevronRight size={14} style={{ color: '#38BDF8' }} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Critérios Level ──────────────────────────────────────────────────────────

interface CriteriosLevelProps {
  atendimento: NonNullable<DrilldownState['atendimento']>;
  analista: NonNullable<DrilldownState['analista']>;
  avaliacao: NonNullable<DrilldownState['avaliacao']>;
  onBack: () => void;
}

export function CriteriosLevel({ atendimento, analista, avaliacao, onBack }: CriteriosLevelProps) {
  const [criterios, setCriterios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase
          .from('cycle_scores')
          .select('*')
          .eq('id', atendimento.id)
          .single();
        if (data) {
          // Build criteria from score fields
          const criteriosList = [];
          if (data.postura_etica !== undefined) criteriosList.push({ nome: 'Postura e Ética', score: data.postura_etica, peso: 20 });
          if (data.acuracidade_tecnica !== undefined) criteriosList.push({ nome: 'Acuracidade Técnica', score: data.acuracidade_tecnica, peso: 25 });
          if (data.rastreabilidade !== undefined) criteriosList.push({ nome: 'Rastreabilidade', score: data.rastreabilidade, peso: 20 });
          if (data.fluxo_operacional !== undefined) criteriosList.push({ nome: 'Fluxo Operacional', score: data.fluxo_operacional, peso: 20 });
          if (data.seguranca_informacao !== undefined) criteriosList.push({ nome: 'Segurança da Informação', score: data.seguranca_informacao, peso: 15 });
          // Fallback: show qa/iepc breakdown
          if (criteriosList.length === 0) {
            criteriosList.push(
              { nome: 'QA Score', score: data.qa_score || 0, peso: 50 },
              { nome: 'IEPC Score', score: data.iepc_score || 0, peso: 50 },
            );
          }
          setCriterios(criteriosList);
        }
      } catch (e) {
        console.error('Erro ao carregar critérios:', e);
      }
      setLoading(false);
    };
    load();
  }, [atendimento.id]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
          <ChevronLeft size={16} />
        </button>
        <div>
          <h3 className="text-base font-bold text-white">Critérios — {atendimento.protocolo}</h3>
          <p className="text-xs" style={{ color: '#94A3B8' }}>{analista.nome} · {avaliacao.periodo}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin" style={{ color: '#38BDF8' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {criterios.map((c, i) => {
            const score = typeof c.score === 'number' ? c.score : 0;
            const color = score >= 85 ? '#22C55E' : score >= 70 ? '#F59E0B' : '#EF4444';
            return (
              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.nome}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>Peso: {c.peso}%</p>
                  </div>
                  <span className="text-lg font-bold" style={{ color }}>{score.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
                  />
                </div>
                {score < 70 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertTriangle size={11} style={{ color: '#EF4444' }} />
                    <p className="text-xs" style={{ color: '#EF4444' }}>Abaixo do mínimo — requer atenção</p>
                  </div>
                )}
              </div>
            );
          })}
          {criterios.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: '#94A3B8' }}>Nenhum critério disponível para este atendimento</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Drilldown Panel ─────────────────────────────────────────────────────

interface DrilldownPanelProps {
  initialCiclo?: string;
  onClose: () => void;
}

export function DrilldownPanel({ initialCiclo, onClose }: DrilldownPanelProps) {
  const [state, setState] = useState<DrilldownState>({
    level: initialCiclo ? 'ciclo' : 'painel',
    ciclo: initialCiclo,
  });

  const navigateTo = useCallback((level: DrilldownLevel) => {
    setState((prev) => ({ ...prev, level }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          backgroundColor: '#0F1B31',
          border: '1px solid rgba(56,189,248,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} style={{ color: '#38BDF8' }} />
            <span className="text-sm font-bold text-white">Drilldown Operacional</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#94A3B8' }}>
            <X size={16} />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-5 pt-4">
          <DrilldownBreadcrumb state={state} onNavigate={navigateTo} />
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {state.level === 'ciclo' && state.ciclo && (
            <CicloLevel
              ciclo={state.ciclo}
              onSelectAnalista={(analista) => setState((prev) => ({ ...prev, level: 'analista', analista }))}
              onBack={() => setState((prev) => ({ ...prev, level: 'painel' }))}
            />
          )}
          {state.level === 'analista' && state.analista && state.ciclo && (
            <AnalistaLevel
              analista={state.analista}
              ciclo={state.ciclo}
              onSelectAvaliacao={(avaliacao) => setState((prev) => ({ ...prev, level: 'avaliacao', avaliacao }))}
              onBack={() => setState((prev) => ({ ...prev, level: 'ciclo' }))}
            />
          )}
          {state.level === 'avaliacao' && state.avaliacao && state.analista && (
            <AvaliacaoLevel
              avaliacao={state.avaliacao}
              analista={state.analista}
              onSelectAtendimento={(atendimento) => setState((prev) => ({ ...prev, level: 'atendimento', atendimento }))}
              onBack={() => setState((prev) => ({ ...prev, level: 'analista' }))}
            />
          )}
          {state.level === 'atendimento' && state.atendimento && state.analista && state.avaliacao && (
            <AtendimentoLevel
              atendimento={state.atendimento}
              analista={state.analista}
              avaliacao={state.avaliacao}
              onViewCriterios={() => setState((prev) => ({ ...prev, level: 'criterios' }))}
              onBack={() => setState((prev) => ({ ...prev, level: 'avaliacao' }))}
            />
          )}
          {state.level === 'criterios' && state.atendimento && state.analista && state.avaliacao && (
            <CriteriosLevel
              atendimento={state.atendimento}
              analista={state.analista}
              avaliacao={state.avaliacao}
              onBack={() => setState((prev) => ({ ...prev, level: 'atendimento' }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
