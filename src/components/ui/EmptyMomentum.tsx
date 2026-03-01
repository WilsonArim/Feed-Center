import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Search, AlertCircle } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'

interface EmptyMomentumProps {
    icon: ReactNode
    title: string
    message: string
    action?: { label: string; onClick: () => void }
    variant?: 'default' | 'search' | 'error'
    compact?: boolean
}

const glowKeyframes = [
    '0 0 20px rgba(255,90,0,0.15)',
    '0 0 35px rgba(255,90,0,0.3)',
    '0 0 20px rgba(255,90,0,0.15)',
]

export function EmptyMomentum({ icon, title, message, action, variant = 'default', compact }: EmptyMomentumProps) {
    const resolvedIcon = variant === 'search' ? <Search size={compact ? 20 : 28} /> : variant === 'error' ? <AlertCircle size={compact ? 20 : 28} /> : icon
    const isError = variant === 'error'

    return (
        <motion.div
            initial={{ opacity: 0, y: compact ? 8 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring' as const, damping: 22, stiffness: 180 }}
            className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-3 gap-3' : 'py-16 px-4 gap-5'}`}
        >
            {/* Floating icon */}
            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className={`${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-full flex items-center justify-center
                    ${isError
                        ? 'bg-[var(--danger)]/10 text-[var(--danger)] shadow-[0_8px_30px_rgba(239,68,68,0.15)]'
                        : 'bg-white/5 text-[var(--color-text-muted)] shadow-[0_8px_30px_rgba(0,0,0,0.3)]'
                    } border border-white/5`}
            >
                {resolvedIcon}
            </motion.div>

            {/* Title — Orbitron via font-heading */}
            <h3 className={`font-heading font-black tracking-tight text-white drop-shadow-md leading-snug
                ${compact ? 'text-base' : 'text-lg md:text-xl'}`}>
                {title}
            </h3>

            {/* Message — warm, contextual */}
            <p className={`text-[var(--color-text-muted)] font-medium leading-relaxed max-w-sm mx-auto
                ${compact ? 'text-xs' : 'text-sm'}`}>
                {message}
            </p>

            {/* CTA with pulse glow */}
            {action && (
                <motion.div
                    animate={{ boxShadow: glowKeyframes }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-full mt-1"
                >
                    <StardustButton
                        size={compact ? 'sm' : 'md'}
                        onClick={action.onClick}
                    >
                        {action.label}
                    </StardustButton>
                </motion.div>
            )}
        </motion.div>
    )
}
