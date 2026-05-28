'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Printer } from 'lucide-react';

// Função utilitária para extração segura de dados
function extract(snapshot: any, ...paths: string[]): any {
  for (const path of paths) {
    const parts = path.split('.');
    let val: any = snapshot;
    for (const p of parts) { if (val == null) break; val = val[p]; }
    if (val != null && val !== '') return val;
  }
  return null;
}

export default function PublicFeedbackView() {
  const params = useParams();
  const supabase = createClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: feedback } = await supabase
        .from('feedbacks')
        .select('*, analistas(*)')
        .eq('public_token', params?.token as string)
        .eq('public_enabled', true)
        .maybeSingle();
      if (feedback) setData(feedback);
      setLoading(false);
    }
    loadData();
  }, [params?.token]);

  if (loading) return <div className="min-h-screen bg-[#07101F] flex items-center justify-center text-slate-400">Carregando...</div>;
  if (!data) return <div className="min-h-screen bg-[#07101F] flex items-center justify-center text-slate-400">Feedback não encontrado.</div>;

  const rawFeedback = data;
  const snap = Array.isArray(data.snapshot_json_completo) ? data.snapshot_json_completo[0] : (data.snapshot_json_completo || {});
  
  const evolucaoTecnica = extract(snap, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') || rawFeedback?.evolucao_tecnica || '';
  const evolucaoComportamental = extract(snap, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') || rawFeedback?.evolucao_comportamental || '';
  const atencaoEvolutiva = extract(snap, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') || rawFeedback?.atencao_evolutiva || rawFeedback?.risco_operacional || '';
  const fechamentoCiclo = extract(snap, 'feedback_blocks.fechamento_ciclo', 'fechamento') || rawFeedback?.resumo_ciclo || '';

  return (
    <>
      <style jsx global>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-card {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#07101F] text-slate-200 pb-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6 pt-8">
          
          {/* Header V6 Elite */}
          <div className="bg-[#0F1B31]/80 backdrop-blur-md border border-[#1E3050] rounded-3xl p-8 shadow-2xl relative overflow-hidden print-card">
            <h1 className="text-3xl font-black text-white">Feedback QualiVisão</h1>
            <p className="text-sky-400 font-semibold mt-1">{snap?.analista?.nome || 'Analista'} · Ciclo {snap?.analista?.ciclo || data.ciclo}</p>
            <button onClick={() => window.print()} className="absolute top-8 right-8 flex items-center gap-2 bg-sky-900/40 text-sky-300 px-4 py-2 rounded-xl text-sm font-bold border border-sky-700/30 print-hide">
              <Printer size={16} /> Baixar PDF
            </button>
          </div>

          {/* Panorama do Ciclo */}
          {(evolucaoTecnica || evolucaoComportamental || atencaoEvolutiva || fechamentoCiclo) && (
            <div className="rounded-xl border border-[#1E3050] bg-[#0F1B31] p-6 shadow-xl print-card">
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Panorama do Ciclo</h3>
              {evolucaoTecnica && (
                <div className="bg-[#07101F]/60 rounded-lg p-4 border border-[#1E3050]/60 mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-sky-400">Evolução Técnica</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{evolucaoTecnica}</p>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {evolucaoComportamental && (
                  <div className="bg-[#07101F]/60 rounded-lg p-4 border border-[#1E3050]/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-teal-400">Evolução Comportamental</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{evolucaoComportamental}</p>
                  </div>
                )}
                {atencaoEvolutiva && (
                  <div className="bg-[#07101F]/60 rounded-lg p-4 border border-amber-800/30">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-amber-400">Atenção Evolutiva</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{atencaoEvolutiva}</p>
                  </div>
                )}
              </div>
              {fechamentoCiclo && (
                <div className="bg-[#07101F]/60 rounded-lg p-4 border border-purple-800/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-purple-400">Fechamento do Ciclo</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{fechamentoCiclo}</p>
                </div>
              )}
            </div>
          )}

          {/* PDI Blocos */}
          {Array.isArray(snap?.feedback_blocks?.pdi_objetivos) && 
            snap.feedback_blocks.pdi_objetivos.map((obj: any, i: number) => (
              <div key={i} className="bg-[#0F1B31] border border-sky-900/30 rounded-2xl p-6 print-card">
                <p className="text-[10px] font-bold text-sky-400 uppercase">{obj.categoria || 'Objetivo de Desenvolvimento'}</p>
                <h4 className="text-lg font-bold text-white mt-1">{obj.objetivo}</h4>
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <p className="text-xs text-slate-400">Ação: {obj.acao_esperada}</p>
                  <p className="text-xs text-slate-400">Resultado: {obj.resultado_esperado}</p>
                </div>
              </div>
          ))}

        </div>
      </div>
    </>
  );
}