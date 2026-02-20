import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { GripVertical, Clock, MoreHorizontal } from 'lucide-react'
import type { Todo } from '@/types'

interface TaskCardProps {
    todo: Todo
    onEdit?: (todo: Todo) => void
    isOverlay?: boolean
}

const PRIORITY_COLORS = {
    high: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
}

export function TaskCard({ todo, onEdit, isOverlay }: TaskCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: todo.id,
        data: { type: 'Task', todo },
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 border-2 border-dashed border-[var(--color-accent)]/40 rounded-xl h-[100px] bg-[var(--color-accent)]/[0.03]"
            />
        )
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layoutId={isOverlay ? undefined : todo.id}
            className={`
                group relative p-4 rounded-xl
                border border-[var(--color-border)] bg-[var(--color-surface)]
                hover:border-[var(--color-accent)]/30 hover:shadow-lg hover:shadow-[var(--color-accent)]/[0.03]
                transition-all duration-200 cursor-default
                ${isOverlay ? 'shadow-2xl shadow-black/40 scale-[1.03] rotate-[2deg] cursor-grabbing ring-1 ring-[var(--color-accent)]/30' : ''}
            `}
        >
            {/* Header: Priority & Actions */}
            <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[todo.priority]}`}>
                    {todo.priority}
                </span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-md cursor-grab active:cursor-grabbing"
                        aria-label="Arrastar tarefa"
                    >
                        <GripVertical size={14} className="text-[var(--color-text-muted)]" />
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(todo)}
                            className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded-md"
                            aria-label="Editar tarefa"
                        >
                            <MoreHorizontal size={14} className="text-[var(--color-text-muted)]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1 line-clamp-2 leading-relaxed">
                {todo.title}
            </h4>

            {/* Footer: Due Date */}
            {todo.due_date && (
                <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[var(--color-border)]">
                    <Clock size={11} className="text-[var(--color-text-muted)]" />
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
                        {new Date(todo.due_date).toLocaleDateString('pt-BR')}
                    </span>
                </div>
            )}
        </motion.div>
    )
}
