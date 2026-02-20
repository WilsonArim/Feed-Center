import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Wallet, ScanLine, AlertCircle } from 'lucide-react'
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
import { NextActionsStrip, PageHeader, PageSectionHeader, StateCard } from '@/components/core/PagePrimitives'

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

    const handleScanConfirm = async (data: { amount: number; merchant: string; date: string; category: string }) => {
        await createEntry.mutateAsync({
            type: 'expense',
            amount: data.amount,
            category: data.category,
            description: data.merchant,
            date: data.date,
        })
    }

    const handleAddToTodo = (data: { amount: number; merchant: string; date: string; category: string }) => {
        setTodoInitialData({
            title: `${data.merchant} - ${data.amount}`,
            description: `Despesa pendente.\nData: ${data.date}\nCategoria: ${data.category}\nValor Original: ${data.amount}`
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
        <div className="w-full space-y-6 pb-12">
            {/* Header */}
            <PageHeader
                icon={<Wallet size={18} />}
                title="Controlo Financeiro"
                subtitle="Transforma movimentos em decisoes claras de caixa e prioridade."
                actions={(
                    <>
                        <MonthPicker month={month} onChange={setMonth} />
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
                    </>
                )}
            />

            {/* Smart Entry Input */}
            <PageSectionHeader
                title="Registo Rapido"
                subtitle="Adiciona movimentos com linguagem natural."
            />
            <SmartEntryInput onSubmit={handleSmartEntry} isLoading={createEntry.isPending} />

            {/* Summary Cards */}
            <PageSectionHeader
                title="Leitura do Mes"
                subtitle="Resumo imediato de saldo, despesas e capacidade de compra."
            />
            <SummaryCards
                summary={summary.data}
                affordability={affordability.data}
                isLoading={summary.isLoading}
            />

            {/* Body: Chart + Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                <div>
                    <CategoryChart
                        breakdown={breakdown.data}
                        isLoading={breakdown.isLoading}
                        onCategoryClick={handleCategoryClick}
                    />
                </div>

                <div className="glass-card-static overflow-hidden">
                    {/* List header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Movimentos
                            </h3>
                            {categoryFilter && (
                                <button
                                    onClick={() => setCategoryFilter(undefined)}
                                    className="text-xs px-2.5 py-0.5 rounded-lg cursor-pointer
                                        bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/15
                                        hover:bg-[var(--color-accent)]/15 transition-colors"
                                >
                                    {categoryFilter} x
                                </button>
                            )}
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)]">
                            {entries.data?.length ?? 0} registos
                        </span>
                    </div>

                    {/* List */}
                    {entries.isLoading ? (
                        <div className="p-5 space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-14 rounded-xl bg-[var(--color-bg-tertiary)] animate-pulse" />
                            ))}
                        </div>
                    ) : entries.isError ? (
                        <div className="p-4">
                            <StateCard
                                title="Falha ao carregar movimentos"
                                message="Nao foi possivel ler os registos financeiros agora."
                                icon={<AlertCircle size={18} />}
                                actionLabel="Tentar novamente"
                                onAction={() => { void entries.refetch() }}
                            />
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
                            <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center">
                                <Wallet size={28} className="text-[var(--color-text-muted)]" />
                            </div>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                Sem movimentos este mes
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyTrendChart currentMonth={month} />
                <DailySpendChart month={month} />
            </div>

            {/* Pockets Grid */}
            <PocketsGrid />

            <NextActionsStrip
                title="Proxima melhoria financeira recomendada"
                actions={[
                    { label: 'Registar movimento', to: '/financeiro' },
                    { label: 'Criar tarefa financeira', to: '/todo' },
                    { label: 'Rever dashboard', to: '/' },
                ]}
            />

            {/* Modals */}
            <AddEntryModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setEditingEntry(null) }}
                onSubmit={handleSubmit}
                isLoading={createEntry.isPending || updateEntry.isPending}
                editingEntry={editingEntry}
            />

            <ScanReceiptModal
                open={scanModalOpen}
                onClose={() => setScanModalOpen(false)}
                onConfirm={handleScanConfirm}
                onAddToTodo={handleAddToTodo}
            />

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
