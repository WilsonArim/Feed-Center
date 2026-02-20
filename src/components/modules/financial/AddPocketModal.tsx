import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, FolderPlus, Palette, Smile } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { useCreatePocket, useUpdatePocket } from '@/hooks/useFinancial'
import type { FinancialPocket } from '@/types'

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
                        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--color-text-primary)]">
                                <FolderPlus size={20} className="text-[var(--color-accent)]" />
                                {editingPocket ? 'Editar Envelope' : 'Novo Envelope'}
                            </h2>
                            <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors" aria-label="Fechar">
                                <X size={20} className="text-[var(--color-text-muted)]" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium pl-1 text-[var(--color-text-secondary)]">
                                    Nome do Envelope *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Ferias 2024"
                                    className="w-full px-4 py-2.5 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium pl-1 text-[var(--color-text-secondary)]">
                                    Limite / Objetivo Mensal (EUR)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={budgetLimit}
                                        onChange={(e) => setBudgetLimit(e.target.value)}
                                        placeholder="Ex: 500"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] text-sm"
                                    />
                                    <span className="absolute left-3 top-2.5 text-[var(--color-text-muted)] text-sm">EUR</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium pl-1 flex items-center gap-1 text-[var(--color-text-secondary)]">
                                        <Smile size={12} /> Icone
                                    </label>
                                    <div className="flex gap-2 items-center overflow-x-auto pb-1">
                                        {ICONS.map((ic) => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setIcon(ic)}
                                                className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
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

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium pl-1 flex items-center gap-1 text-[var(--color-text-secondary)]">
                                        <Palette size={12} /> Cor
                                    </label>
                                    <div className="flex gap-2 items-center overflow-x-auto pb-1">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-6 h-6 flex-shrink-0 rounded-full transition-all ${
                                                    color === c
                                                        ? 'ring-2 ring-[var(--color-text-primary)] ring-offset-2 ring-offset-[var(--color-surface)] scale-110'
                                                        : 'opacity-60 hover:opacity-100'
                                                }`}
                                                style={{ background: c }}
                                                aria-label={`Cor ${c}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-muted)]"
                                >
                                    Cancelar
                                </button>
                                <StardustButton
                                    type="submit"
                                    isLoading={createPocket.isPending || updatePocket.isPending}
                                    icon={<Save size={16} />}
                                >
                                    {editingPocket ? 'Atualizar' : 'Criar Envelope'}
                                </StardustButton>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
