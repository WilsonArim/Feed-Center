import { NavLink } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard, Wallet, CheckSquare, Link2, Bitcoin,
    Newspaper, Settings, LogOut, ChevronDown, type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useTranslation } from 'react-i18next'

interface NavItem {
    id: string; to: string; icon: LucideIcon; label: string
    labelKey?: string
    section?: string; children?: { to: string; label: string }[]
}

const navItems: NavItem[] = [
    { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard', labelKey: 'nav.dashboard', section: 'MENU' },
    { id: 'financeiro', to: '/financeiro', icon: Wallet, label: 'Financeiro', labelKey: 'nav.financial' },
    { id: 'todo', to: '/todo', icon: CheckSquare, label: 'To-Do', labelKey: 'nav.todo' },
    { id: 'links', to: '/links', icon: Link2, label: 'Links', labelKey: 'nav.links' },
    { id: 'news', to: '/news', icon: Newspaper, label: 'Noticias', labelKey: 'nav.news' },
    { id: 'crypto', to: '/crypto', icon: Bitcoin, label: 'Crypto', labelKey: 'nav.crypto',
        children: [{ to: '/crypto', label: 'Portfolio' }, { to: '/crypto/defi', label: 'DeFi' }] },
]

const systemItems: NavItem[] = [
    { id: 'settings', to: '/settings', icon: Settings, label: 'Definicoes', labelKey: 'nav.settings', section: 'SISTEMA' },
]

function SidebarLink({ item, expanded, label }: { item: NavItem; expanded: boolean; label: string }) {
    const [subOpen, setSubOpen] = useState(false)
    const hasChildren = item.children && item.children.length > 0

    return (
        <div>
            <NavLink
                to={item.to}
                end={item.to === '/' || hasChildren}
                onClick={(e) => { if (hasChildren && expanded) { e.preventDefault(); setSubOpen(!subOpen) } }}
                className={({ isActive }) =>
                    `relative flex items-center gap-3 h-10 rounded-xl transition-all duration-200 group/link ${
                        expanded ? 'px-3' : 'justify-center px-0'
                    } ${isActive
                        ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                    }`
                }
            >
                {({ isActive }) => (
                    <>
                        {/* Active left border */}
                        {isActive && (
                            <motion.div
                                layoutId="sidebar-indicator"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent)]"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <item.icon size={20} className="shrink-0" />
                        {expanded && (
                            <span className="text-sm font-medium whitespace-nowrap flex-1">{label}</span>
                        )}
                        {hasChildren && expanded && (
                            <motion.div animate={{ rotate: subOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                            </motion.div>
                        )}
                    </>
                )}
            </NavLink>

            <AnimatePresence>
                {hasChildren && subOpen && expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-8 mt-0.5"
                    >
                        {item.children!.map(c => (
                            <NavLink key={c.to} to={c.to} end
                                className={({ isActive }) =>
                                    `block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        isActive ? 'text-[var(--accent)] bg-[var(--accent-muted)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                    }`
                                }
                            >
                                {c.label}
                            </NavLink>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function Sidebar() {
    const { signOut, user } = useAuth()
    const { t } = useTranslation()
    const [hovered, setHovered] = useState(false)
    const expanded = hovered
    const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

    return (
        <>
            {/* Desktop sidebar */}
            <motion.aside
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                animate={{ width: expanded ? 260 : 72 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="fixed left-0 top-0 bottom-0 flex flex-col z-40 overflow-hidden
                    bg-[var(--sidebar-bg)] backdrop-blur-2xl border-r border-[var(--sidebar-border)]
                    max-md:hidden transition-colors duration-300"
            >
                {/* Logo */}
                <div className={`flex items-center h-16 shrink-0 border-b border-[var(--border-subtle)] ${expanded ? 'px-4 gap-3' : 'justify-center'}`}>
                    <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center shrink-0
                        shadow-[0_0_20px_var(--accent-glow)]">
                        <span className="text-[var(--accent-text)] font-black text-xs font-[Orbitron,sans-serif] tracking-wider">FC</span>
                    </div>
                    {expanded && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-sm text-[var(--text-primary)] tracking-tight whitespace-nowrap"
                        >
                            Feed-Center
                        </motion.span>
                    )}
                </div>

                {/* Section label */}
                {expanded && (
                    <div className="px-5 pt-5 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                            Menu
                        </span>
                    </div>
                )}

                {/* Navigation */}
                <nav className={`flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto ${expanded ? 'px-3' : 'px-2'}`}>
                    {navItems.map(item => (
                        <SidebarLink
                            key={item.id}
                            item={item}
                            expanded={expanded}
                            label={item.labelKey ? t(item.labelKey) : item.label}
                        />
                    ))}
                </nav>

                {/* Divider */}
                <div className="mx-4 border-t border-[var(--border-subtle)]" />

                {/* System section */}
                {expanded && (
                    <div className="px-5 pt-3 pb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                            Sistema
                        </span>
                    </div>
                )}

                <div className={`py-2 flex flex-col gap-0.5 ${expanded ? 'px-3' : 'px-2'}`}>
                    <div className={expanded ? 'px-3 py-1.5' : 'flex justify-center py-1.5'}>
                        <ThemeToggle compact={!expanded} />
                    </div>

                    {systemItems.map(item => (
                        <SidebarLink
                            key={item.id}
                            item={item}
                            expanded={expanded}
                            label={item.labelKey ? t(item.labelKey) : item.label}
                        />
                    ))}
                </div>

                {/* User section */}
                <div className={`py-3 border-t border-[var(--border-subtle)] ${expanded ? 'px-3' : 'px-2'}`}>
                    <button
                        onClick={signOut}
                        className={`flex items-center gap-3 h-10 w-full rounded-xl transition-all duration-200
                            text-[var(--text-secondary)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] cursor-pointer
                            ${expanded ? 'px-3' : 'justify-center px-0'}`}
                    >
                        {expanded ? (
                            <>
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--info)] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                    {initial}
                                </div>
                                <span className="text-sm font-medium truncate flex-1 text-left">
                                    {user?.email?.split('@')[0] ?? 'Utilizador'}
                                </span>
                                <LogOut size={16} className="shrink-0" />
                            </>
                        ) : (
                            <LogOut size={20} />
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Mobile bottom tab bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden
                bg-[var(--sidebar-bg)] backdrop-blur-2xl border-t border-[var(--sidebar-border)]
                flex items-center justify-around h-16 px-2 safe-area-pb">
                {[...navItems.slice(0, 5), systemItems[0]].map(item => (
                    <NavLink
                        key={item.id}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[44px] transition-colors ${
                                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                            }`
                        }
                    >
                        <item.icon size={20} />
                        <span className="text-[9px] font-medium">{item.labelKey ? t(item.labelKey) : item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    )
}
