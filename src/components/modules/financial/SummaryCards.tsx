import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Scale, ShieldCheck } from 'lucide-react'
import type { MonthSummary } from '@/services/financialService'
import type { AffordabilityScore } from '@/types'
import { formatCurrency } from '@/utils/format'

interface Props {
    summary: MonthSummary | undefined
    affordability?: AffordabilityScore | null
    isLoading: boolean
}

const AFFORDABILITY_CONFIG = {
    safe: { color: '#22c55e', label: '🟢 Seguro', bg: 'rgba(34,197,94,0.12)' },
    caution: { color: '#eab308', label: '🟡 Cuidado', bg: 'rgba(234,179,8,0.12)' },
    danger: { color: '#ef4444', label: '🔴 Perigo', bg: 'rgba(239,68,68,0.12)' },
} as const

export function SummaryCards({ summary, affordability, isLoading }: Props) {
    const cards = [
        {
            key: 'income',
            label: 'Receitas',
            icon: TrendingUp,
            color: 'var(--color-success, #22c55e)',
            value: summary?.income ?? 0,
        },
        {
            key: 'expenses',
            label: 'Despesas',
            icon: TrendingDown,
            color: 'var(--color-danger, #ef4444)',
            value: summary?.expenses ?? 0,
        },
        {
            key: 'balance',
            label: 'Saldo',
            icon: Scale,
            color: 'var(--color-accent, #3b82f6)',
            value: summary?.balance ?? 0,
        },
    ]

    const affConfig = affordability ? AFFORDABILITY_CONFIG[affordability.level] : null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                    className="modal-panel rounded-[var(--radius-lg)] p-5 relative overflow-hidden"
                >
                    {/* Glow accent */}
                    <div
                        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20"
                        style={{ background: card.color }}
                    />

                    <div className="flex items-center gap-2 mb-3">
                        <card.icon size={18} style={{ color: card.color }} />
                        <span
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            {card.label}
                        </span>
                    </div>

                    <p
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        {isLoading ? (
                            <span className="inline-block w-24 h-7 rounded bg-white/5 animate-pulse" />
                        ) : (
                            formatCurrency(card.value)
                        )}
                    </p>
                </motion.div>
            ))}

            {/* Saldo Seguro — 4th Live Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.35 }}
                className="modal-panel rounded-[var(--radius-lg)] p-5 relative overflow-hidden"
            >
                {/* Breathing glow */}
                <motion.div
                    animate={{ opacity: [0.15, 0.3, 0.15] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl"
                    style={{ background: affConfig?.color ?? '#3b82f6' }}
                />

                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={18} style={{ color: affConfig?.color ?? 'var(--color-accent)' }} />
                    <span
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: 'var(--color-text-muted)' }}
                    >
                        Saldo Seguro
                    </span>
                </div>

                {isLoading || !affordability ? (
                    <span className="inline-block w-24 h-7 rounded bg-white/5 animate-pulse" />
                ) : (
                    <>
                        <p
                            className="text-2xl font-bold tracking-tight mb-2"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {formatCurrency(affordability.freeBalance)}
                        </p>
                        <div className="flex items-center gap-2">
                            <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: affConfig?.bg, color: affConfig?.color }}
                            >
                                {affConfig?.label}
                            </span>
                            {affordability.daysUntilZero !== null && (
                                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {affordability.daysUntilZero > 90
                                        ? '90+ dias'
                                        : `${affordability.daysUntilZero} dias restantes`}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    )
}
