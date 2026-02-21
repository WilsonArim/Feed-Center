import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ExternalLink, Pin, Trash2, Pencil, Copy, MoreHorizontal, AlertTriangle,
} from 'lucide-react'
import type { Link } from '@/services/linksService'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

interface LinkCardProps {
    link: Link
    onEdit: (link: Link) => void
    onDelete: (id: string) => void
    onTogglePin: (id: string, pinned: boolean) => void
    index: number
}

export function LinkCard({ link, onEdit, onDelete, onTogglePin, index }: LinkCardProps) {
    const { txt } = useLocaleText()
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
            className="group rounded-3xl p-6 relative overflow-hidden bg-white/5 border border-transparent shadow-[0_10px_30px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white/10"
        >
            {/* Cognitive dimming support via group hovering elsewhere in the grid (if added to parent) */}

            {link.pinned && (
                <div className="absolute top-4 right-4 z-10">
                    <Pin size={16} className="text-[var(--accent)] fill-current drop-shadow-[0_0_8px_var(--accent)]" />
                </div>
            )}

            {link.is_dead && (
                <div className="absolute top-3 left-3 flex items-center gap-1 text-amber-400">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-medium">{txt('Inativo', 'Inactive')}</span>
                </div>
            )}

            <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-white/5">
                    <img
                        src={link.favicon_url || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                        alt=""
                        className="w-6 h-6 rounded-lg"
                        crossOrigin="anonymous"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/favicon.svg' }}
                    />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-lg font-black tracking-tight truncate text-white drop-shadow-md group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all">
                        {link.title || domain}
                    </h3>
                    <p className="text-xs font-bold tracking-wide truncate mt-1 text-[var(--color-text-muted)]">
                        {domain}
                    </p>
                </div>
            </div>

            {link.description && (
                <p className="text-sm font-medium leading-relaxed mb-4 line-clamp-2 text-[var(--color-text-secondary)] relative z-10">
                    {link.description}
                </p>
            )}

            {link.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    {link.tags.map((tag) => (
                        <span
                            key={tag}
                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_0_10px_rgba(var(--accent-rgb),0.1)] border border-[var(--accent)]/20"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 relative z-10">
                <Magnetic strength={0.2}>
                    <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-white/5 hover:bg-[var(--accent)] border border-transparent hover:border-[var(--accent)]/50 text-white transition-all shadow-sm hover:shadow-[0_0_15px_var(--accent)]"
                    >
                        <ExternalLink size={14} strokeWidth={2.5} />
                        {txt('Abrir', 'Open')}
                    </a>
                </Magnetic>

                <div className="relative" ref={menuRef}>
                    <Magnetic strength={0.2}>
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-2 rounded-full transition-colors hover:bg-white/10 text-white drop-shadow-md cursor-pointer"
                        >
                            <MoreHorizontal size={18} strokeWidth={2.5} />
                        </button>
                    </Magnetic>

                    <AnimatePresence>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                    className="absolute right-0 bottom-full mb-2 z-50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border overflow-hidden min-w-[180px] bg-[#1a1c23]/90 backdrop-blur-xl border-white/10 p-1"
                                >
                                    <button
                                        onClick={handleCopy}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors text-white cursor-pointer"
                                    >
                                        <Copy size={16} />
                                        {copied ? txt('Copiado!', 'Copied!') : txt('Copiar URL', 'Copy URL')}
                                    </button>
                                    <button
                                        onClick={() => { onTogglePin(link.id, !link.pinned); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors text-white cursor-pointer"
                                    >
                                        <Pin size={16} />
                                        {link.pinned ? txt('Desafixar', 'Unpin') : txt('Fixar', 'Pin')}
                                    </button>
                                    <button
                                        onClick={() => { onEdit(link); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors text-white cursor-pointer"
                                    >
                                        <Pencil size={16} />
                                        {txt('Editar', 'Edit')}
                                    </button>
                                    <div className="h-px bg-white/10 my-1 mx-2" />
                                    <button
                                        onClick={() => { onDelete(link.id); setMenuOpen(false) }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500/20 transition-colors text-rose-400 cursor-pointer"
                                    >
                                        <Trash2 size={16} />
                                        {txt('Eliminar', 'Delete')}
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
