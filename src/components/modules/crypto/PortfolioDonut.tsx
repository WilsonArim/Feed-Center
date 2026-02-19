import { useWeb3 } from '@/hooks/useWeb3'
import { formatCurrency } from '@/utils/format'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

export function PortfolioDonut() {
    const { portfolio, isLoadingPortfolio } = useWeb3()

    if (isLoadingPortfolio) {
        return (
            <div className="rounded-xl p-4 animate-pulse h-64"
                style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }} />
        )
    }

    const totalValue = portfolio.reduce((acc, a) => acc + (a.value || 0), 0)
    const sorted = [...portfolio].sort((a, b) => b.value - a.value)
    const top5 = sorted.slice(0, 5)
    const otherValue = sorted.slice(5).reduce((acc, a) => acc + (a.value || 0), 0)

    const data = [
        ...top5.map(a => ({ name: a.symbol, value: a.value })),
        ...(otherValue > 0 ? [{ name: 'Outros', value: otherValue }] : []),
    ]

    if (data.length === 0) {
        return null
    }

    return (
        <div className="rounded-xl p-4"
            style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Alocação
            </h3>

            <div className="relative h-48">
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
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                    <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {formatCurrency(totalValue)}
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {data.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {d.name} ({totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(0) : 0}%)
                    </span>
                ))}
            </div>
        </div>
    )
}
