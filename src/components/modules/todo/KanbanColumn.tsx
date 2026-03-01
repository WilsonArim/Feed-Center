import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { TaskCard } from './TaskCard'
import { GripVertical } from 'lucide-react'
import type { Todo, TodoStatus } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'

interface KanbanColumnProps {
    id: TodoStatus
    title: string
    todos: Todo[]
    onEditTask: (todo: Todo) => void
}

const COLUMN_STYLES: Record<TodoStatus, { dot: string; topBorder: string }> = {
    todo: { dot: 'bg-[var(--text-secondary)]', topBorder: 'border-t-[rgba(255,255,255,0.20)]' },
    in_progress: { dot: 'bg-blue-400', topBorder: 'border-t-blue-400' },
    done: { dot: 'bg-green-400', topBorder: 'border-t-green-400' },
}

export function KanbanColumn({ id, title, todos, onEditTask }: KanbanColumnProps) {
    const { txt } = useLocaleText()
    const { setNodeRef, isOver } = useDroppable({ id })
    const style = COLUMN_STYLES[id]

    return (
        <motion.div
            layout
            className={`group/column flex flex-col min-w-[280px] w-full max-w-[340px]
                min-h-[calc(100vh-180px)] relative`}
        >
            {/* Column Header - Typography First */}
            <div className="flex items-center gap-3 px-4 py-4 mb-2">
                <span className={`w-2 h-2 rounded-full ${style.dot} shadow-[0_0_10px_currentColor] opacity-80`} />
                <h3 className="font-black text-2xl text-white drop-shadow-md">
                    {title}
                </h3>
                <span className="ml-auto text-sm font-bold text-[var(--text-tertiary)] bg-white/5 backdrop-blur-md px-3 py-1 rounded-full tabular-nums">
                    {todos.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-4 p-3 overflow-y-auto transition-all duration-300 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent ${isOver ? 'bg-white/5 ring-1 ring-[var(--accent)]/30 ring-inset shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]' : ''
                    }`}
            >
                <div className="[&>*:not(:hover)]:group-hover/column:opacity-30 [&>*:not(:hover)]:group-hover/column:blur-[4px] [&>*:not(:hover)]:group-hover/column:scale-[0.98] transition-all duration-500 pb-20">
                    <SortableContext id={id} items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {todos.map(todo => (
                            <TaskCard
                                key={todo.id}
                                todo={todo}
                                onEdit={onEditTask}
                            />
                        ))}
                    </SortableContext>
                </div>

                {todos.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[120px]
                        border border-dashed border-[var(--border-default)] rounded-xl gap-2">
                        <GripVertical size={18} className="text-[var(--text-tertiary)] opacity-40" />
                        <p className="text-xs text-[var(--text-tertiary)]">{txt('Arrastar tarefas aqui', 'Drag tasks here')}</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
