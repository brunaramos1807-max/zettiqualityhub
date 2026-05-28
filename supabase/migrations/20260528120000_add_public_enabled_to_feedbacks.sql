-- Add public_enabled column to feedbacks (was missing from previous migration)
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE;

-- Update RLS policy to allow anonymous read only when public_enabled is true
DROP POLICY IF EXISTS "Public read via token" ON public.feedbacks;
CREATE POLICY "Public read via token"
  ON public.feedbacks
  FOR SELECT
  TO anon
  USING (public_token IS NOT NULL AND public_enabled = TRUE);
