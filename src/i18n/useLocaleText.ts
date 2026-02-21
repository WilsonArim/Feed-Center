import { useTranslation } from 'react-i18next'

export function useLocaleText() {
    const { i18n } = useTranslation()
    const language = (i18n.resolvedLanguage || i18n.language || 'pt').toLowerCase()
    const isEnglish = language.startsWith('en')

    const txt = (pt: string, en: string) => (isEnglish ? en : pt)

    return {
        isEnglish,
        txt,
        language,
    }
}
