import { NavLink } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Wallet,
    CheckSquare,
    Link2,
    Bitcoin,
    Newspaper,
    Settings,
    ChevronLeft,
    ChevronDown,
    LogOut,
    Pin,
    HelpCircle,
    type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from './AuthProvider'
import { ThemeToggle } from '../ui/ThemeToggle'

interface NavItem {
    id: string
    to: string
    icon: LucideIcon
    label: string
    children?: { to: string; label: string }[]
}

const navItems: NavItem[] = [
    { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'financeiro', to: '/financeiro', icon: Wallet, label: 'Financeiro' },
    { id: 'todo', to: '/todo', icon: CheckSquare, label: 'To-Do' },
    { id: 'links', to: '/links', icon: Link2, label: 'Links' },
    { id: 'news', to: '/news', icon: Newspaper, label: 'Noticias' },
    {
        id: 'crypto',
        to: '/crypto',
        icon: Bitcoin,
        label: 'Crypto',
        children: [
            { to: '/crypto', label: 'Portfolio' },
            { to: '/crypto/defi', label: 'DeFi' },
        ],
    },
]

const bottomItems: NavItem[] = [
    { id: 'settings', to: '/settings', icon: Settings, label: 'Definicoes' },
]

function SidebarItem({ item, isOpen }: { item: NavItem; isOpen: boolean }) {
    const { pinnedItems, togglePin } = useUIStore()
    const [subOpen, setSubOpen] = useState(false)
    const isPinned = pinnedItems.includes(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
        <div className="group">
            <div className="relative flex items-center">
                <NavLink
                    to={item.to}
                    end={item.to === '/' || hasChildren}
                    onClick={(e) => {
                        if (hasChildren && isOpen) {
                            e.preventDefault()
                            setSubOpen(!subOpen)
                        }
                    }}
                    className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 flex-1 group/link ${
                            isActive
                                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] shadow-[inset_0_0_0_1px_var(--color-accent)/.15]'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all ${
                                isActive
                                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                                    : 'text-[var(--color-text-muted)] group-hover/link:text-[var(--color-text-secondary)]'
                            }`}>
                                <item.icon size={18} />
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active-indicator"
                                        className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-accent)]"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </div>
                            <AnimatePresence mode="wait">
                                {isOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {hasChildren && isOpen && (
                                <motion.div animate={{ rotate: subOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
                                </motion.div>
                            )}
                        </>
                    )}
                </NavLink>

                {isOpen && (
                    <button
                        onClick={() => togglePin(item.id)}
                        className={`absolute right-1 p-1.5 rounded-lg transition-all cursor-pointer ${
                            isPinned
                                ? 'opacity-100 text-[var(--color-accent)]'
                                : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                        }`}
                        aria-label={isPinned ? 'Unpin' : 'Pin'}
                    >
                        <Pin size={12} className={isPinned ? 'fill-current' : ''} />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {hasChildren && subOpen && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-8 mt-1"
                    >
                        {item.children!.map((child) => (
                            <NavLink
                                key={child.to}
                                to={child.to}
                                end
                                className={({ isActive }) =>
                                    `block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                        isActive
                                            ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`
                                }
                            >
                                {child.label}
                            </NavLink>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function Sidebar() {
    const { sidebarOpen, toggleSidebar, pinnedItems } = useUIStore()
    const { signOut, user } = useAuth()

    const pinned = navItems.filter((i) => pinnedItems.includes(i.id))
    const unpinned = navItems.filter((i) => !pinnedItems.includes(i.id))

    return (
        <>
            {/* Mobile backdrop */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleSidebar()}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9] md:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)' }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="fixed left-0 top-0 bottom-0 flex flex-col z-[var(--z-sidebar)] overflow-hidden
                    bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]
                    max-md:translate-x-[var(--mobile-sidebar-x,0)] transition-colors duration-300"
                style={{
                    ['--mobile-sidebar-x' as string]: sidebarOpen ? '0' : '-100%',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b border-[var(--color-border)]">
                    <AnimatePresence mode="wait">
                        {sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex items-center gap-2.5"
                            >
                                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
                                    <span className="text-white font-black text-xs font-[Orbitron,sans-serif]">FC</span>
                                </div>
                                <span className="font-bold tracking-tight text-[var(--color-text-primary)] text-base">
                                    Feed-Center
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
                            <ChevronLeft size={18} className="text-[var(--color-text-secondary)]" />
                        </motion.div>
                    </button>
                </div>

                {/* Pinned items */}
                {pinned.length > 0 && (
                    <nav className="px-3 pt-4 pb-1 flex flex-col gap-0.5">
                        {sidebarOpen && (
                            <span className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1.5">
                                Fixos
                            </span>
                        )}
                        {pinned.map((item) => (
                            <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                        ))}
                    </nav>
                )}

                {pinned.length > 0 && (
                    <div className="mx-4 border-t border-[var(--color-border)] my-2" />
                )}

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto custom-scrollbar">
                    {sidebarOpen && (
                        <span className="px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1.5">
                            Menu
                        </span>
                    )}
                    {unpinned.map((item) => (
                        <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-3 flex flex-col gap-1 border-t border-[var(--color-border)]">
                    {/* Theme toggle */}
                    <div className="px-3 py-2">
                        <ThemeToggle compact={!sidebarOpen} />
                    </div>

                    {bottomItems.map((item) => (
                        <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                    ))}

                    {/* User + Logout */}
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[var(--color-text-secondary)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] w-full cursor-pointer"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0">
                            <LogOut size={18} />
                        </div>
                        <AnimatePresence mode="wait">
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                >
                                    {user?.email?.split('@')[0] ?? 'Sair'}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>

                    {/* Footer */}
                    <AnimatePresence mode="wait">
                        {sidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-between px-3 pt-2 text-[10px] text-[var(--color-text-muted)]"
                            >
                                <span className="opacity-50 hover:opacity-100 transition-opacity">v2.0 SOTA</span>
                                <a
                                    href="#"
                                    className="flex items-center gap-1 hover:text-[var(--color-text-secondary)] transition-colors"
                                >
                                    <HelpCircle size={10} />
                                    Ajuda
                                </a>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.aside>
        </>
    )
}
