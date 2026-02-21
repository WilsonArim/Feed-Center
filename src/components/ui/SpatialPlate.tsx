import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SpatialPlateProps extends HTMLMotionProps<"div"> {
    isActive?: boolean;
    isBackground?: boolean;
    intensity?: "normal" | "high";
    children: React.ReactNode;
}

export const SpatialPlate = forwardRef<HTMLDivElement, SpatialPlateProps>(
    ({ isActive = false, isBackground = false, intensity = "normal", className, children, ...props }, ref) => {

        // Ambient Interface liquid spring transitions
        const springTransition = {
            type: "spring",
            stiffness: 400, // snappier, more magnetic feel
            damping: 35,
            mass: 0.8,
        } as const;

        return (
            <motion.div
                ref={ref}
                initial={false}
                animate={{
                    scale: isActive ? 1.01 : isBackground ? 0.98 : 1, // subtle scale
                    filter: isBackground
                        ? "blur(12px) brightness(0.2)" // Cognitive Dimming: Extreme focus
                        : isActive
                            ? "blur(0px) brightness(1.1) drop-shadow(0 0 32px rgba(255, 90, 0, 0.15))" // Signal Orange ambient glow
                            : "blur(0px) brightness(1) drop-shadow(0 0 0px rgba(0,0,0,0))",
                    zIndex: isActive ? 40 : isBackground ? 10 : 20,
                }}
                transition={springTransition}
                className={cn(
                    // Base Invisible styling (Cardless)
                    "relative",
                    "rounded-none border-none bg-transparent", // Strip bento box backgrounds and borders

                    // Force hardware acceleration for smooth magnetic physics
                    "will-change-transform",

                    className
                )}
                style={{
                    // Use standard inline Z-index to force overlapping without relying just on classes
                    zIndex: isActive ? 40 : isBackground ? 10 : 20,
                }}
                {...props}
            >
                {/* Intense top border reflection for tactile feel */}
                {intensity === "high" && (
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                )}

                {/* Content Container */}
                <div className="relative z-10 w-full h-full">
                    {children}
                </div>
            </motion.div>
        );
    }
);

SpatialPlate.displayName = "SpatialPlate";
