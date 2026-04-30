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
  
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useState<AudioState>({
    playState: 'idle',
    currentTime: 0,
    duration: 0,
    error: null,
  });

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onCanPlay  = () => setState(s => ({ ...s, playState: s.playState === 'loading' ? 'paused' : s.playState }));
    const onPlaying  = () => setState(s => ({ ...s, playState: 'playing', error: null }));
    const onPause    = () => setState(s => ({ ...s, playState: 'paused' }));
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
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const load = useCallback((src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = src;
    audio.load();
    setState({ playState: 'loading', currentTime: 0, duration: 0, error: null });
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    try {
      // Ensure the audio is in a ready state before playing
      if (audio.readyState === 0) {
        // If audio hasn't loaded yet, wait for it to load
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            resolve();
          };
          audio.addEventListener('canplay', onCanPlay);
        });
      }
      
      await audio.play();
    } catch (e: any) {
      console.warn('Audio play failed:', e.message);
      // Additional handling for autoplay policies
      if (e.name === 'NotAllowedError') {
        console.warn('Playback prevented by autoplay policy. User needs to interact with the page first.');
      }
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setState(s => ({ ...s, playState: 'idle', currentTime: 0 }));
  }, []);

  // Preload a URL without changing current playback
  const preload = useCallback((src: string) => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
  }, []);

  return { state, load, play, pause, seek, stop, preload, audioRef };
}
