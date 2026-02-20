import { useWeb3 } from '@/hooks/useWeb3'
import { formatCurrency } from '@/utils/format'
import { TrendingUp, TrendingDown, Bitcoin } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['var(--color-accent)', 'var(--color-warning)', 'var(--color-secondary)', 'var(--color-success)', 'var(--color-danger)', '#06b6d4']

export function CryptoWidget() {
    const { portfolio, isLoadingPortfolio } = useWeb3()

    if (isLoadingPortfolio) {
        return (
            <div className="flex items-center justify-center h-full animate-pulse">
                <Bitcoin size={24} className="text-[var(--color-text-muted)] opacity-40" />
            </div>
        )
    }

    const totalValue = portfolio.reduce((acc, asset) => acc + (asset.value || 0), 0)
    const topAssets = [...portfolio].sort((a, b) => b.value - a.value).slice(0, 5)

    const portfolioChange = totalValue > 0
        ? portfolio.reduce((acc, a) => acc + (a.price_change_24h ?? 0) * (a.value / totalValue), 0)
        : 0

    const barData = topAssets.map(a => ({
        name: a.symbol,
        pct: totalValue > 0 ? (a.value / totalValue) * 100 : 0,
    }))

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    Portfolio
                </div>
                <div className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
                    {formatCurrency(totalValue)}
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 ${
                        portfolioChange >= 0
                            ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/15'
                            : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/15'
                    }`}>
                        {portfolioChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
                    </span>
                </div>
            </div>

            {barData.length > 0 && (
                <div className="mt-3">
                    <div className="h-10 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barCategoryGap="20%">
                                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                                    {barData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {barData.map((d, i) => (
                            <span key={d.name} className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                                <span className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                                {d.name} {d.pct.toFixed(0)}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
