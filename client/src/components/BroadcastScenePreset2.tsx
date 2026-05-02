import React from 'react';
import type { ManifestEntry, AppConfig } from '../types';
import { TopWindow } from './TopWindow';
import { QuranWindow } from './QuranWindow';

export const SCENE_W = 1920;
export const SCENE_H = 1080;

const SLIDE_X = 0;
const SLIDE_Y = 0;
const SLIDE_W = 1225;
const SLIDE_H = 610;

const PAGE_X = 1036;
const PAGE_Y = 185;
const PAGE_W = 825;
const PAGE_H = 680;

// Preset 2 only. This does not change config.json and does not affect Preset 1.
const PRESET2_QURAN_ZOOM = 0.82;

const INFO_X = 470;
const INFO_Y = 635;
const INFO_W = 500;

interface Props {
  manifest: ManifestEntry[];
  slides: string[];
  config: AppConfig;
  currentPage: number;
  pageAdvanceMode: 'reset' | 'continue';
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  debugMode: boolean;
}

const Preset2InfoBand: React.FC<{ entry: ManifestEntry | null; config: AppConfig; x: number; y: number; width: number; }> = ({ entry, config, x, y, width }) => {
  const centerX = x + width / 2;

  return (
    <g className="preset2-info-band" style={{ pointerEvents: 'none' }}>
      <defs>
        <filter id="preset2TextShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#2a1200" floodOpacity="0.75" />
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffe4a3" floodOpacity="0.18" />
        </filter>
      </defs>

      <text x={centerX + 100} y={y + 22} textAnchor="middle" dominantBaseline="middle" fontSize={29} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">القارئ</text>
      <text x={centerX} y={y + 68} textAnchor="middle" dominantBaseline="middle" fontSize={51} fill="#fff1c3" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">{config.reciterName}</text>
      <line x1={x + 60} y1={y + 108} x2={x + width - 60} y2={y + 108} stroke="#8e6325" strokeWidth={1.5} opacity={0.55} />
      <text x={centerX + 60} y={y + 145} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">السورة</text>
      <text x={centerX - 80} y={y + 145} textAnchor="middle" dominantBaseline="middle" fontSize={44} fill="#f6d98b" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">{entry ? entry.surah.nameArabic : '─'}</text>
      <line x1={x + 85} y1={y + 184} x2={x + width - 85} y2={y + 184} stroke="#8e6325" strokeWidth={1.5} opacity={0.5} />
      <text x={x + 155} y={y + 226} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">الصفحة</text>
      <text x={x + 155} y={y + 270} textAnchor="middle" dominantBaseline="middle" fontSize={52} fill="#fff1c3" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="700" filter="url(#preset2TextShadow)">{entry ? entry.page : '─'}</text>
      <text x={x + width - 155} y={y + 226} textAnchor="middle" dominantBaseline="middle" fontSize={30} fill="#d9ad55" fontFamily="'Scheherazade New', 'Amiri', serif" fontWeight="700" direction="rtl" filter="url(#preset2TextShadow)">الجزء</text>
      <text x={x + width - 155} y={y + 270} textAnchor="middle" dominantBaseline="middle" fontSize={52} fill="#fff1c3" fontFamily="'Inter', 'Segoe UI', sans-serif" fontWeight="700" filter="url(#preset2TextShadow)">{entry ? entry.juz : '─'}</text>
    </g>
  );
};

export const BroadcastScenePreset2: React.FC<Props> = ({ manifest, slides, config, currentPage, pageAdvanceMode, isPlaying, audioRef, debugMode }) => {
  const entryIndex = currentPage - 1;
  const prevEntry = manifest[entryIndex - 1] ?? null;
  const entry = manifest[entryIndex] ?? null;
  const nextEntry = manifest[entryIndex + 1] ?? null;
  const preset2Config: AppConfig = { ...config, scrollZoomFactor: PRESET2_QURAN_ZOOM };

  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', display: 'block', background: '#000000' }}>
      <defs>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;600;700&display=swap');`}</style>
        <radialGradient id="preset2QuranGlow" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#fff2bd" stopOpacity="1" />
          <stop offset="55%" stopColor="#f8e1a0" stopOpacity="1" />
          <stop offset="100%" stopColor="#dfb35c" stopOpacity="1" />
        </radialGradient>
      </defs>

      <rect width={SCENE_W} height={SCENE_H} fill="#000000" />
      <TopWindow slides={slides} config={config} x={SLIDE_X} y={SLIDE_Y} width={SLIDE_W} height={SLIDE_H} />
      <rect x={PAGE_X} y={PAGE_Y} width={PAGE_W} height={PAGE_H} fill="url(#preset2QuranGlow)" />
      <QuranWindow prevEntry={prevEntry} entry={entry} nextEntry={nextEntry} config={preset2Config} pageAdvanceMode={pageAdvanceMode} isPlaying={isPlaying} audioRef={audioRef} x={PAGE_X} y={PAGE_Y} width={PAGE_W} height={PAGE_H} debugMode={debugMode} />
      <image href="/frame-preset2.png" x={0} y={0} width={SCENE_W} height={SCENE_H} preserveAspectRatio="none" style={{ pointerEvents: 'none' }} />
      <Preset2InfoBand entry={entry} config={config} x={INFO_X} y={INFO_Y} width={INFO_W} />
    </svg>
  );
};
