import { useRef, useCallback, useState } from 'react'

interface MagneticState {
    x: number
    y: number
    scale: number
}

const THRESHOLD = 80
const MAX_PULL = 12
const SCALE_BOOST = 1.2

export function useMagneticHover() {
    const ref = useRef<HTMLDivElement>(null)
    const [state, setState] = useState<MagneticState>({ x: 0, y: 0, scale: 1 })

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = e.clientX - cx
        const dy = e.clientY - cy
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < THRESHOLD) {
            const pull = 1 - dist / THRESHOLD
            setState({
                x: dx * pull * (MAX_PULL / THRESHOLD),
                y: dy * pull * (MAX_PULL / THRESHOLD),
                scale: 1 + (SCALE_BOOST - 1) * pull,
            })
        } else {
            setState({ x: 0, y: 0, scale: 1 })
        }
    }, [])

    const handleMouseLeave = useCallback(() => {
        setState({ x: 0, y: 0, scale: 1 })
    }, [])

    return { ref, state, handleMouseMove, handleMouseLeave }
}
