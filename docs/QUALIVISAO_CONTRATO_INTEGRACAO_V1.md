# QUALIVISÃO — CONTRATO TÉCNICO OFICIAL DE INTEGRAÇÃO

> **Documento:** `QUALIVISAO_CONTRATO_INTEGRACAO_V1.md`
> **Versão:** 1.0.0
> **Data de Emissão:** 18/06/2026
> **Classificação:** Contrato Técnico Formal — Uso Restrito
> **Responsável Técnico:** Área de Qualidade — Zetti Tech
> **Revisão:** Gerado a partir do código-fonte real dos endpoints `/api/receber-avaliacao` e `/api/feedbacks/import`
> **URL de Produção:** https://qualivisao.tec.br
> **Status:** 🟢 VIGENTE

---

## SUMÁRIO

1. [Estrutura JSON Recebida pelo QualiVisão](#1-estrutura-json-recebida-pelo-qualivisão)
2. [Payload Executivo Completo](#2-payload-executivo-completo)
3. [Payload Feedback Experience Completo](#3-payload-feedback-experience-completo)
4. [Campos Obrigatórios](#4-campos-obrigatórios)
5. [Campos Opcionais](#5-campos-opcionais)
6. [Campos Proibidos](#6-campos-proibidos)
7. [Regras de Versionamento](#7-regras-de-versionamento)
8. [Regras de Validação](#8-regras-de-validação)
9. [Regras de Atualização](#9-regras-de-atualização)
10. [Endpoints Oficiais](#10-endpoints-oficiais)
11. [Método de Autenticação](#11-método-de-autenticação)
12. [Formato do Token](#12-formato-do-token)
13. [Tratamento de Erros](#13-tratamento-de-erros)
14. [Regras de Reenvio](#14-regras-de-reenvio)
15. [Regras de Idempotência](#15-regras-de-idempotência)
16. [Ambiente de Produção](#16-ambiente-de-produção)
17. [Ambiente de Homologação](#17-ambiente-de-homologação)
18. [Exemplo Real de Payload](#18-exemplo-real-de-payload)
19. [Exemplo de Resposta da API](#19-exemplo-de-resposta-da-api)
20. [Contrato Técnico Consolidado](#20-contrato-técnico-consolidado)

---

## 1. Estrutura JSON Recebida pelo QualiVisão

O QualiVisão aceita dois formatos de payload, ambos suportados simultaneamente pelo normalizador interno (`normalizePayload.ts` + `endpointAdapter.ts`):

### 1.1 Formato v2 — Lovable (Atual / Recomendado)

Estrutura hierárquica com objetos aninhados. Identificado internamente como `v2_lovable`.

```
{
  metadata:          { origem, versao, gerado_em, avaliacao_id }
  analista:          { nome, nome_completo, email, equipe, coordenador, auditor }
  ciclo:             { nome, data_inicio, data_fim, status }
  scores:            { qa, iepc, aderencia }
  qa_pilares:        [ { codigo, nome, nota, maximo, peso } ]
  iepc_pilares:      [ { codigo, nome, nota, maximo, peso } ]
  atendimentos:      [ { protocolo, cliente, assunto, nota_qa, nota_iepc, sintese,
                         criterios[], nao_conformidades[], alertas_operacionais[] } ]
  nao_conformidades: [ { protocolo, tipo_nc, descricao, severidade, pontos,
                         aplicar_pontos, impacto_operacional, justificativa_tecnica } ]
  coaching:          [ { o_que_foi_dito, como_poderia_ser, dica_de_ouro, categoria } ]
  feedback_blocks:   { evolucao_tecnica[], evolucao_comportamental[],
                       atencao_evolutiva[], fechamento_ciclo }
  pdi:               [ { objetivo, acao, resultado_esperado, prazo, status } ]
  historico:         [ { ciclo, qa, iepc } ]
  pontos_fortes:     [ { titulo, descricao } ]
  oportunidades:     [ { titulo, descricao } ]
  analytics:         { ranking_squad, total_analistas, ciclos_consecutivos_evolucao, ... }
  tendencias:        { ... }
  conquistas:        [ ... ]
}
```

### 1.2 Formato v1 — Legacy (Compatibilidade)

Estrutura plana com campos no nível raiz. Identificado internamente como `v1_legacy`.

```
{
  analista:     string (nome)
  ciclo:        string ("MM/YYYY")
  coordenador:  string
  squad:        string
  qa:           number
  iepc:         number
  pilares_qa:   [ { nome, nota, maximo } ]
  pilares_iepc: [ { nome, nota, maximo } ]
  criterios:    [ { pilar_nome, criterio_nome, status } ]
  evidencias:   [ ... ]
  ncs:          [ { tipo, pontos_deduzidos, protocolo_referencia, reincidente } ]
  analytics:    { ... }
  tendencias:   { ... }
  reincidencia: { ... }
  auditor:      string
  data_registro: string
  tipo_demanda:  string
  protocolo:     string
}
```

### 1.3 Destinos de Persistência

| Dado | Tabela de Destino |
|------|------------------|
| Score QA/IEPC por analista/ciclo | `cycle_scores` |
| Feedback Experience completo | `feedbacks` |
| Atendimentos individuais | `feedback_atendimentos` |
| Coaching estruturado | `feedback_coaching` |
| PDI | `feedback_pdi` |
| Não conformidades | `nc_records` |
| Histórico evolutivo | `feedback_historico` |
| Log de importação | `feedback_import_logs` |
| Log de requisição | `integration_request_logs` |
| Ciclos de importação | `import_cycles` |

---

## 2. Payload Executivo Completo

O **Payload Executivo** é enviado ao endpoint `/api/receber-avaliacao` e persiste dados na tabela `cycle_scores`. É o payload que alimenta os dashboards executivos, ciclo atual, auditoria e QA & IEPC.

### 2.1 Estrutura Completa

```json
{
  "metadata": {
    "origem": "lovable",
    "versao": "v2",
    "gerado_em": "2026-04-15T14:30:00Z",
    "avaliacao_id": "uuid-da-avaliacao"
  },
  "analista": {
    "nome": "Ana Paula Ferreira",
    "nome_completo": "Ana Paula Ferreira",
    "email": "ana.paula@empresa.com",
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
    { "codigo": "P1", "nome": "Identificação e Boas-Vindas", "nota": 20.00, "maximo": 22, "peso": 22 },
    { "codigo": "P2", "nome": "Diagnóstico e Solução", "nota": 30.00, "maximo": 34, "peso": 34 },
    { "codigo": "P3", "nome": "Comunicação e Clareza", "nota": 16.00, "maximo": 18, "peso": 18 },
    { "codigo": "P4", "nome": "Encerramento e Protocolo", "nota": 12.00, "maximo": 14, "peso": 14 },
    { "codigo": "P5", "nome": "Conformidade e Compliance", "nota": 9.50, "maximo": 12, "peso": 12 }
  ],
  "iepc_pilares": [
    { "codigo": "E1", "nome": "Empatia", "nota": 26.00, "maximo": 30, "peso": 30 },
    { "codigo": "E2", "nome": "Proatividade", "nota": 18.00, "maximo": 20, "peso": 20 },
    { "codigo": "E3", "nome": "Clareza", "nota": 16.00, "maximo": 20, "peso": 20 },
    { "codigo": "E4", "nome": "Resolução", "nota": 12.00, "maximo": 15, "peso": 15 },
    { "codigo": "E5", "nome": "Postura", "nota": 10.00, "maximo": 15, "peso": 15 }
  ],
  "atendimentos": [
    {
      "protocolo": "2026-04-001",
      "cliente": "João Silva",
      "assunto": "Dúvida sobre fatura",
      "nota_qa": 88.00,
      "nota_iepc": 85.00,
      "sintese": "Atendimento resolutivo com boa empatia",
      "criterios": [
        {
          "pilar_nome": "Identificação e Boas-Vindas",
          "criterio_nome": "Identificou-se corretamente",
          "status": "aderido"
        }
      ],
      "nao_conformidades": [],
      "alertas_operacionais": []
    }
  ],
  "nao_conformidades": [
    {
      "protocolo": "2026-04-002",
      "tipo_nc": "NC-2",
      "descricao": "Não registrou protocolo ao encerrar",
      "severidade": "media",
      "pontos": -20,
      "aplicar_pontos": true,
      "impacto_operacional": "Risco de retrabalho",
      "justificativa_tecnica": "Critério P4 não aderido"
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "Você poderia ter confirmado o protocolo antes de encerrar",
      "como_poderia_ser": "Antes de encerrar, sempre confirme: 'Posso registrar o protocolo XXXX para você?'",
      "dica_de_ouro": "O protocolo é a garantia do cliente — nunca encerre sem ele",
      "categoria": "Encerramento"
    }
  ],
  "feedback_blocks": {
    "evolucao_tecnica": [
      "Demonstrou domínio técnico no diagnóstico de falhas",
      "Utilizou corretamente o sistema de registro"
    ],
    "evolucao_comportamental": [
      "Manteve tom empático durante todo o atendimento"
    ],
    "atencao_evolutiva": [
      "Precisa reforçar o hábito de confirmar protocolo ao encerrar"
    ],
    "fechamento_ciclo": "Ciclo de evolução consistente. Analista demonstra maturidade técnica crescente."
  },
  "pdi": [
    {
      "objetivo": "Reforçar encerramento com protocolo",
      "acao": "Praticar script de encerramento nos próximos 10 atendimentos",
      "resultado_esperado": "100% dos atendimentos com protocolo registrado",
      "prazo": "2026-05-31",
      "status": "pendente"
    }
  ],
  "historico": [
    { "ciclo": "02/2026", "qa": 81.00, "iepc": 78.00 },
    { "ciclo": "03/2026", "qa": 84.50, "iepc": 80.00 }
  ],
  "pontos_fortes": [
    { "titulo": "Empatia", "descricao": "Demonstra escuta ativa e linguagem acolhedora" }
  ],
  "oportunidades": [
    { "titulo": "Protocolo", "descricao": "Reforçar confirmação de protocolo no encerramento" }
  ],
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 8,
    "ciclos_consecutivos_evolucao": 2
  },
  "tendencias": {},
  "conquistas": []
}
```

### 2.2 Mapeamento para `cycle_scores`

| Campo do Payload | Coluna em `cycle_scores` |
|-----------------|--------------------------|
| `analista.nome` | `analista` |
| `analista.equipe` | `squad` |
| `analista.coordenador` | `coordenador` |
| `analista.auditor` | `auditor` |
| `ciclo.nome` | `periodo` |
| `ciclo.data_inicio` | `data_registro` |
| `scores.qa` | `nota_final_qa` |
| `scores.iepc` | `iepc_total` |
| `qa_pilares[0].nota` | `p1` |
| `qa_pilares[1].nota` | `p2` |
| `qa_pilares[2].nota` | `p3` |
| `qa_pilares[3].nota` | `p4` |
| `qa_pilares[4].nota` | `p5` |
| `iepc_pilares[0].nota` | `e1` |
| `iepc_pilares[1].nota` | `e2` |
| `iepc_pilares[2].nota` | `e3` |
| `iepc_pilares[3].nota` | `e4` |
| `iepc_pilares[4].nota` | `e5` |
| `nao_conformidades.length` | `total_ncs` |
| soma de `pontos` onde `aplicar_pontos=true` | `pontos_deduzidos_nc` |
| `atendimentos.length` | `qtd_atendimentos_avaliados` |
| `analytics` | `analytics` (JSONB) |
| `tendencias` | `tendencias` (JSONB) |

---

## 3. Payload Feedback Experience Completo

O **Payload Feedback Experience** é enviado ao endpoint `/api/feedbacks/import` e persiste dados na tabela `feedbacks` e tabelas relacionadas. É o payload que alimenta o módulo de Feedback, PDI e People Analytics.

### 3.1 Estrutura Completa

```json
{
  "analista": {
    "email": "ana.paula@empresa.com",
    "nome": "Ana Paula Ferreira",
    "equipe": "PDV",
    "coordenador": "Bruna Ramos"
  },
  "ciclo": {
    "nome": "04/2026"
  },
  "scores": {
    "qa": 87.50,
    "iepc": 82.00,
    "aderencia": 91.00
  },
  "qa_pilares": [
    { "nome": "Identificação e Boas-Vindas", "nota": 20.00, "maximo": 22 },
    { "nome": "Diagnóstico e Solução", "nota": 30.00, "maximo": 34 },
    { "nome": "Comunicação e Clareza", "nota": 16.00, "maximo": 18 },
    { "nome": "Encerramento e Protocolo", "nota": 12.00, "maximo": 14 },
    { "nome": "Conformidade e Compliance", "nota": 9.50, "maximo": 12 }
  ],
  "iepc_pilares": [
    { "nome": "Empatia", "nota": 26.00, "maximo": 30 },
    { "nome": "Proatividade", "nota": 18.00, "maximo": 20 },
    { "nome": "Clareza", "nota": 16.00, "maximo": 20 },
    { "nome": "Resolução", "nota": 12.00, "maximo": 15 },
    { "nome": "Postura", "nota": 10.00, "maximo": 15 }
  ],
  "feedback_blocks": {
    "evolucao_tecnica": ["Domínio técnico crescente", "Uso correto dos sistemas"],
    "evolucao_comportamental": ["Empatia consistente"],
    "atencao_evolutiva": ["Reforçar protocolo de encerramento"],
    "fechamento_ciclo": "Ciclo de evolução consistente."
  },
  "pontos_fortes": [
    { "titulo": "Empatia", "descricao": "Escuta ativa e linguagem acolhedora" }
  ],
  "oportunidades": [
    { "titulo": "Protocolo", "descricao": "Confirmar protocolo no encerramento" }
  ],
  "atendimentos": [
    {
      "protocolo": "2026-04-001",
      "cliente": "João Silva",
      "assunto": "Dúvida sobre fatura",
      "nota_qa": 88.00,
      "nota_iepc": 85.00,
      "observacao": "Atendimento resolutivo"
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "Você poderia ter confirmado o protocolo",
      "como_poderia_ser": "Antes de encerrar, confirme o protocolo",
      "dica_de_ouro": "O protocolo é a garantia do cliente",
      "categoria": "Encerramento"
    }
  ],
  "pdi": [
    {
      "objetivo": "Reforçar encerramento com protocolo",
      "acao": "Praticar script de encerramento",
      "resultado_esperado": "100% com protocolo registrado",
      "prazo": "2026-05-31",
      "status": "pendente"
    }
  ],
  "nao_conformidades": [
    {
      "tipo_nc": "NC-2",
      "descricao": "Não registrou protocolo ao encerrar",
      "pontos_deduzidos": 20,
      "protocolo": "2026-04-002"
    }
  ],
  "historico": [
    { "ciclo": "02/2026", "qa": 81.00, "iepc": 78.00 },
    { "ciclo": "03/2026", "qa": 84.50, "iepc": 80.00 }
  ],
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 8,
    "ciclos_consecutivos_evolucao": 2
  },
  "tendencias": {},
  "conquistas": [],
  "external_id": "avaliacao-uuid-externo-para-idempotencia"
}
```

### 3.2 Mapeamento para `feedbacks`

| Campo do Payload | Coluna em `feedbacks` |
|-----------------|----------------------|
| `analista.email` → lookup `analistas.id` | `analista_id` |
| `ciclo.nome` | `ciclo` |
| `analista.coordenador` | `coordenador` |
| `analista.equipe` | `equipe` |
| `scores.qa` | `qa_score` |
| `scores.iepc` | `iepc_score` |
| `scores.aderencia` | `aderencia_score` |
| `qa_pilares[]` | `pilares_qa` (JSONB) |
| `iepc_pilares[]` | `pilares_iepc` (JSONB) |
| `pontos_fortes[]` | `pontos_fortes` (JSONB) |
| `oportunidades[]` | `oportunidades` (JSONB) |
| `feedback_blocks.fechamento_ciclo` | `resumo_ciclo` |
| `feedback_blocks.evolucao_tecnica` | `evolucao_tecnica` |
| `feedback_blocks.evolucao_comportamental` | `evolucao_comportamental` |
| `feedback_blocks.atencao_evolutiva` | `risco_operacional` |
| `analytics.ranking_squad` | `posicao_squad` |
| `analytics.total_analistas` | `total_squad` |
| `analytics.ciclos_consecutivos_evolucao` | `ciclos_consecutivos_evolucao` |
| `external_id` | `external_id` |
| payload completo | `snapshot_json_completo` (JSONB) |

---

## 4. Campos Obrigatórios

### 4.1 Endpoint `/api/receber-avaliacao` — Campos Obrigatórios

| Campo | Formato | Observação |
|-------|---------|------------|
| `analista` | `string` ou `{ nome: string }` | Nome do analista. Se objeto, `nome` ou `nome_completo` obrigatório |
| `ciclo` | `string` ou `{ nome: string }` | Período no formato `"MM/YYYY"`. Se objeto, `nome` obrigatório |
| `scores.qa` ou `qa` | `number` | Score QA 0–100 |
| `scores.iepc` ou `iepc` | `number` | Score IEPC 0–100 |
| `analista.coordenador` ou `coordenador` | `string` | Nome do coordenador |
| `analista.equipe` ou `squad` | `string` | Nome do squad/equipe |

> **Validação aplicada em código:** `validatePayload()` em `receber-avaliacao/route.ts`

### 4.2 Endpoint `/api/feedbacks/import` — Campos Obrigatórios

| Campo | Formato | Observação |
|-------|---------|------------|
| `analista.email` ou `analista_email` | `string` | Email do analista — usado para lookup na tabela `analistas` |
| `ciclo.nome` ou `ciclo` | `string` | Período no formato `"MM/YYYY"` |
| `scores.qa` ou `qa_score` | `number` | Score QA 0–100 |

> **Validação aplicada em código:** verificações explícitas em `feedbacks/import/route.ts`

---

## 5. Campos Opcionais

### 5.1 Endpoint `/api/receber-avaliacao`

| Campo | Tipo | Observação |
|-------|------|------------|
| `metadata` | `object` | Metadados da avaliação (origem, versão, data) |
| `analista.email` | `string` | Usado para lookup/criação do analista |
| `analista.auditor` | `string` | Nome do auditor |
| `ciclo.data_inicio` | `string` | Data início do ciclo (ISO 8601) |
| `ciclo.data_fim` | `string` | Data fim do ciclo (ISO 8601) |
| `scores.aderencia` | `number` | Score de aderência 0–100 |
| `qa_pilares[]` | `array` | Detalhamento por pilar QA (P1–P5) |
| `iepc_pilares[]` | `array` | Detalhamento por dimensão IEPC (E1–E5) |
| `atendimentos[]` | `array` | Atendimentos individuais auditados |
| `nao_conformidades[]` | `array` | Não conformidades identificadas |
| `coaching[]` | `array` | Registros de coaching estruturado |
| `feedback_blocks` | `object` | Blocos de feedback narrativo |
| `pdi[]` | `array` | Itens do Plano de Desenvolvimento Individual |
| `historico[]` | `array` | Histórico de ciclos anteriores |
| `pontos_fortes[]` | `array` | Pontos fortes identificados |
| `oportunidades[]` | `array` | Oportunidades de melhoria |
| `analytics` | `object` | Dados analíticos (ranking, totais) |
| `tendencias` | `object` | Tendências calculadas |
| `conquistas[]` | `array` | Conquistas do ciclo |
| `tipo_demanda` | `string` | Tipo da demanda avaliada |
| `data_registro` | `string` | Data da avaliação (YYYY-MM-DD) |
| `protocolo` | `string` | Protocolo de referência geral |

### 5.2 Endpoint `/api/feedbacks/import`

| Campo | Tipo | Observação |
|-------|------|------------|
| `analista.nome` | `string` | Nome do analista |
| `analista.equipe` | `string` | Squad/equipe |
| `analista.coordenador` | `string` | Nome do coordenador |
| `scores.aderencia` | `number` | Score de aderência |
| `qa_pilares[]` | `array` | Pilares QA |
| `iepc_pilares[]` | `array` | Dimensões IEPC |
| `feedback_blocks` | `object` | Blocos narrativos de feedback |
| `pontos_fortes[]` | `array` | Pontos fortes |
| `oportunidades[]` | `array` | Oportunidades |
| `atendimentos[]` | `array` | Atendimentos individuais |
| `coaching[]` | `array` | Coaching estruturado |
| `pdi[]` | `array` | PDI |
| `nao_conformidades[]` | `array` | Não conformidades |
| `historico[]` | `array` | Histórico de ciclos |
| `analytics` | `object` | Dados analíticos |
| `tendencias` | `object` | Tendências |
| `conquistas[]` | `array` | Conquistas |
| `external_id` | `string` | ID externo para idempotência |
| `periodo_inicio` | `string` | Data início do ciclo |
| `periodo_fim` | `string` | Data fim do ciclo |

---

## 6. Campos Proibidos

Os campos abaixo **não devem ser enviados** no payload de integração. Serão ignorados pelo normalizador ou podem causar conflitos de persistência.

| Campo | Motivo |
|-------|--------|
| `id` | Gerado automaticamente pelo banco (`gen_random_uuid()`). Enviar um UUID externo pode causar conflito de chave primária |
| `cycle_id` | Gerenciado internamente pelo QualiVisão via upsert em `import_cycles` |
| `analista_id` | Resolvido internamente via lookup por email ou nome na tabela `analistas` |
| `created_at` | Gerenciado pelo banco (`DEFAULT now()`) |
| `updated_at` | Gerenciado pelo banco via trigger |
| `public_token` | Gerado internamente pelo QualiVisão |
| `public_enabled` | Controlado internamente |
| `payload_normalized` | Campo interno de auditoria — sobrescrito pelo normalizador |
| `payload_version` | Detectado automaticamente pelo normalizador |
| `source` | Definido internamente como `'integration'` |
| `is_manual` | Definido internamente como `false` para integrações |
| `status` | Definido internamente como `'generated'` na criação |
| `version` | Gerenciado internamente |
| `sintese_ia` | Campo legado — não populado atualmente. Não enviar |
| `evidencias` | Campo legado em `cycle_scores` — substituído por `atendimentos[]` |

---

## 7. Regras de Versionamento

### 7.1 Versões de Payload Suportadas

| Versão | Identificador Interno | Status | Descrição |
|--------|-----------------------|--------|-----------|
| v1 Legacy | `v1_legacy` | ✅ Suportado (compatibilidade) | Formato plano com campos no nível raiz |
| v2 Lovable | `v2_lovable` | ✅ Suportado (recomendado) | Formato hierárquico com objetos aninhados |

### 7.2 Detecção Automática de Versão

O normalizador detecta a versão automaticamente com base na presença de campos:

- **v2_lovable:** Presença de `scores` (objeto), `analista` (objeto com `email`), `ciclo` (objeto com `nome`), `qa_pilares[]`, `iepc_pilares[]`
- **v1_legacy:** Campos planos `qa`, `iepc`, `squad`, `coordenador` no nível raiz

### 7.3 Regras de Evolução de Versão

1. **Novos campos opcionais** podem ser adicionados ao payload sem incremento de versão
2. **Remoção de campos obrigatórios** requer incremento de versão maior (v2 → v3)
3. **Mudança de tipo** de campo existente requer incremento de versão maior
4. **Renomeação de campo** obrigatório requer incremento de versão maior
5. O campo `metadata.versao` deve refletir a versão do payload enviado
6. O QualiVisão manterá suporte às versões anteriores por no mínimo **2 ciclos** após deprecação

### 7.4 Versionamento do Documento

| Versão do Documento | Data | Alterações |
|--------------------|------|------------|
| 1.0.0 | 18/06/2026 | Versão inicial — contrato formal gerado a partir do código-fonte |

---

## 8. Regras de Validação

### 8.1 Validações Aplicadas em `/api/receber-avaliacao`

**Validação de estrutura (`validatePayload`):**

1. O body deve ser um objeto JSON válido
2. `analista` é obrigatório:
   - Se string: não pode ser vazia
   - Se objeto: deve conter `nome` ou `nome_completo`
3. `ciclo` é obrigatório:
   - Se string: não pode ser vazia
   - Se objeto: deve conter `nome`
4. `scores.qa` ou `qa` deve ser um número não nulo
5. `scores.iepc` ou `iepc` deve ser um número não nulo
6. `coordenador` é obrigatório (em `analista.coordenador` ou no nível raiz)
7. `squad`/`equipe` é obrigatório (em `analista.equipe` ou no nível raiz)

**Validação pós-normalização (`validateEndpointPayload`):**

1. `analistaNome` não pode ser vazio após normalização
2. `cicloNome` não pode ser vazio após normalização
3. `qaScore` deve ser um número válido (0–100)
4. `iepcScore` deve ser um número válido (0–100)

### 8.2 Validações Aplicadas em `/api/feedbacks/import`

1. `analista.email` ou `analista_email` é obrigatório
2. `ciclo.nome` ou `ciclo` é obrigatório
3. `scores.qa` ou `qa_score` deve ser um número > 0
4. O analista deve existir na tabela `analistas` (lookup por email)

### 8.3 Validações de Formato

| Campo | Regra |
|-------|-------|
| `ciclo.nome` / `ciclo` | Formato `"MM/YYYY"` (ex: `"04/2026"`) |
| `scores.qa` | Número entre 0 e 100 |
| `scores.iepc` | Número entre 0 e 100 |
| `scores.aderencia` | Número entre 0 e 100 (quando presente) |
| `ciclo.data_inicio` / `ciclo.data_fim` | ISO 8601 (`"YYYY-MM-DD"`) |
| `analista.email` | Formato de email válido |
| `pdi[].prazo` | ISO 8601 (`"YYYY-MM-DD"`) |

---

## 9. Regras de Atualização

### 9.1 Estratégia de Upsert em `cycle_scores`

- **Chave de conflito:** `UNIQUE(periodo, analista, squad)`
- **Comportamento:** Se já existir um registro com o mesmo `(periodo, analista, squad)`, o registro é **atualizado** com os novos valores
- **Campos atualizados:** Todos os campos do payload (scores, pilares, NCs, analytics, etc.)
- **Campos preservados:** `id`, `created_at`, `cycle_id` (se já existente)

### 9.2 Estratégia de Upsert em `feedbacks` (via `/api/feedbacks/import`)

- **Verificação de duplicidade:** Antes de inserir, verifica se já existe `(analista_id, ciclo)` na tabela `feedbacks`
- **Comportamento:** Se já existir, retorna `200` com `feedback_id` existente — **não atualiza**
- **Para forçar atualização:** Não suportado atualmente. Necessário deletar o registro existente antes de reimportar

### 9.3 Estratégia de Upsert em `feedback_historico`

- **Chave de conflito:** `UNIQUE(analista_id, ciclo)`
- **Comportamento:** Upsert com `ignoreDuplicates: false` — atualiza scores se o ciclo já existir

### 9.4 Estratégia de Upsert em `import_cycles`

- **Chave de conflito:** `UNIQUE(periodo)`
- **Comportamento:** Upsert — cria ou atualiza metadados do ciclo

### 9.5 Comportamento de Tabelas Relacionadas

| Tabela | Comportamento na Atualização |
|--------|------------------------------|
| `feedback_atendimentos` | INSERT apenas — não atualiza atendimentos existentes |
| `feedback_coaching` | INSERT apenas — não atualiza coaching existente |
| `feedback_pdi` | INSERT apenas — não atualiza PDI existente |
| `nc_records` | INSERT apenas — não atualiza NCs existentes |

---

## 10. Endpoints Oficiais

### 10.1 Endpoint Executivo — Avaliação de Ciclo

```
POST https://qualivisao.tec.br/api/receber-avaliacao
```

| Atributo | Valor |
|----------|-------|
| **Método** | `POST` |
| **Content-Type** | `application/json` |
| **Autenticação** | `Bearer <token>` (validado via tabela `integration_tokens`) |
| **Destino principal** | `cycle_scores` |
| **Destinos secundários** | `feedbacks`, `feedback_atendimentos`, `feedback_coaching`, `feedback_pdi`, `nc_records`, `feedback_historico`, `import_cycles`, `integration_request_logs` |
| **Idempotência** | Sim — via `(periodo, analista, squad)` + hash do payload |
| **Timeout de leitura** | 10 segundos |

### 10.2 Endpoint Feedback Experience — Importação

```
POST https://qualivisao.tec.br/api/feedbacks/import
```

| Atributo | Valor |
|----------|-------|
| **Método** | `POST` |
| **Content-Type** | `application/json` |
| **Autenticação** | `Bearer <token>` (validado via variável de ambiente `INTEGRATION_API_TOKEN`) |
| **Destino principal** | `feedbacks` |
| **Destinos secundários** | `feedback_atendimentos`, `feedback_coaching`, `feedback_pdi`, `nc_records`, `feedback_historico`, `cycle_scores`, `feedback_import_logs` |
| **Idempotência** | Sim — via hash SHA-256 do payload + `external_id` |
| **Lookup de analista** | Por `analista.email` na tabela `analistas` |

### 10.3 Diferença entre os Endpoints

| Característica | `/api/receber-avaliacao` | `/api/feedbacks/import` |
|----------------|--------------------------|------------------------|
| **Foco** | Score executivo / dashboards | Feedback Experience / PDI |
| **Lookup de analista** | Por nome (cria se não existir) | Por email (retorna 404 se não existir) |
| **Autenticação** | Tabela `integration_tokens` (hash SHA-256) | Variável de ambiente `INTEGRATION_API_TOKEN` |
| **Upsert de `cycle_scores`** | Sim (primário) | Sim (secundário) |
| **Upsert de `feedbacks`** | Sim (secundário) | Sim (primário) |
| **Criação automática de analista** | Sim | Não |

---

## 11. Método de Autenticação

### 11.1 Endpoint `/api/receber-avaliacao`

**Método:** Bearer Token com validação via banco de dados

**Fluxo:**
1. O sistema externo envia o header `Authorization: Bearer <token>`
2. O QualiVisão extrai o token do header
3. Calcula o hash SHA-256 do token usando `crypto.subtle.digest`
4. Consulta a tabela `integration_tokens` buscando o `token_hash` correspondente
5. Verifica se `is_active = true` e se `expires_at` não está vencido
6. Se válido, atualiza `last_used_at` e prossegue
7. Se inválido, retorna `401 Unauthorized`

**Header obrigatório:**
```
Authorization: Bearer <token>
```

**Variações aceitas:**
- `Bearer <token>` (maiúsculo)
- `bearer <token>` (minúsculo)

### 11.2 Endpoint `/api/feedbacks/import`

**Método:** Bearer Token com validação via variável de ambiente

**Fluxo:**
1. O sistema externo envia o header `Authorization: Bearer <token>`
2. O QualiVisão extrai o token do header
3. Compara diretamente com o valor da variável de ambiente `INTEGRATION_API_TOKEN`
4. Se igual, prossegue; se diferente, retorna `401 Unauthorized`

**Header obrigatório:**
```
Authorization: Bearer <token>
```

---

## 12. Formato do Token

### 12.1 Token para `/api/receber-avaliacao`

| Atributo | Valor |
|----------|-------|
| **Formato** | String opaca (qualquer formato) |
| **Armazenamento no banco** | Hash SHA-256 em hexadecimal (64 caracteres) na coluna `integration_tokens.token_hash` |
| **Transmissão** | Texto plano no header `Authorization: Bearer` |
| **Validade** | Controlada pela coluna `expires_at` na tabela `integration_tokens` |
| **Revogação** | Via coluna `is_active = false` na tabela `integration_tokens` |
| **Rastreamento** | Coluna `last_used_at` atualizada a cada uso bem-sucedido |
| **Comprimento recomendado** | Mínimo 32 caracteres aleatórios |

**Estrutura da tabela `integration_tokens`:**
```sql
integration_tokens
├─ id           UUID PRIMARY KEY
├─ label        TEXT          -- Identificador legível (ex: "Sistema Avaliação Prod")
├─ token_hash   TEXT UNIQUE   -- SHA-256 do token em hex
├─ is_active    BOOLEAN       -- true = ativo
├─ expires_at   TIMESTAMPTZ   -- null = sem expiração
├─ last_used_at TIMESTAMPTZ   -- Última utilização
└─ created_at   TIMESTAMPTZ
```

### 12.2 Token para `/api/feedbacks/import`

| Atributo | Valor |
|----------|-------|
| **Formato** | String opaca definida na variável de ambiente `INTEGRATION_API_TOKEN` |
| **Armazenamento** | Variável de ambiente (não armazenado no banco) |
| **Transmissão** | Texto plano no header `Authorization: Bearer` |
| **Validade** | Não definido — sem expiração automática |
| **Revogação** | Via atualização da variável de ambiente `INTEGRATION_API_TOKEN` |

> ⚠️ **Nota de Segurança:** O token do `/api/feedbacks/import` é comparado em texto plano. Recomenda-se migrar para o mesmo modelo de hash SHA-256 usado pelo `/api/receber-avaliacao` em versões futuras.

---

## 13. Tratamento de Erros

### 13.1 Códigos de Status HTTP

| Código | Situação | Mensagem de Exemplo |
|--------|----------|---------------------|
| `200 OK` | Payload já importado (idempotência) | `{ "message": "Já importado", "feedback_id": "uuid" }` |
| `201 Created` | Importação bem-sucedida | `{ "success": true, "feedback_id": "uuid" }` |
| `400 Bad Request` | JSON inválido ou malformado | `{ "error": "Invalid JSON" }` |
| `401 Unauthorized` | Token ausente, inválido ou expirado | `{ "success": false, "error": "Invalid or inactive token" }` |
| `404 Not Found` | Analista não encontrado (apenas `/feedbacks/import`) | `{ "error": "Analista não encontrado: email@empresa.com" }` |
| `409 Conflict` | Requisição duplicada detectada | `{ "success": false, "error": "Duplicate request detected." }` |
| `422 Unprocessable Entity` | Campos obrigatórios ausentes ou inválidos | `{ "success": false, "error": "Payload validation failed", "details": ["analista.nome: required"] }` |
| `500 Internal Server Error` | Erro interno ao salvar no banco | `{ "success": false, "error": "Failed to save evaluation score: ..." }` |
| `503 Service Unavailable` | Supabase não configurado | `{ "success": false, "error": "Supabase service role not configured" }` |

### 13.2 Estrutura de Resposta de Erro

```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": ["Campo específico: motivo do erro"]
}
```

O campo `details` é um array de strings e aparece apenas em erros de validação (`422`).

### 13.3 Erros de Validação — Exemplos

```json
{
  "success": false,
  "error": "Payload validation failed",
  "details": [
    "analista.nome: required",
    "ciclo.nome: required",
    "qa (or scores.qa): required numeric score",
    "coordenador: required (in analista object or top-level)",
    "squad/equipe: required"
  ]
}
```

### 13.4 Erros de Autenticação

```json
{ "success": false, "error": "Missing Authorization header. Expected: Bearer <token>" }
{ "success": false, "error": "Invalid Authorization header format. Expected: Bearer <token>" }
{ "success": false, "error": "Invalid or inactive token" }
{ "success": false, "error": "Token expired" }
```

---

## 14. Regras de Reenvio

### 14.1 Quando Reenviar

| Código de Resposta | Deve Reenviar? | Observação |
|-------------------|----------------|------------|
| `200` | ❌ Não | Payload já foi processado com sucesso |
| `201` | ❌ Não | Processado com sucesso |
| `400` | ❌ Não | Erro no payload — corrigir antes de reenviar |
| `401` | ❌ Não | Verificar token antes de reenviar |
| `404` | ❌ Não | Cadastrar o analista no QualiVisão antes de reenviar |
| `409` | ❌ Não | Requisição duplicada — aguardar janela de 5 minutos |
| `422` | ❌ Não | Corrigir campos obrigatórios antes de reenviar |
| `500` | ✅ Sim | Erro temporário — reenviar com backoff exponencial |
| `503` | ✅ Sim | Serviço indisponível — reenviar após intervalo |
| Timeout / Sem resposta | ✅ Sim | Reenviar com idempotência garantida |

### 14.2 Estratégia de Reenvio Recomendada

```
Tentativa 1: imediata
Tentativa 2: após 30 segundos
Tentativa 3: após 2 minutos
Tentativa 4: após 10 minutos
Tentativa 5: após 30 minutos
Máximo de tentativas: 5
```

### 14.3 Garantia de Segurança no Reenvio

O reenvio é seguro para todos os endpoints graças às regras de idempotência (ver Seção 15). Um payload idêntico reenviado retornará `200` com o `feedback_id` original sem criar duplicatas.

---

## 15. Regras de Idempotência

### 15.1 Endpoint `/api/receber-avaliacao`

**Mecanismo 1 — Hash do payload:**
- Calcula hash do payload recebido
- Consulta `integration_request_logs` por `(analista, periodo, payload_hash, status='success')` nos últimos 5 minutos
- Se encontrado: retorna `409 Conflict`

**Mecanismo 2 — Upsert por chave natural:**
- `cycle_scores`: upsert por `UNIQUE(periodo, analista, squad)`
- `import_cycles`: upsert por `UNIQUE(periodo)`
- `feedback_historico`: upsert por `UNIQUE(analista_id, ciclo)`

### 15.2 Endpoint `/api/feedbacks/import`

**Mecanismo 1 — Hash SHA-256:**
- Calcula `SHA-256` do payload completo
- Consulta `feedback_import_logs` por `(payload_hash, status='success')`
- Se encontrado: retorna `200` com `feedback_id` existente

**Mecanismo 2 — Verificação por analista/ciclo:**
- Verifica se já existe `(analista_id, ciclo)` na tabela `feedbacks`
- Se encontrado: retorna `200` com `feedback_id` existente

**Mecanismo 3 — `external_id`:**
- O campo `external_id` pode ser enviado pelo sistema externo
- Armazenado na coluna `feedbacks.external_id`
- Não é usado atualmente como chave de idempotência direta, mas permite rastreamento externo

### 15.3 Recomendação para Sistemas Externos

Para garantir idempotência máxima:
1. Sempre enviar `external_id` com um UUID único por avaliação
2. Manter o mesmo payload (sem alterações) em reenvios
3. Aguardar a janela de 5 minutos antes de reenviar em caso de `409`

---

## 16. Ambiente de Produção

| Atributo | Valor |
|----------|-------|
| **URL Base** | `https://qualivisao.tec.br` |
| **Endpoint Executivo** | `https://qualivisao.tec.br/api/receber-avaliacao` |
| **Endpoint Feedback** | `https://qualivisao.tec.br/api/feedbacks/import` |
| **Banco de Dados** | Supabase (URL configurada em `NEXT_PUBLIC_SUPABASE_URL`) |
| **Autenticação DB** | Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) |
| **Token de Integração** | Configurado em `INTEGRATION_API_TOKEN` (env var) |
| **Framework** | Next.js 15 (App Router) |
| **Runtime** | Node.js (Edge-compatible) |
| **Status** | 🟢 Ativo |

**Variáveis de ambiente necessárias em produção:**

```env
NEXT_PUBLIC_SUPABASE_URL=<url-do-projeto-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
INTEGRATION_API_TOKEN=<token-de-integracao>
```

---

## 17. Ambiente de Homologação

| Atributo | Valor |
|----------|-------|
| **URL Base** | **não definido** |
| **Endpoint Executivo** | **não definido** |
| **Endpoint Feedback** | **não definido** |
| **Banco de Dados** | **não definido** |
| **Status** | 🔴 Não configurado |

> ⚠️ **Atenção:** Atualmente o QualiVisão possui apenas ambiente de produção. Não existe ambiente de homologação/staging separado configurado.
>
> **Recomendação para implementação futura:**
> - Criar projeto Supabase separado para homologação
> - Configurar URL de staging (ex: `https://staging.qualivisao.tec.br`)
> - Usar tokens de integração distintos para cada ambiente
> - Implementar variáveis de ambiente separadas por ambiente (`NEXT_PUBLIC_SUPABASE_URL_STAGING`, etc.)

---

## 18. Exemplo Real de Payload

### 18.1 Payload Executivo Mínimo (Campos Obrigatórios Apenas)

```json
{
  "analista": {
    "nome": "Ana Paula Ferreira",
    "equipe": "PDV",
    "coordenador": "Bruna Ramos"
  },
  "ciclo": {
    "nome": "04/2026"
  },
  "scores": {
    "qa": 87.50,
    "iepc": 82.00
  }
}
```

### 18.2 Payload Executivo Completo (Produção Real)

```json
{
  "metadata": {
    "origem": "sistema-avaliacao",
    "versao": "v2",
    "gerado_em": "2026-04-15T14:30:00Z",
    "avaliacao_id": "3f8a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c"
  },
  "analista": {
    "nome": "Ana Paula Ferreira",
    "nome_completo": "Ana Paula Ferreira",
    "email": "ana.paula@empresa.com",
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
    { "codigo": "P1", "nome": "Identificação e Boas-Vindas", "nota": 20.00, "maximo": 22 },
    { "codigo": "P2", "nome": "Diagnóstico e Solução", "nota": 30.00, "maximo": 34 },
    { "codigo": "P3", "nome": "Comunicação e Clareza", "nota": 16.00, "maximo": 18 },
    { "codigo": "P4", "nome": "Encerramento e Protocolo", "nota": 12.00, "maximo": 14 },
    { "codigo": "P5", "nome": "Conformidade e Compliance", "nota": 9.50, "maximo": 12 }
  ],
  "iepc_pilares": [
    { "codigo": "E1", "nome": "Empatia", "nota": 26.00, "maximo": 30 },
    { "codigo": "E2", "nome": "Proatividade", "nota": 18.00, "maximo": 20 },
    { "codigo": "E3", "nome": "Clareza", "nota": 16.00, "maximo": 20 },
    { "codigo": "E4", "nome": "Resolução", "nota": 12.00, "maximo": 15 },
    { "codigo": "E5", "nome": "Postura", "nota": 10.00, "maximo": 15 }
  ],
  "atendimentos": [
    {
      "protocolo": "2026-04-001",
      "cliente": "João Silva",
      "assunto": "Dúvida sobre fatura",
      "nota_qa": 88.00,
      "nota_iepc": 85.00,
      "sintese": "Atendimento resolutivo com boa empatia demonstrada",
      "criterios": [
        { "pilar_nome": "Identificação e Boas-Vindas", "criterio_nome": "Identificou-se corretamente", "status": "aderido" },
        { "pilar_nome": "Encerramento e Protocolo", "criterio_nome": "Confirmou protocolo", "status": "nao_aderido" }
      ],
      "nao_conformidades": [],
      "alertas_operacionais": []
    },
    {
      "protocolo": "2026-04-002",
      "cliente": "Maria Santos",
      "assunto": "Reclamação de cobrança",
      "nota_qa": 87.00,
      "nota_iepc": 79.00,
      "sintese": "Resolveu a questão mas não registrou protocolo",
      "criterios": [
        { "pilar_nome": "Encerramento e Protocolo", "criterio_nome": "Confirmou protocolo", "status": "nao_aderido" }
      ],
      "nao_conformidades": [
        {
          "tipo_nc": "NC-2",
          "descricao": "Não registrou protocolo ao encerrar atendimento",
          "severidade": "media",
          "pontos": -20,
          "aplicar_pontos": true
        }
      ]
    }
  ],
  "nao_conformidades": [
    {
      "protocolo": "2026-04-002",
      "tipo_nc": "NC-2",
      "descricao": "Não registrou protocolo ao encerrar",
      "severidade": "media",
      "pontos": -20,
      "aplicar_pontos": true,
      "impacto_operacional": "Risco de retrabalho e insatisfação do cliente",
      "justificativa_tecnica": "Critério P4.2 não aderido"
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "Você poderia ter confirmado o protocolo antes de encerrar",
      "como_poderia_ser": "Antes de encerrar, sempre confirme: 'Posso registrar o protocolo XXXX para você?'",
      "dica_de_ouro": "O protocolo é a garantia do cliente — nunca encerre sem ele",
      "categoria": "Encerramento"
    }
  ],
  "feedback_blocks": {
    "evolucao_tecnica": [
      "Demonstrou domínio técnico no diagnóstico de falhas de faturamento",
      "Utilizou corretamente o sistema de registro de ocorrências"
    ],
    "evolucao_comportamental": [
      "Manteve tom empático durante todo o atendimento",
      "Demonstrou paciência com cliente em estado emocional elevado"
    ],
    "atencao_evolutiva": [
      "Precisa reforçar o hábito de confirmar protocolo ao encerrar",
      "Atenção ao tempo médio de atendimento — acima da meta em 2 dos 3 casos"
    ],
    "fechamento_ciclo": "Ciclo de evolução consistente. Ana Paula demonstra maturidade técnica crescente e empatia consolidada. O foco para o próximo ciclo deve ser o encerramento estruturado com protocolo."
  },
  "pdi": [
    {
      "objetivo": "Reforçar encerramento com protocolo",
      "acao": "Praticar script de encerramento nos próximos 10 atendimentos monitorados",
      "resultado_esperado": "100% dos atendimentos com protocolo confirmado e registrado",
      "prazo": "2026-05-31",
      "status": "pendente"
    }
  ],
  "historico": [
    { "ciclo": "02/2026", "qa": 81.00, "iepc": 78.00 },
    { "ciclo": "03/2026", "qa": 84.50, "iepc": 80.00 }
  ],
  "pontos_fortes": [
    { "titulo": "Empatia", "descricao": "Demonstra escuta ativa e linguagem acolhedora consistentemente" },
    { "titulo": "Diagnóstico", "descricao": "Identifica rapidamente a raiz do problema do cliente" }
  ],
  "oportunidades": [
    { "titulo": "Protocolo", "descricao": "Reforçar confirmação de protocolo no encerramento" },
    { "titulo": "Tempo", "descricao": "Reduzir tempo médio de atendimento para dentro da meta" }
  ],
  "analytics": {
    "ranking_squad": 2,
    "total_analistas": 8,
    "ciclos_consecutivos_evolucao": 2
  },
  "tendencias": {},
  "conquistas": []
}
```

### 18.3 Payload Feedback Experience Mínimo

```json
{
  "analista": {
    "email": "ana.paula@empresa.com"
  },
  "ciclo": {
    "nome": "04/2026"
  },
  "scores": {
    "qa": 87.50
  }
}
```

---

## 19. Exemplo de Resposta da API

### 19.1 Sucesso — Criação (`201 Created`)

**Endpoint:** `/api/receber-avaliacao`

```json
{
  "success": true,
  "cycle_score_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "feedback_id": "b2c3d4e5-f6a7-8901-bcde-f01234567891",
  "analista": "Ana Paula Ferreira",
  "periodo": "04/2026",
  "qa_score": 87.5,
  "iepc_score": 82.0,
  "ncs_saved": 1,
  "atendimentos_saved": 2,
  "coaching_saved": 1,
  "pdi_saved": 1,
  "historico_saved": 2,
  "payload_version": "v2_lovable",
  "warnings": []
}
```

**Endpoint:** `/api/feedbacks/import`

```json
{
  "success": true,
  "feedback_id": "b2c3d4e5-f6a7-8901-bcde-f01234567891"
}
```

### 19.2 Sucesso — Idempotência (`200 OK`)

**Endpoint:** `/api/receber-avaliacao`

```json
{
  "success": false,
  "error": "Duplicate request detected."
}
```

> Nota: O endpoint `/api/receber-avaliacao` retorna `409` para duplicatas recentes (janela de 5 min). Para duplicatas via upsert (mesmo analista/ciclo/squad), o registro é atualizado silenciosamente e retorna `201`.

**Endpoint:** `/api/feedbacks/import`

```json
{
  "message": "Já importado",
  "feedback_id": "b2c3d4e5-f6a7-8901-bcde-f01234567891"
}
```

### 19.3 Erro de Validação (`422 Unprocessable Entity`)

```json
{
  "success": false,
  "error": "Payload validation failed",
  "details": [
    "analista.nome: required",
    "qa (or scores.qa): required numeric score",
    "coordenador: required (in analista object or top-level)"
  ]
}
```

### 19.4 Erro de Autenticação (`401 Unauthorized`)

```json
{
  "success": false,
  "error": "Invalid or inactive token"
}
```

### 19.5 Analista Não Encontrado (`404 Not Found`) — apenas `/feedbacks/import`

```json
{
  "error": "Analista não encontrado: ana.paula@empresa.com"
}
```

### 19.6 Erro Interno (`500 Internal Server Error`)

```json
{
  "success": false,
  "error": "Failed to save evaluation score: duplicate key value violates unique constraint"
}
```

---

## 20. Contrato Técnico Consolidado

### 20.1 Resumo Executivo

O QualiVisão expõe dois endpoints REST para integração com sistemas externos de avaliação:

| Endpoint | Propósito | Autenticação |
|----------|-----------|--------------|
| `POST /api/receber-avaliacao` | Scores executivos + dashboards | Bearer Token (hash SHA-256 em banco) |
| `POST /api/feedbacks/import` | Feedback Experience + PDI | Bearer Token (variável de ambiente) |

Ambos os endpoints:
- Aceitam `Content-Type: application/json`
- Suportam os formatos v1 (legacy) e v2 (Lovable) simultaneamente
- Implementam idempotência via hash do payload
- Persistem dados em múltiplas tabelas Supabase via service role

### 20.2 Campos Mínimos para Operação Contínua

Para garantir a operação completa do QualiVisão sem perda de funcionalidade:

**Obrigatórios (sem eles o sistema rejeita o payload):**

| Campo | Endpoint | Impacto se ausente |
|-------|----------|--------------------|
| `analista.nome` | `/api/receber-avaliacao` | `422` — payload rejeitado |
| `analista.equipe` | `/api/receber-avaliacao` | `422` — payload rejeitado |
| `analista.coordenador` | `/api/receber-avaliacao` | `422` — payload rejeitado |
| `ciclo.nome` | Ambos | `422` — payload rejeitado |
| `scores.qa` | Ambos | `422` — payload rejeitado |
| `scores.iepc` | `/api/receber-avaliacao` | `422` — payload rejeitado |
| `analista.email` | `/api/feedbacks/import` | `422` — payload rejeitado |

**Críticos para dashboards (sem eles os dashboards ficam incompletos):**

| Campo | Dashboard Impactado |
|-------|---------------------|
| `qa_pilares[P1..P5]` | QA & IEPC 360° (RadarChart, BarChart) |
| `iepc_pilares[E1..E5]` | QA & IEPC 360° (RadarChart, BarChart) |
| `nao_conformidades[]` | Painel Executivo, Auditoria, Ciclo Atual |
| `feedback_blocks` | Tela de Feedback Experience |
| `historico[]` | Gráfico de Evolução, People Analytics |
| `analytics.ranking_squad` | Painel Executivo, Ciclo Atual |
| `coaching[]` | Tela de Feedback Experience |
| `pdi[]` | Módulo PDI |

### 20.3 Matriz de Compatibilidade

| Funcionalidade | v1 Legacy | v2 Lovable | Observação |
|----------------|-----------|------------|------------|
| Score QA/IEPC | ✅ | ✅ | Campos diferentes, mesmo resultado |
| Pilares QA (P1–P5) | ✅ | ✅ | `pilares_qa[]` vs `qa_pilares[]` |
| Dimensões IEPC (E1–E5) | ✅ | ✅ | `pilares_iepc[]` vs `iepc_pilares[]` |
| Não conformidades | ✅ (via `ncs[]`) | ✅ (via `nao_conformidades[]`) | Estruturas diferentes |
| Coaching | ❌ | ✅ | Não suportado no v1 |
| Feedback blocks | ❌ | ✅ | Não suportado no v1 |
| PDI | ❌ | ✅ | Não suportado no v1 |
| Histórico | ❌ | ✅ | Não suportado no v1 |
| Atendimentos individuais | ✅ (via `evidencias[]`) | ✅ (via `atendimentos[]`) | Estruturas diferentes |
| Analytics | ✅ | ✅ | Mesmo campo em ambos |

### 20.4 Fluxo de Integração Recomendado

```
Sistema de Avaliação
        │
        ├─► POST /api/receber-avaliacao
        │   (payload completo v2)
        │   ├─ Persiste cycle_scores (dashboards executivos)
        │   ├─ Persiste feedbacks (feedback experience)
        │   ├─ Persiste feedback_atendimentos
        │   ├─ Persiste feedback_coaching
        │   ├─ Persiste feedback_pdi
        │   ├─ Persiste nc_records
        │   └─ Persiste feedback_historico
        │
        └─► POST /api/feedbacks/import (ALTERNATIVO)
            (payload focado em feedback experience)
            ├─ Persiste feedbacks (primário)
            ├─ Persiste feedback_atendimentos
            ├─ Persiste feedback_coaching
            ├─ Persiste feedback_pdi
            ├─ Persiste nc_records
            ├─ Persiste feedback_historico
            └─ Persiste cycle_scores (secundário)
```

> **Recomendação:** Usar apenas `/api/receber-avaliacao` para integração completa. O `/api/feedbacks/import` é adequado quando o foco é exclusivamente o módulo de Feedback Experience e o analista já está cadastrado no sistema.

### 20.5 Checklist de Integração

Antes de colocar a integração em produção, verificar:

- [ ] Token de integração configurado e ativo na tabela `integration_tokens` (para `/api/receber-avaliacao`)
- [ ] Variável de ambiente `INTEGRATION_API_TOKEN` configurada (para `/api/feedbacks/import`)
- [ ] Analistas cadastrados na tabela `analistas` com email válido (para `/api/feedbacks/import`)
- [ ] Formato do campo `ciclo.nome` validado como `"MM/YYYY"`
- [ ] Scores QA e IEPC no intervalo 0–100
- [ ] Pilares QA enviados na ordem P1, P2, P3, P4, P5
- [ ] Dimensões IEPC enviadas na ordem E1, E2, E3, E4, E5
- [ ] `external_id` único por avaliação para rastreamento
- [ ] Estratégia de reenvio implementada com backoff exponencial
- [ ] Tratamento de resposta `200` (idempotência) implementado
- [ ] Tratamento de resposta `404` (analista não encontrado) implementado

### 20.6 Limitações Conhecidas e Pendências

| Item | Status | Observação |
|------|--------|------------|
| Ambiente de homologação | ❌ Não definido | Apenas produção disponível |
| Token `/feedbacks/import` em texto plano | ⚠️ Risco moderado | Recomenda-se migrar para hash SHA-256 |
| Atualização de feedback existente | ❌ Não suportado | Necessário deletar e reimportar |
| Webhook de confirmação | ❌ Não definido | Sistema externo não recebe notificação assíncrona |
| Rate limiting | ❌ Não definido | Sem limite de requisições por minuto documentado |
| Paginação de histórico | ❌ Não definido | Todo o histórico é enviado de uma vez |
| Validação de email do analista em `/api/receber-avaliacao` | ⚠️ Opcional | Analista criado automaticamente se não existir |

---

*Documento gerado em 18/06/2026 a partir do código-fonte real dos endpoints `/api/receber-avaliacao/route.ts` e `/api/feedbacks/import/route.ts`, normalizadores `normalizePayload.ts` e `endpointAdapter.ts`, e contrato anterior `QUALIVISAO_CONTRATO_INTEGRACAO.md`.*

*Para dúvidas ou atualizações, contatar a Área de Qualidade — Zetti Tech.*
