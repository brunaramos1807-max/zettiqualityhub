-- ============================================================
-- QualiVisão — Allow anon role for admin operations
-- Fixes: Admin logged in via localStorage cannot write to Supabase
-- because RLS policies only allow 'authenticated' role.
-- Solution: Also allow 'anon' role for all RBAC tables.
-- Also: Create a pre_registered_users table for admin pre-registration
-- (avoids FK constraint issue with user_profiles referencing auth.users)
-- ============================================================

-- cargos: allow anon to read and write
DO $$ BEGIN
  CREATE POLICY "cargos_anon_read" ON public.cargos FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cargos_anon_write" ON public.cargos FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- permission_modules: allow anon to read
DO $$ BEGIN
  CREATE POLICY "permission_modules_anon_read" ON public.permission_modules FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_profiles: allow anon to read and write (needed for admin CRUD)
DO $$ BEGIN
  CREATE POLICY "user_profiles_anon_read" ON public.user_profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_profiles_anon_write" ON public.user_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_permissions: allow anon to read and write
DO $$ BEGIN
  CREATE POLICY "user_permissions_anon_read" ON public.user_permissions FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_permissions_anon_write" ON public.user_permissions FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- analistas: allow anon to read and write
DO $$ BEGIN
  CREATE POLICY "analistas_anon_read" ON public.analistas FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "analistas_anon_write" ON public.analistas FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- permission_logs: allow anon to read and insert
DO $$ BEGIN
  CREATE POLICY "permission_logs_anon_read" ON public.permission_logs FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "permission_logs_anon_write" ON public.permission_logs FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- cycle_closure_history: allow anon to read and insert
DO $$ BEGIN
  CREATE POLICY "cycle_closure_history_anon_read" ON public.cycle_closure_history FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cycle_closure_history_anon_write" ON public.cycle_closure_history FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- import_cycles: allow anon to read and update (for cycle closing)
DO $$ BEGIN
  CREATE POLICY "import_cycles_anon_read" ON public.import_cycles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "import_cycles_anon_write" ON public.import_cycles FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Pre-registered users table (no FK to auth.users)
-- Admin can pre-register users here; when they login via Google,
-- the handle_new_user trigger checks this table and applies the profile.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pre_registered_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT DEFAULT 'Visualizador',
  cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  squad TEXT,
  squads TEXT[] DEFAULT '{}',
  nivel TEXT DEFAULT 'Junior',
  is_active BOOLEAN DEFAULT true,
  status_usuario TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "pre_registered_anon_all" ON public.pre_registered_users FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pre_registered_auth_all" ON public.pre_registered_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
