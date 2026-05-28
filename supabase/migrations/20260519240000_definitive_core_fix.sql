-- ============================================================
-- QUALIVISÃO — Definitive Core Architecture Fix
-- 20260519240000_definitive_core_fix.sql
-- ============================================================
-- Fixes: UPSERT constraints, cycle lock, whitelist, indexes,
--        import_logs table, RLS cleanup, NC cycle_id FK fix
-- ============================================================

-- ─── 1. UNIQUE CONSTRAINTS for true UPSERT (no DELETE before insert) ─────────

-- cycle_scores: upsert key = (periodo, analista, squad)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cycle_scores'::regclass
      AND contype = 'u' AND conname = 'uq_cycle_scores_pas'
  ) THEN
    -- Drop old conflicting constraint if it exists under a different name
    ALTER TABLE public.cycle_scores
      DROP CONSTRAINT IF EXISTS uq_cycle_scores_pad;
    ALTER TABLE public.cycle_scores
      ADD CONSTRAINT uq_cycle_scores_pas UNIQUE (periodo, analista, squad);
  END IF;
END $$;

-- nc_records: upsert key = (periodo, analista, protocolo_referencia, tipo_nc)
-- Allow NULL protocolo_referencia by using a partial unique index instead
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'nc_records'
      AND indexname = 'uq_nc_records_papt'
  ) THEN
    ALTER TABLE public.nc_records
      DROP CONSTRAINT IF EXISTS uq_nc_records_papt;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nc_records_papt
  ON public.nc_records (periodo, analista, COALESCE(protocolo_referencia, ''), tipo_nc);

-- elogios: upsert key = (periodo, colaborador, protocolo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'elogios'
      AND indexname = 'uq_elogios_pcp'
  ) THEN
    ALTER TABLE public.elogios
      DROP CONSTRAINT IF EXISTS uq_elogios_pcp;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_elogios_pcp
  ON public.elogios (periodo, colaborador, COALESCE(protocolo, ''));

-- import_cycles: unique on periodo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.import_cycles'::regclass
      AND contype = 'u' AND conname = 'import_cycles_periodo_key'
  ) THEN
    ALTER TABLE public.import_cycles
      ADD CONSTRAINT import_cycles_periodo_key UNIQUE (periodo);
  END IF;
END $$;

-- cycle_summaries: unique on periodo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cycle_summaries'::regclass
      AND contype = 'u' AND conname = 'cycle_summaries_periodo_key'
  ) THEN
    ALTER TABLE public.cycle_summaries
      ADD CONSTRAINT cycle_summaries_periodo_key UNIQUE (periodo);
  END IF;
END $$;

-- ─── 2. PERFORMANCE INDEXES ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cycle_scores_periodo ON public.cycle_scores (periodo);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_analista ON public.cycle_scores (analista);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_squad ON public.cycle_scores (squad);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_cycle_id ON public.cycle_scores (cycle_id);

CREATE INDEX IF NOT EXISTS idx_nc_records_periodo ON public.nc_records (periodo);
CREATE INDEX IF NOT EXISTS idx_nc_records_analista ON public.nc_records (analista);
CREATE INDEX IF NOT EXISTS idx_nc_records_cycle_id ON public.nc_records (cycle_id);

CREATE INDEX IF NOT EXISTS idx_elogios_periodo ON public.elogios (periodo);
CREATE INDEX IF NOT EXISTS idx_elogios_colaborador ON public.elogios (colaborador);

CREATE INDEX IF NOT EXISTS idx_import_cycles_periodo ON public.import_cycles (periodo);
CREATE INDEX IF NOT EXISTS idx_import_cycles_is_closed ON public.import_cycles (is_closed);

-- ─── 3. IMPORT LOGS TABLE (structured logging) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  periodo TEXT NOT NULL,
  file_name TEXT,
  step TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info', -- info | warn | error | success
  message TEXT NOT NULL,
  details JSONB,
  cycle_id UUID,
  rows_affected INTEGER DEFAULT 0,
  actor_email TEXT
);

-- Ensure columns exist if table was created by a prior migration without them
ALTER TABLE public.import_logs
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS cycle_id UUID,
  ADD COLUMN IF NOT EXISTS rows_affected INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actor_email TEXT;

CREATE INDEX IF NOT EXISTS idx_import_logs_periodo ON public.import_logs (periodo);
CREATE INDEX IF NOT EXISTS idx_import_logs_created_at ON public.import_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_logs_level ON public.import_logs (level);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "import_logs_auth" ON public.import_logs;
CREATE POLICY "import_logs_auth" ON public.import_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "import_logs_service" ON public.import_logs;
CREATE POLICY "import_logs_service" ON public.import_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 4. CYCLE LOCK ENFORCEMENT — add closed_at, closure_notes columns ────────

ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_by_email TEXT,
  ADD COLUMN IF NOT EXISTS closure_notes TEXT,
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- ─── 5. CYCLE CLOSURE HISTORY TABLE ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cycle_closure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  periodo TEXT NOT NULL,
  action TEXT NOT NULL, -- fechado | reaberto
  actor_email TEXT NOT NULL,
  actor_name TEXT,
  notes TEXT,
  snapshot JSONB
);

CREATE INDEX IF NOT EXISTS idx_closure_history_periodo ON public.cycle_closure_history (periodo);

ALTER TABLE public.cycle_closure_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "closure_history_auth" ON public.cycle_closure_history;
CREATE POLICY "closure_history_auth" ON public.cycle_closure_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "closure_history_service" ON public.cycle_closure_history;
CREATE POLICY "closure_history_service" ON public.cycle_closure_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. PRE-REGISTERED USERS WHITELIST ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pre_registered_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'Coordenador',
  cargo_id UUID,
  squad TEXT,
  squads TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  status_usuario TEXT DEFAULT 'ativo',
  nivel TEXT DEFAULT 'Junior',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_pre_registered_email ON public.pre_registered_users (email);

ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pre_reg_auth" ON public.pre_registered_users;
CREATE POLICY "pre_reg_auth" ON public.pre_registered_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "pre_reg_service" ON public.pre_registered_users;
CREATE POLICY "pre_reg_service" ON public.pre_registered_users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed known admin/coordinator emails into whitelist
INSERT INTO public.pre_registered_users (email, full_name, role, is_active, status_usuario)
VALUES
  ('brunaramos1807@gmail.com', 'Bruna Ramos', 'Admin', true, 'ativo'),
  ('bruna.silva@zetti.tech', 'Bruna Silva', 'Admin', true, 'ativo'),
  ('admin@zetti.com.br', 'Administrador Zetti', 'Admin', true, 'ativo')
ON CONFLICT (email) DO UPDATE SET
  is_active = true,
  status_usuario = 'ativo',
  role = EXCLUDED.role,
  updated_at = NOW();

-- ─── 7. USER PROFILES TABLE (ensure exists with correct schema) ───────────────

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Coordenador',
  cargo_id UUID,
  squad TEXT,
  squads TEXT[] DEFAULT '{}',
  equipes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  status_usuario TEXT DEFAULT 'ativo',
  nivel TEXT DEFAULT 'Junior',
  avatar_url TEXT
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_own" ON public.user_profiles;
CREATE POLICY "user_profiles_own" ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "user_profiles_service" ON public.user_profiles;
CREATE POLICY "user_profiles_service" ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 8. PERMISSION LOGS TABLE ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.permission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT
);

ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perm_logs_auth" ON public.permission_logs;
CREATE POLICY "perm_logs_auth" ON public.permission_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "perm_logs_service" ON public.permission_logs;
CREATE POLICY "perm_logs_service" ON public.permission_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 9. STRATEGIC INDICATORS TABLE ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  periodo TEXT NOT NULL,
  analista TEXT,
  squad TEXT,
  tipo TEXT NOT NULL, -- qa | iepc | nc | elogio
  valor NUMERIC,
  meta NUMERIC,
  observacao TEXT,
  source TEXT DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_strategic_indicators_periodo ON public.strategic_indicators (periodo);

ALTER TABLE public.strategic_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "si_auth" ON public.strategic_indicators;
CREATE POLICY "si_auth" ON public.strategic_indicators FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "si_service" ON public.strategic_indicators;
CREATE POLICY "si_service" ON public.strategic_indicators FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 10. MANUAL EVALUATIONS TABLE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.manual_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  periodo TEXT NOT NULL,
  analista TEXT NOT NULL,
  squad TEXT,
  tipo TEXT NOT NULL, -- qa | iepc | nc | elogio
  valor NUMERIC,
  descricao TEXT,
  source TEXT DEFAULT 'manual',
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_manual_evals_periodo ON public.manual_evaluations (periodo);

ALTER TABLE public.manual_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "me_auth" ON public.manual_evaluations;
CREATE POLICY "me_auth" ON public.manual_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "me_service" ON public.manual_evaluations;
CREATE POLICY "me_service" ON public.manual_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 11. REFRESH CYCLE SUMMARY FUNCTION (idempotent) ─────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_cycle_summary(p_periodo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_analistas INTEGER;
  v_qa_media NUMERIC;
  v_iepc_media NUMERIC;
  v_total_ncs INTEGER;
  v_total_elogios INTEGER;
BEGIN
  SELECT
    COUNT(DISTINCT analista),
    COALESCE(AVG(nota_final_qa), 0),
    COALESCE(AVG(iepc_total), 0),
    COALESCE(SUM(total_ncs), 0)
  INTO v_total_analistas, v_qa_media, v_iepc_media, v_total_ncs
  FROM public.cycle_scores
  WHERE periodo = p_periodo;

  SELECT COUNT(*) INTO v_total_elogios
  FROM public.elogios
  WHERE periodo = p_periodo;

  INSERT INTO public.cycle_summaries (
    periodo, total_analistas, qa_media, iepc_media,
    total_ncs, total_elogios, updated_at
  )
  VALUES (
    p_periodo, v_total_analistas,
    ROUND(v_qa_media, 2), ROUND(v_iepc_media, 2),
    v_total_ncs, v_total_elogios, NOW()
  )
  ON CONFLICT (periodo) DO UPDATE SET
    total_analistas = EXCLUDED.total_analistas,
    qa_media        = EXCLUDED.qa_media,
    iepc_media      = EXCLUDED.iepc_media,
    total_ncs       = EXCLUDED.total_ncs,
    total_elogios   = EXCLUDED.total_elogios,
    updated_at      = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO service_role;

-- ─── 12. TRIGGER: auto-refresh summary after cycle_scores insert/update ───────

CREATE OR REPLACE FUNCTION public.trg_refresh_summary_on_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_cycle_summary(NEW.periodo);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cycle_scores_refresh_summary ON public.cycle_scores;
CREATE TRIGGER trg_cycle_scores_refresh_summary
  AFTER INSERT OR UPDATE ON public.cycle_scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_summary_on_score();

-- ─── 13. TRIGGER: block imports on closed cycles ──────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_block_import_on_closed_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_closed BOOLEAN;
BEGIN
  SELECT is_closed INTO v_is_closed
  FROM public.import_cycles
  WHERE periodo = NEW.periodo;

  IF v_is_closed = true THEN
    RAISE EXCEPTION 'Ciclo % está fechado. Importação bloqueada. Somente um administrador pode reabrir o ciclo.', NEW.periodo;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_import_cycle_scores ON public.cycle_scores;
CREATE TRIGGER trg_block_import_cycle_scores
  BEFORE INSERT OR UPDATE ON public.cycle_scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_import_on_closed_cycle();

DROP TRIGGER IF EXISTS trg_block_import_nc_records ON public.nc_records;
CREATE TRIGGER trg_block_import_nc_records
  BEFORE INSERT OR UPDATE ON public.nc_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_import_on_closed_cycle();

DROP TRIGGER IF EXISTS trg_block_import_elogios ON public.elogios;
CREATE TRIGGER trg_block_import_elogios
  BEFORE INSERT OR UPDATE ON public.elogios
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_import_on_closed_cycle();

-- ─── 14. ENSURE nc_records has cycle_id column with FK ───────────────────────

ALTER TABLE public.nc_records
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.cycle_scores
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL;

ALTER TABLE public.elogios
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL;

-- ─── 15. ENSURE cycle_summaries has all required columns ─────────────────────

ALTER TABLE public.cycle_summaries
  ADD COLUMN IF NOT EXISTS total_analistas INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qa_media NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iepc_media NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ncs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_elogios INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── 16. FINAL RLS RESET — clean slate for all core tables ───────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'import_cycles','cycle_scores','nc_records','elogios',
        'cycle_summaries','pdi_records','analistas','analyst_profiles',
        'import_logs','pre_registered_users','user_profiles',
        'permission_logs','strategic_indicators','manual_evaluations',
        'cycle_closure_history'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Recreate clean policies
ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_auth" ON public.import_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ic_anon" ON public.import_cycles FOR SELECT TO anon USING (true);
CREATE POLICY "ic_svc"  ON public.import_cycles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_auth" ON public.cycle_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cs_anon" ON public.cycle_scores FOR SELECT TO anon USING (true);
CREATE POLICY "cs_svc"  ON public.cycle_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nc_auth" ON public.nc_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nc_anon" ON public.nc_records FOR SELECT TO anon USING (true);
CREATE POLICY "nc_svc"  ON public.nc_records FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "el_auth" ON public.elogios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "el_anon" ON public.elogios FOR SELECT TO anon USING (true);
CREATE POLICY "el_svc"  ON public.elogios FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.cycle_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csum_auth" ON public.cycle_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "csum_anon" ON public.cycle_summaries FOR SELECT TO anon USING (true);
CREATE POLICY "csum_svc"  ON public.cycle_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "il_auth" ON public.import_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "il_svc"  ON public.import_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pru_auth" ON public.pre_registered_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "pru_svc"  ON public.pre_registered_users FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up_auth" ON public.user_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "up_svc"  ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pl_auth" ON public.permission_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pl_svc"  ON public.permission_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.strategic_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_auth2" ON public.strategic_indicators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "si_svc2"  ON public.strategic_indicators FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.manual_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "me_auth2" ON public.manual_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "me_svc2"  ON public.manual_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.cycle_closure_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cch_auth" ON public.cycle_closure_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cch_svc"  ON public.cycle_closure_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pdi_records
ALTER TABLE public.pdi_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdi_auth" ON public.pdi_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pdi_svc"  ON public.pdi_records FOR ALL TO service_role USING (true) WITH CHECK (true);
