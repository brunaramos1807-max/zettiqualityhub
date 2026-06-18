'use client';
import React, { useState, useMemo, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import ImportModal from '@/components/ImportModal';
import { fetchNCRecords, fetchAllPeriodos } from '@/lib/services/dataService';

import { AlertTriangle, Search, BarChart2, RefreshCw, TrendingDown, Shield, Layers, X, Eye, Trash2, Zap, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, AreaChart, Area } from 'recharts';

const NC_TYPES = [
  { key: 'NC-1', fullName: 'NC-1 — Postura e Ética Profissional', short: 'Postura e Ética', color: '#94A3B8', icon: '🤝', criticidade: 'Alta' },
  { key: 'NC-2', fullName: 'NC-2 — Acuracidade e Rigor Técnico', short: 'Rigor Técnico', color: '#CBD5E1', icon: '🎯', criticidade: 'Alta' },
  { key: 'NC-3', fullName: 'NC-3 — Registro e Rastreabilidade', short: 'Rastreabilidade', color: '#94A3B8', icon: '📋', criticidade: 'Média' },
  { key: 'NC-4', fullName: 'NC-4 — Integridade do Fluxo Operacional', short: 'Fluxo Operacional', color: '#CBD5E1', icon: '⚙️', criticidade: 'Alta' },
  { key: 'NC-5', fullName: 'NC-5 — Segurança da Informação', short: 'Segurança', color: '#F87171', icon: '🔒', criticidade: 'Crítica' },
];

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
  if (NC_TYPES.find((t) => t.key === tipo)) return tipo;
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
  protocolo_referencia?: string;
  periodo: string;
  status?: string;
  severidade?: string;
}

interface NCDetailModal { nc: NCRecord; typeInfo: typeof NC_TYPES[0] | undefined }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs shadow-xl" style={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold text-white">{p.value}</span></p>
      ))}
    </div>
  );
};

function getSeveridadeColor(sev?: string): string {
  if (!sev) return '#64748B';
  const s = sev.toLowerCase();
  if (s === 'crítica' || s === 'critica' || s === 'critical') return '#EF4444';
  if (s === 'grave' || s === 'alta' || s === 'high') return '#F97316';
  if (s === 'moderada' || s === 'media' || s === 'média' || s === 'medium') return '#EAB308';
  if (s === 'leve' || s === 'baixa' || s === 'low') return '#94A3B8';
  return '#64748B';
}

function SeveridadeBadge({ sev }: { sev?: string }) {
  const color = getSeveridadeColor(sev);
  const label = sev || 'Não informada';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', color, border: `1px solid rgba(255,255,255,0.08)` }}>
      {label}
    </span>
  );
}

function ReincidenciaBadge({ isReincidente }: { isReincidente: boolean }) {
  if (!isReincidente) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
      ↩ Reincidente
    </span>
  );
}

function NCDetailModalComp({ data, onClose }: { data: NCDetailModal; onClose: () => void }) {
  const { nc, typeInfo } = data;
  const meta = parseNcDescricaoMeta(nc.descricao);
  const sev = nc.severidade || meta.severity;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>
        {/* Header: type + analyst */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `linear-gradient(135deg, ${typeInfo?.color || '#EF4444'}15, transparent)` }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{typeInfo?.icon}</span>
              <p className="text-sm font-bold" style={{ color: typeInfo?.color || '#EF4444' }}>{typeInfo?.fullName || nc.tipo_nc}</p>
            </div>
            <h2 className="text-lg font-bold text-white">{nc.analista}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{nc.squad} · {nc.coordenador || '—'} · {nc.periodo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5" style={{ color: '#94A3B8' }}><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Primary info: type, severity, recurrence, impact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Tipo NC</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold"
                style={{ backgroundColor: `${typeInfo?.color || '#EF4444'}15`, color: typeInfo?.color || '#EF4444' }}>
                {typeInfo?.icon} {typeInfo?.key || nc.tipo_nc}
              </span>
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{typeInfo?.short}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Severidade</p>
              <SeveridadeBadge sev={sev} />
              <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Criticidade: {typeInfo?.criticidade || '—'}</p>
            </div>
          </div>

          {/* Evidence */}
          {meta.descricao && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#38BDF8' }}>
                <Eye size={11} /> Evidência
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{meta.descricao}</p>
            </div>
          )}

          {/* Operational impact */}
          {meta.impacto && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#F59E0B' }}>Impacto Operacional</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{meta.impacto}</p>
            </div>
          )}

          {/* Recurrence + Protocol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Reincidência</p>
              <p className="text-sm font-semibold text-white">Verificar histórico</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Protocolo</p>
              <p className="text-sm font-semibold text-white font-mono">{nc.protocolo_referencia || '—'}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#F87171' }}>Recomendação</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Revisar protocolo de {typeInfo?.short || nc.tipo_nc}. Considerar vinculação a PDI para acompanhamento contínuo.
            </p>
          </div>
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
    return sev === 'crítica' || sev === 'critica' || sev === 'critical' || n.tipo_nc === 'NC-5';
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

  const radarData = useMemo(() => NC_TYPES.map((t) => ({ pilar: t.short, count: byType[t.key] || 0 })), [byType]);
  const donutData = NC_TYPES.map((t) => ({ name: t.short, value: byType[t.key] || 0, color: t.color })).filter((d) => d.value > 0);

  const bySquadData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((n) => { if (n.squad) map[n.squad] = (map[n.squad] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([squad, count]) => ({ squad: squad.length > 12 ? squad.slice(0, 12) + '…' : squad, count }));
  }, [filtered]);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Não Conformidades</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Gestão operacional de NCs · {filtered.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 rounded-lg transition-colors" style={{ color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#1E40AF' }}>
            Importar
          </button>
        </div>
      </div>

      {/* KPI Cards — operational focus, no points-deducted prominence */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total NCs', value: filtered.length, color: '#EF4444', icon: <AlertTriangle size={16} />, bg: 'rgba(239,68,68,0.08)', sub: 'registradas no período' },
          { label: 'NCs Críticas', value: ncsCriticas, color: '#DC2626', icon: <Zap size={16} />, bg: 'rgba(220,38,38,0.08)', sub: 'alta severidade' },
          { label: 'Reincidentes', value: reincidenteSet.size, color: '#7C3AED', icon: <Layers size={16} />, bg: 'rgba(124,58,237,0.08)', sub: 'analistas com recorrência' },
          { label: 'Squad + Afetado', value: squadMaisAfetado?.squad || '—', color: '#F59E0B', icon: <Users size={16} />, bg: 'rgba(245,158,11,0.08)', sub: squadMaisAfetado ? `${squadMaisAfetado.count} NCs` : 'sem dados' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-xl font-bold text-white truncate">{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* NC Type Legend — clean executive style, no counters inside cards */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold text-white mb-3">Nomenclatura Padronizada</p>
        <div className="flex flex-wrap gap-2">
          {NC_TYPES.map((t) => (
            <button
              key={t.key}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:opacity-80"
              style={{
                backgroundColor: filterType === t.key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterType === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
              onClick={() => setFilterType(filterType === t.key ? 'all' : t.key)}
            >
              <span className="text-xs font-bold" style={{ color: '#CBD5E1' }}>{t.key}</span>
              <span className="text-xs" style={{ color: '#64748B' }}>{t.short}</span>
              {/* Severity label only — no count badges inside type cards */}
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8', fontSize: 9 }}>{t.criticidade}</span>
            </button>
          ))}
        </div>
        {/* Counts appear here — in the summary area, not inside type cards */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {NC_TYPES.filter((t) => byType[t.key] > 0).map((t) => (
              <span key={t.key} className="text-xs" style={{ color: '#64748B' }}>
                <span className="font-semibold" style={{ color: '#94A3B8' }}>{t.key}</span>: {byType[t.key]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar analista, evidência ou protocolo..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
          {[
            { value: filterPeriodo, onChange: setFilterPeriodo, options: [{ v: 'all', l: 'Todos os Ciclos' }, ...periodos.map(p => ({ v: p, l: p }))] },
            { value: filterSquad, onChange: setFilterSquad, options: [{ v: 'all', l: 'Todos os Squads' }, ...squads.filter(s => s !== 'all').map(s => ({ v: s, l: s }))] },
            { value: filterType, onChange: setFilterType, options: [{ v: 'all', l: 'Todos os Tipos' }, ...NC_TYPES.map(t => ({ v: t.key, l: `${t.key} — ${t.short}` }))] },
            { value: filterAnalista, onChange: setFilterAnalista, options: [{ v: 'all', l: 'Todos os Analistas' }, ...analistas.filter(a => a !== 'all').map(a => ({ v: a, l: a }))] },
            { value: filterCoordenador, onChange: setFilterCoordenador, options: [{ v: 'all', l: 'Todos Coordenadores' }, ...coordenadores.filter(c => c !== 'all').map(c => ({ v: c, l: c }))] },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
          <button onClick={() => setFilterReincidente((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: filterReincidente ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', color: filterReincidente ? '#A78BFA' : '#94A3B8', border: `1px solid ${filterReincidente ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
            <Layers size={12} /> Reincidentes
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit mb-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { id: 'table', label: 'Tabela Operacional', icon: <Layers size={13} /> },
          { id: 'charts', label: 'Painéis & Gráficos', icon: <BarChart2 size={13} /> },
        ].map((v) => (
          <button key={v.id} onClick={() => setActiveView(v.id as any)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: activeView === v.id ? '#1E40AF' : 'transparent', color: activeView === v.id ? '#fff' : '#94A3B8' }}>
            {v.icon}{v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeView === 'table' ? (
        /* ── OPERATIONAL TABLE — primary info: type, severity, evidence, recurrence, impact ── */
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  {['Analista / Squad', 'Tipo NC', 'Severidade', 'Evidência', 'Impacto Operacional', 'Reincidência', 'Protocolo', 'Ciclo', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-3 font-semibold whitespace-nowrap text-[10px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 150).map((nc) => {
                  const typeInfo = NC_TYPES.find((t) => t.key === nc.tipo_nc);
                  const meta = parseNcDescricaoMeta(nc.descricao);
                  const sev = nc.severidade || meta.severity;
                  const isReincidente = reincidenteSet.has(nc.analista);
                  return (
                    <tr key={nc.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      {/* Analyst + Squad */}
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{nc.analista}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{nc.squad} · {nc.coordenador || '—'}</p>
                      </td>
                      {/* Type NC — prominent */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ backgroundColor: `${typeInfo?.color || '#64748B'}15`, color: typeInfo?.color || '#64748B', border: `1px solid ${typeInfo?.color || '#64748B'}30` }}>
                          {typeInfo?.icon} {typeInfo?.key || nc.tipo_nc}
                        </span>
                        <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{typeInfo?.short}</p>
                      </td>
                      {/* Severity — prominent */}
                      <td className="px-3 py-3">
                        <SeveridadeBadge sev={sev} />
                      </td>
                      {/* Evidence */}
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {meta.descricao || '—'}
                        </p>
                      </td>
                      {/* Operational Impact */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: meta.impacto ? '#F59E0B' : '#64748B' }}>
                          {meta.impacto || '—'}
                        </p>
                      </td>
                      {/* Recurrence — prominent */}
                      <td className="px-3 py-3">
                        <ReincidenciaBadge isReincidente={isReincidente} />
                        {!isReincidente && <span className="text-xs" style={{ color: '#64748B' }}>—</span>}
                      </td>
                      {/* Protocol */}
                      <td className="px-3 py-3 font-mono text-xs" style={{ color: '#64748B' }}>
                        {nc.protocolo_referencia || '—'}
                      </td>
                      {/* Cycle */}
                      <td className="px-3 py-3 text-xs font-medium" style={{ color: '#38BDF8' }}>{nc.periodo}</td>
                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailModal({ nc, typeInfo })} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#64748B' }} title="Ver detalhes">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(nc)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: '#64748B' }} title="Excluir">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#94A3B8' }}>
                    <AlertTriangle size={28} className="mx-auto mb-2 opacity-20" />
                    <p>Nenhuma NC encontrada</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 150 && (
            <div className="px-4 py-2 text-xs text-center" style={{ color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              Exibindo 150 de {filtered.length} registros
            </div>
          )}
        </div>
      ) : (
        /* ── CHARTS VIEW ── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Type distribution */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Shield size={14} style={{ color: '#38BDF8' }} /> Distribuição por Tipo</h3>
              <div className="space-y-3">
                {NC_TYPES.map((t) => {
                  const count = byType[t.key] || 0;
                  const pct = filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0;
                  return (
                    <div key={t.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                          <span>{t.icon}</span>
                          <span className="font-semibold" style={{ color: t.color }}>{t.key}</span>
                          <span>{t.short}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{count}</span>
                          <span className="text-xs" style={{ color: '#64748B' }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top analysts */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><TrendingDown size={14} style={{ color: '#EF4444' }} /> Ranking por Analista</h3>
              <div className="space-y-2">
                {topAnalysts.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3 py-1.5 rounded-lg px-2" style={{ backgroundColor: i === 0 ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? '#EF4444' : '#94A3B8' }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{a.name}</p>
                      <p className="text-[10px]" style={{ color: '#94A3B8' }}>{a.squad}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {a.reincidente && <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>R</span>}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>{a.count}</span>
                    </div>
                  </div>
                ))}
                {topAnalysts.length === 0 && <p className="text-xs py-4 text-center" style={{ color: '#94A3B8' }}>Nenhum dado</p>}
              </div>
            </div>

            {/* Squad distribution */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Users size={14} style={{ color: '#F59E0B' }} /> NCs por Squad</h3>
              {bySquadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bySquadData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="squad" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="NCs" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs py-4 text-center" style={{ color: '#94A3B8' }}>Sem dados</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-semibold text-white mb-4">Radar por Tipo NC</h3>
              {radarData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="pilar" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                    <Radar name="NCs" dataKey="count" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ color: '#94A3B8', fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-48"><p className="text-xs" style={{ color: '#94A3B8' }}>Sem dados</p></div>}
            </div>

            {/* Trend */}
            {byPeriodData.length > 1 ? (
              <div className="rounded-xl p-5" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Tendência por Ciclo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={byPeriodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="ncGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="periodo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name="NCs" stroke="#EF4444" fill="url(#ncGrad)" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl p-5 flex items-center justify-center" style={{ backgroundColor: '#0F1B31', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs" style={{ color: '#94A3B8' }}>Dados insuficientes para tendência</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      {detailModal && <NCDetailModalComp data={detailModal} onClose={() => setDetailModal(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ backgroundColor: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-sm font-bold text-white">Excluir NC</h2>
              <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#94A3B8' }}><X size={14} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Excluir NC de <span className="font-semibold text-white">{deleteConfirm.analista}</span> ({deleteConfirm.tipo_nc})?
              </p>
              <p className="text-xs" style={{ color: '#EF4444' }}>Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Cancelar
                </button>
                <button onClick={handleDeleteNC} disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#EF4444', color: '#fff' }}>
                  {deleting ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />}
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
