import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import type { NewsItem } from '@/services/newsService'
import { timeAgo } from '@/services/newsService'
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

interface Props {
    items: NewsItem[]
    isLoading: boolean
}

export function TopStoriesCarousel({ items, isLoading }: Props) {
    const { txt } = useLocaleText()
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
            <div className="mb-10">
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3 text-white drop-shadow-md">
                    <Flame size={24} className="text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" /> {txt('Top Stories', 'Top Stories')}
                </h2>
                <div className="rounded-3xl p-6 animate-pulse h-56 bg-white/5 border border-transparent shadow-[0_4px_30px_rgba(0,0,0,0.2)]" />
            </div>
        )
    }

    if (total === 0) return null

    const item = items[current]!
    const topicColor = TOPIC_COLORS[item.topic_primary] || '#64748b'

    return (
        <section className="mb-12" role="region" aria-label={txt('Top Stories', 'Top Stories')} aria-roledescription="carousel">
            <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6 flex items-center gap-3 text-white drop-shadow-md">
                <Flame size={24} className="text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" /> {txt('Top Stories', 'Top Stories')}
            </h2>

            <div className="relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Card */}
                <AnimatePresence mode="wait">
                    <motion.a
                        key={current}
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, scale: 0.98, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.98, x: -20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="block rounded-3xl p-6 md:p-8 cursor-pointer group shadow-[0_10px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_50px_rgba(0,0,0,0.4)] transition-all duration-300 relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${topicColor}20, rgba(255,255,255,0.03))`,
                            border: `1px solid ${topicColor}30`,
                        }}
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: topicColor }} />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_15px_currentColor]"
                                    style={{ background: `${topicColor}25`, color: topicColor }}>
                                    {item.topic_primary}
                                </span>
                                <span className="text-xs font-mono font-bold" style={{ color: topicColor }}>
                                    {item.score.toFixed(2)}
                                </span>
                                <span className="opacity-40 text-white">·</span>
                                <span className="text-xs font-bold tracking-wide uppercase text-[var(--color-text-muted)] drop-shadow-sm">
                                    {item.source_name}
                                </span>
                                <span className="opacity-40 text-white">·</span>
                                <span className="text-xs font-bold tracking-wide uppercase text-[var(--color-text-muted)] drop-shadow-sm">
                                    {timeAgo(item.published_at)}
                                </span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-black leading-tight tracking-tight mb-4 text-white drop-shadow-md group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all">
                                {item.title}
                            </h3>

                            <p className="text-sm md:text-base leading-relaxed line-clamp-2 md:line-clamp-3 mb-4 text-[var(--color-text-secondary)] font-medium">
                                {item.summary}
                            </p>

                            {item.why && (
                                <p className="text-xs font-bold text-white/50 tracking-wide">
                                    <span className="opacity-70 mr-1">💡</span> {item.why}
                                </p>
                            )}
                        </div>
                    </motion.a>
                </AnimatePresence>

                {/* Navigation arrows */}
                {total > 1 && (
                    <>
                        <div className="absolute -left-4 top-1/2 -translate-y-1/2 z-20">
                            <Magnetic strength={0.4}>
                                <button
                                    onClick={() => goTo(current - 1)}
                                    disabled={current === 0}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:scale-95 cursor-pointer bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                    aria-label={txt('Story anterior', 'Previous story')}
                                >
                                    <ChevronLeft size={20} strokeWidth={2.5} />
                                </button>
                            </Magnetic>
                        </div>
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                            <Magnetic strength={0.4}>
                                <button
                                    onClick={() => goTo(current + 1)}
                                    disabled={current === total - 1}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all disabled:opacity-20 disabled:scale-95 cursor-pointer bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                    aria-label={txt('Proxima story', 'Next story')}
                                >
                                    <ChevronRight size={20} strokeWidth={2.5} />
                                </button>
                            </Magnetic>
                        </div>
                    </>
                )}
            </div>

            {/* Dots indicator */}
            {total > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5" role="tablist">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            role="tab"
                            aria-selected={i === current}
                            onClick={() => goTo(i)}
                            className={`rounded-full transition-all duration-300 cursor-pointer ${i === current ? 'w-8 h-1.5' : 'w-1.5 h-1.5 opacity-30 hover:opacity-100 hover:scale-125'}`}
                            style={{ background: i === current ? topicColor : '#ffffff' }}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
