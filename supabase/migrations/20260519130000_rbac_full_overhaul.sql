-- ============================================================
-- QUALIVISÃO — RBAC Full Overhaul Migration
-- 20260519130000_rbac_full_overhaul.sql
-- ============================================================

-- ─── 1. Enable RLS on analyst_profiles (was disabled) ────────────────────────
ALTER TABLE public.analyst_profiles ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop all existing policies to rebuild cleanly ────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'user_profiles','pre_registered_users','cargos','permission_modules',
        'user_permissions','analistas','analyst_profiles','squads',
        'import_cycles','cycle_scores','nc_records','elogios',
        'manual_evaluations','cycle_summaries','quality_cycles',
        'audit_logs','import_logs','cycle_closure_history',
        'permission_logs','strategic_indicators','documents'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ─── 3. Helper function: get current user role ───────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_profiles WHERE id = auth.uid() LIMIT 1),
    'Visualizador'
  );
$$;

-- ─── 4. Helper function: is admin master ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.cargos c ON c.id = up.cargo_id
    WHERE up.id = auth.uid()
      AND (c.is_admin_master = true OR up.role::text IN ('Admin','Administrador'))
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role::text IN ('Admin','Administrador')
  );
$$;

-- ─── 5. Helper function: get user squads ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_squads()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT squads FROM public.user_profiles WHERE id = auth.uid() LIMIT 1),
    ARRAY[]::text[]
  );
$$;

-- ─── 6. user_profiles policies ───────────────────────────────────────────────
-- Everyone authenticated can read all profiles (needed for UI)
CREATE POLICY "authenticated_read_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can insert/update/delete any profile
CREATE POLICY "admins_full_profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

-- Service role bypass
CREATE POLICY "service_role_profiles"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 7. pre_registered_users policies ────────────────────────────────────────
CREATE POLICY "authenticated_read_prereg"
  ON public.pre_registered_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_full_prereg"
  ON public.pre_registered_users FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_prereg"
  ON public.pre_registered_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 8. cargos policies ──────────────────────────────────────────────────────
CREATE POLICY "authenticated_read_cargos"
  ON public.cargos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "anon_read_cargos"
  ON public.cargos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "admins_full_cargos"
  ON public.cargos FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_cargos"
  ON public.cargos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 9. permission_modules policies ──────────────────────────────────────────
CREATE POLICY "all_read_modules"
  ON public.permission_modules FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "admins_full_modules"
  ON public.permission_modules FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_modules"
  ON public.permission_modules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 10. user_permissions policies ───────────────────────────────────────────
-- All authenticated users can read all permissions (needed for RBAC checks)
CREATE POLICY "authenticated_read_permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Users can read their own permissions
CREATE POLICY "users_read_own_permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (user_profile_id = auth.uid());

-- Admins can manage all permissions
CREATE POLICY "admins_full_permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_permissions"
  ON public.user_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 11. analistas policies ───────────────────────────────────────────────────
-- All authenticated users can read analistas
CREATE POLICY "authenticated_read_analistas"
  ON public.analistas FOR SELECT
  TO authenticated
  USING (true);

-- Admins and coordinators can manage analistas
CREATE POLICY "coordinators_manage_analistas"
  ON public.analistas FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_analistas"
  ON public.analistas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 12. analyst_profiles policies ───────────────────────────────────────────
CREATE POLICY "authenticated_read_analyst_profiles"
  ON public.analyst_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_full_analyst_profiles"
  ON public.analyst_profiles FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_analyst_profiles"
  ON public.analyst_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 13. squads policies ─────────────────────────────────────────────────────
CREATE POLICY "all_read_squads"
  ON public.squads FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "admins_full_squads"
  ON public.squads FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_squads"
  ON public.squads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 14. Operational data: ALL authenticated users see ALL data ───────────────
-- import_cycles
CREATE POLICY "authenticated_read_import_cycles"
  ON public.import_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_import_cycles"
  ON public.import_cycles FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_import_cycles"
  ON public.import_cycles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_scores
CREATE POLICY "authenticated_read_cycle_scores"
  ON public.cycle_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_cycle_scores"
  ON public.cycle_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- nc_records
CREATE POLICY "authenticated_read_nc_records"
  ON public.nc_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_nc_records"
  ON public.nc_records FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_nc_records"
  ON public.nc_records FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- elogios
CREATE POLICY "authenticated_read_elogios"
  ON public.elogios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_elogios"
  ON public.elogios FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_elogios"
  ON public.elogios FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- manual_evaluations
CREATE POLICY "authenticated_read_manual_evaluations"
  ON public.manual_evaluations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_manual_evaluations"
  ON public.manual_evaluations FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_manual_evaluations"
  ON public.manual_evaluations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_summaries
CREATE POLICY "authenticated_read_cycle_summaries"
  ON public.cycle_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_manage_cycle_summaries"
  ON public.cycle_summaries FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_cycle_summaries"
  ON public.cycle_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- quality_cycles
CREATE POLICY "authenticated_read_quality_cycles"
  ON public.quality_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_quality_cycles"
  ON public.quality_cycles FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_quality_cycles"
  ON public.quality_cycles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- audit_logs
CREATE POLICY "authenticated_read_audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "service_role_audit_logs"
  ON public.audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- import_logs
CREATE POLICY "authenticated_read_import_logs"
  ON public.import_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_import_logs"
  ON public.import_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "service_role_import_logs"
  ON public.import_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- cycle_closure_history
CREATE POLICY "authenticated_read_closure_history"
  ON public.cycle_closure_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coordinators_manage_closure_history"
  ON public.cycle_closure_history FOR ALL
  TO authenticated
  USING (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  )
  WITH CHECK (
    public.is_admin_master()
    OR public.get_my_role() IN ('Admin','Administrador','Coordenador','Coordenador Geral','Coordenadora Qualidade','Auditor','QA')
  );

CREATE POLICY "service_role_closure_history"
  ON public.cycle_closure_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- permission_logs
CREATE POLICY "authenticated_read_permission_logs"
  ON public.permission_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_permission_logs"
  ON public.permission_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "service_role_permission_logs"
  ON public.permission_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- strategic_indicators
CREATE POLICY "authenticated_read_strategic_indicators"
  ON public.strategic_indicators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_manage_strategic_indicators"
  ON public.strategic_indicators FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_strategic_indicators"
  ON public.strategic_indicators FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- documents
CREATE POLICY "authenticated_read_documents"
  ON public.documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins_manage_documents"
  ON public.documents FOR ALL
  TO authenticated
  USING (public.is_admin_master())
  WITH CHECK (public.is_admin_master());

CREATE POLICY "service_role_documents"
  ON public.documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 15. Trigger: auto-create user_profile on Google login ───────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pre_reg RECORD;
  cargo_rec RECORD;
BEGIN
  -- Look up pre-registered profile by email
  SELECT * INTO pre_reg
  FROM public.pre_registered_users
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF pre_reg IS NOT NULL THEN
    -- Insert with pre-registered data
    INSERT INTO public.user_profiles (
      id, email, full_name, role, cargo_id, squad, squads, equipes,
      is_active, status_usuario, nivel, created_at, updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(pre_reg.full_name, NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      COALESCE(pre_reg.role, 'Coordenador')::user_role,
      pre_reg.cargo_id,
      pre_reg.squad,
      COALESCE(pre_reg.squads, ARRAY[]::text[]),
      COALESCE(pre_reg.squads, ARRAY[]::text[]),
      COALESCE(pre_reg.is_active, true),
      COALESCE(pre_reg.status_usuario, 'ativo'),
      COALESCE(pre_reg.nivel, 'Junior'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
      role = COALESCE(EXCLUDED.role, user_profiles.role),
      cargo_id = COALESCE(EXCLUDED.cargo_id, user_profiles.cargo_id),
      squad = COALESCE(EXCLUDED.squad, user_profiles.squad),
      squads = CASE WHEN array_length(EXCLUDED.squads, 1) > 0 THEN EXCLUDED.squads ELSE user_profiles.squads END,
      updated_at = NOW();
  ELSE
    -- New user without pre-registration: give minimal access
    INSERT INTO public.user_profiles (
      id, email, full_name, role, is_active, status_usuario, created_at, updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      'Coordenador'::user_role,
      true,
      'ativo',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 16. Ensure squads exist ─────────────────────────────────────────────────
INSERT INTO public.squads (name, coordinator_name, coordinator_email, active)
VALUES
  ('PDV', 'Ayron Rodrigues Silva', 'ayron.silva@zetti.tech', true),
  ('PDV N1', 'Ayron Rodrigues Silva', 'ayron.silva@zetti.tech', true),
  ('Compras e Estoque', 'Jonatas Batista de Jesus', 'jonatas.jesus@zetti.tech', true),
  ('Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'amanda.cristina@zetti.tech', true),
  ('Treinamento', 'Isabella Alves Carvalho', 'isabella.carvalho@zetti.tech', true),
  ('Qualidade', 'Bruna Silva Ramos', 'bruna.silva@zetti.tech', true)
ON CONFLICT (name) DO UPDATE SET
  coordinator_name = EXCLUDED.coordinator_name,
  coordinator_email = EXCLUDED.coordinator_email,
  updated_at = NOW();

-- ─── 17. Ensure cargos exist ─────────────────────────────────────────────────
INSERT INTO public.cargos (nome, descricao, cor, is_active, is_admin_master)
VALUES
  ('Admin Master', 'Acesso total irrestrito ao sistema, todas equipes, configurações, exclusões, importações, fechamento de ciclo, logs, auditoria e RBAC', '#EF4444', true, true),
  ('Coordenador Operacional', 'Painel Executivo completo, indicadores gerais, rankings, heatmaps, PDI, NC, Elogios, Calibragem. Módulos operacionais filtrados por equipe vinculada.', '#38BDF8', true, false),
  ('Gestor / Gerente', 'Visualização completa de dashboards, comparativos, indicadores e todos os ciclos. Sem edição, exclusão, importação ou alteração de configurações.', '#A78BFA', true, false),
  ('Coordenador de Qualidade', 'Auditoria, importações, fechamento de ciclo, NC, consolidação, ISO, governança, calibragem e logs. Sem alteração de configurações críticas.', '#F59E0B', true, false)
ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  cor = EXCLUDED.cor,
  is_admin_master = EXCLUDED.is_admin_master,
  updated_at = NOW();

-- ─── 18. Seed pre_registered_users from CSV ──────────────────────────────────
-- Admin
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('bruna.silva@zetti.tech', 'Bruna Silva Ramos', 'Admin', 'Qualidade', ARRAY['PDV','PDV N1','Compras e Estoque','Financeiro Fiscal','Treinamento','Qualidade'], true, 'ativo', 'Senior'),
  ('brunaramos1807@gmail.com', 'Bruna Silva Ramos', 'Admin', 'Qualidade', ARRAY['PDV','PDV N1','Compras e Estoque','Financeiro Fiscal','Treinamento','Qualidade'], true, 'ativo', 'Senior')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- Coordenadores
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('amanda.cristina@zetti.tech', 'Amanda Cristina de Sousa Monteiro', 'Coordenador', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Trainee'),
  ('jonatas.jesus@zetti.tech', 'Jonatas Batista de Jesus', 'Coordenador', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Junior'),
  ('ayron.silva@zetti.tech', 'Ayron Rodrigues Silva', 'Coordenador', 'PDV', ARRAY['PDV','PDV N1'], true, 'ativo', 'Junior'),
  ('pedro.filho@zetti.tech', 'Pedro Filho', 'Gestor', NULL, ARRAY['PDV','PDV N1','Compras e Estoque','Financeiro Fiscal','Treinamento'], true, 'ativo', 'Senior'),
  ('fabiano.felix@zetti.tech', 'Fabiano Rodrigues de Morais Felix', 'Gestor', NULL, ARRAY['PDV','PDV N1','Compras e Estoque','Financeiro Fiscal','Treinamento'], true, 'ativo', 'Pleno'),
  ('isabella.carvalho@zetti.tech', 'Isabella Alves Carvalho', 'Coordenador', 'Treinamento', ARRAY['Treinamento'], true, 'ativo', 'Junior')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- Analistas — Compras e Estoque
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('andre.moura@zetti.tech', 'André Marcos Santos de Moura', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Junior'),
  ('bruno.reis@zetti.tech', 'Bruno de Souza Reis', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Junior'),
  ('fernando.carvalho@zetti.tech', 'Fernando Nunes Carvalho', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Pleno'),
  ('gabriel.vieira@zetti.tech', 'Gabriel Vieira Santos Teles', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Pleno'),
  ('giovanna.oliveira@zetti.tech', 'Giovanna Crystina Rufino Gonçalves', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Junior'),
  ('milena.santos@zetti.tech', 'Milena de Almeida Santos', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Trainee'),
  ('thalisson.silva@zetti.tech', 'Thallison P Silva', 'Analista', 'Compras e Estoque', ARRAY['Compras e Estoque'], true, 'ativo', 'Junior')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- Analistas — Financeiro Fiscal
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('frederico.couto@zetti.tech', 'Frederico Faria do Couto', 'Analista', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Junior'),
  ('larissa.marques@zetti.tech', 'Larissa Miranda Marques', 'Analista', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Junior'),
  ('michelly.pereira@zetti.tech', 'Michelly Vitória Cunha Pereira', 'Analista', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Junior'),
  ('peterson.silva@zetti.tech', 'Peterson Sulivan da Silva', 'Analista', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Junior'),
  ('wya.junior@zetti.tech', 'Wya Mar Barros Milhomem Junior', 'Analista', 'Financeiro Fiscal', ARRAY['Financeiro Fiscal'], true, 'ativo', 'Pleno')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- Analistas — PDV
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('adriel.sanches@zetti.tech', 'Adriel de Almeida Sanches', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Junior'),
  ('alair.filho@zetti.tech', 'Alair de Paula Filho', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Junior'),
  ('bruno.ribeiro@zetti.tech', 'Bruno da Silva Ribeiro', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Pleno'),
  ('francisco.pereira@zetti.tech', 'Francisco Neto Alves Pereira', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Junior'),
  ('gustavo.moreira@zetti.tech', 'Gustavo Vinicius Moreira Marques', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Trainee'),
  ('isaac.carvalho@zetti.tech', 'Isaac Nunes Carvalho', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Trainee'),
  ('jherik.jesus@zetti.tech', 'Jherik De Jesus Calado', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Junior'),
  ('rafael.andrade@zetti.tech', 'Rafael de Sousa Andrade', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Junior'),
  ('thiago.fonseca@zetti.tech', 'Thiago Borges Fonseca', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Trainee'),
  ('thiago.maroja@zetti.tech', 'Thiago Ribeiro Maroja', 'Analista', 'PDV', ARRAY['PDV'], true, 'ativo', 'Pleno')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- Analistas — PDV N1
INSERT INTO public.pre_registered_users (email, full_name, role, squad, squads, is_active, status_usuario, nivel)
VALUES
  ('artur.carvalho@zetti.tech', 'Artur Leobas de Franca Carvalho', 'Analista', 'PDV N1', ARRAY['PDV N1'], true, 'ativo', 'Trainee'),
  ('igor.cerqueira@zetti.tech', 'Igor Felzemburg Cerqueira', 'Analista', 'PDV N1', ARRAY['PDV N1'], true, 'ativo', 'Junior'),
  ('jose.neto@zetti.tech', 'José Bueno de Brito Neto', 'Analista', 'PDV N1', ARRAY['PDV N1'], true, 'ativo', 'Trainee')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  squad = EXCLUDED.squad,
  squads = EXCLUDED.squads,
  updated_at = NOW();

-- ─── 19. Seed analistas table (operational profiles, no login) ───────────────
INSERT INTO public.analistas (nome, email, squad, equipe, coordenador, nivel, status)
VALUES
  -- Compras e Estoque
  ('André Marcos Santos de Moura', 'andre.moura@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Junior', 'ativo'),
  ('Bruno de Souza Reis', 'bruno.reis@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Junior', 'ativo'),
  ('Fernando Nunes Carvalho', 'fernando.carvalho@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Pleno', 'ativo'),
  ('Gabriel Vieira Santos Teles', 'gabriel.vieira@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Pleno', 'ativo'),
  ('Giovanna Crystina Rufino Gonçalves', 'giovanna.oliveira@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Junior', 'ativo'),
  ('Milena de Almeida Santos', 'milena.santos@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Trainee', 'ativo'),
  ('Thallison P Silva', 'thalisson.silva@zetti.tech', 'Compras e Estoque', 'Compras e Estoque', 'Jonatas Batista de Jesus', 'Junior', 'ativo'),
  -- Financeiro Fiscal
  ('Frederico Faria do Couto', 'frederico.couto@zetti.tech', 'Financeiro Fiscal', 'Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'Junior', 'ativo'),
  ('Larissa Miranda Marques', 'larissa.marques@zetti.tech', 'Financeiro Fiscal', 'Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'Junior', 'ativo'),
  ('Michelly Vitória Cunha Pereira', 'michelly.pereira@zetti.tech', 'Financeiro Fiscal', 'Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'Junior', 'ativo'),
  ('Peterson Sulivan da Silva', 'peterson.silva@zetti.tech', 'Financeiro Fiscal', 'Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'Junior', 'ativo'),
  ('Wya Mar Barros Milhomem Junior', 'wya.junior@zetti.tech', 'Financeiro Fiscal', 'Financeiro Fiscal', 'Amanda Cristina de Sousa Monteiro', 'Pleno', 'ativo'),
  -- PDV
  ('Adriel de Almeida Sanches', 'adriel.sanches@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('Alair de Paula Filho', 'alair.filho@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('Bruno da Silva Ribeiro', 'bruno.ribeiro@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Pleno', 'ativo'),
  ('Francisco Neto Alves Pereira', 'francisco.pereira@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('Gustavo Vinicius Moreira Marques', 'gustavo.moreira@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Trainee', 'ativo'),
  ('Isaac Nunes Carvalho', 'isaac.carvalho@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Trainee', 'ativo'),
  ('Jherik De Jesus Calado', 'jherik.jesus@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('Rafael de Sousa Andrade', 'rafael.andrade@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('Thiago Borges Fonseca', 'thiago.fonseca@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Trainee', 'ativo'),
  ('Thiago Ribeiro Maroja', 'thiago.maroja@zetti.tech', 'PDV', 'PDV', 'Ayron Rodrigues Silva', 'Pleno', 'ativo'),
  -- PDV N1
  ('Artur Leobas de Franca Carvalho', 'artur.carvalho@zetti.tech', 'PDV N1', 'PDV N1', 'Ayron Rodrigues Silva', 'Trainee', 'ativo'),
  ('Igor Felzemburg Cerqueira', 'igor.cerqueira@zetti.tech', 'PDV N1', 'PDV N1', 'Ayron Rodrigues Silva', 'Junior', 'ativo'),
  ('José Bueno de Brito Neto', 'jose.neto@zetti.tech', 'PDV N1', 'PDV N1', 'Ayron Rodrigues Silva', 'Trainee', 'ativo')
ON CONFLICT (email) DO UPDATE SET
  nome = EXCLUDED.nome,
  squad = EXCLUDED.squad,
  equipe = EXCLUDED.equipe,
  coordenador = EXCLUDED.coordenador,
  nivel = EXCLUDED.nivel,
  updated_at = NOW();

-- ─── 20. Update existing user_profiles with cargo_id for known users ─────────
DO $$
DECLARE
  admin_cargo_id uuid;
  coord_cargo_id uuid;
  gestor_cargo_id uuid;
BEGIN
  SELECT id INTO admin_cargo_id FROM public.cargos WHERE nome = 'Admin Master' LIMIT 1;
  SELECT id INTO coord_cargo_id FROM public.cargos WHERE nome = 'Coordenador Operacional' LIMIT 1;
  SELECT id INTO gestor_cargo_id FROM public.cargos WHERE nome = 'Gestor / Gerente' LIMIT 1;

  -- Update admin users
  IF admin_cargo_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET cargo_id = admin_cargo_id, role = 'Admin', squads = ARRAY['PDV','PDV N1','Compras e Estoque','Financeiro Fiscal','Treinamento','Qualidade'], updated_at = NOW()
    WHERE LOWER(email) IN ('bruna.silva@zetti.tech','brunaramos1807@gmail.com','admin@zetti.com.br');

    UPDATE public.pre_registered_users
    SET cargo_id = admin_cargo_id, updated_at = NOW()
    WHERE LOWER(email) IN ('bruna.silva@zetti.tech','brunaramos1807@gmail.com','admin@zetti.com.br');
  END IF;

  -- Update coordinators
  IF coord_cargo_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET cargo_id = coord_cargo_id, updated_at = NOW()
    WHERE LOWER(email) IN ('amanda.cristina@zetti.tech','jonatas.jesus@zetti.tech','ayron.silva@zetti.tech','isabella.carvalho@zetti.tech')
      AND (cargo_id IS NULL OR cargo_id != coord_cargo_id);

    UPDATE public.pre_registered_users
    SET cargo_id = coord_cargo_id, updated_at = NOW()
    WHERE LOWER(email) IN ('amanda.cristina@zetti.tech','jonatas.jesus@zetti.tech','ayron.silva@zetti.tech','isabella.carvalho@zetti.tech');
  END IF;

  -- Update gestores
  IF gestor_cargo_id IS NOT NULL THEN
    UPDATE public.user_profiles
    SET cargo_id = gestor_cargo_id, updated_at = NOW()
    WHERE LOWER(email) IN ('pedro.filho@zetti.tech','fabiano.felix@zetti.tech')
      AND (cargo_id IS NULL OR cargo_id != gestor_cargo_id);

    UPDATE public.pre_registered_users
    SET cargo_id = gestor_cargo_id, updated_at = NOW()
    WHERE LOWER(email) IN ('pedro.filho@zetti.tech','fabiano.felix@zetti.tech');
  END IF;
END $$;

-- ─── 21. Ensure permission_modules are complete ───────────────────────────────
INSERT INTO public.permission_modules (nome, label, descricao, sort_order)
VALUES
  ('painel_executivo', 'Painel Executivo', 'Dashboard corporativo com KPIs gerais', 1),
  ('evolucao', 'Evolução', 'Gráficos de evolução histórica', 2),
  ('analytics', 'Analytics', 'Análises avançadas e comparativos', 3),
  ('ciclo_atual', 'Ciclo Atual', 'Dados do ciclo em andamento', 4),
  ('ciclos', 'Ciclos', 'Histórico de todos os ciclos', 5),
  ('auditoria', 'Auditoria', 'Registros de auditoria de qualidade', 6),
  ('importacoes', 'Importações', 'Importação de dados de avaliação', 7),
  ('nao_conformidades', 'Não Conformidades', 'Gestão de NCs por tipo e equipe', 8),
  ('elogios', 'Elogios', 'Mural de elogios e reconhecimentos', 9),
  ('pdis', 'PDIs', 'Planos de Desenvolvimento Individual', 10),
  ('calibragem', 'Calibragem', 'Calibração de avaliações', 11),
  ('historico', 'Histórico', 'Histórico completo de ciclos', 12),
  ('logs', 'Logs', 'Logs operacionais do sistema', 13),
  ('documentos_iso', 'Documentos ISO', 'Documentação ISO e governança', 14),
  ('gestao', 'Gestão', 'Módulo de gestão de equipes', 15),
  ('configuracoes', 'Configurações', 'Configurações do sistema e RBAC', 16),
  ('analistas', 'Analistas', 'Cadastro operacional de analistas', 17)
ON CONFLICT (nome) DO UPDATE SET
  label = EXCLUDED.label,
  descricao = EXCLUDED.descricao,
  sort_order = EXCLUDED.sort_order;

-- ─── 22. Grant Admin Master permissions to admin users ───────────────────────
DO $$
DECLARE
  admin_user RECORD;
  mod RECORD;
BEGIN
  FOR admin_user IN
    SELECT up.id FROM public.user_profiles up
    WHERE LOWER(up.email) IN ('bruna.silva@zetti.tech','brunaramos1807@gmail.com','admin@zetti.com.br')
  LOOP
    FOR mod IN SELECT nome FROM public.permission_modules LOOP
      INSERT INTO public.user_permissions (
        user_profile_id, module_name,
        can_view, can_edit, can_delete, can_import, can_export,
        can_close_cycle, can_reopen_cycle, can_approve, can_admin
      ) VALUES (
        admin_user.id, mod.nome,
        true, true, true, true, true, true, true, true, true
      )
      ON CONFLICT (user_profile_id, module_name) DO UPDATE SET
        can_view = true, can_edit = true, can_delete = true,
        can_import = true, can_export = true, can_close_cycle = true,
        can_reopen_cycle = true, can_approve = true, can_admin = true,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END $$;
