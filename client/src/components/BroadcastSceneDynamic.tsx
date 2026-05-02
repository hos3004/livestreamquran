import React from 'react';
import type { ManifestEntry, AppConfig, LayoutPreset } from '../types';
import { TopWindow } from './TopWindow';
import { QuranWindow } from './QuranWindow';

export const SCENE_W = 1920;
export const SCENE_H = 1080;

interface Props {
  preset: LayoutPreset;
  manifest: ManifestEntry[];
  slides: string[];
  config: AppConfig;
  currentPage: number;
  pageAdvanceMode: 'reset' | 'continue';
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  debugMode: boolean;
}

const DynamicInfoBand: React.FC<{
  entry: ManifestEntry | null;
  config: AppConfig;
  preset: LayoutPreset;
}> = ({ entry, config, preset }) => {
  const { x, y, w } = preset.info;
  const centerX = x + w / 2;

  return (
    <g className="dynamic-info-band" style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id="dynamicTextShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2a1200" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffe4a3" floodOpacity="0.18" />
        </filter>
      </defs>

      <text x={centerX + 100} y={y + 22} textAnchor="middle" dominantBaseline="middle" fontSize={29} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">القارئ</text>
      <text x={centerX} y={y + 68} textAnchor="middle" dominantBaseline="middle" fontSize={51} fill="#fff1c3" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">{config.reciterName}</text>
      <line x1={x + 60} y1={y + 108} x2={x + w - 60} y2={y + 108} stroke="#8e6325" strokeWidth={1.5} opacity={0.55} />
      <text x={centerX + 60} y={y + 145} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">السورة</text>
      <text x={centerX - 80} y={y + 145} textAnchor="middle" dominantBaseline="middle" fontSize={44} fill="#f6d98b" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">{entry ? entry.surah.nameArabic : '─'}</text>
      <line x1={x + 85} y1={y + 184} x2={x + w - 85} y2={y + 184} stroke="#8e6325" strokeWidth={1.5} opacity={0.5} />
      <text x={x + 155} y={y + 226} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">الصفحة</text>
      <text x={x + 155} y={y + 270} textAnchor="middle" dominantBaseline="middle" fontSize={52} fill="#fff1c3" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="700" filter="url(#dynamicTextShadow)">{entry ? entry.page : '─'}</text>
      <text x={x + w - 155} y={y + 226} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#dynamicTextShadow)">الجزء</text>
      <text x={x + w - 155} y={y + 270} textAnchor="middle" dominantBaseline="middle" fontSize={52} fill="#fff1c3" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="700" filter="url(#dynamicTextShadow)">{entry ? entry.juz : '─'}</text>
    </g>
  );
};

export const BroadcastSceneDynamic: React.FC<Props> = ({ preset, manifest, slides, config, currentPage, pageAdvanceMode, isPlaying, audioRef, debugMode }) => {
  const entryIndex = currentPage - 1;
  const prevEntry = manifest[entryIndex - 1] ?? null;
  const entry = manifest[entryIndex] ?? null;
  const nextEntry = manifest[entryIndex + 1] ?? null;
  const presetConfig: AppConfig = { ...config, scrollZoomFactor: preset.quranZoom || config.scrollZoomFactor };
  const bg = preset.background || '#000000';

  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block', background: bg }}>
      <defs>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;600;700&display=swap');`}</style>
        <radialGradient id="dynamicQuranGlow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#fff2bd" stopOpacity="1" />
          <stop offset="55%" stopColor="#f8e1a0" stopOpacity="1" />
          <stop offset="100%" stopColor="#dfb35c" stopOpacity="1" />
        </radialGradient>
      </defs>

      <rect width={SCENE_W} height={SCENE_H} fill={bg} />
      <TopWindow slides={slides} config={config} x={preset.slide.x} y={preset.slide.y} width={preset.slide.w} height={preset.slide.h} />
      <rect x={preset.page.x} y={preset.page.y} width={preset.page.w} height={preset.page.h} fill="url(#dynamicQuranGlow)" />
      <QuranWindow prevEntry={prevEntry} entry={entry} nextEntry={nextEntry} config={presetConfig} pageAdvanceMode={pageAdvanceMode} isPlaying={isPlaying} audioRef={audioRef} x={preset.page.x} y={preset.page.y} width={preset.page.w} height={preset.page.h} debugMode={debugMode} />
      <image href={preset.frame} x={0} y={0} width={SCENE_W} height={SCENE_H} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
      <DynamicInfoBand entry={entry} config={config} preset={preset} />
    </svg>
  );
};
