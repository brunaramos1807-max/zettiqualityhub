-- Add missing columns to pdi_records table
-- Fixes: "Could not find the 'objetivo' column of 'pdi_records'"
-- Adds all new fields required by the PDI form

ALTER TABLE public.pdi_records
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS prazo TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS evolucao_tecnica TEXT,
  ADD COLUMN IF NOT EXISTS evolucao_comportamental TEXT,
  ADD COLUMN IF NOT EXISTS performance_operacional TEXT,
  ADD COLUMN IF NOT EXISTS risco_operacional TEXT,
  ADD COLUMN IF NOT EXISTS plano_desenvolvimento TEXT,
  ADD COLUMN IF NOT EXISTS proxima_revisao TEXT,
  ADD COLUMN IF NOT EXISTS ciclo TEXT;

-- Refresh schema cache by updating a comment
COMMENT ON TABLE public.pdi_records IS 'PDI records with extended fields - updated 20260520200000';
