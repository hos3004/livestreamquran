import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AppConfig, ContentBounds, ManifestEntry } from '../types';
import { detectContentBounds } from '../utils/contentBounds';

interface PageLayout {
  imagePath: string;
  renderedW: number;
  renderedH: number;
  contentY: number;
  contentH: number;
  leftOffset: number;
}

interface Props {
  prevEntry: ManifestEntry | null;
  entry: ManifestEntry | null;
  nextEntry: ManifestEntry | null;
  config: AppConfig;
  pageAdvanceMode: 'reset' | 'continue';
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  x: number;
  y: number;
  width: number;
  height: number;
  debugMode: boolean;
}

const PAGE_CONTENT_GAP = 30;
const POST_AUDIO_SCROLL_MS = 1000;

export const QuranWindow: React.FC<Props> = ({
  prevEntry,
  entry,
  nextEntry,
  config,
  pageAdvanceMode,
  audioRef,
  x,
  y,
  width,
  height,
}) => {
  const clipId = useId().replace(/:/g, '_') + '_quran';

  const layoutCache = useRef(new Map<string, PageLayout>());
  const preloaded = useRef(new Set<string>());

  const lastTranslateYRef = useRef<number | null>(null);
  const audioEndedAtRef = useRef<number | null>(null);

  const entryInitializedRef = useRef<string | null>(null);
  const entryInitialYRef = useRef<number | null>(null);

  const [prevLayout, setPrevLayout] = useState<PageLayout | null>(null);
  const [currLayout, setCurrLayout] = useState<PageLayout | null>(null);
  const [nextLayout, setNextLayout] = useState<PageLayout | null>(null);

  const [prevLoaded, setPrevLoaded] = useState(false);
  const [currLoaded, setCurrLoaded] = useState(false);
  const [nextLoaded, setNextLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevImgRef = useRef<HTMLImageElement | null>(null);
  const currImgRef = useRef<HTMLImageElement | null>(null);
  const nextImgRef = useRef<HTMLImageElement | null>(null);
  const durationRef = useRef(30);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    durationRef.current = entry?.audioDuration ?? 30;
  }, [entry?.audioDuration]);

  useEffect(() => {
    audioEndedAtRef.current = null;
  }, [entry?.imagePath]);

  const computeLayout = useCallback((imagePath: string, bounds: ContentBounds): PageLayout => {
    const scale = (width / bounds.width) * config.scrollZoomFactor;

    return {
      imagePath,
      renderedW: bounds.imageWidth * scale,
      renderedH: bounds.imageHeight * scale,
      contentY: bounds.y * scale,
      contentH: bounds.height * scale,
      leftOffset: (width - bounds.imageWidth * scale) / 2,
    };
  }, [width, config.scrollZoomFactor]);

  const loadLayout = useCallback(async (imagePath: string): Promise<PageLayout> => {
    const cached = layoutCache.current.get(imagePath);
    if (cached) return cached;

    const bounds = await detectContentBounds(imagePath);
    const layout = computeLayout(imagePath, bounds);
    layoutCache.current.set(imagePath, layout);
    preloaded.current.add(imagePath);
    return layout;
  }, [computeLayout]);

  const getPageAdvanceOffset = useCallback((current: PageLayout, next: PageLayout | null) => {
    if (!next) return current.renderedH;

    // Keep page flow based on visible text bounds rather than the full transparent image.
    return Math.max(0, current.contentY + current.contentH + PAGE_CONTENT_GAP - next.contentY);
  }, []);

  useEffect(() => {
    const imagePath = prevEntry?.imagePath;

    if (!imagePath) {
      setPrevLayout(null);
      setPrevLoaded(false);
      return;
    }

    const cached = layoutCache.current.get(imagePath);
    const wasLoaded = preloaded.current.has(imagePath);

    if (cached) {
      setPrevLayout(cached);
      setPrevLoaded(wasLoaded);
      return;
    }

    setPrevLayout(null);
    setPrevLoaded(false);

    loadLayout(imagePath)
      .then((layout) => {
        setPrevLayout(layout);
        setPrevLoaded(preloaded.current.has(imagePath));
      })
      .catch(console.warn);
  }, [prevEntry?.imagePath, loadLayout]);

  useEffect(() => {
    const imagePath = entry?.imagePath;

    if (!imagePath) {
      setCurrLayout(null);
      setCurrLoaded(false);
      return;
    }

    const cached = layoutCache.current.get(imagePath);
    const wasLoaded = preloaded.current.has(imagePath);

    if (cached) {
      setCurrLayout(cached);
      setCurrLoaded(wasLoaded);
      return;
    }

    setCurrLayout(null);
    setCurrLoaded(false);

    loadLayout(imagePath)
      .then((layout) => {
        setCurrLayout(layout);
        setCurrLoaded(preloaded.current.has(imagePath));
      })
      .catch(console.warn);
  }, [entry?.imagePath, loadLayout]);

  useEffect(() => {
    const imagePath = nextEntry?.imagePath;

    if (!imagePath) {
      setNextLayout(null);
      setNextLoaded(false);
      return;
    }

    const cached = layoutCache.current.get(imagePath);
    const wasLoaded = preloaded.current.has(imagePath);

    if (cached) {
      setNextLayout(cached);
      setNextLoaded(wasLoaded);
      return;
    }

    setNextLayout(null);
    setNextLoaded(false);

    loadLayout(imagePath)
      .then((layout) => {
        setNextLayout(layout);
        setNextLoaded(preloaded.current.has(imagePath));
      })
      .catch(console.warn);
  }, [nextEntry?.imagePath, loadLayout]);

  useEffect(() => {
    if (!nextEntry?.audioPath) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = nextEntry.audioPath;
  }, [nextEntry?.audioPath]);

  const activePrevLayout = prevEntry?.imagePath
    ? layoutCache.current.get(prevEntry.imagePath) || (prevLayout?.imagePath === prevEntry.imagePath ? prevLayout : null)
    : null;

  const activeCurrLayout = entry?.imagePath
    ? layoutCache.current.get(entry.imagePath) || (currLayout?.imagePath === entry.imagePath ? currLayout : null)
    : null;

  const activeNextLayout = nextEntry?.imagePath
    ? layoutCache.current.get(nextEntry.imagePath) || (nextLayout?.imagePath === nextEntry.imagePath ? nextLayout : null)
    : null;

  const isPrevFullyReady = Boolean(activePrevLayout && (preloaded.current.has(prevEntry?.imagePath ?? '') || prevLoaded));
  const isCurrFullyReady = Boolean(activeCurrLayout && (preloaded.current.has(entry?.imagePath ?? '') || currLoaded));
  const isNextFullyReady = Boolean(activeNextLayout && (preloaded.current.has(nextEntry?.imagePath ?? '') || nextLoaded));

  const isTransitioning = Boolean(activeCurrLayout && currLoaded && entryInitializedRef.current !== entry?.imagePath);
  const isShifted = entryInitializedRef.current === entry?.imagePath;
  const isCurrAnchor = isShifted || isTransitioning;

  const offsetPrevToCurr = (activePrevLayout && activeCurrLayout) ? getPageAdvanceOffset(activePrevLayout, activeCurrLayout) : 0;
  const offsetCurrToNext = (activeCurrLayout && activeNextLayout) ? getPageAdvanceOffset(activeCurrLayout, activeNextLayout) : 0;

  let prevPageTop = 0;
  let currPageTop = 0;
  let nextPageTop = 0;

  if (isCurrAnchor) {
    prevPageTop = -offsetPrevToCurr;
    currPageTop = 0;
    nextPageTop = offsetCurrToNext;
  } else {
    // Before the shift, prev is the anchor
    prevPageTop = 0;
    currPageTop = offsetPrevToCurr;
    nextPageTop = offsetPrevToCurr + offsetCurrToNext;
  }

  React.useLayoutEffect(() => {
    if (isTransitioning && activeCurrLayout) {
      const { contentY } = activeCurrLayout;
      if (pageAdvanceMode === 'continue' && lastTranslateYRef.current !== null && activePrevLayout) {
        entryInitialYRef.current = lastTranslateYRef.current + offsetPrevToCurr;
      } else {
        entryInitialYRef.current = height - contentY;
      }
      entryInitializedRef.current = entry?.imagePath ?? null;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${entryInitialYRef.current}px)`;
        lastTranslateYRef.current = entryInitialYRef.current;
      }
    }
  }, [isTransitioning, activeCurrLayout, activePrevLayout, entry?.imagePath, height, pageAdvanceMode, offsetPrevToCurr]);

  useEffect(() => {
    const img = prevImgRef.current;
    if (!img || !activePrevLayout) return;

    img.style.position = 'absolute';
    img.style.top = `${prevPageTop}px`;
    img.style.left = `${activePrevLayout.leftOffset}px`;
    img.style.width = `${activePrevLayout.renderedW}px`;
    img.style.height = `${activePrevLayout.renderedH}px`;
  }, [activePrevLayout, prevPageTop]);

  useEffect(() => {
    const img = currImgRef.current;
    if (!img || !activeCurrLayout) return;

    img.style.position = 'absolute';
    img.style.top = `${currPageTop}px`;
    img.style.left = `${activeCurrLayout.leftOffset}px`;
    img.style.width = `${activeCurrLayout.renderedW}px`;
    img.style.height = `${activeCurrLayout.renderedH}px`;
  }, [activeCurrLayout, currPageTop]);

  useEffect(() => {
    const img = nextImgRef.current;
    if (!img || !activeNextLayout) return;

    img.style.position = 'absolute';
    img.style.top = `${nextPageTop}px`;
    img.style.left = `${activeNextLayout.leftOffset}px`;
    img.style.width = `${activeNextLayout.renderedW}px`;
    img.style.height = `${activeNextLayout.renderedH}px`;
  }, [activeNextLayout, nextPageTop]);

  useEffect(() => {
    if (!activeCurrLayout || !currLoaded || entryInitializedRef.current !== entry?.imagePath) return;

    const { contentY, contentH } = activeCurrLayout;
    
    // Safety fallback
    if (entryInitialYRef.current === null) {
      entryInitialYRef.current = height - contentY;
      lastTranslateYRef.current = entryInitialYRef.current;
    }
    
    const initialY = entryInitialYRef.current;
    const endY = height * 0.6 - (contentY + contentH);

    const animate = () => {
      const container = containerRef.current;
      if (!container) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const duration = durationRef.current;
      const elapsed = audioRef.current?.currentTime ?? 0;
      const progress = Math.max(0, Math.min(1, duration > 0 ? elapsed / duration : 0));
      let translateY = initialY + (endY - initialY) * progress;
      const audio = audioRef.current;

      if (audio?.ended) {
        if (audioEndedAtRef.current === null) {
          audioEndedAtRef.current = now;
        }

        const extraProgress = Math.max(0, Math.min(1, (now - audioEndedAtRef.current) / POST_AUDIO_SCROLL_MS));
        const velocityPerMs = duration > 0 ? (endY - initialY) / (duration * 1000) : 0;
        translateY = endY + velocityPerMs * POST_AUDIO_SCROLL_MS * extraProgress;
      } else {
        audioEndedAtRef.current = null;
      }

      lastTranslateYRef.current = translateY;
      container.style.transform = `translateY(${translateY}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [activeCurrLayout, currLoaded, height, audioRef, pageAdvanceMode]);



  const onPrevLoad = useCallback(() => {
    if (prevEntry?.imagePath) preloaded.current.add(prevEntry.imagePath);
    setPrevLoaded(true);
  }, [prevEntry?.imagePath]);

  const onCurrLoad = useCallback(() => {
    if (entry?.imagePath) preloaded.current.add(entry.imagePath);
    setCurrLoaded(true);
  }, [entry?.imagePath]);

  const onNextLoad = useCallback(() => {
    if (nextEntry?.imagePath) preloaded.current.add(nextEntry.imagePath);
    setNextLoaded(true);
  }, [nextEntry?.imagePath]);

  useEffect(() => {
    const img = prevImgRef.current;
    if (!img || !prevEntry?.imagePath) return;
    if (img.complete && img.naturalWidth > 0) onPrevLoad();
  }, [prevEntry?.imagePath, onPrevLoad]);

  useEffect(() => {
    const img = currImgRef.current;
    if (!img || !entry?.imagePath) return;
    if (img.complete && img.naturalWidth > 0) onCurrLoad();
  }, [entry?.imagePath, onCurrLoad]);

  useEffect(() => {
    const img = nextImgRef.current;
    if (!img || !nextEntry?.imagePath) return;
    if (img.complete && img.naturalWidth > 0) onNextLoad();
  }, [nextEntry?.imagePath, onNextLoad]);

  const showSpinner = Boolean(entry?.imagePath && !isCurrFullyReady && !activeCurrLayout);

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>

      <rect x={x} y={y} width={width} height={height} fill="#fffce7" />

      <foreignObject x={x} y={y} width={width} height={height} clipPath={`url(#${clipId})`}>
        <div
          // @ts-expect-error xmlns for foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: '#fffce7',
          }}
        >
          <div
            ref={containerRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 0 }}
          >
            {[
              { type: 'prev', entry: prevEntry, layout: activePrevLayout, ready: isPrevFullyReady, top: prevPageTop, onLoad: onPrevLoad, ref: prevImgRef },
              { type: 'curr', entry: entry, layout: activeCurrLayout, ready: isCurrFullyReady, top: currPageTop, onLoad: onCurrLoad, ref: currImgRef },
              { type: 'next', entry: nextEntry, layout: activeNextLayout, ready: isNextFullyReady, top: nextPageTop, onLoad: onNextLoad, ref: nextImgRef },
            ].map(p => {
              if (!p.entry?.imagePath || !p.layout) return null;
              if (p.type === 'prev' && pageAdvanceMode !== 'continue') return null;

              return (
                <img
                  key={p.entry.imagePath}
                  ref={p.ref}
                  src={p.entry.imagePath}
                  alt={`Page ${p.entry.page}`}
                  onLoad={p.onLoad}
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: p.top,
                    left: 0,
                    opacity: p.ready ? 1 : 0,
                    transition: 'opacity 0.25s ease',
                  }}
                />
              );
            })}
          </div>

          {showSpinner && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fffce7',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: '4px solid #d4c09022',
                  borderTopColor: '#c9a84c',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            </div>
          )}
        </div>
      </foreignObject>

      <defs>
        <linearGradient id={`${clipId}_top_fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffce7" stopOpacity={1} />
          <stop offset="12%" stopColor="#fffce7" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={60}
        fill={`url(#${clipId}_top_fade)`}
        style={{ pointerEvents: 'none' }}
        clipPath={`url(#${clipId})`}
      />
    </g>
  );
};
