import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { useTranslation } from 'react-i18next'
import { Globe, User, LogOut, Check, Palette } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const languageOptions = [
    { value: 'pt', label: 'Portugues (PT)', flag: 'PT' },
    { value: 'en', label: 'English', flag: 'EN' },
]

export function SettingsPage() {
    const { user, signOut } = useAuth()
    const { i18n } = useTranslation()

    const currentLang = i18n.language?.startsWith('pt') ? 'pt' : 'en'

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6 pt-20 w-full max-w-2xl flex flex-col gap-8"
        >
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] font-sans">
                Definicoes
            </h1>

            {/* Profile Section */}
            <Section title="Perfil" icon={<User size={18} />}>
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
            <Section title="Aparencia" icon={<Palette size={18} />}>
                <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">Tema</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Alterne entre modo claro e escuro</p>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </Section>

            {/* Language Section */}
            <Section title="Idioma" icon={<Globe size={18} />}>
                <div className="grid grid-cols-2 gap-3">
                    {languageOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => i18n.changeLanguage(opt.value)}
                            className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                currentLang === opt.value
                                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-accent)]/20'
                            }`}
                        >
                            <span className="text-sm font-bold bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-lg">{opt.flag}</span>
                            <span className="text-sm font-medium">{opt.label}</span>
                            {currentLang === opt.value && (
                                <div className="absolute top-2 right-2">
                                    <Check size={14} className="text-[var(--color-accent)]" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Danger Zone */}
            <Section title="Sessao" icon={<LogOut size={18} />}>
                <button
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium cursor-pointer"
                >
                    <LogOut size={16} />
                    Terminar Sessao
                </button>
            </Section>
        </motion.div>
    )
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
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
