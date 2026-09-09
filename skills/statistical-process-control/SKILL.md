---
name: statistical-process-control
description: Diretrizes para aplicação de Controle Estatístico de Processos (CEP), limites estatísticos, cartas de controle e detecção de causas especiais.
---

# Controle Estatístico de Processos (CEP) — QualiVisão

## 1. Princípio de Não-Universalidade Arbitrária
O CEP é uma capacidade analítica do produto, mas **não deve ser imposto artificialmente** sem que os dados atendam às premissas estatísticas de amostragem, independência e estabilidade.
Se o volume amostral for reduzido ($n < 20$) ou o processo não apresentar granularidade temporal adequada, a interface deve declarar explicitamente:
> *"Controle estatístico não aplicável para esta amostra. Exibindo estatística descritiva (mediana e amplitude)."*

## 2. Métodos Aplicáveis por Natureza da Variável

### A. Variáveis por Atributos (Falhas e Não Conformidades)
- **Carta $p$ (Proporção de Não-Conformes):**
  - Monitora a taxa de chamados com Não Conformidade: $p_i = \frac{NC_i}{n_i}$.
  - Linha Central (LC): $\bar{p} = \frac{\sum NC_i}{\sum n_i}$.
  - Limites de Controle: $LSC/LIC = \bar{p} \pm 3\sqrt{\frac{\bar{p}(1-\bar{p})}{n_i}}$.
- **Carta $u$ (Taxa de Defeitos por Unidade):**
  - Monitora a média de falhas ou penalidades por chamado auditado.

### B. Variáveis Contínuas (Notas de QA e IEPC)
- Aplicáveis somente quando houver subgrupos racionais coletados com periodicidade homogênea e teste prévio de normalidade.

## 3. Detecção de Causas Especiais (Regras de Estabilidade)
Um processo é considerado instável ou sujeito a causas especiais de variação quando:
1. **Ponto Fora dos Limites:** Qualquer ponto além de $\pm 3\sigma$ (acima do LSC ou abaixo do LIC).
2. **Sequência Unilateral:** 8 ou mais pontos consecutivos do mesmo lado da Linha Central ($\bar{X}$ ou $\bar{p}$).
3. **Tendência Estrita:** 6 ou mais pontos consecutivos em elevação contínua ou queda contínua.
