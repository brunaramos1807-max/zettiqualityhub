# DOSSIÊ TÉCNICO COMPLETO — Portal da Qualidade (ZettiQualityHub)
**Versão:** 1.0.0  
**Data de geração:** 2026-05-11  
**Gerado por:** Análise automatizada do código-fonte  
**Classificação:** Documento técnico interno — uso restrito

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Objetivo
O **Portal da Qualidade** (ZettiQualityHub) é uma plataforma interna de gestão da qualidade operacional da Zetti Tech. Seu propósito é centralizar a análise de desempenho de analistas de suporte, calcular indicadores de qualidade (QA) e experiência do cliente (IEPC), registrar não conformidades (NCs), gerenciar elogios e gerar relatórios executivos com suporte de IA.

### 1.2 Arquitetura Geral
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  App Router  │  │  Components  │  │  Contexts/Hooks  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              localStorage (auth + dados)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
   ┌──────────▼──────────┐   ┌─────────▼─────────┐
   │   Supabase (BaaS)   │   │  Gemini AI (API)   │
   │  - PostgreSQL DB    │   │  - Chat Completion │
   │  - Auth (parcial)   │   │  - Streaming       │
   │  - Realtime         │   └───────────────────┘
   │  - RLS Policies     │
   └─────────────────────┘
```

### 1.3 Stack Tecnológica
| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 15.1.11 |
| Linguagem | TypeScript | ^5.0.0 |
| UI | React | 19.0.3 |
| Estilização | Tailwind CSS | 3.4.6 |
| Banco de Dados | Supabase (PostgreSQL) | @supabase/supabase-js 2.105.3 |
| IA | Google Gemini | gemini-2.5-flash via @rocketnew/llm-sdk |
| PDF Export | jsPDF + jspdf-autotable | 4.2.1 / 5.0.7 |
| CSV Parse | PapaParse | 5.5.3 |
| Excel Parse | XLSX | 0.18.5 |
| Notificações | Sonner | ^1.7.4 |
| Ícones | Lucide React | ^1.7.0 |
| Gráficos | Recharts | ^2.15.2 |
| Fontes | DM Sans + Playfair Display | Google Fonts |

### 1.4 Integrações e Serviços Externos
| Serviço | Finalidade | Variável de Ambiente |
|---------|-----------|---------------------|
| Supabase | Banco de dados, Auth, Realtime | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY |
| Google Gemini | Insights executivos por IA | GEMINI_API_KEY |
| Google Analytics | Rastreamento de uso | NEXT_PUBLIC_GA_MEASUREMENT_ID |
| OpenAI | Disponível (não configurado) | OPENAI_API_KEY |
| Anthropic | Disponível (não configurado) | ANTHROPIC_API_KEY |
| Perplexity | Disponível (não configurado) | PERPLEXITY_API_KEY |
| Stripe | Disponível (não configurado) | NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY |

### 1.5 Fluxo Macro da Aplicação
```
1. Usuário acessa qualquer rota
2. RouteGuard verifica sessão em localStorage (SystemAuthContext)
3. Se sem sessão → exibe SystemLoginScreen
4. Login valida credenciais contra localStorage (authSystem.ts)
5. Sessão criada com cargo + permissões
6. AppHeader renderiza tabs filtradas por isAdmin
7. Usuário importa dados CSV/XLSX via ImportModal
8. Dados salvos em localStorage + Supabase (paralelo)
9. Dashboard lê dados do localStorage (fallback Supabase)
10. Gemini AI gera insights executivos sob demanda
11. PDF/CSV exportados via jsPDF/dataService
```

---

## 2. ESTRUTURA DE PÁGINAS

### 2.1 Mapa de Rotas
| Rota | Arquivo | Nome | Acesso |
|------|---------|------|--------|
| `/` | `src/app/page.tsx` | Visão Geral | Todos autenticados |
| `/cycle-dashboard` | `src/app/cycle-dashboard/page.tsx` | Dashboard do Ciclo | Todos autenticados |
| `/evolucao-geral` | `src/app/evolucao-geral/page.tsx` | Evolução dos Indicadores | Todos autenticados |
| `/auditoria` | `src/app/auditoria/page.tsx` | Auditoria | Todos autenticados |
| `/nao-conformidades` | `src/app/nao-conformidades/page.tsx` | Não Conformidades | Todos autenticados |
| `/mural-elogios` | `src/app/mural-elogios/page.tsx` | Elogios | Todos autenticados |
| `/historico` | `src/app/historico/page.tsx` | Histórico | Todos autenticados |
| `/importacoes` | `src/app/importacoes/page.tsx` | Importações | Todos autenticados |
| `/documentos` | `src/app/documentos/page.tsx` | Documentos | Todos autenticados |
| `/gestao` | `src/app/gestao/page.tsx` | Gestão | Admin only |
| `/admin-config` | `src/app/admin-config/page.tsx` | Config. Legado | Admin only |
| `/configuracoes` | `src/app/configuracoes/page.tsx` | Configurações | Admin only |
| `/sign-up-login` | `src/app/sign-up-login/page.tsx` | Login/Cadastro | Público |

### 2.2 Detalhamento por Página

#### `/` — Visão Geral (HomeExecutiveView)
- **Componentes:** AppHeader, HeroCycleStatus, HomeKPICards, MonthlyTrendChart, TopAnalysts, ExecutiveInsights, AppFooter, ImportModal
- **Dados carregados:** cycle_scores (localStorage/Supabase), import_cycles
- **Funcionalidades:** KPIs do ciclo ativo, gráfico de tendência mensal, ranking de analistas, insights IA Gemini
- **Permissões:** Importar (permissao_editar ou admin); Insights (permissao_acessar_relatorios ou admin/gestor/coord.geral)
- **Estados:** importOpen (boolean), session (SystemAuthContext)

#### `/cycle-dashboard` — Dashboard do Ciclo (CycleDashboard)
- **Componentes:** CycleFilters, CycleKPICards, SquadRankingChart, PillarMatrix, AnalystDrilldown, PillarDrilldownModal, ExecutiveInsights, CompareAnalystsModal, NonConformitiesGuide
- **Dados carregados:** fetchCycleScores, fetchAllPeriodos, fetchNCRecords, fetchElogios
- **Funcionalidades:** Filtros por squad/analista/período, ranking de squads, matriz de pilares QA/IEPC, drilldown por analista, comparação de analistas, exportação CSV/PDF
- **Permissões:** Importar (permissao_editar); Exportar (permissao_acessar_relatorios ou admin)
- **Estados:** selectedSquad, selectedAnalyst, selectedPillar, drilldownAnalyst, viewMode, compareOpen, allAnalysts, periodos, activePeriodo, loading, exporting, exportingPDF

#### `/configuracoes` — Configurações (Admin Only)
- **Componentes:** UserFormModal, PermissionsEditor, 4 abas internas
- **Abas:** Usuários, Cargos, Permissões, Painel Administrativo
- **Funcionalidades:** CRUD completo de usuários, visualização de cargos, edição de permissões granulares, painel com métricas
- **Dados:** localStorage (zetti_system_users)
- **Proteção:** RouteGuard com requireAdmin=true

#### `/mural-elogios` — Elogios
- **Dados:** elogios (localStorage/Supabase)
- **Funcionalidades:** Listagem de elogios, destaque de elogios, filtro por squad

#### `/nao-conformidades` — Não Conformidades
- **Dados:** nc_records (localStorage/Supabase)
- **Funcionalidades:** Listagem de NCs, filtros por analista/squad/tipo, detalhes de NC

#### `/historico` — Histórico
- **Dados:** import_cycles (localStorage)
- **Funcionalidades:** Histórico de importações, ciclos fechados, linha do tempo

#### `/importacoes` — Importações
- **Dados:** import_cycles
- **Funcionalidades:** Gerenciamento de importações, status de cada ciclo

#### `/auditoria` — Auditoria
- **Dados:** cycle_scores, nc_records
- **Funcionalidades:** Visão de auditoria por analista/ciclo

#### `/evolucao-geral` — Evolução dos Indicadores
- **Dados:** MONTHLY_TREND (mockData + dados reais)
- **Funcionalidades:** Gráfico de evolução histórica QA/IEPC

---

## 3. COMPONENTES E FRONTEND

### 3.1 Estrutura de Pastas
```
src/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat-completion/
│   │           └── route.ts          ← API Route para IA (Gemini/OpenAI/etc)
│   ├── components/                   ← Componentes da Home
│   │   ├── HeroCycleStatus.tsx       ← Banner do ciclo ativo
│   │   ├── HomeKPICards.tsx          ← Cards KPI da home
│   │   ├── HomeExecutiveView.tsx     ← Layout principal da home
│   │   ├── MonthlyTrendChart.tsx     ← Wrapper do gráfico mensal
│   │   ├── MonthlyTrendChartInner.tsx← Gráfico Recharts (client-only)
│   │   ├── TopAnalysts.tsx           ← Ranking top analistas
│   │   └── NavigationShortcuts.tsx   ← Atalhos de navegação
│   ├── cycle-dashboard/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── CycleDashboard.tsx    ← Componente principal do dashboard
│   │       ├── CycleFilters.tsx      ← Filtros de squad/analista/período
│   │       ├── CycleKPICards.tsx     ← KPIs do ciclo
│   │       ├── SquadRankingChart.tsx ← Wrapper ranking squads
│   │       ├── SquadRankingChartInner.tsx ← Recharts ranking
│   │       ├── PillarMatrix.tsx      ← Matriz de pilares QA/IEPC
│   │       ├── AnalystDrilldown.tsx  ← Detalhes por analista
│   │       ├── AnalystRadarChart.tsx ← Radar chart do analista
│   │       ├── PillarDrilldownModal.tsx ← Modal detalhe pilar
│   │       ├── CompareAnalystsModal.tsx ← Comparação de analistas
│   │       ├── NonConformitiesGuide.tsx ← Guia de NCs
│   │       └── ExecutiveInsights.tsx ← Insights IA Gemini
│   ├── configuracoes/page.tsx        ← Painel admin (CRUD usuários)
│   ├── gestao/page.tsx
│   ├── admin-config/page.tsx
│   ├── auditoria/page.tsx
│   ├── nao-conformidades/page.tsx
│   ├── mural-elogios/page.tsx
│   ├── historico/page.tsx
│   ├── importacoes/page.tsx
│   ├── documentos/page.tsx
│   ├── evolucao-geral/page.tsx
│   ├── sign-up-login/
│   │   ├── page.tsx
│   │   └── components/LoginScreen.tsx
│   ├── layout.tsx                    ← Root layout com providers
│   ├── page.tsx                      ← Home page
│   └── not-found.tsx
├── components/
│   ├── AppHeader.tsx                 ← Header + navegação por tabs
│   ├── AppFooter.tsx                 ← Rodapé
│   ├── ImportModal.tsx               ← Modal de importação CSV/XLSX
│   ├── RouteGuard.tsx                ← Proteção de rotas
│   ├── SystemLoginScreen.tsx         ← Tela de login/cadastro
│   ├── GoogleAnalytics.tsx           ← GA4 tracking
│   └── ui/
│       ├── AppImage.tsx              ← Wrapper next/image
│       ├── AppIcon.tsx               ← Wrapper de ícones
│       └── AppLogo.tsx               ← Logo do app
├── contexts/
│   ├── AuthContext.tsx               ← Supabase Auth context
│   └── SystemAuthContext.tsx         ← Sistema auth local context
├── lib/
│   ├── authSystem.ts                 ← Engine de autenticação local
│   ├── mockData.ts                   ← Dados mock + tipos base
│   ├── supabase/
│   │   └── client.tsx                ← Supabase client factory
│   ├── services/
│   │   ├── dataService.ts            ← CRUD localStorage + CSV parsers
│   │   └── supabaseDataService.ts    ← CRUD Supabase
│   ├── ai/
│   │   ├── aiClient.ts               ← Cliente HTTP para API Route IA
│   │   └── chatCompletion.ts         ← Funções de chat completion
│   ├── hooks/
│   │   ├── useChat.ts                ← Hook de chat com IA (streaming)
│   │   └── useRealtimeSync.ts        ← Hook Supabase Realtime
│   └── utils/
│       └── pdfExport.ts              ← Geração de PDF com jsPDF
└── styles/
    ├── index.css                     ← CSS global (não editar)
    └── tailwind.css                  ← Tailwind + tokens CSS
```

### 3.2 Componentes Principais

#### AppHeader (`src/components/AppHeader.tsx`)
- **Props:** onImportClick, userName, userRole, userAvatar, activeTab
- **Comportamento:** Sticky header com logo, tabs de navegação agrupadas, menu de usuário com logout
- **Tabs visíveis:** Filtra por `adminOnly` baseado em `isAdmin` do SystemAuthContext
- **Grupos de tabs:** VISÃO, OPERAÇÃO, HISTÓRICO, DADOS, ADMIN

#### ImportModal (`src/components/ImportModal.tsx`)
- **Props:** isOpen, onClose, onImportSuccess
- **Fluxo:** choose-type → upload → validate → done
- **Tipos de arquivo:** scores (QA/IEPC), ncs (Não Conformidades), elogios
- **Formatos:** CSV (auto-detect delimiter ;/,) e XLSX
- **Validação:** Colunas obrigatórias por tipo, warnings para colunas opcionais ausentes
- **Persistência:** localStorage (primário) + Supabase (paralelo)

#### CycleDashboard (`src/app/cycle-dashboard/components/CycleDashboard.tsx`)
- **Props:** nenhuma (usa hooks internos)
- **Dados:** fetchCycleScores, fetchAllPeriodos, fetchNCRecords, fetchElogios
- **Exportações:** CSV via exportCycleToCSV, PDF via exportCyclePDF
- **Permissões:** canImport, canExport, allowedSquads (filtro por equipe)

#### ExecutiveInsights (`src/app/cycle-dashboard/components/ExecutiveInsights.tsx`)
- **Props:** analysts? (opcional, fallback para ANALYSTS mock)
- **IA:** useChat('GEMINI', 'gemini/gemini-2.5-flash', streaming=true)
- **Prompt:** Análise executiva com 3 seções: Gargalos, Treinamento, Reconhecimento
- **Parâmetros IA:** temperature=0.4, max_tokens=2000

### 3.3 Hooks
| Hook | Arquivo | Finalidade |
|------|---------|-----------|
| useChat | lib/hooks/useChat.ts | Chat com IA via API Route (streaming SSE) |
| useRealtimeSync | lib/hooks/useRealtimeSync.ts | Supabase Realtime para tabelas específicas |
| useSystemAuth | contexts/SystemAuthContext.tsx | Sessão, login, logout, isAdmin |
| useAuth | contexts/AuthContext.tsx | Supabase Auth (email/password) |

### 3.4 Contexts/Providers
| Provider | Arquivo | Dados fornecidos |
|----------|---------|-----------------|
| SystemAuthProvider | SystemAuthContext.tsx | session, loading, isAdmin, login, logout |
| AuthProvider | AuthContext.tsx | user, userProfile, signOut (Supabase) |

---

## 4. DESIGN SYSTEM E IDENTIDADE VISUAL

### 4.1 Paleta de Cores (CSS Variables)
```css
/* Backgrounds */
--background: #F8FAFC          /* Fundo claro (não usado na app dark) */
--foreground: #0F172A          /* Texto principal */

/* Cores da aplicação (dark theme inline) */
#0D1117    /* Background principal das páginas */
#161B22    /* Background de cards */
#1C2333    /* Background de inputs */
#1E293B    /* Background do header */

/* Primárias */
--primary: #1E40AF             /* Azul principal */
--secondary: #3B82F6           /* Azul secundário */
#60A5FA                        /* Azul claro (textos/badges) */
#1D4ED8                        /* Azul hover */

/* Semânticas */
--success: #16A34A             /* Verde sucesso */
--warning: #D97706             /* Amarelo atenção */
--danger: #DC2626              /* Vermelho crítico */
#22C55E                        /* Verde score excelente (≥85) */
#EAB308                        /* Amarelo score atenção (≥70) */
#EF4444                        /* Vermelho score crítico (<70) */

/* Texto */
#FFFFFF                        /* Texto branco principal */
#C9D1D9                        /* Texto cinza claro */
#8B949E                        /* Texto cinza médio (subtítulos) */
rgba(255,255,255,0.5)          /* Texto semi-transparente */

/* Bordas */
rgba(255,255,255,0.08)         /* Borda sutil padrão */
rgba(255,255,255,0.12)         /* Borda mais visível */
```

### 4.2 Cores por Cargo (ROLE_COLORS)
```
Administrador:      #22C55E (verde)
Coordenador:        #60A5FA (azul claro)
Gestor:             #A78BFA (roxo)
Coordenador Geral:  #F59E0B (âmbar)
Auditor:            #FB923C (laranja)
```

### 4.3 Tipografia
| Fonte | Uso | Variável CSS |
|-------|-----|-------------|
| DM Sans | Corpo, UI, labels | --font-dm-sans |
| Playfair Display | Títulos, headings | --font-playfair / --font-display |
| Inter | Fallback | --font-sans |

### 4.4 Tokens de Espaçamento e Bordas
```
--radius: 0.75rem (12px) — border-radius padrão
Rounded-xl: 0.75rem
Rounded-2xl: 1rem
Padding cards: 1.5rem (24px)
Gap padrão: 0.5rem / 1rem / 1.5rem
```

### 4.5 Tema
- **Modo:** Dark theme aplicado via inline styles (não usa Tailwind dark:)
- **Responsividade:** Mobile-first, breakpoints sm/md/lg/xl/2xl
- **Scrollbar:** `.scrollbar-hide` para ocultar scrollbars horizontais

### 4.6 Score Colors (getScoreColor)
```
≥ 85 → #22C55E (Excelente)
≥ 70 → #EAB308 (Atenção)
< 70 → #EF4444 (Crítico)
```

---

## 5. BANCO DE DADOS (SUPABASE)

### 5.1 Schema Completo

#### Tabela: `user_profiles`
```sql
id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
email       TEXT NOT NULL UNIQUE
full_name   TEXT NOT NULL DEFAULT ''
role        user_role ENUM ('Admin','Coordenador','Diretoria','Gestor','Coordenador Geral','Auditor')
squad       TEXT
avatar      TEXT DEFAULT ''
created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```
**Índices:** idx_user_profiles_email  
**RLS:** Usuário gerencia próprio perfil; Admin gerencia todos

#### Tabela: `import_cycles`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
periodo      TEXT NOT NULL UNIQUE (ex: "04/2026")
imported_by  UUID REFERENCES user_profiles(id) ON DELETE SET NULL
imported_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
file_name    TEXT
record_count INTEGER DEFAULT 0
```
**RLS:** SELECT para todos autenticados; INSERT para todos autenticados

#### Tabela: `cycle_scores`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
cycle_id            UUID REFERENCES import_cycles(id) ON DELETE CASCADE
periodo             TEXT NOT NULL
data_registro       TEXT
analista            TEXT NOT NULL
squad               TEXT NOT NULL
coordenador         TEXT NOT NULL
auditor             TEXT
nota_final_qa       NUMERIC(6,2) DEFAULT 0    ← Score QA 0-100
iepc_total          NUMERIC(6,2) DEFAULT 0    ← Score IEPC 0-100
total_ncs           INTEGER DEFAULT 0
pontos_deduzidos_nc NUMERIC(6,2) DEFAULT 0
p1                  NUMERIC(6,2) DEFAULT 0    ← QA Pilar 1 (max 22pts)
p2                  NUMERIC(6,2) DEFAULT 0    ← QA Pilar 2 (max 34pts)
p3                  NUMERIC(6,2) DEFAULT 0    ← QA Pilar 3 (max 18pts)
p4                  NUMERIC(6,2) DEFAULT 0    ← QA Pilar 4 (max 14pts)
p5                  NUMERIC(6,2) DEFAULT 0    ← QA Pilar 5 (max 12pts)
e1                  NUMERIC(6,2) DEFAULT 0    ← IEPC E1 (max 30pts)
e2                  NUMERIC(6,2) DEFAULT 0    ← IEPC E2 (max 20pts)
e3                  NUMERIC(6,2) DEFAULT 0    ← IEPC E3 (max 20pts)
e4                  NUMERIC(6,2) DEFAULT 0    ← IEPC E4 (max 15pts)
e5                  NUMERIC(6,2) DEFAULT 0    ← IEPC E5 (max 15pts)
created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```
**Índices:** periodo, analista, squad  
**RLS:** SELECT/INSERT/DELETE para todos autenticados

#### Tabela: `nc_records`
```sql
id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
cycle_id              UUID REFERENCES import_cycles(id) ON DELETE CASCADE
periodo               TEXT NOT NULL
data_registro         TEXT
analista              TEXT NOT NULL
squad                 TEXT NOT NULL
coordenador           TEXT NOT NULL
auditor               TEXT
tipo_nc               TEXT NOT NULL
descricao             TEXT
pontos_deduzidos      NUMERIC(6,2) DEFAULT -20
protocolo_referencia  TEXT
avaliacao_id          TEXT
created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```
**Índices:** periodo, analista  
**RLS:** SELECT/INSERT/DELETE para todos autenticados

#### Tabela: `elogios`
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
cycle_id     UUID REFERENCES import_cycles(id) ON DELETE CASCADE
periodo      TEXT NOT NULL
colaborador  TEXT NOT NULL
squad        TEXT NOT NULL
cliente      TEXT
protocolo    TEXT
elogio       TEXT NOT NULL
destaque     BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
```
**Índices:** periodo, colaborador  
**RLS:** SELECT/INSERT/UPDATE/DELETE para todos autenticados

### 5.2 Funções e Triggers
```sql
-- Trigger: cria user_profile automaticamente ao criar usuário no Supabase Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função: verifica se usuário atual é Admin
CREATE FUNCTION public.is_admin() RETURNS BOOLEAN
  → SELECT WHERE id = auth.uid() AND role = 'Admin'

-- Função: verifica se é Admin ou Diretoria
CREATE FUNCTION public.is_admin_or_diretoria() RETURNS BOOLEAN
  → SELECT WHERE id = auth.uid() AND role IN ('Admin', 'Diretoria')
```

### 5.3 ENUM Types
```sql
CREATE TYPE public.user_role AS ENUM (
  'Admin', 'Coordenador', 'Diretoria', 'Gestor', 'Coordenador Geral', 'Auditor'
);
```

### 5.4 Onde Cada Dado é Armazenado
| Dado | localStorage Key | Supabase Table |
|------|-----------------|----------------|
| Usuários do sistema | zetti_system_users | — (não sincronizado) |
| Sessão ativa | zetti_session | — |
| Scores QA/IEPC | zetti_cycle_scores | cycle_scores |
| Não Conformidades | zetti_nc_records | nc_records |
| Elogios | zetti_elogios | elogios |
| Ciclos de importação | zetti_import_cycles | import_cycles |
| Perfis Supabase | — | user_profiles |
| Ciclos fechados | zetti_closed_cycles | — |
| Perfis de analistas | zetti_analyst_profiles | — |

---

## 6. AUTENTICAÇÃO E USUÁRIOS

### 6.1 Sistema de Autenticação Atual
O sistema possui **dois sistemas de autenticação paralelos**:

#### Sistema 1: Auth Local (authSystem.ts) — PRIMÁRIO
- **Armazenamento:** localStorage (`zetti_system_users`, `zetti_session`)
- **Hash de senha:** SHA-256 via Web Crypto API com salt fixo (`zetti_salt_2026`)
- **Sessão:** JSON em localStorage com timeout de inatividade (30 min)
- **Timeout:** Detectado por eventos mousemove/keydown/click/scroll/touchstart
- **Logout automático:** setTimeout de 30 minutos sem atividade

#### Sistema 2: Supabase Auth (AuthContext.tsx) — SECUNDÁRIO
- **Armazenamento:** Supabase Auth (JWT)
- **Tabela:** user_profiles (criada via trigger on_auth_user_created)
- **Status:** Integrado mas não é o fluxo principal de login

### 6.2 Roles e Permissões

#### Roles Disponíveis (SystemRole)
```typescript
type SystemRole = 'Administrador' | 'Coordenador' | 'Gestor' | 'Coordenador Geral' | 'Auditor'
```

#### Permissões Granulares (UserPermissions)
```typescript
interface UserPermissions {
  acesso_total: boolean;                        // Todas as permissões
  visualizar_todas_equipes: boolean;            // Ver todas as squads
  visualizar_equipes_especificas: string[];     // Lista de squads permitidas
  permissao_editar: boolean;                    // Editar registros
  permissao_visualizar: boolean;               // Somente leitura
  permissao_cadastrar_usuarios: boolean;        // Criar usuários
  permissao_excluir_usuarios: boolean;          // Deletar usuários
  permissao_acessar_relatorios: boolean;        // Exportar relatórios
}
```

#### Permissões Padrão por Perfil
| Permissão | Admin | Outros |
|-----------|-------|--------|
| acesso_total | ✅ | ❌ |
| visualizar_todas_equipes | ✅ | ❌ |
| permissao_editar | ✅ | ❌ |
| permissao_visualizar | ✅ | ✅ |
| permissao_cadastrar_usuarios | ✅ | ❌ |
| permissao_excluir_usuarios | ✅ | ❌ |
| permissao_acessar_relatorios | ✅ | ❌ |

### 6.3 Usuários Padrão (Seed)
| Email | Senha | Cargo | Status |
|-------|-------|-------|--------|
| admin@zetti.com.br | ZettiAdmin@2026 | Administrador | Ativo |
| brunaramos1807@gmail.com | ZettiAdmin@2026 | Administrador | Ativo |

### 6.4 Equipes Disponíveis (TEAM_OPTIONS)
- PDV
- PDV N1
- Compras e Estoque
- Financeiro Fiscal
- Todas

### 6.5 Fluxo de Login
```
1. Usuário preenche email + senha
2. loginUser() busca usuário em localStorage
3. Verifica status === 'Ativo'
4. Compara SHA-256(senha + salt) com senha_hash armazenada
5. Cria SessionData com userId, email, nome, cargo, permissoes
6. Salva em localStorage (zetti_session)
7. SystemAuthContext atualiza estado session
8. RouteGuard libera acesso ao conteúdo
9. Timer de inatividade inicia (30 min)
```

---

## 7. FLUXO DA AVALIAÇÃO / IMPORTAÇÃO

### 7.1 Fluxo de Importação de Dados
```
1. Usuário clica "Importar Dados" (visível para permissao_editar ou admin)
2. ImportModal abre (step: choose-type)
3. Usuário seleciona tipo: scores | ncs | elogios
4. Usuário faz upload de arquivo CSV ou XLSX
5. parseFile() detecta formato e parseia
6. validateColumns() verifica colunas obrigatórias
7. buildValidationSummary() calcula preview dos dados
8. Usuário confirma importação
9. importCycleData() salva em localStorage
10. importCycleDataToSupabase() salva em Supabase (paralelo)
11. window.dispatchEvent('zetti_import_done') notifica dashboard
12. Dashboard recarrega dados automaticamente
```

### 7.2 Parsers CSV por Tipo

#### Scores (parseQAScoresCSV)
Colunas obrigatórias: Analista, Squad, Coordenador, Nota Final QA (0-100), IEPC - Índice de Experiência Percebida pelo Cliente (0-100)
Colunas opcionais: Período, Data do Registro, Auditor, Total de Não Conformidades, Pontos Deduzidos por NC, QA P1-P5, IEPC E1-E5

#### NCs (parseNCsCSV)
Colunas obrigatórias: Analista, Squad, Tipo de Não Conformidade, Pontos Deduzidos
Colunas opcionais: Período, Coordenador, Auditor, Descrição, Protocolo Referência, ID da Avaliação

#### Elogios (parseElogiosCSV)
Colunas obrigatórias: Colaborador, Elogio
Colunas opcionais: Squad, Cliente, Protocolo, Período

---

## 8. ENGINE QA + IEPC

### 8.1 Estrutura QA (5 Pilares)
| Pilar | Nome | Pontos Máx | Critérios |
|-------|------|-----------|-----------|
| P1 | Gestão do Fluxo e Rastreabilidade | 22 | P1.1.1 Identificação (5), P1.1.2 Protocolo SUP (9), P1.1.3 Encerramento (8) |
| P2 | Gestão da Tratativa da Demanda | 34 | P2.2.1 Validação (8), P2.2.2 Orientação (9), P2.2.3 Resolução (9), P2.2.4 Documentação (8) |
| P3 | Análise e Assertividade Técnica | 18 | P3.3.1 Análise técnica (10), P3.3.2 Ferramentas (8) |
| P4 | Qualidade da Comunicação | 14 | P4.4.1 Língua portuguesa (4), P4.4.2 Tom/postura (5), P4.4.3 Clareza (5) |
| P5 | Conduta Relacional | 12 | P5.5.1 Cordialidade (4), P5.5.2 Proatividade (5), P5.5.3 Over delivery (3) |
| **TOTAL QA** | | **100** | |

### 8.2 Estrutura IEPC (5 Dimensões)
| Dimensão | Nome | Pontos Máx | Descrição |
|----------|------|-----------|-----------|
| E1 | Resolução Percebida | 30 | Percepção do cliente sobre resolução efetiva |
| E2 | Compreensão e Segurança | 20 | Clareza e confiança nas orientações |
| E3 | Esforço do Cliente | 20 | Menor esforço = maior pontuação |
| E4 | Tempo e Fluidez | 15 | Agilidade e continuidade do atendimento |
| E5 | Experiência Relacional | 15 | Cordialidade, personalização, empatia |
| **TOTAL IEPC** | | **100** | |

### 8.3 Cálculo das Notas
```
nota_final_qa = soma(p1 + p2 + p3 + p4 + p5) - pontos_deduzidos_nc
iepc_total = soma(e1 + e2 + e3 + e4 + e5)
```
**Nota:** Os valores p1-p5 e e1-e5 já chegam calculados no CSV. O sistema não recalcula — apenas armazena e exibe.

### 8.4 Classificação de Score
```
≥ 85 → "Excelente" (verde #22C55E)
≥ 70 → "Atenção" (amarelo #EAB308)
< 70 → "Crítico" (vermelho #EF4444)
```

### 8.5 Não Conformidades (NC)
- Cada NC deduz **-20 pontos** da nota QA (padrão)
- Tipos registrados: "Integridade do Fluxo Operacional", "Conformidade de Registro e Rastreabilidade"
- Campo `pontos_deduzidos` no CSV define o valor real

### 8.6 Problema do Gráfico IEPC
**Diagnóstico:** O gráfico IEPC (radar/bar chart de E1-E5) existe no componente `AnalystRadarChart.tsx` e é renderizado dentro de `AnalystDrilldown.tsx`. O problema reportado de "não aparecer" provavelmente se deve a:
1. Dados IEPC zerados quando importados sem as colunas E1-E5 no CSV
2. O componente usa Recharts que requer `'use client'` e pode ter problemas de hidratação
3. O `AnalystRadarChart` usa `ResponsiveContainer` que precisa de altura definida no pai

---

## 9. EXPORTAÇÕES

### 9.1 Exportação PDF (pdfExport.ts)
- **Biblioteca:** jsPDF 4.2.1 + jspdf-autotable 5.0.7
- **Formato:** A4 landscape
- **Conteúdo:** Header com período, KPI summary, tabela QA/IEPC por analista, tabela NCs, tabela Elogios
- **Trigger:** Botão "PDF" no CycleDashboard (visível para canExport)
- **Arquivo gerado:** `relatorio_ciclo_{periodo}.pdf`

### 9.2 Exportação CSV (dataService.ts — exportCycleToCSV)
- **Biblioteca:** Nativa (Blob + URL.createObjectURL)
- **Conteúdo:** cycle_scores do período selecionado
- **Trigger:** Botão "CSV" no CycleDashboard

### 9.3 Formatos Disponíveis
| Formato | Status | Biblioteca |
|---------|--------|-----------|
| PDF | ✅ Implementado | jsPDF + autotable |
| CSV | ✅ Implementado | Nativo |
| XLSX | ❌ Não implementado | — |
| DOCX | ❌ Não implementado | — |
| JSON | ❌ Não implementado | — |
| PPT | ❌ Não implementado | — |

---

## 10. DASHBOARDS E INDICADORES

### 10.1 Gráficos Existentes
| Gráfico | Componente | Tipo | Dados |
|---------|-----------|------|-------|
| Tendência Mensal | MonthlyTrendChartInner | LineChart (Recharts) | MONTHLY_TREND (mock) |
| Ranking de Squads | SquadRankingChartInner | BarChart (Recharts) | cycle_scores agrupados por squad |
| Radar do Analista | AnalystRadarChart | RadarChart (Recharts) | p1-p5, e1-e5 do analista selecionado |
| Matriz de Pilares | PillarMatrix | Grid visual | Médias p1-p5 e e1-e5 por squad/analista |

### 10.2 KPIs Calculados
- **QA Média:** média de nota_final_qa de todos os analistas do período
- **IEPC Médio:** média de iepc_total
- **Total NCs:** soma de total_ncs
- **Total Elogios:** count de elogios do período
- **Analistas Avaliados:** count de registros em cycle_scores

### 10.3 Filtros Disponíveis
- Por Squad (dropdown)
- Por Analista (dropdown)
- Por Período (select com todos os períodos importados)
- Por ViewMode: overview | pilares | analistas

### 10.4 Indicadores Ausentes (a implementar)
- Ranking individual de analistas (parcialmente existe via TopAnalysts)
- Elogios por analista no dashboard
- Reincidência de NCs
- NCs por analista/auditor
- IEPC mensal histórico
- Evolução histórica real (usa mock atualmente)

---

## 11. STORAGE E ARQUIVOS

### 11.1 Storage Atual
- **Supabase Storage:** Não configurado (nenhum bucket criado)
- **Arquivos locais:** Apenas processados em memória durante importação
- **PDFs:** Gerados client-side e baixados diretamente (não armazenados)

### 11.2 Imagens Estáticas
```
public/
├── favicon.ico
└── assets/images/
    ├── 5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png  ← Logo principal
    ├── no_image.png                                                    ← Placeholder
    └── app_logo.png                                                    ← Logo alternativa
```

---

## 12. LOGS E AUDITORIA

### 12.1 Logs Existentes
- **Console logs:** Erros de Supabase (console.error) em supabaseDataService.ts
- **Último acesso:** Campo `ultimo_acesso` em SystemUser (atualizado no login)
- **Registro de importações:** import_cycles com imported_at, file_name, record_count

### 12.2 Trilha de Auditoria
- **Não implementada formalmente**
- Não há tabela de audit_log no banco
- Não há versionamento de alterações
- Não há rastreamento de quem alterou o quê

---

## 13. PONTOS CRÍTICOS DO SISTEMA

### 13.1 Problemas Estruturais

#### 🔴 CRÍTICO: Dois sistemas de autenticação paralelos
- `authSystem.ts` (localStorage) e `AuthContext.tsx` (Supabase Auth) coexistem sem sincronização
- Usuários criados no sistema local não existem no Supabase Auth
- Risco de inconsistência de dados e confusão de sessão

#### 🔴 CRÍTICO: Dados de usuários em localStorage
- Todos os usuários, senhas (hash) e permissões ficam em localStorage do browser
- Dados perdidos ao limpar cache/cookies
- Não há persistência real no servidor
- Impossível gerenciar usuários de forma centralizada

#### 🔴 CRÍTICO: Salt de senha fixo e hardcoded
- `zetti_salt_2026` é um salt estático em código-fonte
- Vulnerável a ataques de rainbow table se o código for exposto
- Não é bcrypt real — é SHA-256 com salt fixo

#### 🟡 ALTO: Dados primários em localStorage
- cycle_scores, nc_records, elogios ficam em localStorage
- Supabase é sincronizado em paralelo mas não é a fonte primária
- Se localStorage for limpo, dados são perdidos mesmo existindo no Supabase
- fetchCycleScores() lê localStorage primeiro, Supabase como fallback

#### 🟡 ALTO: Sem multiusuário real
- Não há isolamento de dados por usuário/tenant
- Qualquer usuário autenticado vê todos os dados (RLS permissiva)
- Filtro de equipes é apenas visual (frontend), não há RLS por squad

#### 🟡 ALTO: Mock data misturado com dados reais
- ExecutiveInsights usa ANALYSTS/NC_RECORDS/ELOGIOS do mockData.ts
- MonthlyTrendChart usa MONTHLY_TREND mock (apenas 1 mês)
- TopAnalysts pode usar dados mock se não houver dados importados

#### 🟠 MÉDIO: IEPC não renderiza em alguns casos
- Dados E1-E5 podem ser zero se CSV não tiver as colunas IEPC
- AnalystRadarChart pode não aparecer sem altura definida no container pai

#### 🟠 MÉDIO: Sem paginação
- Todas as listas carregam todos os registros de uma vez
- Performance degradará com volumes maiores

#### 🟠 MÉDIO: Sem tratamento de erros robusto
- Erros de Supabase são logados no console mas não exibidos ao usuário
- Importação continua mesmo com erros parciais

### 13.2 Dívidas Técnicas
- Sem testes automatizados (unitários, integração, e2e)
- Sem CI/CD configurado
- Sem documentação de API
- Sem monitoramento de erros (Sentry, etc.)
- Sem rate limiting nas API Routes
- Sem validação de entrada nas API Routes de IA
- RLS policies muito permissivas (todos autenticados podem tudo)

---

## 14. MELHORIAS NECESSÁRIAS

### 14.1 Prioridade Alta (Bloqueadores para Produção)
1. **Migrar auth para Supabase Auth exclusivamente** — eliminar localStorage auth
2. **Migrar dados para Supabase como fonte primária** — localStorage apenas como cache
3. **Implementar RLS por squad/tenant** — isolamento real de dados
4. **Usar bcrypt real** (via Supabase Auth) para senhas
5. **Criar tabela de usuários no Supabase** sincronizada com auth.users

### 14.2 Prioridade Média (Funcionalidades Críticas)
6. **Módulo de elogios completo** — filtros, exportação, ranking por analista
7. **Uploads mensais acumulativos** — não sobrescrever, acumular por período
8. **IEPC completo** — garantir que E1-E5 sejam sempre importados e exibidos
9. **Evolução histórica real** — substituir mock por dados reais do Supabase
10. **Consolidação por analista** — histórico individual de cada analista

### 14.3 Prioridade Baixa (Melhorias)
11. **Exportação XLSX/DOCX/PPT**
12. **Geração automática de apresentações**
13. **Módulo de BI** com filtros avançados
14. **Rastreabilidade ISO** — audit log completo
15. **Paginação** em todas as listas
16. **Testes automatizados**
17. **Monitoramento de erros**

---

## 15. MAPA COMPLETO DE PASTAS E ARQUIVOS

```
/
├── .env                              ← Variáveis de ambiente
├── .eslintrc.json                    ← Configuração ESLint
├── .prettierrc                       ← Configuração Prettier
├── image-hosts.config.mjs            ← Hosts permitidos para next/image
├── next.config.mjs                   ← Configuração Next.js
├── next-env.d.ts                     ← Types Next.js
├── package.json                      ← Dependências
├── package-lock.json
├── postcss.config.js                 ← PostCSS (Tailwind)
├── tailwind.config.js                ← Tailwind CSS config
├── tsconfig.json                     ← TypeScript config
├── README.md
├── docs/
│   ├── dossie-tecnico.md             ← Este arquivo
│   ├── dossie-tecnico.txt            ← Versão texto plano
│   └── dossie-tecnico.json           ← Versão JSON estruturada
├── public/
│   ├── favicon.ico
│   └── assets/images/
│       ├── app_logo.png
│       ├── no_image.png
│       └── 5f5559140_ChatGPTImage27deabrde202616_50_50-1777926706123.png
├── supabase/
│   └── migrations/
│       ├── 20260505174502_zetti_quality_hub.sql   ← Schema principal
│       ├── 20260505200000_admin_users_setup.sql   ← Setup admin
│       └── 20260508203000_add_roles_and_bruna.sql ← Roles adicionais
└── src/
    ├── app/
    │   ├── api/ai/chat-completion/route.ts
    │   ├── components/
    │   │   ├── HeroCycleStatus.tsx
    │   │   ├── HomeKPICards.tsx
    │   │   ├── HomeExecutiveView.tsx
    │   │   ├── MonthlyTrendChart.tsx
    │   │   ├── MonthlyTrendChartInner.tsx
    │   │   ├── TopAnalysts.tsx
    │   │   └── NavigationShortcuts.tsx
    │   ├── cycle-dashboard/
    │   │   ├── page.tsx
    │   │   └── components/
    │   │       ├── AnalystDrilldown.tsx
    │   │       ├── AnalystRadarChart.tsx
    │   │       ├── CompareAnalystsModal.tsx
    │   │       ├── CycleDashboard.tsx
    │   │       ├── CycleFilters.tsx
    │   │       ├── CycleKPICards.tsx
    │   │       ├── ExecutiveInsights.tsx
    │   │       ├── NonConformitiesGuide.tsx
    │   │       ├── PillarDrilldownModal.tsx
    │   │       ├── PillarMatrix.tsx
    │   │       ├── SquadRankingChart.tsx
    │   │       └── SquadRankingChartInner.tsx
    │   ├── configuracoes/page.tsx
    │   ├── gestao/page.tsx
    │   ├── admin-config/page.tsx
    │   ├── auditoria/page.tsx
    │   ├── nao-conformidades/page.tsx
    │   ├── mural-elogios/page.tsx
    │   ├── historico/page.tsx
    │   ├── importacoes/page.tsx
    │   ├── documentos/page.tsx
    │   ├── evolucao-geral/page.tsx
    │   ├── sign-up-login/
    │   │   ├── page.tsx
    │   │   └── components/LoginScreen.tsx
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── not-found.tsx
    ├── components/
    │   ├── AppFooter.tsx
    │   ├── AppHeader.tsx
    │   ├── GoogleAnalytics.tsx
    │   ├── ImportModal.tsx
    │   ├── RouteGuard.tsx
    │   ├── SystemLoginScreen.tsx
    │   └── ui/
    │       ├── AppIcon.tsx
    │       ├── AppImage.tsx
    │       └── AppLogo.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── SystemAuthContext.tsx
    ├── lib/
    │   ├── authSystem.ts
    │   ├── mockData.ts
    │   ├── supabase/client.tsx
    │   ├── ai/
    │   │   ├── aiClient.ts
    │   │   └── chatCompletion.ts
    │   ├── hooks/
    │   │   ├── useChat.ts
    │   │   └── useRealtimeSync.ts
    │   ├── services/
    │   │   ├── dataService.ts
    │   │   └── supabaseDataService.ts
    │   └── utils/
    │       └── pdfExport.ts
    └── styles/
        ├── index.css
        └── tailwind.css
```

---

## 16. PROMPTS E IA

### 16.1 Integração de IA
- **Provedor ativo:** Google Gemini
- **Modelo:** `gemini/gemini-2.5-flash`
- **Modo:** Streaming (SSE via API Route)
- **API Route:** `POST /api/ai/chat-completion`

### 16.2 SDK
```
@rocketnew/llm-sdk — abstração multi-provider
Suporta: OPEN_AI, ANTHROPIC, GEMINI, PERPLEXITY
```

### 16.3 Prompt Principal (ExecutiveInsights)
**Contexto do sistema:** "Consultor sênior de Qualidade Operacional especializado em análise de dados de call center e suporte técnico."

**Dados enviados no prompt:**
- Total de analistas avaliados
- QA Média e IEPC Médio do ciclo
- Total de NCs e Elogios
- Desempenho por squad (QA, IEPC, count)
- Desempenho individual (QA, IEPC, NCs, P1-P5, E1-E5)
- NCs por tipo (contagem)
- Elogios por squad (contagem)

**Saída esperada (3 seções):**
1. 🔴 Gargalos Operacionais
2. 📚 Temas Prioritários para Treinamento
3. ✅ Padrões de Acerto e Reconhecimento

**Parâmetros:** temperature=0.4, max_tokens=2000

### 16.4 Limitações da IA
- Usa dados mock (ANALYSTS do mockData.ts) em vez de dados reais importados
- Não há fallback se Gemini estiver indisponível
- Sem cache de respostas
- Sem histórico de análises geradas

---

## 17. STATUS REAL DO SISTEMA

### 17.1 Avaliação de Maturidade

| Dimensão | Status | Nota |
|----------|--------|------|
| Funcionalidade core (importação + dashboard) | ✅ Funcional | 7/10 |
| Autenticação | ⚠️ Funcional mas frágil | 4/10 |
| Persistência de dados | ⚠️ Dual (localStorage + Supabase) | 5/10 |
| Segurança | 🔴 Crítica | 3/10 |
| Multiusuário | 🔴 Não implementado | 2/10 |
| Exportações | ✅ PDF + CSV | 6/10 |
| IA/Insights | ✅ Funcional (dados mock) | 5/10 |
| Auditoria/Logs | 🔴 Ausente | 1/10 |
| Testes | 🔴 Ausente | 0/10 |
| Documentação | ⚠️ Parcial | 3/10 |
| Performance | ⚠️ Aceitável (sem paginação) | 5/10 |
| Escalabilidade | 🔴 Não preparado | 2/10 |

### 17.2 Readiness Assessment
| Objetivo | Readiness |
|----------|-----------|
| Uso interno básico | ✅ Pronto |
| Multiusuário real | 🔴 Não pronto (requer refatoração auth) |
| ISO/Auditoria | 🔴 Não pronto (sem audit log) |
| Escala (>100 usuários) | 🔴 Não pronto (localStorage, sem paginação) |
| Produção institucional | ⚠️ Parcialmente pronto |

### 17.3 Nível de Estabilidade
**Classificação atual:** MVP Funcional — adequado para uso interno controlado com 1-5 usuários, dados de teste e ambiente não crítico. Não recomendado para produção institucional sem as correções de segurança e persistência.

---

## 18. PRÓXIMOS PASSOS RECOMENDADOS

### Fase 1 — Estabilização (Sprint 1-2)
1. Migrar auth para Supabase Auth como fonte única
2. Migrar leitura de dados para Supabase como primário
3. Corrigir RLS policies para isolamento real
4. Criar tabela `system_users` no Supabase para usuários do sistema

### Fase 2 — Funcionalidades Core (Sprint 3-4)
5. Corrigir IEPC (garantir importação e exibição de E1-E5)
6. Implementar evolução histórica real
7. Módulo de elogios completo
8. Consolidação por analista

### Fase 3 — Governança (Sprint 5-6)
9. Audit log completo
10. Rastreabilidade ISO
11. Exportações XLSX/DOCX
12. Testes automatizados

---

*Documento gerado automaticamente a partir da análise do código-fonte em 2026-05-11.*
*Para atualizar este dossiê, solicite nova geração após alterações significativas no sistema.*
