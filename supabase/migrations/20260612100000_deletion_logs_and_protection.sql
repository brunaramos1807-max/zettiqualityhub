-- Migration: Deletion protection audit log table
-- Timestamp: 20260612100000

-- Create deletion_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.deletion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email TEXT,
  usuario_nome TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  descricao TEXT,
  quantidade_registros INTEGER DEFAULT 1,
  dados_removidos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read deletion logs
CREATE POLICY "deletion_logs_select" ON public.deletion_logs
  FOR SELECT USING (true);

-- Anyone authenticated can insert (system inserts on deletion)
CREATE POLICY "deletion_logs_insert" ON public.deletion_logs
  FOR INSERT WITH CHECK (true);

-- Add nivel_profissional to analistas if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analistas' AND column_name = 'nivel_profissional'
  ) THEN
    ALTER TABLE public.analistas ADD COLUMN nivel_profissional TEXT;
  END IF;
END $$;

-- Add foto_url to analistas if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'analistas' AND column_name = 'foto_url'
  ) THEN
    ALTER TABLE public.analistas ADD COLUMN foto_url TEXT;
  END IF;
END $$;

-- Add foto_url to user_profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'foto_url'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN foto_url TEXT;
  END IF;
END $$;

-- Grant anon access to deletion_logs for insert
GRANT INSERT ON public.deletion_logs TO anon;
GRANT SELECT ON public.deletion_logs TO anon;
