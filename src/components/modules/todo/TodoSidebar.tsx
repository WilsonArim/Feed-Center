
import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Inbox, Trash2 } from 'lucide-react'
import type { TodoList } from '@/types'

interface TodoSidebarProps {
    lists: TodoList[]
    activeListId: string | null
    onSelect: (id: string | null) => void
    onCreateList: () => void
    onDeleteList: (id: string) => void
}

export function TodoSidebar({ lists, activeListId, onSelect, onCreateList, onDeleteList }: TodoSidebarProps) {
    const [projectsExpanded, setProjectsExpanded] = useState(true)
    const [listsExpanded, setListsExpanded] = useState(true)

    const projects = lists.filter(l => l.type === 'project')
    const simpleLists = lists.filter(l => l.type === 'list')

    return (
        <div className="w-64 h-full flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50">
            {/* Inbox */}
            <div className="p-4 pb-2">
                <button
                    onClick={() => onSelect(null)}
                    className={`w - full flex items - center gap - 3 px - 3 py - 2 rounded - lg transition - colors text - sm font - medium ${activeListId === null
                        ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                        } `}
                >
                    <Inbox size={18} />
                    Inbox
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                {/* Projects Section */}
                <div>
                    <div
                        className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 cursor-pointer hover:text-white transition-colors"
                        onClick={() => setProjectsExpanded(!projectsExpanded)}
                    >
                        <span>Projetos</span>
                        {projectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>

                    {projectsExpanded && (
                        <div className="space-y-0.5">
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
                                    Sem projetos
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Lists Section */}
                <div>
                    <div
                        className="flex items-center justify-between text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 cursor-pointer hover:text-white transition-colors"
                        onClick={() => setListsExpanded(!listsExpanded)}
                    >
                        <span>Listas</span>
                        {listsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>

                    {listsExpanded && (
                        <div className="space-y-0.5">
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
                                    Sem listas
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-[var(--color-border)]">
                <button
                    onClick={onCreateList}
                    className="w-full flex items-center gap-2 justify-center px-4 py-2 bg-white/5 hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white rounded-xl transition-all text-sm font-medium border border-white/5"
                >
                    <Plus size={16} />
                    Nova Coleção
                </button>
            </div>
        </div>
    )
}

function ListItem({ list, active, onSelect, onDelete }: { list: TodoList, active: boolean, onSelect: () => void, onDelete: () => void }) {
    return (
        <div className="group relative flex items-center">
            <button
                onClick={onSelect}
                className={`flex - 1 flex items - center gap - 3 px - 3 py - 2 rounded - lg transition - colors text - sm text - left ${active
                    ? 'bg-white/10 text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                    } `}
            >
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: list.color || '#888' }}
                />
                <span className="truncate">{list.title}</span>
            </button>

            {/* Delete Action (visible on hover) */}
            <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Apagar lista?')) onDelete() }}
                className="absolute right-2 p-1.5 text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-white/5"
            >
                <Trash2 size={14} />
            </button>
        </div>
    )
}
