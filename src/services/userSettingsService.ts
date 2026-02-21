import { supabase } from '@/lib/supabase'

export type HomePageOption =
    | '/start'
    | '/today'
    | '/dashboard'
    | '/financeiro'
    | '/todo'
    | '/links'
    | '/news'
    | '/crypto'

export const DEFAULT_HOME_PAGE: HomePageOption = '/start'
export const DEFAULT_COPILOT_NAME = 'Buggy'
export const DEFAULT_COPILOT_AVATAR_URL = '/buggy-mascot.png'

const HOME_PAGE_OPTIONS: HomePageOption[] = [
    '/start',
    '/today',
    '/dashboard',
    '/financeiro',
    '/todo',
    '/links',
    '/news',
    '/crypto',
]

function isHomePageOption(value: string): value is HomePageOption {
    return HOME_PAGE_OPTIONS.includes(value as HomePageOption)
}

function storageKey(userId: string) {
    return `fc-home-page:${userId}`
}

function copilotNameStorageKey(userId: string) {
    return `fc-copilot-name:${userId}`
}

function copilotAvatarStorageKey(userId: string) {
    return `fc-copilot-avatar:${userId}`
}

function merchantInsightsStorageKey(userId: string) {
    return `fc-show-merchant-insights:${userId}`
}

function readHomePageFromStorage(userId: string): HomePageOption | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return null
    return isHomePageOption(raw) ? raw : null
}

function writeHomePageToStorage(userId: string, homePage: HomePageOption) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey(userId), homePage)
}

function normalizeCopilotName(raw: string | null | undefined): string {
    const normalized = (raw ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 32)
    return normalized || DEFAULT_COPILOT_NAME
}

function readCopilotNameFromStorage(userId: string): string | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(copilotNameStorageKey(userId))
    if (!raw) return null
    return normalizeCopilotName(raw)
}

function writeCopilotNameToStorage(userId: string, name: string) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(copilotNameStorageKey(userId), normalizeCopilotName(name))
}

function normalizeCopilotAvatarUrl(raw: string | null | undefined): string {
    const trimmed = (raw ?? '').trim()
    return trimmed || DEFAULT_COPILOT_AVATAR_URL
}

function readCopilotAvatarUrlFromStorage(userId: string): string | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(copilotAvatarStorageKey(userId))
    if (!raw) return null
    return normalizeCopilotAvatarUrl(raw)
}

function writeCopilotAvatarUrlToStorage(userId: string, value: string) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(copilotAvatarStorageKey(userId), normalizeCopilotAvatarUrl(value))
}

function readShowMerchantInsightsFromStorage(userId: string): boolean | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(merchantInsightsStorageKey(userId))
    if (raw === null) return null
    return raw === '1'
}

function writeShowMerchantInsightsToStorage(userId: string, value: boolean) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(merchantInsightsStorageKey(userId), value ? '1' : '0')
}

export const userSettingsService = {
    async getHomePage(userId: string): Promise<HomePageOption> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('home_page')
            .eq('user_id', userId)
            .maybeSingle()

        if (!error && data?.home_page && isHomePageOption(data.home_page)) {
            writeHomePageToStorage(userId, data.home_page)
            return data.home_page
        }

        if (error) {
            console.warn('Failed to fetch home_page from user_settings. Falling back to local preference.', error.message)
        }

        return readHomePageFromStorage(userId) ?? DEFAULT_HOME_PAGE
    },

    async setHomePage(userId: string, homePage: HomePageOption): Promise<HomePageOption> {
        writeHomePageToStorage(userId, homePage)

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: userId,
                    home_page: homePage,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
            )

        if (error) {
            console.warn('Failed to persist home_page in user_settings. Local preference is still applied.', error.message)
        }

        return homePage
    },

    async getCopilotName(userId: string): Promise<string> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('copilot_name')
            .eq('user_id', userId)
            .maybeSingle()

        const dbName = normalizeCopilotName((data as { copilot_name?: string | null } | null)?.copilot_name)

        if (!error && (data as { copilot_name?: string | null } | null)?.copilot_name) {
            writeCopilotNameToStorage(userId, dbName)
            return dbName
        }

        if (error) {
            console.warn('Failed to fetch copilot_name from user_settings. Falling back to local preference.', error.message)
        }

        return readCopilotNameFromStorage(userId) ?? DEFAULT_COPILOT_NAME
    },

    async setCopilotName(userId: string, name: string): Promise<string> {
        const normalized = normalizeCopilotName(name)
        writeCopilotNameToStorage(userId, normalized)

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: userId,
                    copilot_name: normalized,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
            )

        if (error) {
            console.warn('Failed to persist copilot_name in user_settings. Local preference is still applied.', error.message)
        }

        return normalized
    },

    async getCopilotAvatarUrl(userId: string): Promise<string> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('copilot_avatar_url')
            .eq('user_id', userId)
            .maybeSingle()

        const dbValue = normalizeCopilotAvatarUrl((data as { copilot_avatar_url?: string | null } | null)?.copilot_avatar_url)
        if (!error && (data as { copilot_avatar_url?: string | null } | null)?.copilot_avatar_url) {
            writeCopilotAvatarUrlToStorage(userId, dbValue)
            return dbValue
        }

        if (error) {
            console.warn('Failed to fetch copilot_avatar_url from user_settings. Falling back to local preference.', error.message)
        }

        return readCopilotAvatarUrlFromStorage(userId) ?? DEFAULT_COPILOT_AVATAR_URL
    },

    async setCopilotAvatarUrl(userId: string, avatarUrl: string): Promise<string> {
        const normalized = normalizeCopilotAvatarUrl(avatarUrl)
        writeCopilotAvatarUrlToStorage(userId, normalized)

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: userId,
                    copilot_avatar_url: normalized,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
            )

        if (error) {
            console.warn('Failed to persist copilot_avatar_url in user_settings. Local preference is still applied.', error.message)
        }

        return normalized
    },

    async getShowMerchantInsights(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('show_merchant_insights')
            .eq('user_id', userId)
            .maybeSingle()

        if (!error && typeof (data as { show_merchant_insights?: unknown } | null)?.show_merchant_insights === 'boolean') {
            const value = Boolean((data as { show_merchant_insights: boolean }).show_merchant_insights)
            writeShowMerchantInsightsToStorage(userId, value)
            return value
        }

        if (error) {
            console.warn('Failed to fetch show_merchant_insights from user_settings. Falling back to local preference.', error.message)
        }

        return readShowMerchantInsightsFromStorage(userId) ?? false
    },

    async setShowMerchantInsights(userId: string, value: boolean): Promise<boolean> {
        writeShowMerchantInsightsToStorage(userId, value)

        const { error } = await supabase
            .from('user_settings')
            .upsert(
                {
                    user_id: userId,
                    show_merchant_insights: value,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' },
            )

        if (error) {
            console.warn('Failed to persist show_merchant_insights in user_settings. Local preference is still applied.', error.message)
        }

        return value
    },
}
