import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/core/AuthProvider'
import { cortexBridgeService, type CortexDailyBriefing } from '@/services/cortexBridgeService'
import { ttsService } from '@/services/ttsService'
import { useSymbioteStore } from '@/stores/symbioteStore'

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10)
}

function buildBriefingSpeech(briefing: CortexDailyBriefing): string {
    const top = briefing.topPriorities[0]
    const firstPriority = top
        ? `${top.title}. ${top.description}`
        : 'Sem prioridades críticas de momento.'

    return [
        `Bom dia. Briefing de ${briefing.briefingDate}.`,
        `Tarefas em atraso: ${briefing.overdueTasks}.`,
        `Handshakes pendentes: ${briefing.pendingHandshakes}.`,
        `Ontem: entrou ${briefing.yesterday.income.toFixed(2)} euros e saiu ${briefing.yesterday.expenses.toFixed(2)} euros.`,
        `Prioridade principal: ${firstPriority}`,
    ].join(' ')
}

export function useMorningBriefing() {
    const { user } = useAuth()
    const isSymbioteOpen = useSymbioteStore((state) => state.isOpen)

    const briefingQuery = useQuery({
        queryKey: ['cortex-morning-briefing', user?.id, todayIsoDate()],
        enabled: Boolean(user && cortexBridgeService.isAvailable()),
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            return cortexBridgeService.getTodayBriefing(user!.id)
        },
    })

    const briefingSpeech = useMemo(() => {
        if (!briefingQuery.data) return null
        return buildBriefingSpeech(briefingQuery.data)
    }, [briefingQuery.data])

    useEffect(() => {
        if (!user || !briefingQuery.data || !briefingSpeech) return
        if (!isSymbioteOpen) return
        if (typeof window === 'undefined') return

        const spokenKey = `fc:briefing:spoken:${user.id}:${briefingQuery.data.briefingDate}`
        if (window.sessionStorage.getItem(spokenKey) === '1') return

        const spoken = ttsService.speak(briefingSpeech, { source: 'morning-briefing' })
        if (!spoken) return
        window.sessionStorage.setItem(spokenKey, '1')
    }, [briefingQuery.data, briefingSpeech, isSymbioteOpen, user])

    return briefingQuery
}
