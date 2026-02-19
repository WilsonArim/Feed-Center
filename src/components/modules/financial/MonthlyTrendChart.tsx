import { useEntries } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
    currentMonth: string
}

export function MonthlyTrendChart({ currentMonth }: Props) {
    // Build last 6 months
    const months: string[] = []
    const [year, month] = currentMonth.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
        const d = new Date(year!, month! - 1 - i, 1)
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    // Fetch entries for each month
    const queries = months.map(m => {
        const { data } = useEntries(m)
        return { month: m, entries: data || [] }
    })

    const data = queries.map(q => {
        const label = new Date(q.month + '-01').toLocaleDateString('pt-PT', { month: 'short' })
        const income = q.entries.filter(e => e.type === 'income').reduce((a, e) => a + e.amount, 0)
        const expense = q.entries.filter(e => e.type === 'expense').reduce((a, e) => a + e.amount, 0)
        return { name: label, income, expense }
    })

    return (
        <div className="rounded-xl p-4"
            style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                Tendência 6 meses
            </h3>
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip
                            contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                            formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                        />
                        <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" name="Receitas" />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Despesas" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
