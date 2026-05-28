# QUALIVISÃO — DOCUMENTO OFICIAL DE ARQUITETURA E FLUXO DE DADOS

> **Versão:** 1.0  
> **Data de Geração:** 26/05/2026  
> **Classificação:** Documento Interno — Uso Restrito  
> **Responsável Técnico:** Área de Qualidade — Zetti Tech  
> **Finalidade:** Normalização ISO / Referência Arquitetural Oficial

---

## SUMÁRIO

1. [Visão Geral e Stack Tecnológica](#1-visão-geral-e-stack-tecnológica)
2. [Mapa do Site e Componentes (Skeleton)](#2-mapa-do-site-e-componentes-skeleton)
3. [Funcionalidades e Fluxo de Dados por Página](#3-funcionalidades-e-fluxo-de-dados-por-página)
4. [Controle de Acessos e Permissões (RBAC)](#4-controle-de-acessos-e-permissões-rbac)
5. [Diagnóstico de Saúde do Código e Limpeza](#5-diagnóstico-de-saúde-do-código-e-limpeza)

---

## 1. VISÃO GERAL E STACK TECNOLÓGICA

### 1.1 Identidade da Aplicação

| Campo | Valor |
|---|---|
| **Nome** | QualiVisão |
| **Subtítulo** | People Analytics — Plataforma de Gestão da Qualidade Operacional |
| **URL de Produção** | https://qualivisao.tec.br |
| **Tipo** | SPA Enterprise (Single Page Application) |
| **Idioma** | Português Brasileiro (pt-BR) |
| **Empresa** | Zetti Tech |

### 1.2 Stack Tecnológica Principal

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | Next.js (App Router) | 15.1.11 |
| **Linguagem** | TypeScript | ^5.0.0 |
| **Runtime UI** | React | 19.0.3 |
| **Estilização** | Tailwind CSS | 3.4.6 |
| **Backend-as-a-Service** | Supabase (PostgreSQL + Auth + Storage + RLS) | 2.105.3 |
| **Hospedagem** | Netlify (via `@netlify/plugin-nextjs`) | — |

### 1.3 Bibliotecas e Dependências de Produção

| Categoria | Biblioteca | Finalidade |
|---|---|---|
| **Ícones** | `lucide-react ^1.7.0` | Ícones vetoriais em toda a interface |
| **Gráficos** | `recharts ^2.15.2` | Todos os gráficos (Line, Bar, Radar, Pie, Area) |
| **Notificações** | `sonner ^1.7.4` | Toast notifications (canto inferior direito) |
| **Formulários** | `react-hook-form ^7.75.0` | Gerenciamento de formulários |
| **Exportação PDF** | `jspdf 4.2.1` + `jspdf-autotable 5.0.7` | Exportação de relatórios em PDF |
| **Exportação Excel** | `xlsx 0.18.5` | Leitura e escrita de planilhas XLS/XLSX |
| **Parsing CSV** | `papaparse 5.5.3` | Importação de arquivos CSV |
| **Datas** | `date-fns ^3.0.0` | Manipulação de datas |
| **IA** | `@rocketnew/llm-sdk ^1.1.0` | Integração com LLMs (Gemini, OpenAI, Anthropic) |
| **Analytics** | Google Analytics (via `NEXT_PUBLIC_GA_MEASUREMENT_ID`) | Rastreamento de uso |
| **Tipografia** | `@tailwindcss/typography ^0.5.16` | Estilo de texto rico |
| **Formulários CSS** | `@tailwindcss/forms ^0.5.10` | Reset de estilos de formulários |

### 1.4 Padrões de Design e Identidade Visual

| Padrão | Descrição |
|---|---|
| **Dark Mode Permanente** | Toda a interface opera exclusivamente em modo escuro. Cor de fundo base: `#071426` |
| **Glassmorphism** | Cards e modais com `background: rgba(...)` + `border: 1px solid rgba(255,255,255,0.06)` |
| **Design System de Cores** | Azul (`#38BDF8`), Verde (`#22C55E`), Roxo (`#A78BFA`), Laranja (`#FB923C`), Cinza (`#94A3B8`) |
| **Tipografia** | DM Sans (corpo/UI) + Playfair Display (títulos executivos) — Google Fonts |
| **Layout Enterprise** | Sidebar colapsável (256px → 64px) + Topbar fixa + Footer |
| **Animações** | Transições CSS suaves (`transition-all duration-300`), `animate-spin` para loading |
| **Responsividade** | Breakpoints Tailwind padrão; layout principal otimizado para desktop |

### 1.5 Integrações Externas

| Integração | Finalidade | Configuração |
|---|---|---|
| **Supabase** | Banco de dados, autenticação OAuth, storage de documentos | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Lovable (Sistema Externo)** | Envia payloads JSON de avaliações QA via API REST | `INTEGRATION_API_TOKEN` (Bearer) |
| **Google Analytics** | Rastreamento de eventos e pageviews | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| **Gemini AI** | Chat de IA assistente no Painel Executivo | `GEMINI_API_KEY` |
| **OpenAI** | Chat de IA (configurado, chave não definida) | `OPENAI_API_KEY` |
| **Anthropic** | Chat de IA (configurado, chave não definida) | `ANTHROPIC_API_KEY` |

---

## 2. MAPA DO SITE E COMPONENTES (SKELETON)

### 2.1 Estrutura de Navegação Principal

A navegação é gerenciada pelo componente `EnterpriseSidebar.tsx`, organizado em **6 seções colapsáveis**:

```
QUALIVISÃO (Sidebar)
│
├── 🔵 EXECUTIVO
│   ├── /                    → Painel Executivo
│   ├── /evolucao-geral      → Evolução
│   └── /cycle-dashboard     → Analytics
│
├── 🟣 OPERAÇÃO
│   ├── /ciclo-atual         → Ciclo Atual
│   ├── /ciclos              → Ciclos
│   └── /auditoria           → Auditoria
│
├── 🟢 QUALIDADE
│   ├── /qa-iepc             → QA & IEPC 360°
│   ├── /nao-conformidades   → Não Conformidades
│   └── /mural-elogios       → Elogios
│
├── 🟠 DESENVOLVIMENTO HUMANO
│   ├── /feedback            → Feedback
│   ├── /feedback/pdi        → Plano de Desenvolvimento
│   ├── /gestao              → Gestão de Pessoas
│   └── /advertencias        → Advertências
│
├── ⚪ GOVERNANÇA
│   ├── /documentos          → Documentos
│   └── /historico           → Histórico
│
└── 🔘 ADMIN (adminOnly para alguns itens)
    ├── /configuracoes       → Configurações [adminOnly]
    ├── /analistas           → Analistas
    ├── /importacoes         → Importações
    └── /admin-diagnostico   → Logs & Diagnóstico [adminOnly]
```

### 2.2 Rotas Completas da Aplicação

| Rota | Arquivo | Seção Sidebar | Acesso |
|---|---|---|---|
| `/` | `src/app/page.tsx` | EXECUTIVO | Todos |
| `/evolucao-geral` | `src/app/evolucao-geral/page.tsx` | EXECUTIVO | Todos |
| `/cycle-dashboard` | `src/app/cycle-dashboard/page.tsx` | EXECUTIVO | Todos |
| `/ciclo-atual` | `src/app/ciclo-atual/page.tsx` | OPERAÇÃO | Todos |
| `/ciclos` | `src/app/ciclos/page.tsx` | OPERAÇÃO | Todos |
| `/auditoria` | `src/app/auditoria/page.tsx` | OPERAÇÃO | Todos |
| `/qa-iepc` | `src/app/qa-iepc/page.tsx` | QUALIDADE | Todos |
| `/nao-conformidades` | `src/app/nao-conformidades/page.tsx` | QUALIDADE | Todos |
| `/mural-elogios` | `src/app/mural-elogios/page.tsx` | QUALIDADE | Todos |
| `/feedback` | `src/app/feedback/page.tsx` | DESENV. HUMANO | Todos |
| `/feedback/pdi` | `src/app/feedback/pdi/page.tsx` | DESENV. HUMANO | Todos |
| `/feedback/manual` | `src/app/feedback/manual/page.tsx` | — (sub-rota) | Todos |
| `/feedback/import` | `src/app/feedback/import/page.tsx` | — (sub-rota) | Todos |
| `/feedback/historico` | `src/app/feedback/historico/page.tsx` | — (sub-rota) | Todos |
| `/feedback/people-analytics` | `src/app/feedback/people-analytics/page.tsx` | — (sub-rota) | Todos |
| `/feedback/[id]` | `src/app/feedback/[id]/page.tsx` | — (dinâmica) | Todos |
| `/gestao` | `src/app/gestao/page.tsx` | DESENV. HUMANO | Todos |
| `/advertencias` | `src/app/advertencias/page.tsx` | DESENV. HUMANO | Todos |
| `/documentos` | `src/app/documentos/page.tsx` | GOVERNANÇA | Todos |
| `/historico` | `src/app/historico/page.tsx` | GOVERNANÇA | Todos |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | ADMIN | Admin |
| `/analistas` | `src/app/analistas/page.tsx` | ADMIN | Todos |
| `/importacoes` | `src/app/importacoes/page.tsx` | ADMIN | Todos |
| `/admin-diagnostico` | `src/app/admin-diagnostico/page.tsx` | ADMIN | Admin |
| `/pdis` | `src/app/pdis/page.tsx` | — (não no sidebar) | Todos |
| `/calibragem` | `src/app/calibragem/page.tsx` | — (não no sidebar) | Todos |
| `/admin-config` | `src/app/admin-config/page.tsx` | — (legado) | Admin |
| `/suporte` | `src/app/suporte/page.tsx` | — (sem layout) | Público |
| `/privacidade` | `src/app/privacidade/page.tsx` | — (sem layout) | Público |
| `/termos` | `src/app/termos/page.tsx` | — (sem layout) | Público |
| `/sign-up-login` | `src/app/sign-up-login/page.tsx` | — (sem layout) | Público |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | — (OAuth) | Sistema |

### 2.3 Componentes Globais de Layout

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| `EnterpriseLayout` | `src/components/EnterpriseLayout.tsx` | Wrapper principal: Sidebar + Topbar + Footer + RouteGuard |
| `EnterpriseSidebar` | `src/components/EnterpriseSidebar.tsx` | Navegação lateral colapsável com seções e controle de admin |
| `EnterpriseTopbar` | `src/components/EnterpriseTopbar.tsx` | Barra superior: breadcrumb, data, notificações, cargo do usuário, botão de impressão |
| `AppFooter` | `src/components/AppFooter.tsx` | Rodapé da aplicação |
| `RouteGuard` | `src/components/RouteGuard.tsx` | Proteção de rotas: verifica sessão, modo preview, permissão admin |
| `SystemLoginScreen` | `src/components/SystemLoginScreen.tsx` | Tela de login exibida quando não há sessão ativa |
| `ImportModal` | `src/components/ImportModal.tsx` | Modal de importação de CSV/XLSX (scores, NCs, elogios) |
| `DrilldownNavigation` | `src/components/DrilldownNavigation.tsx` | Painel lateral de drilldown de analistas |
| `GoogleAnalytics` | `src/components/GoogleAnalytics.tsx` | Injeção do script GA4 |
| `AppHeader` | `src/components/AppHeader.tsx` | Header legado (usado em admin-config) |

### 2.4 Contextos de Estado Global

| Contexto | Arquivo | Responsabilidade |
|---|---|---|
| `AuthContext` | `src/contexts/AuthContext.tsx` | Sessão Supabase OAuth (Google), whitelist de e-mails |
| `SystemAuthContext` | `src/contexts/SystemAuthContext.tsx` | Sessão do sistema (login por e-mail/senha), RBAC, permissões por módulo, cache de perfil |

### 2.5 API Routes (Next.js)

| Endpoint | Arquivo | Método | Finalidade |
|---|---|---|---|
| `/api/receber-avaliacao` | `src/app/api/receber-avaliacao/route.ts` | `POST` / `GET` | Recebe payloads do Lovable; persiste avaliações, NCs, feedbacks, PDIs, coaching, histórico |
| `/api/ai/chat-completion` | `src/app/api/ai/chat-completion/route.ts` | `POST` | Proxy de IA: encaminha para Gemini/OpenAI/Anthropic/Perplexity via `@rocketnew/llm-sdk` |
| `/api/feedbacks/import` | `src/app/api/feedbacks/import/route.ts` | `POST` | Importação de feedbacks em lote via JSON |
| `/api/admin/sync-auth-users` | `src/app/api/admin/sync-auth-users/route.ts` | `POST` | Sincroniza usuários do Supabase Auth com `user_profiles` |

---

## 3. FUNCIONALIDADES E FLUXO DE DADOS POR PÁGINA

### 3.1 Painel Executivo (`/`)

**Componente principal:** `HomeExecutiveView.tsx` (1824 linhas)

**O que a página faz:**
- Dashboard executivo completo com KPIs globais, gráficos de tendência, ranking de analistas, distribuição de NCs, pilares QA/IEPC, e chat de IA assistente.
- Filtros por período, squad e coordenador.
- Drilldown de analistas via painel lateral (`DrilldownPanel`).
- Chat com IA (Gemini) contextualizado com os dados do ciclo atual.

**Componentes visuais:**
- Cards KPI: Média QA, Média IEPC, Total NCs, Total Elogios, Total Analistas
- Gráfico de linha: Tendência histórica QA/IEPC por período
- Gráfico de pizza/donut: Distribuição de NCs por tipo
- Gráfico radar: Pilares QA e dimensões IEPC
- Tabela de ranking: Top analistas e analistas críticos
- Chat IA: Assistente contextual com dados do ciclo

**Origem dos Dados:**

| Dado | Tabela Supabase | Função de Serviço |
|---|---|---|
| Scores QA/IEPC | `cycle_scores` | `fetchCycleScores()` |
| Períodos disponíveis | `cycle_scores` (distinct) | `fetchAllPeriodos()` |
| Não Conformidades | `nc_records` | `fetchNCRecords()` |
| Elogios | `elogios` | `fetchElogios()` |
| Ciclos manuais | `localStorage` (fallback) | `fetchManualCycles()` |
| Ciclo ativo | `app_settings` | via `supabaseDataService` |

**Colunas lidas de `cycle_scores`:** `periodo`, `analista`, `squad`, `coordenador`, `nota_final_qa`, `iepc_total`, `total_ncs`, `p1`, `p2`, `p3`, `p4`, `p5`, `e1`, `e2`, `e3`, `e4`, `e5`

**Como os dados são montados:**
1. `fetchCycleScores()` busca primeiro no Supabase (`cycle_scores`), com fallback para `localStorage` (`zetti_cycle_scores`)
2. `buildAnalystsFromScores()` agrupa por analista e calcula médias
3. Dados são filtrados por período selecionado e squad
4. Gráficos são renderizados via Recharts com dados transformados em arrays

---

### 3.2 Evolução Geral (`/evolucao-geral`)

**O que a página faz:**
- Visão histórica multi-ciclo de QA e IEPC.
- Heatmap de performance por analista × período.
- Gráfico de barras de NCs por tipo ao longo do tempo.
- Permite inserção manual de entradas (analista, squad ou setor) para ciclos sem dados importados.

**Componentes visuais:**
- Gráfico de linha: Evolução QA/IEPC por período
- Heatmap: Analista × Período com cores de performance
- Gráfico de barras: NCs por tipo por período
- Formulário de entrada manual

**Origem dos Dados:**

| Dado | Fonte |
|---|---|
| Scores históricos | `cycle_scores` (Supabase) + `localStorage` |
| NCs históricas | `nc_records` (Supabase) + `localStorage` |
| Entradas manuais | `cycle_scores` / `manual_evaluations` (Supabase) + `localStorage` (`zetti_manual_entries`) |

---

### 3.3 Analytics (`/cycle-dashboard`)

**Componente principal:** `CycleDashboard.tsx` + 10 sub-componentes

**O que a página faz:**
- Dashboard analítico por ciclo com filtros avançados.
- Comparação entre analistas (modal).
- Drilldown por pilar, squad e analista.
- Exportação CSV e PDF.

**Sub-componentes:**

| Componente | Responsabilidade |
|---|---|
| `CycleFilters` | Filtros de período, squad, analista, modo de visualização |
| `CycleKPICards` | Cards de KPI do ciclo selecionado |
| `SquadRankingChart` | Ranking de squads por QA/IEPC |
| `PillarMatrix` | Matriz de pilares QA e dimensões IEPC |
| `AnalystDrilldown` | Detalhamento por analista |
| `ExecutiveInsights` | Insights executivos gerados automaticamente |
| `NonConformitiesGuide` | Guia de NCs do ciclo |
| `CompareAnalystsModal` | Modal de comparação entre analistas |
| `AnalystRadarChart` | Gráfico radar por analista |
| `PillarDrilldownModal` | Modal de detalhamento por pilar |

**Origem dos Dados:** `cycle_scores`, `nc_records`, `elogios` via `dataService.ts`

**Controle de acesso por role:**
- Coordenadores: veem todos os squads, mas drilldown de analistas restrito ao seu squad
- Admin/Diretoria: acesso irrestrito

---

### 3.4 Ciclo Atual (`/ciclo-atual`)

**O que a página faz:**
- Acompanhamento operacional em tempo real do ciclo ativo.
- Polling automático a cada 30 segundos.
- Comparativo com ciclo anterior (delta QA/IEPC).
- Ranking de analistas, análise por squad, NCs do ciclo.

**Componentes visuais:**
- Cards KPI: Média QA, Média IEPC, Total NCs, Total Elogios com delta vs. ciclo anterior
- Gráfico de barras: Performance por squad
- Tabela: Top 5 analistas e analistas críticos
- Gráfico de barras: NCs por tipo

**Origem dos Dados:**

| Dado | Tabela | Função |
|---|---|---|
| Scores do ciclo ativo | `cycle_scores` | `fetchCycleScores()` |
| Ciclo ativo configurado | `app_settings` | `getActiveCycle()` |
| NCs do ciclo | `nc_records` | `fetchNCRecords()` |
| Elogios do ciclo | `elogios` | `fetchElogios()` |

**Colunas de `app_settings` lidas:** `key = 'active_cycle'`, `value`

---

### 3.5 Ciclos (`/ciclos`)

**O que a página faz:**
- Listagem de todos os ciclos importados com status (aberto, em andamento, fechado, reaberto).
- Ações de fechar/reabrir ciclo (requer permissão admin).
- Histórico de fechamentos com log de ator e data.
- Exclusão de ciclos (admin).

**Origem dos Dados:**

| Dado | Tabela |
|---|---|
| Lista de ciclos | `import_cycles` |
| Histórico de fechamentos | `cycle_closure_history` |
| Scores por ciclo | `cycle_scores` |
| NCs por ciclo | `nc_records` |
| Elogios por ciclo | `elogios` |

**Colunas de `import_cycles`:** `id`, `periodo`, `status`, `is_closed`, `is_current`, `record_count`, `imported_at`, `closed_at`, `closed_by_email`, `reopened_at`, `reopened_by_email`

---

### 3.6 Auditoria (`/auditoria`)

**O que a página faz:**
- Controle de auditoria de interações por analista.
- Lista de analistas com contador de interações auditadas.
- Status: Pendente (0), Em andamento (1-4), Concluído (5+).
- Filtros por squad e status.

**Origem dos Dados:**
- Lista de analistas: **hardcoded** em `EMBEDDED_ANALYSTS` (18 analistas fixos no código)
- Contadores de interações: `localStorage` (`zetti_audit_data`)
- Analistas removidos: `localStorage` (`zetti_audit_removed_analysts`)
- Ciclo ativo: `app_settings` via `getActiveCycle()`

> ⚠️ **Nota:** Esta página usa dados hardcoded para a lista de analistas — não lê da tabela `analistas` do Supabase.

---

### 3.7 QA & IEPC 360° (`/qa-iepc`)

**O que a página faz:**
- Análise profunda dos 5 pilares QA (P1-P5) e 5 dimensões IEPC (E1-E5).
- Detalhamento por subpilar (15 subpilares no total).
- Drilldown por pilar, squad, analista e coordenador.
- Gauge charts, radar charts, scatter plots, gráficos de área.
- Tooltips detalhados com critérios, objetivos e pesos de cada subpilar.

**Pesos Oficiais QA:** P1=22, P2=34, P3=18, P4=14, P5=12 (total=100)  
**Pesos Oficiais IEPC:** E1=30, E2=20, E3=20, E4=15, E5=15 (total=100)

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Scores e pilares | `cycle_scores` | `p1, p2, p3, p4, p5, e1, e2, e3, e4, e5, nota_final_qa, iepc_total` |
| NCs | `nc_records` | `tipo_nc, pontos_deduzidos, analista, squad` |
| Períodos | `cycle_scores` (distinct) | `periodo` |

---

### 3.8 Não Conformidades (`/nao-conformidades`)

**O que a página faz:**
- Central de gestão de NCs com nomenclatura padronizada (NC-1 a NC-5).
- Visualizações: tabela e gráficos (radar, donut, barras, área, funil de fluxo).
- Filtros: período, squad, tipo, analista, coordenador, reincidentes.
- Modal de detalhes por NC com recomendação.
- Exclusão de NC individual com confirmação.
- Detecção automática de reincidentes (2+ NCs do mesmo tipo).

**Tipos de NC Padronizados:**

| Código | Nome | Criticidade |
|---|---|---|
| NC-1 | Postura e Ética Profissional | Alta |
| NC-2 | Acuracidade e Rigor Técnico | Alta |
| NC-3 | Registro e Rastreabilidade | Média |
| NC-4 | Integridade do Fluxo Operacional | Alta |
| NC-5 | Segurança da Informação | Crítica |

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Registros de NC | `nc_records` | `id, analista, squad, coordenador, tipo_nc, descricao, pontos_deduzidos, protocolo_referencia, periodo, status` |

---

### 3.9 Mural de Elogios (`/mural-elogios`)

**O que a página faz:**
- Exibição de elogios recebidos pelos analistas.
- Visualizações: mural de cards e gráficos (barras, pizza, área).
- Filtros: squad, período, coordenador, analista, destaque.
- Toggle de destaque por elogio.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Elogios | `elogios` | `id, colaborador, squad, cliente, protocolo, elogio, destaque, periodo` |

---

### 3.10 Feedback (`/feedback`)

**O que a página faz:**
- Listagem de todos os feedbacks individuais com status de workflow.
- Filtros: status, equipe, ciclo, busca por nome.
- Ações: visualizar, editar, ver histórico, excluir.
- Links para criação manual e importação JSON.

**Status de Workflow:** `draft → generated → reviewed → approved → sent`

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Feedbacks | `feedbacks` | `id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, total_squad, status, origem, created_at` |
| Analistas (join) | `analistas` | `nome, equipe, coordenador` |

---

### 3.11 Plano de Desenvolvimento (`/feedback/pdi`)

**O que a página faz:**
- Gestão de PDIs (Planos de Desenvolvimento Individual).
- Criação, edição e exclusão de PDIs.
- Filtros por status, analista, equipe.
- KPIs: total PDIs, em andamento, concluídos, atrasados.
- Busca de analistas com autocomplete.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| PDIs | `feedback_pdi` | `id, objetivo, acao_desenvolvimento, prazo, progresso, status, responsavel, ciclo_origem, evidencia, analista_nome, analista_id, equipe, ciclo` |
| PDIs legados | `pdi_records` | mesmas colunas (fonte secundária) |
| Analistas | `analistas` | `id, nome, email, equipe` |

---

### 3.12 Feedback — Histórico (`/feedback/historico`)

**O que a página faz:**
- Histórico de feedbacks agrupado por analista.
- Gráfico de evolução QA/IEPC por analista.
- Exclusão de feedbacks com confirmação.
- Exibição do endpoint de integração para o Lovable.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Histórico | `feedback_historico` | `id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, created_at, feedback_id` |
| Analistas (join) | `analistas` | `nome, equipe` |

---

### 3.13 Feedback — Manual (`/feedback/manual`)

**O que a página faz:**
- Criação e edição manual de feedbacks completos.
- Seções: Identificação, Scores, Pilares QA, Pilares IEPC, Pontos Fortes, Oportunidades, Atendimentos, Coaching, PDI.
- Suporte a edição via `?id=` na query string.

**Origem dos Dados:**

| Dado | Tabela |
|---|---|
| Analistas (dropdown) | `analistas` |
| Feedback (edição) | `feedbacks` + `feedback_atendimentos` + `feedback_coaching` + `feedback_pdi` |

---

### 3.14 Feedback — Importação JSON (`/feedback/import`)

**O que a página faz:**
- Upload e validação de payload JSON do Lovable.
- Preview dos dados antes de salvar.
- Suporte a formato simples e formato completo (com metadata, analista object, ciclo object).
- Persistência via Supabase.

**Payload JSON esperado (formato completo):**
```json
{
  "metadata": { "origem": "lovable", "versao": "1.0" },
  "analista": { "nome": "...", "email": "...", "equipe": "...", "coordenador": "..." },
  "ciclo": { "nome": "05/2026" },
  "scores": { "qa": 91.31, "iepc": 90, "aderencia": 87 },
  "qa_pilares": [...],
  "iepc_pilares": [...],
  "atendimentos": [...],
  "coaching": [...],
  "pdi": [...]
}
```

---

### 3.15 People Analytics (`/feedback/people-analytics`)

**O que a página faz:**
- Análise agregada de performance por equipe.
- Top performers por QA.
- Médias globais e por equipe.
- Filtro por equipe.

**Origem dos Dados:**

| Dado | Tabela | Filtro |
|---|---|---|
| Feedbacks aprovados | `feedbacks` | `status IN ('approved', 'sent', 'generated')` |
| Analistas (join) | `analistas` | `nome` |

---

### 3.16 Gestão de Pessoas (`/gestao`)

**O que a página faz:**
- Visão RH dos analistas: cargo, squad, coordenador, tempo de empresa, aniversário, última promoção, status.
- Cards de analistas sem dados de QA/IEPC (foco em RH).
- Drawer lateral com detalhes completos + gráfico de evolução + histórico de avaliações.
- Filtros: busca, squad, status, risco.
- KPIs: total ativos, com PDI ativo, aniversariantes do mês, tempo médio de empresa.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Analistas | `analistas` | `id, nome, nome_completo, cargo_operacional, squad, equipe, coordenador, email, telefone, data_admissao, data_nascimento, ultima_promocao, status` |
| Scores (histórico) | `cycle_scores` | `analista, squad, nota_final_qa, iepc_total, periodo` |
| NCs | `nc_records` | `analista, tipo_nc` |
| PDIs | `pdi_records` | `analista, status_pdi` |

---

### 3.17 Advertências (`/advertencias`)

**O que a página faz:**
- Registro e gestão de advertências formais.
- Categorias: Comportamento, Qualidade, Pontualidade, Comunicação, Processo, Ética, Outro.
- Severidades: Leve, Moderada, Grave.
- Status: Aberta, Em Acompanhamento, Encerrada.
- Filtros: busca, status, severidade.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Advertências | `advertencias` | `id, analista_nome, data, categoria, severidade, motivo, descricao, responsavel, evidencia, status, created_at` |

---

### 3.18 Documentos (`/documentos`)

**O que a página faz:**
- Repositório de documentos ISO e operacionais.
- Categorias: Manual QA, Manual IEPC, Avaliação, Feedback, Normas, POPs, Treinamentos, ISO, Geral.
- Upload de arquivos (PDF, DOCX, XLSX) para Supabase Storage.
- Download e exclusão de documentos.
- Filtros: busca, categoria.

**Origem dos Dados:**

| Dado | Tabela / Storage | Colunas |
|---|---|---|
| Metadados de documentos | `documents` | `id, name, description, category, version, file_name, file_url, file_size, uploaded_at, is_active` |
| Arquivos físicos | Supabase Storage bucket `documents` | — |

---

### 3.19 Histórico (`/historico`)

**O que a página faz:**
- Tabela de ciclos históricos com médias QA/IEPC, total NCs e elogios.
- Edição inline de valores de ciclos manuais.
- KPIs: média histórica QA, média histórica IEPC, total NCs acumulado.

**Origem dos Dados:**
- Ciclos: `localStorage` (`zetti_manual_cycles`) com fallback para defaults hardcoded (Jan-Mar/2026)
- Dados reais: `cycle_scores` via `fetchManualCycles()`

> ⚠️ **Nota:** Esta página opera majoritariamente com dados de `localStorage`. Não há leitura direta de tabelas Supabase para os ciclos históricos.

---

### 3.20 Analistas (`/analistas`)

**O que a página faz:**
- CRUD completo de analistas (criar, editar, excluir).
- Importação em lote via CSV/XLSX.
- Perfil completo: nome, cargo, nível, squad, coordenador, e-mail, telefone, data de admissão, aniversário, última promoção, status.
- Drawer de detalhes com gráfico de evolução QA/IEPC, radar de pilares, histórico de avaliações, NCs, elogios, PDIs.
- Filtros: busca, squad, status, nível.

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Analistas | `analistas` | `id, nome, nome_completo, email, telefone, cargo_operacional, nivel, coordenador, squad, status, data_admissao, aniversario, ultima_promocao, observacoes, foto_url` |
| Scores | `cycle_scores` | `analista, nota_final_qa, iepc_total, p1-p5, e1-e5, periodo` |
| NCs | `nc_records` | `analista, tipo_nc, periodo` |
| Elogios | `elogios` | `colaborador, elogio, periodo` |
| PDIs | `pdi_records` | `analista, status_pdi` |

---

### 3.21 Importações (`/importacoes`)

**O que a página faz:**
- Hub de importação de dados: CSV/XLSX (scores, NCs, elogios), entrada manual e importação retroativa JSON.
- Listagem de importações realizadas com período, tipo, data e contagem de linhas.
- Exclusão de período completo (remove scores, NCs, elogios, feedbacks, feedback_atendimentos, feedback_coaching, feedback_pdi).
- Exportação CSV por período.
- Formulário de avaliação manual (todos os campos de score + pilares).

**Origem dos Dados:**

| Dado | Tabela |
|---|---|
| Registros de importação | `import_cycles` + `localStorage` (`zetti_import_records`) |
| Scores | `cycle_scores` |
| Analistas (autocomplete) | `analistas` |

**Permissão para importar:** `permissao_editar` OR `acesso_total` OR cargo `Administrador/Coordenador/Coordenador Geral`

---

### 3.22 Configurações (`/configuracoes`) — Admin

**O que a página faz:**
- Gestão completa de usuários do sistema (CRUD).
- Gestão de cargos com flags `is_admin_master`.
- Gestão granular de permissões por módulo por usuário.
- Logs de permissões.
- Aba de integrações (token da API, configurações do Lovable).
- Aba de analistas (sincronização).

**Abas:** `usuarios | cargos | permissoes | analistas | logs | integracoes`

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Usuários | `user_profiles` | `id, email, full_name, role, squad, squads, equipes, is_active, status_usuario, nivel, cargo_id` |
| Cargos | `cargos` | `id, nome, descricao, cor, is_active, is_admin_master` |
| Permissões | `user_permissions` | `user_profile_id, module_name, can_view, can_edit, can_delete, can_import, can_export, can_close_cycle, can_reopen_cycle, can_approve, can_admin` |
| Logs de permissão | `permission_logs` | `actor_email, target_email, action, entity_type, details, created_at` |
| Usuários pré-registrados | `pre_registered_users` | `email, role, squad, squads, cargo_id, full_name, is_active` |

---

### 3.23 Logs & Diagnóstico (`/admin-diagnostico`) — Admin

**O que a página faz:**
- Dashboard de saúde do sistema com estatísticas globais.
- Logs de sistema filtráveis por categoria e severidade.
- Listagem de usuários com último login.
- Logs de permissões.

**Abas:** `diagnostics | logs | users`

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| Logs do sistema | `admin_logs` | `id, level, category, message, details, created_at` |
| Logs de importação | `import_logs` | `periodo, step, level, message, details, rows_affected` |
| Usuários | `user_profiles` | `id, email, full_name, role, is_active, last_login_at` |
| Ciclos | `import_cycles` | `id, periodo, status, is_closed, imported_at` |
| Contagens | `cycle_scores`, `nc_records`, `pdi_records`, `admin_logs` | `count(*)` |

---

### 3.24 PDIs (`/pdis`)

**O que a página faz:**
- CRUD de PDIs com campos ricos: evolução técnica, comportamental, performance operacional, risco, plano de desenvolvimento.
- Filtros: status, squad, período, analista.
- Acordeon de seções.
- Suporte a anexos (estrutura preparada).

**Origem dos Dados:**

| Dado | Tabela | Colunas |
|---|---|---|
| PDIs | `pdi_records` | `id, analista, squad, coordenador, periodo, objetivo, prazo, observacoes, status_pdi, evolucao_tecnica, evolucao_comportamental, performance_operacional, risco_operacional, plano_desenvolvimento, proxima_revisao` |

---

### 3.25 Calibragem (`/calibragem`)

**O que a página faz:**
- Visualização de scores para calibragem manual.
- Gráfico de barras comparativo QA vs IEPC por analista.
- Seleção de período.
- Campos de calibração manual (não persistidos — apenas visual).

**Origem dos Dados:** `cycle_scores` via `fetchCycleScores()`

---

### 3.26 API — Receber Avaliação (`POST /api/receber-avaliacao`)

**O que o endpoint faz:**
- Recebe payloads JSON do sistema Lovable.
- Autenticação via Bearer Token (`INTEGRATION_API_TOKEN`).
- Usa Supabase Service Role (bypassa RLS).
- Persiste em múltiplas tabelas em sequência.

**Fluxo de persistência:**

```
Payload Lovable
    │
    ├─► analistas (upsert por nome/email)
    ├─► import_cycles (upsert por periodo)
    ├─► cycle_scores (upsert por periodo+analista+squad)
    ├─► nc_records (insert por NC do payload)
    ├─► feedbacks (upsert por analista_id+ciclo)
    ├─► feedback_atendimentos (insert por feedback_id)
    ├─► feedback_coaching (insert por feedback_id)
    ├─► feedback_pdi (insert por feedback_id)
    └─► feedback_historico (insert por analista_id+ciclo)
```

**Tabelas escritas:** `analistas`, `import_cycles`, `cycle_scores`, `nc_records`, `feedbacks`, `feedback_atendimentos`, `feedback_coaching`, `feedback_pdi`, `feedback_historico`

---

## 4. CONTROLE DE ACESSOS E PERMISSÕES (RBAC)

### 4.1 Arquitetura de Autenticação

O sistema opera com **dois contextos de autenticação paralelos**:

| Contexto | Arquivo | Mecanismo | Uso |
|---|---|---|---|
| **AuthContext** | `src/contexts/AuthContext.tsx` | Supabase Auth (OAuth Google + Email/Password) | Autenticação base, whitelist de e-mails |
| **SystemAuthContext** | `src/contexts/SystemAuthContext.tsx` | Login por e-mail/senha com sessão em `localStorage` + perfil do Supabase | RBAC, permissões por módulo, cargo |

### 4.2 Fluxo de Login

```
1. Usuário acessa qualquer rota protegida
2. RouteGuard verifica se está em modo preview (iframe)
   └─ Se preview: bypass total de autenticação
3. RouteGuard verifica SystemAuthContext.session
   └─ Se sem sessão: exibe SystemLoginScreen
4. SystemLoginScreen: login por e-mail/senha
   a. Verifica usuário em localStorage (zetti_system_users)
   b. Verifica e-mail na whitelist (pre_registered_users no Supabase)
   c. Busca perfil em user_profiles (por UUID ou e-mail)
   d. Busca permissões em user_permissions
   e. Cache de perfil em sessionStorage (TTL: 5 minutos)
5. Sessão salva em localStorage (zetti_session)
   └─ Timeout de inatividade: 30 minutos
```

### 4.3 Roles e Níveis de Acesso

| Role | Descrição | Acesso |
|---|---|---|
| **Admin / Administrador** | Controle total do sistema | Todas as páginas, todas as squads, importação, gestão de usuários, fechamento de ciclos, exclusão |
| **Admin Master** | Flag `is_admin_master` no cargo | Superset do Admin — acesso irrestrito a tudo |
| **Coordenador** | Coordenador de squad | Vê todos os squads (dados gerais), drilldown restrito ao seu squad |
| **Coordenador Geral** | Coordenação multi-squad | Acesso ampliado, pode importar |
| **Coordenadora Qualidade** | Foco em qualidade | Acesso a módulos de qualidade |
| **Gestor / Gerente** | Gestão de pessoas | Leitura ampla, sem edição |
| **Diretoria** | Visão executiva | Leitura total, todas as squads, sem edição |
| **Auditor** | Auditoria de qualidade | Acesso a módulos de auditoria e qualidade |
| **QA** | Analista de qualidade | Acesso a módulos QA |
| **Analista** | Analista operacional | Acesso restrito ao próprio perfil |
| **Visualizador** | Somente leitura | Acesso de leitura básico |

### 4.4 Permissões por Módulo (`user_permissions`)

Cada usuário pode ter permissões granulares por módulo:

| Permissão | Descrição |
|---|---|
| `can_view` | Visualizar o módulo |
| `can_edit` | Editar dados |
| `can_delete` | Excluir registros |
| `can_import` | Importar dados |
| `can_export` | Exportar relatórios |
| `can_close_cycle` | Fechar ciclos |
| `can_reopen_cycle` | Reabrir ciclos fechados |
| `can_approve` | Aprovar feedbacks |
| `can_admin` | Administrar o módulo |

**Módulos configuráveis:** `painel_executivo`, `evolucao`, `analytics`, `ciclo_atual`, `ciclos`, `auditoria`, `importacoes`, `nao_conformidades`, `elogios`, `pdis`, `calibragem`, `historico`, `logs`, `documentos_iso`, `gestao`, `configuracoes`, `analistas`, `feedback`

### 4.5 E-mails Admin Hardcoded

Os seguintes e-mails têm acesso Admin Master independente de configuração no banco:

```
brunaramos1807@gmail.com
bruna.silva@zetti.tech
admin@zetti.com.br
```

### 4.6 Whitelist de Usuários

Novos usuários devem ser pré-cadastrados na tabela `pre_registered_users` com `is_active = true`. Usuários não listados são bloqueados no login mesmo com credenciais válidas.

### 4.7 Proteção de Rotas

| Tipo de Proteção | Implementação |
|---|---|
| **Rota protegida padrão** | `<EnterpriseLayout>` → `<RouteGuard>` → verifica sessão |
| **Rota admin** | `<EnterpriseLayout requireAdmin>` → verifica `isAdmin OR isAdminMaster` |
| **Modo preview** | `window.self !== window.top` → bypass total (para editor Rocket.new) |
| **Itens adminOnly no sidebar** | `item.adminOnly && !isAdmin` → item não renderizado |

### 4.8 RLS (Row Level Security) no Supabase

As políticas RLS são definidas nas migrations. Padrão geral:
- Leitura anônima habilitada para tabelas de dados operacionais (scores, NCs, elogios)
- Escrita requer autenticação ou service role
- Tabelas administrativas (user_profiles, cargos, permissões) requerem autenticação

---

## 5. DIAGNÓSTICO DE SAÚDE DO CÓDIGO E LIMPEZA

### 5.1 Arquivos Obsoletos ou Subutilizados

| Arquivo | Status | Diagnóstico |
|---|---|---|
| `src/app/admin-config/page.tsx` | ⚠️ **Legado** | Usa `AppHeader` + `AppFooter` diretamente (sem `EnterpriseLayout`). Funcionalidade duplicada pela página `/configuracoes`. Não aparece no sidebar. |
| `src/app/suporte/page.tsx` | ⚠️ **Sem layout** | Página standalone sem `EnterpriseLayout`. Não aparece no sidebar. Conteúdo estático com FAQ hardcoded. |
| `src/app/privacidade/page.tsx` | ⚠️ **Verificar** | Página pública sem layout enterprise. Não aparece no sidebar. |
| `src/app/termos/page.tsx` | ⚠️ **Verificar** | Página pública sem layout enterprise. Não aparece no sidebar. |
| `src/app/sign-up-login/page.tsx` + `LoginScreen.tsx` | ⚠️ **Subutilizado** | Existe uma tela de login Supabase OAuth, mas o sistema usa `SystemLoginScreen` (login por e-mail/senha). Esta rota não é usada no fluxo principal. |
| `src/components/AppHeader.tsx` | ⚠️ **Legado** | Usado apenas em `admin-config/page.tsx`. Toda a aplicação usa `EnterpriseTopbar`. |
| `src/lib/mockData.ts` | ⚠️ **Parcialmente obsoleto** | Contém `MOCK_USERS`, `ANALYSTS`, `DEMO_CREDENTIALS` e `MONTHLY_TREND` hardcoded. `MOCK_USERS` ainda é importado em `admin-config`. `PILLAR_DESCRIPTIONS` é usado em `CycleDashboard`. Os arrays de analistas e scores são fallback quando Supabase não retorna dados. |
| `src/app/pdis/page.tsx` | ⚠️ **Duplicata funcional** | Funcionalidade de PDI duplicada com `/feedback/pdi`. Ambas gerenciam PDIs mas com interfaces diferentes. Não aparece no sidebar principal. |
| `src/app/calibragem/page.tsx` | ⚠️ **Incompleto** | Página de calibragem sem persistência de dados calibrados. Campos de calibração manual não salvam. Não aparece no sidebar. |
| `docs/dossie-tecnico.txt` + `docs/dossie-tecnico.json` | ℹ️ **Redundante** | Documentação técnica anterior em múltiplos formatos. Com este documento, podem ser arquivados. |

### 5.2 Lógicas Redundantes e Fragmentação Excessiva

| Problema | Localização | Impacto |
|---|---|---|
| **Dupla camada de autenticação** | `AuthContext` + `SystemAuthContext` | Complexidade desnecessária. `AuthContext` gerencia OAuth Supabase, `SystemAuthContext` gerencia login por senha. Ambos coexistem mas raramente interagem. Pode causar confusão em manutenção. |
| **Dados hardcoded em Auditoria** | `src/app/auditoria/page.tsx` (linha 8-28) | 18 analistas fixos no código (`EMBEDDED_ANALYSTS`). Não reflete adições/remoções de analistas no banco. Deve ser substituído por query à tabela `analistas`. |
| **localStorage como fonte primária em Histórico** | `src/app/historico/page.tsx` | Ciclos históricos (Jan-Mar/2026) são hardcoded e armazenados em `localStorage`. Dados podem ser perdidos ao limpar o browser. |
| **Dupla fonte de PDIs** | `feedback/pdi/page.tsx` lê `feedback_pdi` + `pdi_records` | Dois sistemas de PDI paralelos causam inconsistência. Dados de PDI existem em `pdi_records` (módulo `/pdis`) e `feedback_pdi` (módulo `/feedback/pdi`). |
| **fetchCycleScores com duplo fallback** | `dataService.ts` | Tenta Supabase → fallback localStorage → fallback mockData. Três camadas de fallback aumentam complexidade de debug. |
| **Entradas manuais em Evolução** | `evolucao-geral/page.tsx` | Entradas manuais salvas em `localStorage` E tentam salvar em Supabase (`cycle_scores` ou `manual_evaluations`). A tabela `manual_evaluations` pode não existir, causando erros silenciosos. |
| **CycleDashboard usa AppHeader legado** | `cycle-dashboard/components/CycleDashboard.tsx` linha 8 | Importa `AppHeader` e `AppFooter` mas está dentro de `EnterpriseLayout` que já tem topbar e footer. Pode causar duplicação visual. |
| **Fragmentação excessiva em cycle-dashboard** | 10 componentes para uma página | `CycleKPICards`, `ExecutiveInsights`, `PillarMatrix`, `NonConformitiesGuide`, `AnalystDrilldown`, `CycleFilters`, `CompareAnalystsModal`, `AnalystRadarChart`, `SquadRankingChart`, `CycleDashboard`, `PillarDrilldownModal`, `SquadRankingChartInner` — 12 arquivos para uma única página. |
| **Mapeamento de NC legado** | `nao-conformidades/page.tsx` + `HomeExecutiveView.tsx` | Dois sistemas de normalização de nomes de NC (`NC_NAME_MAP` e `normalizeNCType`). Lógica duplicada. |

### 5.3 Sugestões de Limpeza Segura

As seguintes ações podem ser executadas com **baixo risco** de quebrar funcionalidades:

#### 🟢 SEGURO — Pode apagar/consolidar agora

| Ação | Arquivo(s) | Justificativa |
|---|---|---|
| **Arquivar documentação antiga** | `docs/dossie-tecnico.txt`, `docs/dossie-tecnico.json` | Substituídos por este documento |
| **Remover `admin-config/page.tsx`** | `src/app/admin-config/page.tsx` | Funcionalidade coberta por `/configuracoes`. Verificar se há links diretos antes de remover. |
| **Remover `AppHeader.tsx`** | `src/components/AppHeader.tsx` | Usado apenas em `admin-config`. Ao remover `admin-config`, este componente fica órfão. |
| **Remover `sign-up-login/`** | `src/app/sign-up-login/` (pasta completa) | Fluxo de login não utilizado no sistema atual. |

#### 🟡 MODERADO — Requer atenção antes de executar

| Ação | Arquivo(s) | Cuidado |
|---|---|---|
| **Consolidar PDIs** | `src/app/pdis/page.tsx` | Verificar se há dados em `pdi_records` que não estão em `feedback_pdi`. Migrar dados antes de remover. |
| **Substituir hardcode em Auditoria** | `src/app/auditoria/page.tsx` | Substituir `EMBEDDED_ANALYSTS` por query à tabela `analistas`. Testar com dados reais. |
| **Limpar mockData.ts** | `src/lib/mockData.ts` | Remover `MOCK_USERS`, `ANALYSTS`, `DEMO_CREDENTIALS`, `MONTHLY_TREND`. Manter apenas `PILLAR_DESCRIPTIONS` e `getScoreColor`. Verificar todos os imports antes. |
| **Migrar Histórico para Supabase** | `src/app/historico/page.tsx` | Substituir `localStorage` por tabela `import_cycles` com dados reais. |

#### 🔴 REQUER PLANEJAMENTO — Impacto alto

| Ação | Arquivo(s) | Risco |
|---|---|---|
| **Unificar AuthContext** | `AuthContext.tsx` + `SystemAuthContext.tsx` | Mudança arquitetural profunda. Risco de quebrar fluxo de login. |
| **Consolidar fetchCycleScores** | `dataService.ts` | Remover fallback localStorage pode quebrar funcionalidade offline. |
| **Refatorar CycleDashboard** | `src/app/cycle-dashboard/components/` | 12 componentes — consolidar em 5-6 reduz complexidade mas exige reteste completo. |

### 5.4 Tabelas Supabase Identificadas

Com base na análise do código, as seguintes tabelas são utilizadas:

| Tabela | Módulos que Leem | Módulos que Escrevem |
|---|---|---|
| `cycle_scores` | Painel, Evolução, Analytics, Ciclo Atual, Ciclos, QA-IEPC, Gestão, Analistas, Calibragem | Importações, API receber-avaliacao |
| `nc_records` | NCs, Painel, Evolução, Ciclo Atual, QA-IEPC, Gestão, Analistas | Importações, API receber-avaliacao |
| `elogios` | Mural, Painel, Ciclo Atual, Analistas | Importações, API receber-avaliacao |
| `import_cycles` | Ciclos, Importações, Admin Diagnóstico | Importações, API receber-avaliacao |
| `analistas` | Gestão, Analistas, Feedback, PDI, Auditoria (não usa) | Analistas (CRUD), API receber-avaliacao |
| `feedbacks` | Feedback (lista), Feedback [id] | Feedback Manual, Feedback Import, API receber-avaliacao |
| `feedback_atendimentos` | Feedback [id] | Feedback Manual, API receber-avaliacao |
| `feedback_coaching` | Feedback [id] | Feedback Manual, API receber-avaliacao |
| `feedback_pdi` | Feedback PDI | Feedback Manual, API receber-avaliacao |
| `feedback_historico` | Feedback Histórico | API receber-avaliacao |
| `pdi_records` | PDIs, Gestão, Analistas | PDIs (CRUD) |
| `advertencias` | Advertências | Advertências (CRUD) |
| `documents` | Documentos | Documentos (upload/delete) |
| `user_profiles` | SystemAuthContext, Configurações, Admin Diagnóstico | Configurações, API sync-auth-users |
| `user_permissions` | SystemAuthContext, Configurações | Configurações |
| `cargos` | SystemAuthContext, Configurações | Configurações |
| `pre_registered_users` | AuthContext, SystemAuthContext | Configurações |
| `app_settings` | Ciclo Atual, Ciclos, Auditoria | Configurações |
| `import_logs` | Admin Diagnóstico | supabaseDataService (automático) |
| `admin_logs` | Admin Diagnóstico | dataService (automático) |
| `permission_logs` | Admin Diagnóstico, Configurações | Configurações |
| `cycle_closure_history` | Ciclos | Ciclos (fechar/reabrir) |

---

## APÊNDICE — VARIÁVEIS DE AMBIENTE

| Variável | Status | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configurada | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Configurada | Chave anônima Supabase (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Não configurada | Necessária para `/api/receber-avaliacao` (bypassa RLS) |
| `INTEGRATION_API_TOKEN` | ✅ Configurada | Token Bearer para autenticar o Lovable |
| `GEMINI_API_KEY` | ✅ Configurada | Chat IA no Painel Executivo |
| `OPENAI_API_KEY` | ❌ Placeholder | Não configurada |
| `ANTHROPIC_API_KEY` | ❌ Placeholder | Não configurada |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | ❌ Placeholder | Google Analytics não ativo |
| `NEXT_PUBLIC_SITE_URL` | ✅ Configurada | `https://qualivisao.tec.br` |

---

*Documento gerado automaticamente por análise estática do código-fonte. Versão 1.0 — 26/05/2026.*

---

## 6. REGISTRO DE ALTERAÇÕES — AJUSTES FINAIS PDI ENTERPRISE (27/05/2026)

> **Versão:** 2.0  
> **Data:** 27/05/2026  
> **Responsável:** Área de Qualidade — Zetti Tech  
> **Classificação:** Documento Interno — Conformidade ISO 9001

### 6.1 Módulo PDI — Reestruturação Enterprise

#### 6.1.1 Nova Estrutura Multi-Objetivo

O modal de criação/edição de PDI foi reestruturado para suportar **múltiplos objetivos por ciclo**, substituindo o modelo anterior de objetivo único.

**Estrutura de cada bloco de objetivo:**

| Campo | Tipo | Descrição |
|---|---|---|
| `categoria` | string | Classificação do objetivo (Técnico, Comportamental, Operacional, etc.) |
| `objetivo` | string | Descrição do objetivo a ser alcançado |
| `acao_esperada` | string | Ação concreta esperada do analista |
| `resultado_esperado` | string | Resultado mensurável esperado ao final do ciclo |
| `status` | enum | `cumprido` / `parcial` / `nao_cumprido` |
| `observacao_coordenador` | string | Observação do coordenador sobre este objetivo específico |

**Armazenamento:** Os objetivos são persistidos no campo `enterprise_objectives` (JSONB) da tabela `pdi_records` e `feedback_pdi`.

#### 6.1.2 Progresso Automático

O progresso do PDI é calculado **automaticamente** com base nos status dos objetivos, eliminando o campo manual de progresso:

```
Cumprido     = 100% de contribuição
Parcial      = 50% de contribuição
Não Cumprido = 0% de contribuição

Progresso Total = Soma das contribuições / Número de objetivos
```

**Exemplo:** 3 objetivos (1 Cumprido + 1 Parcial + 1 Não Cumprido) = (100 + 50 + 0) / 3 = **50%**

#### 6.1.3 Exclusão de PDI com Confirmação

Adicionado modal de confirmação para exclusão de PDI com:
- Exibição do nome do analista para confirmação visual
- Registro em log de auditoria via `deletePDIRecord`
- Soft delete (marcação como excluído, não remoção física)
- Botão de exclusão destacado em vermelho para prevenção de erros

#### 6.1.4 Mensagem Evolutiva Automática

A mensagem evolutiva pode ser:
- **Manual:** preenchida diretamente pelo coordenador
- **Automática:** gerada pelo sistema se o campo estiver vazio ao salvar

A geração automática utiliza os seguintes dados do analista:
- Nota QA do último ciclo
- IEPC (Índice de Eficiência e Performance do Ciclo)
- Total de Não Conformidades (NCs)
- Total de Elogios
- Aderência ao ciclo

O texto gerado segue padrão corporativo/coaching com linguagem profissional.

### 6.2 Módulo Feedback — Bloco PDI Atualizado

O bloco PDI dentro do módulo de Feedback (`/feedback/pdi`) foi atualizado para seguir **exatamente a mesma estrutura enterprise** do módulo PDI principal:

- Suporte a múltiplos objetivos por ciclo
- Botão "Adicionar Objetivo" para inclusão dinâmica de blocos
- Cada objetivo com: Categoria, Objetivo, Ação Esperada, Resultado Esperado, Status, Observação do Coordenador
- Progresso calculado automaticamente
- Mensagem evolutiva com geração automática baseada em QA/IEPC/NCs/Elogios
- Exibição de resumo dos objetivos nos cards da listagem

### 6.3 Módulo Gestão de Pessoas — Fotos dos Analistas

Corrigida a exibição de fotos dos analistas no módulo **Desenvolvimento Humano → Gestão de Pessoas**:

**Ordem de resolução da foto:**
1. `analistas.avatar_url` — campo direto na tabela de analistas
2. `analistas.foto_url` — campo alternativo na tabela de analistas
3. `user_profiles.avatar_url` — buscado por correspondência de email
4. `user_profiles.avatar_url` — buscado por correspondência de nome completo
5. **Fallback:** Iniciais do nome em gradiente azul

A foto é exibida em:
- Cards da listagem principal (grid de analistas)
- Drawer de detalhes do analista (painel lateral)

### 6.4 Impacto nas Tabelas Supabase

| Tabela | Alteração | Campo |
|---|---|---|
| `pdi_records` | Novo campo JSONB | `enterprise_objectives` — array de ObjectiveBlock |
| `pdi_records` | Novo campo | `mensagem_evolutiva` — texto gerado manual ou automaticamente |
| `pdi_records` | Novo campo | `progresso` — calculado automaticamente (não manual) |
| `feedback_pdi` | Novo campo JSONB | `enterprise_objectives` — mesma estrutura |
| `feedback_pdi` | Novo campo | `mensagem_evolutiva` |
| `analistas` | Leitura | `avatar_url`, `foto_url` — para exibição de fotos |
| `user_profiles` | Leitura | `avatar_url` — fallback para fotos |

### 6.5 Arquivos Modificados

| Arquivo | Tipo de Alteração |
|---|---|
| `src/app/pdis/page.tsx` | Reestruturação completa do modal PDI — multi-objetivo enterprise |
| `src/app/feedback/pdi/page.tsx` | Atualização do bloco PDI para estrutura enterprise |
| `src/app/gestao/page.tsx` | Correção da exibição de fotos dos analistas |

### 6.6 Conformidade ISO 9001

As alterações realizadas estão alinhadas com os seguintes requisitos da norma ISO 9001:2015:

| Cláusula ISO 9001 | Requisito | Implementação |
|---|---|---|
| **7.2** | Competência | PDI enterprise com múltiplos objetivos estruturados por categoria |
| **7.3** | Conscientização | Mensagem evolutiva corporativa gerada por dados reais de performance |
| **9.1.3** | Análise e avaliação | Progresso automático baseado em status objetivos — elimina subjetividade |
| **10.3** | Melhoria contínua | Ciclo de PDI com rastreabilidade completa (timeline, auditoria, soft delete) |
| **6.1** | Ações para abordar riscos | Exclusão com confirmação e log de auditoria — controle de integridade |

---

*Documento atualizado em 27/05/2026 — Versão 2.0*