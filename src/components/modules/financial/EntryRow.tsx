import { motion } from 'framer-motion'
import { MoreHorizontal, Pencil, Trash2, RotateCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { FinancialEntry } from '@/types'
import { formatCurrency } from '@/utils/format'

const dateLabel = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })

const CATEGORY_ICONS: Record<string, string> = {
    'Alimentação': '🍕',
    'Transporte': '🚗',
    'Saúde': '💊',
    'Habitação': '🏠',
    'Lazer': '🎮',
    'Educação': '📚',
    'Subscriptions': '📦',
    'Salário': '💰',
    'Freelance': '💻',
    'Investimentos': '📈',
    'Reembolso': '🔄',
    'Renda': '🏠',
    'Eletricidade': '⚡',
    'Água': '💧',
    'Internet': '🌐',
    'Seguro': '🛡️',
    'Telecomunicações': '📱',
    'Outros': '📌',
}

interface Props {
    entry: FinancialEntry
    onEdit: (entry: FinancialEntry) => void
    onDelete: (id: string) => void
}

export function EntryRow({ entry, onEdit, onDelete }: Props) {
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

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] transition-colors hover:bg-white/[0.03] group"
        >
            {/* Category icon */}
            <span className="text-lg w-8 text-center shrink-0">{icon}</span>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--color-text-primary)' }}
                >
                    {entry.description || entry.category}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {dateLabel(entry.date)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {entry.category}
                    </span>
                    {entry.is_recurring && (
                        <>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>·</span>
                            <RotateCw size={10} style={{ color: 'var(--color-accent)' }} />
                        </>
                    )}
                </div>
            </div>

            {/* Amount */}
            <span
                className="text-sm font-semibold tabular-nums shrink-0"
                style={{ color: isIncome ? 'var(--color-success, #22c55e)' : 'var(--color-danger, #ef4444)' }}
            >
                {isIncome ? '+' : '-'}{formatCurrency(entry.amount)}
            </span>

            {/* Menu */}
            <div className="relative shrink-0" ref={ref}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1.5 rounded-[var(--radius-sm)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-white/5"
                >
                    <MoreHorizontal size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>

                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-0 top-8 z-20 glass rounded-[var(--radius-md)] py-1 min-w-[140px]"
                        style={{ border: '1px solid var(--color-border)' }}
                    >
                        <button
                            onClick={() => { onEdit(entry); setMenuOpen(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ color: 'var(--color-text-secondary)' }}
                        >
                            <Pencil size={14} /> Editar
                        </button>
                        <button
                            onClick={() => { onDelete(entry.id); setMenuOpen(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-white/5 transition-colors cursor-pointer"
                            style={{ color: 'var(--color-danger)' }}
                        >
                            <Trash2 size={14} /> Eliminar
                        </button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}
