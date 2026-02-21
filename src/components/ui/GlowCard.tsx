import { type ReactNode, useRef, useCallback, type ComponentPropsWithoutRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type GlowVariant = 'default' | 'elevated' | 'accent' | 'subtle'

interface GlowCardProps extends ComponentPropsWithoutRef<typeof motion.div> {
  children: ReactNode
  glow?: boolean
  variant?: GlowVariant
  hoverable?: boolean
}

const variantStyles: Record<GlowVariant, string> = {
  default: 'bg-[var(--bg-card)] border-[var(--border-subtle)]',
  elevated: 'bg-[var(--bg-elevated)] border-[var(--border-default)] shadow-[var(--shadow-md)]',
  accent: 'bg-[var(--bg-card)] border-[var(--accent-glow)]',
  subtle: 'bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--border-subtle)]',
}

export function GlowCard({
  children,
  glow = true,
  variant = 'default',
  hoverable = true,
  className = '',
  ...props
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!glow || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty('--mouse-x', `${x}px`)
    cardRef.current.style.setProperty('--mouse-y', `${y}px`)
  }, [glow])

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative rounded-2xl border overflow-hidden transition-all duration-200',
        variantStyles[variant],
        hoverable && 'hover:border-[var(--accent-glow)] hover:shadow-[var(--shadow-accent)]',
        hoverable && 'hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {glow && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--accent-muted), transparent 60%)',
          }}
          aria-hidden="true"
        />
      )}

      <div
        className="absolute top-0 left-0 right-0 h-px opacity-60 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-[2] p-5 h-full">
        {children}
      </div>
    </motion.div>
  )
}
