import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  normalizePayloadForEndpoint,
  logNormalizationWarnings,
  auditPayloadCompatibility,
  NormalizedEndpointPayload,
  validateEndpointPayload,
} from '@/lib/normalizers/endpointAdapter';
import type { NormalizedPayload } from '@/lib/normalizers/normalizePayload';

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

// ─── Types — NEW payload contract from Lovable ────────────────────────────────

interface NewPayloadMetadata {
  origem?: string;
  versao?: string;
  gerado_em?: string;
  avaliacao_id?: string;
}

interface NewPayloadAnalista {
  nome?: string;
  nome_completo?: string;
  email?: string;
  equipe?: string;
  coordenador?: string;
  auditor?: string;
}

interface NewPayloadCiclo {
  nome?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
}

interface NewPayloadScores {
  qa?: number;
  iepc?: number;
  aderencia?: number;
}

interface NewPayloadPilar {
  codigo?: string;
  nome: string;
  nota: number;
  maximo?: number;
  peso?: number;
}

interface NewPayloadCriterio {
  pilar_nome?: string;
  criterio_nome?: string;
  status?: string;
  // old format fallback
  nome?: string;
  atende?: boolean;
  observacao?: string;
}

interface NewPayloadAtendimento {
  protocolo?: string;
  sup?: string;
  cliente?: string;
  data?: string;
  duracao?: string;
  nota_qa?: number;
  assunto?: string;
  solucao?: string;
  sintese?: string;
  informou_sup?: boolean;
  criterios?: NewPayloadCriterio[];
  nao_conformidades?: string[];
}

interface NewPayloadCoaching {
  o_que_foi_dito?: string;
  como_poderia_ser?: string;
  dica_de_ouro?: string;
  categoria?: string;
}

interface NewPayloadNC {
  protocolo?: string;
  tipo_nc?: string;
  descricao?: string;
  // per-NC analyst fields (Lovable may send these per NC)
  analista?: string;
  squad?: string;
  coordenador?: string;
  // old format
  tipo?: string;
  pontos_deduzidos?: number;
  protocolo_referencia?: string;
  reincidente?: boolean;
}

interface NewPayloadFeedbackBlocks {
  evolucao_tecnica?: string[];
  evolucao_comportamental?: string[];
  atencao_evolutiva?: string[];
  fechamento_ciclo?: string;
}

interface NewPayloadPDI {
  objetivo?: string;
  acao?: string;
  prazo?: string;
  status?: string;
  // old format
  acoes?: string[];
  metas?: string[];
  responsavel?: string;
}

interface NewPayloadHistorico {
  ciclo?: string;
  qa?: number;
  iepc?: number;
}

// ─── Unified payload — supports both old and new format ──────────────────────
interface AvaliacaoPayload {
  // NEW format top-level objects
  metadata?: NewPayloadMetadata;
  analista?: string | NewPayloadAnalista;
  ciclo?: string | NewPayloadCiclo;
  scores?: NewPayloadScores;
  qa_pilares?: NewPayloadPilar[];
  iepc_pilares?: NewPayloadPilar[];
  atendimentos?: number | NewPayloadAtendimento[];
  coaching?: NewPayloadCoaching | NewPayloadCoaching[];
  nao_conformidades?: NewPayloadNC[];
  feedback_blocks?: NewPayloadFeedbackBlocks;
  pdi?: NewPayloadPDI | NewPayloadPDI[];
  historico?: NewPayloadHistorico[];

  // OLD format flat fields (backward compat)
  coordenador?: string;
  squad?: string;
  qa?: number;
  iepc?: number;
  pilares_qa?: NewPayloadPilar[];
  pilares_iepc?: NewPayloadPilar[];
  criterios?: NewPayloadCriterio[];
  evidencias?: unknown[];
  sintese_ia?: string;
  ncs?: NewPayloadNC[];
  analytics?: Record<string, unknown>;
  tendencias?: Record<string, unknown>;
  reincidencia?: Record<string, unknown>;
  auditor?: string;
  data_registro?: string;
  tipo_demanda?: string;
  protocolo?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────[...]

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Aceita feedback_blocks já normalizados (string) ou arrays do payload bruto */
function feedbackBlockText(block: string | string[] | undefined | null): string | null {
  if (block == null || block === '') return null;
  if (Array.isArray(block)) return block.map((v) => String(v)).join('\n');
  return String(block);
}

interface ParsedPdiItem {
  objetivo?: string;
  acao?: string;
  acao_desenvolvimento?: string;
  resultado_esperado?: string;
  prazo?: string;
  status?: string;
  acoes?: string[];
  metas?: string[];
}

function parsePdiList(rawPayload: AvaliacaoPayload, normalized?: NormalizedPayload): ParsedPdiItem[] {
  const rawPdi =
    rawPayload.pdi ??
    (normalized?.raw_payload as AvaliacaoPayload | undefined)?.pdi;

  if (Array.isArray(rawPdi)) {
    return rawPdi
      .map((p) => {
        const item = p as Record<string, unknown>;
        return {
          objetivo: String(item.objetivo || item.objetivo_desenvolvimento || '').trim(),
          acao: String(item.acao || item.acao_desenvolvimento || item.acao_esperada || '').trim(),
          acao_desenvolvimento: String(
            item.acao_desenvolvimento || item.acao || item.acao_esperada || ''
          ).trim(),
          resultado_esperado: String(item.resultado_esperado || item.resultadoEsperado || '').trim(),
          prazo: (item.prazo as string) || undefined,
          status: (item.status as string) || 'pendente',
        };
      })
      .filter((p) => p.objetivo || p.acao || p.acao_desenvolvimento || p.resultado_esperado);
  }

  if (rawPdi && typeof rawPdi === 'object') {
    const leg = rawPdi as NewPayloadPDI;
    const items: ParsedPdiItem[] = [];
    if (leg.acoes?.length) {
      leg.acoes.forEach((a, i) => {
        const acaoStr = typeof a === 'string' ? a : String(a);
        const meta = leg.metas?.[i];
        items.push({
          objetivo: acaoStr,
          acao: meta != null ? String(meta) : undefined,
          acao_desenvolvimento: meta != null ? String(meta) : undefined,
          acoes: leg.acoes,
          metas: leg.metas,
          status: leg.status || 'pendente',
        });
      });
    } else if (leg.metas?.length) {
      leg.metas.forEach((m) => items.push({ objetivo: String(m), status: leg.status || 'pendente' }));
    } else if (leg.objetivo || leg.acao) {
      items.push({
        objetivo: leg.objetivo,
        acao: leg.acao,
        acao_desenvolvimento: leg.acao,
        prazo: leg.prazo,
        status: leg.status || 'pendente',
        acoes: leg.acoes,
        metas: leg.metas,
      });
    }
    return items;
  }

  return [];
}

function parseHistoricoList(
  rawPayload: AvaliacaoPayload,
  normalized?: NormalizedPayload
): NewPayloadHistorico[] {
  const h = rawPayload.historico ?? normalized?.historico;
  return Array.isArray(h) ? h : [];
}

function formatNcDescricao(nc: {
  descricao?: string | null;
  severity?: string | null;
  severidade?: string | null;
  impacto_operacional?: string | null;
}): string | null {
  const base = nc.descricao?.trim() || '';
  const severity = nc.severity || nc.severidade;
  const impacto = nc.impacto_operacional?.trim();
  const extras: string[] = [];
  if (severity) extras.push(`Severidade: ${severity}`);
  if (impacto) extras.push(`Impacto operacional: ${impacto}`);
  if (!base && extras.length === 0) return null;
  if (extras.length === 0) return base;
  return base ? `${base}\n\n${extras.join('\n')}` : extras.join('\n');
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

// ─── Parse criterios array — fix corrupted {pilar:"0", criterio:"status"} ────

function parseCriteriosArray(criterios: NewPayloadCriterio[]): Record<string, { pts: number; max: number; evidencia?: string }> {
  const result: Record<string, { pts: number; max: number; evidencia?: string }> = {};
  if (!Array.isArray(criterios)) return result;

  criterios.forEach((c, i) => {
    const pilarNome = c.pilar_nome || '';
    const criterioNome = c.criterio_nome || c.nome || '';

    if (!criterioNome || criterioNome === 'status' || /^\d+$/.test(pilarNome)) return;
    if (['pilar', 'criterio', 'status', '0', '1', '2'].includes(criterioNome.toLowerCase())) return;

    const key = `criterio_${i}_${criterioNome.toLowerCase().replace(/\s+/g, '_').substring(0, 30)}`;
    const statusVal = c.status || (c.atende ? 'aderido' : 'nao_aderido');
    const pts = statusVal === 'aderido' ? 20 : statusVal === 'parcial' ? 10 : 0;

    result[key] = {
      pts,
      max: 20,
      evidencia: `${pilarNome ? pilarNome + ' — ' : ''}${statusVal}`,
    };
  });

  return result;
}

// ─── Token validation ───────────────────────────────────────────────────────[...]

async function validateToken(
  supabase: ReturnType<typeof createSupabaseClient>,
  authHeader: string | null
): Promise<{ valid: boolean; error?: string }> {
  console.log('[receber-avaliacao] Raw Authorization header:', authHeader);

  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header. Expected: Bearer <token>' };
  }

  const bearerMatch = authHeader.match(/^[Bb]earer\s+(.+)$/);
  if (!bearerMatch) {
    return { valid: false, error: 'Invalid Authorization header format. Expected: Bearer <token>' };
  }

  const token = bearerMatch[1].trim();
  console.log('[receber-avaliacao] Extracted token (first 8 chars):', token.substring(0, 8) + '...');

  let hashHex: string;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    hashHex = hashPayload(token);
  }

  const { data: tokenRow, error } = await supabase
    .from('integration_tokens')
    .select('id, is_active, expires_at, label')
    .eq('token_hash', hashHex)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !tokenRow) {
    return { valid: false, error: 'Invalid or inactive token' };
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  await supabase
    .from('integration_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return { valid: true };
}

// ─── Payload validation ──────────────────────────────────────────────────────

function validatePayload(body: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const p = body as Record<string, unknown>;

  const analistaVal = p.analista;
  if (!analistaVal) {
    errors.push('analista: required (string or object with nome)');
  } else if (typeof analistaVal === 'object') {
    const a = analistaVal as Record<string, unknown>;
    if (!a.nome && !a.nome_completo) errors.push('analista.nome: required');
  } else if (typeof analistaVal === 'string' && analistaVal.trim() === '') {
    errors.push('analista: required string');
  }

  const cicloVal = p.ciclo;
  if (!cicloVal) {
    errors.push('ciclo: required (string or object with nome)');
  } else if (typeof cicloVal === 'object') {
    const c = cicloVal as Record<string, unknown>;
    if (!c.nome) errors.push('ciclo.nome: required');
  } else if (typeof cicloVal === 'string' && cicloVal.trim() === '') {
    errors.push('ciclo: required string');
  }

  const scores = p.scores as Record<string, unknown> | undefined;
  const qa = scores?.qa ?? p.qa;
  const iepc = scores?.iepc ?? p.iepc;

  if (qa === undefined || qa === null) errors.push('qa (or scores.qa): required numeric score');
  if (iepc === undefined || iepc === null) errors.push('iepc (or scores.iepc): required numeric score');

  const analista = p.analista as Record<string, unknown> | string | undefined;
  let coordenador = typeof analista === 'object' ? (analista as Record<string, unknown>)?.coordenador : p.coordenador;
  if (!coordenador) errors.push('coordenador: required (in analista object or top-level)');

  let squad = typeof analista === 'object' ? (analista as Record<string, unknown>)?.equipe : p.squad;
  if (!squad) errors.push('squad/equipe: required');

  return { valid: errors.length === 0, errors };
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

async function checkDuplicate(
  supabase: ReturnType<typeof createSupabaseClient>,
  analista: string,
  ciclo: string,
  payloadHash: string
): Promise<boolean> {
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

// ─── Find or create analista record ──────────────────────────────────────────

async function findOrCreateAnalista(
  supabase: ReturnType<typeof createSupabaseClient>,
  nome: string,
  email: string | null,
  equipe: string,
  coordenador: string
): Promise<string | null> {
  try {
    if (email) {
      const { data: byEmail } = await supabase
        .from('analistas')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      if (byEmail) return byEmail.id;
    }

    const { data: byName } = await supabase
      .from('analistas')
      .select('id')
      .ilike('nome', nome.trim())
      .maybeSingle();
    if (byName) return byName.id;

    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      const { data: byPartial } = await supabase
        .from('analistas')
        .select('id')
        .ilike('nome', `%${parts[0]}%${parts[parts.length - 1]}%`)
        .maybeSingle();
      if (byPartial) return byPartial.id;
    }

    const { data: created } = await supabase
      .from('analistas')
      .insert({
        nome: nome.trim(),
        nome_completo: nome.trim(),
        email: email?.toLowerCase() || null,
        equipe: equipe || null,
        coordenador: coordenador || null,
        ativo: true,
      })
      .select('id')
      .single();

    return created?.id || null;
  } catch (err) {
    console.error('[receber-avaliacao] findOrCreateAnalista error:', err);
    return null;
  }
}

// ─── Main handler ────────────────────────────────────────────────────────[...]

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
    return NextResponse.json({ success: false, error: tokenResult.error }, { status: 401 });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
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

  const rawPayload = body as AvaliacaoPayload;
  const payloadHash = hashPayload(body);
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  // ── 4. SEÇÃO 2: Normalize payload usando adapter ──────────────────────────
  let endpointPayload: NormalizedEndpointPayload;
  try {
    endpointPayload = normalizePayloadForEndpoint(rawPayload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Normalization failed';
    console.error('[receber-avaliacao] normalizePayloadForEndpoint error:', msg);
    return NextResponse.json(
      { success: false, error: 'Payload normalization failed', details: [msg] },
      { status: 422 }
    );
  }

  // ── 4B. SEÇÃO 6: Validar compatibilidade ─────────────────────────────────
  const compatibility = auditPayloadCompatibility(endpointPayload);
  if (compatibility.issues.length > 0) {
    console.warn('[receber-avaliacao] Compatibility audit:', compatibility.issues);
  }
  logNormalizationWarnings(endpointPayload, ' [POST]');

  // ── 4C. Validar payload normalizado ──────────────────────────────────────
  const payloadValidation = validateEndpointPayload(endpointPayload);
  if (!payloadValidation.valid) {
    return NextResponse.json(
      { success: false, error: 'Normalized payload validation failed', details: payloadValidation.errors },
      { status: 422 }
    );
  }

  // For backward compatibility, maintain norm object structure
  const norm = {
    analistaNome: endpointPayload.analistaNome,
    analistaEmail: endpointPayload.analistaEmail,
    coordenador: endpointPayload.coordenador,
    squad: endpointPayload.squad,
    auditor: endpointPayload.auditor,
    cicloNome: endpointPayload.cicloNome,
    cicloInicio: endpointPayload.cicloInicio,
    cicloFim: endpointPayload.cicloFim,
    qaScore: endpointPayload.qaScore,
    iepcScore: endpointPayload.iepcScore,
    aderencia: endpointPayload.aderencia,
    pilaresQA: endpointPayload.pilaresQA,
    pilaresIEPC: endpointPayload.pilaresIEPC,
    atendimentosArray: endpointPayload.atendimentosArray,
    coaching: endpointPayload.coaching,
    ncs: endpointPayload.ncs,
    feedbackBlocks: endpointPayload.feedbackBlocks,
    pdiList: parsePdiList(rawPayload, endpointPayload.normalized),
    historico: parseHistoricoList(rawPayload, endpointPayload.normalized),
    sintese: null,
  };

  // ── 5. Create initial log entry ──────────────────────────────────────────
  const { data: logEntry } = await supabase
    .from('integration_request_logs')
    .insert({
      source: 'lovable',
      periodo: norm.cicloNome,
      analista: norm.analistaNome,
      squad: norm.squad,
      status: 'processing',
      payload_hash: payloadHash,
      ip_address: ipAddress,
      raw_payload: body as Record<string, unknown>,
    })
    .select('id')
    .single();
  logId = logEntry?.id ?? null;

  // ── 6. Duplicate detection ───────────────────────────────────────────────
  const isDuplicate = await checkDuplicate(supabase, norm.analistaNome, norm.cicloNome, payloadHash);
  if (isDuplicate) {
    if (logId) await supabase.from('integration_request_logs').update({ status: 'duplicate', duration_ms: Date.now() - startTime }).eq('id', logId);
    return NextResponse.json({ success: false, error: 'Duplicate request detected.' }, { status: 409 });
  }

  // ── 7. Upsert import_cycles ──────────────────────────────────────────────
  const { data: cycleData, error: cycleError } = await supabase
    .from('import_cycles')
    .upsert(
      {
        periodo: norm.cicloNome,
        file_name: `integration_lovable_${norm.cicloNome}`,
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
    return NextResponse.json({ success: false, error: `Failed to create/update cycle: ${cycleError.message}` }, { status: 500 });
  }
  const cycleId = cycleData?.id;

  // ── 8. Find or create analista ───────────────────────────────────────────
  const analistaId = await findOrCreateAnalista(supabase, norm.analistaNome, norm.analistaEmail, norm.squad, norm.coordenador);

  // ── 9. Build cycle_scores row — SEÇÃO 4: Adicionar campos opcionais ──────
  let criteriosMap: Record<string, unknown> = {};
  if (rawPayload.criterios && Array.isArray(rawPayload.criterios)) {
    criteriosMap = parseCriteriosArray(rawPayload.criterios as NewPayloadCriterio[]);
  }

  // ── 9B. SEÇÃO 3: Usar buildCycleScoresRow e pontosDeduzidosNC real ────────
  const scoreRow = {
    cycle_id: cycleId,
    periodo: norm.cicloNome,
    analista: norm.analistaNome,
    squad: norm.squad,
    coordenador: norm.coordenador,
    auditor: norm.auditor,
    data_registro: rawPayload.data_registro ?? new Date().toISOString().split('T')[0],
    nota_final_qa: norm.qaScore,
    iepc_total: norm.iepcScore,
    total_ncs: endpointPayload.totalNCs,
    // SEÇÃO 3: Usar pentosDeduzidosNC real em vez de sum manual
    pontos_deduzidos_nc: endpointPayload.pontosDeduzidosNC,
    p1: parseNum(norm.pilaresQA[0]?.nota),
    p2: parseNum(norm.pilaresQA[1]?.nota),
    p3: parseNum(norm.pilaresQA[2]?.nota),
    p4: parseNum(norm.pilaresQA[3]?.nota),
    p5: parseNum(norm.pilaresQA[4]?.nota),
    e1: parseNum(norm.pilaresIEPC[0]?.nota),
    e2: parseNum(norm.pilaresIEPC[1]?.nota),
    e3: parseNum(norm.pilaresIEPC[2]?.nota),
    e4: parseNum(norm.pilaresIEPC[3]?.nota),
    e5: parseNum(norm.pilaresIEPC[4]?.nota),
    tipo_demanda: rawPayload.tipo_demanda ?? null,
    qtd_atendimentos_avaliados: Array.isArray(rawPayload.atendimentos) ? rawPayload.atendimentos.length : (typeof rawPayload.atendimentos === 'number' ? rawPayload.atendimentos : 0),
    protocolo: rawPayload.protocolo ?? null,
    sintese_ia: null,
    tendencias: rawPayload.tendencias ?? null,
    reincidencia: rawPayload.reincidencia ?? null,
    criterios: Object.keys(criteriosMap).length > 0 ? criteriosMap : null,
    evidencias: rawPayload.evidencias ? JSON.parse(JSON.stringify(rawPayload.evidencias)) : null,
    analytics: endpointPayload.analytics ? JSON.parse(JSON.stringify(endpointPayload.analytics)) : null,
    // SEÇÃO 4: Novos campos opcionais para auditoria
    payload_version: endpointPayload.payloadVersion,
    payload_normalized: endpointPayload.normalized,
    source: 'integration',
    is_manual: false,
  };

  const { error: scoreError } = await supabase.from('cycle_scores').upsert(scoreRow, { onConflict: 'id' });
  if (scoreError) {
    const { error: insertError } = await supabase.from('cycle_scores').insert(scoreRow);
    if (insertError) {
      await updateLog(supabase, logId, 'error', `scores insert: ${insertError.message}`, startTime);
      return NextResponse.json({ success: false, error: `Failed to save evaluation score: ${insertError.message}` }, { status: 500 });
    }
  }

  // ── 10. Upsert feedback record ────────────────────────────────────────────
  const evolucaoTecnica = feedbackBlockText(norm.feedbackBlocks?.evolucao_tecnica);
  const evolucaoComportamental = feedbackBlockText(norm.feedbackBlocks?.evolucao_comportamental);
  const fechamentoCiclo = feedbackBlockText(norm.feedbackBlocks?.fechamento_ciclo);
  const atencaoEvolutiva = feedbackBlockText(norm.feedbackBlocks?.atencao_evolutiva);

  // SEÇÃO 7: Adicionar payload_version e payload_normalized em feedbackRow
  const feedbackRow = {
    analista_id: analistaId,
    ciclo: norm.cicloNome,
    periodo_inicio: norm.cicloInicio,
    periodo_fim: norm.cicloFim,
    coordenador: norm.coordenador,
    equipe: norm.squad,
    auditor: norm.auditor,
    qa_score: norm.qaScore,
    iepc_score: norm.iepcScore,
    aderencia_score: norm.aderencia,
    pilares_qa: norm.pilaresQA.map((p) => ({
      nome: p.nome,
      pontuacao: p.nota,
      max: p.maximo || 20,
      codigo: p.codigo || null,
    })),
    pilares_iepc: norm.pilaresIEPC.map((p) => ({
      nome: p.nome,
      pontuacao: p.nota,
      max: p.maximo || 20,
      codigo: p.codigo || null,
    })),
    resumo_ciclo: fechamentoCiclo,
    evolucao_tecnica: evolucaoTecnica,
    evolucao_comportamental: evolucaoComportamental,
    risco_operacional: atencaoEvolutiva,
    status: 'generated',
    origem: 'integration',
    payload_version: endpointPayload.payloadVersion,
    payload_normalized: endpointPayload.normalized,
    coaching_details: norm.coaching && norm.coaching.length > 0 ? norm.coaching : null,
    snapshot_json_completo: body as Record<string, unknown>,
  };

  let feedbackId: string | null = null;
  const { data: existingFb } = await supabase
    .from('feedbacks')
    .select('id')
    .eq('analista_id', analistaId || '')
    .eq('ciclo', norm.cicloNome)
    .maybeSingle();

  if (existingFb?.id) {
    feedbackId = existingFb.id;
    await supabase.from('feedbacks').update(feedbackRow).eq('id', feedbackId);
  } else {
    const { data: newFb, error: fbError } = await supabase
      .from('feedbacks')
      .insert(feedbackRow)
      .select('id')
      .single();
    if (fbError) {
      console.error('[receber-avaliacao] feedback insert error:', fbError.message);
    } else {
      feedbackId = newFb?.id || null;
    }
  }

  // ── 11. Save feedback_atendimentos ───────────────────────────────────────
  if (feedbackId && norm.atendimentosArray.length > 0) {
    await supabase.from('feedback_atendimentos').delete().eq('feedback_id', feedbackId);

    const atRows = norm.atendimentosArray.map((a) => {
      const criteriosRaw = Array.isArray(a.criterios) ? parseCriteriosArray(a.criterios) : null;

      return {
        feedback_id: feedbackId,
        protocolo: a.protocolo || a.sup || null,
        sup: a.sup || null,
        cliente: a.cliente || null,
        assunto: a.assunto || null,
        solucao: a.solucao || null,
        sintese: a.sintese || null,
        nota_qa: a.nota_qa != null ? parseNum(a.nota_qa) : null,
        duracao: a.duracao || null,
        ncs: Array.isArray(a.nao_conformidades) ? a.nao_conformidades : [],
        criterios_raw: criteriosRaw,
        classificacao: a.nota_qa != null
          ? (parseNum(a.nota_qa) >= 90 ? 'excelente' : parseNum(a.nota_qa) >= 75 ? 'bom' : 'regular')
          : null,
      };
    });

    const { error: atError } = await supabase.from('feedback_atendimentos').insert(atRows);
    if (atError) console.error('[receber-avaliacao] atendimentos insert error:', atError.message);
  }

  // ── 12. Save feedback_coaching ───────────────────────────────────────────
  if (feedbackId && norm.coaching.length > 0) {
    await supabase.from('feedback_coaching').delete().eq('feedback_id', feedbackId);
    const coachRows = norm.coaching
      .filter((c) => c.o_que_foi_dito)
      .map((c) => ({
        feedback_id: feedbackId,
        o_que_foi_dito: c.o_que_foi_dito || '',
        como_poderia_ser: c.como_poderia_ser || '',
        dica_de_ouro: c.dica_de_ouro || '',
      }));
    if (coachRows.length > 0) {
      const { error: coachError } = await supabase.from('feedback_coaching').insert(coachRows);
      if (coachError) console.error('[receber-avaliacao] coaching insert error:', coachError.message);
    }
  }

  // ── 13. Save feedback_pdi ────────────────────────────────────────────────
  if (feedbackId && norm.pdiList.length > 0) {
    await supabase.from('feedback_pdi').delete().eq('feedback_id', feedbackId);
    const pdiRows = norm.pdiList
      .filter((p) => p.objetivo || p.acao || p.acao_desenvolvimento || (p.acoes && p.acoes.length > 0))
      .map((p) => ({
        feedback_id: feedbackId,
        analista_id: analistaId,
        objetivo: p.objetivo || (p.acoes ? p.acoes[0] : '') || '',
        acao_desenvolvimento: p.acao_desenvolvimento || p.acao || (p.metas ? p.metas[0] : '') || null,
        prazo: p.prazo || null,
        progresso: 0,
        status: p.status || 'pendente',
      }));
    if (pdiRows.length > 0) {
      const { error: pdiError } = await supabase.from('feedback_pdi').insert(pdiRows);
      if (pdiError) console.error('[receber-avaliacao] pdi insert error:', pdiError.message);
    }
  }

  // ── 14. Save feedback_historico ──────────────────────────────────────────
  if (analistaId && norm.historico.length > 0) {
    for (const h of norm.historico) {
      if (!h.ciclo) continue;
      await supabase.from('feedback_historico').upsert(
        {
          analista_id: analistaId,
          ciclo: h.ciclo,
          qa_score: parseNum(h.qa),
          iepc_score: parseNum(h.iepc),
        },
        { onConflict: 'analista_id,ciclo' }
      );
    }
  }

  // ── 15. Save NC records — mesma lista flattenada usada em cycle_scores ─────
  if (endpointPayload.totalNCs > 0) {
    await supabase.from('nc_records').delete().eq('periodo', norm.cicloNome).eq('analista', norm.analistaNome).eq('source', 'integration');

    const ncRowsWithCycleId = endpointPayload.ncs.map((nc) => ({
      cycle_id: cycleId,
      periodo: norm.cicloNome,
      analista: nc.analista || norm.analistaNome,
      squad: nc.squad || norm.squad,
      coordenador: nc.coordenador || norm.coordenador,
      auditor: norm.auditor,
      tipo_nc: nc.tipo_nc || nc.tipo || 'Não Especificado',
      descricao: formatNcDescricao(nc),
      pontos_deduzidos: parseNum(nc.pontos_deduzidos),
      protocolo_referencia: nc.protocolo_referencia || nc.protocolo || null,
      source: 'integration',
    }));

    const { error: ncError } = await supabase.from('nc_records').insert(ncRowsWithCycleId);
    if (ncError) console.error('[receber-avaliacao] NC insert error:', ncError.message);
  }

  // ── 16. Save old-format PDI records ─────────────────────────────────────
  const oldPdi = rawPayload.pdi as NewPayloadPDI | undefined;
  if (!Array.isArray(rawPayload.pdi) && oldPdi && (oldPdi.acoes || oldPdi.metas)) {
    const pdiRow = {
      cycle_id: cycleId,
      periodo: norm.cicloNome,
      analista: norm.analistaNome,
      squad: norm.squad,
      coordenador: norm.coordenador,
      status_pdi: 'Em andamento',
      acoes: oldPdi.acoes ?? [],
      metas: oldPdi.metas ?? [],
      nc_reincidentes: endpointPayload.ncs.filter((nc) => nc.reincidente).map((nc) => nc.tipo_nc || nc.tipo || ''),
      qa_score: norm.qaScore,
      iepc_score: norm.iepcScore,
      sintese_ia: null,
      source: 'integration',
      updated_at: new Date().toISOString(),
    };
    await supabase.from('pdi_records').upsert(pdiRow, { onConflict: 'analista,periodo' });
  }

  // ── 17. Update cycle_summaries ───────────────────────────────────────────
  try {
    const { data: allScores } = await supabase
      .from('cycle_scores')
      .select('nota_final_qa, iepc_total, total_ncs')
      .eq('periodo', norm.cicloNome);

    if (allScores && allScores.length > 0) {
      const qaMedia = allScores.reduce((s, r) => s + parseNum(r.nota_final_qa), 0) / allScores.length;
      const iepcMedia = allScores.reduce((s, r) => s + parseNum(r.iepc_total), 0) / allScores.length;
      const totalNCs = allScores.reduce((s, r) => s + (r.total_ncs ?? 0), 0);
      await supabase.from('cycle_summaries').upsert(
        {
          periodo: norm.cicloNome,
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

  // ── 18. Mark log as success ──────────────────────────────────────────────
  await updateLog(supabase, logId, 'success', null, startTime);

  return NextResponse.json(
    {
      success: true,
      message: 'Avaliação recebida e persistida com sucesso.',
      data: {
        ciclo: norm.cicloNome,
        analista: norm.analistaNome,
        squad: norm.squad,
        analista_id: analistaId,
        feedback_id: feedbackId,
        cycle_id: cycleId,
        log_id: logId,
        qa: norm.qaScore,
        iepc: norm.iepcScore,
        ncs_saved: endpointPayload.totalNCs,
        pontos_deduzidos: endpointPayload.pontosDeduzidosNC,
        atendimentos_saved: norm.atendimentosArray.length,
        coaching_saved: norm.coaching.length,
        pdi_saved: norm.pdiList.length,
        historico_saved: norm.historico.length,
        payload_version: endpointPayload.payloadVersion,
        payload_format: endpointPayload.hasNewFormat ? 'new' : endpointPayload.hasLegacyFormat ? 'legacy' : 'unknown',
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
    .update({ status, error_message: errorMessage, duration_ms: Date.now() - startTime })
    .eq('id', logId);
}

// ─── GET: health check ──────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: 'POST /api/receber-avaliacao',
    version: '3.0.0-adapter',
    description: 'Qualivisão Integration API — with payload normalization adapter (v2_lovable + v1_legacy)',
    required_headers: { Authorization: 'Bearer <token>', 'Content-Type': 'application/json' },
    payload_contract: {
      metadata: '{ origem, versao, gerado_em, avaliacao_id }',
      analista: '{ nome, nome_completo, email, equipe, coordenador, auditor }',
      ciclo: '{ nome, data_inicio, data_fim, status }',
      scores: '{ qa, iepc, aderencia }',
      qa_pilares: '[{ codigo, nome, nota, maximo }]',
      iepc_pilares: '[{ codigo, nome, nota, maximo }]',
      atendimentos: '[{ protocolo, sup, cliente, data, duracao, nota_qa, assunto, solucao, sintese, criterios[], nao_conformidades[] }]',
      coaching: '[{ o_que_foi_dito, como_poderia_ser, dica_de_ouro, categoria }]',
      nao_conformidades: '[{ protocolo, tipo_nc, descricao, severity, pontos, aplicar_pontos }]',
      feedback_blocks: '{ evolucao_tecnica[], evolucao_comportamental[], atencao_evolutiva[], fechamento_ciclo }',
      pdi: '[{ objetivo, acao, prazo, status }]',
      historico: '[{ ciclo, qa, iepc }]',
    },
    features: {
      payload_normalization: 'v1_legacy + v2_lovable',
      penalty_calculation: 'variable (respects aplicar_pontos)',
      compatibility_audit: 'enabled',
      payload_tracking: 'payload_version + payload_normalized stored',
      backward_compat: 'fully maintained',
    },
    backward_compat: 'Old flat format (analista string, ciclo string, qa/iepc numbers) still supported',
  });
}
