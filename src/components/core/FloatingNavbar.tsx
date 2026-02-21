import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Bell, Menu, Command } from 'lucide-react'
import { useMagneticHover } from '@/hooks/useMagneticHover'
import { useNotifications } from '@/hooks/useNotifications'
import { UserDropdown } from './UserDropdown'
import { NotificationPanel } from './NotificationPanel'
import { useUIStore } from '@/stores/uiStore'
import { useLocaleText } from '@/i18n/useLocaleText'

function MagneticIcon({ children }: { children: React.ReactNode }) {
    const { ref, state, handleMouseMove, handleMouseLeave } = useMagneticHover()

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: state.x, y: state.y, scale: state.scale }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center justify-center"
        >
            {children}
        </motion.div>
    )
}

export function FloatingNavbar() {
    const { txt } = useLocaleText()
    const toggleSidebar = useUIStore((s) => s.toggleSidebar)
    const { notifications, hasNotifications } = useNotifications()
    const [notifOpen, setNotifOpen] = useState(false)

    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[var(--z-navbar)]
                rounded-2xl
                flex items-center gap-1.5 px-2 py-1.5
                bg-[var(--color-bg-secondary)]/80 border border-[var(--color-border)]
                shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]
                backdrop-blur-xl"
        >
            {/* Mobile hamburger */}
            <MagneticIcon>
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 rounded-xl cursor-pointer
                        text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    aria-label={txt('Menu', 'Menu')}
                >
                    <Menu size={18} />
                </button>
            </MagneticIcon>

            {/* Search */}
            <button
                onClick={() => {
                    window.dispatchEvent(
                        new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
                    )
                }}
                className="relative flex items-center cursor-pointer group"
                aria-label={txt('Pesquisar', 'Search')}
            >
                <Search size={15} className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none group-hover:text-[var(--color-accent)] transition-colors" />
                <div
                    className="pl-9 pr-16 py-2 w-44 md:w-64 rounded-xl
                        bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]
                        text-sm text-[var(--color-text-muted)]
                        group-hover:border-[var(--color-accent)]/30 transition-all text-left"
                >
                    {txt('Pesquisar', 'Search')}...
                </div>
                <kbd className="absolute right-2.5 flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] font-medium
                    bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md px-1.5 py-0.5
                    hidden md:flex">
                    <Command size={10} /> K
                </kbd>
            </button>

            {/* Notification bell */}
            <div className="relative">
                <MagneticIcon>
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative p-2 rounded-xl cursor-pointer
                            text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                        aria-label={txt('Notificacoes', 'Notifications')}
                    >
                        <Bell size={18} />
                        {hasNotifications && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                                style={{ background: 'var(--color-danger)' }}
                            />
                        )}
                    </button>
                </MagneticIcon>
                <NotificationPanel
                    open={notifOpen}
                    onClose={() => setNotifOpen(false)}
                    notifications={notifications}
                />
            </div>

            {/* User */}
            <MagneticIcon>
                <UserDropdown />
            </MagneticIcon>
        </motion.header>
    )
}
