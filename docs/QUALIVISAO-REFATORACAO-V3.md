# QUALIVISAO-REFATORACAO-V3

**Data:** 2026-06-18  
**Versão:** V3  
**Responsável:** Auditoria Técnica QualiVisão  
**Status:** Concluído

---

## 1. RESUMO EXECUTIVO

Este documento registra todas as alterações realizadas na refatoração V3 do QualiVisão, com base nas auditorias técnicas conduzidas nas sessões anteriores. O objetivo foi consolidar a arquitetura, eliminar duplicidades, fortalecer a governança de dados e melhorar a experiência do usuário — sem remover funcionalidades em produção.

---

## 2. PROBLEMAS ENCONTRADOS

### 2.1 Fonte de Dados
| Módulo | Problema |
|--------|----------|
| Histórico (`/historico`) | Dependia de `MANUAL_CYCLE_DEFAULTS` estáticos e `fetchManualCycles()` via localStorage |
| Evolução Geral (`/evolucao-geral`) | `fetchManualCycles()` lia exclusivamente de `localStorage` (`zetti_manual_cycles`) |
| mockData.ts | Continha `MOCK_USERS` com credenciais fictícias, `NC_RECORDS` com 20 registros fictícios usando regra `-20 pontos` |

### 2.2 Modelo de NC
| Problema | Detalhe |
|----------|---------|
| Regra `-20 pontos fixos` | Presente em `NC_RECORDS` do mockData.ts (`pontosDescontados: -20`) e em `ANALYSTS` (`ncPoints: -20, -40, -60, -80`) |
| Modelo oficial não documentado no código | `NC_SEVERIDADE_PENALIDADE` e `NC_TIPOS` não existiam em `mockData.ts` |

### 2.3 PDI Duplicado
| Problema | Detalhe |
|----------|---------|
| `feedback_pdi` como segundo sistema de PDI | `pdis/page.tsx` carregava `feedback_pdi` sem verificar se `pdi_records` já cobria o mesmo analista+período |
| Risco de duplicação | Analistas com PDI em `pdi_records` apareciam duas vezes na listagem |

### 2.4 Design System
| Problema | Detalhe |
|----------|---------|
| NC type cards com contadores embutidos | Badges com contagens numéricas dentro dos cards de nomenclatura (ex: `48`, `21`, `17`) |
| Cores saturadas/neon | `#7C3AED` (roxo), `#38BDF8` (azul neon) como cores primárias dos tipos NC |
| Sensação de gamificação | Visual competitivo em vez de executivo/enterprise |

### 2.5 Auditoria
| Problema | Detalhe |
|----------|---------|
| Status derivado de contagem | `getAuditStatus()` baseado apenas em `avaliacoes` count — já corrigido em versão anterior |
| Filtro por analistas ativos | Já implementado via tabela `analistas` — confirmado funcional |

---

## 3. PROBLEMAS CORRIGIDOS

### 3.1 mockData.ts — Limpeza de Dados Fictícios
- **Removido:** `MOCK_USERS` (5 usuários fictícios com emails/roles)
- **Removido:** `NC_RECORDS` (20 registros NC com `pontosDescontados: -20`)
- **Removido:** `ANALYSTS` array com `ncPoints: -20/-40/-60/-80` (regra obsoleta)
- **Removido:** `SQUAD_AVERAGES` (dados estáticos substituídos por Supabase)
- **Adicionado:** `NC_SEVERIDADE_PENALIDADE` — modelo oficial: Leve=3, Média=5, Grave=10, Crítica=15
- **Adicionado:** `NC_TIPOS` — array oficial NC-1 a NC-5 com nome e descrição
- **Mantido:** `ELOGIOS`, `MONTHLY_TREND` (fallback), `PILLAR_DESCRIPTIONS`, funções utilitárias

### 3.2 Histórico (`/historico/page.tsx`) — Supabase como Fonte Oficial
- **Antes:** Lia de `MANUAL_CYCLE_DEFAULTS` (array estático) + `fetchManualCycles()` (localStorage)
- **Depois:** Consome exclusivamente de `cycle_scores`, `nc_records`, `elogios` e `app_settings` via Supabase
- **Comportamento:** Agrupa por `periodo`, calcula médias QA/IEPC, conta NCs e elogios dinamicamente
- **Ciclo ativo:** Determinado via `app_settings.key = 'active_cycle'`

### 3.3 Evolução Geral (`/evolucao-geral/page.tsx`) — Remoção de localStorage
- **Antes:** `fetchManualCycles()` lia de `localStorage` (`zetti_manual_cycles`)
- **Depois:** Consulta `app_settings.key = 'manual_cycles'` no Supabase
- **Mantido:** Lançamento manual de ciclos anteriores (funcionalidade preservada)
- **Mantido:** Gráfico de tendência multi-ciclo, heatmap, barras NC

### 3.4 PDI/Feedback — Eliminação do Segundo Sistema PDI
- **Antes:** `pdis/page.tsx` carregava `feedback_pdi` sem verificar duplicatas com `pdi_records`
- **Depois:** `feedback_pdi` é tratado como **snapshot histórico de leitura** — só é incluído se NÃO existir entrada correspondente em `pdi_records` para o mesmo `analista+periodo`
- **Source marcado:** `'feedback_pdi_snapshot'` (vs `'feedback_snapshot'` para feedbacks com PDI embutido)
- **Fluxo correto:** `pdi_records` → gestão completa | `feedback_pdi` → visualização/histórico apenas

### 3.5 Modelo NC — Remoção da Regra -20
- **Removido definitivamente:** `ncPoints: -20/-40/-60/-80` do array `ANALYSTS`
- **Removido definitivamente:** `pontosDescontados: -20` do array `NC_RECORDS`
- **Modelo oficial implementado:** `NC_SEVERIDADE_PENALIDADE` com Leve=3/Média=5/Grave=10/Crítica=15
- **Penalidade pertence à severidade**, não ao tipo NC

### 3.6 NC UX — Design Executivo
- **Antes:** Type cards com badges de contagem embutidos, cores neon (#7C3AED, #38BDF8, #EF4444 saturado)
- **Depois:** Type cards limpos sem contadores — contagens movidas para linha de resumo abaixo dos cards
- **Cores:** Paleta slate/neutral (#94A3B8, #CBD5E1) para tipos NC; vermelho apenas para NC-5 (Segurança/Crítica)
- **SeveridadeBadge:** Estilo sutil com fundo rgba e borda discreta

---

## 4. COMPONENTES REMOVIDOS / CONSOLIDADOS

| Componente/Dado | Ação | Substituto |
|-----------------|------|-----------|
| `MOCK_USERS` | Removido | Supabase Auth + tabela `analistas` |
| `NC_RECORDS` (mockData) | Removido | Tabela `nc_records` (Supabase) |
| `ANALYSTS` com ncPoints | Removido | Tabela `cycle_scores` (Supabase) |
| `SQUAD_AVERAGES` | Removido | Calculado dinamicamente de `cycle_scores` |
| `fetchManualCycles()` localStorage | Substituído | `app_settings` Supabase |
| `MANUAL_CYCLE_DEFAULTS` | Removido | Dados reais de `cycle_scores` |
| `feedback_pdi` como sistema PDI | Convertido | Snapshot read-only vinculado a `pdi_records` |

---

## 5. TABELAS IMPACTADAS

| Tabela | Impacto |
|--------|---------|
| `cycle_scores` | Agora fonte primária para Histórico e Evolução Geral |
| `nc_records` | Fonte primária para NCs (modelo tipo+severidade+penalidade) |
| `elogios` | Fonte primária para contagem histórica de elogios |
| `app_settings` | Novo uso: `manual_cycles` para Evolução Geral |
| `analistas` | Confirmado como fonte para Auditoria (filtro de ativos/inativos) |
| `pdi_records` | Confirmado como fonte única de gestão PDI |
| `feedback_pdi` | Rebaixado para snapshot read-only |

---

## 6. RISCOS ELIMINADOS

| Risco | Status |
|-------|--------|
| Credenciais demo em código-fonte | ✅ Eliminado — `MOCK_USERS` removido |
| Regra NC -20 pontos aplicada em cálculos | ✅ Eliminado — `ncPoints` removido de mockData |
| Histórico mostrando dados estáticos em vez de reais | ✅ Eliminado — fonte migrada para Supabase |
| PDI duplicado (feedback_pdi + pdi_records) | ✅ Eliminado — feedback_pdi é read-only snapshot |
| localStorage como fonte primária em Histórico | ✅ Eliminado |
| localStorage como fonte primária em Evolução Geral | ✅ Eliminado |

---

## 7. MELHORIAS DE UX

| Módulo | Melhoria |
|--------|----------|
| Não Conformidades | Contadores removidos de dentro dos type cards |
| Não Conformidades | Paleta de cores simplificada (slate/neutral) |
| Não Conformidades | SeveridadeBadge com estilo sutil e semântico |
| Histórico | Exibe dados reais com status ativo/encerrado dinâmico |
| Histórico | Estado vazio com mensagem orientativa |

---

## 8. MELHORIAS DE PERFORMANCE

| Área | Melhoria |
|------|----------|
| Histórico | Eliminação de array estático — dados carregados sob demanda |
| Evolução Geral | Remoção de leitura localStorage em cada render |
| PDI | Eliminação de duplicatas via deduplicação analista+periodo |

---

## 9. MELHORIAS DE SEGURANÇA

| Área | Melhoria |
|------|----------|
| mockData.ts | Credenciais fictícias removidas do código-fonte |
| NC model | Regra de penalidade desacoplada do tipo — penalidade pertence à severidade |

---

## 10. PENDÊNCIAS FUTURAS (NÃO IMPLEMENTADAS NESTA VERSÃO)

| Item | Prioridade | Justificativa |
|------|-----------|---------------|
| Consolidar AuthContext + SystemAuthContext | P0 | Requer análise de impacto em todas as rotas protegidas |
| Implementar RLS por squad/role | P0 | Requer migração Supabase + testes de regressão |
| Refatorar HomeExecutiveView (2013 linhas) | P1 | Separar gráficos/KPIs/IA/filtros/tabelas |
| URL Params para sincronização de filtros | P1 | `?squad=&ciclo=&coordenador=` |
| Calibragem — persistência no Supabase | P1 | `calibratedQa`/`calibratedIepc` nunca salvos |
| Auditoria — status baseado em critério real | P2 | Atualmente derivado de contagem de avaliações |
| Evolução Geral — migrar manual_entries para Supabase | P2 | Ainda usa localStorage para entradas manuais |
| Remover código morto / páginas órfãs | P3 | Mapeado em AUDITORIA_4_PRONTIDAO_PRODUCAO.md |

---

## 11. ARQUITETURA RESULTANTE (V3)

```
Fonte de Dados
├── Supabase (Fonte Oficial)
│   ├── cycle_scores       → Dashboard, Histórico, Evolução, Auditoria
│   ├── nc_records         → Não Conformidades (tipo+severidade+penalidade)
│   ├── elogios            → Mural, Histórico, Feedback
│   ├── feedbacks          → Módulo Feedback
│   ├── pdi_records        → Módulo PDI (gestão completa)
│   ├── feedback_pdi       → Snapshot read-only (vinculado a pdi_records)
│   ├── analistas          → Auditoria, Gestão
│   └── app_settings       → Ciclo ativo, manual_cycles
│
└── localStorage (Cache Temporário)
    ├── zetti_manual_entries  → Entradas manuais Evolução Geral (pendente migração)
    └── [demais chaves]       → Cache de importação (não fonte primária)

Modelo NC Oficial
├── Tipo: NC-1 a NC-5
├── Severidade: Leve / Média / Grave / Crítica
├── Penalidade: 3 / 5 / 10 / 15 pontos
└── Regra -20 pontos fixos: REMOVIDA DEFINITIVAMENTE

PDI
├── pdi_records → Gestão (criar, editar, acompanhar, metas, revisões)
└── feedback_pdi → Snapshot histórico read-only (sem gestão)
```

---

## 12. ARQUIVOS MODIFICADOS

| Arquivo | Tipo de Alteração |
|---------|------------------|
| `src/lib/mockData.ts` | Limpeza — removidos MOCK_USERS, NC_RECORDS, ANALYSTS com ncPoints; adicionados NC_SEVERIDADE_PENALIDADE, NC_TIPOS |
| `src/app/historico/page.tsx` | Reescrita — fonte migrada para Supabase (cycle_scores, nc_records, elogios) |
| `src/app/evolucao-geral/page.tsx` | Correção — fetchManualCycles migrado de localStorage para Supabase app_settings |
| `src/app/pdis/page.tsx` | Correção — feedback_pdi tratado como snapshot read-only, deduplicação por analista+periodo |
| `src/app/nao-conformidades/page.tsx` | UX — type cards sem contadores, paleta slate/neutral, SeveridadeBadge sutil |

---

*Documento gerado automaticamente pela auditoria técnica QualiVisão V3 — 2026-06-18*
