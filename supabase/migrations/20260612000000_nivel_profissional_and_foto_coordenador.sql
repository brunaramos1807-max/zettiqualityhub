-- Migration: Add nivel_profissional to analistas and foto_url to user_profiles
-- Timestamp: 20260612000000

-- Add nivel_profissional column to analistas
ALTER TABLE public.analistas
ADD COLUMN IF NOT EXISTS nivel_profissional TEXT DEFAULT 'Júnior I';

-- Add foto_url to analistas if not exists (for coordinator photos)
ALTER TABLE public.analistas
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Add foto_url to user_profiles for coordinator photo upload
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Index for nivel_profissional
CREATE INDEX IF NOT EXISTS idx_analistas_nivel_profissional ON public.analistas(nivel_profissional);
