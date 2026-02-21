import { Outlet } from 'react-router'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { FloatingNav } from './FloatingNav'
import { BuggyWidget } from '../core/BuggyWidget'
import { useThemeStore } from '@/stores/themeStore'
import { useEffect } from 'react'

function ThemeSync() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
    useEffect(() => {
        const root = document.documentElement
        root.classList.toggle('dark', resolvedTheme === 'dark')
        root.classList.toggle('light', resolvedTheme === 'light')
    }, [resolvedTheme])
    return null
}

const pageVariants: Variants = {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
}

export function AppLayout() {
    return (
        <div className="app-shell">
            <ThemeSync />
            <BuggyWidget />
            <FloatingNav />

            {/* Main content area — Full Bleed Spatial Canvas */}
            <main className="app-main">
                <AnimatePresence mode="wait">
                    <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="app-main-inner"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
