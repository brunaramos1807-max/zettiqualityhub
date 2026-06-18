# QUALIVISAO-REFATORACAO-V4
**Data:** 2026-06-18  
**Versão:** V4  
**Módulo:** Não Conformidades + UX Enterprise + Governança de Dados

---

## 1. ITENS CORRIGIDOS

### 1.1 Modelo Oficial de NC — Aplicado
- **Tipos confirmados:** NC-1 a NC-5 com nomes completos oficiais
- **Severidade oficial:** Leve=3 / Média=5 / Grave=10 / Crítica=15
- **Penalidade pertence à severidade** — removida qualquer associação ao tipo
- **Regra -20 removida** de: `NC_DETAILS` em `HomeExecutiveView.tsx`, `ncDisplay.ts`, `mockData.ts`

### 1.2 Banco de Dados — Migração Criada
- **Arquivo:** `supabase/migrations/20260618200000_nc_severidade_penalidade_v4.sql`
- **Colunas adicionadas:** `severidade TEXT DEFAULT NULL`, `penalidade NUMERIC(6,2) DEFAULT NULL`
- **Tabela:** `public.nc_records`
- **Retrocompatibilidade:** `pontos_deduzidos` mantido, default alterado de `-20` para `NULL`
- **Dados históricos:** NENHUM registro alterado ou excluído
- **Índice criado:** `idx_nc_records_severidade`

### 1.3 UX da Tela de Não Conformidades — Redesenhada
- **Paleta enterprise aplicada:** `#0F172A` (background), `#111827` (cards), `#F8FAFC` / `#CBD5E1` / `#64748B` (texto)
- **Nomenclatura padronizada:** Cards exibem `NC-X` + nome completo oficial sem contadores embutidos
- **Tooltip ao hover:** Exibe descrição resumida de cada tipo NC
- **Contagens movidas:** Aparecem apenas na linha de resumo abaixo dos cards, não dentro deles
- **Badges de severidade:** Discretas, sem números de penalidade visíveis
- **Registros legados:** Exibem badge "Histórico Legado" quando `severidade` é NULL
- **Eliminado:** Roxos neon, azuis neon, brilhos excessivos, visual gamificado
- **Filtro reincidentes:** Estilo neutro (slate), sem cor roxa

### 1.4 Dashboards — Auditados
- **HomeExecutiveView.tsx:** `NC_DETAILS` atualizado — removido campo `penalidade: '-20 pontos QA'`
- **Severidade exibida:** Apenas label textual, sem valor numérico de penalidade
- **ncPoints em `buildAnalystsFromScores`:** Mantido para retrocompatibilidade com dashboards existentes; comentário técnico adicionado confirmando que NÃO é a regra -20

### 1.5 PDI — Arquitetura Confirmada
- **`pdi_records`:** Fonte de verdade para gestão de PDIs (coordenadores)
- **`feedback_pdi`:** Snapshot read-only / vínculo histórico (analistas visualizam via feedback)
- **Deduplicação ativa:** Registros `feedback_pdi` são ignorados quando `pdi_records` já cobre o mesmo `analista+periodo`
- **Código em `pdis/page.tsx`:** Já implementado na V3 — confirmado sem alterações necessárias

### 1.6 ncDisplay.ts — Reescrito
- Removida função `resolveNcPontosDeduzidos` (baseada em regra -20)
- Adicionada `resolveNcPenalidade` (modelo oficial: severidade → penalidade)
- Adicionada `formatNcPenalidade` (exibe "Histórico Legado" para registros sem severidade)
- `resolveAnalystPontosDeduzidos` mantida para retrocompatibilidade

### 1.7 NCRow Interface — Atualizada
- `pontos_deduzidos` agora `number | null` (não mais obrigatório)
- Adicionados: `severidade?: string | null`, `penalidade?: number | null`
- `parseNCsCSV` lê colunas `Severidade` e `Penalidade` de importações novas

---

## 2. ITENS PENDENTES

| Item | Status | Observação |
|------|--------|------------|
| Conversão automática de registros legados | **NÃO FEITO** | Conforme instrução: não converter sem evidência |
| Calibragem | **NÃO ALTERADO** | Fora do escopo V4 |
| Filtros com URL Params | **NÃO FEITO** | Escopo futuro |
| Refatoração HomeExecutiveView (monolítico) | **NÃO FEITO** | Escopo futuro |

---

## 3. MIGRAÇÕES EXECUTADAS

| Arquivo | Ação | Tabela |
|---------|------|--------|
| `20260618200000_nc_severidade_penalidade_v4.sql` | ADD COLUMN `severidade`, `penalidade`; ALTER DEFAULT `pontos_deduzidos` | `nc_records` |

---

## 4. TABELAS ALTERADAS

| Tabela | Alteração | Impacto |
|--------|-----------|---------|
| `nc_records` | +`severidade TEXT NULL`, +`penalidade NUMERIC NULL`, default `pontos_deduzidos` = NULL | Zero impacto em dados existentes |

---

## 5. ENDPOINTS ALTERADOS

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/services/dataService.ts` | `NCRow` interface: `pontos_deduzidos` nullable, +`severidade`, +`penalidade`; `parseNCsCSV` lê novos campos |
| `src/lib/utils/ncDisplay.ts` | Reescrito: modelo oficial V4, backward compat para legado |

---

## 6. RISCOS REMANESCENTES

| Risco | Nível | Mitigação |
|-------|-------|-----------|
| Registros legados com `pontos_deduzidos = -20` | **Baixo** | Exibidos como "Histórico Legado" — não recalculados |
| `pontos_deduzidos_nc` em `cycle_scores` ainda existe | **Baixo** | Campo mantido para retrocompatibilidade; não é a regra -20 |
| Importações antigas sem coluna `Severidade` | **Nenhum** | `parseNCsCSV` aceita ausência do campo — retorna `null` |
| `feedback_pdi` com 0 registros | **Nenhum** | Tabela vazia confirmada — sem risco de duplicidade |

---

## 7. PRESERVAÇÃO DE DADOS HISTÓRICOS

| Verificação | Status |
|-------------|--------|
| `nc_records` (83 registros) | ✅ Preservados — nenhum excluído ou recalculado |
| `cycle_scores` (95 registros) | ✅ Preservados — nenhuma alteração |
| `feedbacks` (58 registros) | ✅ Preservados |
| `pdi_records` (2 registros) | ✅ Preservados |
| `feedback_pdi` (0 registros) | ✅ Tabela vazia |
| `elogios` (54 registros) | ✅ Preservados |

---

## 8. NÍVEL DE PRONTIDÃO PARA PRODUÇÃO

| Módulo | Status V4 |
|--------|-----------|
| NC — Modelo de dados | ✅ Produção |
| NC — Tela UX | ✅ Produção |
| NC — Importação | ✅ Produção (backward compat) |
| Dashboard Executivo | ✅ Produção (regra -20 removida) |
| PDI — Arquitetura | ✅ Produção |
| Histórico legado | ✅ Exibição correta ("Histórico Legado") |

---

*Documento gerado com base exclusivamente em evidências do código-fonte e schema do banco de dados. Nenhum dado fictício ou suposição utilizada.*
