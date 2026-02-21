import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Clock, BellOff } from 'lucide-react'
import type { Notification } from '@/hooks/useNotifications'
import { useLocaleText } from '@/i18n/useLocaleText'

interface NotificationPanelProps {
    open: boolean
    onClose: () => void
    notifications: Notification[]
}

export function NotificationPanel({ open, onClose, notifications }: NotificationPanelProps) {
    const { txt } = useLocaleText()
    return (
        <AnimatePresence>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full right-[-60px] md:right-0 mb-4 w-80 z-50 rounded-2xl overflow-hidden
                            bg-[var(--bg-modal)] border border-[var(--border-default)]
                            shadow-[var(--shadow-xl)] backdrop-blur-xl"
                    >
                        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{txt('Notificacoes', 'Notifications')}</h3>
                            {notifications.length > 0 && (
                                <span className="badge badge-accent">{notifications.length}</span>
                            )}
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="empty-state py-10">
                                    <BellOff className="empty-state-icon" />
                                    <p className="empty-state-title">{txt('Sem notificacoes', 'No notifications')}</p>
                                    <p className="empty-state-desc">{txt('Tudo em dia!', 'All caught up!')}</p>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {notifications.map(n => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, x: -8 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                                        >
                                            <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${n.type === 'warning'
                                                    ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                                                    : 'bg-[var(--accent-muted)] text-[var(--accent)]'
                                                }`}>
                                                {n.type === 'warning' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{n.title}</p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{n.message}</p>
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
