import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
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
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
                <div className="flex items-start gap-4">
                    {icon && (
                        <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border border-[var(--accent)]/20 backdrop-blur-md">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-white drop-shadow-md">{title}</h1>
                        <p className="text-sm md:text-base text-[var(--color-text-secondary)] mt-2 font-medium tracking-wide leading-relaxed">{subtitle}</p>
                    </div>
                </div>
                {meta && (
                    <div className="mt-2.5 text-xs text-[var(--text-tertiary)]">{meta}</div>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-2.5 flex-wrap md:justify-end md:pt-1">
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
        <div className="flex items-end justify-between gap-4 pt-1 mb-6">
            <div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white drop-shadow-md leading-snug">{title}</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1.5 font-medium tracking-wide leading-relaxed">{subtitle}</p>
            </div>
            {action}
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
        <div className="rounded-3xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 px-6 py-6 md:px-8 mt-12 mb-8 shadow-[inset_0_0_30px_rgba(var(--accent-rgb),0.05)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <p className="text-base md:text-lg text-white font-black tracking-tight drop-shadow-sm leading-relaxed">{title}</p>
                <div className="flex flex-wrap gap-3">
                    {actions.map((action) => (
                        <NavLink
                            key={action.to + action.label}
                            to={action.to}
                            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] border border-transparent hover:border-white/10"
                        >
                            {action.label}
                            <ArrowRight size={14} strokeWidth={2.5} />
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    )
}
