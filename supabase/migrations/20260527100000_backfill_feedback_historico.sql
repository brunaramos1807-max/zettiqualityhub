-- Migration: Backfill feedback_historico from existing feedbacks + fix unique constraint
-- Ensures all existing feedbacks appear in the history chart for each analyst

-- 1. Ensure feedback_historico has the correct unique constraint
-- The table already has UNIQUE(analista_id, ciclo) from previous migration
-- Just ensure it exists as an index
CREATE UNIQUE INDEX IF NOT EXISTS feedback_historico_analista_ciclo_idx
  ON public.feedback_historico (analista_id, ciclo);

-- 2. Backfill feedback_historico from existing feedbacks table
-- This fixes Fernando's 04/2026 feedback not appearing in 05/2026 history
DO $$
BEGIN
  INSERT INTO public.feedback_historico (analista_id, feedback_id, ciclo, qa_score, iepc_score, aderencia_score)
  SELECT
    f.analista_id,
    f.id AS feedback_id,
    f.ciclo,
    f.qa_score,
    f.iepc_score,
    f.aderencia_score
  FROM public.feedbacks f
  WHERE f.analista_id IS NOT NULL
    AND f.ciclo IS NOT NULL
  ON CONFLICT (analista_id, ciclo) DO UPDATE
    SET qa_score = EXCLUDED.qa_score,
        iepc_score = EXCLUDED.iepc_score,
        aderencia_score = EXCLUDED.aderencia_score,
        feedback_id = EXCLUDED.feedback_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill feedback_historico: %', SQLERRM;
END $$;

-- 3. Ensure anon can read feedback_historico (needed for public token page)
ALTER TABLE public.feedback_historico ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_historico' AND policyname = 'anon_read_feedback_historico_v3'
  ) THEN
    CREATE POLICY anon_read_feedback_historico_v3 ON public.feedback_historico
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_historico' AND policyname = 'auth_all_feedback_historico_v3'
  ) THEN
    CREATE POLICY auth_all_feedback_historico_v3 ON public.feedback_historico
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Ensure elogios table allows anon read (for public token page)
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'elogios' AND policyname = 'anon_read_elogios_v3'
  ) THEN
    CREATE POLICY anon_read_elogios_v3 ON public.elogios
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 5. Ensure nc_records allows anon read
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nc_records' AND policyname = 'anon_read_nc_records_v3'
  ) THEN
    CREATE POLICY anon_read_nc_records_v3 ON public.nc_records
      FOR SELECT TO anon USING (true);
  END IF;
END $$;
