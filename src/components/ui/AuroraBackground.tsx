/**
 * AuroraBackground
 * Renders an animated aurora mesh gradient as a fixed layer behind all content.
 * Uses CSS-only animations via the .aurora-layer class defined in index.css.
 * Adapts automatically to dark/light mode via CSS custom properties.
 */
export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="aurora-layer" aria-hidden="true" />
      {children}
    </>
  )
}
