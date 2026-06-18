# Auditoria 4 — QualiVisão: Prontidão para Produção

**Versão:** 1.0  
**Data:** 2026-06-18  
**Objetivo:** Classificar cada módulo quanto ao nível real de maturidade para produção  
**Metodologia:** Análise do código-fonte, persistência de dados, segurança, UX e completude funcional

---

## 1. Escala de Classificação

| Nível | Definição | Critérios |
|-------|-----------|-----------|
| **🟢 Produção Externa** | Pronto para usuários externos | Dados persistidos, segurança adequada, UX completa, sem dados hardcoded críticos |
| **🔵 Produção Interna** | Pronto para uso interno controlado | Funcional com limitações conhecidas, dados persistidos, pode ter UX incompleta |
| **🟡 MVP** | Funcional mas com dívida técnica significativa | Funciona para demonstração, dados podem ser perdidos, sem garantias de produção |
| **🔴 Não Utilizável** | Não funcional ou com problemas críticos | Dados não persistidos, funcionalidade quebrada ou ausente |

---

## 2. Classificação por Módulo

---

### 2.1 Dashboard Executivo

**Rota:** `/` (HomeExecutiveView) e `/cycle-dashboard`  
**Classificação:** 🔵 **Produção Interna**

#### Pontos Positivos
- Dados lidos exclusivamente do Supabase (fonte confiável)
- Filtros funcionais (período, squad, analista, coordenador, tipo de demanda)
- KPIs calculados corretamente com pesos oficiais (QA: P1-P5, IEPC: E1-E5)
- Gráficos funcionais (tendência, radar, donut NC, heatmap)
- RBAC implementado (coordenadores veem apenas suas squads)
- Fechamento de ciclo com IA (Gemini) funcional
- Exportação CSV e PDF funcionais

#### Limitações para Produção Externa
- Componente `HomeExecutiveView.tsx` com 2013 linhas — manutenção difícil
- Histórico carrega N queries (1 por período) — pode ser lento
- Fechamento de ciclo duplica estado em localStorage
- Filtros não persistidos em URL — perdidos ao navegar
- Sem paginação — todos os analistas em memória

#### Justificativa Técnica
O Dashboard é funcionalmente completo para uso interno. Os dados são confiáveis (Supabase), os cálculos estão corretos e o RBAC está implementado. As limitações são de performance e manutenibilidade, não de funcionalidade. Para produção externa, seria necessário refatorar o componente gigante e otimizar as queries de histórico.

---

### 2.2 Feedback

**Rotas:** `/feedback`, `/feedback/[id]`, `/feedback/manual`, `/feedback/import`, `/feedback/public/[token]`, `/feedback/people-analytics`  
**Classificação:** 🔵 **Produção Interna**

#### Pontos Positivos
- CRUD completo de feedbacks (criar, ler, atualizar status, excluir)
- Importação via JSON e via API funcionais
- Link público por token funcional
- Filtros por status, ciclo, equipe funcionais
- Histórico por analista com gráfico de evolução
- People Analytics com métricas agregadas
- Dados 100% em Supabase (sem localStorage)

#### Limitações para Produção Externa
- Token hardcoded `qualivisao-lovable-token-2026` em `/feedback/historico` — risco de segurança
- Campos `coaching` e `atendimentos` recebidos mas nunca exibidos — dados perdidos
- PDI desvinculado do Feedback (`feedback_id` nunca preenchido)
- Sem notificação ao analista quando feedback é gerado/enviado
- Status "lido" não verificado automaticamente (analista precisa abrir o link)

#### Justificativa Técnica
O módulo de Feedback é o mais maduro do sistema. A integração com o Sistema de Avaliação Lovable está funcional e documentada. As limitações são de completude (campos não exibidos) e segurança (token hardcoded), não de funcionalidade core. Para produção externa, seria necessário remover o token hardcoded e implementar notificações.

---

### 2.3 PDI (Plano de Desenvolvimento Individual)

**Rotas:** `/pdis`, `/feedback/pdi`  
**Classificação:** 🟡 **MVP**

#### Pontos Positivos
- CRUD completo de PDIs em `/pdis` (Enterprise)
- Estrutura de objetivos por bloco (categoria, ação, resultado esperado, status)
- Cálculo de progresso baseado em status dos objetivos
- Linha do tempo de eventos (`pdi_timeline`)
- Filtros por analista, status, período
- Dados persistidos em Supabase

#### Limitações Críticas
- **Dois módulos PDI paralelos:** `/pdis` (Enterprise) e `/feedback/pdi` (simplificado) — lógica duplicada, dados podem divergir
- `pdi_records.feedback_id` nunca preenchido — PDI não vinculado ao feedback de origem
- Sem fluxo de aprovação formal (coordenador → analista → confirmação)
- Sem notificação ao analista quando PDI é criado
- `evidencia`, `comentario_coordenador`, `comentario_analista` raramente preenchidos
- Sem integração com ciclo de avaliação (PDI não fecha automaticamente ao fechar ciclo)

#### Justificativa Técnica
O módulo PDI tem a estrutura correta mas sofre de duplicação crítica. Existem dois caminhos para criar PDIs (`/pdis` e `/feedback/pdi`) com lógicas diferentes, o que pode causar confusão e inconsistência. Para produção, seria necessário consolidar em um único módulo e implementar o vínculo com o feedback de origem.

---

### 2.4 NC (Não Conformidades)

**Rota:** `/nao-conformidades`  
**Classificação:** 🔵 **Produção Interna**

#### Pontos Positivos
- Leitura de NCs do Supabase (`nc_records`)
- Filtros completos (squad, tipo, período, analista, coordenador, reincidente)
- Visualização em tabela e gráficos (radar, área, barras)
- Modal de detalhe com evidência, severidade, impacto operacional
- Identificação de reincidência (analistas com múltiplas NCs do mesmo tipo)
- Exclusão de NCs com confirmação
- Normalização de tipos NC (NC-1 a NC-5)

#### Limitações para Produção Externa
- Sem fluxo de tratativa (NC aberta → em tratamento → resolvida)
- Campo `status` em `nc_records` existe mas não é gerenciado pela tela
- Sem vinculação formal NC → PDI (apenas recomendação textual no modal)
- Sem notificação ao analista sobre NC registrada
- Reincidência calculada em memória (sem persistência do flag)

#### Justificativa Técnica
O módulo NC é funcional para visualização e análise. Os dados são confiáveis e os filtros são completos. A limitação principal é a ausência de um fluxo de tratativa (NC não tem ciclo de vida gerenciável). Para produção interna, está adequado. Para produção externa, seria necessário implementar o fluxo de tratativa.

---

### 2.5 Gestão (Gestão de Pessoas)

**Rota:** `/gestao`  
**Classificação:** 🔵 **Produção Interna**

#### Pontos Positivos
- Dados lidos do Supabase (`analistas` + `cycle_scores` + `pdi_records`)
- Perfil completo do analista (foto, cargo, nível, tempo de empresa, aniversário)
- Métricas de performance (QA médio, IEPC médio, tendência, risco)
- Drawer de detalhe com histórico de scores
- Filtros por squad, status, risco
- Indicador de PDI ativo
- Suporte a foto do analista (`foto_url`)

#### Limitações para Produção Externa
- Sem edição de dados diretamente na tela (redireciona para `/analistas`)
- Cálculo de risco baseado apenas em QA — sem considerar NCs ou tendência
- Sem exportação de relatório de gestão
- Sem alertas automáticos para analistas em risco

#### Justificativa Técnica
O módulo de Gestão é uma visão consolidada e funcional para coordenadores e gestores. Os dados são confiáveis e a UX é adequada para uso interno. Para produção externa, seria necessário adicionar exportação e alertas.

---

### 2.6 Configurações

**Rota:** `/configuracoes`  
**Classificação:** 🔵 **Produção Interna**

#### Pontos Positivos
- CRUD completo de usuários, cargos e permissões
- Sistema de permissões granular por módulo (visualizar, editar, excluir, importar, exportar, fechar ciclo, reabrir, aprovar, admin)
- Escopos por squad/equipe
- Log de auditoria de permissões
- Sincronização com Supabase Auth
- Dados 100% em Supabase

#### Limitações para Produção Externa
- Arquivo com 2143 linhas — manutenção difícil
- Sem validação de email ao criar usuário
- Sem convite por email (usuário precisa ser criado manualmente)
- Permissões não verificadas em todas as rotas (RouteGuard básico)
- Sem 2FA ou políticas de senha

#### Justificativa Técnica
O módulo de Configurações é funcionalmente completo para uso interno. O sistema de permissões é robusto e os dados são persistidos corretamente. Para produção externa, seria necessário implementar convite por email e verificar a aplicação das permissões em todas as rotas.

---

### 2.7 Importações

**Rota:** `/importacoes`  
**Classificação:** 🟡 **MVP**

#### Pontos Positivos
- Importação CSV funcional (scores QA/IEPC, NCs, elogios)
- Upsert inteligente (não duplica dados)
- Bloqueio de importação em ciclo fechado
- Log de importação em Supabase (`import_logs`)
- Importação manual de avaliação individual
- Dados de scores persistidos em Supabase

#### Limitações Críticas
- **Lista de importações em localStorage** (`zetti_import_records`) — perdida ao limpar cache
- Sem validação robusta do CSV (erros silenciosos)
- Sem rollback em caso de falha parcial
- Sem histórico de quem importou o quê (actor_email raramente preenchido)
- Importação retroativa (JSON) com lógica complexa e pouco testada

#### Justificativa Técnica
A importação de dados (scores, NCs, elogios) funciona corretamente e persiste no Supabase. O problema crítico é que a **lista de importações** (quais arquivos foram importados, quando, por quem) está apenas em localStorage. Isso significa que o histórico de importações é perdido ao trocar de dispositivo ou limpar o cache. Para produção, seria necessário migrar `zetti_import_records` para uma tabela Supabase.

---

### 2.8 Histórico

**Rota:** `/historico`  
**Classificação:** 🔴 **Não Utilizável**

#### Problemas Críticos
- **Dados exclusivamente em localStorage** (`zetti_manual_cycles`) — perdidos ao limpar cache ou trocar de dispositivo
- Dados hardcoded: JAN/2026, FEV/2026, MAR/2026 com valores zerados
- Sem leitura de dados reais do Supabase
- Edição manual de médias (QA, IEPC, NCs, elogios) — não calculado automaticamente
- Sem sincronização com `cycle_scores` ou `import_cycles`
- Não reflete o histórico real da operação

#### O que Deveria Ser
O módulo Histórico deveria ler de `import_cycles` + `cycle_scores` + `cycle_summaries` no Supabase e exibir o histórico real de ciclos com dados calculados automaticamente.

#### Justificativa Técnica
Este módulo é funcionalmente inútil em produção. Os dados são hardcoded e armazenados apenas em localStorage. Qualquer usuário que acessar de outro dispositivo verá os valores zerados. Precisa ser completamente reescrito para ler do Supabase.

---

### 2.9 Evolução (Evolução Geral)

**Rota:** `/evolucao-geral`  
**Classificação:** 🟡 **MVP**

#### Pontos Positivos
- Leitura de scores reais do Supabase (`fetchCycleScores`)
- Gráficos de evolução temporal (linha, barras)
- Heatmap de performance por analista/período
- Análise de NCs por tipo ao longo do tempo
- Filtros por squad e analista

#### Limitações Críticas
- **Entradas manuais em localStorage** (`zetti_manual_entries`) — perdidas ao limpar cache
- Entradas manuais têm tentativa de persistência em Supabase (`saveEntryToSupabase`) mas sem tabela dedicada confirmada
- Mistura de dados reais (Supabase) com dados manuais (localStorage) sem distinção clara na UI
- Sem indicação visual de qual dado é real vs. manual

#### Justificativa Técnica
A parte de dados reais funciona corretamente. O problema é a funcionalidade de "entradas manuais" que usa localStorage como armazenamento primário. Para produção, seria necessário criar uma tabela Supabase para entradas manuais e remover a dependência de localStorage.

---

### 2.10 Calibragem

**Rota:** `/calibragem`  
**Classificação:** 🔴 **Não Utilizável**

#### Problemas Críticos
- **Calibrações nunca persistidas** — campos `calibratedQa` e `calibratedIepc` existem no estado React mas nunca são salvos em nenhum lugar (nem Supabase, nem localStorage)
- Sem botão "Salvar Calibragem"
- Sem histórico de calibrações
- Sem impacto real nos dados — calibrar um analista não altera nenhum score no sistema
- Funciona apenas como visualização comparativa

#### O que Existe
- Leitura de scores reais do Supabase
- Seletor de período funcional
- Gráfico de barras comparativo (QA vs IEPC)
- Tabela de analistas com campos de calibração editáveis

#### O que Falta
- Persistência das calibrações
- Aplicação das calibrações nos cálculos do Dashboard
- Histórico de calibrações por ciclo
- Aprovação de calibrações por gestor

#### Justificativa Técnica
O módulo de Calibragem é uma casca vazia. A UI existe e os dados são carregados, mas qualquer calibração feita é perdida ao recarregar a página. Não há nenhuma lógica de persistência implementada. Precisa ser completamente implementado.

---

### 2.11 Auditoria

**Rota:** `/auditoria`  
**Classificação:** 🟡 **MVP**

#### Pontos Positivos
- Leitura de dados reais do Supabase (scores, NCs, elogios, analistas, feedbacks)
- Filtros por squad e status
- Cálculo de status de auditoria baseado em número de avaliações
- Exibição de última atualização via feedbacks
- Integração com ciclo ativo (`getActiveCycle`)

#### Limitações Críticas
- **Status de auditoria derivado de contagem de scores** — não há um campo `status_auditoria` real no banco
  - `avaliacoes = 0` → "Pendente"
  - `avaliacoes < 3` → "Em Andamento"  
  - `avaliacoes >= 3` → "Concluído"
  - Esta lógica é arbitrária e não reflete o processo real de auditoria
- Sem fluxo de auditoria formal (auditor designado, checklist, aprovação)
- Sem persistência de status de auditoria
- Sem histórico de auditorias por ciclo
- Sem exportação de relatório de auditoria

#### Justificativa Técnica
O módulo de Auditoria é uma visão de dados existentes com status derivado artificialmente. Não existe um processo real de auditoria implementado — apenas uma visualização de quantas avaliações cada analista tem. Para produção, seria necessário implementar um fluxo real de auditoria com tabela dedicada, auditor designado e checklist.

---

## 3. Tabela Resumo

| Módulo | Rota(s) | Classificação | Dados Persistidos? | Funcionalidade Core | Pronto para Externo? |
|--------|---------|:-------------:|:------------------:|:-------------------:|:--------------------:|
| **Dashboard** | `/`, `/cycle-dashboard` | 🔵 Produção Interna | ✅ Supabase | ✅ Completa | ⚠️ Com refatoração |
| **Feedback** | `/feedback/*` | 🔵 Produção Interna | ✅ Supabase | ✅ Completa | ⚠️ Token hardcoded |
| **PDI** | `/pdis`, `/feedback/pdi` | 🟡 MVP | ✅ Supabase | ⚠️ Duplicado | ❌ Consolidar primeiro |
| **NC** | `/nao-conformidades` | 🔵 Produção Interna | ✅ Supabase | ✅ Completa | ⚠️ Sem fluxo tratativa |
| **Gestão** | `/gestao` | 🔵 Produção Interna | ✅ Supabase | ✅ Completa | ⚠️ Sem exportação |
| **Configurações** | `/configuracoes` | 🔵 Produção Interna | ✅ Supabase | ✅ Completa | ⚠️ Sem convite email |
| **Importações** | `/importacoes` | 🟡 MVP | ⚠️ Parcial (lista em LS) | ✅ Funcional | ❌ Lista em localStorage |
| **Histórico** | `/historico` | 🔴 Não Utilizável | ❌ localStorage | ❌ Hardcoded | ❌ Reescrever |
| **Evolução** | `/evolucao-geral` | 🟡 MVP | ⚠️ Parcial (manuais em LS) | ⚠️ Parcial | ❌ Manuais em localStorage |
| **Calibragem** | `/calibragem` | 🔴 Não Utilizável | ❌ Nunca salvo | ❌ Sem persistência | ❌ Implementar |
| **Auditoria** | `/auditoria` | 🟡 MVP | ⚠️ Status derivado | ⚠️ Status artificial | ❌ Fluxo real necessário |

---

## 4. Prioridades de Correção

### 🔴 Prioridade 1 — Bloqueadores de Produção

| Item | Módulo | Ação |
|------|--------|------|
| Calibragem sem persistência | Calibragem | Implementar save em Supabase ou remover do menu |
| Histórico em localStorage | Histórico | Reescrever para ler de `import_cycles` + `cycle_scores` |
| Token hardcoded | Feedback | Mover para variável de ambiente |
| PDI duplicado | PDI | Consolidar `/pdis` e `/feedback/pdi` em um único módulo |

### 🟠 Prioridade 2 — Melhorias Importantes

| Item | Módulo | Ação |
|------|--------|------|
| Lista de importações em localStorage | Importações | Criar tabela `import_history` no Supabase |
| Entradas manuais em localStorage | Evolução | Criar tabela `manual_entries` no Supabase |
| `feedback_id` nunca preenchido em PDI | PDI | Implementar vínculo Feedback → PDI |
| Status de auditoria artificial | Auditoria | Criar tabela `audit_records` com fluxo real |

### 🟡 Prioridade 3 — Melhorias de Qualidade

| Item | Módulo | Ação |
|------|--------|------|
| HomeExecutiveView 2013 linhas | Dashboard | Refatorar em subcomponentes |
| Queries N+1 no histórico | Dashboard | Implementar query única com agregação |
| Filtros sem URL | Dashboard | Persistir filtros em query params |
| Campos nunca exibidos (coaching, atendimentos) | Feedback | Implementar telas ou remover do payload |

---

## 5. Conclusão

O QualiVisão é um sistema **funcional e maduro para uso interno**, com 5 módulos em nível de Produção Interna. Os módulos core (Dashboard, Feedback, NC, Gestão, Configurações) estão prontos para uso controlado.

Os principais bloqueadores para **Produção Externa** são:
1. **Calibragem e Histórico** precisam ser reescritos (dados não persistidos)
2. **PDI** precisa ser consolidado (dois módulos paralelos)
3. **Token hardcoded** precisa ser removido
4. **Importações** precisa migrar lista para Supabase

Com 2-3 sprints focados nas Prioridades 1 e 2, o sistema estaria pronto para Produção Externa nos módulos core.
