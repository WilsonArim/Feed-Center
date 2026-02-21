import { Link2, Pin, Tag } from 'lucide-react'
import { useLinks, useTags } from '@/hooks/useLinks'
import { useLocaleText } from '@/i18n/useLocaleText'

export function LinksStatsBar() {
    const { txt } = useLocaleText()
    const { data: links = [] } = useLinks()
    const { data: allTags = [] } = useTags()

    const totalLinks = links.length
    const pinnedLinks = links.filter((l: any) => l.pinned).length
    const topTag = allTags.length > 0 ? allTags[0] : null

    const stats = [
        { label: txt('Total Links', 'Total Links'), value: String(totalLinks), icon: <Link2 size={16} />, color: 'var(--color-accent)' },
        { label: txt('Fixados', 'Pinned'), value: String(pinnedLinks), icon: <Pin size={16} />, color: '#f59e0b' },
        { label: txt('Tag Principal', 'Top Tag'), value: topTag || '--', icon: <Tag size={16} />, color: '#8b5cf6' },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 pt-2 pb-6 border-b border-white/5">
            {stats.map(s => (
                <div key={s.label} className="flex flex-col gap-1 transition-all group">
                    <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <span style={{ color: s.color }} className="drop-shadow-[0_0_8px_currentColor]">{s.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] drop-shadow-sm">{s.label}</span>
                    </div>
                    <div className="text-2xl font-black tracking-tight drop-shadow-md truncate tabular-nums" style={{ color: s.color }}>{s.value}</div>
                </div>
            ))}
        </div>
    )
}
