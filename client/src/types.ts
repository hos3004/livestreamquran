// ─── Manifest Types ──────────────────────────────────────────────────────────

export interface SurahMeta {
  id: number;
  nameArabic: string;
  nameSimple: string;
}

export interface ManifestEntry {
  page: number;
  imagePath: string | null;
  jsonPath: string | null;
  audioPath: string | null;
  audioDuration: number; // seconds
  surah: SurahMeta;
  juz: number;
}

// ─── Dynamic Layout Presets ──────────────────────────────────────────────────

export interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutPreset {
  id: number;
  name: string;
  frame: string;
  quranZoom: number;
  background?: string;
  slide: LayoutRect;
  page: LayoutRect;
  info: LayoutRect;
}

export interface LayoutPresetsFile {
  presets: LayoutPreset[];
}

// ─── App Config ──────────────────────────────────────────────────────────────

export interface AppConfig {
  reciterName: string;
  startPage: number;
  loopMode: boolean;
  layoutPreset: number;              // 1 = original layout, 2+ = dynamic layouts from layout-presets.json
  slideshowInterval: number;         // ms
  slideshowTransitionDuration: number; // ms
  scrollZoomFactor: number;          // 1.0 = default fit
  pageTransitionDuration: number;    // ms

  // Visual Effects
  enableGoldSweep: boolean;
  enableParallax: boolean;
  enableTopDust: boolean;
  goldSweepDuration: number;         // ms
  goldSweepOpacity: number;
  parallaxStrength: number;          // px
  parallaxDuration: number;          // ms
  topDustDensity: number;            // particle count
  topDustOpacity: number;

  hafsDir: string;
  mp3Dir: string;
  slideDir: string;
}

// ─── Playback State ──────────────────────────────────────────────────────────

export type PlayState = 'playing' | 'paused' | 'loading' | 'idle';

export interface PlaybackState {
  currentPage: number;
  playState: PlayState;
  elapsed: number;          // seconds
  duration: number;         // seconds
}

// ─── Content Bounds ──────────────────────────────────────────────────────────

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

// ─── Ayah Polygon (from per-page JSON) ───────────────────────────────────────

export interface AyahData {
  ayahNumber: number;
  surahNumber: number;
  x: number;
  y: number;
  polygon: string;           // "x1,y1 x2,y2 ..." space-separated pairs
  page_number: number;
  juz: number;
  ruku: number;
  hizb: number;
  manzil: number;
}
