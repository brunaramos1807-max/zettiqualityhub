'use client';

import { createClient } from '@/lib/supabase/client';
import type { CycleScoreRow, NCRow, ElogioRow } from './dataService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase() {
  return createClient();
}

// ─── Structured Import Logger ─────────────────────────────────────────────────

interface ImportLogEntry {
  periodo: string;
  file_name?: string;
  step: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: Record<string, any>;
  cycle_id?: string;
  rows_affected?: number;
  actor_email?: string;
}

async function writeImportLog(entry: ImportLogEntry): Promise<void> {
  // Always log to console
  const prefix = `[IMPORT:${entry.step.toUpperCase()}]`;
  if (entry.level === 'error') {
    console.error(prefix, entry.message, entry.details || '');
  } else if (entry.level === 'warn') {
    console.warn(prefix, entry.message, entry.details || '');
  } else {
    console.log(prefix, entry.message, entry.details || '');
  }

  // Persist to Supabase import_logs (non-blocking)
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('import_logs').insert({
      periodo: entry.periodo,
      file_name: entry.file_name || null,
      step: entry.step,
      level: entry.level,
      message: entry.message,
      details: entry.details || null,
      cycle_id: entry.cycle_id || null,
      rows_affected: entry.rows_affected || 0,
      actor_email: entry.actor_email || null,
    });
  } catch {
    // Log persistence is non-critical — never block import
  }
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

  await writeImportLog({
    periodo, file_name: fileName, step: 'start', level: 'info',
    message: `Iniciando importação: ${scores.length} scores, ${ncs.length} NCs, ${elogios.length} elogios`,
    details: { scores: scores.length, ncs: ncs.length, elogios: elogios.length, fileName },
  });

  try {
    // ── Step 1: Check if cycle is closed — BLOCK if closed ───────────────────
    const { data: existingCycle } = await supabase
      .from('import_cycles')
      .select('id, is_closed, status')
      .eq('periodo', periodo)
      .maybeSingle();

    if (existingCycle?.is_closed === true) {
      const msg = `Ciclo ${periodo} está FECHADO. Importação bloqueada. Somente um administrador pode reabrir.`;
      await writeImportLog({ periodo, file_name: fileName, step: 'cycle_check', level: 'error', message: msg });
      return { success: false, error: msg };
    }

    await writeImportLog({
      periodo, file_name: fileName, step: 'cycle_check', level: 'info',
      message: existingCycle ? `Ciclo existente encontrado: ${existingCycle.id}` : 'Nenhum ciclo existente — será criado',
      details: { existingCycle },
    });

    // ── Step 2: Upsert import_cycles record ──────────────────────────────────
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

    let cycleId: string | undefined = existingCycle?.id;

    if (!cycleId) {
      // Insert new cycle
      const { data: inserted, error: insertErr } = await supabase
        .from('import_cycles')
        .insert(cyclePayload)
        .select('id')
        .maybeSingle();

      if (insertErr) {
        await writeImportLog({
          periodo, file_name: fileName, step: 'cycle_upsert', level: 'warn',
          message: `Insert falhou, tentando upsert: ${insertErr.message}`,
          details: { code: insertErr.code, hint: insertErr.hint },
        });
        // Fallback: upsert
        const { data: upserted, error: upsertErr } = await supabase
          .from('import_cycles')
          .upsert(cyclePayload, { onConflict: 'periodo' })
          .select('id')
          .maybeSingle();

        if (upsertErr) {
          await writeImportLog({
            periodo, file_name: fileName, step: 'cycle_upsert', level: 'error',
            message: `Upsert import_cycles falhou: ${upsertErr.message}`,
            details: { code: upsertErr.code },
          });
          // Last resort: fetch existing
          const { data: fetched } = await supabase
            .from('import_cycles').select('id').eq('periodo', periodo).maybeSingle();
          cycleId = fetched?.id;
        } else {
          cycleId = upserted?.id;
        }
      } else {
        cycleId = inserted?.id;
      }
    } else {
      // Update existing cycle record count
      await supabase
        .from('import_cycles')
        .update({ record_count: scores.length + ncs.length + elogios.length, updated_at: new Date().toISOString() })
        .eq('id', cycleId);
    }

    if (!cycleId) {
      const msg = `Não foi possível obter cycleId para período: ${periodo}`;
      await writeImportLog({ periodo, file_name: fileName, step: 'cycle_upsert', level: 'error', message: msg });
      return { success: false, error: msg };
    }

    await writeImportLog({
      periodo, file_name: fileName, step: 'cycle_upsert', level: 'success',
      message: `cycleId obtido: ${cycleId}`,
      cycle_id: cycleId,
    });

    // ── Step 3: UPSERT scores — NO DELETE, true upsert on (periodo, analista, squad) ─
    let scoresInserted = 0;
    let scoresErrors = 0;
    if (scores.length > 0) {
      await writeImportLog({
        periodo, file_name: fileName, step: 'scores_start', level: 'info',
        message: `Iniciando upsert de ${scores.length} scores`,
        cycle_id: cycleId,
      });

      const BATCH_SIZE = 50;
      for (let i = 0; i < scores.length; i += BATCH_SIZE) {
        const batch = scores.slice(i, i + BATCH_SIZE);
        const payload = batch.map((s) => ({
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
        }));

        const { error: scoresError, data: scoresData } = await supabase
          .from('cycle_scores')
          .upsert(payload, { onConflict: 'periodo,analista,squad' })
          .select('id');

        if (scoresError) {
          scoresErrors++;
          await writeImportLog({
            periodo, file_name: fileName, step: 'scores_upsert', level: 'error',
            message: `Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}: ${scoresError.message}`,
            details: { code: scoresError.code, hint: scoresError.hint, batch_start: i, batch_size: batch.length },
            cycle_id: cycleId,
          });
          // Fallback: insert ignoring conflicts one by one
          for (const row of payload) {
            try {
              const { error: singleErr } = await supabase.from('cycle_scores').upsert(row, { onConflict: 'periodo,analista,squad' });
              if (!singleErr) scoresInserted++;
              else {
                await writeImportLog({
                  periodo, file_name: fileName, step: 'scores_fallback', level: 'warn',
                  message: `Fallback falhou para ${row.analista}/${row.squad}: ${singleErr.message}`,
                  cycle_id: cycleId,
                });
              }
            } catch { /* continue */ }
          }
        } else {
          scoresInserted += (scoresData?.length || 0);
        }
      }

      await writeImportLog({
        periodo, file_name: fileName, step: 'scores_done', level: scoresErrors > 0 ? 'warn' : 'success',
        message: `Scores: ${scoresInserted}/${scores.length} upserted, ${scoresErrors} batches com erro`,
        cycle_id: cycleId, rows_affected: scoresInserted,
      });
    }

    // ── Step 4: UPSERT NCs — NO DELETE, use INSERT (nc_records has no unique constraint) ─
    let ncsInserted = 0;
    let ncsErrors = 0;
    if (ncs.length > 0) {
      await writeImportLog({
        periodo, file_name: fileName, step: 'ncs_start', level: 'info',
        message: `Iniciando inserção de ${ncs.length} NCs`,
        cycle_id: cycleId,
      });

      const BATCH_SIZE = 50;
      for (let i = 0; i < ncs.length; i += BATCH_SIZE) {
        const batch = ncs.slice(i, i + BATCH_SIZE);
        const payload = batch.map((n) => ({
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
          source: 'import',
        }));

        const { error: ncsError, data: ncsData } = await supabase
          .from('nc_records')
          .insert(payload)
          .select('id');

        if (ncsError) {
          ncsErrors++;
          await writeImportLog({
            periodo, file_name: fileName, step: 'ncs_insert', level: 'error',
            message: `Erro no batch NC ${Math.floor(i / BATCH_SIZE) + 1}: ${ncsError.message}`,
            details: { code: ncsError.code, hint: ncsError.hint, batch_start: i, batch_size: batch.length },
            cycle_id: cycleId,
          });
          // Fallback: insert each row individually to maximize success
          for (const row of payload) {
            try {
              const { error: singleErr } = await supabase.from('nc_records').insert(row);
              if (!singleErr) ncsInserted++;
              else {
                await writeImportLog({
                  periodo, file_name: fileName, step: 'ncs_fallback', level: 'warn',
                  message: `Fallback falhou para ${row.analista}/${row.tipo_nc}: ${singleErr.message}`,
                  cycle_id: cycleId,
                });
              }
            } catch { /* continue */ }
          }
        } else {
          ncsInserted += (ncsData?.length || batch.length);
        }
      }

      await writeImportLog({
        periodo, file_name: fileName, step: 'ncs_done', level: ncsErrors > 0 ? 'warn' : 'success',
        message: `NCs: ${ncsInserted}/${ncs.length} inseridas, ${ncsErrors} batches com erro`,
        cycle_id: cycleId, rows_affected: ncsInserted,
      });
    }

    // ── Step 5: UPSERT elogios — NO DELETE, true upsert on (periodo, colaborador, protocolo) ─
    let elogiosInserted = 0;
    let elogiosErrors = 0;
    if (elogios.length > 0) {
      await writeImportLog({
        periodo, file_name: fileName, step: 'elogios_start', level: 'info',
        message: `Iniciando upsert de ${elogios.length} elogios`,
        cycle_id: cycleId,
      });

      const BATCH_SIZE = 50;
      for (let i = 0; i < elogios.length; i += BATCH_SIZE) {
        const batch = elogios.slice(i, i + BATCH_SIZE);
        const payload = batch.map((e) => ({
          cycle_id: cycleId,
          periodo: e.periodo || periodo,
          colaborador: e.colaborador,
          squad: e.squad || '',
          cliente: e.cliente || null,
          protocolo: e.protocolo || null,
          elogio: e.elogio,
          destaque: false,
        }));

        const { error: elogiosError, data: elogiosData } = await supabase
          .from('elogios')
          .upsert(payload, { ignoreDuplicates: true })
          .select('id');

        if (elogiosError) {
          elogiosErrors++;
          await writeImportLog({
            periodo, file_name: fileName, step: 'elogios_upsert', level: 'error',
            message: `Erro no batch elogios ${Math.floor(i / BATCH_SIZE) + 1}: ${elogiosError.message}`,
            details: { code: elogiosError.code },
            cycle_id: cycleId,
          });
          for (const row of payload) {
            try {
              const { error: singleErr } = await supabase.from('elogios').insert(row);
              if (!singleErr) elogiosInserted++;
            } catch { /* continue */ }
          }
        } else {
          elogiosInserted += (elogiosData?.length || 0);
        }
      }

      await writeImportLog({
        periodo, file_name: fileName, step: 'elogios_done', level: elogiosErrors > 0 ? 'warn' : 'success',
        message: `Elogios: ${elogiosInserted}/${elogios.length} inseridos, ${elogiosErrors} batches com erro`,
        cycle_id: cycleId, rows_affected: elogiosInserted,
      });
    }

    // ── Step 6: Refresh cycle summary ────────────────────────────────────────
    try {
      const { error: summaryError } = await supabase.rpc('refresh_cycle_summary', { p_periodo: periodo });
      if (summaryError) {
        await writeImportLog({
          periodo, file_name: fileName, step: 'summary_refresh', level: 'warn',
          message: `RPC refresh_cycle_summary falhou, fazendo upsert manual: ${summaryError.message}`,
          cycle_id: cycleId,
        });
        // Manual fallback
        const qaMedia = scores.length > 0
          ? scores.reduce((s, r) => s + (r.nota_final_qa ?? 0), 0) / scores.length
          : 0;
        const iepcMedia = scores.length > 0
          ? scores.reduce((s, r) => s + (r.iepc_total ?? 0), 0) / scores.length
          : 0;
        const { error: manualSummaryErr } = await supabase.from('cycle_summaries').upsert(
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
        if (manualSummaryErr) {
          await writeImportLog({
            periodo, file_name: fileName, step: 'summary_refresh', level: 'error',
            message: `Upsert manual cycle_summaries falhou: ${manualSummaryErr.message}`,
            cycle_id: cycleId,
          });
        }
      } else {
        await writeImportLog({
          periodo, file_name: fileName, step: 'summary_refresh', level: 'success',
          message: 'cycle_summaries atualizado via RPC',
          cycle_id: cycleId,
        });
      }
    } catch (summaryErr: any) {
      await writeImportLog({
        periodo, file_name: fileName, step: 'summary_refresh', level: 'warn',
        message: `Erro ao atualizar summary (não crítico): ${summaryErr.message}`,
        cycle_id: cycleId,
      });
    }

    const duration = Date.now() - startTime;
    await writeImportLog({
      periodo, file_name: fileName, step: 'complete', level: 'success',
      message: `✅ Importação concluída em ${duration}ms — scores: ${scoresInserted}, NCs: ${ncsInserted}, elogios: ${elogiosInserted}`,
      cycle_id: cycleId,
      rows_affected: scoresInserted + ncsInserted + elogiosInserted,
    });

    return { success: true, cycleId };
  } catch (err: any) {
    await writeImportLog({
      periodo, file_name: fileName, step: 'critical_error', level: 'error',
      message: `❌ Erro crítico na importação: ${err.message}`,
      details: { stack: err.stack?.substring(0, 500) },
    });
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

// ─── Fetch import logs ────────────────────────────────────────────────────────

export async function fetchImportLogs(periodo?: string, limit = 100): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('import_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query;
  if (error) {
    console.error('[FETCH] fetchImportLogs error:', error.message);
    return [];
  }
  return data || [];
}

// ─── App Settings: Active Cycle ───────────────────────────────────────────────

export async function getActiveCycle(): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return '';
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'active_cycle')
      .maybeSingle();
    return data?.value || '';
  } catch {
    return '';
  }
}

export async function setActiveCycle(periodo: string, actorEmail?: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado.' };
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: 'active_cycle', value: periodo, updated_at: new Date().toISOString(), updated_by: actorEmail || null },
        { onConflict: 'key' }
      );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Create a new cycle (without imported data) ───────────────────────────────

export async function createNewCycle(
  periodo: string,
  periodoInicio?: string,
  periodoFim?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado.' };
  try {
    const metadata: Record<string, string> = {};
    if (periodoInicio) metadata.periodo_inicio = periodoInicio;
    if (periodoFim) metadata.periodo_fim = periodoFim;

    const { error } = await supabase
      .from('import_cycles')
      .upsert(
        {
          periodo,
          file_name: `Ciclo ${periodo}${periodoInicio && periodoFim ? ` - Período ${periodoInicio} a ${periodoFim}` : ''}`,
          record_count: 0,
          is_current: true,
          is_closed: false,
          status: 'em_andamento',
          import_status: 'pending',
          data_type: 'mixed',
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'periodo' }
      );
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
