import type { HTMLAttributes, ReactNode } from 'react'

interface GlowCardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    glow?: boolean
}

export function GlowCard({ children, glow = true, className = '', ...props }: GlowCardProps) {
    return (
        <div
            className={`glow-card-wrapper relative rounded-[var(--radius-lg)] ${className}`}
            {...props}
        >
            {/* Animated rotating border */}
            {glow && (
                <div
                    className="absolute -inset-px rounded-[var(--radius-lg)] overflow-hidden pointer-events-none"
                    aria-hidden
                >
                    <div className="glow-border-spinner absolute inset-0" />
                </div>
            )}

            {/* Card content */}
            <div className="glass relative rounded-[var(--radius-lg)] p-5 h-full">
                {children}
            </div>
        </div>
    )
}
