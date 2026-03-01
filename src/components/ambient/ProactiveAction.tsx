import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'

const MORPH_SPRING = {
    type: 'spring',
    stiffness: 170,
    damping: 24,
    mass: 1,
} as const

type ProactiveActionProps = {
    id: string
    rawLabel: string
    rawText: string
    rawContext: string
    structuredLabel: string
    structuredText: string
    structuredContext: string
    amount?: string
    accentColor?: string
    confirmLabel?: string
    completeLabel?: string
    onApprove?: () => void
    state?: 'raw' | 'structured'
    isApproving?: boolean
    layoutIds?: Partial<{
        shell: string
        label: string
        title: string
        context: string
        amount: string
        cta: string
        handshake: string
    }>
    handshakeRawText?: string
    handshakeStructuredText?: string
}

export function ProactiveAction({
    id,
    rawLabel,
    rawText,
    rawContext,
    structuredLabel,
    structuredText,
    structuredContext,
    amount,
    accentColor = 'var(--accent)',
    confirmLabel = 'Approve execution',
    completeLabel = 'Executed',
    onApprove,
    state,
    isApproving = false,
    layoutIds,
    handshakeRawText = 'Buggy 99% implicit execution. You provide the 1% tactical handshake.',
    handshakeStructuredText = 'Symbiosis complete. Entry is now structured and executable.',
}: ProactiveActionProps) {
    const [approved, setApproved] = useState(false)
    const prefersReducedMotion = useReducedMotion()
    const isControlled = state !== undefined
    const resolvedState = isControlled ? state : (approved ? 'structured' : 'raw')
    const isStructured = resolvedState === 'structured'

    const handleApprove = () => {
        if (isStructured || isApproving) return
        if (!isControlled) setApproved(true)
        onApprove?.()
    }

    const ids = useMemo(() => ({
        shell: layoutIds?.shell ?? `${id}-shell`,
        label: layoutIds?.label ?? `${id}-label`,
        title: layoutIds?.title ?? `${id}-title`,
        context: layoutIds?.context ?? `${id}-context`,
        amount: layoutIds?.amount ?? `${id}-amount`,
        cta: layoutIds?.cta ?? `${id}-cta`,
        handshake: layoutIds?.handshake ?? `${id}-handshake`,
    }), [id, layoutIds])

    const textBreath = isStructured || prefersReducedMotion
        ? { opacity: 1, textShadow: 'none' }
        : {
            opacity: [0.78, 1, 0.82],
            textShadow: [
                '0 0 0px transparent',
                `0 0 16px ${accentColor}`,
                `0 0 4px ${accentColor}`,
            ],
        }

    return (
        <div className="relative w-full" style={{ perspective: 1200 }}>
            <AnimatePresence initial={false} mode="popLayout">
                {!isStructured ? (
                    <motion.article
                        key="raw"
                        layout
                        layoutId={ids.shell}
                        data-spotlight-id={ids.shell}
                        initial={false}
                        animate={{ opacity: 1, rotateX: 0, z: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, rotateX: -10, z: -120, scale: 0.97, filter: 'blur(4px)' }}
                        transition={MORPH_SPRING}
                        className="relative overflow-hidden rounded-sm border border-[var(--border-default)] px-5 py-6 md:px-7 md:py-7"
                        style={{
                            background: 'linear-gradient(165deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 45%, transparent 90%), var(--bg-card)',
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        <motion.div
                            className="pointer-events-none absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 blur-3xl"
                            animate={isStructured || prefersReducedMotion
                                ? { opacity: 0.18, scale: 1 }
                                : { opacity: [0.12, 0.34, 0.16], scale: [0.98, 1.08, 0.98] }}
                            transition={prefersReducedMotion
                                ? { duration: 0 }
                                : { duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                background: `radial-gradient(circle at 32% 50%, ${accentColor}80 0%, transparent 72%)`,
                            }}
                        />

                        <div className="relative z-10 flex flex-col gap-4">
                            <motion.p
                                layoutId={ids.label}
                                data-spotlight-id={ids.label}
                                className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]"
                            >
                                {rawLabel}
                            </motion.p>

                            <motion.p
                                layoutId={ids.title}
                                data-spotlight-id={ids.title}
                                animate={textBreath}
                                transition={prefersReducedMotion ? { duration: 0 } : { duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
                                className="text-2xl md:text-3xl font-black tracking-[-0.03em] text-white"
                            >
                                {rawText}
                            </motion.p>

                            <motion.p
                                layoutId={ids.context}
                                data-spotlight-id={ids.context}
                                className="max-w-2xl text-sm text-[var(--text-secondary)] leading-relaxed"
                            >
                                {rawContext}
                            </motion.p>

                            <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
                                {amount && (
                                    <motion.span
                                        layoutId={ids.amount}
                                        data-spotlight-id={ids.amount}
                                        className="text-3xl md:text-4xl font-black tabular-nums tracking-tight text-white"
                                    >
                                        {amount}
                                    </motion.span>
                                )}

                                <motion.button
                                    layoutId={ids.cta}
                                    data-spotlight-id={ids.cta}
                                    type="button"
                                    onClick={handleApprove}
                                    whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.01 }}
                                    whileTap={prefersReducedMotion ? undefined : { y: 0, scale: 0.98 }}
                                    disabled={isApproving}
                                    className="inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-45 disabled:cursor-not-allowed"
                                    style={{
                                        background: accentColor,
                                        boxShadow: `0 0 26px ${accentColor}`,
                                    }}
                                >
                                    <Sparkles size={14} />
                                    {confirmLabel}
                                </motion.button>
                            </div>

                            <motion.p
                                layoutId={ids.handshake}
                                data-spotlight-id={ids.handshake}
                                className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]"
                            >
                                {handshakeRawText}
                            </motion.p>
                        </div>
                    </motion.article>
                ) : (
                    <motion.article
                        key="structured"
                        layout
                        layoutId={ids.shell}
                        data-spotlight-id={ids.shell}
                        initial={prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, rotateX: 10, z: 120, scale: 1.03, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, rotateX: 0, z: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, rotateX: -6, z: -80, scale: 0.98, filter: 'blur(3px)' }}
                        transition={MORPH_SPRING}
                        className="relative overflow-hidden rounded-sm border px-5 py-6 md:px-7 md:py-7"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--success) 45%, var(--border-default))',
                            background: 'linear-gradient(165deg, rgba(52,211,153,0.09), rgba(16,185,129,0.02) 45%, transparent 90%), var(--bg-card)',
                            boxShadow: '0 0 38px rgba(52,211,153,0.22)',
                            transformStyle: 'preserve-3d',
                        }}
                    >
                        <div className="relative z-10 flex flex-col gap-4">
                            <motion.p
                                layoutId={ids.label}
                                data-spotlight-id={ids.label}
                                className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--success)]"
                            >
                                {structuredLabel}
                            </motion.p>

                            <motion.p
                                layoutId={ids.title}
                                data-spotlight-id={ids.title}
                                className="text-2xl md:text-3xl font-black tracking-[-0.03em] text-white"
                            >
                                {structuredText}
                            </motion.p>

                            <motion.p
                                layoutId={ids.context}
                                data-spotlight-id={ids.context}
                                className="max-w-2xl text-sm text-[var(--text-secondary)] leading-relaxed"
                            >
                                {structuredContext}
                            </motion.p>

                            <div className="flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
                                {amount && (
                                    <motion.span
                                        layoutId={ids.amount}
                                        data-spotlight-id={ids.amount}
                                        className="text-3xl md:text-4xl font-black tabular-nums tracking-tight text-white"
                                    >
                                        {amount}
                                    </motion.span>
                                )}

                                <motion.div
                                    layoutId={ids.cta}
                                    data-spotlight-id={ids.cta}
                                    className="inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
                                    style={{
                                        borderColor: 'color-mix(in srgb, var(--success) 50%, transparent)',
                                        color: 'var(--success)',
                                    }}
                                >
                                    <CheckCircle2 size={14} />
                                    {completeLabel}
                                </motion.div>
                            </div>

                            <motion.p
                                layoutId={ids.handshake}
                                data-spotlight-id={ids.handshake}
                                className="text-[10px] uppercase tracking-[0.2em] text-[var(--success)]"
                            >
                                {handshakeStructuredText}
                            </motion.p>
                        </div>
                    </motion.article>
                )}
            </AnimatePresence>
        </div>
    )
}
