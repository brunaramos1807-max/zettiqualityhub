'use client';
import React, { useState, useEffect } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { AlertTriangle, Printer, Star, TrendingUp, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { motion } from 'framer-motion';

const C = { bg: '#07101F', surface: '#0F1B31', border: '#223250', blue: '#38BDF8', teal: '#2DD4BF', purple: '#A78BFA', amber: '#F59E0B' };

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function FeedbackViewPage() {
  const params = useParams();
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rawData } = await supabase.from('feedbacks').select('*, analistas(*)').eq('id', params?.id as string).maybeSingle();
      if (rawData) {
        const fullData = Array.isArray(rawData.snapshot_json_completo) ? rawData.snapshot_json_completo[0] : rawData.snapshot_json_completo;
        setData({ ...fullData, analistaInfo: rawData.analistas });
      }
      setLoading(false);
    })();
  }, [params?.id]);

  if (loading) return <div className="text-slate-300 p-10">Refinando experiência...</div>;

  return (
    <EnterpriseLayout>
      <style jsx global>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
          .bg-\\[\\#07101F\\], .bg-\\[\\#0F1B31\\], .bg-gradient-to-br { background: white !important; border: 1px solid #e2e8f0 !important; color: black !important; }
          .text-white, .text-slate-200 { color: black !important; }
          .text-slate-400 { color: #64748b !important; }
          @page { size: A4; margin: 16mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen bg-[#07101F] text-slate-200 pb-20 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.06),transparent_35%)]">
        <div className="px-6 py-8 space-y-8 max-w-screen-2xl mx-auto">
          
          <div className="print-hide flex justify-end">
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#1E2D4A] px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-[#38BDF8] hover:text-[#07101F] transition-all shadow-lg hover:scale-105 active:scale-95">
                <Printer size={16} /> Exportar Relatório PDF
            </button>
          </div>

          {/* 1. Hero Executivo (Cinema Grade) */}
          <motion.header variants={itemVariants} className="relative overflow-hidden rounded-3xl border border-[#223250] bg-[#0F1B31] p-14 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#38BDF8]/5 blur-[120px] rounded-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07101F] via-transparent to-transparent opacity-80" />
            
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-[#16233B] border-2 border-[#223250] overflow-hidden shadow-2xl">
                    <img src={data?.analistaInfo?.foto_url || '/avatar.png'} className="w-full h-full object-cover" alt={data?.analista?.nome || 'Analista'} />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">{data?.analista?.nome}</h1>
                  <p className="text-base text-slate-300 mt-1">{data?.analistaInfo?.cargo_operacional || 'Analista'}</p>
                  <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm text-slate-400">
                    <span>Equipe: <strong className="text-slate-100">{data?.analista?.equipe}</strong></span>
                    <span>Coordenador: <strong className="text-slate-100">{data?.analistaInfo?.coordenador}</strong></span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-10 border-l border-[#223250] pl-10">
                <div className="bg-[#07101F]/70 backdrop-blur-sm px-8 py-4 rounded-2xl border border-[#223250]">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">QA Score</p>
                    <p className="text-5xl font-bold text-[#38BDF8] tracking-tight">{data?.scores?.qa}</p>
                </div>
                <div className="bg-[#07101F]/70 backdrop-blur-sm px-8 py-4 rounded-2xl border border-[#223250]">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">IEPC</p>
                    <p className="text-5xl font-bold text-[#2DD4BF] tracking-tight">{data?.scores?.iepc}%</p>
                </div>
              </div>
            </div>
          </motion.header>

          {/* 2. KPIs */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard label="Aderência" value={`${data?.scores?.aderencia}%`} trend="+4.2% vs ciclo anterior" star={data?.scores?.aderencia > 90} color={C.purple} />
            <KPICard label="Atendimentos" value={data?.atendimentos?.length || 0} trend="Volume operacional" color={C.blue} />
            <KPICard label="Não Conformidades" value={data?.analytics?.total_nc || 0} trend="Pontos de atenção" color={C.amber} />
            <KPICard label="Elogios" value={data?.analytics?.total_elogios || 0} trend="Reconhecimento" color={C.teal} />
          </motion.div>

          {/* 3. Evolução Histórica (Centro) */}
          <motion.div variants={itemVariants} className="rounded-3xl border border-[#223250] bg-[#0F1B31] p-10 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-400 mb-8 uppercase tracking-widest">Evolução Histórica (QA vs IEPC)</h3>
            <ResponsiveContainer width="100%" height={420}>
                <LineChart data={data?.historico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#223250" />
                    <XAxis dataKey="ciclo" stroke="#64748B" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#0F1B31', border: '1px solid #223250', borderRadius: '12px', color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="qa" stroke={C.blue} strokeWidth={4} dot={{ fill: C.blue, r: 5 }} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="iepc" stroke={C.teal} strokeWidth={4} dot={{ fill: C.teal, r: 5 }} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* 4. Radares */}
          <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
            <RadarChartCard title="Radar QA" data={data?.qa_pilares} color={C.blue} />
            <RadarChartCard title="Radar IEPC" data={data?.iepc_pilares} color={C.teal} />
          </motion.div>

          {/* 5. Mural */}
          <motion.section variants={itemVariants}>
            <h3 className="text-sm font-bold uppercase text-[#2DD4BF] mb-6 tracking-widest">Mural de Reconhecimento</h3>
            <div className="grid md:grid-cols-3 gap-4">
                {data?.elogios?.map((e: any, i: number) => (
                    <div key={i} className="bg-[#0F1B31] border border-[#2DD4BF]/10 p-6 rounded-2xl flex items-start gap-4 hover:border-[#2DD4BF]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(45,212,191,0.12)]">
                        <Star size={20} className="text-[#2DD4BF] flex-shrink-0 mt-1" />
                        <p className="text-sm text-slate-200 leading-relaxed">&ldquo;{e.descricao}&rdquo;</p>
                    </div>
                ))}
            </div>
          </motion.section>

          {/* 6. Panorama */}
          <motion.section variants={itemVariants} className="grid md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-[#223250] bg-[#0F1B31] p-10">
                <h3 className="text-sm font-bold uppercase text-slate-400 mb-8 tracking-widest">Evolução Contínua</h3>
                <div className="space-y-6 text-base text-slate-200 leading-relaxed">
                    <p><span className="text-[#38BDF8] font-bold">Técnica:</span> {data?.evolucao_tecnica}</p>
                    <p><span className="text-[#2DD4BF] font-bold">Comportamental:</span> {data?.evolucao_comportamental}</p>
                    <div className="pt-8 border-t border-[#223250]">
                        <h4 className="text-xs font-bold text-[#F59E0B] mb-4 uppercase tracking-widest">Pontos de Fortalecimento</h4>
                        <p className="text-sm text-slate-300 italic">{data?.pontos_fortes || "Continue focando na consistência técnica."}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-3xl border border-[#223250] bg-[#0F1B31] p-10">
                <h3 className="text-sm font-bold uppercase text-[#F59E0B] mb-8 tracking-widest">Mentoria de Comunicação</h3>
                {data?.coaching?.map((c: any, i: number) => (
                    <div key={i} className="border-l-4 border-[#F59E0B] pl-6 py-1 mb-10">
                        <Quote size={24} className="text-[#F59E0B]/50 mb-3" />
                        <p className="text-base text-white font-semibold italic mb-3">&ldquo;{c.dica_de_ouro}&rdquo;</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Cenário: {c.o_que_foi_dito}</p>
                    </div>
                ))}
            </div>
          </motion.section>

          {/* 7. Atendimentos */}
          <motion.section variants={itemVariants}>
            <h3 className="text-sm font-bold uppercase text-[#64748B] mb-6 tracking-widest">Atendimentos Avaliados</h3>
            {data?.atendimentos?.map((a: any, i: number) => <AtendimentoAccordion key={i} atendimento={a} index={i} />)}
          </motion.section>

          {/* 8. NCs */}
          <motion.section variants={itemVariants}>
            {data?.nao_conformidades?.length > 0 && (
                <>
                    <h3 className="text-sm font-bold uppercase text-[#F59E0B] mb-6 tracking-widest">Pontos de Atenção</h3>
                    {data.nao_conformidades.map((nc: any, i: number) => (
                        <div key={i} className="bg-[#1A1408] border border-[#F59E0B]/10 p-6 rounded-2xl mb-4 hover:border-[#F59E0B]/30 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle size={18} className="text-[#F59E0B]" />
                                <span className="font-bold text-[#F59E0B] text-base">{nc.tipo}</span>
                                <span className="text-slate-500 text-sm ml-auto font-mono">{nc.protocolo}</span>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">{nc.descricao}</p>
                        </div>
                    ))}
                </>
            )}
          </motion.section>

          {/* 9. Fechamento */}
          <motion.footer variants={itemVariants} className="text-center py-24 border-t border-[#223250]">
            <Quote size={40} className="text-[#38BDF8] mx-auto mb-8 opacity-20" />
            <p className="text-2xl font-serif italic text-white max-w-3xl mx-auto leading-relaxed">
              &ldquo;{data?.fechamento || 'Continue a evolução constante, você está no caminho certo e contamos com seu talento para o próximo ciclo.'}&rdquo;
            </p>
          </motion.footer>
        </div>
      </motion.div>
    </EnterpriseLayout>
  );
}

function KPICard({ label, value, unit, color, star, trend }: any) {
    return (
        <div className="card relative overflow-hidden rounded-2xl border border-[#223250] bg-[#0F1B31] p-6 hover:border-[#38BDF8]/30 hover:-translate-y-[2px] hover:shadow-[0_10px_40px_rgba(56,189,248,0.12)] transition-all duration-300">
            {star && <Star size={18} className="absolute top-4 right-4 text-yellow-400 fill-yellow-400" />}
            <p className="text-[10px] uppercase tracking-widest text-[#94A3B8] mb-2">{label}</p>
            <p className="text-4xl font-bold tracking-tight text-white mb-2">{value}<span className="text-lg font-normal text-slate-500 ml-1">{unit}</span></p>
            {trend && <div className="flex items-center gap-1.5 text-xs text-[#22C55E] font-medium"><TrendingUp size={12} /> {trend}</div>}
        </div>
    )
}

function RadarChartCard({ title, data, color }: any) {
    const chartData = data?.map((p: any) => ({ 
        subject: p.nome.replace(' ', '\n'), 
        A: p.nota, 
        fullMark: p.maximo 
    })) || [];
    return (
        <div className="card rounded-2xl border border-[#223250] bg-[#0F1B31] p-8 hover:border-[#223250]/80 transition-all duration-300">
            <h3 className="text-sm font-semibold text-[#94A3B8] mb-6 uppercase tracking-widest">{title}</h3>
            <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={chartData}>
                    <defs><filter id="glow"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} /></filter></defs>
                    <PolarGrid stroke="#223250" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Radar dataKey="A" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={3} filter="url(#glow)" />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}

function AtendimentoAccordion({ atendimento, index }: { atendimento: any; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card group mb-4 overflow-hidden rounded-2xl border border-[#223250] bg-[#0F1B31] hover:border-[#223250]/80 transition-all duration-300">
      <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-[#16233B]/40 transition-all" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-5">
            <span className="text-[#64748B] text-sm font-mono">#{index + 1}</span>
            <span className="font-mono text-base font-bold text-[#38BDF8]">{atendimento.protocolo}</span>
            <span className="text-base font-medium text-white">{atendimento.cliente}</span>
        </div>
        <div className="flex items-center gap-6">
            <span className="text-base font-bold text-[#22C55E]">QA {atendimento.nota_qa}</span>
            {open ? <ChevronUp size={20} className="text-[#64748B]" /> : <ChevronDown size={20} className="text-[#64748B]" />}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-6 space-y-5 text-base text-slate-300 border-t border-[#223250] bg-[#07101F]">
            <p className="leading-relaxed"><strong>Síntese:</strong> {atendimento.sintese}</p>
            <div className="flex flex-wrap gap-2">
                {atendimento.criterios?.map((c: any, i: number) => (
                    <div key={i} className={`px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${c.status === 'aderido' ? 'bg-green-900/20 text-green-400' : c.status === 'parcial' ? 'bg-orange-900/20 text-orange-400' : 'bg-red-900/20 text-red-400'}`}>
                        {c.nome}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}