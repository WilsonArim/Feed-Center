import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { useAuth } from '@/components/core/AuthProvider'
import { cortexBridgeService } from '@/services/cortexBridgeService'

export function useProactiveAlerts() {
    const { user } = useAuth()
    const location = useLocation()
    const handledAlertIdsRef = useRef<Set<string>>(new Set())

    const alertsQuery = useQuery({
        queryKey: ['cortex-proactive-alerts', user?.id],
        enabled: Boolean(user && cortexBridgeService.isAvailable()),
        staleTime: 1000 * 60,
        refetchInterval: 1000 * 60 * 5,
        queryFn: async () => {
            return cortexBridgeService.consumePendingAlerts(user!.id, {
                refreshFirst: true,
                limit: 32,
            })
        },
    })

    useEffect(() => {
        if (!alertsQuery.data || alertsQuery.data.length === 0) return

        for (const alert of alertsQuery.data) {
            if (handledAlertIdsRef.current.has(alert.id)) continue
            handledAlertIdsRef.current.add(alert.id)

            const reflex = cortexBridgeService.alertToModuleReflex(alert)
            if (cortexBridgeService.isModuleRouteActive(reflex.route, location.pathname)) {
                cortexBridgeService.emitModuleReflex(reflex)
            } else {
                cortexBridgeService.stageModuleReflex(reflex)
            }
        }
    }, [alertsQuery.data, location.pathname])

    return alertsQuery
}
