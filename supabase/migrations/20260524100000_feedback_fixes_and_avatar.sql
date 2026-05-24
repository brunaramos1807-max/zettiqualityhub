-- Add foto_url to analistas table if not exists
ALTER TABLE public.analistas ADD COLUMN IF NOT EXISTS foto_url text;

-- Add missing columns to feedback_atendimentos for full detail display
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS sup text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS duracao text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS canal text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS solucao text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS sintese text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS comportamento text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS criterios jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS evidencias text;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS ncs jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.feedback_atendimentos ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Add evolucao_tecnica and evolucao_comportamental to feedbacks table
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS evolucao_tecnica text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS evolucao_comportamental text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS risco_operacional text;

-- Add missing PDI status values - alter the enum to include nao_iniciado, parcial, atrasado
-- First check if we need to add values to the pdi_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'nao_iniciado' AND enumtypid = 'pdi_status'::regtype) THEN
    ALTER TYPE pdi_status ADD VALUE IF NOT EXISTS 'nao_iniciado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'parcial' AND enumtypid = 'pdi_status'::regtype) THEN
    ALTER TYPE pdi_status ADD VALUE IF NOT EXISTS 'parcial';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'atrasado' AND enumtypid = 'pdi_status'::regtype) THEN
    ALTER TYPE pdi_status ADD VALUE IF NOT EXISTS 'atrasado';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add responsavel, ciclo_origem, evidencia, ultima_atualizacao to feedback_pdi
ALTER TABLE public.feedback_pdi ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.feedback_pdi ADD COLUMN IF NOT EXISTS ciclo_origem text;
ALTER TABLE public.feedback_pdi ADD COLUMN IF NOT EXISTS evidencia text;

-- Create analistas-avatar storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analistas-avatar',
  'analistas-avatar',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for analistas-avatar bucket
DO $$
BEGIN
  -- Allow public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analistas_avatar_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "analistas_avatar_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'analistas-avatar');
  END IF;
  -- Allow authenticated upload
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analistas_avatar_auth_upload' AND tablename = 'objects') THEN
    CREATE POLICY "analistas_avatar_auth_upload" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'analistas-avatar');
  END IF;
  -- Allow authenticated update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analistas_avatar_auth_update' AND tablename = 'objects') THEN
    CREATE POLICY "analistas_avatar_auth_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'analistas-avatar');
  END IF;
  -- Allow authenticated delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'analistas_avatar_auth_delete' AND tablename = 'objects') THEN
    CREATE POLICY "analistas_avatar_auth_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'analistas-avatar');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
