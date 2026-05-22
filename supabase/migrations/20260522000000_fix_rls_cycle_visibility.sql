-- Fix: Allow all authenticated users to read cycle_scores, nc_records, elogios, pdi_records
-- This ensures coordinators and other roles can see cycle 05/2026 data from integration imports

-- ─── Add missing 'source' column to nc_records ───────────────────────────────
ALTER TABLE public.nc_records
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- ─── cycle_scores: allow all authenticated users to read ─────────────────────
DROP POLICY IF EXISTS "authenticated_read_cycle_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_read_cycle_scores"
ON public.cycle_scores
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_cycle_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_insert_cycle_scores"
ON public.cycle_scores
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_cycle_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_update_cycle_scores"
ON public.cycle_scores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_cycle_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_delete_cycle_scores"
ON public.cycle_scores
FOR DELETE
TO authenticated
USING (true);

-- ─── nc_records: allow all authenticated users to read ───────────────────────
DROP POLICY IF EXISTS "authenticated_read_nc_records" ON public.nc_records;
CREATE POLICY "authenticated_read_nc_records"
ON public.nc_records
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_nc_records" ON public.nc_records;
CREATE POLICY "authenticated_insert_nc_records"
ON public.nc_records
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_nc_records" ON public.nc_records;
CREATE POLICY "authenticated_update_nc_records"
ON public.nc_records
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_nc_records" ON public.nc_records;
CREATE POLICY "authenticated_delete_nc_records"
ON public.nc_records
FOR DELETE
TO authenticated
USING (true);

-- ─── elogios: allow all authenticated users to read ──────────────────────────
DROP POLICY IF EXISTS "authenticated_read_elogios" ON public.elogios;
CREATE POLICY "authenticated_read_elogios"
ON public.elogios
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_elogios" ON public.elogios;
CREATE POLICY "authenticated_insert_elogios"
ON public.elogios
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_elogios" ON public.elogios;
CREATE POLICY "authenticated_update_elogios"
ON public.elogios
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_elogios" ON public.elogios;
CREATE POLICY "authenticated_delete_elogios"
ON public.elogios
FOR DELETE
TO authenticated
USING (true);

-- ─── pdi_records: allow all authenticated users to read ──────────────────────
DROP POLICY IF EXISTS "authenticated_read_pdi_records" ON public.pdi_records;
CREATE POLICY "authenticated_read_pdi_records"
ON public.pdi_records
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_pdi_records" ON public.pdi_records;
CREATE POLICY "authenticated_insert_pdi_records"
ON public.pdi_records
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_pdi_records" ON public.pdi_records;
CREATE POLICY "authenticated_update_pdi_records"
ON public.pdi_records
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_pdi_records" ON public.pdi_records;
CREATE POLICY "authenticated_delete_pdi_records"
ON public.pdi_records
FOR DELETE
TO authenticated
USING (true);

-- ─── import_cycles: allow all authenticated users to read ────────────────────
DROP POLICY IF EXISTS "authenticated_read_import_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_read_import_cycles"
ON public.import_cycles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_import_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_insert_import_cycles"
ON public.import_cycles
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_import_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_update_import_cycles"
ON public.import_cycles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_import_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_delete_import_cycles"
ON public.import_cycles
FOR DELETE
TO authenticated
USING (true);

-- ─── cycle_summaries: allow all authenticated users to read ──────────────────
DROP POLICY IF EXISTS "authenticated_read_cycle_summaries" ON public.cycle_summaries;
CREATE POLICY "authenticated_read_cycle_summaries"
ON public.cycle_summaries
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_write_cycle_summaries" ON public.cycle_summaries;
CREATE POLICY "authenticated_write_cycle_summaries"
ON public.cycle_summaries
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ─── integration_request_logs: allow authenticated users to read ──────────────
DROP POLICY IF EXISTS "authenticated_read_integration_logs" ON public.integration_request_logs;
CREATE POLICY "authenticated_read_integration_logs"
ON public.integration_request_logs
FOR SELECT
TO authenticated
USING (true);
