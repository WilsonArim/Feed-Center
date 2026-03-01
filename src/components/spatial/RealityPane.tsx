import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useWorkspaceStore, type WorkspaceView } from '@/stores/workspaceStore'
import { useLocaleText } from '@/i18n/useLocaleText'
import { DraftCard } from './cards/DraftCard'
import { SuccessCard } from './cards/SuccessCard'
import { ClarificationCard } from './cards/ClarificationCard'
import { ReplyCard } from './cards/ReplyCard'

const variants = {
    initial: { opacity: 0, scale: 0.96, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 24, stiffness: 260 } },
    exit: { opacity: 0, scale: 0.96, y: -16, transition: { duration: 0.15 } },
}

export function RealityPane() {
    const view = useWorkspaceStore((s) => s.view)

    return (
        <div className="reality-pane-inner">
            <AnimatePresence mode="wait">
                <motion.div key={view.kind} variants={variants} initial="initial" animate="animate" exit="exit">
                    <RealityView view={view} />
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

function RealityView({ view }: { view: WorkspaceView }) {
    const { txt } = useLocaleText()
    const reset = useWorkspaceStore((s) => s.reset)

    switch (view.kind) {
        case 'idle':
            return (
                <div className="reality-idle">
                    <div className="reality-idle-pulse" />
                    <p className="reality-idle-text">{txt('À espera de um comando…', 'Awaiting command…')}</p>
                </div>
            )

        case 'processing':
            return (
                <div className="reality-processing">
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    <p className="reality-processing-text">{txt('A processar sinal…', 'Processing signal…')}</p>
                </div>
            )

        case 'showing_draft':
            return <DraftCard payload={view.payload} />

        case 'showing_success':
            return <SuccessCard module={view.module} supabaseId={view.supabaseId} summary={view.summary} />

        case 'showing_error':
            return (
                <div className="reality-status-card reality-error">
                    <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
                    <p className="reality-error-text">{view.message}</p>
                    <button onClick={reset} className="reality-dismiss-btn">
                        {txt('Fechar', 'Dismiss')}
                    </button>
                </div>
            )

        case 'showing_clarification':
            return <ClarificationCard prompt={view.prompt} missingFields={view.missingFields} />

        case 'showing_reply':
            return <ReplyCard message={view.message} />

        case 'page':
            return null

        default:
            return null
    }
}
