import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ExternalLink, Pin, Trash2, Pencil, Copy, MoreHorizontal, AlertTriangle,
} from 'lucide-react'
import type { Link } from '@/services/linksService'

interface LinkCardProps {
    link: Link
    onEdit: (link: Link) => void
    onDelete: (id: string) => void
    onTogglePin: (id: string, pinned: boolean) => void
    index: number
}

export function LinkCard({ link, onEdit, onDelete, onTogglePin, index }: LinkCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    const domain = (() => {
        try { return new URL(link.url).hostname.replace('www.', '') }
        catch { return link.url }
    })()

    const handleCopy = async () => {
        await navigator.clipboard.writeText(link.url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        setMenuOpen(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.04, duration: 0.35 }}
            className="group rounded-2xl p-5 relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] transition-all duration-300 hover:border-[var(--color-accent)]/20 hover:shadow-lg hover:shadow-[var(--color-accent)]/[0.04]"
        >
            {link.pinned && (
                <div className="absolute top-3 right-3">
                    <Pin size={14} className="text-[var(--color-accent)] fill-current" />
                </div>
            )}

            {link.is_dead && (
                <div className="absolute top-3 left-3 flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-medium">Inativo</span>
                </div>
            )}

            <div className="flex items-start gap-3 mb-3">
                <img
                    src={link.favicon_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                    alt=""
                    className="w-8 h-8 rounded-lg mt-0.5 bg-[var(--color-bg-tertiary)]"
                    crossOrigin="anonymous"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.svg' }}
                />
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold truncate text-[var(--color-text-primary)]">
                        {link.title || domain}
                    </h3>
                    <p className="text-xs truncate mt-0.5 text-[var(--color-text-muted)]">
                        {domain}
                    </p>
                </div>
            </div>

            {link.description && (
                <p className="text-sm leading-relaxed mb-3 line-clamp-2 text-[var(--color-text-secondary)]">
                    {link.description}
                </p>
            )}

            {link.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {link.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium hover:underline text-[var(--color-accent)]"
                >
                    <ExternalLink size={13} />
                    Abrir
                </a>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    <AnimatePresence>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                    className="absolute right-0 bottom-full mb-1 z-50 rounded-xl shadow-xl border overflow-hidden min-w-[160px] bg-[var(--color-surface)] border-[var(--color-border)]"
                                >
                                    <button
                                        onClick={handleCopy}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
                                    >
                                        <Copy size={14} />
                                        {copied ? 'Copiado!' : 'Copiar URL'}
                                    </button>
                                    <button
                                        onClick={() => { onTogglePin(link.id, !link.pinned); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
                                    >
                                        <Pin size={14} />
                                        {link.pinned ? 'Desafixar' : 'Fixar'}
                                    </button>
                                    <button
                                        onClick={() => { onEdit(link); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-bg-tertiary)] transition-colors text-[var(--color-text-primary)]"
                                    >
                                        <Pencil size={14} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => { onDelete(link.id); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-500/10 transition-colors text-rose-400"
                                    >
                                        <Trash2 size={14} />
                                        Eliminar
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    )
}
