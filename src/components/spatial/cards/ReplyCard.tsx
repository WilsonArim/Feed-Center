import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface ReplyCardProps {
    message: string
}

export function ReplyCard({ message }: ReplyCardProps) {
    const { txt } = useLocaleText()
    const reset = useWorkspaceStore((s) => s.reset)

    return (
        <div className="draft-card">
            <div className="draft-card-header">
                <div className="draft-card-module" style={{ color: 'var(--accent)' }}>
                    <MessageCircle size={18} />
                    <span>{txt('Buggy diz', 'Buggy says')}</span>
                </div>
            </div>

            <div style={{ padding: '20px 0' }}>
                <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                    }}
                >
                    {message}
                </motion.p>
            </div>

            <div className="draft-card-actions" style={{ marginTop: '12px' }}>
                <motion.button
                    onClick={reset}
                    className="draft-card-btn draft-card-btn-reject"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: 'auto' }}
                >
                    {txt('OK', 'OK')}
                </motion.button>
            </div>
        </div>
    )
}
