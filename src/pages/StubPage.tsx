import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

export function StubPage({ title }: { title: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="pb-12"
        >
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-[var(--color-text-primary)] font-sans">
                {title}
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
                Modulo em desenvolvimento -- Fase 4 do Masterplan.
            </p>
            <div className="rounded-2xl mt-8 h-64 flex flex-col items-center justify-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)]">
                <Construction size={28} className="text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text-muted)]">
                    Em breve
                </span>
            </div>
        </motion.div>
    )
}
