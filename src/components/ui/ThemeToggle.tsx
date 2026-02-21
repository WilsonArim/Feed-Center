import { Moon, Sun, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { useLocaleText } from '@/i18n/useLocaleText'

interface ThemeToggleProps {
    compact?: boolean
    className?: string
}

export function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
    const { txt } = useLocaleText()
    const { mode, setMode } = useThemeStore()

    const cycle = () => {
        const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark'
        setMode(next)
    }

    const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor
    const label = mode === 'dark' ? txt('Escuro', 'Dark') : mode === 'light' ? txt('Claro', 'Light') : txt('Auto', 'Auto')

    return (
        <button
            onClick={cycle}
            className={`flex items-center gap-2.5 h-10 rounded-xl transition-all duration-200 cursor-pointer
                text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]
                ${compact ? 'justify-center w-10' : 'px-3 w-full'} ${className ?? ''}`}
            aria-label={`${txt('Tema', 'Theme')}: ${label}`}
            title={`${txt('Tema', 'Theme')}: ${label}`}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={mode}
                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.15 }}
                >
                    <Icon size={18} />
                </motion.div>
            </AnimatePresence>
            {!compact && <span className="text-sm font-medium">{label}</span>}
        </button>
    )
}

/** Full three-option segmented control for Settings page */
export function ThemeSelector({ className }: { className?: string }) {
    const { txt } = useLocaleText()
    const { mode, setMode } = useThemeStore()

    const options: { value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }[] = [
        { value: 'light', icon: Sun, label: txt('Claro', 'Light') },
        { value: 'dark', icon: Moon, label: txt('Escuro', 'Dark') },
        { value: 'system', icon: Monitor, label: txt('Auto', 'Auto') },
    ]

    return (
        <div
            className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] ${className ?? ''}`}
            role="radiogroup"
            aria-label={txt('Selecao de tema', 'Theme selection')}
        >
            {options.map(opt => {
                const isActive = mode === opt.value
                const OptIcon = opt.icon
                return (
                    <button
                        key={opt.value}
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => setMode(opt.value)}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 ${
                            isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="theme-selector"
                                className="absolute inset-0 bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <OptIcon size={14} />
                            <span>{opt.label}</span>
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
