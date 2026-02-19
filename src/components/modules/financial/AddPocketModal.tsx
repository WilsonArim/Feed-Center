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
    '#3b82f6', // blue
    '#22c55e', // green
    '#eab308', // yellow
    '#ef4444', // red
    '#a855f7', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#64748b', // slate
]

const ICONS = ['📁', '💰', '🏠', '🚗', '🎮', '✈️', '🛒', '🎓', '💊', '🎁']

export function AddPocketModal({ isOpen, onClose, editingPocket }: Props) {
    const createPocket = useCreatePocket()
    const updatePocket = useUpdatePocket()

    const [name, setName] = useState('')
    const [budgetLimit, setBudgetLimit] = useState('')
    const [icon, setIcon] = useState('📁')
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
            setIcon('📁')
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md glass rounded-[var(--radius-xl)] shadow-2xl overflow-hidden"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                                <FolderPlus size={20} className="text-[var(--color-accent)]" />
                                {editingPocket ? 'Editar Envelope' : 'Novo Envelope'}
                            </h2>
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} className="text-[var(--color-text-muted)]" />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium pl-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    Nome do Envelope *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Férias 2024"
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]"
                                    style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)',
                                    }}
                                />
                            </div>

                            {/* Budget */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium pl-1" style={{ color: 'var(--color-text-secondary)' }}>
                                    Limite / Objetivo Mensal (€)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={budgetLimit}
                                        onChange={(e) => setBudgetLimit(e.target.value)}
                                        placeholder="Ex: 500"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-[var(--radius-md)] outline-none transition-all focus:ring-2 focus:ring-[var(--color-accent)]"
                                        style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-text-primary)',
                                        }}
                                    />
                                    <span className="absolute left-3 top-2.5 opacity-50">€</span>
                                </div>
                            </div>

                            {/* Icon & Color Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium pl-1 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        <Smile size={12} /> Ícone
                                    </label>
                                    <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar">
                                        {ICONS.map((ic) => (
                                            <button
                                                key={ic}
                                                type="button"
                                                onClick={() => setIcon(ic)}
                                                className={`w-8 h-8 flex-shrink-0 rounded flex items-center justify-center text-lg transition-all ${icon === ic ? 'bg-white/20 scale-110' : 'hover:bg-white/5 opacity-60'
                                                    }`}
                                            >
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium pl-1 flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                                        <Palette size={12} /> Cor
                                    </label>
                                    <div className="flex gap-2 items-center overflow-x-auto pb-1 no-scrollbar">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-6 h-6 flex-shrink-0 rounded-full transition-all ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                                                    }`}
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] hover:bg-white/5 transition-colors"
                                    style={{ color: 'var(--color-text-muted)' }}
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
