import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_TOKEN = process.env.INTEGRATION_API_TOKEN;

function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Normalize full or simple JSON to internal format
function normalize(body: Record<string, unknown>) {
  const analista = body.analista as Record<string, unknown> | undefined;
  const cicloObj = body.ciclo as Record<string, unknown> | undefined;
  const scores = body.scores as Record<string, unknown> | undefined;

  // FIX: Handle analista as object (Lovable) or string (legacy)
  const analistaObj = typeof analista === 'object' && analista !== null ? analista : null;
  const email = (analistaObj?.email || body.analista_email) as string;
  const ciclo = (typeof cicloObj === 'object' && cicloObj?.nome ? cicloObj.nome : body.ciclo) as string;
  const qa = Number(scores?.qa ?? body.qa_score ?? 0);
  const iepc = Number(scores?.iepc ?? body.iepc_score ?? 0);
  const aderencia = scores?.aderencia != null ? Number(scores.aderencia) : (body.aderencia_score != null ? Number(body.aderencia_score) : null);

  // Normalize pilares
  const rawQaPilares = (body.qa_pilares || body.pilares_qa || []) as Record<string, unknown>[];
  const rawIepcPilares = (body.iepc_pilares || body.pilares_iepc || []) as Record<string, unknown>[];
  const pilares_qa = rawQaPilares.map((p) => ({ nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max, variacao: p.variacao }));
  const pilares_iepc = rawIepcPilares.map((p) => ({ nome: p.nome, pontuacao: p.nota ?? p.pontuacao, max: p.maximo ?? p.max, variacao: p.variacao }));

  // Analytics
  const analytics = body.analytics as Record<string, unknown> | undefined;

  // Extract feedback_blocks fields — Lovable may send them nested or at root
  const feedbackBlocks = body.feedback_blocks as Record<string, unknown> | undefined;
  // FIX: feedback_blocks values may be arrays (string[]) — join them safely
  const joinField = (val: unknown): string | null => {
    if (!val) return null;
    if (Array.isArray(val)) return val.map(String).join('\n');
    return String(val);
  };
  const evolucaoTecnica = joinField(feedbackBlocks?.evolucao_tecnica || body.evolucao_tecnica);
  const evolucaoComportamental = joinField(feedbackBlocks?.evolucao_comportamental || body.evolucao_comportamental);
  const atencaoEvolutiva = joinField(
    feedbackBlocks?.atencao_evolutiva ||
    body.atencao_evolutiva ||
    body.risco_operacional
  );

  // FIX: Extract nao_conformidades from Lovable payload
  const nao_conformidades = Array.isArray(body.nao_conformidades) ? body.nao_conformidades as Record<string, unknown>[] : [];

  // FIX: Extract pdi — Lovable sends array of {objetivo, acao, resultadoEsperado}
  const pdi = Array.isArray(body.pdi) ? body.pdi as Record<string, unknown>[] : [];

  // TEMPORARY DEBUG LOG
  console.log('[feedbacks/import] payload recebido', JSON.stringify({
    email,
    ciclo,
    qa,
    iepc,
    pdi_count: pdi.length,
    nao_conformidades_count: nao_conformidades.length,
    feedback_blocks_keys: feedbackBlocks ? Object.keys(feedbackBlocks) : [],
    coaching_count: Array.isArray(body.coaching) ? (body.coaching as unknown[]).length : 0,
    qa_pilares_count: rawQaPilares.length,
    iepc_pilares_count: rawIepcPilares.length,
  }, null, 2));

  return {
    email,
    ciclo,
    qa,
    iepc,
    aderencia,
    pilares_qa,
    pilares_iepc,
    coordenador: (analistaObj?.coordenador || body.coordenador) as string | undefined,
    equipe: (analistaObj?.equipe || body.equipe) as string | undefined,
    resumo_ciclo: (feedbackBlocks?.fechamento_ciclo || body.resumo_ciclo) as string | null || null,
    pontos_fortes: (body.pontos_fortes || []) as unknown[],
    oportunidades: (body.oportunidades || []) as unknown[],
    tendencias: (body.tendencias || {}) as Record<string, unknown>,
    conquistas: (body.conquistas || []) as unknown[],
    posicao_squad: analytics?.ranking_squad != null ? Number(analytics.ranking_squad) : (body.posicao_squad != null ? Number(body.posicao_squad) : null),
    total_squad: analytics?.total_analistas != null ? Number(analytics.total_analistas) : (body.total_squad != null ? Number(body.total_squad) : null),
    ciclos_consecutivos_evolucao: analytics?.ciclos_consecutivos_evolucao != null ? Number(analytics.ciclos_consecutivos_evolucao) : (body.ciclos_consecutivos_evolucao != null ? Number(body.ciclos_consecutivos_evolucao) : 0),
    atendimentos: (body.atendimentos || []) as Record<string, unknown>[],
    coaching: (body.coaching || []) as Record<string, unknown>[],
    pdi,
    nao_conformidades,
    historico: (body.historico || []) as Record<string, unknown>[],
    external_id: body.external_id as string | null || null,
    evolucao_tecnica: evolucaoTecnica,
    evolucao_comportamental: evolucaoComportamental,
    atencao_evolutiva: atencaoEvolutiva,
  };
}

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (VALID_TOKEN && token !== VALID_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const n = normalize(body);

  if (!n.email) return NextResponse.json({ error: 'Campo obrigatório ausente: analista_email ou analista.email' }, { status: 422 });
  if (!n.ciclo) return NextResponse.json({ error: 'Campo obrigatório ausente: ciclo ou ciclo.nome' }, { status: 422 });
  if (!n.qa) return NextResponse.json({ error: 'Campo obrigatório ausente: qa_score ou scores.qa' }, { status: 422 });

  const payloadHash = hashPayload(body);

  // Idempotency: check if already imported
  const { data: existingLog } = await supabaseAdmin
    .from('feedback_import_logs')
    .select('id, feedback_id')
    .eq('payload_hash', payloadHash)
    .eq('status', 'success')
    .maybeSingle();

  if (existingLog) {
    return NextResponse.json({ message: 'Já importado', feedback_id: existingLog.feedback_id }, { status: 200 });
  }

  // Find analista
  const { data: analista } = await supabaseAdmin
    .from('analistas')
    .select('id, nome, equipe, coordenador')
    .eq('email', n.email)
    .maybeSingle();

  if (!analista) {
    await supabaseAdmin.from('feedback_import_logs').insert({ origem: 'api_lovable', payload_hash: payloadHash, status: 'error', error_message: `Analista não encontrado: ${n.email}` });
    return NextResponse.json({ error: `Analista não encontrado: ${n.email}` }, { status: 404 });
  }

  // Check duplicate ciclo for analista
  const { data: existingFeedback } = await supabaseAdmin
    .from('feedbacks')
    .select('id')
    .eq('analista_id', analista.id)
    .eq('ciclo', n.ciclo)
    .maybeSingle();

  if (existingFeedback) {
    return NextResponse.json({ message: 'Feedback já existe para este ciclo', feedback_id: existingFeedback.id }, { status: 200 });
  }

  // Build feedback record
  const feedbackData = {
    analista_id: analista.id,
    ciclo: n.ciclo,
    periodo_inicio: body.periodo_inicio || null,
    periodo_fim: body.periodo_fim || null,
    coordenador: n.coordenador || analista.coordenador,
    equipe: n.equipe || analista.equipe,
    qa_score: n.qa,
    iepc_score: n.iepc,
    aderencia_score: n.aderencia,
    posicao_squad: n.posicao_squad,
    total_squad: n.total_squad,
    ciclos_consecutivos_evolucao: n.ciclos_consecutivos_evolucao,
    pilares_qa: n.pilares_qa,
    pilares_iepc: n.pilares_iepc,
    pontos_fortes: n.pontos_fortes,
    oportunidades: n.oportunidades,
    resumo_ciclo: n.resumo_ciclo,
    tendencias: n.tendencias,
    conquistas: n.conquistas,
    status: 'generated' as const,
    origem: 'api_lovable',
    external_id: n.external_id,
    evolucao_tecnica: n.evolucao_tecnica,
    evolucao_comportamental: n.evolucao_comportamental,
    // Store atencao_evolutiva in risco_operacional column (dedicated text column)
    risco_operacional: n.atencao_evolutiva,
    // Enrich snapshot: ensure feedback_blocks.atencao_evolutiva is always present
    snapshot_json_completo: {
      ...(body as Record<string, unknown>),
      feedback_blocks: {
        ...((body.feedback_blocks as Record<string, unknown>) || {}),
        evolucao_tecnica: n.evolucao_tecnica,
        evolucao_comportamental: n.evolucao_comportamental,
        atencao_evolutiva: n.atencao_evolutiva,
        fechamento_ciclo: (body.feedback_blocks as Record<string, unknown>)?.fechamento_ciclo || body.resumo_ciclo || null,
      },
    },
  };

  const { data: feedback, error: fbError } = await supabaseAdmin
    .from('feedbacks')
    .insert(feedbackData)
    .select('id')
    .single();

  if (fbError || !feedback) {
    await supabaseAdmin.from('feedback_import_logs').insert({
      origem: 'api_lovable',
      payload_hash: payloadHash,
      status: 'error',
      error_message: fbError?.message || 'Erro ao salvar feedback',
    });
    return NextResponse.json({ error: fbError?.message || 'Erro ao salvar' }, { status: 500 });
  }

  // Insert atendimentos
  if (n.atendimentos.length > 0) {
    await supabaseAdmin.from('feedback_atendimentos').insert(
      n.atendimentos.map((a) => ({
        feedback_id: feedback.id,
        protocolo: a.protocolo,
        cliente: a.cliente,
        assunto: a.assunto,
        nota_qa: a.nota != null ? Number(a.nota) : (a.nota_qa != null ? Number(a.nota_qa) : null),
        // FIX: Read nota_iepc from atendimento (Lovable sends nota_iepc and iepc_avaliado)
        nota_iepc: a.nota_iepc != null ? Number(a.nota_iepc) : null,
        classificacao: a.classificacao || null,
        observacao: a.sintese || a.observacao || null,
      }))
    );
  }

  // Insert coaching
  if (n.coaching.length > 0) {
    await supabaseAdmin.from('feedback_coaching').insert(
      n.coaching.map((c) => ({
        feedback_id: feedback.id,
        o_que_foi_dito: c.o_que_foi_dito,
        como_poderia_ser: c.como_poderia_ser,
        dica_de_ouro: c.dica_de_ouro,
        contexto: c.categoria || c.contexto || null,
      }))
    );
  }

  // Insert PDI
  if (n.pdi.length > 0) {
    await supabaseAdmin.from('feedback_pdi').insert(
      n.pdi.map((p) => ({
        feedback_id: feedback.id,
        analista_id: analista.id,
        // FIX: Support Lovable format {objetivo, acao, resultadoEsperado} and legacy {objetivo, acao_desenvolvimento}
        objetivo: p.objetivo || p.acao || '',
        acao_desenvolvimento: p.acao || p.acao_desenvolvimento || p.resultadoEsperado || null,
        prazo: p.prazo || null,
        progresso: p.progresso != null ? Number(p.progresso) : 0,
        status: p.status || 'pendente',
      }))
    );
  }

  // Insert historico
  if (n.historico.length > 0) {
    const histRows = n.historico.map((h) => ({
      analista_id: analista.id,
      ciclo: h.ciclo,
      qa_score: h.qa != null ? Number(h.qa) : (h.qa_score != null ? Number(h.qa_score) : null),
      iepc_score: h.iepc != null ? Number(h.iepc) : (h.iepc_score != null ? Number(h.iepc_score) : null),
    }));
    await supabaseAdmin.from('feedback_historico').upsert(histRows, { onConflict: 'analista_id,ciclo', ignoreDuplicates: true });
  }

  // Always insert/upsert the current feedback's own cycle into feedback_historico
  // This ensures the current cycle appears in the analyst's history chart
  await supabaseAdmin.from('feedback_historico').upsert([{
    analista_id: analista.id,
    feedback_id: feedback.id,
    ciclo: n.ciclo,
    qa_score: n.qa,
    iepc_score: n.iepc,
    aderencia_score: n.aderencia,
  }], { onConflict: 'analista_id,ciclo', ignoreDuplicates: false });

  // FIX: Save nao_conformidades to nc_records
  if (n.nao_conformidades.length > 0) {
    // Find the cycle_id for this period
    const { data: cycleRow } = await supabaseAdmin
      .from('import_cycles')
      .select('id')
      .eq('periodo', n.ciclo)
      .maybeSingle();

    const ncRows = n.nao_conformidades.map((nc: Record<string, unknown>) => ({
      cycle_id: cycleRow?.id || null,
      periodo: n.ciclo,
      analista: (nc.analista as string) || analista.nome,
      squad: (nc.squad as string) || analista.equipe || n.equipe || null,
      coordenador: (nc.coordenador as string) || analista.coordenador || n.coordenador || null,
      tipo_nc: (nc.tipo_nc as string) || 'Não Especificado',
      descricao: (nc.descricao as string) || null,
      pontos_deduzidos: typeof nc.pontos_deduzidos === 'number' ? nc.pontos_deduzidos : 0,
      protocolo_referencia: (nc.protocolo as string) || null,
      source: 'integration',
    }));

    const { error: ncError } = await supabaseAdmin.from('nc_records').insert(ncRows);
    if (ncError) console.error('[feedbacks/import] NC insert error:', ncError.message);
    else console.log(`[feedbacks/import] Saved ${ncRows.length} NC records`);
  }

  // Log success
  await supabaseAdmin.from('feedback_import_logs').insert({
    origem: 'api_lovable',
    payload_hash: payloadHash,
    status: 'success',
    feedback_id: feedback.id,
  });

  // ── Upsert cycle_scores so dashboard reflects this feedback ──────────────
  const { data: cycleRowForScore } = await supabaseAdmin
    .from('import_cycles')
    .select('id')
    .eq('periodo', n.ciclo)
    .maybeSingle();

  const cycleScoreRow = {
    cycle_id: cycleRowForScore?.id || null,
    periodo: n.ciclo,
    analista: analista.nome,
    squad: n.equipe || analista.equipe || null,
    coordenador: n.coordenador || analista.coordenador || null,
    nota_final_qa: n.qa,
    iepc_total: n.iepc,
    p1: n.pilares_qa[0] ? Number(n.pilares_qa[0].pontuacao) : null,
    p2: n.pilares_qa[1] ? Number(n.pilares_qa[1].pontuacao) : null,
    p3: n.pilares_qa[2] ? Number(n.pilares_qa[2].pontuacao) : null,
    p4: n.pilares_qa[3] ? Number(n.pilares_qa[3].pontuacao) : null,
    p5: n.pilares_qa[4] ? Number(n.pilares_qa[4].pontuacao) : null,
    e1: n.pilares_iepc[0] ? Number(n.pilares_iepc[0].pontuacao) : null,
    e2: n.pilares_iepc[1] ? Number(n.pilares_iepc[1].pontuacao) : null,
    e3: n.pilares_iepc[2] ? Number(n.pilares_iepc[2].pontuacao) : null,
    e4: n.pilares_iepc[3] ? Number(n.pilares_iepc[3].pontuacao) : null,
    e5: n.pilares_iepc[4] ? Number(n.pilares_iepc[4].pontuacao) : null,
    source: 'integration',
    is_manual: false,
  };

  const { error: cycleScoreError } = await supabaseAdmin
    .from('cycle_scores')
    .upsert(cycleScoreRow, { onConflict: 'periodo,analista,squad' });
  if (cycleScoreError) {
    console.error('[feedbacks/import] cycle_scores upsert error:', cycleScoreError.message);
  } else {
    console.log(`[feedbacks/import] cycle_scores upserted for ${analista.nome} / ${n.ciclo}`);
  }

  return NextResponse.json({ success: true, feedback_id: feedback.id }, { status: 201 });
}
