import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTopStories, useNewsList, useNewsTopics } from '@/hooks/useNews'
import { type NewsSortMode, priorityFromScore, getBookmarks, toggleBookmark, getHiddenSources, hideSource } from '@/services/newsService'
import { TopStoriesCarousel } from '@/components/modules/news/TopStoriesCarousel'
import { NewsCard, NewsCardSkeleton } from '@/components/modules/news/NewsCard'
import { FiltersBar } from '@/components/modules/news/FiltersBar'
import { NewsStatsBar } from '@/components/modules/news/NewsStatsBar'

const PAGE_SIZE = 20

export function NewsPage() {
    const [search, setSearch] = useState('')
    const [activeTopic, setActiveTopic] = useState<string | null>(null)
    const [sort, setSort] = useState<NewsSortMode>('score')
    const [page, setPage] = useState(1)

    const [bookmarks, setBookmarks] = useState(() => getBookmarks())
    const [hiddenSources, setHiddenSources] = useState(() => getHiddenSources())

    const { data: topStories = [], isLoading: topLoading } = useTopStories(5)
    const { data: newsList, isLoading: listLoading } = useNewsList({
        topic: activeTopic || undefined,
        page,
        pageSize: PAGE_SIZE,
        sort,
        q: search || undefined,
    })
    const { data: topicCounts } = useNewsTopics()

    const filteredItems = useMemo(() => {
        const items = newsList?.items || []
        return items.filter(item => !hiddenSources.has(item.source_name))
    }, [newsList, hiddenSources])

    const grouped = useMemo(() => {
        const groups = { high: [] as typeof filteredItems, medium: [] as typeof filteredItems, low: [] as typeof filteredItems }
        for (const item of filteredItems) {
            groups[priorityFromScore(item.score)].push(item)
        }
        return groups
    }, [filteredItems])

    const handleBookmark = useCallback((id: string) => {
        setBookmarks(toggleBookmark(id))
    }, [])

    const handleHide = useCallback((name: string) => {
        setHiddenSources(hideSource(name))
    }, [])

    const totalPages = newsList?.totalPages || 1

    return (
        <div className="min-h-screen pt-24 px-4 md:px-6 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col gap-6"
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)]">
                        <Newspaper size={18} className="text-[var(--color-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] font-sans">
                            Noticias
                        </h1>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            Curadoria automatica por Buggy OpenClaw
                        </p>
                    </div>
                </div>

                <NewsStatsBar />

                <TopStoriesCarousel
                    items={topStories.filter(s => !hiddenSources.has(s.source_name))}
                    isLoading={topLoading}
                />

                <FiltersBar
                    search={search}
                    onSearchChange={v => { setSearch(v); setPage(1) }}
                    activeTopic={activeTopic}
                    onTopicChange={t => { setActiveTopic(t); setPage(1) }}
                    sort={sort}
                    onSortChange={setSort}
                    topicCounts={topicCounts}
                />

                {/* News sections by priority */}
                {listLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16">
                        <Newspaper size={40} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-20" />
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {search ? `Sem resultados para "${search}"` : 'Sem noticias de momento. O OpenClaw ira trazer novidades.'}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        {grouped.high.length > 0 && (
                            <PrioritySection
                                label="Alta Prioridade"
                                dotColor="bg-rose-500"
                                items={grouped.high}
                                bookmarks={bookmarks}
                                onBookmark={handleBookmark}
                                onHide={handleHide}
                            />
                        )}
                        {grouped.medium.length > 0 && (
                            <PrioritySection
                                label="Media"
                                dotColor="bg-amber-500"
                                items={grouped.medium}
                                bookmarks={bookmarks}
                                onBookmark={handleBookmark}
                                onHide={handleHide}
                            />
                        )}
                        {grouped.low.length > 0 && (
                            <PrioritySection
                                label="Baixa"
                                dotColor="bg-blue-500"
                                items={grouped.low}
                                bookmarks={bookmarks}
                                onBookmark={handleBookmark}
                                onHide={handleHide}
                                compact
                            />
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4 pt-6 border-t border-[var(--color-border)]">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-20 cursor-pointer hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                        >
                            <ChevronLeft size={14} /> Anterior
                        </button>
                        <span className="text-xs font-mono text-[var(--color-text-muted)]">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-colors disabled:opacity-20 cursor-pointer hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                        >
                            Proximo <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

function PrioritySection({ label, dotColor, items, bookmarks, onBookmark, onHide, compact }: {
    label: string
    dotColor: string
    items: { id: string; source_name: string; score: number }[]
    bookmarks: Set<string>
    onBookmark: (id: string) => void
    onHide: (name: string) => void
    compact?: boolean
}) {
    return (
        <section>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--color-text-primary)]">
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                {label}
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                    {items.length}
                </span>
            </h3>
            <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {items.map((item, i) => (
                    <NewsCard
                        key={item.id}
                        item={item as any}
                        index={i}
                        isBookmarked={bookmarks.has(item.id)}
                        onToggleBookmark={onBookmark}
                        onHideSource={onHide}
                        compact={compact}
                    />
                ))}
            </div>
        </section>
    )
}
