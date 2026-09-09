---
name: qualivisao-domain
description: Normas fundamentais, fronteiras e princípios do domínio do QualiVisão como Sistema de Gestão da Qualidade orientado por dados.
---

# QualiVisão — Princípios e Fronteiras do Domínio

## 1. O que é o QualiVisão
O **QualiVisão** é uma plataforma SaaS de **Gestão, Análise e Inteligência da Qualidade orientada por dados**.
Ele recebe resultados estruturados gerados por sistemas externos de avaliação e transforma esses dados em gestão sistemática da qualidade:
$$\text{Medir} \rightarrow \text{Monitorar} \rightarrow \text{Analisar} \rightarrow \text{Diagnosticar} \rightarrow \text{Planejar} \rightarrow \text{Melhorar} \rightarrow \text{Controlar} \rightarrow \text{Nova Medição}$$

## 2. Regra de Ouro
> **O QualiVisão não reproduz a avaliação. Ele transforma resultados de qualidade em Gestão da Qualidade.**

Sempre que houver dúvida entre preservar uma funcionalidade antiga ou seguir o novo domínio, aplique o teste:
*"Isso ajuda o QualiVisão a transformar resultados de qualidade em Gestão da Qualidade?"* Se não, não pertence ao produto.

## 3. O que NÃO É o QualiVisão (Fronteira Estrita)
É expressamente proibido reconstruir ou manter no QualiVisão:
- Avaliação individual de atendimentos e leitura de conversas;
- Transcrições, tickets na íntegra ou evidências textuais detalhadas de auditoria;
- Módulos de Feedback 1:1, assinatura eletrônica ou ciência de colaboradores;
- PDI (Plano de Desenvolvimento Individual), gestão de carreira ou competências de RH;
- Advertências formais, medidas disciplinares ou sanções trabalhistas;
- Resumo comportamental individual, pontos fortes ou a melhorar de operadores;
- Fichas cadastrais individuais de analistas para fins de DP/RH;
- Motor de auditoria de monitoria ou recalcular resultados oficiais da origem.

Essas responsabilidades pertencem ao sistema/site de avaliação (QualiCore ou outros) ou a ferramentas de RH/CRM.

## 4. O que É o QualiVisão (Escopo Obrigatório)
O produto atua sobre:
- **Resultados Oficiais:** Notas de QA, Pilares, Subcritérios, Índices IEPC, Dimensões e Eventos de Não Conformidade;
- **Estrutura Corporativa:** Empresas (multi-tenant), Operações, Áreas funcionais e Equipes;
- **Governança Temporal:** Ciclos formais de apuração (referência dia 26 ao dia 25) com controle de status (`Aberto`, `Em Apuração`, `Em Validação`, `Fechado/Homologado`);
- **Análises:** Tendências, estratificações, dispersão, comparações temporais e curvas de Pareto;
- **Diagnóstico Causal:** Transformação de desvios em problemas e identificação de causas raízes validadas (Ishikawa 6Ms, 5 Porquês);
- **Melhoria Contínua:** Planos de ação estruturados no padrão 5W2H vinculados a ciclos PDCA/DMAIC e verificação formal de eficácia;
- **Controle Estatístico (CEP):** Monitoramento de estabilidade do processo e identificação de causas especiais.

## 5. Princípio da Separação de Indicadores
- **QA e IEPC são independentes:** QA representa conformidade técnica; IEPC representa percepção do cliente. Nunca somar os dois nem criar um "Score Geral" arbitrário sem metodologia formal.
- **Não Conformidade (NC) é um Evento Estruturado:** Separar o *evento de NC* do seu *efeito metodológico*. A penalidade (ex: -20 pontos) deve ser tratada como regra de negócio configurável, nunca como constante hardcoded no código.
