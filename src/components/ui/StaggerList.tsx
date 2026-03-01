import { type ReactNode, Children } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const containerVariants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.06,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 180 } },
}

interface StaggerListProps {
    children: ReactNode
    className?: string
    /** Trigger animation only when scrolled into view (default: true) */
    inView?: boolean
    /** How much of the element must be visible before triggering (default: 0.1) */
    threshold?: number
}

export function StaggerList({ children, className, inView = true, threshold = 0.1 }: StaggerListProps) {
    const ref = useRef<HTMLDivElement>(null)
    const isInView = useInView(ref, { once: true, amount: threshold })

    const shouldAnimate = !inView || isInView

    return (
        <motion.div
            ref={ref}
            variants={containerVariants}
            initial="hidden"
            animate={shouldAnimate ? 'show' : 'hidden'}
            className={className}
        >
            {Children.map(children, (child) =>
                child ? (
                    <motion.div variants={itemVariants}>
                        {child}
                    </motion.div>
                ) : null
            )}
        </motion.div>
    )
}
