import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Bell, Command } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { UserDropdown } from './UserDropdown'
import { NotificationPanel } from './NotificationPanel'
import { useTranslation } from 'react-i18next'
import { useLocaleText } from '@/i18n/useLocaleText'

export function TopBar() {
    const { notifications, hasNotifications } = useNotifications()
    const { t } = useTranslation()
    const { txt } = useLocaleText()
    const [notifOpen, setNotifOpen] = useState(false)

    return (
        <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="app-topbar fixed top-0 right-0 z-30
                h-16 flex items-center justify-between gap-4 px-6 lg:px-8
                bg-[var(--topbar-bg)] backdrop-blur-2xl border-b border-[var(--topbar-border)]
                transition-all duration-300"
        >
            {/* Left — empty, page titles are within pages */}
            <div className="flex-1" />

            {/* Center — Search */}
            <button
                onClick={() => {
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
                }}
                className="relative flex items-center cursor-pointer group"
                aria-label={txt('Pesquisar', 'Search')}
            >
                <Search size={15} className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none
                    group-hover:text-[var(--accent)] transition-colors" />
                <div className="pl-9 pr-16 py-2 w-56 md:w-80 lg:w-96 rounded-xl
                    bg-[var(--bg-surface)] border border-[var(--border-subtle)]
                    text-sm text-[var(--text-tertiary)]
                    group-hover:border-[var(--accent)]/30 transition-all text-left">
                    {t('common.search')}...
                </div>
                <kbd className="absolute right-2.5 flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)] font-medium
                    bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md px-1.5 py-0.5
                    hidden md:flex">
                    <Command size={10} /> K
                </kbd>
            </button>

            {/* Right — Notifications + User */}
            <div className="flex items-center gap-2">
                <div className="relative">
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative p-2.5 rounded-xl cursor-pointer
                            text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-all"
                        aria-label={txt('Notificacoes', 'Notifications')}
                    >
                        <Bell size={18} />
                        {hasNotifications && (
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse" />
                        )}
                    </button>
                    <NotificationPanel
                        open={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        notifications={notifications}
                    />
                </div>
                <UserDropdown />
            </div>
        </motion.header>
    )
}
