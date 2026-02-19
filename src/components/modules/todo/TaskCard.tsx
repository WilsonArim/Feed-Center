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
    high: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    low: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
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
        data: {
            type: 'Task',
            todo,
        },
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
                className="opacity-30 bg-[var(--color-surface)] border-2 border-[var(--color-accent)] rounded-xl h-[100px]"
            />
        )
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            layoutId={isOverlay ? undefined : todo.id}
            className={`
                group relative p-4 rounded-xl border border-[var(--color-border)]
                bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50
                transition-all duration-200 cursor-default
                ${isOverlay ? 'shadow-2xl scale-105 rotate-2 cursor-grabbing' : ''}
            `}
        >
            {/* Header: Priority & Actions */}
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[todo.priority]}`}>
                    {todo.priority}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-white/5 rounded cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical size={14} className="text-[var(--color-text-muted)]" />
                    </button>
                    {onEdit && (
                        <button
                            onClick={() => onEdit(todo)}
                            className="p-1 hover:bg-white/5 rounded"
                        >
                            <MoreHorizontal size={14} className="text-[var(--color-text-muted)]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1 line-clamp-2">
                {todo.title}
            </h4>

            {/* Footer: Tags & Due Date */}
            <div className="flex items-center gap-2 mt-3">
                {todo.due_date && (
                    <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                        <Clock size={12} />
                        <span>{new Date(todo.due_date).toLocaleDateString()}</span>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
