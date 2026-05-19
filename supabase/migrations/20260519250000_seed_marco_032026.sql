-- ============================================================
-- Migration: Seed March 2026 (03/2026) cycle data
-- QA/IEPC: 25 records | NCs: 17 records | Elogios: 12 records
-- ============================================================

DO $$
DECLARE
  v_cycle_id UUID;
BEGIN

  -- ── 1. Upsert import_cycles record for 03/2026 ──────────────────────────
  INSERT INTO public.import_cycles (
    periodo, file_name, record_count, is_current, is_closed, status, import_status, data_type, updated_at
  ) VALUES (
    '03/2026', 'seed_marco_032026', 55, false, false, 'em_andamento', 'completed', 'mixed', NOW()
  )
  ON CONFLICT (periodo) DO UPDATE SET
    record_count = EXCLUDED.record_count,
    updated_at   = NOW()
  RETURNING id INTO v_cycle_id;

  -- If already existed, fetch the id
  IF v_cycle_id IS NULL THEN
    SELECT id INTO v_cycle_id FROM public.import_cycles WHERE periodo = '03/2026';
  END IF;

  -- ── 2. Delete existing 03/2026 seed data to avoid duplicates ────────────
  DELETE FROM public.cycle_scores WHERE periodo = '03/2026';
  DELETE FROM public.nc_records    WHERE periodo = '03/2026';
  DELETE FROM public.elogios       WHERE periodo = '03/2026';

  -- ── 3. Insert cycle_scores (25 rows) ────────────────────────────────────
  -- NOTE: Frederico Couto appears in Financeiro Fiscal twice (03-10 and 03-20).
  -- Since we deleted all 03/2026 rows above, we do a plain INSERT for the
  -- first 24 unique (periodo, analista, squad) combinations, then insert the
  -- second Frederico/Financeiro Fiscal row separately to avoid the
  -- "ON CONFLICT DO UPDATE command cannot affect row a second time" error.

  -- Batch 1: all rows except the second Frederico Couto / Financeiro Fiscal entry
  INSERT INTO public.cycle_scores
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     nota_final_qa, iepc_total, total_ncs, pontos_deduzidos_nc,
     p1, p2, p3, p4, p5, source)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva',58.80,53.66,3,-60,9.33,21.67,17.50,6.00,10.50,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Gabriel Vieira','Compras e Estoque','Amanda Cristina','Bruna Silva',88.80,80.00,0,0,15.25,29.50,20.00,9.25,15.50,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva',66.00,61.00,3,-60,13.75,20.67,11.33,6.00,7.66,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Peterson Silva','Financeiro Fiscal','Amanda Cristina','Bruna Silva',67.70,68.60,1,-20,11.25,27.00,20.00,7.60,17.40,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Adriel Sanches','PDV','Ayron Silva','Bruna Silva',85.40,80.25,0,0,11.80,23.00,12.20,10.00,15.40,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Alair Filho','PDV','Ayron Silva','Bruna Silva',86.20,79.36,0,0,16.00,31.50,20.00,9.50,19.50,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Artur Carvalho','PDV N1','Ayron Silva','Bruna Silva',72.00,66.50,1,-20,6.60,20.40,11.70,8.20,13.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Compras e Estoque','Amanda Cristina','Bruna Silva',66.25,73.44,2,-40,9.33,21.67,17.50,6.00,10.50,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Dara Nunes','Compras e Estoque','Jonatas Jesus','Bruna Silva',85.20,83.00,0,0,15.00,32.00,19.00,10.00,19.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Michelly Pereira','Financeiro Fiscal','Amanda Cristina','Bruna Silva',89.40,81.00,0,0,14.50,26.40,19.00,10.00,18.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-20','Wyamar Milhomem','Financeiro Fiscal','Amanda Cristina','Bruna Silva',90.80,92.00,0,0,13.00,33.00,18.00,9.00,17.60,'seed'),
    (v_cycle_id,'03/2026','2026-03-23','Bruno Reis','Compras e Estoque','Jonatas Jesus','Bruna Silva',80.00,78.00,0,0,11.75,22.25,15.00,9.25,14.25,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Fernando Carvalho','Compras e Estoque','Jonatas Jesus','Bruna Silva',80.00,78.00,1,-20,12.00,28.33,18.33,10.00,14.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Francisco Pereira','PDV','Ayron Silva','Bruna Silva',76.20,72.00,0,0,11.50,27.50,17.00,6.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Giovanna Oliveira','Compras e Estoque','Jonatas Jesus','Bruna Silva',86.00,80.00,0,0,10.40,27.20,14.00,7.00,10.80,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Gustavo Moreira','PDV','Ayron Silva','Bruna Silva',71.20,81.00,1,-20,13.80,27.00,13.20,7.20,19.20,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Igor Cerqueira','PDV N1','Ayron Silva','Bruna Silva',80.20,73.00,1,-20,11.50,29.50,15.00,7.75,14.25,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Jhenyffer Silva','Compras e Estoque','Jonatas Jesus','Bruna Silva',83.90,75.00,0,0,13.00,25.00,17.00,8.00,15.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Jherik Jesus','PDV','Ayron Silva','Bruna Silva',85.40,93.50,0,0,15.00,26.60,13.05,10.00,18.80,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','José Neto','PDV N1','Ayron Silva','Bruna Silva',64.00,68.00,1,-20,11.00,24.00,14.20,8.80,13.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Milena Santos','Compras e Estoque','Jonatas Jesus','Bruna Silva',67.40,60.00,0,0,10.80,17.00,10.80,6.80,10.80,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Rafael Andrade','PDV','Ayron Silva','Bruna Silva',90.80,86.00,0,0,16.00,34.00,20.00,10.00,17.75,'seed'),
    (v_cycle_id,'03/2026','2026-03-24','Thallison Silva','Compras e Estoque','Jonatas Jesus','Bruna Silva',80.40,77.00,1,-20,10.00,18.00,12.00,7.00,12.00,'seed'),
    (v_cycle_id,'03/2026','2026-03-25','Thiago Maroja','PDV','Ayron Silva','Bruna Silva',82.80,82.00,0,0,12.00,27.00,16.80,8.40,18.80,'seed');

  -- Batch 2: second evaluation for Frederico Couto / Financeiro Fiscal (03-20)
  -- Inserted separately to avoid duplicate constrained values within a single INSERT
  INSERT INTO public.cycle_scores
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     nota_final_qa, iepc_total, total_ncs, pontos_deduzidos_nc,
     p1, p2, p3, p4, p5, source)
  VALUES
    (v_cycle_id,'03/2026','2026-03-20','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva',63.20,42.80,2,-40,6.40,18.70,17.20,8.20,8.00,'seed')
  ON CONFLICT (periodo, analista, squad) DO UPDATE SET
    cycle_id             = EXCLUDED.cycle_id,
    data_registro        = EXCLUDED.data_registro,
    coordenador          = EXCLUDED.coordenador,
    auditor              = EXCLUDED.auditor,
    nota_final_qa        = EXCLUDED.nota_final_qa,
    iepc_total           = EXCLUDED.iepc_total,
    total_ncs            = EXCLUDED.total_ncs,
    pontos_deduzidos_nc  = EXCLUDED.pontos_deduzidos_nc,
    p1                   = EXCLUDED.p1,
    p2                   = EXCLUDED.p2,
    p3                   = EXCLUDED.p3,
    p4                   = EXCLUDED.p4,
    p5                   = EXCLUDED.p5,
    source               = EXCLUDED.source;

  -- ── 4. Insert nc_records (17 rows) ──────────────────────────────────────
  -- The constraint uq_nc_records_key is on (periodo, analista, tipo_nc,
  -- COALESCE(protocolo_referencia,''), COALESCE(avaliacao_id,'')).
  -- Frederico Couto has multiple NCs of tipo 'Integridade do Fluxo Operacional'
  -- in the same period with no protocolo/avaliacao_id, causing intra-batch
  -- conflicts. We insert each row individually with ON CONFLICT DO NOTHING
  -- so all unique rows are inserted and duplicates within the batch are skipped.

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Chamado encerrado por inatividade, alegando falta de dados essenciais, mesmo após o cliente Thals França já ter fornecido as informações e expressado insatisfação',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','Encaminhamento ao time de desenvolvimento quando na realidade tratava-se de ajuste de configuração. A ausência de diagnóstico investigativo resultou em retrabalho',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Chamado encerrado com demanda pendente, sendo necessária a abertura de um novo chamado para continuidade',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Compras e Estoque','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Chamado encerrado por inatividade, alegando falta de dados essenciais, mesmo após o cliente Thals França já ter fornecido as informações e expressado insatisfação',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-10','Frederico Couto','Compras e Estoque','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','Não forneceu detalhes ao cliente Thals França e, após o cliente fornecer as informações, não retomou o atendimento adequadamente',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-20','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Ausência de condução adequada no recebimento do material por outros meios',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-20','Frederico Couto','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Demanda de urgência com impacto fiscal no mesmo dia. O analista realizou encaminhamento sem transparência, sem considerar a criticidade e sem alinhar prazos',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-23','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','A orientação inicial de reprocessar o arquivo de retorno não era a solução correta para o problema apresentado',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-23','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','Forneceu orientação referente a outro chamado, não correspondendo à demanda do cliente, gerando confusão e necessidade de correção',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-23','Larissa Marques','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Acuracidade e Rigor Técnico','Indicou um parâmetro que não atende à necessidade do cliente (retirar comissão de produtos em promoção), tratando-se de funcionalidade distinta',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-23','Peterson Silva','Financeiro Fiscal','Amanda Cristina','Bruna Silva','Integridade do Fluxo Operacional','Informou ao cliente que retornaria após finalizar outra demanda, porém não retornou dentro do prazo adequado',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-24','Artur Carvalho','PDV N1','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Aplicação incorreta da regra de inatividade (15 minutos), mesmo após cliente fornecer dados e descrever a demanda, caracterizando falha de processo',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-24','Fernando Carvalho','Compras e Estoque','Jonatas Jesus','Bruna Silva','Integridade do Fluxo Operacional','O responsável pela demanda (cliente principal) não estava disponível no momento e o analista não adotou procedimento adequado de continuidade',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-24','Igor Cerqueira','PDV N1','Ayron Silva','Bruna Silva','Conformidade de Registro e Rastreabilidade','O analista não realizou a abertura do chamado (SUP) e não registrou a tratativa adequadamente no sistema',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-24','Thallison Silva','Compras e Estoque','Jonatas Jesus','Bruna Silva','Postura e Ética Profissional','Postura inadequada diante de manifestação de insatisfação do cliente, encerrando o atendimento sem resolução',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-25','Gustavo Moreira','PDV','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Negligência no fluxo operacional do atendimento',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  INSERT INTO public.nc_records
    (cycle_id, periodo, data_registro, analista, squad, coordenador, auditor,
     tipo_nc, descricao, pontos_deduzidos)
  VALUES
    (v_cycle_id,'03/2026','2026-03-25','José Neto','PDV N1','Ayron Silva','Bruna Silva','Integridade do Fluxo Operacional','Negligência no fluxo operacional do atendimento',-20)
  ON CONFLICT ON CONSTRAINT uq_nc_records_key DO NOTHING;

  -- ── 5. Insert elogios (12 rows) ─────────────────────────────────────────
  INSERT INTO public.elogios
    (cycle_id, periodo, colaborador, squad, cliente, protocolo, elogio, destaque)
  VALUES
    (v_cycle_id,'03/2026','Isaac Nunes Carvalho','PDV','Thiago Rodrigues','SUP-60510','O cliente Thiago teve um período de reclamações em relação ao suporte. No dia seguinte, o analista Isaac realizou o atendimento e conseguiu resolver a situação. O cliente respondeu: "Muito obrigado pelo empenho em resolver."',false),
    (v_cycle_id,'03/2026','Jherik Jesus','PDV','Renan','SUP-60699','O cliente Renan Oliveira agradeceu pela rapidez e elogiou o analista pelo excelente trabalho.',false),
    (v_cycle_id,'03/2026','Adriel Sanches','PDV','Benjamin','SUP-61237','O cliente Benjamin agradeceu o analista Adriel Sanches pela rapidez no atendimento.',false),
    (v_cycle_id,'03/2026','Michelly Pereira','Financeiro Fiscal','Fabiano - Unipreço','SUP-61529','O cliente Fabiano da Unipreço elogiou a analista Michelly pela forma que respondeu o chamado, destacando ser um bom suporte.',false),
    (v_cycle_id,'03/2026','Jhenyffer Silva','Compras e Estoque','Rafael - Da loja Lucena','SUP-61435','Elogio registrado à colaboradora pela cordialidade e condução do atendimento, garantindo alinhamento de retorno ao cliente.',false),
    (v_cycle_id,'03/2026','Michelly Pereira','Financeiro Fiscal','Carlito','SUP-61992','Cliente considerou o atendimento nota 10.',false),
    (v_cycle_id,'03/2026','Francisco Pereira','PDV','João','SUP-61575','Cliente demonstrou satisfação com o atendimento, agradecendo pela ajuda prestada e destacando que o suporte "salvou o dia".',false),
    (v_cycle_id,'03/2026','Igor Cerqueira','PDV N1','Klisman','SUP-62420','Cliente agradeceu de forma contente elogiando o analista.',false),
    (v_cycle_id,'03/2026','Bruno Reis','Compras e Estoque','Deise','SUP-62631','Foi um elogio direto ao analista informando o quanto ele é bom no atendimento.',false),
    (v_cycle_id,'03/2026','Fernando Carvalho','Compras e Estoque','Bryan / Unipreço','SUP-62279','O cliente agradeceu o analista e ressaltou que ele é fera.',false),
    (v_cycle_id,'03/2026','Thallison Silva','Compras e Estoque','Naiara','#423390','O cliente agradeceu o analista e ressaltou que o mesmo tem salvado sempre o cliente.',false),
    (v_cycle_id,'03/2026','Bruno Reis','Compras e Estoque','Sarah','SUP-63427','A cliente ressaltou que o analista é um excelente profissional.',false);

  -- ── 6. Upsert cycle_summaries ────────────────────────────────────────────
  INSERT INTO public.cycle_summaries
    (periodo, total_analistas, qa_media, iepc_media, total_ncs, total_elogios, updated_at)
  VALUES (
    '03/2026',
    25,
    ROUND((58.80+88.80+66.00+67.70+85.40+86.20+72.00+66.25+85.20+63.20+89.40+90.80+80.00+80.00+76.20+86.00+71.20+80.20+83.90+85.40+64.00+67.40+90.80+80.40+82.80)::NUMERIC / 25, 2),
    ROUND((53.66+80.00+61.00+68.60+80.25+79.36+66.50+73.44+83.00+42.80+81.00+92.00+78.00+78.00+72.00+80.00+81.00+73.00+75.00+93.50+68.00+60.00+86.00+77.00+82.00)::NUMERIC / 25, 2),
    17,
    12,
    NOW()
  )
  ON CONFLICT (periodo) DO UPDATE SET
    total_analistas = EXCLUDED.total_analistas,
    qa_media        = EXCLUDED.qa_media,
    iepc_media      = EXCLUDED.iepc_media,
    total_ncs       = EXCLUDED.total_ncs,
    total_elogios   = EXCLUDED.total_elogios,
    updated_at      = NOW();

  RAISE NOTICE 'Ciclo 03/2026 importado com sucesso. cycle_id=%', v_cycle_id;

END $$;
