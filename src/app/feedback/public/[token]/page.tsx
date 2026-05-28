'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FeedbackView from '@/components/feedback/FeedbackView';
function sortByCiclo(a: any, b: any): number {
  const parseC = (c: string) => {
    if (!c) return 0;
    const m = c.match(/^(\d{2})\/(\d{4})$/);
    if (m) return parseInt(m[2]) * 100 + parseInt(m[1]);
    return 0;
  };
  return parseC(a.ciclo) - parseC(b.ciclo);
}

function calcTempoEmpresaStr(dataAdmissao: string | null | undefined): string {
  if (!dataAdmissao) return '';
  try {
    const admissao = new Date(dataAdmissao + 'T00:00:00');
    const now = new Date();
    let anos = now.getFullYear() - admissao.getFullYear();
    let meses = now.getMonth() - admissao.getMonth();
    if (meses < 0) { anos--; meses += 12; }
    if (anos < 0) return '';
    if (anos === 0 && meses === 0) return 'Menos de 1 mês';
    const partes: string[] = [];
    if (anos > 0) partes.push(`${anos} ano${anos !== 1 ? 's' : ''}`);
    if (meses > 0) partes.push(`${meses} mês${meses !== 1 ? 'es' : ''}`);
    return partes.join(' e ');
  } catch { return ''; }
}

export default function PublicFeedbackPage() {
  const params = useParams();
  const supabase = createClient() as any;
  const [rawFeedback, setRawFeedback] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      // Fetch feedback with analista and user_profiles joined
      const { data: rawData } = await supabase
        .from('feedbacks')
        .select('*, analistas(*)')
        .eq('public_token', params?.token as string)
        .maybeSingle();

      if (!rawData || rawData.public_enabled === false) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Also try to fetch user_profiles for richer data
      let userProfile: any = null;
      if (rawData.analistas?.email) {
        const { data: up } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', rawData.analistas.email)
          .maybeSingle();
        userProfile = up;
      }

      // Merge user_profile data into rawData for hero display
      if (userProfile) {
        rawData._userProfile = userProfile;
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

  const analistaInfo = {
    ...(rawFeedback?.analistas || {}),
    nome: rawFeedback?.analistas?.nome || rawFeedback?.analistas?.nome_completo || rawFeedback?._userProfile?.nome,
    nome_completo: rawFeedback?.analistas?.nome_completo || rawFeedback?.analistas?.nome || rawFeedback?._userProfile?.nome,
    cargo_operacional: rawFeedback?.analistas?.cargo_operacional || rawFeedback?._userProfile?.cargo_nome,
    equipe: rawFeedback?.analistas?.equipe || rawFeedback?.analistas?.squad || rawFeedback?._userProfile?.squad,
    squad: rawFeedback?.analistas?.squad || rawFeedback?.analistas?.equipe || rawFeedback?._userProfile?.squad,
    coordenador: rawFeedback?.analistas?.coordenador || rawFeedback?._userProfile?.coordenador,
    tempo_empresa: rawFeedback?.analistas?.tempo_empresa || calcTempoEmpresaStr(rawFeedback?._userProfile?.data_admissao),
    foto_url: rawFeedback?.analistas?.foto_url || rawFeedback?._userProfile?.foto_url || rawFeedback?._userProfile?.avatar_url,
  };

  return (
    <FeedbackView
      mode="public"
      snapshot={snapshot}
      rawFeedback={rawFeedback}
      analistaInfo={analistaInfo}
      historico={historico}
      elogios={[]}
      dbNCs={[]}
      loading={false}
      presentationMode={false}
    />
  );
}

