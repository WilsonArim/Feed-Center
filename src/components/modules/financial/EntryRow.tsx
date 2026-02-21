import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Pencil, Trash2, RotateCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { FinancialEntry } from '@/types'
import { formatCurrency } from '@/utils/format'
import { useLocaleText } from '@/i18n/useLocaleText'
import { localizeFinancialCategory } from '@/i18n/financialCategoryLabel'
import { Magnetic } from '@/components/ui/Magnetic'

const dateLabel = (d: string, locale: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })

const CATEGORY_ICONS: Record<string, string> = {
    'Alimentacao': '🍕',
    'Alimentação': '🍕',
    'Food': '🍕',
    'Transporte': '🚗',
    'Transport': '🚗',
    'Saude': '💊',
    'Saúde': '💊',
    'Health': '💊',
    'Habitacao': '🏠',
    'Habitação': '🏠',
    'Housing': '🏠',
    'Lazer': '🎮',
    'Leisure': '🎮',
    'Educacao': '📚',
    'Educação': '📚',
    'Education': '📚',
    'Subscriptions': '📦',
    'Salario': '💰',
    'Salário': '💰',
    'Salary': '💰',
    'Freelance': '💻',
    'Investimentos': '📈',
    'Investments': '📈',
    'Reembolso': '🔄',
    'Refund': '🔄',
    'Renda': '🏠',
    'Rent': '🏠',
    'Eletricidade': '⚡',
    'Electricity': '⚡',
    'Gas': '🔥',
    'Gás': '🔥',
    'Agua': '💧',
    'Água': '💧',
    'Water': '💧',
    'Internet': '🌐',
    'Seguro': '🛡️',
    'Insurance': '🛡️',
    'Telecomunicacoes': '📱',
    'Telecomunicações': '📱',
    'Telecommunications': '📱',
    'Outros': '📌',
    'Other': '📌',
    'Despesas': '📌',
    'Expenses': '📌',
}

interface Props {
    entry: FinancialEntry
    onEdit: (entry: FinancialEntry) => void
    onDelete: (id: string) => void
}

export function EntryRow({ entry, onEdit, onDelete }: Props) {
    const { txt, isEnglish } = useLocaleText()
    const [menuOpen, setMenuOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const isIncome = entry.type === 'income'
    const icon = CATEGORY_ICONS[entry.category] ?? '📌'
    const categoryLabel = localizeFinancialCategory(entry.category, isEnglish)
    const locale = isEnglish ? 'en-US' : 'pt-PT'

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="group relative flex items-center gap-4 py-4 px-2 border-b border-white/5 last:border-0 hover:z-20"
        >
            {/* Ambient Background Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Category Icon */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>

            {/* Entry Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-base font-bold truncate text-[var(--color-text-primary)] group-hover:text-white transition-colors duration-300">
                    {entry.description || categoryLabel}
                </p>
                <div className="flex items-center gap-2 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {dateLabel(entry.date, locale)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-xs font-medium tracking-wide text-[var(--color-text-secondary)]">
                        {categoryLabel}
                    </span>
                    {entry.is_recurring && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <RotateCw size={12} className="text-[var(--color-accent)] drop-shadow-[0_0_5px_var(--color-accent)]" />
                        </>
                    )}
                </div>
            </div>

            {/* Massive Amount */}
            <div className="flex flex-col items-end shrink-0 mr-4">
                <span
                    className="text-2xl md:text-3xl font-black tabular-nums tracking-tighter drop-shadow-md"
                    style={{ color: isIncome ? 'var(--color-success)' : 'var(--color-text-primary)' }}
                >
                    {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
            </div>

            {/* Magnetic Actions Menu */}
            <div className="relative shrink-0 flex items-center" ref={ref}>
                <Magnetic strength={0.3}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-full opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300 cursor-pointer bg-white/5 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                        aria-label={txt('Acoes do movimento', 'Transaction actions')}
                    >
                        <MoreHorizontal size={18} className="text-white" />
                    </button>
                </Magnetic>

                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="absolute right-0 top-12 z-50 bg-[var(--color-bg-elevated)] border border-white/10
                                rounded-xl p-1.5 min-w-[160px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                        >
                            <button
                                onClick={() => { onEdit(entry); setMenuOpen(false) }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-white font-medium"
                            >
                                <Pencil size={15} className="text-[var(--color-text-secondary)]" /> {txt('Editar', 'Edit')}
                            </button>
                            <button
                                onClick={() => { onDelete(entry.id); setMenuOpen(false) }}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer text-[var(--color-danger)] font-medium mt-0.5"
                            >
                                <Trash2 size={15} /> {txt('Eliminar', 'Delete')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
