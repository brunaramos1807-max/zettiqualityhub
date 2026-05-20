-- Migration: app_settings table for storing system-wide settings (e.g. active cycle)
-- Timestamp: 20260520000000

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
DROP POLICY IF EXISTS "app_settings_read" ON public.app_settings;
CREATE POLICY "app_settings_read"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to read settings (anon too, for SSR)
DROP POLICY IF EXISTS "app_settings_read_anon" ON public.app_settings;
CREATE POLICY "app_settings_read_anon"
  ON public.app_settings
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to upsert settings (admin-only enforced at app level)
DROP POLICY IF EXISTS "app_settings_upsert" ON public.app_settings;
CREATE POLICY "app_settings_upsert"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default active_cycle key (empty = use latest by calendar)
INSERT INTO public.app_settings (key, value)
VALUES ('active_cycle', '')
ON CONFLICT (key) DO NOTHING;
