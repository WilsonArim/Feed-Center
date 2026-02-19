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
    { id: 'news', to: '/news', icon: Newspaper, label: 'Notícias' },
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
    { id: 'settings', to: '/settings', icon: Settings, label: 'Definições' },
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
                        `relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-[var(--motion-normal)] flex-1 ${isActive
                            ? 'border-l-2 border-[var(--color-accent)] bg-[var(--color-sidebar-active)] text-[var(--color-accent)] pl-[10px]'
                            : 'border-l-2 border-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)] pl-[10px]'
                        }`
                    }
                >
                    <item.icon size={20} className="shrink-0" />
                    <AnimatePresence mode="wait">
                        {isOpen && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1"
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Expand arrow for sub-menus */}
                    {hasChildren && isOpen && (
                        <motion.div animate={{ rotate: subOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
                        </motion.div>
                    )}
                </NavLink>

                {/* Pin button (visible on hover when sidebar is open) */}
                {isOpen && (
                    <button
                        onClick={() => togglePin(item.id)}
                        className={`absolute right-1 p-1 rounded-[var(--radius-sm)] transition-all cursor-pointer
                            ${isPinned
                                ? 'opacity-100 text-[var(--color-accent)]'
                                : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                            }`}
                        aria-label={isPinned ? 'Unpin' : 'Pin'}
                    >
                        <Pin size={12} className={isPinned ? 'fill-current' : ''} />
                    </button>
                )}
            </div>

            {/* Sub-menu */}
            <AnimatePresence>
                {hasChildren && subOpen && isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-8"
                    >
                        {item.children!.map((child) => (
                            <NavLink
                                key={child.to}
                                to={child.to}
                                end
                                className={({ isActive }) =>
                                    `block px-3 py-1.5 text-sm rounded-[var(--radius-md)] transition-colors ${isActive
                                        ? 'text-[var(--color-accent)]'
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
                        className="fixed inset-0 bg-black/40 z-[9] md:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)' }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="glass fixed left-0 top-0 bottom-0 flex flex-col z-[var(--z-sidebar)] overflow-hidden
                    max-md:translate-x-[var(--mobile-sidebar-x,0)]"
                style={{
                    borderRight: '1px solid var(--color-border)',
                    ['--mobile-sidebar-x' as string]: sidebarOpen ? '0' : '-100%',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 h-16 shrink-0">
                    <AnimatePresence mode="wait">
                        {sidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-lg font-bold tracking-tight"
                                style={{ color: 'var(--color-text-primary)' }}
                            >
                                Feed-Center
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--color-accent-soft)] cursor-pointer"
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
                            <ChevronLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
                        </motion.div>
                    </button>
                </div>

                {/* Pinned items */}
                {pinned.length > 0 && (
                    <nav className="px-3 py-1 flex flex-col gap-0.5">
                        {sidebarOpen && (
                            <span className="px-3 text-[10px] font-medium uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                                Fixos
                            </span>
                        )}
                        {pinned.map((item) => (
                            <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                        ))}
                    </nav>
                )}

                {/* Separator if pinned exists */}
                {pinned.length > 0 && (
                    <div className="mx-4 border-t border-[var(--color-border)] my-1" />
                )}

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
                    {unpinned.map((item) => (
                        <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-3 py-3 flex flex-col gap-1 border-t border-[var(--color-border)]">
                    {bottomItems.map((item) => (
                        <SidebarItem key={item.id} item={item} isOpen={sidebarOpen} />
                    ))}

                    {/* User + Logout */}
                    <button
                        onClick={signOut}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-[var(--duration-fast)] text-[var(--color-text-secondary)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] w-full cursor-pointer"
                    >
                        <LogOut size={20} className="shrink-0" />
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
                                <span className="opacity-50 hover:opacity-100 transition-opacity">v1.1 (SOTA)</span>
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
