import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────

export type CortexModule = 'FinanceModule' | 'TodoModule' | 'CryptoModule' | 'LinksModule' | 'OpenAIModule'

export interface DraftPayload {
    module: CortexModule
    draft: Record<string, unknown>
    rawSignalId: string
    missingFields: string[]
    walletHint?: string | null
}

export interface PendingClarification {
    prompt: string
    rawSignalId: string
    missingFields: string[]
    module?: CortexModule
}

export type WorkspaceView =
    | { kind: 'idle' }
    | { kind: 'processing' }
    | { kind: 'showing_draft'; payload: DraftPayload }
    | { kind: 'showing_success'; module: CortexModule; supabaseId: string | null; summary: string }
    | { kind: 'showing_error'; message: string }
    | { kind: 'showing_clarification'; prompt: string; rawSignalId: string; missingFields: string[] }
    | { kind: 'showing_reply'; message: string }
    | { kind: 'page' }

export type MobileFocus = 'engine' | 'reality'

// ── Store ─────────────────────────────────────────────────────

interface WorkspaceState {
    view: WorkspaceView
    mobileFocus: MobileFocus
    pendingClarification: PendingClarification | null

    setView: (view: WorkspaceView) => void
    showDraft: (payload: DraftPayload) => void
    showSuccess: (module: CortexModule, supabaseId: string | null, summary: string) => void
    showError: (message: string) => void
    showClarification: (prompt: string, rawSignalId: string, missingFields: string[], module?: CortexModule) => void
    showReply: (message: string) => void
    showPage: () => void
    reset: () => void
    clearClarification: () => void
    flipToReality: () => void
    flipToEngine: () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    view: { kind: 'page' },
    mobileFocus: 'engine',
    pendingClarification: null,

    setView: (view) => set({ view }),

    showDraft: (payload) => set({
        view: { kind: 'showing_draft', payload },
        mobileFocus: 'reality',
        pendingClarification: null,
    }),

    showSuccess: (module, supabaseId, summary) => set({
        view: { kind: 'showing_success', module, supabaseId, summary },
        mobileFocus: 'reality',
        pendingClarification: null,
    }),

    showError: (message) => set({
        view: { kind: 'showing_error', message },
        mobileFocus: 'reality',
        pendingClarification: null,
    }),

    showClarification: (prompt, rawSignalId, missingFields, module) => set({
        view: { kind: 'showing_clarification', prompt, rawSignalId, missingFields },
        mobileFocus: 'reality',
        // Store the pending clarification context so EnginePane can re-route follow-ups
        pendingClarification: { prompt, rawSignalId, missingFields, module },
    }),

    showReply: (message) => set({
        view: { kind: 'showing_reply', message },
        mobileFocus: 'reality',
        pendingClarification: null,
    }),

    showPage: () => set({ view: { kind: 'page' } }),

    reset: () => set({ view: { kind: 'page' }, mobileFocus: 'engine', pendingClarification: null }),

    clearClarification: () => set({ pendingClarification: null }),

    flipToReality: () => set({ mobileFocus: 'reality' }),
    flipToEngine: () => set({ mobileFocus: 'engine' }),
}))
