import { useProjectFinancials } from '@/hooks/useFinancial'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/utils/format'
import { DollarSign, Receipt, AlertCircle, Loader2, TrendingDown } from 'lucide-react'

interface ProjectFinanceViewProps {
    projectId: string
    budget?: number
}

export function ProjectFinanceView({ projectId, budget = 0 }: ProjectFinanceViewProps) {
    const { data, isLoading } = useProjectFinancials(projectId)

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white/30" /></div>
    }

    const totalSpent = data?.totalSpent ?? 0
    const remaining = Math.max(0, budget - totalSpent)
    const isOverBudget = budget > 0 && totalSpent > budget
    const entries = data?.entries ?? []

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Budget */}
                <Card className="p-5 flex items-center gap-4 bg-white/5 border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Orçamento</p>
                        <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(budget)}</p>
                    </div>
                </Card>

                {/* Total Spent */}
                <Card className="p-5 flex items-center gap-4 bg-white/5 border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-3 rounded-2xl bg-red-500/20 text-red-400">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Gasto Total</p>
                        <p className="text-2xl font-bold text-white tracking-tight">{formatCurrency(totalSpent)}</p>
                    </div>
                </Card>

                {/* Remaining */}
                <Card className="p-5 flex items-center gap-4 bg-white/5 border-white/10 relative overflow-hidden group">
                    <div className={`absolute inset-0 bg-gradient-to-br transition-opacity opacity-0 group-hover:opacity-100 ${isOverBudget ? 'from-red-500/10' : 'from-green-500/10'}`} />
                    <div className={`p-3 rounded-2xl ${isOverBudget ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {isOverBudget ? <AlertCircle size={24} /> : <Receipt size={24} />}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                            {isOverBudget ? 'Excedido' : 'Restante'}
                        </p>
                        <p className={`text-2xl font-bold tracking-tight ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
                            {formatCurrency(isOverBudget ? totalSpent - budget : remaining)}
                        </p>
                    </div>
                </Card>
            </div>

            {/* Transactions List */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Receipt size={18} className="text-[var(--color-accent)]" />
                    Despesas do Projeto
                </h3>

                {entries.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                        <p className="text-white/30 text-sm">Nenhuma despesa associada a este projeto ainda.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {entries.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg top-0 left-0">
                                        {/* Simple icon based on category for now */}
                                        <div className="text-xl">🧾</div>
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{entry.description || entry.category}</p>
                                        <p className="text-xs text-white/50">{new Date(entry.date).toLocaleDateString('pt-PT')} • {entry.category}</p>
                                    </div>
                                </div>
                                <span className="font-bold text-white">
                                    -{formatCurrency(Number(entry.amount))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
