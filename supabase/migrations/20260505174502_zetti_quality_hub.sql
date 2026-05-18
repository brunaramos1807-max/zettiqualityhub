-- ============================================================
-- Zetti Quality Hub — Full Schema Migration
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('Admin', 'Coordenador', 'Diretoria');

-- 2. CORE TABLES

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  role public.user_role DEFAULT 'Coordenador'::public.user_role,
  squad TEXT,
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.import_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  imported_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  file_name TEXT,
  record_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.cycle_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  data_registro TEXT,
  analista TEXT NOT NULL,
  squad TEXT NOT NULL,
  coordenador TEXT NOT NULL,
  auditor TEXT,
  nota_final_qa NUMERIC(6,2) DEFAULT 0,
  iepc_total NUMERIC(6,2) DEFAULT 0,
  total_ncs INTEGER DEFAULT 0,
  pontos_deduzidos_nc NUMERIC(6,2) DEFAULT 0,
  p1 NUMERIC(6,2) DEFAULT 0,
  p2 NUMERIC(6,2) DEFAULT 0,
  p3 NUMERIC(6,2) DEFAULT 0,
  p4 NUMERIC(6,2) DEFAULT 0,
  p5 NUMERIC(6,2) DEFAULT 0,
  e1 NUMERIC(6,2) DEFAULT 0,
  e2 NUMERIC(6,2) DEFAULT 0,
  e3 NUMERIC(6,2) DEFAULT 0,
  e4 NUMERIC(6,2) DEFAULT 0,
  e5 NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.nc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  data_registro TEXT,
  analista TEXT NOT NULL,
  squad TEXT NOT NULL,
  coordenador TEXT NOT NULL,
  auditor TEXT,
  tipo_nc TEXT NOT NULL,
  descricao TEXT,
  pontos_deduzidos NUMERIC(6,2) DEFAULT -20,
  protocolo_referencia TEXT,
  avaliacao_id TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.elogios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  colaborador TEXT NOT NULL,
  squad TEXT NOT NULL,
  cliente TEXT,
  protocolo TEXT,
  elogio TEXT NOT NULL,
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_cycle_scores_periodo ON public.cycle_scores(periodo);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_analista ON public.cycle_scores(analista);
CREATE INDEX IF NOT EXISTS idx_cycle_scores_squad ON public.cycle_scores(squad);
CREATE INDEX IF NOT EXISTS idx_nc_records_periodo ON public.nc_records(periodo);
CREATE INDEX IF NOT EXISTS idx_nc_records_analista ON public.nc_records(analista);
CREATE INDEX IF NOT EXISTS idx_elogios_periodo ON public.elogios(periodo);
CREATE INDEX IF NOT EXISTS idx_elogios_colaborador ON public.elogios(colaborador);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 4. FUNCTIONS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, squad, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Coordenador')::public.user_role,
    COALESCE(NEW.raw_user_meta_data->>'squad', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.user_profiles.role),
    updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE id = auth.uid() AND role = 'Admin'::public.user_role
)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_diretoria()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles
  WHERE id = auth.uid() AND role IN ('Admin'::public.user_role, 'Diretoria'::public.user_role)
)
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elogios ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: users manage own, admins manage all
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- import_cycles: all authenticated can read, admins/coordenadores can write
DROP POLICY IF EXISTS "authenticated_read_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_read_cycles"
ON public.import_cycles FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_cycles" ON public.import_cycles;
CREATE POLICY "authenticated_insert_cycles"
ON public.import_cycles FOR INSERT TO authenticated
WITH CHECK (true);

-- cycle_scores: all authenticated can read
DROP POLICY IF EXISTS "authenticated_read_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_read_scores"
ON public.cycle_scores FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_insert_scores"
ON public.cycle_scores FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_scores" ON public.cycle_scores;
CREATE POLICY "authenticated_delete_scores"
ON public.cycle_scores FOR DELETE TO authenticated
USING (true);

-- nc_records: all authenticated can read
DROP POLICY IF EXISTS "authenticated_read_ncs" ON public.nc_records;
CREATE POLICY "authenticated_read_ncs"
ON public.nc_records FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_ncs" ON public.nc_records;
CREATE POLICY "authenticated_insert_ncs"
ON public.nc_records FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_ncs" ON public.nc_records;
CREATE POLICY "authenticated_delete_ncs"
ON public.nc_records FOR DELETE TO authenticated
USING (true);

-- elogios: all authenticated can read, admins/coordenadores can write
DROP POLICY IF EXISTS "authenticated_read_elogios" ON public.elogios;
CREATE POLICY "authenticated_read_elogios"
ON public.elogios FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_elogios" ON public.elogios;
CREATE POLICY "authenticated_insert_elogios"
ON public.elogios FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_elogios" ON public.elogios;
CREATE POLICY "authenticated_update_elogios"
ON public.elogios FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_elogios" ON public.elogios;
CREATE POLICY "authenticated_delete_elogios"
ON public.elogios FOR DELETE TO authenticated
USING (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. SEED ADMIN USERS
DO $$
DECLARE
  bruna_ramos_uuid UUID := gen_random_uuid();
  bruna_silva_uuid UUID := gen_random_uuid();
  admin_uuid UUID := gen_random_uuid();
  coord_ayron_uuid UUID := gen_random_uuid();
  coord_jonatas_uuid UUID := gen_random_uuid();
  coord_amanda_uuid UUID := gen_random_uuid();
  diretoria_uuid UUID := gen_random_uuid();
BEGIN
  -- Admin: brunaramos1807@gmail.com
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    bruna_ramos_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'brunaramos1807@gmail.com', crypt('ZettiAdmin@2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Bruna Ramos', 'role', 'Admin', 'avatar', 'BR'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Admin: bruna.silva@zetti.tech
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    bruna_silva_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'bruna.silva@zetti.tech', crypt('ZettiAdmin@2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Bruna Silva', 'role', 'Admin', 'avatar', 'BS'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Admin: admin@zetti.com.br
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@zetti.com.br', crypt('ZettiAdmin@2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Admin Zetti', 'role', 'Admin', 'avatar', 'AZ'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Coordenador: ayron.silva@zetti.com.br
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    coord_ayron_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'ayron.silva@zetti.com.br', crypt('Coord@PDV2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Ayron Silva', 'role', 'Coordenador', 'squad', 'PDV', 'avatar', 'AS'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Coordenador: jonatas.jesus@zetti.com.br
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    coord_jonatas_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'jonatas.jesus@zetti.com.br', crypt('Coord@CE2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Jonatas Jesus', 'role', 'Coordenador', 'squad', 'Compras e Estoque', 'avatar', 'JJ'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Coordenador: amanda.cristina@zetti.com.br
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    coord_amanda_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'amanda.cristina@zetti.com.br', crypt('Coord@FF2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Amanda Cristina', 'role', 'Coordenador', 'squad', 'Financeiro Fiscal', 'avatar', 'AC'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

  -- Diretoria: diretoria@zetti.com.br
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    diretoria_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'diretoria@zetti.com.br', crypt('Diretoria@2026', gen_salt('bf', 10)), now(), now(), now(),
    jsonb_build_object('full_name', 'Diretoria Zetti', 'role', 'Diretoria', 'avatar', 'DZ'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  ) ON CONFLICT (email) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data error: %', SQLERRM;
END $$;
