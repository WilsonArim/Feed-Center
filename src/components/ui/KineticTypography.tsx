import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

interface Props {
    title: string
    subtitle?: string
    className?: string
}

export function KineticTypography({ title, subtitle, className = '' }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    })

    // Velocity effect: As we scroll past, the text "stretches" slightly
    const tracking = useTransform(scrollYProgress, [0, 0.5, 1], ['-0.05em', '0em', '0.05em'])
    const skew = useTransform(scrollYProgress, [0, 0.5, 1], ['0deg', '0deg', '-2deg'])
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

    return (
        <div ref={ref} className={`py-12 ${className}`}>
            <motion.h1
                style={{ letterSpacing: tracking, skewX: skew, opacity }}
                className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-[var(--color-text-primary)] to-[var(--color-text-muted)]"
            >
                {title}
            </motion.h1>
            {subtitle && (
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl"
                >
                    {subtitle}
                </motion.p>
            )}
        </div>
    )
}
