-- Notion Knowledge Base Sync Tables
-- Safe to run multiple times (idempotent)

-- knowledge_sources: tracks each Notion database connection
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL DEFAULT 'notion',
  source_name TEXT NOT NULL,
  notion_database_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  records_synced INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_qa_criteria: QA criteria synced from Notion
CREATE TABLE IF NOT EXISTS public.knowledge_qa_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE,
  codigo TEXT,
  nome TEXT NOT NULL,
  pilar TEXT,
  peso NUMERIC,
  objetivo TEXT,
  o_que_avalia TEXT,
  como_avaliar TEXT,
  exemplos_aderencia TEXT,
  exemplos_nao_aderencia TEXT,
  impactos_operacao TEXT,
  indicadores_relacionados TEXT,
  ncs_relacionadas TEXT,
  nivel_impacto TEXT,
  possiveis_causas TEXT,
  possiveis_decisoes TEXT,
  treinamentos TEXT,
  riscos TEXT,
  sinais_alerta TEXT,
  ativo BOOLEAN DEFAULT true,
  versao INTEGER DEFAULT 1,
  updated_from_notion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_iepc_dimensions: IEPC dimensions synced from Notion
CREATE TABLE IF NOT EXISTS public.knowledge_iepc_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE,
  codigo TEXT,
  nome TEXT NOT NULL,
  objetivo TEXT,
  o_que_mede TEXT,
  indicadores_relacionados TEXT,
  nivel_impacto TEXT,
  possiveis_decisoes TEXT,
  treinamentos TEXT,
  sinais_alerta TEXT,
  ativo BOOLEAN DEFAULT true,
  updated_from_notion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_nc_types: NC types synced from Notion
CREATE TABLE IF NOT EXISTS public.knowledge_nc_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  exemplos TEXT,
  impactos_operacao TEXT,
  indicadores_relacionados TEXT,
  nivel_impacto TEXT,
  riscos TEXT,
  sinais_alerta TEXT,
  ativo BOOLEAN DEFAULT true,
  updated_from_notion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_training_recommendations: training recommendations
CREATE TABLE IF NOT EXISTS public.knowledge_training_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id TEXT UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT,
  criterios_relacionados TEXT,
  dimensoes_relacionadas TEXT,
  ncs_relacionadas TEXT,
  quando_recomendar TEXT,
  ativo BOOLEAN DEFAULT true,
  updated_from_notion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- knowledge_decision_rules: decision rules derived from knowledge base
CREATE TABLE IF NOT EXISTS public.knowledge_decision_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT,
  regra_tipo TEXT,
  condicao TEXT,
  recomendacao TEXT,
  prioridade INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only authenticated users can read knowledge tables
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_qa_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_iepc_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_nc_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_training_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_decision_rules ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'knowledge_sources_read') THEN
    CREATE POLICY knowledge_sources_read ON public.knowledge_sources FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'knowledge_sources_anon_read') THEN
    CREATE POLICY knowledge_sources_anon_read ON public.knowledge_sources FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_qa_criteria' AND policyname = 'knowledge_qa_criteria_read') THEN
    CREATE POLICY knowledge_qa_criteria_read ON public.knowledge_qa_criteria FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_qa_criteria' AND policyname = 'knowledge_qa_criteria_anon_read') THEN
    CREATE POLICY knowledge_qa_criteria_anon_read ON public.knowledge_qa_criteria FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_iepc_dimensions' AND policyname = 'knowledge_iepc_dimensions_read') THEN
    CREATE POLICY knowledge_iepc_dimensions_read ON public.knowledge_iepc_dimensions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_iepc_dimensions' AND policyname = 'knowledge_iepc_dimensions_anon_read') THEN
    CREATE POLICY knowledge_iepc_dimensions_anon_read ON public.knowledge_iepc_dimensions FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_nc_types' AND policyname = 'knowledge_nc_types_read') THEN
    CREATE POLICY knowledge_nc_types_read ON public.knowledge_nc_types FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_nc_types' AND policyname = 'knowledge_nc_types_anon_read') THEN
    CREATE POLICY knowledge_nc_types_anon_read ON public.knowledge_nc_types FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_training_recommendations' AND policyname = 'knowledge_training_read') THEN
    CREATE POLICY knowledge_training_read ON public.knowledge_training_recommendations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_training_recommendations' AND policyname = 'knowledge_training_anon_read') THEN
    CREATE POLICY knowledge_training_anon_read ON public.knowledge_training_recommendations FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_decision_rules' AND policyname = 'knowledge_decision_rules_read') THEN
    CREATE POLICY knowledge_decision_rules_read ON public.knowledge_decision_rules FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_decision_rules' AND policyname = 'knowledge_decision_rules_anon_read') THEN
    CREATE POLICY knowledge_decision_rules_anon_read ON public.knowledge_decision_rules FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- Seed default knowledge sources (Notion databases to sync)
INSERT INTO public.knowledge_sources (source_name, source_type, sync_status, is_active)
VALUES
  ('Critérios QA', 'notion', 'pending', true),
  ('Dimensões IEPC', 'notion', 'pending', true),
  ('Tipos de NC', 'notion', 'pending', true),
  ('Treinamentos', 'notion', 'pending', true)
ON CONFLICT DO NOTHING;
