import { motion } from 'framer-motion'
import { useAuth } from '@/components/core/AuthProvider'
import { useTranslation } from 'react-i18next'
import { Globe, User, LogOut, Check } from 'lucide-react'

const languageOptions = [
    { value: 'pt', label: 'Português (PT)', flag: '🇵🇹' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
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
            className="p-6 pt-20 w-full max-w-2xl"
        >
            <h1
                className="text-3xl font-bold tracking-tight mb-8"
                style={{ color: 'var(--color-text-primary)' }}
            >
                Definições
            </h1>

            <div className="space-y-8">
                {/* Profile Section */}
                <Section title="Perfil" icon={<User size={18} />}>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-blue-600 flex items-center justify-center text-white font-bold text-lg">
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

                {/* Language Section */}
                <Section title="Idioma" icon={<Globe size={18} />}>
                    <div className="grid grid-cols-2 gap-3">
                        {languageOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => i18n.changeLanguage(opt.value)}
                                className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${currentLang === opt.value
                                    ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                                    : 'bg-white/5 border-white/5 text-[var(--color-text-secondary)] hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <span className="text-2xl">{opt.flag}</span>
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
                <Section title="Sessão" icon={<LogOut size={18} />}>
                    <button
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3
                            rounded-xl bg-red-500/10 border border-red-500/20
                            text-red-400 hover:bg-red-500/20 transition-colors
                            text-sm font-medium cursor-pointer"
                    >
                        <LogOut size={16} />
                        Terminar Sessão
                    </button>
                </Section>
            </div>
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
