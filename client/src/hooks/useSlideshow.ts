/**
 * useSlideshow.ts
 *
 * Manages cycling through a list of slide image URLs at a configurable interval.
 * Returns the current and next image plus a transition progress [0–1].
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SlideshowState {
  currentIdx: number;
  nextIdx: number;
  transitioning: boolean; // true during fade-out/in
}

export function useSlideshow(
  slides: string[],
  intervalMs: number,
  transitionMs: number,
) {
  const [state, setState] = useState<SlideshowState>({
    currentIdx: 0,
    nextIdx:    1,
    transitioning: false,
  });

  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef     = useRef(false);

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    setState(prev => {
      const nextIdx = (prev.currentIdx + 1) % Math.max(slides.length, 1);
      return { ...prev, nextIdx, transitioning: true };
    });

    // After transition duration, swap and stop transitioning
    transitionRef.current = setTimeout(() => {
      setState(prev => ({
        currentIdx: prev.nextIdx,
        nextIdx: (prev.nextIdx + 1) % Math.max(slides.length, 1),
        transitioning: false,
      }));
    }, transitionMs);
  }, [slides.length, transitionMs]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        advance();
        schedule();
      }, intervalMs);
    };

    schedule();

    return () => {
      if (timerRef.current)      clearTimeout(timerRef.current);
      if (transitionRef.current) clearTimeout(transitionRef.current);
    };
  }, [slides.length, intervalMs, advance]);

  const currentSrc = slides.length > 0 ? slides[state.currentIdx % slides.length] : '';
  const nextSrc    = slides.length > 1  ? slides[state.nextIdx    % slides.length] : currentSrc;

  return { currentSrc, nextSrc, transitioning: state.transitioning };
}
