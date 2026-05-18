-- ============================================================
-- QualiVisão — Complete Rebuild Migration
-- Adds: documents, audit_logs, manual_evaluations, cycle_summaries
-- Storage bucket for documents
-- ============================================================

-- 1. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  version TEXT DEFAULT '1.0',
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  uploaded_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- 2. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. CYCLE SUMMARIES (for historical consolidation)
CREATE TABLE IF NOT EXISTS public.cycle_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL UNIQUE,
  total_analistas INTEGER DEFAULT 0,
  qa_media NUMERIC(6,2) DEFAULT 0,
  iepc_media NUMERIC(6,2) DEFAULT 0,
  total_ncs INTEGER DEFAULT 0,
  total_elogios INTEGER DEFAULT 0,
  squad_breakdown JSONB,
  top_analistas JSONB,
  critical_analistas JSONB,
  insights JSONB,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. MANUAL EVALUATIONS (for hybrid entry system)
CREATE TABLE IF NOT EXISTS public.manual_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.import_cycles(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
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
  observacoes TEXT,
  entrada_manual BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. STRATEGIC INDICATORS TABLE
CREATE TABLE IF NOT EXISTS public.strategic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,
  analista TEXT NOT NULL,
  squad TEXT NOT NULL,
  qa_score NUMERIC(6,2) DEFAULT 0,
  iepc_score NUMERIC(6,2) DEFAULT 0,
  total_ncs INTEGER DEFAULT 0,
  total_elogios INTEGER DEFAULT 0,
  trend_qa TEXT DEFAULT 'stable',
  trend_iepc TEXT DEFAULT 'stable',
  is_above_average BOOLEAN DEFAULT false,
  is_below_average BOOLEAN DEFAULT false,
  is_critical BOOLEAN DEFAULT false,
  is_highlight BOOLEAN DEFAULT false,
  consecutive_below_avg INTEGER DEFAULT 0,
  consecutive_above_avg INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_is_active ON public.documents(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cycle_summaries_periodo ON public.cycle_summaries(periodo);
CREATE INDEX IF NOT EXISTS idx_manual_evaluations_periodo ON public.manual_evaluations(periodo);
CREATE INDEX IF NOT EXISTS idx_manual_evaluations_analista ON public.manual_evaluations(analista);
CREATE INDEX IF NOT EXISTS idx_strategic_indicators_periodo ON public.strategic_indicators(periodo);
CREATE INDEX IF NOT EXISTS idx_strategic_indicators_analista ON public.strategic_indicators(analista);

-- 7. ENABLE RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_indicators ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- documents: all authenticated can read active docs
DROP POLICY IF EXISTS "authenticated_read_documents" ON public.documents;
CREATE POLICY "authenticated_read_documents"
ON public.documents FOR SELECT TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "authenticated_insert_documents" ON public.documents;
CREATE POLICY "authenticated_insert_documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_documents" ON public.documents;
CREATE POLICY "authenticated_update_documents"
ON public.documents FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_documents" ON public.documents;
CREATE POLICY "authenticated_delete_documents"
ON public.documents FOR DELETE TO authenticated
USING (true);

-- audit_logs: admins can read all, users can read own
DROP POLICY IF EXISTS "authenticated_read_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_read_audit_logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- cycle_summaries: all authenticated can read
DROP POLICY IF EXISTS "authenticated_read_cycle_summaries" ON public.cycle_summaries;
CREATE POLICY "authenticated_read_cycle_summaries"
ON public.cycle_summaries FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_write_cycle_summaries" ON public.cycle_summaries;
CREATE POLICY "authenticated_write_cycle_summaries"
ON public.cycle_summaries FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- manual_evaluations: all authenticated can read/write
DROP POLICY IF EXISTS "authenticated_read_manual_evaluations" ON public.manual_evaluations;
CREATE POLICY "authenticated_read_manual_evaluations"
ON public.manual_evaluations FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_write_manual_evaluations" ON public.manual_evaluations;
CREATE POLICY "authenticated_write_manual_evaluations"
ON public.manual_evaluations FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- strategic_indicators: all authenticated can read/write
DROP POLICY IF EXISTS "authenticated_read_strategic_indicators" ON public.strategic_indicators;
CREATE POLICY "authenticated_read_strategic_indicators"
ON public.strategic_indicators FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_write_strategic_indicators" ON public.strategic_indicators;
CREATE POLICY "authenticated_write_strategic_indicators"
ON public.strategic_indicators FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 9. STORAGE BUCKET FOR DOCUMENTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qualivisao-documents',
  'qualivisao-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "authenticated_read_documents_storage" ON storage.objects;
CREATE POLICY "authenticated_read_documents_storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'qualivisao-documents');

DROP POLICY IF EXISTS "authenticated_upload_documents_storage" ON storage.objects;
CREATE POLICY "authenticated_upload_documents_storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'qualivisao-documents');

DROP POLICY IF EXISTS "authenticated_delete_documents_storage" ON storage.objects;
CREATE POLICY "authenticated_delete_documents_storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'qualivisao-documents');

-- 10. ADD MISSING COLUMNS TO EXISTING TABLES (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_cycles' AND column_name='is_current') THEN
    ALTER TABLE public.import_cycles ADD COLUMN is_current BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_cycles' AND column_name='is_closed') THEN
    ALTER TABLE public.import_cycles ADD COLUMN is_closed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_cycles' AND column_name='closed_at') THEN
    ALTER TABLE public.import_cycles ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cycle_scores' AND column_name='is_manual') THEN
    ALTER TABLE public.cycle_scores ADD COLUMN is_manual BOOLEAN DEFAULT false;
  END IF;
END $$;
