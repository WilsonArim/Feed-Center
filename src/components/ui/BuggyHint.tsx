import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'

interface BuggyHintProps {
    hintId: string
    messagePt: string
    messageEn: string
    /** Delay in ms before showing (default 800) */
    delay?: number
}

function isHintDismissed(id: string): boolean {
    try {
        return localStorage.getItem(`hint:${id}`) === '1'
    } catch {
        return false
    }
}

function dismissHint(id: string) {
    try {
        localStorage.setItem(`hint:${id}`, '1')
    } catch { /* noop */ }
}

export function BuggyHint({ hintId, messagePt, messageEn, delay = 800 }: BuggyHintProps) {
    const { txt } = useLocaleText()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isHintDismissed(hintId)) return
        const timer = setTimeout(() => setVisible(true), delay)
        return () => clearTimeout(timer)
    }, [hintId, delay])

    const handleDismiss = () => {
        setVisible(false)
        dismissHint(hintId)
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                    className="relative flex items-start gap-3 px-4 py-3 rounded-2xl
                        bg-[var(--accent)]/10 border border-[var(--accent)]/20
                        shadow-[0_8px_30px_rgba(255,90,0,0.1)]
                        backdrop-blur-sm max-w-sm"
                >
                    <Sparkles size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1">
                        {txt(messagePt, messageEn)}
                    </p>
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center
                            hover:bg-white/10 transition-colors cursor-pointer text-[var(--text-tertiary)]"
                        aria-label={txt('Fechar dica', 'Close hint')}
                    >
                        <X size={12} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
