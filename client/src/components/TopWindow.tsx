/**
 * TopWindow.tsx  — Slideshow with Ken Burns and cross-fade
 *
 * KEY FIX: SVG <image> elements have NO key prop → React keeps the same
 * DOM element and just updates href, so CSS animations never restart.
 * The cross-fade between two stable slots (slotA / slotB) removes the jump.
 */

import React, { useId, useRef, useEffect } from 'react';
import type { AppConfig } from '../types';
import { useSlideshow }  from '../hooks/useSlideshow';
import { TopDust } from './TopDust';

interface Props {
  slides: string[];
  config: AppConfig;
  x: number; y: number; width: number; height: number;
}

const KB_ANIMS = ['kb-zoom-tl','kb-zoom-tr','kb-zoom-bl','kb-zoom-br','kb-pan-left','kb-pan-right'];

function pickVariant(src: string): string {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  return KB_ANIMS[h % KB_ANIMS.length];
}

export const TopWindow: React.FC<Props> = ({ slides, config, x, y, width, height }) => {
  const clipId = useId().replace(/:/g, '_') + '_top';

  const { currentSrc, nextSrc, transitioning } = useSlideshow(
    slides, config.slideshowInterval, config.slideshowTransitionDuration,
  );

  // Two stable SVG image refs — we update href imperatively so the elements
  // (and their CSS KB animations) are never destroyed/recreated.
  const imgARef = useRef<SVGImageElement | null>(null);
  const imgBRef = useRef<SVGImageElement | null>(null);

  // Track which slot is currently "front" (fully visible)
  const frontIsA = useRef(true);

  useEffect(() => {
    const a = imgARef.current;
    const b = imgBRef.current;
    if (!a || !b) return;

    if (!transitioning) {
      // Completed transition — the front slot now shows currentSrc
      if (frontIsA.current) {
        a.setAttribute('href', currentSrc);
        a.style.opacity = '1';
        b.style.opacity = '0';
        // Pre-load nextSrc into the back slot
        if (nextSrc !== currentSrc) b.setAttribute('href', nextSrc);
      } else {
        b.setAttribute('href', currentSrc);
        b.style.opacity = '1';
        a.style.opacity = '0';
        if (nextSrc !== currentSrc) a.setAttribute('href', nextSrc);
      }
    } else {
      // Mid-transition: cross-fade to the back slot
      const transMs = config.slideshowTransitionDuration;
      if (frontIsA.current) {
        b.setAttribute('href', nextSrc);
        b.style.transition = `opacity ${transMs}ms ease`;
        a.style.transition = `opacity ${transMs}ms ease`;
        b.style.opacity = '1';
        a.style.opacity = '0';
        frontIsA.current = false;
      } else {
        a.setAttribute('href', nextSrc);
        a.style.transition = `opacity ${transMs}ms ease`;
        b.style.transition = `opacity ${transMs}ms ease`;
        a.style.opacity = '1';
        b.style.opacity = '0';
        frontIsA.current = true;
      }
    }
  }, [transitioning, currentSrc, nextSrc, config.slideshowTransitionDuration]);

  const initialSrc = slides[0] ?? '';

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
        <linearGradient id={`${clipId}_grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="82%" stopColor="#00000000" />
          <stop offset="100%" stopColor="#00000088" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x={x} y={y} width={width} height={height} fill="#0a0a12" />

      <g clipPath={`url(#${clipId})`}>
        {/* Slot A — stable element, no key, href updated imperatively */}
        <image
          ref={imgARef}
          href={initialSrc}
          x={x} y={y} width={width} height={height}
          preserveAspectRatio="xMidYMid slice"
          className={`slide-img ${pickVariant(initialSrc)}`}
          style={{ opacity: 1 }}
          role="img"
          aria-label="Slideshow Image A"
        />
        {/* Slot B — starts invisible */}
        <image
          ref={imgBRef}
          href={nextSrc || initialSrc || '/frame.png'}
          x={x} y={y} width={width} height={height}
          preserveAspectRatio="xMidYMid slice"
          className={`slide-img ${pickVariant(initialSrc)}`}
          style={{ opacity: 0 }}
          role="img"
          aria-label="Slideshow Image B"
        />

        {/* Bottom gradient */}
        <rect x={x} y={y} width={width} height={height}
          fill={`url(#${clipId}_grad)`} style={{ pointerEvents: 'none' }} />

        {/* Floating dust overlay */}
        {config.enableTopDust && (
          <TopDust
            density={config.topDustDensity}
            opacity={config.topDustOpacity}
            x={x} y={y} width={width} height={height}
          />
        )}
      </g>
    </g>
  );
};
