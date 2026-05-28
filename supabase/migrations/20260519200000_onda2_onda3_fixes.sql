-- ============================================================
-- QUALIVISÃO — Onda 2 & 3: Indexes, PDI, Admin Logs, Analyst Import
-- 20260519200000_onda2_onda3_fixes.sql
-- ============================================================

-- ─── 1. SQL Performance Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cycle_scores_periodo ON public.cycle_scores(periodo);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_squad ON public.cycle_scores(squad);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_analista ON public.cycle_scores(analista);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_cycle_id ON public.cycle_scores(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_nota_qa ON public.cycle_scores(nota_final_qa DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_iepc ON public.cycle_scores(iepc_total DESC);

CREATE INDEX IF NOT EXISTS idx_nc_records_periodo ON public.nc_records(periodo);
CREATE INDEX IF NOT EXISTS idx_nc_records_squad ON public.nc_records(squad);
CREATE INDEX IF NOT EXISTS idx_nc_records_analista ON public.nc_records(analista);
CREATE INDEX IF NOT EXISTS idx_nc_records_cycle_id ON public.nc_records(cycle_id);
CREATE INDEX IF NOT EXISTS idx_nc_records_tipo ON public.nc_records(tipo_nc);

CREATE INDEX IF NOT EXISTS idx_elogios_periodo ON public.elogios(periodo);
CREATE INDEX IF NOT EXISTS idx_elogios_squad ON public.elogios(squad);
CREATE INDEX IF NOT EXISTS idx_elogios_cycle_id ON public.elogios(cycle_id);

CREATE INDEX IF NOT EXISTS idx_import_cycles_periodo ON public.import_cycles(periodo);
CREATE INDEX IF NOT EXISTS idx_import_cycles_is_closed ON public.import_cycles(is_closed);
CREATE INDEX IF NOT EXISTS idx_import_cycles_status ON public.import_cycles(status);

CREATE INDEX IF NOT EXISTS idx_pdi_records_periodo ON public.pdi_records(periodo);
CREATE INDEX IF NOT EXISTS idx_pdi_records_analista ON public.pdi_records(analista);
CREATE INDEX IF NOT EXISTS idx_pdi_records_squad ON public.pdi_records(squad);
CREATE INDEX IF NOT EXISTS idx_pdi_records_status ON public.pdi_records(status_pdi);
CREATE INDEX IF NOT EXISTS idx_pdi_records_cycle_id ON public.pdi_records(cycle_id);

CREATE INDEX IF NOT EXISTS idx_analistas_squad ON public.analistas(squad);
CREATE INDEX IF NOT EXISTS idx_analistas_status ON public.analistas(status);
CREATE INDEX IF NOT EXISTS idx_analistas_coordenador ON public.analistas(coordenador);

-- ─── 2. Add missing columns to analistas for auto-calc ───────────────────────
ALTER TABLE public.analistas
  ADD COLUMN IF NOT EXISTS data_admissao DATE,
  ADD COLUMN IF NOT EXISTS tempo_empresa_calculado TEXT,
  ADD COLUMN IF NOT EXISTS tempo_empresa_meses INTEGER DEFAULT 0;

-- ─── 3. Admin Logs / Diagnostics table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  log_type TEXT NOT NULL DEFAULT 'info',
  category TEXT NOT NULL DEFAULT 'sistema',
  actor_email TEXT,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  severity TEXT DEFAULT 'info'
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_log_type ON public.admin_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_category ON public.admin_logs(category);
CREATE INDEX IF NOT EXISTS idx_admin_logs_actor_email ON public.admin_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_severity ON public.admin_logs(severity);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_admin_logs" ON public.admin_logs;
CREATE POLICY "admins_read_admin_logs"
  ON public.admin_logs FOR SELECT
  TO authenticated
  USING (public.is_admin_master());

DROP POLICY IF EXISTS "authenticated_insert_admin_logs" ON public.admin_logs;
CREATE POLICY "authenticated_insert_admin_logs"
  ON public.admin_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_admin_logs" ON public.admin_logs;
CREATE POLICY "service_role_admin_logs"
  ON public.admin_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 4. Fix PDI records RLS — allow all authenticated to read/write ───────────
DROP POLICY IF EXISTS "all_authenticated_read_pdi" ON public.pdi_records;
CREATE POLICY "all_authenticated_read_pdi"
  ON public.pdi_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "all_authenticated_write_pdi" ON public.pdi_records;
CREATE POLICY "all_authenticated_write_pdi"
  ON public.pdi_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_pdi" ON public.pdi_records;
CREATE POLICY "service_role_pdi"
  ON public.pdi_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Fix analistas RLS — allow all authenticated ──────────────────────────
ALTER TABLE public.analistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_authenticated_read_analistas" ON public.analistas;
CREATE POLICY "all_authenticated_read_analistas"
  ON public.analistas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "all_authenticated_write_analistas" ON public.analistas;
CREATE POLICY "all_authenticated_write_analistas"
  ON public.analistas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_analistas" ON public.analistas;
CREATE POLICY "service_role_analistas"
  ON public.analistas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 6. Fix cycle_summaries RLS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "all_authenticated_read_summaries" ON public.cycle_summaries;
CREATE POLICY "all_authenticated_read_summaries"
  ON public.cycle_summaries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "all_authenticated_write_summaries" ON public.cycle_summaries;
CREATE POLICY "all_authenticated_write_summaries"
  ON public.cycle_summaries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_summaries" ON public.cycle_summaries;
CREATE POLICY "service_role_summaries"
  ON public.cycle_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 7. Fix import_logs RLS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "all_authenticated_read_import_logs" ON public.import_logs;
CREATE POLICY "all_authenticated_read_import_logs"
  ON public.import_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "all_authenticated_write_import_logs" ON public.import_logs;
CREATE POLICY "all_authenticated_write_import_logs"
  ON public.import_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_import_logs" ON public.import_logs;
CREATE POLICY "service_role_import_logs"
  ON public.import_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 8. Function to auto-calculate tempo_empresa ─────────────────────────────
CREATE OR REPLACE FUNCTION public.calc_tempo_empresa(admission_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  months_diff INTEGER;
  years_part INTEGER;
  months_part INTEGER;
BEGIN
  IF admission_date IS NULL THEN
    RETURN NULL;
  END IF;
  months_diff := EXTRACT(YEAR FROM AGE(CURRENT_DATE, admission_date)) * 12
               + EXTRACT(MONTH FROM AGE(CURRENT_DATE, admission_date));
  years_part := months_diff / 12;
  months_part := months_diff % 12;
  IF years_part = 0 THEN
    RETURN months_part || ' mes(es)';
  ELSIF months_part = 0 THEN
    RETURN years_part || ' ano(s)';
  ELSE
    RETURN years_part || ' ano(s) e ' || months_part || ' mes(es)';
  END IF;
END;
$$;

-- ─── 9. Trigger to auto-update tempo_empresa on analistas ────────────────────
CREATE OR REPLACE FUNCTION public.update_analista_tempo_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.data_admissao IS NOT NULL THEN
    NEW.tempo_empresa_calculado := public.calc_tempo_empresa(NEW.data_admissao);
    NEW.tempo_empresa_meses := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.data_admissao)) * 12
                             + EXTRACT(MONTH FROM AGE(CURRENT_DATE, NEW.data_admissao));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_analista_tempo_empresa ON public.analistas;
CREATE TRIGGER trg_analista_tempo_empresa
  BEFORE INSERT OR UPDATE ON public.analistas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_analista_tempo_empresa();

-- ─── 10. Function to aggregate cycle summary from real data ──────────────────
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

  INSERT INTO public.cycle_summaries (periodo, total_analistas, qa_media, iepc_media, total_ncs, total_elogios, squad_breakdown, top_analistas, updated_at)
  VALUES (p_periodo, COALESCE(v_total_analistas, 0), COALESCE(v_qa_media, 0), COALESCE(v_iepc_media, 0), COALESCE(v_total_ncs, 0), COALESCE(v_total_elogios, 0), COALESCE(v_squad_breakdown, '[]'::jsonb), COALESCE(v_top_analistas, '[]'::jsonb), CURRENT_TIMESTAMP)
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
