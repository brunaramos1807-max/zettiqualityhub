---

name: data-ingestion
description: Diretrizes e arquitetura para ingestão de resultados de qualidade, adaptadores agnósticos, validação de schema, idempotência e auditoria de lotes no QualiVisão.
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Ingestão de Dados — QualiVisão

## 1. Princípio do Desacoplamento da Origem

O QualiVisão é agnóstico ao sistema ou formato que produz os dados.

A ingestão deve seguir uma arquitetura em camadas:

**Fonte Externa → Adapter → Contrato Canônico → Validação → Lote de Ingestão → Resultados Oficiais → QualiVisão Core**

O Core não deve depender diretamente do formato específico de nenhuma fonte.

Exemplo:

```text id="f0h7sa"
QualiCore ───────┐
CRM externo ────┼→ Adapter → Contrato Canônico → QualiVisão
XLSX mensal ────┤
API externa ────┘
```

Cada fonte possui seu próprio adaptador.

O contrato canônico é a fronteira entre a origem e o domínio do QualiVisão.

---

# 2. Modalidades de Ingestão

O sistema deve suportar diferentes formas de entrada sem alterar o domínio interno.

## 2.1 Upload em Lote

Formatos prioritários:

* XLSX;
* CSV.

Utilizado principalmente para datasets mensais consolidados.

Exemplo:

`dataset_analitico_qa_08-2026.xlsx`

O arquivo deve ser processado como um lote único, com validação e relatório de processamento.

---

## 2.2 API REST

A ingestão programática deve utilizar endpoint versionado.

Exemplo conceitual:

`POST /api/v1/ingest/quality-results`

A autenticação deve utilizar credenciais próprias da integração.

Tokens ou credenciais não devem ser armazenados em texto puro.

Quando houver necessidade de persistência para validação de credenciais, utilizar mecanismo criptográfico apropriado, como hash seguro.

---

## 2.3 Webhooks

Webhooks podem receber eventos ou lotes provenientes de sistemas externos.

O webhook deve seguir o mesmo fluxo de validação:

**Webhook → Adapter → Contrato Canônico → Validação → Lote → Processamento**

Não permitir que um webhook escreva diretamente em tabelas de resultados oficiais sem passar pelas validações da ingestão.

---

# 3. Contrato Canônico

O contrato canônico representa a estrutura mínima necessária para que o QualiVisão compreenda um resultado de qualidade.

A validação deve utilizar schema versionado, preferencialmente com Zod no backend.

Campos conceituais:

```text id="3xjtdk"
origem_sistema
versao_schema
referencia_externa
ciclo_referencia
organizacao_identificador
operacao_identificador
area_identificador
equipe_identificador
resultado
pilares_qa
dimensoes_iepc
nao_conformidades
```

### Resultado

Quando fornecido pela origem:

```text id="h3m8pm"
nota_qa_oficial
nota_iepc_oficial
```

Os valores devem ser tratados como resultados oficiais recebidos.

---

# 4. Regras do Contrato

## 4.1 Origem

`origem_sistema` identifica o sistema ou mecanismo responsável pelo envio.

Exemplos:

* `qualicore`;
* `crm-externo`;
* `import-xlsx`.

---

## 4.2 Versão

`versao_schema` identifica a versão do contrato utilizado.

Exemplo:

`v1.0`

Alterações incompatíveis devem gerar nova versão.

O sistema não deve assumir que versões diferentes possuem exatamente a mesma estrutura.

---

## 4.3 Ciclo

O contrato deve permitir identificar inequivocamente o ciclo de referência.

A referência conceitual segue:

**dia 26 do mês anterior → dia 25 do mês atual**

O identificador do ciclo não deve depender exclusivamente de uma string `MM/YYYY` se houver risco de ambiguidade.

O adapter deve resolver a referência externa para o `ciclo_id` interno.

---

## 4.4 Hierarquia

A associação deve seguir:

**Organização → Operação → Área → Equipe**

O identificador recebido pode ser:

* código;
* identificador externo;
* nome controlado.

O sistema deve resolver esse identificador para a entidade interna correspondente.

Não criar automaticamente uma nova equipe apenas porque um nome desconhecido apareceu no arquivo, salvo quando existir uma regra explícita de provisionamento.

---

# 5. QA e IEPC

O contrato pode receber:

* nota QA oficial;
* pilares QA;
* critérios QA, quando a origem fornecer;
* nota IEPC oficial;
* dimensões IEPC, quando a origem fornecer.

A ausência de um componente deve ser tratada conforme a metodologia e capacidade da fonte.

Não transformar campo ausente em zero.

Não inventar resultado ausente.

---

# 6. Não Conformidades

A ingestão deve receber NCs como eventos estruturados.

Exemplo conceitual:

```text id="8tqv6p"
tipo_nc
classificacao
quantidade
pontos_deduzidos
referencia_externa
```

A ingestão não deve transformar automaticamente uma NC em penalidade fixa.

Se a origem enviar:

`pontos_deduzidos = -20`

esse valor deve ser preservado como resultado recebido.

Se a origem enviar apenas o evento de NC, o efeito metodológico deve ser determinado pela configuração metodológica aplicável.

---

# 7. Validação

Todo lote deve passar por validações antes de produzir resultados oficiais.

### Validação estrutural

Verificar:

* schema;
* tipos;
* campos obrigatórios;
* formatos;
* versão do contrato.

### Validação de domínio

Verificar:

* organização existente;
* operação válida;
* área válida;
* equipe válida;
* ciclo válido;
* códigos de critérios;
* códigos de dimensões;
* valores dentro dos limites metodológicos.

### Validação de consistência

Verificar relações entre os dados.

Exemplos:

* QA dentro dos limites esperados;
* IEPC dentro dos limites esperados;
* pilares compatíveis com a metodologia recebida;
* dimensões compatíveis com a metodologia recebida;
* referências duplicadas;
* NCs inconsistentes;
* ciclo incompatível com a data informada.

---

# 8. Idempotência

A mesma informação não deve ser processada duas vezes como dois resultados diferentes.

Cada registro/lote deve possuir uma chave de idempotência baseada em identificadores confiáveis.

Possíveis elementos:

* origem;
* referência externa;
* ciclo;
* organização;
* hash do registro.

Antes de inserir um novo resultado, o sistema deve verificar se aquele resultado já foi processado.

Reenvio do mesmo lote deve produzir comportamento idempotente.

---

# 9. Lotes de Ingestão

Todo processamento deve gerar um registro em:

`ingestao_lotes`

Informações conceituais:

* `id`;
* `origem`;
* `versao_schema`;
* `data_recebimento`;
* `total_registros_recebidos`;
* `total_validos`;
* `total_rejeitados`;
* `total_processados`;
* `status`;
* `hash_lote`;
* `mensagens_validacao`.

Estados possíveis:

* `recebido`;
* `validando`;
* `validado`;
* `processando`;
* `processado`;
* `rejeitado`;
* `processado_com_alertas`.

O modelo definitivo pode evoluir conforme a necessidade operacional.

---

# 10. Erros de Validação

Um registro inválido não deve invalidar obrigatoriamente todo o lote.

A estratégia depende do tipo de erro.

O sistema pode utilizar:

**Lote rejeitado integralmente**

quando houver erro estrutural grave ou quebra de contrato.

**Processamento parcial**

quando registros individuais puderem ser isolados sem comprometer a integridade do restante do lote.

Todo registro rejeitado deve possuir motivo identificável.

Exemplo:

```text id="4l3qpx"
Linha 184
Equipe: desconhecida
Código: EQ-999
Motivo: equipe não encontrada na organização informada.
```

---

# 11. Rastreabilidade

O sistema deve permitir rastrear:

**Fonte → Lote → Registro recebido → Resultado oficial → Ciclo**

Cada resultado deve possuir referência suficiente para identificar sua origem.

A rastreabilidade não significa armazenar:

* conversas;
* transcrições;
* tickets completos;
* evidências de auditoria.

O QualiVisão deve armazenar apenas os dados estruturados necessários ao seu domínio e à rastreabilidade do processamento.

---

# 12. Payload Original

Quando necessário para auditoria técnica do processo de ingestão, o sistema pode armazenar o payload estruturado recebido ou sua representação normalizada.

Isso não deve ser utilizado como mecanismo para importar ou preservar conteúdo fora do escopo do QualiVisão.

O armazenamento deve respeitar:

* segurança;
* privacidade;
* retenção;
* minimização de dados.

---

# 13. Homologação

Processar um lote não significa automaticamente homologar os resultados.

Fluxo conceitual:

**Receber → Validar → Processar → Consolidar → Validar Resultados → Homologar Ciclo**

A homologação pertence à governança do ciclo.

Resultados recebidos podem existir em estado processado antes do fechamento/homologação do ciclo.

---

# 14. Falhas de Integração

Falhas devem ser registradas sem destruir o lote recebido.

Exemplos:

* schema inválido;
* autenticação inválida;
* organização inexistente;
* equipe não encontrada;
* ciclo inválido;
* duplicidade;
* valor fora do domínio;
* versão incompatível.

Sempre que possível, o erro deve permitir correção e reprocessamento controlado.

---

# 15. Segurança

Credenciais de integração devem possuir:

* autenticação;
* autorização por organização;
* escopo definido;
* armazenamento seguro;
* possibilidade de revogação;
* registro de utilização.

Uma integração de uma organização não pode enviar ou acessar dados pertencentes a outra organização.

---

# 16. Princípio de Não Corrupção do Domínio

O adapter pode transformar formato.

O contrato pode validar estrutura.

A ingestão pode rejeitar dados inválidos.

Mas nenhuma dessas camadas deve:

* inventar dados;
* alterar silenciosamente resultados oficiais;
* transformar ausência em zero;
* criar causas;
* criar evidências;
* recalcular uma avaliação individual sem autorização metodológica;
* misturar dados de organizações diferentes.

---

# 17. Regra Final

A ingestão existe para transportar dados confiáveis da origem para o domínio do QualiVisão.

**Fonte → Adapter → Contrato → Validação → Lote → Resultado Oficial → Gestão da Qualidade**

Quanto mais desacoplada for a origem, mais estável deve permanecer o Core do QualiVisão.
