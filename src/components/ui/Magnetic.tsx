import { useRef, useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';

interface MagneticProps {
    children: React.ReactElement;
    strength?: number; // How far it pulls
    active?: boolean; // Can be disabled
}

export function Magnetic({ children, strength = 0.5, active = true }: MagneticProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Liquid spring physics
    const springConfig = { stiffness: 150, damping: 15, mass: 0.1 };
    const motionX = useSpring(0, springConfig);
    const motionY = useSpring(0, springConfig);

    useEffect(() => {
        if (!active || !isHovered) {
            motionX.set(0);
            motionY.set(0);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;
            const { clientX, clientY } = e;
            const { height, width, left, top } = ref.current.getBoundingClientRect();

            // Calculate center of the element
            const centerX = left + width / 2;
            const centerY = top + height / 2;

            // Calculate distance from center, scale by strength
            const x = (clientX - centerX) * strength;
            const y = (clientY - centerY) * strength;

            motionX.set(x);
            motionY.set(y);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isHovered, active, strength, motionX, motionY]);

    return (
        <motion.div
            ref={ref}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ x: motionX, y: motionY }}
            className="inline-block"
        >
            {children}
        </motion.div>
    );
}
