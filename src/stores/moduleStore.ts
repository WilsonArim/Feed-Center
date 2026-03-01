import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type ModuleId = 'finance' | 'tasks' | 'crypto' | 'links' | 'news'

export const ALL_MODULES: ModuleId[] = ['finance', 'tasks', 'crypto', 'links', 'news']

export const MODULE_META: Record<ModuleId, { labelPt: string; labelEn: string; descPt: string; descEn: string; icon: string }> = {
    finance: {
        labelPt: 'Financeiro',
        labelEn: 'Finance',
        descPt: 'Regista despesas, receitas e faturas. O Buggy categoriza automaticamente.',
        descEn: 'Track expenses, income and bills. Buggy auto-categorizes.',
        icon: '💰',
    },
    tasks: {
        labelPt: 'Tarefas',
        labelEn: 'Tasks',
        descPt: 'Gestão de to-do lists, inbox e projetos com prioridades.',
        descEn: 'Manage to-do lists, inbox and projects with priorities.',
        icon: '✅',
    },
    crypto: {
        labelPt: 'Crypto',
        labelEn: 'Crypto',
        descPt: 'Portefólio DeFi, tracking de tokens e alertas de preço.',
        descEn: 'DeFi portfolio, token tracking and price alerts.',
        icon: '₿',
    },
    links: {
        labelPt: 'Links',
        labelEn: 'Links',
        descPt: 'Guarda e organiza links interessantes com tags.',
        descEn: 'Save and organize interesting links with tags.',
        icon: '🔗',
    },
    news: {
        labelPt: 'Notícias',
        labelEn: 'News',
        descPt: 'Feed de notícias curado por IA das tuas fontes favoritas.',
        descEn: 'AI-curated news feed from your favorite sources.',
        icon: '📰',
    },
}

interface ModuleStoreState {
    activeModules: ModuleId[]
    onboardingCompleted: boolean
    loaded: boolean

    hydrate: (modules: ModuleId[], onboarded: boolean) => void
    setActiveModules: (modules: ModuleId[]) => void
    toggleModule: (id: ModuleId) => void
    completeOnboarding: () => void
    isActive: (id: ModuleId) => boolean
}

async function persistToSupabase(modules: ModuleId[], onboarded?: boolean) {
    try {
        const { data } = await supabase.auth.getUser()
        if (!data.user) return

        const payload: Record<string, unknown> = {
            user_id: data.user.id,
            active_modules: modules,
        }
        if (onboarded !== undefined) payload.onboarding_completed = onboarded

        // Use upsert so it works whether the row exists or not
        const { error } = await supabase
            .from('user_settings')
            .upsert(payload, { onConflict: 'user_id' })

        if (error) {
            console.error('[moduleStore] Failed to persist to Supabase:', error.message)
        }
    } catch (e) {
        console.error('[moduleStore] persistToSupabase error:', e)
    }
}

export const useModuleStore = create<ModuleStoreState>((set, get) => ({
    activeModules: ALL_MODULES,
    onboardingCompleted: false,
    loaded: false,

    hydrate: (modules, onboarded) => set({
        activeModules: modules,
        onboardingCompleted: onboarded,
        loaded: true,
    }),

    setActiveModules: (modules) => {
        set({ activeModules: modules })
        void persistToSupabase(modules)
    },

    toggleModule: (id) => {
        const current = get().activeModules
        const next = current.includes(id)
            ? current.filter((m) => m !== id)
            : [...current, id]
        if (next.length === 0) return
        set({ activeModules: next })
        void persistToSupabase(next)
    },

    completeOnboarding: () => {
        set({ onboardingCompleted: true })
        void persistToSupabase(get().activeModules, true)
    },

    isActive: (id) => get().activeModules.includes(id),
}))

// ── Auto-hydrate on app load ──────────────────────────────────────

let hydrated = false

export async function hydrateModuleStore() {
    if (hydrated) return
    hydrated = true

    try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) return

        const { data, error } = await supabase
            .from('user_settings')
            .select('active_modules, onboarding_completed')
            .eq('user_id', userData.user.id)
            .maybeSingle()

        if (error) {
            console.warn('[moduleStore] Hydration failed:', error.message)
            return
        }

        if (data) {
            const modules = Array.isArray(data.active_modules)
                ? (data.active_modules as ModuleId[])
                : ALL_MODULES
            const onboarded = data.onboarding_completed === true
            useModuleStore.getState().hydrate(modules, onboarded)
        }
        // If no row exists, keep defaults — first onboarding will create it via upsert
    } catch (e) {
        console.warn('[moduleStore] Hydration error:', e)
    }
}
