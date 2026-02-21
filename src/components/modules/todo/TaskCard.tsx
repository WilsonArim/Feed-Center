import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { GripVertical, Clock, MoreHorizontal } from 'lucide-react'
import type { Todo } from '@/types'
import { useLocaleText } from '@/i18n/useLocaleText'
import { Magnetic } from '@/components/ui/Magnetic'

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
    const { txt, isEnglish } = useLocaleText()
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

    const priorityLabel = todo.priority === 'high'
        ? txt('Alta', 'High')
        : todo.priority === 'medium'
            ? txt('Media', 'Medium')
            : txt('Baixa', 'Low')

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
                group relative p-5 rounded-2xl
                bg-transparent border border-transparent
                hover:bg-white/[0.03] hover:border-white/10 hover:shadow-[0_4px_30px_rgba(0,0,0,0.5)]
                transition-all duration-300 cursor-default
                ${isOverlay ? 'shadow-2xl shadow-black/80 scale-[1.05] rotate-[3deg] cursor-grabbing ring-1 ring-[var(--accent)]/50 bg-[#121212]/90 backdrop-blur-xl' : ''}
            `}
        >
            {/* Header: Priority & Actions */}
            <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[10px] uppercase font-bold tracking-[0.15em] px-2.5 py-1 rounded-full border ${PRIORITY_COLORS[todo.priority]} backdrop-blur-sm`}>
                    {priorityLabel}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Magnetic strength={0.3}>
                        <button
                            {...attributes}
                            {...listeners}
                            className="p-1.5 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                            aria-label={txt('Arrastar tarefa', 'Drag task')}
                        >
                            <GripVertical size={16} className="text-[var(--color-text-muted)] group-hover:text-white transition-colors" />
                        </button>
                    </Magnetic>
                    {onEdit && (
                        <Magnetic strength={0.3}>
                            <button
                                onClick={() => onEdit(todo)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                aria-label={txt('Editar tarefa', 'Edit task')}
                            >
                                <MoreHorizontal size={16} className="text-[var(--color-text-muted)] group-hover:text-white transition-colors" />
                            </button>
                        </Magnetic>
                    )}
                </div>
            </div>

            {/* Content */}
            <h4 className="text-base font-bold text-white mb-2 line-clamp-2 leading-snug drop-shadow-md group-hover:text-[var(--accent)] transition-colors duration-300">
                {todo.title}
            </h4>

            {/* Footer: Due Date */}
            {todo.due_date && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                    <Clock size={12} className="text-[var(--accent)]" />
                    <span className="text-[11px] text-[var(--color-text-secondary)] font-semibold tracking-wider uppercase">
                        {new Date(todo.due_date).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT')}
                    </span>
                </div>
            )}
        </motion.div>
    )
}
