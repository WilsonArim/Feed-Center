import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react'
import { motion } from 'framer-motion'
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
        { label: 'Concluidas', value: `${done} (${completionPct}%)`, icon: <CheckCircle2 size={13} />, color: '#22c55e' },
        { label: 'Alta Prioridade', value: String(high), icon: <AlertTriangle size={13} />, color: high > 0 ? '#ef4444' : 'var(--color-text-muted)' },
    ]

    return (
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <span style={{ color: s.color }}>{s.icon}</span>
                    <span className="text-[11px] uppercase tracking-wider font-medium text-[var(--color-text-muted)]">
                        {s.label}
                    </span>
                    <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
            ))}

            {/* Completion bar */}
            <div className="flex-1 min-w-[180px] flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)]">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: '#22c55e' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">{completionPct}%</span>
            </div>
        </div>
    )
}
