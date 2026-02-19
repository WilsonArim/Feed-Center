import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, List, FolderOpen } from 'lucide-react'
import { LiquidButton } from '@/components/ui/LiquidButton'
import type { CreateListInput, ListType } from '@/types'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateListInput) => void
    isLoading?: boolean
}

const COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#0EA5E9', // Sky
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#71717A', // Zinc
]

export function CreateListModal({ isOpen, onClose, onSubmit, isLoading }: CreateListModalProps) {
    const [title, setTitle] = useState('')
    const [type, setType] = useState<ListType>('list')
    const [color, setColor] = useState(COLORS[5]) // Default Blue

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        onSubmit({
            title,
            type,
            color,
            position: 0,
        })
        setTitle('')
        setType('list')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">
                                        Nova Coleção
                                    </h2>
                                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} className="text-white/70" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Type Selector */}
                                    <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setType('list')}
                                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${type === 'list'
                                                    ? 'bg-item-selected text-white shadow-sm'
                                                    : 'text-white/50 hover:text-white'
                                                }`}
                                        >
                                            <List size={16} />
                                            Lista
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('project')}
                                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${type === 'project'
                                                    ? 'bg-item-selected text-white shadow-sm'
                                                    : 'text-white/50 hover:text-white'
                                                }`}
                                        >
                                            <FolderOpen size={16} />
                                            Projeto
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5">Nome</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder={type === 'list' ? "Ex: Compras" : "Ex: Redesign Site"}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Color Picker */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-2">Cor</label>
                                        <div className="flex flex-wrap gap-3">
                                            {COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setColor(c)}
                                                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-110'
                                                        }`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <LiquidButton
                                            type="submit"
                                            className="w-full bg-[var(--color-accent)] text-black"
                                            disabled={isLoading || !title.trim()}
                                        >
                                            {isLoading ? 'Criando...' : 'Criar'}
                                        </LiquidButton>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
