/**
 * Quran Broadcast — Ingestion Script
 * 
 * Scans hafs/, mp3/, slide/ folders and produces public/manifest.json
 * Run: node scripts/ingest.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { parseFile } from 'music-metadata';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// ─── Load config ────────────────────────────────────────────────────────────
const cfg = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));

const HAFS_DIR  = cfg.hafsDir.replace(/\//g, '\\');
const MP3_DIR   = cfg.mp3Dir.replace(/\//g, '\\');
const SLIDE_DIR = cfg.slideDir.replace(/\//g, '\\');
const OUT_DIR   = join(ROOT, 'public');
const OUT_FILE  = join(OUT_DIR, 'manifest.json');

// ─── Load indexes ───────────────────────────────────────────────────────────
const surahsData = JSON.parse(readFileSync(join(ROOT, 'surahs_index.json'), 'utf8'));
const surahs = surahsData.chapters; // array of 114 surah objects
const juzs   = JSON.parse(readFileSync(join(ROOT, 'juzs_index.json'), 'utf8'));  // array of 30 juz objects

/**
 * Build a sorted list of [startPage, surahObj] pairs for page→surah lookup
 * A page can span multiple surahs; we pick the LAST surah that starts on or before
 * this page and whose pages[1] >= this page.
 */
function buildSurahPageMap() {
  // pages: [firstPage, lastPage] — 1-indexed
  // We need: given a page number, which suraha spans it?
  // We build an array sorted by pages[0], then binary-search.
  const sorted = surahs
    .map(s => ({ ...s, startPage: s.pages[0], endPage: s.pages[1] }))
    .sort((a, b) => a.startPage - b.startPage);
  return sorted;
}

function getSurahForPage(pageNumber, surahMap) {
  // Find all surahs whose range includes this page
  const matching = surahMap.filter(s => s.startPage <= pageNumber && s.endPage >= pageNumber);
  if (matching.length === 0) {
    // Fallback: find the surah that most recently started
    const before = surahMap.filter(s => s.startPage <= pageNumber);
    return before[before.length - 1] || surahMap[0];
  }
  // Return the last one (furthest into the page)
  return matching[matching.length - 1];
}

function getJuzForPage(pageNumber) {
  // juzs is sorted by page_number ascending
  // Find the last juz whose page_number <= pageNumber
  let result = juzs[0];
  for (const juz of juzs) {
    if (juz.page_number <= pageNumber) {
      result = juz;
    } else {
      break;
    }
  }
  return result.id;
}

// ─── Build manifest ─────────────────────────────────────────────────────────

async function buildManifest() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const surahMap = buildSurahPageMap();
  const manifest = [];
  let errorCount = 0;

  const TOTAL_PAGES = 604;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const padded3 = String(page).padStart(3, '0');

    const imagePath = join(HAFS_DIR, `${padded3}.webp`);
    const jsonPath  = join(HAFS_DIR, `${padded3}.json`);
    const audioPath = join(MP3_DIR,  `Page${padded3}.mp3`);

    // Check existence
    const hasImage = existsSync(imagePath);
    const hasJson  = existsSync(jsonPath);
    const hasAudio = existsSync(audioPath);

    if (!hasImage) {
      console.warn(`[WARN] Page ${page}: missing image ${imagePath}`);
      errorCount++;
    }
    if (!hasAudio) {
      console.warn(`[WARN] Page ${page}: missing audio ${audioPath}`);
      errorCount++;
    }

    // Extract audio duration
    let audioDuration = 0;
    if (hasAudio) {
      try {
        const meta = await parseFile(audioPath, { duration: true });
        audioDuration = meta.format.duration ?? 0;
      } catch (e) {
        console.warn(`[WARN] Page ${page}: failed to read audio duration — ${e.message}`);
        errorCount++;
      }
    }

    // Lookup metadata
    const surahObj = getSurahForPage(page, surahMap);
    const juzNumber = getJuzForPage(page);

    manifest.push({
      page,
      imagePath: hasImage ? `/assets/hafs/${padded3}.webp` : null,
      jsonPath:  hasJson  ? `/assets/hafs/${padded3}.json` : null,
      audioPath: hasAudio ? `/assets/mp3/Page${padded3}.mp3` : null,
      audioDuration: Math.round(audioDuration * 1000) / 1000, // ms precision
      surah: {
        id:         surahObj.id,
        nameArabic: surahObj.name_arabic,
        nameSimple: surahObj.name_simple,
      },
      juz: juzNumber,
    });

    if (page % 50 === 0) {
      console.log(`  ✓ Processed page ${page}/${TOTAL_PAGES}`);
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n✅ Manifest written to ${OUT_FILE}`);
  console.log(`   Pages processed: ${manifest.length}`);
  console.log(`   Warnings: ${errorCount}`);
}

// ─── Run ────────────────────────────────────────────────────────────────────
console.log('🕌 Quran Broadcast — Ingestion Script');
console.log('   Reading from:', { HAFS_DIR, MP3_DIR });
console.log('   Writing to:  ', OUT_FILE);
console.log('');

buildManifest().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
