-- Add public_token to feedbacks for shareable analyst links
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT NULL;

-- Unique index so tokens can be looked up efficiently
CREATE UNIQUE INDEX IF NOT EXISTS feedbacks_public_token_idx
  ON public.feedbacks (public_token)
  WHERE public_token IS NOT NULL;

-- Allow anonymous read access via public_token (no login required)
DROP POLICY IF EXISTS "Public read via token" ON public.feedbacks;
CREATE POLICY "Public read via token"
  ON public.feedbacks
  FOR SELECT
  USING (public_token IS NOT NULL);
