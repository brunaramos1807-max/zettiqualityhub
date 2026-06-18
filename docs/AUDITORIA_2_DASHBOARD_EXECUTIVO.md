# Auditoria 2 — Dashboard Executivo (HomeExecutiveView)

**Versão:** 1.0  
**Data:** 2026-06-18  
**Arquivo principal:** `src/app/components/HomeExecutiveView.tsx` (2013 linhas)  
**Rota:** `/` (página inicial)  
**Objetivo:** Documentar integralmente a lógica do Dashboard Executivo

---

## 1. Visão Geral do Componente

O Dashboard Executivo é implementado em `HomeExecutiveView.tsx` — o maior componente do sistema (2013 linhas). Ele é o coração do QualiVisão e agrega todos os KPIs, gráficos e análises do ciclo ativo.

### Dependências de Importação

| Módulo | Funções Importadas |
|--------|-------------------|
| `dataService` | `fetchCycleScores`, `fetchAllPeriodos`, `fetchNCRecords`, `fetchElogios`, `buildAnalystsFromScores`, `fetchManualCycles`, `listenDataChanged`, `sortPeriodosDesc` |
| `supabaseDataService` | `getActiveCycle` |
| `recharts` | `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `RadarChart`, `Radar`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis` |
| `SystemAuthContext` | `useSystemAuth` |
| `useChat` | Chat com Gemini (fechamento de ciclo) |
| `supabase/client` | `createClient` (direto para `cycle_summaries`) |

---

## 2. Filtros Disponíveis

| Filtro | Tipo | Estado | Comportamento |
|--------|------|--------|---------------|
| **Período** | `<select>` | `activePeriodo: string` | Recarrega todos os dados ao mudar |
| **Squad** | `<select>` | `selectedSquad: string` | Filtra analistas em memória |
| **Analista** | `<select>` | `selectedAnalyst: string` | Filtra analistas em memória |
| **Coordenador** | `<select>` | `selectedCoordenador: string` | Filtra analistas em memória |
| **Tipo de Demanda** | `<select>` | `selectedTipoDemanda: string` | Filtra analistas em memória |

**Nota:** Todos os filtros exceto "Período" operam **em memória** sobre os dados já carregados — não disparam novas queries ao Supabase.

---

## 3. Hooks e Ciclo de Vida

### Estado Principal

```typescript
// Dados carregados do Supabase
const [allPeriodos, setAllPeriodos] = useState<string[]>([]);
const [activePeriodo, setActivePeriodo] = useState<string>('');
const [allAnalysts, setAllAnalysts] = useState<any[]>([]);
const [ncRecords, setNcRecords] = useState<any[]>([]);
const [elogios, setElogios] = useState<any[]>([]);
const [history, setHistory] = useState<PeriodSummary[]>([]);

// UI state
const [selectedSquad, setSelectedSquad] = useState<string>('all');
const [selectedAnalyst, setSelectedAnalyst] = useState<string>('all');
const [selectedCoordenador, setSelectedCoordenador] = useState<string>('all');
const [selectedTipoDemanda, setSelectedTipoDemanda] = useState<string>('all');
const [loading, setLoading] = useState(true);
const [pilarModal, setPilarModal] = useState<'QA' | 'IEPC' | 'NC' | null>(null);
const [closeCycleModal, setCloseCycleModal] = useState(false);
const [drilldownAnalyst, setDrilldownAnalyst] = useState<any>(null);
```

### Fluxo de Carregamento (`loadData`)

```
useEffect → loadData()
    ↓
Promise.all([
    fetchAllPeriodos(),      → Supabase: import_cycles + cycle_scores
    getActiveCycle(),        → Supabase: app_settings.active_cycle
])
    ↓
setActivePeriodo(activeCycle || periodos[0])
    ↓
fetchCycleScores(periodo)   → Supabase: cycle_scores WHERE periodo = ?
fetchNCRecords(periodo)     → Supabase: nc_records WHERE periodo = ?
fetchElogios(periodo)       → Supabase: elogios WHERE periodo = ?
    ↓
buildAnalystsFromScores(scores) → transforma rows em RealAnalyst[]
    ↓
buildHistory(allPeriodos)   → fetchCycleScores + fetchNCRecords + fetchElogios
                              para cada período → PeriodSummary[]
```

### Listener de Eventos

```typescript
window.addEventListener('zetti_data_changed', loadData);
window.addEventListener('zetti_import_done', loadData);
```

O dashboard recarrega automaticamente quando dados são importados ou modificados.

---

## 4. Queries ao Supabase

| Query | Tabela | Filtro | Função |
|-------|--------|--------|--------|
| `fetchAllPeriodos()` | `import_cycles` + `cycle_scores` | Nenhum | Lista todos os períodos disponíveis |
| `getActiveCycle()` | `app_settings` | `key = 'active_cycle'` | Obtém o ciclo ativo configurado |
| `fetchCycleScores(periodo)` | `cycle_scores` | `periodo = ?` | Scores do ciclo selecionado |
| `fetchNCRecords(periodo)` | `nc_records` | `periodo = ?` | NCs do ciclo selecionado |
| `fetchElogios(periodo)` | `elogios` | `periodo = ?` | Elogios do ciclo selecionado |
| `fetchCycleScores()` (histórico) | `cycle_scores` | Nenhum | Todos os scores para histórico |
| `createClient().from('cycle_summaries')` | `cycle_summaries` | `periodo = ?` | Salva snapshot ao fechar ciclo |

**Total de queries por carregamento completo:** 5 queries paralelas + N queries para histórico (1 por período)

---

## 5. Cálculos Realizados

### 5.1 Médias do Ciclo

```typescript
// QA Médio
qa = analysts.reduce((s, a) => s + (a.nota_final_qa || 0), 0) / analysts.length

// IEPC Médio
iepc = analysts.reduce((s, a) => s + (a.iepc_total || 0), 0) / analysts.length

// Total NCs
ncs = ncRecords.filter(n => n.periodo === periodo).length

// Total Elogios
elogios = elogioRecords.filter(e => e.periodo === periodo).length
```

### 5.2 Pilares QA (P1–P5)

```typescript
// Pesos oficiais
QA_PILLAR_WEIGHTS = { p1: 22, p2: 34, p3: 18, p4: 14, p5: 12 }

// Média de cada pilar
p1_avg = analysts.reduce((s, a) => s + (a.p1 || 0), 0) / analysts.length

// Conversão para percentual
p1_pct = Math.round((p1_avg / 22) * 100)  // max = peso do pilar
```

### 5.3 Pilares IEPC (E1–E5)

```typescript
// Pesos oficiais
IEPC_PILLAR_WEIGHTS = { e1: 30, e2: 20, e3: 20, e4: 15, e5: 15 }

// Mesma lógica dos pilares QA
e1_pct = Math.round((e1_avg / 30) * 100)
```

### 5.4 Classificação de Performance

```typescript
function getPerformanceClass(score: number) {
  if (score >= 90) return 'Excelência Operacional'   // verde
  if (score >= 80) return 'Performance Esperada'      // amarelo
  if (score >= 70) return 'Operacional'               // laranja
  return 'Crítico'                                    // vermelho
}
```

### 5.5 Tendência (Sparkline)

```typescript
function calcTrend(values: number[]): 'up' | 'down' | 'stable' {
  const diff = values[last] - values[last-1]
  if (diff > 0.5) return 'up'
  if (diff < -0.5) return 'down'
  return 'stable'
}
```

### 5.6 Distribuição de NCs por Tipo

```typescript
// Normalização de tipo NC
normalizeNCType(raw: string): string
// Mapeia texto livre → NC-1, NC-2, NC-3, NC-4, NC-5

// Contagem por tipo
ncByType = ncRecords.reduce((acc, nc) => {
  const type = normalizeNCType(nc.tipo_nc)
  acc[type] = (acc[type] || 0) + 1
  return acc
}, {})

// Percentual
pct = Math.round((count / total) * 100)
```

### 5.7 Ranking por Squad

```typescript
squads = analysts.reduce((acc, a) => {
  if (!acc[a.squad]) acc[a.squad] = { qa: 0, iepc: 0, count: 0 }
  acc[a.squad].qa += a.nota_final_qa
  acc[a.squad].iepc += a.iepc_total
  acc[a.squad].count++
  return acc
}, {})
// Médias calculadas na renderização: squad.qa / squad.count
```

---

## 6. KPIs Exibidos

| KPI | Fonte | Tabela | Cálculo | Componente |
|-----|-------|--------|---------|------------|
| **QA Médio do Ciclo** | Supabase | `cycle_scores` | `avg(nota_final_qa)` | `HomeKPICards` |
| **IEPC Médio do Ciclo** | Supabase | `cycle_scores` | `avg(iepc_total)` | `HomeKPICards` |
| **Total de Analistas** | Supabase | `cycle_scores` | `count(distinct analista)` | `HomeKPICards` |
| **Total de NCs** | Supabase | `nc_records` | `count(*)` | `HomeKPICards` |
| **Total de Elogios** | Supabase | `elogios` | `count(*)` | `HomeKPICards` |
| **Analistas QA ≥ 90** | Supabase | `cycle_scores` | `count WHERE nota_final_qa >= 90` | `OperationalHighlights` |
| **Analistas IEPC ≥ 90** | Supabase | `cycle_scores` | `count WHERE iepc_total >= 90` | `OperationalHighlights` |
| **Analistas QA ≥ 80** | Supabase | `cycle_scores` | `count WHERE nota_final_qa >= 80` | `OperationalHighlights` |
| **Analistas QA < 70 (Críticos)** | Supabase | `cycle_scores` | `count WHERE nota_final_qa < 70` | `OperationalHighlights` |
| **Pilar QA Crítico** | Supabase | `cycle_scores` | `min(avg(pN) / peso_pN * 100)` | `OperationalHighlights` |
| **Pilar IEPC Crítico** | Supabase | `cycle_scores` | `min(avg(eN) / peso_eN * 100)` | `OperationalHighlights` |
| **NC Mais Recorrente** | Supabase | `nc_records` | `mode(tipo_nc)` normalizado | `OperationalHighlights` |
| **% Operação Saudável** | Supabase | `cycle_scores` | `(QA≥80 / total) * 100` | `OperationalHighlights` |
| **Squads Afetadas** | Supabase | `cycle_scores` | `distinct squad WHERE qa < 70` | `OperationalHighlights` |
| **Tendência QA** | Supabase | `cycle_scores` | `diff(qa[-1], qa[-2])` | `MonthlyTrendChart` |
| **Tendência IEPC** | Supabase | `cycle_scores` | `diff(iepc[-1], iepc[-2])` | `MonthlyTrendChart` |
| **Posição no Ranking (Squad)** | Supabase | `cycle_scores` | `rank() OVER (ORDER BY avg_qa DESC)` | `TopAnalysts` |

---

## 7. Gráficos e Componentes de Visualização

### 7.1 Gráfico de Tendência Mensal

| Atributo | Valor |
|----------|-------|
| **Componente** | `MonthlyTrendChart` / `MonthlyTrendChartInner` |
| **Tipo** | `LineChart` (recharts) |
| **Dados** | `history: PeriodSummary[]` — um ponto por período |
| **Séries** | QA Médio (azul `#38BDF8`), IEPC Médio (ciano `#06B6D4`) |
| **Fonte** | `cycle_scores` — todos os períodos |
| **Cálculo** | `avg(nota_final_qa)` e `avg(iepc_total)` por período |

### 7.2 Radar de Pilares QA

| Atributo | Valor |
|----------|-------|
| **Componente** | `StrategicRadarChart` |
| **Tipo** | `RadarChart` (recharts) |
| **Dados** | 5 pontos: P1(22), P2(34), P3(18), P4(14), P5(12) |
| **Fonte** | `cycle_scores.p1–p5` |
| **Cálculo** | `avg(pN)` por período, convertido para % do peso máximo |

### 7.3 Radar de Pilares IEPC

| Atributo | Valor |
|----------|-------|
| **Componente** | `StrategicRadarChart` |
| **Tipo** | `RadarChart` (recharts) |
| **Dados** | 5 pontos: E1(30), E2(20), E3(20), E4(15), E5(15) |
| **Fonte** | `cycle_scores.e1–e5` |
| **Cálculo** | `avg(eN)` por período, convertido para % do peso máximo |

### 7.4 Donut de NCs

| Atributo | Valor |
|----------|-------|
| **Componente** | `NCDonutChart` |
| **Tipo** | `PieChart` com `innerRadius` (recharts) |
| **Dados** | Distribuição de NCs por tipo (NC-1 a NC-5) |
| **Fonte** | `nc_records.tipo_nc` |
| **Cálculo** | `count(*)` por tipo normalizado + percentual |

### 7.5 Sparklines de Tendência

| Atributo | Valor |
|----------|-------|
| **Componente** | `Sparkline` (SVG inline) |
| **Tipo** | `<polyline>` SVG |
| **Dados** | Últimos N valores de QA ou IEPC |
| **Fonte** | `history: PeriodSummary[]` |

### 7.6 Heatmap de Squads

| Atributo | Valor |
|----------|-------|
| **Componente** | Inline no `HomeExecutiveView` |
| **Tipo** | Grid de células coloridas |
| **Dados** | `squads: Record<string, {qa, iepc, count}>` |
| **Fonte** | `cycle_scores` agrupado por squad |
| **Cálculo** | `avg(nota_final_qa)` e `avg(iepc_total)` por squad |

---

## 8. Subcomponentes e Responsabilidades

| Componente | Arquivo | Responsabilidade | Dados Recebidos |
|------------|---------|-----------------|-----------------|
| `HomeKPICards` | `HomeKPICards.tsx` | Cards de KPI principais | `analysts[]`, `ncRecords[]`, `elogios[]` |
| `HeroCycleStatus` | `HeroCycleStatus.tsx` | Status do ciclo ativo | `periodo`, `analysts[]` |
| `MonthlyTrendChart` | `MonthlyTrendChart.tsx` | Gráfico de tendência | `history: PeriodSummary[]` |
| `MonthlyTrendChartInner` | `MonthlyTrendChartInner.tsx` | Implementação interna do gráfico | `data[]` |
| `TopAnalysts` | `TopAnalysts.tsx` | Ranking de analistas | `analysts[]`, `periodo` |
| `NavigationShortcuts` | `NavigationShortcuts.tsx` | Atalhos de navegação | Estático |
| `OperationalHighlights` | Inline em `HomeExecutiveView` | Destaques operacionais | `lastPeriod`, `history` |
| `StrategicRadarChart` | Inline em `HomeExecutiveView` | Radar de pilares | `data[]`, `type`, `maxScale` |
| `NCDonutChart` | Inline em `HomeExecutiveView` | Donut de NCs | `ncData[]`, `total` |
| `PilarModal` | Inline em `HomeExecutiveView` | Modal de detalhes de pilar | `type`, pillar data |
| `CloseCycleModal` | Inline em `HomeExecutiveView` | Modal de fechamento de ciclo | `periodo`, `summary` |
| `DrilldownPanel` | `DrilldownNavigation.tsx` | Painel de drilldown de analista | `analyst` |
| `ImportModal` | `ImportModal.tsx` | Modal de importação | `isOpen`, `onClose` |

---

## 9. Fluxo de Fechamento de Ciclo

```
Usuário clica "Fechar Ciclo"
    ↓
CloseCycleModal abre
    ↓
Usuário clica "Gerar Resumo com IA"
    ↓
useChat('GEMINI') → /api/ai/chat-completion → Gemini API
    ↓
Resumo gerado em texto
    ↓
Usuário confirma fechamento
    ↓
supabase.from('import_cycles').update({ is_closed: true })
supabase.from('cycle_summaries').upsert({ periodo, ai_summary, ... })
lsSet(LS_CLOSED_CYCLES, [...existing, closedCycle])  ← localStorage também
    ↓
dispatchDataChanged() → recarrega dashboard
```

---

## 10. Problemas Identificados no Dashboard

| Problema | Severidade | Descrição |
|----------|-----------|-----------|
| **Componente gigante** | 🟠 Médio | 2013 linhas em um único arquivo — difícil manutenção |
| **Histórico N+1** | 🟠 Médio | `buildHistory()` faz 1 query por período — pode ser lento com muitos ciclos |
| **Filtros sem URL** | 🟡 Baixo | Estado de filtros perdido ao navegar — não persistido em query params |
| **Fechamento duplicado** | 🟠 Médio | `is_closed` salvo em Supabase E localStorage — risco de inconsistência |
| **Pilares sem dados reais** | 🟡 Baixo | Radar mostra pesos fixos, não médias reais do ciclo quando `pct = 0` |
| **Sem paginação** | 🟡 Baixo | Todos os analistas carregados em memória — pode ser lento com muitos dados |
