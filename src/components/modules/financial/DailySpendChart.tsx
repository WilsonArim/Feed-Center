import { useEntries } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface Props {
    month: string
}

export function DailySpendChart({ month }: Props) {
    const { data: entries = [] } = useEntries(month)

    // Build daily spending
    const [year, mon] = month.split('-').map(Number)
    const daysInMonth = new Date(year!, mon!, 0).getDate()
    const today = new Date().getDate()

    const dailyMap: Record<number, number> = {}
    for (const e of entries) {
        if (e.type === 'expense') {
            const day = new Date(e.date).getDate()
            dailyMap[day] = (dailyMap[day] || 0) + e.amount
        }
    }

    const data = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        amount: dailyMap[i + 1] || 0,
        isToday: i + 1 === today,
    }))

    const avgDaily = data.reduce((a, d) => a + d.amount, 0) / Math.max(today, 1)

    return (
        <div className="rounded-xl p-4"
            style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Gasto Diário
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                    Média: {formatCurrency(avgDaily)}/dia
                </span>
            </div>
            <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barCategoryGap="15%">
                        <XAxis
                            dataKey="day"
                            tick={{ fill: 'var(--color-text-muted)', fontSize: 8 }}
                            axisLine={false}
                            tickLine={false}
                            interval={4}
                        />
                        <Tooltip
                            contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                            labelFormatter={(day) => `Dia ${day}`}
                        />
                        <ReferenceLine y={avgDaily} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <Bar dataKey="amount" radius={[2, 2, 0, 0]} fill="#ef4444" fillOpacity={0.6} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
