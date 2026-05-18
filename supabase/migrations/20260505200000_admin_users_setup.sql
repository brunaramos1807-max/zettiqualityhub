-- ============================================================
-- Zetti Quality Hub — Admin Users Setup
-- Register brunaramos1807@gmail.com and bruna.silva@zetti.tech as Admin
-- ============================================================

DO $$
DECLARE
  bruna1_id UUID := gen_random_uuid();
  bruna2_id UUID := gen_random_uuid();
BEGIN
  -- Insert brunaramos1807@gmail.com into auth.users if not exists
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    bruna1_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'brunaramos1807@gmail.com',
    crypt('Zetti@2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Bruna Ramos', 'role', 'Admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  )
  ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = jsonb_build_object('full_name', 'Bruna Ramos', 'role', 'Admin'),
    updated_at = now();

  -- Insert bruna.silva@zetti.tech into auth.users if not exists
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES (
    bruna2_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'bruna.silva@zetti.tech',
    crypt('Zetti@2026!', gen_salt('bf', 10)),
    now(), now(), now(),
    jsonb_build_object('full_name', 'Bruna Silva', 'role', 'Admin'),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
    false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
  )
  ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = jsonb_build_object('full_name', 'Bruna Silva', 'role', 'Admin'),
    updated_at = now();

  -- Upsert user_profiles for brunaramos1807@gmail.com as Admin
  INSERT INTO public.user_profiles (id, email, full_name, role, squad, avatar)
  SELECT
    au.id,
    'brunaramos1807@gmail.com',
    'Bruna Ramos',
    'Admin'::public.user_role,
    NULL,
    'BR'
  FROM auth.users au
  WHERE au.email = 'brunaramos1807@gmail.com'
  LIMIT 1
  ON CONFLICT (email) DO UPDATE SET
    full_name = 'Bruna Ramos',
    role = 'Admin'::public.user_role,
    avatar = 'BR',
    updated_at = CURRENT_TIMESTAMP;

  -- Upsert user_profiles for bruna.silva@zetti.tech as Admin
  INSERT INTO public.user_profiles (id, email, full_name, role, squad, avatar)
  SELECT
    au.id,
    'bruna.silva@zetti.tech',
    'Bruna Silva',
    'Admin'::public.user_role,
    NULL,
    'BS'
  FROM auth.users au
  WHERE au.email = 'bruna.silva@zetti.tech'
  LIMIT 1
  ON CONFLICT (email) DO UPDATE SET
    full_name = 'Bruna Silva',
    role = 'Admin'::public.user_role,
    avatar = 'BS',
    updated_at = CURRENT_TIMESTAMP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Admin user setup error: %', SQLERRM;
END $$;
