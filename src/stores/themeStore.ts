/**
 * themeStore — Aurora Dark is the sole theme.
 * This stub ensures `dark` class is always present and exports
 * a no-op hook so any remaining references compile without errors.
 */
if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
}

// No-op store — theme is fixed to Aurora Dark.
export const useThemeStore = () => ({ mode: 'dark' as const, resolvedTheme: 'dark' as const, setMode: () => { } })
