# MASTERPLAN EXECUTIVO CONSOLIDADO (SOTA 2026)

Este documento é a ÚNICA fonte de verdade, consolidando todos os brainstorms e especificações técnicas.

--------------------------------------------------------------------------------
## FASE 1: Fundação & Arquitetura (O Esqueleto)
**Objetivo:** Configurar o ambiente, autenticação segura e a estrutura de dados antes de aplicar o design visual.

**1. Estrutura de Pastas e Stack:**
*   **Setup:** Vite + React + TypeScript + TailwindCSS.
*   **Arquitetura:** `/src/components/modules` (separadores), `/src/components/core` (navbar/sidebar), `/src/components/ui` (atoms).
*   **Fonte:** *GERAL NAVBAR E MENÚS*

**2. Autenticação e Segurança (Supabase):**
*   **Login:** Email/Pass + OAuth + **Magic Links** (Passwordless).
*   **Rate Limiting:** Implementar proteção básica na Auth.
*   **RLS:** Row Level Security em todas as tabelas (profiles, financial_entries, tasks, links, crypto_wallets).
*   **Fonte:** *MENÚ/PÁGINA DEFINIÇÕES*

**3. Configuração de Tema (Design Tokens):**
*   **CSS Vars:** Definição de cores semânticas (Dark/Light/Auto).
*   **Persistência:** `localStorage` para preview imediato + Sync com `profiles` no Supabase.
*   **Fonte:** *GERAL TEMA E APARÊNCIA*

--------------------------------------------------------------------------------
## FASE 2: O "Shell" Visual (Navegação & Atmosfera)
**Objetivo:** Criar a estrutura de navegação imersiva e aplicar a estética SOTA (Glassmorphism + Organic Physics).

**1. Navbar Flutuante (Floating Island):**
*   "Pílula" central com efeito frosted glass.
*   Micro-interações magnéticas nos ícones.
*   **Fonte:** *GERAL NAVBAR E MENÚS* + *GERAL ESPECIFICAÇÕES VISUAIS*

**2. Sidebar Colapsável:**
*   Menu lateral com transições suaves.
*   Logica de Pin (fixar itens favoritos).
*   **Fonte:** *GERAL NAVBAR E MENÚS*

**3. Shaders e Fundos (Atmosfera):**
*   **Noise Texture Overlay:** Shader de granulação para textura "papel" e redução de banding.
*   **Liquid Shader Button:** Botões com física líquida ao clique.
*   **Kinetic Typography:** Títulos que reagem ao scroll (peso/tracking variável).
*   **Fonte:** *GERAL ESPECIFICAÇÕES VISUAIS*

--------------------------------------------------------------------------------
## FASE 3: O Motor de Experiência (Serafim 3D)
**Objetivo:** Integrar o "Digital Companion" que reage ao cursor e dados.

**1. Integração Spline (Hero Wrapper):**
*   Renderizar cena `serafim/splite/default` em Canvas.
*   Overlay de gradiente para fusão com HTML.
*   **Fonte:** *GERAL ESPECIFICAÇÕES VISUAIS*

**2. Tracking e Comportamento:**
*   **Mouse Tracking:** Cabeça segue o cursor.
*   **Estados Emocionais:**
    *   *Idle:* Respiração suave.
    *   *Observing:* Focado num input ativo.
    *   *Happy:* Sucesso (ex: Task done).
    *   *Worried:* Alerta (ex: Overspend, Crypto dump).
*   **Fonte:** *GERAL ESPECIFICAÇÕES VISUAIS*

**3. Layout Blocks (Home):**
*   **Bento Grid Flutuante:** Cards irregulares que entram com animação staggered e scroll-linked zoom-out do Serafim.
*   **Infinite Marquee Rail:** Scroll horizontal infinito de cartões (Testimonials/Updates) passando em profundidade (Z-axis) pelo Serafim.
*   **Fonte:** *GERAL ESPECIFICAÇÕES VISUAIS*

--------------------------------------------------------------------------------
## FASE 4: Desenvolvimento dos Módulos (Features)
**Objetivo:** Funcionalidades de negócio conectadas ao Serafim e dados.

### 4.1. Separador Controlo Financeiro
*   **OCR Híbrido:** `Tesseract.js` (Client-side/Privacy) ou `Google Vision` (Cloud/Accuracy) para extrair dados de recibos.
*   **Quick-Add Smart:** Command bar (⌘K) com NLP ("Almoço 15€").
*   **Low-Income Features:** Simulação de Micropagamentos e sugestões para evitar juros altos.
*   **Export:** CSV e PDF nativos.
*   **Serafim Trigger:** Gasto alto = Expressão "Worried".
*   **Fonte:** *SEPARADOR CONTROLO FINANCEIRO*

### 4.2. Separador To-Do (Produtividade)
*   **Hierarquia de Níveis:**
    *   *Capture Lists:* Rápido, sem triagem.
    *   *Project Managers:* Organização estruturada.
*   **Inputs Rápidos:** Voice Input (Speech-to-Text) e "Quick Create" (1-2 taps).
*   **Review AI:** Sugestão de "Weekly Review" para limpar/arquivar tarefas velhas.
*   **Integração Financeira:** Converter despesa e.g. "Pagar conta" em Tarefa automaticamente.
*   **UI:** Kanban com Spring Animations.
*   **Fonte:** *SEPARADOR TO-DO*

### 4.3. Separador Gestor de Links
*   **Smart Bookmarks:** Fetch automático de Favicons e Meta-tags.
*   **Health Check:** Deteção automática de Links Mortos (404).
*   **Busca:** Integração `Algolia` ou Full-Text Search local.
*   **Workflow:** "Task from Link" (Ler artigo tarde -> Cria Task).
*   **Acesso:** Offline-first caching e plano para Browser Extension.
*   **Fonte:** *SEPARADOR GESTOR DE LINKS*

### 4.4. Separador Ledger Cripto (SOTA Híbrido)
*   **Arquitetura Híbrida (A "Lei"):**
    1.  **Quantidade (Auto):** Fetch via Helius/Moralis (Read-Only Address).
    2.  **Custo (Manual):** User insere "Preço Médio de Compra".
    3.  **PnL:** Calculado on-the-fly: `(Preço Atual - Custo) * Qty`.
*   **DeFi:** Integração `Dexscreener` para dados de Pools e Liquidez.
*   **Privacidade:** Sem conexão de wallet (apenas monitorização pública).
*   **Fonte:** *SEPARADOR LEDGER CRIPTO*

--------------------------------------------------------------------------------
## FASE 5: Aprimoramento e Definições (Entrega)
**Objetivo:** Polimento, soberania de dados e i18n.

**1. Página de Definições (Settings):**
*   **Conta:** Email, Pass, 2FA.
*   **Preferências Globais:**
    *   *Língua:* i18n (PT-PT, EN-US, etc).
    *   *Moeda Base:* Configuração global ($/€/BTC).
*   **Soberania de Dados:** Botão "Export My Life" (JSON dump) e Delete Account.
*   **Persistência:** Estratégia híbrida (Local Preview + Supabase Sync).

**2. Polimento Visual:**
*   **Spotlight Cursor:** Luz dinâmica que segue o rato.
*   **Acessibilidade:** Teste de contraste "Deep Void" e High-Contrast Mode.

**Fonte:** *MENÚ/PÁGINA DEFINIÇÕES* + *GERAL ESPECIFICAÇÕES VISUAIS*