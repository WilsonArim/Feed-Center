import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Bookmark, BookmarkCheck, EyeOff, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { type NewsItem, timeAgo } from '@/services/newsService'

const TOPIC_COLORS: Record<string, string> = {
    AI: '#3b82f6',
    Crypto: '#f59e0b',
    Geopolitics: '#ef4444',
    Macro: '#8b5cf6',
    Regulation: '#06b6d4',
    Tech: '#10b981',
}

interface NewsCardProps {
    item: NewsItem
    index: number
    isBookmarked: boolean
    onToggleBookmark: (id: string) => void
    onHideSource: (name: string) => void
    compact?: boolean
}

export function NewsCard({ item, index, isBookmarked, onToggleBookmark, onHideSource, compact }: NewsCardProps) {
    const [sourcesOpen, setSourcesOpen] = useState(false)
    const topicColor = TOPIC_COLORS[item.topic_primary] || '#64748b'

    return (
        <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            className="group rounded-xl p-4 transition-all duration-200 hover:translate-y-[-2px]"
            style={{
                background: 'var(--color-bg-glass)',
                border: '1px solid var(--color-border)',
            }}
        >
            {/* Top row: topic + score + time */}
            <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${topicColor}20`, color: topicColor }}
                    >
                        {item.topic_primary}
                    </span>
                    {item.tags?.filter(t => t !== item.topic_primary).slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full opacity-50"
                            style={{ background: 'var(--color-bg-tertiary)' }}>
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="font-mono" style={{ color: topicColor }}>{item.score.toFixed(2)}</span>
                    <span>·</span>
                    <span>{timeAgo(item.published_at)}</span>
                </div>
            </div>

            {/* Title */}
            <h3 className={`font-semibold leading-snug mb-1.5 ${compact ? 'text-sm' : 'text-[15px]'}`}
                style={{ color: 'var(--color-text-primary)' }}>
                {item.title}
            </h3>

            {/* Source */}
            <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {item.source_name}
                {(item.source_count || 0) > 1 && (
                    <button
                        onClick={() => setSourcesOpen(!sourcesOpen)}
                        className="ml-1.5 inline-flex items-center gap-0.5 cursor-pointer hover:opacity-80"
                        style={{ color: topicColor }}
                    >
                        +{(item.source_count || 1) - 1} fontes
                        {sourcesOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                )}
            </p>

            {/* Sources expansion */}
            {sourcesOpen && item.sources && (
                <div className="mb-2 pl-3 border-l-2 space-y-1" style={{ borderColor: `${topicColor}40` }}>
                    {item.sources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                            className="block text-[11px] hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
                            {src.name} ↗
                        </a>
                    ))}
                </div>
            )}

            {/* Summary */}
            {!compact && (
                <p className="text-[13px] leading-relaxed mb-2 line-clamp-3"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {item.summary}
                </p>
            )}

            {/* Why shown */}
            {item.why && (
                <div className="flex items-start gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg text-[11px] leading-snug"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                    <Info size={11} className="mt-0.5 flex-shrink-0 opacity-50" />
                    {item.why}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5 cursor-pointer"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    <ExternalLink size={12} /> Abrir fonte
                </a>
                <button
                    onClick={() => onToggleBookmark(item.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-white/5 cursor-pointer"
                    style={{ color: isBookmarked ? '#f59e0b' : 'var(--color-text-muted)' }}
                >
                    {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                    {isBookmarked ? 'Guardado' : 'Guardar'}
                </button>
                <button
                    onClick={() => onHideSource(item.source_name)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-white/5 cursor-pointer opacity-0 group-hover:opacity-60"
                    style={{ color: 'var(--color-text-muted)' }}
                >
                    <EyeOff size={12} /> Ocultar
                </button>
            </div>
        </motion.article>
    )
}

// ── Skeleton ──
export function NewsCardSkeleton({ compact }: { compact?: boolean }) {
    return (
        <div className="rounded-xl p-4 animate-pulse"
            style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-14 rounded-full" style={{ background: 'var(--color-bg-tertiary)' }} />
                <div className="flex-1" />
                <div className="h-3 w-12 rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
            </div>
            <div className="h-5 w-3/4 rounded mb-2" style={{ background: 'var(--color-bg-tertiary)' }} />
            <div className="h-3 w-24 rounded mb-3" style={{ background: 'var(--color-bg-tertiary)' }} />
            {!compact && (
                <>
                    <div className="h-3 w-full rounded mb-1.5" style={{ background: 'var(--color-bg-tertiary)' }} />
                    <div className="h-3 w-2/3 rounded mb-3" style={{ background: 'var(--color-bg-tertiary)' }} />
                </>
            )}
            <div className="h-8 w-full rounded" style={{ background: 'var(--color-bg-tertiary)' }} />
        </div>
    )
}
