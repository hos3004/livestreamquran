import React, { useEffect, useState } from 'react';
import type { ManifestEntry } from '../types';

interface PlaybackState {
  currentPage: number;
  playState: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  updatedAt?: string;
}

interface Props {
  manifest: ManifestEntry[];
}

async function sendCommand(path: string, body?: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const ControlPage: React.FC<Props> = ({ manifest }) => {
  const [state, setState] = useState<PlaybackState | null>(null);
  const [pageInput, setPageInput] = useState('1');
  const [juzInput, setJuzInput] = useState('1');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/playback/state')
      .then(res => res.ok ? res.json() : Promise.reject(new Error(`state failed: ${res.status}`)))
      .then(data => {
        if (cancelled) return;
        setState(data);
        setPageInput(String(data.currentPage ?? 1));
      })
      .catch(err => {
        if (!cancelled) setError((err as Error).message);
      });

    const events = new EventSource('/api/playback/events');
    events.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.state) {
        setState(payload.state);
        setPageInput(String(payload.state.currentPage ?? 1));
      }
    };
    events.onerror = () => setError('Playback event stream disconnected.');

    return () => {
      cancelled = true;
      events.close();
    };
  }, []);

  const run = async (path: string, body?: unknown) => {
    try {
      setError(null);
      const data = await sendCommand(path, body);
      if (data.state) setState(data.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const jumpToPage = () => {
    const page = Math.max(1, Math.min(Number.parseInt(pageInput, 10) || 1, manifest.length || 604));
    run('/api/playback/jump', { page });
  };

  const startJuz = () => {
    const juz = Math.max(1, Math.min(Number.parseInt(juzInput, 10) || 1, 30));
    const entry = manifest.find(item => item.juz === juz);
    if (!entry) {
      setError(`Juz ${juz} was not found in the manifest.`);
      return;
    }
    run('/api/playback/jump', { page: entry.page, command: 'startJuz', juz });
  };

  return (
    <div className="control-page">
      <header className="control-header">
        <div>
          <h1>Live Quran Control</h1>
          <p>OBS scene stays clean at <code>?mode=obs</code>.</p>
        </div>
        <div className="control-status">
          <span>{state?.playState ?? 'idle'}</span>
          <strong>Page {state?.currentPage ?? 1}</strong>
        </div>
      </header>

      <main className="control-surface">
        <section className="control-band">
          <button onClick={() => run('/api/playback/prev')}>Previous</button>
          <button className="primary" onClick={() => run('/api/playback/play')}>Play</button>
          <button onClick={() => run('/api/playback/pause')}>Pause</button>
          <button onClick={() => run('/api/playback/stop')}>Stop</button>
          <button onClick={() => run('/api/playback/next')}>Next</button>
        </section>

        <section className="control-grid">
          <label>
            Page
            <input
              type="number"
              min={1}
              max={manifest.length || 604}
              value={pageInput}
              onChange={e => setPageInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && jumpToPage()}
            />
            <button onClick={jumpToPage}>Jump</button>
          </label>

          <label>
            Juz
            <input
              type="number"
              min={1}
              max={30}
              value={juzInput}
              onChange={e => setJuzInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startJuz()}
            />
            <button onClick={startJuz}>Start Juz</button>
          </label>
        </section>

        {error && <div className="control-error">{error}</div>}
      </main>
    </div>
  );
};
