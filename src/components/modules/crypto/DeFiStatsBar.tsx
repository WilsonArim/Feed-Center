import { TrendingUp, Droplets, Flame } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'

interface DexPair {
    baseToken: { symbol: string }
    priceChange: { h24: number }
    volume: { h24: number }
    liquidity: { usd: number }
}

interface Props {
    pairs: DexPair[]
    isLoading: boolean
}

export function DeFiStatsBar({ pairs, isLoading }: Props) {
    const { txt } = useLocaleText()
    if (isLoading || pairs.length === 0) {
        return (
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-xl animate-pulse"
                        style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }} />
                ))}
            </div>
        )
    }

    const topGainer = [...pairs].sort((a, b) => b.priceChange.h24 - a.priceChange.h24)[0]
    const topVolume = [...pairs].sort((a, b) => b.volume.h24 - a.volume.h24)[0]
    const totalLiquidity = pairs.reduce((acc, p) => acc + (p.liquidity?.usd || 0), 0)

    const fmtM = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`

    const stats = [
        {
            label: txt('Top valorizacao 24h', 'Top Gainer 24h'),
            value: topGainer ? `${topGainer.baseToken.symbol} +${topGainer.priceChange.h24.toFixed(1)}%` : '—',
            icon: <TrendingUp size={16} />,
            color: '#22c55e',
        },
        {
            label: txt('Liquidez Total', 'Total Liquidity'),
            value: fmtM(totalLiquidity),
            icon: <Droplets size={16} />,
            color: '#3b82f6',
        },
        {
            label: txt('Mais Volume', 'Highest Volume'),
            value: topVolume ? `${topVolume.baseToken.symbol} ${fmtM(topVolume.volume.h24)}` : '—',
            icon: <Flame size={16} />,
            color: '#f59e0b',
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
                    <div className="text-sm font-bold truncate" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
