import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialService, type GetEntriesOptions } from '@/services/financialService'
import type { CreateEntryInput, UpdateEntryInput, CreatePocketInput, UpdatePocketInput } from '@/types'
import { useAuth } from '@/components/core/AuthProvider'

function useUserId() {
    const { user } = useAuth()
    if (!user) throw new Error('User not authenticated')
    return user.id
}

export function useEntries(month: string, filters?: Omit<GetEntriesOptions, 'month'>) {
    const userId = useUserId()
    const projectId = filters?.projectId
    return useQuery({
        queryKey: ['financial-entries', month, filters, projectId],
        queryFn: () => financialService.getEntries(userId, { month, ...filters }),
    })
}

export function useMonthSummary(month: string, projectId?: string) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-summary', month, projectId],
        queryFn: () => financialService.getMonthSummary(userId, month, projectId),
    })
}

export function useProjectFinancials(projectId: string) {
    return useQuery({
        queryKey: ['project-financials', projectId],
        queryFn: () => financialService.getProjectSummary(projectId),
        enabled: !!projectId
    })
}

export function useCategoryBreakdown(month: string) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-categories', month],
        queryFn: () => financialService.getCategoryBreakdown(userId, month),
    })
}

export function useMerchantInsights(month: string, enabled: boolean = true) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-merchant-insights', month],
        queryFn: () => financialService.getMerchantInsights(userId, month),
        enabled,
    })
}

export function useItemInflationInsights(month: string, enabled: boolean = true) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-item-inflation', month],
        queryFn: () => financialService.getItemInflationInsights(userId, month),
        enabled,
    })
}

export function useAffordabilityScore(month: string) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-affordability', month],
        queryFn: () => financialService.getAffordabilityScore(userId, month),
        staleTime: 5 * 60 * 1000, // cache 5 min
    })
}

export function useRecurringCandidates(enabled: boolean = true) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-recurring-candidates', userId],
        queryFn: () => financialService.getRecurringCandidates(userId),
        enabled,
        staleTime: 2 * 60 * 1000,
    })
}

export function useAutomationHistory(limit: number = 12, enabled: boolean = true) {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-automation-history', userId, limit],
        queryFn: () => financialService.getAutomationHistory(userId, limit),
        enabled,
        staleTime: 60 * 1000,
    })
}

const INVALIDATION_KEYS = (month: string) => [
    ['financial-entries', month],
    ['financial-summary', month],
    ['financial-categories', month],
    ['financial-merchant-insights', month],
    ['financial-item-inflation', month],
    ['financial-affordability', month],
]

export function useCreateEntry(month: string) {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: CreateEntryInput) => financialService.createEntry(userId, input),
        onSuccess: () => {
            for (const key of INVALIDATION_KEYS(month)) {
                qc.invalidateQueries({ queryKey: key })
            }
        },
    })
}

export function useUpdateEntry(month: string) {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateEntryInput }) =>
            financialService.updateEntry(userId, id, input),
        onSuccess: () => {
            for (const key of INVALIDATION_KEYS(month)) {
                qc.invalidateQueries({ queryKey: key })
            }
        },
    })
}

export function useDeleteEntry(month: string) {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => financialService.deleteEntry(userId, id),
        onSuccess: () => {
            for (const key of INVALIDATION_KEYS(month)) {
                qc.invalidateQueries({ queryKey: key })
            }
        },
    })
}

export function useAutomateRecurringEntry() {
    const userId = useUserId()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (entryId: string) => financialService.automateRecurringEntry(userId, entryId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financial-entries'] })
            qc.invalidateQueries({ queryKey: ['financial-summary'] })
            qc.invalidateQueries({ queryKey: ['financial-affordability'] })
            qc.invalidateQueries({ queryKey: ['financial-recurring-candidates'] })
            qc.invalidateQueries({ queryKey: ['financial-automation-history'] })
        },
    })
}

export function useUndoRecurringAutomation() {
    const userId = useUserId()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (eventId: string) => financialService.undoRecurringAutomation(userId, eventId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financial-entries'] })
            qc.invalidateQueries({ queryKey: ['financial-summary'] })
            qc.invalidateQueries({ queryKey: ['financial-affordability'] })
            qc.invalidateQueries({ queryKey: ['financial-recurring-candidates'] })
            qc.invalidateQueries({ queryKey: ['financial-automation-history'] })
        },
    })
}

/* ── Pockets Hooks ── */

export function usePockets() {
    const userId = useUserId()
    return useQuery({
        queryKey: ['financial-pockets'],
        queryFn: () => financialService.getPockets(userId),
    })
}

export function useCreatePocket() {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (input: CreatePocketInput) => financialService.createPocket(userId, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financial-pockets'] })
        },
    })
}

export function useUpdatePocket() {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdatePocketInput }) =>
            financialService.updatePocket(userId, id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financial-pockets'] })
        },
    })
}

export function useDeletePocket() {
    const userId = useUserId()
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => financialService.deletePocket(userId, id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['financial-pockets'] })
        },
    })
}
