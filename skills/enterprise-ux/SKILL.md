---

name: enterprise-ux
description: Diretrizes canônicas de design system, tokens semânticos, hierarquia visual e padrões de interação do QualiVisão baseados no Zixel UI.
---------------------------------------------------------------------------------------------------------------------------------------------------

# Enterprise UX & Design System — Zixel UI

## 1. Filosofia de Interface

O QualiVisão utiliza uma linguagem visual de **Enterprise SaaS**: limpa, sóbria, objetiva e orientada à análise de dados.

A interface deve priorizar:

* leitura rápida;
* hierarquia visual clara;
* alta densidade informacional sem poluição;
* consistência entre telas;
* redução de carga cognitiva;
* destaque para informações relevantes à tomada de decisão.

Evitar elementos decorativos que não contribuam para compreensão ou ação.

### Geometria

* Cantos quase retos.
* Raio máximo permitido: **6px** (`--radius-lg: 0.375rem`).
* Não utilizar `rounded-full`.
* Não utilizar elementos circulares como padrão visual de componentes.
* Avatares, badges, indicadores e controles devem utilizar formatos quadrados ou retangulares com cantos levemente arredondados.

---

## 2. Paleta de Cores e Tokens

Utilizar tokens semânticos em vez de espalhar valores hexadecimais diretamente pelos componentes.

### Tokens principais

* `--background`: `#F3F4F6`
* `--foreground`: `#111827`
* `--card`: `#FFFFFF`
* `--border`: `#E5E7EB`
* `--accent`: `#EFF6FF`
* `--accent-foreground`: `#1D4ED8`
* `--muted`: `#F9FAFB`
* `--muted-foreground`: `#6B7280`
* `--destructive`: `#EF4444`

### CTA e interação

O azul de interação principal deve utilizar:

* `#2563EB`
* hover: `#1D4ED8`

O azul deve representar ações, seleção ativa, links e elementos interativos relevantes.

### Status

Utilizar linguagem visual consistente:

* verde: sucesso;
* azul: informação;
* amarelo: atenção;
* vermelho: crítico/erro;
* cinza: neutro.

Evitar utilizar cores apenas como decoração.

---

## 3. Tipografia

A tipografia padrão é **Inter**.

Priorizar:

* títulos objetivos;
* textos curtos;
* hierarquia clara;
* números e indicadores com destaque proporcional à sua importância.

A interface deve favorecer leitura operacional e analítica, não aparência editorial.

---

## 4. Hierarquia de Informação

Toda tela deve organizar a informação progressivamente.

### Nível 1 — Decisão imediata

Informações que o usuário precisa compreender rapidamente.

Normalmente:

* 3 a 4 métricas principais;
* status;
* alertas relevantes;
* principais desvios.

O objetivo é permitir compreensão inicial em poucos segundos.

Isso é uma diretriz de composição, não uma quantidade obrigatória para todas as telas.

### Nível 2 — Contexto

Informações necessárias para interpretar os indicadores:

* tendência histórica;
* comparação entre ciclos;
* metas;
* variação;
* contexto da operação;
* distribuição dos resultados.

### Nível 3 — Detalhamento

Informações estruturadas para investigação:

* tabelas;
* pilares;
* critérios;
* equipes;
* indicadores;
* estratificações;
* Pareto;
* distribuições;
* comparações.

### Nível 4 — Dados Estruturados

Detalhamento do dado utilizado para sustentar o resultado, sem reproduzir a auditoria de origem.

Pode incluir:

* registros estruturados;
* resultados por critério;
* dimensões;
* eventos de NC;
* período;
* operação;
* equipe;
* ciclo;
* classificações;
* parâmetros utilizados no cálculo.

**Não incluir neste nível:**

* conversas;
* tickets completos;
* transcrições;
* evidências textuais;
* justificativas de auditoria;
* anexos de avaliação;
* conteúdo individual da monitoria.

O Nível 4 explica **de onde vem o número**, mas não reproduz o processo de avaliação que originou o número.

---

## 5. Preservação de Contexto

Toda tela analítica deve deixar explícito o contexto ativo quando aplicável.

Utilizar uma área superior discreta com informações como:

`Contexto Ativo: Operação X | Equipe Y | Ciclo MM/YYYY`

O contexto deve ser atualizado conforme os filtros aplicados.

Quando houver múltiplos filtros, o usuário deve conseguir identificar claramente:

* empresa;
* operação;
* área;
* equipe;
* ciclo;
* período;
* indicador analisado.

---

## 6. Filtros e Navegação Analítica

Filtros devem permitir investigação progressiva sem retirar o usuário do contexto.

A aplicação deve favorecer o fluxo:

**Visão geral → filtro → comparação → detalhamento → diagnóstico**

Evitar navegação excessiva entre páginas para responder perguntas que podem ser resolvidas por filtros, tabelas ou drill-down contextual.

Filtros ativos devem ser visíveis e removíveis individualmente.

---

## 7. Componentes

Criar componentes reutilizáveis para garantir consistência visual.

Componentes prioritários:

* Button;
* Badge;
* Card;
* Input;
* Select;
* DateRange;
* FilterBar;
* Modal;
* Table;
* Tabs;
* MetricCard;
* StatusIndicator;
* EmptyState;
* Alert;
* Tooltip.

Componentes devem utilizar os tokens semânticos definidos pelo Design System.

Não duplicar estilos equivalentes em páginas diferentes.

---

## 8. Dados e Visualização

A interface deve privilegiar visualizações que ajudem o usuário a interpretar qualidade.

Exemplos:

* indicadores;
* séries temporais;
* comparações;
* distribuição;
* Pareto;
* tabelas analíticas;
* gráficos de controle quando houver dados e condições estatísticas adequadas.

Não criar gráficos apenas para preencher espaço.

Cada visualização deve responder a uma pergunta de gestão.

---

## 9. Estados da Interface

Toda tela deve considerar pelo menos:

* carregamento;
* dados disponíveis;
* ausência de dados;
* erro;
* filtros sem resultado;
* dados insuficientes para análise.

**Ausência de dados não deve ser apresentada como zero.**

Quando não houver dados suficientes para uma conclusão, informar claramente essa condição.

---

## 10. Responsividade

A interface deve funcionar adequadamente em diferentes resoluções, preservando a hierarquia das informações.

Em telas menores:

* reduzir elementos secundários;
* reorganizar tabelas e filtros;
* preservar indicadores essenciais;
* evitar perda de contexto.

A responsividade não deve simplesmente empilhar todos os elementos verticalmente.

---

## 11. Princípio de Consistência

Uma mesma informação deve possuir a mesma linguagem visual em todo o sistema.

Exemplos:

Se verde representa sucesso em uma tela, não deve representar alerta em outra.

Se um indicador possui determinado formato em uma página, sua representação deve permanecer consistente nas demais.

O usuário deve aprender a interface uma vez e reutilizar esse conhecimento em todo o produto.

---

## 12. Regra de Ouro de UX

Cada elemento da interface deve responder a pelo menos uma destas necessidades:

**Entender → Comparar → Investigar → Decidir → Agir**

Se um componente não contribui para nenhuma delas, sua necessidade deve ser questionada.

O objetivo do Design System não é apenas deixar o QualiVisão visualmente bonito.

É tornar os dados de qualidade **rápidos de interpretar, fáceis de comparar e úteis para tomada de decisão**.
