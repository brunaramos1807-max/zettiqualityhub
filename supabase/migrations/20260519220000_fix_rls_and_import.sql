-- ============================================================
-- QUALIVISÃO — Critical Fix: RLS Policies + Import Persistence
-- 20260519220000_fix_rls_and_import.sql
-- ============================================================

-- ─── 1. Drop ALL existing policies on core tables (nuclear reset) ─────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('import_cycles','cycle_scores','nc_records','elogios','cycle_summaries','pdi_records','analistas','analyst_profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ─── 2. Recreate RLS policies — allow ALL authenticated users full access ─────

-- import_cycles
ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_all_auth" ON public.import_cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ic_all_anon" ON public.import_cycles FOR SELECT TO anon USING (true);
CREATE POLICY "ic_service" ON public.import_cycles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- cycle_scores
ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_all_auth" ON public.cycle_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cs_all_anon" ON public.cycle_scores FOR SELECT TO anon USING (true);
CREATE POLICY "cs_service" ON public.cycle_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- nc_records
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nc_all_auth" ON public.nc_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nc_all_anon" ON public.nc_records FOR SELECT TO anon USING (true);
CREATE POLICY "nc_service" ON public.nc_records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- elogios
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "el_all_auth" ON public.elogios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "el_all_anon" ON public.elogios FOR SELECT TO anon USING (true);
CREATE POLICY "el_service" ON public.elogios FOR ALL TO service_role USING (true) WITH CHECK (true);

-- cycle_summaries
ALTER TABLE public.cycle_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csum_all_auth" ON public.cycle_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "csum_all_anon" ON public.cycle_summaries FOR SELECT TO anon USING (true);
CREATE POLICY "csum_service" ON public.cycle_summaries FOR ALL TO service_role USING (true) WITH CHECK (true);

-- pdi_records
ALTER TABLE public.pdi_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdi_all_auth" ON public.pdi_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pdi_service" ON public.pdi_records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- analistas
ALTER TABLE public.analistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "an_all_auth" ON public.analistas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "an_all_anon" ON public.analistas FOR SELECT TO anon USING (true);
CREATE POLICY "an_service" ON public.analistas FOR ALL TO service_role USING (true) WITH CHECK (true);

-- analyst_profiles
ALTER TABLE public.analyst_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ap_all_auth" ON public.analyst_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ap_all_anon" ON public.analyst_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "ap_service" ON public.analyst_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 3. Ensure UNIQUE constraints exist ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.import_cycles'::regclass AND contype = 'u' AND conname = 'import_cycles_periodo_key'
  ) THEN
    ALTER TABLE public.import_cycles ADD CONSTRAINT import_cycles_periodo_key UNIQUE (periodo);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cycle_summaries'::regclass AND contype = 'u' AND conname = 'cycle_summaries_periodo_key'
  ) THEN
    ALTER TABLE public.cycle_summaries ADD CONSTRAINT cycle_summaries_periodo_key UNIQUE (periodo);
  END IF;
END $$;

-- ─── 4. Fix analistas table — make email nullable with no unique constraint conflict ──

-- Drop the unique constraint on email if it causes issues with null values
-- PostgreSQL allows multiple NULLs in a UNIQUE column, so this is fine
-- But we need to ensure upsert by nome works when email is null

-- Add a unique index on nome for upsert fallback
CREATE UNIQUE INDEX IF NOT EXISTS analistas_nome_unique_idx ON public.analistas (nome)
  WHERE email IS NULL;

-- ─── 5. Recreate refresh_cycle_summary function ───────────────────────────────

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

  INSERT INTO public.cycle_summaries (periodo, total_analistas, qa_media, iepc_media, total_ncs, total_elogios, updated_at)
  VALUES (p_periodo, v_total_analistas, ROUND(v_qa_media, 2), ROUND(v_iepc_media, 2), v_total_ncs, v_total_elogios, NOW())
  ON CONFLICT (periodo) DO UPDATE SET
    total_analistas = EXCLUDED.total_analistas,
    qa_media = EXCLUDED.qa_media,
    iepc_media = EXCLUDED.iepc_media,
    total_ncs = EXCLUDED.total_ncs,
    total_elogios = EXCLUDED.total_elogios,
    updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_cycle_summary(TEXT) TO service_role;

-- ─── 6. Ensure import_cycles has all required columns ────────────────────────

ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS data_type TEXT DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- ─── 7. Ensure analistas table has all required columns ──────────────────────

ALTER TABLE public.analistas
  ADD COLUMN IF NOT EXISTS data_admissao DATE,
  ADD COLUMN IF NOT EXISTS aniversario DATE,
  ADD COLUMN IF NOT EXISTS tempo_empresa_calculado TEXT,
  ADD COLUMN IF NOT EXISTS tempo_empresa_meses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_promocao DATE,
  ADD COLUMN IF NOT EXISTS cargo_operacional TEXT,
  ADD COLUMN IF NOT EXISTS equipe TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;
