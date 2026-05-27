'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle, Printer, Star, ChevronDown, ChevronUp,
  Quote, Award, Users, CheckCircle, TrendingUp, Heart, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const C = {
  bg: '#07101F', surface: '#0F1B31', border: '#1E3050',
  blue: '#38BDF8', teal: '#2DD4BF', purple: '#A78BFA', amber: '#F59E0B',
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    aderido: 'bg-green-900/30 text-green-400 border border-green-700/30',
    parcial: 'bg-amber-900/30 text-amber-400 border border-amber-700/30',
    nao_aderido: 'bg-red-900/30 text-red-400 border border-red-700/30',
    nao_avaliado: 'bg-slate-800/50 text-slate-500 border border-slate-700/30',
  };
  const labels: Record<string, string> = {
    aderido: 'Aderido', parcial: 'Parcial',
    nao_aderido: 'Não Aderido', nao_avaliado: 'N/A',
  };
  return { cls: map[status] || map.nao_avaliado, label: labels[status] || status };
}

function sortByCiclo(a: any, b: any): number {
  const parseC = (c: string) => {
    if (!c) return 0;
    const m = c.match(/^(\d{2})\/(\d{4})$/);
    if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
    return 0;
  };
  return parseC(a.ciclo) - parseC(b.ciclo);
}

function getMotivationalMessage(qa: number | null, iepc: number | null, ncs: number, elogios: number): { title: string; message: string; level: 'high' | 'mid' | 'low' } {
  const score = qa ?? iepc ?? 0;
  if (score >= 90) {
    return {
      level: 'high',
      title: 'Excelência Operacional Reconhecida',
      message: elogios > 0
        ? `Seu ciclo demonstrou alto nível de consistência técnica e excelência relacional, com ${elogios} elogio${elogios > 1 ? 's' : ''} registrado${elogios > 1 ? 's' : ''}. Continue evoluindo nessa trajetória, pois sua atuação gera impacto positivo direto na experiência do cliente e nos resultados da operação.`
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

function pillarBarColor(pct: number) {
  if (pct >= 90) return '#22C55E';
  if (pct >= 80) return '#2DD4BF';
  if (pct >= 70) return '#F59E0B';
  return '#EF4444';
}

export default function PublicFeedbackPage() {
  const params = useParams();
  const supabase = createClient();
  const [rawFeedback, setRawFeedback] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rawData } = await supabase
        .from('feedbacks')
        .select('*, analistas(*)')
        .eq('public_token', params?.token as string)
        .eq('public_enabled', true)
        .maybeSingle();

      if (!rawData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRawFeedback(rawData);

      const snap = Array.isArray(rawData.snapshot_json_completo)
        ? rawData.snapshot_json_completo[0]
        : (rawData.snapshot_json_completo || {});
      setSnapshot(snap);

      // Load history by analista_id
      if (rawData.analista_id) {
        const { data: histRows } = await supabase
          .from('feedback_historico')
          .select('ciclo, qa_score, iepc_score')
          .eq('analista_id', rawData.analista_id);

        const { data: pastFeedbacks } = await supabase
          .from('feedbacks')
          .select('ciclo, qa_score, iepc_score')
          .eq('analista_id', rawData.analista_id);

        const histMap = new Map<string, any>();
        (pastFeedbacks || []).forEach((f: any) => {
          if (f.ciclo) histMap.set(f.ciclo, { ciclo: f.ciclo, qa: Number(f.qa_score) || 0, iepc: Number(f.iepc_score) || 0 });
        });
        (histRows || []).forEach((h: any) => {
          if (h.ciclo) histMap.set(h.ciclo, { ciclo: h.ciclo, qa: Number(h.qa_score) || 0, iepc: Number(h.iepc_score) || 0 });
        });
        setHistorico(Array.from(histMap.values()).sort(sortByCiclo));
      }

      setLoading(false);
    })();
  }, [params?.token]);

  if (loading) return (
    <div className="min-h-screen bg-[#07101F] flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400 text-sm">
        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        Carregando feedback...
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#07101F] flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 text-sm mb-2">Link inválido, expirado ou desativado.</p>
        <p className="text-slate-600 text-xs">Este feedback não está disponível publicamente.</p>
      </div>
    </div>
  );

  const snap = snapshot || {};
  const analista = snap?.analista || {};
  const scores = snap?.scores || {};
  const qa_pilares: any[] = snap?.qa_pilares || [];
  const iepc_pilares: any[] = snap?.iepc_pilares || [];
  const coaching: any[] = snap?.coaching || [];
  const atendimentos: any[] = snap?.atendimentos || [];
  const nao_conformidades: any[] = snap?.nao_conformidades || [];
  const feedback_blocks = snap?.feedback_blocks || {};
  const elogios: any[] = snap?.elogios || [];

  const qaScore = scores?.qa ?? rawFeedback?.qa_score ?? null;
  const iepcScore = scores?.iepc ?? rawFeedback?.iepc_score ?? null;
  const aderenciaScore = scores?.aderencia ?? rawFeedback?.aderencia_score ?? null;
  const analistaNome = analista?.nome || rawFeedback?.analistas?.nome || rawFeedback?.analistas?.nome_completo || '—';
  const ciclo = analista?.ciclo || rawFeedback?.ciclo || '—';

  const motivational = getMotivationalMessage(
    qaScore != null ? Number(qaScore) : null,
    iepcScore != null ? Number(iepcScore) : null,
    nao_conformidades.length,
    elogios.length
  );

  return (
    <div className="min-h-screen bg-[#07101F] text-slate-200 pb-12">
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .print-card { background: white !important; border: 1px solid #e2e8f0 !important; color: #111 !important; break-inside: avoid; }
          @page { size: A4; margin: 14mm 16mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Header bar */}
      <div className="border-b border-[#1E3050] bg-[#0F1B31] px-5 py-3 print-hide">
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">Q</span>
            </div>
            <span className="text-sm font-semibold text-white">QualiVisão</span>
            <span className="text-slate-600 text-xs">· Feedback Experience</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-900/40 text-sky-300 border border-sky-700/30 hover:bg-sky-800/50 transition-all"
          >
            <Printer size={12} /> Baixar PDF
          </button>
        </div>
      </div>

      <div className="px-4 py-4 w-full max-w-[1600px] mx-auto space-y-4">

        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-900/40 text-sky-300 border border-sky-700/30">
            {ciclo}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-900/30 text-green-400 border border-green-700/30 flex items-center gap-1">
            <CheckCircle size={10} /> Concluído
          </span>
        </div>

        {/* Hero */}
        <div className="print-card relative overflow-hidden rounded-xl border border-[#1E3050] bg-[#0F1B31] px-5 py-4 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-[#16233B] border border-[#1E3050] overflow-hidden flex-shrink-0">
                <img
                  src={rawFeedback?.analistas?.foto_url || '/assets/images/no_image.png'}
                  className="w-full h-full object-cover"
                  alt={analistaNome}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{analistaNome}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{rawFeedback?.analistas?.cargo_operacional || 'Analista de Qualidade'}</p>
                <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-slate-500">
                  {analista?.equipe && <span>Equipe: <strong className="text-slate-300">{analista.equipe}</strong></span>}
                  {rawFeedback?.analistas?.coordenador && <span>Coord: <strong className="text-slate-300">{rawFeedback.analistas.coordenador}</strong></span>}
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

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Aderência', value: `${aderenciaScore ?? '—'}%`, icon: <Award size={14} />, color: C.purple },
            { label: 'Atendimentos', value: atendimentos.length ?? 0, icon: <Users size={14} />, color: C.blue },
            { label: 'Não Conformidades', value: nao_conformidades.length ?? 0, icon: <AlertTriangle size={14} />, color: C.amber },
            { label: 'Elogios', value: elogios.length ?? 0, icon: <Star size={14} />, color: C.teal },
          ].map((kpi, i) => (
            <div key={i} className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-white leading-none">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Radares + Histórico */}
        <div className="grid lg:grid-cols-3 gap-4">
          <PublicRadarCard title="Radar QA" pilares={qa_pilares} color={C.blue} />
          <PublicRadarCard title="Radar IEPC" pilares={iepc_pilares} color={C.teal} />
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Evolução Histórica</h3>
            {historico.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={historico.slice(-10)} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E3050" />
                  <XAxis dataKey="ciclo" stroke="#475569" fontSize={9} tick={{ fill: '#475569' }} />
                  <YAxis domain={[0, 100]} stroke="#475569" fontSize={9} tick={{ fill: '#475569' }} />
                  <Tooltip contentStyle={{ background: '#0F1B31', border: '1px solid #1E3050', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="qa" stroke={C.blue} strokeWidth={2} dot={{ fill: C.blue, r: 3 }} name="QA" />
                  <Line type="monotone" dataKey="iepc" stroke={C.teal} strokeWidth={2} dot={{ fill: C.teal, r: 3 }} name="IEPC" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-slate-600 text-xs">Sem histórico</div>
            )}
          </div>
        </div>

        {/* Panorama */}
        {(feedback_blocks?.evolucao_tecnica || feedback_blocks?.evolucao_comportamental || feedback_blocks?.atencao_evolutiva || feedback_blocks?.fechamento_ciclo) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Panorama do Ciclo</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Evolução Técnica', value: feedback_blocks?.evolucao_tecnica, color: 'text-sky-400' },
                { label: 'Evolução Comportamental', value: feedback_blocks?.evolucao_comportamental, color: 'text-teal-400' },
                { label: 'Atenção Evolutiva', value: feedback_blocks?.atencao_evolutiva, color: 'text-amber-400' },
                { label: 'Fechamento do Ciclo', value: feedback_blocks?.fechamento_ciclo || snap?.fechamento, color: 'text-purple-400' },
              ].filter(b => b.value).map((block, i) => (
                <div key={i} className="bg-[#07101F]/60 rounded-lg p-3 border border-[#1E3050]/60">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${block.color}`}>{block.label}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{block.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coaching */}
        {coaching.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-3">Coaching de Comunicação</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {coaching.map((c: any, i: number) => (
                <div key={i} className="border-l-2 border-amber-500/50 pl-3 py-1 bg-[#07101F]/40 rounded-r-lg pr-3">
                  {c.o_que_foi_dito && <p className="text-[11px] text-slate-500 mb-1"><span className="text-slate-400">Dito:</span> {c.o_que_foi_dito}</p>}
                  {c.como_poderia_ser && <p className="text-[11px] text-slate-400 mb-1"><span className="text-slate-300">Melhor:</span> {c.como_poderia_ser}</p>}
                  {c.dica_de_ouro && <p className="text-[11px] text-amber-200 italic">&ldquo;{c.dica_de_ouro}&rdquo;</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Atendimentos */}
        {atendimentos.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Atendimentos Avaliados <span className="text-slate-600 font-normal">({atendimentos.length})</span>
            </h3>
            <div className="space-y-2">
              {atendimentos.map((a: any, i: number) => (
                <PublicAtendimento key={i} atendimento={a} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* NCs — Amber visual destacado */}
        {nao_conformidades.length > 0 && (
          <div className="print-card rounded-xl border-2 border-amber-700/50 bg-[#0F1B31] overflow-hidden"
            style={{ boxShadow: '0 0 24px rgba(245,158,11,0.08)' }}>
            <div className="px-5 py-3 border-b border-amber-700/30 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Não Conformidades</h3>
                  <p className="text-[10px] text-amber-500/70">{nao_conformidades.length} ponto{nao_conformidades.length > 1 ? 's' : ''} de atenção</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {nao_conformidades.length} NC{nao_conformidades.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {nao_conformidades.map((nc: any, i: number) => (
                <div key={i} className="rounded-lg border border-amber-700/30 bg-amber-900/10 p-3.5 hover:border-amber-600/50 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-300 truncate">{nc.tipo || nc.tipo_nc || 'NC'}</span>
                    </div>
                    {(nc.protocolo || nc.protocolo_referencia) && (
                      <span className="text-[10px] text-amber-600/80 font-mono bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/20 flex-shrink-0">
                        {nc.protocolo || nc.protocolo_referencia}
                      </span>
                    )}
                  </div>
                  {nc.descricao && <p className="text-xs text-slate-300 leading-relaxed">{nc.descricao}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fechamento */}
        {(feedback_blocks?.fechamento_ciclo || snap?.fechamento) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-5 text-center">
            <Quote size={24} className="text-sky-400/20 mx-auto mb-3" />
            <p className="text-sm font-medium italic text-slate-200 max-w-2xl mx-auto leading-relaxed">
              &ldquo;{feedback_blocks?.fechamento_ciclo || snap?.fechamento}&rdquo;
            </p>
          </div>
        )}

        {/* Bloco Motivacional */}
        <PublicMotivationalBlock
          motivational={motivational}
          analistaNome={analistaNome}
          ciclo={ciclo}
          qaScore={qaScore}
          iepcScore={iepcScore}
          aderenciaScore={aderenciaScore}
          ncsCount={nao_conformidades.length}
          elogiosCount={elogios.length}
        />

        <p className="text-center text-[10px] text-slate-700 pt-2 print-hide">
          Documento gerado pelo sistema QualiVisão · Acesso restrito ao analista
        </p>
      </div>
    </div>
  );
}

function PublicMotivationalBlock({ motivational, analistaNome, ciclo, qaScore, iepcScore, aderenciaScore, ncsCount, elogiosCount }: any) {
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
        background: 'linear-gradient(135deg, #0F1B31 0%, #0B1426 60%, #071020 100%)',
        boxShadow: `0 0 40px ${lc.glow}, 0 4px 24px rgba(0,0,0,0.4)`,
      }}
    >
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${lc.glow} 0%, transparent 70%)` }} />
      <div className="relative z-10 px-8 py-8">
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
            {qaScore != null && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${lc.badge}`}>QA {qaScore}</span>}
            {iepcScore != null && <span className="px-3 py-1 rounded-full text-xs font-bold border bg-teal-900/40 text-teal-300 border-teal-700/40">IEPC {iepcScore}%</span>}
          </div>
        </div>
        <div className="h-px w-full mb-6" style={{ background: `linear-gradient(90deg, transparent, ${lc.accent}30, transparent)` }} />
        <div className="relative">
          <Quote size={32} className="absolute -top-2 -left-1 opacity-10" style={{ color: lc.accent }} />
          <p className="text-base text-slate-200 leading-relaxed pl-6 font-medium">{motivational.message}</p>
        </div>
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
        </div>
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

function PublicRadarCard({ title, pilares, color }: any) {
  const list = pilares || [];
  const chartData = list.map((p: any) => {
    const nota = Number(p.nota) || 0;
    const maximo = Number(p.maximo) || 100;
    const pct = Math.round((nota / maximo) * 100);
    return {
      subject: (p.nome || '').length > 10 ? (p.nome || '').slice(0, 10) + '…' : (p.nome || ''),
      A: nota,
      fullMark: maximo,
      nota,
      maximo,
      pct,
    };
  });

  return (
    <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={chartData} margin={{ top: 16, right: 20, bottom: 16, left: 20 }}>
            <PolarGrid stroke="#1E3050" />
            <PolarAngleAxis
              dataKey="subject"
              tick={(props: any) => {
                const d = chartData[props.index];
                const pct = d?.pct ?? 0;
                const c = pillarBarColor(pct);
                return (
                  <g>
                    <text x={props.x} y={props.y - 2} textAnchor="middle" fill="#94A3B8" fontSize={7}>{props.payload?.value}</text>
                    <text x={props.x} y={props.y + 9} textAnchor="middle" fill={c} fontSize={8} fontWeight="700">{pct}%</text>
                  </g>
                );
              }}
            />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-slate-600 text-xs">Sem dados</div>
      )}
      {list.length > 0 && (
        <div className="mt-2 space-y-1">
          {list.map((p: any, i: number) => {
            const nota = Number(p.nota) || 0;
            const maximo = Number(p.maximo) || 100;
            const pct = Math.round((nota / maximo) * 100);
            const barColor = pillarBarColor(pct);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-20 truncate">{p.nome}</span>
                <div className="flex-1 h-1.5 bg-[#1E3050] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
                <span className="text-[10px] font-mono font-bold w-10 text-right" style={{ color: barColor }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PublicAtendimento({ atendimento, index }: { atendimento: any; index: number }) {
  const [open, setOpen] = useState(false);
  const score = Number(atendimento.nota_qa) || 0;
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="rounded-lg border border-[#1E3050] bg-[#07101F]/60 overflow-hidden">
      <button
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#0F1B31]/60 transition-all text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] text-slate-600 font-mono flex-shrink-0">#{index + 1}</span>
          <span className="font-mono text-xs font-bold text-sky-400 flex-shrink-0">{atendimento.protocolo}</span>
          <span className="text-xs text-slate-300 truncate">{atendimento.cliente}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          <span className={`text-xs font-bold ${scoreColor}`}>QA {atendimento.nota_qa}</span>
          {open ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 border-t border-[#1E3050] space-y-2 bg-[#0A1525]/60">
          {atendimento.sintese && <p className="text-xs text-slate-300"><span className="text-slate-500">Síntese:</span> {atendimento.sintese}</p>}
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
