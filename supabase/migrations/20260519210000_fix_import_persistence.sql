-- ============================================================
-- QUALIVISÃO — Fix Import Persistence & RLS
-- 20260519210000_fix_import_persistence.sql
-- ============================================================

-- ─── 1. Ensure all core tables have RLS enabled ───────────────────────────────
ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_records ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop ALL existing policies on core tables and recreate clean ──────────

-- import_cycles: drop all known policy names
DROP POLICY IF EXISTS "authenticated_read_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "coordinators_manage_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "service_role_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "all_authenticated_read_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "all_authenticated_write_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "open_read_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "open_write_import_cycles" ON public.import_cycles;

CREATE POLICY "import_cycles_select"
  ON public.import_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "import_cycles_insert"
  ON public.import_cycles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "import_cycles_update"
  ON public.import_cycles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "import_cycles_delete"
  ON public.import_cycles FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_import_cycles_v2" ON public.import_cycles;
CREATE POLICY "service_role_import_cycles_v2"
  ON public.import_cycles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_scores: drop all known policy names
DROP POLICY IF EXISTS "authenticated_read_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "coordinators_manage_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "service_role_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "all_authenticated_read_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "all_authenticated_write_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "open_read_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "open_write_cycle_scores" ON public.cycle_scores;

CREATE POLICY "cycle_scores_select"
  ON public.cycle_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cycle_scores_insert"
  ON public.cycle_scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "cycle_scores_update"
  ON public.cycle_scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "cycle_scores_delete"
  ON public.cycle_scores FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_cycle_scores_v2" ON public.cycle_scores;
CREATE POLICY "service_role_cycle_scores_v2"
  ON public.cycle_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- nc_records: drop all known policy names
DROP POLICY IF EXISTS "authenticated_read_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "authenticated_insert_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "authenticated_delete_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "coordinators_manage_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "service_role_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "all_authenticated_read_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "all_authenticated_write_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "open_read_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "open_write_nc_records" ON public.nc_records;

CREATE POLICY "nc_records_select"
  ON public.nc_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "nc_records_insert"
  ON public.nc_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "nc_records_update"
  ON public.nc_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "nc_records_delete"
  ON public.nc_records FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_nc_records_v2" ON public.nc_records;
CREATE POLICY "service_role_nc_records_v2"
  ON public.nc_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- elogios: drop all known policy names
DROP POLICY IF EXISTS "authenticated_read_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_insert_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_update_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_delete_elogios" ON public.elogios;
DROP POLICY IF EXISTS "coordinators_manage_elogios" ON public.elogios;
DROP POLICY IF EXISTS "service_role_elogios" ON public.elogios;
DROP POLICY IF EXISTS "all_authenticated_read_elogios" ON public.elogios;
DROP POLICY IF EXISTS "all_authenticated_write_elogios" ON public.elogios;
DROP POLICY IF EXISTS "open_read_elogios" ON public.elogios;
DROP POLICY IF EXISTS "open_write_elogios" ON public.elogios;

CREATE POLICY "elogios_select"
  ON public.elogios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "elogios_insert"
  ON public.elogios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "elogios_update"
  ON public.elogios FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "elogios_delete"
  ON public.elogios FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_elogios_v2" ON public.elogios;
CREATE POLICY "service_role_elogios_v2"
  ON public.elogios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_summaries: drop all known policy names
DROP POLICY IF EXISTS "all_authenticated_read_summaries" ON public.cycle_summaries;
DROP POLICY IF EXISTS "all_authenticated_write_summaries" ON public.cycle_summaries;
DROP POLICY IF EXISTS "service_role_summaries" ON public.cycle_summaries;

CREATE POLICY "cycle_summaries_select"
  ON public.cycle_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cycle_summaries_insert"
  ON public.cycle_summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "cycle_summaries_update"
  ON public.cycle_summaries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "cycle_summaries_delete"
  ON public.cycle_summaries FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_summaries_v2" ON public.cycle_summaries;
CREATE POLICY "service_role_summaries_v2"
  ON public.cycle_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 3. Ensure UNIQUE constraint on import_cycles.periodo ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.import_cycles'::regclass
      AND contype = 'u'
      AND conname = 'import_cycles_periodo_key'
  ) THEN
    ALTER TABLE public.import_cycles ADD CONSTRAINT import_cycles_periodo_key UNIQUE (periodo);
  END IF;
END $$;

-- ─── 4. Ensure UNIQUE constraint on cycle_summaries.periodo ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cycle_summaries'::regclass
      AND contype = 'u'
      AND conname = 'cycle_summaries_periodo_key'
  ) THEN
    ALTER TABLE public.cycle_summaries ADD CONSTRAINT cycle_summaries_periodo_key UNIQUE (periodo);
  END IF;
END $$;

-- ─── 5. Ensure import_cycles has all required columns ────────────────────────
ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- ─── 6. Refresh cycle_summaries function (idempotent) ────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_cycle_summary(p_periodo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_analistas INTEGER;
  v_qa_media NUMERIC;
  v_iepc_media NUMERIC;
  v_total_ncs INTEGER;
  v_total_elogios INTEGER;
  v_squad_breakdown JSONB;
  v_top_analistas JSONB;
BEGIN
  SELECT
    COUNT(DISTINCT analista),
    ROUND(AVG(nota_final_qa)::NUMERIC, 2),
    ROUND(AVG(iepc_total)::NUMERIC, 2)
  INTO v_total_analistas, v_qa_media, v_iepc_media
  FROM public.cycle_scores
  WHERE periodo = p_periodo;

  SELECT COUNT(*) INTO v_total_ncs
  FROM public.nc_records
  WHERE periodo = p_periodo;

  SELECT COUNT(*) INTO v_total_elogios
  FROM public.elogios
  WHERE periodo = p_periodo;

  SELECT jsonb_agg(sq_data ORDER BY (sq_data->>'qa')::NUMERIC DESC)
  INTO v_squad_breakdown
  FROM (
    SELECT jsonb_build_object(
      'squad', squad,
      'qa', ROUND(AVG(nota_final_qa)::NUMERIC, 2),
      'iepc', ROUND(AVG(iepc_total)::NUMERIC, 2),
      'count', COUNT(*)
    ) AS sq_data
    FROM public.cycle_scores
    WHERE periodo = p_periodo
    GROUP BY squad
  ) sq;

  SELECT jsonb_agg(top_data ORDER BY (top_data->>'qa')::NUMERIC DESC)
  INTO v_top_analistas
  FROM (
    SELECT jsonb_build_object(
      'analista', analista,
      'squad', squad,
      'qa', ROUND(AVG(nota_final_qa)::NUMERIC, 2),
      'iepc', ROUND(AVG(iepc_total)::NUMERIC, 2)
    ) AS top_data
    FROM public.cycle_scores
    WHERE periodo = p_periodo
    GROUP BY analista, squad
    ORDER BY AVG(nota_final_qa) DESC
    LIMIT 10
  ) top;

  INSERT INTO public.cycle_summaries (
    periodo, total_analistas, qa_media, iepc_media,
    total_ncs, total_elogios, squad_breakdown, top_analistas, updated_at
  )
  VALUES (
    p_periodo,
    COALESCE(v_total_analistas, 0),
    COALESCE(v_qa_media, 0),
    COALESCE(v_iepc_media, 0),
    COALESCE(v_total_ncs, 0),
    COALESCE(v_total_elogios, 0),
    COALESCE(v_squad_breakdown, '[]'::jsonb),
    COALESCE(v_top_analistas, '[]'::jsonb),
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (periodo) DO UPDATE SET
    total_analistas = EXCLUDED.total_analistas,
    qa_media = EXCLUDED.qa_media,
    iepc_media = EXCLUDED.iepc_media,
    total_ncs = EXCLUDED.total_ncs,
    total_elogios = EXCLUDED.total_elogios,
    squad_breakdown = EXCLUDED.squad_breakdown,
    top_analistas = EXCLUDED.top_analistas,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- ─── 7. Grant execute on refresh_cycle_summary to authenticated ───────────────
GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO service_role;

-- ─── 8. Performance indexes (idempotent) ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cycle_scores_periodo_v2 ON public.cycle_scores(periodo);
CREATE INDEX IF NOT EXISTS idx_nc_records_periodo_v2 ON public.nc_records(periodo);
CREATE INDEX IF NOT EXISTS idx_elogios_periodo_v2 ON public.elogios(periodo);
CREATE INDEX IF NOT EXISTS idx_import_cycles_periodo_v2 ON public.import_cycles(periodo);
CREATE INDEX IF NOT EXISTS idx_cycle_summaries_periodo ON public.cycle_summaries(periodo);
