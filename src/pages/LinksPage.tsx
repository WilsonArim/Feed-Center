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
        <div className="pb-12">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-h1 text-2xl md:text-3xl mb-1">
                            Gestor de Links
                        </h1>
                        <p className="text-sm text-[var(--color-text-muted)]">
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
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Pesquisar links por titulo, URL ou descricao..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none transition-all duration-200 focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50"
                    />
                </div>

                {/* Tag Filters */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 border ${
                                !activeTag
                                    ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] border-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                            }`}
                        >
                            Todos
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 border ${
                                    activeTag === tag
                                        ? 'bg-[var(--color-accent)] text-[var(--color-bg-primary)] border-[var(--color-accent)]'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Links Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                    </div>
                ) : links.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <Link2 size={32} className="text-[var(--color-text-muted)]" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">
                            {search ? 'Nenhum resultado' : 'Nenhum link guardado'}
                        </h3>
                        <p className="text-sm mb-6 max-w-sm text-[var(--color-text-muted)]">
                            {search
                                ? `Nao encontramos links para "${search}".`
                                : 'Comeca por adicionar o teu primeiro link. Podes organizar com tags e notas.'}
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
