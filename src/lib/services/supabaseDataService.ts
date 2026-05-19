'use client';

import { createClient } from '@/lib/supabase/client';
import type { CycleScoreRow, NCRow, ElogioRow } from './dataService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient();
}

// ─── Import Cycle Data to Supabase ───────────────────────────────────────────

export async function importCycleDataToSupabase(
  scores: CycleScoreRow[],
  ncs: NCRow[],
  elogios: ElogioRow[],
  periodo: string,
  fileName: string
): Promise<{ success: boolean; error?: string; cycleId?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado.' };

  const startTime = Date.now();
  console.log(`[IMPORT] Iniciando importação para período: ${periodo}, arquivo: ${fileName}`);
  console.log(`[IMPORT] Registros: ${scores.length} scores, ${ncs.length} NCs, ${elogios.length} elogios`);

  try {
    // ── Step 1: Upsert import_cycles record ──────────────────────────────────
    // Use upsert directly — avoids race conditions and FK issues
    const cyclePayload = {
      periodo,
      file_name: fileName,
      record_count: scores.length + ncs.length + elogios.length,
      is_current: true,
      is_closed: false,
      status: 'em_andamento',
      import_status: 'completed',
      data_type: 'mixed',
      updated_at: new Date().toISOString(),
    };

    // Try upsert first
    const { data: upsertedCycle, error: upsertError } = await supabase
      .from('import_cycles')
      .upsert(cyclePayload, { onConflict: 'periodo' })
      .select('id')
      .maybeSingle();

    let cycleId: string | undefined = upsertedCycle?.id;

    if (upsertError) {
      console.error('[IMPORT] Upsert import_cycles error:', upsertError.message, upsertError.code);
      // Fallback: try to get existing
      const { data: existing } = await supabase
        .from('import_cycles')
        .select('id')
        .eq('periodo', periodo)
        .maybeSingle();
      cycleId = existing?.id;

      if (!cycleId) {
        // Last resort: plain insert without onConflict
        const { data: inserted, error: insertErr } = await supabase
          .from('import_cycles')
          .insert(cyclePayload)
          .select('id')
          .maybeSingle();
        if (insertErr) {
          console.error('[IMPORT] Insert import_cycles error:', insertErr.message);
          return { success: false, error: `Falha ao criar ciclo: ${insertErr.message}` };
        }
        cycleId = inserted?.id;
      }
    }

    if (!cycleId) {
      // Final lookup
      const { data: finalLookup } = await supabase
        .from('import_cycles')
        .select('id')
        .eq('periodo', periodo)
        .maybeSingle();
      cycleId = finalLookup?.id;
    }

    if (!cycleId) {
      console.error('[IMPORT] Não foi possível obter cycleId para período:', periodo);
      return { success: false, error: 'Não foi possível criar ou localizar o registro do ciclo.' };
    }

    console.log(`[IMPORT] cycleId obtido: ${cycleId}`);

    // ── Step 2: Delete existing data for this period ─────────────────────────
    console.log(`[IMPORT] Limpando dados anteriores do período: ${periodo}`);
    await Promise.all([
      supabase.from('cycle_scores').delete().eq('periodo', periodo),
      supabase.from('nc_records').delete().eq('periodo', periodo),
      supabase.from('elogios').delete().eq('periodo', periodo),
    ]);

    // ── Step 3: Insert scores ─────────────────────────────────────────────────
    let scoresInserted = 0;
    if (scores.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < scores.length; i += BATCH_SIZE) {
        const batch = scores.slice(i, i + BATCH_SIZE);
        const { error: scoresError, data: scoresData } = await supabase
          .from('cycle_scores')
          .insert(
            batch.map((s) => ({
              cycle_id: cycleId,
              periodo: s.periodo || periodo,
              data_registro: s.data_registro || null,
              analista: s.analista,
              squad: s.squad,
              coordenador: s.coordenador,
              auditor: s.auditor || null,
              nota_final_qa: s.nota_final_qa ?? 0,
              iepc_total: s.iepc_total ?? 0,
              total_ncs: s.total_ncs ?? 0,
              pontos_deduzidos_nc: s.pontos_deduzidos_nc ?? 0,
              p1: s.p1 ?? 0,
              p2: s.p2 ?? 0,
              p3: s.p3 ?? 0,
              p4: s.p4 ?? 0,
              p5: s.p5 ?? 0,
              e1: s.e1 ?? 0,
              e2: s.e2 ?? 0,
              e3: s.e3 ?? 0,
              e4: s.e4 ?? 0,
              e5: s.e5 ?? 0,
              tipo_demanda: s.tipo_demanda || null,
              qtd_atendimentos_avaliados: s.qtd_atendimentos_avaliados ?? 0,
              source: 'import',
            }))
          )
          .select('id');

        if (scoresError) {
          console.error(`[IMPORT] Erro ao inserir scores (batch ${i}):`, scoresError.message, scoresError.code, scoresError.details);
        } else {
          scoresInserted += (scoresData?.length || 0);
        }
      }
      console.log(`[IMPORT] Scores inseridos: ${scoresInserted}/${scores.length}`);
    }

    // ── Step 4: Insert NCs ────────────────────────────────────────────────────
    let ncsInserted = 0;
    if (ncs.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < ncs.length; i += BATCH_SIZE) {
        const batch = ncs.slice(i, i + BATCH_SIZE);
        const { error: ncsError, data: ncsData } = await supabase
          .from('nc_records')
          .insert(
            batch.map((n) => ({
              cycle_id: cycleId,
              periodo: n.periodo || periodo,
              data_registro: n.data_registro || null,
              analista: n.analista,
              squad: n.squad,
              coordenador: n.coordenador,
              auditor: n.auditor || null,
              tipo_nc: n.tipo_nc,
              descricao: n.descricao || null,
              pontos_deduzidos: n.pontos_deduzidos ?? -20,
              protocolo_referencia: n.protocolo_referencia || null,
              avaliacao_id: n.avaliacao_id || null,
            }))
          )
          .select('id');

        if (ncsError) {
          console.error(`[IMPORT] Erro ao inserir NCs (batch ${i}):`, ncsError.message, ncsError.code);
        } else {
          ncsInserted += (ncsData?.length || 0);
        }
      }
      console.log(`[IMPORT] NCs inseridas: ${ncsInserted}/${ncs.length}`);
    }

    // ── Step 5: Insert elogios ────────────────────────────────────────────────
    let elogiosInserted = 0;
    if (elogios.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < elogios.length; i += BATCH_SIZE) {
        const batch = elogios.slice(i, i + BATCH_SIZE);
        const { error: elogiosError, data: elogiosData } = await supabase
          .from('elogios')
          .insert(
            batch.map((e) => ({
              cycle_id: cycleId,
              periodo: e.periodo || periodo,
              colaborador: e.colaborador,
              squad: e.squad || '',
              cliente: e.cliente || null,
              protocolo: e.protocolo || null,
              elogio: e.elogio,
              destaque: false,
            }))
          )
          .select('id');

        if (elogiosError) {
          console.error(`[IMPORT] Erro ao inserir elogios (batch ${i}):`, elogiosError.message, elogiosError.code);
        } else {
          elogiosInserted += (elogiosData?.length || 0);
        }
      }
      console.log(`[IMPORT] Elogios inseridos: ${elogiosInserted}/${elogios.length}`);
    }

    // ── Step 6: Refresh cycle summary ────────────────────────────────────────
    try {
      const { error: summaryError } = await supabase.rpc('refresh_cycle_summary', { p_periodo: periodo });
      if (summaryError) {
        console.warn('[IMPORT] RPC refresh_cycle_summary falhou, fazendo upsert manual:', summaryError.message);
        // Manual fallback
        const qaMedia = scores.length > 0
          ? scores.reduce((s, r) => s + (r.nota_final_qa ?? 0), 0) / scores.length
          : 0;
        const iepcMedia = scores.length > 0
          ? scores.reduce((s, r) => s + (r.iepc_total ?? 0), 0) / scores.length
          : 0;
        await supabase.from('cycle_summaries').upsert(
          {
            periodo,
            total_analistas: scores.length,
            qa_media: Math.round(qaMedia * 100) / 100,
            iepc_media: Math.round(iepcMedia * 100) / 100,
            total_ncs: ncs.length,
            total_elogios: elogios.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'periodo' }
        );
      } else {
        console.log('[IMPORT] cycle_summaries atualizado via RPC');
      }
    } catch (summaryErr: any) {
      console.warn('[IMPORT] Erro ao atualizar summary (não crítico):', summaryErr.message);
    }

    const duration = Date.now() - startTime;
    console.log(`[IMPORT] ✅ Importação concluída em ${duration}ms — cycleId: ${cycleId}`);
    console.log(`[IMPORT] Resultado: ${scoresInserted} scores, ${ncsInserted} NCs, ${elogiosInserted} elogios`);

    return { success: true, cycleId };
  } catch (err: any) {
    console.error('[IMPORT] ❌ Erro crítico na importação:', err.message, err);
    return { success: false, error: err.message };
  }
}

// ─── Fetch from Supabase ──────────────────────────────────────────────────────

export async function fetchCycleScoresFromSupabase(periodo?: string): Promise<CycleScoreRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('cycle_scores').select('*');
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query.order('nota_final_qa', { ascending: false });
  if (error) {
    console.error('[FETCH] fetchCycleScores error:', error.message, error.code);
    return [];
  }
  console.log(`[FETCH] cycle_scores: ${data?.length || 0} registros${periodo ? ` para ${periodo}` : ''}`);
  return (data || []) as CycleScoreRow[];
}

export async function fetchNCRecordsFromSupabase(periodo?: string): Promise<NCRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('nc_records').select('*');
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query;
  if (error) {
    console.error('[FETCH] fetchNCRecords error:', error.message, error.code);
    return [];
  }
  return (data || []) as NCRow[];
}

export async function fetchElogiosFromSupabase(periodo?: string): Promise<ElogioRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('elogios').select('*');
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query;
  if (error) {
    console.error('[FETCH] fetchElogios error:', error.message, error.code);
    return [];
  }
  return (data || []) as ElogioRow[];
}

export async function fetchAllPeriodosFromSupabase(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const [cyclesRes, scoresRes] = await Promise.all([
    supabase.from('import_cycles').select('periodo').order('periodo', { ascending: false }),
    supabase.from('cycle_scores').select('periodo'),
  ]);

  if (cyclesRes.error) console.error('[FETCH] fetchAllPeriodos (cycles) error:', cyclesRes.error.message);
  if (scoresRes.error) console.error('[FETCH] fetchAllPeriodos (scores) error:', scoresRes.error.message);

  const fromCycles = (cyclesRes.data || []).map((r: any) => r.periodo as string);
  const fromScores = (scoresRes.data || []).map((r: any) => r.periodo as string);

  const all = [...new Set([...fromCycles, ...fromScores])].filter(Boolean);
  all.sort((a, b) => b.localeCompare(a));
  console.log(`[FETCH] Períodos disponíveis: ${all.join(', ') || 'nenhum'}`);
  return all;
}

// ─── Check if a cycle is closed in Supabase ──────────────────────────────────

export async function isCycleClosedInSupabase(periodo: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('import_cycles')
    .select('is_closed')
    .eq('periodo', periodo)
    .maybeSingle();

  if (error || !data) return false;
  return !!data.is_closed;
}

export async function toggleElogioDestaqueInSupabase(id: string, destaque: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('elogios')
    .update({ destaque })
    .eq('id', id);

  if (error) console.error('[SUPABASE] toggleElogioDestaque error:', error.message);
}

export async function deletePeriodDataFromSupabase(periodo: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('cycle_scores').delete().eq('periodo', periodo);
  await supabase.from('nc_records').delete().eq('periodo', periodo);
  await supabase.from('elogios').delete().eq('periodo', periodo);
  await supabase.from('pdi_records').delete().eq('periodo', periodo);
  await supabase.from('cycle_summaries').delete().eq('periodo', periodo);
  await supabase.from('import_cycles').delete().eq('periodo', periodo);
}

export async function clearAllDataFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado.' };

  try {
    await supabase.from('cycle_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('nc_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('elogios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pdi_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('import_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('import_cycles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cycle_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
