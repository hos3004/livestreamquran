/**
 * contentBounds.ts
 *
 * Detects the visible (non-transparent) bounding box of a webp image
 * by drawing it to an offscreen canvas and scanning alpha channel pixels.
 *
 * Returns { x, y, width, height, imageWidth, imageHeight }
 * Caches results by imagePath to avoid repeated canvas work.
 */

import type { ContentBounds } from '../types';

const cache = new Map<string, ContentBounds>();

export async function detectContentBounds(imagePath: string): Promise<ContentBounds> {
  if (cache.has(imagePath)) {
    return cache.get(imagePath)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;

      // For very small or unusual images use full bounds
      if (W === 0 || H === 0) {
        const b: ContentBounds = { x: 0, y: 0, width: W, height: H, imageWidth: W, imageHeight: H };
        cache.set(imagePath, b);
        resolve(b);
        return;
      }

      const canvas = document.createElement('canvas');
      // Sample at lower resolution for performance (max 512px wide)
      const scale  = Math.min(1, 512 / W);
      canvas.width  = Math.floor(W * scale);
      canvas.height = Math.floor(H * scale);

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        // Fallback: full image bounds
        const b: ContentBounds = { x: 0, y: 0, width: W, height: H, imageWidth: W, imageHeight: H };
        cache.set(imagePath, b);
        resolve(b);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let minX = canvas.width, maxX = 0;
      let minY = canvas.height, maxY = 0;
      const ALPHA_THRESHOLD = 30; // ignore near-transparent pixels

      for (let py = 0; py < canvas.height; py++) {
        for (let px = 0; px < canvas.width; px++) {
          const idx = (py * canvas.width + px) * 4;
          const alpha = data[idx + 3];
          if (alpha > ALPHA_THRESHOLD) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }

      // If nothing found, fall back to full image
      if (minX > maxX || minY > maxY) {
        const b: ContentBounds = { x: 0, y: 0, width: W, height: H, imageWidth: W, imageHeight: H };
        cache.set(imagePath, b);
        resolve(b);
        return;
      }

      // Convert back to original image coordinates
      const bounds: ContentBounds = {
        x: Math.floor(minX / scale),
        y: Math.floor(minY / scale),
        width: Math.ceil((maxX - minX + 1) / scale),
        height: Math.ceil((maxY - minY + 1) / scale),
        imageWidth: W,
        imageHeight: H,
      };

      cache.set(imagePath, bounds);
      resolve(bounds);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };

    img.src = imagePath;
  });
}

export function clearBoundsCache() {
  cache.clear();
}
