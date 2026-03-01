import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/core/AuthProvider'
import { useWalletStore, type Wallet, type WalletKind } from '@/stores/walletStore'
import { useEffect } from 'react'

const WALLETS_KEY = ['wallets']

interface WalletRow {
    id: string
    user_id: string
    name: string
    kind: WalletKind
    icon: string | null
    color: string | null
    is_default: boolean
    is_archived: boolean
    created_at: string
    updated_at: string
}

function rowToWallet(row: WalletRow): Wallet {
    return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        icon: row.icon,
        color: row.color,
        isDefault: row.is_default,
        isArchived: row.is_archived,
    }
}

export function useWallets() {
    const { user } = useAuth()
    const hydrate = useWalletStore((s) => s.hydrate)

    const query = useQuery({
        queryKey: WALLETS_KEY,
        queryFn: async () => {
            if (!user) return []
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (error) throw error
            return (data as WalletRow[]).map(rowToWallet)
        },
        enabled: !!user,
        staleTime: 60_000,
    })

    // Hydrate Zustand on fetch
    useEffect(() => {
        if (query.data) hydrate(query.data)
    }, [query.data, hydrate])

    return query
}

export function useCreateWallet() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const addWallet = useWalletStore((s) => s.addWallet)

    return useMutation({
        mutationFn: async (input: { name: string; kind: WalletKind; icon?: string; color?: string; isDefault?: boolean }) => {
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('wallets')
                .insert({
                    user_id: user.id,
                    name: input.name,
                    kind: input.kind,
                    icon: input.icon ?? null,
                    color: input.color ?? null,
                    is_default: input.isDefault ?? false,
                })
                .select()
                .single()

            if (error) throw error
            return rowToWallet(data as WalletRow)
        },
        onSuccess: (wallet) => {
            addWallet(wallet)
            queryClient.invalidateQueries({ queryKey: WALLETS_KEY })
        },
    })
}

export function useUpdateWallet() {
    const queryClient = useQueryClient()
    const updateWallet = useWalletStore((s) => s.updateWallet)

    return useMutation({
        mutationFn: async (input: { id: string; name?: string; kind?: WalletKind; icon?: string; color?: string }) => {
            const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (input.name !== undefined) update.name = input.name
            if (input.kind !== undefined) update.kind = input.kind
            if (input.icon !== undefined) update.icon = input.icon
            if (input.color !== undefined) update.color = input.color

            const { error } = await supabase.from('wallets').update(update).eq('id', input.id)
            if (error) throw error
        },
        onSuccess: (_, input) => {
            updateWallet(input.id, input)
            queryClient.invalidateQueries({ queryKey: WALLETS_KEY })
        },
    })
}

export function useDeleteWallet() {
    const queryClient = useQueryClient()
    const removeWallet = useWalletStore((s) => s.removeWallet)

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('wallets').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: (_, id) => {
            removeWallet(id)
            queryClient.invalidateQueries({ queryKey: WALLETS_KEY })
        },
    })
}
