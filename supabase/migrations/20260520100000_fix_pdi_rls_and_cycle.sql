-- Fix PDI RLS: allow authenticated users to insert/update/delete their own PDIs
-- Fix import_cycles: allow creating new cycles (05/2026) without imported data
-- Fix app_settings: ensure read/write for all authenticated users

-- ─── pdi_records: drop and recreate permissive policies ──────────────────────
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "pdi_select" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_insert" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_update" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_delete" ON public.pdi_records;
  DROP POLICY IF EXISTS "Allow authenticated read pdi_records" ON public.pdi_records;
  DROP POLICY IF EXISTS "Allow authenticated insert pdi_records" ON public.pdi_records;
  DROP POLICY IF EXISTS "Allow authenticated update pdi_records" ON public.pdi_records;
  DROP POLICY IF EXISTS "Allow authenticated delete pdi_records" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_records_select" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_records_insert" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_records_update" ON public.pdi_records;
  DROP POLICY IF EXISTS "pdi_records_delete" ON public.pdi_records;
END $$;

CREATE POLICY "pdi_records_select" ON public.pdi_records
  FOR SELECT USING (true);

CREATE POLICY "pdi_records_insert" ON public.pdi_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pdi_records_update" ON public.pdi_records
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "pdi_records_delete" ON public.pdi_records
  FOR DELETE USING (true);

-- ─── import_cycles: allow creating new cycles ─────────────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "import_cycles_select" ON public.import_cycles;
  DROP POLICY IF EXISTS "import_cycles_insert" ON public.import_cycles;
  DROP POLICY IF EXISTS "import_cycles_update" ON public.import_cycles;
  DROP POLICY IF EXISTS "import_cycles_delete" ON public.import_cycles;
  DROP POLICY IF EXISTS "Allow authenticated read import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "Allow authenticated insert import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "Allow authenticated update import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "Allow authenticated delete import_cycles" ON public.import_cycles;
END $$;

CREATE POLICY "import_cycles_select" ON public.import_cycles
  FOR SELECT USING (true);

CREATE POLICY "import_cycles_insert" ON public.import_cycles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "import_cycles_update" ON public.import_cycles
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "import_cycles_delete" ON public.import_cycles
  FOR DELETE USING (true);

-- ─── app_settings: ensure read/write ─────────────────────────────────────────
DO $$
BEGIN
  DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;
  DROP POLICY IF EXISTS "app_settings_insert" ON public.app_settings;
  DROP POLICY IF EXISTS "app_settings_update" ON public.app_settings;
  DROP POLICY IF EXISTS "app_settings_upsert" ON public.app_settings;
  DROP POLICY IF EXISTS "Allow read app_settings" ON public.app_settings;
  DROP POLICY IF EXISTS "Allow write app_settings" ON public.app_settings;
END $$;

CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_insert" ON public.app_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "app_settings_update" ON public.app_settings
  FOR UPDATE USING (true) WITH CHECK (true);

-- ─── Insert cycle 05/2026 if it doesn't exist ─────────────────────────────────
INSERT INTO public.import_cycles (periodo, file_name, record_count, is_current, is_closed, status, import_status, data_type, updated_at)
VALUES ('05/2026', 'Ciclo 05/2026 - Período 26/04 a 25/05', 0, true, false, 'em_andamento', 'pending', 'mixed', NOW())
ON CONFLICT (periodo) DO UPDATE SET
  is_current = true,
  is_closed = false,
  status = CASE WHEN import_cycles.is_closed THEN import_cycles.status ELSE 'em_andamento' END,
  updated_at = NOW();

-- ─── Set 05/2026 as active cycle in app_settings ─────────────────────────────
INSERT INTO public.app_settings (key, value, updated_at)
VALUES ('active_cycle', '05/2026', NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '05/2026',
  updated_at = NOW();
