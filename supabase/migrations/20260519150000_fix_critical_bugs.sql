-- ============================================================
-- QUALIVISÃO — Fix Critical Bugs
-- 20260519150000_fix_critical_bugs.sql
-- ============================================================

-- ─── 1. Fix user_permissions id column — ensure DEFAULT gen_random_uuid() ────
-- The null id error happens when the column default was not set properly.
DO $$
BEGIN
  -- Alter the id column to ensure it has a proper default
  ALTER TABLE public.user_permissions
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN
  -- Column may already have the default; ignore
  NULL;
END $$;

-- ─── 2. Re-grant admin permissions safely (handles null id issue) ─────────────
-- Use a DO block that explicitly generates UUIDs to avoid any null id issue
DO $$
DECLARE
  admin_user RECORD;
  mod RECORD;
BEGIN
  FOR admin_user IN
    SELECT up.id FROM public.user_profiles up
    WHERE LOWER(up.email) IN ('bruna.silva@zetti.tech','brunaramos1807@gmail.com','admin@zetti.com.br')
      AND up.id IS NOT NULL
  LOOP
    FOR mod IN SELECT nome FROM public.permission_modules LOOP
      INSERT INTO public.user_permissions (
        id,
        user_profile_id, module_name,
        can_view, can_edit, can_delete, can_import, can_export,
        can_close_cycle, can_reopen_cycle, can_approve, can_admin
      ) VALUES (
        gen_random_uuid(),
        admin_user.id, mod.nome,
        true, true, true, true, true, true, true, true, true
      )
      ON CONFLICT (user_profile_id, module_name) DO UPDATE SET
        can_view = true, can_edit = true, can_delete = true,
        can_import = true, can_export = true, can_close_cycle = true,
        can_reopen_cycle = true, can_approve = true, can_admin = true,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;

-- ─── 3. Ensure import_cycles rows exist for all periods in cycle_scores ───────
-- This fixes "Fechar Ciclo" which does UPDATE on import_cycles.
-- If a period was imported only to localStorage (no Supabase row), the UPDATE finds nothing.
INSERT INTO public.import_cycles (id, periodo, file_name, record_count, imported_at)
SELECT
  gen_random_uuid(),
  s.periodo,
  'Importação anterior',
  COUNT(*),
  NOW()
FROM public.cycle_scores s
WHERE s.periodo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.import_cycles ic WHERE ic.periodo = s.periodo
  )
GROUP BY s.periodo;

-- Also create import_cycles rows for periods in nc_records not yet covered
INSERT INTO public.import_cycles (id, periodo, file_name, record_count, imported_at)
SELECT
  gen_random_uuid(),
  n.periodo,
  'Importação anterior',
  COUNT(*),
  NOW()
FROM public.nc_records n
WHERE n.periodo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.import_cycles ic WHERE ic.periodo = n.periodo
  )
GROUP BY n.periodo;

-- Also create import_cycles rows for periods in elogios not yet covered
INSERT INTO public.import_cycles (id, periodo, file_name, record_count, imported_at)
SELECT
  gen_random_uuid(),
  e.periodo,
  'Importação anterior',
  COUNT(*),
  NOW()
FROM public.elogios e
WHERE e.periodo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.import_cycles ic WHERE ic.periodo = e.periodo
  )
GROUP BY e.periodo;

-- ─── 4. Ensure all operational tables have open RLS for authenticated users ───
-- Drop and recreate to guarantee clean state

-- import_cycles
DO $$
BEGIN
  DROP POLICY IF EXISTS "all_authenticated_read_import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "all_authenticated_write_import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "service_role_import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "authenticated_read_import_cycles" ON public.import_cycles;
  DROP POLICY IF EXISTS "coordinators_manage_import_cycles" ON public.import_cycles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_read_import_cycles"
  ON public.import_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "open_write_import_cycles"
  ON public.import_cycles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_import_cycles"
  ON public.import_cycles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_scores
DO $$
BEGIN
  DROP POLICY IF EXISTS "all_authenticated_read_cycle_scores" ON public.cycle_scores;
  DROP POLICY IF EXISTS "all_authenticated_write_cycle_scores" ON public.cycle_scores;
  DROP POLICY IF EXISTS "service_role_cycle_scores" ON public.cycle_scores;
  DROP POLICY IF EXISTS "authenticated_read_cycle_scores" ON public.cycle_scores;
  DROP POLICY IF EXISTS "coordinators_manage_cycle_scores" ON public.cycle_scores;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_read_cycle_scores"
  ON public.cycle_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "open_write_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- nc_records
DO $$
BEGIN
  DROP POLICY IF EXISTS "all_authenticated_read_nc_records" ON public.nc_records;
  DROP POLICY IF EXISTS "all_authenticated_write_nc_records" ON public.nc_records;
  DROP POLICY IF EXISTS "service_role_nc_records" ON public.nc_records;
  DROP POLICY IF EXISTS "authenticated_read_nc_records" ON public.nc_records;
  DROP POLICY IF EXISTS "coordinators_manage_nc_records" ON public.nc_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_read_nc_records"
  ON public.nc_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "open_write_nc_records"
  ON public.nc_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_nc_records"
  ON public.nc_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- elogios
DO $$
BEGIN
  DROP POLICY IF EXISTS "all_authenticated_read_elogios" ON public.elogios;
  DROP POLICY IF EXISTS "all_authenticated_write_elogios" ON public.elogios;
  DROP POLICY IF EXISTS "service_role_elogios" ON public.elogios;
  DROP POLICY IF EXISTS "authenticated_read_elogios" ON public.elogios;
  DROP POLICY IF EXISTS "coordinators_manage_elogios" ON public.elogios;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_read_elogios"
  ON public.elogios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "open_write_elogios"
  ON public.elogios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_elogios"
  ON public.elogios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
