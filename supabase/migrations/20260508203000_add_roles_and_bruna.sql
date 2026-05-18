-- Add brunaramos1807@gmail.com as admin in user_profiles if not already present
-- This migration ensures the user profile exists for Supabase auth

-- Note: The actual auth.users entry is created when the user signs up via Supabase Auth.
-- This migration adds a placeholder that will be linked when she first logs in.

-- Ensure the user_role enum includes all needed roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'user_role'
  ) THEN
    CREATE TYPE user_role AS ENUM ('Admin', 'Coordenador', 'Diretoria');
  END IF;
END $$;

-- Add 'Gestor', 'Coordenador Geral', 'Auditor' to user_role if not present
DO $$
BEGIN
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Gestor';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Coordenador Geral';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Auditor';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
