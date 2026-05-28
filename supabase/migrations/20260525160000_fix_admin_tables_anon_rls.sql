-- Fix RLS: Add anon policies for administrative tables
-- These tables are accessed via anon key (system uses localStorage auth, not Supabase Auth)
-- Without anon policies, configuracoes/page.tsx cannot load tabs for coordinators

-- ── user_profiles ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_profiles_anon_select" ON public.user_profiles;
CREATE POLICY "user_profiles_anon_select"
  ON public.user_profiles
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "user_profiles_anon_insert" ON public.user_profiles;
CREATE POLICY "user_profiles_anon_insert"
  ON public.user_profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_profiles_anon_update" ON public.user_profiles;
CREATE POLICY "user_profiles_anon_update"
  ON public.user_profiles
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── user_permissions ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_permissions_anon_select" ON public.user_permissions;
CREATE POLICY "user_permissions_anon_select"
  ON public.user_permissions
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "user_permissions_anon_insert" ON public.user_permissions;
CREATE POLICY "user_permissions_anon_insert"
  ON public.user_permissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_permissions_anon_update" ON public.user_permissions;
CREATE POLICY "user_permissions_anon_update"
  ON public.user_permissions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_permissions_anon_delete" ON public.user_permissions;
CREATE POLICY "user_permissions_anon_delete"
  ON public.user_permissions
  FOR DELETE
  TO anon
  USING (true);

-- ── permission_modules ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "permission_modules_anon_select" ON public.permission_modules;
CREATE POLICY "permission_modules_anon_select"
  ON public.permission_modules
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "permission_modules_anon_insert" ON public.permission_modules;
CREATE POLICY "permission_modules_anon_insert"
  ON public.permission_modules
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "permission_modules_anon_update" ON public.permission_modules;
CREATE POLICY "permission_modules_anon_update"
  ON public.permission_modules
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── cargos ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cargos_anon_select" ON public.cargos;
CREATE POLICY "cargos_anon_select"
  ON public.cargos
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "cargos_anon_insert" ON public.cargos;
CREATE POLICY "cargos_anon_insert"
  ON public.cargos
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "cargos_anon_update" ON public.cargos;
CREATE POLICY "cargos_anon_update"
  ON public.cargos
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ── Also ensure nc_records, elogios, cycle_scores, import_cycles have anon access ──
DROP POLICY IF EXISTS "nc_records_anon_select" ON public.nc_records;
CREATE POLICY "nc_records_anon_select"
  ON public.nc_records
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "nc_records_anon_insert" ON public.nc_records;
CREATE POLICY "nc_records_anon_insert"
  ON public.nc_records
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "nc_records_anon_delete" ON public.nc_records;
CREATE POLICY "nc_records_anon_delete"
  ON public.nc_records
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "elogios_anon_select" ON public.elogios;
CREATE POLICY "elogios_anon_select"
  ON public.elogios
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "elogios_anon_insert" ON public.elogios;
CREATE POLICY "elogios_anon_insert"
  ON public.elogios
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "elogios_anon_delete" ON public.elogios;
CREATE POLICY "elogios_anon_delete"
  ON public.elogios
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "cycle_scores_anon_select" ON public.cycle_scores;
CREATE POLICY "cycle_scores_anon_select"
  ON public.cycle_scores
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "cycle_scores_anon_insert" ON public.cycle_scores;
CREATE POLICY "cycle_scores_anon_insert"
  ON public.cycle_scores
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "cycle_scores_anon_delete" ON public.cycle_scores;
CREATE POLICY "cycle_scores_anon_delete"
  ON public.cycle_scores
  FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "import_cycles_anon_select" ON public.import_cycles;
CREATE POLICY "import_cycles_anon_select"
  ON public.import_cycles
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "import_cycles_anon_insert" ON public.import_cycles;
CREATE POLICY "import_cycles_anon_insert"
  ON public.import_cycles
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "import_cycles_anon_delete" ON public.import_cycles;
CREATE POLICY "import_cycles_anon_delete"
  ON public.import_cycles
  FOR DELETE
  TO anon
  USING (true);
