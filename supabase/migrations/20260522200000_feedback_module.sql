-- ─── Feedback Module Migration ────────────────────────────────────────────────
-- Timestamp: 20260522200000

-- ─── ENUMS ────────────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.feedback_status CASCADE;
CREATE TYPE public.feedback_status AS ENUM ('draft', 'generated', 'reviewed', 'approved', 'sent');

DROP TYPE IF EXISTS public.pdi_status CASCADE;
CREATE TYPE public.pdi_status AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

DROP TYPE IF EXISTS public.atendimento_classificacao CASCADE;
CREATE TYPE public.atendimento_classificacao AS ENUM ('excelente', 'bom', 'regular', 'critico');

-- ─── TABELA PRINCIPAL: feedbacks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id UUID REFERENCES public.analistas(id) ON DELETE SET NULL,
  ciclo TEXT NOT NULL,
  periodo_inicio DATE,
  periodo_fim DATE,
  coordenador TEXT,
  equipe TEXT,

  -- Scores
  qa_score NUMERIC(5,2),
  iepc_score NUMERIC(5,2),
  aderencia_score NUMERIC(5,2),
  posicao_squad INTEGER,
  total_squad INTEGER,
  ciclos_consecutivos_evolucao INTEGER DEFAULT 0,

  -- Pilares QA (JSON array: [{nome, pontuacao, max, variacao, observacao}])
  pilares_qa JSONB DEFAULT '[]'::jsonb,
  -- Pilares IEPC
  pilares_iepc JSONB DEFAULT '[]'::jsonb,

  -- Pontos fortes e oportunidades
  pontos_fortes JSONB DEFAULT '[]'::jsonb,
  oportunidades JSONB DEFAULT '[]'::jsonb,

  -- Resumo e tendências
  resumo_ciclo TEXT,
  tendencias JSONB DEFAULT '{}'::jsonb,

  -- Conquistas
  conquistas JSONB DEFAULT '[]'::jsonb,

  -- Status e versionamento
  status public.feedback_status DEFAULT 'draft'::public.feedback_status,
  version INTEGER DEFAULT 1,
  updated_by TEXT,

  -- Snapshot completo do momento da geração
  snapshot_json_completo JSONB,

  -- Origem: 'api_lovable' | 'importacao_json' | 'manual'
  origem TEXT DEFAULT 'manual',

  -- Idempotência para API Lovable
  external_id TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_external_id ON public.feedbacks(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedbacks_analista_id ON public.feedbacks(analista_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_ciclo ON public.feedbacks(ciclo);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);

-- ─── TABELA: feedback_atendimentos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  protocolo TEXT,
  cliente TEXT,
  assunto TEXT,
  nota_qa NUMERIC(5,2),
  nota_iepc NUMERIC(5,2),
  classificacao public.atendimento_classificacao,
  observacao TEXT,
  link_gravacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_atendimentos_feedback_id ON public.feedback_atendimentos(feedback_id);

-- ─── TABELA: feedback_pdi ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_pdi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  analista_id UUID REFERENCES public.analistas(id) ON DELETE SET NULL,
  objetivo TEXT NOT NULL,
  acao_desenvolvimento TEXT,
  prazo DATE,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  status public.pdi_status DEFAULT 'pendente'::public.pdi_status,
  -- Histórico de acompanhamento mensal
  historico_acompanhamento JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_pdi_analista_id ON public.feedback_pdi(analista_id);
CREATE INDEX IF NOT EXISTS idx_feedback_pdi_feedback_id ON public.feedback_pdi(feedback_id);

-- ─── TABELA: feedback_coaching ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_coaching (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  o_que_foi_dito TEXT,
  como_poderia_ser TEXT,
  dica_de_ouro TEXT,
  contexto TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_coaching_feedback_id ON public.feedback_coaching(feedback_id);

-- ─── TABELA: feedback_historico ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analista_id UUID NOT NULL REFERENCES public.analistas(id) ON DELETE CASCADE,
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  ciclo TEXT NOT NULL,
  mes INTEGER,
  ano INTEGER,
  qa_score NUMERIC(5,2),
  iepc_score NUMERIC(5,2),
  aderencia_score NUMERIC(5,2),
  posicao_squad INTEGER,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_historico_analista_ciclo ON public.feedback_historico(analista_id, ciclo);
CREATE INDEX IF NOT EXISTS idx_feedback_historico_analista_id ON public.feedback_historico(analista_id);

-- ─── TABELA: feedback_analytics ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  equipe TEXT,
  coordenador TEXT,
  media_qa NUMERIC(5,2),
  media_iepc NUMERIC(5,2),
  media_aderencia NUMERIC(5,2),
  total_analistas INTEGER DEFAULT 0,
  top_performers JSONB DEFAULT '[]'::jsonb,
  distribuicao_status JSONB DEFAULT '{}'::jsonb,
  tendencias_squad JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_analytics_periodo ON public.feedback_analytics(periodo);

-- ─── TABELA: feedback_import_logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem TEXT NOT NULL,
  payload_hash TEXT,
  status TEXT DEFAULT 'success',
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_pdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_coaching ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_import_logs ENABLE ROW LEVEL SECURITY;

-- Open access for authenticated users (RBAC handled at app level)
DROP POLICY IF EXISTS "auth_all_feedbacks" ON public.feedbacks;
CREATE POLICY "auth_all_feedbacks" ON public.feedbacks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_atendimentos" ON public.feedback_atendimentos;
CREATE POLICY "auth_all_feedback_atendimentos" ON public.feedback_atendimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_pdi" ON public.feedback_pdi;
CREATE POLICY "auth_all_feedback_pdi" ON public.feedback_pdi FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_coaching" ON public.feedback_coaching;
CREATE POLICY "auth_all_feedback_coaching" ON public.feedback_coaching FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_historico" ON public.feedback_historico;
CREATE POLICY "auth_all_feedback_historico" ON public.feedback_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_analytics" ON public.feedback_analytics;
CREATE POLICY "auth_all_feedback_analytics" ON public.feedback_analytics FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_feedback_import_logs" ON public.feedback_import_logs;
CREATE POLICY "auth_all_feedback_import_logs" ON public.feedback_import_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon for API import endpoint (uses service role in practice)
DROP POLICY IF EXISTS "anon_insert_feedbacks" ON public.feedbacks;
CREATE POLICY "anon_insert_feedbacks" ON public.feedbacks FOR INSERT TO anon WITH CHECK (true);

-- ─── TRIGGER: updated_at ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedbacks_updated_at ON public.feedbacks;
CREATE TRIGGER trg_feedbacks_updated_at BEFORE UPDATE ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_feedback_pdi_updated_at ON public.feedback_pdi;
CREATE TRIGGER trg_feedback_pdi_updated_at BEFORE UPDATE ON public.feedback_pdi
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── TRIGGER: auto-insert feedback_historico on feedback approved/sent ─────────
CREATE OR REPLACE FUNCTION public.sync_feedback_historico()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('approved', 'sent') AND (OLD.status IS NULL OR OLD.status NOT IN ('approved', 'sent')) THEN
    INSERT INTO public.feedback_historico (
      analista_id, feedback_id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, snapshot
    ) VALUES (
      NEW.analista_id, NEW.id, NEW.ciclo, NEW.qa_score, NEW.iepc_score, NEW.aderencia_score,
      NEW.posicao_squad, NEW.snapshot_json_completo
    ) ON CONFLICT (analista_id, ciclo) DO UPDATE SET
      qa_score = EXCLUDED.qa_score,
      iepc_score = EXCLUDED.iepc_score,
      aderencia_score = EXCLUDED.aderencia_score,
      snapshot = EXCLUDED.snapshot;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_feedback_historico ON public.feedbacks;
CREATE TRIGGER trg_sync_feedback_historico AFTER INSERT OR UPDATE ON public.feedbacks
FOR EACH ROW EXECUTE FUNCTION public.sync_feedback_historico();
