import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/core/AuthProvider'
import * as defi from '@/services/defiLedgerService'
import type {
    DefiPositionType,
    CreatePoolInput,
    CreateStakeInput,
    CreateBorrowLendInput,
} from '@/types'

const QUERY_KEY = 'defi-positions'

export function useDefiPositions(type?: DefiPositionType) {
    const { user } = useAuth()
    const qc = useQueryClient()

    const positions = useQuery({
        queryKey: [QUERY_KEY, type ?? 'all'],
        queryFn: () => defi.getPositions(user!.id, type),
        enabled: !!user,
        staleTime: 30_000,
    })

    const createPool = useMutation({
        mutationFn: (input: CreatePoolInput) => defi.createPoolPosition(user!.id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    })

    const createStake = useMutation({
        mutationFn: (input: CreateStakeInput) => defi.createStakePosition(user!.id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    })

    const createBorrowLend = useMutation({
        mutationFn: (input: CreateBorrowLendInput) => defi.createBorrowLendPosition(user!.id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    })

    const close = useMutation({
        mutationFn: ({ id, closeValueUsd }: { id: string; closeValueUsd: number }) =>
            defi.closePosition(id, closeValueUsd),
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    })

    const remove = useMutation({
        mutationFn: (id: string) => defi.deletePosition(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
    })

    return {
        positions,
        createPool,
        createStake,
        createBorrowLend,
        close,
        remove,
    }
}
