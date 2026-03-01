# Pré-Vanguarda — CONCLUÍDO ✅

> **Estado:** Todos os 6 problemas foram resolvidos. O código está pronto para avançar para `masterplan/vanguarda.md`.
> Data de conclusão: 2026-02-22.

---

## ~~PROBLEMA 1 — Violação do Pilar IV: copilotService ignora o Handshake~~ ✅ RESOLVIDO

**Correção aplicada:** O `copilotService` foi convertido para modo read-only com defesa em 3 camadas:
1. `TOOLS_READ_ONLY` — o modelo só recebe tools de leitura (`get_*`, `analyze_hash`)
2. `isWriteTier()` guard — bloqueia create/destructive no loop de tool calls mesmo que o modelo tente
3. `executeConfirmed()` guard — bloqueia escrita na confirmação como defesa adicional

System prompt atualizado para instruir o modelo a redirecionar operações de escrita para o fluxo Cortex + Handshake.

**Ficheiro:** `src/services/copilotService.ts`

**Nota pendente:** O `copilotService` ainda não recebe o `contextMarkdown` do Cortex quando em `semantic_deep_dive`. Esta integração será feita na Vanguarda Phase 2 (item 2 — OpenAI Parser).

---

## ~~PROBLEMA 2 — ProactiveAction só funciona no FinanceiroPage~~ ✅ RESOLVIDO

**Correção aplicada:** As 3 páginas restantes agora integram o padrão completo:
- **TodoPage** — `CORTEX_TODO_REFLEX_EVENT` + `announceModuleReady('TodoModule')` + `consumeStagedModuleReflexes('TodoModule')` + `<ProactiveAction />`
- **LinksPage** — `CORTEX_LINKS_REFLEX_EVENT` + `announceModuleReady('LinksModule')` + `consumeStagedModuleReflexes('LinksModule')` + `<ProactiveAction />`
- **CryptoPage** — `CORTEX_CRYPTO_REFLEX_EVENT` + `announceModuleReady('CryptoModule')` + `consumeStagedModuleReflexes('CryptoModule')` + `<ProactiveAction />`

Nota: Crypto/Links abrem modal manual quando falta dado crítico (símbolo ou URL) em vez de gravar automaticamente.

**Ficheiros:** `src/pages/TodoPage.tsx`, `src/pages/CryptoPage.tsx`, `src/pages/LinksPage.tsx`

---

## ~~PROBLEMA 3 — TTS duplicado~~ ✅ RESOLVIDO

**Correção aplicada:**
- `src/services/ttsService.ts` foi apagado (ficheiro já não existe)
- `useSymbioteAudio.ts` agora tem cache LRU (`Map` com `TTS_CACHE_LIMIT`, eviction por ordem de acesso)
- Pipeline unificado: um único serviço TTS com cache + Web Audio API AnalyserNode para o avatar reagir

**Ficheiro:** `src/hooks/useSymbioteAudio.ts`

---

## ~~PROBLEMA 4 — CognitiveSpotlightProvider é um stub~~ ✅ RESOLVIDO

**Correção aplicada:** Implementação completa com:
- `focusedElementId` integrado com `symbioteStore` (state + `setFocusedElementId` + `clearFocusedElementId`)
- `resolveTargetElement()` — localiza elementos via `data-spotlight-id` ou `getElementById`
- `buildSpotlightRect()` — retângulo com padding adaptativo
- Tracking contínuo via `requestAnimationFrame` — spotlight segue o elemento
- Overlay visual com `boxShadow: 0 0 0 9999px rgba(...)` para dim envolvente + glow border
- Hover fallback mantido quando não há `focusedElementId` programático

**Ficheiros:** `src/components/ambient/CognitiveSpotlightProvider.tsx`, `src/stores/symbioteStore.ts`

---

## ~~PROBLEMA 5 — PrefrontalDispatcher só detecta Finance~~ ✅ RESOLVIDO

**Correção aplicada:** O dispatcher agora avalia 4 módulos em paralelo com `chooseBestModule()`:
- **Finance** — 14 keywords, 12 merchant patterns, extractAmount, extractMerchant, OCR boost (42/30/20 weights)
- **Todo** — 8 keywords + 12 action verbs + 8 temporal keywords + filler filtering + extractTodoTitle + actionable text validation (46/24/20/10 weights)
- **Crypto** — 11 keywords + 9 action keywords + 13 ticker symbols + name→symbol mapping + amount/price/quoteCurrency extraction + inferCryptoAction (34/26/20/12/8 weights)
- **Links** — 8 keywords + URL regex + title extraction + normalizeLinkUrlCandidate (34/18/38/10 weights)

O `evaluate()` corre os 4 evaluators, seleciona por confiança com tie-break em `strictParametersMet`, e aplica threshold para `tactical_reflex` vs `semantic_deep_dive`.

**Ficheiros:** `server/src/services/cortex/prefrontalDispatcher.ts`, `server/src/services/cortex/types.ts`

---

## ~~PROBLEMA 6 — Variável de ambiente AGENT_TOKEN desatualizada~~ ✅ RESOLVIDO

**Correção aplicada:** `.env.example` atualizado com placeholder `<generate-a-secure-random-token>` e instrução `# Generate with: openssl rand -hex 32`.

**Ficheiro:** `server/.env.example`

---

## Critérios de "Pronto para Vanguarda"

- [x] Nenhuma operação de escrita (create/update/delete) acontece sem Handshake visual
- [x] O `PrefrontalDispatcher` detecta intenções de Finance, Todo, Crypto e Links
- [x] As 4 páginas de módulo (Financeiro, Todo, Crypto, Links) escutam eventos cortex e renderizam `ProactiveAction`
- [x] O TTS está num único pipeline sem duplicação
- [x] O `CognitiveSpotlightProvider` suporta spotlight num elemento específico
- [x] O `AGENT_TOKEN` no `.env.example` usa placeholder seguro com instrução de geração

**RESULTADO: Pronto para Vanguarda.** Avança para `masterplan/vanguarda.md`.
