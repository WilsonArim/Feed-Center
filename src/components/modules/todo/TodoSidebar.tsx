import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronDown, ChevronRight, Inbox, Trash2 } from 'lucide-react'
import type { TodoList } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

interface TodoSidebarProps {
    lists: TodoList[]
    activeListId: string | null
    onSelect: (id: string | null) => void
    onCreateList: () => void
    onDeleteList: (id: string) => void
}

export function TodoSidebar({ lists, activeListId, onSelect, onCreateList, onDeleteList }: TodoSidebarProps) {
    const { txt } = useLocaleText()
    const [projectsExpanded, setProjectsExpanded] = useState(true)
    const [listsExpanded, setListsExpanded] = useState(true)

    const projects = lists.filter(l => l.type === 'project')
    const simpleLists = lists.filter(l => l.type === 'list')

    return (
        <div className="w-64 h-[calc(100dvh-0rem)] flex flex-col pt-8 pl-4 pr-1 mb-24 shrink-0 bg-transparent border-r border-[var(--border-subtle)]/50">
            {/* Inbox */}
            <div className="p-4 pb-2">
                <button
                    onClick={() => onSelect(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${activeListId === null
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-sm shadow-[var(--color-accent)]/5'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                        }`}
                >
                    <Inbox size={18} />
                    {txt('Inbox', 'Inbox')}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-6">
                {/* Projects Section */}
                <div>
                    <button
                        className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-[0.15em] mb-4 px-1 hover:text-[var(--accent)] transition-colors"
                        onClick={() => setProjectsExpanded(!projectsExpanded)}
                    >
                        <span>{txt('Projetos', 'Projects')}</span>
                        {projectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <AnimatePresence initial={false}>
                        {projectsExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden flex flex-col gap-0.5"
                            >
                                {projects.map(list => (
                                    <ListItem
                                        key={list.id}
                                        list={list}
                                        active={activeListId === list.id}
                                        onSelect={() => onSelect(list.id)}
                                        onDelete={() => onDeleteList(list.id)}
                                    />
                                ))}
                                {projects.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] italic">
                                        {txt('Sem projetos', 'No projects')}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Lists Section */}
                <div>
                    <button
                        className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-[0.15em] mb-4 px-1 hover:text-[var(--accent)] transition-colors"
                        onClick={() => setListsExpanded(!listsExpanded)}
                    >
                        <span>{txt('Listas', 'Lists')}</span>
                        {listsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <AnimatePresence initial={false}>
                        {listsExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden flex flex-col gap-0.5"
                            >
                                {simpleLists.map(list => (
                                    <ListItem
                                        key={list.id}
                                        list={list}
                                        active={activeListId === list.id}
                                        onSelect={() => onSelect(list.id)}
                                        onDelete={() => onDeleteList(list.id)}
                                    />
                                ))}
                                {simpleLists.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] italic">
                                        {txt('Sem listas', 'No lists')}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 mt-auto">
                <Magnetic strength={0.2}>
                    <button
                        onClick={onCreateList}
                        className="w-full flex items-center gap-3 justify-center px-4 py-3 bg-[var(--accent)] text-[var(--accent-text)] rounded-full transition-all text-sm font-black shadow-[0_0_20px_rgba(255,90,0,0.3)] hover:shadow-[0_0_30px_rgba(255,90,0,0.5)] active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        {txt('Nova Colecao', 'New Collection')}
                    </button>
                </Magnetic>
            </div>
        </div>
    )
}

function ListItem({ list, active, onSelect, onDelete }: { list: TodoList, active: boolean, onSelect: () => void, onDelete: () => void }) {
    const { txt } = useLocaleText()
    return (
        <div className="group relative flex items-center">
            <button
                onClick={onSelect}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm text-left ${active
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
            >
                <div
                    className="w-2 h-2 rounded-full shrink-0 ring-1 ring-inset ring-white/10"
                    style={{ backgroundColor: list.color || '#888' }}
                />
                <span className="truncate">{list.title}</span>
            </button>

            <button
                onClick={(e) => { e.stopPropagation(); if (confirm(txt('Apagar lista?', 'Delete list?'))) onDelete() }}
                className="absolute right-2 p-1.5 text-[var(--color-text-muted)] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-rose-500/10"
                aria-label={txt('Apagar lista', 'Delete list')}
            >
                <Trash2 size={13} />
            </button>
        </div>
    )
}
