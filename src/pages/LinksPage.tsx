import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Link2, Loader2, AlertCircle } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLinks, useTags, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/useLinks'
import { LinkCard } from '@/components/modules/links/LinkCard'
import { AddLinkModal } from '@/components/modules/links/AddLinkModal'
import type { Link } from '@/services/linksService'
import type { CreateLinkInput } from '@/services/linksService'
import { LinksStatsBar } from '@/components/modules/links/LinksStatsBar'
import { NextActionsStrip, PageHeader, PageSectionHeader, StateCard } from '@/components/core/PagePrimitives'
import { useLocaleText } from '@/i18n/useLocaleText'

export function LinksPage() {
    const { txt } = useLocaleText()
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingLink, setEditingLink] = useState<Link | null>(null)

    const {
        data: links = [],
        isLoading,
        isError,
        refetch,
    } = useLinks({ search: search || undefined, tag: activeTag || undefined })
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
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-40">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full flex flex-col gap-6"
            >
                {/* Header */}
                <PageHeader
                    icon={<Link2 size={18} />}
                    title={txt('Gestor de Links', 'Link Manager')}
                    subtitle={txt('Guarda, organiza e recupera referencias sem perder contexto.', 'Save, organize, and retrieve references without losing context.')}
                    meta={`${links.length} ${txt('link', 'link')}${links.length !== 1 ? 's' : ''} ${txt('guardado', 'saved')}${links.length !== 1 ? 's' : ''}`}
                    actions={(
                        <StardustButton onClick={openNewModal} size="sm" icon={<Plus size={16} />}>
                            {txt('Novo Link', 'New Link')}
                        </StardustButton>
                    )}
                />

                {/* Stats Bar */}
                <LinksStatsBar />

                <PageSectionHeader
                    title={txt('Explorar e Filtrar', 'Explore and Filter')}
                    subtitle={txt('Pesquisa por titulo, URL, descricao e tags para chegar mais rapido ao que precisas.', 'Search by title, URL, description, and tags to get what you need faster.')}
                />

                {/* Search Bar */}
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={txt('Pesquisar links por titulo, URL ou descricao...', 'Search links by title, URL, or description...')}
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-bold bg-white/5 border border-transparent text-white placeholder-[var(--color-text-muted)] outline-none transition-all duration-300 focus:ring-2 focus:ring-[var(--accent)]/40 hover:bg-white/10 hover:border-white/10"
                    />
                </div>

                {/* Tag Filters */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`text-xs font-bold tracking-wide px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 cursor-pointer ${!activeTag
                                    ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                                    : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/15'
                                }`}
                        >
                            {txt('Todos', 'All')}
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`text-xs font-bold tracking-wide px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 cursor-pointer ${activeTag === tag
                                        ? 'bg-[var(--accent)] text-white shadow-[0_0_15px_var(--accent)]'
                                        : 'bg-white/5 text-[var(--color-text-secondary)] hover:bg-white/15'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Links Grid */}
                {isError ? (
                    <StateCard
                        title={txt('Nao foi possivel carregar os links', 'Could not load links')}
                        message={txt('A tua biblioteca esta temporariamente indisponivel.', 'Your library is temporarily unavailable.')}
                        icon={<AlertCircle size={18} />}
                        actionLabel={txt('Tentar novamente', 'Try again')}
                        onAction={() => { void refetch() }}
                    />
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                    </div>
                ) : links.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-24 text-center"
                    >
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 bg-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-white/5">
                            <Link2 size={40} className="text-white opacity-60" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-2xl font-black tracking-tight mb-3 text-white drop-shadow-md">
                            {search ? txt('Nenhum resultado', 'No results') : txt('Nenhum link guardado', 'No saved links')}
                        </h3>
                        <p className="text-base mb-8 max-w-md text-[var(--color-text-muted)] font-medium leading-relaxed">
                            {search
                                ? txt(`Nao encontramos links para "${search}".`, `We could not find links for "${search}".`)
                                : txt('Comeca por adicionar o teu primeiro link. Podes organizar com tags e notas.', 'Start by adding your first link. You can organize it with tags and notes.')}
                        </p>
                        {!search && (
                            <StardustButton onClick={openNewModal} size="sm" icon={<Plus size={16} />}>
                                {txt('Adicionar primeiro link', 'Add first link')}
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

                <NextActionsStrip
                    title={txt('Proximo passo sugerido', 'Suggested next step')}
                    actions={[
                        { label: txt('Guardar novo recurso', 'Save new resource'), to: '/links' },
                        { label: txt('Transformar em tarefa', 'Turn into task'), to: '/todo' },
                        { label: txt('Abrir radar de noticias', 'Open news radar'), to: '/news' },
                    ]}
                />
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
