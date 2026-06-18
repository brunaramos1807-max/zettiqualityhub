# QUALIVISÃO — CONTRATO OFICIAL DE INTEGRAÇÃO

> **Versão:** 1.0  
> **Data de Emissão:** 18/06/2026  
> **Classificação:** Documento Técnico Oficial — Uso Restrito  
> **Responsável Técnico:** Área de Qualidade — Zetti Tech  
> **Finalidade:** Definir o contrato oficial de integração entre o novo Sistema de Avaliação e o QualiVisão  
> **URL de Produção:** https://qualivisao.tec.br  
> **Endpoint de Integração:** `POST https://qualivisao.tec.br/api/receber-avaliacao`

---

## SUMÁRIO

1. [DESTINO CICLO — cycle_scores](#1-destino-ciclo--cycle_scores)
2. [DESTINO FEEDBACK EXPERIENCE](#2-destino-feedback-experience)
3. [CRITÉRIOS QA](#3-critérios-qa)
4. [CRITÉRIOS IEPC](#4-critérios-iepc)
5. [NÃO CONFORMIDADES](#5-não-conformidades)
6. [HISTÓRICO](#6-histórico)
7. [EVIDÊNCIAS](#7-evidências)
8. [COACHING](#8-coaching)
9. [PDI](#9-pdi)
10. [CONTRATO FUTURO — Campos Obrigatórios](#10-contrato-futuro--campos-obrigatórios)

---

## 1. DESTINO CICLO — cycle_scores

### 1.1 Tabela Principal

**Nome:** `public.cycle_scores`

### 1.2 Estrutura Completa

```sql
cycle_scores
├─ id                     UUID PRIMARY KEY DEFAULT gen_random_uuid()
├─ cycle_id               UUID REFERENCES import_cycles(id) ON DELETE CASCADE
├─ periodo                TEXT NOT NULL                          -- "MM/YYYY" ex: "04/2026"
├─ data_registro          TEXT                                   -- "YYYY-MM-DD"
├─ analista               TEXT NOT NULL                          -- Nome do analista
├─ squad                  TEXT NOT NULL                          -- Equipe/squad
├─ coordenador            TEXT NOT NULL                          -- Nome do coordenador
├─ auditor                TEXT                                   -- Nome do auditor
├─ nota_final_qa          NUMERIC(6,2) DEFAULT 0                 -- Score QA 0-100
├─ iepc_total             NUMERIC(6,2) DEFAULT 0                 -- Score IEPC 0-100
├─ total_ncs              INTEGER DEFAULT 0                      -- Quantidade de NCs
├─ pontos_deduzidos_nc    NUMERIC(6,2) DEFAULT 0                 -- Pontos deduzidos por NCs
├─ p1                     NUMERIC(6,2) DEFAULT 0                 -- Pilar QA P1 (max 22)
├─ p2                     NUMERIC(6,2) DEFAULT 0                 -- Pilar QA P2 (max 34)
├─ p3                     NUMERIC(6,2) DEFAULT 0                 -- Pilar QA P3 (max 18)
├─ p4                     NUMERIC(6,2) DEFAULT 0                 -- Pilar QA P4 (max 14)
├─ p5                     NUMERIC(6,2) DEFAULT 0                 -- Pilar QA P5 (max 12)
├─ e1                     NUMERIC(6,2) DEFAULT 0                 -- Dimensão IEPC E1 (max 30)
├─ e2                     NUMERIC(6,2) DEFAULT 0                 -- Dimensão IEPC E2 (max 20)
├─ e3                     NUMERIC(6,2) DEFAULT 0                 -- Dimensão IEPC E3 (max 20)
├─ e4                     NUMERIC(6,2) DEFAULT 0                 -- Dimensão IEPC E4 (max 15)
├─ e5                     NUMERIC(6,2) DEFAULT 0                 -- Dimensão IEPC E5 (max 15)
├─ tipo_demanda           TEXT                                   -- Tipo da demanda avaliada
├─ qtd_atendimentos_avaliados INTEGER                            -- Quantidade de atendimentos
├─ protocolo              TEXT                                   -- Protocolo de referência
├─ sintese_ia             TEXT                                   -- Síntese gerada por IA (legado)
├─ tendencias             JSONB                                  -- Tendências calculadas
├─ reincidencia           JSONB                                  -- Dados de reincidência
├─ criterios              JSONB                                  -- Mapa de critérios avaliados
├─ evidencias             JSONB                                  -- Evidências brutas (legado)
├─ analytics              JSONB                                  -- Analytics do payload
├─ payload_version        TEXT                                   -- "v1_legacy" | "v2_lovable"
├─ payload_normalized     JSONB                                  -- Payload normalizado completo
├─ source                 TEXT DEFAULT 'integration'             -- Origem do registro
├─ is_manual              BOOLEAN DEFAULT false                  -- Se foi inserido manualmente
└─ created_at             TIMESTAMPTZ DEFAULT now()
```

**Constraint de unicidade (upsert):** `UNIQUE(periodo, analista, squad)`

### 1.3 Colunas Obrigatórias

| Coluna | Tipo | Obrigatório | Observação |
|--------|------|-------------|------------|
| `periodo` | TEXT | ✅ SIM | Formato "MM/YYYY" |
| `analista` | TEXT | ✅ SIM | Nome completo do analista |
| `squad` | TEXT | ✅ SIM | Nome da equipe |
| `coordenador` | TEXT | ✅ SIM | Nome do coordenador |
| `nota_final_qa` | NUMERIC | ✅ SIM | Score QA 0–100 |
| `iepc_total` | NUMERIC | ✅ SIM | Score IEPC 0–100 |

### 1.4 Colunas Opcionais

| Coluna | Tipo | Observação |
|--------|------|------------|
| `auditor` | TEXT | Nome do auditor responsável |
| `data_registro` | TEXT | Data da avaliação |
| `p1`–`p5` | NUMERIC | Pontuações dos pilares QA |
| `e1`–`e5` | NUMERIC | Pontuações das dimensões IEPC |
| `total_ncs` | INTEGER | Contagem de NCs |
| `pontos_deduzidos_nc` | NUMERIC | Penalidade total por NCs |
| `qtd_atendimentos_avaliados` | INTEGER | Quantidade de atendimentos |
| `criterios` | JSONB | Mapa de critérios individuais |
| `analytics` | JSONB | Dados analíticos complementares |
| `payload_version` | TEXT | Versão do payload recebido |

### 1.5 Campos Utilizados pelos Dashboards

| Campo | Dashboards que utilizam |
|-------|------------------------|
| `nota_final_qa` | Painel Executivo, Ciclo Atual, Auditoria, QA & IEPC, Analytics, Evolução Geral, Gestão de Pessoas |
| `iepc_total` | Painel Executivo, Ciclo Atual, QA & IEPC, Analytics |
| `p1`–`p5` | QA & IEPC 360° (RadarChart, BarChart, tabela de aderência) |
| `e1`–`e5` | QA & IEPC 360° (RadarChart, BarChart, tabela de aderência) |
| `total_ncs` | Painel Executivo, Auditoria, Ciclo Atual |
| `analista` | Todos os dashboards (filtro e agrupamento) |
| `squad` | Todos os dashboards (filtro e agrupamento) |
| `coordenador` | Auditoria, Gestão de Pessoas, filtros |
| `periodo` | Todos os dashboards (filtro de ciclo) |

### 1.6 Campos Apenas Armazenados (não exibidos em dashboards)

| Campo | Observação |
|-------|------------|
| `payload_normalized` | Payload completo normalizado — auditoria técnica |
| `payload_version` | Rastreamento de versão do payload |
| `tendencias` | Armazenado, não exibido atualmente |
| `reincidencia` | Armazenado, não exibido atualmente |
| `evidencias` | Legado — substituído por `feedback_atendimentos` |
| `sintese_ia` | Legado — não populado atualmente |
| `source` | Controle interno de origem |
| `is_manual` | Flag de entrada manual |

### 1.7 Campos Legados

| Campo | Status | Observação |
|-------|--------|------------|
| `evidencias` | ⚠️ Legado | Substituído por `feedback_atendimentos`; mantido por compatibilidade |
| `sintese_ia` | ⚠️ Legado | Não populado; mantido na estrutura |
| `protocolo` | ⚠️ Raramente usado | Protocolo de referência geral |

### 1.8 Exemplo Real de Registro Completo

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cycle_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "periodo": "04/2026",
  "data_registro": "2026-04-15",
  "analista": "Ana Paula Ferreira",
  "squad": "PDV",
  "coordenador": "Bruna Ramos",
  "auditor": "Carlos Mendes",
  "nota_final_qa": 87.50,
  "iepc_total": 82.00,
  "total_ncs": 1,
  "pontos_deduzidos_nc": -20.00,
  "p1": 20.00,
  "p2": 30.00,
  "p3": 16.00,
  "p4": 12.00,
  "p5": 9.50,
  "e1": 26.00,
  "e2": 18.00,
  "e3": 16.00,
  "e4": 12.00,
  "e5": 10.00,
  "tipo_demanda": "Suporte Técnico",
  "qtd_atendimentos_avaliados": 3,
  "protocolo": null,
  "sintese_ia": null,
  "tendencias": null,
  "reincidencia": null,
  "criterios": {
    "criterio_0_identificacao_e_boas_vindas": { "pts": 20, "max": 20, "evidencia": "P1 — aderido" },
    "criterio_1_formalizacao_protocolo": { "pts": 10, "max": 20, "evidencia": "P1 — parcial" }
  },
  "evidencias": null,
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 8,
    "ciclos_consecutivos_evolucao": 2
  },
  "payload_version": "v2_lovable",
  "payload_normalized": { "...": "payload completo normalizado" },
  "source": "integration",
  "is_manual": false,
  "created_at": "2026-04-15T14:30:00Z"
}
```

---

## 2. DESTINO FEEDBACK EXPERIENCE

### 2.1 Tabelas Envolvidas

| Tabela | Papel |
|--------|-------|
| `feedbacks` | Registro principal do feedback por analista/ciclo |
| `feedback_atendimentos` | Atendimentos individuais auditados |
| `feedback_coaching` | Registros de coaching estruturado |
| `feedback_historico` | Histórico de scores QA/IEPC por analista/ciclo |
| `feedback_pdi` | PDI legado vinculado ao feedback (substituído por `pdi_records`) |

### 2.2 Estrutura Completa — Tabela `feedbacks`

```sql
feedbacks
├─ id                         UUID PRIMARY KEY DEFAULT gen_random_uuid()
├─ analista_id                UUID REFERENCES analistas(id)         -- FK para analistas
├─ ciclo                      TEXT                                   -- "MM/YYYY"
├─ periodo_inicio             DATE                                   -- Data início do ciclo
├─ periodo_fim                DATE                                   -- Data fim do ciclo
├─ coordenador                TEXT                                   -- Nome do coordenador
├─ equipe                     TEXT                                   -- Squad/equipe
├─ auditor                    TEXT                                   -- Nome do auditor
├─ qa_score                   NUMERIC                                -- Score QA 0-100
├─ iepc_score                 NUMERIC                                -- Score IEPC 0-100
├─ aderencia_score            NUMERIC                                -- Score de aderência 0-100
├─ posicao_squad              INTEGER                                -- Posição no ranking do squad
├─ total_squad                INTEGER                                -- Total de analistas no squad
├─ ciclos_consecutivos_evolucao INTEGER                              -- Ciclos consecutivos em evolução
├─ pilares_qa                 JSONB  -- [{nome, pontuacao, max, variacao, observacao, codigo}]
├─ pilares_iepc               JSONB  -- [{nome, pontuacao, max, variacao, codigo}]
├─ pontos_fortes              JSONB  -- [{titulo, descricao}]
├─ oportunidades              JSONB  -- [{titulo, descricao}]
├─ resumo_ciclo               TEXT                                   -- Texto de fechamento do ciclo
├─ tendencias                 JSONB                                  -- Tendências calculadas
├─ conquistas                 JSONB                                  -- Conquistas do ciclo
├─ status                     TEXT   -- 'gerado'|'enviado'|'lido'|'validado'|'fechado'|'draft'
├─ version                    INTEGER DEFAULT 1
├─ origem                     TEXT   -- 'api_lovable'|'importacao_json'|'manual'|'integration'
├─ external_id                TEXT                                   -- ID externo para idempotência
├─ snapshot_json_completo     JSONB                                  -- Payload original completo
├─ public_token               UUID                                   -- Token para link público
├─ public_enabled             BOOLEAN DEFAULT false                  -- Habilita acesso público
├─ evolucao_tecnica           TEXT                                   -- Bloco de evolução técnica
├─ evolucao_comportamental    TEXT                                   -- Bloco de evolução comportamental
├─ atencao_evolutiva          TEXT                                   -- Bloco de atenção evolutiva
├─ risco_operacional          TEXT                                   -- Texto de risco operacional
├─ coaching_details           JSONB                                  -- Coaching estruturado (JSONB)
├─ payload_version            TEXT                                   -- "v1_legacy" | "v2_lovable"
├─ payload_normalized         JSONB                                  -- Payload normalizado
└─ created_at / updated_at    TIMESTAMPTZ
```

### 2.3 Campos Obrigatórios

| Campo | Tipo | Observação |
|-------|------|------------|
| `analista_id` | UUID | FK para `analistas.id` |
| `ciclo` | TEXT | Formato "MM/YYYY" |
| `qa_score` | NUMERIC | Score QA 0–100 |
| `iepc_score` | NUMERIC | Score IEPC 0–100 |
| `coordenador` | TEXT | Nome do coordenador |
| `equipe` | TEXT | Squad/equipe |

### 2.4 Campos Opcionais

| Campo | Tipo | Observação |
|-------|------|------------|
| `aderencia_score` | NUMERIC | Score de aderência |
| `pilares_qa` | JSONB | Array de pilares QA com pontuações |
| `pilares_iepc` | JSONB | Array de dimensões IEPC com pontuações |
| `evolucao_tecnica` | TEXT | Texto do bloco de evolução técnica |
| `evolucao_comportamental` | TEXT | Texto do bloco de evolução comportamental |
| `atencao_evolutiva` | TEXT | Texto do bloco de atenção evolutiva |
| `resumo_ciclo` | TEXT | Texto de fechamento do ciclo |
| `coaching_details` | JSONB | Coaching estruturado |
| `posicao_squad` | INTEGER | Posição no ranking do squad |
| `total_squad` | INTEGER | Total de analistas no squad |
| `external_id` | TEXT | ID externo para idempotência |

### 2.5 Campos Utilizados na Interface

| Campo | Tela(s) que utiliza |
|-------|---------------------|
| `qa_score` | `/feedback`, `/feedback/[id]`, `/feedback/public/[token]`, People Analytics |
| `iepc_score` | `/feedback`, `/feedback/[id]`, `/feedback/public/[token]` |
| `aderencia_score` | `/feedback/[id]`, `/pdis` |
| `pilares_qa` | `/feedback/[id]` (RadarChart, tabela de pilares) |
| `pilares_iepc` | `/feedback/[id]` (RadarChart, tabela de pilares) |
| `evolucao_tecnica` | `/feedback/[id]` (bloco de texto) |
| `evolucao_comportamental` | `/feedback/[id]` (bloco de texto) |
| `atencao_evolutiva` | `/feedback/[id]` (bloco de texto) |
| `resumo_ciclo` | `/feedback/[id]` (fechamento do ciclo) |
| `status` | `/feedback` (badge de status, inline changer) |
| `public_token` | `/feedback/[id]` (geração de link público) |
| `public_enabled` | `/feedback/public/[token]` (controle de acesso) |
| `posicao_squad` | `/feedback/[id]` (posição no squad) |
| `ciclos_consecutivos_evolucao` | `/feedback/[id]` (badge de evolução) |

### 2.6 Campos Apenas Armazenados

| Campo | Observação |
|-------|------------|
| `snapshot_json_completo` | Payload original completo — auditoria e reprocessamento |
| `payload_normalized` | Payload normalizado — rastreamento técnico |
| `payload_version` | Versão do payload — rastreamento técnico |
| `tendencias` | Armazenado, não exibido atualmente |
| `conquistas` | Armazenado, não exibido atualmente |
| `coaching_details` | Armazenado como JSONB; exibição via `feedback_coaching` |

### 2.7 Campos Legados

| Campo | Status | Observação |
|-------|--------|------------|
| `risco_operacional` | ⚠️ Legado | Mapeado de `atencao_evolutiva`; mantido por compatibilidade |
| `version` | ⚠️ Raramente usado | Controle de versão do registro |

### 2.8 Exemplo Real do Payload Completo Recebido

```json
{
  "metadata": {
    "origem": "sistema_avaliacao_v2",
    "versao": "2.0",
    "gerado_em": "2026-04-15T14:00:00Z",
    "avaliacao_id": "AVA-2026-04-ANA001"
  },
  "analista": {
    "nome": "Ana Paula Ferreira",
    "nome_completo": "Ana Paula Ferreira Silva",
    "email": "ana.ferreira@empresa.com",
    "equipe": "PDV",
    "coordenador": "Bruna Ramos",
    "auditor": "Carlos Mendes"
  },
  "ciclo": {
    "nome": "04/2026",
    "data_inicio": "2026-04-01",
    "data_fim": "2026-04-30",
    "status": "concluido"
  },
  "scores": {
    "qa": 87.50,
    "iepc": 82.00,
    "aderencia": 91.00
  },
  "qa_pilares": [
    { "codigo": "P1", "nome": "Gestão do Fluxo e Rastreabilidade do Atendimento", "nota": 20.00, "maximo": 22 },
    { "codigo": "P2", "nome": "Gestão da Tratativa da Demanda", "nota": 30.00, "maximo": 34 },
    { "codigo": "P3", "nome": "Análise e Assertividade Técnica da Demanda", "nota": 16.00, "maximo": 18 },
    { "codigo": "P4", "nome": "Qualidade da Comunicação no Atendimento", "nota": 12.00, "maximo": 14 },
    { "codigo": "P5", "nome": "Conduta Relacional no Atendimento", "nota": 9.50, "maximo": 12 }
  ],
  "iepc_pilares": [
    { "codigo": "E1", "nome": "Resolução Percebida", "nota": 26.00, "maximo": 30 },
    { "codigo": "E2", "nome": "Compreensão e Segurança", "nota": 18.00, "maximo": 20 },
    { "codigo": "E3", "nome": "Esforço do Cliente", "nota": 16.00, "maximo": 20 },
    { "codigo": "E4", "nome": "Tempo e Fluidez", "nota": 12.00, "maximo": 15 },
    { "codigo": "E5", "nome": "Experiência Relacional", "nota": 10.00, "maximo": 15 }
  ],
  "atendimentos": [
    {
      "protocolo": "SUP-2026-001234",
      "sup": "SUP-001234",
      "cliente": "João da Silva",
      "data": "2026-04-10",
      "duracao": "00:12:34",
      "nota_qa": 92.00,
      "assunto": "Dúvida sobre fatura",
      "solucao": "Orientado sobre vencimento e forma de pagamento",
      "sintese": "Atendimento excelente com resolução completa",
      "criterios": [
        {
          "pilar_codigo": "P1",
          "pilar_nome": "Gestão do Fluxo",
          "criterio_codigo": "1.1",
          "criterio_nome": "Identificação e Boas-vindas",
          "status": "aderido"
        }
      ],
      "nao_conformidades": []
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "Você disse 'não sei' sem buscar a informação",
      "como_poderia_ser": "Poderia dizer 'vou verificar para você' e buscar a resposta",
      "dica_de_ouro": "Nunca encerre uma dúvida sem oferecer uma alternativa de solução",
      "categoria": "Comunicação"
    }
  ],
  "nao_conformidades": [
    {
      "protocolo": "SUP-2026-001235",
      "tipo_nc": "NC-2",
      "descricao": "Informação técnica incorreta fornecida ao cliente",
      "severity": "moderada",
      "pontos_deduzidos": -20,
      "aplicar_pontos": true,
      "reincidente": false
    }
  ],
  "feedback_blocks": {
    "evolucao_tecnica": ["Demonstrou melhora na resolução de demandas técnicas", "Uso correto das ferramentas de apoio"],
    "evolucao_comportamental": ["Comunicação mais assertiva", "Empatia com o cliente melhorou"],
    "atencao_evolutiva": ["Atenção ao registro técnico no sistema"],
    "fechamento_ciclo": "Ciclo de evolução positiva. Analista demonstra comprometimento com a qualidade."
  },
  "pdi": [
    {
      "objetivo": "Melhorar acuracidade técnica nas respostas",
      "acao": "Revisar base de conhecimento semanalmente",
      "resultado_esperado": "Zero NCs de acuracidade no próximo ciclo",
      "prazo": "2026-05-31",
      "status": "pendente"
    }
  ],
  "historico": [
    { "ciclo": "01/2026", "qa": 78.00, "iepc": 75.00 },
    { "ciclo": "02/2026", "qa": 82.00, "iepc": 79.00 },
    { "ciclo": "03/2026", "qa": 85.00, "iepc": 80.00 }
  ],
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 8,
    "ciclos_consecutivos_evolucao": 3,
    "percentual_aderencia": 91.00
  },
  "external_id": "AVA-2026-04-ANA001"
}
```

---

## 3. CRITÉRIOS QA

### 3.1 Lista Oficial dos Critérios QA

| Código | Nome Exibido | Peso Máximo | Cor |
|--------|-------------|-------------|-----|
| **P1** | **Gestão do Fluxo e Rastreabilidade do Atendimento** | **22 pts** | `#3B82F6` |
| P1.1 | Identificação e Boas-vindas | 5 pts | — |
| P1.2 | Formalização e comunicação do protocolo SUP | 9 pts | — |
| P1.3 | Encerramento da interação por etapa | 8 pts | — |
| **P2** | **Gestão da Tratativa da Demanda** | **34 pts** | `#06B6D4` |
| P2.1 | Validação e esclarecimento de dúvidas | 8 pts | — |
| P2.2 | Orientação e condução da execução | 9 pts | — |
| P2.3 | Resolução ou direcionamento adequado | 9 pts | — |
| P2.4 | Documentação técnica do atendimento | 8 pts | — |
| **P3** | **Análise e Assertividade Técnica da Demanda** | **18 pts** | `#10B981` |
| P3.1 | Análise técnica da demanda | — | — |
| P3.2 | Uso adequado das ferramentas de apoio | — | — |
| **P4** | **Qualidade da Comunicação no Atendimento** | **14 pts** | `#F59E0B` |
| P4.1 | Uso da língua portuguesa | — | — |
| P4.2 | Tom profissional e clareza | — | — |
| **P5** | **Conduta Relacional no Atendimento** | **12 pts** | `#8B5CF6` |
| P5.1 | Cordialidade e empatia | — | — |
| P5.2 | Proatividade e over delivery | — | — |
| **TOTAL** | | **100 pts** | |

### 3.2 Código Técnico Utilizado no Payload

```json
"qa_pilares": [
  { "codigo": "P1", "nome": "Gestão do Fluxo e Rastreabilidade do Atendimento", "nota": 20.00, "maximo": 22 },
  { "codigo": "P2", "nome": "Gestão da Tratativa da Demanda", "nota": 30.00, "maximo": 34 },
  { "codigo": "P3", "nome": "Análise e Assertividade Técnica da Demanda", "nota": 16.00, "maximo": 18 },
  { "codigo": "P4", "nome": "Qualidade da Comunicação no Atendimento", "nota": 12.00, "maximo": 14 },
  { "codigo": "P5", "nome": "Conduta Relacional no Atendimento", "nota": 9.50, "maximo": 12 }
]
```

### 3.3 Onde Cada Critério é Utilizado

| Critério | Onde é utilizado |
|----------|-----------------|
| P1–P5 (notas) | `cycle_scores.p1`–`p5` — alimenta todos os dashboards |
| P1–P5 (notas) | `feedbacks.pilares_qa` (JSONB) — exibido em `/feedback/[id]` |
| P1–P5 (notas) | `/qa-iepc` — RadarChart, BarChart, tabela de aderência por pilar |
| P1–P5 (notas) | `/cycle-dashboard` — PillarMatrix, PillarDrilldownModal |
| P1–P5 (notas) | `/ciclo-atual` — modal de detalhe do analista |
| Subpilares (P1.1–P5.2) | `/qa-iepc` — tabela de aderência por critério individual |
| Subpilares (P1.1–P5.2) | `cycle_scores.criterios` (JSONB) — armazenado para análise futura |

### 3.4 Classificação de Performance QA

| Faixa | Classificação | Cor |
|-------|-------------|-----|
| ≥ 90 | Excelência Operacional | `#10B981` (verde) |
| 80–89 | Performance Esperada | `#FACC15` (amarelo) |
| 70–79 | Operacional | `#F59E0B` (âmbar) |
| < 70 | Crítico | `#EF4444` (vermelho) |

---

## 4. CRITÉRIOS IEPC

### 4.1 Lista Oficial das Dimensões IEPC

| Código | Nome Exibido | Peso Máximo | Cor |
|--------|-------------|-------------|-----|
| **E1** | **Resolução Percebida** | **30 pts** | `#38BDF8` |
| **E2** | **Compreensão e Segurança (Clareza/Confiança)** | **20 pts** | `#A855F7` |
| **E3** | **Esforço do Cliente** | **20 pts** | `#10B981` |
| **E4** | **Tempo e Fluidez** | **15 pts** | `#F59E0B` |
| **E5** | **Experiência Relacional** | **15 pts** | `#F97316` |
| **TOTAL** | | **100 pts** | |

### 4.2 Código Técnico Utilizado no Payload

```json
"iepc_pilares": [
  { "codigo": "E1", "nome": "Resolução Percebida", "nota": 26.00, "maximo": 30 },
  { "codigo": "E2", "nome": "Compreensão e Segurança", "nota": 18.00, "maximo": 20 },
  { "codigo": "E3", "nome": "Esforço do Cliente", "nota": 16.00, "maximo": 20 },
  { "codigo": "E4", "nome": "Tempo e Fluidez", "nota": 12.00, "maximo": 15 },
  { "codigo": "E5", "nome": "Experiência Relacional", "nota": 10.00, "maximo": 15 }
]
```

### 4.3 Onde Cada Dimensão é Utilizada

| Dimensão | Onde é utilizada |
|----------|-----------------|
| E1–E5 (notas) | `cycle_scores.e1`–`e5` — alimenta todos os dashboards |
| E1–E5 (notas) | `feedbacks.pilares_iepc` (JSONB) — exibido em `/feedback/[id]` |
| E1–E5 (notas) | `/qa-iepc` — RadarChart, BarChart, tabela de aderência por dimensão |
| E1–E5 (notas) | `/cycle-dashboard` — PillarMatrix, AnalystRadarChart |
| E1–E5 (notas) | `/ciclo-atual` — modal de detalhe do analista |
| `iepc_total` | Painel Executivo, Ciclo Atual, Auditoria, Gestão de Pessoas |

---

## 5. NÃO CONFORMIDADES

### 5.1 Estrutura Recebida Atualmente

**Tabela:** `public.nc_records`

```sql
nc_records
├─ id                     UUID PRIMARY KEY DEFAULT gen_random_uuid()
├─ cycle_id               UUID REFERENCES import_cycles(id) ON DELETE CASCADE
├─ periodo                TEXT NOT NULL                          -- "MM/YYYY"
├─ data_registro          TEXT                                   -- "YYYY-MM-DD"
├─ analista               TEXT NOT NULL                          -- Nome do analista
├─ squad                  TEXT NOT NULL                          -- Equipe/squad
├─ coordenador            TEXT NOT NULL                          -- Nome do coordenador
├─ auditor                TEXT                                   -- Nome do auditor
├─ tipo_nc                TEXT NOT NULL                          -- NC-1 a NC-5
├─ descricao              TEXT                                   -- Descrição da NC
├─ pontos_deduzidos       NUMERIC(6,2) DEFAULT -20               -- Penalidade (padrão -20)
├─ protocolo_referencia   TEXT                                   -- Protocolo do atendimento
├─ avaliacao_id           TEXT                                   -- ID da avaliação de origem
├─ source                 TEXT DEFAULT 'integration'             -- Origem do registro
└─ created_at             TIMESTAMPTZ DEFAULT now()
```

**Payload recebido (bloco `nao_conformidades`):**

```json
"nao_conformidades": [
  {
    "protocolo": "SUP-2026-001235",
    "tipo_nc": "NC-2",
    "descricao": "Informação técnica incorreta fornecida ao cliente",
    "severity": "moderada",
    "pontos_deduzidos": -20,
    "aplicar_pontos": true,
    "reincidente": false,
    "impacto_operacional": "Cliente precisou ligar novamente",
    "justificativa_tecnica": "Analista não consultou base de conhecimento"
  }
]
```

### 5.2 Tipos Oficiais de NC

| Código | Nome Completo | Criticidade | Cor |
|--------|-------------|-------------|-----|
| NC-1 | Postura e Ética Profissional | Alta | `#7C3AED` |
| NC-2 | Acuracidade e Rigor Técnico | Alta | `#EF4444` |
| NC-3 | Registro e Rastreabilidade | Média | `#F59E0B` |
| NC-4 | Integridade do Fluxo Operacional | Alta | `#38BDF8` |
| NC-5 | Segurança da Informação | Crítica | `#22C55E` |

### 5.3 Campos Obrigatórios

| Campo | Tipo | Observação |
|-------|------|------------|
| `periodo` | TEXT | Formato "MM/YYYY" |
| `analista` | TEXT | Nome do analista |
| `squad` | TEXT | Equipe/squad |
| `coordenador` | TEXT | Nome do coordenador |
| `tipo_nc` | TEXT | NC-1 a NC-5 |

### 5.4 Campos Utilizados em Dashboards

| Campo | Dashboards que utilizam |
|-------|------------------------|
| `tipo_nc` | `/nao-conformidades` (filtro, gráficos, tabela), `/qa-iepc`, Painel Executivo |
| `analista` | `/nao-conformidades` (filtro, tabela), Auditoria |
| `squad` | `/nao-conformidades` (filtro, RadarChart por squad) |
| `periodo` | Todos os dashboards (filtro de ciclo) |
| `descricao` | `/nao-conformidades` (modal de detalhe) |
| `protocolo_referencia` | `/nao-conformidades` (modal de detalhe) |
| `pontos_deduzidos` | Cálculo interno de `pontos_deduzidos_nc` em `cycle_scores` |

### 5.5 Campos Apenas Armazenados

| Campo | Observação |
|-------|------------|
| `avaliacao_id` | ID da avaliação de origem — rastreamento |
| `source` | Controle interno de origem do registro |
| `data_registro` | Data do registro — raramente filtrado |

> **Nota importante:** `pontos_deduzidos` é armazenado mas **não exibido** na interface principal. A tela `/nao-conformidades` prioriza Tipo NC, Evidência, Severidade, Reincidência e Impacto Operacional. Os pontos deduzidos são usados apenas para cálculo interno do `pontos_deduzidos_nc` em `cycle_scores`.

---

## 6. HISTÓRICO

### 6.1 Como o Histórico Evolutivo é Armazenado

O histórico evolutivo do QualiVisão é armazenado em **duas camadas complementares**:

**Camada 1 — Histórico de Scores por Analista/Ciclo (`feedback_historico`)**
- Registro simples e direto: analista + ciclo + QA + IEPC
- Constraint UNIQUE(analista_id, ciclo) garante um registro por analista por ciclo
- Populado via upsert a cada recebimento de payload

**Camada 2 — Scores Consolidados por Período (`cycle_scores`)**
- Registro completo com todos os pilares e métricas
- Usado pelos dashboards de evolução temporal
- Permite análise por squad, coordenador, período

### 6.2 Tabelas Envolvidas

| Tabela | Finalidade | Estrutura |
|--------|-----------|-----------|
| `feedback_historico` | Histórico simples de QA/IEPC por analista/ciclo | `analista_id, ciclo, qa_score, iepc_score` |
| `cycle_scores` | Scores completos por período (todos os pilares) | Estrutura completa — ver Seção 1 |
| `cycle_summaries` | Resumos consolidados por período | `periodo, total_analistas, qa_media, iepc_media, total_ncs` |
| `import_cycles` | Metadados dos ciclos | `periodo, status, is_closed, imported_at` |
| `cycle_closure_history` | Histórico de fechamento/reabertura | `cycle_id, action, actor_email, notes, created_at` |

### 6.3 Estrutura Utilizada

```sql
-- feedback_historico (histórico por analista)
feedback_historico
├─ id           UUID PRIMARY KEY
├─ analista_id  UUID REFERENCES analistas(id) ON DELETE CASCADE
├─ ciclo        TEXT NOT NULL                    -- "MM/YYYY"
├─ qa_score     NUMERIC DEFAULT 0
├─ iepc_score   NUMERIC DEFAULT 0
└─ created_at   TIMESTAMPTZ DEFAULT now()
UNIQUE(analista_id, ciclo)

-- cycle_summaries (resumo por período)
cycle_summaries
├─ id               UUID PRIMARY KEY
├─ periodo          TEXT UNIQUE                  -- "MM/YYYY"
├─ total_analistas  INTEGER
├─ qa_media         NUMERIC
├─ iepc_media       NUMERIC
├─ total_ncs        INTEGER
└─ updated_at       TIMESTAMPTZ
```

**Bloco `historico` no payload recebido:**

```json
"historico": [
  { "ciclo": "01/2026", "qa": 78.00, "iepc": 75.00 },
  { "ciclo": "02/2026", "qa": 82.00, "iepc": 79.00 },
  { "ciclo": "03/2026", "qa": 85.00, "iepc": 80.00 }
]
```

### 6.4 Dependências Atuais

| Dependência | Descrição |
|-------------|-----------|
| `analistas.id` | `feedback_historico` referencia `analistas` via FK |
| `import_cycles.id` | `cycle_scores` referencia `import_cycles` via FK |
| `app_settings` | Define o ciclo ativo (`key: active_cycle`) |
| `cycle_summaries` | Atualizado automaticamente após cada importação |
| `cycle_closure_history` | Registra fechamentos e reabertura de ciclos |

---

## 7. EVIDÊNCIAS

### 7.1 Confirmações Explícitas

| Pergunta | Resposta | Detalhes |
|----------|----------|---------|
| **O QualiVisão utiliza evidências operacionais?** | ✅ SIM — parcialmente | Evidências são recebidas e armazenadas em `feedback_atendimentos` e como JSONB em `cycle_scores.evidencias` |
| **O QualiVisão exibe evidências?** | ⚠️ PARCIALMENTE | Exibe atendimentos individuais em `/feedback/[id]` (protocolo, cliente, nota QA, nota IEPC, síntese). O campo `evidencias` bruto em `cycle_scores` **não é exibido** diretamente |
| **O QualiVisão depende de justificativas?** | ❌ NÃO | Justificativas técnicas de NCs (`justificativa_tecnica`) são armazenadas na `descricao` da NC mas não são exibidas como campo separado |
| **O QualiVisão depende do conteúdo completo do atendimento?** | ❌ NÃO | O conteúdo completo (gravação, transcrição) não é exibido. Apenas metadados: protocolo, cliente, nota, síntese |

### 7.2 Estrutura de Evidências Armazenada

**Tabela `feedback_atendimentos`** (evidências estruturadas):

```sql
feedback_atendimentos
├─ id               UUID PRIMARY KEY
├─ feedback_id      UUID REFERENCES feedbacks(id) ON DELETE CASCADE
├─ protocolo        TEXT                          -- Número do protocolo
├─ sup              TEXT                          -- Código SUP
├─ cliente          TEXT                          -- Nome do cliente
├─ assunto          TEXT                          -- Assunto do atendimento
├─ solucao          TEXT                          -- Solução aplicada
├─ sintese          TEXT                          -- Síntese do atendimento
├─ nota_qa          NUMERIC                       -- Nota QA do atendimento
├─ nota_iepc        NUMERIC                       -- Nota IEPC do atendimento
├─ duracao          TEXT                          -- Duração do atendimento
├─ ncs              JSONB DEFAULT '[]'            -- NCs do atendimento
├─ criterios_raw    JSONB                         -- Critérios avaliados
├─ classificacao    TEXT                          -- 'excelente'|'bom'|'regular'|'critico'
└─ created_at       TIMESTAMPTZ
```

### 7.3 O que é Exibido vs. Armazenado

| Dado | Exibido | Apenas Armazenado |
|------|---------|-------------------|
| Protocolo do atendimento | ✅ `/feedback/[id]` | — |
| Nota QA por atendimento | ✅ `/feedback/[id]` | — |
| Nota IEPC por atendimento | ✅ `/feedback/[id]` | — |
| Síntese do atendimento | ✅ `/feedback/[id]` | — |
| Critérios individuais por atendimento | ✅ `/qa-iepc` (tabela de aderência) | — |
| NCs por atendimento | ✅ `/nao-conformidades` | — |
| Gravação/transcrição completa | ❌ | ✅ Não recebido |
| `justificativa_tecnica` da NC | ❌ | ✅ Armazenado em `descricao` |
| `evidencias` bruto em `cycle_scores` | ❌ | ✅ Legado |

---

## 8. COACHING

### 8.1 Confirmações

| Pergunta | Resposta | Detalhes |
|----------|----------|---------|
| **Coaching é utilizado no QualiVisão?** | ✅ SIM | Recebido via payload e armazenado em `feedback_coaching` |
| **Coaching é exibido?** | ✅ SIM — em `/feedback/[id]` | Exibido no detalhe do feedback com os três campos estruturados |
| **Coaching é utilizado apenas para armazenamento?** | ❌ NÃO | É exibido na interface do feedback individual |

### 8.2 Estrutura Armazenada

**Tabela `feedback_coaching`:**

```sql
feedback_coaching
├─ id               UUID PRIMARY KEY
├─ feedback_id      UUID REFERENCES feedbacks(id) ON DELETE CASCADE
├─ o_que_foi_dito   TEXT NOT NULL                 -- O que o analista disse/fez errado
├─ como_poderia_ser TEXT                          -- Como poderia ter sido feito
├─ dica_de_ouro     TEXT                          -- Dica prática de melhoria
└─ created_at       TIMESTAMPTZ
```

**Bloco `coaching` no payload:**

```json
"coaching": [
  {
    "o_que_foi_dito": "Você disse 'não sei' sem buscar a informação",
    "como_poderia_ser": "Poderia dizer 'vou verificar para você' e buscar a resposta",
    "dica_de_ouro": "Nunca encerre uma dúvida sem oferecer uma alternativa de solução",
    "categoria": "Comunicação"
  }
]
```

> **Nota:** O campo `categoria` é recebido mas não armazenado como coluna separada. Está disponível em `feedbacks.coaching_details` (JSONB) e em `feedbacks.snapshot_json_completo`.

### 8.3 Onde o Coaching é Exibido

| Tela | Como é exibido |
|------|---------------|
| `/feedback/[id]` | Bloco de coaching com os três campos estruturados |
| `/feedback/public/[token]` | Mesmo bloco, acessível via link público |

---

## 9. PDI

### 9.1 Campos do PDI Utilizados

**Tabela principal: `pdi_records`**

| Campo | Tipo | Utilizado | Onde |
|-------|------|-----------|------|
| `analista` | TEXT | ✅ SIM | `/pdis` (listagem, filtro) |
| `squad` | TEXT | ✅ SIM | `/pdis` (filtro) |
| `coordenador` | TEXT | ✅ SIM | `/pdis` (exibição) |
| `periodo` | TEXT | ✅ SIM | `/pdis` (filtro de ciclo) |
| `status_pdi` | TEXT | ✅ SIM | `/pdis` (badge de status, filtro) |
| `progresso` | INTEGER | ✅ SIM | `/pdis` (barra de progresso) |
| `objetivo_desenvolvimento` | TEXT | ✅ SIM | `/pdis` (card do PDI) |
| `acao_desenvolvimento` | TEXT | ✅ SIM | `/pdis` (card do PDI) |
| `resultado_esperado` | TEXT | ✅ SIM | `/pdis` (card do PDI) |
| `prazo` | DATE | ✅ SIM | `/pdis` (data de prazo) |
| `mensagem_evolutiva` | TEXT | ✅ SIM | `/feedback/[id]` (mensagem motivacional) |
| `comentario_coordenador` | TEXT | ✅ SIM | `/pdis` (comentário do coordenador) |
| `aderencia_score` | NUMERIC | ✅ SIM | `/pdis` (score de aderência) |
| `total_ncs` | INTEGER | ✅ SIM | `/pdis` (indicador de NCs) |
| `total_elogios` | INTEGER | ✅ SIM | `/pdis` (indicador de elogios) |

### 9.2 Campos Obrigatórios do PDI

| Campo | Tipo | Observação |
|-------|------|------------|
| `analista_id` | UUID | FK para `analistas.id` |
| `analista` | TEXT | Nome do analista |
| `periodo` | TEXT | Formato "MM/YYYY" |
| `status_pdi` | TEXT | Status do PDI |

### 9.3 Campos que Aparecem em Dashboards

| Campo | Dashboard |
|-------|-----------|
| `status_pdi` | `/pdis` (filtro e badge), Painel Executivo (PDIs ativos) |
| `progresso` | `/pdis` (barra de progresso) |
| `objetivo_desenvolvimento` | `/pdis` (card), `/feedback/[id]` |
| `acao_desenvolvimento` | `/pdis` (card) |
| `prazo` | `/pdis` (data de prazo) |
| `analista` | `/pdis` (filtro e listagem) |
| `squad` | `/pdis` (filtro) |
| `periodo` | `/pdis` (filtro de ciclo) |

### 9.4 Campos Apenas Armazenados

| Campo | Observação |
|-------|------------|
| `acoes` | JSONB — lista de ações (legado) |
| `metas` | JSONB — lista de metas (legado) |
| `evidencias` | JSONB — evidências do PDI |
| `attachments` | JSONB — anexos do PDI |
| `plano_desenvolvimento` | TEXT — plano completo |
| `data_acompanhamento` | DATE — data de acompanhamento |
| `proxima_revisao_date` | DATE — próxima revisão |
| `comentario_analista` | TEXT — comentário do analista |
| `performance_operacional` | TEXT — performance operacional |
| `risco_operacional` | TEXT — risco operacional |

### 9.5 Status Oficiais do PDI

| Status | Cor |
|--------|-----|
| `aguardando alinhamento` | Cinza `#94A3B8` |
| `em evolucao` | Azul `#38BDF8` |
| `em acompanhamento` | Roxo `#A78BFA` |
| `em validacao` | Âmbar `#F59E0B` |
| `consolidado` | Teal `#2DD4BF` |
| `evolucao concluida` | Verde `#22C55E` |
| `reincidente` | Vermelho `#EF4444` |

### 9.6 Bloco PDI no Payload

```json
"pdi": [
  {
    "objetivo": "Melhorar acuracidade técnica nas respostas",
    "acao": "Revisar base de conhecimento semanalmente",
    "resultado_esperado": "Zero NCs de acuracidade no próximo ciclo",
    "prazo": "2026-05-31",
    "status": "pendente"
  }
]
```

---

## 10. CONTRATO FUTURO — Campos Obrigatórios

### 10.1 Campos Obrigatórios para Continuidade Operacional do QualiVisão

Os campos abaixo são **estritamente necessários** para que o QualiVisão continue operando sem perda de funcionalidade. O novo Sistema de Avaliação **DEVE** enviar todos estes campos.

#### 10.1.1 Identificação (obrigatório em todos os payloads)

```json
{
  "analista": {
    "nome": "string — OBRIGATÓRIO",
    "email": "string — RECOMENDADO (para match com analistas existentes)",
    "equipe": "string — OBRIGATÓRIO",
    "coordenador": "string — OBRIGATÓRIO"
  },
  "ciclo": {
    "nome": "string — OBRIGATÓRIO (formato MM/YYYY)"
  }
}
```

#### 10.1.2 Scores (obrigatório)

```json
{
  "scores": {
    "qa": "number 0-100 — OBRIGATÓRIO",
    "iepc": "number 0-100 — OBRIGATÓRIO",
    "aderencia": "number 0-100 — RECOMENDADO"
  }
}
```

#### 10.1.3 Pilares QA (obrigatório para dashboards de qualidade)

```json
{
  "qa_pilares": [
    { "codigo": "P1", "nome": "string", "nota": "number", "maximo": 22 },
    { "codigo": "P2", "nome": "string", "nota": "number", "maximo": 34 },
    { "codigo": "P3", "nome": "string", "nota": "number", "maximo": 18 },
    { "codigo": "P4", "nome": "string", "nota": "number", "maximo": 14 },
    { "codigo": "P5", "nome": "string", "nota": "number", "maximo": 12 }
  ]
}
```

#### 10.1.4 Dimensões IEPC (obrigatório para dashboards de qualidade)

```json
{
  "iepc_pilares": [
    { "codigo": "E1", "nome": "string", "nota": "number", "maximo": 30 },
    { "codigo": "E2", "nome": "string", "nota": "number", "maximo": 20 },
    { "codigo": "E3", "nome": "string", "nota": "number", "maximo": 20 },
    { "codigo": "E4", "nome": "string", "nota": "number", "maximo": 15 },
    { "codigo": "E5", "nome": "string", "nota": "number", "maximo": 15 }
  ]
}
```

#### 10.1.5 Não Conformidades (obrigatório quando existirem NCs)

```json
{
  "nao_conformidades": [
    {
      "tipo_nc": "NC-1|NC-2|NC-3|NC-4|NC-5 — OBRIGATÓRIO",
      "descricao": "string — RECOMENDADO",
      "protocolo": "string — RECOMENDADO",
      "pontos_deduzidos": "number — RECOMENDADO",
      "aplicar_pontos": "boolean — RECOMENDADO"
    }
  ]
}
```

#### 10.1.6 Blocos de Feedback (obrigatório para tela de feedback)

```json
{
  "feedback_blocks": {
    "evolucao_tecnica": ["string array — OBRIGATÓRIO"],
    "evolucao_comportamental": ["string array — OBRIGATÓRIO"],
    "atencao_evolutiva": ["string array — RECOMENDADO"],
    "fechamento_ciclo": "string — RECOMENDADO"
  }
}
```

#### 10.1.7 Histórico (obrigatório para gráficos de evolução)

```json
{
  "historico": [
    { "ciclo": "MM/YYYY — OBRIGATÓRIO", "qa": "number — OBRIGATÓRIO", "iepc": "number — OBRIGATÓRIO" }
  ]
}
```

### 10.2 Campos Recomendados (não obrigatórios, mas melhoram a experiência)

| Campo | Impacto se ausente |
|-------|-------------------|
| `coaching` | Bloco de coaching não exibido em `/feedback/[id]` |
| `pdi` | PDI não criado automaticamente |
| `atendimentos` | Atendimentos individuais não exibidos |
| `analytics.ranking_squad` | Posição no squad não calculada |
| `analytics.ciclos_consecutivos_evolucao` | Badge de evolução não exibido |
| `external_id` | Idempotência não garantida (risco de duplicatas) |
| `metadata.avaliacao_id` | Rastreamento de origem prejudicado |

### 10.3 Campos que Podem ser Descontinuados

Os campos abaixo são **legados** e podem ser removidos do novo payload sem impacto operacional:

| Campo | Status | Observação |
|-------|--------|------------|
| `evidencias` (em `cycle_scores`) | ❌ Descontinuar | Substituído por `atendimentos` |
| `sintese_ia` | ❌ Descontinuar | Não populado atualmente |
| `ncs` (formato legado flat) | ❌ Descontinuar | Usar `nao_conformidades` estruturado |
| `pilares_qa` (alias de `qa_pilares`) | ⚠️ Manter temporariamente | Suportado pelo adapter, mas preferir `qa_pilares` |
| `pilares_iepc` (alias de `iepc_pilares`) | ⚠️ Manter temporariamente | Suportado pelo adapter, mas preferir `iepc_pilares` |
| `qa` / `iepc` (flat) | ⚠️ Manter temporariamente | Suportado pelo adapter, mas preferir `scores.qa` / `scores.iepc` |

### 10.4 Endpoint Oficial de Integração

```
Produção:
  POST https://qualivisao.tec.br/api/receber-avaliacao
  Authorization: Bearer {INTEGRATION_API_TOKEN}
  Content-Type: application/json

Preview/Homologação:
  POST https://zettiquali9387.builtwithrocket.new/api/receber-avaliacao
  Authorization: Bearer {INTEGRATION_API_TOKEN}
  Content-Type: application/json

Resposta de sucesso:
{
  "success": true,
  "message": "Avaliação recebida e persistida com sucesso.",
  "data": {
    "ciclo": "MM/YYYY",
    "analista": "Nome do Analista",
    "squad": "Nome do Squad",
    "analista_id": "uuid",
    "feedback_id": "uuid",
    "cycle_id": "uuid",
    "log_id": "uuid",
    "qa": 87.50,
    "iepc": 82.00,
    "ncs_saved": 1,
    "pontos_deduzidos": -20,
    "atendimentos_saved": 3,
    "coaching_saved": 1,
    "pdi_saved": 1,
    "historico_saved": 3,
    "payload_version": "v2_lovable",
    "payload_format": "new"
  }
}
```

### 10.5 Resumo do Contrato — Matriz de Campos

| Bloco | Campo | Obrigatório | Recomendado | Pode Omitir |
|-------|-------|-------------|-------------|-------------|
| Identificação | `analista.nome` | ✅ | — | — |
| Identificação | `analista.email` | — | ✅ | — |
| Identificação | `analista.equipe` | ✅ | — | — |
| Identificação | `analista.coordenador` | ✅ | — | — |
| Identificação | `ciclo.nome` | ✅ | — | — |
| Scores | `scores.qa` | ✅ | — | — |
| Scores | `scores.iepc` | ✅ | — | — |
| Scores | `scores.aderencia` | — | ✅ | — |
| QA Pilares | `qa_pilares[P1-P5].nota` | ✅ | — | — |
| QA Pilares | `qa_pilares[P1-P5].maximo` | — | ✅ | — |
| IEPC Dimensões | `iepc_pilares[E1-E5].nota` | ✅ | — | — |
| IEPC Dimensões | `iepc_pilares[E1-E5].maximo` | — | ✅ | — |
| NCs | `nao_conformidades[].tipo_nc` | ✅ (se NC) | — | — |
| NCs | `nao_conformidades[].descricao` | — | ✅ | — |
| NCs | `nao_conformidades[].pontos_deduzidos` | — | ✅ | — |
| Feedback | `feedback_blocks.evolucao_tecnica` | ✅ | — | — |
| Feedback | `feedback_blocks.evolucao_comportamental` | ✅ | — | — |
| Feedback | `feedback_blocks.atencao_evolutiva` | — | ✅ | — |
| Feedback | `feedback_blocks.fechamento_ciclo` | — | ✅ | — |
| Histórico | `historico[].ciclo` | ✅ | — | — |
| Histórico | `historico[].qa` | ✅ | — | — |
| Histórico | `historico[].iepc` | ✅ | — | — |
| Coaching | `coaching[].o_que_foi_dito` | — | ✅ | — |
| Coaching | `coaching[].como_poderia_ser` | — | ✅ | — |
| Coaching | `coaching[].dica_de_ouro` | — | ✅ | — |
| PDI | `pdi[].objetivo` | — | ✅ | — |
| PDI | `pdi[].acao` | — | ✅ | — |
| PDI | `pdi[].prazo` | — | ✅ | — |
| Atendimentos | `atendimentos[].protocolo` | — | ✅ | — |
| Atendimentos | `atendimentos[].nota_qa` | — | ✅ | — |
| Idempotência | `external_id` | — | ✅ | — |

---

## APÊNDICE — MAPEAMENTO LEGADO → NOVO FORMATO

O endpoint `/api/receber-avaliacao` suporta ambos os formatos via `endpointAdapter`. A tabela abaixo documenta o mapeamento para migração gradual:

| Campo Legado | Campo Novo | Status |
|-------------|-----------|--------|
| `analista` (string) | `analista.nome` (objeto) | ✅ Suportado |
| `ciclo` (string) | `ciclo.nome` (objeto) | ✅ Suportado |
| `qa` (number) | `scores.qa` | ✅ Suportado |
| `iepc` (number) | `scores.iepc` | ✅ Suportado |
| `pilares_qa[]` | `qa_pilares[]` | ✅ Suportado |
| `pilares_iepc[]` | `iepc_pilares[]` | ✅ Suportado |
| `ncs[]` | `nao_conformidades[]` | ✅ Suportado |
| `evidencias[]` | `atendimentos[]` | ⚠️ Parcial |
| `squad` (top-level) | `analista.equipe` | ✅ Suportado |
| `coordenador` (top-level) | `analista.coordenador` | ✅ Suportado |

---

*Documento gerado em 18/06/2026 a partir da análise completa do código-fonte, migrações SQL e documentação técnica do QualiVisão.*  
*Versão da aplicação documentada: 0.5.1-20260527173055+*  
*Para atualizar este documento, execute nova análise do repositório e do endpoint `/api/receber-avaliacao`.*
