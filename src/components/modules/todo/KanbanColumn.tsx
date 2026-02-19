import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import type { Todo, TodoStatus } from '@/types'

interface KanbanColumnProps {
    id: TodoStatus
    title: string
    todos: Todo[]
    onEditTask: (todo: Todo) => void
}

const COLUMN_COLORS = {
    todo: 'bg-zinc-500/10 border-zinc-500/20',
    in_progress: 'bg-blue-500/10 border-blue-500/20',
    done: 'bg-emerald-500/10 border-emerald-500/20',
}

export function KanbanColumn({ id, title, todos, onEditTask }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({ id })

    return (
        <div className="flex flex-col h-full min-w-[300px] w-full max-w-[350px]">
            {/* Header */}
            <div className={`p-3 mb-3 rounded-xl border flex items-center justify-between ${COLUMN_COLORS[id]}`}>
                <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
                <span className="text-xs font-mono px-2 py-0.5 bg-black/20 rounded-md">
                    {todos.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className="flex-1 flex flex-col gap-3 p-1 overflow-y-auto"
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
            </div>
        </div>
    )
}
