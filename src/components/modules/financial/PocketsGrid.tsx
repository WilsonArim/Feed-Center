import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MoreVertical, Edit2, Trash2, Wallet } from 'lucide-react'
import { usePockets, useDeletePocket } from '@/hooks/useFinancial'
import type { FinancialPocket } from '@/types'
import { StardustButton } from '@/components/ui/StardustButton'
import { AddPocketModal } from './AddPocketModal'
import { formatCurrency } from '@/utils/format'

export function PocketsGrid() {
    const pockets = usePockets()
    const deletePocket = useDeletePocket()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPocket, setEditingPocket] = useState<FinancialPocket | null>(null)
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (confirm('Tens a certeza que queres eliminar este envelope? O saldo sera movido para o saldo geral.')) {
            await deletePocket.mutateAsync(id)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Envelopes Digitais
                </h2>
                <StardustButton
                    size="sm"
                    icon={<Plus size={16} />}
                    onClick={() => { setEditingPocket(null); setIsModalOpen(true) }}
                >
                    Novo Envelope
                </StardustButton>
            </div>

            {pockets.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 rounded-2xl bg-[var(--color-bg-tertiary)] animate-pulse" />
                    ))}
                </div>
            ) : pockets.data?.length === 0 ? (
                <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-8 text-center flex flex-col items-center gap-3">
                    <Wallet size={32} className="text-[var(--color-text-muted)]" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Organiza o teu dinheiro em envelopes digitais (ex: Epoca Festiva, Ferias).
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                    >
                        Criar primeiro envelope
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {pockets.data?.map((pocket) => (
                            <PocketCard
                                key={pocket.id}
                                pocket={pocket}
                                onEdit={(p) => { setEditingPocket(p); setIsModalOpen(true); setMenuOpenId(null) }}
                                onDelete={(id) => { handleDelete(id); setMenuOpenId(null) }}
                                isMenuOpen={menuOpenId === pocket.id}
                                onToggleMenu={() => setMenuOpenId(menuOpenId === pocket.id ? null : pocket.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <AddPocketModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingPocket(null) }}
                editingPocket={editingPocket}
            />
        </div>
    )
}

function PocketCard({
    pocket, onEdit, onDelete, isMenuOpen, onToggleMenu,
}: {
    pocket: FinancialPocket
    onEdit: (p: FinancialPocket) => void
    onDelete: (id: string) => void
    isMenuOpen: boolean
    onToggleMenu: () => void
}) {
    const percentage = pocket.budget_limit && pocket.budget_limit > 0
        ? Math.min((pocket.current_balance / pocket.budget_limit) * 100, 100)
        : 0

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 rounded-2xl relative group overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/20 transition-colors"
            style={{ borderLeft: `4px solid ${pocket.color}` }}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                        style={{ background: `${pocket.color}20` }}
                    >
                        {pocket.icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">
                            {pocket.name}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {pocket.budget_limit ? `Meta: ${formatCurrency(pocket.budget_limit)}` : 'Sem limite'}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
                        className="p-1 rounded-lg hover:bg-[var(--color-bg-tertiary)] opacity-0 group-hover:opacity-100 transition-all text-[var(--color-text-muted)]"
                    >
                        <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute right-0 top-full mt-1 w-32 z-10 rounded-xl overflow-hidden shadow-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
                            >
                                <button
                                    onClick={() => onEdit(pocket)}
                                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] transition-colors"
                                >
                                    <Edit2 size={12} /> Editar
                                </button>
                                <button
                                    onClick={() => onDelete(pocket.id)}
                                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-500/10 text-rose-400 transition-colors"
                                >
                                    <Trash2 size={12} /> Eliminar
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-[var(--color-text-primary)]">{formatCurrency(pocket.current_balance)}</span>
                    <span className="text-[var(--color-text-muted)]">{percentage > 0 ? `${Math.round(percentage)}%` : ''}</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: pocket.color }}
                    />
                </div>
            </div>
        </motion.div>
    )
}
