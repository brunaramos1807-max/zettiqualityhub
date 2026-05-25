-- ============================================================
-- Migration: Fix RLS + Add missing columns for new payload
-- ============================================================

-- 1. Add missing columns to feedback_atendimentos for new payload
ALTER TABLE public.feedback_atendimentos
  ADD COLUMN IF NOT EXISTS sup TEXT,
  ADD COLUMN IF NOT EXISTS solucao TEXT,
  ADD COLUMN IF NOT EXISTS sintese TEXT,
  ADD COLUMN IF NOT EXISTS duracao TEXT,
  ADD COLUMN IF NOT EXISTS ncs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS criterios_raw JSONB;

-- 2. Add missing columns to feedbacks for new payload
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS auditor TEXT,
  ADD COLUMN IF NOT EXISTS aderencia_score NUMERIC;

-- 3. Add feedback_historico table if not exists
CREATE TABLE IF NOT EXISTS public.feedback_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id UUID REFERENCES public.analistas(id) ON DELETE CASCADE,
  ciclo TEXT NOT NULL,
  qa_score NUMERIC DEFAULT 0,
  iepc_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(analista_id, ciclo)
);

-- 4. RLS policies for feedback_historico
ALTER TABLE public.feedback_historico ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_historico' AND policyname = 'anon_read_feedback_historico'
  ) THEN
    CREATE POLICY anon_read_feedback_historico ON public.feedback_historico
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_historico' AND policyname = 'auth_all_feedback_historico'
  ) THEN
    CREATE POLICY auth_all_feedback_historico ON public.feedback_historico
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Ensure RLS policies exist for feedbacks
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedbacks' AND policyname = 'anon_read_feedbacks_v2'
  ) THEN
    CREATE POLICY anon_read_feedbacks_v2 ON public.feedbacks
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedbacks' AND policyname = 'auth_all_feedbacks_v2'
  ) THEN
    CREATE POLICY auth_all_feedbacks_v2 ON public.feedbacks
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. Ensure RLS policies exist for feedback_atendimentos
ALTER TABLE public.feedback_atendimentos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_atendimentos' AND policyname = 'anon_read_feedback_atendimentos_v2'
  ) THEN
    CREATE POLICY anon_read_feedback_atendimentos_v2 ON public.feedback_atendimentos
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_atendimentos' AND policyname = 'auth_all_feedback_atendimentos_v2'
  ) THEN
    CREATE POLICY auth_all_feedback_atendimentos_v2 ON public.feedback_atendimentos
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Ensure RLS policies exist for feedback_coaching
ALTER TABLE public.feedback_coaching ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_coaching' AND policyname = 'anon_read_feedback_coaching_v2'
  ) THEN
    CREATE POLICY anon_read_feedback_coaching_v2 ON public.feedback_coaching
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_coaching' AND policyname = 'auth_all_feedback_coaching_v2'
  ) THEN
    CREATE POLICY auth_all_feedback_coaching_v2 ON public.feedback_coaching
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Ensure RLS policies exist for feedback_pdi
ALTER TABLE public.feedback_pdi ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_pdi' AND policyname = 'anon_read_feedback_pdi_v2'
  ) THEN
    CREATE POLICY anon_read_feedback_pdi_v2 ON public.feedback_pdi
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feedback_pdi' AND policyname = 'auth_all_feedback_pdi_v2'
  ) THEN
    CREATE POLICY auth_all_feedback_pdi_v2 ON public.feedback_pdi
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 9. Ensure RLS for analistas
ALTER TABLE public.analistas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analistas' AND policyname = 'anon_read_analistas_v2'
  ) THEN
    CREATE POLICY anon_read_analistas_v2 ON public.analistas
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'analistas' AND policyname = 'auth_all_analistas_v2'
  ) THEN
    CREATE POLICY auth_all_analistas_v2 ON public.analistas
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 10. Ensure RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'anon_read_user_profiles_v2'
  ) THEN
    CREATE POLICY anon_read_user_profiles_v2 ON public.user_profiles
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'auth_all_user_profiles_v2'
  ) THEN
    CREATE POLICY auth_all_user_profiles_v2 ON public.user_profiles
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 11. Ensure RLS for cargos
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cargos' AND policyname = 'anon_read_cargos_v2'
  ) THEN
    CREATE POLICY anon_read_cargos_v2 ON public.cargos
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cargos' AND policyname = 'auth_all_cargos_v2'
  ) THEN
    CREATE POLICY auth_all_cargos_v2 ON public.cargos
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 12. Ensure RLS for user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'anon_read_user_permissions_v2'
  ) THEN
    CREATE POLICY anon_read_user_permissions_v2 ON public.user_permissions
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_permissions' AND policyname = 'auth_all_user_permissions_v2'
  ) THEN
    CREATE POLICY auth_all_user_permissions_v2 ON public.user_permissions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 13. Ensure RLS for nc_records
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nc_records' AND policyname = 'anon_read_nc_records_v2'
  ) THEN
    CREATE POLICY anon_read_nc_records_v2 ON public.nc_records
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'nc_records' AND policyname = 'auth_all_nc_records_v2'
  ) THEN
    CREATE POLICY auth_all_nc_records_v2 ON public.nc_records
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 14. Ensure RLS for elogios
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'elogios' AND policyname = 'anon_read_elogios_v2'
  ) THEN
    CREATE POLICY anon_read_elogios_v2 ON public.elogios
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'elogios' AND policyname = 'auth_all_elogios_v2'
  ) THEN
    CREATE POLICY auth_all_elogios_v2 ON public.elogios
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 15. Ensure RLS for cycle_scores
ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cycle_scores' AND policyname = 'anon_read_cycle_scores_v2'
  ) THEN
    CREATE POLICY anon_read_cycle_scores_v2 ON public.cycle_scores
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cycle_scores' AND policyname = 'auth_all_cycle_scores_v2'
  ) THEN
    CREATE POLICY auth_all_cycle_scores_v2 ON public.cycle_scores
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
