# QUALIVISÃO — INTEGRATION BLUEPRINT & TECHNICAL AUDIT

> **Versão:** 1.0  
> **Data de Geração:** 17/06/2026  
> **Classificação:** Documento Interno — Uso Restrito  
> **Responsável Técnico:** Área de Qualidade — Zetti Tech  
> **Finalidade:** Diagnóstico técnico completo para integração com o novo Sistema de Avaliação  
> **URL de Produção:** https://qualivisao.tec.br  
> **Versão da Aplicação:** 0.5.1-20260527173055+

---

## SUMÁRIO

1. [Inventário de Telas](#1-inventário-de-telas)
2. [Inventário de Módulos](#2-inventário-de-módulos)
3. [Inventário de Banco de Dados](#3-inventário-de-banco-de-dados)
4. [Mapeamento de Dados Recebidos (Payload Lovable)](#4-mapeamento-de-dados-recebidos-payload-lovable)
5. [Mapeamento de Integrações](#5-mapeamento-de-integrações)
6. [Análise de Reaproveitamento](#6-análise-de-reaproveitamento)
7. [Análise dos Feedbacks](#7-análise-dos-feedbacks)
8. [Análise dos Dashboards](#8-análise-dos-dashboards)
9. [Gap Analysis](#9-gap-analysis)
10. [Relatório Final](#10-relatório-final)

---

## 1. INVENTÁRIO DE TELAS

### 1.1 Seção EXECUTIVO

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 1 | Painel Executivo | Dashboard consolidado de saúde operacional com KPIs, gráficos de tendência, ranking de analistas e chat IA | `/` | `HomeExecutiveView`, `HomeKPICards`, `HeroCycleStatus`, `MonthlyTrendChart`, `TopAnalysts`, `NavigationShortcuts` | ✅ Ativo |
| 2 | Evolução Geral | Tendências históricas multi-ciclo: heatmap analista×período, gráfico de NCs por tipo, entrada manual | `/evolucao-geral` | Componente inline (1 arquivo) | ✅ Ativo |
| 3 | Analytics Avançado | Drilldown por ciclo, comparação entre analistas, matriz de pilares, exportação CSV/PDF | `/cycle-dashboard` | `CycleDashboard`, `CycleKPICards`, `CycleFilters`, `SquadRankingChart`, `PillarMatrix`, `AnalystDrilldown`, `ExecutiveInsights`, `CompareAnalystsModal`, `AnalystRadarChart`, `PillarDrilldownModal`, `NonConformitiesGuide` | ✅ Ativo |

### 1.2 Seção OPERAÇÃO

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 4 | Ciclo Atual | Acompanhamento operacional em tempo real do ciclo ativo; polling 30s; comparativo com ciclo anterior | `/ciclo-atual` | Componente inline com modal de detalhe do analista | ✅ Ativo |
| 5 | Gestão de Ciclos | Listagem, abertura, fechamento e reabertura de ciclos; histórico de fechamentos | `/ciclos` | Componente inline | ✅ Ativo |
| 6 | Auditoria | Central operacional de auditoria por analista; KPIs automáticos; status por analista | `/auditoria` | Componente inline | ⚠️ Parcial — lista de analistas hardcoded |
| 7 | Organograma / Suporte | Organograma configurável com hierarquia de coordenadores e métricas | `/suporte` | Componente inline | ⚠️ Valor operacional questionável |

### 1.3 Seção QUALIDADE

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 8 | QA & IEPC 360° | Análise profunda dos 5 pilares QA (P1-P5) e 5 dimensões IEPC (E1-E5); radar, scatter, área; tabelas de aderência | `/qa-iepc` | Componente inline com `CriteriaAdherenceTable` | ✅ Ativo |
| 9 | Não Conformidades | Gestão de NCs (NC-1 a NC-5); filtros avançados; modal de detalhe; detecção de reincidentes | `/nao-conformidades` | Componente inline | ✅ Ativo |
| 10 | Mural de Elogios | Exibição e ranking de elogios; mural de cards; toggle de destaque | `/mural-elogios` | Componente inline | ✅ Ativo |

### 1.4 Seção DESENVOLVIMENTO HUMANO

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 11 | Feedbacks | Lista de feedbacks com status de workflow; filtros; ações em lote; inline status changer | `/feedback` | Componente inline | ✅ Ativo |
| 12 | Detalhe do Feedback | View completo do feedback; gráficos; PDI; link público; exportação PDF | `/feedback/[id]` | Componente inline | ✅ Ativo |
| 13 | Feedback Público | Acesso sem login via token UUID; view idêntico ao detalhe | `/feedback/public/[token]` | Componente inline | ✅ Ativo |
| 14 | Criação Manual de Feedback | Formulário completo para criação/edição manual de feedback | `/feedback/manual` | Componente inline | ✅ Ativo |
| 15 | Importação de Feedback | Upload e validação de payload JSON; preview antes de salvar | `/feedback/import` | Componente inline | ✅ Ativo |
| 16 | Histórico de Feedbacks | Histórico agrupado por analista; gráfico de evolução QA/IEPC | `/feedback/historico` | Componente inline | ⚠️ Redundante com `/evolucao-geral` |
| 17 | PDI (Feedback) | Gestão de PDIs vinculados a feedbacks; CRUD; filtros; KPIs | `/feedback/pdi` | Componente inline | ✅ Ativo (legado) |
| 18 | People Analytics | Análise agregada por equipe; top performers; médias globais | `/feedback/people-analytics` | Componente inline | ⚠️ Redundante com `/cycle-dashboard` |
| 19 | Central de PDI | Todos os PDIs (feedback + manuais); objetivos; timeline; anexos | `/pdis` | Componente inline | ✅ Ativo |
| 20 | Gestão de Pessoas | Perfis RH dos analistas; drawer com histórico; semáforo de risco | `/gestao` | Componente inline | ✅ Ativo |
| 21 | Advertências | Registro e gestão de advertências formais; categorias; severidades | `/advertencias` | Componente inline | ✅ Ativo |

### 1.5 Seção GOVERNANÇA

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 22 | Documentos | Repositório de documentos ISO; upload; categorias; versões | `/documentos` | Componente inline | ✅ Ativo |
| 23 | Histórico | Tabela de ciclos históricos com médias; edição inline | `/historico` | Componente inline | ⚠️ Usa localStorage — sem Supabase |

### 1.6 Seção ADMIN

| # | Nome | Finalidade | URL/Rota | Componentes Principais | Status |
|---|---|---|---|---|---|
| 24 | Configurações | CRUD de usuários, cargos, permissões, integrações; logs | `/configuracoes` | Componente inline (abas) | ✅ Ativo — Admin only |
| 25 | Analistas | CRUD completo de analistas; import CSV/XLSX; drawer com histórico | `/analistas` | Componente inline | ✅ Ativo |
| 26 | Importações | Hub de importação: CSV/XLSX, manual, retroativo JSON | `/importacoes` | `ImportModal` + componente inline | ✅ Ativo |
| 27 | Logs & Diagnóstico | Dashboard de saúde; logs filtráveis; usuários; logs de permissão | `/admin-diagnostico` | Componente inline (abas) | ✅ Ativo — Admin only |

### 1.7 Telas Legado / Sem Valor Operacional

| # | Nome | URL/Rota | Status |
|---|---|---|---|
| 28 | Admin Config | `/admin-config` | ❌ Legado — redireciona para `/configuracoes` |
| 29 | Calibragem | `/calibragem` | ⚠️ Incompleto — sem lógica real de calibração |

### 1.8 Telas Públicas (Sem Layout Enterprise)

| # | Nome | URL/Rota | Status |
|---|---|---|---|
| 30 | Login | `/sign-up-login` | ✅ Ativo |
| 31 | Callback OAuth | `/auth/callback` | ✅ Ativo |
| 32 | Privacidade | `/privacidade` | ✅ Ativo |
| 33 | Termos | `/termos` | ✅ Ativo |

---

## 2. INVENTÁRIO DE MÓDULOS

### 2.1 Módulos Funcionais

| Módulo | Seção Sidebar | Rotas | Status | Descrição |
|---|---|---|---|---|
| **Dashboard Executivo** | EXECUTIVO | `/`, `/evolucao-geral`, `/cycle-dashboard` | ✅ Ativo | Visão consolidada para diretoria e gestão |
| **Ciclos** | OPERAÇÃO | `/ciclo-atual`, `/ciclos` | ✅ Ativo | Controle de abertura, fechamento e acompanhamento de ciclos |
| **Auditoria** | OPERAÇÃO | `/auditoria` | ⚠️ Parcial | Central operacional com dados hardcoded |
| **Qualidade (QA & IEPC)** | QUALIDADE | `/qa-iepc` | ✅ Ativo | Análise 360° de pilares e dimensões |
| **Não Conformidades** | QUALIDADE | `/nao-conformidades` | ✅ Ativo | Gestão de NCs com 5 tipos padronizados |
| **Elogios** | QUALIDADE | `/mural-elogios` | ✅ Ativo | Reconhecimento e ranking |
| **Feedback** | DESENV. HUMANO | `/feedback`, `/feedback/[id]`, `/feedback/manual`, `/feedback/import`, `/feedback/historico`, `/feedback/public/[token]` | ✅ Ativo | Ciclo completo de feedback individual |
| **PDI** | DESENV. HUMANO | `/pdis`, `/feedback/pdi` | ✅ Ativo (dual) | Plano de Desenvolvimento Individual — duas telas paralelas |
| **People Analytics** | DESENV. HUMANO | `/feedback/people-analytics` | ⚠️ Redundante | Absorvido por `/cycle-dashboard` |
| **Gestão de Pessoas** | DESENV. HUMANO | `/gestao` | ✅ Ativo | Perfis RH com histórico de performance |
| **Advertências** | DESENV. HUMANO | `/advertencias` | ✅ Ativo | Registro disciplinar formal |
| **Documentos** | GOVERNANÇA | `/documentos` | ✅ Ativo | Repositório ISO |
| **Histórico** | GOVERNANÇA | `/historico` | ⚠️ localStorage | Ciclos históricos sem persistência Supabase |
| **Configurações** | ADMIN | `/configuracoes` | ✅ Ativo | RBAC completo |
| **Analistas** | ADMIN | `/analistas` | ✅ Ativo | CRUD de analistas |
| **Importações** | ADMIN | `/importacoes` | ✅ Ativo | Hub de importação de dados |
| **Diagnóstico** | ADMIN | `/admin-diagnostico` | ✅ Ativo | Logs e saúde do sistema |

### 2.2 Módulos de Integração

| Módulo | Tipo | Endpoint | Status |
|---|---|---|---|
| **Recebimento de Avaliação** | API REST | `POST /api/receber-avaliacao` | ✅ Ativo |
| **Importação de Feedbacks** | API REST | `POST /api/feedbacks/import` | ✅ Ativo |
| **Chat IA** | API REST | `POST /api/ai/chat-completion` | ✅ Ativo |
| **Sincronização de Usuários** | API REST | `POST /api/admin/sync-auth-users` | ✅ Ativo |

---

## 3. INVENTÁRIO DE BANCO DE DADOS

### 3.1 Tabelas de Usuários e Autenticação

| Tabela | Finalidade | Registros | Relacionamentos Principais |
|---|---|---|---|
| `user_profiles` | Perfis dos usuários autenticados (espelha auth.users) | 11 | → `cargos` (N:1), → `user_permissions` (1:N), → `user_scope_permissions` (1:1) |
| `pre_registered_users` | Whitelist de emails autorizados para login | 9 | → `cargos` (N:1) |
| `cargos` | Cargos configuráveis com flags de admin master | 11 | ← `user_profiles` (1:N) |
| `user_permissions` | Permissões granulares por usuário por módulo | 149 | → `user_profiles` (N:1) |
| `user_scope_permissions` | Escopo de visibilidade de squads por usuário | 0 | → `user_profiles` (1:1) |
| `permission_modules` | Módulos configuráveis do sistema | 19 | — |
| `permission_logs` | Auditoria de alterações de permissão | 100 | → `user_profiles` (N:1 actor/target) |
| `roles` | Papéis do sistema (legado) | 5 | → `role_permissions` (1:N) |
| `permissions` | Permissões por módulo/página/ação (legado) | 25 | → `role_permissions` (1:N) |
| `role_permissions` | Associação role × permissão (legado) | 59 | → `roles` (N:1), → `permissions` (N:1) |

### 3.2 Tabelas de Ciclos e Scores

| Tabela | Finalidade | Registros | Relacionamentos Principais |
|---|---|---|---|
| `import_cycles` | Ciclos importados com status e metadados | 4 | ← `cycle_scores`, `nc_records`, `elogios`, `manual_evaluations`, `cycle_closure_history` (1:N) |
| `cycle_scores` | Scores QA/IEPC por analista por período (P1-P5, E1-E5) | 95 | → `import_cycles` (N:1) |
| `nc_records` | Registros de não conformidades (NC-1 a NC-5) | 83 | → `import_cycles` (N:1) |
| `elogios` | Registros de elogios por colaborador | 54 | → `import_cycles` (N:1) |
| `manual_evaluations` | Avaliações inseridas manualmente via formulário | 0 | → `import_cycles` (N:1), → `user_profiles` (N:1) |
| `cycle_summaries` | Resumos consolidados por período (QA médio, IEPC médio, etc.) | 4 | — |
| `cycle_closure_history` | Histórico de fechamento/reabertura de ciclos | 13 | → `import_cycles` (N:1), → `user_profiles` (N:1) |
| `strategic_indicators` | Indicadores estratégicos calculados por analista/período | 0 | — |
| `import_logs` | Logs detalhados de cada importação | 0 | → `import_cycles` (N:1) |
| `quality_cycles` | Ciclos de qualidade (camada adicional) | 1 | ← `import_cycles` (1:N via quality_cycle_id) |

### 3.3 Tabelas de Analistas

| Tabela | Finalidade | Registros | Relacionamentos Principais |
|---|---|---|---|
| `analistas` | Perfis operacionais dos analistas (sem login no sistema) | 30 | ← `feedbacks`, `feedback_pdi`, `feedback_historico`, `pdi_records` (1:N) |
| `analyst_profiles` | Perfis estendidos de analistas (legado, não utilizado ativamente) | 0 | → `squads` (N:1) |
| `squads` | Squads com coordenador e aliases | 7 | ← `analyst_profiles` (1:N) |

**Tabela `analistas` — Colunas Completas:**
```
id, nome, email (unique), squad, equipe, coordenador, cargo_operacional,
nivel, status (ativo/ferias/afastado/desligado), aniversario, tempo_empresa,
ultima_promocao, observacoes, data_admissao, tempo_empresa_calculado,
tempo_empresa_meses, analista_id (unique), nome_completo, telefone,
nome_curto, foto_url, nivel_profissional (Júnior I a Especialista)
```

### 3.4 Tabelas de Feedback e PDI

| Tabela | Finalidade | Registros | Relacionamentos Principais |
|---|---|---|---|
| `feedbacks` | Feedbacks completos por analista/ciclo com snapshot JSON | 58 | → `analistas` (N:1), ← `feedback_atendimentos`, `feedback_pdi`, `feedback_coaching`, `feedback_historico`, `pdi_records` (1:N) |
| `feedback_atendimentos` | Atendimentos individuais auditados por feedback | 353 | → `feedbacks` (N:1) |
| `feedback_pdi` | PDI legado vinculado ao feedback (substituído por `pdi_records`) | 0 | → `feedbacks` (N:1), → `analistas` (N:1) |
| `feedback_coaching` | Registros de coaching (o que foi dito / como poderia ser / dica de ouro) | 26 | → `feedbacks` (N:1) |
| `feedback_historico` | Histórico de scores QA/IEPC por analista/ciclo (UNIQUE analista_id+ciclo) | 60 | → `analistas` (N:1), → `feedbacks` (N:1) |
| `feedback_analytics` | Analytics agregados por período/equipe (não populado) | 0 | — |
| `feedback_import_logs` | Logs de importação de feedbacks | 87 | → `feedbacks` (N:1) |
| `pdi_records` | PDIs enterprise — central de PDI com objetivos e timeline | 2 | → `import_cycles` (N:1), → `analistas` (N:1), → `feedbacks` (N:1), ← `pdi_objectives`, `pdi_timeline` (1:N) |
| `pdi_objectives` | Checklist de objetivos por PDI (progresso ponderado) | 0 | → `pdi_records` (N:1) |
| `pdi_timeline` | Timeline evolutiva de eventos do PDI | 0 | → `pdi_records` (N:1) |

**Tabela `feedbacks` — Colunas Relevantes para o Novo Sistema:**
```
id, analista_id, ciclo, coordenador, equipe, auditor,
qa_score, iepc_score, aderencia_score, posicao_squad, total_squad,
pilares_qa (JSONB), pilares_iepc (JSONB),
pontos_fortes (JSONB), oportunidades (JSONB),
evolucao_tecnica, evolucao_comportamental, risco_operacional,
status (draft/generated/reviewed/approved/sent),
snapshot_json_completo (JSONB — payload original completo),
coaching_details (JSONB), public_token, public_enabled,
payload_version, payload_normalized, external_id
```

**Tabela `pdi_records` — Colunas Relevantes:**
```
id, feedback_id, analista_id, analista, squad, coordenador, periodo,
status_pdi, acoes (JSONB), metas (JSONB), evidencias (JSONB),
objetivo, prazo, observacoes, evolucao_tecnica, evolucao_comportamental,
performance_operacional, risco_operacional, plano_desenvolvimento,
proxima_revisao, ciclo, aderencia_score, total_ncs, total_elogios,
objetivo_desenvolvimento, acao_desenvolvimento, resultado_esperado,
mensagem_evolutiva, comentario_coordenador, comentario_analista,
data_acompanhamento, proxima_revisao_date, attachments (JSONB)
```

### 3.5 Tabelas de Governança e Sistema

| Tabela | Finalidade | Registros | Relacionamentos Principais |
|---|---|---|---|
| `documents` | Repositório de documentos ISO (metadados + link Storage) | 0 | → `user_profiles` (N:1) |
| `audit_logs` | Logs de auditoria de ações do sistema | 0 | → `user_profiles` (N:1 user/actor) |
| `admin_logs` | Logs administrativos do sistema | 0 | — |
| `advertencias` | Registros disciplinares formais | 0 | — |
| `app_settings` | Configurações globais (ciclo ativo, org chart) | 1 | — |
| `integration_tokens` | Tokens de integração (Lovable) com hash | 1 | — |
| `integration_request_logs` | Logs de requisições recebidas da integração | 26 | — |
| `deletion_logs` | Log de exclusões com usuário, data, quantidade | 0 | → `auth.users` (N:1) |

### 3.6 Tabelas Identificadas como Críticas para o Novo Sistema

| Tabela | Importância | Observação |
|---|---|---|
| `feedbacks` | 🔴 CRÍTICA | Origem oficial dos dados de avaliação; contém snapshot completo |
| `feedback_historico` | 🔴 CRÍTICA | Histórico de evolução QA/IEPC por analista/ciclo |
| `feedback_coaching` | 🟠 ALTA | Dados de coaching estruturados (o_que_foi_dito, como_poderia_ser, dica_de_ouro) |
| `feedback_pdi` | 🟡 MÉDIA | Legado — substituído por `pdi_records`; 0 registros |
| `cycle_scores` | 🔴 CRÍTICA | Scores consolidados por analista/período; alimenta todos os dashboards |
| `quality_cycles` | 🟡 MÉDIA | Camada adicional de ciclos; 1 registro; pouco utilizada |
| `analyst_profiles` | 🟡 BAIXA | Legado — 0 registros; substituído por `analistas` |
| `squads` | 🟠 ALTA | 7 registros; referência oficial de squads |
| `strategic_indicators` | 🟡 BAIXA | 0 registros; não populado; potencial para o novo sistema |

---

## 4. MAPEAMENTO DE DADOS RECEBIDOS (PAYLOAD LOVABLE)

### 4.1 Estrutura Completa do Payload Recebido

O endpoint `POST /api/receber-avaliacao` recebe o seguinte payload do sistema Lovable (novo formato):

```json
{
  "metadata": {
    "origem": "lovable",
    "versao": "1.0",
    "gerado_em": "ISO 8601",
    "avaliacao_id": "string único"
  },
  "analista": {
    "nome": "string",
    "nome_completo": "string",
    "email": "string",
    "equipe": "string",
    "coordenador": "string",
    "auditor": "string"
  },
  "ciclo": {
    "nome": "MM/YYYY",
    "data_inicio": "ISO 8601",
    "data_fim": "ISO 8601",
    "status": "string"
  },
  "scores": {
    "qa": 0.0,
    "iepc": 0.0,
    "aderencia": 0.0
  },
  "pilares_qa": [
    { "codigo": "P1", "nome": "string", "nota": 0.0, "maximo": 22, "peso": 22 }
  ],
  "pilares_iepc": [
    { "codigo": "E1", "nome": "string", "nota": 0.0, "maximo": 30 }
  ],
  "atendimentos": [
    {
      "protocolo": "string",
      "sup": "string",
      "cliente": "string",
      "data": "ISO 8601",
      "duracao": "string",
      "nota_qa": 0.0,
      "assunto": "string",
      "solucao": "string",
      "sintese": "string",
      "informou_sup": true,
      "criterios": [
        { "pilar_nome": "string", "criterio_nome": "string", "status": "atende|nao_atende" }
      ],
      "nao_conformidades": ["NC-1", "NC-2"]
    }
  ],
  "coaching": [
    {
      "o_que_foi_dito": "string",
      "como_poderia_ser": "string",
      "dica_de_ouro": "string",
      "categoria": "string"
    }
  ],
  "pdi": [
    {
      "objetivo": "string",
      "acao_desenvolvimento": "string",
      "prazo": "YYYY-MM-DD",
      "progresso": 0,
      "status": "pendente|em_andamento|concluido"
    }
  ],
  "historico": [
    { "ciclo": "MM/YYYY", "qa": 0.0, "iepc": 0.0 }
  ],
  "feedback_blocks": {
    "evolucao_tecnica": "string",
    "evolucao_comportamental": "string",
    "atencao_evolutiva": "string"
  },
  "analytics": {
    "ranking_squad": 0,
    "total_analistas": 0,
    "ciclos_consecutivos_evolucao": 0
  },
  "external_id": "string único para idempotência"
}
```

### 4.2 Campos Utilizados vs. Ignorados vs. Calculados

| Campo do Payload | Destino no Supabase | Status | Observação |
|---|---|---|---|
| `metadata.avaliacao_id` | `feedbacks.external_id` | ✅ Utilizado | Idempotência |
| `metadata.origem` | `feedbacks.origem` | ✅ Utilizado | `'api_lovable'` |
| `analista.nome` | `analistas.nome` + `cycle_scores.analista` | ✅ Utilizado | Upsert por nome |
| `analista.email` | `analistas.email` | ✅ Utilizado | Chave de upsert |
| `analista.equipe` | `analistas.equipe` + `feedbacks.equipe` | ✅ Utilizado | |
| `analista.coordenador` | `analistas.coordenador` + `cycle_scores.coordenador` | ✅ Utilizado | |
| `analista.auditor` | `cycle_scores.auditor` + `feedbacks.auditor` | ✅ Utilizado | |
| `ciclo.nome` | `cycle_scores.periodo` + `feedbacks.ciclo` | ✅ Utilizado | Chave do ciclo |
| `ciclo.data_inicio` | `feedbacks.periodo_inicio` | ✅ Utilizado | |
| `ciclo.data_fim` | `feedbacks.periodo_fim` | ✅ Utilizado | |
| `scores.qa` | `cycle_scores.nota_final_qa` + `feedbacks.qa_score` | ✅ Utilizado | |
| `scores.iepc` | `cycle_scores.iepc_total` + `feedbacks.iepc_score` | ✅ Utilizado | |
| `scores.aderencia` | `feedbacks.aderencia_score` | ✅ Utilizado | |
| `pilares_qa` | `feedbacks.pilares_qa` (JSONB) + `cycle_scores.p1-p5` | ✅ Utilizado | Pilares extraídos para colunas individuais |
| `pilares_iepc` | `feedbacks.pilares_iepc` (JSONB) + `cycle_scores.e1-e5` | ✅ Utilizado | Dimensões extraídas para colunas individuais |
| `atendimentos[].protocolo` | `feedback_atendimentos.protocolo` | ✅ Utilizado | |
| `atendimentos[].nota_qa` | `feedback_atendimentos.nota_qa` | ✅ Utilizado | |
| `atendimentos[].criterios` | `feedback_atendimentos.criterios` (JSONB) + `cycle_scores.criterios` (JSONB) | ✅ Utilizado | Critérios individuais armazenados mas **NÃO exibidos** nas telas |
| `atendimentos[].nao_conformidades` | `nc_records` (upsert) | ✅ Utilizado | |
| `atendimentos[].sintese` | `feedback_atendimentos.sintese` | ✅ Utilizado | |
| `atendimentos[].solucao` | `feedback_atendimentos.solucao` | ✅ Utilizado | |
| `coaching[].o_que_foi_dito` | `feedback_coaching.o_que_foi_dito` | ✅ Utilizado | |
| `coaching[].como_poderia_ser` | `feedback_coaching.como_poderia_ser` | ✅ Utilizado | |
| `coaching[].dica_de_ouro` | `feedback_coaching.dica_de_ouro` | ✅ Utilizado | |
| `pdi[].objetivo` | `pdi_records.objetivo` | ✅ Utilizado | Via `autoCreatePDIFromFeedback()` |
| `pdi[].acao_desenvolvimento` | `pdi_records.acao_desenvolvimento` | ✅ Utilizado | |
| `pdi[].prazo` | `pdi_records.prazo` | ✅ Utilizado | |
| `historico[].ciclo` | `feedback_historico.ciclo` | ✅ Utilizado | |
| `historico[].qa` | `feedback_historico.qa_score` | ✅ Utilizado | |
| `historico[].iepc` | `feedback_historico.iepc_score` | ✅ Utilizado | |
| `feedback_blocks.evolucao_tecnica` | `feedbacks.evolucao_tecnica` | ✅ Utilizado | Armazenado mas **exibição parcial** |
| `feedback_blocks.evolucao_comportamental` | `feedbacks.evolucao_comportamental` | ✅ Utilizado | Armazenado mas **exibição parcial** |
| `feedback_blocks.atencao_evolutiva` | `feedbacks.snapshot_json_completo` | ⚠️ Parcial | Armazenado no snapshot mas não em coluna dedicada |
| `analytics.ranking_squad` | `feedbacks.posicao_squad` | ✅ Utilizado | |
| `analytics.total_analistas` | `feedbacks.total_squad` | ✅ Utilizado | |
| `analytics.ciclos_consecutivos_evolucao` | `feedbacks.ciclos_consecutivos_evolucao` | ✅ Utilizado | |
| `metadata.versao` | `feedbacks.payload_version` | ✅ Utilizado | |
| Payload completo | `feedbacks.snapshot_json_completo` | ✅ Utilizado | Backup completo do payload original |

### 4.3 Campos Calculados Internamente

| Campo Calculado | Fórmula | Onde Calculado |
|---|---|---|
| `cycle_scores.pontos_deduzidos_nc` | `SUM(nc.pontos_deduzidos)` por analista/período | `endpointAdapter.ts` |
| `cycle_scores.total_ncs` | `COUNT(nc_records)` por analista/período | `receber-avaliacao/route.ts` |
| `feedbacks.status` | Inicia como `'generated'` | `receber-avaliacao/route.ts` |
| `analistas.tempo_empresa_meses` | Calculado a partir de `data_admissao` | `dataService.ts` |
| Classificação de risco | QA < 70 → crítico; 70-89 → atenção; ≥ 90 → excelência | Calculado nas telas |
| Reincidência NC | COUNT(nc_records) por analista/tipo > 1 | Calculado em `/nao-conformidades` |
| Posição no squad | Ranking por QA dentro do squad | Calculado em `receber-avaliacao/route.ts` |

### 4.4 Campos do Payload NÃO Exibidos nas Telas (Dados Ocultos)

| Campo | Tabela/Coluna | Impacto |
|---|---|---|
| `atendimentos[].criterios` | `cycle_scores.criterios` (JSONB) | **ALTO** — Critérios individuais de aderência armazenados mas não exibidos em nenhuma tela |
| `feedback_blocks.atencao_evolutiva` | `feedbacks.snapshot_json_completo` | **MÉDIO** — Dado de atenção evolutiva não tem coluna dedicada |
| `feedbacks.evolucao_tecnica` | `feedbacks.evolucao_tecnica` | **MÉDIO** — Exibido apenas em `/feedback/[id]`, não em `/gestao` |
| `feedbacks.evolucao_comportamental` | `feedbacks.evolucao_comportamental` | **MÉDIO** — Idem acima |
| `feedback_coaching` | `feedback_coaching` (26 registros) | **MÉDIO** — Dados de coaching armazenados mas não exibidos em dashboard |
| `pdi_records.evolucao_tecnica` | `pdi_records.evolucao_tecnica` | **MÉDIO** — Campo existe mas não exibido em `/pdis` |

---

## 5. MAPEAMENTO DE INTEGRAÇÕES

### 5.1 APIs REST (Next.js API Routes)

| Endpoint | Método | Auth | Finalidade | Status |
|---|---|---|---|---|
| `/api/receber-avaliacao` | `POST` | Bearer `INTEGRATION_API_TOKEN` | Recebe payload completo de avaliação do Lovable; persiste em 8+ tabelas | ✅ Ativo |
| `/api/receber-avaliacao` | `GET` | Bearer `INTEGRATION_API_TOKEN` | Verifica status do endpoint e último log | ✅ Ativo |
| `/api/feedbacks/import` | `POST` | Bearer `INTEGRATION_API_TOKEN` | Importação de feedbacks em lote via JSON | ✅ Ativo |
| `/api/ai/chat-completion` | `POST` | Interno (server-side) | Proxy de IA: Gemini via `@rocketnew/llm-sdk` | ✅ Ativo |
| `/api/admin/sync-auth-users` | `POST` | Interno | Sincroniza usuários do Supabase Auth com `user_profiles` | ✅ Ativo |

### 5.2 Tokens e Credenciais

| Variável | Status | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configurada | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Configurada | Chave anon (leitura pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Pendente | Necessária para `/api/receber-avaliacao` (bypass RLS) |
| `INTEGRATION_API_TOKEN` | ✅ Configurada | Auth das APIs externas (Lovable) |
| `GEMINI_API_KEY` | ✅ Configurada | Chat IA no painel executivo |
| `NEXT_PUBLIC_SITE_URL` | ✅ Configurada | `https://qualivisao.tec.br` |

### 5.3 Integrações Externas Ativas

| Integração | Tipo | Finalidade | Status |
|---|---|---|---|
| **Supabase** | BaaS | Banco de dados PostgreSQL + Auth + Storage + RLS | ✅ Ativo |
| **Gemini AI** | LLM | Chat assistente contextual no Painel Executivo | ✅ Ativo |
| **Google Analytics** | Analytics | Rastreamento de eventos e pageviews | ⚠️ Chave pendente |
| **Lovable (Sistema Externo)** | API REST | Envia payloads de avaliação via `POST /api/receber-avaliacao` | ✅ Ativo |

### 5.4 Conectores MCP Disponíveis

| Conector | Status | Uso Potencial |
|---|---|---|
| **Notion** | ✅ Conectado | Documentação técnica |
| **Typeform** | ✅ Conectado | Formulários externos |
| **Calendly** | ✅ Conectado | Agendamento de revisões de PDI |
| **Google Sheets** | ✅ Conectado | Exportação de relatórios |
| **Google Docs** | ✅ Conectado | Geração de documentos |
| **Google Calendar** | ✅ Conectado | Datas de revisão de PDI |

### 5.5 Edge Functions

Nenhuma Edge Function Supabase identificada no projeto. Todo o processamento server-side é feito via Next.js API Routes.

### 5.6 Processamentos Automáticos

| Processo | Trigger | Descrição |
|---|---|---|
| `autoCreatePDIFromFeedback()` | Após importação de feedback | Verifica `snapshot_json_completo.pdi_objetivos`; cria `pdi_records` se não existe |
| `handle_new_user()` | Trigger Supabase (auth.users INSERT) | Cria `user_profiles` automaticamente ao criar usuário no Auth |
| Polling de Ciclo Atual | Automático (30s) | `/ciclo-atual` atualiza dados a cada 30 segundos |
| Cache de Permissões | TTL 5 min | `sessionStorage` com perfil e permissões do usuário |
| Evento `zetti_data_changed` | Após importação/edição | CustomEvent no window para sincronização entre componentes |

### 5.7 Supabase Storage Buckets

| Bucket | Finalidade | Acesso |
|---|---|---|
| `analistas-avatar` | Fotos de perfil dos analistas | Público (leitura) |
| `documents` | Documentos ISO e normas | Autenticado |
| `pdi-attachments` | Anexos dos PDIs | Autenticado |

---

## 6. ANÁLISE DE REAPROVEITAMENTO

### 6.1 Classificação por Componente

#### 🟢 REAPROVEITAR INTEGRALMENTE

| Componente | Tipo | Justificativa |
|---|---|---|
| `cycle_scores` | Tabela | Estrutura completa e bem indexada; 95 registros reais; suporta P1-P5, E1-E5, criterios JSONB |
| `nc_records` | Tabela | 83 registros; estrutura adequada; apenas adicionar `severidade` e `status_resolucao` |
| `elogios` | Tabela | 54 registros; estrutura simples e funcional |
| `feedbacks` | Tabela | 58 registros; estrutura rica com JSONB; suporta snapshot completo |
| `feedback_atendimentos` | Tabela | 353 registros; estrutura detalhada por atendimento |
| `feedback_coaching` | Tabela | 26 registros; estrutura adequada para coaching |
| `feedback_historico` | Tabela | 60 registros; histórico de evolução por analista/ciclo |
| `analistas` | Tabela | 30 registros; estrutura completa com `nivel_profissional` e `foto_url` |
| `import_cycles` | Tabela | 4 registros; controle de ciclos com status e histórico |
| `pdi_records` | Tabela | Estrutura enterprise completa; 2 registros (início) |
| `pdi_objectives` | Tabela | Checklist de objetivos; estrutura adequada |
| `app_settings` | Tabela | Configurações globais; ciclo ativo |
| `integration_tokens` | Tabela | Token de integração com hash |
| `integration_request_logs` | Tabela | 26 logs de requisições; rastreabilidade |
| `deletion_logs` | Tabela | Log de exclusões; proteção de dados |
| `/api/receber-avaliacao` | API Route | Endpoint principal de integração; normalização robusta |
| `EnterpriseLayout` | Componente | Layout enterprise completo e funcional |
| `EnterpriseSidebar` | Componente | Navegação colapsável com seções e RBAC |
| `EnterpriseTopbar` | Componente | Topbar com usuário, breadcrumb e ações |
| `ImportModal` | Componente | Modal de importação multi-step robusto |
| `SystemAuthContext` | Contexto | Autenticação com RBAC e cache |
| `dataService.ts` | Serviço | Funções de dados com fallback localStorage→Supabase |
| `supabaseDataService.ts` | Serviço | Importação de ciclos e gestão de ciclo ativo |
| `rbac.ts` | Utilitário | Controle de acesso por módulo |
| `/feedback` | Tela | Lista de feedbacks funcional |
| `/feedback/[id]` | Tela | Detalhe completo do feedback |
| `/nao-conformidades` | Tela | Gestão de NCs com redesign já aplicado |
| `/mural-elogios` | Tela | Mural de elogios funcional |
| `/documentos` | Tela | Repositório ISO funcional |
| `/advertencias` | Tela | Registro disciplinar funcional |
| `/configuracoes` | Tela | RBAC completo e funcional |
| `/analistas` | Tela | CRUD completo de analistas |
| `/admin-diagnostico` | Tela | Logs e diagnóstico funcional |

#### 🟡 REAPROVEITAR COM AJUSTES

| Componente | Tipo | Ajustes Necessários |
|---|---|---|
| `cycle_summaries` | Tabela | Adicionar campos de delta (vs. ciclo anterior) para o Painel Executivo |
| `strategic_indicators` | Tabela | Popular com dados calculados; adicionar campos de tendência por critério |
| `pdi_timeline` | Tabela | Integrar com fluxo de criação automática de PDI |
| `/` (Painel Executivo) | Tela | Reestruturar em 5 blocos; adicionar semáforo de risco; remover redundâncias |
| `/ciclo-atual` | Tela | Corrigir lógica de ciclo ativo; adicionar modal de detalhe completo do analista |
| `/ciclos` | Tela | Fundir com `/importacoes` e migrar `/historico` do localStorage |
| `/qa-iepc` | Tela | Surfar critérios individuais (`cycle_scores.criterios`); tabela de aderência |
| `/evolucao-geral` | Tela | Migrar dados de localStorage para Supabase |
| `/cycle-dashboard` | Tela | Renomear para `/analytics`; remover componentes redundantes |
| `/gestao` | Tela | Fundir com `/analistas`; surfar `evolucao_tecnica` e `evolucao_comportamental` |
| `/pdis` | Tela | Fundir com `/feedback/pdi`; corrigir carregamento de PDIs históricos |
| `/auditoria` | Tela | Substituir lista hardcoded por query em `analistas` com filtro de status |
| `feedback_pdi` | Tabela | Manter como legado; migrar novos PDIs para `pdi_records` |
| `analyst_profiles` | Tabela | Avaliar migração para `analistas` (0 registros — migração simples) |
| `squads` | Tabela | Sincronizar com squads reais da operação |

#### 🔴 SUBSTITUIR

| Componente | Tipo | Substituto | Justificativa |
|---|---|---|---|
| `/historico` (localStorage) | Tela | Dados em `import_cycles` + `cycle_summaries` | localStorage não é confiável para dados operacionais |
| `localStorage` como fallback | Padrão | Supabase como fonte única | Risco de perda de dados ao limpar cache |
| Lista hardcoded em `/auditoria` | Dados | Query em `analistas` | 18 analistas fixos no código — não escala |
| `EMBEDDED_ANALYSTS` em `/auditoria` | Constante | `fetchAnalistas()` | Hardcoded não reflete realidade operacional |
| Dupla camada de auth | Arquitetura | Supabase Auth como fonte única | Risco de inconsistência e loops de login |

#### ⚫ DESCONTINUAR

| Componente | Tipo | Justificativa |
|---|---|---|
| `/admin-config` | Tela | Legado — apenas redireciona para `/configuracoes` |
| `/calibragem` | Tela | Incompleto — sem lógica real de calibração; sem persistência |
| `/feedback/historico` | Tela | Redundante com `/evolucao-geral` |
| `/feedback/people-analytics` | Tela | Redundante com `/cycle-dashboard` |
| `analyst_profiles` | Tabela | 0 registros; substituída por `analistas` |
| `feedback_analytics` | Tabela | 0 registros; não populada; substituída por queries diretas |
| `roles` + `permissions` + `role_permissions` | Tabelas | Sistema RBAC legado; substituído por `user_permissions` + `user_scope_permissions` |

---

## 7. ANÁLISE DOS FEEDBACKS

### 7.1 Estrutura Atual dos Feedbacks

O feedback no QualiVisão é um documento completo gerado por ciclo de avaliação, contendo:

```
feedbacks (registro principal)
├── Identificação: analista_id, ciclo, coordenador, equipe, auditor
├── Scores: qa_score, iepc_score, aderencia_score, posicao_squad, total_squad
├── Pilares QA: pilares_qa (JSONB) — [{nome, pontuacao, max, variacao, observacao}]
├── Pilares IEPC: pilares_iepc (JSONB) — [{nome, pontuacao, max, variacao}]
├── Análise: pontos_fortes, oportunidades, resumo_ciclo, tendencias, conquistas
├── Evolução: evolucao_tecnica, evolucao_comportamental, risco_operacional
├── Status: draft → generated → reviewed → approved → sent
├── Origem: 'api_lovable' | 'importacao_json' | 'manual'
├── Snapshot: snapshot_json_completo (payload original completo)
└── Acesso público: public_token, public_enabled

feedback_atendimentos (atendimentos individuais)
├── protocolo, sup, cliente, assunto, nota_qa, nota_iepc
├── classificacao: excelente | bom | regular | critico
├── observacao, link_gravacao, duracao, canal
├── solucao, sintese, comportamento
├── criterios (JSONB) — critérios individuais de aderência
├── ncs (JSONB) — NCs do atendimento
└── criterios_raw (JSONB) — critérios brutos do payload

feedback_coaching (coaching por atendimento)
├── o_que_foi_dito
├── como_poderia_ser
├── dica_de_ouro
└── contexto

feedback_historico (histórico de evolução)
├── analista_id, ciclo, mes, ano
├── qa_score, iepc_score, aderencia_score
├── posicao_squad, snapshot
└── UNIQUE(analista_id, ciclo)
```

### 7.2 Análise por Tipo de Feedback

#### Coaching
- **Tabela:** `feedback_coaching` (26 registros)
- **Campos disponíveis:** `o_que_foi_dito`, `como_poderia_ser`, `dica_de_ouro`, `contexto`
- **Status:** ✅ Estrutura completa; dados armazenados
- **Gap:** Não exibido em dashboard; apenas em `/feedback/[id]`
- **Atende novo sistema:** ✅ Sim — estrutura adequada para o novo Sistema de Avaliação

#### Evolução Técnica
- **Tabela:** `feedbacks.evolucao_tecnica` (TEXT)
- **Status:** ✅ Armazenado; exibido em `/feedback/[id]`
- **Gap:** Não exibido em `/gestao` nem em `/pdis`
- **Atende novo sistema:** ✅ Sim — campo dedicado existe

#### Evolução Comportamental
- **Tabela:** `feedbacks.evolucao_comportamental` (TEXT)
- **Status:** ✅ Armazenado; exibido em `/feedback/[id]`
- **Gap:** Não exibido em `/gestao` nem em `/pdis`
- **Atende novo sistema:** ✅ Sim — campo dedicado existe

#### Atenção Evolutiva
- **Tabela:** `feedbacks.snapshot_json_completo` (JSONB — campo `feedback_blocks.atencao_evolutiva`)
- **Status:** ⚠️ Armazenado apenas no snapshot; sem coluna dedicada
- **Gap:** Sem coluna `atencao_evolutiva` em `feedbacks`
- **Atende novo sistema:** ⚠️ Parcial — necessita migration para coluna dedicada

#### PDI
- **Tabelas:** `pdi_records` (2 registros) + `feedback_pdi` (0 registros — legado)
- **Campos disponíveis:** `objetivo`, `acao_desenvolvimento`, `resultado_esperado`, `prazo`, `status_pdi`, `progresso`, `evolucao_tecnica`, `evolucao_comportamental`, `mensagem_evolutiva`
- **Status:** ✅ Estrutura enterprise completa; poucos registros (início)
- **Gap:** `autoCreatePDIFromFeedback()` nem sempre cria PDIs corretamente; PDIs históricos não aparecem
- **Atende novo sistema:** ✅ Sim — estrutura adequada; necessita correção de fluxo

### 7.3 Campos que Atendem o Novo Sistema de Avaliação

| Campo | Tabela | Atende? | Observação |
|---|---|---|---|
| Ciclos | `import_cycles` | ✅ Sim | Estrutura completa |
| Avaliações (scores) | `cycle_scores` | ✅ Sim | P1-P5, E1-E5, QA, IEPC |
| Atendimentos | `feedback_atendimentos` | ✅ Sim | 353 registros |
| QA por atendimento | `feedback_atendimentos.nota_qa` | ✅ Sim | |
| IEPC por atendimento | `feedback_atendimentos.nota_iepc` | ✅ Sim | |
| Critérios individuais | `feedback_atendimentos.criterios` + `cycle_scores.criterios` | ⚠️ Parcial | Armazenado mas não exibido |
| Não Conformidades | `nc_records` | ✅ Sim | 83 registros |
| Coaching | `feedback_coaching` | ✅ Sim | 26 registros |
| Evolução Técnica | `feedbacks.evolucao_tecnica` | ✅ Sim | |
| Evolução Comportamental | `feedbacks.evolucao_comportamental` | ✅ Sim | |
| Atenção Evolutiva | `feedbacks.snapshot_json_completo` | ⚠️ Parcial | Sem coluna dedicada |
| PDI | `pdi_records` | ✅ Sim | Estrutura enterprise |
| Histórico | `feedback_historico` | ✅ Sim | 60 registros |
| Elogios | `elogios` | ✅ Sim | 54 registros |
| IEPC (indicador) | `cycle_scores.iepc_total` + `feedbacks.iepc_score` | ✅ Sim | |

---

## 8. ANÁLISE DOS DASHBOARDS

### 8.1 Painel Executivo (`/`)

| Indicador | Fórmula | Origem dos Dados | Dependência Lovable |
|---|---|---|---|
| QA Médio | `AVG(nota_final_qa)` por período | `cycle_scores` | ✅ Sim |
| IEPC Médio | `AVG(iepc_total)` por período | `cycle_scores` | ✅ Sim |
| Total Analistas | `COUNT(DISTINCT analista)` | `cycle_scores` | ✅ Sim |
| Total NCs | `COUNT(*)` | `nc_records` | ✅ Sim |
| Total Elogios | `COUNT(*)` | `elogios` | ✅ Sim |
| Analistas em Risco | `COUNT(analista WHERE nota_final_qa < 70)` | `cycle_scores` | ✅ Sim |
| Analistas em Destaque | `COUNT(analista WHERE nota_final_qa >= 90)` | `cycle_scores` | ✅ Sim |
| Tendência QA/IEPC | `AVG por período` ordenado por data | `cycle_scores` | ✅ Sim |
| Distribuição por classificação | Agrupamento por faixa de QA | `cycle_scores` | ✅ Sim |
| Pilares QA médios | `AVG(p1), AVG(p2), ..., AVG(p5)` | `cycle_scores` | ✅ Sim |
| Ranking de squads | `AVG(nota_final_qa) GROUP BY squad` | `cycle_scores` | ✅ Sim |

**Dependência do Lovable:** TOTAL — todos os dados vêm via `POST /api/receber-avaliacao` ou importação CSV.

### 8.2 Analytics Avançado (`/cycle-dashboard`)

| Indicador | Fórmula | Origem |
|---|---|---|
| KPIs do ciclo | Médias e totais por período selecionado | `cycle_scores`, `nc_records`, `elogios` |
| Ranking de squads | `AVG(nota_final_qa) GROUP BY squad` | `cycle_scores` |
| Matriz de pilares | `AVG(p1-p5, e1-e5) GROUP BY analista` | `cycle_scores` |
| Comparação entre analistas | Scores individuais lado a lado | `cycle_scores` |
| Insights executivos | Gerados automaticamente por lógica de negócio | `cycle_scores` |
| Guia de NCs | Distribuição e recomendações | `nc_records` |

### 8.3 QA & IEPC 360° (`/qa-iepc`)

| Indicador | Fórmula | Origem |
|---|---|---|
| Radar de pilares | `AVG(p1-p5)` e `AVG(e1-e5)` | `cycle_scores` |
| Scatter QA × IEPC | Posicionamento individual | `cycle_scores` |
| Evolução temporal | `AVG por período` | `cycle_scores` |
| Tabela de aderência por critério | `criterios` JSONB (não exibido ainda) | `cycle_scores.criterios` |
| Pesos dos pilares | P1=22, P2=34, P3=18, P4=14, P5=12 | Hardcoded (correto) |
| Pesos IEPC | E1=30, E2=20, E3=20, E4=15, E5=15 | Hardcoded (correto) |

### 8.4 Ciclo Atual (`/ciclo-atual`)

| Indicador | Fórmula | Origem |
|---|---|---|
| Ciclo ativo | `app_settings WHERE key = 'active_cycle'` | `app_settings` |
| QA médio atual | `AVG(nota_final_qa) WHERE periodo = ciclo_ativo` | `cycle_scores` |
| IEPC médio atual | `AVG(iepc_total) WHERE periodo = ciclo_ativo` | `cycle_scores` |
| Delta vs. ciclo anterior | `QA_atual - QA_anterior` | `cycle_scores` (dois períodos) |
| Analistas pendentes | Analistas sem score no ciclo ativo | `analistas` LEFT JOIN `cycle_scores` |

### 8.5 Evolução Geral (`/evolucao-geral`)

| Indicador | Fórmula | Origem | Problema |
|---|---|---|---|
| Tendência histórica | `AVG por período` multi-ciclo | `cycle_scores` + `localStorage` | ⚠️ Fallback para localStorage |
| Heatmap analista × período | Score por célula | `cycle_scores` | ✅ OK |
| NCs por tipo por período | `COUNT GROUP BY tipo_nc, periodo` | `nc_records` | ✅ OK |

---

## 9. GAP ANALYSIS

### 9.1 O que o QualiVisão já possui e pode ser reaproveitado

| Capacidade | Status | Tabela/Componente |
|---|---|---|
| Recebimento de payload completo de avaliação | ✅ Pronto | `/api/receber-avaliacao` |
| Persistência de scores QA/IEPC por analista/período | ✅ Pronto | `cycle_scores` (95 registros) |
| Persistência de NCs com tipo padronizado | ✅ Pronto | `nc_records` (83 registros) |
| Persistência de elogios | ✅ Pronto | `elogios` (54 registros) |
| Persistência de feedbacks completos com snapshot | ✅ Pronto | `feedbacks` (58 registros) |
| Persistência de atendimentos individuais | ✅ Pronto | `feedback_atendimentos` (353 registros) |
| Persistência de coaching | ✅ Pronto | `feedback_coaching` (26 registros) |
| Histórico de evolução por analista | ✅ Pronto | `feedback_historico` (60 registros) |
| Gestão de ciclos com status e fechamento | ✅ Pronto | `import_cycles` + `cycle_closure_history` |
| RBAC completo por módulo | ✅ Pronto | `user_permissions` + `user_scope_permissions` |
| Autenticação com whitelist | ✅ Pronto | `pre_registered_users` + Supabase Auth |
| Dashboards executivos com gráficos | ✅ Pronto | Múltiplas telas |
| Exportação CSV e PDF | ✅ Pronto | `dataService.ts` + `pdfExport.ts` |
| Link público de feedback sem login | ✅ Pronto | `feedbacks.public_token` |
| Repositório de documentos ISO | ✅ Pronto | `documents` + Storage |
| Log de exclusões | ✅ Pronto | `deletion_logs` |
| Estrutura de PDI enterprise | ✅ Pronto | `pdi_records` + `pdi_objectives` + `pdi_timeline` |
| Perfis de analistas com nível profissional | ✅ Pronto | `analistas.nivel_profissional` |

### 9.2 O que precisará ser alterado para receber dados do novo Sistema de Avaliação

#### Alterações de Banco de Dados

| Alteração | Prioridade | Descrição |
|---|---|---|
| Adicionar `atencao_evolutiva` em `feedbacks` | 🔴 Alta | Coluna dedicada para atenção evolutiva (hoje só no snapshot) |
| Adicionar `severidade` em `nc_records` | 🔴 Alta | Campo de severidade (Leve/Moderada/Grave/Crítica) |
| Adicionar `status_resolucao` em `nc_records` | 🔴 Alta | Fluxo de resolução (aberta → em tratativa → resolvida) |
| Adicionar `impacto_operacional` em `nc_records` | 🟠 Média | Campo de impacto operacional do payload |
| Adicionar `evidencia_literal` em `nc_records` | 🟠 Média | Evidência textual da NC |
| Verificar constraint UNIQUE em `cycle_scores` | 🔴 Alta | `UNIQUE(periodo, analista, squad)` para upsert correto |
| Criar tabela `audit_records` | 🟠 Média | Persistência de dados de auditoria (hoje hardcoded) |
| Migrar `localStorage` de `/historico` para `import_cycles` | 🟠 Média | Dados históricos em Supabase |
| Popular `strategic_indicators` | 🟡 Baixa | Indicadores calculados para o novo sistema |

#### Alterações de Backend (API Routes)

| Alteração | Prioridade | Descrição |
|---|---|---|
| Corrigir `onConflict` do upsert em `cycle_scores` | 🔴 Alta | Deve ser `onConflict: 'periodo,analista,squad'` |
| Adicionar `nota_iepc` no insert de `feedback_atendimentos` | 🔴 Alta | Campo não está sendo persistido corretamente |
| Corrigir variável `ncRowsToInsert` → `ncRowsWithCycleId` | 🔴 Alta | Bug de variável no processamento de NCs |
| Adicionar upsert de `cycle_scores` ao final de `/feedbacks/import` | 🔴 Alta | Scores não são atualizados após importação de feedbacks |
| Remover credenciais hardcoded de `mockData.ts` | 🔴 Alta | Segurança |
| Corrigir matching de NCs e elogios por nome completo + período | 🟠 Média | Matching parcial pode gerar duplicatas |
| Adicionar campo `atencao_evolutiva` no processamento do payload | 🟠 Média | Extrair do `feedback_blocks` para coluna dedicada |

#### Alterações de Frontend

| Alteração | Prioridade | Descrição |
|---|---|---|
| Surfar `criterios` individuais em `/qa-iepc` | 🔴 Alta | `CriteriaAdherenceTable` com dados de `cycle_scores.criterios` |
| Fundir `/pdis` + `/feedback/pdi` | 🟠 Média | Tela única de PDI |
| Fundir `/gestao` + `/analistas` | 🟠 Média | Tela única de gestão de pessoas |
| Fundir `/ciclos` + `/importacoes` + migrar `/historico` | 🟠 Média | Hub único de ciclos |
| Reescrever `/auditoria` com dados reais do banco | 🔴 Alta | Remover lista hardcoded |
| Surfar `evolucao_tecnica`, `evolucao_comportamental` em `/gestao` | 🟠 Média | Dados disponíveis mas não exibidos |
| Reestruturar Painel Executivo em 5 blocos | 🟠 Média | Saúde / Evolução / Riscos / Destaques / Recomendações |
| Atualizar sidebar com nova arquitetura de 7 seções | 🟠 Média | Conforme arquitetura definitiva |
| Remover telas órfãs | 🟡 Baixa | `/admin-config`, `/calibragem`, `/feedback/historico`, `/feedback/people-analytics` |

### 9.3 Riscos Técnicos Identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` não configurada | 🔴 Crítico | Configurar imediatamente — sem ela, `/api/receber-avaliacao` falha silenciosamente |
| RLS permissivo (`USING (true)` para anon) | 🔴 Alto | Dados operacionais acessíveis sem autenticação; revisar políticas |
| Dupla camada de autenticação | 🟠 Médio | Unificar em Supabase Auth como fonte única |
| localStorage como fallback de dados | 🟠 Médio | Migrar todos os dados para Supabase |
| Lista hardcoded de analistas em `/auditoria` | 🟠 Médio | Substituir por query em `analistas` |
| Sem paginação nas tabelas | 🟡 Baixo | Implementar paginação para `cycle_scores`, `feedbacks`, `nc_records` |
| `external_id` sem validação obrigatória | 🟡 Baixo | Duplicatas possíveis se não enviado pelo novo sistema |
| Bypass de auth em iframe | 🟡 Baixo | Restringir a domínios específicos |

---

## 10. RELATÓRIO FINAL

### 10.1 Arquitetura Atual

```
NOVO SISTEMA DE AVALIAÇÃO (Lovable/Externo)
  │
  │ POST /api/receber-avaliacao (Bearer Token)
  │ Payload: analista, ciclo, scores, pilares, atendimentos, coaching, PDI, histórico
  ▼
QUALIVISÃO (Next.js 15 + Supabase)
  │
  ├── Normalização: normalizePayloadForEndpoint()
  ├── Persistência:
  │   ├── analistas (upsert por email)
  │   ├── import_cycles (upsert por período)
  │   ├── cycle_scores (upsert por período+analista)
  │   ├── nc_records (insert)
  │   ├── elogios (insert)
  │   ├── feedbacks (upsert por external_id)
  │   ├── feedback_atendimentos (insert)
  │   ├── feedback_coaching (insert)
  │   ├── feedback_historico (upsert por analista+ciclo)
  │   └── pdi_records (via autoCreatePDIFromFeedback)
  │
  └── Visualização:
      ├── / (Painel Executivo) ← cycle_scores, nc_records, elogios
      ├── /ciclo-atual ← cycle_scores, app_settings
      ├── /qa-iepc ← cycle_scores (p1-p5, e1-e5)
      ├── /nao-conformidades ← nc_records
      ├── /mural-elogios ← elogios
      ├── /feedback ← feedbacks, analistas
      ├── /feedback/[id] ← feedbacks, feedback_atendimentos, feedback_coaching, pdi_records
      ├── /pdis ← pdi_records, feedback_pdi
      ├── /gestao ← analistas, cycle_scores, nc_records, pdi_records
      └── /evolucao-geral ← cycle_scores (+ localStorage fallback)
```

### 10.2 Arquitetura Recomendada

```
NOVO SISTEMA DE AVALIAÇÃO (Fonte Oficial)
  │
  │ POST /api/receber-avaliacao (Bearer Token)
  │ Payload enriquecido: + severidade_nc, + atencao_evolutiva, + criterios_detalhados
  ▼
QUALIVISÃO (Plataforma Executiva e Analítica)
  │
  ├── Normalização: endpointAdapter.ts (já implementado)
  ├── Persistência (corrigida):
  │   ├── analistas (upsert por email — OK)
  │   ├── import_cycles (upsert por período — OK)
  │   ├── cycle_scores (upsert com UNIQUE(periodo,analista,squad) — CORRIGIR)
  │   ├── nc_records (insert com severidade + status_resolucao — ADICIONAR)
  │   ├── elogios (insert — OK)
  │   ├── feedbacks (upsert por external_id + atencao_evolutiva — ADICIONAR)
  │   ├── feedback_atendimentos (insert com nota_iepc — CORRIGIR)
  │   ├── feedback_coaching (insert — OK)
  │   ├── feedback_historico (upsert — OK)
  │   └── pdi_records (criação automática corrigida)
  │
  └── Visualização (7 seções):
      ├── EXECUTIVO: / + /evolucao-geral + /analytics
      ├── OPERAÇÃO: /ciclo-atual + /ciclos (unificado)
      ├── QUALIDADE: /qa-iepc (com critérios) + /nao-conformidades + /mural-elogios
      ├── DESENVOLVIMENTO: /feedback + /pdis (unificado) + /gestao (unificado)
      ├── ANALYTICS: /analytics (renomeado de /cycle-dashboard)
      ├── GOVERNANÇA: /auditoria (reescrita) + /documentos + /advertencias
      └── ADMIN: /configuracoes + /admin-diagnostico + /importacoes
```

### 10.3 Componentes Reaproveitáveis (Resumo)

| Categoria | Reaproveitamento Integral | Com Ajustes | Substituir | Descontinuar |
|---|---|---|---|---|
| **Tabelas** | 18 tabelas | 6 tabelas | 1 padrão (localStorage) | 5 tabelas |
| **Telas** | 14 telas | 9 telas | 2 telas | 4 telas |
| **APIs** | 4 endpoints | 0 | 0 | 0 |
| **Componentes** | 12 componentes | 3 componentes | 0 | 2 componentes |
| **Serviços** | 4 serviços | 2 serviços | 0 | 0 |

### 10.4 Componentes que Devem Ser Removidos

| Componente | Tipo | Motivo |
|---|---|---|
| `/admin-config` | Tela | Legado sem funcionalidade |
| `/calibragem` | Tela | Incompleto sem valor operacional |
| `/feedback/historico` | Tela | Redundante com `/evolucao-geral` |
| `/feedback/people-analytics` | Tela | Redundante com `/cycle-dashboard` |
| `EMBEDDED_ANALYSTS` em `/auditoria` | Constante | Hardcoded — não escala |
| `analyst_profiles` | Tabela | 0 registros — substituída por `analistas` |
| `feedback_analytics` | Tabela | 0 registros — não utilizada |
| `roles` + `permissions` + `role_permissions` | Tabelas | RBAC legado substituído |

### 10.5 Riscos Técnicos (Consolidado)

| Risco | Severidade | Ação Imediata |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` ausente | 🔴 Crítico | Configurar na variável de ambiente |
| Bug `ncRowsToInsert` → `ncRowsWithCycleId` | 🔴 Crítico | Corrigir em `receber-avaliacao/route.ts` |
| `onConflict` incorreto em `cycle_scores` | 🔴 Crítico | Corrigir para `periodo,analista,squad` |
| `nota_iepc` não persistida em `feedback_atendimentos` | 🔴 Crítico | Adicionar campo no insert |
| RLS permissivo para anon | 🟠 Alto | Revisar políticas em produção |
| localStorage como banco de dados | 🟠 Alto | Migrar para Supabase |
| Lista hardcoded em `/auditoria` | 🟠 Alto | Substituir por query dinâmica |
| Dupla camada de auth | 🟠 Médio | Unificar em Supabase Auth |

### 10.6 Impactos da Migração

| Área | Impacto | Descrição |
|---|---|---|
| **Dados históricos** | 🟡 Baixo | Dados já em Supabase (95 scores, 83 NCs, 58 feedbacks, 353 atendimentos) — sem perda |
| **Integrações ativas** | 🟢 Nenhum | `/api/receber-avaliacao` continua funcionando; apenas enriquecimento do payload |
| **Telas de visualização** | 🟡 Baixo | Apenas ajustes de UI; dados já existem no banco |
| **RBAC e permissões** | 🟢 Nenhum | Sistema RBAC completo e funcional; sem alterações necessárias |
| **Autenticação** | 🟡 Baixo | Unificação de camadas; sem impacto para usuários finais |
| **Exportações** | 🟢 Nenhum | CSV e PDF funcionais; sem alterações |
| **Dados em localStorage** | 🟠 Médio | Migração necessária para `/historico`; dados podem ser perdidos se não migrados antes |

### 10.7 Backlog Priorizado para Integração com Novo Sistema

#### Sprint 1 — Correções Críticas (P0)
1. ✅ Configurar `SUPABASE_SERVICE_ROLE_KEY` no ambiente
2. ✅ Corrigir `onConflict` do upsert em `cycle_scores` (`periodo,analista,squad`)
3. ✅ Corrigir bug `ncRowsToInsert` → `ncRowsWithCycleId`
4. ✅ Adicionar `nota_iepc` no insert de `feedback_atendimentos`
5. ✅ Adicionar upsert de `cycle_scores` ao final de `/feedbacks/import`
6. ✅ Remover credenciais hardcoded de `mockData.ts`
7. ✅ Corrigir matching de NCs e elogios (nome completo + período)

#### Sprint 2 — Reestruturação de Banco
1. Migration: adicionar `atencao_evolutiva` em `feedbacks`
2. Migration: adicionar `severidade`, `status_resolucao`, `impacto_operacional`, `evidencia_literal` em `nc_records`
3. Migration: verificar/criar constraint UNIQUE em `cycle_scores(periodo, analista, squad)`
4. Migration: criar tabela `audit_records` para auditoria real
5. Migrar dados de `localStorage` de `/historico` para `import_cycles`

#### Sprint 3 — Enriquecimento de Telas
1. Surfar `criterios` individuais em `/qa-iepc` (`CriteriaAdherenceTable`)
2. Surfar `evolucao_tecnica`, `evolucao_comportamental`, `atencao_evolutiva` em `/gestao` e `/feedback/[id]`
3. Reescrever `/auditoria` com query dinâmica em `analistas`
4. Fundir `/pdis` + `/feedback/pdi` como tela única
5. Fundir `/gestao` + `/analistas` como tela única
6. Reestruturar Painel Executivo em 5 blocos operacionais

#### Sprint 4 — UX e Refinamento
1. Semáforos de risco em `/ciclo-atual` e `/gestao`
2. Alertas de prazo em `/feedback` e `/pdis`
3. Fluxo de resolução de NCs (aberta → em tratativa → resolvida)
4. `CycleDeltaCard` (delta vs. ciclo anterior) no Painel Executivo
5. Remover telas órfãs (`/admin-config`, `/calibragem`, `/feedback/historico`, `/feedback/people-analytics`)
6. Atualizar sidebar com nova arquitetura de 7 seções

---

## APÊNDICE A — MAPA DE RELACIONAMENTOS COMPLETO

```
auth.users (Supabase Auth)
  └─ user_profiles (1:1)
       ├─ user_permissions (1:N) — permissões por módulo
       ├─ user_scope_permissions (1:1) — escopo de squads
       └─ cargos (N:1) — cargo do usuário

import_cycles (ciclos importados)
  ├─ cycle_scores (1:N) — scores por analista
  ├─ nc_records (1:N) — não conformidades
  ├─ elogios (1:N) — elogios
  ├─ manual_evaluations (1:N) — avaliações manuais
  ├─ import_logs (1:N) — logs de importação
  └─ cycle_closure_history (1:N) — histórico de fechamento

analistas (perfis operacionais)
  ├─ feedbacks (1:N) — feedbacks por ciclo
  ├─ feedback_pdi (1:N) — PDIs legado
  ├─ feedback_historico (1:N) — histórico de scores
  └─ pdi_records (1:N) — PDIs enterprise

feedbacks (feedbacks completos)
  ├─ feedback_atendimentos (1:N) — atendimentos individuais
  ├─ feedback_coaching (1:N) — registros de coaching
  ├─ feedback_historico (1:N) — histórico vinculado
  ├─ feedback_pdi (1:N) — PDIs legado
  ├─ feedback_import_logs (1:N) — logs de importação
  └─ pdi_records (1:N via feedback_id) — PDIs enterprise

pdi_records (PDIs enterprise)
  ├─ pdi_objectives (1:N) — checklist de objetivos
  └─ pdi_timeline (1:N) — timeline evolutiva
```

## APÊNDICE B — ENDPOINTS DE INTEGRAÇÃO

```
Produção:
  POST https://qualivisao.tec.br/api/receber-avaliacao
    Auth: Bearer {INTEGRATION_API_TOKEN}
    Finalidade: Receber avaliações do novo Sistema de Avaliação

  POST https://qualivisao.tec.br/api/feedbacks/import
    Auth: Bearer {INTEGRATION_API_TOKEN}
    Finalidade: Importação em lote de feedbacks

  POST https://qualivisao.tec.br/api/ai/chat-completion
    Auth: Interno (server-side)
    Finalidade: Chat IA com Gemini

  POST https://qualivisao.tec.br/api/admin/sync-auth-users
    Auth: Interno
    Finalidade: Sincronização de usuários

Preview:
  POST https://zettiquali9387.builtwithrocket.new/api/receber-avaliacao
  POST https://zettiquali9387.builtwithrocket.new/api/feedbacks/import
```

## APÊNDICE C — SQUADS CONFIGURADOS

```
PDV
PDV N1
Compras e Estoque
Financeiro Fiscal
```
*(Fonte: `squads` — 7 registros; `import_logs` e `cycle_scores` confirmam estes squads)*

## APÊNDICE D — PESOS OFICIAIS QA E IEPC

**QA — Qualidade do Atendimento:**
| Pilar | Nome | Peso |
|---|---|---|
| P1 | Gestão do Fluxo e Rastreabilidade | 22 pts |
| P2 | Gestão da Tratativa da Demanda | 34 pts |
| P3 | Análise e Assertividade Técnica | 18 pts |
| P4 | Qualidade da Comunicação | 14 pts |
| P5 | Conduta Relacional | 12 pts |
| **TOTAL** | | **100 pts** |

**IEPC — Índice de Experiência Percebida pelo Cliente:**
| Dimensão | Nome | Peso |
|---|---|---|
| E1 | Resolução Percebida | 30 pts |
| E2 | Compreensão e Segurança | 20 pts |
| E3 | Esforço do Cliente | 20 pts |
| E4 | Tempo e Fluidez | 15 pts |
| E5 | Experiência Relacional | 15 pts |
| **TOTAL** | | **100 pts** |

---

*Documento gerado em 17/06/2026 a partir de análise completa do código-fonte, banco de dados Supabase e documentação existente do QualiVisão.*  
*Versão da aplicação documentada: 0.5.1+ (pós-migrações de 12/06/2026)*  
*Para atualizar este documento, execute nova análise do repositório e banco de dados.*
