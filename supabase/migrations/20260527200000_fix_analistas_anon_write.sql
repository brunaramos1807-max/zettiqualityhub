-- Fix: allow anon (local session users / coordinators) to insert and update analistas
-- Coordinators use the local session system (not Supabase auth), so they hit anon RLS

DROP POLICY IF EXISTS "analistas_anon_insert" ON public.analistas;
CREATE POLICY "analistas_anon_insert"
  ON public.analistas
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "analistas_anon_update" ON public.analistas;
CREATE POLICY "analistas_anon_update"
  ON public.analistas
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
