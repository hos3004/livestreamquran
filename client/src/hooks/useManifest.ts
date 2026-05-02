/**
 * useManifest.ts
 * Fetches manifest.json once and caches it. Also fetches app config and slides list.
 */

import { useState, useEffect } from 'react';
import type { ManifestEntry, AppConfig } from '../types';

interface ManifestState {
  manifest: ManifestEntry[];
  config: AppConfig | null;
  slides: string[];
  loading: boolean;
  error: string | null;
}

const DEFAULT_CONFIG: AppConfig = {
  reciterName: 'القارئ',
  startPage: 1,
  loopMode: true,
  layoutPreset: 1,
  slideshowInterval: 8000,
  slideshowTransitionDuration: 1500,
  scrollZoomFactor: 1.0,
  pageTransitionDuration: 800,
  enableGoldSweep: false,
  enableParallax: true,
  enableTopDust: true,
  goldSweepDuration: 15000,
  goldSweepOpacity: 0.15,
  parallaxStrength: 0,
  parallaxDuration: 18000,
  topDustDensity: 333,
  topDustOpacity: 0.45,
  hafsDir: '',
  mp3Dir: '',
  slideDir: '',
};

export function useManifest() {
  const [state, setState] = useState<ManifestState>({
    manifest: [],
    config: null,
    slides: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [manifestRes, configRes, slidesRes] = await Promise.all([
          fetch('/manifest.json'),
          fetch('/api/config'),
          fetch('/api/slides'),
        ]);

        if (!manifestRes.ok) throw new Error(`manifest.json not found (${manifestRes.status}). Run: npm run ingest`);

        const manifest: ManifestEntry[] = await manifestRes.json();
        const serverConfig: Partial<AppConfig> = configRes.ok ? await configRes.json() : {};
        const config: AppConfig = { ...DEFAULT_CONFIG, ...serverConfig };
        const slidesData = slidesRes.ok ? await slidesRes.json() : { slides: [] };

        if (!cancelled) {
          setState({ manifest, config, slides: slidesData.slides ?? [], loading: false, error: null });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: (err as Error).message }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const updateConfig = (patch: Partial<AppConfig>) => {
    setState(s => ({
      ...s,
      config: s.config ? { ...s.config, ...patch } : null,
    }));
    // Also persist to server
    fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(console.warn);
  };

  return { ...state, updateConfig };
}
