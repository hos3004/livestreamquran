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

// ─── Load config & env ──────────────────────────────────────────────────────
// Simple manual .env loader (avoid extra deps)
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

let appConfig = loadConfig();

// ─── Express setup ──────────────────────────────────────────────────────────
const app = express();

app.use(compression());
app.use(cors());
app.use(express.json());

// ─── Serve static public/ (manifest.json, etc.) ─────────────────────────────
const PUBLIC_DIR = join(ROOT, 'public');
app.use(express.static(PUBLIC_DIR, { maxAge: '1m' }));

// ─── Serve asset folders as virtual paths ────────────────────────────────────
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

// ─── Serve frontend build (for OBS production use) ──────────────────────────
const CLIENT_BUILD = join(ROOT, 'client', 'dist');
if (existsSync(CLIENT_BUILD)) {
  app.use(express.static(CLIENT_BUILD));
}

// ─── API routes ─────────────────────────────────────────────────────────────

// GET /api/config — returns full app config
app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.json(cfg);
});

// PATCH /api/config — update config fields at runtime
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

// GET /api/slides — lists all images in slide folder
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

// GET /api/manifest — proxy to public/manifest.json (for convenience)
app.get('/api/manifest', (req, res) => {
  const manifestPath = join(PUBLIC_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) {
    return res.status(404).json({ error: 'manifest.json not found. Run: npm run ingest' });
  }
  res.sendFile(manifestPath);
});

// SPA fallback — serve client app for all other routes
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
          <p>To view the app, run: <code>npm run client</code> and open <a href="http://localhost:5173" style="color:#88f">http://localhost:5173</a></p>
          <p>Or build the client with <code>npm run build</code> and reload this page.</p>
        </body>
      </html>
    `);
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🕌 Quran Broadcast Server running on http://localhost:${PORT}`);
  console.log(`   Assets: /assets/hafs, /assets/mp3, /assets/slide`);
  console.log(`   API:    /api/config, /api/slides, /api/manifest`);
});
