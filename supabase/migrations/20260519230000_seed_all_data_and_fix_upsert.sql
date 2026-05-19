-- ============================================================
-- QUALIVISÃO — Seed All Data + Fix UPSERT Constraints
-- 20260519230000_seed_all_data_and_fix_upsert.sql
-- ============================================================

-- ─── 1. Ensure cycle_scores has unique constraint for true UPSERT ─────────────
-- This prevents DELETE+INSERT pattern by enabling ON CONFLICT upsert

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.cycle_scores'::regclass
      AND contype = 'u'
      AND conname = 'cycle_scores_periodo_analista_key'
  ) THEN
    -- Remove duplicates first before adding constraint
    DELETE FROM public.cycle_scores a
    USING public.cycle_scores b
    WHERE a.id > b.id
      AND a.periodo = b.periodo
      AND a.analista = b.analista
      AND a.squad = b.squad;

    ALTER TABLE public.cycle_scores
      ADD CONSTRAINT cycle_scores_periodo_analista_key UNIQUE (periodo, analista, squad);
  END IF;
END $$;

-- ─── 2. Ensure nc_records has unique constraint ───────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.nc_records'::regclass
      AND contype = 'u'
      AND conname = 'nc_records_periodo_analista_protocolo_key'
  ) THEN
    DELETE FROM public.nc_records a
    USING public.nc_records b
    WHERE a.id > b.id
      AND a.periodo = b.periodo
      AND a.analista = b.analista
      AND COALESCE(a.protocolo_referencia, '') = COALESCE(b.protocolo_referencia, '')
      AND a.tipo_nc = b.tipo_nc;

    ALTER TABLE public.nc_records
      ADD CONSTRAINT nc_records_periodo_analista_protocolo_key
      UNIQUE (periodo, analista, protocolo_referencia, tipo_nc);
  END IF;
END $$;

-- ─── 3. Ensure elogios has unique constraint ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.elogios'::regclass
      AND contype = 'u'
      AND conname = 'elogios_periodo_colaborador_protocolo_key'
  ) THEN
    DELETE FROM public.elogios a
    USING public.elogios b
    WHERE a.id > b.id
      AND a.periodo = b.periodo
      AND a.colaborador = b.colaborador
      AND COALESCE(a.protocolo, '') = COALESCE(b.protocolo, '');

    ALTER TABLE public.elogios
      ADD CONSTRAINT elogios_periodo_colaborador_protocolo_key
      UNIQUE (periodo, colaborador, protocolo);
  END IF;
END $$;

-- ─── 4. Ensure analistas unique constraint on email ──────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.analistas'::regclass
      AND contype = 'u'
      AND conname = 'analistas_email_key'
  ) THEN
    ALTER TABLE public.analistas ADD CONSTRAINT analistas_email_key UNIQUE (email);
  END IF;
EXCEPTION WHEN others THEN
  NULL; -- ignore if already exists or conflicts
END $$;

-- ─── 5. Seed import_cycles for 03/2026 and 04/2026 ───────────────────────────

INSERT INTO public.import_cycles (periodo, file_name, record_count, is_current, is_closed, status, import_status, data_type, updated_at)
VALUES
  ('03/2026', 'QA_E_IEPC_ciclo_marco_032026.csv', 25, false, true, 'fechado', 'completed', 'mixed', NOW()),
  ('04/2026', 'pontuacoes_qa_iepc_unificadas_ciclo_abril_042026.xlsx', 23, true, false, 'em_andamento', 'completed', 'mixed', NOW())
ON CONFLICT (periodo) DO UPDATE SET
  is_current = EXCLUDED.is_current,
  is_closed = EXCLUDED.is_closed,
  status = EXCLUDED.status,
  import_status = EXCLUDED.import_status,
  updated_at = NOW();

-- ─── 6. Seed 26 Analysts ─────────────────────────────────────────────────────

INSERT INTO public.analistas (nome, email, cargo_operacional, nivel, equipe, data_admissao, aniversario, ultima_promocao, status)
VALUES
  ('Adriel de Almeida Sanches',        'adriel.sanches@zetti.tech',    'Analista de Suporte 12x36', 'Junior 2',  'PDV',              '2023-06-19', '2002-08-01', '2025-01-03', 'ativo'),
  ('Alair de Paula Filho',             'alair.filho@zetti.tech',       'Analista de Suporte',       'Junior 1',  'PDV',              '2025-06-09', '1997-03-18', '2025-09-08', 'ativo'),
  ('André Marcos Santos de Moura',     'andre.moura@zetti.tech',       'Analista de Suporte',       'Junior 2',  'Compras e Estoque','2025-06-09', '1997-10-29', '2025-09-06', 'ativo'),
  ('Artur Leobas de Franca Carvalho',  'artur.carvalho@zetti.tech',    'Analista de Suporte',       'Trainee 1', 'PDV N1',           '2025-05-20', '2005-03-11', '2026-01-02', 'ativo'),
  ('Bruno de Souza Reis',              'bruno.reis@zetti.tech',        'Analista de Suporte',       'Junior 2',  'Compras e Estoque','2025-08-04', '1997-03-09', '2025-04-08', 'ativo'),
  ('Bruno da Silva Ribeiro',           'bruno.ribeiro@zetti.tech',     'Analista de Suporte 12/36', 'Pleno 1',   'PDV',              '2023-05-06', '1996-08-21', NULL,          'ativo'),
  ('Fernando Nunes Carvalho',          'fernando.carvalho@zetti.tech', 'Analista de Suporte',       'Pleno 1',   'Compras e Estoque','2024-04-01', '2002-12-30', '2025-01-08', 'ativo'),
  ('Francisco Neto Alves Pereira',     'francisco.pereira@zetti.tech', 'Analista de Suporte 12/36', 'Junior 1',  'PDV',              '2025-02-19', '1987-10-04', NULL,          'ativo'),
  ('Frederico Faria do Couto',         'frederico.couto@zetti.tech',   'Analista de Suporte',       'Junior 2',  'Financeiro Fiscal','2025-03-18', '1987-09-12', NULL,          'ativo'),
  ('Gabriel Vieira Santos Teles',      'gabriel.vieira@zetti.tech',    'Analista de Suporte',       'Pleno 1',   'Compras e Estoque','2023-11-20', '1997-05-11', '2025-01-11', 'ativo'),
  ('Giovanna Crystina Rufino Gonçalves','giovanna.oliveira@zetti.tech', 'Analista de Suporte',      'Junior 3',  'Compras e Estoque','2023-06-19', '2003-01-23', '2026-01-01', 'ativo'),
  ('Gustavo Vinicius Moreira Marques', 'gustavo.moreira@zetti.tech',   'Analista de Suporte 12x36', 'Trainee 1', 'PDV',              '2025-10-01', '2001-12-13', '2025-01-09', 'ativo'),
  ('Igor Felzemburg Cerqueira',        'igor.cerqueira@zetti.tech',    'Analista de Suporte',       'Junior 2',  'PDV N1',           '2022-09-26', '1998-10-08', NULL,          'ativo'),
  ('Isaac Nunes Carvalho',             'isaac.carvalho@zetti.tech',    'Analista de Suporte',       'Trainee 2', 'PDV',              '2025-04-01', '2007-02-05', '2026-01-02', 'ativo'),
  ('Jherik De Jesus Calado',           'jherik.jesus@zetti.tech',      'Analista de Suporte 12x36', 'Junior 1',  'PDV',              '2025-09-01', '1999-08-14', '2025-01-09', 'ativo'),
  ('José Bueno de Brito Neto',         'jose.neto@zetti.tech',         'Analista de Suporte',       'Trainee 1', 'PDV N1',           '2025-05-20', '2007-03-31', NULL,          'ativo'),
  ('Larissa Miranda Marques',          'larissa.marques@zetti.tech',   'Analista de Suporte',       'Junior 2',  'Financeiro Fiscal','2025-10-06', '2000-09-26', '2025-06-10', 'ativo'),
  ('Michelly Vitória Cunha Pereira',   'michelly.pereira@zetti.tech',  'Analista de Suporte',       'Junior 1',  'Financeiro Fiscal', NULL,         '2005-07-16', '2025-01-09', 'ativo'),
  ('Milena de Almeida Santos',         'milena.santos@zetti.tech',     'Analista de Suporte',       'Trainee 1', 'Compras e Estoque','2025-06-03', '2003-05-19', '2026-01-02', 'ativo'),
  ('Peterson Sulivan da Silva',        'peterson.silva@zetti.tech',    'Analista de Suporte',       'Junior 2',  'Financeiro Fiscal','2026-02-18', NULL,          NULL,          'ativo'),
  ('Rafael de Sousa Andrade',          'rafael.andrade@zetti.tech',    'Analista de Suporte 12x36', 'Junior 2',  'PDV',              '2025-01-14', '1993-12-02', '2025-01-08', 'ativo'),
  ('Thallison P Silva',                'thalisson.silva@zetti.tech',   'Analista de Suporte',       'Junior 2',  'Compras e Estoque', NULL,         NULL,          '2026-05-01', 'ativo'),
  ('Thiago Borges Fonseca',            'thiago.fonseca@zetti.tech',    'Analista de Suporte',       'Trainee 2', 'PDV',              '2025-01-06', '2002-04-15', '2025-01-11', 'ativo'),
  ('Thiago Ribeiro Maroja',            'thiago.maroja@zetti.tech',     'Analista de Suporte',       'Pleno 1',   'PDV',              '2024-04-22', NULL,          '2026-01-02', 'ativo'),
  ('Wya Mar Barros Milhomem Junior',   'wya.junior@zetti.tech',        'Analista de Suporte',       'Pleno 1',   'Financeiro Fiscal','2024-04-01', '1997-03-09', '2024-01-04', 'ativo'),
  ('Flávio Araújo',                    'flavio.araujo@zetti.tech',     'CEO',                       'Senior',    'Gestão',            NULL,         NULL,          NULL,          'ativo')
ON CONFLICT (email) DO UPDATE SET
  nome             = EXCLUDED.nome,
  cargo_operacional = EXCLUDED.cargo_operacional,
  nivel            = EXCLUDED.nivel,
  equipe           = EXCLUDED.equipe,
  data_admissao    = EXCLUDED.data_admissao,
  aniversario      = EXCLUDED.aniversario,
  ultima_promocao  = EXCLUDED.ultima_promocao,
  status           = EXCLUDED.status;

-- ─── 7. Seed QA/IEPC Scores — Ciclo 03/2026 ─────────────────────────────────

DO $$
DECLARE v_cycle_id UUID;
BEGIN
  SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '03/2026' LIMIT 1;

  INSERT INTO public.cycle_scores
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     nota_final_qa, iepc_total, total_ncs, pontos_deduzidos_nc,
     p1, p2, p3, p4, p5, e1, e2, e3, e4, e5, source)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 58.80, 53.66, 3,-60, 9.33,21.67,17.50, 6.00,10.50,15.00, 9.20,10.40, 7.50,10.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Gabriel Vieira',    'Compras e Estoque','Amanda Cristina','Bruna Silva', 88.80, 80.00, 0,  0,15.25,29.50,20.00, 9.25,15.50,21.00,19.00,17.00,10.00,13.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Larissa Marques',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 66.00, 61.00, 3,-60,13.75,20.67,11.33, 6.00, 7.66,18.00,12.00,10.00, 9.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Peterson Silva',    'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 67.70, 68.60, 1,-20,11.25,27.00,20.00, 7.60,17.40,20.80,12.00,12.00,10.00,13.80,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Adriel Sanches',    'PDV',              'Ayron Silva',    'Bruna Silva', 85.40, 80.25, 0,  0,11.80,23.00,12.20,10.00,15.40,22.50,16.43,17.00,12.00,12.32,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Alair Filho',       'PDV',              'Ayron Silva',    'Bruna Silva', 86.20, 79.36, 0,  0,16.00,31.50,20.00, 9.50,19.50,26.25,14.16,13.33,11.25,14.37,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Artur Carvalho',    'PDV N1',           'Ayron Silva',    'Bruna Silva', 72.00, 66.50, 1,-20, 6.60,20.40,11.70, 8.20,13.00,21.00,12.50,13.00, 8.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Dara Nunes',        'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 85.20, 83.00, 0,  0,15.00,32.00,19.00,10.00,19.00,26.00,16.00,15.00,11.00,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Michelly Pereira',  'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 89.40, 81.00, 0,  0,14.50,26.40,19.00,10.00,18.00,24.00,16.00,15.00,12.60,13.40,'seed'),
    (v_cycle_id,'03/2026','2026-03-20','Wyamar Milhomem',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 90.80, 92.00, 0,  0,13.00,33.00,18.00, 9.00,17.60,25.00,20.00,19.00,14.00,14.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Bruno Reis',        'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 80.00, 78.00, 0,  0,11.75,22.25,15.00, 9.25,14.25,24.00,18.00,13.00, 9.00,14.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Fernando Carvalho', 'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 80.00, 78.00, 1,-20,12.00,28.33,18.33,10.00,14.00,24.00,16.00,15.00,11.00,11.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Francisco Pereira', 'PDV',              'Ayron Silva',    'Bruna Silva', 76.20, 72.00, 0,  0,11.50,27.50,17.00, 6.00,12.00,22.00,15.00,14.00,10.00,11.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Giovanna Oliveira', 'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 86.00, 80.00, 0,  0,10.40,27.20,14.00, 7.00,10.80,25.00,16.00,16.00,11.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Gustavo Moreira',   'PDV',              'Ayron Silva',    'Bruna Silva', 71.20, 81.00, 1,-20,13.80,27.00,13.20, 7.20,19.20,24.00,17.00,12.00,13.00,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Igor Cerqueira',    'PDV N1',           'Ayron Silva',    'Bruna Silva', 80.20, 73.00, 1,-20,11.50,29.50,15.00, 7.75,14.25,24.00,13.00,14.00,10.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Jhenyffer Silva',   'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 83.90, 75.00, 0,  0,13.00,25.00,17.00, 8.00,15.00,22.00,15.00,15.00, 8.00,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Jherik Jesus',      'PDV',              'Ayron Silva',    'Bruna Silva', 85.40, 93.50, 0,  0,15.00,26.60,13.05,10.00,18.80,30.00,20.00,14.25,14.25,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','José Neto',         'PDV N1',           'Ayron Silva',    'Bruna Silva', 64.00, 68.00, 1,-20,11.00,24.00,14.20, 8.80,13.00,23.00,14.00,15.00, 9.00, 7.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Milena Santos',     'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 67.40, 60.00, 0,  0,10.80,17.00,10.80, 6.80,10.80,18.00,12.00,11.00, 9.00,10.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Rafael Andrade',    'PDV',              'Ayron Silva',    'Bruna Silva', 90.80, 86.00, 0,  0,16.00,34.00,20.00,10.00,17.75,27.00,17.00,16.00,11.00,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Thallison Silva',   'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 80.40, 77.00, 1,-20,10.00,18.00,12.00, 7.00,12.00,25.00,16.00,14.00,11.00,11.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Thiago Maroja',     'PDV',              'Ayron Silva',    'Bruna Silva', 82.80, 82.00, 0,  0,12.00,27.00,16.80, 8.40,18.80,25.00,17.00,17.00,11.00,12.00,'seed'),
    -- Frederico Couto appears 3x in the data (different squads/dates) — using squad as differentiator
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto',   'Compras e Estoque','Amanda Cristina','Bruna Silva', 66.25, 73.44, 2,-40, 9.33,21.67,17.50, 6.00,10.50,22.50,15.00,12.50, 9.38,14.06,'seed'),
    (v_cycle_id,'03/2026','2026-03-20','Frederico Couto',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 63.20, 42.80, 2,-40, 6.40,18.70,17.20, 8.20, 8.00, 8.00, 6.80, 5.20,12.00,10.80,'seed')
  ON CONFLICT (periodo, analista, squad) DO UPDATE SET
    nota_final_qa       = EXCLUDED.nota_final_qa,
    iepc_total          = EXCLUDED.iepc_total,
    total_ncs           = EXCLUDED.total_ncs,
    pontos_deduzidos_nc = EXCLUDED.pontos_deduzidos_nc,
    p1 = EXCLUDED.p1, p2 = EXCLUDED.p2, p3 = EXCLUDED.p3,
    p4 = EXCLUDED.p4, p5 = EXCLUDED.p5,
    e1 = EXCLUDED.e1, e2 = EXCLUDED.e2, e3 = EXCLUDED.e3,
    e4 = EXCLUDED.e4, e5 = EXCLUDED.e5,
    cycle_id = EXCLUDED.cycle_id;
END $$;

-- ─── 8. Seed QA/IEPC Scores — Ciclo 04/2026 ─────────────────────────────────

DO $$
DECLARE v_cycle_id UUID;
BEGIN
  SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '04/2026' LIMIT 1;

  INSERT INTO public.cycle_scores
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     nota_final_qa, iepc_total, total_ncs, pontos_deduzidos_nc,
     p1, p2, p3, p4, p5, e1, e2, e3, e4, e5, source)
  VALUES
    (v_cycle_id,'04/2026','2026-04-22','Gabriel Vieira',    'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 88.20, 80.00, 0,  0,16.10,28.90,14.40,11.70, 9.00,24.00,15.00,16.00,12.00,13.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-22','Danilo Cerqueira',  'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 81.00, 76.00, 1,-20,14.50,27.90,18.00,12.60,12.00,22.00,15.00,14.00,12.00,13.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-21','Fernando Carvalho', 'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 87.50, 93.00, 1,-20,18.60,32.40,18.00,14.00, 9.00,28.00,19.00,18.00,14.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-21','Milena Santos',     'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 82.80, 76.00, 1,-20,17.00,30.00,16.00,12.00, 7.50,25.00,16.00,15.00,11.00, 9.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-21','Giovanna Oliveira', 'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 80.60, 81.00, 1,-20,13.80,28.40,16.20,11.60, 7.00,27.00,16.00,15.00,11.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-21','Thalisson Silva',   'Compras e Estoque','Jonatas Jesus',  'Bruna Silva', 89.50, 80.00, 0,  0,22.00,29.70,18.00,12.80, 7.00,26.00,17.00,16.00,10.00,11.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-18','Bruno Reis',        'PDV',              'Ayron Silva',    NULL,          87.60, 80.00, 0,  0,16.00,25.50,18.00,10.50, 7.50,24.00,16.00,16.00,12.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-18','Gustavo Moreira',   'PDV',              'Ayron Silva',    NULL,          55.83, 53.00, 4,-80,14.40,18.90,10.00, 9.80, 4.40,18.00,10.00,10.00, 7.50, 7.50,'seed'),
    (v_cycle_id,'04/2026','2026-04-18','Alair Filho',       'PDV',              'Ayron Silva',    'Bruna Silva', 64.00, 75.00, 3,-60,17.00,21.00,16.00,11.50, 6.50,24.00,15.00,14.00,10.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-18','Francisco Pereira', 'PDV',              'Ayron Silva',    'Bruna Silva', 70.00, 67.00, 2,-40,16.20,23.80,14.40, 9.50, 5.50,20.00,15.00,13.00, 9.00,10.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-17','Adriel Sanches',    'PDV',              'Ayron Silva',    'Bruna Silva', 82.50, 80.00, 0,  0,13.50,30.00,18.00,11.50, 6.50,24.00,16.00,16.00,12.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-17','Artur Carvalho',    'PDV N1',           'Ayron Silva',    'Bruna Silva', 63.20, 70.00, 2,-40, 9.00,26.00,18.00, 9.50, 4.00,24.00,16.00,12.00, 8.00,10.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-15','Jherik Jesus',      'PDV',              'Ayron Silva',    'Bruna Silva', 90.60, 90.00, 0,  0,20.00,24.00,15.00,13.25,10.00,28.00,19.00,16.00,15.00,12.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-15','Wyamar Milhomem',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 74.90, 78.00, 1,-20,17.80,24.60,16.00,12.40, 9.00,24.00,18.00,15.00,10.00,11.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-15','Rafael Andrade',    'PDV',              'Ayron Silva',    'Bruna Silva', 83.33, 84.00, 2,-40,13.00,28.50,17.00,11.50, 9.00,25.00,15.00,19.00,11.00,14.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-15','Bruno Ribeiro',     'PDV',              'Ayron Silva',    'Bruna Silva', 74.60, 82.00, 2,-40,15.80,26.00,15.40,10.00,10.40,24.00,14.00,19.00,11.00,14.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Jose Neto',         'PDV',              'Ayron Silva',    NULL,          66.20, 63.00, 3,-60,12.10,22.30,12.60, 7.90, 5.80,22.00,12.00,11.00,10.00, 8.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Igor Cerqueira',    'PDV N1',           'Ayron Silva',    'Bruna Silva', 76.40, 74.00, 1,-20,18.00,31.00,18.00,11.00, 6.00,27.00,14.00,13.00, 9.00,11.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Maroja',     'PDV',              'Ayron Silva',    'Bruna Silva', 80.00, 90.00, 2,-40,15.00,27.00,16.40,11.40,10.02,27.00,18.00,16.00,14.00,15.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Fonseca',    'PDV',              'Ayron Silva',    'Bruna Silva', 74.00, 81.00, 4,-80,12.00,26.00,16.00,11.00, 8.00,26.00,17.00,16.00, 9.00,13.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Michelly Pereira',  'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 83.00, 85.00, 0,  0,18.30,24.50,15.50,12.20,10.00,24.00,18.00,16.00,12.00,15.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Larissa Marques',   'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 63.20, 56.00, 4,-80,15.80,22.50,13.00,11.30, 6.20,18.00,10.00,10.00, 7.00,11.00,'seed'),
    (v_cycle_id,'04/2026','2026-04-25','Peterson Silva',    'Financeiro Fiscal','Amanda Cristina','Bruna Silva', 60.50, 70.00, 3,-60,17.00,18.00,14.00,11.00, 7.00,22.00,15.00,12.00,10.00,11.00,'seed')
  ON CONFLICT (periodo, analista, squad) DO UPDATE SET
    nota_final_qa       = EXCLUDED.nota_final_qa,
    iepc_total          = EXCLUDED.iepc_total,
    total_ncs           = EXCLUDED.total_ncs,
    pontos_deduzidos_nc = EXCLUDED.pontos_deduzidos_nc,
    p1 = EXCLUDED.p1, p2 = EXCLUDED.p2, p3 = EXCLUDED.p3,
    p4 = EXCLUDED.p4, p5 = EXCLUDED.p5,
    e1 = EXCLUDED.e1, e2 = EXCLUDED.e2, e3 = EXCLUDED.e3,
    e4 = EXCLUDED.e4, e5 = EXCLUDED.e5,
    cycle_id = EXCLUDED.cycle_id;
END $$;

-- ─── 9. Seed NCs — Ciclo 04/2026 ─────────────────────────────────────────────

DO $$
DECLARE v_cycle_id UUID;
BEGIN
  SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '04/2026' LIMIT 1;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos, protocolo_referencia, avaliacao_id)
  VALUES
    (v_cycle_id,'04/2026','2026-04-22','Danilo Cerqueira','Compras e Estoque','Jonatas Jesus','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #427754. Encaminhamento para desenvolvimento realizado sem formalização adequada da tratativa para o cliente, com documentação restrita ao âmbito interno.',-20,'#427754','4b9f947f-6f69-4613-ac69-263a01303787'),
    (v_cycle_id,'04/2026','2026-04-21','Fernando Carvalho','Compras e Estoque','Jonatas Jesus','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #436826. Não consta evidencia de formalização de protocolo SUP, impossibilitando o registro técnico estruturado da demanda.',-20,'#436826','1768c8b8-350c-4e28-84f0-dfc3d8f56571'),
    (v_cycle_id,'04/2026','2026-04-21','Milena Santos','Compras e Estoque','Jonatas Jesus','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #425354: Encerramento realizado sem validação com o cliente e sem formalização institucional da conclusão.',-20,'#425354','6c6e23e4-d9ec-4272-80f4-1491b4925fe2'),
    (v_cycle_id,'04/2026','2026-04-21','Giovanna Oliveira','Compras e Estoque','Jonatas Jesus','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #434792. Não foi evidenciada a comunicação do protocolo SUP ao cliente durante o atendimento.',-20,'#434792','b87ef007-323a-4cc5-a9b6-dc8529db6793'),
    (v_cycle_id,'04/2026','2026-04-18','Gustavo Moreira','PDV','Ayron Silva',NULL,'Integridade do Fluxo Operacional','Atendimento #42934. Encerramento realizado em desacordo com o fluxo operacional aplicável a chamado de serviço.',-20,'#429340','30112137-86d6-4917-966b-c4ceb58ed0dc'),
    (v_cycle_id,'04/2026','2026-04-18','Gustavo Moreira','PDV','Ayron Silva',NULL,'Conformidade de Registro e Rastreabilidade','Atendimento #427696. A demanda exigia formalização obrigatória em SUP para continuidade da tratativa técnica.',-20,'#427696','30112137-86d6-4917-966b-c4ceb58ed0dc'),
    (v_cycle_id,'04/2026','2026-04-18','Gustavo Moreira','PDV','Ayron Silva',NULL,'Conformidade de Registro e Rastreabilidade','Atendimento #436318. A demanda exigia formalização obrigatória em SUP por envolver tratativa técnica com impacto operacional.',-20,'#436318','30112137-86d6-4917-966b-c4ceb58ed0dc'),
    (v_cycle_id,'04/2026','2026-04-18','Gustavo Moreira','PDV','Ayron Silva',NULL,'Conformidade de Registro e Rastreabilidade','Atendimento #433248. A demanda exigia formalização obrigatória em SUP para continuidade da tratativa técnica.',-20,'#433248','30112137-86d6-4917-966b-c4ceb58ed0dc'),
    (v_cycle_id,'04/2026','2026-04-18','Alair Filho','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #425532. O analista documentou no SUP que o cliente confirmou a normalização, porém não há evidência dessa confirmação na interação.',-20,'#425532','4ded10d2-5ec5-4b9c-a35f-d0ce2f4ebc1b'),
    (v_cycle_id,'04/2026','2026-04-18','Alair Filho','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #434168. A demanda foi encaminhada para continuidade junto à equipe de desenvolvimento, porém o protocolo SUP não foi comunicado ao cliente.',-20,'#434168','4ded10d2-5ec5-4b9c-a35f-d0ce2f4ebc1b'),
    (v_cycle_id,'04/2026','2026-04-18','Alair Filho','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #436882. A documentação registrada no SUP indica que o cliente confirmou a troca de adquirente, porém essa confirmação não está evidenciada na interação.',-20,'#436882','4ded10d2-5ec5-4b9c-a35f-d0ce2f4ebc1b'),
    (v_cycle_id,'04/2026','2026-04-18','Francisco Pereira','PDV','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #425990. O analista informou ao cliente que retornaria, porém o retorno não ocorreu dentro do período esperado da interação.',-20,'#425990','709882ae-c7fd-4c17-9509-2b26a88bc171'),
    (v_cycle_id,'04/2026','2026-04-18','Francisco Pereira','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #434588. O encaminhamento ao DEV foi registrado no SUP como comentário privado, não visível ao cliente.',-20,'#434588','709882ae-c7fd-4c17-9509-2b26a88bc171'),
    (v_cycle_id,'04/2026','2026-04-17','Artur Carvalho','PDV N1','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Artur Carvalho não formalizou nem comunicou o protocolo SUP no atendimento #425312.',-20,'#425312','dbed3b8b-6c06-4f28-9633-acaf57588c5d'),
    (v_cycle_id,'04/2026','2026-04-17','Artur Carvalho','PDV N1','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Artur Carvalho não formalizou nem comunicou o protocolo SUP no atendimento #426150.',-20,'#426150','dbed3b8b-6c06-4f28-9633-acaf57588c5d'),
    (v_cycle_id,'04/2026','2026-04-15','Wyamar Milhomem','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #430966. Encerramento do atendimento sem observância do tempo mínimo de inatividade previsto.',-20,'#425396','db171100-cf37-45ff-8a20-eef14ea25180'),
    (v_cycle_id,'04/2026','2026-04-15','Rafael Andrade','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #426934. O analista iniciou o atendimento após retorno de intervalo sem realizar a identificação completa da tratativa.',-20,'#426934','3c6a4df8-4324-4c26-8f16-dfc727d2c3ae'),
    (v_cycle_id,'04/2026','2026-04-15','Rafael Andrade','PDV','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #426934. O analista realizou o encerramento sem confirmar com o cliente o entendimento sobre a continuidade.',-20,'#426934b','3c6a4df8-4324-4c26-8f16-dfc727d2c3ae'),
    (v_cycle_id,'04/2026','2026-04-15','Bruno Ribeiro','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #432022. Divergência entre a continuidade informada ao cliente e o registro realizado no SUP.',-20,'#432022','05787830-deb2-4fb2-95a5-4b8d29150f22'),
    (v_cycle_id,'04/2026','2026-04-15','Bruno Ribeiro','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #429652. Ausência de registro obrigatório no SUP, documentação insuficiente.',-20,'#429652','05787830-deb2-4fb2-95a5-4b8d29150f22'),
    (v_cycle_id,'04/2026','2026-04-25','Jose Neto','PDV','Ayron Silva',NULL,'Conformidade de Registro e Rastreabilidade','Atendimento #426886. Não foi evidenciada a comunicação do número do chamado SUP ao cliente.',-20,'#426886','fa20f64d-1fc9-4f83-9382-5c6b3c9ebe20'),
    (v_cycle_id,'04/2026','2026-04-25','Jose Neto','PDV','Ayron Silva',NULL,'Integridade do Fluxo Operacional','Atendimento #426886. Encerramento do atendimento por inatividade de forma indevida, mesmo após o cliente retornar.',-20,'#426886b','fa20f64d-1fc9-4f83-9382-5c6b3c9ebe20'),
    (v_cycle_id,'04/2026','2026-04-25','Jose Neto','PDV','Ayron Silva',NULL,'Conformidade de Registro e Rastreabilidade','Atendimento #436604. A documentação do atendimento não reflete a tratativa realizada.',-20,'#436604','fa20f64d-1fc9-4f83-9382-5c6b3c9ebe20'),
    (v_cycle_id,'04/2026','2026-04-25','Igor Cerqueira','PDV N1','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #432438. Quebra no fluxo do atendimento devido à ausência de interação do analista por aproximadamente 32 minutos.',-20,'#432438','ca346e68-babb-4217-8e50-c59293e5c4e4'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Maroja','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #425294. Falhas críticas de processo relacionadas à ausência de formalização do SUP e documentação do atendimento.',-20,'#425294','ac22100a-bb97-41b7-a512-d62778e39849'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Maroja','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #438518. Não foi evidenciada a formalização do protocolo SUP, nem a comunicação do mesmo ao cliente.',-20,'#438518','ac22100a-bb97-41b7-a512-d62778e39849'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Fonseca','PDV','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #428122. Encerramento por inatividade após 13 minutos sem seguir o SLA de 30 minutos.',-20,'#428122','831ed809-17d4-4e36-8173-0e84f229895e'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Fonseca','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #428122. Não consta formalização e comunicação do protocolo SUP.',-20,'#428122b','831ed809-17d4-4e36-8173-0e84f229895e'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Fonseca','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #434490. Não houve evidência de formalização e comunicação do protocolo SUP.',-20,'#434490','831ed809-17d4-4e36-8173-0e84f229895e'),
    (v_cycle_id,'04/2026','2026-04-25','Thiago Fonseca','PDV','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #437804. Não houve evidência de formalização e comunicação do protocolo SUP.',-20,'#437804','831ed809-17d4-4e36-8173-0e84f229895e'),
    (v_cycle_id,'04/2026','2026-04-25','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #425568. A analista não conduziu a tratativa da demanda e manteve o atendimento dependente de outro analista.',-20,'#425568','00d026f1-8012-45e8-b680-dcecaa3769fc'),
    (v_cycle_id,'04/2026','2026-04-25','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #425568. A analista não realizou a abertura de chamado nem efetuou qualquer registro formal da demanda.',-20,'#425568b','00d026f1-8012-45e8-b680-dcecaa3769fc'),
    (v_cycle_id,'04/2026','2026-04-25','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #427460. A tratativa foi interrompida sem conclusão da etapa em andamento.',-20,'#427460','00d026f1-8012-45e8-b680-dcecaa3769fc'),
    (v_cycle_id,'04/2026','2026-04-25','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','Atendimento #437796. Orientação técnica incorreta sobre a possibilidade de alteração do CST relacionado à geração do SPED.',-20,'#437796','00d026f1-8012-45e8-b680-dcecaa3769fc'),
    (v_cycle_id,'04/2026','2026-04-25','Peterson Silva','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #435786. A informação de encaminhamento ao setor comercial foi registrada internamente, porém não foi comunicada ao cliente.',-20,'#435786','252a2349-71aa-4f35-b083-f00245f8df29'),
    (v_cycle_id,'04/2026','2026-04-25','Peterson Silva','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Atendimento #435786. O atendimento foi interrompido sem conclusão formal, sem orientação ao cliente.',-20,'#435786b','252a2349-71aa-4f35-b083-f00245f8df29'),
    (v_cycle_id,'04/2026','2026-04-25','Peterson Silva','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Conformidade de Registro e Rastreabilidade','Atendimento #425474. O atendimento apresentou falha na comunicação do fluxo da tratativa.',-20,'#425474','252a2349-71aa-4f35-b083-f00245f8df29')
  ON CONFLICT (periodo, analista, protocolo_referencia, tipo_nc) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    pontos_deduzidos = EXCLUDED.pontos_deduzidos,
    cycle_id = EXCLUDED.cycle_id;
END $$;

-- ─── 10. Seed Elogios — Ciclo 03/2026 ────────────────────────────────────────

DO $$
DECLARE v_cycle_id UUID;
BEGIN
  SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '03/2026' LIMIT 1;

  INSERT INTO public.elogios (cycle_id, periodo, colaborador, squad, cliente, protocolo, elogio, destaque)
  VALUES
    (v_cycle_id,'03/2026','Isaac Nunes Carvalho','PDV','Thiago Rodrigues','SUP-60510','O cliente Thiago teve um período de reclamações. O analista Isaac realizou o atendimento e conseguiu resolver a situação. O cliente respondeu: "Muito obrigado pelo empenho em resolver."',false),
    (v_cycle_id,'03/2026','Jherik Jesus','PDV','Renan','SUP-60699','O cliente Renan Oliveira agradeceu pela rapidez, e elogiou o analista pelo excelente trabalho.',false),
    (v_cycle_id,'03/2026','Adriel Sanches','PDV','Benjamin','SUP-61237','O cliente Benjamin agradeceu o analista Adriel Sanches pela rapidez no atendimento.',false),
    (v_cycle_id,'03/2026','Michelly Pereira','Financeiro Fiscal','Fabiano - Unipreço','SUP-61529','O cliente Fabiano da Unipreço elogiou a analista Michelly pela forma que respondeu o chamado, destacando ser um bom suporte.',false),
    (v_cycle_id,'03/2026','Jhenyffer Silva','Compras e Estoque','Rafael - Da loja Lucena','SUP-61435','Elogio registrado à colaboradora pela cordialidade e condução do atendimento, garantindo alinhamento de retorno ao cliente.',false),
    (v_cycle_id,'03/2026','Michelly Pereira','Financeiro Fiscal','Carlito','SUP-61992','Cliente considerou o atendimento nota 10.',false),
    (v_cycle_id,'03/2026','Francisco Pereira','PDV','João','SUP-61575','Cliente demonstrou satisfação com o atendimento, agradecendo pela ajuda prestada e destacando que o suporte salvou o dia.',false),
    (v_cycle_id,'03/2026','Igor Cerqueira','PDV N1','Klisman','SUP-62420','Cliente agradeceu de forma contente elogiando o analista.',false),
    (v_cycle_id,'03/2026','Bruno Reis','Compras e Estoque','Deise','SUP-62631','Foi um elogio direto ao analista informando o quanto ele é bom no atendimento.',false),
    (v_cycle_id,'03/2026','Fernando Carvalho','Compras e Estoque','Bryan / Unipreço','SUP-62279','O cliente agradeceu o analista e ressaltou que ele é fera.',false),
    (v_cycle_id,'03/2026','Thallison Silva','Compras e Estoque','Naiara','#423390','O cliente agradeceu o analista e ressaltou que o mesmo tem salvado sempre o cliente.',false),
    (v_cycle_id,'03/2026','Bruno Reis','Compras e Estoque','Sarah','SUP-63427','A cliente ressaltou que o analista é um excelente profissional.',false)
  ON CONFLICT (periodo, colaborador, protocolo) DO UPDATE SET
    elogio = EXCLUDED.elogio,
    squad = EXCLUDED.squad,
    cycle_id = EXCLUDED.cycle_id;
END $$;

-- ─── 11. Seed Elogios — Ciclo 04/2026 ────────────────────────────────────────

DO $$
DECLARE v_cycle_id UUID;
BEGIN
  SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '04/2026' LIMIT 1;

  INSERT INTO public.elogios (cycle_id, periodo, colaborador, squad, cliente, protocolo, elogio, destaque)
  VALUES
    (v_cycle_id,'04/2026','Bruno Reis','Compras e Estoque','Sarah','SUP-63427','Cliente elogiou diretamente o trabalho do analista.',false),
    (v_cycle_id,'04/2026','Igor Cerqueira','PDV N1','Klisman','SUP-63649','Elogio direto ao analista destacando a qualidade do atendimento.',false),
    (v_cycle_id,'04/2026','Gabriel Vieira','Financeiro Fiscal','Rogério','SUP-63687','Cliente destacou que o analista ajudou muito na situação.',false),
    (v_cycle_id,'04/2026','Adriel Sanches','PDV','Emanuele','SUP-63864','Cliente destacou o analista como referência em atendimento.',false),
    (v_cycle_id,'04/2026','Michelly Pereira','Financeiro Fiscal','Pedro','SUP-63986','Elogio direto destacando a qualidade do atendimento.',false),
    (v_cycle_id,'04/2026','Bruno Ribeiro','PDV','Abimael','SUP-64062','Cliente destacou a agilidade e importância do suporte.',false),
    (v_cycle_id,'04/2026','Jherik Jesus','PDV','Felipe','SUP-64478','Cliente destacou o analista como excelente atendimento.',false),
    (v_cycle_id,'04/2026','Fernando Carvalho','Compras e Estoque','Eloane','SUP-64776','Cliente afirmou que sem o suporte não saberia o que fazer.',false),
    (v_cycle_id,'04/2026','Adriel Sanches','PDV','Samuel','SUP-64782','Elogio ao excelente trabalho prestado.',false),
    (v_cycle_id,'04/2026','Milena Santos','Compras e Estoque','Sirley','SUP-64733','Cliente elogiou a paciência e qualidade do atendimento.',false),
    (v_cycle_id,'04/2026','Francisco Pereira','PDV','Lucas','SUP-62638','Cliente destacou resolução satisfatória do atendimento.',false),
    (v_cycle_id,'04/2026','Gustavo Moreira','PDV','Lohran','SUP-65314','Elogio ao excelente trabalho prestado.',false),
    (v_cycle_id,'04/2026','Jherik Jesus','PDV','Amon','SUP-65387','Elogio pela resolução satisfatória.',false),
    (v_cycle_id,'04/2026','Thalisson Silva','Compras e Estoque','Kawane Oliveira','#434584','Cliente parabenizou pelo atendimento considerado incrível.',false),
    (v_cycle_id,'04/2026','Francisco Pereira','PDV','Elaine','SUP-66217','Cliente destacou atenção e agilidade no atendimento.',false),
    (v_cycle_id,'04/2026','Michelly Pereira','Financeiro Fiscal','Cláudio','SUP-66426','Cliente elogiou a forma de explicar e apoio prestado.',false),
    (v_cycle_id,'04/2026','Thalisson Silva','Compras e Estoque','Kawane','#438498','Cliente agradeceu e destacou alto nível de atendimento.',false),
    (v_cycle_id,'04/2026','Larissa Marques','Financeiro Fiscal','Abimael','SUP-66543','Cliente destacou grande ajuda e suporte na situação.',false),
    (v_cycle_id,'04/2026','Francisco Pereira','PDV','Thiago','SUP-66629','Atendimento claro, efetivo e com bom suporte.',false),
    (v_cycle_id,'04/2026','Gabriel Vieira','Compras e Estoque','Cláudio','SUP-66598','Cliente destacou que as orientações resolveram totalmente o problema.',false)
  ON CONFLICT (periodo, colaborador, protocolo) DO UPDATE SET
    elogio = EXCLUDED.elogio,
    squad = EXCLUDED.squad,
    cycle_id = EXCLUDED.cycle_id;
END $$;

-- ─── 12. Refresh cycle summaries for both periods ────────────────────────────

SELECT public.refresh_cycle_summary('03/2026');
SELECT public.refresh_cycle_summary('04/2026');
