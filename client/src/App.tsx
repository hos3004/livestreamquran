/**
 * App.tsx — Root component
 *
 * Owns playback state machine:
 *   - currentPage
 *   - play/pause/next/prev
 *   - elapsed time (drives QuranWindow scroll)
 *   - audio loading/playback
 *   - keyboard shortcuts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BroadcastScene } from './components/BroadcastScene';
import { ControlsPanel }  from './components/ControlsPanel';
import { useManifest }    from './hooks/useManifest';
import { useAudio }       from './hooks/useAudio';

type PageAdvanceMode = 'reset' | 'continue';

export default function App() {
  const { manifest, config, slides, loading, error, updateConfig } = useManifest();

  const [currentPage, setCurrentPage] = useState(1);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [debugMode,   setDebugMode]   = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [renderMode, setRenderMode]   = useState(false);
  const [pageAdvanceMode, setPageAdvanceMode] = useState<PageAdvanceMode>('reset');
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  // ─── Initialize startPage when config loads ─────────────────────────────
  const initializedRef = useRef(false);
  useEffect(() => {
    if (config && !initializedRef.current) {
      initializedRef.current = true;
      const urlParams = new URLSearchParams(window.location.search);
      const isRender = urlParams.get('renderMode') === 'true';
      setRenderMode(isRender);
      
      const targetJuz = urlParams.get('juz');
      
      let start = Math.max(1, Math.min(config.startPage, manifest.length || 1));
      
      if (isRender && targetJuz && manifest.length) {
         // Auto-find first page of this Juz
         const juzStartPage = manifest.find(m => m.juz === parseInt(targetJuz, 10))?.page;
         if (juzStartPage) start = juzStartPage;
         document.body.classList.add('render-mode');
         setShowControls(false); // Hide UI in render mode
      }

      setCurrentPage(start);
    }
  }, [config, manifest]);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearAutoAdvanceTimer, [clearAutoAdvanceTimer]);

  // ─── Audio engine ────────────────────────────────────────────────────────
  const handleAudioEnded = useCallback(() => {
    clearAutoAdvanceTimer();
    setCurrentPage(prev => {
      const next = prev + 1;
      if (next > (manifest.length || 604)) {
        if (config?.loopMode) {
          setPageAdvanceMode('reset');
          setIsPlaying(true);
          return 1;
        }
        setIsPlaying(false);
        return prev;
      }

      setPageAdvanceMode('continue');
      return next;
    });
  }, [clearAutoAdvanceTimer, manifest.length, config?.loopMode]);

  const { state: audioState, load, play, pause, stop, audioRef } = useAudio({
    onEnded: handleAudioEnded,
  });

  // ─── Load audio when page changes ───────────────────────────────────────
  useEffect(() => {
    if (!manifest.length) return;
    const entry = manifest[currentPage - 1];
    if (!entry) return;

    if (entry.audioPath) {
      if (renderMode) {
        // In render mode, do not actually load/play audio to save resources and avoid sync issues.
      } else {
        load(entry.audioPath);
      }
    } else {
      console.warn(`[App] Page ${currentPage}: no audio path, skipping`);
      // Auto advance after a brief pause
      const t = setTimeout(() => handleAudioEnded(), 2000);
      return () => clearTimeout(t);
    }
  }, [currentPage, manifest, load, handleAudioEnded]);

  // ─── Auto-play when audio is ready ──────────────────────────────────────
  useEffect(() => {
    if (audioState.playState === 'paused' && isPlaying) {
      play();
    }
  }, [audioState.playState, isPlaying, play]);

  // (Audio currentTime is read directly via audioRef in QuranWindow's own RAF loop)

  // ─── Render Mode Timeline Override ──────────────────────────────────────────────
  const fakeAudioRef = useRef<{ currentTime: number; ended: boolean; _duration: number }>({ currentTime: 0, ended: false, _duration: 1 });
  useEffect(() => {
    if (!renderMode) return;
    // Expose global renderSeek function for Puppeteer to call
    (window as any).renderSeek = (timelineSeconds: number) => {
      // Find the page that corresponds to this global timeline second
      let targetPage = 1;
      let pageLocalTime = 0;
      let isEnded = false;

      // In render mode, we assume the ?juz=X dictates the bounds, or we just render from the current page onwards
      // Actually we just need to iterate manifest to map timelineSeconds to page & local time
      // For simplicity, let's assume timelineSeconds is relative to the start of the current Juz
      // Let's compute a global timeline for the generated video:
      const urlParams = new URLSearchParams(window.location.search);
      const targetJuz = parseInt(urlParams.get('juz') || '0', 10);
      
      let accum = 0;
      for (const m of manifest) {
        if (targetJuz && m.juz !== targetJuz) continue; // Skip pages not in the Juz
        if (!targetPage) targetPage = m.page; // fallback first match

        const dur = Math.max(0.1, m.audioDuration || 30);
        if (timelineSeconds >= accum && timelineSeconds < accum + dur + 1.0) { // + 1s post scroll
           targetPage = m.page;
           pageLocalTime = timelineSeconds - accum;
           
           if (pageLocalTime > dur) {
             isEnded = true; // Still showing page but audio ended (post scroll gap)
           }
           break;
        }
        accum += dur + 1.0; // Assume 1s gap between pages
      }

      setCurrentPage(targetPage);
      fakeAudioRef.current.currentTime = pageLocalTime;
      fakeAudioRef.current.ended = isEnded;
      fakeAudioRef.current._duration = manifest.find(m => m.page === targetPage)?.audioDuration || 30;
      
      // Update global CSS variable for animations so they sync exactly to the timeline
      document.body.style.setProperty('--render-time', `${timelineSeconds}s`);
      return { page: targetPage, localTime: pageLocalTime };
    };
    (window as any).getJuzDuration = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const targetJuz = parseInt(urlParams.get('juz') || '0', 10);
      let total = 0;
      for (const m of manifest) {
        if (targetJuz && m.juz !== targetJuz) continue;
        const dur = Math.max(0.1, m.audioDuration || 30);
        total += dur + 1.0; // duration + 1s gap
      }
      return total;
    };
  }, [renderMode, manifest]);


  // ─── Controls ────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    play();
  }, [play]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    pause();
  }, [pause]);

  const handleNext = useCallback(() => {
    clearAutoAdvanceTimer();
    setPageAdvanceMode('reset');
    stop();
    setCurrentPage(p => Math.min(p + 1, manifest.length || 604));
    setIsPlaying(true);
  }, [clearAutoAdvanceTimer, stop, manifest.length]);

  const handlePrev = useCallback(() => {
    clearAutoAdvanceTimer();
    setPageAdvanceMode('reset');
    stop();
    setCurrentPage(p => Math.max(p - 1, 1));
    setIsPlaying(true);
  }, [clearAutoAdvanceTimer, stop]);

  const handleJumpToPage = useCallback((page: number) => {
    clearAutoAdvanceTimer();
    setPageAdvanceMode('reset');
    stop();
    setCurrentPage(page);
    setIsPlaying(true);
  }, [clearAutoAdvanceTimer, stop]);

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
        case 'Space':
          e.preventDefault();
          isPlaying ? handlePause() : handlePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'c':
        case 'C':
          setShowControls(v => !v);
          break;
        case 'd':
        case 'D':
          setDebugMode(v => !v);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, handlePlay, handlePause, handleNext, handlePrev]);

  // ─── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading manifest...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>❌ Error</h2>
        <pre>{error}</pre>
        <p>Make sure to run: <code>npm run ingest</code> first, then restart the server.</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Full-scene SVG broadcast view */}
      <div className="scene-wrapper">
        <BroadcastScene
          manifest={manifest}
          slides={slides}
          config={config!}
          currentPage={currentPage}
          pageAdvanceMode={pageAdvanceMode}
          isPlaying={renderMode ? true : isPlaying}
          audioRef={renderMode ? fakeAudioRef as any : audioRef}
          debugMode={debugMode}
        />
      </div>

      {/* Floating controls panel */}
      {showControls && (
        <div className="controls-wrapper">
          <ControlsPanel
            config={config!}
            updateConfig={updateConfig}
            currentPage={currentPage}
            totalPages={manifest.length}
            isPlaying={isPlaying}
            debugMode={debugMode}
            onPlay={handlePlay}
            onPause={handlePause}
            onNext={handleNext}
            onPrev={handlePrev}
            onJumpToPage={handleJumpToPage}
            onToggleDebug={() => setDebugMode(v => !v)}
          />
        </div>
      )}

      {/* Top right actions */}
      <div className="top-right-actions" style={{ position: 'fixed', top: 12, right: 16, zIndex: 9999, display: 'flex', gap: 8 }}>
        <div 
          className="controls-hint" 
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(console.warn);
            } else {
              document.exitFullscreen().catch(console.warn);
            }
          }}
          title="Toggle Fullscreen"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          ملء الشاشة
        </div>
        <div className="controls-hint" onClick={() => setShowControls(v => !v)}>
          {showControls ? '✕ إخفاء الإعدادات' : '☰ الإعدادات'}
        </div>
      </div>
    </div>
  );
}
