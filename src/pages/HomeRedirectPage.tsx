import { Navigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { useHomePagePreference } from '@/hooks/useUserSettings'
import { DEFAULT_HOME_PAGE } from '@/services/userSettingsService'
import { useLocaleText } from '@/i18n/useLocaleText'

export function HomeRedirectPage() {
    const { txt } = useLocaleText()
    const { data: homePage, isLoading } = useHomePagePreference()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 size={16} className="animate-spin" />
                    {txt('A preparar pagina inicial...', 'Preparing start page...')}
                </div>
            </div>
        )
    }

    return <Navigate to={homePage ?? DEFAULT_HOME_PAGE} replace />
}
