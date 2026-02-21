import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Bookmark, BookmarkCheck, EyeOff, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { type NewsItem, timeAgo } from '@/services/newsService'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

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
    const { txt } = useLocaleText()
    const [sourcesOpen, setSourcesOpen] = useState(false)
    const topicColor = TOPIC_COLORS[item.topic_primary] || '#64748b'

    return (
        <motion.article
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
            className="group relative rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.03] hover:shadow-[0_4px_30px_rgba(0,0,0,0.3)] border border-transparent hover:border-white/5"
        >
            {/* Top row: topic + score + time */}
            <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full drop-shadow-sm shadow-[0_0_10px_currentColor] opacity-90"
                        style={{ background: `${topicColor}20`, color: topicColor, boxShadow: `0 0 10px ${topicColor}30` }}
                    >
                        {item.topic_primary}
                    </span>
                    {item.tags?.filter(t => t !== item.topic_primary).slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-muted)]">
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-text-muted)] shrink-0">
                    <span className="font-mono font-bold" style={{ color: topicColor }}>{item.score.toFixed(2)}</span>
                    <span className="opacity-50">·</span>
                    <span className="uppercase tracking-wider">{timeAgo(item.published_at)}</span>
                </div>
            </div>

            {/* Title */}
            <h3 className={`font-black tracking-tight leading-snug mb-2 text-white drop-shadow-sm ${compact ? 'text-base' : 'text-lg'}`}>
                {item.title}
            </h3>

            {/* Source */}
            <p className="text-[12px] font-bold tracking-wide uppercase mb-3 text-[var(--color-text-muted)] flex items-center gap-2">
                {item.source_name}
                {(item.source_count || 0) > 1 && (
                    <button
                        onClick={() => setSourcesOpen(!sourcesOpen)}
                        className="inline-flex items-center gap-1 cursor-pointer hover:opacity-100 transition-opacity bg-white/5 px-2 py-0.5 rounded-md"
                        style={{ color: topicColor }}
                    >
                        +{(item.source_count || 1) - 1} {txt('fontes', 'sources')}
                        {sourcesOpen ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
                    </button>
                )}
            </p>

            {/* Sources expansion */}
            {sourcesOpen && item.sources && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 pl-4 border-l-2 space-y-2 py-1"
                    style={{ borderColor: `${topicColor}40` }}
                >
                    {item.sources.map((src, i) => (
                        <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                            className="block text-xs font-medium hover:underline text-[var(--color-text-secondary)] transition-colors hover:text-white">
                            {src.name} <ExternalLink size={10} className="inline ml-1 opacity-50" />
                        </a>
                    ))}
                </motion.div>
            )}

            {/* Summary */}
            {!compact && (
                <p className="text-sm leading-relaxed mb-4 line-clamp-3 text-[var(--color-text-secondary)]">
                    {item.summary}
                </p>
            )}

            {/* Why shown */}
            {item.why && (
                <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-xl text-xs leading-snug bg-white/5 text-[var(--color-text-muted)] border border-white/5">
                    <Info size={14} className="mt-0.5 flex-shrink-0 opacity-80" style={{ color: topicColor }} />
                    <span className="opacity-90">{item.why}</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 mt-2 border-t border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
                <Magnetic strength={0.2}>
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10 text-white cursor-pointer bg-white/5">
                        <ExternalLink size={14} strokeWidth={2.5} /> {txt('Abrir fonte', 'Open source')}
                    </a>
                </Magnetic>
                <Magnetic strength={0.3}>
                    <button
                        onClick={() => onToggleBookmark(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-white/10 cursor-pointer ${isBookmarked ? 'text-amber-400 bg-amber-400/10' : 'text-white bg-white/5'}`}
                    >
                        {isBookmarked ? <BookmarkCheck size={14} strokeWidth={2.5} /> : <Bookmark size={14} strokeWidth={2.5} />}
                        {isBookmarked ? txt('Guardado', 'Saved') : txt('Guardar', 'Save')}
                    </button>
                </Magnetic>
                <Magnetic strength={0.4}>
                    <button
                        onClick={() => onHideSource(item.source_name)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer text-[var(--color-text-muted)] ml-auto"
                    >
                        <EyeOff size={14} strokeWidth={2.5} /> <span className="hidden sm:inline">{txt('Ocultar', 'Hide')}</span>
                    </button>
                </Magnetic>
            </div>
        </motion.article>
    )
}

// ── Skeleton ──
export function NewsCardSkeleton({ compact }: { compact?: boolean }) {
    return (
        <div className="rounded-2xl p-5 animate-pulse bg-white/5 border border-transparent">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-16 rounded-full bg-white/10" />
                <div className="flex-1" />
                <div className="h-4 w-14 rounded-full bg-white/10" />
            </div>
            <div className="h-6 w-3/4 rounded-lg bg-white/10 mb-3" />
            <div className="h-4 w-28 rounded-lg bg-white/10 mb-5" />
            {!compact && (
                <>
                    <div className="h-4 w-full rounded-lg bg-white/10 mb-2" />
                    <div className="h-4 w-2/3 rounded-lg bg-white/10 mb-5" />
                </>
            )}
            <div className="h-10 w-full rounded-xl bg-white/10 mt-4" />
        </div>
    )
}
