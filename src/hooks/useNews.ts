import { useQuery } from '@tanstack/react-query'
import { fetchTopStories, fetchNewsList, fetchTopics, type NewsSortMode } from '@/services/newsService'

export function useTopStories(limit = 5) {
    return useQuery({
        queryKey: ['news', 'top', limit],
        queryFn: () => fetchTopStories(limit),
        staleTime: 60_000,
        refetchInterval: 5 * 60_000,
    })
}

export function useNewsList(params: {
    topic?: string
    page?: number
    pageSize?: number
    sort?: NewsSortMode
    q?: string
}) {
    return useQuery({
        queryKey: ['news', 'list', params],
        queryFn: () => fetchNewsList(params),
        staleTime: 30_000,
    })
}

export function useNewsTopics() {
    return useQuery({
        queryKey: ['news', 'topics'],
        queryFn: fetchTopics,
        staleTime: 5 * 60_000,
    })
}
