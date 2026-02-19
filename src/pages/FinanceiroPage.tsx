import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Wallet, ScanLine } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { SummaryCards } from '@/components/modules/financial/SummaryCards'
import { CategoryChart } from '@/components/modules/financial/CategoryChart'
import { EntryRow } from '@/components/modules/financial/EntryRow'
import { AddEntryModal } from '@/components/modules/financial/AddEntryModal'
import { MonthPicker } from '@/components/modules/financial/MonthPicker'
import { SmartEntryInput } from '@/components/modules/financial/SmartEntryInput'
import { PocketsGrid } from '@/components/modules/financial/PocketsGrid'
import { ScanReceiptModal } from '@/components/modules/financial/ScanReceiptModal'
import { MonthlyTrendChart } from '@/components/modules/financial/MonthlyTrendChart'
import { DailySpendChart } from '@/components/modules/financial/DailySpendChart'
import { AddTodoModal } from '@/components/modules/todo/AddTodoModal'
import {
    useEntries,
    useMonthSummary,
    useCategoryBreakdown,
    useAffordabilityScore,
    useCreateEntry,
    useUpdateEntry,
    useDeleteEntry,
} from '@/hooks/useFinancial'
import { useCreateTodo } from '@/hooks/useTodos'
import { useAuth } from '@/components/core/AuthProvider'
import type { FinancialEntry, CreateEntryInput, EntryType } from '@/types'

function currentMonth() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceiroPage() {
    const { user } = useAuth()
    const [month, setMonth] = useState(currentMonth())
    const [modalOpen, setModalOpen] = useState(false)
    const [scanModalOpen, setScanModalOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>()

    // Todo Integration State
    const [todoModalOpen, setTodoModalOpen] = useState(false)
    const [todoInitialData, setTodoInitialData] = useState<{ title: string; description: string } | undefined>()

    const entries = useEntries(month, categoryFilter ? { category: categoryFilter } : undefined)
    const summary = useMonthSummary(month)
    const breakdown = useCategoryBreakdown(month)
    const affordability = useAffordabilityScore(month)
    const createEntry = useCreateEntry(month)
    const updateEntry = useUpdateEntry(month)
    const deleteEntry = useDeleteEntry(month)
    const createTodo = useCreateTodo()

    const handleSubmit = async (input: CreateEntryInput) => {
        if (editingEntry) {
            await updateEntry.mutateAsync({ id: editingEntry.id, input })
        } else {
            await createEntry.mutateAsync(input)
        }
        setModalOpen(false)
        setEditingEntry(null)
    }

    const handleEdit = (entry: FinancialEntry) => {
        setEditingEntry(entry)
        setModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        await deleteEntry.mutateAsync(id)
    }

    const handleCategoryClick = (cat: string) => {
        setCategoryFilter(categoryFilter === cat ? undefined : cat)
    }

    const handleSmartEntry = async (data: { description: string; amount: number; category: string; type: EntryType }) => {
        const today = new Date().toISOString().split('T')[0] ?? ''
        await createEntry.mutateAsync({
            type: data.type,
            amount: data.amount,
            category: data.category,
            description: data.description,
            date: today,
        })
    }

    // Handle the scanned receipt data
    const handleScanConfirm = async (data: { amount: number; merchant: string; date: string; category: string }) => {
        await createEntry.mutateAsync({
            type: 'expense', // Receipts are usually expenses
            amount: data.amount,
            category: data.category,
            description: data.merchant, // Use merchant as description
            date: data.date,
        })
    }

    const handleAddToTodo = (data: { amount: number; merchant: string; date: string; category: string }) => {
        setTodoInitialData({
            title: `${data.merchant} - ${data.amount}€`,
            description: `Despesa pendente.\nData: ${data.date}\nCategoria: ${data.category}\nValor Original: ${data.amount}€`
        })
        setTodoModalOpen(true)
    }

    const handleTodoSubmit = async (data: any) => {
        if (!user) return
        await createTodo.mutateAsync({
            ...data,
            user_id: user.id
        })
        setTodoModalOpen(false)
    }

    return (
        <div className="p-6 pt-20 w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1
                        className="text-2xl font-bold tracking-tight"
                        style={{ color: 'var(--color-text-primary)' }}
                    >
                        Controlo Financeiro
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Controla os teus gastos e rendimentos com inteligência
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <MonthPicker month={month} onChange={setMonth} />

                    {/* Scan Button */}
                    <StardustButton
                        size="sm"
                        variant="ghost"
                        icon={<ScanLine size={16} />}
                        onClick={() => setScanModalOpen(true)}
                    >
                        Scan
                    </StardustButton>

                    <StardustButton
                        size="sm"
                        icon={<Plus size={16} />}
                        onClick={() => { setEditingEntry(null); setModalOpen(true) }}
                    >
                        Nova Entrada
                    </StardustButton>
                </div>
            </div>

            {/* Smart Entry Input */}
            <div className="mb-6">
                <SmartEntryInput onSubmit={handleSmartEntry} isLoading={createEntry.isPending} />
            </div>

            {/* Summary Cards (Live Cards) */}
            <div className="mb-6">
                <SummaryCards
                    summary={summary.data}
                    affordability={affordability.data}
                    isLoading={summary.isLoading}
                />
            </div>

            {/* Body: Chart + Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                {/* Chart */}
                <div>
                    <CategoryChart
                        breakdown={breakdown.data}
                        isLoading={breakdown.isLoading}
                        onCategoryClick={handleCategoryClick}
                    />
                </div>

                {/* Entries */}
                <div className="glass rounded-[var(--radius-lg)]">
                    {/* List header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                Movimentos
                            </h3>
                            {categoryFilter && (
                                <button
                                    onClick={() => setCategoryFilter(undefined)}
                                    className="text-xs px-2 py-0.5 rounded-full cursor-pointer"
                                    style={{
                                        background: 'var(--color-accent-soft)',
                                        color: 'var(--color-accent)',
                                    }}
                                >
                                    {categoryFilter} ✕
                                </button>
                            )}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {entries.data?.length ?? 0} registos
                        </span>
                    </div>

                    {/* List */}
                    {entries.isLoading ? (
                        <div className="p-8 space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-14 rounded-[var(--radius-md)] bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : entries.data && entries.data.length > 0 ? (
                        <div className="py-1">
                            <AnimatePresence mode="popLayout">
                                {entries.data.map((entry) => (
                                    <EntryRow
                                        key={entry.id}
                                        entry={entry}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-16 gap-4"
                        >
                            <Wallet size={40} style={{ color: 'var(--color-text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                Sem movimentos este mês
                            </p>
                            <div className="flex gap-2">
                                <StardustButton
                                    size="sm"
                                    icon={<Plus size={16} />}
                                    onClick={() => { setEditingEntry(null); setModalOpen(true) }}
                                >
                                    Adicionar
                                </StardustButton>
                                <StardustButton
                                    size="sm"
                                    variant="ghost"
                                    icon={<ScanLine size={16} />}
                                    onClick={() => setScanModalOpen(true)}
                                >
                                    Scan
                                </StardustButton>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <MonthlyTrendChart currentMonth={month} />
                <DailySpendChart month={month} />
            </div>

            {/* Pockets Grid */}
            <div className="mt-8">
                <PocketsGrid />
            </div>

            {/* Manual Entry Modal */}
            <AddEntryModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingEntry(null) }}
                onSubmit={handleSubmit}
                isLoading={createEntry.isPending || updateEntry.isPending}
                editingEntry={editingEntry}
            />

            {/* Scan Receipt Modal */}
            <ScanReceiptModal
                open={scanModalOpen}
                onClose={() => setScanModalOpen(false)}
                onConfirm={handleScanConfirm}
                onAddToTodo={handleAddToTodo}
            />

            {/* Add Todo Modal (Integration) */}
            <AddTodoModal
                isOpen={todoModalOpen}
                onClose={() => setTodoModalOpen(false)}
                onSubmit={handleTodoSubmit}
                isLoading={createTodo.isPending}
                initialData={todoInitialData}
            />
        </div>
    )
}
