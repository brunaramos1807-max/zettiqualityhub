'use client';
import React, { useState, useEffect, useCallback } from 'react';
import EnterpriseLayout from '@/components/EnterpriseLayout';
import FeedbackView from '@/components/feedback/FeedbackView';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
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
  return {
    id: Math.random().toString(36).slice(2),
    categoria: '',
    objetivo: '',
    acao_esperada: '',
    resultado_esperado: '',
    status: 'nao_cumprido',
  };
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
function getMotivationalMessage(
  qa: number | null,
  iepc: number | null,
  ncs: number,
  elogios: number
): { title: string; message: string; level: 'high' | 'mid' | 'low' } {
  const score = qa ?? iepc ?? 0;
  if (score >= 90) {
    return {
      level: 'high',
      title: 'Excelência Operacional Reconhecida',
      message:
        elogios > 0
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
  const supabase = createClient() as any;
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
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdiCreating, setPdiCreating] = useState(false);
  const [pdiCreated, setPdiCreated] = useState(false);
  const [pdiObjetivos, setPdiObjetivos] = useState<PdiObjetivo[]>([newPdiObjetivo()]);
  const [dbNCs, setDbNCs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const id = params?.id as string;
    if (!id) return;

    const { data: rawData } = await supabase
      .from('feedbacks')
      .select('*, analistas(*)')
      .eq('id', id)
      .maybeSingle();

    if (!rawData) {
      setLoading(false);
      return;
    }

    setRawFeedback(rawData);
    setPublicToken(rawData.public_token || null);
    setPublicEnabled(rawData.public_enabled || false);

    const snap = Array.isArray(rawData.snapshot_json_completo)
      ? rawData.snapshot_json_completo[0]
      : rawData.snapshot_json_completo || {};

    setSnapshot(snap);
    setAnalistaInfo(rawData.analistas);

    // Load pdi_objetivos from snapshot or DB
    const savedObjetivos = snap?.feedback_blocks?.pdi_objetivos || rawData.pdi_objetivos;
    if (Array.isArray(savedObjetivos) && savedObjetivos.length > 0) {
      setPdiObjetivos(savedObjetivos);
    } else {
      // Migrate legacy single-objective fields if present
      const legacyObj =
        snap?.feedback_blocks?.objetivo_desenvolvimento || rawData.objetivo_desenvolvimento;
      const legacyAcao =
        snap?.feedback_blocks?.acao_desenvolvimento || rawData.acao_desenvolvimento;
      const legacyResult = snap?.feedback_blocks?.resultado_esperado || rawData.resultado_esperado;
      if (legacyObj || legacyAcao || legacyResult) {
        setPdiObjetivos([
          {
            id: 'legacy-1',
            categoria: '',
            objetivo: legacyObj || '',
            acao_esperada: legacyAcao || '',
            resultado_esperado: legacyResult || '',
            status: 'nao_cumprido',
          },
        ]);
      } else {
        setPdiObjetivos([newPdiObjetivo()]);
      }
    }

    setEditFields({
      fechamento_ciclo:
        extract(snap, 'feedback_blocks.fechamento_ciclo', 'fechamento') ||
        rawData.resumo_ciclo ||
        '',
      evolucao_tecnica:
        extract(snap, 'feedback_blocks.evolucao_tecnica', 'evolucao_tecnica') ||
        rawData.evolucao_tecnica ||
        '',
      evolucao_comportamental:
        extract(snap, 'feedback_blocks.evolucao_comportamental', 'evolucao_comportamental') ||
        rawData.evolucao_comportamental ||
        '',
      atencao_evolutiva:
        extract(snap, 'feedback_blocks.atencao_evolutiva', 'atencao_evolutiva') || '',
      mensagem_evolutiva:
        extract(snap, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') ||
        rawData.mensagem_evolutiva ||
        '',
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
        if (f.ciclo)
          histMap.set(f.ciclo, {
            ciclo: f.ciclo,
            qa: Number(f.qa_score) || 0,
            iepc: Number(f.iepc_score) || 0,
          });
      });
      (histRows || []).forEach((h: any) => {
        if (h.ciclo)
          histMap.set(h.ciclo, {
            ciclo: h.ciclo,
            qa: Number(h.qa_score) || 0,
            iepc: Number(h.iepc_score) || 0,
          });
      });
      const sorted = Array.from(histMap.values()).sort(sortByCiclo);
      setHistorico(sorted);

      const analistaNome = rawData.analistas?.nome || rawData.analistas?.nome_completo;
      if (analistaNome) {
        const { data: elogiosRows } = await supabase
          .from('elogios')
          .select('elogio, protocolo, cliente, periodo')
          .ilike('colaborador', `%${analistaNome.split(' ')[0]}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        setElogios(elogiosRows || []);

        // Fetch NCs from nc_records table by analista name + ciclo
        const ciclo = rawData.ciclo || snap?.analista?.ciclo;
        let ncQuery = supabase
          .from('nc_records')
          .select('*')
          .ilike('analista', `%${analistaNome.split(' ')[0]}%`);
        if (ciclo) ncQuery = ncQuery.eq('periodo', ciclo);
        const { data: ncRows } = await ncQuery;
        setDbNCs(ncRows || []);
      }
    }

    setLoading(false);
  }, [params?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGeneratePublicLink = async () => {
    const token = crypto.randomUUID();
    await supabase
      .from('feedbacks')
      .update({ public_token: token, public_enabled: true })
      .eq('id', params?.id as string);
    setPublicToken(token);
    setPublicEnabled(true);
  };

  const handleTogglePublicLink = async () => {
    const newEnabled = !publicEnabled;
    await supabase
      .from('feedbacks')
      .update({ public_enabled: newEnabled })
      .eq('id', params?.id as string);
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
      : rawFeedback.snapshot_json_completo || {};

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

    await supabase
      .from('feedbacks')
      .update({
        snapshot_json_completo: updated,
        evolucao_tecnica: editFields.evolucao_tecnica,
        evolucao_comportamental: editFields.evolucao_comportamental,
        resumo_ciclo: editFields.fechamento_ciclo,
      })
      .eq('id', params?.id as string);

    setSaving(false);
    setEditOpen(false);
    fetchData();
  };

  const handleCreatePDI = async () => {
    if (!rawFeedback || pdiCreated) return;
    setPdiCreating(true);
    const snap = Array.isArray(rawFeedback.snapshot_json_completo)
      ? rawFeedback.snapshot_json_completo[0]
      : rawFeedback.snapshot_json_completo || {};
    const analista = snap?.analista || {};
    const scores = snap?.scores || {};
    const ncs = snap?.nao_conformidades || [];
    const elogiosSnap = snap?.elogios || [];

    // Build enterprise_objectives from pdiObjetivos
    const enterpriseObjectives = pdiObjetivos
      .filter((o) => o.objetivo.trim())
      .map((o) => ({
        id: o.id,
        categoria: o.categoria,
        objetivo: o.objetivo,
        acao_esperada: o.acao_esperada,
        resultado_esperado: o.resultado_esperado,
        status: o.status,
        observacao_coordenador: '',
      }));

    const firstObj = enterpriseObjectives[0];
    const mensagemEvolutiva =
      editFields.mensagem_evolutiva ||
      extract(snap, 'feedback_blocks.mensagem_evolutiva', 'mensagem_evolutiva') ||
      '';

    await autoCreatePDIFromFeedback({
      feedbackId: rawFeedback.id,
      analistaId: rawFeedback.analista_id,
      analistaNome: analista?.nome || analistaInfo?.nome || analistaInfo?.nome_completo || '',
      squad:
        analista?.equipe ||
        rawFeedback?.equipe ||
        analistaInfo?.equipe ||
        analistaInfo?.squad ||
        '',
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
      : rawFeedback.snapshot_json_completo || {};
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
    lines.push(
      `CARGO:        ${analistaInfo?.cargo_operacional || analista?.cargo || 'Analista de Qualidade'}`
    );
    lines.push(
      `EQUIPE/SQUAD: ${analista?.equipe || rawFeedback?.equipe || analistaInfo?.squad || '—'}`
    );
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
        lines.push(
          `[${i + 1}] Protocolo: ${a.protocolo || '—'} | Cliente: ${a.cliente || '—'} | QA: ${a.nota_qa || a.nota || '—'}`
        );
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
        if (nc.protocolo || nc.protocolo_referencia)
          lines.push(`    Protocolo: ${nc.protocolo || nc.protocolo_referencia}`);
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
      if (objDev) {
        lines.push('OBJETIVO:');
        lines.push(objDev);
        lines.push('');
      }
      if (acaoDev) {
        lines.push('AÇÃO ESPERADA:');
        lines.push(acaoDev);
        lines.push('');
      }
      if (resultEsp) {
        lines.push('RESULTADO ESPERADO:');
        lines.push(resultEsp);
        lines.push('');
      }
      if (msgEvol) {
        lines.push('MENSAGEM EVOLUTIVA:');
        lines.push(msgEvol);
        lines.push('');
      }
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

  const handleSavePdi = async () => {
    if (!rawFeedback) return;
    const snap = Array.isArray(rawFeedback.snapshot_json_completo)
      ? rawFeedback.snapshot_json_completo[0]
      : rawFeedback.snapshot_json_completo || {};
    const updated = {
      ...snap,
      feedback_blocks: {
        ...(snap?.feedback_blocks || {}),
        pdi_objetivos: pdiObjetivos,
        mensagem_evolutiva:
          editFields.mensagem_evolutiva || snap?.feedback_blocks?.mensagem_evolutiva || '',
      },
    };
    await supabase
      .from('feedbacks')
      .update({ snapshot_json_completo: updated })
      .eq('id', params?.id as string);
  };

  const view = (
    <FeedbackView
      mode="private"
      snapshot={snapshot}
      rawFeedback={rawFeedback}
      analistaInfo={analistaInfo}
      historico={historico}
      elogios={elogios}
      dbNCs={dbNCs}
      loading={loading}
      presentationMode={presentationMode}
      editOpen={editOpen}
      editFields={editFields}
      setEditFields={setEditFields}
      saving={saving}
      publicToken={publicToken}
      publicEnabled={publicEnabled}
      copied={copied}
      pdiCreating={pdiCreating}
      pdiCreated={pdiCreated}
      pdiObjetivos={pdiObjetivos}
      setPdiObjetivos={setPdiObjetivos}
      onEdit={() => setEditOpen(true)}
      onCloseEdit={() => setEditOpen(false)}
      onSave={handleSaveEdit}
      onGeneratePublicLink={handleGeneratePublicLink}
      onTogglePublicLink={handleTogglePublicLink}
      onCopyLink={handleCopyLink}
      onTogglePresentationMode={() => setPresentationMode(!presentationMode)}
      onDownloadTxt={handleDownloadTxt}
      onCreatePDI={handleCreatePDI}
      onSavePdi={handleSavePdi}
    />
  );

  return <EnterpriseLayout>{view}</EnterpriseLayout>;
}
