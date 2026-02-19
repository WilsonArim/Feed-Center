import { useLinks } from '@/hooks/useLinks'
import { ExternalLink } from 'lucide-react'

export function LinksWidget() {
    const { data: links, isLoading } = useLinks()

    if (isLoading) {
        return <div className="animate-pulse h-full bg-white/5 rounded" />
    }

    const recentLinks = links?.slice(0, 3) || []

    return (
        <div className="flex flex-col h-full justify-between">
            <div>
                <div className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    Leitura Pendente
                </div>
                <div className="text-2xl font-bold text-white mb-4">
                    {links?.length || 0} <span className="text-sm font-normal text-white/40">artigos</span>
                </div>
            </div>

            <div className="space-y-2">
                {recentLinks.map(link => (
                    <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-white/70 hover:text-[var(--color-accent)] transition-colors truncate block"
                    >
                        <ExternalLink size={12} className="flex-shrink-0 opacity-50" />
                        <span className="truncate">{link.title || link.url}</span>
                    </a>
                ))}
                {recentLinks.length === 0 && (
                    <div className="text-xs text-white/30 italic">Nenhum link salvo.</div>
                )}
            </div>
        </div>
    )
}
