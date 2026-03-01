import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Square, Loader2 } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import type { LiveVoicePhase } from '@/hooks/useLiveVoiceEngine'

const BAR_COUNT = 32
const MIN_BAR_HEIGHT = 2  // px
const MAX_BAR_HEIGHT = 48 // px

interface LiveVoiceVisualizerProps {
    /** AnalyserNode — switches between mic (listening) and TTS (speaking) */
    analyserNode: AnalyserNode | null
    /** Whether the visualizer is active */
    active: boolean
    /** Current conversation phase */
    phase?: LiveVoicePhase
    /** Stop callback */
    onStop: () => void
    /** Optional elapsed time in seconds */
    elapsed?: number
    /** Compact mode for smaller containers */
    compact?: boolean
    className?: string
}

/* ── Bar color palettes ── */

const USER_COLORS = {
    high: 'var(--accent)',             // bright orange
    mid: 'rgba(255, 90, 0, 0.55)',
    low: 'rgba(255, 90, 0, 0.25)',
}

const BUGGY_COLORS = {
    high: 'rgb(99, 152, 255)',         // bright blue
    mid: 'rgba(99, 152, 255, 0.55)',
    low: 'rgba(99, 152, 255, 0.25)',
}

/**
 * Real-time audio waveform visualizer using Web Audio API AnalyserNode.
 * Bars physically react to audio volume — no fake CSS animations.
 *
 * Phase-aware:
 * - listening: orange bars (user's mic)
 * - processing: pulsing idle bars
 * - speaking: blue bars (Buggy's TTS output)
 */
export function LiveVoiceVisualizer({
    analyserNode,
    active,
    phase = 'listening',
    onStop,
    elapsed = 0,
    compact = false,
    className,
}: LiveVoiceVisualizerProps) {
    const { txt } = useLocaleText()
    const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0))
    const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(0))
    const rafRef = useRef<number | null>(null)
    const bufferRef = useRef<Uint8Array | null>(null)

    const maxHeight = compact ? 28 : MAX_BAR_HEIGHT
    const minHeight = compact ? 1.5 : MIN_BAR_HEIGHT
    const isProcessing = phase === 'processing'
    const isSpeaking = phase === 'speaking'
    const colors = isSpeaking ? BUGGY_COLORS : USER_COLORS

    // Animated idle bars for processing state
    const [processingTick, setProcessingTick] = useState(0)
    useEffect(() => {
        if (!isProcessing) return
        const id = setInterval(() => setProcessingTick(t => t + 1), 80)
        return () => clearInterval(id)
    }, [isProcessing])

    useEffect(() => {
        if (!isProcessing) return
        const newBars = new Array(BAR_COUNT).fill(0).map((_, i) => {
            const wave = Math.sin((i / BAR_COUNT) * Math.PI * 2 + processingTick * 0.3)
            return minHeight + (wave * 0.5 + 0.5) * (maxHeight * 0.25 - minHeight)
        })
        setBars(newBars)
    }, [isProcessing, processingTick, minHeight, maxHeight])

    const tick = useCallback(() => {
        if (!analyserNode) {
            rafRef.current = requestAnimationFrame(tick)
            return
        }

        if (!bufferRef.current || bufferRef.current.length !== analyserNode.frequencyBinCount) {
            bufferRef.current = new Uint8Array(analyserNode.frequencyBinCount) as Uint8Array<ArrayBuffer>
        }

        analyserNode.getByteFrequencyData(bufferRef.current as Uint8Array<ArrayBuffer>)

        const binCount = bufferRef.current.length
        const step = Math.max(1, Math.floor(binCount / BAR_COUNT))
        const prev = barsRef.current

        for (let i = 0; i < BAR_COUNT; i++) {
            const start = Math.min(i * step, binCount - 1)
            const end = Math.min(start + step, binCount)
            let sum = 0
            for (let j = start; j < end; j++) {
                sum += bufferRef.current[j]!
            }
            const avg = sum / (end - start) / 255

            const target = minHeight + avg * (maxHeight - minHeight)
            const current = prev[i] ?? minHeight
            const smoothed = target > current
                ? current + (target - current) * 0.4
                : current + (target - current) * 0.15
            prev[i] = smoothed
        }

        barsRef.current = [...prev]
        setBars([...prev])

        rafRef.current = requestAnimationFrame(tick)
    }, [analyserNode, maxHeight, minHeight])

    useEffect(() => {
        if (active && !isProcessing) {
            // Reset buffer when analyser changes (mic ↔ TTS switch)
            bufferRef.current = null
            rafRef.current = requestAnimationFrame(tick)
        }
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
        }
    }, [active, isProcessing, tick])

    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60

    const phaseLabel = (() => {
        switch (phase) {
            case 'listening': return txt('A ouvir…', 'Listening…')
            case 'processing': return txt('A processar…', 'Processing…')
            case 'speaking': return txt('Buggy a falar…', 'Buggy speaking…')
            default: return ''
        }
    })()

    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`flex flex-col gap-1.5 ${className ?? ''}`}
                >
                    <div className="flex items-center gap-3">
                        {/* Stop button */}
                        <motion.button
                            type="button"
                            onClick={onStop}
                            className={`w-10 h-10 rounded-full flex items-center justify-center
                                transition-all cursor-pointer shrink-0
                                ${isSpeaking
                                    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
                                    : isProcessing
                                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]'
                                        : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50'
                                }`}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Stop"
                        >
                            {isProcessing
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Square size={14} fill="currentColor" />}
                        </motion.button>

                        {/* Waveform bars */}
                        <div className="flex-1 flex items-center justify-center gap-[1.5px] h-full">
                            {bars.map((height, i) => (
                                <div
                                    key={i}
                                    className="rounded-full transition-colors duration-150"
                                    style={{
                                        width: compact ? 2 : 3,
                                        height: Math.max(minHeight, height),
                                        backgroundColor: height > maxHeight * 0.6
                                            ? colors.high
                                            : height > maxHeight * 0.3
                                                ? colors.mid
                                                : colors.low,
                                        transition: 'height 60ms linear',
                                        opacity: isProcessing ? 0.5 : 1,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Timer */}
                        <div className="text-xs font-mono text-[var(--text-secondary)] tabular-nums shrink-0 w-12 text-right">
                            {mins}:{secs.toString().padStart(2, '0')}
                        </div>
                    </div>

                    {/* Phase label */}
                    {phaseLabel && (
                        <div className={`text-[10px] text-center tracking-wide
                            ${isSpeaking ? 'text-blue-400/70' : 'text-[var(--text-tertiary)]'}`}>
                            {phaseLabel}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}
