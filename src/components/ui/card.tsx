import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Card variants following Design System v1.0:
 * - default  → glass (informational, backdrop-blur allowed)
 * - solid    → surface-interactive (actionable, SOLID)
 * - elevated → surface-elevated (elevated container)
 * - critical → surface-critical (error/alert)
 */
type CardVariant = 'default' | 'solid' | 'elevated' | 'critical'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant
}

const variantClass: Record<CardVariant, string> = {
    default: 'card-info',
    solid: 'card-action',
    elevated: 'surface-elevated rounded-[var(--card-radius)] shadow-[var(--card-shadow)]',
    critical: 'card-critical',
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => (
        <div
            ref={ref}
            className={cn(variantClass[variant], 'text-[var(--color-text-primary)]', className)}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-[var(--color-text-primary)]",
            className,
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-[var(--color-text-secondary)]", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
export type { CardVariant }
