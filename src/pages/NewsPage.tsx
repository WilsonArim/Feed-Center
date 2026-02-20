import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ChevronLeft, ChevronRight, AlertCircle, BookOpen } from 'lucide-react'
import { useTopStories, useNewsList, useNewsTopics } from '@/hooks/useNews'
import { type NewsSortMode, priorityFromScore, getBookmarks, toggleBookmark, getHiddenSources, hideSource } from '@/services/newsService'
import { TopStoriesCarousel } from '@/components/modules/news/TopStoriesCarousel'
import { NewsCard, NewsCardSkeleton } from '@/components/modules/news/NewsCard'
import { FiltersBar } from '@/components/modules/news/FiltersBar'
import { NewsStatsBar } from '@/components/modules/news/NewsStatsBar'
import { NextActionsStrip, PageHeader, PageSectionHeader, StateCard } from '@/components/core/PagePrimitives'

const PAGE_SIZE = 20

export function NewsPage() {
    const [search, setSearch] = useState('')
    const [activeTopic, setActiveTopic] = useState<string | null>(null)
    const [sort, setSort] = useState<NewsSortMode>('score')
    const [page, setPage] = useState(1)

    const [bookmarks, setBookmarks] = useState(() => getBookmarks())
    const [hiddenSources, setHiddenSources] = useState(() => getHiddenSources())

    const { data: topStories = [], isLoading: topLoading, isError: topError, refetch: retryTop } = useTopStories(5)
    const { data: newsList, isLoading: listLoading, isError: listError, refetch: retryList } = useNewsList({
        topic: activeTopic || undefined,
        page,
        pageSize: PAGE_SIZE,
        sort,
        q: search || undefined,
    })
    const { data: topicCounts, isError: topicsError, refetch: retryTopics } = useNewsTopics()

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
        <div className="pb-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col gap-6"
            >
                {/* Header */}
                <PageHeader
                    icon={<Newspaper size={18} />}
                    title="Radar de Noticias"
                    subtitle="Atualizacoes curadas para contexto, decisao e proximas acoes."
                    meta={`${filteredItems.length} itens visiveis no feed atual`}
                />

                <NewsStatsBar />

                <PageSectionHeader
                    title="Top Stories"
                    subtitle="Leitura rapida das noticias com maior impacto."
                />

                <TopStoriesCarousel
                    items={topStories.filter(s => !hiddenSources.has(s.source_name))}
                    isLoading={topLoading}
                />

                {topError && (
                    <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3">
                        <p className="text-sm font-medium text-[var(--color-danger)]">
                            Falha ao atualizar top stories.
                        </p>
                        <button
                            onClick={() => { void retryTop() }}
                            className="mt-2 text-xs underline text-[var(--color-danger)] hover:opacity-90 cursor-pointer"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                <FiltersBar
                    search={search}
                    onSearchChange={v => { setSearch(v); setPage(1) }}
                    activeTopic={activeTopic}
                    onTopicChange={t => { setActiveTopic(t); setPage(1) }}
                    sort={sort}
                    onSortChange={setSort}
                    topicCounts={topicCounts}
                />

                {topicsError && (
                    <div className="rounded-xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3">
                        <p className="text-sm text-[var(--color-warning)]">
                            Nao foi possivel carregar os topicos.
                        </p>
                        <button
                            onClick={() => { void retryTopics() }}
                            className="mt-2 text-xs underline text-[var(--color-warning)] hover:opacity-90 cursor-pointer"
                        >
                            Recarregar topicos
                        </button>
                    </div>
                )}

                {/* News sections by priority */}
                {listError ? (
                    <StateCard
                        title="Feed temporariamente indisponivel"
                        message="Nao foi possivel carregar noticias agora. Tenta novamente em alguns segundos."
                        icon={<AlertCircle size={18} />}
                        actionLabel="Recarregar feed"
                        onAction={() => { void retryList() }}
                    />
                ) : listLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <StateCard
                        title={search ? 'Sem resultados para esta pesquisa' : 'Sem noticias neste momento'}
                        message={search ? `Nao encontramos noticias para "${search}".` : 'Volta em instantes para novas atualizacoes curadas.'}
                        icon={<BookOpen size={18} />}
                    />
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

                <NextActionsStrip
                    title="Queres tirar mais valor deste feed?"
                    actions={[
                        { label: 'Refinar topico', to: '/news' },
                        { label: 'Guardar fontes em links', to: '/links' },
                        { label: 'Rever prioridades', to: '/todo' },
                    ]}
                />

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
