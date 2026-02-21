import { useTopStories } from '@/hooks/useNews'
import { timeAgo } from '@/services/newsService'
import { Newspaper } from 'lucide-react'
import { NavLink } from 'react-router'
import { useLocaleText } from '@/i18n/useLocaleText'

const TOPIC_COLORS: Record<string, string> = {
    AI: 'var(--color-accent)', Crypto: 'var(--color-warning)', Geopolitics: 'var(--color-danger)',
    Macro: 'var(--color-secondary)', Regulation: '#06b6d4', Tech: 'var(--color-success)',
}

export function NewsWidget() {
    const { txt } = useLocaleText()
    const { data: items = [], isLoading } = useTopStories(3)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-[var(--color-bg-tertiary)] rounded-xl" />
                ))}
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-xs text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-2">
                    <Newspaper size={18} className="opacity-40" />
                </div>
                {txt('Sem noticias ainda', 'No news yet')}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="space-y-1.5 flex-1">
                {items.map(item => {
                    const color = TOPIC_COLORS[item.topic_primary] || 'var(--color-text-muted)'
                    return (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                    style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                                    {item.topic_primary}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(item.published_at)}</span>
                            </div>
                            <p className="text-xs font-medium text-[var(--color-text-secondary)] line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                                {item.title}
                            </p>
                        </a>
                    )
                })}
            </div>
            <NavLink
                to="/news"
                className="text-[11px] text-center text-[var(--color-accent)] hover:underline mt-2 block font-medium"
            >
                {txt('Ver todas', 'View all')}
            </NavLink>
        </div>
    )
}
