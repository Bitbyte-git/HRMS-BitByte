/**
 * AstroPlexusBackground
 * ─────────────────────
 * React component that mounts the Astro-Plexus canvas animation as a
 * full-screen fixed background layer behind all UI content.
 *
 * Usage in App.tsx / Layout:
 *   import { AstroPlexusBackground } from '@/components/common/AstroPlexus';
 *   ...
 *   <AstroPlexusBackground />
 *   <YourAppContent />
 *
 * Props:
 *   isDark  – pass the current theme boolean so the canvas updates
 *             immediately when the user toggles without a remount.
 */

import { useEffect, useRef } from 'react';
import { createAstroPlexusEngine, type AstroPlexusEngine } from './astroPlexusEngine';

interface AstroPlexusBackgroundProps {
  /** Drives theme-colour refresh on toggle. Connect to your theme store. */
  isDark?: boolean;
}

export function AstroPlexusBackground({ isDark }: AstroPlexusBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AstroPlexusEngine | null>(null);

  // ── Mount / unmount: create engine once ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createAstroPlexusEngine(canvas);
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []); // intentionally empty — engine lives for component lifetime

  // ── Theme changes: refresh colours without remounting ────────────────────
  useEffect(() => {
    // Small tick to let the DOM apply the .dark class before we read it
    const id = requestAnimationFrame(() => {
      engineRef.current?.updateTheme();
    });
    return () => cancelAnimationFrame(id);
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        // Never intercept clicks — all UI elements remain fully interactive
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
