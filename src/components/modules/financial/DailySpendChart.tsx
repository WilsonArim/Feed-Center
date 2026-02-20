import { useEntries } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface Props {
    month: string
}

export function DailySpendChart({ month }: Props) {
    const { data: entries = [] } = useEntries(month)

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
        <div className="rounded-2xl p-5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Gasto Diario
                </h3>
                <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium
                    bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                    Media: {formatCurrency(avgDaily)}/dia
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
                            contentStyle={{
                                background: 'var(--color-bg-primary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 12,
                                fontSize: 12,
                                color: 'var(--color-text-primary)',
                            }}
                            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                            labelFormatter={(day) => `Dia ${day}`}
                        />
                        <ReferenceLine y={avgDaily} stroke="var(--color-warning)" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <Bar dataKey="amount" radius={[3, 3, 0, 0]} fill="var(--color-danger)" fillOpacity={0.6} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
