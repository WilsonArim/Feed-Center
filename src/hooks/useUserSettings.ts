import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/core/AuthProvider'
import { userSettingsService, type HomePageOption } from '@/services/userSettingsService'

const HOME_PAGE_KEY = ['user_home_page'] as const
const COPILOT_NAME_KEY = ['user_copilot_name'] as const
const COPILOT_AVATAR_KEY = ['user_copilot_avatar'] as const
const SHOW_MERCHANT_INSIGHTS_KEY = ['user_show_merchant_insights'] as const

export function useHomePagePreference() {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...HOME_PAGE_KEY, user?.id],
        queryFn: () => userSettingsService.getHomePage(user!.id),
        enabled: !!user,
    })
}

export function useSetHomePagePreference() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (homePage: HomePageOption) => userSettingsService.setHomePage(user!.id, homePage),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: HOME_PAGE_KEY }),
    })
}

export function useCopilotName() {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...COPILOT_NAME_KEY, user?.id],
        queryFn: () => userSettingsService.getCopilotName(user!.id),
        enabled: !!user,
    })
}

export function useSetCopilotName() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (name: string) => userSettingsService.setCopilotName(user!.id, name),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COPILOT_NAME_KEY }),
    })
}

export function useCopilotAvatarUrl() {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...COPILOT_AVATAR_KEY, user?.id],
        queryFn: () => userSettingsService.getCopilotAvatarUrl(user!.id),
        enabled: !!user,
    })
}

export function useSetCopilotAvatarUrl() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (avatarUrl: string) => userSettingsService.setCopilotAvatarUrl(user!.id, avatarUrl),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: COPILOT_AVATAR_KEY }),
    })
}

export function useShowMerchantInsights() {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...SHOW_MERCHANT_INSIGHTS_KEY, user?.id],
        queryFn: () => userSettingsService.getShowMerchantInsights(user!.id),
        enabled: !!user,
    })
}

export function useSetShowMerchantInsights() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (value: boolean) => userSettingsService.setShowMerchantInsights(user!.id, value),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: SHOW_MERCHANT_INSIGHTS_KEY }),
    })
}
