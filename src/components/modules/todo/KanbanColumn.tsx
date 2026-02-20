import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { TaskCard } from './TaskCard'
import type { Todo, TodoStatus } from '@/types'

interface KanbanColumnProps {
    id: TodoStatus
    title: string
    todos: Todo[]
    onEditTask: (todo: Todo) => void
}

const COLUMN_STYLES: Record<TodoStatus, { dot: string; bg: string; border: string }> = {
    todo: {
        dot: 'bg-[var(--color-text-muted)]',
        bg: 'bg-[var(--color-surface)]/60',
        border: 'border-[var(--color-border)]',
    },
    in_progress: {
        dot: 'bg-[var(--color-accent)]',
        bg: 'bg-[var(--color-accent)]/[0.03]',
        border: 'border-[var(--color-accent)]/20',
    },
    done: {
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-500/[0.03]',
        border: 'border-emerald-500/20',
    },
}

export function KanbanColumn({ id, title, todos, onEditTask }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id })
    const style = COLUMN_STYLES[id]

    return (
        <motion.div
            layout
            className="flex flex-col h-full min-w-[280px] w-full max-w-[340px]"
        >
            {/* Column Header */}
            <div className={`flex items-center gap-3 px-4 py-3 mb-3 rounded-xl border ${style.bg} ${style.border} backdrop-blur-sm`}>
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {title}
                </h3>
                <span className="ml-auto text-[10px] font-mono font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-md">
                    {todos.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-3 p-2 overflow-y-auto rounded-xl transition-colors duration-200 ${
                    isOver ? 'bg-[var(--color-accent)]/[0.05] ring-1 ring-[var(--color-accent)]/20 ring-inset' : ''
                }`}
            >
                <SortableContext
                    id={id}
                    items={todos.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {todos.map((todo) => (
                        <TaskCard
                            key={todo.id}
                            todo={todo}
                            onEdit={onEditTask}
                        />
                    ))}
                </SortableContext>

                {todos.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-[120px] border border-dashed border-[var(--color-border)] rounded-xl">
                        <p className="text-xs text-[var(--color-text-muted)]">Arrastar tarefas aqui</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
