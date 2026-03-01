import { NavLink, useLocation, useResolvedPath } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Compass, Sunrise, LayoutDashboard, Wallet, CheckSquare, Link2, Bitcoin,
    Newspaper, Settings, Search, Bell, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useTranslation } from 'react-i18next'
import { UserDropdown } from './UserDropdown'
import { NotificationPanel } from './NotificationPanel'
import { useNotifications } from '@/hooks/useNotifications'
import { Magnetic } from '../ui/Magnetic'
import { useModuleStore, type ModuleId } from '@/stores/moduleStore'

const ALWAYS_VISIBLE = new Set(['start', 'today', 'dashboard', 'settings'])

const NAV_TO_MODULE: Record<string, ModuleId> = {
    financeiro: 'finance',
    todo: 'tasks',
    crypto: 'crypto',
    links: 'links',
    news: 'news',
}

interface NavItem {
    id: string; to: string; icon: LucideIcon; label: string
    labelKey?: string
}

const navItems: NavItem[] = [
    { id: 'start', to: '/start', icon: Compass, label: 'Guia', labelKey: 'nav.start' },
    { id: 'today', to: '/today', icon: Sunrise, label: 'Hoje', labelKey: 'nav.today' },
    { id: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelKey: 'nav.dashboard' },
    { id: 'financeiro', to: '/financeiro', icon: Wallet, label: 'Financeiro', labelKey: 'nav.financial' },
    { id: 'todo', to: '/todo', icon: CheckSquare, label: 'To-Do', labelKey: 'nav.todo' },
    { id: 'links', to: '/links', icon: Link2, label: 'Links', labelKey: 'nav.links' },
    { id: 'news', to: '/news', icon: Newspaper, label: 'Noticias', labelKey: 'nav.news' },
    { id: 'crypto', to: '/crypto', icon: Bitcoin, label: 'Crypto', labelKey: 'nav.crypto' },
    { id: 'settings', to: '/settings', icon: Settings, label: 'Definicoes', labelKey: 'nav.settings' },
]

function DockItem({ item }: { item: NavItem }) {
    const { t } = useTranslation()
    const location = useLocation()
    const resolved = useResolvedPath(item.to)
    const exactMatch = location.pathname === resolved.pathname
    const childMatch = item.to !== '/' && location.pathname.startsWith(resolved.pathname)
    const isActive = exactMatch || childMatch
    const [hovered, setHovered] = useState(false)

    return (
        <Magnetic strength={0.2}>
            <div
                className="relative flex items-center justify-center pointer-events-auto"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: -45, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute whitespace-nowrap px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium rounded-sm shadow-[var(--shadow-md)] pointer-events-none z-50"
                        >
                            {item.labelKey ? t(item.labelKey) : item.label}
                        </motion.div>
                    )}
                </AnimatePresence>

                <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={`relative flex items-center justify-center w-12 h-12 rounded-sm transition-all duration-300 ${isActive
                        ? 'bg-[var(--accent-muted)] text-[var(--accent)] shadow-[inset_0_0_0_1px_var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] group'
                        }`}
                >
                    {isActive && (
                        <motion.div
                            layoutId="dock-indicator"
                            className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--accent)]"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                    )}
                    <item.icon size={22} className="relative z-10 transition-transform group-hover:scale-110" />
                </NavLink>
            </div>
        </Magnetic>
    )
}

export function FloatingNav() {
    const { notifications, hasNotifications } = useNotifications()
    const [notifOpen, setNotifOpen] = useState(false)
    const isModuleActive = useModuleStore((s) => s.isActive)

    const visibleItems = navItems.filter((item) => {
        if (ALWAYS_VISIBLE.has(item.id)) return true
        const moduleId = NAV_TO_MODULE[item.id]
        return moduleId ? isModuleActive(moduleId) : true
    })

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
            <div className="flex items-center gap-2 max-md:gap-1 p-2 max-md:p-1.5 bg-[var(--glass-bg)] backdrop-blur-2xl max-md:backdrop-blur-3xl border border-[var(--border-subtle)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] pointer-events-auto">
                <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
                    className="relative flex items-center justify-center w-12 h-12 rounded-sm transition-all duration-300 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-1 cursor-pointer"
                    title="Search (Cmd+K)"
                >
                    <Search size={20} />
                </button>

                <div className="w-px h-8 bg-[var(--border-subtle)] mx-1" />

                {visibleItems.map(item => (
                    <DockItem key={item.id} item={item} />
                ))}

                <div className="w-px h-8 bg-[var(--border-subtle)] mx-1" />

                <div className="relative flex items-center justify-center">
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative flex items-center justify-center w-12 h-12 rounded-sm transition-all duration-300 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] hover:-translate-y-1 cursor-pointer"
                    >
                        <Bell size={20} />
                        {hasNotifications && (
                            <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--danger)]" />
                        )}
                    </button>
                    <NotificationPanel
                        open={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        notifications={notifications}
                    />
                </div>

                <div className="w-12 h-12 flex items-center justify-center">
                    <ThemeToggle compact />
                </div>

                <div className="pl-1">
                    <UserDropdown />
                </div>
            </div>
        </motion.div>
    )
}
