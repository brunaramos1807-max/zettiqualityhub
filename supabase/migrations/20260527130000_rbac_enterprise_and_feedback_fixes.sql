-- ============================================================
-- QUALIVISÃO — RBAC Enterprise + Feedback Fixes
-- 20260527130000_rbac_enterprise_and_feedback_fixes.sql
-- Incremental: does NOT drop existing users/analistas/permissions
-- ============================================================

-- ─── 1. Add public_enabled to feedbacks (public_token already exists) ────────
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT false;

-- Update existing rows that have a token to be enabled
UPDATE public.feedbacks
  SET public_enabled = true
  WHERE public_token IS NOT NULL;

-- ─── 2. Add missing permission columns to user_permissions ───────────────────
ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_generate_link BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_present BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sobrescreve_role BOOLEAN NOT NULL DEFAULT false;

-- ─── 3. Create roles table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roles_read_authenticated" ON public.roles;
CREATE POLICY "roles_read_authenticated"
  ON public.roles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "roles_write_admin" ON public.roles;
CREATE POLICY "roles_write_admin"
  ON public.roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Coordenador Geral')
    )
  );

-- ─── 4. Create permissions table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,
  pagina TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (modulo, pagina, acao)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_read_authenticated" ON public.permissions;
CREATE POLICY "permissions_read_authenticated"
  ON public.permissions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "permissions_write_admin" ON public.permissions;
CREATE POLICY "permissions_write_admin"
  ON public.permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Coordenador Geral')
    )
  );

-- ─── 5. Create role_permissions table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  permitido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_read_authenticated" ON public.role_permissions;
CREATE POLICY "role_permissions_read_authenticated"
  ON public.role_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "role_permissions_write_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_write_admin"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Coordenador Geral')
    )
  );

-- ─── 6. Create user_scope_permissions table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_scope_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  escopo_tipo TEXT NOT NULL DEFAULT 'proprio',
  squads_visiveis TEXT[] NOT NULL DEFAULT '{}',
  squads_editaveis TEXT[] NOT NULL DEFAULT '{}',
  squads_gerenciaveis TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_scope_permissions_escopo_check
    CHECK (escopo_tipo IN ('all', 'squad', 'analistas', 'proprio')),
  UNIQUE (user_id)
);

ALTER TABLE public.user_scope_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_scope_read_own" ON public.user_scope_permissions;
CREATE POLICY "user_scope_read_own"
  ON public.user_scope_permissions FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('Admin', 'Coordenador Geral')
  ));

DROP POLICY IF EXISTS "user_scope_write_admin" ON public.user_scope_permissions;
CREATE POLICY "user_scope_write_admin"
  ON public.user_scope_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('Admin', 'Coordenador Geral')
    )
  );

-- ─── 7. Seed default roles ────────────────────────────────────────────────────
INSERT INTO public.roles (nome, descricao, ativo) VALUES
  ('Administrador', 'Acesso total ao sistema', true),
  ('Coordenador Geral', 'Acesso a todos os módulos operacionais', true),
  ('Coordenador', 'Acesso ao módulo de qualidade e feedback', true),
  ('Gestor', 'Acesso ao módulo de gestão de pessoas', true),
  ('Auditor', 'Acesso somente leitura a auditorias', true)
ON CONFLICT (nome) DO NOTHING;

-- ─── 8. Seed permissions for Feedback module ─────────────────────────────────
INSERT INTO public.permissions (modulo, pagina, acao, descricao) VALUES
  ('QUALIDADE', 'Feedback', 'visualizar', 'Visualizar feedback do analista'),
  ('QUALIDADE', 'Feedback', 'editar', 'Editar campos do feedback'),
  ('QUALIDADE', 'Feedback', 'excluir', 'Excluir feedback'),
  ('QUALIDADE', 'Feedback', 'importar', 'Importar feedbacks via JSON/integração'),
  ('QUALIDADE', 'Feedback', 'exportar_pdf', 'Gerar PDF do feedback'),
  ('QUALIDADE', 'Feedback', 'gerar_link', 'Gerar link público do feedback'),
  ('QUALIDADE', 'Feedback', 'apresentar', 'Modo apresentação do feedback'),
  ('QUALIDADE', 'Feedback', 'excluir_multiplos', 'Excluir múltiplos feedbacks'),
  ('QUALIDADE', 'QA_IEPC', 'visualizar', 'Visualizar QA e IEPC'),
  ('QUALIDADE', 'QA_IEPC', 'editar', 'Editar avaliações QA/IEPC'),
  ('QUALIDADE', 'Nao_Conformidades', 'visualizar', 'Visualizar não conformidades'),
  ('QUALIDADE', 'Nao_Conformidades', 'editar', 'Editar não conformidades'),
  ('EXECUTIVO', 'Painel_Executivo', 'visualizar', 'Visualizar painel executivo'),
  ('EXECUTIVO', 'Evolucao', 'visualizar', 'Visualizar evolução geral'),
  ('OPERACAO', 'Ciclo_Atual', 'visualizar', 'Visualizar ciclo atual'),
  ('OPERACAO', 'Ciclo_Atual', 'fechar_ciclo', 'Fechar ciclo operacional'),
  ('OPERACAO', 'Ciclo_Atual', 'reabrir_ciclo', 'Reabrir ciclo operacional'),
  ('DESENVOLVIMENTO_HUMANO', 'PDI', 'visualizar', 'Visualizar PDI'),
  ('DESENVOLVIMENTO_HUMANO', 'PDI', 'editar', 'Editar PDI'),
  ('ADMIN', 'Configuracoes', 'visualizar', 'Visualizar configurações'),
  ('ADMIN', 'Configuracoes', 'editar', 'Editar configurações'),
  ('ADMIN', 'Analistas', 'visualizar', 'Visualizar analistas'),
  ('ADMIN', 'Analistas', 'editar', 'Editar analistas'),
  ('ADMIN', 'Importacoes', 'visualizar', 'Visualizar importações'),
  ('ADMIN', 'Importacoes', 'importar', 'Realizar importações')
ON CONFLICT (modulo, pagina, acao) DO NOTHING;

-- ─── 9. Grant Administrador role all permissions ──────────────────────────────
INSERT INTO public.role_permissions (role_id, permission_id, permitido)
SELECT
  r.id,
  p.id,
  true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome = 'Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── 10. Grant Coordenador Geral most permissions ────────────────────────────
INSERT INTO public.role_permissions (role_id, permission_id, permitido)
SELECT
  r.id,
  p.id,
  true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome = 'Coordenador Geral'
  AND p.acao NOT IN ('excluir', 'excluir_multiplos')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── 11. Grant Coordenador feedback + qualidade permissions ──────────────────
INSERT INTO public.role_permissions (role_id, permission_id, permitido)
SELECT
  r.id,
  p.id,
  true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome = 'Coordenador'
  AND p.modulo IN ('QUALIDADE', 'DESENVOLVIMENTO_HUMANO')
  AND p.acao IN ('visualizar', 'editar', 'exportar_pdf', 'gerar_link', 'apresentar')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ─── 12. Update feedbacks RLS to check public_enabled ────────────────────────
DROP POLICY IF EXISTS "Public read via token" ON public.feedbacks;
CREATE POLICY "Public read via token"
  ON public.feedbacks
  FOR SELECT
  USING (
    public_token IS NOT NULL
    AND public_enabled = true
  );

-- ─── 13. Allow anon to read feedbacks via public token ───────────────────────
DROP POLICY IF EXISTS "Anon public token read" ON public.feedbacks;
CREATE POLICY "Anon public token read"
  ON public.feedbacks
  FOR SELECT
  TO anon
  USING (
    public_token IS NOT NULL
    AND public_enabled = true
  );

-- Allow anon to read analistas for public feedback page
DROP POLICY IF EXISTS "Anon read analistas for public" ON public.analistas;
CREATE POLICY "Anon read analistas for public"
  ON public.analistas
  FOR SELECT
  TO anon
  USING (true);

-- ─── 14. Backfill feedback_historico from feedbacks table ────────────────────
-- Ensure all feedbacks have a corresponding historico entry
INSERT INTO public.feedback_historico (analista_id, feedback_id, ciclo, mes, ano, qa_score, iepc_score, aderencia_score)
SELECT
  f.analista_id,
  f.id,
  f.ciclo,
  CASE
    WHEN f.ciclo ~ '^\d{2}/\d{4}$'
    THEN CAST(split_part(f.ciclo, '/', 1) AS INTEGER)
    ELSE NULL
  END AS mes,
  CASE
    WHEN f.ciclo ~ '^\d{2}/\d{4}$'
    THEN CAST(split_part(f.ciclo, '/', 2) AS INTEGER)
    ELSE NULL
  END AS ano,
  f.qa_score,
  f.iepc_score,
  f.aderencia_score
FROM public.feedbacks f
WHERE f.analista_id IS NOT NULL
  AND f.ciclo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.feedback_historico fh
    WHERE fh.analista_id = f.analista_id
      AND fh.ciclo = f.ciclo
  );
