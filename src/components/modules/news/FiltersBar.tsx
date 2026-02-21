import { Search, SlidersHorizontal } from 'lucide-react'
import type { NewsSortMode } from '@/services/newsService'
import { useLocaleText } from '@/i18n/useLocaleText'

const TOPICS = ['AI', 'Crypto', 'Geopolitics', 'Macro', 'Regulation', 'Tech']

interface Props {
    search: string
    onSearchChange: (v: string) => void
    activeTopic: string | null
    onTopicChange: (t: string | null) => void
    sort: NewsSortMode
    onSortChange: (s: NewsSortMode) => void
    topicCounts?: Record<string, number>
}

export function FiltersBar({ search, onSearchChange, activeTopic, onTopicChange, sort, onSortChange, topicCounts }: Props) {
    const { txt } = useLocaleText()
    return (
        <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]" />
                <input
                    type="text"
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder={txt('Pesquisar noticias...', 'Search news...')}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/40 bg-white/5 hover:bg-white/10 text-white placeholder-[var(--color-text-muted)] border border-transparent hover:border-white/10"
                />
            </div>

            {/* Topic chips + sort */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Topic chips — horizontal scroll on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-1">
                    <button
                        onClick={() => onTopicChange(null)}
                        className={`text-xs font-bold tracking-wide px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer ${!activeTopic
                                ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/15'
                            }`}
                    >
                        {txt('Todos', 'All')}
                    </button>
                    {TOPICS.map(t => {
                        const count = topicCounts?.[t]
                        const isActive = activeTopic === t
                        return (
                            <button
                                key={t}
                                onClick={() => onTopicChange(isActive ? null : t)}
                                className={`text-xs font-bold tracking-wide px-4 py-2 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${isActive
                                        ? 'bg-[var(--accent)] text-white shadow-[0_0_15px_var(--accent)]'
                                        : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/15'
                                    }`}
                            >
                                {t} {count != null && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-[var(--color-text-muted)]'}`}>{count}</span>}
                            </button>
                        )
                    })}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2 shrink-0 bg-white/5 pl-3 pr-1 py-1 rounded-full border border-transparent hover:bg-white/10 hover:border-white/10 transition-colors">
                    <SlidersHorizontal size={14} className="text-[var(--color-text-muted)]" />
                    <select
                        value={sort}
                        onChange={e => onSortChange(e.target.value as NewsSortMode)}
                        className="text-xs font-bold px-2 py-1.5 rounded-full outline-none cursor-pointer bg-transparent text-white appearance-none"
                    >
                        <option value="score" className="bg-[#1a1c23]">{txt('Relevancia', 'Relevance')}</option>
                        <option value="time" className="bg-[#1a1c23]">{txt('Mais recentes', 'Most recent')}</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
