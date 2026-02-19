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
        if (confirm('Tens a certeza que queres eliminar este envelope? O saldo será movido para o saldo geral.')) {
            await deletePocket.mutateAsync(id)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
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
                        <div key={i} className="h-32 rounded-[var(--radius-lg)] bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : pockets.data?.length === 0 ? (
                <div className="modal-panel rounded-[var(--radius-lg)] p-8 text-center flex flex-col items-center gap-3">
                    <Wallet size={32} className="opacity-40" />
                    <p className="text-sm opacity-60">
                        Organiza o teu dinheiro em envelopes digitais (ex: Época Festiva, Férias).
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
    pocket,
    onEdit,
    onDelete,
    isMenuOpen,
    onToggleMenu,
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
            className="glass p-5 rounded-[var(--radius-lg)] relative group overflow-hidden"
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
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {pocket.name}
                        </h3>
                        <p className="text-xs opacity-60">
                            {pocket.budget_limit ? `Meta: ${formatCurrency(pocket.budget_limit)}` : 'Sem limite'}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
                        className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical size={16} />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute right-0 top-full mt-1 w-32 glass z-10 rounded-[var(--radius-md)] overflow-hidden shadow-xl"
                                style={{ border: '1px solid var(--color-border)' }}
                            >
                                <button
                                    onClick={() => onEdit(pocket)}
                                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/5"
                                >
                                    <Edit2 size={12} /> Editar
                                </button>
                                <button
                                    onClick={() => onDelete(pocket.id)}
                                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/5 text-red-400"
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
                    <span className="font-medium">{formatCurrency(pocket.current_balance)}</span>
                    <span className="opacity-60">{percentage > 0 ? `${Math.round(percentage)}%` : ''}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
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
