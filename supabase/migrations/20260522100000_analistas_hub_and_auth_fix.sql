-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Analistas Hub + Auth Fix
-- Adds ANALISTA_ID (ANL-0001), nome_completo, telefone to analistas table
-- Fixes pre_registered_users RLS so auth whitelist check always works
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Add missing columns to analistas table ───────────────────────────────
ALTER TABLE public.analistas
  ADD COLUMN IF NOT EXISTS analista_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS nome_completo TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS nome_curto TEXT;

-- ─── 2. Create sequence for ANALISTA_ID generation ───────────────────────────
CREATE SEQUENCE IF NOT EXISTS analistas_seq START 1;

-- ─── 3. Function to generate next ANALISTA_ID ────────────────────────────────
CREATE OR REPLACE FUNCTION generate_analista_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  next_val := nextval('analistas_seq');
  RETURN 'ANL-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

-- ─── 4. Trigger to auto-assign ANALISTA_ID on insert ─────────────────────────
CREATE OR REPLACE FUNCTION set_analista_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.analista_id IS NULL OR NEW.analista_id = '' THEN
    NEW.analista_id := generate_analista_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_analista_id ON public.analistas;
CREATE TRIGGER trg_set_analista_id
  BEFORE INSERT ON public.analistas
  FOR EACH ROW
  EXECUTE FUNCTION set_analista_id();

-- ─── 5. Backfill existing analistas with ANALISTA_IDs ────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.analistas WHERE analista_id IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.analistas
    SET analista_id = generate_analista_id()
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ─── 6. Backfill nome_completo from nome where missing ───────────────────────
UPDATE public.analistas
SET nome_completo = nome
WHERE nome_completo IS NULL AND nome IS NOT NULL;

-- ─── 7. RLS for analistas table ──────────────────────────────────────────────
ALTER TABLE public.analistas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analistas_select_authenticated" ON public.analistas;
CREATE POLICY "analistas_select_authenticated"
ON public.analistas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "analistas_insert_authenticated" ON public.analistas;
CREATE POLICY "analistas_insert_authenticated"
ON public.analistas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "analistas_update_authenticated" ON public.analistas;
CREATE POLICY "analistas_update_authenticated"
ON public.analistas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "analistas_delete_authenticated" ON public.analistas;
CREATE POLICY "analistas_delete_authenticated"
ON public.analistas FOR DELETE TO authenticated USING (true);

-- Allow anon to read analistas (needed for whitelist check before auth)
DROP POLICY IF EXISTS "analistas_select_anon" ON public.analistas;
CREATE POLICY "analistas_select_anon"
ON public.analistas FOR SELECT TO anon USING (true);

-- ─── 8. Fix pre_registered_users RLS — allow anon SELECT for whitelist check ─
ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pre_registered_users_select_anon" ON public.pre_registered_users;
CREATE POLICY "pre_registered_users_select_anon"
ON public.pre_registered_users FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "pre_registered_users_select_authenticated" ON public.pre_registered_users;
CREATE POLICY "pre_registered_users_select_authenticated"
ON public.pre_registered_users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pre_registered_users_insert_authenticated" ON public.pre_registered_users;
CREATE POLICY "pre_registered_users_insert_authenticated"
ON public.pre_registered_users FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pre_registered_users_update_authenticated" ON public.pre_registered_users;
CREATE POLICY "pre_registered_users_update_authenticated"
ON public.pre_registered_users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pre_registered_users_delete_authenticated" ON public.pre_registered_users;
CREATE POLICY "pre_registered_users_delete_authenticated"
ON public.pre_registered_users FOR DELETE TO authenticated USING (true);

-- ─── 9. Fix user_profiles RLS — allow anon SELECT for whitelist check ─────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select_anon" ON public.user_profiles;
CREATE POLICY "user_profiles_select_anon"
ON public.user_profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_select_authenticated"
ON public.user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_profiles_insert_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_authenticated"
ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "user_profiles_update_authenticated" ON public.user_profiles;
CREATE POLICY "user_profiles_update_authenticated"
ON public.user_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ─── 10. Add atendimento column to elogios if missing ────────────────────────
ALTER TABLE public.elogios
  ADD COLUMN IF NOT EXISTS atendimento TEXT;
