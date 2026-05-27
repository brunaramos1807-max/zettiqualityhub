-- PDI Enterprise Schema Migration
-- Adds new fields for feedback PDI block, objectives checklist, timeline, new statuses

-- 1. Add new columns to pdi_records for enterprise features
ALTER TABLE public.pdi_records
  ADD COLUMN IF NOT EXISTS feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS analista_id UUID REFERENCES public.analistas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aderencia_score NUMERIC,
  ADD COLUMN IF NOT EXISTS total_ncs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_elogios INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS objetivo_desenvolvimento TEXT,
  ADD COLUMN IF NOT EXISTS acao_desenvolvimento TEXT,
  ADD COLUMN IF NOT EXISTS resultado_esperado TEXT,
  ADD COLUMN IF NOT EXISTS mensagem_evolutiva TEXT,
  ADD COLUMN IF NOT EXISTS comentario_coordenador TEXT,
  ADD COLUMN IF NOT EXISTS comentario_analista TEXT,
  ADD COLUMN IF NOT EXISTS data_acompanhamento DATE,
  ADD COLUMN IF NOT EXISTS proxima_revisao_date DATE,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Update status_pdi to allow new enterprise statuses
-- We use a text column so we can add new values without altering enum
-- The existing column is already TEXT type, so just document new values:
-- 'aguardando alinhamento', 'em evolucao', 'em acompanhamento', 'em validacao',
-- 'consolidado', 'evolucao concluida', 'reincidente'
-- (old values kept for backward compat)

-- 3. Create pdi_objectives table for checklist-based progress
CREATE TABLE IF NOT EXISTS public.pdi_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES public.pdi_records(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  peso INTEGER DEFAULT 1,
  status TEXT DEFAULT 'nao_cumprido' CHECK (status IN ('cumprido', 'parcial', 'nao_cumprido')),
  observacao_coordenador TEXT,
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create pdi_timeline table for evolutionary timeline
CREATE TABLE IF NOT EXISTS public.pdi_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_id UUID NOT NULL REFERENCES public.pdi_records(id) ON DELETE CASCADE,
  data_evento DATE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'evento' CHECK (tipo IN ('criacao', 'atualizacao', 'melhoria', 'validacao', 'conclusao', 'evento')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS for new tables
ALTER TABLE public.pdi_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_pdi_objectives" ON public.pdi_objectives;
CREATE POLICY "anon_all_pdi_objectives" ON public.pdi_objectives FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_all_pdi_timeline" ON public.pdi_timeline;
CREATE POLICY "anon_all_pdi_timeline" ON public.pdi_timeline FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Grant permissions
GRANT ALL ON public.pdi_objectives TO anon;
GRANT ALL ON public.pdi_timeline TO anon;

COMMENT ON TABLE public.pdi_records IS 'PDI records - enterprise version with objectives and timeline - 20260527300000';
COMMENT ON TABLE public.pdi_objectives IS 'PDI checklist objectives for progress tracking';
COMMENT ON TABLE public.pdi_timeline IS 'PDI evolutionary timeline events';
