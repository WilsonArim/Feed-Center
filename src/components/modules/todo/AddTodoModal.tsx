import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { LiquidButton } from '@/components/ui/LiquidButton'
import { VoiceInput } from '@/components/ui/VoiceInput'
import type { CreateTodoInput, UpdateTodoInput, Todo, TodoPriority, TodoStatus } from '@/types'

interface AddTodoModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateTodoInput | UpdateTodoInput) => void
    isLoading?: boolean
    editingTodo?: Todo | null
    initialData?: Partial<CreateTodoInput>
}

const PRIORITIES: { value: TodoPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
    { value: 'high', label: 'High', color: 'bg-rose-500/20 text-rose-500 border-rose-500/30' },
]

export function AddTodoModal({ isOpen, onClose, onSubmit, isLoading, editingTodo, initialData }: AddTodoModalProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState<TodoPriority>('medium')
    const [status, setStatus] = useState<TodoStatus>('todo')

    // Reset form when opening/editing
    useEffect(() => {
        if (isOpen) {
            if (editingTodo) {
                setTitle(editingTodo.title)
                setDescription(editingTodo.description || '')
                setPriority(editingTodo.priority)
                setStatus(editingTodo.status)
            } else if (initialData) {
                setTitle(initialData.title || '')
                setDescription(initialData.description || '')
                setPriority('medium')
                setStatus('todo')
            } else {
                setTitle('')
                setDescription('')
                setPriority('medium')
                setStatus('todo')
            }
        }
    }, [isOpen, editingTodo, initialData])

    useEffect(() => {
        if (!isOpen) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        const data: any = {
            title,
            description,
            priority,
            status,
        }

        if (editingTodo) {
            onSubmit({ ...data, id: editingTodo.id })
        } else {
            onSubmit(data)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="add-task-modal-title"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 id="add-task-modal-title" className="text-xl font-bold text-white">
                                        {editingTodo ? 'Editar tarefa' : 'Nova tarefa'}
                                    </h2>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        aria-label="Fechar modal"
                                    >
                                        <X size={20} className="text-white/70" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Title & Voice */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-medium text-white/50 uppercase">Titulo</label>
                                            <VoiceInput
                                                onTranscript={(text) => {
                                                    // Smartly append or replace
                                                    if (!title) setTitle(text)
                                                    else setDescription((prev) => prev ? prev + ' ' + text : text)
                                                }}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Qual e a proxima acao?"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-1.5">Descricao (Opcional)</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Adiciona contexto..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
                                        />
                                    </div>

                                    {/* Priority */}
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 uppercase mb-2">Prioridade</label>
                                        <div className="flex gap-2">
                                            {PRIORITIES.map((p) => (
                                                <button
                                                    key={p.value}
                                                    type="button"
                                                    onClick={() => setPriority(p.value)}
                                                    className={`
                                                        flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                                                        ${priority === p.value ? p.color : 'bg-transparent border-white/10 text-white/50 hover:bg-white/5'}
                                                    `}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex gap-3 mt-8 pt-4 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm font-medium"
                                        >
                                            Cancelar
                                        </button>
                                        <LiquidButton
                                            type="submit"
                                            className="flex-1 bg-[var(--color-accent)] text-black"
                                            disabled={isLoading || !title.trim()}
                                        >
                                            {isLoading ? 'A guardar...' : (editingTodo ? 'Guardar alteracoes' : 'Criar tarefa')}
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
