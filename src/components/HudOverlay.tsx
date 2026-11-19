interface HudOverlayProps {
  /**
   * - 'workspace': aligns inside the authenticated Cockpit workspace (offset for desktop sidebar & sticky top bar)
   * - 'fullscreen': aligns below the AuthPage top bar across full viewport width
   */
  variant?: 'workspace' | 'fullscreen';
}

export function HudOverlay({ variant = 'workspace' }: HudOverlayProps) {
  const boundsClass =
    variant === 'workspace'
      ? 'fixed top-16 left-0 right-0 bottom-0 lg:left-64'
      : 'fixed top-16 left-0 right-0 bottom-0';

  return (
    <>
      {/* Background translucent dual-scale HUD coordinate grid (sits beneath page cards) */}
      <div
        aria-hidden="true"
        className={`${boundsClass} pointer-events-none select-none z-0 hud-grid-bg`}
      />

      {/* Foreground non-blocking HUD corner brackets & fine edge calibration ticks */}
      <div
        aria-hidden="true"
        className={`${boundsClass} pointer-events-none select-none z-20 overflow-hidden`}
      >
        {/* 4 Precision Corner Reticle Brackets */}
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-tr" />
        <span className="hud-corner hud-corner-bl" />
        <span className="hud-corner hud-corner-br" />

        {/* Subtle Top & Bottom Horizontal Heading Calibration Ticks */}
        <div className="hidden sm:block absolute top-3 left-1/2 -translate-x-1/2 w-56 md:w-80 h-2 hud-ticks-x" />
        <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 w-48 md:w-72 h-1.5 hud-ticks-x opacity-75" />

        {/* Subtle Left & Right Vertical Altitude/Pitch Ladder Ticks */}
        <div className="hidden xl:block absolute left-3 top-1/2 -translate-y-1/2 w-2 h-52 hud-ticks-y" />
        <div className="hidden xl:block absolute right-3 top-1/2 -translate-y-1/2 w-2 h-52 hud-ticks-y" />
      </div>
    </>
  );
}
