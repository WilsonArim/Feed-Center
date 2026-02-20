/**
 * News Service — consumes Feed-Center backend REST endpoints
 */

const rawApiBase = import.meta.env.VITE_NEWS_API_BASE?.trim()
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, '') : null
let missingApiBaseWarned = false

function warnMissingApiBase() {
    if (missingApiBaseWarned) return
    missingApiBaseWarned = true
    console.warn(
        'News API base is not configured. Set VITE_NEWS_API_BASE to enable News endpoints in production.',
    )
}

// ── Types ──
export interface NewsItem {
    id: string
    title: string
    summary: string
    source_name: string
    source_url: string
    published_at: string
    topic_primary: string
    tags: string[]
    score: number
    why?: string
    source_count?: number
    sources?: { name: string; url: string }[]
}

export interface NewsListResponse {
    items: NewsItem[]
    page: number
    pageSize: number
    totalPages: number
    topic: string
    count: number
}

export type NewsSortMode = 'score' | 'time'
export type NewsPriority = 'high' | 'medium' | 'low'

// ── API calls ──

export async function fetchTopStories(limit = 5): Promise<NewsItem[]> {
    if (!API_BASE) {
        warnMissingApiBase()
        return []
    }

    const res = await fetch(`${API_BASE}/news/top?limit=${limit}`)
    if (!res.ok) throw new Error('Failed to fetch top stories')
    const data = await res.json()
    return data.items || []
}

export async function fetchNewsList(params: {
    topic?: string
    page?: number
    pageSize?: number
    sort?: NewsSortMode
    q?: string
}): Promise<NewsListResponse> {
    if (!API_BASE) {
        warnMissingApiBase()
        return {
            items: [],
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            totalPages: 1,
            topic: params.topic || 'all',
            count: 0,
        }
    }

    const sp = new URLSearchParams()
    if (params.topic) sp.set('topic', params.topic)
    if (params.page) sp.set('page', String(params.page))
    if (params.pageSize) sp.set('pageSize', String(params.pageSize))
    if (params.sort) sp.set('sort', params.sort)
    if (params.q) sp.set('q', params.q)

    const res = await fetch(`${API_BASE}/news/top?${sp.toString()}`)
    if (!res.ok) throw new Error('Failed to fetch news list')
    const data = await res.json()

    // Adapt response to our expected format
    return {
        items: data.items || [],
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        totalPages: Math.ceil((data.count || 0) / (params.pageSize || 20)),
        topic: data.topic || 'all',
        count: data.count || 0,
    }
}

export async function fetchTopics(): Promise<Record<string, number>> {
    if (!API_BASE) {
        warnMissingApiBase()
        return {}
    }

    const res = await fetch(`${API_BASE}/news/topics`)
    if (!res.ok) return {}
    const data = await res.json()
    return data.topics || {}
}

// ── Local storage helpers ──

const BOOKMARKS_KEY = 'fc-news-bookmarks'
const HIDDEN_KEY = 'fc-news-hidden-sources'

export function getBookmarks(): Set<string> {
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY)
        return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
}

export function toggleBookmark(id: string): Set<string> {
    const bm = getBookmarks()
    if (bm.has(id)) bm.delete(id)
    else bm.add(id)
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bm]))
    return bm
}

export function getHiddenSources(): Set<string> {
    try {
        const raw = localStorage.getItem(HIDDEN_KEY)
        return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
}

export function hideSource(name: string): Set<string> {
    const hs = getHiddenSources()
    hs.add(name)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hs]))
    return hs
}

export function unhideSource(name: string): Set<string> {
    const hs = getHiddenSources()
    hs.delete(name)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hs]))
    return hs
}

// ── Priority buckets ──
export function priorityFromScore(score: number): NewsPriority {
    if (score >= 0.7) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
}

// ── Time ago ──
export function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
}
