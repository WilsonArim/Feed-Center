import { useTodos } from '@/hooks/useTodos'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export function TodoWidget() {
    const { data: todos, isLoading } = useTodos()

    if (isLoading) {
        return <div className="animate-pulse h-16 w-full bg-white/5 rounded" />
    }

    // Filter pending tasks
    const pendingTodos = todos?.filter(t => t.status !== 'done') || []
    const highPriority = pendingTodos.filter(t => t.priority === 'high')
    const nextTasks = pendingTodos
        .sort((a, b) => (a.due_date && b.due_date ? a.due_date.localeCompare(b.due_date) : 0))
        .slice(0, 3)

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg-secondary)]/30 -m-6 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">{pendingTodos.length}</span>
                    <span className="text-sm text-white/50">pendentes</span>
                </div>
                {highPriority.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full border border-orange-400/20">
                        <AlertCircle size={12} />
                        {highPriority.length} Alta Prioridade
                    </div>
                )}
            </div>

            <div className="space-y-2 flex-1 overflow-hidden">
                {nextTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 text-xs text-center">
                        <CheckCircle2 size={24} className="mb-2 opacity-50" />
                        Tudo feito!
                    </div>
                ) : (
                    nextTasks.map(todo => (
                        <div key={todo.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${todo.priority === 'high' ? 'bg-orange-500' :
                                todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-white/90 truncate group-hover:text-[var(--color-accent)] transition-colors">
                                    {todo.title}
                                </p>
                                {todo.due_date && (
                                    <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                        <Clock size={10} />
                                        {new Date(todo.due_date).toLocaleDateString('pt-PT')}
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
