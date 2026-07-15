# PLANO DE IMPLEMENTAÇÃO — FASE 1 PAINEL EXECUTIVO

**Data Início:** 2026-07-10  
**Escopo:** Refatoração visual, extração de componentes, centralização de cálculos  
**Restrição:** Zero alterações de dados, banco ou histórico

---

## 📊 ESTRUTURA A CRIAR

```
HomeExecutiveView/
├─ hooks/
│  ├─ useExecutiveData.ts          (Fetch + agregação de dados)
│  ├─ useExecutiveFilters.ts       (Período, equipe, filtros URL)
│  └─ useExecutiveInsights.ts      (Lógica de destaques + oportunidades)
├─ sections/
│  ├─ ExecutiveSummary.tsx         (Resumo descritivo)
│  ├─ ExecutiveKPIs.tsx            (4 cards principais)
│  ├─ PositiveHighlights.tsx       (Até 3 destaques positivos)
│  ├─ EvolutionOpportunities.tsx   (Até 3 oportunidades)
│  └─ TeamsPerformanceTable.tsx    (Tabela dinâmica)
├─ components/
│  ├─ MetricCard.tsx               (Card reutilizável)
│  ├─ InsightItem.tsx              (Item de insight)
│  ├─ TrendIndicator.tsx           (Seta + tendência)
│  ├─ EmptyState.tsx               (Sem dados)
│  └─ LoadingState.tsx             (Carregando)
└─ HomeExecutiveView.tsx           (Orquestrador)
```

---

## 🎯 FASE 1: EXTRAÇÃO DE COMPONENTES

### 1. Criar hooks reutilizáveis

**useExecutiveData.ts:**
- Centralizar fetch (QA, IEPC, NCs, Elogios)
- Consolidar dados por período
- Retornar: `{ data, loading, error, periodo }`

**useExecutiveFilters.ts:**
- Ler filtros de URL (período, equipe)
- Persistir mudanças em URL
- Retornar: `{ periodo, squad, setPeriodo, setSquad }`

**useExecutiveInsights.ts:**
- Lógica de geração de destaques
- Lógica de oportunidades
- Regras de negócio (evolução, consistência, resultado)
- Retornar: `{ positives, opportunities }`

### 2. Criar seções reutilizáveis

**ExecutiveSummary.tsx:**
- Título + período + resumo descritivo
- Sem classificações "Saúde boa"

**ExecutiveKPIs.tsx:**
- 4 cards: QA, IEPC, NCs, Reconhecimentos
- MetricCard component

**PositiveHighlights.tsx:**
- Até 3 destaques positivos
- InsightItem component
- Ordem: evolução, consistência, resultado

**EvolutionOpportunities.tsx:**
- Até 3 oportunidades
- Mesmo InsightItem component
- Sem termos como "Ausência de crítico"

**TeamsPerformanceTable.tsx:**
- Tabela dinâmica de equipes
- Coluna "Equipe" (interface)
- Filtro por equipe persistido em URL

### 3. Criar componentes pequenos reutilizáveis

**MetricCard.tsx:**
- Número + label + badge de performance + trend
- Prop: `{ label, value, performance, trend }`

**InsightItem.tsx:**
- Ícone + texto + contexto
- Prop: `{ icon, text, context, type: 'positive'|'opportunity' }`

**TrendIndicator.tsx:**
- Seta (up/down/stable) + percentual
- Prop: `{ trend, percent }`

**EmptyState.tsx:**
- Mensagem quando sem dados

**LoadingState.tsx:**
- Skeletons para carregamento

---

## 🔄 FASE 2: CENTRALIZAR CÁLCULOS

### Mover de HomeExecutiveView para hooks:

1. **calcTrend()** → useExecutiveInsights
2. **getPerformanceClass()** → useExecutiveData
3. **normalizeNCType()** → useExecutiveData (reutilizar)
4. **buildSquadMetrics()** → useExecutiveData
5. **aggregateByPeriod()** → useExecutiveData

### Garantir:

- ✓ Sem duplicação entre componentes
- ✓ Cálculos centralizados em hooks
- ✓ Lógica de negócio separada de render
- ✓ Props tipadas com TypeScript

---

## 📏 VALIDAÇÕES OBRIGATÓRIAS

### 1366×768 (Primeira dobra)

- [ ] Cards KPI visíveis
- [ ] Até 3 destaques + até 3 oportunidades caber sem scroll
- [ ] Tabela de equipes na segunda dobra
- [ ] Sem truncamento inadequado

### 1920×1080

- [ ] Layouts adaptativos
- [ ] Grid responsivo

### Casos extremos

- [ ] 0 equipes → EmptyState
- [ ] 0 NCs → "0 ocorrências"
- [ ] 0 elogios → "Sem reconhecimentos este período"
- [ ] 6 divergentes (-1) → Ignorar em agrupamentos, não exibir
- [ ] Sem dados anteriores → Trend = "stable"
- [ ] Erro de carregamento → ErrorState
- [ ] RLS restrito → Mostrar apenas equipes do usuário

### Filtros URL

- [ ] ?periodo=06/2026 funciona
- [ ] ?squad=PDV funciona
- [ ] Mudança de filtro atualiza URL
- [ ] F5 mantém filtros

---

## 🛡️ REGRAS DE DADOS APLICADAS

### Tratamento de NCs

```typescript
// Apenas NCs normalizados (NC-1~5)
const validNCs = ncs.filter(n => ['NC-1', 'NC-2', 'NC-3', 'NC-4', 'NC-5'].includes(normalizeNCType(n.tipo_nc)));

// Manter 6 divergentes em memória
const divergentNCs = ncs.filter(n => !validNCs.includes(n));

// Ignorar divergentes em gráficos e agregações
const ncsForDisplay = validNCs;
const ncsForTotal = ncs.length; // Total verdadeiro (94), mas indicar qual % é divergente
```

### Tratamento de Penalidades

```typescript
// Usar pontos_deduzidos como está (preservar -20 e -1)
const totalPenalties = ncs.reduce((sum, nc) => sum + nc.pontos_deduzidos, 0);

// Mas não inferir severidade
// E não recalcular QA histórico
```

### Destaques Positivos (Ordem)

Priorizar:
1. Evolução (mês anterior) > Meta
2. Consistência (todos > meta)
3. Melhor resultado histórico
4. Redução de NCs
5. Crescimento de reconhecimentos

Nunca usar:
- "Saúde boa"
- "Ausência de crítico"
- "Squad crítica"

---

## ✅ ENTREGA ESPERADA

Ao concluir Fase 1:

1. [ ] Componentes extraídos
2. [ ] Hooks centralizados
3. [ ] Layout novo funcionando (1366×768 + 1920×1080)
4. [ ] Filtros persistidos em URL
5. [ ] Destaques/oportunidades sem termos proibidos
6. [ ] 94 NCs preservados (88 válidos + 6 divergentes ignorados)
7. [ ] Screenshots antes/depois
8. [ ] Testes: casos extremos validados
9. [ ] TypeScript sem erros
10. [ ] Documentação de limitações

---

## 🚀 PRÓXIMOS PASSOS

1. Criar hooks (useExecutiveData, useExecutiveFilters, useExecutiveInsights)
2. Criar seções (Summary, KPIs, Highlights, Opportunities, Table)
3. Criar componentes pequenos (MetricCard, InsightItem, etc)
4. Refatorar HomeExecutiveView como orquestrador
5. Testar em 1366×768 e 1920×1080
6. Validar filtros em URL
7. Documentar limitações

