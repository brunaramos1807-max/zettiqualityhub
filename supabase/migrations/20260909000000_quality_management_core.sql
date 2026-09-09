-- ============================================================
-- QualiVisão — Schema Oficial de Gestão da Qualidade (V2 Core)
-- Ciclos Manuais, Ingestão Idempotente, Diagnóstico e 5W2H
-- ============================================================

-- 1. ORGANIZAÇÃO MULTI-TENANT
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.organizacoes (id, nome, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'QualiVisão Enterprise', 'qualivisao-default')
ON CONFLICT (slug) DO NOTHING;

-- 2. OPERAÇÕES, ÁREAS E EQUIPES
CREATE TABLE IF NOT EXISTS public.operacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id UUID REFERENCES public.operacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  coordenador_nome TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Inserir equipes padrão do domínio real
INSERT INTO public.equipes (nome)
VALUES 
  ('PDV'),
  ('PDV N1'),
  ('Compras e Estoque'),
  ('Financeiro Fiscal')
ON CONFLICT DO NOTHING;

-- 3. ENHANCEMENT EM IMPORT_CYCLES (CICLOS COM DATAS MANUAIS E HOMOLOGAÇÃO)
ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS identificacao TEXT,
  ADD COLUMN IF NOT EXISTS data_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_fim DATE,
  ADD COLUMN IF NOT EXISTS homologado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS homologado_por TEXT,
  ADD COLUMN IF NOT EXISTS organizacao_id UUID DEFAULT '00000000-0000-0000-0000-000000000001';

-- Atualizar constraint de status dos ciclos
ALTER TABLE public.import_cycles DROP CONSTRAINT IF EXISTS import_cycles_status_check;
ALTER TABLE public.import_cycles 
  ADD CONSTRAINT import_cycles_status_check 
  CHECK (status IN ('aberto', 'em_apuracao', 'em_validacao', 'fechado_homologado', 'em_andamento', 'fechado', 'reaberto'));

-- Inserir/Garantir Ciclos de Referência 08/2026 e 09/2026 com datas manuais
INSERT INTO public.import_cycles (periodo, identificacao, data_inicio, data_fim, status, is_closed)
VALUES 
  ('08/2026', 'Ciclo 08/2026', '2026-07-26', '2026-08-25', 'fechado_homologado', true),
  ('09/2026', 'Ciclo 09/2026', '2026-08-26', '2026-09-25', 'aberto', false)
ON CONFLICT (periodo) DO UPDATE SET
  identificacao = COALESCE(EXCLUDED.identificacao, public.import_cycles.identificacao),
  data_inicio = COALESCE(public.import_cycles.data_inicio, EXCLUDED.data_inicio),
  data_fim = COALESCE(public.import_cycles.data_fim, EXCLUDED.data_fim);

-- 4. TABELA DE INVESTIGAÇÕES E DIAGNÓSTICO (ISHIKAWA + 5 PORQUÊS)
CREATE TABLE IF NOT EXISTS public.investigacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  ciclo_id UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL,
  periodo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  desvio_detectado TEXT,
  indicador_afetado TEXT,
  squad TEXT,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'causa_validada', 'convertida_plano', 'encerrada')),
  causa_raiz_validada TEXT,
  ishikawa JSONB DEFAULT '[]'::jsonb,
  cinco_porques JSONB DEFAULT '[]'::jsonb,
  hipoteses JSONB DEFAULT '[]'::jsonb,
  criado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigacoes_periodo ON public.investigacoes(periodo);
CREATE INDEX IF NOT EXISTS idx_investigacoes_status ON public.investigacoes(status);

-- 5. TABELA DE MELHORIA CONTÍNUA — PLANOS DE AÇÃO 5W2H
CREATE TABLE IF NOT EXISTS public.planos_acao_5w2h (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
  ciclo_id UUID REFERENCES public.import_cycles(id) ON DELETE SET NULL,
  investigacao_id UUID REFERENCES public.investigacoes(id) ON DELETE SET NULL,
  periodo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  o_que TEXT NOT NULL,
  por_que TEXT,
  onde TEXT,
  quem TEXT,
  quando DATE,
  como TEXT,
  quanto TEXT,
  status TEXT DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_execucao', 'concluido', 'em_afericao_eficacia', 'eficaz', 'ineficaz', 'cancelado')),
  indicador_alvo TEXT,
  meta_alvo TEXT,
  prazo_eficacia_dias INTEGER DEFAULT 30,
  data_limite_eficacia DATE,
  resultado_eficacia TEXT,
  eficacia_atingida BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_planos_5w2h_periodo ON public.planos_acao_5w2h(periodo);
CREATE INDEX IF NOT EXISTS idx_planos_5w2h_status ON public.planos_acao_5w2h(status);

-- 6. HABILITAR RLS E POLÍTICAS DE ACESSO
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_acao_5w2h ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público leitura organizacoes" ON public.organizacoes FOR SELECT USING (true);
CREATE POLICY "Acesso público equipes" ON public.equipes FOR ALL USING (true);
CREATE POLICY "Acesso público operacoes" ON public.operacoes FOR ALL USING (true);
CREATE POLICY "Acesso público areas" ON public.areas FOR ALL USING (true);
CREATE POLICY "Acesso público investigacoes" ON public.investigacoes FOR ALL USING (true);
CREATE POLICY "Acesso público planos_5w2h" ON public.planos_acao_5w2h FOR ALL USING (true);
