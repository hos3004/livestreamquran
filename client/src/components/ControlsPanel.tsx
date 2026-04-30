/**
 * ControlsPanel.tsx
 *
 * Floating settings/controls overlay.
 * Shown semi-transparently at the bottom of the screen.
 * Toggled by pressing Space or clicking a small gear icon.
 */

import React, { useState } from 'react';
import type { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
  currentPage: number;
  totalPages: number;
  isPlaying: boolean;
  debugMode: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToPage: (page: number) => void;
  onToggleDebug: () => void;
}

export const ControlsPanel: React.FC<Props> = ({
  config, updateConfig, currentPage, totalPages,
  isPlaying, debugMode,
  onPlay, onPause, onNext, onPrev, onJumpToPage, onToggleDebug,
}) => {
  const [jumpInput, setJumpInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleJump = () => {
    const p = parseInt(jumpInput, 10);
    if (p >= 1 && p <= totalPages) onJumpToPage(p);
    setJumpInput('');
  };

  return (
    <div className="controls-panel">
      {/* Primary controls row */}
      <div className="controls-row">
        <button className="ctrl-btn" onClick={onPrev} title="Previous page">◀◀</button>
        <button className="ctrl-btn primary" onClick={isPlaying ? onPause : onPlay} title="Play / Pause">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={onNext} title="Next page">▶▶</button>

        <div className="ctrl-sep" />

        {/* Jump to page */}
        <input
          className="ctrl-input"
          type="number"
          min={1}
          max={totalPages}
          value={jumpInput}
          placeholder={`Page (${currentPage}/${totalPages})`}
          onChange={e => setJumpInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJump()}
        />
        <button className="ctrl-btn" onClick={handleJump}>Go</button>

        <div className="ctrl-sep" />

        {/* Loop toggle */}
        <label className="ctrl-label">
          <input
            type="checkbox"
            checked={config.loopMode}
            onChange={e => updateConfig({ loopMode: e.target.checked })}
          />
          Loop
        </label>

        {/* Debug toggle */}
        <button className={`ctrl-btn ${debugMode ? 'active' : ''}`} onClick={onToggleDebug}>
          {debugMode ? '🐛 Debug ON' : '🐛 Debug'}
        </button>

        {/* Settings toggle */}
        <button className="ctrl-btn" onClick={() => setSettingsOpen(s => !s)}>⚙️ Settings</button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="settings-panel">
          <h3>Settings</h3>

          <label>
            Reciter name
            <input
              type="text"
              value={config.reciterName}
              onChange={e => updateConfig({ reciterName: e.target.value })}
            />
          </label>

          <label>
            Slideshow interval (ms)
            <input
              type="number"
              value={config.slideshowInterval}
              min={2000}
              max={60000}
              step={500}
              onChange={e => updateConfig({ slideshowInterval: parseInt(e.target.value) })}
            />
          </label>

          <label>
            Slide transition (ms)
            <input
              type="number"
              value={config.slideshowTransitionDuration}
              min={500}
              max={5000}
              step={100}
              onChange={e => updateConfig({ slideshowTransitionDuration: parseInt(e.target.value) })}
            />
          </label>

          <label>
            Scroll zoom factor
            <input
              type="number"
              value={config.scrollZoomFactor}
              min={0.5}
              max={2.0}
              step={0.05}
              onChange={e => updateConfig({ scrollZoomFactor: parseFloat(e.target.value) })}
            />
          </label>

          <label>
            Page transition (ms)
            <input
              type="number"
              value={config.pageTransitionDuration}
              min={200}
              max={3000}
              step={100}
              onChange={e => updateConfig({ pageTransitionDuration: parseInt(e.target.value) })}
            />
          </label>

          {/* Visual Effects Section */}
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            <h4 style={{ color: '#c9a84c', fontSize: '13px', marginBottom: 4 }}>Visual Effects</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              <label className="ctrl-label" style={{ marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={config.enableGoldSweep}
                  onChange={e => updateConfig({ enableGoldSweep: e.target.checked })}
                />
                Enable Gold Sweep
              </label>
              <label className="ctrl-label" style={{ marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={config.enableParallax}
                  onChange={e => updateConfig({ enableParallax: e.target.checked })}
                />
                Enable Parallax
              </label>
              <label className="ctrl-label" style={{ marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={config.enableTopDust}
                  onChange={e => updateConfig({ enableTopDust: e.target.checked })}
                />
                Enable Top Dust
              </label>
            </div>
          </div>
          <button className="ctrl-btn" style={{ marginTop: 8 }} onClick={() => setSettingsOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
};
