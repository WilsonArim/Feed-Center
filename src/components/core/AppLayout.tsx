import { Outlet } from 'react-router'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { FloatingNavbar } from './FloatingNavbar'
import { SpotlightCursor } from '../ui/SpotlightCursor'
import { NoiseOverlay } from '../ui/NoiseOverlay'
import { BuggyWidget } from '../core/BuggyWidget'
import { useUIStore } from '@/stores/uiStore'

import { AuroraBackground } from '../ui/AuroraBackground'

export function AppLayout() {
    const sidebarOpen = useUIStore((s) => s.sidebarOpen)

    return (
        <AuroraBackground>
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
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="min-h-dvh max-md:ml-0!"
            >
                <Outlet />
            </motion.main>
        </AuroraBackground>
    )
}
