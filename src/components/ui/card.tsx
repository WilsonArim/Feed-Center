import * as React from "react"
import { cn } from "@/lib/utils"

type CardVariant = 'default' | 'solid' | 'elevated' | 'critical' | 'glass'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantClass: Record<CardVariant, string> = {
  default:
    'bg-[var(--card-bg-solid)] border border-[var(--card-border)] rounded-[var(--radius-xl)] shadow-[var(--card-shadow)] transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-[var(--card-hover-shadow)]',
  solid:
    'bg-[var(--card-bg-solid)] border border-[var(--card-border)] rounded-[var(--radius-xl)] shadow-[var(--card-shadow)] cursor-pointer transition-all duration-200 hover:border-[var(--border-glow)] hover:shadow-[var(--card-hover-shadow)] hover:-translate-y-0.5',
  elevated:
    'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-md)]',
  critical:
    'bg-[var(--surface-critical)] border border-[var(--danger-soft)] rounded-[var(--radius-xl)] shadow-sm',
  glass:
    'bg-[var(--surface-glass)] backdrop-blur-xl border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--card-shadow)] transition-all duration-200 hover:bg-[var(--surface-glass-hover)]',
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(variantClass[variant], 'text-[var(--text-primary)]', className)}
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
    className={cn("flex flex-col gap-1.5 p-5 pb-0", className)}
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
      "text-base font-semibold leading-none tracking-tight text-[var(--text-primary)]",
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
    className={cn("text-sm text-[var(--text-secondary)] leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-3", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
export type { CardVariant }
