import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  items: ReactNode[]
  speed?: number
  direction?: 'left' | 'right'
  className?: string
}

export function InfiniteMarquee({ items, speed = 20, direction = 'left', className = '' }: Props) {
  return (
    <div className={cn('relative flex overflow-hidden select-none group', className)}>
      <div
        className={cn(
          'flex gap-8 py-4 whitespace-nowrap',
          direction === 'right' ? 'animate-marquee-reverse' : 'animate-marquee'
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {[...items, ...items, ...items, ...items].map((item, idx) => (
          <div key={idx} className="shrink-0">
            {item}
          </div>
        ))}
      </div>

      {/* Gradient fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--bg-primary)] to-transparent z-10 pointer-events-none" />
    </div>
  )
}
