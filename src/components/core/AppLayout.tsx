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

            {/* Main content area — offset by sidebar (72px) + topbar (64px) */}
            <main className="min-h-dvh ml-[72px] pt-[80px] pb-8 px-6 lg:px-8 max-md:ml-0 max-md:pt-[72px] max-md:pb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="mx-auto max-w-[1400px] w-full"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}
