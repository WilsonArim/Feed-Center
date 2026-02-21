import { useLinks } from '@/hooks/useLinks'
import { ExternalLink, BookOpen } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'

export function LinksWidget() {
    const { txt } = useLocaleText()
    const { data: links, isLoading } = useLinks()

    if (isLoading) {
        return <div className="animate-pulse h-full bg-[var(--color-bg-tertiary)] rounded-xl" />
    }

    const recentLinks = links?.slice(0, 3) || []

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
                    {txt('Leitura Pendente', 'Pending Reading')}
                </div>
                <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
                    {links?.length || 0} <span className="text-sm font-normal text-[var(--color-text-muted)]">{txt('artigos', 'articles')}</span>
                </div>
            </div>

            <div className="space-y-1.5">
                {recentLinks.map(link => (
                    <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors truncate p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)]"
                    >
                        <ExternalLink size={12} className="flex-shrink-0 opacity-50" />
                        <span className="truncate">{link.title || link.url}</span>
                    </a>
                ))}
                {recentLinks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-4 text-[var(--color-text-muted)]">
                        <BookOpen size={18} className="opacity-30 mb-1" />
                        <span className="text-xs">{txt('Nenhum link salvo.', 'No saved links.')}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
