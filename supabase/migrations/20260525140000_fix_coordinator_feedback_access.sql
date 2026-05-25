-- Fix coordinator access to feedbacks (all cycles including 05/2026)
-- Drop existing restrictive policies and replace with permissive ones

-- ── feedbacks table ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedbacks_select_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_coordinator_select" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_read_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_select" ON public.feedbacks;

-- Allow all authenticated users to read feedbacks (coordinators, admins, auditors)
CREATE POLICY "feedbacks_authenticated_select"
  ON public.feedbacks
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert feedbacks
DROP POLICY IF EXISTS "feedbacks_insert_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert" ON public.feedbacks;
CREATE POLICY "feedbacks_authenticated_insert"
  ON public.feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update feedbacks (admin editable)
DROP POLICY IF EXISTS "feedbacks_update_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_update" ON public.feedbacks;
CREATE POLICY "feedbacks_authenticated_update"
  ON public.feedbacks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete feedbacks
DROP POLICY IF EXISTS "feedbacks_delete_policy" ON public.feedbacks;
DROP POLICY IF EXISTS "feedbacks_delete" ON public.feedbacks;
CREATE POLICY "feedbacks_authenticated_delete"
  ON public.feedbacks
  FOR DELETE
  TO authenticated
  USING (true);

-- ── feedback_atendimentos table ───────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_atendimentos_select" ON public.feedback_atendimentos;
DROP POLICY IF EXISTS "feedback_atendimentos_select_policy" ON public.feedback_atendimentos;
CREATE POLICY "feedback_atendimentos_authenticated_select"
  ON public.feedback_atendimentos
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feedback_atendimentos_insert" ON public.feedback_atendimentos;
CREATE POLICY "feedback_atendimentos_authenticated_insert"
  ON public.feedback_atendimentos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_atendimentos_update" ON public.feedback_atendimentos;
CREATE POLICY "feedback_atendimentos_authenticated_update"
  ON public.feedback_atendimentos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_atendimentos_delete" ON public.feedback_atendimentos;
CREATE POLICY "feedback_atendimentos_authenticated_delete"
  ON public.feedback_atendimentos
  FOR DELETE
  TO authenticated
  USING (true);

-- ── feedback_coaching table ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_coaching_select" ON public.feedback_coaching;
DROP POLICY IF EXISTS "feedback_coaching_select_policy" ON public.feedback_coaching;
CREATE POLICY "feedback_coaching_authenticated_select"
  ON public.feedback_coaching
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feedback_coaching_insert" ON public.feedback_coaching;
CREATE POLICY "feedback_coaching_authenticated_insert"
  ON public.feedback_coaching
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_coaching_update" ON public.feedback_coaching;
CREATE POLICY "feedback_coaching_authenticated_update"
  ON public.feedback_coaching
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── feedback_pdi table ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_pdi_select" ON public.feedback_pdi;
DROP POLICY IF EXISTS "feedback_pdi_select_policy" ON public.feedback_pdi;
CREATE POLICY "feedback_pdi_authenticated_select"
  ON public.feedback_pdi
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feedback_pdi_insert" ON public.feedback_pdi;
CREATE POLICY "feedback_pdi_authenticated_insert"
  ON public.feedback_pdi
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_pdi_update" ON public.feedback_pdi;
CREATE POLICY "feedback_pdi_authenticated_update"
  ON public.feedback_pdi
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── feedback_historico table ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_historico_select" ON public.feedback_historico;
DROP POLICY IF EXISTS "feedback_historico_select_policy" ON public.feedback_historico;
CREATE POLICY "feedback_historico_authenticated_select"
  ON public.feedback_historico
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "feedback_historico_insert" ON public.feedback_historico;
CREATE POLICY "feedback_historico_authenticated_insert"
  ON public.feedback_historico
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_historico_update" ON public.feedback_historico;
CREATE POLICY "feedback_historico_authenticated_update"
  ON public.feedback_historico
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── analistas table — ensure coordinators can read ───────────────────────────
DROP POLICY IF EXISTS "analistas_select" ON public.analistas;
DROP POLICY IF EXISTS "analistas_select_policy" ON public.analistas;
CREATE POLICY "analistas_authenticated_select"
  ON public.analistas
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "analistas_insert" ON public.analistas;
CREATE POLICY "analistas_authenticated_insert"
  ON public.analistas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "analistas_update" ON public.analistas;
CREATE POLICY "analistas_authenticated_update"
  ON public.analistas
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon access for system auth (localStorage-based auth)
DROP POLICY IF EXISTS "feedbacks_anon_select" ON public.feedbacks;
CREATE POLICY "feedbacks_anon_select"
  ON public.feedbacks
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "feedback_atendimentos_anon_select" ON public.feedback_atendimentos;
CREATE POLICY "feedback_atendimentos_anon_select"
  ON public.feedback_atendimentos
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "feedback_coaching_anon_select" ON public.feedback_coaching;
CREATE POLICY "feedback_coaching_anon_select"
  ON public.feedback_coaching
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "feedback_pdi_anon_select" ON public.feedback_pdi;
CREATE POLICY "feedback_pdi_anon_select"
  ON public.feedback_pdi
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "analistas_anon_select" ON public.analistas;
CREATE POLICY "analistas_anon_select"
  ON public.analistas
  FOR SELECT
  TO anon
  USING (true);
