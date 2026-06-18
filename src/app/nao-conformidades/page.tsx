'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchNCRecords, fetchAllPeriodos } from '@/lib/services/dataService';
import { AlertTriangle, Search, BarChart2, RefreshCw, TrendingDown, Shield, Layers, X, Eye, Trash2, Users, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area } from 'recharts';

// ── Official NC Model ─────────────────────────────────────────────────────────
// Penalidade pertence à severidade, NÃO ao tipo.
// Regra -20 removida definitivamente.
const NC_TIPOS = [
  {
    key: 'NC-1',
    nome: 'Postura e Ética Profissional',
    short: 'Postura e Ética',
    descricao: 'Desvio relacionado à conduta profissional, comportamento inadequado ou falta de ética.',
  },
  {
    key: 'NC-2',
    nome: 'Acuracidade e Rigor Técnico',
    short: 'Rigor Técnico',
    descricao: 'Falha técnica relevante: informação incorreta, diagnóstico errado ou solução inadequada.',
  },
  {
    key: 'NC-3',
    nome: 'Conformidade de Registro e Rastreabilidade',
    short: 'Registro e Rastreabilidade',
    descricao: 'Ausência ou falha de registros obrigatórios, documentação incompleta ou protocolo não gerado.',
  },
  {
    key: 'NC-4',
    nome: 'Integridade do Fluxo Operacional',
    short: 'Fluxo Operacional',
    descricao: 'Quebra do fluxo institucional, desvio de protocolo ou encaminhamento incorreto.',
  },
  {
    key: 'NC-5',
    nome: 'Segurança da Informação',
    short: 'Segurança da Informação',
    descricao: 'Violação de segurança, exposição de dados sensíveis ou acesso não autorizado.',
  },
];

// Severidade oficial — penalidade pertence à severidade
const SEVERIDADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; penalidade: number }> = {
  'Leve':    { label: 'Leve',    color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', penalidade: 3  },
  'Média':   { label: 'Média',   color: '#EAB308', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   penalidade: 5  },
  'Grave':   { label: 'Grave',   color: '#F97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  penalidade: 10 },
  'Crítica': { label: 'Crítica', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   penalidade: 15 },
};

const NC_NAME_MAP: Record<string, string> = {
  'Postura e Ética Profissional': 'NC-1',
  'Acuracidade e Rigor Técnico': 'NC-2',
  'Conformidade de Registro e Rastreabilidade': 'NC-3',
  'Registro e Rastreabilidade': 'NC-3',
  'Integridade do Fluxo Operacional': 'NC-4',
  'Segurança da Informação': 'NC-5',
  'Fluxo': 'NC-4', 'Técnico': 'NC-2', 'Registro': 'NC-3',
};

function resolveNCType(tipo: string): string {
  if (NC_TIPOS.find((t) => t.key === tipo)) return tipo;
  return NC_NAME_MAP[tipo] || tipo;
}

function parseNcDescricaoMeta(descricao?: string): { descricao: string; severity?: string; impacto?: string } {
  if (!descricao) return { descricao: '' };
  let clean = descricao;
  let severity: string | undefined;
  let impacto: string | undefined;
  const sevMatch = clean.match(/(?:^|\n\n)Severidade:\s*(.+?)(?:\n\n|$)/i);
  if (sevMatch) { severity = sevMatch[1].trim(); clean = clean.replace(/(?:^|\n\n)Severidade:\s*.+?(?:\n\n|$)/i, '\n').trim(); }
  const impMatch = clean.match(/(?:^|\n\n)Impacto operacional:\s*([\s\S]+)$/i);
  if (impMatch) { impacto = impMatch[1].trim(); clean = clean.replace(/(?:^|\n\n)Impacto operacional:\s*[\s\S]+$/i, '').trim(); }
  return { descricao: clean || descricao, severity, impacto };
}

interface NCRecord {
  id: string;
  analista: string;
  squad: string;
  coordenador?: string;
  tipo_nc: string;
  descricao?: string;
  pontos_deduzidos?: number;
  severidade?: string | null;
  penalidade?: number | null;
  protocolo_referencia?: string;
  periodo: string;
  status?: string;
}

interface NCDetailModal { nc: NCRecord; tipoInfo: typeof NC_TIPOS[0] | undefined }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

function SeveridadeBadge({ sev }: { sev?: string | null }) {
  if (!sev) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: 'rgba(100,116,139,0.08)', color: '#64748B', border: '1px solid rgba(100,116,139,0.15)' }}>
        Histórico Legado
      </span>
    );
  }
  const cfg = SEVERIDADE_CONFIG[sev];
  if (!cfg) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: 'rgba(100,116,139,0.08)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.15)' }}>
        {sev}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

function ReincidenciaBadge({ isReincidente }: { isReincidente: boolean }) {
  if (!isReincidente) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.15)' }}>
      ↩ Reincidente
    </span>
  );
}

function NCDetailModalComp({ data, onClose }: { data: NCDetailModal; onClose: () => void }) {
  const { nc, tipoInfo } = data;
  const meta = parseNcDescricaoMeta(nc.descricao);
  const sev = nc.severidade || meta.severity || null;
  const sevCfg = sev ? SEVERIDADE_CONFIG[sev] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#0F172A' }}>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#94A3B8' }}>{tipoInfo?.key || nc.tipo_nc}</p>
            <h2 className="text-sm font-bold text-white">{tipoInfo?.nome || nc.tipo_nc}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{nc.analista} · {nc.squad} · {nc.periodo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>Tipo NC</p>
              <p className="text-xs font-bold text-white">{tipoInfo?.key || nc.tipo_nc}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{tipoInfo?.short}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-2" style={{ color: '#64748B' }}>Severidade</p>
              <SeveridadeBadge sev={sev} />
              {sevCfg && (
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>Penalidade: {sevCfg.penalidade} pts</p>
              )}
            </div>
          </div>

          {meta.descricao && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#CBD5E1' }}>
                <Eye size={11} /> Evidência
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{meta.descricao}</p>
            </div>
          )}

          {meta.impacto && (
            <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#F59E0B' }}>Impacto Operacional</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{meta.impacto}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Coordenador</p>
              <p className="text-xs font-medium text-white">{nc.coordenador || '—'}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Protocolo</p>
              <p className="text-xs font-medium text-white font-mono">{nc.protocolo_referencia || '—'}</p>
            </div>
          </div>

          {tipoInfo?.descricao && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#64748B' }}>Definição do Tipo</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{tipoInfo.descricao}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NCContent() {
  const [importOpen, setImportOpen] = useState(false);
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSquad, setFilterSquad] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('all');
  const [filterAnalista, setFilterAnalista] = useState('all');
  const [filterCoordenador, setFilterCoordenador] = useState('all');
  const [filterReincidente, setFilterReincidente] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'charts'>('table');
  const [detailModal, setDetailModal] = useState<NCDetailModal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<NCRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tooltipNC, setTooltipNC] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, pList] = await Promise.all([fetchNCRecords(), fetchAllPeriodos()]);
      const mapped = (data as NCRecord[]).map((n) => ({ ...n, tipo_nc: resolveNCType(n.tipo_nc) }));
      setNcs(mapped);
      setPeriodos(pList);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleDeleteNC = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { deleteNCRecord } = await import('@/lib/services/dataService');
      const result = await deleteNCRecord(deleteConfirm.id);
      if (result.success) { setNcs((prev) => prev.filter((n) => n.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    } catch { /* ignore */ }
    setDeleting(false);
  };

  useEffect(() => { loadData(); }, []);

  const squads = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.squad).filter(Boolean)))], [ncs]);
  const analistas = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.analista).filter(Boolean))).sort()], [ncs]);
  const coordenadores = useMemo(() => ['all', ...Array.from(new Set(ncs.map((n) => n.coordenador).filter(Boolean))).sort()], [ncs]);

  const reincidenteSet = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    ncs.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = {};
      map[n.analista][n.tipo_nc] = (map[n.analista][n.tipo_nc] || 0) + 1;
    });
    const set = new Set<string>();
    Object.entries(map).forEach(([analista, types]) => {
      if (Object.values(types).some((c) => c >= 2)) set.add(analista);
    });
    return set;
  }, [ncs]);

  const filtered = useMemo(() => {
    let list = ncs;
    if (filterPeriodo !== 'all') list = list.filter((n) => n.periodo === filterPeriodo);
    if (filterSquad !== 'all') list = list.filter((n) => n.squad === filterSquad);
    if (filterType !== 'all') list = list.filter((n) => n.tipo_nc === filterType);
    if (filterAnalista !== 'all') list = list.filter((n) => n.analista === filterAnalista);
    if (filterCoordenador !== 'all') list = list.filter((n) => n.coordenador === filterCoordenador);
    if (filterReincidente) list = list.filter((n) => reincidenteSet.has(n.analista));
    if (search) list = list.filter((n) =>
      n.analista.toLowerCase().includes(search.toLowerCase()) ||
      (n.descricao || '').toLowerCase().includes(search.toLowerCase()) ||
      (n.protocolo_referencia || '').toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [ncs, filterSquad, filterType, filterPeriodo, filterAnalista, filterCoordenador, filterReincidente, search, reincidenteSet]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { map[n.tipo_nc] = (map[n.tipo_nc] || 0) + 1; });
    return map;
  }, [filtered]);

  const topAnalysts = useMemo(() => {
    const map: Record<string, { name: string; squad: string; coordenador: string; count: number; reincidente: boolean }> = {};
    filtered.forEach((n) => {
      if (!map[n.analista]) map[n.analista] = { name: n.analista, squad: n.squad, coordenador: n.coordenador || '—', count: 0, reincidente: reincidenteSet.has(n.analista) };
      map[n.analista].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered, reincidenteSet]);

  const ncsCriticas = useMemo(() => filtered.filter((n) => {
    const sev = (n.severidade || '').toLowerCase();
    return sev === 'crítica' || sev === 'critica' || n.tipo_nc === 'NC-5';
  }).length, [filtered]);

  const squadMaisAfetado = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { if (n.squad) map[n.squad] = (map[n.squad] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { squad: sorted[0][0], count: sorted[0][1] } : null;
  }, [filtered]);

  const byPeriodData = useMemo(() => {
    const map: Record<string, number> = {};
    ncs.forEach((n) => { map[n.periodo] = (map[n.periodo] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([periodo, count]) => ({ periodo, count }));
  }, [ncs]);

  const radarData = useMemo(() => NC_TIPOS.map((t) => ({ pilar: t.short, count: byType[t.key] || 0 })), [byType]);

  const bySquadData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { if (n.squad) map[n.squad] = (map[n.squad] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([squad, count]) => ({ squad: squad.length > 14 ? squad.slice(0, 14) + '…' : squad, count }));
  }, [filtered]);

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#CBD5E1',
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full" style={{ backgroundColor: '#0F172A', minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#F8FAFC' }}>Não Conformidades</h1>
          <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
            Gestão operacional · {filtered.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: '#64748B', border: '1px solid rgba(255,255,255,0.07)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1E293B', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.1)' }}>
            Importar NC
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total NCs', value: filtered.length, color: '#EF4444', icon: <AlertTriangle size={14} />, sub: 'no período filtrado' },
          { label: 'NCs Críticas', value: ncsCriticas, color: '#F97316', icon: <Shield size={14} />, sub: 'severidade crítica' },
          { label: 'Reincidentes', value: reincidenteSet.size, color: '#94A3B8', icon: <Layers size={14} />, sub: 'analistas com recorrência' },
          { label: 'Squad + Afetado', value: squadMaisAfetado?.squad || '—', color: '#EAB308', icon: <Users size={14} />, sub: squadMaisAfetado ? `${squadMaisAfetado.count} NCs` : 'sem dados' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: '#64748B' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <p className="text-xl font-semibold truncate" style={{ color: '#F8FAFC' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Nomenclatura Padronizada — guia conceitual, sem contadores ── */}
      <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs font-semibold" style={{ color: '#CBD5E1' }}>Nomenclatura Padronizada</p>
          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#64748B' }}>
            Guia conceitual · clique para filtrar
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {NC_TIPOS.map((t) => (
            <div key={t.key} className="relative">
              <button
                className="w-full text-left rounded-lg p-3 transition-all"
                style={{
                  backgroundColor: filterType === t.key ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${filterType === t.key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                }}
                onClick={() => setFilterType(filterType === t.key ? 'all' : t.key)}
                onMouseEnter={() => setTooltipNC(t.key)}
                onMouseLeave={() => setTooltipNC(null)}
              >
                <p className="text-xs font-bold mb-0.5" style={{ color: '#CBD5E1' }}>{t.key}</p>
                <p className="text-xs leading-snug" style={{ color: '#64748B' }}>{t.nome}</p>
              </button>
              {/* Tooltip on hover */}
              {tooltipNC === t.key && (
                <div className="absolute z-20 bottom-full left-0 mb-2 w-56 rounded-lg p-3 shadow-xl pointer-events-none"
                  style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#CBD5E1' }}>{t.key} — {t.nome}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{t.descricao}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Contagens aparecem aqui — fora dos cards de nomenclatura */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-xs" style={{ color: '#475569' }}>Distribuição no filtro atual:</span>
            {NC_TIPOS.filter((t) => byType[t.key] > 0).map((t) => (
              <span key={t.key} className="text-xs">
                <span style={{ color: '#94A3B8' }}>{t.key}</span>
                <span style={{ color: '#475569' }}> {byType[t.key]}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Severidade — guia de referência ── */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold" style={{ color: '#CBD5E1' }}>Severidade</p>
          <Info size={11} style={{ color: '#475569' }} />
          <span className="text-xs" style={{ color: '#475569' }}>A penalidade pertence à severidade, não ao tipo de NC</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SEVERIDADE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-xs" style={{ color: '#475569' }}>·</span>
              <span className="text-xs" style={{ color: '#64748B' }}>{cfg.penalidade} pts</span>
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(100,116,139,0.05)', border: '1px solid rgba(100,116,139,0.12)' }}>
            <span className="text-xs font-medium" style={{ color: '#64748B' }}>Histórico Legado</span>
            <span className="text-xs" style={{ color: '#475569' }}>· severidade não informada</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748B' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar analista, evidência ou protocolo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ ...selectStyle, color: '#CBD5E1' }} />
          </div>
          {[
            { value: filterPeriodo, onChange: setFilterPeriodo, options: [{ v: 'all', l: 'Todos os Ciclos' }, ...periodos.map(p => ({ v: p, l: p }))] },
            { value: filterSquad, onChange: setFilterSquad, options: [{ v: 'all', l: 'Todos os Squads' }, ...squads.filter(s => s !== 'all').map(s => ({ v: s, l: s }))] },
            { value: filterType, onChange: setFilterType, options: [{ v: 'all', l: 'Todos os Tipos' }, ...NC_TIPOS.map(t => ({ v: t.key, l: `${t.key} — ${t.short}` }))] },
            { value: filterAnalista, onChange: setFilterAnalista, options: [{ v: 'all', l: 'Todos os Analistas' }, ...analistas.filter(a => a !== 'all').map(a => ({ v: a, l: a }))] },
            { value: filterCoordenador, onChange: setFilterCoordenador, options: [{ v: 'all', l: 'Todos Coordenadores' }, ...coordenadores.filter(c => c !== 'all').map(c => ({ v: c, l: c }))] },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs outline-none" style={selectStyle}>
              {sel.options.map(o => <option key={o.v} value={o.v} style={{ backgroundColor: '#1E293B' }}>{o.l}</option>)}
            </select>
          ))}
          <button onClick={() => setFilterReincidente((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: filterReincidente ? 'rgba(148,163,184,0.1)' : 'rgba(255,255,255,0.02)',
              color: filterReincidente ? '#CBD5E1' : '#64748B',
              border: `1px solid ${filterReincidente ? 'rgba(148,163,184,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            <Layers size={11} /> Reincidentes
          </button>
        </div>
      </div>

      {/* ── View Toggle ── */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit mb-5"
        style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'table', label: 'Tabela', icon: <Layers size={12} /> },
          { id: 'charts', label: 'Gráficos', icon: <BarChart2 size={12} /> },
        ].map((v) => (
          <button key={v.id} onClick={() => setActiveView(v.id as any)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: activeView === v.id ? '#1E293B' : 'transparent',
              color: activeView === v.id ? '#CBD5E1' : '#64748B',
              border: activeView === v.id ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            }}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : activeView === 'table' ? (
        /* ── TABELA OPERACIONAL ── */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#0F172A' }}>
                  {['Analista / Squad', 'Tipo NC', 'Severidade', 'Evidência', 'Impacto Operacional', 'Reincidência', 'Protocolo', 'Ciclo', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-3 font-medium whitespace-nowrap text-[10px] uppercase tracking-wider"
                      style={{ color: '#475569' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 150).map((nc) => {
                  const tipoInfo = NC_TIPOS.find((t) => t.key === nc.tipo_nc);
                  const meta = parseNcDescricaoMeta(nc.descricao);
                  const sev = nc.severidade || meta.severity || null;
                  const isReincidente = reincidenteSet.has(nc.analista);
                  return (
                    <tr key={nc.id} className="hover:bg-white/[0.015] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="px-3 py-3">
                        <p className="font-medium" style={{ color: '#F8FAFC' }}>{nc.analista}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{nc.squad} · {nc.coordenador || '—'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-xs" style={{ color: '#CBD5E1' }}>{tipoInfo?.key || nc.tipo_nc}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>{tipoInfo?.short}</p>
                      </td>
                      <td className="px-3 py-3">
                        <SeveridadeBadge sev={sev} />
                      </td>
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {meta.descricao || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <p className="text-xs leading-relaxed line-clamp-2"
                          style={{ color: meta.impacto ? '#EAB308' : '#475569' }}>
                          {meta.impacto || '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <ReincidenciaBadge isReincidente={isReincidente} />
                        {!isReincidente && <span style={{ color: '#475569' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs" style={{ color: '#475569' }}>
                        {nc.protocolo_referencia || '—'}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: '#64748B' }}>{nc.periodo}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailModal({ nc, tipoInfo })}
                            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#475569' }}>
                            <Eye size={12} />
                          </button>
                          <button onClick={() => setDeleteConfirm(nc)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: '#475569' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center">
                    <AlertTriangle size={24} className="mx-auto mb-2 opacity-20" style={{ color: '#64748B' }} />
                    <p className="text-xs" style={{ color: '#64748B' }}>Nenhuma NC encontrada</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 150 && (
            <div className="px-4 py-2 text-xs text-center" style={{ color: '#475569', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              Exibindo 150 de {filtered.length} registros
            </div>
          )}
        </div>
      ) : (
        /* ── GRÁFICOS ── */
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Distribuição por tipo */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-4" style={{ color: '#CBD5E1' }}>Distribuição por Tipo</h3>
              <div className="space-y-3">
                {NC_TIPOS.map((t) => {
                  const count = byType[t.key] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  return (
                    <div key={t.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          <span className="font-semibold" style={{ color: '#CBD5E1' }}>{t.key}</span>
                          {' '}{t.short}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: '#F8FAFC' }}>{count}</span>
                          <span className="text-xs" style={{ color: '#475569' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#475569' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranking analistas */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color: '#CBD5E1' }}>
                <TrendingDown size={12} style={{ color: '#EF4444' }} /> Ranking por Analista
              </h3>
              <div className="space-y-2">
                {topAnalysts.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 py-1.5 px-2 rounded-lg"
                    style={{ backgroundColor: i === 0 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <span className="text-xs w-4 text-center" style={{ color: '#475569' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#F8FAFC' }}>{a.name}</p>
                      <p className="text-[10px]" style={{ color: '#475569' }}>{a.squad}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.reincidente && (
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(148,163,184,0.08)', color: '#94A3B8' }}>R</span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>{a.count}</span>
                    </div>
                  </div>
                ))}
                {topAnalysts.length === 0 && <p className="text-xs py-4 text-center" style={{ color: '#475569' }}>Nenhum dado</p>}
              </div>
            </div>

            {/* NCs por Squad */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-4" style={{ color: '#CBD5E1' }}>NCs por Squad</h3>
              {bySquadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bySquadData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} />
                    <YAxis type="category" dataKey="squad" tick={{ fill: '#64748B', fontSize: 10 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="NCs" fill="#475569" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs py-4 text-center" style={{ color: '#475569' }}>Sem dados</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Radar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-4" style={{ color: '#CBD5E1' }}>Radar por Tipo NC</h3>
              {radarData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="pilar" tick={{ fill: '#64748B', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: '#475569', fontSize: 9 }} />
                    <Radar name="NCs" dataKey="count" stroke="#64748B" fill="#64748B" fillOpacity={0.15} />
                    <Legend wrapperStyle={{ color: '#64748B', fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#475569' }}>Sem dados</p></div>}
            </div>

            {/* Tendência */}
            {byPeriodData.length > 1 ? (
              <div className="rounded-xl p-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-xs font-semibold mb-4" style={{ color: '#CBD5E1' }}>Tendência por Ciclo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={byPeriodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="ncGradV4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="periodo" tick={{ fill: '#475569', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name="NCs" stroke="#EF4444" fill="url(#ncGradV4)" strokeWidth={1.5} dot={{ fill: '#EF4444', r: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl p-5 flex items-center justify-center" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#475569' }}>Dados insuficientes para tendência</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />

      {detailModal && <NCDetailModalComp data={detailModal} onClose={() => setDetailModal(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-xl overflow-hidden" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-sm font-semibold" style={{ color: '#F8FAFC' }}>Excluir NC</h2>
              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#64748B' }}>
                <X size={13} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Excluir NC de <span className="font-semibold" style={{ color: '#F8FAFC' }}>{deleteConfirm.analista}</span> ({deleteConfirm.tipo_nc})?
              </p>
              <p className="text-xs" style={{ color: '#EF4444' }}>Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.07)' }}>
                  Cancelar
                </button>
                <button onClick={handleDeleteNC} disabled={deleting}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#EF4444', color: '#fff' }}>
                  {deleting ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={11} />}
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NaoConformidadesPage() {
  return (
    <EnterpriseLayout>
      <NCContent />
    </EnterpriseLayout>
  );
}
