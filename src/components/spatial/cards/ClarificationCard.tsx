import { motion } from 'framer-motion'
import { MessageCircle, ArrowLeft } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useWorkspaceStore } from '@/stores/workspaceStore'

interface ClarificationCardProps {
    prompt: string
    missingFields: string[]
}

export function ClarificationCard({ prompt, missingFields }: ClarificationCardProps) {
    const { txt } = useLocaleText()
    const reset = useWorkspaceStore((s) => s.reset)

    return (
        <div className="draft-card">
            {/* Header */}
            <div className="draft-card-header">
                <div className="draft-card-module" style={{ color: 'var(--warning)' }}>
                    <MessageCircle size={18} />
                    <span>{txt('Buggy pergunta', 'Buggy asks')}</span>
                </div>
                <div className="draft-card-badge" style={{
                    background: 'var(--warning)',
                    color: 'var(--bg-deep)',
                }}>
                    {txt('Clarificação', 'Clarification')}
                </div>
            </div>

            {/* The actual AI question — prominently displayed */}
            <div style={{
                padding: '20px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
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
                    {prompt}
                </motion.p>
            </div>

            {/* Missing fields tags */}
            {missingFields.length > 0 && (
                <div className="draft-card-missing" style={{ paddingTop: '12px' }}>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {txt('Campos em falta:', 'Missing fields:')}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {missingFields.map((f) => (
                            <span key={f} className="badge badge-warning">{f}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Instruction */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--accent)',
                    opacity: 0.08,
                    position: 'relative',
                }}
            >
                <p style={{
                    position: 'relative',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    opacity: 1,
                }}>
                    💡 {txt(
                        'Responde no campo de texto do Buggy à esquerda. Ele completa automaticamente o draft.',
                        'Reply in Buggy\'s input field on the left. He\'ll auto-complete the draft.',
                    )}
                </p>
            </motion.div>

            {/* Fallback dismiss */}
            <div className="draft-card-actions" style={{ marginTop: '12px' }}>
                <motion.button
                    onClick={reset}
                    className="draft-card-btn draft-card-btn-reject"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: 'auto' }}
                >
                    <ArrowLeft size={14} />
                    {txt('Cancelar', 'Cancel')}
                </motion.button>
            </div>
        </div>
    )
}
