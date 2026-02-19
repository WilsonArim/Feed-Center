import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { linksService, type CreateLinkInput, type UpdateLinkInput } from '@/services/linksService'
import { useAuth } from '@/components/core/AuthProvider'

const LINKS_KEY = ['links'] as const
const TAGS_KEY = ['links', 'tags'] as const

interface UseLinksOptions {
    search?: string
    tag?: string
    pinned?: boolean
}

export function useLinks(options?: UseLinksOptions) {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...LINKS_KEY, user?.id, options],
        queryFn: () => linksService.getLinks(user!.id, options),
        enabled: !!user,
    })
}

export function useTags() {
    const { user } = useAuth()

    return useQuery({
        queryKey: [...TAGS_KEY, user?.id],
        queryFn: () => linksService.getAllTags(user!.id),
        enabled: !!user,
    })
}

export function useCreateLink() {
    const { user } = useAuth()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateLinkInput) => linksService.createLink(user!.id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: LINKS_KEY })
            qc.invalidateQueries({ queryKey: TAGS_KEY })
        },
    })
}

export function useUpdateLink() {
    const { user } = useAuth()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: ({ id, ...input }: UpdateLinkInput & { id: string }) =>
            linksService.updateLink(id, user!.id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: LINKS_KEY })
            qc.invalidateQueries({ queryKey: TAGS_KEY })
        },
    })
}

export function useDeleteLink() {
    const { user } = useAuth()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => linksService.deleteLink(id, user!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: LINKS_KEY })
            qc.invalidateQueries({ queryKey: TAGS_KEY })
        },
    })
}
