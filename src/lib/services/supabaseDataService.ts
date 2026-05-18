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

  try {
    // Upsert import cycle record
    const { data: cycleData, error: cycleError } = await supabase
      .from('import_cycles')
      .upsert(
        {
          periodo,
          file_name: fileName,
          record_count: scores.length + ncs.length + elogios.length,
        },
        { onConflict: 'periodo' }
      )
      .select('id')
      .single();

    if (cycleError) {
      console.error('Cycle upsert error:', cycleError.message);
      return { success: false, error: cycleError.message };
    }

    const cycleId = cycleData?.id;

    // Delete existing data for this period before re-inserting
    await supabase.from('cycle_scores').delete().eq('periodo', periodo);
    await supabase.from('nc_records').delete().eq('periodo', periodo);
    await supabase.from('elogios').delete().eq('periodo', periodo);

    // Insert scores
    if (scores.length > 0) {
      const { error: scoresError } = await supabase.from('cycle_scores').insert(
        scores.map((s) => ({ ...s, cycle_id: cycleId }))
      );
      if (scoresError) console.error('Scores insert error:', scoresError.message);
    }

    // Insert NCs
    if (ncs.length > 0) {
      const { error: ncsError } = await supabase.from('nc_records').insert(
        ncs.map((n) => ({ ...n, cycle_id: cycleId }))
      );
      if (ncsError) console.error('NCs insert error:', ncsError.message);
    }

    // Insert elogios
    if (elogios.length > 0) {
      const { error: elogiosError } = await supabase.from('elogios').insert(
        elogios.map((e) => ({ ...e, cycle_id: cycleId, destaque: false }))
      );
      if (elogiosError) console.error('Elogios insert error:', elogiosError.message);
    }

    return { success: true, cycleId };
  } catch (err: any) {
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
    console.error('fetchCycleScores error:', error.message);
    return [];
  }
  return (data || []) as CycleScoreRow[];
}

export async function fetchNCRecordsFromSupabase(periodo?: string): Promise<NCRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase.from('nc_records').select('*');
  if (periodo) query = query.eq('periodo', periodo);

  const { data, error } = await query;
  if (error) {
    console.error('fetchNCRecords error:', error.message);
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
    console.error('fetchElogios error:', error.message);
    return [];
  }
  return (data || []) as ElogioRow[];
}

export async function fetchAllPeriodosFromSupabase(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('import_cycles')
    .select('periodo')
    .order('periodo', { ascending: false });

  if (error) {
    console.error('fetchAllPeriodos error:', error.message);
    return [];
  }
  return [...new Set((data || []).map((r: any) => r.periodo as string))];
}

export async function toggleElogioDestaqueInSupabase(id: string, destaque: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('elogios')
    .update({ destaque })
    .eq('id', id);

  if (error) console.error('toggleElogioDestaque error:', error.message);
}

export async function deletePeriodDataFromSupabase(periodo: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from('cycle_scores').delete().eq('periodo', periodo);
  await supabase.from('nc_records').delete().eq('periodo', periodo);
  await supabase.from('elogios').delete().eq('periodo', periodo);
  await supabase.from('import_cycles').delete().eq('periodo', periodo);
}

export async function clearAllDataFromSupabase(): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado.' };

  try {
    // Delete in dependency order (child tables first)
    await supabase.from('cycle_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('nc_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('elogios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('import_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('import_cycles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cycle_summaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
