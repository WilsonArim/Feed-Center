import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { useTranslation } from 'react-i18next'
import { Globe, User, LogOut, Check, Palette, Moon, Sun, Monitor } from 'lucide-react'
import { NextActionsStrip, PageHeader } from '@/components/core/PagePrimitives'
import { StardustButton } from '@/components/ui/StardustButton'
import { useThemeStore } from '@/stores/themeStore'

type AppLanguage = 'pt' | 'en'
type ThemeMode = 'dark' | 'light' | 'system'

const DEFAULT_LANGUAGE: AppLanguage = 'pt'
const DEFAULT_THEME: ThemeMode = 'dark'

const languageOptions: { value: AppLanguage; label: string; flag: string }[] = [
    { value: 'pt', label: 'Portugues (PT)', flag: 'PT' },
    { value: 'en', label: 'English', flag: 'EN' },
]

const themeOptions: { value: ThemeMode; icon: typeof Sun; labelKey: string }[] = [
    { value: 'dark', icon: Moon, labelKey: 'settings.theme_dark' },
    { value: 'light', icon: Sun, labelKey: 'settings.theme_light' },
    { value: 'system', icon: Monitor, labelKey: 'settings.theme_system' },
]

function normalizeLanguage(raw: string | undefined): AppLanguage {
    return raw?.startsWith('pt') ? 'pt' : 'en'
}

export function SettingsPage() {
    const { user, signOut } = useAuth()
    const { i18n, t } = useTranslation()
    const { mode, setMode } = useThemeStore()

    const appliedLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language)

    const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(appliedLanguage)
    const [draftTheme, setDraftTheme] = useState<ThemeMode>(mode)
    const [savedFeedback, setSavedFeedback] = useState(false)

    useEffect(() => {
        setDraftLanguage(appliedLanguage)
    }, [appliedLanguage])

    useEffect(() => {
        setDraftTheme(mode)
    }, [mode])

    const hasChanges = draftLanguage !== appliedLanguage || draftTheme !== mode

    const handleApply = async () => {
        setSavedFeedback(false)

        if (draftLanguage !== appliedLanguage) {
            await i18n.changeLanguage(draftLanguage)
        }

        if (draftTheme !== mode) {
            setMode(draftTheme)
        }

        setSavedFeedback(true)
        window.setTimeout(() => setSavedFeedback(false), 2000)
    }

    const handleResetToDefault = () => {
        setSavedFeedback(false)
        setDraftLanguage(DEFAULT_LANGUAGE)
        setDraftTheme(DEFAULT_THEME)
    }

    const settingsStateText = useMemo(() => {
        if (savedFeedback) return t('settings.saved')
        if (hasChanges) return t('settings.pending')
        return t('settings.actions_help')
    }, [savedFeedback, hasChanges, t])

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl flex flex-col gap-8 pb-12"
        >
            <PageHeader
                icon={<User size={18} />}
                title={t('settings.title')}
                subtitle={t('settings.subtitle')}
                meta={user?.email || ''}
            />

            {/* Profile Section */}
            <Section title={t('settings.profile')} icon={<User size={18} />}>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-bg-primary)] font-bold text-lg">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                            {user?.email?.split('@')[0]}
                        </p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                            {user?.email}
                        </p>
                    </div>
                </div>
            </Section>

            {/* Theme Section */}
            <Section title={t('settings.appearance')} icon={<Palette size={18} />}>
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.theme')}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('settings.theme_help')}</p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {themeOptions.map((opt) => {
                            const Icon = opt.icon
                            const isActive = draftTheme === opt.value
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => setDraftTheme(opt.value)}
                                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/20'
                                    }`}
                                >
                                    <Icon size={15} />
                                    <span className="text-sm font-medium">{t(opt.labelKey)}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </Section>

            {/* Language Section */}
            <Section title={t('settings.language')} icon={<Globe size={18} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {languageOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setDraftLanguage(opt.value)}
                            className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                draftLanguage === opt.value
                                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/20'
                            }`}
                        >
                            <span className="text-sm font-bold bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-lg">{opt.flag}</span>
                            <span className="text-sm font-medium">{opt.label}</span>
                            {draftLanguage === opt.value && (
                                <div className="absolute top-2 right-2">
                                    <Check size={14} className="text-[var(--color-accent)]" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Apply/Default Section */}
            <Section title={t('settings.actions_title')} icon={<Check size={18} />}>
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className={`text-sm ${savedFeedback ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {settingsStateText}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <StardustButton
                            size="sm"
                            variant="secondary"
                            onClick={handleResetToDefault}
                        >
                            {t('common.default')}
                        </StardustButton>

                        <StardustButton
                            size="sm"
                            onClick={() => { void handleApply() }}
                            disabled={!hasChanges}
                        >
                            {t('common.apply')}
                        </StardustButton>
                    </div>
                </div>
            </Section>

            {/* Session */}
            <Section title={t('settings.session')} icon={<LogOut size={18} />}>
                <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium cursor-pointer"
                >
                    <LogOut size={16} />
                    {t('settings.sign_out')}
                </button>
            </Section>

            <NextActionsStrip
                title={t('settings.next_title')}
                actions={[
                    { label: t('settings.next_dashboard'), to: '/' },
                    { label: t('settings.next_tasks'), to: '/todo' },
                    { label: t('settings.next_links'), to: '/links' },
                ]}
            />
        </motion.div>
    )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-[var(--color-accent)]">{icon}</span>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h2>
            </div>
            {children}
        </div>
    )
}
