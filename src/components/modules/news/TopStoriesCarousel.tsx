import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import type { NewsItem } from '@/services/newsService'
import { timeAgo } from '@/services/newsService'

const TOPIC_COLORS: Record<string, string> = {
    AI: '#3b82f6',
    Crypto: '#f59e0b',
    Geopolitics: '#ef4444',
    Macro: '#8b5cf6',
    Regulation: '#06b6d4',
    Tech: '#10b981',
}

interface Props {
    items: NewsItem[]
    isLoading: boolean
}

export function TopStoriesCarousel({ items, isLoading }: Props) {
    const [current, setCurrent] = useState(0)
    const total = items.length

    const goTo = useCallback((idx: number) => {
        const clamped = Math.max(0, Math.min(idx, total - 1))
        setCurrent(clamped)
    }, [total])

    // Keyboard nav
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goTo(current - 1)
            if (e.key === 'ArrowRight') goTo(current + 1)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [current, goTo])

    // Touch / swipe
    const touchStart = useRef(0)
    const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = e.touches[0]!.clientX }
    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = touchStart.current - e.changedTouches[0]!.clientX
        if (Math.abs(diff) > 50) goTo(current + (diff > 0 ? 1 : -1))
    }

    if (isLoading) {
        return (
            <div className="mb-8">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Flame size={18} style={{ color: '#f59e0b' }} /> Top Stories
                </h2>
                <div className="rounded-2xl p-6 animate-pulse h-44"
                    style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }} />
            </div>
        )
    }

    if (total === 0) return null

    const item = items[current]!
    const topicColor = TOPIC_COLORS[item.topic_primary] || '#64748b'

    return (
        <section className="mb-8" role="region" aria-label="Top Stories" aria-roledescription="carousel">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Flame size={18} style={{ color: '#f59e0b' }} /> Top Stories
            </h2>

            <div className="relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Card */}
                <motion.a
                    key={current}
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className="block rounded-2xl p-5 md:p-6 cursor-pointer group"
                    style={{
                        background: `linear-gradient(135deg, ${topicColor}15, var(--color-bg-glass))`,
                        border: `1px solid ${topicColor}30`,
                    }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: `${topicColor}25`, color: topicColor }}>
                            {item.topic_primary}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: topicColor }}>
                            {item.score.toFixed(2)}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            · {item.source_name} · {timeAgo(item.published_at)}
                        </span>
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold leading-tight mb-2 group-hover:underline underline-offset-2"
                        style={{ color: 'var(--color-text-primary)' }}>
                        {item.title}
                    </h3>

                    <p className="text-sm leading-relaxed line-clamp-2 mb-3"
                        style={{ color: 'var(--color-text-secondary)' }}>
                        {item.summary}
                    </p>

                    {item.why && (
                        <p className="text-[11px] opacity-50" style={{ color: 'var(--color-text-muted)' }}>
                            💡 {item.why}
                        </p>
                    )}
                </motion.a>

                {/* Navigation arrows */}
                {total > 1 && (
                    <>
                        <button
                            onClick={() => goTo(current - 1)}
                            disabled={current === 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer hover:bg-white/10"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
                            aria-label="Story anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => goTo(current + 1)}
                            disabled={current === total - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20 cursor-pointer hover:bg-white/10"
                            style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }}
                            aria-label="Próxima story"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Dots indicator */}
            {total > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3" role="tablist">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === current}
                            onClick={() => goTo(i)}
                            className={`rounded-full transition-all duration-200 cursor-pointer ${i === current ? 'w-6 h-2' : 'w-2 h-2 opacity-30'}`}
                            style={{ background: i === current ? topicColor : 'var(--color-text-muted)' }}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
