/**
 * AuroraBackground
 *
 * Renders an animated aurora mesh gradient as a fixed layer behind all content.
 * Uses the `.aurora-layer` CSS class defined in index.css — no JS animations,
 * no filter tricks, no z-index conflicts.
 */
export function AuroraBackground({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div className="aurora-layer" aria-hidden="true" />
            {children}
        </>
    )
}
