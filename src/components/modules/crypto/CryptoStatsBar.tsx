import { TrendingUp, TrendingDown, Coins } from 'lucide-react'
import { useWeb3 } from '@/hooks/useWeb3'
import { formatCurrency } from '@/utils/format'

export function CryptoStatsBar() {
    const { portfolio, isLoadingPortfolio } = useWeb3()

    if (isLoadingPortfolio) {
        return (
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-xl animate-pulse"
                        style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }} />
                ))}
            </div>
        )
    }

    const totalValue = portfolio.reduce((acc, a) => acc + (a.value || 0), 0)
    const totalAssets = portfolio.length

    const weightedChange = totalValue > 0
        ? portfolio.reduce((acc, a) => acc + (a.price_change_24h ?? 0) * (a.value / totalValue), 0)
        : 0

    const stats = [
        {
            label: 'Portfolio Total',
            value: formatCurrency(totalValue),
            icon: <Coins size={16} />,
            color: 'var(--color-accent)',
        },
        {
            label: 'Variação 24h',
            value: `${weightedChange >= 0 ? '+' : ''}${weightedChange.toFixed(2)}%`,
            icon: weightedChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />,
            color: weightedChange >= 0 ? '#22c55e' : '#ef4444',
        },
        {
            label: 'Ativos',
            value: String(totalAssets),
            icon: <Coins size={16} />,
            color: '#8b5cf6',
        },
    ]

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map(s => (
                <div key={s.label} className="rounded-xl p-3.5 transition-all"
                    style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span style={{ color: s.color }}>{s.icon}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
                    </div>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
