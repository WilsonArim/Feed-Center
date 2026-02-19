import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface Props {
    month: string  // 'YYYY-MM'
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
    const { year, month: m } = parse(month)

    const prev = () => {
        if (m === 1) onChange(format(year - 1, 12))
        else onChange(format(year, m - 1))
    }

    const next = () => {
        if (m === 12) onChange(format(year + 1, 1))
        else onChange(format(year, m + 1))
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={prev}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Mês anterior"
            >
                <ChevronLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>

            <span
                className="text-sm font-semibold min-w-[160px] text-center"
                style={{ color: 'var(--color-text-primary)' }}
            >
                {MONTHS[m - 1]} {year}
            </span>

            <button
                onClick={next}
                className="p-1.5 rounded-[var(--radius-sm)] hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Próximo mês"
            >
                <ChevronRight size={18} style={{ color: 'var(--color-text-secondary)' }} />
            </button>
        </div>
    )
}
