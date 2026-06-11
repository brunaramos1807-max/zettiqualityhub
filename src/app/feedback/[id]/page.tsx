'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Printer, Star, ChevronDown, ChevronUp, Quote, Maximize2, Minimize2, Edit3, Share2, CheckCircle, X, Save, Award, Users, Zap, TrendingUp, Heart, Target, Download, BookOpen, Plus, Trash2, Circle, ArrowLeft, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { autoCreatePDIFromFeedback } from '@/lib/services/dataService';

// ── PDI Objective Block Types ──
interface PdiObjetivo {
  id: string;
  categoria: string;
  objetivo: string;
  acao_esperada: string;
  resultado_esperado: string;
  status: 'cumprido' | 'parcial' | 'nao_cumprido';
}

function newPdiObjetivo(): PdiObjetivo {
  return { id: Math.random().toString(36).slice(2), categoria: '', objetivo: '', acao_esperada: '', resultado_esperado: '', status: 'nao_cumprido' };
}

const OBJ_STATUS_CFG = {
  cumprido: { label: 'Cumprido', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={11} /> },
  parcial: { label: 'Parcial', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Circle size={11} /> },
  nao_cumprido: { label: 'Não Cumprido', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <X size={11} /> },
};

const C = {
  bg: '#07101F', surface: '#0F1B31', border: '#1E3050',
  blue: '#38BDF8', teal: '#2DD4BF', purple: '#A78BFA', amber: '#F59E0B',
  green: '#22C55E', red: '#EF4444'
};

function statusBadge(status: string) {
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    aderido: { cls: 'bg-green-900/30 text-green-400 border border-green-700/40', dot: 'bg-green-400', label: 'Aderido' },
    parcial: { cls: 'bg-amber-900/30 text-amber-400 border border-amber-700/40', dot: 'bg-amber-400', label: 'Parcial' },
    nao_aderido: { cls: 'bg-red-900/30 text-red-400 border border-red-700/40', dot: 'bg-red-400', label: 'Não Aderido' },
    nao_avaliado: { cls: 'bg-slate-800/50 text-slate-500 border border-slate-700/30', dot: 'bg-slate-500', label: 'N/A' },
    nao_evidenciado: { cls: 'bg-red-900/30 text-red-400 border border-red-700/40', dot: 'bg-red-400', label: 'Não evidenciado' },
    nao_aplicavel: { cls: 'bg-slate-800/50 text-slate-500 border border-slate-700/30', dot: 'bg-slate-500', label: 'N/A' },
  };
  return map[status] || map.nao_avaliado;
}

// Extract a field from snapshot trying multiple paths
function extract(snapshot: any, ...paths: string[]): any {
  for (const path of paths) {
    const parts = path.split('.');
    let val: any = snapshot;
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    if (val != null && val !== '') return val;
  }
  return null;
}

function resolveIepcScore(scores: any, snapshot: any, rawFeedback: any): number | null {
  const fromScores = scores?.iepc;
  const candidate =
    (fromScores != null && fromScores !== 0 ? fromScores : null) ??
    snapshot?.indice_satisfacao ??
    rawFeedback?.iepc_score ??
    rawFeedback?.iepc_total ??
    fromScores ??
    0;
  const n = Number(candidate);
  return isNaN(n) ? 0 : n;
}

const IEPC_PILAR_DEFAULT_NAMES = [
  'Resolução Percebida',
  'Clareza e Confiança',
  'CES',
  'Tempo e Fluidez',
  'Experiência Relacional',
];

function readPilarNota(p: any): number {
  const raw = p?.nota ?? p?.pontuacao ?? p?.score ?? p?.points ?? p?.pts ?? p?.valor;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function readPilarMaximo(p: any): number {
  const raw = p?.maximo ?? p?.max ?? p?.maxPoints ?? p?.max_pts ?? 20;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

function normalizePilarList(raw: any[] | null | undefined): any[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((p, i) => {
    const pctField = p.percentual ?? p.percentage ?? p.pct;
    let nota = readPilarNota(p);
    let maximo = readPilarMaximo(p);
    if (pctField != null && pctField !== '') {
      nota = Number(pctField) || 0;
      maximo = 100;
    } else if (nota > maximo && nota <= 100) {
      maximo = 100;
    }
    return {
      nome: p.nome || p.name || p.label || IEPC_PILAR_DEFAULT_NAMES[i] || '',
      nota,
      maximo,
      codigo: p.codigo || p.code,
    };
  });
}

function resolveIepcPilares(snapshot: any, rawFeedback: any): any[] {
  const sources = [
    snapshot?.iepc_pilares,
    rawFeedback?.pilares_iepc,
    snapshot?.pillars?.iepc,
    snapshot?.pilares?.iepc,
  ];
  for (const src of sources) {
    const norm = normalizePilarList(src);
    if (norm.length > 0) return norm;
  }
  const eKeys = ['e1', 'e2', 'e3', 'e4', 'e5'] as const;
  const scoreBag = { ...(snapshot?.scores || {}), ...(rawFeedback || {}) };
  const fromE = eKeys
    .map((k, i) => {
      let val = scoreBag[k] ?? rawFeedback?.[k];
      if (val == null || val === '') return null;
      let nota = Number(val);
      if (!Number.isFinite(nota)) return null;
      return {
        nome: IEPC_PILAR_DEFAULT_NAMES[i],
        nota,
        maximo: IEPC_PILAR_DEFAULT_NAMES[i] === 'CES' ? 20 : 20,
        codigo: k.toUpperCase(),
      };
    })
    .filter(Boolean);
  if (fromE.length > 0) return fromE;
  return [];
}

function mapFeedbackPdiRows(rows: any[], snap: any): PdiObjetivo[] {
  const snapPdi = Array.isArray(snap?.pdi) ? snap.pdi : [];
  return rows.map((row, i) => {
    const snapItem = snapPdi[i] || {};
    return {
      id: row.id,
      categoria: row.categoria || snapItem.categoria || '',
      objetivo: row.objetivo || '',
      acao_esperada:
        row.acao_desenvolvimento ||
        snapItem.acao ||
        snapItem.acao_desenvolvimento ||
        snapItem.acao_esperada ||
        '',
      resultado_esperado:
        row.resultado_esperado ||
        snapItem.resultado_esperado ||
        snapItem.resultadoEsperado ||
        '',
      status: 'nao_cumprido' as const,
    };
  });
}

function mapSnapshotPdiToObjetivos(snap: any, rawData: any): PdiObjetivo[] | null {
  if (Array.isArray(snap?.pdi) && snap.pdi.length > 0) {
    return snap.pdi.map((p: any, i: number) => ({
      id: `pdi-snap-${i}`,
      categoria: p.categoria || '',
      objetivo: p.objetivo || '',
      acao_esperada: p.acao || p.acao_desenvolvimento || p.acao_esperada || '',
      resultado_esperado: p.resultado_esperado || p.resultadoEsperado || '',
      status: 'nao_cumprido' as const,
    }));
  }
  const savedObjetivos = snap?.feedback_blocks?.pdi_objetivos || rawData?.pdi_objetivos;
  if (Array.isArray(savedObjetivos) && savedObjetivos.length > 0) {
    return savedObjetivos;
  }
  const legacyObj = snap?.feedback_blocks?.objetivo_desenvolvimento || rawData?.objetivo_desenvolvimento;
  const legacyAcao = snap?.feedback_blocks?.acao_desenvolvimento || rawData?.acao_desenvolvimento;
  const legacyResult = snap?.feedback_blocks?.resultado_esperado || rawData?.resultado_esperado;
  if (legacyObj || legacyAcao || legacyResult) {
    return [{
      id: 'legacy-1',
      categoria: '',
      objetivo: legacyObj || '',
      acao_esperada: legacyAcao || '',
      resultado_esperado: legacyResult || '',
      status: 'nao_cumprido',
    }];
  }
  return null;
}

// Sort ciclos like "01/2026", "02/2026" etc
function sortByCiclo(a: any, b: any): number {
  const parseC = (c: string) => {
    if (!c) return 0;
    const m = c.match(/^(\d{2})\/(\d{4})$/);
    if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
    return 0;
  };
  return parseC(a.ciclo) - parseC(b.ciclo);
}

// Generate motivational closing message based on scores
function getMotivationalMessage(qa: number | null, iepc: number | null, ncs: number, elogios: number): { title: string; message: string; level: 'high' | 'mid' | 'low' } {
  const score = qa ?? iepc ?? 0;
  if (score >= 90) {
    return {
      level: 'high',
      title: 'Excelência Operacional Reconhecida',
      message: elogios > 0
        ? `Seu ciclo demonstrou alto nível de consistência técnica e excelência relacional${elogios > 0 ? `, com ${elogios} elogio${elogios > 1 ? 's' : ''} registrado${elogios > 1 ? 's' : ''}` : ''}. Continue evoluindo nessa trajetória, pois sua atuação gera impacto positivo direto na experiência do cliente e nos resultados da operação.`
        : 'Seu ciclo demonstrou alto nível de consistência técnica e excelência relacional. Continue evoluindo nessa trajetória, pois sua atuação gera impacto positivo direto na experiência do cliente e nos resultados da operação.',
    };
  }
  if (score >= 80) {
    return {
      level: 'mid',
      title: 'Evolução Consistente',
      message: `Você apresentou evolução consistente ao longo do ciclo e possui potencial para elevar ainda mais sua performance${ncs > 0 ? `. O acompanhamento das ${ncs} não conformidade${ncs > 1 ? 's' : ''} identificada${ncs > 1 ? 's' : ''} será fundamental` : ''}. O refinamento técnico e o fortalecimento da condução operacional são os próximos passos para alcançar a excelência.`,
    };
  }
  return {
    level: 'low',
    title: 'Oportunidade de Crescimento',
    message: `Este ciclo evidencia oportunidades importantes de evolução${ncs > 0 ? `, com ${ncs} ponto${ncs > 1 ? 's' : ''} de atenção registrado${ncs > 1 ? 's' : ''}` : ''}. O foco contínuo na comunicação, rastreabilidade e aprofundamento técnico será fundamental para elevar sua consistência operacional e alcançar novos patamares de desempenho.`,
  };
}

export default function FeedbackViewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [rawFeedback, setRawFeedback] = useState<any>(null);
  const [analistaInfo, setAnalistaInfo] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdiCreating, setPdiCreating] = useState(false);
  const [pdiCreated, setPdiCreated] = useState(false);
  const [pdiObjetivos, setPdiObjetivos] = useState<PdiObjetivo[]>([newPdiObjetivo()]);
  const [dbNCs, setDbNCs] = useState<any[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    const id = params?.id as string;
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: rawData } = await supabase
      .from('feedbacks')
      .select('*, analistas(*)')
      .eq('id', id)
      .maybeSingle();

        if (!rawData) { if (isRefresh) setRefreshing(false); else setLoading(false); return; }

    setRawFeedback(rawData);
    setPublicToken(rawData.public_token || null);
    setPublicEnabled(rawData.public_enabled || false);

    const snap = Array.isArray(rawData.snapshot_json_completo)
      ? rawData.snapshot_json_completo[0]
      : (rawData.snapshot_json_completo || {});

    setSnapshot(snap);
    setAnalistaInfo(rawData.analistas);

    const { data: feedbackPdiRows } = await supabase
      .from('feedback_pdi')
      .select('id, objetivo, acao_desenvolvimento, status')
      .eq('feedback_id', id);

    if (feedbackPdiRows && feedbackPdiRows.length > 0) {
      setPdiObjetivos(mapFeedbackPdiRows(feedbackPdiRows, snap));
    } else {
      const mappedPdi = mapSnapshotPdiToObjetivos(snap, rawData);
      setPdiObjetivos(mappedPdi && mappedPdi.length > 0 ? mappedPdi : [newPdiObjetivo()]);
    }

    setEditFields({
      fechamento_ciclo: extract(snap, 'feedback_blocks.fechamento_ciclo', 'fechamento') || rawData.resumo_ciclo || '',
      evolucao_tecnica: extract(snap, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') || rawData.evolucao_tecnica || '',
      evolucao_comportamental: extract(snap, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') || rawData.evolucao_comportamental || '',
      atencao_evolutiva: extract(snap, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') || '',
      mensagem_evolutiva: extract(snap, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') || rawData.mensagem_evolutiva || '',
    });

    // Check if PDI already exists for this feedback
    const { data: existingPdi } = await supabase
      .from('pdi_records')
      .select('id')
      .eq('feedback_id', id)
      .maybeSingle();
    if (existingPdi) setPdiCreated(true);

    if (rawData.analista_id) {
      // Load from feedback_historico
      const { data: histRows } = await supabase
        .from('feedback_historico')
        .select('ciclo, qa_score, iepc_score, aderencia_score')
        .eq('analista_id', rawData.analista_id);

      // Load from feedbacks table (all past feedbacks for this analista)
      const { data: pastFeedbacks } = await supabase
        .from('feedbacks')
        .select('ciclo, qa_score, iepc_score, aderencia_score, created_at')
        .eq('analista_id', rawData.analista_id);

      // Merge: prefer feedback_historico, supplement with feedbacks table
      const histMap = new Map<string, any>();
      (pastFeedbacks || []).forEach((f: any) => {
        if (f.ciclo) histMap.set(f.ciclo, { ciclo: f.ciclo, qa: Number(f.qa_score) || 0, iepc: Number(f.iepc_score) || 0 });
      });
      (histRows || []).forEach((h: any) => {
        if (h.ciclo) histMap.set(h.ciclo, { ciclo: h.ciclo, qa: Number(h.qa_score) || 0, iepc: Number(h.iepc_score) || 0 });
      });
      const sorted = Array.from(histMap.values()).sort(sortByCiclo);
      setHistorico(sorted);

      const analistaNome = rawData.analistas?.nome || rawData.analistas?.nome_completo;
      if (analistaNome) {
        const ciclo = rawData.ciclo || snap?.analista?.ciclo;
        const analistaNomeLower = analistaNome.toLowerCase();
        const analistaParts = analistaNomeLower.split(' ');
        const analistaFirstName = analistaParts[0];
        const analistaLastName = analistaParts[analistaParts.length - 1];

        let elogiosQuery = supabase
          .from('elogios')
          .select('elogio, protocolo, cliente, periodo, colaborador')
          .ilike('colaborador', `${analistaNome.split(' ')[0]}%`)
          .order('created_at', { ascending: false })
          .limit(20);

        if (ciclo) elogiosQuery = elogiosQuery.eq('periodo', ciclo);
        const { data: elogiosRows } = await elogiosQuery;
        // Post-filter: require first+last name match to avoid false positives
        const filteredElogios = (elogiosRows || []).filter((e: any) => {
          const colLower = (e.colaborador || '').toLowerCase();
          const colParts = colLower.split(' ');
          return colLower === analistaNomeLower ||
            (colParts[0] === analistaFirstName && colParts[colParts.length - 1] === analistaLastName);
        });
        setElogios(filteredElogios);

        // Fetch NCs from nc_records table by analista name + ciclo
        let ncQuery = supabase
          .from('nc_records')
          .select('*')
          .ilike('analista', `${analistaNome.split(' ')[0]}%`);

        if (ciclo) ncQuery = ncQuery.eq('periodo', ciclo);
        const { data: ncRows } = await ncQuery;
        // Post-filter: require first+last name match
        const filteredNCs = (ncRows || []).filter((nc: any) => {
          const ncLower = (nc.analista || '').toLowerCase();
          const ncParts = ncLower.split(' ');
          return ncLower === analistaNomeLower ||
            (ncParts[0] === analistaFirstName && ncParts[ncParts.length - 1] === analistaLastName);
        });
        setDbNCs(filteredNCs);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [params?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGeneratePublicLink = async () => {
    const token = crypto.randomUUID();
    await supabase.from('feedbacks').update({ public_token: token, public_enabled: true }).eq('id', params?.id as string);
    setPublicToken(token);
    setPublicEnabled(true);
  };

  const handleTogglePublicLink = async () => {
    const newEnabled = !publicEnabled;
    await supabase.from('feedbacks').update({ public_enabled: newEnabled }).eq('id', params?.id as string);
    setPublicEnabled(newEnabled);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/feedback/public/${publicToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (!rawFeedback) return;
    setSaving(true);
    const snap = Array.isArray(rawFeedback.snapshot_json_completo)
      ? rawFeedback.snapshot_json_completo[0]
      : (rawFeedback.snapshot_json_completo || {});

    const updated = {
      ...snap,
      fechamento: editFields.fechamento_ciclo,
      evolucao_tecnica: editFields.evolucao_tecnica,
      evolucao_comportamental: editFields.evolucao_comportamental,
      feedback_blocks: {
        ...(snap?.feedback_blocks || {}),
        fechamento_ciclo: editFields.fechamento_ciclo,
        evolucao_tecnica: editFields.evolucao_tecnica,
        evolucao_comportamental: editFields.evolucao_comportamental,
        atencao_evolutiva: editFields.atencao_evolutiva,
        mensagem_evolutiva: editFields.mensagem_evolutiva,
        pdi_objetivos: pdiObjetivos,
      },
    };

    await supabase.from('feedbacks').update({
      snapshot_json_completo: updated,
      evolucao_tecnica: editFields.evolucao_tecnica,
      evolucao_comportamental: editFields.evolucao_comportamental,
      resumo_ciclo: editFields.fechamento_ciclo,
    }).eq('id', params?.id as string);

    setSaving(false);
    setEditOpen(false);
    fetchData();
  };

  const handleCreatePDI = async () => {
    if (!rawFeedback || pdiCreated) return;
    setPdiCreating(true);
    const snap = Array.isArray(rawFeedback.snapshot_json_completo)
      ? rawFeedback.snapshot_json_completo[0]
      : (rawFeedback.snapshot_json_completo || {});
    const analista = snap?.analista || {};
    const scores = snap?.scores || {};
    const ncs = snap?.nao_conformidades || [];
    const elogiosSnap = snap?.elogios || [];

    // Build enterprise_objectives from pdiObjetivos
    const enterpriseObjectives = pdiObjetivos
      .filter(o => o.objetivo.trim())
      .map(o => ({
        id: o.id,
        categoria: o.categoria,
        objetivo: o.objetivo,
        acao_esperada: o.acao_esperada,
        resultado_esperado: o.resultado_esperado,
        status: o.status,
        observacao_coordenador: '',
      }));

    const firstObj = enterpriseObjectives[0];
    const mensagemEvolutiva = editFields.mensagem_evolutiva || extract(snap, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') || '';

    await autoCreatePDIFromFeedback({
      feedbackId: rawFeedback.id,
      analistaId: rawFeedback.analista_id,
      analistaNome: analista?.nome || analistaInfo?.nome || analistaInfo?.nome_completo || '',
      squad: analista?.equipe || rawFeedback?.equipe || analistaInfo?.equipe || analistaInfo?.squad || '',
      coordenador: analistaInfo?.coordenador || analista?.coordenador || '',
      ciclo: analista?.ciclo || rawFeedback?.ciclo || '',
      qaScore: scores?.qa ?? rawFeedback?.qa_score,
      iepcScore: scores?.iepc ?? rawFeedback?.iepc_score,
      aderenciaScore: scores?.aderencia ?? rawFeedback?.aderencia_score,
      totalNcs: ncs.length,
      totalElogios: elogiosSnap.length,
      objetivoDesenvolvimento: firstObj?.objetivo || '',
      acaoDesenvolvimento: firstObj?.acao_esperada || '',
      resultadoEsperado: firstObj?.resultado_esperado || '',
      mensagemEvolutiva,
      enterpriseObjectives,
    });
    setPdiCreating(false);
    setPdiCreated(true);
  };

  const handleDownloadTxt = () => {
    if (!rawFeedback) return;
    const snap = Array.isArray(rawFeedback.snapshot_json_completo)
      ? rawFeedback.snapshot_json_completo[0]
      : (rawFeedback.snapshot_json_completo || {});
    const analista = snap?.analista || {};
    const scores = snap?.scores || {};
    const coaching: any[] = snap?.coaching || [];
    const atendimentos: any[] = snap?.atendimentos || [];
    const ncs: any[] = snap?.nao_conformidades || [];
    const elogiosSnap: any[] = snap?.elogios || [];
    const fb = snap?.feedback_blocks || {};

    const analistaNome = analista?.nome || analistaInfo?.nome || analistaInfo?.nome_completo || '—';
    const ciclo = analista?.ciclo || rawFeedback?.ciclo || '—';
    const qaScore = scores?.qa ?? rawFeedback?.qa_score ?? '—';
    const iepcScore = scores?.iepc ?? rawFeedback?.iepc_score ?? '—';
    const aderenciaScore = scores?.aderencia ?? rawFeedback?.aderencia_score ?? '—';

    const lines: string[] = [];
    const sep = '='.repeat(70);
    const sep2 = '-'.repeat(70);

    lines.push(sep);
    lines.push('FEEDBACK INDIVIDUAL — QUALIVISÃO');
    lines.push(sep);
    lines.push('');
    lines.push(`ANALISTA:     ${analistaNome}`);
    lines.push(`CARGO:        ${analistaInfo?.cargo_operacional || analista?.cargo || 'Analista de Qualidade'}`);
    lines.push(`EQUIPE/SQUAD: ${analista?.equipe || rawFeedback?.equipe || analistaInfo?.squad || '—'}`);
    lines.push(`COORDENADOR:  ${analistaInfo?.coordenador || analista?.coordenador || '—'}`);
    lines.push(`CICLO:        ${ciclo}`);
    lines.push(`DATA:         ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push('');
    lines.push(sep);
    lines.push('MÉTRICAS DO CICLO');
    lines.push(sep2);
    lines.push(`QA Score:     ${qaScore}`);
    lines.push(`IEPC:         ${iepcScore}%`);
    lines.push(`Aderência:    ${aderenciaScore}%`);
    lines.push(`Atendimentos: ${atendimentos.length}`);
    lines.push(`NCs:          ${ncs.length}`);
    lines.push(`Elogios:      ${elogiosSnap.length}`);
    lines.push('');

    if (fb.evolucao_tecnica || rawFeedback?.evolucao_tecnica) {
      lines.push(sep);
      lines.push('PANORAMA DO CICLO');
      lines.push(sep2);
      if (fb.evolucao_tecnica || rawFeedback?.evolucao_tecnica) {
        lines.push('EVOLUÇÃO TÉCNICA:');
        lines.push(fb.evolucao_tecnica || rawFeedback?.evolucao_tecnica || '');
        lines.push('');
      }
      if (fb.evolucao_comportamental || rawFeedback?.evolucao_comportamental) {
        lines.push('EVOLUÇÃO COMPORTAMENTAL:');
        lines.push(fb.evolucao_comportamental || rawFeedback?.evolucao_comportamental || '');
        lines.push('');
      }
      if (fb.atencao_evolutiva) {
        lines.push('ATENÇÃO EVOLUTIVA:');
        lines.push(fb.atencao_evolutiva);
        lines.push('');
      }
      if (fb.fechamento_ciclo || rawFeedback?.resumo_ciclo) {
        lines.push('FECHAMENTO DO CICLO:');
        lines.push(fb.fechamento_ciclo || rawFeedback?.resumo_ciclo || '');
        lines.push('');
      }
    }

    if (coaching.length > 0) {
      lines.push(sep);
      lines.push('COACHING DE COMUNICAÇÃO');
      lines.push(sep2);
      coaching.forEach((c: any, i: number) => {
        lines.push(`[${i + 1}] ${c.categoria || 'Coaching'}`);
        if (c.o_que_foi_dito) lines.push(`  O que foi dito: "${c.o_que_foi_dito}"`);
        if (c.como_poderia_ser) lines.push(`  Como poderia ser: "${c.como_poderia_ser}"`);
        if (c.dica_de_ouro) lines.push(`  Dica de Ouro: ${c.dica_de_ouro}`);
        lines.push('');
      });
    }

    if (atendimentos.length > 0) {
      lines.push(sep);
      lines.push(`ATENDIMENTOS AVALIADOS (${atendimentos.length})`);
      lines.push(sep2);
      atendimentos.forEach((a: any, i: number) => {
        lines.push(`[${i + 1}] Protocolo: ${a.protocolo || '—'} | Cliente: ${a.cliente || '—'} | QA: ${a.nota_qa || a.nota || '—'}`);
        if (a.sintese) lines.push(`    Síntese: ${a.sintese}`);
      });
      lines.push('');
    }

    if (ncs.length > 0) {
      lines.push(sep);
      lines.push(`NÃO CONFORMIDADES (${ncs.length})`);
      lines.push(sep2);
      ncs.forEach((nc: any, i: number) => {
        lines.push(`[${i + 1}] ${nc.tipo || nc.tipo_nc || 'NC'}`);
        if (nc.descricao) lines.push(`    ${nc.descricao}`);
        if (nc.protocolo || nc.protocolo_referencia) lines.push(`    Protocolo: ${nc.protocolo || nc.protocolo_referencia}`);
      });
      lines.push('');
    }

    if (elogiosSnap.length > 0) {
      lines.push(sep);
      lines.push(`ELOGIOS (${elogiosSnap.length})`);
      lines.push(sep2);
      elogiosSnap.forEach((e: any, i: number) => {
        lines.push(`[${i + 1}] "${e.descricao || e.elogio || ''}"`);
        if (e.protocolo) lines.push(`    Protocolo: ${e.protocolo}`);
        if (e.cliente) lines.push(`    Cliente: ${e.cliente}`);
      });
      lines.push('');
    }

    const objDev = editFields.objetivo_desenvolvimento || fb.objetivo_desenvolvimento || '';
    const acaoDev = editFields.acao_desenvolvimento || fb.acao_desenvolvimento || '';
    const resultEsp = editFields.resultado_esperado || fb.resultado_esperado || '';
    const msgEvol = editFields.mensagem_evolutiva || fb.mensagem_evolutiva || '';

    if (objDev || acaoDev || resultEsp || msgEvol) {
      lines.push(sep);
      lines.push('PLANO DE DESENVOLVIMENTO DO CICLO');
      lines.push(sep2);
      if (objDev) { lines.push('OBJETIVO:'); lines.push(objDev); lines.push(''); }
      if (acaoDev) { lines.push('AÇÃO ESPERADA:'); lines.push(acaoDev); lines.push(''); }
      if (resultEsp) { lines.push('RESULTADO ESPERADO:'); lines.push(resultEsp); lines.push(''); }
      if (msgEvol) { lines.push('MENSAGEM EVOLUTIVA:'); lines.push(msgEvol); lines.push(''); }
    }

    const motivational = getMotivationalMessage(
      qaScore != null && qaScore !== '—' ? Number(qaScore) : null,
      iepcScore != null && iepcScore !== '—' ? Number(iepcScore) : null,
      ncs.length,
      elogiosSnap.length
    );
    lines.push(sep);
    lines.push(motivational.title.toUpperCase());
    lines.push(sep2);
    lines.push(motivational.message);
    lines.push('');
    lines.push(sep);
    lines.push(`Documento gerado em ${new Date().toLocaleString('pt-BR')} — QualiVisão`);
    lines.push(sep);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback_${analistaNome.replace(/\s+/g, '_')}_${ciclo.replace('/', '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          Carregando feedback...
        </div>
      </div>
    </EnterpriseLayout>
  );

  if (!snapshot && !rawFeedback) return (
    <EnterpriseLayout>
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Feedback não encontrado.</div>
    </EnterpriseLayout>
  );

  // ── Normalize all data fields from snapshot (Lovable payload structure) ──
  const analista = snapshot?.analista || {};
  const scores = snapshot?.scores || {};
  const qaFromSnap = normalizePilarList(snapshot?.qa_pilares);
  const qa_pilares: any[] = qaFromSnap.length > 0 ? qaFromSnap : snapshot?.qa_pilares || [];
  const iepc_pilares: any[] = resolveIepcPilares(snapshot, rawFeedback);
  const coaching: any[] = snapshot?.coaching || [];
  const atendimentos: any[] = snapshot?.atendimentos || [];
  const nao_conformidades: any[] = snapshot?.nao_conformidades || [];
  const feedback_blocks = snapshot?.feedback_blocks || {};
  const analytics = snapshot?.analytics || {};

  // Scores: prefer snapshot.scores, fallback to rawFeedback columns
  const qaScore = scores?.qa ?? rawFeedback?.qa_score ?? null;
  const iepcScore = resolveIepcScore(scores, snapshot, rawFeedback);
  const aderenciaScore = scores?.aderencia ?? rawFeedback?.aderencia_score ?? null;

  // Analista name: prefer snapshot.analista.nome, fallback to analistas table
  const analistaNome = analista?.nome || analistaInfo?.nome || analistaInfo?.nome_completo || '—';
  const analistaEquipe = analista?.equipe || rawFeedback?.equipe || analistaInfo?.equipe || analistaInfo?.squad || '—';
  const analistaCiclo = analista?.ciclo || rawFeedback?.ciclo || '—';

  // Panorama blocks
  const evolucaoTecnica = extract(snapshot, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') || rawFeedback?.evolucao_tecnica || '';
  const evolucaoComportamental = extract(snapshot, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') || rawFeedback?.evolucao_comportamental || '';
  // atencao_evolutiva: check all paths — snapshot.feedback_blocks, snapshot root, dedicated DB columns
  const atencaoEvolutiva =
    extract(snapshot, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') ||
    rawFeedback?.risco_operacional ||
    rawFeedback?.atencao_evolutiva ||
    '';
  const fechamentoCiclo = extract(snapshot, 'feedback_blocks.fechamento_ciclo', 'fechamento') || rawFeedback?.resumo_ciclo || '';

  // PDI development block fields
  const objetivoDesenvolvimento = extract(snapshot, 'feedback_blocks.objetivo_desenvolvimento', 'objetivo_desenvolvimento') || rawFeedback?.objetivo_desenvolvimento || '';
  const acaoDesenvolvimento = extract(snapshot, 'feedback_blocks.acao_desenvolvimento', 'acao_desenvolvimento') || rawFeedback?.acao_desenvolvimento || '';
  const resultadoEsperado = extract(snapshot, 'feedback_blocks.resultado_esperado', 'resultado_esperado') || rawFeedback?.resultado_esperado || '';
  const mensagemEvolutiva = extract(snapshot, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') || rawFeedback?.mensagem_evolutiva || '';

  // Elogios: merge snapshot elogios + real elogios from DB (deduplicated by protocolo)
  const snapshotElogios: any[] = snapshot?.elogios || [];
  const dbElogiosMapped = elogios.map((e: any) => ({ descricao: e.elogio, protocolo: e.protocolo, cliente: e.cliente }));
  const dbProtocolos = new Set(dbElogiosMapped.map((e: any) => e.protocolo).filter(Boolean));
  const extraSnapshotElogios = snapshotElogios.filter((e: any) => !e.protocolo || !dbProtocolos.has(e.protocolo));
  const allElogios = [...dbElogiosMapped, ...extraSnapshotElogios];

  // NCs: merge snapshot NCs with NCs fetched from nc_records table
  const dbNCsMapped = dbNCs.map((nc: any) => ({
    tipo: nc.tipo_nc,
    tipo_nc: nc.tipo_nc,
    descricao: nc.descricao,
    protocolo: nc.protocolo_referencia,
    protocolo_referencia: nc.protocolo_referencia,
    pontos_deduzidos: nc.pontos_deduzidos,
  }));
  // Deduplicate: use snapshot NCs if present, supplement with DB NCs not already in snapshot
  const snapshotNCProtocolos = new Set(nao_conformidades.map((nc: any) => nc.protocolo || nc.protocolo_referencia).filter(Boolean));
  const extraDBNCs = dbNCsMapped.filter((nc: any) => !nc.protocolo || !snapshotNCProtocolos.has(nc.protocolo));
  const allNCs = nao_conformidades.length > 0
    ? [...nao_conformidades, ...extraDBNCs]
    : dbNCsMapped;
  const isHighScore = Number(qaScore) >= 90;

  const motivational = getMotivationalMessage(
    qaScore != null ? Number(qaScore) : null,
    iepcScore != null ? Number(iepcScore) : null,
    allNCs.length,
    allElogios.length
  );

  const hasPDIBlock = pdiObjetivos.some(o => o.objetivo.trim()) || pdiObjetivos.length > 0;

  const content = (
    <div className="min-h-screen text-slate-200 pb-12 bg-[#07101F]">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          @page { size: A4; margin: 14mm 16mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body, html { background: #ffffff !important; color: #1a1a2e !important; }
          .min-h-screen { background: #ffffff !important; }
          .print-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            color: #1e293b !important;
            break-inside: avoid;
            box-shadow: none !important;
          }
          /* Force all text to dark for readability */
          .print-card * { color: #1e293b !important; }
          /* Keep accent colors readable */
          .print-card .text-sky-300, .print-card .text-sky-400 { color: #0369a1 !important; }
          .print-card .text-teal-300, .print-card .text-teal-400 { color: #0f766e !important; }
          .print-card .text-green-400 { color: #15803d !important; }
          .print-card .text-amber-400 { color: #b45309 !important; }
          .print-card .text-red-400 { color: #b91c1c !important; }
          .print-card .text-purple-400 { color: #7c3aed !important; }
          .print-card .text-slate-400, .print-card .text-slate-500 { color: #475569 !important; }
          /* Remove dark backgrounds from cards */
          .print-card [style*="background"] { background: #f8fafc !important; }
          .print-card [style*="linear-gradient"] { background: #f1f5f9 !important; }
          /* Score boxes */
          .print-card [style*="border: 2px solid"] { border-color: #94a3b8 !important; }
          /* Radar/chart containers */
          .recharts-wrapper text { fill: #334155 !important; }
          .recharts-polar-grid-angle line, .recharts-polar-grid-concentric path { stroke: #cbd5e1 !important; }
          /* Progress bars keep color */
          /* Headings */
          h1, h2, h3, h4 { color: #0f172a !important; }
          /* Mural de elogios */
          .print-card .bg-teal-900\\/30, .print-card [style*="0D2E2B"], .print-card [style*="0A2420"] {
            background: #f0fdfa !important;
            border-color: #99f6e4 !important;
          }
          /* NC cards */
          .print-card .bg-red-900\\/30 { background: #fef2f2 !important; }
          .print-card .bg-amber-900\\/30 { background: #fffbeb !important; }
          /* PDI block */
          .print-card .bg-sky-900\\/40 { background: #f0f9ff !important; }
          /* Coaching cards */
          .print-card .bg-amber-900\\/20 { background: #fffbeb !important; }
          /* Motivational block */
          .print-card .bg-green-900\\/30 { background: #f0fdf4 !important; }
          /* Panorama block */
          .print-card .bg-\\[\\#0F1B31\\] { background: #f8fafc !important; }
          /* Atendimentos */
          .print-card .bg-slate-800\\/50 { background: #f1f5f9 !important; }
          /* Remove blur/glow effects */
          .print-card .blur-\\[100px\\], .print-card .blur-\\[80px\\] { display: none !important; }
        }
      `}</style>

      {/* Widescreen container */}
      <div className="px-4 py-4 w-full max-w-[1600px] mx-auto space-y-4">

        {/* ── TOP ACTION BAR ── */}
        <div className="print-hide flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0F1B31] text-slate-400 border border-[#1E3050] hover:text-slate-200 hover:bg-[#1E3050]/60 transition-all"
            >
              <ArrowLeft size={12} /> Voltar
            </button>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-900/40 text-sky-300 border border-sky-700/30">
              {analistaCiclo}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-900/30 text-green-400 border border-green-700/30 flex items-center gap-1">
              <CheckCircle size={10} /> Concluído
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {publicToken ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTogglePublicLink}
                  className={`print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${publicEnabled ? 'bg-green-900/30 text-green-300 border-green-700/30 hover:bg-green-800/40' : 'bg-slate-800 text-slate-400 border-slate-700/50 hover:bg-slate-700'}`}
                >
                  {publicEnabled ? '🔓 Link Ativo' : '🔒 Link Inativo'}
                </button>
                <button onClick={handleCopyLink} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-900/30 text-teal-300 border border-teal-700/30 hover:bg-teal-800/40 transition-all">
                  <Share2 size={12} /> {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>
            ) : (
              <button onClick={handleGeneratePublicLink} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700 transition-all">
                <Share2 size={12} /> Gerar Link Analista
              </button>
            )}
            <button onClick={() => setEditOpen(true)} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700 transition-all">
              <Edit3 size={12} /> Editar Feedback
            </button>
            <button onClick={() => setPresentationMode(!presentationMode)} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-700/30 hover:bg-purple-800/40 transition-all">
              {presentationMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {presentationMode ? 'Sair' : 'Apresentação'}
            </button>
            <button onClick={handleDownloadTxt} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-900/30 text-teal-300 border border-teal-700/30 hover:bg-teal-800/40 transition-all">
              <Download size={12} /> Baixar TXT
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-700 transition-all disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button onClick={() => window.print()} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-900/40 text-sky-300 border border-sky-700/30 hover:bg-sky-800/50 transition-all">
              <Printer size={12} /> Baixar PDF
            </button>
          </div>
        </div>

        {/* ── HERO EXECUTIVO ── */}
        <div className="print-card relative overflow-hidden rounded-2xl border border-[#1E3050] shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0F1B31 0%, #0B1426 60%, #071020 100%)' }}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10 px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              {/* LEFT: Photo + Info */}
              <div className="flex items-center gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-sky-500/50 shadow-2xl shadow-sky-900/40" style={{ boxShadow: '0 0 32px rgba(56,189,248,0.18), 0 8px 32px rgba(0,0,0,0.5)' }}>
                    <img
                      src={analistaInfo?.foto_url || '/assets/images/no_image.png'}
                      className="w-full h-full object-cover"
                      alt={analistaNome}
                    />
                  </div>
                  {isHighScore && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-900/50">
                      <Star size={15} className="text-yellow-900 fill-yellow-900" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight leading-tight">{analistaNome}</h1>
                  <p className="text-sm text-sky-300/90 mt-1 font-semibold">{analistaInfo?.cargo_operacional || analista?.cargo || 'Analista de Qualidade'}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-slate-400">
                    {analistaEquipe && analistaEquipe !== '—' && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Equipe</span>
                        <strong className="text-slate-200">{analistaEquipe}</strong>
                      </span>
                    )}
                    {(analistaInfo?.coordenador || analista?.coordenador) && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Coord.</span>
                        <strong className="text-slate-200">{analistaInfo?.coordenador || analista?.coordenador}</strong>
                      </span>
                    )}
                    {analistaInfo?.tempo_empresa && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-600">Empresa</span>
                        <strong className="text-slate-200">{analistaInfo.tempo_empresa}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-900/50 text-sky-300 border border-sky-700/40">{analistaCiclo}</span>
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-green-900/40 text-green-400 border border-green-700/30 flex items-center gap-1">
                      <CheckCircle size={10} /> Concluído
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Big Scores */}
              <div className="flex items-stretch gap-4 lg:border-l lg:border-[#1E3050] lg:pl-8">
                {/* QA Score — highlighted */}
                <div className="text-center px-6 py-5 rounded-xl min-w-[120px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(14,165,233,0.06) 100%)',
                    border: '2px solid rgba(56,189,248,0.45)',
                    boxShadow: '0 0 24px rgba(56,189,248,0.18), inset 0 1px 0 rgba(56,189,248,0.15)'
                  }}>
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />
                  <p className="text-[9px] uppercase tracking-widest text-sky-400/70 mb-1 font-semibold">QA Score</p>
                  <p className="text-5xl font-black text-sky-300 leading-none tracking-tight">{qaScore ?? '—'}</p>
                  <p className="text-[11px] text-sky-500/60 mt-1 font-medium">/ 100</p>
                  {isHighScore && <p className="text-[10px] text-yellow-400 mt-1.5 font-bold">⭐ Destaque</p>}
                </div>
                <div className="text-center px-6 py-5 rounded-xl bg-[#07101F]/80 border border-teal-800/40 min-w-[120px]">
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">IEPC</p>
                  <p className="text-5xl font-black text-teal-400 leading-none tracking-tight">
                    {iepcScore ?? '—'}<span className="text-xl font-normal text-slate-500">%</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">Experiência</p>
                </div>
                <div className="text-center px-6 py-5 rounded-xl bg-[#07101F]/80 border border-purple-800/40 min-w-[120px]">
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Aderência</p>
                  <p className="text-5xl font-black text-purple-400 leading-none tracking-tight">
                    {aderenciaScore ?? '—'}<span className="text-xl font-normal text-slate-500">%</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">Critérios</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KPICard label="Aderência" value={aderenciaScore != null ? `${aderenciaScore}%` : '—'} icon={<Award size={14} />} star={Number(aderenciaScore) > 90} color={C.purple} sub={Number(aderenciaScore) > 90 ? '⭐ Excelente' : 'Meta: 90%'} />
          <KPICard label="Atendimentos" value={atendimentos.length || 0} icon={<Users size={14} />} color={C.blue} sub="Volume operacional" />
          <KPICard label="Não Conformidades" value={analytics?.total_nc ?? allNCs.length} icon={<AlertTriangle size={14} />} color={C.amber} sub="Pontos de atenção" />
          <KPICard label="Elogios" value={analytics?.total_elogios ?? allElogios.length} icon={<Star size={14} />} color={C.teal} sub="Reconhecimento" />
        </div>

        {/* ── RADARES SIDE BY SIDE ── */}
        <div className="grid lg:grid-cols-2 gap-4">
          <RadarChartCard title="ÍNDICE DE QUALIDADE DO ATENDIMENTO" subtitle="QA" pilares={qa_pilares} color={C.blue} totalScore={qaScore} />
          <RadarChartCard title="ÍNDICE DE EXPERIÊNCIA PERCEBIDA PELO CLIENTE" subtitle="IEPC" pilares={iepc_pilares} color={C.teal} totalScore={iepcScore} />
        </div>

        {/* ── HISTÓRICO ── */}
        <HistoricoChart historico={historico} />

        {/* ── PANORAMA DO CICLO ── */}
        {(evolucaoTecnica || evolucaoComportamental || atencaoEvolutiva || fechamentoCiclo) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Panorama do Ciclo</h3>
            {/* Row 1: Evolução Técnica full width */}
            {evolucaoTecnica && (
              <div className="bg-[#07101F]/60 rounded-lg p-3 border border-[#1E3050]/60 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-sky-400">Evolução Técnica</p>
                <p className="text-xs text-slate-300 leading-relaxed">{evolucaoTecnica}</p>
              </div>
            )}
            {/* Row 2: Evolução Comportamental + Atenção Evolutiva side by side */}
            {(evolucaoComportamental || atencaoEvolutiva) && (
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                {evolucaoComportamental && (
                  <div className="bg-[#07101F]/60 rounded-lg p-3 border border-[#1E3050]/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-teal-400">Evolução Comportamental</p>
                    <p className="text-xs text-slate-300 leading-relaxed">{evolucaoComportamental}</p>
                  </div>
                )}
                {atencaoEvolutiva && (
                  <div className="bg-[#07101F]/60 rounded-lg p-3 border border-amber-800/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-amber-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      Atenção Evolutiva
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">{atencaoEvolutiva}</p>
                  </div>
                )}
              </div>
            )}
            {/* Row 3: Fechamento do Ciclo */}
            {fechamentoCiclo && (
              <div className="bg-[#07101F]/60 rounded-lg p-3 border border-purple-800/20">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-purple-400">Fechamento do Ciclo</p>
                <p className="text-xs text-slate-300 leading-relaxed">{fechamentoCiclo}</p>
              </div>
            )}
          </div>
        )}

        {/* ── COACHING DE COMUNICAÇÃO ── */}
        {coaching.length > 0 && (
          <div className="print-card rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)', background: 'linear-gradient(180deg, #0F1B31 0%, #0A1220 100%)' }}>
            <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, transparent 100%)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <Zap size={14} className="text-amber-400 fill-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Coaching de Comunicação</h3>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
                {coaching.length} ponto{coaching.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className={`p-5 grid gap-5 ${coaching.length === 1 ? 'grid-cols-1' : coaching.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {coaching.map((c: any, i: number) => (
                <CoachingCard key={i} coaching={c} />
              ))}
            </div>
          </div>
        )}

        {/* ── MURAL DE ELOGIOS ── */}
        {allElogios.length > 0 && (
          <div className="print-card rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D2E2B 0%, #0A2420 50%, #071C19 100%)', border: '1px solid rgba(45,212,191,0.3)', boxShadow: '0 0 32px rgba(45,212,191,0.08)' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(45,212,191,0.15)', background: 'linear-gradient(90deg, rgba(45,212,191,0.12) 0%, transparent 100%)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(45,212,191,0.2)', border: '1px solid rgba(45,212,191,0.4)' }}>
                <Star size={15} className="text-teal-300 fill-teal-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-teal-200 uppercase tracking-wider">Mural de Reconhecimento</h3>
                <p className="text-[10px] text-teal-500 mt-0.5">{allElogios.length} elogio{allElogios.length > 1 ? 's' : ''} registrado{allElogios.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="p-5 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allElogios.map((e: any, i: number) => (
                <div key={i} className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:scale-[1.01]"
                  style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(45,212,191,0.05) 100%)', border: '1px solid rgba(45,212,191,0.25)', boxShadow: '0 2px 12px rgba(45,212,191,0.06)' }}>
                  <div className="flex items-start gap-2">
                    <Star size={14} className="text-teal-300 fill-teal-300 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-white leading-relaxed font-medium">&ldquo;{e.descricao || e.elogio}&rdquo;</p>
                  </div>
                  {(e.protocolo || e.cliente) && (
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(45,212,191,0.12)' }}>
                      {e.protocolo && <span className="text-[10px] text-teal-500 font-mono bg-teal-900/30 px-2 py-0.5 rounded">{e.protocolo}</span>}
                      {e.cliente && <span className="text-[10px] text-teal-400">{e.cliente}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATENDIMENTOS ── */}
        {atendimentos.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Atendimentos Avaliados <span className="text-slate-600 font-normal">({atendimentos.length})</span>
            </h3>
            <div className="space-y-2">
              {atendimentos.map((a: any, i: number) => (
                <AtendimentoAccordion key={i} atendimento={a} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── NÃO CONFORMIDADES — AMBER VISUAL DESTACADO ── */}
        {allNCs.length > 0 && (
          <div className="print-card rounded-xl border-2 border-amber-700/50 bg-[#0F1B31] overflow-hidden"
            style={{ boxShadow: '0 0 24px rgba(245,158,11,0.08)' }}>
            {/* Header */}
            <div className="px-5 py-3 border-b border-amber-700/30 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Não Conformidades</h3>
                  <p className="text-[10px] text-amber-500/70">{allNCs.length} ponto{allNCs.length > 1 ? 's' : ''} de atenção registrado{allNCs.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {allNCs.length} NC{allNCs.length > 1 ? 's' : ''}
              </span>
            </div>
            {/* Grid */}
            <div className="p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {allNCs.map((nc: any, i: number) => (
                <div key={i} className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3.5 hover:border-amber-600/50 hover:bg-amber-900/15 transition-all group">
                  {/* Top row: type + protocol */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={11} className="text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-amber-300 truncate">{nc.tipo || nc.tipo_nc || 'NC'}</span>
                    </div>
                    {(nc.protocolo || nc.protocolo_referencia) && (
                      <span className="text-[10px] text-amber-600/80 font-mono bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/20 flex-shrink-0">
                        {nc.protocolo || nc.protocolo_referencia}
                      </span>
                    )}
                  </div>
                  {/* Description */}
                  {nc.descricao && (
                    <p className="text-xs text-slate-300 leading-relaxed">{nc.descricao}</p>
                  )}
                  {/* Points deducted if available */}
                  {nc.pontos_deduzidos != null && nc.pontos_deduzidos !== 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-500/70">Dedução:</span>
                      <span className="text-[10px] font-bold text-amber-400">-{Math.abs(Number(nc.pontos_deduzidos))} pts</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLANO DE DESENVOLVIMENTO DO CICLO (PDI BLOCK) ── */}
        <PDIDevBlock
          pdiObjetivos={pdiObjetivos}
          setPdiObjetivos={setPdiObjetivos}
          mensagemEvolutiva={editFields.mensagem_evolutiva || extract(snapshot, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') || rawFeedback?.mensagem_evolutiva || ''}
          onMensagemChange={(v: string) => setEditFields((p: any) => ({ ...p, mensagem_evolutiva: v }))}
          analistaNome={analistaNome}
          ciclo={analistaCiclo}
          pdiCreated={pdiCreated}
          pdiCreating={pdiCreating}
          onCreatePDI={handleCreatePDI}
          isEditing={editOpen}
          onSavePdi={async () => {
            if (!rawFeedback) return;
            const snap = Array.isArray(rawFeedback.snapshot_json_completo)
              ? rawFeedback.snapshot_json_completo[0]
              : (rawFeedback.snapshot_json_completo || {});
            const updated = {
              ...snap,
              feedback_blocks: {
                ...(snap?.feedback_blocks || {}),
                pdi_objetivos: pdiObjetivos,
                mensagem_evolutiva: editFields.mensagem_evolutiva || snap?.feedback_blocks?.mensagem_evolutiva || '',
              },
            };
            await supabase.from('feedbacks').update({ snapshot_json_completo: updated }).eq('id', params?.id as string);
          }}
        />

        {/* ── BLOCO MOTIVACIONAL DE ENCERRAMENTO ── */}
        <MotivationalClosingBlock
          motivational={motivational}
          analistaNome={analistaNome}
          ciclo={analistaCiclo}
          qaScore={qaScore}
          iepcScore={iepcScore}
          aderenciaScore={aderenciaScore}
          ncsCount={allNCs.length}
          elogiosCount={allElogios.length}
        />
      </div>

      {/* ── EDIT MODAL ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm print-hide">
          <div className="bg-[#0F1B31] border border-[#1E3050] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2"><Edit3 size={16} className="text-sky-400" /> Editar Feedback</h2>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              {[
                { key: 'evolucao_tecnica', label: 'Evolução Técnica', color: 'text-sky-400' },
                { key: 'evolucao_comportamental', label: 'Evolução Comportamental', color: 'text-teal-400' },
                { key: 'atencao_evolutiva', label: 'Atenção Evolutiva', color: 'text-amber-400' },
                { key: 'fechamento_ciclo', label: 'Fechamento do Ciclo', color: 'text-purple-400' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${color}`}>{label}</label>
                  <textarea
                    value={editFields[key] || ''}
                    onChange={(e) => setEditFields((p: any) => ({ ...p, [key]: e.target.value }))}
                    rows={3}
                    className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
              ))}
              {/* Mensagem Evolutiva */}
              <div className="pt-2 border-t border-[#1E3050]">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-purple-400">Mensagem Evolutiva</label>
                <textarea
                  value={editFields.mensagem_evolutiva || ''}
                  onChange={(e) => setEditFields((p: any) => ({ ...p, mensagem_evolutiva: e.target.value }))}
                  rows={3}
                  className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:outline-none focus:border-sky-500/50 transition-colors"
                  placeholder="Deixe em branco — será exibida no bloco PDI abaixo"
                />
              </div>

              {/* PDI Objetivos */}
              <div className="pt-2 border-t border-[#1E3050]">
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-3 text-sky-400">Objetivos de Desenvolvimento (PDI)</label>
                <div className="space-y-3">
                  {pdiObjetivos.map((obj, index) => (
                    <div key={obj.id} className="rounded-xl p-4 space-y-3"
                      style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.18)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Objetivo {index + 1}</span>
                        {pdiObjetivos.length > 1 && (
                          <button type="button" onClick={() => setPdiObjetivos(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 rounded hover:bg-red-500/10 transition-colors"
                            style={{ color: '#EF4444' }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-sky-400/70">Categoria</label>
                        <input
                          value={obj.categoria}
                          onChange={(e) => setPdiObjetivos(prev => prev.map((o, i) => i === index ? { ...o, categoria: e.target.value } : o))}
                          placeholder="Ex: Técnico, Comportamental..."
                          className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-sky-400/70">Objetivo</label>
                        <input
                          value={obj.objetivo}
                          onChange={(e) => setPdiObjetivos(prev => prev.map((o, i) => i === index ? { ...o, objetivo: e.target.value } : o))}
                          placeholder="Descreva o objetivo de desenvolvimento..."
                          className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-teal-400/70">Ação Esperada</label>
                        <textarea
                          value={obj.acao_esperada}
                          onChange={(e) => setPdiObjetivos(prev => prev.map((o, i) => i === index ? { ...o, acao_esperada: e.target.value } : o))}
                          placeholder="Ação esperada para atingir o objetivo..."
                          rows={2}
                          className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-green-400/70">Resultado Esperado</label>
                        <textarea
                          value={obj.resultado_esperado}
                          onChange={(e) => setPdiObjetivos(prev => prev.map((o, i) => i === index ? { ...o, resultado_esperado: e.target.value } : o))}
                          placeholder="Resultado esperado ao final do ciclo..."
                          rows={2}
                          className="w-full bg-[#07101F] border border-[#1E3050] rounded-lg px-3 py-2 text-sm text-slate-200 resize-none focus:outline-none focus:border-green-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPdiObjetivos(prev => [...prev, newPdiObjetivo()])}
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center transition-all hover:bg-sky-500/10"
                  style={{ color: '#38BDF8', border: '1px dashed rgba(56,189,248,0.4)', backgroundColor: 'rgba(56,189,248,0.04)' }}
                >
                  <Plus size={14} /> Adicionar Objetivo
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 transition-colors">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#07101F]">
        {content}
      </div>
    );
  }

  return <EnterpriseLayout>{content}</EnterpriseLayout>;
}

// ── PDI DEVELOPMENT BLOCK ──
function PDIDevBlock({ pdiObjetivos, setPdiObjetivos, mensagemEvolutiva, onMensagemChange, analistaNome, ciclo, pdiCreated, pdiCreating, onCreatePDI, onSavePdi, isEditing }: {
  pdiObjetivos: PdiObjetivo[];
  setPdiObjetivos: React.Dispatch<React.SetStateAction<PdiObjetivo[]>>;
  mensagemEvolutiva: string;
  onMensagemChange: (v: string) => void;
  analistaNome: string;
  ciclo: string;
  pdiCreated: boolean;
  pdiCreating: boolean;
  onCreatePDI: () => void;
  onSavePdi: () => Promise<void>;
  isEditing?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSavePdi();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateObj = (index: number, updated: PdiObjetivo) => {
    setPdiObjetivos(prev => prev.map((o, i) => i === index ? updated : o));
  };

  const removeObj = (index: number) => {
    setPdiObjetivos(prev => prev.filter((_, i) => i !== index));
  };

  const addObj = () => {
    setPdiObjetivos(prev => [...prev, newPdiObjetivo()]);
  };

  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' };
  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none focus:border-sky-500/50 transition-colors';

  return (
    <div className="print-card relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #0B1E35 0%, #091828 60%, #071525 100%)',
        border: '1px solid rgba(56,189,248,0.3)',
        boxShadow: '0 0 32px rgba(56,189,248,0.06), 0 4px 24px rgba(0,0,0,0.4)',
      }}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.6), rgba(45,212,191,0.4), transparent)' }} />

      {/* Header */}
      <div className="px-6 py-5 flex items-center justify-between gap-4"
        style={{ borderBottom: '1px solid rgba(56,189,248,0.12)', background: 'linear-gradient(90deg, rgba(56,189,248,0.08) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(45,212,191,0.15))', border: '1px solid rgba(56,189,248,0.35)' }}>
            <Target size={18} className="text-sky-300" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-sky-400/70 mb-0.5">Continuidade Evolutiva · {ciclo}</p>
            <h2 className="text-base font-black text-white tracking-tight">Plano de Desenvolvimento do Ciclo</h2>
          </div>
        </div>
        {/* Action buttons — only in edit mode */}
        {isEditing && (
          <div className="flex items-center gap-2 print-hide">
            {saved && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/30">
                <CheckCircle size={12} /> Salvo
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              {saving ? <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" /> : <Save size={12} />}
              {saving ? 'Salvando...' : 'Salvar PDI'}
            </button>
            {pdiCreated ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/30">
                <CheckCircle size={12} /> PDI Gerado
              </span>
            ) : (
              <button
                onClick={onCreatePDI}
                disabled={pdiCreating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(45,212,191,0.15))', border: '1px solid rgba(56,189,248,0.35)', color: '#38BDF8' }}
              >
                {pdiCreating ? (
                  <div className="w-3 h-3 border border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <BookOpen size={12} />
                )}
                {pdiCreating ? 'Gerando...' : 'Gerar PDI'}
              </button>
            )}
          </div>
        )}
        {/* View mode: show PDI Gerado badge if applicable */}
        {!isEditing && pdiCreated && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-900/30 text-green-300 border border-green-700/30 print-hide">
            <CheckCircle size={12} /> PDI Gerado
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {isEditing ? (
          <>
            {/* Editable Objective Cards */}
            <div className="space-y-4">
              {pdiObjetivos.map((obj, index) => (
                <div key={obj.id} className="rounded-xl p-4 space-y-3 print-card"
                  style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Objetivo {index + 1}</span>
                    </div>
                    {pdiObjetivos.length > 1 && (
                      <button type="button" onClick={() => removeObj(index)}
                        className="p-1 rounded hover:bg-red-500/10 transition-colors print-hide"
                        style={{ color: '#EF4444' }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-sky-400/70">Categoria</label>
                    <input
                      value={obj.categoria}
                      onChange={(e) => updateObj(index, { ...obj, categoria: e.target.value })}
                      placeholder="Ex: Técnico, Comportamental..."
                      className={inputCls} style={inputStyle}
                    />
                  </div>

                  {/* Objetivo */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-sky-400/70">Objetivo</label>
                    <input
                      value={obj.objetivo}
                      onChange={(e) => updateObj(index, { ...obj, objetivo: e.target.value })}
                      placeholder="Descreva o objetivo de desenvolvimento..."
                      className={inputCls} style={inputStyle}
                    />
                  </div>

                  {/* Ação Esperada */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-teal-400/70">Ação Esperada</label>
                    <textarea
                      value={obj.acao_esperada}
                      onChange={(e) => updateObj(index, { ...obj, acao_esperada: e.target.value })}
                      placeholder="Ação esperada para atingir o objetivo..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none resize-none focus:border-teal-500/50 transition-colors"
                      style={inputStyle}
                    />
                  </div>

                  {/* Resultado Esperado */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 text-green-400/70">Resultado Esperado</label>
                    <textarea
                      value={obj.resultado_esperado}
                      onChange={(e) => updateObj(index, { ...obj, resultado_esperado: e.target.value })}
                      placeholder="Resultado esperado ao final do ciclo..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none resize-none focus:border-green-500/50 transition-colors"
                      style={inputStyle}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Objective Button */}
            <button
              type="button"
              onClick={addObj}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full justify-center transition-all hover:bg-sky-500/10 print-hide"
              style={{ color: '#38BDF8', border: '1px dashed rgba(56,189,248,0.4)', backgroundColor: 'rgba(56,189,248,0.04)' }}
            >
              <Plus size={14} /> Adicionar Objetivo
            </button>

            {/* Mensagem Evolutiva — editable */}
            <div className="rounded-xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(56,189,248,0.04) 100%)',
                border: '1px solid rgba(167,139,250,0.25)',
              }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  <Heart size={12} className="text-purple-400" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Mensagem Evolutiva</p>
                <span className="text-[10px] text-slate-600 ml-auto">opcional — automática se vazia</span>
              </div>
              {mensagemEvolutiva ? (
                <>
                  <Quote size={18} className="text-purple-700/40 mb-2" />
                  <p className="text-sm text-slate-100 leading-relaxed font-medium italic pl-2">{mensagemEvolutiva}</p>
                  <p className="text-[10px] text-slate-600 mt-3 text-right">— {analistaNome} · {ciclo}</p>
                  <button
                    type="button"
                    onClick={() => onMensagemChange('')}
                    className="mt-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors print-hide"
                  >
                    ✏️ Editar mensagem
                  </button>
                </>
              ) : (
                <textarea
                  value={mensagemEvolutiva}
                  onChange={(e) => onMensagemChange(e.target.value)}
                  placeholder="Deixe em branco para geração automática, ou escreva uma mensagem personalizada..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm text-slate-200 outline-none resize-none focus:border-purple-500/50 transition-colors"
                  style={inputStyle}
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* READ-ONLY Objective Cards */}
            {pdiObjetivos.length === 0 || (pdiObjetivos.length === 1 && !pdiObjetivos[0].objetivo && !pdiObjetivos[0].categoria) ? (
              <p className="text-sm text-slate-500 italic text-center py-4">Nenhum objetivo de desenvolvimento registrado.</p>
            ) : (
              <div className="space-y-4">
                {pdiObjetivos.filter(obj => obj.objetivo || obj.categoria || obj.acao_esperada || obj.resultado_esperado).map((obj, index) => (
                  <div key={obj.id} className="rounded-xl p-4 space-y-3 print-card"
                    style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.18)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Objetivo {index + 1}</span>
                      {obj.categoria && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}>
                          {obj.categoria}
                        </span>
                      )}
                    </div>
                    {obj.objetivo && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400/70 mb-1">Objetivo</p>
                        <p className="text-sm text-slate-200">{obj.objetivo}</p>
                      </div>
                    )}
                    {obj.acao_esperada && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/70 mb-1">Ação Esperada</p>
                        <p className="text-sm text-slate-300">{obj.acao_esperada}</p>
                      </div>
                    )}
                    {obj.resultado_esperado && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-green-400/70 mb-1">Resultado Esperado</p>
                        <p className="text-sm text-slate-300">{obj.resultado_esperado}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mensagem Evolutiva — read-only */}
            {mensagemEvolutiva && (
              <div className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(56,189,248,0.04) 100%)',
                  border: '1px solid rgba(167,139,250,0.25)',
                }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                    <Heart size={12} className="text-purple-400" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Mensagem Evolutiva</p>
                </div>
                <Quote size={18} className="text-purple-700/40 mb-2" />
                <p className="text-sm text-slate-100 leading-relaxed font-medium italic pl-2">{mensagemEvolutiva}</p>
                <p className="text-[10px] text-slate-600 mt-3 text-right">— {analistaNome} · {ciclo}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── MOTIVATIONAL CLOSING BLOCK ──
function MotivationalClosingBlock({ motivational, analistaNome, ciclo, qaScore, iepcScore, aderenciaScore, ncsCount, elogiosCount }: any) {
  const levelColors = {
    high: { border: 'border-sky-500/40', glow: 'rgba(56,189,248,0.08)', accent: '#38BDF8', badge: 'bg-sky-900/40 text-sky-300 border-sky-700/40', icon: '⭐' },
    mid: { border: 'border-teal-500/40', glow: 'rgba(45,212,191,0.08)', accent: '#2DD4BF', badge: 'bg-teal-900/40 text-teal-300 border-teal-700/40', icon: '📈' },
    low: { border: 'border-purple-500/40', glow: 'rgba(167,139,250,0.08)', accent: '#A78BFA', badge: 'bg-purple-900/40 text-purple-300 border-purple-700/40', icon: '🌱' },
  };
  const lc = levelColors[motivational.level as keyof typeof levelColors];

  return (
    <div
      className={`print-card relative overflow-hidden rounded-2xl border-2 ${lc.border} w-full`}
      style={{
        background: `linear-gradient(135deg, #0F1B31 0%, #0B1426 60%, #071020 100%)`,
        boxShadow: `0 0 40px ${lc.glow}, 0 4px 24px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${lc.glow} 0%, transparent 70%)` }} />
      <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${lc.glow} 0%, transparent 70%)` }} />

      <div className="relative z-10 px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
              style={{ background: `${lc.accent}15`, borderColor: `${lc.accent}30` }}>
              {lc.icon}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: `${lc.accent}80` }}>
                Encerramento do Ciclo · {ciclo}
              </p>
              <h2 className="text-xl font-black text-white leading-tight">{motivational.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mensagem de desenvolvimento e evolução profissional</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {qaScore != null && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${lc.badge}`}>
                QA {qaScore}
              </span>
            )}
            {iepcScore != null && (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-teal-900/40 text-teal-300 border-teal-700/40">
                IEPC {iepcScore}%
              </span>
            )}
            {aderenciaScore != null && (
              <span className="px-3 py-1 rounded-full text-xs font-bold border bg-purple-900/40 text-purple-300 border-purple-700/40">
                Aderência {aderenciaScore}%
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full mb-6" style={{ background: `linear-gradient(90deg, transparent, ${lc.accent}30, transparent)` }} />

        {/* Message */}
        <div className="relative">
          <Quote size={32} className="absolute -top-2 -left-1 opacity-10" style={{ color: lc.accent }} />
          <p className="text-base text-slate-200 leading-relaxed pl-6 font-medium">
            {motivational.message}
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap gap-4">
          {ncsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/20">
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="text-xs text-amber-300 font-medium">{ncsCount} NC{ncsCount > 1 ? 's' : ''} para acompanhamento</span>
            </div>
          )}
          {elogiosCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-900/20 border border-teal-700/20">
              <Star size={13} className="text-teal-400" />
              <span className="text-xs text-teal-300 font-medium">{elogiosCount} elogio{elogiosCount > 1 ? 's' : ''} registrado{elogiosCount > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30">
            <TrendingUp size={13} style={{ color: lc.accent }} />
            <span className="text-xs text-slate-400 font-medium">Próximo ciclo: foco em evolução contínua</span>
          </div>
        </div>

        {/* Footer signature */}
        <div className="mt-6 pt-4 border-t border-slate-700/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart size={12} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">Documento oficial de desenvolvimento — QualiVisão</span>
          </div>
          <span className="text-[10px] text-slate-700 font-mono">{analistaNome} · {ciclo}</span>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ──

function KPICard({ label, value, icon, color, star, sub }: any) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1E3050] bg-[#0F1B31] px-4 py-3 hover:border-sky-800/40 transition-all duration-200">
      {star && <Star size={12} className="absolute top-3 right-3 text-yellow-400 fill-yellow-400" />}
      <div className="flex items-center gap-2 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight text-white leading-none mb-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

// Custom tooltip for radar
function CustomRadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  let nota = d.nota ?? 0;
  let maximo = d.maximo ?? 100;
  const pct = Math.round((nota / maximo) * 100);
  return (
    <div className="bg-[#0F1B31] border border-[#1E3050] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.subject}</p>
      <p className="text-slate-300">{nota} / {maximo}</p>
      <p className="font-bold" style={{ color: pct >= 90 ? '#22C55E' : pct >= 80 ? '#2DD4BF' : pct >= 70 ? '#F59E0B' : '#EF4444' }}>{pct}%</p>
    </div>
  );
}

function pillarBarColor(pct: number) {
  if (pct >= 90) return '#22C55E';
  if (pct >= 80) return '#2DD4BF';
  if (pct >= 70) return '#F59E0B';
  return '#EF4444';
}

// Custom label for radar chart that shows percentage directly on the drawing
function CustomRadarLabel(props: any) {
  const { x, y, payload } = props;
  if (!payload) return null;
  let nota = payload.nota ?? 0;
  let maximo = payload.maximo ?? 100;
  const pct = Math.round((nota / maximo) * 100);
  const color = pillarBarColor(pct);
  return (
    <g>
      <text x={x} y={y - 2} textAnchor="middle" fill="#94A3B8" fontSize={7} fontWeight="500">
        {(payload.subject || '').length > 12 ? (payload.subject || '').slice(0, 12) + '…' : (payload.subject || '')}
      </text>
      <text x={x} y={y + 9} textAnchor="middle" fill={color} fontSize={8} fontWeight="700">
        {pct}%
      </text>
    </g>
  );
}

function pilarNotaValue(p: any): number {
  return readPilarNota(p);
}

function pilarMaximoValue(p: any): number {
  return readPilarMaximo(p);
}

function RadarChartCard({ title, subtitle, pilares, color, totalScore }: any) {
  const list = pilares || [];
  const chartData = list.map((p: any) => {
    let nota = pilarNotaValue(p);
    let maximo = pilarMaximoValue(p);
    const pct = Math.round((nota / maximo) * 100);
    return {
      subject: (p.nome || p.name || '').length > 12 ? (p.nome || p.name || '').slice(0, 12) + '…' : (p.nome || p.name || ''),
      A: nota,
      fullMark: maximo,
      nota,
      maximo,
      pct,
    };
  });

  const best = list.reduce((a: any, b: any) => {
    const bScore = pilarNotaValue(b);
    const aScore = a ? pilarNotaValue(a) : 0;
    return bScore > aScore ? b : a;
  }, null);

  const scoreDisplay = totalScore != null ? String(totalScore) : '—';
  const isPercent = subtitle === 'IEPC';

  return (
    <div className="rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">{title}</p>
          <p className="text-sm font-bold text-slate-300">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black leading-none" style={{ color }}>
            {scoreDisplay}{isPercent && totalScore != null ? '%' : ''}
          </p>
          {best && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold mt-1 inline-block" style={{ backgroundColor: `${color}20`, color }}>
              ⭐ {(best.nome || best.name || '').split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* Pillar list */}
        <div className="flex-1 space-y-2 min-w-0">
          {list.length > 0 ? list.map((p: any, i: number) => {
            let nota = pilarNotaValue(p);
            let maximo = pilarMaximoValue(p);
            const pct = Math.round((nota / maximo) * 100);
            const barColor = pillarBarColor(pct);
            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-slate-300 truncate flex-1 mr-2 font-medium">
                    <span className="text-slate-600 mr-1">{i + 1}</span>
                    {p.nome || p.name}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">{nota}/{maximo}</span>
                    <span className="text-[11px] font-bold" style={{ color: barColor }}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#1E3050] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          }) : (
            <div className="text-slate-600 text-xs py-4">Sem dados de pilares</div>
          )}
        </div>

        {/* Radar chart with inline % labels */}
        {chartData.length > 0 && (
          <div className="flex-shrink-0 w-[180px]">
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={chartData} margin={{ top: 16, right: 20, bottom: 16, left: 20 }}>
                <PolarGrid stroke="#1E3050" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={(props: any) => <CustomRadarLabel {...props} payload={chartData[props.index]} />}
                />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
                <RechartsTooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricoChart({ historico }: { historico: any[] }) {
  const data = (historico || []).slice(-12);
  return (
    <div className="rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Evolução Histórica</h3>
          {data.length > 0 && (
            <p className="text-[10px] text-slate-600 mt-0.5">{data.length} ciclo{data.length > 1 ? 's' : ''} registrado{data.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-0.5 bg-sky-400 inline-block rounded" /> QA</span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-0.5 bg-teal-400 inline-block rounded" /> IEPC</span>
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
            <XAxis dataKey="ciclo" stroke="#475569" fontSize={8} tick={{ fill: '#475569' }} />
            <YAxis domain={[0, 100]} stroke="#475569" fontSize={8} tick={{ fill: '#475569' }} />
            <RechartsTooltip
              contentStyle={{ background: '#0F1B31', border: '1px solid #1E3050', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="qa" stroke="#38BDF8" strokeWidth={2} dot={{ fill: '#38BDF8', r: 3 }} name="QA" />
            <Line type="monotone" dataKey="iepc" stroke="#2DD4BF" strokeWidth={2} dot={{ fill: '#2DD4BF', r: 3 }} name="IEPC" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-slate-600 text-xs">Sem histórico disponível</div>
      )}
    </div>
  );
}

// ── COACHING CARD — Premium enterprise mentoring card ──
function CoachingCard({ coaching: c }: { coaching: any }) {
  return (
    <div className="rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-amber-900/10"
      style={{ background: 'linear-gradient(180deg, #111E35 0%, #0C1828 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
      {/* Category badge header */}
      {c.categoria && (
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(245,158,11,0.12)', background: 'rgba(245,158,11,0.06)' }}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Zap size={9} className="fill-amber-400" />
            {c.categoria}
          </span>
        </div>
      )}
      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {/* O QUE FOI DITO */}
        {c.o_que_foi_dito && (
          <div className="px-4 py-3.5" style={{ background: 'rgba(239,68,68,0.05)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#EF4444' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              O que foi dito
            </p>
            <p className="text-sm text-slate-300 italic leading-relaxed font-medium">&ldquo;{c.o_que_foi_dito}&rdquo;</p>
          </div>
        )}
        {/* COMO PODERIA SER */}
        {c.como_poderia_ser && (
          <div className="px-4 py-3.5" style={{ background: 'rgba(45,212,191,0.05)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#2DD4BF' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
              Como poderia ser
            </p>
            <p className="text-sm text-slate-200 italic leading-relaxed font-medium">&ldquo;{c.como_poderia_ser}&rdquo;</p>
          </div>
        )}
        {/* DICA DE OURO */}
        {c.dica_de_ouro && (
          <div className="px-4 py-3.5" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.04) 100%)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#F59E0B' }}>
              <Zap size={10} className="fill-amber-400 text-amber-400" />
              Dica de Ouro
            </p>
            <p className="text-sm text-amber-100 leading-relaxed font-medium">{c.dica_de_ouro}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ATENDIMENTO ACCORDION — Criteria grouped by pilar ──
function AtendimentoAccordion({ atendimento, index }: { atendimento: any; index: number }) {
  const [open, setOpen] = useState(false);
  const score = Number(atendimento.nota_qa ?? atendimento.nota) || 0;
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = score >= 90 ? 'bg-green-900/30 border-green-700/30' : score >= 70 ? 'bg-amber-900/30 border-amber-700/30' : 'bg-red-900/30 border-red-700/30';

  // Group criteria by pilar
  const criteriosByPilar = (atendimento.criterios || []).reduce((acc: Record<string, any[]>, c: any) => {
    const key = c.pilar_nome || c.pilar_codigo || 'Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const pilarEntries = Object.entries(criteriosByPilar) as [string, any[]][];

  return (
    <div className="rounded-lg border border-[#1E3050] bg-[#07101F]/60 overflow-hidden transition-all duration-200 hover:border-sky-900/40">
      <button
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#0F1B31]/60 transition-all text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="font-mono text-xs font-bold text-sky-400 flex-shrink-0">#{atendimento.protocolo || index + 1}</span>
          {atendimento.sup && <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">{atendimento.sup}</span>}
          <span className="text-xs text-slate-300 truncate">{atendimento.cliente || 'Cliente'}</span>
          {atendimento.assunto && <span className="text-[10px] text-slate-500 truncate hidden md:block">{atendimento.assunto}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {score > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scoreBg} ${scoreColor}`}>
              QA {score}
            </span>
          )}
          {atendimento.data && <span className="text-[10px] text-slate-600 hidden sm:block">{atendimento.data}</span>}
          {open ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#1E3050] bg-[#0A1525]/60">
          {/* Meta info row */}
          <div className="px-4 py-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-slate-500 border-b border-[#1E3050]/50">
            {atendimento.sup && <span>SUP: <strong className="text-slate-400">{atendimento.sup}</strong></span>}
            {atendimento.duracao && <span>Duração: <strong className="text-slate-400">Aprox. {atendimento.duracao}</strong></span>}
            {atendimento.data && <span>Data: <strong className="text-slate-400">{atendimento.data}</strong></span>}
            {atendimento.informou_sup != null && (
              <span className={atendimento.informou_sup ? 'text-green-400' : 'text-slate-500'}>
                {atendimento.informou_sup ? '✓ Informou SUP ao cliente' : '✗ Não informou SUP'}
              </span>
            )}
          </div>

          {/* Síntese + Solução */}
          <div className="px-4 py-3 space-y-2">
            {atendimento.sintese && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Síntese</p>
                <p className="text-xs text-slate-300 leading-relaxed">{atendimento.sintese}</p>
              </div>
            )}
            {atendimento.solucao && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Solução Aplicada</p>
                <p className="text-xs text-slate-400 leading-relaxed">{atendimento.solucao}</p>
              </div>
            )}
          </div>

          {/* Critérios grouped by pilar */}
          {pilarEntries.length > 0 && (
            <div className="px-4 pb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Critérios Avaliados por Pilar</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {pilarEntries.map(([pilarNome, criterios], pi) => (
                  <div key={pi} className="rounded-lg border border-[#1E3050] bg-[#07101F]/80 overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#1E3050]/60 bg-[#0F1B31]/60">
                      <p className="text-[10px] font-bold text-slate-300 leading-tight">{pilarNome}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      {(criterios as any[]).sort((a, b) => (a.criterio_codigo || '').localeCompare(b.criterio_codigo || '')).map((c: any, ci: number) => {
                        const badge = statusBadge(c.status);
                        return (
                          <div key={ci} className="flex items-center justify-between gap-2 py-0.5">
                            <span className="text-[10px] text-slate-400 truncate flex-1">
                              {c.criterio_codigo && <span className="text-slate-600 mr-1">{c.criterio_codigo}</span>}
                              {c.criterio_nome || c.nome}
                            </span>
                            <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold ${badge.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}