import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'

export function TodoStatsBar() {
    const { data: todos = [], isLoading } = useTodos()

    if (isLoading) return null

    const total = todos.length
    const done = todos.filter(t => t.status === 'done').length
    const pending = total - done
    const high = todos.filter(t => t.priority === 'high' && t.status !== 'done').length
    const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

    const stats = [
        { label: 'Total', value: String(total), icon: <ListTodo size={13} />, color: 'var(--color-accent)' },
        { label: 'Pendentes', value: String(pending), icon: <Clock size={13} />, color: '#f59e0b' },
        { label: 'Concluídas', value: `${done} (${completionPct}%)`, icon: <CheckCircle2 size={13} />, color: '#22c55e' },
        { label: 'Alta Prioridade', value: String(high), icon: <AlertTriangle size={13} />, color: high > 0 ? '#ef4444' : '#64748b' },
    ]

    return (
        <div className="flex items-center gap-4 flex-wrap">
            {stats.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                        {s.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
            ))}

            {/* Compact completion bar */}
            <div className="flex-1 min-w-[60px] h-1 rounded-full overflow-hidden"
                style={{ background: 'var(--color-bg-tertiary)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%`, background: '#22c55e' }} />
            </div>
        </div>
    )
}
