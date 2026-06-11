# QUALIVISÃO — MASTER CONTEXT DOCUMENT V3

> **Versão:** 3.0  
> **Data de Geração:** 29/05/2026  
> **Classificação:** Documento Interno — Uso Restrito  
> **Responsável Técnico:** Área de Qualidade — Zetti Tech  
> **Finalidade:** Governança Técnica · Continuidade do Desenvolvimento · Auditoria ISO 9001 · Blueprint do Produto  
> **URL de Produção:** https://qualivisao.tec.br  
> **Versão da Aplicação:** 0.5.1-20260527173055

---

## SUMÁRIO

1. [Visão Geral e Stack Tecnológica](#1-visão-geral-e-stack-tecnológica)
2. [Estrutura Completa de Páginas e Rotas](#2-estrutura-completa-de-páginas-e-rotas)
3. [Fluxo Operacional do Sistema](#3-fluxo-operacional-do-sistema)
4. [Estrutura dos Ciclos](#4-estrutura-dos-ciclos)
5. [Estrutura QA — Qualidade do Atendimento](#5-estrutura-qa--qualidade-do-atendimento)
6. [Estrutura IEPC — Índice de Experiência Percebida pelo Cliente](#6-estrutura-iepc--índice-de-experiência-percebida-pelo-cliente)
7. [Estrutura NC — Não Conformidades](#7-estrutura-nc--não-conformidades)
8. [Estrutura Feedback](#8-estrutura-feedback)
9. [Estrutura PDI — Plano de Desenvolvimento Individual](#9-estrutura-pdi--plano-de-desenvolvimento-individual)
10. [Estrutura Dashboards](#10-estrutura-dashboards)
11. [Estrutura Analytics](#11-estrutura-analytics)
12. [Estrutura de Permissões e RBAC](#12-estrutura-de-permissões-e-rbac)
13. [Estrutura de Importações](#13-estrutura-de-importações)
14. [Estrutura Supabase — Banco de Dados](#14-estrutura-supabase--banco-de-dados)
15. [Estrutura Storage](#15-estrutura-storage)
16. [Estrutura Auth](#16-estrutura-auth)
17. [Relacionamento entre Módulos](#17-relacionamento-entre-módulos)
18. [Funcionalidades Implementadas](#18-funcionalidades-implementadas)
19. [Funcionalidades Pendentes / Parciais](#19-funcionalidades-pendentes--parciais)
20. [Riscos Técnicos](#20-riscos-técnicos)
21. [Melhorias Futuras Recomendadas](#21-melhorias-futuras-recomendadas)
22. [APIs e Integrações Externas](#22-apis-e-integrações-externas)
23. [Componentes Compartilhados](#23-componentes-compartilhados)
24. [Serviços e Utilitários](#24-serviços-e-utilitários)
25. [Configuração de Ambiente](#25-configuração-de-ambiente)

---

## 1. VISÃO GERAL E STACK TECNOLÓGICA

### 1.1 Identidade da Aplicação

| Campo | Valor |
|---|---|
| **Nome** | QualiVisão |
| **Subtítulo** | People Analytics — Plataforma de Gestão da Qualidade Operacional |
| **URL de Produção** | https://qualivisao.tec.br |
| **URL de Preview** | https://zettiquali9387.builtwithrocket.new |
| **Tipo** | Enterprise SPA com App Router (Next.js 15) |
| **Idioma** | Português Brasileiro (pt-BR) |
| **Empresa** | Zetti Tech |
| **Versão Atual** | 0.5.1-20260527173055 |

### 1.2 Stack Tecnológica Principal

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.x |
| **Linguagem** | TypeScript | ^5.0.0 |
| **Runtime UI** | React | 19.0.3 |
| **Estilização** | Tailwind CSS | 3.4.x |
| **Backend-as-a-Service** | Supabase (PostgreSQL + Auth + Storage + RLS) | 2.x |
| **Hospedagem** | Rocket.new / Netlify | — |

### 1.3 Bibliotecas de Produção

| Categoria | Biblioteca | Finalidade |
|---|---|---|
| **Ícones** | `lucide-react` | Ícones vetoriais em toda a interface |
| **Gráficos** | `recharts ^2.15.2` | Line, Bar, Radar, Pie, Area, Scatter, Composed |
| **Notificações** | `sonner` | Toast notifications (canto inferior direito) |
| **Exportação PDF** | `jspdf` + `jspdf-autotable` | Relatórios em PDF |
| **Exportação Excel** | `xlsx` | Leitura e escrita de planilhas XLS/XLSX |
| **Parsing CSV** | `papaparse` | Importação de arquivos CSV |
| **IA** | `@rocketnew/llm-sdk` | Integração Gemini (chat-completion via API Route) |
| **Analytics** | Google Analytics | Rastreamento via `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| **Tipografia** | `@tailwindcss/typography` | Estilo de texto rico |
| **Fontes** | `DM Sans` + `Playfair Display` | Google Fonts via next/font |

### 1.4 Paleta de Cores e Design System

| Token | Hex | Uso |
|---|---|---|
| Background principal | `#071426` | Fundo global da aplicação |
| Surface | `#0A1628` / `#0F1B31` | Cards e painéis |
| Sidebar | `#060E1E` | Barra lateral |
| Azul primário | `#38BDF8` | Seção EXECUTIVO, destaques |
| Roxo | `#A78BFA` | Seção OPERAÇÃO |
| Verde | `#22C55E` | Seção QUALIDADE, sucesso |
| Laranja | `#FB923C` | Seção DESENVOLVIMENTO HUMANO |
| Cinza | `#94A3B8` | Seção GOVERNANÇA / ADMIN |
| Texto principal | `#FFFFFF` | Títulos |
| Texto secundário | `#94A3B8` | Labels e subtítulos |

---

## 2. ESTRUTURA COMPLETA DE PÁGINAS E ROTAS

### 2.1 Mapa de Rotas

```
/                              → Painel Executivo (HomeExecutiveView)
/evolucao-geral                → Evolução Geral (tendências históricas)
/cycle-dashboard               → Analytics Avançado (CycleDashboard)
/ciclo-atual                   → Ciclo Atual (operação em tempo real)
/ciclos                        → Gestão de Ciclos (abertura/fechamento)
/auditoria                     → Central de Auditoria Operacional
/suporte                       → Organograma / Suporte
/qa-iepc                       → QA & IEPC 360° (análise detalhada)
/nao-conformidades             → Não Conformidades (NC-1 a NC-5)
/mural-elogios                 → Mural de Elogios (ranking + mural)
/feedback                      → Lista de Feedbacks
/feedback/[id]                 → Detalhe do Feedback (view completo)
/feedback/public/[token]       → Feedback Público (sem login, via token)
/feedback/manual               → Criação Manual de Feedback
/feedback/import               → Importação de Feedbacks (JSON)
/feedback/historico            → Histórico de Feedbacks por Analista
/feedback/pdi                  → PDI vinculado ao Feedback
/feedback/people-analytics     → People Analytics (médias por equipe)
/pdis                          → Central de PDI (todos os planos)
/gestao                        → Gestão de Pessoas (perfis + evolução)
/advertencias                  → Advertências (registro disciplinar)
/analistas                     → Cadastro de Analistas
/documentos                    → Repositório de Documentos ISO
/historico                     → Histórico de Ciclos (manual)
/importacoes                   → Central de Importações
/configuracoes                 → Configurações (usuários, cargos, permissões)
/calibragem                    → Calibragem de Scores
/admin-diagnostico             → Logs & Diagnóstico (admin only)
/admin-config                  → Redirect → /configuracoes
/sign-up-login                 → Login (Supabase Auth)
/auth/callback                 → Callback OAuth
/privacidade                   → Política de Privacidade
/termos                        → Termos de Uso
```

### 2.2 API Routes (Next.js)

```
POST /api/receber-avaliacao         → Recebe payload completo de avaliação (integração Lovable/externa)
POST /api/feedbacks/import          → Importação de feedbacks via JSON (autenticado por token)
POST /api/ai/chat-completion        → Chat com IA (Gemini via @rocketnew/llm-sdk)
POST /api/admin/sync-auth-users     → Sincroniza usuários do Supabase Auth com user_profiles
```

### 2.3 Seções da Sidebar

| Seção | Cor | Rotas |
|---|---|---|
| EXECUTIVO | `#38BDF8` | `/`, `/evolucao-geral`, `/cycle-dashboard` |
| OPERAÇÃO | `#A78BFA` | `/ciclo-atual`, `/ciclos`, `/auditoria`, `/suporte` |
| QUALIDADE | `#22C55E` | `/qa-iepc`, `/nao-conformidades`, `/mural-elogios` |
| DESENVOLVIMENTO HUMANO | `#FB923C` | `/feedback`, `/feedback/pdi`, `/gestao`, `/advertencias` |
| GOVERNANÇA | `#94A3B8` | `/documentos`, `/historico` |
| ADMIN | `#64748B` | `/configuracoes`, `/analistas`, `/importacoes`, `/admin-diagnostico` |

---

## 3. FLUXO OPERACIONAL DO SISTEMA

### 3.1 Fluxo Principal de um Ciclo

```
1. ABERTURA DO CICLO
   └─ Admin define ciclo ativo em app_settings (key: active_cycle)
   └─ Ciclo aparece em /ciclo-atual mesmo sem dados

2. IMPORTAÇÃO DE DADOS
   └─ Via /importacoes → ImportModal
       ├─ Modo: Ciclo Completo (scores + NCs + elogios em lote)
       └─ Modo: Por Andamento (arquivos separados)
   └─ Via API POST /api/receber-avaliacao (integração externa Lovable)
   └─ Via entrada manual em /importacoes (formulário individual)

3. PROCESSAMENTO
   └─ supabaseDataService.importCycleDataToSupabase()
       ├─ Verifica se ciclo está fechado (bloqueia se sim)
       ├─ Upsert em import_cycles
       ├─ Upsert em cycle_scores (por analista/período)
       ├─ Upsert em nc_records
       └─ Upsert em elogios

4. VISUALIZAÇÃO
   └─ /ciclo-atual → KPIs em tempo real do ciclo ativo
   └─ / (Painel Executivo) → consolidação geral
   └─ /auditoria → central operacional com status por analista
   └─ /qa-iepc → análise detalhada por pilar

5. FEEDBACK
   └─ Gerado automaticamente via API /api/feedbacks/import
   └─ Ou criado manualmente em /feedback/manual
   └─ Status: Gerado → Enviado → Lido → Validado → Fechado
   └─ Link público gerado via public_token (sem login)

6. PDI
   └─ Criado dentro do feedback (snapshot_json_completo.pdi_objetivos)
   └─ Ou criado manualmente em /pdis
   └─ autoCreatePDIFromFeedback() sincroniza para pdi_records

7. FECHAMENTO DO CICLO
   └─ /ciclos → botão "Fechar Ciclo"
   └─ Registra em cycle_closure_history
   └─ Marca import_cycles.is_closed = true
   └─ Bloqueia novas importações para o período
   └─ Todos feedbacks do ciclo → status "fechado" (automático)
```

### 3.2 Fluxo de Autenticação

```
1. Usuário acessa qualquer rota protegida
2. RouteGuard verifica SystemAuthContext
3. Se não autenticado → exibe SystemLoginScreen
4. Login via Supabase Auth (email/password) OU sistema local (localStorage)
5. Verificação de whitelist (pre_registered_users ou ADMIN_EMAILS)
6. Carregamento de perfil (user_profiles + cargos + user_permissions)
7. Cache de perfil em sessionStorage (TTL: 5 min)
8. Inatividade > 30 min → logout automático
```

### 3.3 Fluxo de Importação via API Externa

```
POST /api/receber-avaliacao
  Headers: Authorization: Bearer {INTEGRATION_API_TOKEN}
  Body: Payload completo (analista, ciclo, scores, pilares, atendimentos, coaching, PDI, histórico)
  
  Processamento:
  1. Valida token de autenticação
  2. Normaliza payload (suporta formato novo e legado)
  3. Busca/cria analista em public.analistas
  4. Upsert em cycle_scores (por período)
  5. Upsert em nc_records
  6. Upsert em elogios
  7. Upsert em feedbacks (idempotência via external_id)
  8. Upsert em feedback_atendimentos
  9. Upsert em feedback_historico
  10. Cria PDI se payload contém bloco pdi
  11. Retorna { success, feedback_id, analista_id }
```

---

## 4. ESTRUTURA DOS CICLOS

### 4.1 Modelo de Dados

```
import_cycles
├─ id (UUID)
├─ periodo (TEXT) — formato "MM/YYYY" ex: "04/2026"
├─ file_name (TEXT)
├─ record_count (INTEGER)
├─ is_current (BOOLEAN)
├─ is_closed (BOOLEAN)
├─ status (TEXT) — 'aberto' | 'em_andamento' | 'fechado' | 'reaberto'
├─ import_status (TEXT) — 'completed' | 'partial' | 'error'
├─ data_type (TEXT) — 'mixed' | 'scores' | 'ncs' | 'elogios'
├─ closed_at (TIMESTAMPTZ)
├─ closed_by_email (TEXT)
├─ reopened_at (TIMESTAMPTZ)
├─ reopened_by_email (TEXT)
├─ closure_notes (TEXT)
└─ imported_at (TIMESTAMPTZ)
```

### 4.2 Estados do Ciclo

| Status | Descrição | Ações Permitidas |
|---|---|---|
| `aberto` | Ciclo criado, sem dados | Importar, editar |
| `em_andamento` | Dados importados, ciclo ativo | Importar, editar, visualizar |
| `fechado` | Ciclo encerrado | Somente visualizar (admin pode reabrir) |
| `reaberto` | Reaberto por admin após fechamento | Importar, editar |

### 4.3 Ciclo Ativo

- Definido em `app_settings` (key: `active_cycle`, value: "MM/YYYY")
- Lido por `getActiveCycle()` em `supabaseDataService.ts`
- Exibido em `/ciclo-atual` como ciclo padrão
- Se vazio → usa o período mais recente com dados

### 4.4 Histórico de Fechamento

```
cycle_closure_history
├─ id (UUID)
├─ cycle_id (FK → import_cycles)
├─ periodo (TEXT)
├─ action ('fechado' | 'reaberto' | 'editado')
├─ actor_email (TEXT)
├─ actor_name (TEXT)
├─ notes (TEXT)
└─ created_at (TIMESTAMPTZ)
```

---

## 5. ESTRUTURA QA — QUALIDADE DO ATENDIMENTO

### 5.1 Matriz de Pilares QA

| Pilar | Nome Completo | Peso Máximo | Cor |
|---|---|---|---|
| P1 | Gestão do Fluxo e Rastreabilidade do Atendimento | 22 pts | `#3B82F6` |
| P2 | Gestão da Tratativa da Demanda | 34 pts | `#06B6D4` |
| P3 | Análise e Assertividade Técnica da Demanda | 18 pts | `#10B981` |
| P4 | Qualidade da Comunicação no Atendimento | 14 pts | `#F59E0B` |
| P5 | Conduta Relacional no Atendimento | 12 pts | `#8B5CF6` |
| **TOTAL** | | **100 pts** | |

### 5.2 Subpilares QA

**P1 — Fluxo (22 pts)**
- 1.1 Identificação e Boas-vindas (5 pts)
- 1.2 Formalização e comunicação do protocolo SUP (9 pts)
- 1.3 Encerramento da interação por etapa (8 pts)

**P2 — Tratativa (34 pts)**
- 2.1 Validação e esclarecimento de dúvidas (8 pts)
- 2.2 Orientação e condução da execução (9 pts)
- 2.3 Resolução ou direcionamento adequado (9 pts)
- 2.4 Documentação técnica do atendimento (8 pts)

**P3 — Análise (18 pts)**
- 3.1 Análise técnica da demanda
- 3.2 Uso adequado das ferramentas de apoio

**P4 — Comunicação (14 pts)**
- 4.1 Uso da língua portuguesa
- 4.2 Tom profissional e clareza

**P5 — Conduta (12 pts)**
- 5.1 Cordialidade e empatia
- 5.2 Proatividade e over delivery

### 5.3 Classificação de Performance QA

| Faixa | Classificação | Cor |
|---|---|---|
| ≥ 90 | Excelência Operacional | `#10B981` |
| 80–89 | Performance Esperada | `#FACC15` |
| 70–79 | Operacional | `#F59E0B` |
| < 70 | Crítico | `#EF4444` |

### 5.4 Armazenamento

- Tabela: `cycle_scores` (campos p1, p2, p3, p4, p5, nota_final_qa)
- Tabela: `feedbacks` (pilares_qa JSONB — array de {nome, pontuacao, max, variacao})
- Tabela: `feedback_atendimentos` (nota_qa por atendimento individual)

---

## 6. ESTRUTURA IEPC — ÍNDICE DE EXPERIÊNCIA PERCEBIDA PELO CLIENTE

### 6.1 Matriz de Dimensões IEPC

| Dimensão | Nome Completo | Peso Máximo | Cor |
|---|---|---|---|
| E1 | Resolução Percebida | 30 pts | `#38BDF8` |
| E2 | Compreensão e Segurança (Clareza/Confiança) | 20 pts | `#A855F7` |
| E3 | Esforço do Cliente | 20 pts | `#10B981` |
| E4 | Tempo e Fluidez | 15 pts | `#F59E0B` |
| E5 | Experiência Relacional | 15 pts | `#F97316` |
| **TOTAL** | | **100 pts** | |

### 6.2 Armazenamento

- Tabela: `cycle_scores` (campos e1, e2, e3, e4, e5, iepc_total)
- Tabela: `feedbacks` (pilares_iepc JSONB — array de {nome, pontuacao, max, variacao})

### 6.3 Visualização

- `/qa-iepc` → análise 360° com RadarChart, BarChart, ScatterChart, AreaChart
- Filtros: período, squad, analista, coordenador
- Drilldown por pilar e por analista
- Comparação entre analistas (modal)
- Exportação CSV e PDF

---

## 7. ESTRUTURA NC — NÃO CONFORMIDADES

### 7.1 Tipos de NC

| Código | Nome Completo | Criticidade | Cor |
|---|---|---|---|
| NC-1 | Postura e Ética Profissional | Alta | `#7C3AED` |
| NC-2 | Acuracidade e Rigor Técnico | Alta | `#EF4444` |
| NC-3 | Registro e Rastreabilidade | Média | `#F59E0B` |
| NC-4 | Integridade do Fluxo Operacional | Alta | `#38BDF8` |
| NC-5 | Segurança da Informação | Crítica | `#22C55E` |

### 7.2 Modelo de Dados

```
nc_records
├─ id (UUID)
├─ cycle_id (FK → import_cycles)
├─ periodo (TEXT)
├─ analista (TEXT)
├─ squad (TEXT)
├─ coordenador (TEXT)
├─ auditor (TEXT)
├─ tipo_nc (TEXT) — NC-1 a NC-5
├─ descricao (TEXT)
├─ pontos_deduzidos (NUMERIC) — padrão: -20
├─ protocolo_referencia (TEXT)
├─ avaliacao_id (TEXT)
└─ created_at (TIMESTAMPTZ)
```

### 7.3 Funcionalidades na Tela /nao-conformidades

- KPIs: total NCs, analistas com NC, pontos deduzidos, NC mais frequente
- Gráficos: BarChart por tipo, RadarChart por squad, PieChart distribuição, AreaChart evolução
- Tabela com filtros (período, squad, tipo, analista)
- Modal de detalhe por NC
- Importação via ImportModal
- Mapeamento de nomes legados para códigos NC-1 a NC-5

---

## 8. ESTRUTURA FEEDBACK

### 8.1 Modelo de Dados Principal

```
feedbacks
├─ id (UUID)
├─ analista_id (FK → analistas)
├─ ciclo (TEXT) — "MM/YYYY"
├─ periodo_inicio / periodo_fim (DATE)
├─ coordenador (TEXT)
├─ equipe (TEXT)
├─ auditor (TEXT)
├─ qa_score (NUMERIC)
├─ iepc_score (NUMERIC)
├─ aderencia_score (NUMERIC)
├─ posicao_squad (INTEGER)
├─ total_squad (INTEGER)
├─ ciclos_consecutivos_evolucao (INTEGER)
├─ pilares_qa (JSONB) — [{nome, pontuacao, max, variacao, observacao}]
├─ pilares_iepc (JSONB) — [{nome, pontuacao, max, variacao}]
├─ pontos_fortes (JSONB) — [{titulo, descricao}]
├─ oportunidades (JSONB) — [{titulo, descricao}]
├─ resumo_ciclo (TEXT)
├─ tendencias (JSONB)
├─ conquistas (JSONB)
├─ status (TEXT) — ver 8.2
├─ version (INTEGER)
├─ origem (TEXT) — 'api_lovable' | 'importacao_json' | 'manual'
├─ external_id (TEXT) — idempotência para API
├─ snapshot_json_completo (JSONB) — payload completo original
├─ public_token (UUID) — token para link público
├─ public_enabled (BOOLEAN) — habilita acesso público
├─ evolucao_tecnica (TEXT)
├─ evolucao_comportamental (TEXT)
├─ atencao_evolutiva (TEXT)
└─ created_at / updated_at (TIMESTAMPTZ)
```

### 8.2 Status do Feedback

| Status | Descrição | Cor |
|---|---|---|
| `gerado` / `generated` | Feedback criado | Azul `#60A5FA` |
| `enviado` / `sent` | Enviado ao analista | Roxo `#A78BFA` |
| `lido` | Analista visualizou | Ciano `#22D3EE` |
| `validado` | Validado pelo coordenador | Âmbar `#FBBF24` |
| `fechado` | Ciclo encerrado (automático) | Cinza `#94A3B8` |
| `draft` | Rascunho | Cinza escuro |
| `reviewed` | Revisado | Amarelo |
| `approved` | Aprovado | Verde |

### 8.3 Tabelas Relacionadas ao Feedback

```
feedback_atendimentos
├─ id, feedback_id (FK)
├─ protocolo, sup, cliente, assunto
├─ nota_qa, nota_iepc
├─ classificacao ('excelente' | 'bom' | 'regular' | 'critico')
├─ observacao, link_gravacao
├─ solucao, sintese, duracao
├─ ncs (JSONB), criterios_raw (JSONB)
└─ created_at

feedback_pdi (legado — substituído por pdi_records)
├─ id, feedback_id (FK), analista_id (FK)
├─ objetivo, acao_desenvolvimento
├─ prazo (DATE), progresso (0-100)
├─ status ('pendente' | 'em_andamento' | 'concluido' | 'cancelado')
├─ historico_acompanhamento (JSONB)
└─ created_at

feedback_historico
├─ id, analista_id (FK)
├─ ciclo (TEXT)
├─ qa_score, iepc_score
└─ created_at
UNIQUE(analista_id, ciclo)
```

### 8.4 Funcionalidades da Tela /feedback

- Lista com filtros: status, equipe, ciclo, busca por nome
- Ordenação: nome, ciclo, score QA, data (asc/desc)
- Inline status changer (dropdown por linha)
- Seleção múltipla para ações em lote
- Botão "Atualizar" sem F5
- KPI cards: total feedbacks, IEPC médio, NCs, elogios

### 8.5 Funcionalidades da Tela /feedback/[id]

- View completo do feedback com todos os blocos
- Gráficos: LineChart histórico, RadarChart pilares
- Bloco PDI com objetivos (checklist)
- Geração de link público (public_token)
- Exportação PDF
- Botão "Voltar" (router.back())
- Botão "Atualizar" (refresh sem F5)
- Mensagem motivacional baseada nos scores

### 8.6 Feedback Público /feedback/public/[token]

- Acesso sem login via UUID token
- Controlado por `public_token` + `public_enabled = true`
- View idêntico ao detalhe interno, sem ações administrativas
- Exibe: scores, pilares, pontos fortes, oportunidades, PDI, histórico

---

## 9. ESTRUTURA PDI — PLANO DE DESENVOLVIMENTO INDIVIDUAL

### 9.1 Modelo de Dados

```
pdi_records
├─ id (UUID)
├─ feedback_id (FK → feedbacks) — se originado de feedback
├─ analista_id (FK → analistas)
├─ analista (TEXT)
├─ squad (TEXT)
├─ coordenador (TEXT)
├─ periodo (TEXT)
├─ status_pdi (TEXT) — ver 9.2
├─ progresso (INTEGER 0-100)
├─ prazo (DATE)
├─ proxima_revisao_date (DATE)
├─ data_acompanhamento (DATE)
├─ mensagem_evolutiva (TEXT)
├─ comentario_coordenador (TEXT)
├─ comentario_analista (TEXT)
├─ objetivo_desenvolvimento (TEXT)
├─ acao_desenvolvimento (TEXT)
├─ resultado_esperado (TEXT)
├─ aderencia_score (NUMERIC)
├─ total_ncs (INTEGER)
├─ total_elogios (INTEGER)
├─ attachments (JSONB) — [{name, url, type, size, uploadedAt}]
└─ created_at / updated_at (TIMESTAMPTZ)

pdi_objectives (checklist por PDI)
├─ id (UUID)
├─ pdi_id (FK → pdi_records)
├─ descricao (TEXT)
├─ categoria (TEXT)
├─ peso (INTEGER)
├─ status ('cumprido' | 'parcial' | 'nao_cumprido')
├─ observacao_coordenador (TEXT)
└─ data_atualizacao (TIMESTAMPTZ)

pdi_timeline (linha do tempo evolutiva)
├─ id (UUID)
├─ pdi_id (FK → pdi_records)
├─ data_evento (DATE)
├─ titulo (TEXT)
├─ descricao (TEXT)
├─ tipo ('criacao' | 'atualizacao' | 'melhoria' | 'validacao' | 'conclusao' | 'evento')
└─ created_at (TIMESTAMPTZ)
```

### 9.2 Status do PDI

| Status | Cor |
|---|---|
| `aguardando alinhamento` | Cinza `#94A3B8` |
| `em evolucao` | Azul `#38BDF8` |
| `em acompanhamento` | Roxo `#A78BFA` |
| `em validacao` | Âmbar `#F59E0B` |
| `consolidado` | Teal `#2DD4BF` |
| `evolucao concluida` | Verde `#22C55E` |
| `reincidente` | Vermelho `#EF4444` |

### 9.3 Integração PDI ↔ Feedback

- `autoCreatePDIFromFeedback()` em `dataService.ts` verifica se feedback tem `pdi_objetivos` em `snapshot_json_completo`
- Se não existe `pdi_records` para o feedback → cria registro sintético
- PDIs criados manualmente em `/pdis` também alimentam a central
- Central `/pdis` exibe todos os PDIs (de feedback + manuais)

### 9.4 Funcionalidades da Tela /pdis

- Filtros: período, squad, analista, status
- Criação manual com formulário completo
- Edição inline de status e progresso
- Checklist de objetivos (pdi_objectives)
- Timeline evolutiva (pdi_timeline)
- Upload de anexos (Supabase Storage)
- Cálculo automático de progresso baseado nos objetivos

---

## 10. ESTRUTURA DASHBOARDS

### 10.1 Painel Executivo (/)

**Componente:** `HomeExecutiveView.tsx`

**KPIs exibidos:**
- QA Médio do ciclo selecionado
- IEPC Médio
- Total de Analistas avaliados
- Total de NCs
- Total de Elogios
- Analistas em risco (QA < 70)
- Analistas em destaque (QA ≥ 90)

**Gráficos:**
- LineChart: evolução QA/IEPC por período
- PieChart: distribuição por classificação de performance
- RadarChart: pilares QA médios
- BarChart: ranking de squads

**Filtros:**
- Período (ciclo)
- Squad (com opção "Todos" — consolida todos os squads)
- Analista

**Drilldown:**
- Clique em analista → DrilldownPanel lateral com histórico completo

### 10.2 Analytics Avançado (/cycle-dashboard)

**Componente:** `CycleDashboard.tsx` + subcomponentes

**Subcomponentes:**
- `CycleKPICards` — cards de KPIs do ciclo
- `CycleFilters` — filtros de período, squad, analista, modo de visualização
- `SquadRankingChart` — ranking de squads
- `PillarMatrix` — matriz de pilares por analista
- `AnalystDrilldown` — detalhamento por analista
- `PillarDrilldownModal` — modal de drilldown por pilar
- `ExecutiveInsights` — insights automáticos
- `CompareAnalystsModal` — comparação entre analistas
- `NonConformitiesGuide` — guia de NCs
- `AnalystRadarChart` — radar individual

**Modos de visualização:**
- `overview` — visão geral
- `squad` — por squad
- `analyst` — por analista
- `pillar` — por pilar

### 10.3 Ciclo Atual (/ciclo-atual)

**Funcionalidades:**
- Polling automático (atualização periódica)
- Comparação com ciclo anterior
- Ranking de analistas em tempo real
- Gráfico de distribuição de scores
- Filtro por período (inclui ciclo ativo sem dados)

### 10.4 Auditoria (/auditoria)

**Central Operacional do Ciclo:**

**KPI Cards (8):**
1. Analistas avaliados
2. Avaliações realizadas
3. Atendimentos auditados
4. Em andamento
5. Pendentes
6. NCs registradas
7. Elogios registrados
8. QA médio

**Tabela Operacional:**
- Analista, Squad, Avaliações, QA médio, IEPC médio, NCs, Elogios, Status, Última atualização
- Status automático: Pendente (0 avaliações) / Em Andamento (1-2) / Concluído (3+)
- Filtros: squad, status
- Ordenação por qualquer coluna

**Atualização automática:** dados vêm de `fetchCycleScores`, `fetchNCRecords`, `fetchElogios` — sem preenchimento manual.

---

## 11. ESTRUTURA ANALYTICS

### 11.1 Evolução Geral (/evolucao-geral)

- Tendências históricas multi-período
- Heatmap de performance por analista/período
- Gráfico de evolução de NCs por tipo
- Comparação entre squads ao longo do tempo
- Entradas manuais para períodos sem dados importados

### 11.2 QA & IEPC 360° (/qa-iepc)

- Análise completa com múltiplos tipos de gráfico
- RadarChart por analista (todos os pilares)
- ScatterChart QA vs IEPC (posicionamento)
- AreaChart evolução temporal
- ComposedChart comparativo
- Filtros avançados: período, squad, analista, coordenador
- Subpilares detalhados (1.1, 1.2, 1.3, 2.1, etc.)

### 11.3 People Analytics (/feedback/people-analytics)

- Top performers por QA
- Médias por equipe (QA e IEPC)
- Média global
- Total de feedbacks por equipe
- Filtro por equipe

### 11.4 KPIs e Métricas Calculadas

| KPI | Fórmula | Fonte |
|---|---|---|
| QA Médio | Média de `nota_final_qa` | `cycle_scores` |
| IEPC Médio | Média de `iepc_total` | `cycle_scores` |
| Aderência | Campo `aderencia_score` | `feedbacks` |
| Posição Squad | `posicao_squad` / `total_squad` | `feedbacks` |
| Progresso PDI | Média ponderada dos objetivos | `pdi_objectives` |
| Risco Operacional | QA < 70 → crítico | Calculado |
| Reincidência NC | Contagem de NCs por analista | `nc_records` |

---

## 12. ESTRUTURA DE PERMISSÕES E RBAC

### 12.1 Papéis do Sistema (UserRole)

| Role | Nível de Acesso |
|---|---|
| `Admin` / `Administrador` | Acesso total a todos os módulos |
| `Coordenador Geral` | Acesso amplo, múltiplos squads |
| `Coordenador` | Acesso ao próprio squad |
| `Coordenadora Qualidade` | Acesso à qualidade |
| `Gestor` / `Gerente` / `Diretoria` | Leitura ampla (read-only broad) |
| `Auditor` | Acesso a auditoria e qualidade |
| `QA` | Acesso a módulos de qualidade |
| `Analista` | Acesso restrito ao próprio perfil |
| `Visualizador` | Somente leitura |
| `Supervisor` | Acesso intermediário |

### 12.2 Permissões por Módulo (user_permissions)

| Permissão | Descrição |
|---|---|
| `can_view` | Visualizar o módulo |
| `can_edit` | Editar registros |
| `can_delete` | Excluir registros |
| `can_import` | Importar dados |
| `can_export` | Exportar relatórios |
| `can_generate_link` | Gerar link público |
| `can_present` | Modo apresentação |
| `can_close_cycle` | Fechar ciclo |
| `can_reopen_cycle` | Reabrir ciclo |
| `can_approve` | Aprovar feedbacks |
| `can_admin` | Administrar módulo |

### 12.3 Módulos Configuráveis

```
painel_executivo, evolucao, analytics, ciclo_atual, ciclos,
auditoria, importacoes, nao_conformidades, elogios, pdis,
calibragem, historico, logs, documentos_iso, gestao,
configuracoes, analistas, feedback
```

### 12.4 Escopo de Visibilidade (user_scope_permissions)

```
user_scope_permissions
├─ user_id (FK → user_profiles)
├─ escopo_tipo ('all' | 'squad' | 'analistas' | 'proprio')
├─ squads_visiveis (TEXT[])
├─ squads_editaveis (TEXT[])
└─ squads_gerenciaveis (TEXT[])
```

### 12.5 Tabelas de Suporte RBAC

```
cargos
├─ id, nome, descricao, cor
├─ is_active, is_admin_master
└─ created_at

permission_modules
├─ id, nome, label, descricao
└─ sort_order

permission_logs
├─ id, actor_email, target_email
├─ action, entity_type
├─ old_value (JSONB), new_value (JSONB)
└─ created_at
```

### 12.6 Emails Admin Hardcoded (bypass whitelist)

```typescript
const ADMIN_EMAILS = [
  'brunaramos1807@gmail.com',
  'bruna.silva@zetti.tech',
  'admin@zetti.com.br'
];
```

### 12.7 Whitelist de Usuários

- Tabela: `pre_registered_users`
- Campos: email, role, squad, squads, cargo_id, full_name, is_active
- Verificada no login via Supabase Auth
- Admin emails sempre permitidos (bypass)

### 12.8 Cache de Permissões

- Armazenado em `sessionStorage`
- Chaves: `zetti_user_profile_cache_v2_{userId}`, `zetti_user_perms_cache_v2_{userId}`
- TTL: 5 minutos
- Limpo no logout

---

## 13. ESTRUTURA DE IMPORTAÇÕES

### 13.1 Modos de Importação

| Modo | Descrição |
|---|---|
| Ciclo Completo | Upload de 3 arquivos simultâneos (scores + NCs + elogios) |
| Por Andamento | Upload individual por tipo de arquivo |
| Manual | Formulário de entrada manual por analista |
| Retroativo | Import via JSON estruturado |
| API Externa | POST /api/receber-avaliacao (integração Lovable) |
| API Feedbacks | POST /api/feedbacks/import (JSON com token) |

### 13.2 Formato dos Arquivos CSV/XLSX

**Arquivo de Scores (obrigatório):**
- Colunas obrigatórias: `Analista`, `Squad`, `Nota Final QA (0-100)`, `IEPC - Índice de Experiência Percebida pelo Cliente (0-100)`
- Colunas opcionais: `Período`, `Data do Registro`, `Auditor`, `Total de Não Conformidades`, `Pontos Deduzidos por NC`, P1-P5, E1-E5

**Arquivo de NCs:**
- Colunas obrigatórias: `Analista`, `Squad`
- Colunas opcionais: `Período`, `Coordenador`, `Auditor`, `Tipo NC`, `Descrição`, `Protocolo Referência`

**Arquivo de Elogios:**
- Colunas obrigatórias: `Colaborador`, `Elogio`
- Colunas opcionais: `SQUAD`, `CLIENTE`, `PROTOCOLO`, `Período`

### 13.3 Validação na Importação

1. Verificação de colunas obrigatórias
2. Verificação de ciclo fechado (bloqueia se fechado)
3. Descarte de linhas inválidas com log de motivo
4. Preview de validação antes de confirmar
5. Resumo: total rows, QA médio, IEPC médio, total NCs, total elogios

### 13.4 Log de Importação

```
import_logs
├─ id (UUID)
├─ periodo (TEXT)
├─ file_name (TEXT)
├─ step (TEXT) — 'start' | 'cycle_check' | 'scores' | 'ncs' | 'elogios' | 'done'
├─ level ('info' | 'warn' | 'error' | 'success')
├─ message (TEXT)
├─ details (JSONB)
├─ cycle_id (FK → import_cycles)
├─ rows_affected (INTEGER)
├─ actor_email (TEXT)
└─ created_at (TIMESTAMPTZ)
```

### 13.5 Squads Configurados

```
PDV
PDV N1
Compras e Estoque
Financeiro Fiscal
```

---

## 14. ESTRUTURA SUPABASE — BANCO DE DADOS

### 14.1 Tabelas Principais

#### Tabelas de Usuários e Autenticação

| Tabela | Descrição |
|---|---|
| `user_profiles` | Perfis dos usuários autenticados (espelha auth.users) |
| `pre_registered_users` | Whitelist de emails autorizados |
| `cargos` | Cargos configuráveis com flags de admin |
| `user_permissions` | Permissões por usuário por módulo |
| `user_scope_permissions` | Escopo de visibilidade por usuário |
| `permission_modules` | Módulos configuráveis do sistema |
| `permission_logs` | Auditoria de alterações de permissão |

#### Tabelas de Ciclos e Scores

| Tabela | Descrição |
|---|---|
| `import_cycles` | Ciclos importados com status e metadados |
| `cycle_scores` | Scores QA/IEPC por analista por período |
| `nc_records` | Registros de não conformidades |
| `elogios` | Registros de elogios |
| `manual_evaluations` | Avaliações inseridas manualmente |
| `cycle_summaries` | Resumos consolidados por período |
| `cycle_closure_history` | Histórico de fechamento/reabertura |
| `strategic_indicators` | Indicadores estratégicos calculados |
| `import_logs` | Logs detalhados de importação |

#### Tabelas de Analistas

| Tabela | Descrição |
|---|---|
| `analistas` | Perfis operacionais dos analistas (sem login) |
| `analyst_profiles` | Perfis estendidos (legado) |
| `squads` | Squads com coordenador |

#### Tabelas de Feedback e PDI

| Tabela | Descrição |
|---|---|
| `feedbacks` | Feedbacks completos por analista/ciclo |
| `feedback_atendimentos` | Atendimentos individuais do feedback |
| `feedback_pdi` | PDI legado vinculado ao feedback |
| `feedback_historico` | Histórico de scores por analista/ciclo |
| `pdi_records` | PDIs enterprise (central) |
| `pdi_objectives` | Objetivos/checklist do PDI |
| `pdi_timeline` | Timeline evolutiva do PDI |

#### Tabelas de Governança

| Tabela | Descrição |
|---|---|
| `documents` | Repositório de documentos ISO |
| `audit_logs` | Logs de auditoria de ações |
| `admin_logs` | Logs administrativos do sistema |
| `advertencias` | Registros disciplinares |
| `app_settings` | Configurações globais (ciclo ativo, org chart) |

### 14.2 Relacionamentos Principais

```
auth.users
  └─ user_profiles (1:1, via id)
       ├─ user_permissions (1:N)
       ├─ user_scope_permissions (1:1)
       └─ cargos (N:1, via cargo_id)

import_cycles (1:N)
  ├─ cycle_scores
  ├─ nc_records
  ├─ elogios
  ├─ manual_evaluations
  └─ cycle_closure_history

analistas (1:N)
  ├─ feedbacks
  ├─ feedback_pdi
  ├─ feedback_historico
  └─ pdi_records

feedbacks (1:N)
  ├─ feedback_atendimentos
  └─ pdi_records (via feedback_id)

pdi_records (1:N)
  ├─ pdi_objectives
  └─ pdi_timeline
```

### 14.3 Índices Criados

```sql
idx_cycle_scores_periodo       ON cycle_scores(periodo)
idx_cycle_scores_analista      ON cycle_scores(analista)
idx_cycle_scores_squad         ON cycle_scores(squad)
idx_nc_records_periodo         ON nc_records(periodo)
idx_nc_records_analista        ON nc_records(analista)
idx_elogios_periodo            ON elogios(periodo)
idx_elogios_colaborador        ON elogios(colaborador)
idx_user_profiles_email        ON user_profiles(email)
idx_feedbacks_external_id      ON feedbacks(external_id) WHERE external_id IS NOT NULL
idx_feedbacks_analista_id      ON feedbacks(analista_id)
idx_feedbacks_ciclo            ON feedbacks(ciclo)
idx_feedbacks_status           ON feedbacks(status)
feedbacks_public_token_idx     ON feedbacks(public_token) WHERE public_token IS NOT NULL
```

### 14.4 Funções e Triggers

```sql
handle_new_user()              → Trigger: cria user_profiles ao criar auth.users
get_my_role()                  → Retorna role do usuário atual (SECURITY DEFINER)
```

### 14.5 Políticas RLS (Row Level Security)

**Estratégia geral:** Todas as tabelas operacionais têm RLS habilitado com políticas permissivas para `anon` (leitura) e `authenticated` (escrita). Controle de acesso real é feito na camada de aplicação (RBAC).

**Padrão das políticas:**
```sql
-- Leitura pública (anon)
CREATE POLICY "anon_read_X" ON X FOR SELECT TO anon USING (true);

-- Escrita autenticada
CREATE POLICY "auth_all_X" ON X FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Escrita anon (para API sem auth)
CREATE POLICY "anon_all_X" ON X FOR ALL TO anon USING (true) WITH CHECK (true);
```

**Exceção — feedbacks públicos:**
```sql
CREATE POLICY "Public read via token" ON feedbacks
  FOR SELECT TO anon
  USING (public_token IS NOT NULL AND public_enabled = TRUE);
```

---

## 15. ESTRUTURA STORAGE

### 15.1 Buckets Configurados

| Bucket | Finalidade | Acesso |
|---|---|---|
| `analistas-avatar` | Fotos de perfil dos analistas | Público (leitura) |
| `documents` | Documentos ISO e normas | Autenticado |
| `pdi-attachments` | Anexos dos PDIs | Autenticado |

### 15.2 Upload de Avatar

- Tela: `/configuracoes` → aba Usuários → botão Camera por usuário
- Bucket: `analistas-avatar`
- Path: `{userId}/avatar.{ext}`
- Após upload: atualiza `user_profiles.avatar_url`
- Fallback: iniciais do nome quando sem foto

### 15.3 Upload de Documentos

- Tela: `/documentos`
- Bucket: `documents`
- Metadados salvos em tabela `documents`
- Categorias: manual-qa, manual-iepc, avaliacao, feedback, normas, procedimentos, treinamentos, iso, geral

---

## 16. ESTRUTURA AUTH

### 16.1 Dupla Camada de Autenticação

O sistema possui **duas camadas** de autenticação que coexistem:

**Camada 1 — Supabase Auth (AuthContext)**
- Provider: `AuthProvider` em `src/contexts/AuthContext.tsx`
- Método: email/password via `supabase.auth.signInWithPassword()`
- Callback OAuth: `/auth/callback`
- Whitelist: `pre_registered_users` + `ADMIN_EMAILS`
- Sessão: gerenciada pelo Supabase (JWT)

**Camada 2 — Sistema Local (SystemAuthContext)**
- Provider: `SystemAuthProvider` em `src/contexts/SystemAuthContext.tsx`
- Método: email/password com hash SHA-256 + salt
- Armazenamento: `localStorage` (chave: `zetti_session`)
- Timeout de inatividade: 30 minutos
- Usuários: `localStorage` (chave: `zetti_system_users`)

**Na prática:** O `SystemAuthContext` é o contexto principal usado em toda a aplicação. O `AuthContext` é usado para operações Supabase que requerem sessão JWT.

### 16.2 Fluxo de Login

```
1. Usuário acessa rota protegida
2. RouteGuard verifica SystemAuthContext.session
3. Se null → exibe SystemLoginScreen
4. Usuário insere email/password
5. loginUser() verifica localStorage (sistema local)
   OU supabase.auth.signInWithPassword() (Supabase)
6. Verifica whitelist (pre_registered_users)
7. Carrega perfil: fetchFullUserProfile(userId, email)
   - Busca em user_profiles (por UUID, depois por email)
   - Busca em pre_registered_users
   - Busca cargo em cargos
8. Carrega permissões: fetchModulePermissions(userId)
9. Armazena em sessionStorage (cache 5 min)
10. Redireciona para rota original
```

### 16.3 Modo Preview (Bypass Auth)

```typescript
function isPreviewMode(): boolean {
  const inIframe = window.self !== window.top;
  const bypassFlag = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
  return inIframe || bypassFlag;
}
```
- Quando em iframe (preview do Rocket.new) → auth bypassed
- Permite visualização sem login no editor

### 16.4 Usuários Admin Padrão (Seed)

```
admin@zetti.com.br     → Administrador (senha: ZettiAdmin@2026)
brunaramos1807@gmail.com → Administrador (senha: ZettiAdmin@2026)
```

---

## 17. RELACIONAMENTO ENTRE MÓDULOS

### 17.1 Mapa de Dependências

```
IMPORTAÇÃO
  ↓ alimenta
CYCLE_SCORES + NC_RECORDS + ELOGIOS
  ↓ lidos por
PAINEL EXECUTIVO ← dados consolidados de todos os ciclos
CICLO ATUAL ← dados do ciclo ativo
AUDITORIA ← status operacional por analista
QA & IEPC 360° ← análise detalhada por pilar
EVOLUÇÃO GERAL ← tendências históricas
ANALYTICS ← drilldown avançado
NÃO CONFORMIDADES ← registros de NC
MURAL DE ELOGIOS ← registros de elogios
GESTÃO DE PESSOAS ← perfil + histórico de scores

API EXTERNA (Lovable)
  ↓ alimenta
FEEDBACKS ← snapshot completo
  ↓ alimenta
PDI RECORDS ← via autoCreatePDIFromFeedback()
FEEDBACK HISTORICO ← scores por ciclo
ANALISTAS ← upsert de perfil

CICLOS (fechamento)
  ↓ dispara
FEEDBACKS → status "fechado" (automático)
CYCLE_CLOSURE_HISTORY ← registro do evento

CONFIGURAÇÕES (usuários/cargos/permissões)
  ↓ controla acesso a
TODOS OS MÓDULOS (via RBAC)

ORGANOGRAMA (/suporte)
  ↓ lê de
USER_PROFILES ← usuários reais
APP_SETTINGS ← configuração da hierarquia (key: org_chart_config)
CYCLE_SCORES + NC_RECORDS + ELOGIOS ← métricas dos coordenadores
```

### 17.2 Eventos de Sincronização

O sistema usa um evento customizado `zetti_data_changed` (CustomEvent no window) para sincronização entre componentes:

```typescript
dispatchDataChanged({ tipo: 'import', periodo: '04/2026' })
listenDataChanged((event) => { /* recarregar dados */ })
```

Disparado após:
- Importação de dados
- Entrada manual
- Edição de ciclo manual
- Fechamento/reabertura de ciclo

---

## 18. FUNCIONALIDADES IMPLEMENTADAS

### 18.1 Módulo Executivo
- [x] Painel Executivo com KPIs consolidados
- [x] Filtro "Todos" consolidando todos os squads
- [x] Drilldown lateral por analista
- [x] Chat com IA (Gemini) integrado ao painel
- [x] Evolução Geral com heatmap e tendências
- [x] Analytics Avançado com múltiplos modos de visualização
- [x] Comparação entre analistas (modal)
- [x] Exportação CSV e PDF

### 18.2 Módulo Operação
- [x] Ciclo Atual com polling automático
- [x] Gestão de Ciclos (abertura, fechamento, reabertura)
- [x] Histórico de fechamento com notas
- [x] Central de Auditoria com KPIs automáticos
- [x] Tabela operacional com status por analista
- [x] Organograma configurável (usuários reais, hierarquia customizável)
- [x] Métricas de coordenadores no organograma

### 18.3 Módulo Qualidade
- [x] QA & IEPC 360° com todos os pilares e subpilares
- [x] Não Conformidades com 5 tipos (NC-1 a NC-5)
- [x] Mural de Elogios com ranking e medalhas
- [x] Filtros avançados em todos os módulos

### 18.4 Módulo Desenvolvimento Humano
- [x] Lista de Feedbacks com ordenação e filtros
- [x] Status reais de feedback (Gerado → Enviado → Lido → Validado → Fechado)
- [x] Inline status changer
- [x] Detalhe completo do feedback
- [x] Link público via token (sem login)
- [x] Criação manual de feedback
- [x] Importação de feedback via JSON
- [x] Histórico de feedbacks por analista
- [x] People Analytics
- [x] Central de PDI com objetivos e timeline
- [x] PDI integrado ao feedback (autoCreatePDIFromFeedback)
- [x] Gestão de Pessoas com perfil completo e histórico
- [x] Advertências (registro disciplinar)

### 18.5 Módulo Governança
- [x] Repositório de Documentos ISO (upload, categorias, versões)
- [x] Histórico de Ciclos (manual)

### 18.6 Módulo Admin
- [x] Configurações: usuários, cargos, permissões, escopos, logs
- [x] Upload de foto de perfil (avatar)
- [x] Cadastro de Analistas (CRUD completo + import CSV/XLSX)
- [x] Central de Importações (todos os modos)
- [x] Logs & Diagnóstico (admin only)
- [x] Calibragem de Scores

### 18.7 Integrações
- [x] Supabase Auth (email/password + whitelist)
- [x] Supabase Database (PostgreSQL + RLS)
- [x] Supabase Storage (avatares, documentos)
- [x] API Gemini (chat-completion via @rocketnew/llm-sdk)
- [x] Google Analytics
- [x] API externa de avaliação (POST /api/receber-avaliacao)
- [x] API de importação de feedbacks (POST /api/feedbacks/import)

---

## 19. FUNCIONALIDADES PENDENTES / PARCIAIS

### 19.1 Parcialmente Implementadas

| Funcionalidade | Status | Observação |
|---|---|---|
| Fotos dos analistas | Parcial | Upload implementado, mas exibição em elogios/feedbacks/rankings pode falhar se avatar_url não estiver preenchido |
| Calibragem | Básica | Tela existe mas sem lógica de calibração real (apenas visualização) |
| Histórico de Ciclos | Manual | Dados inseridos manualmente, sem consolidação automática de ciclos fechados |
| Notificações de feedback | Ausente | Status "Enviado" não dispara notificação real ao analista |
| Assinatura digital de feedback | Ausente | Analista não pode assinar/confirmar recebimento |
| Relatório ISO 9001 | Ausente | Documentos ISO armazenados mas sem geração automática de relatório |

### 19.2 Não Implementadas

| Funcionalidade | Prioridade Estimada |
|---|---|
| Notificações push/email ao analista quando feedback enviado | Alta |
| Assinatura/confirmação de leitura pelo analista | Alta |
| Dashboard de coordenador (visão restrita ao próprio squad) | Média |
| Relatório automático ISO 9001 | Média |
| Integração com sistema de RH (admissão, desligamento) | Baixa |
| App mobile / PWA | Baixa |
| Exportação de relatório de PDI em PDF | Média |
| Alertas automáticos de analistas em risco | Média |
| Integração com calendário para datas de PDI | Baixa |

---

## 20. RISCOS TÉCNICOS

### 20.1 Riscos Críticos

| Risco | Descrição | Impacto |
|---|---|---|
| **Dupla camada de auth** | Sistema local (localStorage) + Supabase Auth coexistem. Inconsistências podem causar loops de login | Alto |
| **RLS permissivo** | Políticas `USING (true)` para anon em tabelas operacionais. Qualquer pessoa com a URL pode ler dados | Alto |
| **SUPABASE_SERVICE_ROLE_KEY ausente** | `/api/receber-avaliacao` usa service role. Se não configurado, importação via API falha silenciosamente | Alto |
| **Cache de permissões** | Cache de 5 min em sessionStorage. Alterações de permissão não refletem imediatamente | Médio |

### 20.2 Riscos Médios

| Risco | Descrição | Impacto |
|---|---|---|
| **localStorage como banco** | `dataService.ts` usa localStorage como fallback. Dados podem ser perdidos ao limpar cache do browser | Médio |
| **Bypass de auth em iframe** | `isPreviewMode()` bypassa autenticação quando em iframe. Pode ser explorado | Médio |
| **Sem validação de tipo de arquivo** | ImportModal aceita qualquer arquivo; validação é feita após parse | Médio |
| **Sem paginação** | Tabelas carregam todos os registros. Com volume alto, pode degradar performance | Médio |
| **external_id sem validação** | Idempotência do feedback depende de external_id único. Duplicatas possíveis se não enviado | Médio |

### 20.3 Riscos Baixos

| Risco | Descrição |
|---|---|
| **Versão hardcoded** | `src/lib/version.ts` com versão manual. Pode ficar desatualizado |
| **ADMIN_EMAILS hardcoded** | Lista de emails admin em múltiplos arquivos. Difícil de manter |
| **Sem testes automatizados** | Nenhum teste unitário ou de integração identificado |
| **Dependência de Rocket.new** | Scripts `rocket-web.js` e `rocket-shot.js` injetados no layout |

---

## 21. MELHORIAS FUTURAS RECOMENDADAS

### 21.1 Segurança

1. **Unificar camadas de auth** — usar apenas Supabase Auth como fonte de verdade
2. **Revisar políticas RLS** — implementar políticas baseadas em `auth.uid()` para dados sensíveis
3. **Remover bypass de iframe** — ou restringir a domínios específicos
4. **Mover ADMIN_EMAILS para tabela** — `cargos.is_admin_master = true` já existe, usar consistentemente

### 21.2 Performance

1. **Implementar paginação** — em todas as tabelas com volume alto (cycle_scores, feedbacks, nc_records)
2. **Migrar localStorage para Supabase** — eliminar dependência de localStorage para dados operacionais
3. **Lazy loading de componentes** — já parcialmente implementado com `dynamic()`, expandir
4. **Índices adicionais** — `nc_records(tipo_nc)`, `feedbacks(equipe)`, `pdi_records(status_pdi)`

### 21.3 Funcionalidades

1. **Notificações reais** — email/push quando feedback enviado ao analista
2. **Assinatura digital** — analista confirma leitura do feedback
3. **Relatório ISO automático** — geração de relatório de conformidade
4. **Dashboard do analista** — visão própria sem acesso admin
5. **Alertas automáticos** — analistas com QA < 70 por N ciclos consecutivos
6. **Integração calendário** — datas de revisão de PDI no Google Calendar

### 21.4 Qualidade de Código

1. **Testes automatizados** — Jest + Testing Library para componentes críticos
2. **Centralizar constantes** — squads, status, roles em arquivo único de configuração
3. **Documentar API routes** — OpenAPI/Swagger para `/api/receber-avaliacao`
4. **Separar mock data** — `mockData.ts` ainda referenciado em alguns componentes

---

## 22. APIS E INTEGRAÇÕES EXTERNAS

### 22.1 API de Recebimento de Avaliação

```
Endpoint: POST /api/receber-avaliacao
Auth: Bearer {INTEGRATION_API_TOKEN}
Content-Type: application/json

Payload (novo formato):
{
  metadata: { origem, versao, gerado_em, avaliacao_id },
  analista: { nome, email, equipe, coordenador, auditor },
  ciclo: { nome, data_inicio, data_fim, status },
  scores: { qa, iepc, aderencia },
  pilares_qa: [{ codigo, nome, nota, maximo, peso }],
  pilares_iepc: [{ codigo, nome, nota, maximo }],
  atendimentos: [{ protocolo, sup, cliente, data, nota_qa, criterios, nao_conformidades }],
  coaching: [{ o_que_foi_dito, como_poderia_ser, dica_de_ouro }],
  pdi: [{ objetivo, acao_desenvolvimento, prazo, progresso, status }],
  historico: [{ ciclo, qa, iepc }],
  feedback_blocks: { evolucao_tecnica, evolucao_comportamental, atencao_evolutiva },
  analytics: { ranking_squad, total_analistas, ciclos_consecutivos_evolucao },
  external_id: "string único para idempotência"
}

Resposta:
{ success: true, feedback_id: "uuid", analista_id: "uuid" }
```

### 22.2 API de Importação de Feedbacks

```
Endpoint: POST /api/feedbacks/import
Auth: Bearer {INTEGRATION_API_TOKEN}
Content-Type: application/json

Payload: mesmo formato do /api/receber-avaliacao (normalizado internamente)

Resposta:
{ success: true, id: "uuid", analista_id: "uuid" }
```

### 22.3 API de Chat IA

```
Endpoint: POST /api/ai/chat-completion
Provider: Gemini (via @rocketnew/llm-sdk)
Auth: GEMINI_API_KEY (server-side)

Payload:
{ messages: [{ role: "user" | "assistant", content: "string" }] }

Resposta:
{ content: "string" }
```

### 22.4 Integrações Configuradas (MCP/Conectores)

| Integração | Status | Uso |
|---|---|---|
| Supabase | ✅ Ativo | Banco de dados, auth, storage |
| Gemini | ✅ Ativo | Chat IA no painel executivo |
| Google Analytics | Configurável | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| Typeform | Conectado (MCP) | Formulários externos |
| Calendly | Conectado (MCP) | Agendamentos |
| Notion | Conectado (MCP) | Documentação |
| Google Sheets/Docs/Calendar | Conectado (MCP) | Integração Google Workspace |

---

## 23. COMPONENTES COMPARTILHADOS

### 23.1 Layout

| Componente | Arquivo | Descrição |
|---|---|---|
| `EnterpriseLayout` | `components/EnterpriseLayout.tsx` | Layout principal (sidebar + topbar + footer) |
| `EnterpriseSidebar` | `components/EnterpriseSidebar.tsx` | Sidebar colapsável com navegação por seções |
| `EnterpriseTopbar` | `components/EnterpriseTopbar.tsx` | Barra superior com usuário e ações |
| `AppFooter` | `components/AppFooter.tsx` | Rodapé da aplicação |
| `RouteGuard` | `components/RouteGuard.tsx` | Proteção de rotas (auth + admin) |

### 23.2 UI

| Componente | Arquivo | Descrição |
|---|---|---|
| `AppImage` | `components/ui/AppImage.tsx` | Wrapper de imagem com fallback |
| `AppIcon` | `components/ui/AppIcon.tsx` | Wrapper de ícone |
| `AppLogo` | `components/ui/AppLogo.tsx` | Logo da aplicação |
| `ImportModal` | `components/ImportModal.tsx` | Modal de importação multi-step |
| `DrilldownNavigation` | `components/DrilldownNavigation.tsx` | Painel lateral de drilldown |
| `GoogleAnalytics` | `components/GoogleAnalytics.tsx` | Script GA4 |
| `SystemLoginScreen` | `components/SystemLoginScreen.tsx` | Tela de login do sistema |

### 23.3 Componentes da Home

| Componente | Arquivo |
|---|---|
| `HomeExecutiveView` | `app/components/HomeExecutiveView.tsx` |
| `HomeKPICards` | `app/components/HomeKPICards.tsx` |
| `HeroCycleStatus` | `app/components/HeroCycleStatus.tsx` |
| `MonthlyTrendChart` | `app/components/MonthlyTrendChart.tsx` |
| `TopAnalysts` | `app/components/TopAnalysts.tsx` |
| `NavigationShortcuts` | `app/components/NavigationShortcuts.tsx` |

---

## 24. SERVIÇOS E UTILITÁRIOS

### 24.1 dataService.ts

Serviço principal de dados (`src/lib/services/dataService.ts` — 1633 linhas).

**Funções principais:**
```typescript
fetchCycleScores(periodo?)          → CycleScoreRow[]
fetchNCRecords(periodo?)            → NCRow[]
fetchElogios(periodo?)              → ElogioRow[]
fetchAllPeriodos()                  → string[]
buildAnalystsFromScores(scores)     → RealAnalyst[]
fetchAnalistas()                    → AnalistaRecord[]
upsertAnalista(data)                → void
deleteAnalista(id)                  → void
fetchPDIRecords(periodo?)           → PDIRecord[]
savePDIRecord(data)                 → PDIRecord
updatePDIRecord(id, data)           → void
deletePDIRecord(id)                 → void
fetchPDIObjectives(pdiId)           → PDIObjective[]
savePDIObjective(data)              → PDIObjective
fetchPDITimeline(pdiId)             → PDITimelineEvent[]
autoCreatePDIFromFeedback(feedbackId) → void
exportCycleToCSV(analysts, periodo) → void
fetchAdminLogs(filters)             → AdminLog[]
dispatchDataChanged(payload)        → void
listenDataChanged(callback)         → cleanup function
isCycleClosed(periodo)              → boolean
parseQAScoresCSV(rows)              → CycleScoreRow[]
parseNCsCSV(rows)                   → NCRow[]
parseElogiosCSV(rows)               → ElogioRow[]
```

**localStorage keys:**
```
zetti_cycle_scores
zetti_nc_records
zetti_elogios
zetti_import_cycles
zetti_user_profiles
zetti_closed_cycles
zetti_analyst_profiles
zetti_manual_cycles
zetti_import_records
zetti_manual_entries
```

### 24.2 supabaseDataService.ts

Serviço de integração Supabase (`src/lib/services/supabaseDataService.ts` — 663 linhas).

**Funções principais:**
```typescript
importCycleDataToSupabase(scores, ncs, elogios, periodo, fileName) → { success, cycleId }
getActiveCycle()                    → string | null
isCycleClosedInSupabase(periodo)    → boolean
```

### 24.3 authSystem.ts

Sistema de autenticação local (`src/lib/authSystem.ts` — 390 linhas).

**Funções:**
```typescript
loginUser(email, password)          → { success, session }
logoutUser()                        → void
getCurrentSession()                 → SessionData | null
seedDefaultAdmin()                  → void
```

### 24.4 rbac.ts

Controle de acesso baseado em roles (`src/lib/rbac.ts`).

**Funções:**
```typescript
loadUserPermissions(userId, moduleName) → RBACPermissions
loadUserScope(userId)               → UserScopePermission
canAccess(perms)                    → boolean
canEdit(perms)                      → boolean
canImport(perms)                    → boolean
canCloseCycle(perms)                → boolean
clearPermissionsCache()             → void
```

### 24.5 pdfExport.ts

Exportação de relatórios em PDF (`src/lib/utils/pdfExport.ts`).

```typescript
exportCyclePDF(analysts, periodo, options) → void
```

### 24.6 Hooks

| Hook | Arquivo | Descrição |
|---|---|---|
| `useChat` | `lib/hooks/useChat.ts` | Chat com IA (Gemini) |
| `useRealtimeSync` | `lib/hooks/useRealtimeSync.ts` | Sincronização em tempo real |

---

## 25. CONFIGURAÇÃO DE AMBIENTE

### 25.1 Variáveis de Ambiente

| Variável | Status | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configurada | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Configurada | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Pendente | Necessária para /api/receber-avaliacao |
| `GEMINI_API_KEY` | ✅ Configurada | Chat IA |
| `INTEGRATION_API_TOKEN` | ✅ Configurada | Auth das APIs externas |
| `NEXT_PUBLIC_SITE_URL` | ✅ Configurada | https://qualivisao.tec.br |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ⚠️ Pendente | Google Analytics |
| `OPENAI_API_KEY` | ⚠️ Pendente | Não utilizado atualmente |
| `ANTHROPIC_API_KEY` | ⚠️ Pendente | Não utilizado atualmente |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ Pendente | Não utilizado atualmente |

### 25.2 Migrações Supabase (Ordem Cronológica)

| Arquivo | Data | Descrição |
|---|---|---|
| `20260505174502_zetti_quality_hub.sql` | 05/05/2026 | Schema inicial: user_profiles, import_cycles, cycle_scores, nc_records, elogios |
| `20260505200000_admin_users_setup.sql` | 05/05/2026 | Setup de usuários admin |
| `20260508203000_add_roles_and_bruna.sql` | 08/05/2026 | Adição de roles e usuário Bruna |
| `20260511000000_qualivisao_rebuild.sql` | 11/05/2026 | documents, audit_logs, manual_evaluations, cycle_summaries, strategic_indicators |
| `20260518000000_rbac_analistas_ciclos.sql` | 18/05/2026 | cargos, permission_modules, user_permissions, analistas, permission_logs, cycle status |
| `20260518200000_clear_operational_data.sql` | 18/05/2026 | Limpeza de dados operacionais |
| `20260519120000_allow_anon_rbac.sql` | 19/05/2026 | Permissões anon para RBAC |
| `20260519130000_rbac_full_overhaul.sql` | 19/05/2026 | Overhaul completo do RBAC, squads, analistas |
| `20260519140000_fix_data_visibility.sql` | 19/05/2026 | Correção de visibilidade de dados |
| `20260519150000_fix_critical_bugs.sql` | 19/05/2026 | Correções críticas |
| `20260519160000_onda1_foundation.sql` | 19/05/2026 | Fundação Onda 1 |
| `20260519170000_integration_api.sql` | 19/05/2026 | API de integração |
| `20260519200000_onda2_onda3_fixes.sql` | 19/05/2026 | Correções Onda 2 e 3 |
| `20260519210000_fix_import_persistence.sql` | 19/05/2026 | Correção de persistência de importação |
| `20260519220000_fix_rls_and_import.sql` | 19/05/2026 | Correção RLS e importação |
| `20260519230000_seed_all_data_and_fix_upsert.sql` | 19/05/2026 | Seed de dados e correção de upsert |
| `20260519240000_definitive_core_fix.sql` | 19/05/2026 | Correção definitiva do core |
| `20260519250000_seed_marco_032026.sql` | 19/05/2026 | Seed de dados Março/2026 |
| `20260520000000_app_settings_active_cycle.sql` | 20/05/2026 | Tabela app_settings, ciclo ativo |
| `20260520100000_fix_pdi_rls_and_cycle.sql` | 20/05/2026 | Correção RLS PDI e ciclo |
| `20260520200000_pdi_add_columns.sql` | 20/05/2026 | Colunas adicionais PDI |
| `20260522000000_fix_rls_cycle_visibility.sql` | 22/05/2026 | Correção visibilidade de ciclos |
| `20260522100000_analistas_hub_and_auth_fix.sql` | 22/05/2026 | Hub de analistas e correção auth |
| `20260522200000_feedback_module.sql` | 22/05/2026 | Módulo completo de feedback (feedbacks, feedback_atendimentos, feedback_pdi, pdi_records) |
| `20260524000000_advertencias_table.sql` | 24/05/2026 | Tabela de advertências |
| `20260524100000_feedback_fixes_and_avatar.sql` | 24/05/2026 | Correções feedback e avatar |
| `20260525140000_fix_coordinator_feedback_access.sql` | 25/05/2026 | Acesso de coordenador ao feedback |
| `20260525160000_fix_admin_tables_anon_rls.sql` | 25/05/2026 | RLS anon para tabelas admin |
| `20260525180000_new_payload_schema_and_rls.sql` | 25/05/2026 | Novo schema de payload, feedback_historico |
| `20260527000000_add_public_token_to_feedbacks.sql` | 27/05/2026 | Token público para feedbacks |
| `20260527100000_backfill_feedback_historico.sql` | 27/05/2026 | Backfill histórico de feedbacks |
| `20260527120000_backfill_atencao_evolutiva.sql` | 27/05/2026 | Backfill atenção evolutiva |
| `20260527130000_rbac_enterprise_and_feedback_fixes.sql` | 27/05/2026 | RBAC enterprise e correções feedback |
| `20260527200000_fix_analistas_anon_write.sql` | 27/05/2026 | Permissão de escrita anon para analistas |
| `20260527300000_pdi_enterprise_schema.sql` | 27/05/2026 | Schema enterprise PDI: pdi_objectives, pdi_timeline |
| `20260528120000_add_public_enabled_to_feedbacks.sql` | 28/05/2026 | Campo public_enabled nos feedbacks |

### 25.3 Configuração Next.js

- App Router habilitado
- SSR desabilitado para componentes com dados dinâmicos (`'use client'`)
- Dynamic imports com `ssr: false` para componentes pesados
- Fontes: DM Sans + Playfair Display via `next/font/google`
- Metadata: título, descrição, OpenGraph configurados
- Toaster (sonner): posição bottom-right, tema dark

---

## APÊNDICE A — GLOSSÁRIO

| Termo | Definição |
|---|---|
| **Ciclo** | Período de avaliação (mensal, formato MM/YYYY) |
| **Squad** | Equipe operacional (PDV, PDV N1, Compras e Estoque, Financeiro Fiscal) |
| **QA** | Quality Assurance — pontuação de qualidade do atendimento (0-100) |
| **IEPC** | Índice de Experiência Percebida pelo Cliente (0-100) |
| **NC** | Não Conformidade — desvio identificado na avaliação |
| **PDI** | Plano de Desenvolvimento Individual |
| **Analista** | Colaborador avaliado (sem login no sistema) |
| **Coordenador** | Gestor de squad com acesso restrito ao próprio time |
| **Auditor** | Responsável pela avaliação de qualidade |
| **Pilar** | Dimensão de avaliação (P1-P5 para QA, E1-E5 para IEPC) |
| **Subpilar** | Critério específico dentro de um pilar (ex: 1.1, 1.2, 2.1) |
| **Aderência** | Score de aderência ao processo (0-100) |
| **Drilldown** | Navegação para nível mais detalhado de análise |
| **RBAC** | Role-Based Access Control — controle de acesso por papel |
| **RLS** | Row Level Security — segurança em nível de linha no PostgreSQL |
| **Cargo** | Papel configurável no sistema (diferente de role hardcoded) |
| **Escopo** | Conjunto de squads/analistas visíveis para um usuário |

---

## APÊNDICE B — ENDPOINTS DE INTEGRAÇÃO

```
Produção:
  POST https://qualivisao.tec.br/api/receber-avaliacao
  POST https://qualivisao.tec.br/api/feedbacks/import
  POST https://qualivisao.tec.br/api/ai/chat-completion
  POST https://qualivisao.tec.br/api/admin/sync-auth-users

Preview:
  POST https://zettiquali9387.builtwithrocket.new/api/receber-avaliacao
  POST https://zettiquali9387.builtwithrocket.new/api/feedbacks/import
```

---

*Documento gerado automaticamente em 29/05/2026 a partir da análise do código-fonte do repositório QualiVisão.*  
*Versão da aplicação documentada: 0.5.1-20260527173055*  
*Para atualizar este documento, execute nova análise do repositório.*
