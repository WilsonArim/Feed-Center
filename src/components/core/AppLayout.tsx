import { Outlet } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { FloatingNavbar } from './FloatingNavbar'
import { SpotlightCursor } from '../ui/SpotlightCursor'
import { NoiseOverlay } from '../ui/NoiseOverlay'
import { BuggyWidget } from '../core/BuggyWidget'
import { useUIStore } from '@/stores/uiStore'
import { useThemeStore } from '@/stores/themeStore'
import { useEffect } from 'react'

function ThemeInitializer() {
    const resolvedTheme = useThemeStore((s) => s.resolvedTheme)

    useEffect(() => {
        const root = document.documentElement
        if (resolvedTheme === 'dark') {
            root.classList.add('dark')
            root.classList.remove('light')
        } else {
            root.classList.add('light')
            root.classList.remove('dark')
        }
    }, [resolvedTheme])

    return null
}

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export function AppLayout() {
    const sidebarOpen = useUIStore((s) => s.sidebarOpen)

    return (
        <div className="relative min-h-dvh bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] transition-colors duration-300">
            <ThemeInitializer />
            <SpotlightCursor />
            <NoiseOverlay />
            <BuggyWidget />
            <FloatingNavbar />
            <Sidebar />

            <motion.main
                initial={false}
                animate={{
                    marginLeft: sidebarOpen ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed)',
                }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="min-h-dvh pt-20 pb-8 px-4 md:px-6 lg:px-8 max-md:ml-0!"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        variants={pageVariants}
                        initial="initial"
                        animate="enter"
                        exit="exit"
                        className="mx-auto max-w-[1440px]"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </motion.main>

            {/* Ambient gradient orbs - subtle background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
                <div className="absolute -top-[40%] -right-[20%] w-[800px] h-[800px] rounded-full bg-[var(--color-accent)] opacity-[0.015] blur-[150px]" />
                <div className="absolute -bottom-[30%] -left-[15%] w-[600px] h-[600px] rounded-full bg-[var(--color-secondary)] opacity-[0.012] blur-[120px]" />
            </div>
        </div>
    )
}
