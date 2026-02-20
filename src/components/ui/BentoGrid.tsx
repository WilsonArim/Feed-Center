import { type ReactNode, useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface BentoItem {
  id: string
  title: string
  description?: string
  icon?: ReactNode
  colSpan?: 1 | 2
  rowSpan?: 1 | 2
  children?: ReactNode
  className?: string
}

interface BentoGridProps {
  items: BentoItem[]
  className?: string
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

function BentoCell({ item, index }: { item: BentoItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const colClass = item.colSpan === 2 ? 'md:col-span-2' : ''
  const rowClass = item.rowSpan === 2 ? 'md:row-span-2' : ''

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty('--mouse-x', `${x}px`)
    cardRef.current.style.setProperty('--mouse-y', `${y}px`)
  }, [])

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={cn(colClass, rowClass, item.className)}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className={cn(
          'group relative h-full rounded-2xl overflow-hidden',
          'bg-[var(--bg-card)] border border-[var(--border-subtle)]',
          'shadow-[var(--shadow-sm)] transition-all duration-200',
          'hover:border-[var(--accent-glow)] hover:shadow-[var(--shadow-accent)]',
          'hover:-translate-y-0.5'
        )}
        style={{ minHeight: item.rowSpan === 2 ? '420px' : '200px' }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[1]"
          style={{
            background: 'radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--accent-muted), transparent 60%)',
          }}
          aria-hidden="true"
        />

        <div
          className="absolute top-0 left-0 right-0 h-px opacity-40 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }}
          aria-hidden="true"
        />

        <div className="relative z-[2] h-full flex flex-col p-5">
          <div className="flex items-center gap-3 mb-3">
            {item.icon && (
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] shrink-0">
                {item.icon}
              </div>
            )}
            <h3 className="text-sm font-semibold text-[var(--text-primary)] font-heading uppercase tracking-wider">
              {item.title}
            </h3>
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-3">
              {item.description}
            </p>
          )}

          {item.children && (
            <div className="flex-1 min-h-0">{item.children}</div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min', className)}>
      {items.map((item, i) => (
        <BentoCell key={item.id} item={item} index={i} />
      ))}
    </div>
  )
}
