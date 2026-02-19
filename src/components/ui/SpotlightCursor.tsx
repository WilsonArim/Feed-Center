import { useEffect, useRef } from 'react'

export function SpotlightCursor() {
    const spotRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = spotRef.current
        if (!el) return

        let raf: number
        const onMove = (e: MouseEvent) => {
            cancelAnimationFrame(raf)
            raf = requestAnimationFrame(() => {
                el.style.setProperty('--spot-x', `${e.clientX}px`)
                el.style.setProperty('--spot-y', `${e.clientY}px`)
                el.style.opacity = '1'
            })
        }

        const onLeave = () => {
            el.style.opacity = '0'
        }

        window.addEventListener('mousemove', onMove)
        document.addEventListener('mouseleave', onLeave)
        return () => {
            window.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseleave', onLeave)
            cancelAnimationFrame(raf)
        }
    }, [])

    return (
        <div
            ref={spotRef}
            className="spotlight-cursor"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 'var(--z-spotlight)',
                pointerEvents: 'none',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                background:
                    'radial-gradient(300px circle at var(--spot-x, -999px) var(--spot-y, -999px), var(--color-accent-soft), transparent 70%)',
            } as React.CSSProperties}
        />
    )
}
