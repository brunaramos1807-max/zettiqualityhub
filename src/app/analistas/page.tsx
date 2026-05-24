'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import {
  fetchAnalistas, upsertAnalista, deleteAnalista, calcTempoEmpresa,
  fetchCycleScores, fetchNCRecords, fetchElogios, fetchPDIRecords,
  type AnalistaRecord,
} from '@/lib/services/dataService';
import { getScoreColor } from '@/lib/mockData';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Plus, X, Edit2, Trash2, User, TrendingUp, Star, AlertTriangle, Save, Users, Clock, Award, Shield, Upload, RefreshCw, Search, Phone, Mail, Calendar, Briefcase, Hash, Eye, Activity, Target, BarChart2,  } from 'lucide-react';

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: '#161B22',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1C2333',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '0.5rem',
  color: '#C9D1D9',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalistaFormState {
  nome: string;
  nome_completo: string;
  email: string;
  telefone: string;
  cargo_operacional: string;
  nivel: string;
  coordenador: string;
  squad: string;
  status: 'ativo' | 'ferias' | 'afastado' | 'desligado';
  data_admissao: string;
  aniversario: string;
  ultima_promocao: string;
  observacoes: string;
  foto_url: string;
}

const EMPTY_FORM: AnalistaFormState = {
  nome: '', nome_completo: '', email: '', telefone: '',
  cargo_operacional: 'Analista', nivel: 'Júnior',
  coordenador: '', squad: '', status: 'ativo',
  data_admissao: '', aniversario: '', ultima_promocao: '', observacoes: '',
  foto_url: '',
};

const CARGO_OPTIONS = ['Analista', 'Analista Sênior', 'Especialista', 'Coordenador', 'Supervisor', 'Gerente'];
const NIVEL_OPTIONS = ['Júnior', 'Pleno', 'Sênior', 'Especialista'];
const EQUIPE_OPTIONS = ['PDV', 'PDV N1', 'Compras e Estoque', 'Financeiro Fiscal'];
const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', color: '#22C55E' },
  { value: 'ferias', label: 'Férias', color: '#EAB308' },
  { value: 'afastado', label: 'Afastado', color: '#F97316' },
  { value: 'desligado', label: 'Desligado', color: '#EF4444' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
  } catch { return dateStr; }
}

function tempoEmpresaLabel(meses: number): string {
  if (!meses || meses <= 0) return '—';
  if (meses < 12) return `${meses} mês${meses !== 1 ? 'es' : ''}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto > 0 ? `${anos} ano${anos !== 1 ? 's' : ''} e ${resto} mês${resto !== 1 ? 'es' : ''}` : `${anos} ano${anos !== 1 ? 's' : ''}`;
}

function getStatusStyle(status: string) {
  const s = STATUS_OPTIONS.find((o) => o.value === status);
  return { color: s?.color || '#8B949E', label: s?.label || status };
}

// ─── 360° Profile View ────────────────────────────────────────────────────────
interface Profile360Props {
  analista: AnalistaRecord;
  onClose: () => void;
}

function Profile360({ analista, onClose }: Profile360Props) {
  const [scores, setScores] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [pdis, setPdis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'avaliacoes' | 'ncs' | 'elogios' | 'pdis'>('overview');

  const nomeLower = (analista.nome_completo || analista.nome || '').toLowerCase().trim();
  const nomeShort = (analista.nome || '').toLowerCase().trim();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allScores, allNcs, allElogios, allPdis] = await Promise.all([
          fetchCycleScores(),
          fetchNCRecords(),
          fetchElogios(),
          fetchPDIRecords(),
        ]);
        const matchName = (n: string) => {
          const nl = n.toLowerCase().trim();
          return nl === nomeLower || nl === nomeShort ||
            nomeLower.includes(nl) || nl.includes(nomeShort);
        };
        setScores(allScores.filter((s: any) => matchName(s.analista || '')).sort((a: any, b: any) => a.periodo.localeCompare(b.periodo)));
        setNcs(allNcs.filter((n: any) => matchName(n.analista || '')));
        setElogios(allElogios.filter((e: any) => matchName(e.colaborador || '')));
        setPdis(allPdis.filter((p: any) => matchName(p.analista || '')));
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [nomeLower, nomeShort]);

  const avgQA = scores.length > 0 ? (scores.reduce((s, r) => s + (r.nota_final_qa || 0), 0) / scores.length) : 0;
  const avgIEPC = scores.length > 0 ? (scores.reduce((s, r) => s + (r.iepc_total || 0), 0) / scores.length) : 0;
  const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const tempoEmpresa = analista.data_admissao ? calcTempoEmpresa(analista.data_admissao) : { texto: analista.tempo_empresa || '—', meses: analista.tempo_empresa_meses || 0 };

  const trendData = scores.map((s) => ({
    periodo: s.periodo,
    qa: Number((s.nota_final_qa || 0).toFixed(1)),
    iepc: Number((s.iepc_total || 0).toFixed(1)),
  }));

  const radarData = lastScore ? [
    { subject: 'P1', value: Math.min(100, ((lastScore.p1 || 0) / 22) * 100) },
    { subject: 'P2', value: Math.min(100, ((lastScore.p2 || 0) / 34) * 100) },
    { subject: 'P3', value: Math.min(100, ((lastScore.p3 || 0) / 18) * 100) },
    { subject: 'P4', value: Math.min(100, ((lastScore.p4 || 0) / 14) * 100) },
    { subject: 'P5', value: Math.min(100, ((lastScore.p5 || 0) / 12) * 100) },
  ] : [];

  const statusStyle = getStatusStyle(analista.status || 'ativo');
  const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();

  const TABS = [
    { id: 'overview' as const, label: 'Visão Geral', icon: <Eye size={13} /> },
    { id: 'avaliacoes' as const, label: `Avaliações (${scores.length})`, icon: <BarChart2 size={13} /> },
    { id: 'ncs' as const, label: `NCs (${ncs.length})`, icon: <AlertTriangle size={13} /> },
    { id: 'elogios' as const, label: `Elogios (${elogios.length})`, icon: <Star size={13} /> },
    { id: 'pdis' as const, label: `PDIs (${pdis.length})`, icon: <Target size={13} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl h-full overflow-y-auto shadow-2xl"
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
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${statusStyle.color}18`, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: '#8B949E' }}>
                  {analista.cargo_operacional || 'Analista'} · {analista.squad || analista.equipe || '—'} · Coord: {analista.coordenador || '—'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 flex-shrink-0" style={{ color: '#8B949E' }}>
              <X size={18} />
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Ciclos', value: scores.length, color: '#60A5FA' },
              { label: 'Média QA', value: avgQA > 0 ? avgQA.toFixed(1) : '—', color: getScoreColor(avgQA) },
              { label: 'Média IEPC', value: avgIEPC > 0 ? avgIEPC.toFixed(1) : '—', color: getScoreColor(avgIEPC) },
              { label: 'Total NCs', value: ncs.length, color: ncs.length > 0 ? '#EF4444' : '#22C55E' },
            ].map((kpi) => (
              <div key={kpi.label} className="p-3 rounded-xl text-center"
                style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: activeTab === tab.id ? '#1E40AF' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#8B949E',
                }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw size={24} className="mx-auto mb-2 animate-spin" style={{ color: '#60A5FA' }} />
              <p className="text-sm" style={{ color: '#8B949E' }}>Carregando dados do analista...</p>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Dados Cadastrais */}
                  <div style={cardStyle}>
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <User size={14} style={{ color: '#60A5FA' }} /> Dados Cadastrais
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'ID Operacional', value: analista.analista_id || '—', icon: <Hash size={12} />, mono: true },
                        { label: 'Nome Completo', value: analista.nome_completo || analista.nome || '—', icon: <User size={12} /> },
                        { label: 'E-mail', value: analista.email || '—', icon: <Mail size={12} /> },
                        { label: 'Telefone', value: analista.telefone || '—', icon: <Phone size={12} /> },
                        { label: 'Cargo', value: analista.cargo_operacional || '—', icon: <Briefcase size={12} /> },
                        { label: 'Equipe', value: analista.squad || analista.equipe || '—', icon: <Users size={12} /> },
                        { label: 'Coordenador', value: analista.coordenador || '—', icon: <Shield size={12} /> },
                        { label: 'Data de Admissão', value: formatDate(analista.data_admissao), icon: <Calendar size={12} /> },
                        { label: 'Tempo de Empresa', value: tempoEmpresaLabel(tempoEmpresa.meses), icon: <Clock size={12} /> },
                        { label: 'Última Promoção', value: formatDate(analista.ultima_promocao), icon: <Award size={12} /> },
                        { label: 'Aniversário', value: formatDate(analista.aniversario), icon: <Calendar size={12} /> },
                        { label: 'Status', value: statusStyle.label, icon: <Activity size={12} />, color: statusStyle.color },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center gap-1 mb-0.5" style={{ color: '#8B949E' }}>
                            {item.icon}
                            <span className="text-xs">{item.label}</span>
                          </div>
                          <p className={`text-sm font-medium ${item.mono ? 'font-mono' : ''}`}
                            style={{ color: item.color || '#C9D1D9' }}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    {analista.observacoes && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: '#8B949E' }}>Observações</p>
                        <p className="text-sm" style={{ color: '#C9D1D9' }}>{analista.observacoes}</p>
                      </div>
                    )}
                  </div>

                  {/* Evolução QA/IEPC */}
                  {trendData.length > 0 && (
                    <div style={cardStyle}>
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={14} style={{ color: '#22C55E' }} /> Evolução QA / IEPC
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="periodo" tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                              labelStyle={{ color: '#fff', fontWeight: 600 }}
                            />
                            <Line type="monotone" dataKey="qa" name="QA" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 3 }} />
                            <Line type="monotone" dataKey="iepc" name="IEPC" stroke="#60A5FA" strokeWidth={2.5} dot={{ fill: '#60A5FA', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Radar QA Pilares */}
                  {radarData.length > 0 && (
                    <div style={cardStyle}>
                      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={14} style={{ color: '#A78BFA' }} /> Pilares QA — Último Ciclo ({lastScore?.periodo})
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#8B949E', fontSize: 11 }} />
                            <Radar dataKey="value" stroke="#A78BFA" fill="#A78BFA" fillOpacity={0.25} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AVALIAÇÕES TAB */}
              {activeTab === 'avaliacoes' && (
                <div style={cardStyle}>
                  <h3 className="text-sm font-semibold text-white mb-4">Histórico de Avaliações</h3>
                  {scores.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#8B949E' }}>Nenhuma avaliação encontrada.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {['Ciclo', 'QA', 'IEPC', 'NCs', 'Pts Ded.', 'Squad'].map((h) => (
                              <th key={h} className="text-left py-2 px-2 font-semibold uppercase tracking-wide" style={{ color: '#8B949E' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {scores.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td className="py-2 px-2 text-white font-medium">{s.periodo}</td>
                              <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.nota_final_qa || 0) }}>{(s.nota_final_qa || 0).toFixed(1)}</td>
                              <td className="py-2 px-2 font-bold" style={{ color: getScoreColor(s.iepc_total || 0) }}>{(s.iepc_total || 0).toFixed(1)}</td>
                              <td className="py-2 px-2" style={{ color: (s.total_ncs || 0) > 0 ? '#EF4444' : '#22C55E' }}>{s.total_ncs || 0}</td>
                              <td className="py-2 px-2" style={{ color: '#8B949E' }}>{s.pontos_deduzidos_nc || 0}</td>
                              <td className="py-2 px-2" style={{ color: '#8B949E' }}>{s.squad || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* NCs TAB */}
              {activeTab === 'ncs' && (
                <div style={cardStyle}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: '#EF4444' }} /> Não Conformidades
                  </h3>
                  {ncs.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#8B949E' }}>Nenhuma NC registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {ncs.map((nc, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>{nc.tipo_nc || '—'}</span>
                            <span className="text-xs" style={{ color: '#8B949E' }}>{nc.periodo || '—'}</span>
                          </div>
                          {nc.descricao && <p className="text-xs text-white">{nc.descricao}</p>}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs" style={{ color: '#F97316' }}>Pts: {nc.pontos_deduzidos || 0}</span>
                            {nc.protocolo_referencia && <span className="text-xs" style={{ color: '#8B949E' }}>Protocolo: {nc.protocolo_referencia}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ELOGIOS TAB */}
              {activeTab === 'elogios' && (
                <div style={cardStyle}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Star size={14} style={{ color: '#EAB308' }} /> Elogios Recebidos
                  </h3>
                  {elogios.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#8B949E' }}>Nenhum elogio registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {elogios.map((e, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: '#EAB308' }}>{e.periodo || '—'}</span>
                            {e.cliente && <span className="text-xs" style={{ color: '#8B949E' }}>Cliente: {e.cliente}</span>}
                          </div>
                          <p className="text-xs text-white leading-relaxed">{e.elogio || ''}</p>
                          {e.protocolo && <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Protocolo: {e.protocolo}</p>}
                          {e.atendimento && <p className="text-xs mt-1" style={{ color: '#8B949E' }}>Atendimento: {e.atendimento}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PDIs TAB */}
              {activeTab === 'pdis' && (
                <div style={cardStyle}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Target size={14} style={{ color: '#A78BFA' }} /> PDIs
                  </h3>
                  {pdis.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#8B949E' }}>Nenhum PDI registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {pdis.map((pdi, i) => (
                        <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold" style={{ color: '#A78BFA' }}>{pdi.periodo || '—'}</span>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>
                              {pdi.status_pdi || '—'}
                            </span>
                          </div>
                          {pdi.objetivo && <p className="text-xs text-white">{pdi.objetivo}</p>}
                          {pdi.feedback && <p className="text-xs mt-1" style={{ color: '#8B949E' }}>{pdi.feedback}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Avatar Upload Field ──────────────────────────────────────────────────────
function AvatarUploadField({ value, onChange, nome }: { value: string; onChange: (url: string) => void; nome: string }) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Selecione uma imagem válida'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Imagem deve ter menos de 5MB'); return; }

    setUploading(true);
    setUploadError(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('analistas-avatar')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('analistas-avatar')
        .getPublicUrl(fileName);

      onChange(urlData.publicUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao fazer upload');
    }
    setUploading(false);
  };

  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Foto / Avatar</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="Preview" className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            style={{ border: '2px solid rgba(56,189,248,0.35)', boxShadow: '0 0 12px rgba(56,189,248,0.15)' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}>
            {nome.substring(0, 1).toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }}
          >
            <Upload size={14} />
            {uploading ? 'Enviando...' : value ? 'Trocar foto' : 'Selecionar foto'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="ml-2 text-xs px-2 py-1 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              Remover
            </button>
          )}
          {uploadError && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{uploadError}</p>}
          {!uploadError && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>JPG, PNG ou WebP. Máx 5MB.</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Analista Form Modal ──────────────────────────────────────────────────────
interface AnalistaFormProps {
  initial?: AnalistaRecord | null;
  onSave: (data: AnalistaFormState) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function AnalistaFormModal({ initial, onSave, onClose, saving }: AnalistaFormProps) {
  const [form, setForm] = useState<AnalistaFormState>(() => {
    if (!initial) return EMPTY_FORM;
    return {
      nome: initial.nome || '',
      nome_completo: initial.nome_completo || initial.nome || '',
      email: initial.email || '',
      telefone: initial.telefone || '',
      cargo_operacional: initial.cargo_operacional || 'Analista',
      nivel: initial.nivel || 'Júnior',
      coordenador: initial.coordenador || '',
      squad: initial.squad || initial.equipe || '',
      status: initial.status || 'ativo',
      data_admissao: initial.data_admissao || '',
      aniversario: initial.aniversario || '',
      ultima_promocao: initial.ultima_promocao || '',
      observacoes: initial.observacoes || '',
      foto_url: (initial as any).foto_url || '',
    };
  });

  const set = (k: keyof AnalistaFormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <h2 className="text-lg font-bold text-white">{initial ? 'Editar Analista' : 'Novo Analista Operacional'}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8B949E' }}>
              {initial?.analista_id ? `ID: ${initial.analista_id}` : 'ID será gerado automaticamente'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#8B949E' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nome (Curto) *</label>
              <input type="text" placeholder="Ex: João Silva" value={form.nome}
                onChange={(e) => set('nome', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nome Completo</label>
              <input type="text" placeholder="Ex: João Carlos da Silva" value={form.nome_completo}
                onChange={(e) => set('nome_completo', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>E-mail</label>
              <input type="email" placeholder="email@empresa.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Telefone</label>
              <input type="text" placeholder="(11) 99999-9999" value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Cargo Operacional</label>
              <select value={form.cargo_operacional} onChange={(e) => set('cargo_operacional', e.target.value)} style={selectStyle}>
                {CARGO_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Nível</label>
              <select value={form.nivel} onChange={(e) => set('nivel', e.target.value)} style={selectStyle}>
                {NIVEL_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Coordenador</label>
              <input type="text" placeholder="Nome do coordenador" value={form.coordenador}
                onChange={(e) => set('coordenador', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Equipe</label>
              <select value={form.squad} onChange={(e) => set('squad', e.target.value)} style={selectStyle}>
                <option value="">Selecione...</option>
                {EQUIPE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Data de Admissão</label>
              <input type="date" value={form.data_admissao} onChange={(e) => set('data_admissao', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Data de Nascimento</label>
              <input type="date" value={form.aniversario} onChange={(e) => set('aniversario', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Última Promoção</label>
              <input type="date" value={form.ultima_promocao} onChange={(e) => set('ultima_promocao', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((s) => (
                <button key={s.value} onClick={() => set('status', s.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: form.status === s.value ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                    color: form.status === s.value ? s.color : '#8B949E',
                    border: `1px solid ${form.status === s.value ? s.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <AvatarUploadField
            value={form.foto_url}
            onChange={(url) => set('foto_url', url)}
            nome={form.nome}
          />
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#8B949E' }}>Observações</label>
            <textarea placeholder="Observações sobre o analista..." value={form.observacoes}
              onChange={(e) => set('observacoes', e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#C9D1D9', border: '1px solid rgba(255,255,255,0.1)' }}>
              Cancelar
            </button>
            <button onClick={() => onSave(form)}
              disabled={!form.nome.trim() || saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E40AF' }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Salvando...' : initial ? 'Salvar Alterações' : 'Cadastrar Analista'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalistasPage() {
  return (
    <EnterpriseLayout>
      <AnalistasContent />
    </EnterpriseLayout>
  );
}

function AnalistasContent() {
  const [analistas, setAnalistas] = useState<AnalistaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAnalista, setEditingAnalista] = useState<AnalistaRecord | null>(null);
  const [profile360, setProfile360] = useState<AnalistaRecord | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAnalistas();
      setAnalistas(data);
    } catch { setAnalistas([]); }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtered = useMemo(() => {
    return analistas.filter((a) => {
      const matchSearch = !searchTerm ||
        (a.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.nome_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.analista_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.coordenador || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchEquipe = !filterEquipe || a.squad === filterEquipe || a.equipe === filterEquipe;
      const matchStatus = !filterStatus || a.status === filterStatus;
      return matchSearch && matchEquipe && matchStatus;
    });
  }, [analistas, searchTerm, filterEquipe, filterStatus]);

  const stats = useMemo(() => ({
    total: analistas.length,
    ativos: analistas.filter((a) => a.status === 'ativo').length,
    equipes: new Set(analistas.map((a) => a.squad || a.equipe).filter(Boolean)).size,
    comEmail: analistas.filter((a) => a.email).length,
  }), [analistas]);

  const handleSave = async (form: AnalistaFormState) => {
    setSaving(true);
    const tempoEmpresa = form.data_admissao ? calcTempoEmpresa(form.data_admissao) : { texto: '', meses: 0 };
    const payload: Omit<AnalistaRecord, 'id' | 'created_at' | 'updated_at'> = {
      nome: form.nome.trim(),
      nome_completo: form.nome_completo.trim() || form.nome.trim(),
      email: form.email.trim().toLowerCase() || undefined,
      telefone: form.telefone.trim() || undefined,
      cargo_operacional: form.cargo_operacional,
      nivel: form.nivel,
      coordenador: form.coordenador.trim() || undefined,
      squad: form.squad || undefined,
      equipe: form.squad || undefined,
      status: form.status,
      data_admissao: form.data_admissao || undefined,
      aniversario: form.aniversario || undefined,
      ultima_promocao: form.ultima_promocao || undefined,
      observacoes: form.observacoes.trim() || undefined,
      tempo_empresa: tempoEmpresa.texto || undefined,
      tempo_empresa_calculado: tempoEmpresa.texto || undefined,
      tempo_empresa_meses: tempoEmpresa.meses,
      analista_id: editingAnalista?.analista_id,
      foto_url: form.foto_url.trim() || undefined,
    } as any;
    const result = await upsertAnalista(payload);
    setSaving(false);
    if (result.success) {
      setShowForm(false);
      setEditingAnalista(null);
      await reload();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAnalista(id);
    setDeleteConfirm(null);
    await reload();
  };

  // ─── CSV/XLSX Import ──────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    const parseDate = (raw: any): string | undefined => {
      if (raw === null || raw === undefined || raw === '') return undefined;
      const s = String(raw).trim();
      if (!s || s === '0') return undefined;
      // Excel serial
      if (/^\d{5}$/.test(s)) {
        try {
          const d = XLSX.SSF.parse_date_code(parseInt(s));
          if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        } catch { /* ignore */ }
      }
      // DD/MM/YYYY
      const slash = s.split('/');
      if (slash.length === 3) {
        const [dd, mm, yy] = slash;
        const year = yy.length === 2 ? `20${yy}` : yy;
        const r = `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        if (!isNaN(Date.parse(r))) return r;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      return undefined;
    };

    const norm = (k: string) => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');

    const getVal = (row: Record<string, any>, ...keys: string[]): string => {
      const rowNorm: Record<string, any> = {};
      Object.keys(row).forEach((k) => {
        const n = norm(k);
        rowNorm[n] = row[k];
        rowNorm[n.replace(/\s/g, '_')] = row[k];
        rowNorm[n.replace(/\s/g, '')] = row[k];
      });
      for (const k of keys) {
        const n = norm(k);
        for (const variant of [n, n.replace(/\s/g, '_'), n.replace(/\s/g, '')]) {
          if (rowNorm[variant] !== undefined && rowNorm[variant] !== null && String(rowNorm[variant]).trim() !== '') {
            return String(rowNorm[variant]).trim();
          }
        }
        // Partial match
        const found = Object.keys(rowNorm).find((rk) => rk.includes(n) || n.includes(rk));
        if (found && rowNorm[found] !== undefined && String(rowNorm[found]).trim() !== '') {
          return String(rowNorm[found]).trim();
        }
      }
      return '';
    };

    try {
      let rows: Record<string, any>[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
      } else {
        const text = await file.text();
        const firstLine = text.split('\n')[0] || '';
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
        const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter });
        rows = result.data as Record<string, any>[];
      }

      if (rows.length === 0) {
        setImportResult({ success: 0, errors: ['Arquivo vazio ou sem dados válidos'] });
        setImporting(false);
        if (importRef.current) importRef.current.value = '';
        return;
      }

      let success = 0;
      const errors: string[] = [];

      for (const row of rows) {
        // Planilha columns: Nome, Nome Completo, Telefone, Data de Nascimento, Data de Admissão, Cargo, E-mail, Ultima Promoção, Equipe, Tipo de Usuário
        const nomeCompleto = getVal(row, 'nome completo', 'nome_completo', 'nomecompleto');
        const nome = getVal(row, 'nome', 'name', 'analista', 'colaborador') || nomeCompleto;
        if (!nome) continue;

        const email = getVal(row, 'e-mail', 'email', 'e mail', 'e_mail');
        const telefone = getVal(row, 'telefone', 'phone', 'celular', 'fone', 'tel').replace(/\D/g, '');
        const squad = getVal(row, 'equipe', 'squad', 'team', 'time');
        const cargo = getVal(row, 'cargo', 'cargo operacional', 'role', 'funcao', 'funcção', 'tipo de usuario', 'tipo usuario', 'tipo_usuario');
        const coordenador = getVal(row, 'coordenador', 'coordinator', 'gestor', 'lider', 'líder');

        const dataAdmissaoRaw = getVal(row, 'data de admissao', 'data admissao', 'data_admissao', 'admissao', 'admissão', 'data de admissão', 'dt admissao');
        const aniversarioRaw = getVal(row, 'data de nascimento', 'aniversario', 'aniversário', 'nascimento', 'data nascimento', 'dt nascimento');
        const ultimaPromocaoRaw = getVal(row, 'ultima promocao', 'última promoção', 'ultima promoção', 'promocao', 'promoção', 'dt promocao');

        const dataAdmissao = parseDate(dataAdmissaoRaw);
        const aniversario = parseDate(aniversarioRaw);
        const ultimaPromocao = parseDate(ultimaPromocaoRaw);
        const tempoEmpresa = dataAdmissao ? calcTempoEmpresa(dataAdmissao) : { texto: '', meses: 0 };

        const payload: Omit<AnalistaRecord, 'id' | 'created_at' | 'updated_at'> = {
          nome: nome.trim(),
          nome_completo: nomeCompleto.trim() || nome.trim(),
          email: email.trim().toLowerCase() || undefined,
          telefone: telefone || undefined,
          cargo_operacional: cargo || 'Analista',
          nivel: 'Júnior',
          coordenador: coordenador || undefined,
          squad: squad || undefined,
          equipe: squad || undefined,
          status: 'ativo',
          data_admissao: dataAdmissao || undefined,
          aniversario: aniversario || undefined,
          ultima_promocao: ultimaPromocao || undefined,
          tempo_empresa: tempoEmpresa.texto || undefined,
          tempo_empresa_calculado: tempoEmpresa.texto || undefined,
          tempo_empresa_meses: tempoEmpresa.meses,
        };

        const result = await upsertAnalista(payload);
        if (result.success) {
          success++;
        } else {
          errors.push(`${nome}: ${result.error}`);
        }
      }

      setImportResult({ success, errors });
      await reload();
    } catch (err: any) {
      setImportResult({ success: 0, errors: [`Erro ao processar arquivo: ${err.message}`] });
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-screen-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Analistas Operacionais
          </h1>
          <p className="text-sm mt-1" style={{ color: '#8B949E' }}>
            Cadastro mestre operacional — entidades avaliadas, não usuários do sistema
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.25)' }}>
            <Upload size={14} />
            {importing ? 'Importando...' : 'Importar Planilha'}
          </button>
          <button
            onClick={() => { setEditingAnalista(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#1E40AF' }}>
            <Plus size={15} />
            Novo Analista
          </button>
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="mb-4 p-4 rounded-xl"
          style={{
            backgroundColor: importResult.errors.length > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(34,197,94,0.06)',
            border: `1px solid ${importResult.errors.length > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                ✅ {importResult.success} analistas importados/atualizados
                {importResult.errors.length > 0 && ` · ⚠️ ${importResult.errors.length} erros`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                ANALISTA_ID gerado automaticamente para novos registros. Histórico preservado para existentes.
              </p>
              {importResult.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>{e}</p>
              ))}
            </div>
            <button onClick={() => setImportResult(null)} className="p-1 rounded hover:bg-white/10" style={{ color: '#94A3B8' }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Analistas', value: stats.total, icon: <Users size={16} />, color: '#60A5FA' },
          { label: 'Analistas Ativos', value: stats.ativos, icon: <User size={16} />, color: '#22C55E' },
          { label: 'Equipes', value: stats.equipes, icon: <Shield size={16} />, color: '#A78BFA' },
          { label: 'Com E-mail', value: stats.comEmail, icon: <Mail size={16} />, color: '#38BDF8' },
        ].map((s) => (
          <div key={s.label} style={cardStyle} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${s.color}18` }}>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs" style={{ color: '#8B949E' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8B949E' }} />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '2rem' }}
          />
        </div>
        <select value={filterEquipe} onChange={(e) => setFilterEquipe(e.target.value)} style={{ ...selectStyle, maxWidth: 180 }}>
          <option value="">Todas as equipes</option>
          {EQUIPE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selectStyle, maxWidth: 150 }}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {(searchTerm || filterEquipe || filterStatus) && (
          <button onClick={() => { setSearchTerm(''); setFilterEquipe(''); setFilterStatus(''); }}
            className="text-xs px-3 py-2 rounded-lg" style={{ color: '#8B949E', backgroundColor: 'rgba(255,255,255,0.06)' }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={cardStyle} className="text-center py-12">
          <RefreshCw size={28} className="mx-auto mb-3 animate-spin" style={{ color: '#60A5FA' }} />
          <p className="text-sm" style={{ color: '#8B949E' }}>Carregando analistas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={cardStyle} className="text-center py-12">
          <Users size={36} className="mx-auto mb-3" style={{ color: '#30363D' }} />
          <p className="text-sm font-medium text-white mb-1">
            {analistas.length === 0 ? 'Nenhum analista cadastrado' : 'Nenhum analista encontrado'}
          </p>
          <p className="text-xs" style={{ color: '#8B949E' }}>
            {analistas.length === 0
              ? 'Clique em "Novo Analista" ou importe uma planilha para começar.' :'Tente ajustar os filtros de busca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((analista) => {
            const statusStyle = getStatusStyle(analista.status || 'ativo');
            const tempoEmpresa = analista.data_admissao
              ? calcTempoEmpresa(analista.data_admissao)
              : { texto: analista.tempo_empresa || '', meses: analista.tempo_empresa_meses || 0 };
            const initials = (analista.nome_completo || analista.nome || 'AN').substring(0, 2).toUpperCase();

            return (
              <div key={analista.id} style={cardStyle} className="transition-all hover:border-white/15">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {(analista as any).foto_url ? (
                    <img src={(analista as any).foto_url} alt={analista.nome}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      style={{ border: '2px solid rgba(56,189,248,0.2)' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: analista.status === 'desligado' ? '#374151' : 'linear-gradient(135deg, #1E40AF, #3B82F6)' }}
                    >
                      {initials}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{analista.nome_completo || analista.nome}</span>
                      {analista.analista_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono"
                          style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}>
                          {analista.analista_id}
                        </span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${statusStyle.color}15`, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#8B949E' }}>
                      {analista.cargo_operacional || 'Analista'} · {analista.squad || analista.equipe || '—'}
                      {analista.coordenador && ` · Coord: ${analista.coordenador}`}
                      {analista.email && ` · ${analista.email}`}
                    </p>
                  </div>

                  {/* Tempo empresa */}
                  {tempoEmpresa.meses > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0" style={{ color: '#8B949E' }}>
                      <Clock size={12} />
                      <span className="text-xs">{tempoEmpresaLabel(tempoEmpresa.meses)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setProfile360(analista)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ backgroundColor: 'rgba(43,79,129,0.2)', color: '#60A5FA', border: '1px solid rgba(43,79,129,0.3)' }}>
                      <Eye size={12} />
                      360°
                    </button>
                    <button onClick={() => { setEditingAnalista(analista); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: '#8B949E' }}>
                      <Edit2 size={13} />
                    </button>
                    {deleteConfirm === analista.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(analista.id)}
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: '#DC2626' }}>
                          Confirmar
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded text-xs" style={{ color: '#8B949E' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(analista.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10"
                        style={{ color: '#8B949E' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#8B949E'; }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AnalistaFormModal
          initial={editingAnalista}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingAnalista(null); }}
          saving={saving}
        />
      )}

      {profile360 && (
        <Profile360 analista={profile360} onClose={() => setProfile360(null)} />
      )}
    </div>
  );
}
