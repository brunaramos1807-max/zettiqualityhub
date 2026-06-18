# Auditoria 1 — Mapa de Fontes de Dados por Tela

**Versão:** 1.0  
**Data:** 2026-06-18  
**Escopo:** Todas as telas do QualiVisão — leitura e gravação de dados  
**Objetivo:** Determinar a verdadeira fonte de dados do sistema por tela

---

## 1. Arquitetura de Dados — Visão Geral

O QualiVisão opera com **duas camadas de persistência**:

| Camada | Tecnologia | Papel Atual |
|--------|-----------|-------------|
| **Supabase** | PostgreSQL + RLS | Fonte primária de verdade (single source of truth) |
| **localStorage** | Browser Storage | Fallback offline + cache de ciclos manuais |

### Hierarquia de Prioridade (definida em `dataService.ts`)

```
1. Supabase (tentativa primária)
   ↓ se erro/indisponível
2. localStorage (fallback)
```

**Exceção crítica:** `closeCycle()`, `fetchManualCycles()`, `fetchUserProfiles()` e `zetti_import_records` operam **exclusivamente em localStorage** — sem persistência Supabase.

---

## 2. Tabela Mestre — Fonte de Dados por Tela

| Tela | Rota | Lê Supabase? | Lê localStorage? | Fonte Final | Observações |
|------|------|:---:|:---:|-------------|-------------|
| **Home / Painel Executivo** | `/` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchNCRecords`, `fetchElogios`, `getActiveCycle` via `dataService` |
| **Dashboard do Ciclo** | `/cycle-dashboard` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchAllPeriodos`, `getActiveCycle`, `fetchNCRecords`, `fetchElogios` |
| **Ciclo Atual** | `/ciclo-atual` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchAllPeriodos` |
| **Evolução Geral** | `/evolucao-geral` | ✅ Sim | ✅ Fallback + Manual | **Supabase + localStorage** | Scores via Supabase; entradas manuais (`zetti_manual_entries`) exclusivamente em localStorage |
| **QA & IEPC 360°** | `/qa-iepc` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchNCRecords`, `fetchElogios` |
| **Não Conformidades** | `/nao-conformidades` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchNCRecords`, `fetchAllPeriodos` |
| **Auditoria** | `/auditoria` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchNCRecords`, `fetchElogios` + `analistas` + `feedbacks` direto via `createClient` |
| **Calibragem** | `/calibragem` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchCycleScores`, `fetchAllPeriodos` — calibrações editadas **nunca persistidas** |
| **Feedback (lista)** | `/feedback` | ✅ Sim | ❌ Não | **Supabase** | Query direta `feedbacks` + join `analistas` via `createClient` |
| **Feedback — Detalhe** | `/feedback/[id]` | ✅ Sim | ❌ Não | **Supabase** | `feedbacks`, `analistas`, `pdi_records` via `createClient` |
| **Feedback — Histórico** | `/feedback/historico` | ✅ Sim | ❌ Não | **Supabase** | `feedback_historico` + join `analistas` via `createClient` |
| **Feedback — PDI** | `/feedback/pdi` | ✅ Sim | ❌ Não | **Supabase** | `pdi_records`, `feedbacks`, `analistas` via `createClient` |
| **Feedback — Importação** | `/feedback/import` | ✅ Sim | ❌ Não | **Supabase** | POST `/api/feedbacks/import` → `feedbacks` + `feedback_historico` |
| **Feedback — Manual** | `/feedback/manual` | ✅ Sim | ❌ Não | **Supabase** | `feedbacks`, `analistas` via `createClient` |
| **Feedback — Público** | `/feedback/public/[token]` | ✅ Sim | ❌ Não | **Supabase** | `feedbacks` por `public_token` via `createClient` |
| **Feedback — People Analytics** | `/feedback/people-analytics` | ✅ Sim | ❌ Não | **Supabase** | `feedbacks`, `feedback_historico`, `analistas` via `createClient` |
| **PDIs** | `/pdis` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchPDIRecords`, `fetchPDIObjectives`, `fetchPDITimeline`, `fetchCycleScores` |
| **Gestão de Pessoas** | `/gestao` | ✅ Sim | ❌ Não | **Supabase** | `analistas` + `cycle_scores` + `pdi_records` via `createClient` |
| **Analistas** | `/analistas` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchAnalistas`, `fetchCycleScores`, `fetchNCRecords`, `fetchElogios`, `fetchPDIRecords` |
| **Histórico de Ciclos** | `/historico` | ❌ Não | ✅ Sim | **localStorage** | `fetchManualCycles` → `zetti_manual_cycles` exclusivamente em localStorage |
| **Importações** | `/importacoes` | ✅ Sim | ✅ Sim | **Ambos** | `import_cycles` via Supabase; `zetti_import_records` via localStorage (lista de imports) |
| **Configurações** | `/configuracoes` | ✅ Sim | ❌ Não | **Supabase** | `user_profiles`, `cargos`, `permission_modules`, `user_permissions`, `permission_logs` via `createClient` |
| **Ciclos** | `/ciclos` | ✅ Sim | ✅ Fallback | **Supabase** | `import_cycles`, `cycle_scores` via `createClient` |
| **Advertências** | `/advertencias` | ✅ Sim | ❌ Não | **Supabase** | `advertencias` + join `analistas` via `createClient` |
| **Mural de Elogios** | `/mural-elogios` | ✅ Sim | ✅ Fallback | **Supabase** | `fetchElogios` via `dataService` |
| **Admin — Diagnóstico** | `/admin-diagnostico` | ✅ Sim | ❌ Não | **Supabase** | Múltiplas tabelas de diagnóstico via `createClient` |
| **Admin — Config** | `/admin-config` | ✅ Sim | ❌ Não | **Supabase** | `app_settings`, `import_cycles` via `createClient` |
| **Documentos** | `/documentos` | ❌ Não | ❌ Não | **Estático** | Conteúdo hardcoded — sem fonte de dados dinâmica |
| **Suporte** | `/suporte` | ❌ Não | ❌ Não | **Estático** | Conteúdo hardcoded |
| **Privacidade / Termos** | `/privacidade`, `/termos` | ❌ Não | ❌ Não | **Estático** | Conteúdo hardcoded |
| **Login** | `/sign-up-login` | ✅ Sim | ❌ Não | **Supabase** | Auth via `SystemAuthContext` → `user_profiles` |

---

## 3. Mapa de Gravação (Writes) por Tela

| Tela | Grava Supabase? | Grava localStorage? | Observações |
|------|:---:|:---:|-------------|
| **Importações (CSV)** | ✅ Sim | ✅ Sim | Scores/NCs/Elogios → Supabase; registro de import → localStorage |
| **Importações (manual)** | ✅ Sim | ❌ Não | `cycle_scores` via `supabaseDataService` |
| **Feedback — Manual** | ✅ Sim | ❌ Não | `feedbacks` + `analistas` |
| **Feedback — PDI** | ✅ Sim | ❌ Não | `pdi_records` |
| **PDIs** | ✅ Sim | ❌ Não | `pdi_records`, `pdi_objectives`, `pdi_timeline` |
| **Calibragem** | ❌ Não | ❌ Não | **PROBLEMA CRÍTICO:** campos `calibratedQa`/`calibratedIepc` nunca persistidos |
| **Histórico de Ciclos** | ❌ Não | ✅ Sim | `saveManualCycle` → `zetti_manual_cycles` apenas em localStorage |
| **Evolução Geral (manual)** | ✅ Sim | ✅ Sim | `saveEntryToSupabase` + `zetti_manual_entries` localStorage |
| **Configurações** | ✅ Sim | ❌ Não | `user_profiles`, `cargos`, `user_permissions` |
| **Analistas** | ✅ Sim | ❌ Não | `upsertAnalista`, `deleteAnalista` |
| **Advertências** | ✅ Sim | ❌ Não | `advertencias` |
| **Fechar Ciclo (Home)** | ✅ Sim | ✅ Sim | `import_cycles.is_closed` → Supabase; `zetti_closed_cycles` → localStorage |
| **Mural de Elogios** | ✅ Sim | ✅ Fallback | `toggleElogioDestaque` → Supabase primeiro |

---

## 4. Chaves localStorage Identificadas

| Chave | Conteúdo | Telas que Usam | Status |
|-------|----------|----------------|--------|
| `zetti_cycle_scores` | Scores de ciclo (fallback) | Home, Dashboard, NC, Auditoria | Fallback — Supabase é primário |
| `zetti_nc_records` | Registros de NC (fallback) | Home, NC, Auditoria | Fallback — Supabase é primário |
| `zetti_elogios` | Elogios (fallback) | Home, Mural | Fallback — Supabase é primário |
| `zetti_import_cycles` | Ciclos importados (cache) | Importações, Ciclos | Cache — sincronizado com Supabase |
| `zetti_closed_cycles` | Ciclos fechados | Home, Importações | Duplicado com `import_cycles.is_closed` |
| `zetti_manual_cycles` | Ciclos históricos manuais | Histórico | **Exclusivo localStorage — sem Supabase** |
| `zetti_manual_entries` | Entradas manuais de evolução | Evolução Geral | **Parcialmente em localStorage** |
| `zetti_import_records` | Lista de importações | Importações | **Exclusivo localStorage** |
| `zetti_user_profiles` | Perfis de usuário (cache) | Auth | Cache — Supabase é primário |
| `zetti_analyst_profiles` | Perfis de analistas (cache) | Analistas | Cache — Supabase é primário |

---

## 5. Problemas Identificados

### 🔴 CRÍTICO — Dados sem persistência real

| Problema | Tela | Impacto |
|----------|------|---------|
| `calibratedQa` / `calibratedIepc` nunca salvos | Calibragem | Calibrações perdidas ao recarregar |
| `zetti_manual_cycles` apenas em localStorage | Histórico | Dados perdidos ao trocar de dispositivo/browser |
| `zetti_import_records` apenas em localStorage | Importações | Lista de imports perdida ao limpar cache |
| `closeCycle()` usa localStorage como primário | Home | Ciclos fechados podem não sincronizar com Supabase |

### 🟠 RISCO MODERADO — Duplicação de estado

| Problema | Tela | Impacto |
|----------|------|---------|
| `zetti_closed_cycles` duplica `import_cycles.is_closed` | Home, Importações | Inconsistência possível entre as duas fontes |
| `zetti_manual_entries` parcialmente em Supabase | Evolução Geral | Dados podem existir em um lugar e não no outro |

### 🟡 ATENÇÃO — Dependência de localStorage como fonte única

| Tela | Dado | Risco |
|------|------|-------|
| Histórico | Todos os ciclos históricos | Perda total ao limpar cache |
| Importações | Lista de arquivos importados | Perda total ao limpar cache |

---

## 6. Conclusão — Verdadeira Fonte de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│  FONTE PRIMÁRIA: Supabase                                       │
│  ✅ 24 de 30 telas usam Supabase como fonte principal           │
│                                                                 │
│  FONTE EXCLUSIVA localStorage (sem Supabase):                   │
│  ⚠️  Histórico de Ciclos (/historico)                           │
│  ⚠️  Lista de Importações (/importacoes — registro)             │
│  ⚠️  Calibrações editadas (/calibragem)                         │
│                                                                 │
│  FONTE MISTA (ambos):                                           │
│  🔀 Evolução Geral (scores = Supabase, manuais = localStorage)  │
│  🔀 Importações (ciclos = Supabase, lista = localStorage)       │
│  🔀 Fechar Ciclo (Supabase + localStorage duplicado)            │
└─────────────────────────────────────────────────────────────────┘
```

**Recomendação:** Migrar `zetti_manual_cycles`, `zetti_import_records` e `calibratedQa/calibratedIepc` para tabelas Supabase dedicadas para eliminar dependência de localStorage como fonte única.
