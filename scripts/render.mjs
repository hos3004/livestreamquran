/**
 * scripts/render.mjs
 * 
 * Headless rendering script using Puppeteer and FFmpeg.
 * Captures frame-by-frame and muxes with audio.
 */

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const FPS = 30;
let SCENE_W = 1920;
let SCENE_H = 1080;
const CLIENT_URL = 'http://localhost:5173';

// Simple arg parser
const args = process.argv.slice(2);
let targetJuz = 1;
let fastMode = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--juz' && args[i + 1]) {
    targetJuz = parseInt(args[i + 1], 10);
  }
  if (args[i] === '--fast') {
    fastMode = true; // skips actual rendering, just muxes audio (for testing)
  }
  if (args[i] === '--720p') {
    SCENE_W = 1280;
    SCENE_H = 720;
  }
}

async function startRender() {
  console.log(`\n================================`);
  console.log(`🎥 Starting Headless Render for Juz ${targetJuz}`);
  console.log(`================================\n`);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--window-size=${SCENE_W},${SCENE_H}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: SCENE_W, height: SCENE_H, deviceScaleFactor: 1 });

  const url = `${CLIENT_URL}/?renderMode=true&juz=${targetJuz}`;
  console.log(`🌐 Navigating to React App: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for the app to initialize its manifest and get duration
  await page.waitForFunction('typeof window.getJuzDuration === "function"');
  const durationSec = await page.evaluate(() => window.getJuzDuration());
  const totalFrames = Math.ceil(durationSec * FPS);
  
  console.log(`⏱ Total Duration: ${durationSec.toFixed(2)} seconds`);
  console.log(`🎞 Total Frames:   ${totalFrames} (at ${FPS} FPS)`);

  const outputPath = join(ROOT, `juz_${targetJuz}_silent.mp4`);
  
  // Skip rendering if --fast is passed
  if (!fastMode) {
    // Setup FFmpeg
    console.log(`\n🚀 Spawning FFmpeg for Video...`);
    const ffmpegArgs = [
      '-y',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', `${FPS}`,
      '-i', '-',
      '-c:v', 'h264_nvenc', // GPU Acceleration! 🚀
      '-pix_fmt', 'yuv420p',
      '-preset', 'p4',      // Good balance of NVENC speed and quality
      '-cq', '18',          // Constant Quality equivalent for NVENC
      outputPath
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'inherit', 'inherit'] });

    ffmpeg.on('error', (err) => {
      console.error(`FFmpeg Error:`, err);
    });

    // Render Loop
    console.log(`\n📸 Starting Frame Capture Loop...\n`);
    const startTime = Date.now();
    
    let frameMs = 1000 / FPS;

    for (let frame = 0; frame < totalFrames; frame++) {
      const timeInSeconds = frame / FPS;

      await page.evaluate((t) => window.renderSeek(t), timeInSeconds);
      // Ensure DOM paints the layout properly
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const screenshot = await page.screenshot({ type: 'png' });
      ffmpeg.stdin.write(screenshot);

      if (frame % Math.max(1, Math.round(FPS / 4)) === 0) { 
        const elapsed = (Date.now() - startTime) / 1000;
        const fpsReal = frame / elapsed || 0;
        const percent = ((frame / totalFrames) * 100).toFixed(1);
        process.stdout.write(`\r[${percent}%] Rendered ${frame}/${totalFrames} frames... (Time: ${timeInSeconds.toFixed(1)}s, Engine Speed: ${fpsReal.toFixed(1)} fps) `);
      }
    }

    console.log(`\n\n✅ Frame capture complete. Closing stream...`);
    ffmpeg.stdin.end();
    await new Promise(resolve => ffmpeg.on('close', resolve));
  } else {
    console.log(`\n⏩ FAST MODE: Skipping video render, acting as if ${outputPath} already exists.`);
  }

  await browser.close();
  console.log(`🎉 Silent video saved/verified at: ${outputPath}`);

  // ----------------------------------------------------
  // AUDIO MUXING STAGE
  // ----------------------------------------------------
  console.log(`\n🎵 Phase 2: Muxing Audio...`);
  
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'manifest.json'), 'utf8'));
  const configObj = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
  const pagesInJuz = manifest.filter(m => m.juz === targetJuz);
  
  if (pagesInJuz.length === 0) {
    console.error(`❌ No pages found for Juz ${targetJuz}!`);
    process.exit(1);
  }

  const finalVideoPath = join(ROOT, `juz_${targetJuz}_final.mp4`);
  
  let audioInputsArgs = [];
  let filterComplex = '';
  let accumTimeSec = 0;
  let validAudioCount = 0;
  
  // We offset the inputs by 1 since [0] is the silent video
  for (let i = 0; i < pagesInJuz.length; i++) {
    const m = pagesInJuz[i];
    const durSec = Math.max(0.1, m.audioDuration || 30);
    
    if (m.audioPath) {
      // Decode audioPath e.g. "/assets/mp3/001.mp3" => "mp3Dir/001.mp3"
      const filename = m.audioPath.replace('/assets/mp3/', '');
      const localPath = join(configObj.mp3Dir, filename).replace(/\\/g, '/');
      
      if (existsSync(localPath)) {
        audioInputsArgs.push('-i', localPath);
        
        // Delay requires integer milliseconds
        const delayMs = Math.round(accumTimeSec * 1000);
        
        // Ensure 2 channels (stereo) for consistency in amix
        filterComplex += `[${validAudioCount + 1}:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay=${delayMs}|${delayMs}[a${validAudioCount}];`;
        validAudioCount++;
      } else {
        console.warn(`⚠️ Warning: Missing audio file: ${localPath}`);
      }
    }
    accumTimeSec += durSec + 1.0; 
  }

  if (validAudioCount === 0) {
    console.error(`❌ No valid audio files found to mux.`);
    process.exit(1);
  }

  const mixGroup = Array.from({ length: validAudioCount }, (_, i) => `[a${i}]`).join('');
  filterComplex += `${mixGroup}amix=inputs=${validAudioCount}:dropout_transition=0:normalize=0[aout]`;

  const finalFfmpegArgs = [
    '-y',
    '-i', outputPath,
    ...audioInputsArgs,
    '-filter_complex', filterComplex,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy', // Don't re-encode the video itself!
    '-c:a', 'aac',
    '-b:a', '192k',
    finalVideoPath
  ];

  console.log(`🎧 Executing FFmpeg final mux, Inputs: 1 Video + ${validAudioCount} Audios`);
  
  const muxProcess = spawn('ffmpeg', finalFfmpegArgs, { stdio: 'inherit' });

  await new Promise((resolve, reject) => {
    muxProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg final pass exited with code ${code}`));
    });
  });

  console.log(`\n✅✅ ALL DONE! Final Video ready at: ${finalVideoPath}\n`);
  process.exit(0);
}

startRender().catch(console.error);
