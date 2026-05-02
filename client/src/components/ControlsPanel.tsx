import React, { useMemo, useState } from 'react';
import type { AppConfig, LayoutPreset, LayoutRect } from '../types';

interface Props {
  config: AppConfig;
  updateConfig: (patch: Partial<AppConfig>) => void;
  layoutPresets: LayoutPreset[];
  saveLayoutPresets: (layoutPresets: LayoutPreset[]) => Promise<unknown> | void;
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

type SettingsTab = 'general' | 'layout' | 'effects';

const numberOr = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const ControlsPanel: React.FC<Props> = ({
  config,
  updateConfig,
  layoutPresets,
  saveLayoutPresets,
  currentPage,
  totalPages,
  isPlaying,
  debugMode,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onJumpToPage,
  onToggleDebug,
}) => {
  const [jumpInput, setJumpInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const activePreset = useMemo(
    () => layoutPresets.find(p => p.id === config.layoutPreset) ?? null,
    [layoutPresets, config.layoutPreset],
  );

  const handleJump = () => {
    const p = parseInt(jumpInput, 10);
    if (p >= 1 && p <= totalPages) onJumpToPage(p);
    setJumpInput('');
  };

  const updatePreset = (id: number, patch: Partial<LayoutPreset>) => {
    const next = layoutPresets.map(p => p.id === id ? { ...p, ...patch } : p);
    saveLayoutPresets(next);
  };

  const updatePresetRect = (id: number, key: 'slide' | 'page' | 'info', patch: Partial<LayoutRect>) => {
    const preset = layoutPresets.find(p => p.id === id);
    if (!preset) return;
    updatePreset(id, { [key]: { ...preset[key], ...patch } } as Partial<LayoutPreset>);
  };

  const addPreset = () => {
    const maxId = Math.max(1, ...layoutPresets.map(p => p.id));
    const source = activePreset ?? layoutPresets[0] ?? {
      id: 2,
      name: 'Preset 2',
      frame: '/frame-preset2.png',
      quranZoom: 0.7,
      background: '#000000',
      slide: { x: 0, y: 0, w: 1100, h: 600 },
      page: { x: 1050, y: 160, w: 760, h: 760 },
      info: { x: 460, y: 640, w: 520, h: 300 },
    };
    const id = maxId + 1;
    const newPreset: LayoutPreset = {
      ...source,
      id,
      name: `Preset ${id}`,
      frame: `/frame-preset${id}.png`,
    };
    saveLayoutPresets([...layoutPresets, newPreset]);
    updateConfig({ layoutPreset: id });
    setActiveTab('layout');
  };

  const deleteActivePreset = () => {
    if (!activePreset) return;
    const next = layoutPresets.filter(p => p.id !== activePreset.id);
    saveLayoutPresets(next);
    updateConfig({ layoutPreset: next[0]?.id ?? 1 });
  };

  const renderNumberInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => onChange(numberOr(e.target.value, value))}
      />
    </label>
  );

  const renderRectEditor = (title: string, key: 'slide' | 'page' | 'info') => {
    if (!activePreset) return null;
    const rect = activePreset[key];
    return (
      <div style={{ border: '1px solid #c9a84c22', borderRadius: 8, padding: 10 }}>
        <h4 style={{ color: '#c9a84c', fontSize: 13, marginBottom: 8 }}>{title}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))', gap: 8 }}>
          {renderNumberInput('X', rect.x, v => updatePresetRect(activePreset.id, key, { x: v }))}
          {renderNumberInput('Y', rect.y, v => updatePresetRect(activePreset.id, key, { y: v }))}
          {renderNumberInput('Width', rect.w, v => updatePresetRect(activePreset.id, key, { w: v }))}
          {renderNumberInput('Height', rect.h, v => updatePresetRect(activePreset.id, key, { h: v }))}
        </div>
      </div>
    );
  };

  return (
    <div className="controls-panel">
      <div className="controls-row">
        <button className="ctrl-btn" onClick={onPrev} title="Previous page">◀◀</button>
        <button className="ctrl-btn primary" onClick={isPlaying ? onPause : onPlay} title="Play / Pause">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={onNext} title="Next page">▶▶</button>

        <div className="ctrl-sep" />

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

        <label className="ctrl-label">
          <input
            type="checkbox"
            checked={config.loopMode}
            onChange={e => updateConfig({ loopMode: e.target.checked })}
          />
          Loop
        </label>

        <button className={`ctrl-btn ${debugMode ? 'active' : ''}`} onClick={onToggleDebug}>
          {debugMode ? '🐛 Debug ON' : '🐛 Debug'}
        </button>

        <button className="ctrl-btn" onClick={() => setSettingsOpen(s => !s)}>⚙️ Settings</button>
      </div>

      {settingsOpen && (
        <div className="settings-panel" style={{ maxWidth: 1180 }}>
          <h3>Control Panel</h3>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`ctrl-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
            <button className={`ctrl-btn ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveTab('layout')}>Layout Presets</button>
            <button className={`ctrl-btn ${activeTab === 'effects' ? 'active' : ''}`} onClick={() => setActiveTab('effects')}>Visual Effects</button>
          </div>

          {activeTab === 'general' && (
            <>
              <label>
                Layout preset
                <select
                  className="ctrl-input"
                  value={config.layoutPreset ?? 1}
                  onChange={e => updateConfig({ layoutPreset: Number(e.target.value) })}
                >
                  <option value={1}>Preset 1 - Original</option>
                  {layoutPresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>

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
                Global Quran zoom for original preset
                <input
                  type="number"
                  value={config.scrollZoomFactor}
                  min={0.2}
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
            </>
          )}

          {activeTab === 'layout' && (
            <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="ctrl-input"
                  value={config.layoutPreset ?? 1}
                  onChange={e => updateConfig({ layoutPreset: Number(e.target.value) })}
                  style={{ width: 260 }}
                >
                  <option value={1}>Preset 1 - Original</option>
                  {layoutPresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="ctrl-btn" onClick={addPreset}>+ Add Preset</button>
                <button className="ctrl-btn" onClick={deleteActivePreset} disabled={!activePreset}>Delete Active Preset</button>
                <span style={{ color: '#8888aa', fontSize: 12 }}>Images should live in client/public, for example: /frame-preset3.png</span>
              </div>

              {activePreset ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <label>
                      Preset name
                      <input value={activePreset.name} onChange={e => updatePreset(activePreset.id, { name: e.target.value })} />
                    </label>
                    <label>
                      Frame path
                      <input value={activePreset.frame} onChange={e => updatePreset(activePreset.id, { frame: e.target.value })} />
                    </label>
                    {renderNumberInput('Quran zoom for this preset', activePreset.quranZoom, v => updatePreset(activePreset.id, { quranZoom: v }), 0.01)}
                    <label>
                      Background color
                      <input value={activePreset.background ?? '#000000'} onChange={e => updatePreset(activePreset.id, { background: e.target.value })} />
                    </label>
                  </div>

                  {renderRectEditor('Slideshow Area', 'slide')}
                  {renderRectEditor('Quran Area', 'page')}
                  {renderRectEditor('Info Area', 'info')}
                </>
              ) : (
                <p style={{ color: '#8888aa' }}>Preset 1 is the original hard-coded layout. Click + Add Preset to create a dynamic editable layout.</p>
              )}
            </div>
          )}

          {activeTab === 'effects' && (
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
          )}

          <button className="ctrl-btn" style={{ marginTop: 8 }} onClick={() => setSettingsOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
};
