import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { TaskCard } from './TaskCard'
import { GripVertical } from 'lucide-react'
import type { Todo, TodoStatus } from '@/types'

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
    const { setNodeRef, isOver } = useDroppable({ id })
    const style = COLUMN_STYLES[id]

    return (
        <motion.div
            layout
            className={`flex flex-col min-w-[280px] w-full max-w-[340px]
                min-h-[calc(100vh-180px)] glass-card-static
                border-t-4 ${style.topBorder} !rounded-t-none`}
        >
            {/* Column Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)]">
                <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                <h3 className="font-heading text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    {title}
                </h3>
                <span className="ml-auto text-[10px] font-bold text-[var(--text-tertiary)]
                    bg-[var(--bg-surface)] px-2 py-0.5 rounded-full tabular-nums">
                    {todos.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={`flex-1 flex flex-col gap-3 p-3 overflow-y-auto transition-colors duration-200 ${
                    isOver ? 'bg-[var(--accent-muted)] ring-1 ring-[var(--accent)]/20 ring-inset' : ''
                }`}
            >
                <SortableContext id={id} items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {todos.map(todo => (
                        <TaskCard key={todo.id} todo={todo} onEdit={onEditTask} />
                    ))}
                </SortableContext>

                {todos.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[120px]
                        border border-dashed border-[var(--border-default)] rounded-xl gap-2">
                        <GripVertical size={18} className="text-[var(--text-tertiary)] opacity-40" />
                        <p className="text-xs text-[var(--text-tertiary)]">Arrastar tarefas aqui</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
