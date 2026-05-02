/**
 * Quran Broadcast — Express API Server
 * 
 * Serves static assets (hafs, mp3, slide) and API endpoints.
 * Start: node server/index.mjs
 */

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, extname } from 'path';
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

function loadLayoutPresets() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'layout-presets.json'), 'utf8'));
  } catch (e) {
    console.warn('[WARN] layout-presets.json not found, using empty presets');
    return { presets: [] };
  }
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
    const { writeFileSync } = require('fs');
    const current = loadConfig();
    const updated = { ...current, ...req.body };
    writeFileSync(join(ROOT, 'config.json'), JSON.stringify(updated, null, 2), 'utf8');
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
  console.log(`   API:    /api/config, /api/slides, /api/manifest, /api/layout-presets`);
});
