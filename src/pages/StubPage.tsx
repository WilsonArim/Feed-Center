import { motion } from 'framer-motion'

export function StubPage({ title }: { title: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Módulo em desenvolvimento — Fase 4 do Masterplan.
            </p>
            <div
                className="glass rounded-[var(--radius-lg)] mt-8 h-64 flex items-center justify-center"
                style={{ boxShadow: 'var(--shadow-sm)' }}
            >
                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Em breve
                </span>
            </div>
        </motion.div>
    )
}
