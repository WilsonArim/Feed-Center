import { useWeb3 } from '@/hooks/useWeb3'
import { formatCurrency } from '@/utils/format'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useLocaleText } from '@/i18n/useLocaleText'

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

export function PortfolioDonut() {
    const { txt } = useLocaleText()
    const { portfolio, isLoadingPortfolio } = useWeb3()

    if (isLoadingPortfolio) {
        return (
            <div className="p-4 animate-pulse h-64 bg-white/5 rounded-2xl" />
        )
    }

    const totalValue = portfolio.reduce((acc, a) => acc + (a.value || 0), 0)
    const sorted = [...portfolio].sort((a, b) => b.value - a.value)
    const top5 = sorted.slice(0, 5)
    const otherValue = sorted.slice(5).reduce((acc, a) => acc + (a.value || 0), 0)

    const data = [
        ...top5.map(a => ({ name: a.symbol, value: a.value })),
        ...(otherValue > 0 ? [{ name: txt('Outros', 'Others'), value: otherValue }] : []),
    ]

    if (data.length === 0) {
        return null
    }

    return (
        <div className="py-8">
            <h3 className="text-xl font-black mb-6 text-white drop-shadow-sm px-4">
                {txt('Alocacao', 'Allocation')}
            </h3>

            <div className="relative h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius="60%"
                            outerRadius="85%"
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm">{txt('Total', 'Total')}</span>
                    <span className="text-2xl font-black text-white drop-shadow-md">
                        {formatCurrency(totalValue)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 justify-center">
                {data.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                        <span className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] opacity-90" style={{ background: COLORS[i % COLORS.length] }} />
                        {d.name} <span className="text-white ml-0.5">{totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(0) : 0}%</span>
                    </span>
                ))}
            </div>
        </div>
    )
}
