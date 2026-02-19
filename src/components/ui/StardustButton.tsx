import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './stardust-button.css'

interface StardustButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'ghost' | 'danger'
    fullWidth?: boolean
    icon?: ReactNode
    isLoading?: boolean
}

export function StardustButton({
    children,
    size = 'md',
    variant = 'default',
    fullWidth = false,
    icon,
    isLoading = false,
    className = '',
    disabled,
    ...props
}: StardustButtonProps) {
    const sizeClass = `stardust-btn--${size}`
    const variantClass = variant !== 'default' ? `stardust-btn--${variant}` : ''
    const widthClass = fullWidth ? 'stardust-btn--full' : ''

    return (
        <button
            className={`stardust-btn ${sizeClass} ${variantClass} ${widthClass} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            <span className="stardust-btn__wrap">
                <span className="stardust-btn__content">
                    {isLoading ? (
                        <span className="animate-spin mr-2">⏳</span>
                    ) : (
                        icon
                    )}
                    {children}
                </span>
            </span>
        </button>
    )
}
