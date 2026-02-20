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
    safe: { color: 'var(--color-success)', label: 'Seguro' },
    caution: { color: 'var(--color-warning)', label: 'Cuidado' },
    danger: { color: 'var(--color-danger)', label: 'Perigo' },
} as const

export function SummaryCards({ summary, affordability, isLoading }: Props) {
    const cards = [
        {
            key: 'income',
            label: 'Receitas',
            icon: TrendingUp,
            color: 'var(--color-success)',
            value: summary?.income ?? 0,
        },
        {
            key: 'expenses',
            label: 'Despesas',
            icon: TrendingDown,
            color: 'var(--color-danger)',
            value: summary?.expenses ?? 0,
        },
        {
            key: 'balance',
            label: 'Saldo',
            icon: Scale,
            color: 'var(--color-accent)',
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
                    className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5 relative overflow-hidden"
                >
                    {/* Glow accent */}
                    <div
                        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-[0.12]"
                        style={{ background: card.color }}
                    />

                    <div className="flex items-center gap-2 mb-3 relative">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)` }}>
                            <card.icon size={16} style={{ color: card.color }} />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                            {card.label}
                        </span>
                    </div>

                    <p className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] relative">
                        {isLoading ? (
                            <span className="inline-block w-24 h-7 rounded-lg bg-[var(--color-bg-tertiary)] animate-pulse" />
                        ) : (
                            formatCurrency(card.value)
                        )}
                    </p>
                </motion.div>
            ))}

            {/* Affordability Card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.35 }}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-5 relative overflow-hidden"
            >
                <motion.div
                    animate={{ opacity: [0.08, 0.16, 0.08] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl"
                    style={{ background: affConfig?.color ?? 'var(--color-accent)' }}
                />

                <div className="flex items-center gap-2 mb-3 relative">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `color-mix(in srgb, ${affConfig?.color ?? 'var(--color-accent)'} 12%, transparent)` }}>
                        <ShieldCheck size={16} style={{ color: affConfig?.color ?? 'var(--color-accent)' }} />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                        Saldo Seguro
                    </span>
                </div>

                {isLoading || !affordability ? (
                    <span className="inline-block w-24 h-7 rounded-lg bg-[var(--color-bg-tertiary)] animate-pulse" />
                ) : (
                    <>
                        <p className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] relative mb-2">
                            {formatCurrency(affordability.freeBalance)}
                        </p>
                        <div className="flex items-center gap-2 relative">
                            <span
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border"
                                style={{
                                    background: `color-mix(in srgb, ${affConfig?.color} 10%, transparent)`,
                                    color: affConfig?.color,
                                    borderColor: `color-mix(in srgb, ${affConfig?.color} 15%, transparent)`,
                                }}
                            >
                                {affConfig?.label}
                            </span>
                            {affordability.daysUntilZero !== null && (
                                <span className="text-[10px] text-[var(--color-text-muted)]">
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
