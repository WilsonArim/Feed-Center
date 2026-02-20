import { useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Ripple {
  id: number
  x: number
  y: number
}

interface LiquidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
}

let rippleId = 0

export function LiquidButton({
  children,
  variant = 'primary',
  className = '',
  onClick,
  ...props
}: LiquidButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700)
    onClick?.(e)
  }

  const variants: Record<string, string> = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] shadow-[var(--shadow-accent)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)]',
    danger:
      'bg-[var(--danger)] text-white hover:opacity-90',
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden px-5 py-2.5 rounded-xl font-medium text-sm',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
        'active:scale-[0.97]',
        variants[variant],
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none z-0"
            style={{
              left: r.x - 20,
              top: r.y - 20,
              width: 40,
              height: 40,
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)',
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  )
}
