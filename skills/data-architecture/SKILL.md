---
name: data-architecture
description: Arquitetura canônica de dados, modelo relacional, entidades multi-tenant e princípios de segregação e integridade do QualiVisão.
---

# Arquitetura Canônica de Dados — QualiVisão

## 1. Princípios Estruturais
- **Multi-tenant Nativo:** Toda entidade analítica e transacional pertence a uma `organizacao_id` e segue a hierarquia:
  $$\text{Organizacao (Empresa)} \longrightarrow \text{Operacao} \longrightarrow \text{Area} \longrightarrow \text{Equipe}$$
- **Imutabilidade de Resultados Oficiais:** Resultados recebidos da origem nunca sofrem `UPDATE` em notas homologadas.
- **Isolamento de Domínio:** É proibido misturar entidades de avaliação com tabelas de RH, feedback de pessoas ou tickets brutos.

## 2. Entidades Canônicas

### A. Estrutura Corporativa
- `organizacoes`: Tenant raiz (SaaS).
- `operacoes`: Unidades de negócio (ex: Suporte Técnico, Atendimento ao Cliente).
- `areas`: Departamentos funcionais (ex: N1, N2, Fiscal).
- `equipes`: Células operacionais (ex: Compras e Estoque, PDV, Financeiro Fiscal).

### B. Governança Temporal
- `ciclos`: Entidade formal de apuração.
  - `data_inicio`: Referência dia 26 do mês anterior.
  - `data_fim`: Referência dia 25 do mês atual.
  - `status`: `aberto`, `em_apuracao`, `em_validacao`, `fechado_homologado`.
  - Ao atingir `fechado_homologado`, o ciclo é congelado e torna-se somente-leitura.

### C. Medição da Qualidade (Dados Oficiais)
- `avaliacoes_oficiais`: Registro consolidado por operador/equipe por ciclo.
  - Campos: `id`, `organizacao_id`, `equipe_id`, `ciclo_id`, `nota_final_qa`, `iepc`, `total_nc`, `pontos_deduzidos_nc`, `hash_registro`.
- `pontuacoes_criterios`: Detalhamento dos subcritérios técnicos de QA (P1.1 a P5.3).
  - Campos: `avaliacao_id`, `pilar_codigo`, `subpilar_codigo`, `pontos_obtidos`, `pontos_max`, `classificacao`.
- `pontuacoes_dimensoes`: Detalhamento das dimensões de IEPC (E1 a E5).
  - Campos: `avaliacao_id`, `dimensao_codigo`, `pontos_obtidos`, `pontos_max`.
- `eventos_nao_conformidade`: Registro dos eventos graves de falha.
  - Campos: `avaliacao_id`, `tipo_nc`, `pontos_deduzidos`, `protocolo_referencia`, `ciclo_id`.

### D. Gestão, Diagnóstico e Ação
- `investigacoes_qualidade`: Registro de diagnósticos de desvios.
- `analises_ishikawa` / `analises_5porques`: Estruturas de investigação de causa raiz.
- `planos_acao_5w2h`: Ações de melhoria com donos, prazos, indicador-alvo e status.
- `verificacoes_eficacia`: Homologação pós-intervenção (antes x depois).
