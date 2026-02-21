import { useTodos } from '@/hooks/useTodos'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'

export function TodoWidget() {
    const { txt, isEnglish } = useLocaleText()
    const { data: todos, isLoading } = useTodos()

    if (isLoading) {
        return <div className="animate-pulse h-16 w-full bg-[var(--color-bg-tertiary)] rounded-xl" />
    }

    const pendingTodos = todos?.filter(t => t.status !== 'done') || []
    const highPriority = pendingTodos.filter(t => t.priority === 'high')
    const nextTasks = pendingTodos
        .sort((a, b) => (a.due_date && b.due_date ? a.due_date.localeCompare(b.due_date) : 0))
        .slice(0, 3)

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-[var(--color-text-primary)]">{pendingTodos.length}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">{txt('pendentes', 'pending')}</span>
                </div>
                {highPriority.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-[var(--color-warning)] bg-[var(--color-warning)]/10 px-2 py-1 rounded-lg border border-[var(--color-warning)]/15 font-medium">
                        <AlertCircle size={12} />
                        {highPriority.length} {txt('Alta', 'High')}
                    </div>
                )}
            </div>

            <div className="space-y-1.5 flex-1 overflow-hidden">
                {nextTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-xs text-center">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center mb-2">
                            <CheckCircle2 size={18} className="text-[var(--color-success)]" />
                        </div>
                        {txt('Tudo feito!', 'All done!')}
                    </div>
                ) : (
                    nextTasks.map(todo => (
                        <div key={todo.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors group">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                todo.priority === 'high' ? 'bg-[var(--color-warning)]' :
                                todo.priority === 'medium' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-muted)]'
                            }`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-accent)] transition-colors">
                                    {todo.title}
                                </p>
                                {todo.due_date && (
                                    <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                                        <Clock size={10} />
                                        {new Date(todo.due_date).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
