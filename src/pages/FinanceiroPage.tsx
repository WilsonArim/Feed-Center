import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Wallet, ScanLine, AlertCircle, ClipboardPlus, ListTodo } from 'lucide-react'
import { NavLink } from 'react-router'
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
import { Magnetic } from '@/components/ui/Magnetic'
import { AddTodoModal } from '@/components/modules/todo/AddTodoModal'
import {
    useEntries,
    useMonthSummary,
    useCategoryBreakdown,
    useMerchantInsights,
    useItemInflationInsights,
    useAffordabilityScore,
    useCreateEntry,
    useUpdateEntry,
    useDeleteEntry,
} from '@/hooks/useFinancial'
import { useCreateTodo } from '@/hooks/useTodos'
import { useAuth } from '@/components/core/AuthProvider'
import type { FinancialEntry, CreateEntryInput, EntryType } from '@/types'
import { NextActionsStrip, PageHeader, StateCard } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'
import { formatCurrency } from '@/utils/format'
import { useShowMerchantInsights } from '@/hooks/useUserSettings'
import { financialService } from '@/services/financialService'
import type { OCRReceiptItem } from '@/services/ocrService'

function currentMonth() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceiroPage() {
    const { txt, isEnglish } = useLocaleText()
    const { user } = useAuth()
    const [month, setMonth] = useState(currentMonth())
    const [modalOpen, setModalOpen] = useState(false)
    const [scanModalOpen, setScanModalOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>()

    const [todoModalOpen, setTodoModalOpen] = useState(false)
    const [todoInitialData, setTodoInitialData] = useState<{ title: string; description: string } | undefined>()
    const [undoEntry, setUndoEntry] = useState<FinancialEntry | null>(null)
    const undoTimeoutRef = useRef<number | null>(null)

    const entries = useEntries(month, categoryFilter ? { category: categoryFilter } : undefined)
    const summary = useMonthSummary(month)
    const breakdown = useCategoryBreakdown(month)
    const showMerchantInsightsQuery = useShowMerchantInsights()
    const showMerchantInsights = showMerchantInsightsQuery.data ?? false
    const merchantInsights = useMerchantInsights(month, showMerchantInsights)
    const itemInflationInsights = useItemInflationInsights(month, showMerchantInsights)
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

    const clearUndoTimer = () => {
        if (undoTimeoutRef.current !== null) {
            window.clearTimeout(undoTimeoutRef.current)
            undoTimeoutRef.current = null
        }
    }

    const scheduleUndo = (entry: FinancialEntry) => {
        clearUndoTimer()
        setUndoEntry(entry)
        undoTimeoutRef.current = window.setTimeout(() => {
            setUndoEntry(null)
            undoTimeoutRef.current = null
        }, 8000)
    }

    const handleScanConfirm = async (data: { amount: number; merchant: string; nif?: string | null; receiptItems?: OCRReceiptItem[]; date: string; category: string; type: EntryType; isRecurring?: boolean; buggyAlert?: boolean }) => {
        const created = await createEntry.mutateAsync({
            type: data.type,
            amount: data.amount,
            category: data.category,
            description: data.merchant,
            receipt_merchant: data.merchant,
            receipt_nif: data.nif ?? undefined,
            date: data.date,
            is_recurring: data.isRecurring ?? false,
            buggy_alert: data.buggyAlert ?? false,
        })

        if (user && data.receiptItems && data.receiptItems.length > 0) {
            await financialService.replaceReceiptItems(user.id, created.id, {
                purchasedAt: data.date,
                merchant: data.merchant,
                nif: data.nif ?? null,
                items: data.receiptItems,
            })
            if (showMerchantInsights) {
                void merchantInsights.refetch()
                void itemInflationInsights.refetch()
            }
        }

        scheduleUndo(created)
    }

    const handleAddToTodo = (data: { amount: number; merchant: string; nif?: string | null; date: string; category: string; type: EntryType }) => {
        const categoryLabel = localizeFinancialCategory(data.category, isEnglish)
        const typeLabel = data.type === 'income'
            ? txt('Receita', 'Income')
            : data.type === 'bill'
                ? txt('Despesa Fixa', 'Bill')
                : txt('Despesa', 'Expense')
        setTodoInitialData({
            title: `${data.merchant} - ${data.amount}`,
            description: `${txt('Movimento pendente.', 'Pending transaction.')}\n${txt('Tipo', 'Type')}: ${typeLabel}\n${txt('Data', 'Date')}: ${data.date}\n${txt('Categoria', 'Category')}: ${categoryLabel}\nNIF: ${data.nif ?? '-'}\n${txt('Valor Original', 'Original amount')}: ${data.amount}`
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

    const handleUndoLastScan = async () => {
        if (!undoEntry) return
        await deleteEntry.mutateAsync(undoEntry.id)
        clearUndoTimer()
        setUndoEntry(null)
    }

    useEffect(() => {
        return () => clearUndoTimer()
    }, [])

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-40 space-y-8">
            {/* Header */}
            <PageHeader
                icon={<Wallet size={18} />}
                title={txt('Controlo Financeiro', 'Financial Control')}
                subtitle={txt('Transforma movimentos em decisoes claras de caixa e prioridade.', 'Turn transactions into clear cash and priority decisions.')}
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
                            {txt('Nova Entrada', 'New Entry')}
                        </StardustButton>
                    </>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Magnetic strength={0.1}>
                    <button
                        type="button"
                        onClick={() => setScanModalOpen(true)}
                        className="group relative text-left py-6 px-4 hover:z-20 cursor-pointer w-full"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-5">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_0_20px_rgba(255,90,0,0.15)] group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-text)] group-hover:shadow-[0_0_25px_var(--accent)] transition-all duration-300">
                                    <ScanLine size={24} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-md group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] transition-all">
                                    {txt('Digitalizar talão', 'Scan receipt')}
                                </h3>
                            </div>
                            <p className="text-sm font-medium text-[var(--color-text-secondary)] leading-relaxed max-w-[280px]">
                                {txt('Captura valor, comerciante, NIF e linhas de item em segundos.', 'Capture amount, merchant, VAT/NIF, and line items in seconds.')}
                            </p>
                        </div>
                    </button>
                </Magnetic>

                <button
                    type="button"
                    onClick={() => { setEditingEntry(null); setModalOpen(true) }}
                    className="group relative text-left py-6 px-2 hover:z-20 cursor-pointer"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#FF9D00]/10 text-[#FF9D00] drop-shadow-[0_0_15px_rgba(255,157,0,0.2)] group-hover:scale-110 group-hover:bg-[#FF9D00] group-hover:text-black transition-all duration-300">
                                <ClipboardPlus size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
                                {txt('Registo manual rápido', 'Quick manual entry')}
                            </h3>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-[280px]">
                            {txt('Adiciona uma entrada em menos de 10 segundos com defaults inteligentes.', 'Add a transaction in under 10 seconds with smart defaults.')}
                        </p>
                    </div>
                </button>

                <NavLink
                    to="/todo"
                    className="group relative text-left py-6 px-2 hover:z-20"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--color-success)]/10 text-[var(--color-success)] drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-110 group-hover:bg-[var(--color-success)] group-hover:text-black transition-all duration-300">
                                <ListTodo size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all">
                                {txt('Criar tarefa de seguimento', 'Create follow-up task')}
                            </h3>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-[280px]">
                            {txt('Transforma movimentos em ações imediatas e não deixes pendências soltas.', 'Turn transactions into immediate actions and avoid loose ends.')}
                        </p>
                    </div>
                </NavLink>
            </div>

            {/* Smart Entry Input */}
            <div className="pt-8">
                <h2 className="text-3xl font-black tracking-tight text-white mb-2">
                    {txt('Registo Rapido', 'Quick Entry')}
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)] mb-6">
                    {txt('Adiciona movimentos com linguagem natural.', 'Add transactions with natural language.')}
                </p>
            </div>

            <AnimatePresence>
                {undoEntry && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-4 py-3 flex flex-wrap items-center gap-3"
                    >
                        <p className="text-sm text-[var(--color-text-primary)]">
                            {txt('Movimento adicionado.', 'Transaction added.')} {txt('Se foi engano, podes desfazer agora.', 'If this was a mistake, you can undo now.')}
                        </p>
                        <button
                            onClick={() => { void handleUndoLastScan() }}
                            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/15 transition-colors cursor-pointer"
                        >
                            {txt('Desfazer', 'Undo')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <SmartEntryInput onSubmit={handleSmartEntry} isLoading={createEntry.isPending} />

            {/* Summary Cards */}
            <div className="pt-12">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 drop-shadow-lg">
                    {txt('Leitura do Mes', 'Month Snapshot')}
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-2xl">
                    {txt('Resumo imediato de saldo, despesas e capacidade de compra.', 'Immediate summary of balance, spending, and buying capacity.')}
                </p>
            </div>
            <SummaryCards
                summary={summary.data}
                affordability={affordability.data}
                isLoading={summary.isLoading}
            />

            {showMerchantInsights && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-8">
                    <div className="group/insight relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/insight:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white drop-shadow-sm">
                                    {txt('Histórico por Loja', 'Store Spend History')}
                                </h3>
                                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    {txt('vs Mês Anterior', 'vs Previous Month')}
                                </span>
                            </div>

                            {merchantInsights.isLoading ? (
                                <div className="p-5 space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-12 rounded-xl bg-[var(--color-bg-tertiary)] animate-pulse" />
                                    ))}
                                </div>
                            ) : merchantInsights.isError ? (
                                <div className="p-4">
                                    <StateCard
                                        title={txt('Falha ao carregar histórico por loja', 'Failed to load store history')}
                                        message={txt('Não foi possível calcular estes insights agora.', 'Could not calculate these insights right now.')}
                                        icon={<AlertCircle size={18} />}
                                        actionLabel={txt('Tentar novamente', 'Try again')}
                                        onAction={() => { void merchantInsights.refetch() }}
                                    />
                                </div>
                            ) : (merchantInsights.data?.length ?? 0) === 0 ? (
                                <div className="py-8 text-sm text-[var(--color-text-secondary)]">
                                    {txt('Sem dados suficientes neste mês para histórico por comerciante.', 'Not enough data this month for merchant history.')}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {merchantInsights.data?.map((row) => {
                                        const inflation = row.inflationPct
                                        const inflationTone = inflation === null
                                            ? 'text-[var(--color-text-muted)]'
                                            : inflation >= 3
                                                ? 'text-[var(--color-danger)]'
                                                : inflation <= -3
                                                    ? 'text-[var(--color-success)]'
                                                    : 'text-[var(--color-warning)]'
                                        const inflationLabel = inflation === null
                                            ? txt('dados insuficientes', 'insufficient data')
                                            : inflation > 0
                                                ? `+${inflation.toFixed(1)}%`
                                                : `${inflation.toFixed(1)}%`

                                        return (
                                            <div key={`${row.merchant}-${row.nif ?? 'no-nif'}`} className="p-4 rounded-xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/10 flex flex-col gap-2 group/row">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white truncate drop-shadow-sm group-hover/row:text-[var(--accent)] transition-colors">{row.merchant}</p>
                                                        <p className="text-xs font-medium text-[var(--color-text-secondary)] tracking-wide mt-0.5">
                                                            NIF: {row.nif ?? '--'} <span className="mx-1">•</span> {row.transactions} {txt('movimentos', 'transactions')}
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-black text-white tabular-nums drop-shadow-sm">
                                                        {formatCurrency(row.monthTotal)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs">
                                                    <span className="text-[var(--color-text-secondary)]">
                                                        {txt('Ticket médio', 'Average ticket')}: {formatCurrency(row.avgTicket)}
                                                    </span>
                                                    <span className={inflationTone}>
                                                        {txt('Variação', 'Change')}: {inflationLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="group/insight relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover/insight:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white drop-shadow-sm">
                                    {txt('Inflação por Item', 'Item-level Inflation')}
                                </h3>
                                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    {txt('via OCR', 'via OCR')}
                                </span>
                            </div>

                            {itemInflationInsights.isLoading ? (
                                <div className="p-5 space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="h-12 rounded-xl bg-[var(--color-bg-tertiary)] animate-pulse" />
                                    ))}
                                </div>
                            ) : itemInflationInsights.isError ? (
                                <div className="p-4">
                                    <StateCard
                                        title={txt('Falha ao carregar inflação por item', 'Failed to load item inflation')}
                                        message={txt('Não foi possível calcular inflação por item agora.', 'Could not calculate item inflation right now.')}
                                        icon={<AlertCircle size={18} />}
                                        actionLabel={txt('Tentar novamente', 'Try again')}
                                        onAction={() => { void itemInflationInsights.refetch() }}
                                    />
                                </div>
                            ) : (itemInflationInsights.data?.length ?? 0) === 0 ? (
                                <div className="py-8 text-sm text-[var(--color-text-secondary)]">
                                    {txt('Sem dados suficientes para inflação por item neste mês.', 'Not enough data for item inflation this month.')}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {itemInflationInsights.data?.map((row) => {
                                        const inflation = row.inflationPct
                                        const inflationTone = inflation === null
                                            ? 'text-[var(--color-text-muted)]'
                                            : inflation >= 3
                                                ? 'text-[var(--color-danger)]'
                                                : inflation <= -3
                                                    ? 'text-[var(--color-success)]'
                                                    : 'text-[var(--color-warning)]'
                                        const inflationLabel = inflation === null
                                            ? txt('dados insuficientes', 'insufficient data')
                                            : inflation > 0
                                                ? `+${inflation.toFixed(1)}%`
                                                : `${inflation.toFixed(1)}%`

                                        return (
                                            <div key={row.skuKey} className="p-4 rounded-xl hover:bg-white/5 transition-colors duration-300 border border-transparent hover:border-white/10 flex flex-col gap-2 group/row">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-base font-bold text-white truncate drop-shadow-sm group-hover/row:text-[var(--accent)] transition-colors">{row.itemName}</p>
                                                        <p className="text-xs font-medium text-[var(--color-text-secondary)] tracking-wide mt-0.5">
                                                            SKU: {row.skuKey}
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-black text-white tabular-nums drop-shadow-sm">
                                                        {formatCurrency(row.monthTotal)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs flex-wrap">
                                                    <span className="text-[var(--color-text-secondary)]">
                                                        {txt('Preço unitário', 'Unit price')}: {formatCurrency(row.currentAvgUnitPrice)}
                                                    </span>
                                                    <span className={inflationTone}>
                                                        {txt('Inflação', 'Inflation')}: {inflationLabel}
                                                    </span>
                                                    <span className="text-[var(--color-text-muted)]">
                                                        {txt('Quantidade', 'Quantity')}: {row.monthQuantity}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Body: Chart + Entries */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                <div>
                    <CategoryChart
                        breakdown={breakdown.data}
                        isLoading={breakdown.isLoading}
                        onCategoryClick={handleCategoryClick}
                    />
                </div>

                <div className="group/ledger relative mt-4">
                    {/* List header - Typography First */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                                {txt('Movimentos', 'Transactions')}
                            </h3>
                            {categoryFilter && (
                                <button
                                    onClick={() => setCategoryFilter(undefined)}
                                    className="text-xs font-semibold px-3 py-1 rounded-full cursor-pointer
                                        bg-white/10 text-white hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all backdrop-blur-md"
                                >
                                    {localizeFinancialCategory(categoryFilter, isEnglish)} ✕
                                </button>
                            )}
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                            {entries.data?.length ?? 0} {txt('registos', 'records')}
                        </span>
                    </div>

                    {/* List - Cognitive Dimming via group-hover:opacity-30 */}
                    {entries.isLoading ? (
                        <div className="py-2 space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-16 rounded-none bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : entries.isError ? (
                        <div className="p-4">
                            <StateCard
                                title={txt('Falha ao carregar movimentos', 'Failed to load transactions')}
                                message={txt('Nao foi possivel ler os registos financeiros agora.', 'Could not read financial records right now.')}
                                icon={<AlertCircle size={18} />}
                                actionLabel={txt('Tentar novamente', 'Try again')}
                                onAction={() => { void entries.refetch() }}
                            />
                        </div>
                    ) : entries.data && entries.data.length > 0 ? (
                        <div className="py-1">
                            {/* group-hover/ledger:opacity-30 blurs items that ARE NOT hovered, creating the Spotlight */}
                            <div className="[&>*:not(:hover)]:group-hover/ledger:opacity-20 [&>*:not(:hover)]:group-hover/ledger:blur-[8px] [&>*:not(:hover)]:group-hover/ledger:brightness-50 transition-all duration-500">
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
                                {txt('Sem movimentos este mes', 'No transactions this month')}
                            </p>
                            <div className="flex gap-2">
                                <StardustButton
                                    size="sm"
                                    icon={<Plus size={16} />}
                                    onClick={() => { setEditingEntry(null); setModalOpen(true) }}
                                >
                                    {txt('Adicionar', 'Add')}
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
                title={txt('Proxima melhoria financeira recomendada', 'Next recommended financial improvement')}
                actions={[
                    { label: txt('Registar movimento', 'Log transaction'), to: '/financeiro' },
                    { label: txt('Criar tarefa financeira', 'Create financial task'), to: '/todo' },
                    { label: txt('Rever dashboard', 'Review dashboard'), to: '/dashboard' },
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
