---

name: quality-tools
description: Biblioteca metodológica e diretrizes de aplicação prática das Ferramentas da Qualidade no QualiVisão, com seleção contextual conforme o problema.
--------------------------------------------------------------------------------------------------------------------------------------------------------------

# Ferramentas da Qualidade — Metodologias e Aplicação

## 1. Princípio de Não-Obrigatoriedade

As ferramentas da qualidade não devem ser tratadas como etapas burocráticas ou obrigatórias em todos os problemas.

Elas constituem uma biblioteca metodológica utilizada conforme:

* natureza do problema;
* objetivo da análise;
* quantidade e qualidade dos dados disponíveis;
* complexidade do desvio;
* estágio da investigação;
* necessidade de priorização ou planejamento.

Fluxo conceitual:

**Problema/Desvio → Necessidade de Análise → Ferramenta Adequada → Resultado → Próxima Decisão**

Uma ferramenta só deve ser utilizada quando contribuir para responder uma pergunta de gestão.

---

# 2. Seleção Contextual

O QualiVisão deve auxiliar o usuário a identificar qual ferramenta é mais adequada ao problema.

Exemplos:

| Necessidade                                            | Ferramenta   |
| ------------------------------------------------------ | ------------ |
| Onde estão concentrados os problemas?                  | Pareto       |
| Quais causas podem explicar o problema?                | Ishikawa     |
| Por que determinada causa ocorre?                      | 5 Porquês    |
| Qual problema deve ser tratado primeiro?               | GUT          |
| Como executar a ação?                                  | 5W2H         |
| Como conduzir uma melhoria estruturada?                | PDCA / DMAIC |
| O processo está estável ou apresenta causas especiais? | CEP          |

A recomendação de uma ferramenta deve considerar o contexto e não apenas palavras-chave do problema.

---

# 3. Catálogo Oficial

## A. Pareto — Priorização por Concentração

### Objetivo

Identificar onde os problemas, perdas ou ocorrências estão concentrados para orientar a priorização.

### Quando usar

Quando houver múltiplas categorias comparáveis e for necessário identificar quais representam maior concentração.

Exemplos:

* critérios com maior perda de pontos;
* tipos de NC mais frequentes;
* equipes com maior concentração de ocorrências;
* categorias de problemas.

### Mecânica

1. Classificar as categorias;
2. ordenar em ordem decrescente;
3. calcular participação relativa;
4. calcular percentual acumulado;
5. representar a concentração.

A referência de 80% pode ser utilizada como linha visual de análise.

**Não assumir que os dados necessariamente apresentarão uma distribuição 80/20.**

O objetivo é identificar a concentração real encontrada nos dados.

---

# 4. Ishikawa — Diagrama de Causa e Efeito

### Objetivo

Organizar hipóteses de causas que podem contribuir para determinado problema.

### Quando usar

Quando o problema possuir múltiplas causas possíveis ou quando for necessário estruturar uma investigação em equipe.

### Estrutura padrão — 6Ms

* Método;
* Mão de Obra;
* Máquina/Sistemas;
* Material/Insumos;
* Medição;
* Meio Ambiente.

O sistema deve permitir registrar causas e subcausas dentro das categorias.

### Regra de validação

Uma causa inicialmente registrada no Ishikawa é uma **hipótese**, não uma causa comprovada.

O fluxo deve distinguir:

**Hipótese → Investigação → Evidência estruturada/resultado → Causa validada**

O QualiVisão não deve declarar automaticamente uma causa como verdadeira apenas porque foi registrada no diagrama.

---

# 5. 5 Porquês — Aprofundamento Causal

### Objetivo

Aprofundar progressivamente uma causa ou problema até chegar a uma causa fundamental que possa ser tratada no processo.

### Quando usar

Adequado principalmente para problemas nos quais seja possível construir uma cadeia causal relativamente clara.

### Mecânica

**Problema → Por quê? → Resposta → Por quê? → Resposta → ...**

O número cinco é uma referência metodológica, não uma obrigação matemática.

Pode haver menos ou mais etapas quando a investigação justificar.

### Regra

Cada resposta deve ser:

* factual;
* coerente com o processo;
* verificável;
* relacionada à resposta anterior.

Evitar conclusões baseadas exclusivamente em:

* opinião;
* culpa individual;
* suposição;
* julgamento comportamental.

---

# 6. Matriz GUT — Priorização

### Objetivo

Priorizar problemas ou causas concorrentes.

A matriz utiliza três dimensões:

* **G — Gravidade**
* **U — Urgência**
* **T — Tendência**

Cada dimensão recebe uma classificação de 1 a 5.

Cálculo:

$$
GUT = G \times U \times T
$$

Quanto maior o resultado, maior a prioridade atribuída conforme a metodologia adotada.

### Exemplo

Problema A:

* G = 5
* U = 4
* T = 5

$$
5\times4\times5=100
$$

Problema B:

* G = 3
* U = 3
* T = 3

$$
3\times3\times3=27
$$

O problema A possui maior prioridade segundo a matriz.

As escalas e critérios de interpretação devem permanecer configuráveis quando necessário.

---

# 7. 5W2H — Plano de Ação

### Objetivo

Transformar uma decisão de melhoria em uma ação estruturada e executável.

### Campos

* **What** — O que será feito;
* **Why** — Por que será feito;
* **Where** — Onde;
* **Who** — Quem;
* **When** — Quando;
* **How** — Como;
* **How Much** — Quanto custa, quando aplicável.

O 5W2H deve estar relacionado ao problema ou causa que motivou a ação.

Fluxo:

**Problema → Causa → Ação → Responsável → Prazo → Indicador-alvo**

O 5W2H não deve ser utilizado apenas como checklist administrativo.

---

# 8. PDCA — Melhoria Contínua

### Objetivo

Estruturar ciclos de melhoria contínua.

### Etapas

**Plan → Do → Check → Act**

* **Plan:** planejar;
* **Do:** executar;
* **Check:** verificar;
* **Act:** agir sobre o resultado, padronizando ou corrigindo.

O PDCA pode organizar um conjunto de ações e acompanhar a evolução do problema ao longo dos ciclos.

---

# 9. DMAIC — Melhoria Estruturada

### Objetivo

Estruturar projetos de melhoria orientados por dados.

### Etapas

**Define → Measure → Analyze → Improve → Control**

* **Define:** definir o problema;
* **Measure:** medir;
* **Analyze:** analisar;
* **Improve:** melhorar;
* **Control:** controlar.

O DMAIC não deve ser aplicado automaticamente a qualquer desvio.

É mais apropriado quando houver um problema estruturado que exija investigação e melhoria sistemática.

---

# 10. Relação entre Ferramentas

As ferramentas podem ser combinadas quando isso fizer sentido.

Exemplo:

**Pareto**
→ identifica onde está a maior concentração;

**Ishikawa**
→ organiza possíveis causas;

**5 Porquês**
→ aprofunda uma causa específica;

**GUT**
→ prioriza problemas ou causas;

**5W2H**
→ estrutura as ações;

**PDCA/DMAIC**
→ governa o ciclo de melhoria e controle.

Essa sequência é um exemplo possível, não uma sequência obrigatória.

---

# 11. Ferramenta ≠ Resultado

O uso de uma ferramenta não significa que o problema esteja resolvido.

Exemplos:

* Pareto identifica concentração, mas não determina a causa;
* Ishikawa organiza hipóteses, mas não prova causalidade;
* 5 Porquês aprofunda uma cadeia causal, mas depende da qualidade das respostas;
* GUT prioriza, mas não resolve;
* 5W2H organiza ações, mas não garante eficácia;
* PDCA/DMAIC estruturam a melhoria, mas dependem da execução e dos resultados.

O resultado produzido pela ferramenta deve ser tratado como insumo para a próxima decisão.

---

# 12. Relação com o Ciclo de Gestão da Qualidade

As ferramentas apoiam diferentes momentos do ciclo:

**Medição → Análise → Diagnóstico → Melhoria → Controle**

Exemplo:

**Medição**
→ identifica queda no QA.

**Análise**
→ Pareto identifica concentração dos desvios.

**Diagnóstico**
→ Ishikawa e/ou 5 Porquês investigam possíveis causas.

**Melhoria**
→ GUT ajuda a priorizar e 5W2H estrutura as ações.

**Controle**
→ PDCA/DMAIC acompanha a eficácia.

Quando houver necessidade de avaliar estabilidade estatística do processo, utilizar o módulo de **CEP** e suas regras específicas.

---

# 13. Princípio de Escolha da Ferramenta

O QualiVisão deve preferir a ferramenta **mais simples capaz de responder adequadamente à pergunta de gestão**.

Não utilizar uma ferramenta complexa apenas porque ela está disponível.

A escolha deve considerar:

**Pergunta → Dados disponíveis → Complexidade → Ferramenta → Decisão**

---

# 14. Regra de Integridade

As ferramentas da qualidade devem trabalhar sobre informações estruturadas e confiáveis.

Nenhuma ferramenta deve:

* inventar dados;
* transformar hipótese em fato;
* criar evidência inexistente;
* alterar resultados oficiais;
* substituir a avaliação realizada na origem;
* atribuir culpa individual sem base metodológica.

O QualiVisão utiliza ferramentas para **compreender problemas e orientar decisões de melhoria**, não para reconstruir a auditoria de origem.

---

# 15. Princípio Final

Uma ferramenta de qualidade só agrega valor quando ajuda a responder uma pergunta concreta:

**Onde está o problema?**

**Por que ele pode estar acontecendo?**

**O que devemos priorizar?**

**O que faremos?**

**A ação funcionou?**

O QualiVisão deve conectar a ferramenta à pergunta, ao dado e à decisão correspondente.
