# AUDITORIA COMPLETA — QUALIVISÃO
**Data:** 2026-06-18  
**Escopo:** Mapeamento de queries Supabase + Fluxo de dados por tela + Issues P0

---

## PARTE 1 — MAPEAMENTO DE QUERIES SUPABASE

### Legenda de Classificação
| Classificação | Critério |
|---|---|
| ✅ SEGURA | Filtro por user_id ou squad do usuário logado; RLS ativa |
| 🟠 RISCO MODERADO | Sem filtro de squad/user, mas dados não críticos ou leitura pública |
| 🔴 RISCO ALTO | Sem filtro algum; leitura/escrita irrestrita; dados sensíveis |

---

### 1.1 — `src/lib/services/supabaseDataService.ts`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 1 | `writeImportLog` | `INSERT import_logs` | ❌ | ❌ (actor_email) | ❌ | 🟠 RISCO MODERADO — log interno, sem dados sensíveis |
| 2 | `importCycleDataToSupabase` | `SELECT import_cycles WHERE periodo = ?` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — leitura de ciclo por período |
| 3 | `importCycleDataToSupabase` | `INSERT import_cycles` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — escrita irrestrita sem user_id |
| 4 | `importCycleDataToSupabase` | `UPSERT cycle_scores ON CONFLICT (periodo, analista, squad)` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — upsert em massa sem filtro de escopo |
| 5 | `importCycleDataToSupabase` | `INSERT nc_records` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — inserção irrestrita |
| 6 | `importCycleDataToSupabase` | `UPSERT elogios ON CONFLICT` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — dados não críticos |
| 7 | `importCycleDataToSupabase` | `RPC refresh_cycle_summary(p_periodo)` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — função de agregação |
| 8 | `importCycleDataToSupabase` | `UPSERT cycle_summaries ON CONFLICT (periodo)` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO |
| 9 | `fetchCycleScoresFromSupabase` | `SELECT * FROM cycle_scores [WHERE periodo = ?]` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — SELECT * sem filtro de squad/user |
| 10 | `fetchNCRecordsFromSupabase` | `SELECT * FROM nc_records [WHERE periodo = ?]` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — SELECT * sem filtro |
| 11 | `fetchElogiosFromSupabase` | `SELECT * FROM elogios [WHERE periodo = ?]` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — dados de elogios |
| 12 | `fetchAllPeriodosFromSupabase` | `SELECT periodo FROM import_cycles` + `SELECT periodo FROM cycle_scores` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — metadados |
| 13 | `isCycleClosedInSupabase` | `SELECT is_closed FROM import_cycles WHERE periodo = ?` | ❌ | ❌ | ❌ | ✅ SEGURA — leitura de flag, sem dados pessoais |
| 14 | `toggleElogioDestaqueInSupabase` | `UPDATE elogios SET destaque WHERE id = ?` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — update por ID |
| 15 | `deletePeriodDataFromSupabase` | `DELETE cycle_scores/nc_records/elogios/pdi_records/cycle_summaries/import_cycles WHERE periodo = ?` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — deleção em cascata sem verificação de role |
| 16 | `clearAllDataFromSupabase` | `DELETE * FROM cycle_scores/nc_records/elogios/pdi_records/import_logs/import_cycles/cycle_summaries` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — WIPE TOTAL sem verificação de admin |
| 17 | `fetchImportLogs` | `SELECT * FROM import_logs [WHERE periodo = ?] LIMIT 100` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — logs internos |
| 18 | `getActiveCycle` | `SELECT value FROM app_settings WHERE key = 'active_cycle'` | ❌ | ❌ | ❌ | ✅ SEGURA — configuração global |
| 19 | `setActiveCycle` | `UPSERT app_settings ON CONFLICT (key)` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — deveria exigir role Admin |
| 20 | `createNewCycle` | `UPSERT import_cycles ON CONFLICT (periodo)` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO |

---

### 1.2 — `src/lib/rbac.ts`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 21 | `loadUserPermissions` | `SELECT * FROM user_permissions WHERE user_profile_id = ? AND module_name = ?` | ❌ | ✅ (user_profile_id) | ❌ | ✅ SEGURA — filtrado por user |
| 22 | `loadUserScope` | `SELECT * FROM user_scope_permissions WHERE user_id = ?` | ❌ | ✅ (user_id) | ❌ | ✅ SEGURA — filtrado por user |

---

### 1.3 — `src/contexts/AuthContext.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 23 | `isEmailWhitelisted` | `SELECT id, is_active FROM pre_registered_users WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA — filtrado por email |
| 24 | `getUserProfile` | `SELECT * FROM user_profiles WHERE id = ?` | ❌ | ✅ (user.id) | ❌ | ✅ SEGURA |

---

### 1.4 — `src/contexts/SystemAuthContext.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 25 | `fetchFullUserProfile` | `SELECT role, squad, squads, equipes, cargo_id, full_name FROM user_profiles WHERE id = ?` | ❌ | ✅ (userId) | ❌ | ✅ SEGURA |
| 26 | `fetchFullUserProfile` | `SELECT role, squad, squads, equipes, cargo_id, full_name FROM user_profiles WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |
| 27 | `fetchFullUserProfile` | `SELECT role, squad, squads, cargo_id, full_name, is_active FROM pre_registered_users WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |
| 28 | `fetchFullUserProfile` | `SELECT nome, is_admin_master FROM cargos WHERE id = ?` | ❌ | ❌ | ❌ | ✅ SEGURA — lookup de cargo |
| 29 | `fetchModulePermissions` | `SELECT * FROM user_permissions WHERE user_profile_id = ?` | ❌ | ✅ (userId) | ❌ | ✅ SEGURA |
| 30 | `checkWhitelist` | `SELECT id, is_active FROM pre_registered_users WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |
| 31 | `checkWhitelist` | `SELECT id, is_active FROM user_profiles WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |
| 32 | `login` | `SELECT id, is_active FROM pre_registered_users WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |
| 33 | `login` | `supabase.auth.signInWithPassword` | — | — | — | ✅ SEGURA |
| 34 | `init` (useEffect) | `SELECT role, squad, squads, cargo_id FROM pre_registered_users WHERE email = ?` | ❌ | ❌ (email) | ❌ | ✅ SEGURA |

---

### 1.5 — `src/app/feedback/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 35 | `fetchFeedbacks` | `SELECT id, ciclo, qa_score, ... FROM feedbacks [WHERE status = ?] [WHERE ciclo = ?] JOIN analistas` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — todos os feedbacks sem filtro de squad/user |
| 36 | `handleDelete` | `DELETE FROM feedbacks WHERE id = ?` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — qualquer usuário pode deletar qualquer feedback |
| 37 | `handleBulkDelete` | `DELETE FROM feedbacks WHERE id IN (...)` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO |
| 38 | `handleStatusChange` | `UPDATE feedbacks SET status WHERE id = ?` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO |

---

### 1.6 — `src/app/feedback/pdi/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 39 | `loadAnalistas` | `SELECT id, nome, email, equipe FROM analistas ORDER BY nome` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — lista de analistas |
| 40 | `loadAnalistas` | `SELECT analista, nota_final_qa, iepc_total, total_ncs FROM cycle_scores ORDER BY created_at DESC` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — todos os scores sem filtro |
| 41 | `loadPdis` | `SELECT * FROM feedback_pdi JOIN analistas JOIN feedbacks ORDER BY created_at DESC` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — todos os PDIs sem filtro |
| 42 | `loadPdis` | `SELECT * FROM pdi_records ORDER BY created_at DESC` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — **DUPLICAÇÃO PDI** — lê de duas tabelas |

---

### 1.7 — `src/app/auditoria/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 43 | `loadData` | `SELECT nome, nome_completo, status FROM analistas WHERE status != 'desligado'` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO |
| 44 | `loadData` | `SELECT id, ciclo, updated_at, analistas(nome) FROM feedbacks WHERE ciclo = ?` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO |
| 45 | `loadData` | `fetchCycleScores(periodo)` → Supabase `SELECT * FROM cycle_scores WHERE periodo = ?` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — dados de todos os analistas |

---

### 1.8 — `src/app/ciclo-atual/page.tsx` (AnalystDetailModal)

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 46 | `AnalystDetailModal.load` | `SELECT * FROM feedbacks WHERE analista_id ILIKE '%nome%' LIMIT 1` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — ILIKE sem índice, sem filtro |
| 47 | `AnalystDetailModal.load` | `SELECT * FROM pdi_records WHERE analista ILIKE '%nome%' LIMIT 1` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — ILIKE sem índice |

---

### 1.9 — `src/app/evolucao-geral/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 48 | `saveEntryToSupabase` | `INSERT cycle_scores` (entrada manual) | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — inserção manual sem validação de role |
| 49 | `saveEntryToSupabase` | `INSERT manual_evaluations` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO |
| 50 | `deleteEntryFromSupabase` | `DELETE cycle_scores WHERE periodo = ? AND analista = ? AND squad = ?` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO |

---

### 1.10 — `src/app/gestao/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 51 | `loadData` (inferido) | `SELECT * FROM analistas` + `cycle_scores` + `pdi_records` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — visão completa sem filtro |

---

### 1.11 — `src/app/analistas/page.tsx`

| # | Função | Consulta | Filtro squad? | Filtro user_id? | Filtro role? | Classificação |
|---|---|---|---|---|---|---|
| 52 | `fetchAnalistas` | `SELECT * FROM analistas` | ❌ | ❌ | ❌ | 🟠 RISCO MODERADO — dados de RH |
| 53 | `upsertAnalista` | `UPSERT analistas` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO — escrita sem verificação de role |
| 54 | `deleteAnalista` | `DELETE analistas WHERE id = ?` | ❌ | ❌ | ❌ | 🔴 RISCO ALTO |

---

### RESUMO DE RISCO

| Classificação | Quantidade | Ação Recomendada |
|---|---|---|
| ✅ SEGURA | 14 | Manter |
| 🟠 RISCO MODERADO | 16 | Adicionar verificação de role no frontend |
| 🔴 RISCO ALTO | 24 | **Implementar RLS no Supabase + verificação de role** |

---

## PARTE 2 — MAPEAMENTO FUNCIONAL POR TELA

### Fluxo Padrão
```
Tela (page.tsx)
  ↓
Componente (components/)
  ↓
Hook / useEffect direto
  ↓
Service (dataService.ts / supabaseDataService.ts)
  ↓
Tabela Supabase
```

---

### TELA 1 — Painel Executivo (`/` → `src/app/page.tsx`)

**Componente principal:** `HomeExecutiveView` (2013 linhas — ⚠️ GIGANTE)

**Dados exibidos:**
- KPIs: QA médio, IEPC médio, total NCs, total elogios, total analistas
- Gráfico de tendência mensal (QA/IEPC por período)
- Ranking de analistas
- Distribuição por squad
- Pilares QA e IEPC (radar/bar)
- Distribuição de NCs por tipo
- Highlights operacionais (top performers, piores pilares)
- Chat IA integrado

**Tabelas utilizadas:**
- `cycle_scores` — scores por analista/período
- `nc_records` — não conformidades
- `elogios` — elogios
- `import_cycles` — lista de períodos disponíveis
- `app_settings` — ciclo ativo
- `feedbacks` — (via OperationalHighlights)

**Hooks utilizados:**
- `useSystemAuth` — role, squad, getTeamFilter
- `useChat` — chat IA
- `listenDataChanged` — evento de importação

**Services utilizados:**
- `fetchCycleScores(periodo?)` → `cycle_scores`
- `fetchAllPeriodos()` → `import_cycles` + `cycle_scores`
- `fetchNCRecords(periodo?)` → `nc_records`
- `fetchElogios(periodo?)` → `elogios`
- `buildAnalystsFromScores(scores)` — cálculo local
- `getActiveCycle()` → `app_settings`
- `fetchManualCycles()` → localStorage

**Filtros existentes:**
- Por período (seletor de ciclo)
- Por squad (via `getTeamFilter()` do auth)
- Busca por analista (local, client-side)

**Cálculos realizados:**
- QA médio = média de `nota_final_qa`
- IEPC médio = média de `iepc_total`
- Tendência = comparação último vs penúltimo período
- Ranking = ordenação por `nota_final_qa` DESC
- Pilares = média de p1..p5 e e1..e5
- Distribuição NC = agrupamento por `tipo_nc`

**Dependências:**
- `MONTHLY_TREND` de `mockData.ts` — ⚠️ DADOS HARDCODED como fallback
- `localStorage` via `fetchManualCycles()`

**Issues P0:**
- 🔴 Componente com 2013 linhas — refatoração urgente
- 🟠 Fallback para `MONTHLY_TREND` (mockData) quando Supabase vazio

---

### TELA 2 — Ciclo Atual (`/ciclo-atual` → `src/app/ciclo-atual/page.tsx`)

**Dados exibidos:**
- Lista de analistas do ciclo ativo com QA, IEPC, NCs
- Gráfico de distribuição QA
- Modal de detalhe por analista (NCs, elogios, feedback, PDI, histórico)

**Tabelas utilizadas:**
- `cycle_scores` — dados do ciclo
- `nc_records` — NCs por analista
- `elogios` — elogios por analista
- `feedbacks` — feedback do analista
- `pdi_records` — PDI ativo
- `app_settings` — ciclo ativo

**Hooks utilizados:**
- `useSystemAuth` — role, getTeamFilter

**Services utilizados:**
- `fetchCycleScores(periodo)` → `cycle_scores`
- `fetchAllPeriodos()` → `import_cycles`
- `fetchNCRecords()` → `nc_records`
- `fetchElogios()` → `elogios`
- `buildAnalystsFromScores(scores)` — cálculo local
- `getActiveCycle()` → `app_settings`
- Direto: `supabase.from('feedbacks').select('*').ilike(...)` — ⚠️ ILIKE sem índice
- Direto: `supabase.from('pdi_records').select('*').ilike(...)` — ⚠️ ILIKE sem índice

**Filtros existentes:**
- Por período (seletor)
- Por squad (getTeamFilter)
- Busca por nome (client-side)

**Cálculos realizados:**
- buildAnalystsFromScores: monta objeto RealAnalyst com todos os scores
- Ranking por QA DESC

**Issues P0:**
- 🔴 Queries com ILIKE sem índice em `feedbacks.analista_id` e `pdi_records.analista`

---

### TELA 3 — Evolução Geral (`/evolucao-geral` → `src/app/evolucao-geral/page.tsx`)

**Dados exibidos:**
- Gráfico de linha: evolução QA/IEPC por período
- Heatmap por squad/período
- Distribuição de NCs por tipo
- Formulário de entrada manual de dados

**Tabelas utilizadas:**
- `cycle_scores` — histórico de scores
- `nc_records` — histórico de NCs
- `cycle_summaries` — (via manual_evaluations)
- `manual_evaluations` — entradas manuais

**Services utilizados:**
- `fetchCycleScores()` → `cycle_scores`
- `fetchNCRecords()` → `nc_records`
- `fetchManualCycles()` → localStorage ⚠️
- `saveEntryToSupabase()` → `cycle_scores` ou `manual_evaluations`

**Filtros existentes:**
- Por squad (seletor)
- Por período (seletor)

**Cálculos realizados:**
- Média QA/IEPC por período
- Agrupamento por squad
- Heatmap: score → cor

**Issues P0:**
- 🔴 `fetchManualCycles()` lê de localStorage — sem persistência real
- 🔴 Inserção manual em `cycle_scores` sem validação de role
- 🟠 `MONTHLY_TREND` de mockData como fallback

---

### TELA 4 — Feedbacks (`/feedback` → `src/app/feedback/page.tsx`)

**Dados exibidos:**
- Lista de feedbacks com analista, ciclo, QA, IEPC, status
- Filtros por ciclo, status, equipe
- Ações: criar, editar, deletar, alterar status

**Tabelas utilizadas:**
- `feedbacks` — lista principal
- `analistas` — JOIN para nome/equipe/coordenador

**Services utilizados:**
- Direto: `supabase.from('feedbacks').select(...)` sem filtro de squad/user
- Direto: `supabase.from('feedbacks').delete().eq('id', id)`
- Direto: `supabase.from('feedbacks').update({status}).eq('id', id)`

**Filtros existentes:**
- Por status (server-side via `.eq('status', ...)`)
- Por ciclo (server-side via `.eq('ciclo', ...)`)
- Por equipe (client-side após fetch)
- Busca por nome (client-side)

**Issues P0:**
- 🔴 Sem filtro de squad/user — qualquer usuário vê todos os feedbacks
- 🔴 Delete sem verificação de role

---

### TELA 5 — PDI via Feedback (`/feedback/pdi` → `src/app/feedback/pdi/page.tsx`)

**Dados exibidos:**
- Lista de PDIs (combinando `feedback_pdi` + `pdi_records`)
- Formulário de criação/edição com objetivos por bloco
- Timeline histórica por analista

**Tabelas utilizadas:**
- `feedback_pdi` — PDIs vinculados a feedbacks
- `pdi_records` — PDIs standalone (tabela duplicada)
- `analistas` — lista para seleção
- `cycle_scores` — scores para enriquecer analista

**Services utilizados:**
- Direto: `supabase.from('feedback_pdi').select(...)` — sem filtro
- Direto: `supabase.from('pdi_records').select(...)` — sem filtro
- Direto: `supabase.from('analistas').select(...)` — sem filtro
- Direto: `supabase.from('cycle_scores').select(...)` — sem filtro

**Issues P0:**
- 🔴 **DUPLICAÇÃO PDI** — lê de `feedback_pdi` E `pdi_records` e combina no frontend
- 🔴 Sem filtro de squad/user em nenhuma das queries
- 🟠 Geração de mensagem evolutiva é local (não usa IA real)

---

### TELA 6 — PDIs Enterprise (`/pdis` → `src/app/pdis/page.tsx`)

**Dados exibidos:**
- Lista de PDIs com estrutura enterprise (objetivos por bloco)
- Status, progresso, timeline de eventos
- Formulário completo com seções accordion

**Tabelas utilizadas:**
- `pdi_records` — tabela principal (**DUPLICADA com feedback_pdi**)
- `cycle_scores` — para seleção de analista
- `import_cycles` — lista de períodos

**Services utilizados:**
- `fetchPDIRecords()` → `pdi_records`
- `savePDIRecord()` → INSERT `pdi_records`
- `updatePDIRecord()` → UPDATE `pdi_records`
- `deletePDIRecord()` → DELETE `pdi_records`
- `fetchPDIObjectives()` → `pdi_objectives`
- `fetchPDITimeline()` → `pdi_timeline_events`

**Issues P0:**
- 🔴 **DUPLICAÇÃO PDI** — `/pdis` usa `pdi_records`, `/feedback/pdi` usa `feedback_pdi` + `pdi_records`
- 🔴 Sem filtro de squad/user

---

### TELA 7 — Auditoria (`/auditoria` → `src/app/auditoria/page.tsx`)

**Dados exibidos:**
- Tabela de analistas com status de auditoria (pendente/em andamento/concluído)
- KPIs: total, concluídos, em andamento, pendentes
- Última atualização por analista

**Tabelas utilizadas:**
- `cycle_scores` — via `fetchCycleScores(periodo)`
- `nc_records` — via `fetchNCRecords(periodo)`
- `elogios` — via `fetchElogios(periodo)`
- `analistas` — para filtrar ativos
- `feedbacks` — para última atualização

**Cálculos realizados:**
- Status de auditoria = baseado em `avaliacoes` (contagem de scores)
- `avaliacoes === 0` → Pendente
- `avaliacoes < 3` → Em Andamento
- `avaliacoes >= 3` → Concluído

**Issues P0:**
- 🔴 **STATUS HARDCODED** — o status de auditoria é calculado localmente baseado em contagem de scores, não reflete estado real de auditoria
- 🔴 Não há tabela de auditoria real — os dados são derivados de `cycle_scores`
- 🟠 Sem persistência de estado de auditoria

---

### TELA 8 — Calibragem (`/calibragem` → `src/app/calibragem/page.tsx`)

**Dados exibidos:**
- Tabela de analistas com QA e IEPC do ciclo selecionado
- Gráfico de barras comparativo
- Status QA (Acima/Na/Abaixo da Meta)

**Tabelas utilizadas:**
- `cycle_scores` — via `fetchCycleScores()`
- `import_cycles` — via `fetchAllPeriodos()`

**Services utilizados:**
- `fetchCycleScores()` → `cycle_scores`
- `fetchAllPeriodos()` → `import_cycles`
- `buildAnalystsFromScores(scores)` — cálculo local

**Issues P0:**
- 🔴 **SEM PERSISTÊNCIA** — calibragem é apenas visualização, não há tabela de calibração
- 🔴 Não existe campo `calibratedQa`/`calibratedIepc` sendo salvo em lugar algum
- 🔴 A interface mostra campos de calibração mas não os persiste

---

### TELA 9 — Não Conformidades (`/nao-conformidades` → `src/app/nao-conformidades/page.tsx`)

**Dados exibidos:**
- Tabela de NCs com tipo, analista, squad, severidade
- Gráficos: distribuição por tipo, por squad, evolução temporal
- Modal de detalhe por NC
- Badge de reincidência

**Tabelas utilizadas:**
- `nc_records` — via `fetchNCRecords()`
- `import_cycles` — via `fetchAllPeriodos()`

**Filtros existentes:**
- Por período, squad, tipo NC, analista, coordenador (todos client-side)
- Filtro de reincidência (calculado localmente)

**Cálculos realizados:**
- Reincidência = analista com mesmo tipo_nc >= 2 vezes
- Distribuição por tipo = agrupamento local

**Issues P0:**
- 🟠 Todos os filtros são client-side — performance ruim com muitos dados

---

### TELA 10 — Analistas (`/analistas` → `src/app/analistas/page.tsx`)

**Dados exibidos:**
- Lista de analistas com foto, cargo, nível, squad, status
- Perfil 360° com scores históricos, NCs, elogios, PDIs
- Formulário de criação/edição

**Tabelas utilizadas:**
- `analistas` — CRUD completo
- `cycle_scores` — histórico de performance
- `nc_records` — NCs do analista
- `elogios` — elogios do analista
- `pdi_records` — PDIs do analista

**Services utilizados:**
- `fetchAnalistas()` → `analistas`
- `upsertAnalista()` → UPSERT `analistas`
- `deleteAnalista()` → DELETE `analistas`
- `fetchCycleScores()` → `cycle_scores`
- `fetchNCRecords()` → `nc_records`
- `fetchElogios()` → `elogios`
- `fetchPDIRecords()` → `pdi_records`

**Issues P0:**
- 🟠 Perfil 360° carrega TODOS os dados e filtra client-side

---

### TELA 11 — Gestão (`/gestao` → `src/app/gestao/page.tsx`)

**Dados exibidos:**
- Visão gerencial de analistas com performance, risco, PDI ativo
- Drawer de detalhe com gráfico de evolução
- Aniversariantes do mês

**Tabelas utilizadas:**
- `analistas` — dados de RH
- `cycle_scores` — performance histórica
- `pdi_records` — PDI ativo

**Issues P0:**
- 🟠 Carrega todos os dados sem filtro de squad

---

### TELA 12 — Mural de Elogios (`/mural-elogios`)

**Dados exibidos:** Elogios em formato de cards/mural

**Tabelas utilizadas:** `elogios`

---

### TELA 13 — Histórico (`/historico`)

**Dados exibidos:** Histórico de ciclos fechados

**Tabelas utilizadas:** `import_cycles`, `cycle_summaries`, `cycle_scores`

---

### TELA 14 — Importações (`/importacoes`)

**Dados exibidos:** Log de importações, status de ciclos

**Tabelas utilizadas:** `import_logs`, `import_cycles`

---

### TELA 15 — Configurações (`/configuracoes`)

**Dados exibidos:** Configurações do sistema, ciclo ativo

**Tabelas utilizadas:** `app_settings`, `import_cycles`

---

### TELA 16 — Admin Config (`/admin-config`)

**Dados exibidos:** Usuários, permissões, pré-cadastros

**Tabelas utilizadas:** `user_profiles`, `pre_registered_users`, `user_permissions`, `cargos`

---

## PARTE 3 — ISSUES P0 CONFIRMADOS

### 🔴 P0-1: AUTH DUPLICADO

**Problema:** Existem dois sistemas de autenticação paralelos e ativos:

| Sistema | Arquivo | Mecanismo | Estado |
|---|---|---|---|
| `AuthContext` | `src/contexts/AuthContext.tsx` | Supabase Auth puro | Ativo |
| `SystemAuthContext` | `src/contexts/SystemAuthContext.tsx` | Supabase Auth + localStorage fallback | Ativo |

**Impacto:**
- `AuthContext` expõe `useAuth` — usado em alguns componentes
- `SystemAuthContext` expõe `useSystemAuth` — usado na maioria dos componentes
- Dois providers no `layout.tsx` — risco de estado inconsistente
- `authSystem.ts` mantém usuários em localStorage com hash SHA-256 — sistema legado

**Solução recomendada:**
1. Manter apenas `SystemAuthContext` (mais completo)
2. Remover `AuthContext` e `authSystem.ts`
3. Migrar todos os `useAuth` para `useSystemAuth`

---

### 🔴 P0-2: PDI DUPLICADO

**Problema:** PDIs são armazenados em DUAS tabelas diferentes:

| Tabela | Tela que usa | Origem |
|---|---|---|
| `feedback_pdi` | `/feedback/pdi` | Vinculado a feedback |
| `pdi_records` | `/pdis` e `/feedback/pdi` | Standalone enterprise |

**Impacto:**
- `/feedback/pdi` combina as duas tabelas no frontend (linhas 390-450 do arquivo)
- Dados duplicados ou inconsistentes entre as tabelas
- Sem sincronização entre as duas fontes
- Relatórios e KPIs podem contar PDIs em duplicidade

**Solução recomendada:**
1. Definir `pdi_records` como tabela oficial
2. Migrar dados de `feedback_pdi` para `pdi_records`
3. Remover `feedback_pdi` ou torná-la uma view

---

### 🔴 P0-3: AUDITORIA COM DADOS HARDCODED/DERIVADOS

**Problema:** A tela `/auditoria` não tem tabela própria. O status de auditoria é calculado localmente:

```typescript
// src/app/auditoria/page.tsx
function getAuditStatus(avaliacoes: number) {
  if (avaliacoes === 0) return { status: 'pendente' };
  if (avaliacoes < 3) return { status: 'em_andamento' };
  return { status: 'concluido' };
}
```

**Impacto:**
- Status não persiste — recalculado a cada carregamento
- Não reflete ações reais de auditoria (quem auditou, quando, observações)
- Sem histórico de auditoria
- Sem atribuição de auditor

**Solução recomendada:**
1. Criar tabela `audit_records` com: `analista_id`, `periodo`, `auditor_id`, `status`, `observacoes`, `data_auditoria`
2. Migrar lógica de status para a tabela
3. Implementar CRUD real de auditoria

---

### 🔴 P0-4: CALIBRAGEM SEM PERSISTÊNCIA

**Problema:** A tela `/calibragem` tem campos `calibratedQa` e `calibratedIepc` na interface `CalibrationEntry` mas **nunca os salva**:

```typescript
// src/app/calibragem/page.tsx
interface CalibrationEntry {
  analista: string;
  squad: string;
  periodo: string;
  qa: number;
  iepc: number;
  calibratedQa?: number;   // ← nunca salvo
  calibratedIepc?: number; // ← nunca salvo
  justificativa?: string;  // ← nunca salvo
}
```

**Impacto:**
- Qualquer calibração feita é perdida ao recarregar a página
- Sem histórico de calibrações
- Sem rastreabilidade de quem calibrou o quê

**Solução recomendada:**
1. Criar tabela `calibration_records` com: `analista`, `squad`, `periodo`, `qa_original`, `qa_calibrado`, `iepc_original`, `iepc_calibrado`, `justificativa`, `calibrado_por`, `calibrado_em`
2. Implementar save/load na tela

---

## PARTE 4 — ISSUES P1/P2 IDENTIFICADOS

### 🟠 P1-1: HomeExecutiveView com 2013 linhas
- Arquivo único com toda a lógica do painel executivo
- Dificulta manutenção e testes
- Recomendação: extrair em 6-8 componentes menores

### 🟠 P1-2: localStorage excessivo
- `dataService.ts` usa 8 chaves de localStorage como cache/fallback
- `authSystem.ts` armazena usuários e sessão em localStorage
- `evolucao-geral` usa localStorage para entradas manuais
- Risco: dados desincronizados com Supabase

### 🟠 P1-3: Fluxos NC duplicados
- NCs são contadas em `cycle_scores.total_ncs` (agregado) E em `nc_records` (detalhado)
- Inconsistências possíveis entre as duas fontes

### 🟡 P2-1: Código morto
- `src/lib/mockData.ts` — `MONTHLY_TREND` ainda referenciado em `evolucao-geral`
- `src/lib/authSystem.ts` — sistema legado de auth por localStorage

### 🟡 P2-2: Páginas com status incerto
- `/qa-iepc` — não mapeada nesta auditoria
- `/admin-diagnostico` — não mapeada
- `/cycle-dashboard` — não mapeada (componentes presentes)
- `/feedback/historico` — não mapeada
- `/feedback/people-analytics` — não mapeada

---

## PARTE 5 — RECOMENDAÇÕES PRIORITÁRIAS

### Sprint 1 — Crítico (P0)
1. **Consolidar auth**: remover `AuthContext`, manter apenas `SystemAuthContext`
2. **Consolidar PDI**: unificar em `pdi_records`, deprecar `feedback_pdi`
3. **Auditoria real**: criar tabela `audit_records` com persistência
4. **Calibragem**: criar tabela `calibration_records` e implementar save

### Sprint 2 — Segurança
5. **RLS nas tabelas críticas**: `cycle_scores`, `nc_records`, `feedbacks`, `pdi_records`
6. **Verificação de role antes de writes**: `clearAllDataFromSupabase`, `deletePeriodData`, `upsertAnalista`
7. **Remover ILIKE sem índice**: substituir por FK real em `feedbacks.analista_id`

### Sprint 3 — Qualidade
8. **Refatorar HomeExecutiveView**: extrair componentes
9. **Eliminar localStorage como fonte primária**: migrar `fetchManualCycles` para Supabase
10. **Centralizar filtros server-side**: mover filtros de squad/período para queries Supabase

---

*Documento gerado automaticamente via auditoria de código — QualiVisão v2026*
