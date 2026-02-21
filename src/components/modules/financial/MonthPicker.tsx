import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocaleText } from '@/i18n/useLocaleText'

interface Props {
    month: string
    onChange: (month: string) => void
}

function parse(month: string) {
    const parts = month.split('-')
    return { year: Number(parts[0]), month: Number(parts[1]) }
}

function format(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`
}

export function MonthPicker({ month, onChange }: Props) {
    const { isEnglish, txt } = useLocaleText()
    const { year, month: m } = parse(month)
    const label = new Date(year, m - 1, 1).toLocaleDateString(isEnglish ? 'en-US' : 'pt-PT', {
        month: 'long',
        year: 'numeric',
    })

    const prev = () => {
        if (m === 1) onChange(format(year - 1, 12))
        else onChange(format(year, m - 1))
    }

    const next = () => {
        if (m === 12) onChange(format(year + 1, 1))
        else onChange(format(year, m + 1))
    }

    return (
        <div className="flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-xl border border-[var(--color-border)] px-1 py-0.5">
            <button
                onClick={prev}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                aria-label={txt('Mes anterior', 'Previous month')}
            >
                <ChevronLeft size={16} className="text-[var(--color-text-secondary)]" />
            </button>

            <span className="text-sm font-semibold min-w-[140px] text-center text-[var(--color-text-primary)]">
                {label}
            </span>

            <button
                onClick={next}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
                aria-label={txt('Proximo mes', 'Next month')}
            >
                <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
            </button>
        </div>
    )
}
