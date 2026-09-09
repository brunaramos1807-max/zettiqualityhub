---

name: quality-indicators
description: Especificação matemática, metodológica e regras de agregação dos indicadores oficiais e derivados no QualiVisão.
-----------------------------------------------------------------------------------------------------------------------------

# Indicadores de Qualidade — Fórmulas e Regras Metodológicas

## 1. Objetivo da Skill

Esta Skill define como os resultados de qualidade devem ser interpretados, preservados, calculados e agregados no QualiVisão.

O QualiVisão trabalha com duas camadas:

**Resultado Oficial → Indicador Derivado**

### Resultado Oficial

Valor produzido e homologado pelo sistema de avaliação/origem.

Exemplos:

* nota final QA;
* pontuação dos pilares QA;
* pontuação dos critérios QA;
* resultado IEPC;
* pontuação das dimensões IEPC;
* quantidade de NC;
* pontos deduzidos por NC.

### Indicador Derivado

Cálculo realizado pelo QualiVisão a partir dos resultados oficiais.

Exemplos:

* média;
* mediana;
* aproveitamento;
* aderência;
* variação;
* taxa de NC;
* distribuição;
* concentração;
* indicadores estatísticos.

**Regra fundamental:**

O QualiVisão pode analisar e agregar resultados oficiais, mas não deve substituir ou alterar o resultado oficial recebido da origem.

---

# 2. Estrutura Oficial do QA

O QA — Garantia da Qualidade — possui valor máximo metodológico de **100 pontos**, distribuído em cinco pilares.

## P1 — Gestão do Fluxo e Rastreabilidade — 22 pontos

| Código    | Critério        |   Peso |
| --------- | --------------- | -----: |
| P1.1      | Identificação   |      5 |
| P1.2      | Comunicação SUP |      9 |
| P1.3      | Encerramento    |      8 |
| **Total** |                 | **22** |

## P2 — Gestão da Tratativa da Demanda — 34 pontos

| Código    | Critério             |   Peso |
| --------- | -------------------- | -----: |
| P2.1      | Validação de Dúvidas |      8 |
| P2.2      | Orientação           |      9 |
| P2.3      | Resolução            |      9 |
| P2.4      | Documentação         |      8 |
| **Total** |                      | **34** |

## P3 — Análise e Assertividade Técnica — 18 pontos

| Código    | Critério             |   Peso |
| --------- | -------------------- | -----: |
| P3.1      | Diagnóstico Técnico  |     10 |
| P3.2      | Ferramentas de Apoio |      8 |
| **Total** |                      | **18** |

## P4 — Qualidade da Comunicação — 14 pontos

| Código    | Critério               |   Peso |
| --------- | ---------------------- | -----: |
| P4.1      | Língua Portuguesa      |      4 |
| P4.2      | Tom e Postura          |      5 |
| P4.3      | Clareza e Continuidade |      5 |
| **Total** |                        | **14** |

## P5 — Conduta Relacional — 12 pontos

| Código    | Critério      |   Peso |
| --------- | ------------- | -----: |
| P5.1      | Cordialidade  |      4 |
| P5.2      | Proatividade  |      5 |
| P5.3      | Over Delivery |      3 |
| **Total** |               | **12** |

**Total QA = 100 pontos.**

---

# 3. Cálculo Estrutural do QA

Quando os pilares já estiverem calculados pela origem:

$$
QA_{base}=P1+P2+P3+P4+P5
$$

Cada pilar possui seu limite máximo definido pela metodologia:

$$
P1_{max}=22
$$

$$
P2_{max}=34
$$

$$
P3_{max}=18
$$

$$
P4_{max}=14
$$

$$
P5_{max}=12
$$

Portanto:

$$
P1_{max}+P2_{max}+P3_{max}+P4_{max}+P5_{max}=100
$$

### Efeito das Não Conformidades

Quando a metodologia determinar dedução por NC:

$$
QA_{final}=QA_{base}-D_{NC}
$$

Onde:

* `QA_base` = soma dos pilares;
* `D_NC` = total de pontos deduzidos pelas NCs.

Atualmente, a regra padrão utilizada é:

$$
D_{NC}=20\times quantidade\ de\ NCs
$$

Entretanto, o valor **-20 não é uma constante universal do produto**.

A origem deve informar o valor efetivamente aplicado quando esse dado estiver disponível.

---

# 4. Regra de Não Aplicável

Quando um critério QA for classificado como **Não Aplicável (NA)**, ele não deve ser tratado como zero automaticamente.

O peso correspondente ao critério deve ser retirado da base válida utilizada para calcular o aproveitamento daquele conjunto de critérios.

Conceitualmente:

$$
Aproveitamento =
\frac{Pontos\ Obtidos\ Válidos}
{Pontos\ Máximos\ Válidos}
\times100
$$

Portanto:

**NA ≠ zero.**

O tratamento de NA deve preservar a metodologia da origem.

O QualiVisão não deve transformar automaticamente um critério não aplicável em perda de qualidade.

---

# 5. Aproveitamento dos Pilares

Para análise comparativa, o aproveitamento de um pilar pode ser calculado por:

$$
App_P=
\frac{Pontos\ Obtidos}
{Pontos\ Máximos\ Válidos}
\times100
$$

Exemplo:

Se um pilar possui 22 pontos máximos e obteve 19:

$$
App_{P1}=\frac{19}{22}\times100
$$

$$
App_{P1}=86,36\%
$$

Quando houver critérios NA, utilizar os pontos máximos válidos conforme a regra da metodologia.

---

# 6. IEPC

O IEPC — Índice de Experiência e Percepção do Cliente — possui valor máximo de **100 pontos**.

| Código    | Dimensão               |    Peso |
| --------- | ---------------------- | ------: |
| E1        | Resolução Percebida    |      30 |
| E2        | Clareza e Confiança    |      20 |
| E3        | Esforço do Cliente     |      20 |
| E4        | Tempo e Fluidez        |      15 |
| E5        | Experiência Relacional |      15 |
| **Total** |                        | **100** |

Quando as dimensões chegam calculadas pela origem:

$$
IEPC=E1+E2+E3+E4+E5
$$

O IEPC deve permanecer independente do QA.

**QA ≠ IEPC**

Não criar automaticamente um indicador resultante de:

$$
QA+IEPC
$$

ou qualquer média arbitrária entre ambos.

---

# 7. QA e IEPC como Dimensões Complementares

QA e IEPC podem ser analisados conjuntamente sem serem fundidos.

Exemplo:

**QA alto + IEPC baixo**

Pode indicar boa conformidade técnica acompanhada de percepção ruim do cliente.

**QA baixo + IEPC alto**

Pode indicar boa percepção do cliente apesar de desvios técnicos identificados.

Essa análise deve ser interpretada como relação entre dois indicadores independentes.

Não constitui um novo score.

---

# 8. Não Conformidades

A NC é registrada como **evento estruturado de qualidade**.

O sistema deve separar:

**Evento de NC**

de

**Efeito da NC sobre o resultado**

Campos conceituais:

* tipo de NC;
* classificação;
* quantidade;
* ciclo;
* equipe;
* referência;
* pontos deduzidos.

### Regra atual

A metodologia atual utiliza:

**-20 pontos por ocorrência.**

Porém, a arquitetura deve permitir configuração futura.

O código não deve conter lógica fixa como:

```text
if nc > 0:
    nota -= 20
```

A penalidade deve ser obtida da configuração metodológica ou do resultado oficial recebido.

---

# 9. Média de Resultados

Quando todas as observações possuem o mesmo peso, utilizar média aritmética:

$$
\bar X=
\frac{\sum X_i}{n}
$$

Exemplo:

Resultados QA:

90, 80, 85

$$
\bar X=
\frac{90+80+85}{3}
=85
$$

Não chamar essa operação de média ponderada.

### Média ponderada

Somente utilizar quando houver pesos definidos:

$$
\bar X_w=
\frac{\sum(w_iX_i)}
{\sum w_i}
$$

Os pesos devem existir como regra metodológica explícita.

---

# 10. Taxa de Não Conformidade

Quando a base possuir quantidade de NCs e quantidade de atendimentos auditados compatíveis:

$$
TNC=
\frac{Total\ de\ NCs}
{Total\ de\ Atendimentos\ Auditados}
\times100
$$

Exemplo:

10 NCs em 100 atendimentos auditados:

$$
TNC=10\%
$$

A interpretação deve considerar que um atendimento pode possuir mais de uma NC.

Portanto:

**Total de NCs ≠ necessariamente quantidade de atendimentos com NC.**

---

# 11. Aderência à Meta

Para indicadores em que **maior é melhor**:

$$
Aderência=
\frac{Resultado}
{Meta}
\times100
$$

Exemplo:

Meta = 90

Resultado = 87

$$
Aderência=
\frac{87}{90}\times100
=96,67\%
$$

Aderência superior a 100% significa que o resultado superou a meta, quando a direção do indicador permitir essa interpretação.

---

# 12. Direção do Indicador

Todo indicador deve possuir uma orientação metodológica.

### Maior é melhor

Exemplos:

* QA;
* IEPC.

### Menor é melhor

Exemplos:

* TNC;
* quantidade de NCs;
* determinados tempos ou taxas de erro.

### Valor-alvo

Alguns indicadores possuem um valor ideal ou faixa-alvo.

A fórmula de aderência deve ser definida de acordo com a natureza do indicador.

**Não utilizar automaticamente a mesma fórmula para todos os indicadores.**

---

# 13. Variação entre Períodos

Para indicadores comparáveis entre períodos:

$$
Variação\%=
\frac{Valor_{Atual}-Valor_{Anterior}}
{Valor_{Anterior}}
\times100
$$

Exemplo:

QA anterior = 80

QA atual = 84

$$
Variação=
\frac{84-80}{80}\times100
=5\%
$$

A interpretação depende da direção do indicador.

Para QA:

**+5% → melhoria**

Para TNC:

**+5% → piora**, pois menor é melhor.

---

# 14. Mediana e Distribuição

O QualiVisão pode utilizar mediana quando a distribuição possuir assimetria ou quando a mediana representar melhor a característica que está sendo analisada.

A média e a mediana não devem ser tratadas como equivalentes.

O usuário deve conseguir alternar ou comparar as medidas quando isso fizer sentido para a análise.

---

# 15. Dados Insuficientes

O sistema não deve fabricar resultados quando a base for insuficiente.

Dados ausentes ou insuficientes não devem ser convertidos automaticamente em:

* zero;
* 100%;
* pior desempenho;
* melhor desempenho;
* NC.

Quando a metodologia exigir uma quantidade mínima de dados, essa regra deve pertencer à definição do indicador.

O sistema deve informar:

**Dados insuficientes para análise.**

---

# 16. Agregação

Antes de calcular uma média, taxa ou outro indicador agregado, o sistema deve identificar:

* organização;
* operação;
* área;
* equipe;
* ciclo;
* período;
* população analisada;
* denominador;
* peso, quando houver;
* critérios de inclusão;
* tratamento de NA;
* direção do indicador.

Não misturar bases incompatíveis.

Exemplo:

Não calcular uma única média comparativa juntando ciclos com metodologias diferentes sem identificar essa diferença.

---

# 17. Integridade da Origem

O QualiVisão deve preservar a diferença entre:

**Valor recebido da origem**

e

**Valor calculado pelo QualiVisão.**

Exemplo:

```text
ORIGEM
QA final = 86
IEPC = 91
P1 = 20
P2 = 29
P3 = 16
P4 = 12
P5 = 9

QUALIVISÃO
Média QA da equipe = 84,7
Média IEPC da equipe = 89,3
Variação QA = +3,2%
TNC = 4,8%
```

Os primeiros valores são resultados oficiais.

Os segundos são indicadores derivados.

---

# 18. Regra de Fonte

Quando o arquivo ou integração de origem já fornecer:

* nota final QA;
* pilares;
* dimensões IEPC;
* pontos deduzidos;
* classificações;

o QualiVisão deve **preservar e utilizar esses valores como oficiais**, não substituí-los por um novo cálculo interno.

O cálculo documentado nesta Skill representa a **metodologia de referência e validação**, não autorização para o QualiVisão reavaliar individualmente os dados.

---

# 19. Princípio Final

Todo indicador do QualiVisão deve responder claramente:

**O que está sendo medido?**

**Qual é a base?**

**Qual é a fórmula?**

**Qual é o período?**

**Qual é o contexto?**

**Qual é a direção desejada?**

**O valor é oficial ou derivado?**

Se essas informações não estiverem definidas, o indicador não deve ser tratado como metodologia oficial.
