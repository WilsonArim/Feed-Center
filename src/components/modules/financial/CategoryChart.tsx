import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { motion } from 'framer-motion'
import type { CategoryBreakdown } from '@/services/financialService'
import { formatCurrency } from '@/utils/format'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = [
    '#FF5500', // Premium Signal Orange
    '#FF7733',
    '#FF9966',
    '#FFBB99',
    '#DD4A00',
    '#52525B', // Obsidian/Zinc 600
    '#71717A', // Zinc 500
    '#A1A1AA', // Zinc 400
    '#3F3F46', // Zinc 700
]

interface Props {
    breakdown: CategoryBreakdown[] | undefined
    isLoading: boolean
    onCategoryClick?: (category: string) => void
}

export function CategoryChart({ breakdown, isLoading, onCategoryClick }: Props) {
    const { txt, isEnglish } = useLocaleText()
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[320px]">
                <div className="w-40 h-40 rounded-full bg-white/5 animate-pulse" />
            </div>
        )
    }

    if (!breakdown || breakdown.length === 0) {
        return (
            <div className="flex items-center justify-center h-[320px]">
                <p className="text-sm font-medium text-[var(--color-text-muted)] tracking-widest uppercase">
                    {txt('Sem despesas este mes', 'No expenses this month')}
                </p>
            </div>
        )
    }

    const data = {
        labels: breakdown.map((b) => localizeFinancialCategory(b.category, isEnglish)),
        datasets: [
            {
                data: breakdown.map((b) => b.total),
                backgroundColor: breakdown.map((_, i) => PALETTE[i % PALETTE.length]),
                borderWidth: 0,
                hoverBorderWidth: 2,
                hoverBorderColor: 'var(--color-text-primary)',
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(10, 15, 30, 0.95)',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                callbacks: {
                    label: (ctx: { parsed: number }) => ` ${formatCurrency(ctx.parsed)}`,
                },
            },
        },
        onClick: (_: unknown, elements: Array<{ index: number }>) => {
            const el = elements[0]
            if (el && onCategoryClick && breakdown) {
                const cat = breakdown[el.index]
                if (cat) onCategoryClick(cat.category)
            }
        },
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ type: 'spring' as const, damping: 22, stiffness: 180, delay: 0.2 }}
        >
            <h3 className="text-2xl font-black tracking-tight mb-8 text-white drop-shadow-md">
                {txt('Despesas por Categoria', 'Expenses by Category')}
            </h3>

            <div className="h-[220px] mb-4">
                <Doughnut data={data} options={options} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
                {breakdown.map((b, i) => (
                    <button
                        key={b.category}
                        onClick={() => onCategoryClick?.(b.category)}
                        className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80 cursor-pointer text-[var(--color-text-secondary)]"
                    >
                        <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: PALETTE[i % PALETTE.length] }}
                        />
                        {localizeFinancialCategory(b.category, isEnglish)} ({b.percentage}%)
                    </button>
                ))}
            </div>
        </motion.div>
    )
}
