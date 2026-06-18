# Auditoria 3 — Fluxo Real do Feedback

**Versão:** 1.0  
**Data:** 2026-06-18  
**Objetivo:** Mapear o fluxo completo do Feedback — da origem ao histórico  
**Referência:** `payloads_qualivisao.md`, código-fonte dos endpoints e telas

---

## 1. Diagrama do Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORIGENS DO FEEDBACK                                  │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  Sistema Lovable │  Importação JSON │  Criação Manual  │  Link Público      │
│  (integração)    │  (/feedback/     │  (/feedback/     │  (/feedback/       │
│                  │   import)        │   manual)        │   public/[token])  │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │                  │                  │                     │
         ▼                  ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENDPOINTS DE ENTRADA                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  POST /api/receber-avaliacao          POST /api/feedbacks/import            │
│  (scores QA/IEPC → cycle_scores)      (feedbacks → feedbacks table)         │
└────────────────────────┬────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TABELAS SUPABASE                                    │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│   feedbacks      │  feedback_       │   analistas      │   pdi_records      │
│   (principal)    │  historico       │   (referência)   │   (PDI vinculado)  │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │                  │                  │                     │
         ▼                  ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TELAS DE VISUALIZAÇÃO                            │
├──────────────────┬──────────────────┬──────────────────┬────────────────────┤
│  /feedback       │  /feedback/      │  /feedback/pdi   │  /feedback/        │
│  (lista)         │  historico       │  (PDI do         │  people-analytics  │
│                  │                  │   feedback)      │                    │
└────────┬─────────┴────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │                  │                  │                     │
         ▼                  ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PDI E HISTÓRICO                                │
├──────────────────────────────────────────────────────────────────────────────┤
│  pdi_records (PDI Enterprise)    feedback_historico (histórico por ciclo)   │
│  pdi_objectives (objetivos)      cycle_scores (scores do ciclo)             │
│  pdi_timeline (linha do tempo)   cycle_summaries (snapshots fechados)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Origens do Feedback

### 2.1 Sistema Lovable (Integração Externa)

**Trigger:** Botão "Enviar Feedback" no Sistema de Avaliação Lovable  
**Método:** HTTP POST duplo

```
Lovable → POST /api/receber-avaliacao
         (scores QA/IEPC → cycle_scores)
         
Lovable → POST /api/feedbacks/import  
         (feedback completo → feedbacks + feedback_historico)
```

**Autenticação:** Bearer Token (`INTEGRATION_API_TOKEN` ou hash SHA-256 no banco)

### 2.2 Importação JSON Manual

**Tela:** `/feedback/import`  
**Método:** Upload de arquivo JSON → POST `/api/feedbacks/import`  
**Token:** `qualivisao-lovable-token-2026` (hardcoded na tela de histórico)

### 2.3 Criação Manual

**Tela:** `/feedback/manual`  
**Método:** Formulário → `supabase.from('feedbacks').insert()`  
**Sem endpoint intermediário** — gravação direta no Supabase

### 2.4 Link Público (Analista)

**Tela:** `/feedback/public/[token]`  
**Método:** `supabase.from('feedbacks').select().eq('public_token', token)`  
**Uso:** Analista acessa seu próprio feedback via link único

---

## 3. Endpoint `/api/feedbacks/import`

**Arquivo:** `src/app/api/feedbacks/import/route.ts`

### Fluxo Interno

```
POST /api/feedbacks/import
    ↓
Validação do Bearer Token
    ↓
Normalização do payload (v1 legacy / v2 Lovable)
    ↓
Busca analista_id por email em `analistas`
    ↓ (se não encontrado)
Fallback: busca por nome em `analistas`
    ↓
Upsert em `feedbacks`
  - Chave de idempotência: (analista_id, ciclo) ou (email, ciclo)
    ↓
Insert em `feedback_historico`
  - Registra snapshot do ciclo
    ↓
Retorna { success, feedback_id, historico_id }
```

### Campos Processados do Payload

| Campo Payload | Campo Tabela | Obrigatório |
|---------------|-------------|:-----------:|
| `analista.email` | `analistas.email` (lookup) | ✅ |
| `analista.nome` | `analistas.nome` (fallback lookup) | ✅ |
| `ciclo.periodo` | `feedbacks.ciclo` | ✅ |
| `scores.qa_final` | `feedbacks.qa_score` | ✅ |
| `scores.iepc_total` | `feedbacks.iepc_score` | ✅ |
| `scores.aderencia` | `feedbacks.aderencia_score` | ❌ |
| `ciclo.posicao_squad` | `feedbacks.posicao_squad` | ❌ |
| `ciclo.total_squad` | `feedbacks.total_squad` | ❌ |
| `feedback_blocks` | `feedbacks.feedback_blocks` (JSONB) | ❌ |
| `coaching` | `feedbacks.coaching` (JSONB) | ❌ |
| `nao_conformidades` | `feedbacks.nao_conformidades` (JSONB) | ❌ |
| `pilares_qa` | `feedbacks.pilares_qa` (JSONB) | ❌ |
| `pilares_iepc` | `feedbacks.pilares_iepc` (JSONB) | ❌ |
| `historico` | `feedback_historico` (insert separado) | ❌ |
| `public_token` | `feedbacks.public_token` | ❌ |

---

## 4. Tabelas Participantes

### 4.1 `feedbacks` (tabela principal)

| Campo | Tipo | Usado? | Observação |
|-------|------|:------:|------------|
| `id` | UUID | ✅ | PK |
| `analista_id` | UUID FK | ✅ | FK → `analistas.id` |
| `ciclo` | text | ✅ | Período MM/YYYY |
| `qa_score` | numeric | ✅ | Exibido em todas as telas |
| `iepc_score` | numeric | ✅ | Exibido em todas as telas |
| `aderencia_score` | numeric | ⚠️ Parcial | Exibido mas raramente preenchido |
| `posicao_squad` | integer | ⚠️ Parcial | Exibido mas raramente preenchido |
| `total_squad` | integer | ⚠️ Parcial | Exibido mas raramente preenchido |
| `status` | text | ✅ | draft/gerado/enviado/lido/validado/fechado |
| `origem` | text | ✅ | integration/manual/import |
| `feedback_blocks` | JSONB | ⚠️ Parcial | Blocos de texto do feedback — exibido em `/feedback/[id]` |
| `coaching` | JSONB | ⚠️ Parcial | Dados de coaching — raramente exibido |
| `nao_conformidades` | JSONB | ⚠️ Parcial | NCs do feedback — separado de `nc_records` |
| `pilares_qa` | JSONB | ⚠️ Parcial | Detalhes dos pilares — exibido em `/feedback/[id]` |
| `pilares_iepc` | JSONB | ⚠️ Parcial | Detalhes dos pilares — exibido em `/feedback/[id]` |
| `public_token` | text | ✅ | Token para link público |
| `public_enabled` | boolean | ✅ | Habilita/desabilita link público |
| `created_at` | timestamp | ✅ | Ordenação padrão |
| `updated_at` | timestamp | ✅ | Atualizado em mudanças de status |

### 4.2 `feedback_historico`

| Campo | Tipo | Usado? | Observação |
|-------|------|:------:|------------|
| `id` | UUID | ✅ | PK |
| `analista_id` | UUID FK | ✅ | FK → `analistas.id` |
| `feedback_id` | UUID FK | ⚠️ Parcial | FK → `feedbacks.id` — nem sempre preenchido |
| `ciclo` | text | ✅ | Período MM/YYYY |
| `qa_score` | numeric | ✅ | Score QA do ciclo |
| `iepc_score` | numeric | ✅ | Score IEPC do ciclo |
| `aderencia_score` | numeric | ⚠️ Parcial | Raramente preenchido |
| `posicao_squad` | integer | ⚠️ Parcial | Raramente preenchido |
| `created_at` | timestamp | ✅ | Ordenação |

### 4.3 `analistas`

| Campo | Tipo | Usado no Feedback? | Observação |
|-------|------|:------------------:|------------|
| `id` | UUID | ✅ | FK em `feedbacks.analista_id` |
| `nome` | text | ✅ | Exibido em todas as telas |
| `email` | text | ✅ | Lookup no import |
| `equipe` | text | ✅ | Filtro e exibição |
| `coordenador` | text | ✅ | Exibição |
| `status` | text | ✅ | Filtro de ativos |
| `foto_url` | text | ⚠️ Parcial | Exibido em Gestão, raramente em Feedback |
| `nivel_profissional` | text | ⚠️ Parcial | Exibido em Gestão |
| `data_admissao` | date | ❌ | Não usado no fluxo de Feedback |
| `data_nascimento` | date | ❌ | Não usado no fluxo de Feedback |

### 4.4 `pdi_records`

| Campo | Tipo | Usado? | Observação |
|-------|------|:------:|------------|
| `id` | UUID | ✅ | PK |
| `analista_id` | UUID FK | ✅ | FK → `analistas.id` |
| `analista` | text | ✅ | Nome (redundante com FK) |
| `ciclo_origem` | text | ✅ | Período de origem do PDI |
| `mensagem_evolutiva` | text | ✅ | Texto principal do PDI |
| `enterprise_objectives` | JSONB | ✅ | Objetivos estruturados |
| `status_pdi` | text | ✅ | Status do PDI |
| `progresso` | integer | ✅ | % de conclusão |
| `prazo` | date | ✅ | Prazo do PDI |
| `responsavel` | text | ✅ | Responsável pelo PDI |
| `evidencia` | text | ⚠️ Parcial | Campo existe mas raramente preenchido |
| `comentario_coordenador` | text | ⚠️ Parcial | Campo existe mas raramente preenchido |
| `comentario_analista` | text | ⚠️ Parcial | Campo existe mas raramente preenchido |
| `feedback_id` | UUID FK | ❌ | **NUNCA USADO** — PDI não vinculado ao feedback de origem |

---

## 5. Campos Nunca Utilizados

| Tabela | Campo | Motivo |
|--------|-------|--------|
| `feedbacks` | `coaching` (JSONB completo) | Recebido no payload mas não exibido em nenhuma tela |
| `feedbacks` | `atendimentos` (JSONB) | Recebido no payload mas não exibido |
| `feedbacks` | `metadata` | Recebido mas não exibido |
| `pdi_records` | `feedback_id` | Campo existe mas nunca preenchido — PDI e Feedback são módulos separados |
| `pdi_records` | `evidencia` | Campo existe mas raramente preenchido |
| `feedback_historico` | `posicao_squad` | Raramente preenchido pelo sistema de integração |
| `analistas` | `data_nascimento` | Não usado no fluxo de Feedback |
| `analistas` | `ultima_promocao` | Não usado no fluxo de Feedback |
| `cycle_scores` | `criterios` (JSONB) | Recebido pelo Lovable mas não exibido no Dashboard |

---

## 6. Fluxo Tela por Tela

### 6.1 `/feedback` — Lista de Feedbacks

```
Tela
  ↓
supabase.from('feedbacks')
  .select('id, ciclo, qa_score, iepc_score, aderencia_score, posicao_squad, 
           total_squad, status, origem, created_at, analistas(nome, equipe, coordenador)')
  .eq('status', filterStatus?)
  .eq('ciclo', filterCiclo?)
  ↓
Filtros em memória: search (nome/equipe/ciclo), filterEquipe
  ↓
Exibe: tabela com analista, ciclo, QA, IEPC, status, origem
  ↓
Ações: editar status, excluir, ver detalhe
```

### 6.2 `/feedback/[id]` — Detalhe do Feedback

```
Tela
  ↓
supabase.from('feedbacks').select('*').eq('id', id)
  ↓
supabase.from('analistas').select('*').eq('id', feedback.analista_id)
  ↓
supabase.from('pdi_records').select('*').eq('analista_id', analista_id)
  ↓
Exibe: scores, pilares QA/IEPC, feedback_blocks, NCs do feedback
  ↓
Ações: gerar link público, alterar status, vincular PDI
```

### 6.3 `/feedback/historico` — Histórico Administrativo

```
Tela
  ↓
supabase.from('feedback_historico')
  .select('*, analistas(nome, equipe)')
  .order('created_at', { ascending: false })
  ↓
Agrupamento em memória por analista.nome
  ↓
Exibe: grupos por analista, gráfico de evolução QA/IEPC por ciclo
  ↓
Ações: excluir feedback, importar JSON via API
```

### 6.4 `/feedback/pdi` — PDI do Feedback

```
Tela
  ↓
supabase.from('pdi_records').select('*').order('created_at')
  ↓
supabase.from('analistas').select('id, nome, email, equipe')
  ↓
supabase.from('feedbacks').select('qa_score, iepc_score, ciclo')
  .eq('analista_id', analista_id) (para scores do analista)
  ↓
Exibe: lista de PDIs, formulário de criação/edição
  ↓
Ações: criar PDI, editar objetivos, atualizar status, excluir
```

### 6.5 `/feedback/people-analytics` — People Analytics

```
Tela
  ↓
supabase.from('feedbacks').select('*')
  ↓
supabase.from('feedback_historico').select('*')
  ↓
supabase.from('analistas').select('*')
  ↓
Cálculos em memória: médias, tendências, distribuições
  ↓
Exibe: gráficos de evolução, ranking, distribuição de scores
```

---

## 7. Fluxo de PDI

```
Feedback recebido (qualquer origem)
    ↓
Coordenador acessa /feedback/[id]
    ↓
Clica "Criar PDI" → abre formulário
    ↓
Preenche: analista, objetivos, prazo, responsável, mensagem evolutiva
    ↓
supabase.from('pdi_records').insert({
  analista_id,
  analista (nome),
  ciclo_origem,
  mensagem_evolutiva,
  enterprise_objectives (JSONB),
  status_pdi: 'aguardando alinhamento',
  progresso: 0,
  prazo,
  responsavel
})
    ↓
PDI aparece em /pdis e /feedback/pdi
    ↓
Coordenador atualiza objetivos e status ao longo do tempo
    ↓
⚠️ PROBLEMA: feedback_id NUNCA é preenchido no pdi_records
   → PDI e Feedback ficam desvinculados no banco
```

---

## 8. Fluxo de Histórico

```
Feedback importado via /api/feedbacks/import
    ↓
Endpoint insere em feedback_historico:
  { analista_id, ciclo, qa_score, iepc_score, feedback_id }
    ↓
/feedback/historico lê feedback_historico
  → agrupa por analista
  → exibe evolução temporal
    ↓
⚠️ PROBLEMA: feedback_id em feedback_historico nem sempre preenchido
   → histórico pode existir sem feedback correspondente
```

---

## 9. Problemas Críticos no Fluxo

| Problema | Severidade | Impacto |
|----------|-----------|---------|
| **PDI desvinculado do Feedback** | 🔴 Alto | `pdi_records.feedback_id` nunca preenchido — impossível rastrear qual feedback gerou qual PDI |
| **Dois módulos PDI paralelos** | 🔴 Alto | `/feedback/pdi` usa `pdi_records`; `/pdis` usa `pdi_records` + `pdi_objectives` + `pdi_timeline` — lógica duplicada |
| **Token hardcoded** | 🔴 Alto | `qualivisao-lovable-token-2026` hardcoded em `/feedback/historico` — risco de segurança |
| **coaching nunca exibido** | 🟠 Médio | Dados de coaching recebidos pelo payload mas sem tela de visualização |
| **atendimentos nunca exibidos** | 🟠 Médio | Dados de atendimentos recebidos mas sem tela de visualização |
| **feedback_historico sem feedback_id** | 🟠 Médio | Histórico pode existir sem feedback correspondente |
| **aderencia_score raramente preenchido** | 🟡 Baixo | Campo exibido mas quase sempre null |
| **criterios JSONB ignorado** | 🟡 Baixo | `cycle_scores.criterios` recebido do Lovable mas nunca exibido |

---

## 10. Campos Utilizados vs. Nunca Utilizados — Resumo

### Campos UTILIZADOS (exibidos em pelo menos uma tela)

`feedbacks`: `id`, `analista_id`, `ciclo`, `qa_score`, `iepc_score`, `status`, `origem`, `created_at`, `updated_at`, `public_token`, `public_enabled`, `feedback_blocks`, `pilares_qa`, `pilares_iepc`, `nao_conformidades`

`feedback_historico`: `id`, `analista_id`, `ciclo`, `qa_score`, `iepc_score`, `created_at`

`analistas`: `id`, `nome`, `email`, `equipe`, `coordenador`, `status`

`pdi_records`: `id`, `analista_id`, `analista`, `ciclo_origem`, `mensagem_evolutiva`, `enterprise_objectives`, `status_pdi`, `progresso`, `prazo`, `responsavel`, `created_at`

### Campos NUNCA UTILIZADOS (recebidos mas não exibidos)

| Tabela | Campo | Status |
|--------|-------|--------|
| `feedbacks` | `coaching` | Recebido, nunca exibido |
| `feedbacks` | `atendimentos` | Recebido, nunca exibido |
| `feedbacks` | `metadata` | Recebido, nunca exibido |
| `pdi_records` | `feedback_id` | Existe no schema, nunca preenchido |
| `pdi_records` | `evidencia` | Existe no schema, raramente preenchido |
| `pdi_records` | `comentario_coordenador` | Existe no schema, raramente preenchido |
| `pdi_records` | `comentario_analista` | Existe no schema, raramente preenchido |
| `feedback_historico` | `posicao_squad` | Raramente preenchido |
| `feedback_historico` | `aderencia_score` | Raramente preenchido |
| `cycle_scores` | `criterios` (JSONB) | Recebido do Lovable, nunca exibido |
| `analistas` | `data_nascimento` | Não usado no fluxo de Feedback |
| `analistas` | `ultima_promocao` | Não usado no fluxo de Feedback |
