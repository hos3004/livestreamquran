/**
 * InfoBand.tsx
 *
 * Floats ABOVE the frame overlay — transparent background so the frame's
 * gold middle panel shows through underneath.
 * Displays: reciter name | surah name | juz | page number
 */

import React from 'react';
import type { ManifestEntry, AppConfig } from '../types';

interface Props {
  entry: ManifestEntry | null;
  config: AppConfig;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const InfoBand: React.FC<Props> = ({ entry, config, x, y }) => {

  return (
    <g className="info-band" style={{ pointerEvents: 'none' }}>
      {/* No background rect — transparent so the frame's gold panel shows through */}

      {/* ── 5.1 CSS Filter for subtle text depth ── */}
      <defs>
        <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#ffeeba" floodOpacity="0.8" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#5a3a0a" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* LEFT — Reciter name */}
      <text
        x={x + 810}
        y={y + 200}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={33}
        fill="#4d3209"
        fontFamily=" 'FP_Hasoob', 'Scheherazade New', serif"
        fontWeight="bold"
        filter="url(#textGlow)"
        letterSpacing="0.02em"
      >
        {config.reciterName}
      </text>

      {/* CENTER — Surah name (Arabic) — large, prominent */}
      <text
        x={x + 1000}
        y={y + 200}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={88}
        fill="#331e00"
        fontFamily="'AlQalam Alvi Nastaleeq', 'Amiri', 'Scheherazade New', serif"
        fontWeight="bold"
        direction="rtl"
        filter="url(#textGlow)"
      >
        {entry ? `سورة ${entry.surah.nameArabic}` : '─'}
      </text>

      {/* RIGHT — Juz + Page */}
      <text
        x={x + 1200}
        y={y + 194}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={44}
        fill="#4d3209"
        fontFamily="'AlQalam Alvi Nastaleeq', 'Amiri', 'Scheherazade New', serif"
        fontWeight="bold"
        direction="rtl"
        filter="url(#textGlow)"
      >
        {entry ? `الجزء ${entry.juz}` : ''}
      </text>
      <text
        x={x + 1200}
        y={y + 230 + 12}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={18}
        fill="#6b4c10"
        fontFamily="'Inter', sans-serif"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        {entry ? `الصفحة ${entry.page}` : ''}
      </text>
    </g>
  );
};
