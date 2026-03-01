import { useEffect, useRef, useMemo } from 'react'
import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useSpring,
    useTransform,
} from 'framer-motion'
import { DEFAULT_COPILOT_AVATAR_URL } from '@/services/userSettingsService'
import { useSerafimStore, type SerafimEmotion } from '@/stores/serafimStore'

/* ── Emotion → RGB color map ── */
const EMOTION_COLORS: Record<SerafimEmotion, [number, number, number]> = {
    idle: [255, 90, 0],        // warm orange (default accent)
    observing: [255, 90, 0],   // same accent while talking
    happy: [255, 180, 40],     // warm gold
    worried: [245, 158, 11],   // soft amber (empathic, not alarming)
    processing: [80, 140, 255], // blue shift
}

interface AudioKineticAvatarProps {
    active: boolean
    level: number
    errorPulse?: boolean
    avatarUrl: string
    name: string
    stateLabel?: string
    className?: string
}

export function AudioKineticAvatar({ active, level, errorPulse = false, avatarUrl, name, stateLabel, className }: AudioKineticAvatarProps) {
    const fallbackUsedRef = useRef(false)
    const emotion = useSerafimStore((s) => s.emotion)

    const scaleTarget = useMotionValue(1)
    const glowTarget = useMotionValue(0)

    useEffect(() => {
        const energy = active ? (errorPulse ? Math.max(level, 0.92) : level) : 0
        scaleTarget.set(1 + (energy * 0.18))
        glowTarget.set(energy)
    }, [active, errorPulse, level, scaleTarget, glowTarget])

    const scale = useSpring(scaleTarget, { stiffness: 120, damping: 18, mass: 0.9 })
    const glow = useSpring(glowTarget, { stiffness: 110, damping: 22, mass: 1.0 })

    const glowBlur = useTransform(glow, [0, 1], [82, 220])
    const glowSpread = useTransform(glow, [0, 1], [6, 64])
    const glowAlpha = useTransform(glow, [0, 1], [0.18, 0.95])

    // Emotion-driven color (error overrides everything)
    const [r, g, b] = errorPulse ? [255, 48, 48] : EMOTION_COLORS[emotion]

    const haloShadow = useMotionTemplate`0 0 ${glowBlur}px ${glowSpread}px rgba(${r}, ${g}, ${b}, ${glowAlpha})`
    const membraneBorder = useMotionTemplate`1px solid rgba(${r}, ${g}, ${b}, ${useTransform(glow, [0, 1], [0.22, 0.72])})`
    const auraOpacity = useTransform(glow, [0, 1], [0.42, 1])
    const auraGradient = useMemo(() => {
        if (errorPulse) return 'radial-gradient(circle, rgba(255,48,48,0.32) 0%, rgba(255,48,48,0.06) 56%, rgba(255,48,48,0.00) 82%)'
        return `radial-gradient(circle, rgba(${r},${g},${b},0.28) 0%, rgba(${r},${g},${b},0.04) 56%, rgba(${r},${g},${b},0.00) 82%)`
    }, [errorPulse, r, g, b])

    // Subtle breathing animation when idle
    const breathingScale = emotion === 'idle' ? { scale: [1, 1.03, 1] } : {}
    const breathingTransition = emotion === 'idle'
        ? { duration: 4, repeat: Infinity, ease: 'easeInOut' as const }
        : undefined

    return (
        <motion.div
            className={className}
            animate={{ y: [0, -16, 0, 12, 0], rotate: [0, 1.2, 0, -1.1, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        >
            <motion.div
                className="relative w-[min(46vw,460px)] aspect-square rounded-full"
                style={{ scale }}
                animate={breathingScale}
                transition={breathingTransition}
            >
                <motion.div
                    className="absolute inset-[4%] rounded-full pointer-events-none"
                    style={{
                        boxShadow: haloShadow,
                        opacity: auraOpacity,
                        background: auraGradient,
                        filter: 'blur(22px)',
                    }}
                />

                <motion.div
                    className="absolute inset-[10%] rounded-full overflow-hidden bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.14),rgba(8,8,9,0.9)_58%)]"
                    style={{
                        border: membraneBorder,
                        boxShadow: haloShadow,
                    }}
                >
                    <div
                        className="absolute inset-0 z-10"
                        data-webgl-boundary="buggy-avatar-stage"
                        aria-hidden="true"
                    >
                        {/* Reserved boundary for future <Spline /> or <Rive /> interactive scene */}
                    </div>

                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="w-[56%] h-[56%] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
                            onError={(event) => {
                                if (fallbackUsedRef.current) return
                                fallbackUsedRef.current = true
                                event.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL
                            }}
                        />
                    </div>
                </motion.div>

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.42em] text-white/35">
                    {stateLabel ?? 'audio stream'}
                </div>
            </motion.div>
        </motion.div>
    )
}
