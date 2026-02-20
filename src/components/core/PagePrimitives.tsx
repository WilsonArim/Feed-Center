import type { ReactNode } from 'react'
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { NavLink } from 'react-router'

interface PageHeaderProps {
    icon?: ReactNode
    title: string
    subtitle: string
    actions?: ReactNode
    meta?: ReactNode
}

export function PageHeader({ icon, title, subtitle, actions, meta }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent)]">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-h1 text-2xl md:text-3xl leading-tight">{title}</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
                    </div>
                </div>
                {meta && (
                    <div className="mt-2 text-xs text-[var(--text-tertiary)]">{meta}</div>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-2 flex-wrap md:justify-end">
                    {actions}
                </div>
            )}
        </div>
    )
}

interface SectionHeaderProps {
    title: string
    subtitle: string
    action?: ReactNode
}

export function PageSectionHeader({ title, subtitle, action }: SectionHeaderProps) {
    return (
        <div className="flex items-end justify-between gap-4">
            <div>
                <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
                <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
            </div>
            {action}
        </div>
    )
}

interface StateCardProps {
    title: string
    message: string
    icon?: ReactNode
    actionLabel?: string
    onAction?: () => void
}

export function StateCard({ title, message, icon, actionLabel, onAction }: StateCardProps) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                {icon || <AlertCircle size={18} />}
            </div>

            <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{message}</p>
            </div>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors cursor-pointer"
                >
                    <RefreshCw size={12} />
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

interface NextAction {
    label: string
    to: string
}

interface NextActionsStripProps {
    title: string
    actions: NextAction[]
}

export function NextActionsStrip({ title, actions }: NextActionsStripProps) {
    return (
        <div className="glass-card-static p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-primary)] font-medium">{title}</p>
                <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                        <NavLink
                            key={action.to + action.label}
                            to={action.to}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)]/35 hover:text-[var(--accent)] transition-colors"
                        >
                            {action.label}
                            <ArrowRight size={12} />
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    )
}
