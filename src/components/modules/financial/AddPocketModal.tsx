import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, FolderPlus, Palette, Smile } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { useCreatePocket, useUpdatePocket } from '@/hooks/useFinancial'
import type { FinancialPocket } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'

interface Props {
    isOpen: boolean
    onClose: () => void
    editingPocket: FinancialPocket | null
}

const COLORS = [
    '#3b82f6', '#22c55e', '#eab308', '#ef4444',
    '#a855f7', '#ec4899', '#f97316', '#64748b',
]

const ICONS = ['folder', 'money', 'house', 'car', 'game', 'plane', 'cart', 'grad', 'med', 'gift']

export function AddPocketModal({ isOpen, onClose, editingPocket }: Props) {
    const { txt } = useLocaleText()
    const createPocket = useCreatePocket()
    const updatePocket = useUpdatePocket()

    const [name, setName] = useState('')
    const [budgetLimit, setBudgetLimit] = useState('')
    const [icon, setIcon] = useState('folder')
    const [color, setColor] = useState(COLORS[0])

    useEffect(() => {
        if (editingPocket) {
            setName(editingPocket.name)
            setBudgetLimit(editingPocket.budget_limit?.toString() ?? '')
            setIcon(editingPocket.icon)
            setColor(editingPocket.color)
        } else {
            setName('')
            setBudgetLimit('')
            setIcon('folder')
            setColor(COLORS[0])
        }
    }, [editingPocket, isOpen])

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name) return

        const payload = {
            name,
            budget_limit: budgetLimit ? parseFloat(budgetLimit) : undefined,
            icon,
            color,
        }

        if (editingPocket) {
            await updatePocket.mutateAsync({ id: editingPocket.id, input: payload })
        } else {
            await createPocket.mutateAsync(payload)
        }
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-pocket-modal-title"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                            <h2 id="add-pocket-modal-title" className="text-2xl font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                                <FolderPlus size={20} className="text-[var(--color-accent)]" />
                                {editingPocket ? txt('Editar Envelope', 'Edit Pocket') : txt('Novo Envelope', 'New Pocket')}
                            </h2>
                            <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors" aria-label={txt('Fechar', 'Close')}>
                                <X size={20} className="text-[var(--color-text-muted)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-7 flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium pl-1 text-[var(--color-text-secondary)]">
                                    {txt('Nome do Envelope *', 'Pocket Name *')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={txt('Ex: Ferias 2024', 'Ex: Vacation 2024')}
                                    className="w-full px-4 py-2.5 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium pl-1 text-[var(--color-text-secondary)]">
                                    {txt('Limite / Objetivo Mensal (EUR)', 'Monthly Limit / Goal (EUR)')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={budgetLimit}
                                        onChange={(e) => setBudgetLimit(e.target.value)}
                                        placeholder={txt('Ex: 500', 'Ex: 500')}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm"
                                    />
                                    <span className="absolute left-3 top-3 text-[var(--color-text-muted)] text-sm">EUR</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/35 p-3">
                                    <label className="text-sm font-medium pl-1 flex items-center gap-1 text-[var(--color-text-secondary)]">
                                        <Smile size={12} /> {txt('Icone', 'Icon')}
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {ICONS.map((ic) => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setIcon(ic)}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                                                    icon === ic
                                                        ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] scale-110'
                                                        : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] opacity-60'
                                                }`}
                                            >
                                                {ic.slice(0, 2)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/35 p-3">
                                    <label className="text-sm font-medium pl-1 flex items-center gap-1 text-[var(--color-text-secondary)]">
                                        <Palette size={12} /> {txt('Cor', 'Color')}
                                    </label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full transition-all ${
                                                    color === c
                                                        ? 'ring-2 ring-[var(--color-text-primary)] ring-offset-2 ring-offset-[var(--color-surface)] scale-110'
                                                        : 'opacity-60 hover:opacity-100'
                                                }`}
                                                style={{ background: c }}
                                                aria-label={`${txt('Cor', 'Color')} ${c}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-muted)]"
                                >
                                    {txt('Cancelar', 'Cancel')}
                                </button>
                                <StardustButton
                                    type="submit"
                                    isLoading={createPocket.isPending || updatePocket.isPending}
                                    icon={<Save size={16} />}
                                >
                                    {editingPocket ? txt('Atualizar', 'Update') : txt('Criar Envelope', 'Create Pocket')}
                                </StardustButton>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
