-- Create advertencias table
CREATE TABLE IF NOT EXISTS public.advertencias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  analista_nome text NOT NULL,
  data date NOT NULL,
  categoria text NOT NULL DEFAULT 'Comportamento',
  severidade text NOT NULL DEFAULT 'leve' CHECK (severidade IN ('leve', 'moderada', 'grave')),
  motivo text NOT NULL,
  descricao text,
  responsavel text,
  evidencia text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_acompanhamento', 'encerrada')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.advertencias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'advertencias' AND policyname = 'advertencias_all') THEN
    CREATE POLICY "advertencias_all" ON public.advertencias FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
