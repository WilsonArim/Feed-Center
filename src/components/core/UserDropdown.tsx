import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, LogOut } from 'lucide-react'
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
                className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white text-sm font-bold
                    flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                aria-label="Menu do utilizador"
            >
                {initial}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="glass absolute right-0 top-12 w-56 rounded-[var(--radius-lg)] p-3 shadow-[var(--shadow-lg)]"
                    >
                        {/* User info */}
                        <div className="px-3 py-2 mb-2 border-b border-[var(--color-border)]">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                {user?.email ?? 'Utilizador'}
                            </p>
                        </div>

                        {/* Actions */}
                        <NavLink
                            to="/settings"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm
                                text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                            <Settings size={16} />
                            Definições
                        </NavLink>

                        <button
                            onClick={() => { setOpen(false); signOut() }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-sm
                                text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors cursor-pointer"
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
