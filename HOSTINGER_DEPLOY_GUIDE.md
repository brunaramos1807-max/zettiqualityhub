# GUIA DE DEPLOY — QUALIVISÃO NO HOSTINGER BUSINESS WEB HOSTING

Este guia detalha o processo passo a passo para colocar o **QualiVisão** em produção no ambiente **Hostinger Business Web Hosting** com **Node.js 22 LTS**.

---

## 1. ESPECIFICAÇÕES DO AMBIENTE HOSTINGER

* **Plano:** Hostinger Business Web Hosting
* **Ambiente de Execução:** Node.js App Manager
* **Versão Recomendada do Node.js:** `22.x LTS` (ou 20.x LTS)
* **Framework:** Next.js 15 (App Router, Server Actions, Route Handlers)
* **Banco de Dados Oficial:** Supabase PostgreSQL (conexão remota via SSL)
* **Capacidade:** 2 CPUs, ~3 GB RAM, 50 GB SSD

---

## 2. VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

No painel do Hostinger (seção **Node.js Application** > **Environment Variables**), configure as seguintes variáveis:

| Variável | Descrição | Exemplo / Origem |
| :--- | :--- | :--- |
| `NODE_ENV` | Modo de execução | `production` |
| `PORT` | Porta designada pelo Hostinger | `3000` (ou fornecida pelo painel) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do Supabase | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave administrativa do Supabase | `eyJhbGciOi...` |
| `INTEGRATION_API_TOKEN` | Token secreto para APIs externas | `qualivisao_prod_sec_...` |

---

## 3. PASSO A PASSO NO PAINEL HOSTINGER (hPanel)

### Passo 1: Criar a Aplicação Node.js
1. Acesse o **hPanel** da Hostinger.
2. Navegue até **Sites** > Selecione o domínio do QualiVisão > **Avançado** > **Gerenciador de Aplicativos Node.js**.
3. Clique em **Criar Aplicativo**.
4. Configure os campos:
   * **Versão do Node.js:** Selecione `22.x` (LTS).
   * **Modo do Aplicativo:** `Production`.
   * **Raiz do Aplicativo (Application Root):** `/domains/seu-dominio.com.br/public_html` (ou subpasta designada).
   * **URL do Aplicativo:** `seu-dominio.com.br`.
   * **Arquivo de Inicialização (Startup File):** `node_modules/next/dist/bin/next` com argumentos `start -p $PORT` ou crie o script `server.js` (ver Passo 4 abaixo).

### Passo 2: Clonar ou Fazer Upload do Repositório
Você pode sincronizar diretamente via Git no painel Hostinger ou via SSH:
```bash
# Conectar via SSH na Hostinger
ssh u123456789@seu-ip-hostinger -p 65002

# Ir para a pasta da aplicação
cd /home/u123456789/domains/seu-dominio.com.br/public_html

# Clonar ou puxar as atualizações do GitHub
git pull origin main
```

### Passo 3: Instalação e Build de Produção
No terminal SSH (ou no console do hPanel):
```bash
# 1. Instalar dependências
npm install --production=false

# 2. Gerar o build otimizado do Next.js 15
npm run build
```

---

## 4. INICIALIZADOR DE PRODUÇÃO (`server.js`)

Para servidores compartilhados cPanel / hPanel que exigem um arquivo `server.js` na raiz da aplicação como ponto de entrada:

Crie ou utilize o arquivo `server.js` na raiz:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, () => {
    console.log(`> QualiVisão pronto em http://${hostname}:${port}`);
  });
});
```

---

## 5. REINICIAR E VERIFICAR A APLICAÇÃO

1. No painel hPanel, clique em **Reiniciar Aplicativo (Restart)**.
2. Acesse seu domínio: `https://seu-dominio.com.br`.
3. Verifique as rotas principais:
   * `/` (Cockpit Executivo)
   * `/medicoes` (Medição de Qualidade QA & IEPC)
   * `/analises/pareto` (Diagrama de Pareto & Concentração)
   * `/diagnostico` (Ishikawa & 5 Porquês)
   * `/melhoria/planos` (Planos 5W2H & PDCA)
   * `/controle/cep` (Controle Estatístico de Processo - Cartas de Controle)
   * `/importacoes` (Ingestão Canônica de Arquivos)

---

## 6. ROTINA DE ATUALIZAÇÃO (CI/CD / ATUALIZAÇÕES FUTURAS)

Sempre que enviar atualizações para o GitHub (`git push origin main`):
```bash
git pull origin main
npm install
npm run build
# No hPanel: clique em Restart ou toque em tmp/restart.txt
```
