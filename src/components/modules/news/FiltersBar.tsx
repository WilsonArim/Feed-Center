import { Search, SlidersHorizontal } from 'lucide-react'
import type { NewsSortMode } from '@/services/newsService'

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
    return (
        <div className="space-y-4 mb-6">
            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-text-muted)' }} />
                <input
                    type="text"
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Pesquisar notícias..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]/40"
                    style={{
                        background: 'var(--color-bg-glass)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                    }}
                />
            </div>

            {/* Topic chips + sort */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Topic chips — horizontal scroll on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0">
                    <button
                        onClick={() => onTopicChange(null)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer"
                        style={{
                            background: !activeTopic ? 'var(--color-accent)' : 'var(--color-bg-glass)',
                            color: !activeTopic ? '#fff' : 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        Todos
                    </button>
                    {TOPICS.map(t => {
                        const count = topicCounts?.[t]
                        return (
                            <button
                                key={t}
                                onClick={() => onTopicChange(activeTopic === t ? null : t)}
                                className="text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer"
                                style={{
                                    background: activeTopic === t ? 'var(--color-accent)' : 'var(--color-bg-glass)',
                                    color: activeTopic === t ? '#fff' : 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                {t} {count != null && <span className="opacity-50 ml-0.5">({count})</span>}
                            </button>
                        )
                    })}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-1 shrink-0">
                    <SlidersHorizontal size={12} style={{ color: 'var(--color-text-muted)' }} />
                    <select
                        value={sort}
                        onChange={e => onSortChange(e.target.value as NewsSortMode)}
                        className="text-[11px] px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                        style={{
                            background: 'var(--color-bg-glass)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                        }}
                    >
                        <option value="score">Relevância</option>
                        <option value="time">Mais recentes</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
