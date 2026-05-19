-- ============================================================
-- QUALIVISÃO — Fix Data Visibility & Cycle Close
-- 20260519140000_fix_data_visibility.sql
-- ============================================================

-- ─── 1. Ensure RLS is enabled on all operational tables ──────────────────────
ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;

-- ─── 2. Ensure UNIQUE constraint on import_cycles.periodo ────────────────────
-- Required for upsert ON CONFLICT (periodo) to work
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

-- ─── 3. Ensure is_closed and status columns exist on import_cycles ────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'is_closed'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN is_closed BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN status TEXT DEFAULT 'aberto';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'closed_by_email'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN closed_by_email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'reopened_at'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN reopened_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'reopened_by_email'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN reopened_by_email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'import_cycles' AND column_name = 'closure_notes'
  ) THEN
    ALTER TABLE public.import_cycles ADD COLUMN closure_notes TEXT;
  END IF;
END $$;

-- ─── 4. Drop and recreate policies for full visibility to all authenticated ───

-- import_cycles
DROP POLICY IF EXISTS "authenticated_read_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "coordinators_manage_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "service_role_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "all_authenticated_read_import_cycles" ON public.import_cycles;
DROP POLICY IF EXISTS "all_authenticated_write_import_cycles" ON public.import_cycles;

CREATE POLICY "all_authenticated_read_import_cycles"
  ON public.import_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_import_cycles"
  ON public.import_cycles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_import_cycles"
  ON public.import_cycles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_scores
DROP POLICY IF EXISTS "authenticated_read_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "coordinators_manage_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "service_role_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "all_authenticated_read_cycle_scores" ON public.cycle_scores;
DROP POLICY IF EXISTS "all_authenticated_write_cycle_scores" ON public.cycle_scores;

CREATE POLICY "all_authenticated_read_cycle_scores"
  ON public.cycle_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- nc_records
DROP POLICY IF EXISTS "authenticated_read_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "authenticated_insert_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "authenticated_delete_ncs" ON public.nc_records;
DROP POLICY IF EXISTS "coordinators_manage_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "service_role_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "all_authenticated_read_nc_records" ON public.nc_records;
DROP POLICY IF EXISTS "all_authenticated_write_nc_records" ON public.nc_records;

CREATE POLICY "all_authenticated_read_nc_records"
  ON public.nc_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_nc_records"
  ON public.nc_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_nc_records"
  ON public.nc_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- elogios
DROP POLICY IF EXISTS "authenticated_read_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_insert_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_update_elogios" ON public.elogios;
DROP POLICY IF EXISTS "authenticated_delete_elogios" ON public.elogios;
DROP POLICY IF EXISTS "coordinators_manage_elogios" ON public.elogios;
DROP POLICY IF EXISTS "service_role_elogios" ON public.elogios;
DROP POLICY IF EXISTS "all_authenticated_read_elogios" ON public.elogios;
DROP POLICY IF EXISTS "all_authenticated_write_elogios" ON public.elogios;

CREATE POLICY "all_authenticated_read_elogios"
  ON public.elogios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_elogios"
  ON public.elogios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_elogios"
  ON public.elogios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Ensure cycle_closure_history table exists ────────────────────────────
CREATE TABLE IF NOT EXISTS public.cycle_closure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_email TEXT,
  actor_name TEXT,
  notes TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.cycle_closure_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_authenticated_read_closure_history" ON public.cycle_closure_history;
DROP POLICY IF EXISTS "all_authenticated_write_closure_history" ON public.cycle_closure_history;

CREATE POLICY "all_authenticated_read_closure_history"
  ON public.cycle_closure_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_closure_history"
  ON public.cycle_closure_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 6. Ensure permission_logs table exists ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_authenticated_read_permission_logs" ON public.permission_logs;
DROP POLICY IF EXISTS "all_authenticated_write_permission_logs" ON public.permission_logs;

CREATE POLICY "all_authenticated_read_permission_logs"
  ON public.permission_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "all_authenticated_write_permission_logs"
  ON public.permission_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
