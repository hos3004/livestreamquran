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

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }
  }, []);

  const safeIntervalMs = Math.max(1000, intervalMs || 8000);
  const safeTransitionMs = Math.max(0, Math.min(transitionMs || 0, safeIntervalMs - 100));

  const advance = useCallback(() => {
    if (pausedRef.current) return;
    if (transitionRef.current) {
      clearTimeout(transitionRef.current);
      transitionRef.current = null;
    }

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
      transitionRef.current = null;
    }, safeTransitionMs);
  }, [slides.length, safeTransitionMs]);

  useEffect(() => {
    clearTimers();

    if (slides.length <= 1) {
      setState({
        currentIdx: 0,
        nextIdx: slides.length > 1 ? 1 : 0,
        transitioning: false,
      });
      return;
    }

    setState(prev => ({
      currentIdx: prev.currentIdx % slides.length,
      nextIdx: (prev.currentIdx + 1) % slides.length,
      transitioning: false,
    }));

    const schedule = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      timerRef.current = setTimeout(() => {
        advance();
        schedule();
      }, safeIntervalMs);
    };

    schedule();

    return clearTimers;
  }, [slides.length, safeIntervalMs, advance, clearTimers]);

  const currentSrc = slides.length > 0 ? slides[state.currentIdx % slides.length] : '';
  const nextSrc    = slides.length > 1  ? slides[state.nextIdx    % slides.length] : currentSrc;

  return { currentSrc, nextSrc, transitioning: state.transitioning };
}
