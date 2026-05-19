-- ============================================================
-- QUALIVISÃO — Onda 1: Foundation
-- 20260519160000_onda1_foundation.sql
-- ============================================================

-- ─── 1. Ensure pre_registered_users has open RLS for auth callback ────────────
ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_read_pre_registered" ON public.pre_registered_users;
CREATE POLICY "open_read_pre_registered"
  ON public.pre_registered_users FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_pre_registered" ON public.pre_registered_users;
CREATE POLICY "service_role_pre_registered"
  ON public.pre_registered_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 2. Function: check if an email is pre-registered ─────────────────────────
CREATE OR REPLACE FUNCTION public.is_pre_registered(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pre_registered_users
    WHERE LOWER(email) = LOWER(check_email)
      AND (is_active IS NULL OR is_active = true)
  )
  OR LOWER(check_email) IN (
    'brunaramos1807@gmail.com',
    'bruna.silva@zetti.tech',
    'admin@zetti.com.br'
  );
$$;

-- ─── 3. Ensure import_cycles has is_closed and status columns ─────────────────
ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto',
  ADD COLUMN IF NOT EXISTS closed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS closure_notes TEXT,
  ADD COLUMN IF NOT EXISTS reopened_by_email TEXT;

-- ─── 4. Ensure user_profiles RLS allows users to read their own profile ────────
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
CREATE POLICY "users_read_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;
CREATE POLICY "users_insert_own_profile"
  ON public.user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to read all profiles (needed for coordinator lookups)
DROP POLICY IF EXISTS "authenticated_read_all_profiles" ON public.user_profiles;
CREATE POLICY "authenticated_read_all_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_all_profiles" ON public.user_profiles;
CREATE POLICY "service_role_all_profiles"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 5. Ensure cycle_closure_history has open RLS ─────────────────────────────
ALTER TABLE public.cycle_closure_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_read_closure_history" ON public.cycle_closure_history;
CREATE POLICY "open_read_closure_history"
  ON public.cycle_closure_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "open_write_closure_history" ON public.cycle_closure_history;
CREATE POLICY "open_write_closure_history"
  ON public.cycle_closure_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_closure_history" ON public.cycle_closure_history;
CREATE POLICY "service_role_closure_history"
  ON public.cycle_closure_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 6. Ensure permission_logs has open RLS ───────────────────────────────────
ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_write_permission_logs" ON public.permission_logs;
CREATE POLICY "open_write_permission_logs"
  ON public.permission_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_permission_logs" ON public.permission_logs;
CREATE POLICY "service_role_permission_logs"
  ON public.permission_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 7. Index for fast cycle status lookup ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_import_cycles_periodo_closed
  ON public.import_cycles (periodo, is_closed);

CREATE INDEX IF NOT EXISTS idx_import_cycles_status
  ON public.import_cycles (status);
