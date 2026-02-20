import { useEffect, useRef } from 'react'

/**
 * SpotlightCursor
 * A subtle radial glow that follows the mouse cursor.
 * Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function SpotlightCursor() {
  const spotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spotRef.current
    if (!el) return

    // Disable on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      el.style.display = 'none'
      return
    }

    // Disable when reduced motion is preferred
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.display = 'none'
      return
    }

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

    window.addEventListener('mousemove', onMove, { passive: true })
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
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 'var(--z-spotlight)' as any,
        opacity: 0,
        transition: 'opacity 0.4s ease',
        background:
          'radial-gradient(350px circle at var(--spot-x, -999px) var(--spot-y, -999px), var(--accent-soft), transparent 70%)',
      } as React.CSSProperties}
      aria-hidden="true"
    />
  )
}
