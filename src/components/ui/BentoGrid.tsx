import { type ReactNode, useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export interface BentoItem {
    id: string
    title: string
    description?: string
    icon?: ReactNode
    colSpan?: 1 | 2
    rowSpan?: 1 | 2
    children?: ReactNode
}

interface BentoGridProps {
    items: BentoItem[]
}

const itemVariants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.08,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    }),
}

function BentoCell({ item, index }: { item: BentoItem; index: number }) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-60px' })

    const colClass = item.colSpan === 2 ? 'md:col-span-2' : ''
    const rowClass = item.rowSpan === 2 ? 'md:row-span-2' : ''

    return (
        <motion.div
            ref={ref}
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className={`group glass rounded-[var(--radius-lg)] p-8 relative overflow-hidden
                transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(var(--color-accent-rgb,59,130,246),0.15)]
                ${colClass} ${rowClass}`}
            style={{ minHeight: item.rowSpan === 2 ? '460px' : '220px' }}
        >
            {/* Subtle hover gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent" />

            <div className="relative z-10 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    {item.icon && (
                        <div className="w-11 h-11 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)]">
                            {item.icon}
                        </div>
                    )}
                    <h3
                        className="text-lg font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {item.title}
                    </h3>
                </div>

                {/* Description */}
                {item.description && (
                    <p
                        className="text-base leading-relaxed mb-4"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        {item.description}
                    </p>
                )}

                {/* Custom content slot */}
                {item.children && (
                    <div className="flex-1">{item.children}</div>
                )}
            </div>
        </motion.div>
    )
}

export function BentoGrid({ items }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-min">
            {items.map((item, i) => (
                <BentoCell key={item.id} item={item} index={i} />
            ))}
        </div>
    )
}
