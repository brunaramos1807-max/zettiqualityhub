-- ============================================================
-- QUALIVISAO-REFATORACAO-V4
-- Migration: Add severidade + penalidade to nc_records
-- Safe: NO data deletion, NO recalculation, backward compatible
-- ============================================================

-- 1. Add severidade column (nullable — legacy records will be NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nc_records' AND column_name = 'severidade'
  ) THEN
    ALTER TABLE public.nc_records ADD COLUMN severidade TEXT DEFAULT NULL;
    COMMENT ON COLUMN public.nc_records.severidade IS 'Severidade oficial: Leve=3 / Média=5 / Grave=10 / Crítica=15. NULL = Histórico Legado.';
  END IF;
END $$;

-- 2. Add penalidade column (nullable — legacy records keep pontos_deduzidos)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nc_records' AND column_name = 'penalidade'
  ) THEN
    ALTER TABLE public.nc_records ADD COLUMN penalidade NUMERIC(6,2) DEFAULT NULL;
    COMMENT ON COLUMN public.nc_records.penalidade IS 'Penalidade pertence à severidade: Leve=3 / Média=5 / Grave=10 / Crítica=15. A regra -20 foi removida.';
  END IF;
END $$;

-- 3. Remove the -20 default from pontos_deduzidos (keep column for backward compat)
-- We only change the DEFAULT — existing data is untouched
ALTER TABLE public.nc_records ALTER COLUMN pontos_deduzidos SET DEFAULT NULL;

-- 4. Add comment to clarify backward compatibility
COMMENT ON TABLE public.nc_records IS 'NC records. Legacy records have pontos_deduzidos only. New records use severidade + penalidade. severidade NULL = Histórico Legado.';

-- 5. Create index for severidade queries
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'nc_records' AND indexname = 'idx_nc_records_severidade'
  ) THEN
    CREATE INDEX idx_nc_records_severidade ON public.nc_records(severidade);
  END IF;
END $$;
