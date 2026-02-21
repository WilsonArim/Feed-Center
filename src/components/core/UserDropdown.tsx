import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, LogOut, User } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from './AuthProvider'
import { useLocaleText } from '@/i18n/useLocaleText'

export function UserDropdown() {
    const { txt } = useLocaleText()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const { user, signOut } = useAuth()

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer
                    transition-all hover:scale-105 active:scale-95
                    bg-[var(--accent)] text-[var(--accent-text)] text-sm font-bold
                    ring-2 ring-[var(--accent)]/30 shadow-[0_0_16px_var(--accent-glow)]"
                aria-label={txt('Menu do utilizador', 'User menu')}
            >
                {initial}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 bottom-full mb-4 w-56 rounded-2xl p-1.5 z-50
                            bg-[var(--bg-modal)] border border-[var(--border-default)]
                            shadow-[var(--shadow-xl)] backdrop-blur-xl"
                    >
                        {/* User info */}
                        <div className="px-3 py-2.5 mb-1 rounded-xl bg-[var(--bg-surface)]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] text-xs font-bold">
                                    {initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                        {user?.email?.split('@')[0] ?? txt('Utilizador', 'User')}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                                        {user?.email ?? ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <NavLink
                            to="/settings"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <Settings size={15} /> {txt('Definicoes', 'Settings')}
                        </NavLink>
                        <NavLink
                            to="/settings"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <User size={15} /> {txt('Perfil', 'Profile')}
                        </NavLink>

                        <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                            <button
                                onClick={() => { setOpen(false); signOut() }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                    text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
                            >
                                <LogOut size={15} /> {txt('Sair', 'Sign out')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
