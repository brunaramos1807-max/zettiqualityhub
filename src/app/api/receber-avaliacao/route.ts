import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { AvaliacaoIngestaoSchema } from '@/lib/domain/canonicalSchemas';
import {
  extrairPeriodoMesAno,
  normalizarIdentificadorCiclo,
  isCicloHomologado,
  validarDataNoIntervaloCiclo,
} from '@/lib/domain/cycleGovernance';

// ─── Service-role Supabase client (Server-Side Only) ─────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase service role key não configurada no ambiente.');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Validação Estrita de Autenticação Bearer ─────────────────────────────────
async function authenticateRequest(
  supabase: any,
  authHeader: string | null
): Promise<{ authenticated: boolean; error?: string }> {
  if (!authHeader) {
    return {
      authenticated: false,
      error: 'Cabeçalho de autorização obrigatório. Use: Bearer <token>',
    };
  }

  const bearerMatch = authHeader.match(/^[Bb]earer\s+(.+)$/);
  if (!bearerMatch) {
    return {
      authenticated: false,
      error: 'Formato de autorização inválido. Esperado: Bearer <token>',
    };
  }

  const token = bearerMatch[1].trim();

  // 1. Verificação contra token de integração do ambiente (sem fallback)
  if (process.env.INTEGRATION_API_TOKEN && token === process.env.INTEGRATION_API_TOKEN) {
    return { authenticated: true };
  }

  // 2. Verificação contra hash SHA-256 no banco
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: tokenRow, error } = await supabase
      .from('integration_tokens')
      .select('id, is_active, expires_at')
      .eq('token_hash', hashHex)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !tokenRow) {
      return { authenticated: false, error: 'Token de integração inválido ou inativo.' };
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
      return { authenticated: false, error: 'Token de integração expirado.' };
    }

    await supabase
      .from('integration_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRow.id);

    return { authenticated: true };
  } catch (err: any) {
    return { authenticated: false, error: 'Erro ao validar credenciais: ' + err.message };
  }
}

// ─── Endpoint POST /api/receber-avaliacao ────────────────────────────────────
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let supabase: any;

  try {
    supabase = getServiceClient();
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Falha de configuração interna', details: err.message },
      { status: 503 }
    );
  }

  // 1. Autenticação estrita (sem permissões de fallback)
  const authHeader = request.headers.get('authorization');
  const authCheck = await authenticateRequest(supabase, authHeader);
  if (!authCheck.authenticated) {
    return NextResponse.json({ error: authCheck.error }, { status: 401 });
  }

  // 2. Extração do payload
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Corpo da requisição deve ser um JSON válido' },
      { status: 400 }
    );
  }

  // 3. Validação do contrato canônico via Zod
  const validation = AvaliacaoIngestaoSchema.safeParse(body);
  if (!validation.success) {
    const errorDetails = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return NextResponse.json(
      { error: 'Payload em desacordo com o contrato canônico', details: errorDetails },
      { status: 422 }
    );
  }

  const data = validation.data;
  const mesAno = extrairPeriodoMesAno(data.periodo || '');
  if (!mesAno) {
    return NextResponse.json(
      { error: 'Campo "periodo" é obrigatório no formato MM/AAAA (ex: "09/2026")' },
      { status: 422 }
    );
  }

  const identificacaoCiclo = normalizarIdentificadorCiclo(mesAno);

  // 4. Verificação de status do ciclo e integridade das datas
  const { data: cicloRow } = await supabase
    .from('import_cycles')
    .select('id, status, is_closed, data_inicio, data_fim')
    .eq('periodo', mesAno)
    .maybeSingle();

  if (cicloRow && isCicloHomologado(cicloRow)) {
    return NextResponse.json(
      {
        error: `O ${identificacaoCiclo} está homologado e bloqueado contra novas inserções.`,
        ciclo: mesAno,
      },
      { status: 403 }
    );
  }

  // Validação das datas cadastradas no ciclo
  if (data.data_registro && cicloRow?.data_inicio && cicloRow?.data_fim) {
    const dateCheck = validarDataNoIntervaloCiclo(
      data.data_registro,
      cicloRow.data_inicio,
      cicloRow.data_fim
    );
    if (!dateCheck.valido) {
      return NextResponse.json(
        {
          error: dateCheck.mensagem,
          data_registro: data.data_registro,
          intervalo_ciclo: { inicio: cicloRow.data_inicio, fim: cicloRow.data_fim },
        },
        { status: 422 }
      );
    }
  }

  // 5. Garantir ciclo no banco se não existir
  let cycleId = cicloRow?.id;
  if (!cycleId) {
    const { data: insertedCycle } = await supabase
      .from('import_cycles')
      .upsert(
        {
          periodo: mesAno,
          identificacao: identificacaoCiclo,
          status: 'em_apuracao',
          is_closed: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'periodo' }
      )
      .select('id')
      .single();
    cycleId = insertedCycle?.id;
  }

  // 6. Persistência Idempotente da Avaliação Oficial (cycle_scores)
  const scorePayload = {
    cycle_id: cycleId,
    periodo: mesAno,
    data_registro: data.data_registro || null,
    analista: data.analista_nome,
    squad: data.equipe_nome,
    coordenador: data.coordenador_nome || null,
    auditor: data.auditor_nome || null,
    nota_final_qa: data.nota_final_qa,
    iepc_total: data.indice_iepc,
    total_ncs: data.total_ncs,
    pontos_deduzidos_nc: data.pontos_deduzidos_nc,
    qtd_atendimentos_avaliados: data.qtd_atendimentos_auditados,
    p1: data.p1 || 0,
    p2: data.p2 || 0,
    p3: data.p3 || 0,
    p4: data.p4 || 0,
    p5: data.p5 || 0,
    e1: data.e1 || 0,
    e2: data.e2 || 0,
    e3: data.e3 || 0,
    e4: data.e4 || 0,
    e5: data.e5 || 0,
    source: 'api_integration',
  };

  const { error: scoreError } = await supabase
    .from('cycle_scores')
    .upsert(scorePayload, { onConflict: 'periodo,analista,squad' });

  if (scoreError) {
    return NextResponse.json(
      { error: 'Falha ao persistir pontuação de qualidade', details: scoreError.message },
      { status: 500 }
    );
  }

  // 7. Persistência de Não Conformidades vinculadas
  let ncsInseridas = 0;
  if (data.nao_conformidades && data.nao_conformidades.length > 0) {
    const ncsPayload = data.nao_conformidades.map((nc) => ({
      cycle_id: cycleId,
      periodo: mesAno,
      data_registro:
        nc.data_registro || data.data_registro || new Date().toISOString().split('T')[0],
      analista: data.analista_nome,
      squad: data.equipe_nome,
      coordenador: data.coordenador_nome || null,
      auditor: data.auditor_nome || null,
      tipo_nc: nc.tipo_nc,
      pontos_deduzidos: nc.pontos_deduzidos,
      protocolo_referencia: nc.protocolo_referencia || null,
      descricao: nc.evidencia_resumo || nc.justificativa || null,
      source: 'api_integration',
    }));

    const { error: ncError } = await supabase.from('nc_records').insert(ncsPayload);
    if (!ncError) ncsInseridas = ncsPayload.length;
  }

  // 8. Log de Auditoria Forense
  try {
    await supabase.from('integration_request_logs').insert({
      origem: 'api_receber_avaliacao',
      status_code: 200,
      ip_origem: request.headers.get('x-forwarded-for') || 'api',
      payload_hash: data.hash_registro || `${mesAno}_${data.analista_identificador}`,
      tempo_resposta_ms: Date.now() - startTime,
    });
  } catch {
    // Audit log não bloqueia resposta
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: `Avaliação de ${data.analista_nome} registrada com sucesso no ${identificacaoCiclo}`,
    ciclo: mesAno,
    analista: data.analista_nome,
    equipe: data.equipe_nome,
    nota_qa: data.nota_final_qa,
    indice_iepc: data.indice_iepc,
    ncs_registradas: ncsInseridas,
  });
}
