'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle, Printer, Star, ChevronDown, ChevronUp,
  Quote, Award, Users, BarChart2, CheckCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis
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

export default function PublicFeedbackPage() {
  const params = useParams();
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rawData } = await supabase
        .from('feedbacks')
        .select('*, analistas(*)')
        .eq('public_token', params?.token as string)
        .maybeSingle();

      if (!rawData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const fullData = Array.isArray(rawData.snapshot_json_completo)
        ? rawData.snapshot_json_completo[0]
        : rawData.snapshot_json_completo;

      setData({ ...fullData, analistaInfo: rawData.analistas, ciclo: rawData.ciclo });
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
        <p className="text-slate-400 text-sm mb-2">Link inválido ou expirado.</p>
        <p className="text-slate-600 text-xs">Este feedback não está disponível publicamente.</p>
      </div>
    </div>
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
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
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

      <div className="px-5 py-4 max-w-screen-xl mx-auto space-y-4">

        {/* Badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-900/40 text-sky-300 border border-sky-700/30">
            {data?.ciclo || data?.analista?.ciclo || 'Ciclo'}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-900/30 text-green-400 border border-green-700/30 flex items-center gap-1">
            <CheckCircle size={10} /> Concluído
          </span>
        </div>

        {/* Hero */}
        <div className="print-card relative overflow-hidden rounded-xl border border-[#1E3050] bg-[#0F1B31] px-5 py-4 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#16233B] border border-[#1E3050] overflow-hidden flex-shrink-0">
                <img
                  src={data?.analistaInfo?.foto_url || '/assets/images/no_image.png'}
                  className="w-full h-full object-cover"
                  alt={data?.analista?.nome || 'Analista'}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{data?.analista?.nome}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{data?.analistaInfo?.cargo_operacional || 'Analista de Qualidade'}</p>
                <div className="flex flex-wrap gap-x-4 mt-1.5 text-xs text-slate-500">
                  {data?.analista?.equipe && <span>Equipe: <strong className="text-slate-300">{data.analista.equipe}</strong></span>}
                  {data?.analistaInfo?.coordenador && <span>Coord: <strong className="text-slate-300">{data.analistaInfo.coordenador}</strong></span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 lg:border-l lg:border-[#1E3050] lg:pl-5">
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">QA Score</p>
                <p className="text-3xl font-bold text-sky-400 leading-none">{data?.scores?.qa ?? '—'}</p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">IEPC</p>
                <p className="text-3xl font-bold text-teal-400 leading-none">{data?.scores?.iepc ?? '—'}<span className="text-base font-normal text-slate-500">%</span></p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-[#07101F]/70 border border-[#1E3050]">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">Aderência</p>
                <p className="text-3xl font-bold text-purple-400 leading-none">{data?.scores?.aderencia ?? '—'}<span className="text-base font-normal text-slate-500">%</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Aderência', value: `${data?.scores?.aderencia ?? '—'}%`, icon: <Award size={14} />, color: C.purple },
            { label: 'Atendimentos', value: data?.atendimentos?.length ?? 0, icon: <Users size={14} />, color: C.blue },
            { label: 'Não Conformidades', value: data?.nao_conformidades?.length ?? 0, icon: <AlertTriangle size={14} />, color: C.amber },
            { label: 'Elogios', value: data?.elogios?.length ?? 0, icon: <Star size={14} />, color: C.teal },
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
          <PublicRadarCard title="Radar QA" pilares={data?.qa_pilares} color={C.blue} />
          <PublicRadarCard title="Radar IEPC" pilares={data?.iepc_pilares} color={C.teal} />
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Evolução Histórica</h3>
            {(data?.historico?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.historico.slice(-8)} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
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
        {(data?.feedback_blocks || data?.evolucao_tecnica) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Panorama do Ciclo</h3>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Evolução Técnica', value: data?.feedback_blocks?.evolucao_tecnica || data?.evolucao_tecnica, color: 'text-sky-400' },
                { label: 'Evolução Comportamental', value: data?.feedback_blocks?.evolucao_comportamental || data?.evolucao_comportamental, color: 'text-teal-400' },
                { label: 'Atenção Evolutiva', value: data?.feedback_blocks?.atencao_evolutiva, color: 'text-amber-400' },
                { label: 'Fechamento do Ciclo', value: data?.feedback_blocks?.fechamento_ciclo || data?.fechamento, color: 'text-purple-400' },
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
        {data?.coaching?.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-3">Coaching de Comunicação</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {data.coaching.map((c: any, i: number) => (
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
        {data?.atendimentos?.length > 0 && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Atendimentos Avaliados <span className="text-slate-600 font-normal">({data.atendimentos.length})</span>
            </h3>
            <div className="space-y-2">
              {data.atendimentos.map((a: any, i: number) => (
                <PublicAtendimento key={i} atendimento={a} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* NCs */}
        {data?.nao_conformidades?.length > 0 && (
          <div className="print-card rounded-xl border border-amber-900/30 bg-[#0F1B31] p-4">
            <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-3">Pontos de Atenção</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {data.nao_conformidades.map((nc: any, i: number) => (
                <div key={i} className="bg-amber-900/10 border border-amber-700/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">{nc.tipo}</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">{nc.protocolo}</span>
                  </div>
                  <p className="text-xs text-slate-400">{nc.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fechamento */}
        {(data?.feedback_blocks?.fechamento_ciclo || data?.fechamento) && (
          <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-5 text-center">
            <Quote size={24} className="text-sky-400/20 mx-auto mb-3" />
            <p className="text-sm font-medium italic text-slate-200 max-w-2xl mx-auto leading-relaxed">
              &ldquo;{data?.feedback_blocks?.fechamento_ciclo || data?.fechamento}&rdquo;
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-700 pt-2 print-hide">
          Documento gerado pelo sistema QualiVisão · Acesso restrito ao analista
        </p>
      </div>
    </div>
  );
}

function PublicRadarCard({ title, pilares, color }: any) {
  const chartData = (pilares || []).map((p: any) => ({
    subject: (p.nome || '').length > 10 ? (p.nome || '').slice(0, 10) + '…' : (p.nome || ''),
    A: Number(p.nota) || 0,
    fullMark: Number(p.maximo) || 100,
  }));

  return (
    <div className="print-card rounded-xl border border-[#1E3050] bg-[#0F1B31] p-4">
      <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <PolarGrid stroke="#1E3050" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
          <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
      {pilares?.length > 0 && (
        <div className="mt-2 space-y-1">
          {pilares.map((p: any, i: number) => {
            const pct = Math.round((Number(p.nota) / (Number(p.maximo) || 100)) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-20 truncate">{p.nome}</span>
                <div className="flex-1 h-1.5 bg-[#1E3050] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{p.nota}</span>
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
