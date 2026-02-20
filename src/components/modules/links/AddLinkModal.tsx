import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Loader2 } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import type { Link } from '@/services/linksService'
import type { CreateLinkInput } from '@/services/linksService'

interface AddLinkModalProps {
    open: boolean
    onClose: () => void
    onSubmit: (data: CreateLinkInput) => void
    isLoading?: boolean
    editingLink?: Link | null
}

export function AddLinkModal({ open, onClose, onSubmit, isLoading, editingLink }: AddLinkModalProps) {
    const [url, setUrl] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [notes, setNotes] = useState('')
    const [tagInput, setTagInput] = useState('')
    const [tags, setTags] = useState<string[]>([])

    useEffect(() => {
        if (editingLink) {
            setUrl(editingLink.url)
            setTitle(editingLink.title || '')
            setDescription(editingLink.description || '')
            setNotes(editingLink.notes || '')
            setTags(editingLink.tags || [])
        } else {
            setUrl('')
            setTitle('')
            setDescription('')
            setNotes('')
            setTags([])
        }
    }, [editingLink, open])

    useEffect(() => {
        if (!open) return

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [open, onClose])

    const addTag = () => {
        const cleaned = tagInput.trim().toLowerCase()
        if (cleaned && !tags.includes(cleaned)) {
            setTags((prev) => [...prev, cleaned])
        }
        setTagInput('')
    }

    const removeTag = (tag: string) => {
        setTags((prev) => prev.filter((t) => t !== tag))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return
        onSubmit({ url: url.trim(), title: title.trim() || undefined, description: description.trim() || undefined, notes: notes.trim() || undefined, tags })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="modal-panel rounded-[var(--radius-lg)] p-6 w-full max-w-lg pointer-events-auto
                                shadow-2xl border"
                            style={{ borderColor: 'var(--color-border)' }}
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="add-link-modal-title"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2
                                    id="add-link-modal-title"
                                    className="text-xl font-bold"
                                    style={{ color: 'var(--color-text-primary)' }}
                                >
                                    {editingLink ? 'Editar Link' : 'Novo Link'}
                                </h2>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
                                    style={{ color: 'var(--color-text-muted)' }}
                                    aria-label="Fechar modal"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* URL */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    URL *
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://exemplo.com"
                                    required
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm
                                        outline-none transition-all duration-200
                                        focus:ring-2 focus:ring-[var(--color-accent)]/40"
                                    style={{
                                        background: 'var(--color-bg-glass)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                    }}
                                />
                            </div>

                            {/* Title */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Título
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Auto-detectado se vazio"
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm
                                        outline-none transition-all duration-200
                                        focus:ring-2 focus:ring-[var(--color-accent)]/40"
                                    style={{
                                        background: 'var(--color-bg-glass)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                    }}
                                />
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Breve descrição do link"
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm
                                        outline-none transition-all duration-200
                                        focus:ring-2 focus:ring-[var(--color-accent)]/40"
                                    style={{
                                        background: 'var(--color-bg-glass)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                    }}
                                />
                            </div>

                            {/* Tags */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Tags
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Adicionar tag + Enter"
                                        className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] text-sm
                                            outline-none transition-all duration-200
                                            focus:ring-2 focus:ring-[var(--color-accent)]/40"
                                        style={{
                                            background: 'var(--color-bg-glass)',
                                            color: 'var(--color-text-primary)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="p-2.5 rounded-[var(--radius-md)] hover:bg-white/5 transition-colors"
                                        style={{
                                            color: 'var(--color-accent)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {tags.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity"
                                                style={{
                                                    background: 'var(--color-bg-glass)',
                                                    color: 'var(--color-accent)',
                                                    border: '1px solid var(--color-border)',
                                                }}
                                                onClick={() => removeTag(tag)}
                                                aria-label={`Remover tag ${tag}`}
                                            >
                                                {tag}
                                                <X size={12} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                                    Notas
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notas opcionais sobre este link..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] text-sm resize-none
                                        outline-none transition-all duration-200
                                        focus:ring-2 focus:ring-[var(--color-accent)]/40"
                                    style={{
                                        background: 'var(--color-bg-glass)',
                                        color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)',
                                    }}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <StardustButton
                                    type="button"
                                    onClick={onClose}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Cancelar
                                </StardustButton>
                                <StardustButton
                                    type="submit"
                                    disabled={isLoading || !url.trim()}
                                    size="sm"
                                    icon={isLoading ? <Loader2 size={14} className="animate-spin" /> : undefined}
                                >
                                    {editingLink ? '✧ Guardar' : '✧ Adicionar'}
                                </StardustButton>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
