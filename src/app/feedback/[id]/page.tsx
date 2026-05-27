'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { AlertTriangle, Printer, Star, ChevronDown, ChevronUp, Quote, Maximize2, Minimize2, Edit3, Share2, CheckCircle, X, Save, Award, Users, Zap } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const C = {
  bg: '#07101F', surface: '#0F1B31', border: '#1E3050',
  blue: '#38BDF8', teal: '#2DD4BF', purple: '#A78BFA', amber: '#F59E0B',
  green: '#22C55E', red: '#EF4444'
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    aderido: 'bg-green-900/30 text-green-400 border border-green-700/30',
    parcial: 'bg-amber-900/30 text-amber-400 border border-amber-700/30',
    nao_aderido: 'bg-red-900/30 text-red-400 border border-red-700/30',
    nao_avaliado: 'bg-slate-800/50 text-slate-500 border border-slate-700/30',
    nao_evidenciado: 'bg-red-900/30 text-red-400 border border-red-700/30',
    nao_aplicavel: 'bg-slate-800/50 text-slate-500 border border-slate-700/30',
  };
  const labels: Record<string, string> = {
    aderido: 'Aderido', parcial: 'Parcial',
    nao_aderido: 'Não Aderido', nao_avaliado: 'N/A',
    nao_evidenciado: 'Não Evidenciado', nao_aplicavel: 'N/A',
  };
  return { cls: map[status] || map.nao_avaliado, label: labels[status] || status };
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

export default function FeedbackViewPage() {
  const params = useParams();
  const supabase = createClient();
  const [snapshot, setSnapshot] = useState<any>(null);
  const [rawFeedback, setRawFeedback] = useState<any>(null);
  const [analistaInfo, setAnalistaInfo] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [elogios, setElogios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const id = params?.id as string;
    if (!id) return;

    // 1. Load the feedback record + analista join
    const { data: rawData } = await supabase
      .from('feedbacks')
      .select('*, analistas(*)')
      .eq('id', id)
      .maybeSingle();

    if (!rawData) { setLoading(false); return; }

    setRawFeedback(rawData);
    setPublicToken(rawData.public_token || null);

    // 2. Normalize snapshot — Lovable sends the full payload as snapshot_json_completo
    const snap = Array.isArray(rawData.snapshot_json_completo)
      ? rawData.snapshot_json_completo[0]
      : (rawData.snapshot_json_completo || {});

    setSnapshot(snap);
    setAnalistaInfo(rawData.analistas);

    // 3. Set edit fields from snapshot + direct columns
    setEditFields({
      fechamento_ciclo: extract(snap, 'feedback_blocks.fechamento_ciclo', 'fechamento') || rawData.resumo_ciclo || '',
      evolucao_tecnica: extract(snap, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') || rawData.evolucao_tecnica || '',
      evolucao_comportamental: extract(snap, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') || rawData.evolucao_comportamental || '',
      atencao_evolutiva: extract(snap, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') || '',
    });

    // 4. Load real historical data from feedback_historico table by analista_id
    if (rawData.analista_id) {
      const { data: histRows } = await supabase
        .from('feedback_historico')
        .select('ciclo, qa_score, iepc_score, aderencia_score')
        .eq('analista_id', rawData.analista_id)
        .order('created_at', { ascending: true });

      // Also load from feedbacks table (all past feedbacks for this analista)
      const { data: pastFeedbacks } = await supabase
        .from('feedbacks')
        .select('ciclo, qa_score, iepc_score, aderencia_score, created_at')
        .eq('analista_id', rawData.analista_id)
        .order('created_at', { ascending: true });

      // Merge: prefer feedback_historico, supplement with feedbacks table
      const histMap = new Map<string, any>();
      (pastFeedbacks || []).forEach((f: any) => {
        histMap.set(f.ciclo, { ciclo: f.ciclo, qa: Number(f.qa_score) || 0, iepc: Number(f.iepc_score) || 0 });
      });
      (histRows || []).forEach((h: any) => {
        histMap.set(h.ciclo, { ciclo: h.ciclo, qa: Number(h.qa_score) || 0, iepc: Number(h.iepc_score) || 0 });
      });
      setHistorico(Array.from(histMap.values()));

      // 5. Load elogios from elogios table by analista name + ciclo
      const analistaNome = rawData.analistas?.nome || rawData.analistas?.nome_completo;
      if (analistaNome) {
        const { data: elogiosRows } = await supabase
          .from('elogios')
          .select('elogio, protocolo, cliente, periodo')
          .ilike('colaborador', `%${analistaNome.split(' ')[0]}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        setElogios(elogiosRows || []);
      }
    }

    setLoading(false);
  }, [params?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGeneratePublicLink = async () => {
    const token = crypto.randomUUID();
    await supabase.from('feedbacks').update({ public_token: token }).eq('id', params?.id as string);
    setPublicToken(token);
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
  const qa_pilares: any[] = snapshot?.qa_pilares || [];
  const iepc_pilares: any[] = snapshot?.iepc_pilares || [];
  const coaching: any[] = snapshot?.coaching || [];
  const atendimentos: any[] = snapshot?.atendimentos || [];
  const nao_conformidades: any[] = snapshot?.nao_conformidades || [];
  const feedback_blocks = snapshot?.feedback_blocks || {};
  const analytics = snapshot?.analytics || {};

  // Scores: prefer snapshot.scores, fallback to rawFeedback columns
  const qaScore = scores?.qa ?? rawFeedback?.qa_score ?? null;
  const iepcScore = scores?.iepc ?? rawFeedback?.iepc_score ?? null;
  const aderenciaScore = scores?.aderencia ?? rawFeedback?.aderencia_score ?? null;

  // Analista name: prefer snapshot.analista.nome, fallback to analistas table
  const analistaNome = analista?.nome || analistaInfo?.nome || analistaInfo?.nome_completo || '—';
  const analistaEquipe = analista?.equipe || rawFeedback?.equipe || analistaInfo?.equipe || analistaInfo?.squad || '—';
  const analistaCiclo = analista?.ciclo || rawFeedback?.ciclo || '—';

  // Panorama blocks
  const evolucaoTecnica = extract(snapshot, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') || rawFeedback?.evolucao_tecnica || '';
  const evolucaoComportamental = extract(snapshot, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') || rawFeedback?.evolucao_comportamental || '';
  const atencaoEvolutiva = extract(snapshot, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') || '';
  const fechamentoCiclo = extract(snapshot, 'feedback_blocks.fechamento_ciclo', 'fechamento') || rawFeedback?.resumo_ciclo || '';

  // Elogios: merge snapshot elogios + real elogios from DB
  const snapshotElogios = snapshot?.elogios || [];
  const allElogios = [
    ...elogios.map((e: any) => ({ descricao: e.elogio, protocolo: e.protocolo })),
    ...snapshotElogios,
  ];

  // NCs: merge snapshot NCs
  const allNCs = nao_conformidades.length > 0 ? nao_conformidades : [];

  const content = (
    <div className="min-h-screen text-slate-200 pb-12 bg-[#07101F]">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .print-card { background: white !important; border: 1px solid #e2e8f0 !important; color: #111 !important; break-inside: avoid; }
          @page { size: A4; margin: 14mm 16mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="px-5 py-4 max-w-screen-xl mx-auto space-y-4">

        {/* ── TOP ACTION BAR ── */}
        <div className="print-hide flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-900/40 text-sky-300 border border-sky-700/30">
              {analistaCiclo}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-900/30 text-green-400 border border-green-700/30 flex items-center gap-1">
              <CheckCircle size={10} /> Concluído
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {publicToken ? (
              <button onClick={handleCopyLink} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-900/30 text-teal-300 border border-teal-700/30 hover:bg-teal-800/40 transition-all">
                <Share2 size={12} /> {copied ? 'Copiado!' : 'Copiar Link Analista'}
              </button>
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
            <button onClick={() => window.print()} className="print-hide flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-900/40 text-sky-300 border border-sky-700/30 hover:bg-sky-800/50 transition-all">
              <Printer size={12} /> Baixar PDF
            </button>
          </div>
        </div>

        {/* ── HERO EXECUTIVO COMPACTO ── */}
        <div className="print-card relative overflow-hidden rounded-xl border border-[#1E3050] bg-[#0F1B31] px-5 py-4 shadow-lg">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#16233B] border border-[#1E3050] overflow-hidden flex-shrink-0 shadow-lg">
                <img
                  src={analistaInfo?.foto_url || '/assets/images/no_image.png'}
                  className="w-full h-full object-cover"
                  alt={analistaNome}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">{analistaNome}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{analistaInfo?.cargo_operacional || analista?.cargo || 'Analista de Qualidade'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                  {analistaEquipe && analistaEquipe !== '—' && <span>Equipe: <strong className="text-slate-300">{analistaEquipe}</strong></span>}
                  {(analistaInfo?.coordenador || analista?.coordenador) && (
                    <span>Coord: <strong className="text-slate-300">{analistaInfo?.coordenador || analista?.coordenador}</strong></span>
                  )}
                  {analistaInfo?.tempo_empresa && <span>Empresa: <strong className="text-slate-300">{analistaInfo.tempo_empresa}</strong></span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 lg:border-l lg:border-[#1E3050] lg:pl-5">
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">QA Score</p>
                <p className="text-3xl font-bold text-sky-400 leading-none">{qaScore ?? '—'}</p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">IEPC</p>
                <p className="text-3xl font-bold text-teal-400 leading-none">{iepcScore ?? '—'}<span className="text-base font-normal text-slate-500">%</span></p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">Aderência</p>
                <p className="text-3xl font-bold text-purple-400 leading-none">{aderenciaScore ?? '—'}<span className="text-base font-normal text-slate-500">%</span></p>
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

        {/* ── RADARES + HISTÓRICO ── */}
        <div className="grid lg:grid-cols-3 gap-4">
          <RadarChartCard title="Radar QA" pilares={qa_pilares} color={C.blue} />
          <RadarChartCard title="Radar IEPC" pilares={iepc_pilares} color={C.teal} />
          <HistoricoChart historico={historico} />
        </div>

        {/* ── PANORAMA DO CICLO ── */}
        {(evolucaoTecnica || evolucaoComportamental || atencaoEvolutiva || fechamentoCiclo) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Panorama do Ciclo</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Evolução Técnica', value: evolucaoTecnica, color: 'text-sky-400' },
                { label: 'Evolução Comportamental', value: evolucaoComportamental, color: 'text-teal-400' },
                { label: 'Atenção Evolutiva', value: atencaoEvolutiva, color: 'text-amber-400' },
                { label: 'Fechamento do Ciclo', value: fechamentoCiclo, color: 'text-purple-400' },
              ].filter(b => b.value).map((block, i) => (
                <div key={i} className="bg-[#07101F]/60 rounded-lg p-3 border border-[#1E3050]/60">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${block.color}`}>{block.label}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{block.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COACHING ── */}
        {coaching.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-3">Coaching de Comunicação</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {coaching.map((c: any, i: number) => (
                <div key={i} className="border-l-2 border-amber-500/50 pl-3 py-1 bg-[#07101F]/40 rounded-r-lg pr-3">
                  <p className="text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5"><Zap size={10} /> {c.categoria || 'Dica de Ouro'}</p>
                  {c.o_que_foi_dito && <p className="text-[11px] text-slate-500 mb-1"><span className="text-slate-400">Dito:</span> {c.o_que_foi_dito}</p>}
                  {c.como_poderia_ser && <p className="text-[11px] text-slate-400 mb-1"><span className="text-slate-300">Melhor:</span> {c.como_poderia_ser}</p>}
                  {c.dica_de_ouro && <p className="text-[11px] text-amber-200 italic">&ldquo;{c.dica_de_ouro}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MURAL DE ELOGIOS ── */}
        {allElogios.length > 0 && (
          <div className="print-card rounded-xl border border-teal-900/30 bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-teal-400 uppercase tracking-widest mb-3">Mural de Reconhecimento</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {allElogios.map((e: any, i: number) => (
                <div key={i} className="bg-teal-900/10 border border-teal-700/20 p-3 rounded-lg flex items-start gap-2 hover:border-teal-600/30 transition-all">
                  <Star size={13} className="text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-300 leading-relaxed">&ldquo;{e.descricao || e.elogio}&rdquo;</p>
                    {e.protocolo && <p className="text-[10px] text-slate-600 mt-1 font-mono">{e.protocolo}</p>}
                  </div>
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

        {/* ── NÃO CONFORMIDADES ── */}
        {allNCs.length > 0 && (
          <div className="print-card rounded-xl border border-amber-900/30 bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-3">
              Pontos de Atenção <span className="text-slate-600 font-normal">({allNCs.length})</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-2">
              {allNCs.map((nc: any, i: number) => (
                <div key={i} className="bg-amber-900/10 border border-amber-700/20 p-3 rounded-lg hover:border-amber-600/30 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-amber-300">{nc.tipo || nc.tipo_nc}</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">{nc.protocolo || nc.protocolo_referencia}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{nc.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FECHAMENTO ── */}
        {fechamentoCiclo && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-5 text-center">
            <Quote size={24} className="text-sky-400/20 mx-auto mb-3" />
            <p className="text-sm font-medium italic text-slate-200 max-w-2xl mx-auto leading-relaxed">
              &ldquo;{fechamentoCiclo}&rdquo;
            </p>
          </div>
        )}
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

function RadarChartCard({ title, pilares, color }: any) {
  const list = pilares || [];
  const chartData = list.map((p: any) => ({
    subject: (p.nome || p.name || '').length > 12 ? (p.nome || p.name || '').slice(0, 12) + '…' : (p.nome || p.name || ''),
    A: Number(p.nota ?? p.pontuacao ?? p.score) || 0,
    fullMark: Number(p.maximo ?? p.max ?? 100) || 100,
  }));

  const best = list.reduce((a: any, b: any) => {
    const bScore = Number(b.nota ?? b.pontuacao ?? b.score) || 0;
    const aScore = Number(a?.nota ?? a?.pontuacao ?? a?.score) || 0;
    return bScore > aScore ? b : a;
  }, null);

  return (
    <div className="rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
        {best && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${color}20`, color }}>
            ⭐ {(best.nome || best.name || '').split(' ')[0]}
          </span>
        )}
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <PolarGrid stroke="#1E3050" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 9 }} />
            <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-slate-600 text-xs">Sem dados de pilares</div>
      )}
      {list.length > 0 && (
        <div className="mt-2 space-y-1">
          {list.map((p: any, i: number) => {
            const nota = Number(p.nota ?? p.pontuacao ?? p.score) || 0;
            const maximo = Number(p.maximo ?? p.max ?? 100) || 100;
            const pct = Math.round((nota / maximo) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-24 truncate">{p.nome || p.name}</span>
                <div className="flex-1 h-1.5 bg-[#1E3050] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] font-mono text-slate-400 w-16 text-right">{nota}/{maximo}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoricoChart({ historico }: { historico: any[] }) {
  const data = (historico || []).slice(-10);
  return (
    <div className="rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Evolução Histórica</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
            <XAxis dataKey="ciclo" stroke="#475569" fontSize={8} tick={{ fill: '#475569' }} />
            <YAxis domain={[0, 100]} stroke="#475569" fontSize={8} tick={{ fill: '#475569' }} />
            <Tooltip
              contentStyle={{ background: '#0F1B31', border: '1px solid #1E3050', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }}
            />
            <Line type="monotone" dataKey="qa" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} name="QA" />
            <Line type="monotone" dataKey="iepc" stroke={C.teal} strokeWidth={2} dot={{ fill: C.teal, r: 3 }} name="IEPC" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-slate-600 text-xs">Sem histórico disponível</div>
      )}
      <div className="flex items-center gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-0.5 bg-sky-400 inline-block rounded" /> QA</span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-0.5 bg-teal-400 inline-block rounded" /> IEPC</span>
      </div>
    </div>
  );
}

function AtendimentoAccordion({ atendimento, index }: { atendimento: any; index: number }) {
  const [open, setOpen] = useState(false);
  const score = Number(atendimento.nota_qa ?? atendimento.nota) || 0;
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="rounded-lg border border-[#1E3050] bg-[#07101F]/60 overflow-hidden transition-all duration-200 hover:border-sky-900/40">
      <button
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#0F1B31]/60 transition-all text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">#{index + 1}</span>
          <span className="font-mono text-xs font-bold text-sky-400 flex-shrink-0">{atendimento.protocolo}</span>
          <span className="text-xs text-slate-300 truncate">{atendimento.cliente}</span>
          {atendimento.assunto && <span className="text-[10px] text-slate-600 truncate hidden md:block">{atendimento.assunto}</span>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className={`text-xs font-bold ${scoreColor}`}>QA {atendimento.nota_qa ?? atendimento.nota ?? '—'}</span>
          {open ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 border-t border-[#1E3050] space-y-2.5 bg-[#0A1525]/60">
          {atendimento.sintese && (
            <p className="text-xs text-slate-300 leading-relaxed"><span className="text-slate-500 font-medium">Síntese:</span> {atendimento.sintese}</p>
          )}
          {atendimento.solucao && (
            <p className="text-xs text-slate-400 leading-relaxed"><span className="text-slate-500 font-medium">Solução:</span> {atendimento.solucao}</p>
          )}
          {atendimento.criterios?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {atendimento.criterios.map((c: any, i: number) => {
                const { cls, label } = statusBadge(c.status);
                return (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
                    {c.criterio_nome || c.nome || label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}