import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, DollarSign, ListTodo, Link as LinkIcon, TrendingUp } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'
import { useWorkspaceStore, type CortexModule } from '@/stores/workspaceStore'

const MODULE_ICONS: Record<string, typeof DollarSign> = {
    FinanceModule: DollarSign,
    TodoModule: ListTodo,
    LinksModule: LinkIcon,
    CryptoModule: TrendingUp,
}

interface SuccessCardProps {
    module: CortexModule
    supabaseId: string | null
    summary: string
}

export function SuccessCard({ module, supabaseId, summary }: SuccessCardProps) {
    const { txt } = useLocaleText()
    const reset = useWorkspaceStore((s) => s.reset)
    const Icon = MODULE_ICONS[module] ?? Check

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timer = setTimeout(reset, 5000)
        return () => clearTimeout(timer)
    }, [reset])

    return (
        <div className="success-card">
            <motion.div
                className="success-card-icon"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            >
                <Check size={32} />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="success-card-body"
            >
                <div className="success-card-module">
                    <Icon size={14} />
                    <span>{module.replace('Module', '')}</span>
                </div>
                <p className="success-card-summary">{summary}</p>
                {supabaseId && (
                    <p className="success-card-id">ID: {supabaseId.slice(0, 8)}…</p>
                )}
            </motion.div>

            {/* Progress bar that counts down the 5s auto-dismiss */}
            <motion.div
                className="success-card-progress"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
            />

            <button onClick={reset} className="success-card-dismiss">
                {txt('Fechar', 'Dismiss')}
            </button>
        </div>
    )
}
