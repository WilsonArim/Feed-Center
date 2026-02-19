import { useTopStories } from '@/hooks/useNews'
import { timeAgo } from '@/services/newsService'
import { Newspaper } from 'lucide-react'
import { NavLink } from 'react-router'

const TOPIC_COLORS: Record<string, string> = {
    AI: '#3b82f6', Crypto: '#f59e0b', Geopolitics: '#ef4444',
    Macro: '#8b5cf6', Regulation: '#06b6d4', Tech: '#10b981',
}

export function NewsWidget() {
    const { data: items = [], isLoading } = useTopStories(3)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-3 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 bg-white/5 rounded-lg" />
                ))}
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/20 text-xs text-center">
                <Newspaper size={24} className="mb-2 opacity-50" />
                Sem notícias ainda
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <div className="space-y-2 flex-1">
                {items.map(item => {
                    const color = TOPIC_COLORS[item.topic_primary] || '#64748b'
                    return (
                        <a
                            key={item.id}
                            href={item.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded-lg hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                    style={{ background: `${color}20`, color }}>
                                    {item.topic_primary}
                                </span>
                                <span className="text-[10px] text-white/30">{timeAgo(item.published_at)}</span>
                            </div>
                            <p className="text-xs font-medium text-white/80 line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                                {item.title}
                            </p>
                        </a>
                    )
                })}
            </div>
            <NavLink
                to="/news"
                className="text-[10px] text-center text-[var(--color-accent)] hover:underline mt-2 block"
            >
                Ver todas →
            </NavLink>
        </div>
    )
}
