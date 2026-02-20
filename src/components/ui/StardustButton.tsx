import { type ButtonHTMLAttributes, type ReactNode, type MouseEvent, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'default' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface StardustButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
  fullWidth?: boolean
  icon?: ReactNode
  isLoading?: boolean
}

interface Ripple {
  id: number
  x: number
  y: number
}

const variantStyles: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] shadow-[var(--shadow-accent)]',
  secondary:
    'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--accent-glow)] hover:bg-[var(--accent-muted)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)]',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90 shadow-md',
  outline:
    'bg-transparent text-[var(--accent)] border border-[var(--accent-glow)] hover:bg-[var(--accent-muted)]',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  icon: 'h-10 w-10 rounded-xl p-0',
}

let rippleId = 0

export function StardustButton({
  children,
  size = 'md',
  variant = 'default',
  fullWidth = false,
  icon,
  isLoading = false,
  className = '',
  disabled,
  onClick,
  ...props
}: StardustButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId
    setRipples(prev => [...prev, { id, x, y }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
    onClick?.(e)
  }, [onClick])

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={cn(
        'relative inline-flex items-center justify-center font-semibold',
        'overflow-hidden transition-all duration-150 ease-out cursor-pointer',
        'active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-inherit">
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {size !== 'icon' && children}
      </span>

      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              left: r.x - 16,
              top: r.y - 16,
              width: 32,
              height: 32,
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  )
}
