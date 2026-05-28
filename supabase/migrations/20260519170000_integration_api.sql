-- ============================================================
-- QUALIVISÃO — Integration API: receber-avaliacao
-- 20260519170000_integration_api.sql
-- ============================================================

-- ─── 1. integration_tokens — stores valid bearer tokens ──────────────────────
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL DEFAULT 'Lovable Integration',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ
);

ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_integration_tokens" ON public.integration_tokens;
CREATE POLICY "service_role_integration_tokens"
  ON public.integration_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 2. integration_request_logs — audit log for every API call ──────────────
CREATE TABLE IF NOT EXISTS public.integration_request_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source          TEXT NOT NULL DEFAULT 'lovable',
  periodo         TEXT,
  analista        TEXT,
  squad           TEXT,
  status          TEXT NOT NULL DEFAULT 'received',
  error_message   TEXT,
  payload_hash    TEXT,
  ip_address      TEXT,
  duration_ms     INTEGER,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  raw_payload     JSONB
);

ALTER TABLE public.integration_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_integration_logs" ON public.integration_request_logs;
CREATE POLICY "service_role_integration_logs"
  ON public.integration_request_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_integration_logs" ON public.integration_request_logs;
CREATE POLICY "authenticated_read_integration_logs"
  ON public.integration_request_logs FOR SELECT
  TO authenticated
  USING (true);

-- ─── 3. pdi_records — PDI entries created/updated by the integration ─────────
CREATE TABLE IF NOT EXISTS public.pdi_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL,
  periodo         TEXT NOT NULL,
  analista        TEXT NOT NULL,
  squad           TEXT NOT NULL,
  coordenador     TEXT NOT NULL,
  status_pdi      TEXT NOT NULL DEFAULT 'Em andamento',
  acoes           JSONB NOT NULL DEFAULT '[]',
  metas           JSONB NOT NULL DEFAULT '[]',
  evidencias      JSONB NOT NULL DEFAULT '[]',
  feedback        TEXT,
  nc_reincidentes JSONB NOT NULL DEFAULT '[]',
  qa_score        NUMERIC DEFAULT 0,
  iepc_score      NUMERIC DEFAULT 0,
  sintese_ia      TEXT,
  source          TEXT NOT NULL DEFAULT 'integration',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pdi_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_pdi_records" ON public.pdi_records;
CREATE POLICY "authenticated_read_pdi_records"
  ON public.pdi_records FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_pdi_records" ON public.pdi_records;
CREATE POLICY "service_role_pdi_records"
  ON public.pdi_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 4. Add integration-specific columns to cycle_scores ─────────────────────
ALTER TABLE public.cycle_scores
  ADD COLUMN IF NOT EXISTS sintese_ia TEXT,
  ADD COLUMN IF NOT EXISTS tendencias JSONB,
  ADD COLUMN IF NOT EXISTS reincidencia JSONB,
  ADD COLUMN IF NOT EXISTS criterios JSONB,
  ADD COLUMN IF NOT EXISTS evidencias JSONB,
  ADD COLUMN IF NOT EXISTS analytics JSONB,
  ADD COLUMN IF NOT EXISTS tipo_demanda TEXT,
  ADD COLUMN IF NOT EXISTS qtd_atendimentos_avaliados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- ─── 5. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_integration_logs_periodo
  ON public.integration_request_logs (periodo);

CREATE INDEX IF NOT EXISTS idx_integration_logs_status
  ON public.integration_request_logs (status);

CREATE INDEX IF NOT EXISTS idx_integration_logs_received_at
  ON public.integration_request_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdi_records_periodo_analista
  ON public.pdi_records (periodo, analista);

CREATE INDEX IF NOT EXISTS idx_pdi_records_cycle_id
  ON public.pdi_records (cycle_id);

-- Unique index to prevent duplicate PDI per analista per periodo
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdi_records_unique_analista_periodo
  ON public.pdi_records (analista, periodo);

-- ─── 6. Seed a default integration token (hash of "qualivisao-lovable-token") ─
-- The actual token value is: qualivisao-lovable-token-2026
-- Store only the SHA256 hash for security
DO $$
BEGIN
  INSERT INTO public.integration_tokens (token_hash, label, is_active)
  VALUES (
    encode(sha256('qualivisao-lovable-token-2026'::bytea), 'hex'),
    'Lovable Default Token',
    true
  )
  ON CONFLICT (token_hash) DO NOTHING;
END $$;
