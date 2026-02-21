import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, List, FolderOpen } from 'lucide-react'
import { LiquidButton } from '@/components/ui/LiquidButton'
import type { CreateListInput, ListType } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateListInput) => void
    isLoading?: boolean
}

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#71717A',
]

export function CreateListModal({ isOpen, onClose, onSubmit, isLoading }: CreateListModalProps) {
    const { txt } = useLocaleText()
    const [title, setTitle] = useState('')
    const [type, setType] = useState<ListType>('list')
    const [color, setColor] = useState(COLORS[5])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return
        onSubmit({ title, type, color, position: 0 })
        setTitle('')
        setType('list')
    }

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-list-modal-title"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 id="create-list-modal-title" className="text-lg font-bold text-[var(--color-text-primary)] font-sans">
                                    {txt('Nova Colecao', 'New Collection')}
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-[var(--color-bg-tertiary)] rounded-xl transition-colors"
                                    aria-label={txt('Fechar', 'Close')}
                                >
                                    <X size={18} className="text-[var(--color-text-muted)]" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                {/* Type Selector */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-bg-tertiary)] rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setType('list')}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            type === 'list'
                                                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-sm'
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                        }`}
                                    >
                                        <List size={16} />
                                        {txt('Lista', 'List')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('project')}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            type === 'project'
                                                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-sm'
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                                        }`}
                                    >
                                        <FolderOpen size={16} />
                                        {txt('Projeto', 'Project')}
                                    </button>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">{txt('Nome', 'Name')}</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder={type === 'list' ? txt('Ex: Compras', 'Ex: Grocery') : txt('Ex: Redesign Site', 'Ex: Website Redesign')}
                                        className="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
                                        autoFocus
                                    />
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2.5">{txt('Cor', 'Color')}</label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={`w-7 h-7 rounded-full transition-all ${
                                                    color === c
                                                        ? 'scale-110 ring-2 ring-[var(--color-text-primary)] ring-offset-2 ring-offset-[var(--color-surface)]'
                                                        : 'hover:scale-105 opacity-70 hover:opacity-100'
                                                }`}
                                                style={{ backgroundColor: c }}
                                                aria-label={`${txt('Cor', 'Color')} ${c}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <LiquidButton
                                    type="submit"
                                    className="w-full mt-1"
                                    disabled={isLoading || !title.trim()}
                                >
                                    {isLoading ? txt('Criando...', 'Creating...') : txt('Criar', 'Create')}
                                </LiquidButton>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
