import { useMonthSummary } from '@/hooks/useFinancial'
import { formatCurrency } from '@/utils/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

// Simulated sparkline data (7 days) based on summary
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
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: summary, isLoading, error } = useMonthSummary(currentMonth)

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 animate-pulse">
                <div className="h-8 w-24 bg-white/10 rounded" />
                <div className="h-4 w-32 bg-white/5 rounded" />
            </div>
        )
    }

    if (error) {
        return <div className="text-red-400 text-xs">Erro ao carregar dados financeiros.</div>
    }

    const { income = 0, expenses = 0, balance = 0 } = summary || {}
    const sparkData = generateSparkline(income, expenses)

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">
                    Saldo ({new Date().toLocaleDateString('pt-PT', { month: 'long' })})
                </div>
                <div className="text-2xl font-bold tracking-tight text-white">
                    {formatCurrency(balance)}
                </div>
            </div>

            {/* Sparkline */}
            <div className="h-12 mt-2 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                        <defs>
                            <linearGradient id="sparkIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="sparkExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={1.5} fill="url(#sparkIncome)" dot={false} />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={1.5} fill="url(#sparkExpense)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-green-400 mb-1">
                        <TrendingUp size={12} />
                        <span>Receitas</span>
                    </div>
                    <div className="font-semibold text-white/90">
                        {formatCurrency(income)}
                    </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                    <div className="flex items-center gap-1.5 text-xs text-red-400 mb-1">
                        <TrendingDown size={12} />
                        <span>Despesas</span>
                    </div>
                    <div className="font-semibold text-white/90">
                        {formatCurrency(expenses)}
                    </div>
                </div>
            </div>
        </div>
    )
}
