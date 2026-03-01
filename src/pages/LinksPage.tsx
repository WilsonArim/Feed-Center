import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Link2, Loader2, AlertCircle } from 'lucide-react'
import { StardustButton } from '@/components/ui/StardustButton'
import { useLinks, useTags, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/useLinks'
import { LinkCard } from '@/components/modules/links/LinkCard'
import { AddLinkModal } from '@/components/modules/links/AddLinkModal'
import type { Link } from '@/services/linksService'
import type { CreateLinkInput } from '@/services/linksService'
import { LinksStatsBar } from '@/components/modules/links/LinksStatsBar'
import { NextActionsStrip, PageHeader, PageSectionHeader } from '@/components/core/PagePrimitives'
import { EmptyMomentum } from '@/components/ui/EmptyMomentum'
import { useLocaleText } from '@/i18n/useLocaleText'
import { CORTEX_LINKS_REFLEX_EVENT, cortexBridgeService, type CortexLinksReflexDetail } from '@/services/cortexBridgeService'
import { ProactiveAction } from '@/components/ambient/ProactiveAction'

interface LinksCortexReflexDraft {
    rawSignalId: string
    rawSignalText: string
    url: string | null
    title: string
    layoutIds: {
        shell: string
        title: string
        meta: string
        cta: string
        label: string
        handshake: string
    }
}

const URL_CANDIDATE_RE = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i

function normalizeLinkSignalText(value: string): string {
    return value
        .replace(/\s+/g, ' ')
        .trim()
}

function normalizeUrlCandidate(candidate: string): string | null {
    const trimmed = candidate
        .replace(/[),.;!?]+$/g, '')
        .trim()

    if (!trimmed) return null

    const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed.replace(/^www\./i, 'www.')}`

    try {
        const parsed = new URL(normalized)
        if (!parsed.hostname || !parsed.protocol.startsWith('http')) return null
        return parsed.toString()
    } catch {
        return null
    }
}

function deriveLinkTitle(signalText: string, rawUrl: string | null): string {
    const withoutUrl = rawUrl
        ? signalText.replace(rawUrl, ' ')
        : signalText

    const cleaned = withoutUrl
        .replace(/\b(guarda|guardar|bookmark|link|site|pagina|página|este|esta)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    if (cleaned) return cleaned.slice(0, 120)
    return rawUrl ? 'Link capturado pelo Buggy' : 'Link por confirmar'
}

export function LinksPage() {
    const { txt } = useLocaleText()
    const [search, setSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingLink, setEditingLink] = useState<Link | null>(null)
    const [pendingLinksReflex, setPendingLinksReflex] = useState<LinksCortexReflexDraft | null>(null)
    const [isApprovingPendingLinksReflex, setIsApprovingPendingLinksReflex] = useState(false)
    const [approvedPendingLinksReflexId, setApprovedPendingLinksReflexId] = useState<string | null>(null)
    const linksReflexTimeoutRef = useRef<number | null>(null)
    const handledLinksReflexIdsRef = useRef<Set<string>>(new Set())

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

    const clearLinksReflexTimer = () => {
        if (linksReflexTimeoutRef.current !== null) {
            window.clearTimeout(linksReflexTimeoutRef.current)
            linksReflexTimeoutRef.current = null
        }
    }

    const queueCortexLinksReflex = useCallback((detail: CortexLinksReflexDetail) => {
        if (!detail?.rawSignalId) return
        if (handledLinksReflexIdsRef.current.has(detail.rawSignalId)) return

        handledLinksReflexIdsRef.current.add(detail.rawSignalId)
        clearLinksReflexTimer()

        const moduleDraft = detail.moduleDraft
        const rawSignalText = normalizeLinkSignalText(detail.signalText)
        const matchedUrl = rawSignalText.match(URL_CANDIDATE_RE)?.[1] ?? null
        const normalizedUrl = moduleDraft?.url
            ?? (matchedUrl ? normalizeUrlCandidate(matchedUrl) : null)
        const title = moduleDraft?.title || deriveLinkTitle(rawSignalText, matchedUrl)
        const rawSignalId = detail.rawSignalId

        setApprovedPendingLinksReflexId(null)
        setPendingLinksReflex({
            rawSignalId,
            rawSignalText,
            url: normalizedUrl,
            title,
            layoutIds: {
                shell: `links-cortex-shell-${rawSignalId}`,
                title: `links-cortex-title-${rawSignalId}`,
                meta: `links-cortex-meta-${rawSignalId}`,
                cta: `links-cortex-cta-${rawSignalId}`,
                label: `links-cortex-label-${rawSignalId}`,
                handshake: `links-cortex-handshake-${rawSignalId}`,
            },
        })
    }, [])

    const handleApprovePendingLinksReflex = useCallback(async () => {
        if (!pendingLinksReflex || isApprovingPendingLinksReflex) return
        if (!pendingLinksReflex.url) {
            console.warn('[LinksPage] Cortex links reflex missing URL. Opening modal for manual completion.')
            setEditingLink(null)
            setModalOpen(true)
            return
        }

        setIsApprovingPendingLinksReflex(true)
        try {
            await createLink.mutateAsync({
                url: pendingLinksReflex.url,
                title: pendingLinksReflex.title || undefined,
                description: pendingLinksReflex.rawSignalText || undefined,
            })

            setApprovedPendingLinksReflexId(pendingLinksReflex.rawSignalId)
            clearLinksReflexTimer()
            linksReflexTimeoutRef.current = window.setTimeout(() => {
                setPendingLinksReflex(null)
                setApprovedPendingLinksReflexId(null)
                linksReflexTimeoutRef.current = null
            }, 1400)
        } catch (error) {
            handledLinksReflexIdsRef.current.delete(pendingLinksReflex.rawSignalId)
            console.error('[LinksPage] Failed to persist Cortex links reflex', error)
        } finally {
            setIsApprovingPendingLinksReflex(false)
        }
    }, [createLink, isApprovingPendingLinksReflex, pendingLinksReflex])

    useEffect(() => {
        const handleCortexLinksReflex = (event: Event) => {
            const customEvent = event as CustomEvent<CortexLinksReflexDetail>
            queueCortexLinksReflex(customEvent.detail)
        }

        window.addEventListener(CORTEX_LINKS_REFLEX_EVENT, handleCortexLinksReflex as EventListener)
        cortexBridgeService.announceModuleReady('LinksModule')

        const staged = cortexBridgeService.consumeStagedModuleReflexes('LinksModule')
        for (const reflex of staged) {
            queueCortexLinksReflex(reflex as CortexLinksReflexDetail)
        }

        return () => {
            window.removeEventListener(CORTEX_LINKS_REFLEX_EVENT, handleCortexLinksReflex as EventListener)
        }
    }, [queueCortexLinksReflex])

    useEffect(() => {
        return () => clearLinksReflexTimer()
    }, [])

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-[var(--dock-clearance)]">
            <div className="w-full flex flex-col gap-6">
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

                <AnimatePresence mode="popLayout">
                    {pendingLinksReflex && (
                        <motion.div
                            key={`links-cortex-reflex-${pendingLinksReflex.rawSignalId}`}
                            layout
                        >
                            <ProactiveAction
                                id={`links-cortex-${pendingLinksReflex.rawSignalId}`}
                                state={approvedPendingLinksReflexId === pendingLinksReflex.rawSignalId ? 'structured' : 'raw'}
                                rawLabel={txt('Reflexo tático de Links', 'Links tactical reflex')}
                                rawText={pendingLinksReflex.rawSignalText}
                                rawContext={txt(
                                    'Buggy extraiu o URL e preparou o registo. Confirma para persistir na biblioteca.',
                                    'Buggy extracted the URL and prepared the entry. Confirm to persist in your library.'
                                )}
                                structuredLabel={txt('Link guardado', 'Link saved')}
                                structuredText={pendingLinksReflex.title}
                                structuredContext={pendingLinksReflex.url
                                    ? `${txt('Persistido com sucesso:', 'Successfully persisted:')} ${pendingLinksReflex.url}`
                                    : txt('Sem URL válido. Completa manualmente no modal.', 'Missing valid URL. Complete it manually in the modal.')}
                                accentColor="#2CC3FF"
                                confirmLabel={txt('Confirmar', 'Confirm')}
                                completeLabel={txt('Executado', 'Executed')}
                                isApproving={isApprovingPendingLinksReflex}
                                onApprove={() => { void handleApprovePendingLinksReflex() }}
                                layoutIds={{
                                    shell: pendingLinksReflex.layoutIds.shell,
                                    label: pendingLinksReflex.layoutIds.label,
                                    title: pendingLinksReflex.layoutIds.title,
                                    context: pendingLinksReflex.layoutIds.meta,
                                    cta: pendingLinksReflex.layoutIds.cta,
                                    handshake: pendingLinksReflex.layoutIds.handshake,
                                }}
                                handshakeRawText={txt(
                                    'Sem Handshake não há escrita em links.',
                                    'No Handshake, no write in links.'
                                )}
                                handshakeStructuredText={txt(
                                    'Handshake concluído. Biblioteca atualizada.',
                                    'Handshake complete. Library updated.'
                                )}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

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
                    <EmptyMomentum
                        variant="error"
                        icon={<AlertCircle size={18} />}
                        title={txt('Nao foi possivel carregar os links', 'Could not load links')}
                        message={txt('A tua biblioteca esta temporariamente indisponivel.', 'Your library is temporarily unavailable.')}
                        action={{ label: txt('Tentar novamente', 'Try again'), onClick: () => { void refetch() } }}
                    />
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />
                    </div>
                ) : links.length === 0 ? (
                    <EmptyMomentum
                        variant={search ? 'search' : 'default'}
                        icon={<Link2 size={24} />}
                        title={search ? txt('Nenhum resultado', 'No results') : txt('Nenhum link guardado', 'No saved links')}
                        message={search
                            ? txt(`Nao encontramos links para "${search}".`, `We could not find links for "${search}".`)
                            : txt('Comeca por adicionar o teu primeiro link. Podes organizar com tags e notas.', 'Start by adding your first link. You can organize it with tags and notes.')}
                        action={!search ? { label: txt('Adicionar primeiro link', 'Add first link'), onClick: openNewModal } : undefined}
                    />
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
            </div>

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
