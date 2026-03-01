import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/core/AuthProvider'
import { useTranslation } from 'react-i18next'
import { Globe, User, LogOut, Check, Palette, Moon, Sun, Monitor, House, Bot, Sparkles, Eye, Layers, CreditCard, Smartphone, PanelLeft } from 'lucide-react'
import { NextActionsStrip, PageHeader } from '@/components/core/PagePrimitives'
import { StardustButton } from '@/components/ui/StardustButton'
import { useThemeStore } from '@/stores/themeStore'
import {
    useCopilotAvatarUrl,
    useCopilotName,
    useHomePagePreference,
    useSetCopilotAvatarUrl,
    useSetCopilotName,
    useSetHomePagePreference,
    useSetShowMerchantInsights,
    useShowMerchantInsights,
} from '@/hooks/useUserSettings'
import {
    DEFAULT_COPILOT_AVATAR_URL,
    DEFAULT_COPILOT_NAME,
    DEFAULT_HOME_PAGE,
    type HomePageOption,
} from '@/services/userSettingsService'
import { useModuleStore, ALL_MODULES, MODULE_META, type ModuleId } from '@/stores/moduleStore'
import { getBuggyPosition, setBuggyPosition, type BuggyPosition } from '@/components/spatial/SpatialCommandCenter'
import { WalletManager } from '@/components/finance/WalletManager'

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

const homePageOptions: { value: HomePageOption; labelKey: string }[] = [
    { value: '/start', labelKey: 'settings.home_page_start' },
    { value: '/today', labelKey: 'settings.home_page_today' },
    { value: '/dashboard', labelKey: 'settings.home_page_dashboard' },
    { value: '/financeiro', labelKey: 'settings.home_page_financial' },
    { value: '/todo', labelKey: 'settings.home_page_todo' },
    { value: '/links', labelKey: 'settings.home_page_links' },
    { value: '/news', labelKey: 'settings.home_page_news' },
    { value: '/crypto', labelKey: 'settings.home_page_crypto' },
]

function normalizeLanguage(raw: string | undefined): AppLanguage {
    return raw?.startsWith('pt') ? 'pt' : 'en'
}

export function SettingsPage() {
    const { user, signOut } = useAuth()
    const { i18n, t } = useTranslation()
    const { mode, setMode } = useThemeStore()
    const homePageQuery = useHomePagePreference()
    const setHomePagePreference = useSetHomePagePreference()
    const copilotNameQuery = useCopilotName()
    const setCopilotName = useSetCopilotName()
    const copilotAvatarQuery = useCopilotAvatarUrl()
    const setCopilotAvatar = useSetCopilotAvatarUrl()
    const showMerchantInsightsQuery = useShowMerchantInsights()
    const setShowMerchantInsights = useSetShowMerchantInsights()

    const appliedLanguage = normalizeLanguage(i18n.resolvedLanguage || i18n.language)
    const appliedHomePage = homePageQuery.data ?? DEFAULT_HOME_PAGE
    const appliedCopilotName = copilotNameQuery.data ?? DEFAULT_COPILOT_NAME
    const appliedCopilotAvatar = copilotAvatarQuery.data ?? DEFAULT_COPILOT_AVATAR_URL
    const appliedShowMerchantInsights = showMerchantInsightsQuery.data ?? false

    const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(appliedLanguage)
    const [draftTheme, setDraftTheme] = useState<ThemeMode>(mode)
    const [draftHomePage, setDraftHomePage] = useState<HomePageOption>(appliedHomePage)
    const [draftCopilotName, setDraftCopilotName] = useState(appliedCopilotName)
    const [draftCopilotAvatar, setDraftCopilotAvatar] = useState(appliedCopilotAvatar)
    const [draftShowMerchantInsights, setDraftShowMerchantInsights] = useState(appliedShowMerchantInsights)
    const [draftBuggyPos, setDraftBuggyPos] = useState<BuggyPosition>(getBuggyPosition)
    const [savedFeedback, setSavedFeedback] = useState(false)

    useEffect(() => {
        setDraftLanguage(appliedLanguage)
    }, [appliedLanguage])

    useEffect(() => {
        setDraftTheme(mode)
    }, [mode])

    useEffect(() => {
        setDraftHomePage(appliedHomePage)
    }, [appliedHomePage])

    useEffect(() => {
        setDraftCopilotName(appliedCopilotName)
    }, [appliedCopilotName])

    useEffect(() => {
        setDraftCopilotAvatar(appliedCopilotAvatar)
    }, [appliedCopilotAvatar])

    useEffect(() => {
        setDraftShowMerchantInsights(appliedShowMerchantInsights)
    }, [appliedShowMerchantInsights])

    const hasChanges = draftLanguage !== appliedLanguage
        || draftTheme !== mode
        || draftHomePage !== appliedHomePage
        || draftCopilotName.trim() !== appliedCopilotName.trim()
        || draftCopilotAvatar.trim() !== appliedCopilotAvatar.trim()
        || draftShowMerchantInsights !== appliedShowMerchantInsights

    const handleApply = async () => {
        setSavedFeedback(false)

        if (draftLanguage !== appliedLanguage) {
            await i18n.changeLanguage(draftLanguage)
        }

        if (draftTheme !== mode) {
            setMode(draftTheme)
        }

        if (draftHomePage !== appliedHomePage) {
            await setHomePagePreference.mutateAsync(draftHomePage)
        }

        const normalizedDraftName = draftCopilotName.trim() || DEFAULT_COPILOT_NAME
        if (normalizedDraftName !== appliedCopilotName.trim()) {
            await setCopilotName.mutateAsync(normalizedDraftName)
            setDraftCopilotName(normalizedDraftName)
        }

        const normalizedAvatar = draftCopilotAvatar.trim() || DEFAULT_COPILOT_AVATAR_URL
        if (normalizedAvatar !== appliedCopilotAvatar.trim()) {
            await setCopilotAvatar.mutateAsync(normalizedAvatar)
            setDraftCopilotAvatar(normalizedAvatar)
        }

        if (draftShowMerchantInsights !== appliedShowMerchantInsights) {
            await setShowMerchantInsights.mutateAsync(draftShowMerchantInsights)
        }

        setSavedFeedback(true)
        window.setTimeout(() => setSavedFeedback(false), 2000)
    }

    const handleResetToDefault = () => {
        setSavedFeedback(false)
        setDraftLanguage(DEFAULT_LANGUAGE)
        setDraftTheme(DEFAULT_THEME)
        setDraftHomePage(DEFAULT_HOME_PAGE)
        setDraftCopilotName(DEFAULT_COPILOT_NAME)
        setDraftCopilotAvatar(DEFAULT_COPILOT_AVATAR_URL)
        setDraftShowMerchantInsights(false)
    }

    const settingsStateText = useMemo(() => {
        if (savedFeedback) return t('settings.saved')
        if (hasChanges) return t('settings.pending')
        return t('settings.actions_help')
    }, [savedFeedback, hasChanges, t])

    return (
        <div className="w-full max-w-2xl flex flex-col gap-8 pb-12">
            <PageHeader
                icon={<User size={18} />}
                title={t('settings.title')}
                subtitle={t('settings.subtitle')}
                meta={user?.email || ''}
            />

            {/* Profile Section */}
            <Section title={t('settings.profile')} icon={<User size={18} />}>
                <div className="flex items-center gap-4 py-4 border-b border-white/5">
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
                <div className="py-4 border-b border-white/5">
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
                                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all cursor-pointer ${isActive
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

            {/* Copilot Section */}
            <Section title={appliedLanguage === 'en' ? 'Copilot' : 'Copiloto'} icon={<Bot size={18} />}>
                <div className="py-4 border-b border-white/5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {appliedLanguage === 'en' ? 'Copilot name' : 'Nome do copiloto'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {appliedLanguage === 'en'
                            ? 'Use a short name to make interactions feel natural.'
                            : 'Usa um nome curto para tornar as interações mais naturais.'}
                    </p>
                    <input
                        type="text"
                        maxLength={32}
                        value={draftCopilotName}
                        onChange={(e) => setDraftCopilotName(e.target.value)}
                        placeholder={DEFAULT_COPILOT_NAME}
                        className="mt-3 w-full px-4 py-2.5 text-sm bg-transparent border-b border-white/10 outline-none focus:border-[var(--color-accent)] transition-colors"
                    />
                </div>
                <div className="mt-2 py-4 border-b border-white/5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {appliedLanguage === 'en' ? 'Copilot image (Free)' : 'Imagem do copiloto (Free)'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {appliedLanguage === 'en'
                            ? 'Set an image URL or keep default mascot.'
                            : 'Define URL de imagem ou mantém o mascote padrão.'}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                        <img
                            src={draftCopilotAvatar || DEFAULT_COPILOT_AVATAR_URL}
                            alt="Copilot avatar preview"
                            className="w-12 h-12 rounded-full object-cover bg-transparent border border-white/10"
                            onError={(e) => { e.currentTarget.src = DEFAULT_COPILOT_AVATAR_URL }}
                        />
                        <input
                            type="text"
                            value={draftCopilotAvatar}
                            onChange={(e) => setDraftCopilotAvatar(e.target.value)}
                            placeholder={DEFAULT_COPILOT_AVATAR_URL}
                            className="flex-1 px-4 py-2.5 text-sm bg-transparent border-b border-white/10 outline-none focus:border-[var(--color-accent)] transition-colors"
                        />
                    </div>
                    <div className="mt-2 flex gap-2">
                        <button
                            type="button"
                            onClick={() => setDraftCopilotAvatar(DEFAULT_COPILOT_AVATAR_URL)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)]/40 cursor-pointer"
                        >
                            {appliedLanguage === 'en' ? 'Use default' : 'Usar padrão'}
                        </button>
                    </div>
                </div>

                {/* Buggy Position */}
                <div className="mt-2 py-4 border-b border-white/5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {appliedLanguage === 'en' ? 'Buggy position (mobile)' : 'Posição do Buggy (mobile)'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {appliedLanguage === 'en'
                            ? 'Choose how Buggy appears on small screens.'
                            : 'Escolhe como o Buggy aparece em ecrãs pequenos.'}
                    </p>
                    <div className="mt-3 flex gap-2">
                        {([
                            { value: 'adaptive' as const, icon: <Smartphone size={14} />, label: appliedLanguage === 'en' ? 'Adaptive' : 'Adaptável' },
                            { value: 'sidebar' as const, icon: <PanelLeft size={14} />, label: appliedLanguage === 'en' ? 'Force sidebar' : 'Forçar barra lateral' },
                        ]).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    setDraftBuggyPos(opt.value)
                                    setBuggyPosition(opt.value)
                                    window.dispatchEvent(new Event('buggy-position-changed'))
                                }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                    draftBuggyPos === opt.value
                                        ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40'
                                }`}
                            >
                                {opt.icon}
                                {opt.label}
                                {draftBuggyPos === opt.value && <Check size={12} />}
                            </button>
                        ))}
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
                            className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${draftLanguage === opt.value
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

            {/* Home Page Section */}
            <Section title={t('settings.home_page')} icon={<House size={18} />}>
                <div className="py-4 border-b border-white/5">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.home_page')}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('settings.home_page_help')}</p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {homePageOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDraftHomePage(opt.value)}
                                className={`relative flex items-center justify-between gap-2 p-3 rounded-xl border text-sm transition-all cursor-pointer ${draftHomePage === opt.value
                                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/20'
                                    }`}
                            >
                                <span className="font-medium">{t(opt.labelKey)}</span>
                                <span className="text-xs opacity-70">{opt.value}</span>
                                {draftHomePage === opt.value && (
                                    <div className="absolute top-2 right-2">
                                        <Check size={14} className="text-[var(--color-accent)]" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </Section>

            <Section title={appliedLanguage === 'en' ? 'Merchant intelligence' : 'Inteligência por comerciante'} icon={<Eye size={18} />}>
                <div className="py-4 border-b border-white/5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {appliedLanguage === 'en'
                                    ? 'Show store and item inflation insights'
                                    : 'Mostrar insights de inflação por loja e item'}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                {appliedLanguage === 'en'
                                    ? 'Data is always saved (NIF, merchant, and OCR line items). This switch only controls visibility in Finance.'
                                    : 'Os dados são sempre guardados (NIF, comerciante e linhas OCR dos talões). Este switch só controla a visibilidade em Finanças.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDraftShowMerchantInsights((v) => !v)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${draftShowMerchantInsights
                                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/35'
                                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
                                }`}
                        >
                            <Sparkles size={12} />
                            {draftShowMerchantInsights
                                ? (appliedLanguage === 'en' ? 'Visible' : 'Visível')
                                : (appliedLanguage === 'en' ? 'Hidden' : 'Oculto')}
                        </button>
                    </div>
                </div>
            </Section>

            {/* Active Modules Section */}
            <Section title={appliedLanguage === 'en' ? 'Active modules' : 'Módulos ativos'} icon={<Layers size={18} />}>
                <div className="py-4 border-b border-white/5">
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                        {appliedLanguage === 'en'
                            ? 'Toggle modules to show or hide them from the navigation bar.'
                            : 'Ativa ou desativa módulos para os mostrar ou esconder da barra de navegação.'}
                    </p>
                    <div className="space-y-2">
                        {ALL_MODULES.map((id: ModuleId) => {
                            const meta = MODULE_META[id]
                            const active = useModuleStore.getState().isActive(id)
                            return (
                                <button
                                    key={id}
                                    onClick={() => useModuleStore.getState().toggleModule(id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer ${active
                                            ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/8'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] opacity-60'
                                        }`}
                                >
                                    <span className="text-lg">{meta.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {appliedLanguage === 'en' ? meta.labelEn : meta.labelPt}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] truncate">
                                            {appliedLanguage === 'en' ? meta.descEn : meta.descPt}
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${active
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                                            : 'border-[var(--color-border)]'
                                        }`}>
                                        {active && <Check size={12} className="text-white" />}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </Section>

            {/* Wallets Section */}
            <Section title={appliedLanguage === 'en' ? 'Wallets' : 'Carteiras'} icon={<CreditCard size={18} />}>
                <div className="py-4 border-b border-white/5">
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">
                        {appliedLanguage === 'en'
                            ? 'Manage funding sources. Buggy will auto-detect wallets from voice commands (e.g., "paid with Revolut").'
                            : 'Gere fontes de pagamento. O Buggy auto-detecta carteiras de comandos de voz (ex: "paguei com Revolut").'}
                    </p>
                    <WalletManager />
                </div>
            </Section>

            {/* Apply/Default Section */}
            <Section title={t('settings.actions_title')} icon={<Check size={18} />}>
                <div className="py-4 border-b border-white/5">
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
                            disabled={
                                !hasChanges
                                || homePageQuery.isLoading
                                || copilotNameQuery.isLoading
                                || copilotAvatarQuery.isLoading
                                || showMerchantInsightsQuery.isLoading
                                || setHomePagePreference.isPending
                                || setCopilotName.isPending
                                || setCopilotAvatar.isPending
                                || setShowMerchantInsights.isPending
                            }
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
                    { label: t('settings.next_dashboard'), to: '/dashboard' },
                    { label: t('settings.next_tasks'), to: '/todo' },
                    { label: t('settings.next_links'), to: '/links' },
                ]}
            />
        </div>
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
