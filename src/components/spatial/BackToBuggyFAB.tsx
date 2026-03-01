import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useLocaleText } from '@/i18n/useLocaleText'

export function BackToBuggyFAB() {
    const { txt } = useLocaleText()
    const mobileFocus = useWorkspaceStore((s) => s.mobileFocus)
    const flipToEngine = useWorkspaceStore((s) => s.flipToEngine)
    const viewKind = useWorkspaceStore((s) => s.view.kind)

    // Only visible on mobile when reality is in focus and it's NOT a page view
    const visible = mobileFocus === 'reality' && viewKind !== 'page'

    return (
        <AnimatePresence>
            {visible && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={flipToEngine}
                    className="back-to-buggy-fab"
                    aria-label={txt('Voltar ao Buggy', 'Back to Buggy')}
                >
                    <ArrowLeft size={20} />
                    <span className="back-to-buggy-label">
                        {txt('Ajustar', 'Adjust')}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    )
}
