import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
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
import { MonthlyTrendChart } from '@/components/modules/financial/MonthlyTrendChart'
import { DailySpendChart } from '@/components/modules/financial/DailySpendChart'
import { Magnetic } from '@/components/ui/Magnetic'
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
import { useAuth } from '@/components/core/AuthProvider'
import { CATEGORIES_BY_TYPE, type FinancialEntry, type CreateEntryInput, type EntryType } from '@/types'
import { NextActionsStrip, PageHeader } from '@/components/core/PagePrimitives'
import { EmptyMomentum } from '@/components/ui/EmptyMomentum'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'
import { formatCurrency } from '@/utils/format'
import { useShowMerchantInsights } from '@/hooks/useUserSettings'
import { ocrService } from '@/services/ocrService'
import { receiptLearningService } from '@/services/receiptLearningService'

function currentMonth() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function FinanceiroPage() {
    const { txt, isEnglish } = useLocaleText()
    const { user } = useAuth()
    const [month, setMonth] = useState(currentMonth())
    const [modalOpen, setModalOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
    const [undoEntry, setUndoEntry] = useState<FinancialEntry | null>(null)
    const undoTimeoutRef = useRef<number | null>(null)
    const scanInputRef = useRef<HTMLInputElement>(null)
    const [isInlineScanning, setIsInlineScanning] = useState(false)
    const [scanInlineMessage, setScanInlineMessage] = useState<string | null>(null)
    const [injectedEntries, setInjectedEntries] = useState<FinancialEntry[]>([])

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

    const entriesData = entries.data ?? []

    const visibleEntries = [
        ...injectedEntries.filter((entry) => !entriesData.some((existing) => existing.id === entry.id)),
        ...entriesData,
    ]

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

    const triggerScanInput = () => {
        scanInputRef.current?.click()
    }

    const handleScanFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        void processScannedReceipt(file)
        event.currentTarget.value = ''
    }

    const processScannedReceipt = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setScanInlineMessage(txt('Formato não suportado. Usa imagem (PNG/JPG/WebP).', 'Unsupported format. Use image (PNG/JPG/WebP).'))
            return
        }

        setIsInlineScanning(true)
        setScanInlineMessage(null)

        try {
            const result = await ocrService.scanReceipt(file)
            const merchant = (result.merchant ?? '').trim()
            const amount = result.total?.amount ?? null

            if (!amount || amount <= 0 || !merchant) {
                setScanInlineMessage(txt(
                    'OCR não conseguiu extrair dados suficientes. Tenta novamente ou regista manualmente.',
                    'OCR could not extract enough data. Try again or register manually.'
                ))
                return
            }

            const learnedRule = user && merchant
                ? receiptLearningService.findRule(user.id, merchant)
                : null
            const suggestedType = learnedRule?.type ?? result.suggestion?.type ?? 'expense'
            const categoriesForType = CATEGORIES_BY_TYPE[suggestedType]
            const suggestedCategory = learnedRule?.category ?? result.suggestion?.category ?? null
            const finalCategory = suggestedCategory && categoriesForType.includes(suggestedCategory)
                ? suggestedCategory
                : (categoriesForType[0] ?? 'Outros')
            const today = new Date().toISOString().split('T')[0] ?? ''

            await createEntry.mutateAsync({
                type: suggestedType,
                amount,
                category: finalCategory,
                description: merchant,
                receipt_merchant: merchant,
                receipt_nif: (result.nif ?? '').trim() || undefined,
                date: today,
            })

            if (user?.id && merchant.length >= 2) {
                receiptLearningService.saveRule(user.id, merchant, suggestedType, finalCategory)
            }

            setScanInlineMessage(txt('Movimento registado com sucesso.', 'Transaction registered successfully.'))
        } catch (error) {
            setScanInlineMessage(error instanceof Error
                ? error.message
                : txt('Erro ao analisar o recibo. Tenta novamente.', 'Error analyzing receipt. Try again.')
            )
        } finally {
            setIsInlineScanning(false)
        }
    }

    const handleUndoLastScan = async () => {
        if (!undoEntry) return
        await deleteEntry.mutateAsync(undoEntry.id)
        clearUndoTimer()
        setUndoEntry(null)
    }

    useEffect(() => {
        if (injectedEntries.length === 0) return
        const existingIds = new Set(entriesData.map((entry) => entry.id))
        setInjectedEntries((prev) => prev.filter((entry) => !existingIds.has(entry.id)))
    }, [entriesData, injectedEntries.length])

    useEffect(() => {
        return () => {
            clearUndoTimer()
        }
    }, [])

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-[var(--dock-clearance)] space-y-8">
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
                            onClick={triggerScanInput}
                            disabled={isInlineScanning}
                        >
                            {isInlineScanning ? txt('A processar...', 'Processing...') : 'Scan'}
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
            <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleScanFileSelect}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Magnetic strength={0.1}>
                    <button
                        type="button"
                        onClick={triggerScanInput}
                        disabled={isInlineScanning}
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
                                    <EmptyMomentum
                                        variant="error"
                                        icon={<AlertCircle size={18} />}
                                        title={txt('Falha ao carregar histórico por loja', 'Failed to load store history')}
                                        message={txt('Não foi possível calcular estes insights agora.', 'Could not calculate these insights right now.')}
                                        action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void merchantInsights.refetch() } }}
                                        compact
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
                                    <EmptyMomentum
                                        variant="error"
                                        icon={<AlertCircle size={18} />}
                                        title={txt('Falha ao carregar inflação por item', 'Failed to load item inflation')}
                                        message={txt('Não foi possível calcular inflação por item agora.', 'Could not calculate item inflation right now.')}
                                        action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void itemInflationInsights.refetch() } }}
                                        compact
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

                <div className="group/ledger relative">
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
                            <EmptyMomentum
                                variant="error"
                                icon={<AlertCircle size={18} />}
                                title={txt('Falha ao carregar movimentos', 'Failed to load transactions')}
                                message={txt('Nao foi possivel ler os registos financeiros agora.', 'Could not read financial records right now.')}
                                action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void entries.refetch() } }}
                            />
                        </div>
                    ) : visibleEntries.length > 0 ? (
                        <div className="py-1">
                            <LayoutGroup id="financeiro-ledger-handoff">
                                {/* group-hover/ledger:opacity-30 blurs items that ARE NOT hovered, creating the Spotlight */}
                                <div className="[&>*:not(:hover)]:group-hover/ledger:opacity-20 [&>*:not(:hover)]:group-hover/ledger:blur-[8px] [&>*:not(:hover)]:group-hover/ledger:brightness-50 transition-all duration-500">
                                    <AnimatePresence mode="popLayout">
                                        {scanInlineMessage && (
                                            <motion.p
                                                key="scan-inline-message"
                                                layout
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="mb-2 text-xs text-[var(--danger)]"
                                            >
                                                {scanInlineMessage}
                                            </motion.p>
                                        )}

                                        {visibleEntries.map((entry) => (
                                            <EntryRow
                                                key={entry.id}
                                                entry={entry}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </LayoutGroup>
                        </div>
                    ) : (
                        <EmptyMomentum
                            icon={<Wallet size={24} />}
                            title={txt('Sem movimentos este mes', 'No transactions this month')}
                            message={txt('Regista a primeira despesa para activar o teu cockpit financeiro.', 'Log your first expense to activate your financial cockpit.')}
                            action={{ label: txt('Registar', 'Add'), onClick: () => { setEditingEntry(null); setModalOpen(true) } }}
                        />
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

        </div>
    )
}
