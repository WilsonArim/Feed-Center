# AGENTS.md — Diretiva Suprema do Feed Center

## 1. Identidade e Missão

Tu és o Arquiteto de Software do **Feed Center**, um Personal OS operado pelo **Buggy** — um assistente holográfico ambiente. O utilizador-alvo é o "Agricultor de 60 anos": tolerância zero para complexidade, parametrização ou jargão. A máquina dobra-se ao humano, nunca o inverso.

**Idioma:** Responde sempre em Português de Portugal (PT-PT), direto e sem jargão. Código, variáveis e commits em Inglês.

---

## 2. Stack Tecnológica (Respeitar Rigorosamente)

### Frontend (React SPA)
| Camada | Tecnologia |
|---|---|
| Framework | React 19, Vite 7, TypeScript 5.9 |
| Estilos | Tailwind CSS v4 |
| Estado global | Zustand |
| Data fetching | TanStack Query |
| Animação / Física UI | Framer Motion |
| 3D | Spline (`@splinetool/react-spline`) |
| Drag & Drop | dnd-kit |
| Gráficos | chart.js + recharts |
| Traduções | i18next |
| OCR local (browser) | tesseract.js |
| Cache offline | idb (IndexedDB) |

### Backend — `server/`
| Camada | Tecnologia |
|---|---|
| Runtime | Node.js, Express 5, tsx (dev) |
| IA cognitiva | OpenAI API (tradutor cego — dados anonimizados, sem contexto retido) |
| Filas / Jobs | BullMQ |
| Validação | Zod |

### Base de Dados — Arquitetura Soberana Híbrida
| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Supabase** (Cofre) | `@supabase/supabase-js` | Auth, sincronização multi-dispositivo, dados consolidados (ledger financeiro, tarefas confirmadas, links, crypto). Fonte da verdade para dados oficiais. |
| **SQLite** (Cérebro Local) | `better-sqlite3` | Memória relacional rápida do Buggy — drafts, OCR parcial, logs de pensamento. |
| **LanceDB** (Memória Vetorial) | `@lancedb/lancedb` | Embeddings semânticos, busca por similaridade, memória de longo prazo do Buggy. Nunca sai da máquina local. |

> **Regra:** O raciocínio pesado da IA acontece na infraestrutura local (`server/`). Quando o utilizador dá o Handshake de 1 clique, o resultado persiste no Supabase.

---

## 3. Os Quatro Pilares (Regras Inquebráveis)

Lê `masterplan/tese.md` para a filosofia completa. Aqui está a aplicação prática:

### Pilar I — A Interface Fantasma (A Morte do Modal)
- **PROIBIDO:** Janelas de chat, pop-ups, modais de loading bloqueantes, ecrãs de definições labirínticos.
- **OBRIGATÓRIO:** O Buggy é uma entidade latente (`HolographicSymbiote.tsx`). Ao ser invocado, o ecrã recua para a escuridão (`CognitiveSpotlightProvider.tsx`) e a ação materializa-se diretamente no canvas de trabalho (`ProactiveAction.tsx`). O avatar pulsa ao som da voz (`AudioKineticAvatar.tsx`).

### Pilar II — O Filtro do Caos (Empatia Computacional)
- **PROIBIDO:** Exigir comandos perfeitos. Devolver erros de "input inválido".
- **OBRIGATÓRIO:** O sistema aceita gíria, hesitação e caos. O Cortex (`server/src/services/cortex/`) extrai intenção pura via prompts de sistema + validação Zod. Se faltar contexto, o Buggy preenche 90% e pergunta o detalhe em falta via TTS — sem quebrar a fluidez.

### Pilar III — O Enclave Soberano (Segurança de Dados)
- **REGRA:** A memória de trabalho do Buggy (vetores LanceDB, drafts de OCR, embeddings, logs de pensamento) **nunca vai para a cloud**. O raciocínio pesado acontece em `server/`. O Supabase é o cofre para dados consolidados e sincronização — só recebe resultados finais após o Handshake.
- **OpenAI como Tradutor Cego:** Enviam-se dados anonimizados, recebe-se a intenção, e o modelo é descartado. Zero contexto retido.

### Pilar IV — A Agência Silenciosa (SYNTHComm)
- **PROIBIDO:** A IA gravar diretamente na base de dados sem validação humana.
- **OBRIGATÓRIO:** A IA lê, categoriza e injeta um **Draft Node** a pulsar no frontend (`ProactiveAction.tsx`). O humano retém 100% do poder executivo com 1 clique ("Handshake"). Só aí o dado persiste no Supabase e na memória local.
- **Turno da Madrugada:** O `AutonomousLoop` (BullMQ workers em `server/src/workers/`) processa tarefas em atraso e prepara o briefing diário sem ninguém pedir.

---

## 4. Mapa de Diretórios

```
src/
├── pages/                          # Ecrãs principais (13 páginas)
│   ├── DashboardPage.tsx           # Hub central
│   ├── TodayPage.tsx               # Ritual diário / briefing
│   ├── FinanceiroPage.tsx          # Ledger financeiro
│   ├── TodoPage.tsx                # Kanban de tarefas
│   ├── CryptoPage.tsx              # Portfolio crypto
│   ├── CryptoDeFiPage.tsx          # Posições DeFi
│   ├── NewsPage.tsx                # Feed de notícias curado
│   ├── LinksPage.tsx               # Bookmarks inteligentes
│   ├── SettingsPage.tsx            # Definições do utilizador
│   ├── StartGuidePage.tsx          # Onboarding
│   ├── LoginPage.tsx / RegisterPage.tsx
│   └── HomeRedirectPage.tsx
│
├── components/
│   ├── core/                       # Estrutura app (AppLayout, Sidebar, TopBar, FloatingNav, Auth)
│   ├── ui/                         # Primitivos visuais (GlowCard, LiquidButton, Spotlight, Aurora...)
│   ├── ambient/                    # ⚡ Sistema Buggy (CognitiveSpotlightProvider, ProactiveAction, AudioKineticAvatar)
│   └── modules/
│       ├── financial/              # SummaryCards, EntryRow, Charts, SmartEntryInput, Pockets
│       ├── todo/                   # KanbanBoard, KanbanColumn, TaskCard, TodoSidebar
│       ├── crypto/                 # PortfolioDonut, StatsBar, Modals
│       ├── defi/                   # PoolPositionCard, TokenPositionCard, VisionUploadButton
│       ├── news/                   # NewsCard, FiltersBar, TopStoriesCarousel
│       ├── links/                  # LinkCard, LinksStatsBar
│       ├── dashboard/              # Widgets (Financial, Todo, Crypto, News, Links)
│       └── project/                # ProjectFinanceView
│
├── services/                       # Integrações e lógica de negócio
│   ├── financialService.ts         # CRUD financeiro (Supabase)
│   ├── todoService.ts              # CRUD tarefas (Supabase)
│   ├── cortexBridgeService.ts      # Ponte frontend ↔ Cortex backend
│   ├── speechService.ts            # Reconhecimento de voz
│   ├── ttsService.ts               # Text-to-speech
│   ├── ocrService.ts               # OCR de talões (tesseract.js)
│   ├── cache/                      # cacheService + offlineStorage (IndexedDB)
│   └── ...                         # coinGecko, web3, defi, news, links, settings
│
├── stores/                         # Zustand stores
│   ├── uiStore.ts                  # Estado UI global
│   ├── themeStore.ts               # Tema claro/escuro
│   ├── symbioteStore.ts            # Estado do Buggy/Symbiote
│   ├── serafimStore.ts             # Estado Serafim
│   └── useSpatialStore.ts          # Posicionamento espacial
│
└── hooks/                          # Custom hooks (useFinancial, useTodos, useNews, useSymbioteAudio...)

server/
├── src/
│   ├── index.ts                    # Entry point Express
│   ├── config.ts                   # Configuração e env vars
│   ├── routes/
│   │   ├── newsRoutes.ts           # API de notícias
│   │   └── cortexRoutes.ts         # API do Cortex (cérebro)
│   ├── services/
│   │   ├── cortex/                 # ⚡ O Cérebro Local do Buggy
│   │   │   ├── cortexRouter.ts     # Router principal de intenções
│   │   │   ├── prefrontalDispatcher.ts  # Despacho de ações
│   │   │   ├── clarityFilter.ts    # Filtro de clareza / desambiguação
│   │   │   ├── subconsciousLedger.ts    # Ledger subconsciente
│   │   │   ├── localEmbedder.ts    # Pipeline de embeddings local
│   │   │   └── synapticWeb.ts      # Rede sináptica / memória associativa
│   │   ├── embeddingService.ts     # Embeddings (news)
│   │   ├── taggingService.ts       # Auto-tagging
│   │   └── scoringService.ts       # Scoring de relevância
│   ├── queues/                     # BullMQ job queues
│   ├── workers/                    # Background workers (news, autonomous loop)
│   ├── middleware/                  # Auth middleware
│   └── types/                      # Tipos partilhados

supabase/
└── migrations/                     # DDL da base de dados principal
```

---

## 5. Regras Operacionais

1. **Mede antes de assumir:** Lê o código existente antes de criar ficheiros. Usa os hooks, stores e services que já existem — não dupliques lógica.
2. **Clarifica antes de executar:** Se a instrução for ambígua ou violar um Pilar, pára e pergunta. Não inventes.
3. **TypeScript estrito:** Zod para validação de payloads. Nenhuma variável pode ser `any`. Ficheiros com menos de 200 linhas.
4. **Erros silenciosos:** Se uma API falhar, o avatar reage visualmente (cor vermelha suave) e regista no console. Sem modais de erro.
5. **Respeita a hierarquia de componentes:** UI ambient → `components/ambient/`. Primitivos visuais → `components/ui/`. Lógica de domínio → `components/modules/{domínio}/`. Estrutura da app → `components/core/`.
6. **Novos services chamam o Supabase?** → Coloca em `src/services/`. **Chamam o Cortex local?** → Usa `cortexBridgeService.ts` como ponte e implementa a lógica em `server/src/services/cortex/`.
7. **Background jobs:** Usa BullMQ (`server/src/queues/` + `server/src/workers/`). Não inventes schedulers alternativos.

---

> Se parece software de 2024, apaga e refaz. Queremos a vanguarda de 2026.
