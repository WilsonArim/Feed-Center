import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, LogOut, User } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuth } from './AuthProvider'

export function UserDropdown() {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const { user, signOut } = useAuth()

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const initial = user?.email?.charAt(0).toUpperCase() ?? '?'

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer
                    transition-all hover:scale-105 active:scale-95
                    bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)]
                    text-white text-sm font-bold shadow-[0_2px_8px_var(--color-accent)/25]"
                aria-label="Menu do utilizador"
            >
                {initial}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute right-0 top-12 w-56 rounded-2xl p-2 z-50
                            bg-[var(--color-bg-secondary)] border border-[var(--color-border)]
                            shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                    >
                        {/* User info */}
                        <div className="px-3 py-2.5 mb-1 rounded-xl bg-[var(--color-bg-tertiary)]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-secondary)] flex items-center justify-center text-white text-xs font-bold">
                                    {initial}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                        {user?.email?.split('@')[0] ?? 'Utilizador'}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                                        {user?.email ?? ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="py-1">
                            <NavLink
                                to="/settings"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                    text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <Settings size={15} />
                                Definicoes
                            </NavLink>
                            <NavLink
                                to="/settings"
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                    text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <User size={15} />
                                Perfil
                            </NavLink>
                        </div>

                        <div className="border-t border-[var(--color-border)] mt-1 pt-1">
                            <button
                                onClick={() => { setOpen(false); signOut() }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm
                                    text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors cursor-pointer"
                            >
                                <LogOut size={15} />
                                Sair
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
