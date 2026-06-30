-- ============================================================
-- QualiVisão — Administração Visual + Segurança Conservadora
-- 20260628010000_admin_control_center_security.sql
-- Fase 1: remove anon aberto, preserva dados e prepara RBAC visual
-- ============================================================

-- ─── 1. Expandir permissões existentes sem criar modelo paralelo ────────────
ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS can_create BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_send BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_sync BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_permissions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_cancel BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT false;

-- ─── 2. Funções auxiliares para RLS/admin ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.role FROM public.user_profiles up WHERE up.id = auth.uid() LIMIT 1),
    (SELECT up2.role FROM public.user_profiles up2 WHERE lower(up2.email) = lower(auth.jwt() ->> 'email') LIMIT 1),
    (SELECT pru.role FROM public.pre_registered_users pru WHERE lower(pru.email) = lower(auth.jwt() ->> 'email') AND pru.is_active IS DISTINCT FROM false LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      LEFT JOIN public.cargos c ON c.id = up.cargo_id
      WHERE (up.id = auth.uid() OR lower(up.email) = lower(auth.jwt() ->> 'email'))
        AND (
          up.role IN ('Admin', 'Administrador', 'admin')
          OR c.is_admin_master = true
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.pre_registered_users pru
      LEFT JOIN public.cargos c ON c.id = pru.cargo_id
      WHERE lower(pru.email) = lower(auth.jwt() ->> 'email')
        AND pru.is_active IS DISTINCT FROM false
        AND (
          pru.role IN ('Admin', 'Administrador', 'admin')
          OR c.is_admin_master = true
        )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(module_name TEXT, action_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed BOOLEAN := false;
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  SELECT CASE action_key
    WHEN 'visualizar' THEN COALESCE(up.can_view, false)
    WHEN 'criar' THEN COALESCE(up.can_create, false)
    WHEN 'editar' THEN COALESCE(up.can_edit, false)
    WHEN 'excluir' THEN COALESCE(up.can_delete, false)
    WHEN 'enviar' THEN COALESCE(up.can_send, false)
    WHEN 'importar' THEN COALESCE(up.can_import, false)
    WHEN 'exportar' THEN COALESCE(up.can_export, false)
    WHEN 'sincronizar' THEN COALESCE(up.can_sync, false)
    WHEN 'administrar' THEN COALESCE(up.can_admin, false) OR COALESCE(up.can_manage_permissions, false)
    WHEN 'cancelar' THEN COALESCE(up.can_cancel, false)
    WHEN 'fechar_ciclo' THEN COALESCE(up.can_close_cycle, false)
    WHEN 'reabrir_ciclo' THEN COALESCE(up.can_reopen_cycle, false)
    WHEN 'aprovar' THEN COALESCE(up.can_approve, false)
    ELSE false
  END
  INTO allowed
  FROM public.user_permissions up
  WHERE up.user_profile_id = auth.uid()
    AND up.module_name = has_permission.module_name
  LIMIT 1;

  RETURN COALESCE(allowed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(TEXT, TEXT) TO authenticated;

-- ─── 3. Seeds mínimos para Central de Controle ───────────────────────────────
INSERT INTO public.cargos (nome, descricao, cor, is_active, is_admin_master) VALUES
  ('admin', 'Administrador do sistema com acesso total', '#EF4444', true, true),
  ('qualidade', 'Perfil de qualidade com acesso operacional controlado', '#2DD4BF', true, false),
  ('coordenador', 'Coordenador com acesso aos fluxos de gestão e acompanhamento', '#38BDF8', true, false),
  ('gestor', 'Gestor com visão executiva e estratégica', '#A78BFA', true, false),
  ('diretoria', 'Diretoria com visão executiva consolidada', '#F59E0B', true, false),
  ('analista', 'Analista com acesso restrito aos próprios dados liberados', '#22C55E', true, false)
ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  cor = EXCLUDED.cor,
  is_active = true,
  is_admin_master = EXCLUDED.is_admin_master,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO public.permission_modules (nome, label, descricao, sort_order) VALUES
  ('home_executiva', 'Home Executiva', 'Painel executivo principal', 10),
  ('analytics_operacional', 'Analytics Operacional', 'Dashboards e indicadores operacionais', 20),
  ('ciclo_atual', 'Ciclo Atual', 'Acompanhamento do ciclo vigente', 30),
  ('auditoria', 'Auditoria', 'Auditoria operacional e de avaliações', 40),
  ('qa_iepc', 'QA & IEPC', 'Qualidade, QA e IEPC', 50),
  ('nao_conformidades', 'Não Conformidades', 'Gestão e análise de NCs', 60),
  ('reconhecimento', 'Reconhecimento', 'Elogios e reconhecimento', 70),
  ('feedback', 'Gestão de Feedbacks', 'Feedbacks e acompanhamento humano', 80),
  ('pdi', 'PDI', 'Planos de desenvolvimento individual', 90),
  ('gestao_pessoas', 'Gestão de Pessoas', 'Gestão e acompanhamento de pessoas', 100),
  ('people_analytics', 'People Analytics', 'Analytics de pessoas e feedbacks', 110),
  ('advertencias', 'Advertências', 'Registros disciplinares sensíveis', 120),
  ('historico', 'Histórico', 'Histórico operacional', 130),
  ('base_conhecimento', 'Base de Conhecimento', 'Base de conhecimento e Notion', 140),
  ('documentos', 'Documentos', 'Documentos e governança', 150),
  ('importacoes', 'Importações', 'Importação e limpeza operacional', 160),
  ('diagnostico', 'Diagnóstico', 'Diagnóstico técnico e logs', 170),
  ('configuracoes', 'Configurações', 'Central de Controle Administrativa', 180),
  ('usuarios', 'Usuários', 'Gestão de usuários e acessos', 190),
  ('analistas', 'Analistas', 'Cadastro operacional de analistas', 200)
ON CONFLICT (nome) DO UPDATE SET
  label = EXCLUDED.label,
  descricao = EXCLUDED.descricao,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.roles (nome, descricao, ativo) VALUES
  ('admin', 'Administrador do sistema', true),
  ('qualidade', 'Qualidade operacional', true),
  ('coordenador', 'Coordenador de squad/time', true),
  ('gestor', 'Gestor com visão executiva', true),
  ('diretoria', 'Diretoria executiva', true),
  ('analista', 'Analista com acesso restrito', true)
ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao, ativo = true, updated_at = CURRENT_TIMESTAMP;

INSERT INTO public.permissions (modulo, pagina, acao, descricao, is_sensitive)
SELECT m.nome, m.label, a.acao, a.descricao, a.is_sensitive
FROM public.permission_modules m
CROSS JOIN (VALUES
  ('visualizar', 'Visualizar tela ou módulo', false),
  ('criar', 'Criar registros', false),
  ('editar', 'Editar registros', false),
  ('excluir', 'Excluir registros', true),
  ('enviar', 'Enviar ou compartilhar registros', false),
  ('importar', 'Importar dados', true),
  ('exportar', 'Exportar dados', false),
  ('sincronizar', 'Sincronizar integrações externas', true),
  ('administrar', 'Administrar permissões/configurações', true),
  ('cancelar', 'Cancelar/inativar registros sensíveis', true)
) AS a(acao, descricao, is_sensitive)
ON CONFLICT (modulo, pagina, acao) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  is_sensitive = EXCLUDED.is_sensitive;

-- Ações sensíveis explícitas para rastreabilidade visual/admin
INSERT INTO public.permissions (modulo, pagina, acao, descricao, is_sensitive) VALUES
  ('feedback', 'Gestão de Feedbacks', 'excluir_feedback', 'Excluir feedback individual', true),
  ('feedback', 'Gestão de Feedbacks', 'excluir_feedback_massa', 'Excluir feedbacks em massa', true),
  ('feedback', 'Gestão de Feedbacks', 'alterar_status_feedback', 'Alterar status de feedback', true),
  ('pdi', 'PDI', 'criar_pdi', 'Criar PDI', true),
  ('pdi', 'PDI', 'editar_pdi', 'Editar PDI', true),
  ('pdi', 'PDI', 'concluir_pdi', 'Concluir PDI', true),
  ('pdi', 'PDI', 'cancelar_pdi', 'Cancelar PDI', true),
  ('advertencias', 'Advertências', 'criar_advertencia', 'Criar advertência', true),
  ('advertencias', 'Advertências', 'cancelar_advertencia', 'Cancelar advertência', true),
  ('nao_conformidades', 'Não Conformidades', 'excluir_nc', 'Excluir não conformidade', true),
  ('importacoes', 'Importações', 'excluir_importacao', 'Excluir importação', true),
  ('ciclo_atual', 'Ciclo Atual', 'fechar_ciclo', 'Fechar ciclo', true),
  ('ciclo_atual', 'Ciclo Atual', 'reabrir_ciclo', 'Reabrir ciclo', true),
  ('base_conhecimento', 'Base de Conhecimento', 'sincronizar_notion', 'Sincronizar Notion', true),
  ('configuracoes', 'Configurações', 'alterar_permissoes', 'Alterar permissões', true),
  ('diagnostico', 'Diagnóstico', 'acessar_logs', 'Acessar logs', true),
  ('diagnostico', 'Diagnóstico', 'acessar_diagnostico', 'Acessar diagnóstico', true)
ON CONFLICT (modulo, pagina, acao) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  is_sensitive = true;

-- Admin recebe todas as permissões por perfil. Exceções individuais continuam em user_permissions.
INSERT INTO public.role_permissions (role_id, permission_id, permitido)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.nome IN ('admin', 'Administrador')
ON CONFLICT (role_id, permission_id) DO UPDATE SET permitido = true;

-- ─── 4. Revogar grants anon diretos das tabelas administrativas/sensíveis ────
REVOKE ALL ON TABLE public.user_profiles FROM anon;
REVOKE ALL ON TABLE public.user_permissions FROM anon;
REVOKE ALL ON TABLE public.permission_logs FROM anon;
REVOKE ALL ON TABLE public.pre_registered_users FROM anon;
REVOKE ALL ON TABLE public.cargos FROM anon;
REVOKE ALL ON TABLE public.roles FROM anon;
REVOKE ALL ON TABLE public.permissions FROM anon;
REVOKE ALL ON TABLE public.role_permissions FROM anon;
REVOKE ALL ON TABLE public.user_scope_permissions FROM anon;
REVOKE ALL ON TABLE public.advertencias FROM anon;
REVOKE ALL ON TABLE public.pdi_records FROM anon;
REVOKE ALL ON TABLE public.pdi_objectives FROM anon;
REVOKE ALL ON TABLE public.pdi_timeline FROM anon;
REVOKE ALL ON TABLE public.feedback_pdi FROM anon;

-- ─── 5. Remover policies anon/abertas conhecidas ─────────────────────────────
DROP POLICY IF EXISTS "cargos_anon_read" ON public.cargos;
DROP POLICY IF EXISTS "cargos_anon_write" ON public.cargos;
DROP POLICY IF EXISTS "user_profiles_anon_read" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_anon_write" ON public.user_profiles;
DROP POLICY IF EXISTS "user_permissions_anon_read" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_anon_write" ON public.user_permissions;
DROP POLICY IF EXISTS "permission_logs_anon_read" ON public.permission_logs;
DROP POLICY IF EXISTS "permission_logs_anon_write" ON public.permission_logs;
DROP POLICY IF EXISTS "pre_registered_anon_all" ON public.pre_registered_users;
DROP POLICY IF EXISTS "anon_read_user_profiles_v2" ON public.user_profiles;
DROP POLICY IF EXISTS "anon_read_cargos_v2" ON public.cargos;
DROP POLICY IF EXISTS "anon_read_user_permissions_v2" ON public.user_permissions;
DROP POLICY IF EXISTS "pdi_objectives_anon_all" ON public.pdi_objectives;
DROP POLICY IF EXISTS "pdi_timeline_anon_all" ON public.pdi_timeline;
DROP POLICY IF EXISTS "advertencias_all" ON public.advertencias;

DROP POLICY IF EXISTS "cargos_write" ON public.cargos;
DROP POLICY IF EXISTS "user_permissions_write" ON public.user_permissions;
DROP POLICY IF EXISTS "permission_logs_write" ON public.permission_logs;
DROP POLICY IF EXISTS "all_authenticated_write_permission_logs" ON public.permission_logs;
DROP POLICY IF EXISTS "perm_logs_auth" ON public.permission_logs;
DROP POLICY IF EXISTS "user_profiles_own" ON public.user_profiles;
DROP POLICY IF EXISTS "auth_all_user_profiles_v2" ON public.user_profiles;
DROP POLICY IF EXISTS "auth_all_cargos_v2" ON public.cargos;
DROP POLICY IF EXISTS "auth_all_user_permissions_v2" ON public.user_permissions;
DROP POLICY IF EXISTS "pre_registered_auth_all" ON public.pre_registered_users;
DROP POLICY IF EXISTS "user_profiles_anon_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_anon_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_anon_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_anon" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_authenticated" ON public.user_profiles;
DROP POLICY IF EXISTS "up_auth" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_read_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.user_profiles;

DROP POLICY IF EXISTS "user_permissions_anon_select" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_anon_insert" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_anon_update" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_anon_delete" ON public.user_permissions;
DROP POLICY IF EXISTS "user_permissions_read" ON public.user_permissions;
DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "users_read_own_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "admins_full_permissions" ON public.user_permissions;

DROP POLICY IF EXISTS "permission_logs_read" ON public.permission_logs;
DROP POLICY IF EXISTS "authenticated_read_permission_logs" ON public.permission_logs;
DROP POLICY IF EXISTS "authenticated_insert_permission_logs" ON public.permission_logs;
DROP POLICY IF EXISTS "open_write_permission_logs" ON public.permission_logs;
DROP POLICY IF EXISTS "pl_auth" ON public.permission_logs;

DROP POLICY IF EXISTS "pre_reg_auth" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pru_auth" ON public.pre_registered_users;
DROP POLICY IF EXISTS "open_read_pre_registered" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pre_registered_users_select_anon" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pre_registered_users_select_authenticated" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pre_registered_users_insert_authenticated" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pre_registered_users_update_authenticated" ON public.pre_registered_users;
DROP POLICY IF EXISTS "pre_registered_users_delete_authenticated" ON public.pre_registered_users;

DROP POLICY IF EXISTS "cargos_anon_select" ON public.cargos;
DROP POLICY IF EXISTS "cargos_anon_insert" ON public.cargos;
DROP POLICY IF EXISTS "cargos_anon_update" ON public.cargos;
DROP POLICY IF EXISTS "anon_read_cargos" ON public.cargos;
DROP POLICY IF EXISTS "authenticated_read_cargos" ON public.cargos;
DROP POLICY IF EXISTS "admins_full_cargos" ON public.cargos;

DROP POLICY IF EXISTS "anon_read_feedback_pdi_v2" ON public.feedback_pdi;
DROP POLICY IF EXISTS "feedback_pdi_anon_select" ON public.feedback_pdi;
DROP POLICY IF EXISTS "auth_all_feedback_pdi" ON public.feedback_pdi;
DROP POLICY IF EXISTS "auth_all_feedback_pdi_v2" ON public.feedback_pdi;

DROP POLICY IF EXISTS "anon_all_pdi_objectives" ON public.pdi_objectives;
DROP POLICY IF EXISTS "anon_all_pdi_timeline" ON public.pdi_timeline;

DROP POLICY IF EXISTS "roles_write_admin" ON public.roles;
DROP POLICY IF EXISTS "permissions_write_admin" ON public.permissions;
DROP POLICY IF EXISTS "role_permissions_write_admin" ON public.role_permissions;
DROP POLICY IF EXISTS "user_scope_write_admin" ON public.user_scope_permissions;
DROP POLICY IF EXISTS "user_scope_read_own" ON public.user_scope_permissions;


-- ─── 6. RLS conservadora para tabelas administrativas ────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scope_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_pdi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_user_profiles_all"
  ON public.user_profiles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users_read_own_profile_conservative"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR lower(email) = lower(auth.jwt() ->> 'email') OR public.is_admin());

CREATE POLICY "users_update_own_basic_profile_conservative"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "admin_pre_registered_all"
  ON public.pre_registered_users FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_read_own_pre_registration"
  ON public.pre_registered_users FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email') OR public.is_admin());

CREATE POLICY "admin_user_permissions_all"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users_read_own_permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_permission_logs_all"
  ON public.permission_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_cargos_all"
  ON public.cargos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_read_cargos"
  ON public.cargos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_permission_modules"
  ON public.permission_modules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_permission_modules_all"
  ON public.permission_modules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_read_roles"
  ON public.roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_roles_all"
  ON public.roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_read_permissions_catalog"
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_permissions_catalog_all"
  ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "authenticated_read_role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_role_permissions_all"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "users_read_own_scope_or_admin"
  ON public.user_scope_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_user_scope_permissions_all"
  ON public.user_scope_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─── 7. Dados sensíveis: bloquear anon e manter auth conservador nesta fase ──
CREATE POLICY "authenticated_advertencias_conservative"
  ON public.advertencias FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_pdi_records_conservative"
  ON public.pdi_records FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_pdi_objectives_conservative"
  ON public.pdi_objectives FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_pdi_timeline_conservative"
  ON public.pdi_timeline FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_feedback_pdi_conservative"
  ON public.feedback_pdi FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Observação: esta migration não altera policies públicas de feedbacks.
-- /feedback/public/[token] permanece controlada pelas policies existentes em feedbacks.
