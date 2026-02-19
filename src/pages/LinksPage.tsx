import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Link2, Loader2 } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLinks, useTags, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/useLinks'
import { LinkCard } from '@/components/modules/links/LinkCard'
import { AddLinkModal } from '@/components/modules/links/AddLinkModal'
import type { Link } from '@/services/linksService'
import type { CreateLinkInput } from '@/services/linksService'
import { LinksStatsBar } from '@/components/modules/links/LinksStatsBar'

export function LinksPage() {
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingLink, setEditingLink] = useState<Link | null>(null)

    const { data: links = [], isLoading } = useLinks({ search: search || undefined, tag: activeTag || undefined })
    const { data: allTags = [] } = useTags()
    const createLink = useCreateLink()
    const updateLink = useUpdateLink()
    const deleteLink = useDeleteLink()

    const handleSubmit = (data: CreateLinkInput) => {
        if (editingLink) {
            updateLink.mutate(
                { id: editingLink.id, ...data },
                { onSuccess: () => { setModalOpen(false); setEditingLink(null) } }
            )
        } else {
            createLink.mutate(data, { onSuccess: () => setModalOpen(false) })
        }
    }

    const handleEdit = (link: Link) => {
        setEditingLink(link)
        setModalOpen(true)
    }

    const handleDelete = (id: string) => {
        deleteLink.mutate(id)
    }

    const handleTogglePin = (id: string, pinned: boolean) => {
        updateLink.mutate({ id, pinned })
    }

    const openNewModal = () => {
        setEditingLink(null)
        setModalOpen(true)
    }

    return (
        <div className="min-h-screen pt-24 px-6 pb-20">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1
                            className="text-4xl font-bold tracking-tight mb-1"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            Gestor de Links
                        </h1>
                        <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                            {links.length} link{links.length !== 1 ? 's' : ''} guardado{links.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <StardustButton onClick={openNewModal} size="sm" icon={<Plus size={16} />}>
                        Novo Link
                    </StardustButton>
                </div>

                {/* Stats Bar */}
                <LinksStatsBar />

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--color-text-muted)' }}
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar links por título, URL ou descrição..."
                        className="w-full pl-11 pr-4 py-3 rounded-[var(--radius-lg)] text-sm
                            outline-none transition-all duration-200
                            focus:ring-2 focus:ring-[var(--color-accent)]/40"
                        style={{
                            background: 'var(--color-bg-glass)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                        }}
                    />
                </div>

                {/* Tag Filters */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        <button
                            onClick={() => setActiveTag(null)}
                            className="text-xs px-3 py-1.5 rounded-full transition-all duration-200"
                            style={{
                                background: !activeTag ? 'var(--color-accent)' : 'var(--color-bg-glass)',
                                color: !activeTag ? '#fff' : 'var(--color-text-secondary)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            Todos
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className="text-xs px-3 py-1.5 rounded-full transition-all duration-200"
                                style={{
                                    background: activeTag === tag ? 'var(--color-accent)' : 'var(--color-bg-glass)',
                                    color: activeTag === tag ? '#fff' : 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Links Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                    </div>
                ) : links.length === 0 ? (
                    /* Empty State */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                            style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}
                        >
                            <Link2 size={32} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                        <h3
                            className="text-lg font-semibold mb-2"
                            style={{ color: 'var(--color-text-primary)' }}
                        >
                            {search ? 'Nenhum resultado' : 'Nenhum link guardado'}
                        </h3>
                        <p
                            className="text-sm mb-6 max-w-sm"
                            style={{ color: 'var(--color-text-muted)' }}
                        >
                            {search
                                ? `Não encontrámos links para "${search}".`
                                : 'Começa por adicionar o teu primeiro link. Podes organizar com tags e notas.'}
                        </p>
                        {!search && (
                            <StardustButton onClick={openNewModal} size="sm" icon={<Plus size={16} />}>
                                Adicionar primeiro link
                            </StardustButton>
                        )}
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {links.map((link, i) => (
                                <LinkCard
                                    key={link.id}
                                    link={link}
                                    index={i}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onTogglePin={handleTogglePin}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Add/Edit Modal */}
            <AddLinkModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditingLink(null) }}
                onSubmit={handleSubmit}
                isLoading={createLink.isPending || updateLink.isPending}
                editingLink={editingLink}
            />
        </div>
    )
}
