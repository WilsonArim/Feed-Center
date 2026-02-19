import { useState, useEffect } from 'react'

interface MousePosition {
    x: number
    y: number
    normalizedX: number
    normalizedY: number
}

export function useMousePosition() {
    const [mousePosition, setMousePosition] = useState<MousePosition>({
        x: 0,
        y: 0,
        normalizedX: 0,
        normalizedY: 0,
    })

    useEffect(() => {
        let frameId: number

        const updateMousePosition = (ev: MouseEvent) => {
            // Cancel any pending frame to avoid stacking updates
            cancelAnimationFrame(frameId)

            frameId = requestAnimationFrame(() => {
                const { innerWidth, innerHeight } = window

                // Calculate normalized coordinates (-1 to 1)
                // Center of screen is (0,0)
                const normalizedX = (ev.clientX / innerWidth) * 2 - 1
                const normalizedY = (ev.clientY / innerHeight) * 2 - 1

                setMousePosition({
                    x: ev.clientX,
                    y: ev.clientY,
                    normalizedX,
                    normalizedY,
                })
            })
        }

        window.addEventListener('mousemove', updateMousePosition)

        return () => {
            window.removeEventListener('mousemove', updateMousePosition)
            cancelAnimationFrame(frameId)
        }
    }, [])

    return mousePosition
}
