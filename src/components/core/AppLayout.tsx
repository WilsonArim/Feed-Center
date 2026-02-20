import { Outlet } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
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

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
}

export function AppLayout() {
    return (
        <div className="relative min-h-dvh bg-[var(--bg-deep)] text-[var(--text-primary)] transition-colors duration-300">
            <ThemeSync />
            <BuggyWidget />
            <Sidebar />
            <TopBar />

            {/* Main content area — offset by sidebar collapsed width + topbar */}
            <main className="min-h-dvh transition-[margin] duration-300 ease-out
                ml-[var(--sidebar-collapsed)] max-md:ml-0
                pt-[calc(var(--topbar-height)+1rem)] pb-8 px-6 lg:px-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="mx-auto max-w-[1400px]"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
