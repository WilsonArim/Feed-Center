import { useState, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
            'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-md)]',
        ghost:
            'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)]',
        danger:
            'bg-[var(--color-danger)] text-white hover:brightness-110',
    }

    return (
        <button
            onClick={handleClick}
            className={`relative overflow-hidden px-5 py-2.5 rounded-[var(--radius-md)] font-medium text-sm
                transition-all duration-[var(--duration-fast)] cursor-pointer
                ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
            <AnimatePresence>
                {ripples.map((r) => (
                    <motion.span
                        key={r.id}
                        initial={{ scale: 0, opacity: 0.5 }}
                        animate={{ scale: 4, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: r.x - 20,
                            top: r.y - 20,
                            width: 40,
                            height: 40,
                            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                        }}
                    />
                ))}
            </AnimatePresence>
        </button>
    )
}
