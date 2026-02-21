import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, BellRing, CalendarClock, Briefcase } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { CATEGORIES_BY_TYPE } from '@/types'
import type { FinancialEntry, EntryType, PaymentMethod, CreateEntryInput, Periodicity } from '@/types'
import { useTodoLists } from '@/hooks/useTodos'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSubmit: (input: CreateEntryInput) => void
    isLoading: boolean
    editingEntry?: FinancialEntry | null
}

const ENTRY_TYPES: EntryType[] = ['expense', 'income', 'bill']
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'cartao', 'mbway', 'transferencia', 'outro']
const PERIODICITY_OPTIONS: Periodicity[] = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual']

export function AddEntryModal({ isOpen, onClose, onSubmit, isLoading, editingEntry }: Props) {
    const { txt, isEnglish } = useLocaleText()
    const { data: allLists } = useTodoLists()
    const projects = useMemo(() => allLists?.filter(l => l.type === 'project') ?? [], [allLists])

    const [type, setType] = useState<EntryType>('expense')
    const [amount, setAmount] = useState('')
    const [category, setCategory] = useState<string>(CATEGORIES_BY_TYPE.expense[0] ?? 'Outros')
    const [description, setDescription] = useState('')

    const todayStr = useMemo(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }, [])

    const [date, setDate] = useState(todayStr)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
    const [projectId, setProjectId] = useState<string>('')

    // Recurring / Despesa Fixa Fields
    const [isRecurring, setIsRecurring] = useState(false)
    const [periodicity, setPeriodicity] = useState<Periodicity>('mensal')
    const [recurringDay, setRecurringDay] = useState<string>('') // Store as string for input, convert to int

    // Buggy Alert Fields
    const [buggyAlert, setBuggyAlert] = useState(false)
    const [buggyAlertDays, setBuggyAlertDays] = useState(3)

    const getEntryTypeLabel = (entryType: EntryType) => {
        if (entryType === 'expense') return txt('Despesa Pontual', 'One-time Expense')
        if (entryType === 'income') return txt('Receita', 'Income')
        return txt('Despesa Fixa', 'Recurring Bill')
    }

    const getPaymentMethodLabel = (paymentMethodValue: PaymentMethod) => {
        if (paymentMethodValue === 'cash') return txt('Dinheiro', 'Cash')
        if (paymentMethodValue === 'cartao') return txt('Cartao', 'Card')
        if (paymentMethodValue === 'mbway') return 'MB Way'
        if (paymentMethodValue === 'transferencia') return txt('Transferencia', 'Transfer')
        return txt('Outro', 'Other')
    }

    const getPeriodicityLabel = (periodicityValue: Periodicity) => {
        if (periodicityValue === 'mensal') return txt('Mensal', 'Monthly')
        if (periodicityValue === 'bimestral') return txt('Bimestral (2 meses)', 'Bi-monthly (2 months)')
        if (periodicityValue === 'trimestral') return txt('Trimestral (3 meses)', 'Quarterly (3 months)')
        if (periodicityValue === 'semestral') return txt('Semestral (6 meses)', 'Semi-annual (6 months)')
        return txt('Anual', 'Annual')
    }

    const typeContext = useMemo<Record<EntryType, { descPlaceholder: string; valorLabel: string; title: string }>>(() => ({
        expense: {
            descPlaceholder: txt('Ex: Supermercado Continente', 'Ex: Grocery Store'),
            valorLabel: txt('Valor gasto (€) *', 'Amount spent (€) *'),
            title: txt('Nova Despesa Pontual', 'New One-time Expense'),
        },
        income: {
            descPlaceholder: txt('Ex: Empresa XYZ — Salario Janeiro', 'Ex: Company XYZ — January Salary'),
            valorLabel: txt('Valor recebido (€) *', 'Amount received (€) *'),
            title: txt('Nova Receita', 'New Income'),
        },
        bill: {
            descPlaceholder: txt('Ex: EDP Comercial — Fatura Fevereiro', 'Ex: Utility Bill — February'),
            valorLabel: txt('Valor a pagar (€) *', 'Amount due (€) *'),
            title: txt('Nova Despesa Fixa', 'New Recurring Bill'),
        },
    }), [txt])

    // Categories filtered by selected type
    const categories = CATEGORIES_BY_TYPE[type]

    // Reset category when type changes
    useEffect(() => {
        if (!categories.includes(category)) {
            setCategory(categories[0] ?? 'Outros')
        }
    }, [type, categories, category])

    useEffect(() => {
        if (editingEntry) {
            setType(editingEntry.type)
            setAmount(String(editingEntry.amount))
            setCategory(editingEntry.category ?? CATEGORIES_BY_TYPE[editingEntry.type][0] ?? 'Outros')
            setDescription(editingEntry.description ?? '')
            setDate(editingEntry.date)
            setPaymentMethod(editingEntry.payment_method)
            setProjectId(editingEntry.project_id ?? '')

            setIsRecurring(editingEntry.is_recurring)
            setPeriodicity(editingEntry.periodicity ?? 'mensal')
            setRecurringDay(editingEntry.recurring_day ? String(editingEntry.recurring_day) : '')

            setBuggyAlert(editingEntry.buggy_alert ?? false)
            setBuggyAlertDays(editingEntry.buggy_alert_days ?? 3)
        } else {
            resetForm()
        }
    }, [editingEntry, isOpen, todayStr])

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const resetForm = () => {
        setType('expense')
        setAmount('')
        setCategory(CATEGORIES_BY_TYPE.expense[0] ?? 'Outros')
        setDescription('')
        setDate(todayStr)
        setPaymentMethod('cash')
        setProjectId('')

        setIsRecurring(false)
        setPeriodicity('mensal')
        setRecurringDay('')

        setBuggyAlert(false)
        setBuggyAlertDays(3)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || Number(amount) <= 0) return

        const isBill = type === 'bill'

        // For 'bill' (Despesa Fixa), it is ALWAYS recurring
        const finalIsRecurring = isBill ? true : isRecurring

        onSubmit({
            type,
            amount: Number(amount),
            category,
            description: description || undefined,
            date: date,
            payment_method: paymentMethod,
            project_id: projectId || undefined,
            is_recurring: finalIsRecurring,
            recurring_day: isBill && recurringDay ? Number(recurringDay) : undefined,
            periodicity: isBill ? periodicity : undefined,
            buggy_alert: isBill ? buggyAlert : false,
            buggy_alert_days: isBill && buggyAlert ? buggyAlertDays : undefined,
        })
    }

    const inputStyle = {
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto bg-[var(--color-surface)]"
                        style={{ border: '1px solid var(--color-border)' }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-entry-modal-title"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <h2 id="add-entry-modal-title" className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                {editingEntry ? txt('Editar Entrada', 'Edit Entry') : typeContext[type].title}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
                                aria-label={txt('Fechar modal', 'Close modal')}
                            >
                                <X size={18} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Type selector */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    {txt('Tipo', 'Type')}
                                </label>
                                <div className="flex gap-2">
                                    {ENTRY_TYPES.map((entryType) => (
                                        <button
                                            key={entryType}
                                            type="button"
                                            onClick={() => setType(entryType)}
                                            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap px-1 ${type === entryType
                                                ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)]'
                                                : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                                                }`}
                                        >
                                            {getEntryTypeLabel(entryType)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    {typeContext[type].valorLabel}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Category & Payment */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                        {txt('Categoria', 'Category')}
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm cursor-pointer"
                                        style={inputStyle}
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>{localizeFinancialCategory(c, isEnglish)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                        {txt('Pagamento', 'Payment')}
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                        className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm cursor-pointer"
                                        style={inputStyle}
                                    >
                                        {PAYMENT_METHODS.map((paymentMethodValue) => (
                                            <option key={paymentMethodValue} value={paymentMethodValue}>{getPaymentMethodLabel(paymentMethodValue)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Project Link (Optional) */}
                            {projects.length > 0 && (
                                <div>
                                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                        {txt('Associar a Projeto (Opcional)', 'Link to Project (Optional)')}
                                    </label>
                                    <div className="relative">
                                        <Briefcase size={16} className="absolute left-3 top-2.5 opacity-50" />
                                        <select
                                            value={projectId}
                                            onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-md)] text-sm cursor-pointer"
                                        style={inputStyle}
                                    >
                                            <option value="">{txt('Sem Projeto', 'No Project')}</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    {txt('Descricao', 'Description')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={typeContext[type].descPlaceholder}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Date (Switch label based on Despesa Fixa) */}
                            <div>
                                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-text-secondary)' }}>
                                    {type === 'bill' ? txt('Data de Inicio', 'Start Date') : txt('Data', 'Date')}
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm"
                                    style={inputStyle}
                                />
                            </div>

                            {/* --- CONDITIONAL FIELDS FOR DESPESA FIXA (BILL) --- */}
                            <AnimatePresence>
                                {type === 'bill' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 pt-2 border-t border-[var(--color-border)]"
                                    >
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Periodicity */}
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block text-[var(--color-accent)]">
                                                    {txt('Periodicidade *', 'Recurrence *')}
                                                </label>
                                                <select
                                                    value={periodicity}
                                                    onChange={(e) => setPeriodicity(e.target.value as Periodicity)}
                                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm cursor-pointer"
                                                    style={inputStyle}
                                                >
                                                    {PERIODICITY_OPTIONS.map((periodicityValue) => (
                                                        <option key={periodicityValue} value={periodicityValue}>{getPeriodicityLabel(periodicityValue)}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Day of Month */}
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block text-[var(--color-accent)]">
                                                    {txt('Dia de vencimento *', 'Due day *')}
                                                </label>
                                                <div className="relative">
                                                    <CalendarClock size={16} className="absolute left-3 top-2.5 opacity-50" />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="31"
                                                        placeholder={txt('Ex: 5', 'Ex: 5')}
                                                        value={recurringDay}
                                                        onChange={(e) => setRecurringDay(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-[var(--radius-md)] text-sm"
                                                        style={inputStyle}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Buggy Alert Toggle */}
                                        <div className="p-3 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
                                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={buggyAlert}
                                                    onChange={(e) => setBuggyAlert(e.target.checked)}
                                                    className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <BellRing size={14} className={buggyAlert ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
                                                    <span className="text-sm font-medium" style={{ color: buggyAlert ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                                                        {txt('Receber alerta do Buggy', 'Receive Buggy alert')}
                                                    </span>
                                                </div>
                                            </label>

                                            {/* Sub-field: Days in advance */}
                                            {buggyAlert && (
                                                <motion.div
                                                    initial={{ opacity: 0, paddingTop: 0 }}
                                                    animate={{ opacity: 1, paddingTop: 12 }}
                                                    className="pl-7"
                                                >
                                                    <label className="text-xs block mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                                        {txt('Avisar com dias de antecedencia', 'Alert days in advance')}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="30"
                                                        value={buggyAlertDays}
                                                        onChange={(e) => setBuggyAlertDays(Number(e.target.value))}
                                                        className="w-20 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm"
                                                        style={inputStyle}
                                                    />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* --- CONDITIONAL FOR OTHERS (OLD RECURRING CHECKBOX) --- */}
                            {type !== 'bill' && (
                                <label className="flex items-center gap-2 cursor-pointer mt-1">
                                    <input
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                                    />
                                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                        {txt('Entrada recorrente (mensal)', 'Recurring entry (monthly)')}
                                    </span>
                                </label>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)] mt-2">
                                <StardustButton
                                    type="button"
                                    onClick={onClose}
                                    variant="ghost"
                                    size="sm"
                                >
                                    {txt('Cancelar', 'Cancel')}
                                </StardustButton>
                                <StardustButton
                                    type="submit"
                                    disabled={isLoading || !amount || Number(amount) <= 0}
                                    size="sm"
                                    icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                >
                                    {editingEntry ? `✧ ${txt('Guardar', 'Save')}` : `✧ ${txt('Adicionar', 'Add')}`}
                                </StardustButton>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
