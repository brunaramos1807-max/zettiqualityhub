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

  const email = (analista?.email || body.analista_email) as string;
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

  return {
    email,
    ciclo,
    qa,
    iepc,
    aderencia,
    pilares_qa,
    pilares_iepc,
    coordenador: (analista?.coordenador || body.coordenador) as string | undefined,
    equipe: (analista?.equipe || body.equipe) as string | undefined,
    resumo_ciclo: body.resumo_ciclo as string | null || null,
    pontos_fortes: (body.pontos_fortes || []) as unknown[],
    oportunidades: (body.oportunidades || []) as unknown[],
    tendencias: (body.tendencias || {}) as Record<string, unknown>,
    conquistas: (body.conquistas || []) as unknown[],
    posicao_squad: analytics?.ranking_squad != null ? Number(analytics.ranking_squad) : (body.posicao_squad != null ? Number(body.posicao_squad) : null),
    total_squad: analytics?.total_analistas != null ? Number(analytics.total_analistas) : (body.total_squad != null ? Number(body.total_squad) : null),
    ciclos_consecutivos_evolucao: analytics?.ciclos_consecutivos_evolucao != null ? Number(analytics.ciclos_consecutivos_evolucao) : (body.ciclos_consecutivos_evolucao != null ? Number(body.ciclos_consecutivos_evolucao) : 0),
    atendimentos: (body.atendimentos || []) as Record<string, unknown>[],
    coaching: (body.coaching || []) as Record<string, unknown>[],
    pdi: (body.pdi || []) as Record<string, unknown>[],
    historico: (body.historico || []) as Record<string, unknown>[],
    external_id: body.external_id as string | null || null,
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
  if (n.atendimentos.length > 0) {
    await supabaseAdmin.from('feedback_atendimentos').insert(
      n.atendimentos.map((a) => ({
        feedback_id: feedback.id,
        protocolo: a.protocolo,
        cliente: a.cliente,
        assunto: a.assunto,
        nota_qa: a.nota != null ? Number(a.nota) : (a.nota_qa != null ? Number(a.nota_qa) : null),
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
        objetivo: p.objetivo,
        acao_desenvolvimento: p.acao || p.acao_desenvolvimento,
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

  // Log success
  await supabaseAdmin.from('feedback_import_logs').insert({
    origem: 'api_lovable',
    payload_hash: payloadHash,
    status: 'success',
    feedback_id: feedback.id,
  });

  return NextResponse.json({ success: true, feedback_id: feedback.id }, { status: 201 });
}
