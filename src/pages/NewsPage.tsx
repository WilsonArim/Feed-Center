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
import { useLocaleText } from '@/i18n/useLocaleText'

const PAGE_SIZE = 20

export function NewsPage() {
    const { txt } = useLocaleText()
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
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-40">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col gap-6"
            >
                {/* Header */}
                <PageHeader
                    icon={<Newspaper size={18} />}
                    title={txt('Radar de Noticias', 'News Radar')}
                    subtitle={txt('Atualizacoes curadas para contexto, decisao e proximas acoes.', 'Curated updates for context, decisions, and next actions.')}
                    meta={`${filteredItems.length} ${txt('itens visiveis no feed atual', 'visible items in current feed')}`}
                />

                <NewsStatsBar />

                <PageSectionHeader
                    title="Top Stories"
                    subtitle={txt('Leitura rapida das noticias com maior impacto.', 'Quick read of highest-impact news.')}
                />

                <TopStoriesCarousel
                    items={topStories.filter(s => !hiddenSources.has(s.source_name))}
                    isLoading={topLoading}
                />

                {topError && (
                    <div className="rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3">
                        <p className="text-sm font-medium text-[var(--color-danger)]">
                            {txt('Falha ao atualizar top stories.', 'Failed to refresh top stories.')}
                        </p>
                        <button
                            onClick={() => { void retryTop() }}
                            className="mt-2 text-xs underline text-[var(--color-danger)] hover:opacity-90 cursor-pointer"
                        >
                            {txt('Tentar novamente', 'Try again')}
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
                            {txt('Nao foi possivel carregar os topicos.', 'Could not load topics.')}
                        </p>
                        <button
                            onClick={() => { void retryTopics() }}
                            className="mt-2 text-xs underline text-[var(--color-warning)] hover:opacity-90 cursor-pointer"
                        >
                            {txt('Recarregar topicos', 'Reload topics')}
                        </button>
                    </div>
                )}

                {/* News sections by priority */}
                {listError ? (
                    <StateCard
                        title={txt('Feed temporariamente indisponivel', 'Feed temporarily unavailable')}
                        message={txt('Nao foi possivel carregar noticias agora. Tenta novamente em alguns segundos.', 'Could not load news right now. Try again in a few seconds.')}
                        icon={<AlertCircle size={18} />}
                        actionLabel={txt('Recarregar feed', 'Reload feed')}
                        onAction={() => { void retryList() }}
                    />
                ) : listLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <NewsCardSkeleton key={i} />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <StateCard
                        title={search ? txt('Sem resultados para esta pesquisa', 'No results for this search') : txt('Sem noticias neste momento', 'No news right now')}
                        message={search ? txt(`Nao encontramos noticias para "${search}".`, `We could not find news for "${search}".`) : txt('Volta em instantes para novas atualizacoes curadas.', 'Check back shortly for new curated updates.')}
                        icon={<BookOpen size={18} />}
                    />
                ) : (
                    <div className="flex flex-col gap-12 mt-6">
                        {grouped.high.length > 0 && (
                            <PrioritySection
                                label={txt('Alta Prioridade', 'High Priority')}
                                dotColor="text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                                items={grouped.high}
                                bookmarks={bookmarks}
                                onBookmark={handleBookmark}
                                onHide={handleHide}
                            />
                        )}
                        {grouped.medium.length > 0 && (
                            <PrioritySection
                                label={txt('Media', 'Medium')}
                                dotColor="text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                                items={grouped.medium}
                                bookmarks={bookmarks}
                                onBookmark={handleBookmark}
                                onHide={handleHide}
                            />
                        )}
                        {grouped.low.length > 0 && (
                            <PrioritySection
                                label={txt('Baixa', 'Low')}
                                dotColor="text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
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
                    title={txt('Queres tirar mais valor deste feed?', 'Want to get more value from this feed?')}
                    actions={[
                        { label: txt('Refinar topico', 'Refine topic'), to: '/news' },
                        { label: txt('Guardar fontes em links', 'Save sources to links'), to: '/links' },
                        { label: txt('Rever prioridades', 'Review priorities'), to: '/todo' },
                    ]}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-6 mt-12 pt-8 border-t border-white/5">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-20 cursor-pointer hover:bg-white/10 text-white border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                        >
                            <ChevronLeft size={16} strokeWidth={2.5} /> {txt('Anterior', 'Previous')}
                        </button>
                        <span className="text-xl font-black text-white drop-shadow-md tabular-nums tracking-widest">
                            {page} <span className="text-[var(--color-text-muted)] font-normal text-sm">/ {totalPages}</span>
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all disabled:opacity-20 cursor-pointer hover:bg-white/10 text-white border border-white/10 hover:border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                        >
                            {txt('Proximo', 'Next')} <ChevronRight size={16} strokeWidth={2.5} />
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
            <div className="flex items-baseline gap-4 mb-6">
                <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${dotColor}`}>
                    {label}
                </h3>
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {items.length} {items.length === 1 ? 'Item' : 'Items'}
                </span>
            </div>
            <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
