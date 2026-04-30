/**
 * BroadcastScene.tsx
 *
 * Root 1920×1080 SVG canvas. Layer order (bottom → top):
 *   1. Background
 *   2. TopWindow  (slideshow  — inside frame's top arch opening)
 *   3. QuranWindow (page scroll — inside frame's bottom arch opening)
 *   4. frame.png  (decorative frame — covers/masks content edges)
 *   5. InfoBand   (surah name / juz / page — floats ABOVE frame)
 *
 * This SVG is rendered at 1920×1080 and scaled via CSS to fit the browser.
 */

import React from 'react';
import type { ManifestEntry, AppConfig } from '../types';
import { TopWindow }   from './TopWindow';
import { InfoBand }    from './InfoBand';
import { QuranWindow } from './QuranWindow';

// ─── Scene dimensions ─────────────────────────────────────────────────────────
export const SCENE_W = 1920;
export const SCENE_H = 1080;

// ─── Frame openings (measured from 2.png at 1920×1080) ───────────────────────
// Top arch opening  — where the slideshow lives (inside the curved top window)
const SLIDE_X = 78;
const SLIDE_Y = 0;
const SLIDE_W = 1765;
const SLIDE_H = 447;

// Info band         — the middle decorative panel region
// Rendered ABOVE the frame so it's always visible
const BAND_Y  = 352;
const BAND_H  = 116;   // covers the full gold middle panel

// Bottom arch opening — where the Quran page scrolls
const PAGE_X  = 120;
const PAGE_Y  = BAND_Y + BAND_H;   // 468
const PAGE_W  = 1680;
const PAGE_H  = SCENE_H - PAGE_Y;  // 612

interface Props {
  manifest: ManifestEntry[];
  slides: string[];
  config: AppConfig;
  currentPage: number;
  pageAdvanceMode: 'reset' | 'continue';
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  debugMode: boolean;
}

export const BroadcastScene: React.FC<Props> = ({
  manifest,
  slides,
  config,
  currentPage,
  pageAdvanceMode,
  isPlaying,
  audioRef,
  debugMode,
}) => {
  const entryIndex = currentPage - 1;
  const prevEntry  = manifest[entryIndex - 1] ?? null;
  const entry      = manifest[entryIndex] ?? null;
  const nextEntry  = manifest[entryIndex + 1] ?? null;

  return (
    <svg
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', background: '#050510' }}
    >
      {/* ── Global defs ── */}
      <defs>
        <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#6b4c10" />
          <stop offset="30%"  stopColor="#c9a84c" />
          <stop offset="50%"  stopColor="#f5d98e" />
          <stop offset="70%"  stopColor="#c9a84c" />
          <stop offset="100%" stopColor="#6b4c10" />
        </linearGradient>

        <linearGradient id="goldSweepGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity={config.goldSweepOpacity * 2} />
          <stop offset="52%" stopColor="#ffffff" stopOpacity={config.goldSweepOpacity * 2} />
          <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;600&display=swap');
        `}</style>
      </defs>

      {/* ── 1. Base background ── */}
      <rect width={SCENE_W} height={SCENE_H} fill="#050510" />

      {/* ── 2. SLIDESHOW — inside the frame's top arch opening ── */}
      <TopWindow
        slides={slides}
        config={config}
        x={SLIDE_X} y={SLIDE_Y}
        width={SLIDE_W} height={SLIDE_H}
      />

      <QuranWindow
        prevEntry={prevEntry}
        entry={entry}
        nextEntry={nextEntry}
        config={config}
        pageAdvanceMode={pageAdvanceMode}
        isPlaying={isPlaying}
        audioRef={audioRef}
        x={PAGE_X} y={PAGE_Y}
        width={PAGE_W} height={PAGE_H}
        debugMode={debugMode}
      />

      {/* ── 4. FRAME OVERLAY — covers content edges, sits above slides+page ── */}
      <g
        className={config.enableParallax ? "parallax-frame" : ""}
        style={{
          transformOrigin: 'center',
          ...(config.enableParallax ? {
            '--px': `${config.parallaxStrength}px`,
            '--py': `${config.parallaxStrength}px`,
            '--parallax-duration': `${config.parallaxDuration / 1000}s`,
          } : {})
        } as React.CSSProperties}
      >
        <image
          href="/frame.png"
          x={0} y={0}
          width={SCENE_W} height={SCENE_H}
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        />
      </g>

      {/* ── 4.1 GOLD SWEEP — overlays only on the frame ── */}
      {config.enableGoldSweep && (
        <rect
          width={SCENE_W} height={SCENE_H}
          fill="url(#goldSweepGradient)"
          className="gold-sweep-rect"
          style={{
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            '--sweep-duration': `${config.goldSweepDuration / 1000}s`,
          } as React.CSSProperties}
        />
      )}

      {/* ── 5. INFO BAND — rendered ABOVE the frame so it's always visible ── */}
      <InfoBand
        entry={entry}
        config={config}
        x={0} y={BAND_Y}
        width={SCENE_W} height={BAND_H}
      />
    </svg>
  );
};
