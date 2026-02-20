import { Moon, Sun, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ showLabel = false, className }: ThemeToggleProps) {
  const { mode, setMode } = useThemeStore()

  const cycle = () => {
    const next = mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark'
    setMode(next)
  }

  const icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor
  const label = mode === 'dark' ? 'Dark' : mode === 'light' ? 'Light' : 'System'

  return (
    <button
      onClick={cycle}
      className={cn(
        'relative inline-flex items-center justify-center gap-2',
        'h-9 rounded-[var(--radius-lg)] px-3',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'bg-transparent hover:bg-[var(--accent-soft)]',
        'transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
        className
      )}
      aria-label={`Theme: ${label}. Click to change.`}
      title={`Theme: ${label}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {(() => {
            const Icon = icon
            return <Icon size={16} />
          })()}
        </motion.div>
      </AnimatePresence>
      {showLabel && (
        <span className="text-xs font-medium">{label}</span>
      )}
    </button>
  )
}

/** Full three-option segmented control for Settings page */
export function ThemeSelector({ className }: { className?: string }) {
  const { mode, setMode } = useThemeStore()

  const options: { value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-[var(--radius-xl)]',
        'bg-[var(--bg-tertiary)] border border-[var(--border)]',
        className
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map(opt => {
        const isActive = mode === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => setMode(opt.value)}
            className={cn(
              'relative flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-lg)]',
              'text-sm font-medium transition-all duration-200',
              isActive
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
          >
            {isActive && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 bg-[var(--accent-soft)] border border-[var(--border-glow)] rounded-[var(--radius-lg)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={14} />
              <span>{opt.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
