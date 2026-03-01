# Vanguarda — CONCLUÍDA ✅

> **Estado:** Todas as 4 fases foram implementadas com sucesso. Data de conclusão: 2026-02-23.
> Referências: `AGENTS.md` (stack, pilares, mapa), `masterplan/tese.md` (filosofia), `masterplan/prevanguarda.md` (pré-requisitos — também concluído).

---

## Phase 1 — O Enclave Neural Local (Cérebro do Buggy) ✅

**Pilar:** III — Enclave Soberano (dados de raciocínio 100% locais)

| Componente | Ficheiro | Estado |
|---|---|---|
| SQLite local (WAL) | `server/src/services/cortex/subconsciousLedger.ts` | Tabelas: `raw_signals`, `ocr_traces`, `handshake_events`, `task_drafts`, `daily_briefings`, `proactive_alerts` |
| LanceDB vetorial | `server/src/services/cortex/synapticWeb.ts` | Store + search com `synaptic_memories` |
| Embeddings locais | `server/src/services/cortex/localEmbedder.ts` | FNV1a hash (192 dims), NFD, bi-gramas, L2 normalize |
| Tipos completos | `server/src/services/cortex/types.ts` | Todos os tipos de draft por módulo |
| **task_drafts schema** | `subconsciousLedger.ts` | Tabela com `id`, `raw_signal_id`, `module`, `status`, `draft_json`, timestamps |
| **Pruning / TTL** | `subconsciousLedger.ts` → `pruneOldRows()` | Limpeza automática (90 dias default), `maybePrune()` com interval trigger |
| **Testes unitários** | `server/src/services/cortex/__tests__/` | `subconsciousLedger.test.ts` + `prefrontalDispatcher.test.ts` |

> **REGRA:** Dados oficiais (finanças confirmadas, tarefas aprovadas) vivem no **Supabase**. SQLite local = memória de trabalho do Buggy.

---

## Phase 2 — O Filtro do Caos (Parsing Empático) ✅

**Pilar:** II — Empatia Computacional

| Componente | Ficheiro | Estado |
|---|---|---|
| Router principal | `server/src/services/cortex/cortexRouter.ts` | `routeSignal()` → normaliza → PrefrontalDispatcher → tactical_reflex ou semantic_deep_dive |
| PrefrontalDispatcher | `server/src/services/cortex/prefrontalDispatcher.ts` | **4 módulos** com `chooseBestModule()` |
| ClarityFilter | `server/src/services/cortex/clarityFilter.ts` | Context markdown para OpenAI |
| REST endpoints | `server/src/routes/cortexRoutes.ts` | `/cortex/route`, `/cortex/handshake`, `/cortex/briefing/today`, `/cortex/alerts/pending` |
| Zod schemas | `server/src/types/cortex.ts` | Payloads validados |
| **OpenAI Parser** | `server/src/services/cortex/openaiParser.ts` | gpt-4o-mini, system prompt estrito, JSON extraction + Zod validation, `missingFields` support |
| **ambient_clarification** | `cortexRouter.ts` | `nextAction: 'ambient_clarification'` + `missingFields` + `clarificationPrompt` quando confidence < threshold |
| **Testes caóticos PT-PT** | `__tests__/prefrontalDispatcher.test.ts` | Gíria, erros de escrita, sotaque transcrito, mixed confidence |

### Fluxo de decisão (completo)

```
Sinal bruto → CortexRouter.routeSignal()
  ├── PrefrontalDispatcher.evaluate()
  │   ├── evaluateFinance()  → keyword(42%) + amount(30%) + merchant(20%) + OCR boost
  │   ├── evaluateTodo()     → keyword(46%) + action(24%) + temporal(20%) + text(10%)
  │   ├── evaluateCrypto()   → keyword(34%) + symbol(26%) + action(20%) + amount(12%) + price(8%)
  │   ├── evaluateLinks()    → keyword(34%) + intent(18%) + URL(38%) + title(10%)
  │   └── chooseBestModule() → tie-break por strictParametersMet
  │
  ├── confidence >= threshold && strict → "tactical_reflex" → ModuleDraft direto
  ├── confidence < threshold + missing fields → "ambient_clarification" → TTS pede detalhe
  └── caso contrário → "semantic_deep_dive" → OpenAI Parser + contextMarkdown
```

---

## Phase 3 — Agência Autónoma (Background Workers) ✅

**Pilar:** IV — Agência Silenciosa / Turno da Madrugada

| Componente | Ficheiro | Estado |
|---|---|---|
| BullMQ infra (news) | `server/src/queues/newsQueue.ts` + `server/src/workers/newsWorker.ts` | Operacional |
| TodayPage ritual | `src/pages/TodayPage.tsx` | Money in/out, action queue, recurring automation, history com undo |
| Recurring automation | `useAutomateRecurringEntry`, `useUndoRecurringAutomation`, `useRecurringCandidates` | Hooks completos |
| **Morning Briefing Worker** | `server/src/workers/morningBriefingWorker.ts` + `server/src/queues/briefingQueue.ts` | BullMQ cron (`BRIEFING_CRON=0 4 * * *`), tarefas em atraso + handshakes pendentes + resumo financeiro |
| **Briefing endpoint** | `server/src/routes/cortexRoutes.ts` → `GET /cortex/briefing/today` | Cache com expiry end-of-day, on-demand fallback, `force_refresh` param |
| **useMorningBriefing** | `src/hooks/useMorningBriefing.ts` | Auto-TTS ao montar TodayPage, session storage dedup por data, integração symbioteStore |
| **Proactive Alerts Worker** | `server/src/workers/proactiveAlertsWorker.ts` + `server/src/queues/proactiveAlertsQueue.ts` | BullMQ cron (`PROACTIVE_ALERTS_CRON=*/30 * * * *`), budget >90%, deadline 24h |
| **Alerts endpoint** | `server/src/routes/cortexRoutes.ts` → `GET /cortex/alerts/pending` | Dedup por key, limit 1-100 |
| **useProactiveAlerts** | `src/hooks/useProactiveAlerts.ts` | 1-min staleTime, 5-min refetch, alert→reflex conversion, staging via cortexBridgeService |

---

## Phase 4 — O Handshake SYNTHComm (1-Clique Executivo) ✅

**Pilar:** IV — SYNTHComm

| Componente | Ficheiro | Estado |
|---|---|---|
| ProactiveAction | `src/components/ambient/ProactiveAction.tsx` | Morph raw→structured, breath animation, `missingFields` UI (amber warning + disabled approve) |
| CognitiveSpotlightProvider | `src/components/ambient/CognitiveSpotlightProvider.tsx` | `focusedElementId` + rAF tracking + dim overlay + hover fallback |
| AudioKineticAvatar | `src/components/ambient/AudioKineticAvatar.tsx` | Avatar áudio-reativo |
| HolographicSymbiote | `src/components/core/HolographicSymbiote.tsx` | `PendingClarificationState`, TTS ask + STT capture + re-parse |
| cortexBridgeService | `src/services/cortexBridgeService.ts` | 4 módulos, staging, emit, announce, waitForReady, `missingFields` + `clarificationPrompt` |
| TTS unificado | `src/hooks/useSymbioteAudio.ts` | Pipeline único com cache LRU + AnalyserNode |
| STT | `src/services/speechService.ts` | Whisper API, codec detection, PT language hint |
| Handshake endpoint | `server/src/routes/cortexRoutes.ts` → `POST /cortex/handshake` | Regista aprovação/rejeição + indexa SynapticWeb |

### Fluxo completo end-to-end (4 módulos)

```
1. Sinal → cortexBridgeService.routeSignal()
2. Se tactical_reflex → buildModuleReflex() → stageModuleReflex()
3. Se ambient_clarification → HolographicSymbiote TTS pergunta + STT captura → re-parse
4. Frontend page mounts → announceModuleReady() → flushStagedModuleReflexes()
5. Evento CustomEvent → page mostra ProactiveAction (raw state, a pulsar)
   - Se missingFields.length > 0 → approve disabled, campos em falta visíveis
   - Se missingFields.length === 0 → approve enabled
6. Utilizador clica "Approve" → ProactiveAction morph para "Executed"
7. Callback persiste no Supabase via service do módulo
8. cortexRouter.recordHandshake() → SubconsciousLedger + SynapticWeb indexing
```

### Páginas com integração completa

| Página | Evento | Módulo | missingFields | clarificationPrompt |
|---|---|---|---|---|
| `FinanceiroPage.tsx` | `CORTEX_FINANCE_REFLEX_EVENT` | FinanceModule | ✅ | ✅ |
| `TodoPage.tsx` | `CORTEX_TODO_REFLEX_EVENT` | TodoModule | ✅ | ✅ |
| `CryptoPage.tsx` | `CORTEX_CRYPTO_REFLEX_EVENT` | CryptoModule | ✅ | ✅ |
| `LinksPage.tsx` | `CORTEX_LINKS_REFLEX_EVENT` | LinksModule | ✅ | ✅ |

### Feedback loop

- `applyFeedbackBias()` no `cortexRouter.ts` consulta SynapticWeb para merchant patterns recorrentes
- Confidence boost: `min(0.16, matches × 0.03)` por aprovação histórica
- `indexApprovedHandshake()` guarda: `recurring_merchant`, `completed_task`, `ocr_context`, `past_context`

---

## Resultado Final

| Fase | Estado |
|---|---|
| Phase 1 — Enclave Neural Local | ✅ Completa |
| Phase 2 — Filtro do Caos | ✅ Completa |
| Phase 3 — Agência Autónoma | ✅ Completa |
| Phase 4 — Handshake SYNTHComm | ✅ Completa |

**A Vanguarda está concluída. O Cortex do Buggy opera com os 4 pilares da tese implementados.**
