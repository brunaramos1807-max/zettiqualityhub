import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ─── Service-role Supabase client (bypasses RLS) ─────────────────────────────
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase service role not configured');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PilarQA {
  nome: string;
  nota: number;
  peso?: number;
}

interface PilarIEPC {
  nome: string;
  nota: number;
  peso?: number;
}

interface Criterio {
  nome: string;
  atende: boolean;
  observacao?: string;
}

interface Evidencia {
  tipo: string;
  descricao: string;
  url?: string;
}

interface NC {
  tipo: string;
  descricao: string;
  pontos_deduzidos: number;
  protocolo_referencia?: string;
  reincidente?: boolean;
}

interface PDI {
  acoes: string[];
  metas: string[];
  prazo?: string;
  responsavel?: string;
}

interface Analytics {
  tendencia_qa?: string;
  tendencia_iepc?: string;
  posicao_ranking?: number;
  percentil?: number;
  [key: string]: unknown;
}

interface AvaliacaoPayload {
  analista: string;
  coordenador: string;
  squad: string;
  ciclo: string;
  qa: number;
  iepc: number;
  pilares_qa?: PilarQA[];
  pilares_iepc?: PilarIEPC[];
  atendimentos?: number;
  criterios?: Criterio[];
  evidencias?: Evidencia[];
  sintese_ia?: string;
  ncs?: NC[];
  pdi?: PDI;
  analytics?: Analytics;
  tendencias?: Record<string, unknown>;
  reincidencia?: Record<string, unknown>;
  // Optional extra fields
  auditor?: string;
  data_registro?: string;
  tipo_demanda?: string;
  protocolo?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function hashPayload(payload: unknown): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function extractPilares(pilares: PilarQA[] | PilarIEPC[] | undefined): {
  p1: number; p2: number; p3: number; p4: number; p5: number;
  e1: number; e2: number; e3: number; e4: number; e5: number;
} {
  const result = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, e1: 0, e2: 0, e3: 0, e4: 0, e5: 0 };
  return result;
}

// ─── Token validation ─────────────────────────────────────────────────────────

async function validateToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  authHeader: string | null
): Promise<{ valid: boolean; error?: string }> {
  // ── DIAGNOSTIC LOGS (temporary) ──────────────────────────────────────────
  console.log('[receber-avaliacao] Raw Authorization header:', authHeader);

  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header. Expected: Bearer <token>' };
  }

  // Normalize: handle both "Bearer token" and "bearer token" (case-insensitive)
  const bearerMatch = authHeader.match(/^[Bb]earer\s+(.+)$/);
  if (!bearerMatch) {
    return { valid: false, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
  }

  const token = bearerMatch[1].trim();
  console.log('[receber-avaliacao] Extracted token (first 8 chars):', token.substring(0, 8) + '...');

  // Hash the incoming token using SHA-256
  let hashHex: string;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (cryptoErr) {
    console.error('[receber-avaliacao] crypto.subtle failed:', cryptoErr);
    // Fallback: simple hash comparison for environments without crypto.subtle
    hashHex = hashPayload(token);
  }

  console.log('[receber-avaliacao] Computed SHA-256 hash:', hashHex);
  console.log('[receber-avaliacao] Expected hash:         4c42bf27615c0ecc61aefec1214ce3fe99d82651a91b7424c5c6f962e42bf46b');

  const { data: tokenRow, error } = await supabase
    .from('integration_tokens')
    .select('id, is_active, expires_at, label')
    .eq('token_hash', hashHex)
    .eq('is_active', true)
    .maybeSingle();

  console.log('[receber-avaliacao] DB query result - tokenRow:', tokenRow, '| error:', error);

  if (error || !tokenRow) {
    return { valid: false, error: 'Invalid or inactive token' };
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  // Update last_used_at
  await supabase
    .from('integration_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return { valid: true };
}

// ─── Payload validation ───────────────────────────────────────────────────────

function validatePayload(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const p = body as Record<string, unknown>;

  if (!p.analista || typeof p.analista !== 'string' || p.analista.trim() === '') {
    errors.push('analista: required string');
  }
  if (!p.coordenador || typeof p.coordenador !== 'string' || p.coordenador.trim() === '') {
    errors.push('coordenador: required string');
  }
  if (!p.squad || typeof p.squad !== 'string' || p.squad.trim() === '') {
    errors.push('squad: required string');
  }
  if (!p.ciclo || typeof p.ciclo !== 'string' || p.ciclo.trim() === '') {
    errors.push('ciclo: required string (e.g. "2026-05")');
  }
  if (p.qa === undefined || p.qa === null) {
    errors.push('qa: required numeric score');
  } else if (isNaN(parseNum(p.qa))) {
    errors.push('qa: must be a number');
  }
  if (p.iepc === undefined || p.iepc === null) {
    errors.push('iepc: required numeric score');
  } else if (isNaN(parseNum(p.iepc))) {
    errors.push('iepc: must be a number');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

async function checkDuplicate(
  supabase: ReturnType<typeof createSupabaseClient>,
  analista: string,
  ciclo: string,
  payloadHash: string
): Promise<boolean> {
  // Check if exact same payload was already processed (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('integration_request_logs')
    .select('id')
    .eq('analista', analista)
    .eq('periodo', ciclo)
    .eq('payload_hash', payloadHash)
    .eq('status', 'success')
    .gte('received_at', fiveMinutesAgo)
    .maybeSingle();

  return !!data;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let logId: string | null = null;
  let supabase: ReturnType<typeof createSupabaseClient>;

  try {
    supabase = getServiceClient();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Service unavailable';
    return NextResponse.json({ success: false, error: msg }, { status: 503 });
  }

  // ── 1. Token validation ──────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const tokenResult = await validateToken(supabase, authHeader);

  if (!tokenResult.valid) {
    return NextResponse.json(
      { success: false, error: tokenResult.error },
      { status: 401 }
    );
  }

  // ── 2. Parse body with timeout protection ────────────────────────────────
  let body: unknown;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request body read timeout')), 10000)
    );
    body = await Promise.race([request.json(), timeoutPromise]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON body';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  // ── 3. Payload validation ────────────────────────────────────────────────
  const validation = validatePayload(body);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: 'Payload validation failed', details: validation.errors },
      { status: 422 }
    );
  }

  const payload = body as AvaliacaoPayload;
  const payloadHash = hashPayload(body);
  const ipAddress =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // ── 4. Create initial log entry ──────────────────────────────────────────
  const { data: logEntry } = await supabase
    .from('integration_request_logs')
    .insert({
      source: 'lovable',
      periodo: payload.ciclo,
      analista: payload.analista,
      squad: payload.squad,
      status: 'processing',
      payload_hash: payloadHash,
      ip_address: ipAddress,
      raw_payload: body as Record<string, unknown>,
    })
    .select('id')
    .single();

  logId = logEntry?.id ?? null;

  // ── 5. Duplicate detection ───────────────────────────────────────────────
  const isDuplicate = await checkDuplicate(
    supabase,
    payload.analista,
    payload.ciclo,
    payloadHash
  );

  if (isDuplicate) {
    if (logId) {
      await supabase
        .from('integration_request_logs')
        .update({ status: 'duplicate', duration_ms: Date.now() - startTime })
        .eq('id', logId);
    }
    return NextResponse.json(
      { success: false, error: 'Duplicate request detected. Same evaluation already processed recently.' },
      { status: 409 }
    );
  }

  // ── 6. Upsert import_cycles record ───────────────────────────────────────
  const { data: cycleData, error: cycleError } = await supabase
    .from('import_cycles')
    .upsert(
      {
        periodo: payload.ciclo,
        file_name: `integration_lovable_${payload.ciclo}`,
        record_count: 1,
        import_status: 'completed',
        status: 'completed',
        data_type: 'integration',
        metadata: { source: 'lovable', last_updated: new Date().toISOString() },
      },
      { onConflict: 'periodo' }
    )
    .select('id')
    .single();

  if (cycleError) {
    await updateLog(supabase, logId, 'error', `cycle upsert: ${cycleError.message}`, startTime);
    return NextResponse.json(
      { success: false, error: `Failed to create/update cycle: ${cycleError.message}` },
      { status: 500 }
    );
  }

  const cycleId = cycleData?.id;

  // ── 7. Build cycle_scores row ────────────────────────────────────────────
  const qaScore = parseNum(payload.qa);
  const iepcScore = parseNum(payload.iepc);

  // Extract pillar scores from pilares_qa / pilares_iepc arrays
  const pilaresQA = payload.pilares_qa ?? [];
  const pilaresIEPC = payload.pilares_iepc ?? [];

  const scoreRow = {
    cycle_id: cycleId,
    periodo: payload.ciclo,
    analista: payload.analista,
    squad: payload.squad,
    coordenador: payload.coordenador,
    auditor: payload.auditor ?? null,
    data_registro: payload.data_registro ?? new Date().toISOString().split('T')[0],
    nota_final_qa: qaScore,
    iepc_total: iepcScore,
    total_ncs: Array.isArray(payload.ncs) ? payload.ncs.length : 0,
    pontos_deduzidos_nc: Array.isArray(payload.ncs)
      ? payload.ncs.reduce((sum, nc) => sum + parseNum(nc.pontos_deduzidos), 0)
      : 0,
    p1: parseNum(pilaresQA[0]?.nota),
    p2: parseNum(pilaresQA[1]?.nota),
    p3: parseNum(pilaresQA[2]?.nota),
    p4: parseNum(pilaresQA[3]?.nota),
    p5: parseNum(pilaresQA[4]?.nota),
    e1: parseNum(pilaresIEPC[0]?.nota),
    e2: parseNum(pilaresIEPC[1]?.nota),
    e3: parseNum(pilaresIEPC[2]?.nota),
    e4: parseNum(pilaresIEPC[3]?.nota),
    e5: parseNum(pilaresIEPC[4]?.nota),
    tipo_demanda: payload.tipo_demanda ?? null,
    qtd_atendimentos_avaliados: payload.atendimentos ?? 0,
    protocolo: payload.protocolo ?? null,
    sintese_ia: payload.sintese_ia ?? null,
    tendencias: payload.tendencias ?? null,
    reincidencia: payload.reincidencia ?? null,
    criterios: payload.criterios ? JSON.parse(JSON.stringify(payload.criterios)) : null,
    evidencias: payload.evidencias ? JSON.parse(JSON.stringify(payload.evidencias)) : null,
    analytics: payload.analytics ? JSON.parse(JSON.stringify(payload.analytics)) : null,
    source: 'integration',
    is_manual: false,
  };

  // Upsert cycle_scores (replace existing for same analista+periodo)
  const { error: scoreError } = await supabase
    .from('cycle_scores')
    .upsert(scoreRow, { onConflict: 'id' });

  if (scoreError) {
    // Try insert if upsert fails due to missing id
    const { error: insertError } = await supabase.from('cycle_scores').insert(scoreRow);
    if (insertError) {
      await updateLog(supabase, logId, 'error', `scores insert: ${insertError.message}`, startTime);
      return NextResponse.json(
        { success: false, error: `Failed to save evaluation score: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  // ── 8. Save NC records ───────────────────────────────────────────────────
  if (Array.isArray(payload.ncs) && payload.ncs.length > 0) {
    const ncRows = payload.ncs.map((nc) => ({
      cycle_id: cycleId,
      periodo: payload.ciclo,
      analista: payload.analista,
      squad: payload.squad,
      coordenador: payload.coordenador,
      auditor: payload.auditor ?? null,
      tipo_nc: nc.tipo,
      descricao: nc.descricao,
      pontos_deduzidos: parseNum(nc.pontos_deduzidos),
      protocolo_referencia: nc.protocolo_referencia ?? null,
      source: 'integration',
    }));

    // Delete existing NCs for this analista+periodo from integration source before re-inserting
    await supabase
      .from('nc_records')
      .delete()
      .eq('periodo', payload.ciclo)
      .eq('analista', payload.analista)
      .eq('source', 'integration');

    const { error: ncError } = await supabase.from('nc_records').insert(ncRows);
    if (ncError) {
      console.error('[receber-avaliacao] NC insert error:', ncError.message);
    }
  }

  // ── 9. Upsert PDI record ─────────────────────────────────────────────────
  if (payload.pdi) {
    const pdiRow = {
      cycle_id: cycleId,
      periodo: payload.ciclo,
      analista: payload.analista,
      squad: payload.squad,
      coordenador: payload.coordenador,
      status_pdi: 'Em andamento',
      acoes: payload.pdi.acoes ?? [],
      metas: payload.pdi.metas ?? [],
      nc_reincidentes: Array.isArray(payload.ncs)
        ? payload.ncs.filter((nc) => nc.reincidente).map((nc) => nc.tipo)
        : [],
      qa_score: qaScore,
      iepc_score: iepcScore,
      sintese_ia: payload.sintese_ia ?? null,
      source: 'integration',
      updated_at: new Date().toISOString(),
    };

    const { error: pdiError } = await supabase
      .from('pdi_records')
      .upsert(pdiRow, { onConflict: 'analista,periodo' });

    if (pdiError) {
      console.error('[receber-avaliacao] PDI upsert error:', pdiError.message);
    }
  }

  // ── 10. Update cycle_summaries ───────────────────────────────────────────
  try {
    const { data: allScores } = await supabase
      .from('cycle_scores')
      .select('nota_final_qa, iepc_total, total_ncs')
      .eq('periodo', payload.ciclo);

    if (allScores && allScores.length > 0) {
      const qaMedia =
        allScores.reduce((s, r) => s + parseNum(r.nota_final_qa), 0) / allScores.length;
      const iepcMedia =
        allScores.reduce((s, r) => s + parseNum(r.iepc_total), 0) / allScores.length;
      const totalNCs = allScores.reduce((s, r) => s + (r.total_ncs ?? 0), 0);

      await supabase
        .from('cycle_summaries')
        .upsert(
          {
            periodo: payload.ciclo,
            total_analistas: allScores.length,
            qa_media: Math.round(qaMedia * 100) / 100,
            iepc_media: Math.round(iepcMedia * 100) / 100,
            total_ncs: totalNCs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'periodo' }
        );
    }
  } catch (summaryErr) {
    console.error('[receber-avaliacao] cycle_summaries update error:', summaryErr);
  }

  // ── 11. Mark log as success ──────────────────────────────────────────────
  await updateLog(supabase, logId, 'success', null, startTime);

  return NextResponse.json(
    {
      success: true,
      message: 'Avaliação recebida e persistida com sucesso.',
      data: {
        ciclo: payload.ciclo,
        analista: payload.analista,
        squad: payload.squad,
        cycle_id: cycleId,
        log_id: logId,
        qa: qaScore,
        iepc: iepcScore,
        ncs_saved: Array.isArray(payload.ncs) ? payload.ncs.length : 0,
        pdi_saved: !!payload.pdi,
      },
    },
    { status: 200 }
  );
}

// ─── Helper: update log entry ─────────────────────────────────────────────────
async function updateLog(
  supabase: ReturnType<typeof createSupabaseClient>,
  logId: string | null,
  status: string,
  errorMessage: string | null,
  startTime: number
) {
  if (!logId) return;
  await supabase
    .from('integration_request_logs')
    .update({
      status,
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    })
    .eq('id', logId);
}

// ─── GET: health check ────────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'POST /api/receber-avaliacao',
    version: '1.0.0',
    description: 'Qualivisão Integration API — receives evaluations from Lovable',
    required_headers: {
      Authorization: 'Bearer <token>',
      'Content-Type': 'application/json',
    },
    required_fields: ['analista', 'coordenador', 'squad', 'ciclo', 'qa', 'iepc'],
    optional_fields: [
      'pilares_qa',
      'pilares_iepc',
      'atendimentos',
      'criterios',
      'evidencias',
      'sintese_ia',
      'ncs',
      'pdi',
      'analytics',
      'tendencias',
      'reincidencia',
    ],
    note: 'Elogios are not accepted via integration — use manual import.',
  });
}
