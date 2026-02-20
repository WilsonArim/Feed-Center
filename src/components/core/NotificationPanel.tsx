import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, BellOff } from 'lucide-react'
import type { Notification } from '@/hooks/useNotifications'

interface NotificationPanelProps {
    open: boolean
    onClose: () => void
    notifications: Notification[]
}

export function NotificationPanel({ open, onClose, notifications }: NotificationPanelProps) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute top-full right-0 mt-3 w-80 z-50
                            rounded-2xl border border-[var(--color-border)]
                            bg-[var(--color-bg-secondary)] backdrop-blur-xl
                            shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Notificacoes
                            </h3>
                            {notifications.length > 0 && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                                    {notifications.length}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-3">
                                        <BellOff size={20} className="opacity-40" />
                                    </div>
                                    <span className="text-xs font-medium">Sem notificacoes</span>
                                    <span className="text-[10px] opacity-60 mt-0.5">Tudo em dia!</span>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {notifications.map(n => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                                        >
                                            <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${
                                                n.type === 'warning'
                                                    ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                                                    : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                                            }`}>
                                                {n.type === 'warning'
                                                    ? <AlertTriangle size={14} />
                                                    : <Clock size={14} />
                                                }
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                                                    {n.message}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
