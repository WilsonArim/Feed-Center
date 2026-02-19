import { Link2, Pin, Tag } from 'lucide-react'
import { useLinks, useTags } from '@/hooks/useLinks'

export function LinksStatsBar() {
    const { data: links = [] } = useLinks()
    const { data: allTags = [] } = useTags()

    const totalLinks = links.length
    const pinnedLinks = links.filter((l: any) => l.pinned).length
    const topTag = allTags.length > 0 ? allTags[0] : null

    const stats = [
        { label: 'Total Links', value: String(totalLinks), icon: <Link2 size={16} />, color: 'var(--color-accent)' },
        { label: 'Fixados', value: String(pinnedLinks), icon: <Pin size={16} />, color: '#f59e0b' },
        { label: 'Tag Principal', value: topTag || '—', icon: <Tag size={16} />, color: '#8b5cf6' },
    ]

    return (
        <div className="grid grid-cols-3 gap-3 mb-6">
            {stats.map(s => (
                <div key={s.label} className="rounded-xl p-3 transition-all"
                    style={{ background: 'var(--color-bg-glass)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span style={{ color: s.color }}>{s.icon}</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider"
                            style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
                    </div>
                    <div className="text-lg font-bold truncate" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
