/**
 * Quran Broadcast — Express API Server
 * 
 * Serves static assets (hafs, mp3, slide) and API endpoints.
 * Start: node server/index.mjs
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3737', 10);

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
  } catch (e) {
    console.warn('[WARN] config.json not found, using defaults');
    return {
      reciterName: 'القارئ',
      startPage: 1,
      loopMode: true,
      layoutPreset: 1,
      slideshowInterval: 8000,
      slideshowTransitionDuration: 1500,
      scrollZoomFactor: 1.0,
      pageTransitionDuration: 800,
      hafsDir: join(ROOT, 'hafs'),
      mp3Dir:  join(ROOT, 'mp3'),
      slideDir: join(ROOT, 'slide'),
    };
  }
}

function saveConfig(updated) {
  const { writeFileSync } = require('fs');
  writeFileSync(join(ROOT, 'config.json'), JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

function loadLayoutPresets() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'layout-presets.json'), 'utf8'));
  } catch (e) {
    console.warn('[WARN] layout-presets.json not found, using empty presets');
    return { presets: [] };
  }
}

function loadReciters() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'reciters.json'), 'utf8'));
  } catch (e) {
    console.warn('[WARN] reciters.json not found, using empty reciters');
    return { audioRootDir: '', activeReciterId: '', reciters: [] };
  }
}

function saveReciters(data) {
  const { writeFileSync } = require('fs');
  writeFileSync(join(ROOT, 'reciters.json'), JSON.stringify(data, null, 2), 'utf8');
  return data;
}

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function makeReciterId(name, fallbackIndex) {
  const base = safeString(name, `reciter-${fallbackIndex}`)
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `reciter-${fallbackIndex}`;
}

let appConfig = loadConfig();

const app = express();

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PUBLIC_DIR = join(ROOT, 'public');
app.use(express.static(PUBLIC_DIR, { maxAge: '1m' }));

app.use('/assets/hafs', (req, res, next) => {
  const cfg = loadConfig();
  const dir = cfg.hafsDir.replace(/\//g, '\\');
  express.static(dir, { maxAge: '1h' })(req, res, next);
});

app.use('/assets/mp3', (req, res, next) => {
  const cfg = loadConfig();
  const dir = cfg.mp3Dir.replace(/\//g, '\\');
  express.static(dir, { maxAge: '1h' })(req, res, next);
});

app.use('/assets/slide', (req, res, next) => {
  const cfg = loadConfig();
  const dir = cfg.slideDir.replace(/\//g, '\\');
  express.static(dir, { maxAge: '5m' })(req, res, next);
});

const CLIENT_BUILD = join(ROOT, 'client', 'dist');
if (existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
}

app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.json(cfg);
});

app.patch('/api/config', (req, res) => {
  try {
    const current = loadConfig();
    const updated = saveConfig({ ...current, ...req.body });
    appConfig = updated;
    res.json({ ok: true, config: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/layout-presets', (req, res) => {
  res.json(loadLayoutPresets());
});

app.patch('/api/layout-presets', (req, res) => {
  try {
    const { writeFileSync } = require('fs');
    const presets = Array.isArray(req.body?.presets) ? req.body.presets : [];
    const cleaned = presets.map((preset, index) => ({
      id: Number(preset.id) || index + 2,
      name: String(preset.name || `Preset ${index + 2}`),
      frame: String(preset.frame || '/frame-preset2.png'),
      quranZoom: Number(preset.quranZoom) || 0.6,
      background: String(preset.background || '#000000'),
      slide: preset.slide,
      page: preset.page,
      info: preset.info,
    }));
    const data = { presets: cleaned };
    writeFileSync(join(ROOT, 'layout-presets.json'), JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reciters', (req, res) => {
  res.json(loadReciters());
});

app.patch('/api/reciters', (req, res) => {
  try {
    const current = loadReciters();
    const audioRootDir = safeString(req.body?.audioRootDir, current.audioRootDir);
    const activeReciterId = safeString(req.body?.activeReciterId, current.activeReciterId);
    const reciters = Array.isArray(req.body?.reciters) ? req.body.reciters : current.reciters;
    const cleaned = reciters.map((reciter, index) => {
      const name = safeString(reciter.name, `القارئ ${index + 1}`);
      const folderName = safeString(reciter.folderName, safeString(reciter.audioDir ? basename(reciter.audioDir) : '', `reciter-${index + 1}`));
      const audioDir = safeString(reciter.audioDir, audioRootDir ? join(audioRootDir, folderName) : folderName);
      return {
        id: safeString(reciter.id, makeReciterId(name, index + 1)),
        name,
        folderName,
        audioDir,
      };
    });
    const data = saveReciters({ audioRootDir, activeReciterId, reciters: cleaned });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reciters/scan', (req, res) => {
  try {
    const rootDir = safeString(req.body?.audioRootDir, loadReciters().audioRootDir);
    if (!rootDir || !existsSync(rootDir)) {
      return res.status(400).json({ error: 'Audio root directory does not exist', audioRootDir: rootDir });
    }
    const folders = readdirSync(rootDir)
      .map(name => ({ name, fullPath: join(rootDir, name) }))
      .filter(item => {
        try { return statSync(item.fullPath).isDirectory(); } catch { return false; }
      })
      .map(item => ({ folderName: item.name, audioDir: item.fullPath }));
    res.json({ ok: true, audioRootDir: rootDir, folders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reciters/activate', (req, res) => {
  try {
    const id = safeString(req.body?.id);
    const data = loadReciters();
    const reciter = data.reciters.find(r => r.id === id);
    if (!reciter) return res.status(404).json({ error: 'Reciter not found' });
    const updatedReciters = saveReciters({ ...data, activeReciterId: reciter.id });
    const cfg = loadConfig();
    const updatedConfig = saveConfig({ ...cfg, reciterName: reciter.name, mp3Dir: reciter.audioDir });
    appConfig = updatedConfig;
    res.json({ ok: true, reciter, reciters: updatedReciters, config: updatedConfig });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/slides', (req, res) => {
  try {
    const cfg = loadConfig();
    const slideDir = cfg.slideDir.replace(/\//g, '\\');
    if (!existsSync(slideDir)) {
      return res.json({ slides: [] });
    }
    const VALID_EXTS = ['.jpeg', '.jpg', '.png', '.webp'];
    const files = readdirSync(slideDir)
      .filter(f => VALID_EXTS.includes(extname(f).toLowerCase()))
      .sort((a, b) => {
        const na = parseInt(a, 10) || 0;
        const nb = parseInt(b, 10) || 0;
        return na - nb;
      })
      .map(f => `/assets/slide/${f}`);
    res.json({ slides: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/manifest', (req, res) => {
  const manifestPath = join(PUBLIC_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return res.status(404).json({ error: 'manifest.json not found. Run: npm run ingest' });
  }
  res.sendFile(manifestPath);
});

app.get('*', (req, res) => {
  const indexPath = join(CLIENT_BUILD, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Quran Broadcast</title></head>
        <body style="background:#000;color:#fff;font-family:sans-serif;padding:40px">
          <h1>🕌 Quran Broadcast Server Running</h1>
          <p>API: <a href="/api/config" style="color:#88f">/api/config</a></p>
          <p>Presets: <a href="/api/layout-presets" style="color:#88f">/api/layout-presets</a></p>
          <p>Reciters: <a href="/api/reciters" style="color:#88f">/api/reciters</a></p>
          <p>To view the app, run: <code>npm run client</code> and open <a href="http://localhost:5173" style="color:#88f">http://localhost:5173</a></p>
          <p>Or build the client with <code>npm run build</code> and reload this page.</p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🕌 Quran Broadcast Server running on http://localhost:${PORT}`);
  console.log(`   Assets: /assets/hafs, /assets/mp3, /assets/slide`);
  console.log(`   API:    /api/config, /api/slides, /api/manifest, /api/layout-presets, /api/reciters`);
});
