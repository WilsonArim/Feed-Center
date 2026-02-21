import { useMonthSummary } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useLocaleText } from '@/i18n/useLocaleText'

function generateSparkline(income: number, expenses: number) {
    const days = 7
    const data = []
    for (let i = 0; i < days; i++) {
        const factor = 0.7 + Math.sin(i * 0.8) * 0.3
        data.push({
            day: i,
            income: Math.round((income / days) * factor * 100) / 100,
            expense: Math.round((expenses / days) * (1.1 - factor * 0.2) * 100) / 100,
        })
    }
    return data
}

export function FinancialWidget() {
    const { txt, isEnglish } = useLocaleText()
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary, isLoading, error } = useMonthSummary(currentMonth)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-8 w-24 bg-[var(--color-bg-tertiary)] rounded-lg" />
                <div className="h-4 w-32 bg-[var(--color-bg-tertiary)] rounded-lg" />
            </div>
        )
    }

    if (error) {
        return <div className="text-[var(--color-danger)] text-xs">{txt('Erro ao carregar dados financeiros.', 'Error loading financial data.')}</div>
    }

    const { income = 0, expenses = 0, balance = 0 } = summary || {}
    const sparkData = generateSparkline(income, expenses)

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                    {txt('Saldo', 'Balance')} ({new Date().toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT', { month: 'long' })})
                </div>
                <div className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    {formatCurrency(balance)}
                </div>
            </div>

            {/* Sparkline */}
            <div className="h-12 mt-3 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id="sparkIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="sparkExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-danger)" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="var(--color-danger)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="income" stroke="var(--color-success)" strokeWidth={1.5} fill="url(#sparkIncome)" dot={false} />
                        <Area type="monotone" dataKey="expense" stroke="var(--color-danger)" strokeWidth={1.5} fill="url(#sparkExpense)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-[var(--color-success)]/8 rounded-xl p-2.5 border border-[var(--color-success)]/10">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-success)] mb-1">
                        <TrendingUp size={12} />
                        <span className="font-medium">{txt('Receitas', 'Income')}</span>
                    </div>
                    <div className="font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(income)}
                    </div>
                </div>
                <div className="bg-[var(--color-danger)]/8 rounded-xl p-2.5 border border-[var(--color-danger)]/10">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] mb-1">
                        <TrendingDown size={12} />
                        <span className="font-medium">{txt('Despesas', 'Expenses')}</span>
                    </div>
                    <div className="font-semibold text-[var(--color-text-primary)]">
                        {formatCurrency(expenses)}
                    </div>
                </div>
            </div>
        </div>
    )
}
