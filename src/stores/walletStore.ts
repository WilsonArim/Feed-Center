import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type WalletKind = 'cash' | 'bank' | 'digital' | 'meal_card' | 'crypto' | 'other'

export interface Wallet {
    id: string
    name: string
    kind: WalletKind
    icon: string | null
    color: string | null
    isDefault: boolean
    isArchived: boolean
}

export const WALLET_KIND_META: Record<WalletKind, { labelPt: string; labelEn: string; icon: string }> = {
    cash: { labelPt: 'Dinheiro', labelEn: 'Cash', icon: '💵' },
    bank: { labelPt: 'Banco', labelEn: 'Bank', icon: '🏦' },
    digital: { labelPt: 'Digital', labelEn: 'Digital', icon: '📱' },
    meal_card: { labelPt: 'Cartão Refeição', labelEn: 'Meal Card', icon: '🍽️' },
    crypto: { labelPt: 'Crypto', labelEn: 'Crypto', icon: '₿' },
    other: { labelPt: 'Outro', labelEn: 'Other', icon: '💳' },
}

interface WalletStoreState {
    wallets: Wallet[]
    loaded: boolean

    hydrate: (wallets: Wallet[]) => void
    addWallet: (wallet: Wallet) => void
    updateWallet: (id: string, patch: Partial<Omit<Wallet, 'id'>>) => void
    archiveWallet: (id: string) => void
    setDefault: (id: string) => void
    removeWallet: (id: string) => void
    getDefault: () => Wallet | null
    findByName: (name: string) => Wallet | null
    activeWallets: () => Wallet[]
}

export const useWalletStore = create<WalletStoreState>((set, get) => ({
    wallets: [],
    loaded: false,

    hydrate: (wallets) => set({ wallets, loaded: true }),

    addWallet: (wallet) => {
        set((s) => ({ wallets: [...s.wallets, wallet] }))
    },

    updateWallet: (id, patch) => {
        set((s) => ({
            wallets: s.wallets.map((w) =>
                w.id === id ? { ...w, ...patch } : w
            ),
        }))
    },

    archiveWallet: (id) => {
        set((s) => ({
            wallets: s.wallets.map((w) =>
                w.id === id ? { ...w, isArchived: true, isDefault: false } : w
            ),
        }))
        supabase.from('wallets').update({ is_archived: true, is_default: false }).eq('id', id).then(() => { })
    },

    setDefault: (id) => {
        const userId = get().wallets.find((w) => w.id === id)
        if (!userId) return

        set((s) => ({
            wallets: s.wallets.map((w) => ({
                ...w,
                isDefault: w.id === id,
            })),
        }))

        // DB: unset all defaults, then set this one
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) return
            supabase
                .from('wallets')
                .update({ is_default: false })
                .eq('user_id', data.user.id)
                .then(() => {
                    supabase.from('wallets').update({ is_default: true }).eq('id', id).then(() => { })
                })
        })
    },

    removeWallet: (id) => {
        set((s) => ({ wallets: s.wallets.filter((w) => w.id !== id) }))
        supabase.from('wallets').delete().eq('id', id).then(() => { })
    },

    getDefault: () => get().wallets.find((w) => w.isDefault && !w.isArchived) ?? null,

    findByName: (name) => {
        const lower = name.toLowerCase()
        return get().wallets.find((w) =>
            !w.isArchived && w.name.toLowerCase() === lower
        ) ?? null
    },

    activeWallets: () => get().wallets.filter((w) => !w.isArchived),
}))
