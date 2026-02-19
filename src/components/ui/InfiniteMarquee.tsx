import { type ReactNode } from 'react'

interface Props {
    items: ReactNode[]
    speed?: number // seconds per loop
    direction?: 'left' | 'right'
    className?: string
}

export function InfiniteMarquee({ items, speed = 20, direction = 'left', className = '' }: Props) {

    return (
        <div className={`relative flex overflow-hidden user-select-none group ${className}`}>
            <div
                className={`flex gap-8 py-4 whitespace-nowrap animate-marquee ${direction === 'right' ? 'animate-marquee-reverse' : ''}`}
                style={{
                    animationDuration: `${speed}s`,
                }}
            >
                {/* Render items 3 times to ensure seamless loop */}
                {[...items, ...items, ...items, ...items].map((item, idx) => (
                    <div key={idx} className="shrink-0">
                        {item}
                    </div>
                ))}
            </div>

            {/* Gradient masks for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[var(--color-bg-primary)] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[var(--color-bg-primary)] to-transparent z-10" />
        </div>
    )
}
