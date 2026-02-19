import Spline from '@splinetool/react-spline'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMousePosition } from '@/hooks/useMousePosition'

export function SerafimHero() {
    const mousePosition = useMousePosition()
    const splineRef = useRef<any>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    function onLoad(splineApp: any) {
        splineRef.current = splineApp
        setIsLoaded(true)
    }

    // Effect to update Spline variables based on mouse position
    // This is where we'll bridge the 2D mouse to 3D world variables
    useEffect(() => {
        if (splineRef.current && isLoaded) {
            // Example: If the Spline scene has variables 'mouseX' and 'mouseY'
            // splineRef.current.setVariable('mouseX', mousePosition.normalizedX * 100)
            // splineRef.current.setVariable('mouseY', mousePosition.normalizedY * 100)
        }
    }, [mousePosition, isLoaded])

    return (
        <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
            {/* Deep Void Background Fallback */}
            <div className="absolute inset-0 bg-[var(--color-bg-primary)] -z-20" />

            {/* Spline Scene */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="w-full h-full"
            >
                <Spline
                    scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
                    onLoad={onLoad}
                    className="w-full h-full"
                />
            </motion.div>

            {/* Gradient Overlays for Seamless Blending */}
            {/* Top Gradient - Fades into navbar area */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--color-bg-primary)] to-transparent pointer-events-none z-10" />

            {/* Bottom Gradient - Fades into content */}
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent pointer-events-none z-10" />

            {/* Loading State Overlay */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin opacity-50" />
                </div>
            )}
        </div>
    )
}
