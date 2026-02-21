import { Newspaper, BarChart3, Clock, Hash } from 'lucide-react'
import { useNewsTopics } from '@/hooks/useNews'
import { useLocaleText } from '@/i18n/useLocaleText'

export function NewsStatsBar() {
    const { txt } = useLocaleText()
    const { data: topicCounts } = useNewsTopics()

    const topics = topicCounts || {}
    const totalNews = Object.values(topics).reduce((a, b) => a + b, 0)
    const topicCount = Object.keys(topics).length
    const topTopic = Object.entries(topics).sort(([, a], [, b]) => b - a)[0]

    const stats = [
        { label: txt('Total Noticias', 'Total News'), value: String(totalNews), icon: <Newspaper size={16} />, color: 'var(--color-accent)' },
        { label: txt('Topicos', 'Topics'), value: String(topicCount), icon: <Hash size={16} />, color: '#8b5cf6' },
        { label: txt('Mais Frequente', 'Most Frequent'), value: topTopic ? `${topTopic[0]} (${topTopic[1]})` : '—', icon: <BarChart3 size={16} />, color: '#f59e0b' },
        { label: txt('Ultima Atualizacao', 'Last Update'), value: txt('Agora', 'Now'), icon: <Clock size={16} />, color: '#22c55e' },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 pt-2 pb-6 border-b border-white/5">
            {stats.map(s => (
                <div key={s.label} className="flex flex-col gap-1 transition-all group">
                    <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span style={{ color: s.color }} className="drop-shadow-[0_0_8px_currentColor]">{s.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm">{s.label}</span>
                    </div>
                    <div className="text-2xl font-black tracking-tight drop-shadow-md tabular-nums truncate" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
