/**
 * useAudio.ts
 *
 * Manages a single <audio> element for page MP3 playback.
 * Returns state + control functions.
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export type AudioPlayState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

interface AudioState {
  playState: AudioPlayState;
  currentTime: number;
  duration: number;
  error: string | null;
}

interface UseAudioOptions {
  onEnded?: () => void;
  onError?: (msg: string) => void;
}

export function useAudio(options: UseAudioOptions = {}) {
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const optionsRef     = useRef<UseAudioOptions>({});
  const preloadRef     = useRef<HTMLAudioElement | null>(null);
  
  const opIdRef = useRef(0);
  const internalPauseRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useState<AudioState>({
    playState: 'idle',
    currentTime: 0,
    duration: 0,
    error: null,
  });

  const isCurrentOp = useCallback((opId: number) => opIdRef.current === opId, []);

  const waitForCanPlay = useCallback((audio: HTMLAudioElement, opId: number) => {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('canplaythrough', onCanPlay);
        audio.removeEventListener('error', onError);
      };
      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(audio.error?.message || 'Audio error'));
      };

      audio.addEventListener('canplay', onCanPlay, { once: true });
      audio.addEventListener('canplaythrough', onCanPlay, { once: true });
      audio.addEventListener('error', onError, { once: true });

      if (!isCurrentOp(opId)) {
        cleanup();
        resolve();
      }
    });
  }, [isCurrentOp]);

  const isInterruptError = (error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error || '');
    return msg.includes('interrupted by a call to pause')
      || msg.includes('interrupted by a new load request');
  };

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onCanPlay  = () => setState(s => ({ ...s, playState: s.playState === 'loading' ? 'paused' : s.playState }));
    const onPlaying  = () => setState(s => ({ ...s, playState: 'playing', error: null }));
    const onPause    = () => {
      if (internalPauseRef.current) return;
      setState(s => ({ ...s, playState: 'paused' }));
    };
    const onEnded    = () => {
      setState(s => ({ ...s, playState: 'ended' }));
      optionsRef.current.onEnded?.();
    };
    const onError    = () => {
      const msg = audio.error?.message || 'Audio error';
      setState(s => ({ ...s, playState: 'error', error: msg }));
      optionsRef.current.onError?.(msg);
    };
    const onTimeUpdate = () => setState(s => ({
      ...s,
      currentTime: audio.currentTime,
      duration: audio.duration || s.duration,
    }));
    const onDurationChange = () => setState(s => ({
      ...s,
      duration: audio.duration || s.duration,
    }));

    audio.addEventListener('canplay',       onCanPlay);
    audio.addEventListener('playing',       onPlaying);
    audio.addEventListener('pause',         onPause);
    audio.addEventListener('ended',         onEnded);
    audio.addEventListener('error',         onError);
    audio.addEventListener('timeupdate',    onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);

    return () => {
      audio.removeEventListener('canplay',       onCanPlay);
      audio.removeEventListener('playing',       onPlaying);
      audio.removeEventListener('pause',         onPause);
      audio.removeEventListener('ended',         onEnded);
      audio.removeEventListener('error',         onError);
      audio.removeEventListener('timeupdate',    onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      
      opIdRef.current += 1;
      internalPauseRef.current = true;
      audio.pause();
      internalPauseRef.current = false;
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;

      if (preloadRef.current) {
        preloadRef.current.pause();
        preloadRef.current.removeAttribute('src');
        preloadRef.current.load();
        preloadRef.current = null;
      }
    };
  }, []);

  const load = useCallback((src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const opId = ++opIdRef.current;
    internalPauseRef.current = true;
    audio.pause();
    internalPauseRef.current = false;
    
    audio.src = src;
    audio.load();
    setState({ playState: 'loading', currentTime: 0, duration: 0, error: null });
    return opId;
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const currentOpId = ++opIdRef.current;
    
    try {
      await waitForCanPlay(audio, currentOpId);
      
      if (!isCurrentOp(currentOpId)) return;
      
      await audio.play();
      
      if (!isCurrentOp(currentOpId)) return;
    } catch (e: any) {
      if (!isCurrentOp(currentOpId)) return;
      
      const msg = e.message || '';
      if (isInterruptError(e)) {
        console.warn('Audio play interrupted by a newer operation:', msg);
        return;
      }
      
      if (e.name === 'NotAllowedError') {
        console.warn('Playback prevented by autoplay policy.');
        return;
      }

      console.warn('Audio play failed:', msg);
      if (audio.error) {
        const audioMsg = audio.error.message || msg || 'Audio error';
        setState(s => ({ ...s, playState: 'error', error: audioMsg }));
        optionsRef.current.onError?.(audioMsg);
      }
    }
  }, [isCurrentOp, waitForCanPlay]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    opIdRef.current += 1;
    internalPauseRef.current = false;
    audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    opIdRef.current += 1;
    internalPauseRef.current = true;
    audio.pause();
    internalPauseRef.current = false;
    audio.currentTime = 0;
    setState(s => ({ ...s, playState: 'idle', currentTime: 0 }));
  }, []);

  // Preload a URL without changing current playback
  const preload = useCallback((src: string) => {
    if (preloadRef.current) {
      preloadRef.current.pause();
      preloadRef.current.removeAttribute('src');
      preloadRef.current.load();
    }

    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
    a.load();
    preloadRef.current = a;
  }, []);

  return { state, load, play, pause, seek, stop, preload, audioRef };
}
