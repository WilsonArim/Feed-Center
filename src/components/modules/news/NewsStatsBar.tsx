import { Newspaper, BarChart3, Clock, Hash } from 'lucide-react'
import { useNewsTopics } from '@/hooks/useNews'

export function NewsStatsBar() {
    const { data: topicCounts } = useNewsTopics()

    const topics = topicCounts || {}
    const totalNews = Object.values(topics).reduce((a, b) => a + b, 0)
    const topicCount = Object.keys(topics).length
    const topTopic = Object.entries(topics).sort(([, a], [, b]) => b - a)[0]

    const stats = [
        { label: 'Total Notícias', value: String(totalNews), icon: <Newspaper size={16} />, color: 'var(--color-accent)' },
        { label: 'Tópicos', value: String(topicCount), icon: <Hash size={16} />, color: '#8b5cf6' },
        { label: 'Mais Frequente', value: topTopic ? `${topTopic[0]} (${topTopic[1]})` : '—', icon: <BarChart3 size={16} />, color: '#f59e0b' },
        { label: 'Última Atualização', value: 'Agora', icon: <Clock size={16} />, color: '#22c55e' },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {stats.map(s => (
                <div key={s.label} className="rounded-xl p-3 transition-all"
                    style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span style={{ color: s.color }}>{s.icon}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
                    </div>
                    <div className="text-sm font-bold truncate" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
