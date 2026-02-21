import { useEntries } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useLocaleText } from '@/i18n/useLocaleText'

interface Props {
    month: string
}

export function DailySpendChart({ month }: Props) {
    const { txt } = useLocaleText()
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
        <div className="py-2">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                    {txt('Gasto Diario', 'Daily Spending')}
                </h3>
                <span className="text-xs px-3 py-1.5 rounded-full font-medium
                    bg-white/5 text-white/70">
                    {txt('Media', 'Avg')}: {formatCurrency(avgDaily)}/{txt('dia', 'day')}
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
                            labelFormatter={(day) => `${txt('Dia', 'Day')} ${day}`}
                        />
                        <ReferenceLine y={avgDaily} stroke="var(--color-warning)" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <Bar dataKey="amount" radius={[3, 3, 0, 0]} fill="var(--color-danger)" fillOpacity={0.6} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
