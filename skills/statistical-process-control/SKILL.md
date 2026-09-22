---

name: statistical-process-control
description: Diretrizes para aplicação de Controle Estatístico de Processos (CEP), seleção de cartas de controle, cálculo de limites estatísticos e identificação de causas especiais no QualiVisão.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Controle Estatístico de Processos (CEP) — QualiVisão

## 1. Objetivo

O CEP é uma capacidade analítica do QualiVisão destinada a avaliar o comportamento de processos ao longo do tempo.

Seu objetivo principal é distinguir:

**Variação comum do processo**

de

**Variação associada a possíveis causas especiais.**

O CEP não deve ser utilizado apenas para classificar um indicador como “bom” ou “ruim”.

Ele deve ajudar a responder:

**O processo está apresentando comportamento estatisticamente compatível com sua variação esperada ou há sinais de uma causa especial?**

---

# 2. Princípio de Aplicabilidade

O CEP não deve ser aplicado automaticamente a qualquer indicador.

Antes de selecionar uma carta ou método estatístico, o sistema deve avaliar:

* natureza da variável;
* unidade de observação;
* frequência temporal;
* existência de sequência temporal;
* tamanho e estrutura da amostra;
* independência ou dependência das observações;
* existência de subgrupos racionais;
* quantidade de dados disponível;
* objetivo da análise.

Não utilizar um único limite de tamanho amostral como regra universal para determinar aplicabilidade.

Quando os dados forem insuficientes para uma análise estatística confiável, o sistema deve informar explicitamente essa limitação e, quando possível, apresentar estatística descritiva.

Exemplo:

**“Dados insuficientes para aplicação confiável de carta de controle. Exibindo estatística descritiva.”**

---

# 3. Natureza dos Dados

A escolha da técnica depende do tipo de variável.

## 3.1 Dados por Atributos

Utilizados quando o resultado representa contagem, ocorrência ou classificação.

Exemplos:

* presença/ausência de NC;
* quantidade de unidades não conformes;
* quantidade de defeitos;
* ocorrências por unidade.

---

## 3.2 Dados Contínuos

Utilizados quando a variável assume valores quantitativos em escala contínua ou aproximadamente contínua.

Exemplos possíveis:

* tempo;
* duração;
* medidas físicas;
* determinados indicadores quantitativos.

Notas de QA ou IEPC só devem ser tratadas como variáveis para CEP quando sua estrutura temporal e natureza estatística forem adequadas ao método escolhido.

Não assumir automaticamente que qualquer nota percentual constitui uma variável contínua apropriada para qualquer carta.

---

# 4. Seleção da Carta de Controle

A carta deve ser escolhida de acordo com a estrutura dos dados.

## 4.1 Carta p — Proporção de Não Conformes

Utilizada quando cada unidade pode ser classificada como conforme ou não conforme e o tamanho do grupo pode variar.

$$
p_i=
\frac{d_i}{n_i}
$$

Onde:

* \(d_i\) = quantidade de unidades não conformes;
* \(n_i\) = quantidade total de unidades avaliadas.

Linha central:

$$
\bar p=
\frac{\sum d_i}{\sum n_i}
$$

Limites:

$$
LSC_i=
\bar p+
3\sqrt{\frac{\bar p(1-\bar p)}{n_i}}
$$

$$
LIC_i=
\bar p-
3\sqrt{\frac{\bar p(1-\bar p)}{n_i}}
$$

Quando o limite inferior calculado for negativo, deve ser tratado conforme as regras estatísticas aplicáveis, não apresentado como valor negativo de proporção.

### Exemplo no QualiVisão

Se a unidade de análise for:

**“atendimentos com NC / atendimentos auditados”**

a carta p pode ser candidata.

---

# 5. Carta np — Número de Não Conformes

Quando o tamanho do grupo \(n\) for constante, pode-se utilizar carta np.

Ela monitora a quantidade de unidades não conformes em cada amostra.

A escolha entre p e np deve considerar principalmente se o tamanho dos subgrupos permanece constante.

---

# 6. Carta u — Defeitos por Unidade

Utilizada quando uma unidade pode apresentar mais de um defeito e o interesse está na taxa de defeitos por unidade de oportunidade.

$$
u_i=
\frac{c_i}{n_i}
$$

Onde:

* \(c_i\) = número de defeitos;
* \(n_i\) = número de unidades ou oportunidades consideradas.

A carta u não deve ser utilizada apenas porque existe uma quantidade de NC.

É necessário verificar se o fenômeno representa **múltiplos defeitos por unidade**.

---

# 7. Carta c — Número de Defeitos

Quando o número de oportunidades/unidades observadas for constante e o interesse estiver no número de defeitos, pode ser considerada a carta c.

A escolha entre c e u depende principalmente da constância da unidade de oportunidade.

---

# 8. Variáveis Contínuas

Para dados quantitativos, a seleção da carta deve considerar a forma de coleta.

### Subgrupos racionais

Quando existem vários valores coletados em cada período/subgrupo, podem ser consideradas cartas como:

* \(\bar X-R\);
* \(\bar X-S\).

A escolha depende do tamanho e estrutura dos subgrupos.

### Uma observação por período

Quando existe uma única observação por período, pode ser considerada uma carta:

**I-MR — Individual and Moving Range**

Ela é especialmente relevante quando a estrutura dos dados não permite formar subgrupos racionais.

A seleção deve ser determinada pela estrutura real do dataset.

---

# 9. Limites de Controle

Os limites de controle representam a variação estatística esperada do processo segundo o método utilizado.

Eles são diferentes de:

**Meta**

e de:

**Limite de especificação/tolerância.**

Exemplo:

Um processo pode possuir:

* meta = 90;
* limite de especificação = 85;
* limite estatístico de controle = calculado a partir do comportamento histórico.

Esses valores não devem ser confundidos.

---

# 10. Causas Especiais

O CEP pode identificar sinais estatísticos compatíveis com causas especiais.

Um sinal pode ocorrer, por exemplo, quando:

### Ponto além do limite de controle

Uma observação ultrapassa o LSC ou fica abaixo do LIC.

Isso indica um sinal de possível causa especial, não uma prova automática da causa.

### Sequência de pontos

Sequências prolongadas de pontos de um mesmo lado da linha central podem indicar alteração sistemática do processo.

### Tendência

Sequência progressiva de aumento ou redução pode indicar mudança sistemática.

As regras específicas utilizadas para identificar esses padrões devem ser configuráveis por método/carta.

Não transformar uma única quantidade de pontos em regra universal para todos os tipos de carta.

---

# 11. Interpretação

O sistema deve diferenciar:

**Sinal estatístico**

de

**Causa identificada.**

Exemplo:

Um ponto ultrapassou o LSC.

Conclusão válida:

**“Foi identificado sinal estatístico compatível com possível causa especial.”**

Conclusão inválida:

**“A causa do problema foi identificada.”**

O diagnóstico causal deve ocorrer posteriormente utilizando as ferramentas de qualidade adequadas.

---

# 12. CEP e Diagnóstico

O CEP identifica comportamento estatístico.

As ferramentas de diagnóstico investigam possíveis causas.

Fluxo:

**CEP → Sinal de variação → Investigação → Hipótese → Validação da causa → Ação**

Exemplo:

A carta p identifica aumento incomum na taxa de NC.

Depois:

**Pareto**
→ identifica o tipo de NC predominante.

**Ishikawa**
→ organiza possíveis causas.

**5 Porquês**
→ aprofunda uma hipótese.

**5W2H**
→ estrutura a ação.

---

# 13. Dados Temporais

CEP exige ordenação temporal coerente.

O sistema deve conhecer:

* período;
* sequência das observações;
* frequência;
* unidade de análise;
* tamanho dos subgrupos;
* possíveis mudanças metodológicas.

Não misturar observações de períodos diferentes sem considerar a estrutura temporal.

Mudanças relevantes na metodologia, população ou processo podem exigir nova avaliação da série.

---

# 14. Dados Insuficientes

Quando não houver dados suficientes ou estrutura adequada para aplicação do CEP, o sistema não deve fabricar limites de controle.

Deve apresentar uma mensagem explicativa, por exemplo:

**“CEP não aplicável à estrutura atual dos dados. Exibindo estatística descritiva.”**

A decisão deve considerar a metodologia estatística escolhida e não apenas um número fixo de observações.

---

# 15. Configuração Estatística

Parâmetros estatísticos devem ser configuráveis quando necessário.

Exemplos:

* método da carta;
* nível de controle;
* regras de sinal;
* janela histórica;
* tratamento de subgrupos;
* periodicidade;
* parâmetros específicos da carta.

Valores padrão podem existir, mas não devem ser tratados como regras universais quando a metodologia exigir configuração.

---

# 16. Histórico e Reprocessamento

O QualiVisão deve preservar:

* dados utilizados;
* período analisado;
* método escolhido;
* parâmetros;
* limites calculados;
* versão da metodologia.

Se os dados históricos forem alterados ou uma metodologia estatística for modificada, o sistema deve conseguir identificar que o resultado estatístico foi recalculado.

O recálculo estatístico não altera os resultados oficiais de QA, IEPC ou NC.

---

# 17. Relação com Indicadores

CEP é uma análise derivada.

Portanto:

**Resultado Oficial → Série Temporal → CEP**

O CEP não modifica:

* QA oficial;
* IEPC oficial;
* pontuações oficiais;
* eventos de NC.

Ele analisa o comportamento desses dados ou de indicadores derivados quando sua estrutura for adequada.

---

# 18. Princípio Final

O QualiVisão não deve perguntar apenas:

**“Qual carta de controle podemos mostrar?”**

Deve perguntar primeiro:

**“Os dados possuem estrutura adequada para esta análise?”**

Somente depois:

**“Qual método estatístico é apropriado?”**

E então:

**“Que sinal estatístico foi identificado e o que precisa ser investigado?”**

O CEP deve ser utilizado para aumentar a qualidade da decisão, e não para criar aparência de sofisticação estatística em dados inadequados.
