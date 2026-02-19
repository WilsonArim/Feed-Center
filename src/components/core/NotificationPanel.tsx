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
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={onClose} />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-3 w-80 z-50
                            rounded-2xl border border-[var(--color-border)]
                            shadow-[var(--shadow-lg)] overflow-hidden"
                        style={{
                            background: 'var(--color-bg-secondary)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-[var(--color-border)]">
                            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                                Notificações
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="max-h-72 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
                                    <BellOff size={24} className="mb-2 opacity-40" />
                                    <span className="text-xs">Sem notificações</span>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${n.type === 'warning'
                                                    ? 'bg-orange-500/10 text-orange-400'
                                                    : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {n.type === 'warning'
                                                    ? <AlertTriangle size={14} />
                                                    : <Clock size={14} />
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                                    {n.message}
                                                </p>
                                            </div>
                                        </div>
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
