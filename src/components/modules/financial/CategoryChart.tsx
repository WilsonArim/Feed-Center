import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import type { CategoryBreakdown } from '@/services/financialService'
import { formatCurrency } from '@/utils/format'

ChartJS.register(ArcElement, Tooltip, Legend)

const PALETTE = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
]

interface Props {
    breakdown: CategoryBreakdown[] | undefined
    isLoading: boolean
    onCategoryClick?: (category: string) => void
}

export function CategoryChart({ breakdown, isLoading, onCategoryClick }: Props) {
    if (isLoading) {
        return (
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 flex items-center justify-center h-[320px]">
                <div className="w-40 h-40 rounded-full bg-[var(--color-bg-tertiary)] animate-pulse" />
            </div>
        )
    }

    if (!breakdown || breakdown.length === 0) {
        return (
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6 flex items-center justify-center h-[320px]">
                <p className="text-sm text-[var(--color-text-muted)]">
                    Sem despesas este mes
                </p>
            </div>
        )
    }

    const data = {
        labels: breakdown.map((b) => b.category),
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
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4 text-[var(--color-text-primary)]">
                Despesas por Categoria
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
                        {b.category} ({b.percentage}%)
                    </button>
                ))}
            </div>
        </div>
    )
}
