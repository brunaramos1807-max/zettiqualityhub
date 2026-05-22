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

  // Required fields
  const required = ['analista_email', 'ciclo', 'qa_score', 'iepc_score'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Campo obrigatório ausente: ${field}` }, { status: 422 });
    }
  }

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
    .eq('email', body.analista_email)
    .maybeSingle();

  if (!analista) {
    await supabaseAdmin.from('feedback_import_logs').insert({
      origem: 'api_lovable',
      payload_hash: payloadHash,
      status: 'error',
      error_message: `Analista não encontrado: ${body.analista_email}`,
    });
    return NextResponse.json({ error: `Analista não encontrado: ${body.analista_email}` }, { status: 404 });
  }

  // Check duplicate ciclo for analista
  const { data: existingFeedback } = await supabaseAdmin
    .from('feedbacks')
    .select('id')
    .eq('analista_id', analista.id)
    .eq('ciclo', body.ciclo as string)
    .maybeSingle();

  if (existingFeedback) {
    return NextResponse.json({ message: 'Feedback já existe para este ciclo', feedback_id: existingFeedback.id }, { status: 200 });
  }

  // Build feedback record
  const feedbackData = {
    analista_id: analista.id,
    ciclo: body.ciclo,
    periodo_inicio: body.periodo_inicio || null,
    periodo_fim: body.periodo_fim || null,
    coordenador: body.coordenador || analista.coordenador,
    equipe: body.equipe || analista.equipe,
    qa_score: Number(body.qa_score),
    iepc_score: Number(body.iepc_score),
    aderencia_score: body.aderencia_score ? Number(body.aderencia_score) : null,
    posicao_squad: body.posicao_squad ? Number(body.posicao_squad) : null,
    total_squad: body.total_squad ? Number(body.total_squad) : null,
    ciclos_consecutivos_evolucao: body.ciclos_consecutivos_evolucao ? Number(body.ciclos_consecutivos_evolucao) : 0,
    pilares_qa: body.pilares_qa || [],
    pilares_iepc: body.pilares_iepc || [],
    pontos_fortes: body.pontos_fortes || [],
    oportunidades: body.oportunidades || [],
    resumo_ciclo: body.resumo_ciclo || null,
    tendencias: body.tendencias || {},
    conquistas: body.conquistas || [],
    status: 'generated' as const,
    origem: 'api_lovable',
    external_id: body.external_id as string || null,
    snapshot_json_completo: body,
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
  if (Array.isArray(body.atendimentos) && body.atendimentos.length > 0) {
    const atendimentos = (body.atendimentos as Record<string, unknown>[]).map((a) => ({
      feedback_id: feedback.id,
      protocolo: a.protocolo,
      cliente: a.cliente,
      assunto: a.assunto,
      nota_qa: a.nota_qa ? Number(a.nota_qa) : null,
      nota_iepc: a.nota_iepc ? Number(a.nota_iepc) : null,
      classificacao: a.classificacao || null,
      observacao: a.observacao || null,
    }));
    await supabaseAdmin.from('feedback_atendimentos').insert(atendimentos);
  }

  // Insert coaching
  if (Array.isArray(body.coaching) && body.coaching.length > 0) {
    const coaching = (body.coaching as Record<string, unknown>[]).map((c) => ({
      feedback_id: feedback.id,
      o_que_foi_dito: c.o_que_foi_dito,
      como_poderia_ser: c.como_poderia_ser,
      dica_de_ouro: c.dica_de_ouro,
      contexto: c.contexto,
    }));
    await supabaseAdmin.from('feedback_coaching').insert(coaching);
  }

  // Insert PDI
  if (Array.isArray(body.pdi) && body.pdi.length > 0) {
    const pdi = (body.pdi as Record<string, unknown>[]).map((p) => ({
      feedback_id: feedback.id,
      analista_id: analista.id,
      objetivo: p.objetivo,
      acao_desenvolvimento: p.acao_desenvolvimento,
      prazo: p.prazo || null,
      progresso: p.progresso ? Number(p.progresso) : 0,
      status: p.status || 'pendente',
    }));
    await supabaseAdmin.from('feedback_pdi').insert(pdi);
  }

  // Log success
  await supabaseAdmin.from('feedback_import_logs').insert({
    origem: 'api_lovable',
    payload_hash: payloadHash,
    status: 'success',
    feedback_id: feedback.id,
  });

  return NextResponse.json({ success: true, feedback_id: feedback.id }, { status: 201 });
}
