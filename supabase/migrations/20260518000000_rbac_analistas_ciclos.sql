-- ============================================================
-- QualiVisão — RBAC Enterprise + Analistas + Cycle Status
-- ============================================================

-- 1. CARGOS (configurable roles, not hardcoded)
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#38BDF8',
  is_active BOOLEAN DEFAULT true,
  is_admin_master BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERMISSION MODULES (configurable modules/screens)
CREATE TABLE IF NOT EXISTS public.permission_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  descricao TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 3. USER PERMISSIONS (per-user, per-module, per-action — fully manual)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_import BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_close_cycle BOOLEAN DEFAULT false,
  can_reopen_cycle BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_profile_id, module_name)
);

-- 4. ANALISTAS (operational profiles — no login)
CREATE TABLE IF NOT EXISTS public.analistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  squad TEXT,
  equipe TEXT,
  coordenador TEXT,
  cargo_operacional TEXT,
  nivel TEXT DEFAULT 'Junior',
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'ferias', 'afastado', 'desligado')),
  aniversario DATE,
  tempo_empresa TEXT,
  ultima_promocao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. PERMISSION AUDIT LOGS (who changed what permission when)
CREATE TABLE IF NOT EXISTS public.permission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  target_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'permission',
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. CYCLE STATUS ENHANCEMENTS
ALTER TABLE public.import_cycles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'fechado', 'reaberto')),
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reopened_by_email TEXT,
  ADD COLUMN IF NOT EXISTS closure_notes TEXT;

-- 7. CYCLE CLOSURE HISTORY
CREATE TABLE IF NOT EXISTS public.cycle_closure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('fechado', 'reaberto', 'editado')),
  actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_name TEXT,
  notes TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Extend user_profiles with new fields
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES public.cargos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel TEXT DEFAULT 'Junior',
  ADD COLUMN IF NOT EXISTS status_usuario TEXT DEFAULT 'ativo' CHECK (status_usuario IN ('ativo', 'ferias', 'afastado', 'inativo')),
  ADD COLUMN IF NOT EXISTS coordenador_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS equipes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permissions_override JSONB;

-- 9. Seed default permission modules
INSERT INTO public.permission_modules (nome, label, descricao, sort_order) VALUES
  ('painel_executivo', 'Painel Executivo', 'Dashboard principal com KPIs e gráficos', 1),
  ('auditoria', 'Auditoria', 'Avaliações QA e IEPC', 2),
  ('importacoes', 'Importações', 'Importar planilhas de ciclos', 3),
  ('nao_conformidades', 'Não Conformidades', 'Registro e gestão de NCs', 4),
  ('elogios', 'Elogios', 'Mural de elogios', 5),
  ('qualidade', 'Qualidade', 'Indicadores de qualidade', 6),
  ('ciclos', 'Ciclos', 'Gestão de ciclos operacionais', 7),
  ('analytics', 'Analytics', 'Dashboards analíticos avançados', 8),
  ('evolucao', 'Evolução Geral', 'Gráficos de evolução histórica', 9),
  ('pdis', 'PDIs', 'Planos de desenvolvimento individual', 10),
  ('calibragem', 'Calibragem', 'Calibragem de avaliações', 11),
  ('historico', 'Histórico', 'Histórico de operações', 12),
  ('documentos', 'Documentos ISO', 'Documentos e normas ISO', 13),
  ('gestao', 'Gestão', 'Gestão operacional', 14),
  ('configuracoes', 'Configurações', 'Configurações do sistema e RBAC', 15),
  ('analistas', 'Analistas', 'Cadastro operacional de analistas', 16)
ON CONFLICT (nome) DO NOTHING;

-- 10. Seed default cargos
INSERT INTO public.cargos (nome, descricao, cor, is_active, is_admin_master) VALUES
  ('Admin Master', 'Controle total do sistema — todas as equipes, usuários e configurações', '#22C55E', true, true),
  ('Coordenadora Qualidade', 'Acesso total à governança, fechamento de ciclo, exclusões e auditoria ISO', '#38BDF8', true, false),
  ('Coordenador Geral', 'Supervisiona todos os coordenadores e equipes — visão completa', '#A78BFA', true, false),
  ('Gestor', 'Visão executiva completa — todos os indicadores e dashboards', '#F59E0B', true, false),
  ('Coordenador', 'Visualiza apenas sua squad — dados operacionais da equipe', '#60A5FA', true, false),
  ('Analista Qualidade', 'Auditoria, avaliações, NC e consolidação de ciclos', '#06B6D4', true, false),
  ('Supervisor', 'Supervisão operacional de equipes', '#FB923C', true, false),
  ('Visualizador', 'Acesso somente leitura ao sistema', '#94A3B8', true, false)
ON CONFLICT (nome) DO NOTHING;

-- 11. RLS Policies
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_closure_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read cargos and modules
CREATE POLICY "cargos_read" ON public.cargos FOR SELECT TO authenticated USING (true);
CREATE POLICY "permission_modules_read" ON public.permission_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_permissions_read" ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "analistas_read" ON public.analistas FOR SELECT TO authenticated USING (true);
CREATE POLICY "permission_logs_read" ON public.permission_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycle_closure_history_read" ON public.cycle_closure_history FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to write
CREATE POLICY "cargos_write" ON public.cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "user_permissions_write" ON public.user_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "analistas_write" ON public.analistas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "permission_logs_write" ON public.permission_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cycle_closure_history_write" ON public.cycle_closure_history FOR INSERT TO authenticated WITH CHECK (true);
