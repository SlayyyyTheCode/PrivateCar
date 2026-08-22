/**
 * Generates the OYC app icons from scratch — no image tooling required.
 *
 * The mark is the "O" of OYC drawn as a share-of-income gauge: a ring whose
 * first 15% is picked out in green, which is exactly the threshold the app
 * recommends for all-in car costs. It stays legible down to 48px because it is
 * one shape and two colours.
 *
 * Run with `npm run icons`.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

const NAVY = [0x0b, 0x1f, 0x3a];
const TRACK = [0x2e, 0x4a, 0x6e];
const ACCENT = [0x5f, 0xd6, 0x9a];
const WHITE = [0xff, 0xff, 0xff];

/** Fraction of the ring drawn in the accent colour — the OYC 15% rule. */
const ACCENT_SWEEP = 0.15;

// ---------------------------------------------------------------------------
// Minimal PNG writer (RGBA, 8-bit, no interlacing)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // bytes 10-12 stay zero: deflate, adaptive filtering, no interlace

  // Each scanline is prefixed with filter type 0 (None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Smooth 0..1 coverage across a one-pixel feather, for cheap anti-aliasing. */
function coverage(distance, feather) {
  return Math.min(1, Math.max(0, 0.5 - distance / feather));
}

function overlay(dst, offset, colour, alpha) {
  if (alpha <= 0) return;
  const a = Math.min(1, alpha);
  for (let i = 0; i < 3; i += 1) {
    dst[offset + i] = Math.round(dst[offset + i] * (1 - a) + colour[i] * a);
  }
  dst[offset + 3] = Math.round(dst[offset + 3] * (1 - a) + 255 * a);
}

/**
 * @param {object} options
 * @param {number} options.size            output dimension in pixels
 * @param {number[]|null} options.background  fill colour, or null for transparency
 * @param {number} options.ringRadius      outer radius as a fraction of size
 * @param {number} options.ringThickness   ring thickness as a fraction of size
 * @param {boolean} options.monochrome     draw the whole ring in white
 */
function drawIcon({ size, background, ringRadius, ringThickness, monochrome = false }) {
  const rgba = Buffer.alloc(size * size * 4);

  if (background) {
    for (let i = 0; i < size * size; i += 1) {
      rgba[i * 4] = background[0];
      rgba[i * 4 + 1] = background[1];
      rgba[i * 4 + 2] = background[2];
      rgba[i * 4 + 3] = 255;
    }
  }

  const centre = size / 2;
  const outer = size * ringRadius;
  const inner = outer - size * ringThickness;
  const feather = Math.max(1.2, size / 512);
  const accentEnd = ACCENT_SWEEP * Math.PI * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      const d = Math.hypot(dx, dy);

      // Inside the annulus when past the inner edge and short of the outer one.
      const alpha = Math.min(coverage(d - outer, feather), coverage(inner - d, feather));
      if (alpha <= 0) continue;

      // Angle measured clockwise from twelve o'clock.
      let angle = Math.atan2(dx, -dy);
      if (angle < 0) angle += Math.PI * 2;

      const colour = monochrome ? WHITE : angle <= accentEnd ? ACCENT : TRACK;
      overlay(rgba, (y * size + x) * 4, colour, alpha);
    }
  }

  return encodePng(size, size, rgba);
}

function solid(size, colour) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    rgba[i * 4] = colour[0];
    rgba[i * 4 + 1] = colour[1];
    rgba[i * 4 + 2] = colour[2];
    rgba[i * 4 + 3] = 255;
  }
  return encodePng(size, size, rgba);
}

// ---------------------------------------------------------------------------

mkdirSync(ASSETS, { recursive: true });

const outputs = {
  // Full-bleed icon; iOS and the stores apply their own mask.
  'icon.png': drawIcon({ size: 1024, background: NAVY, ringRadius: 0.34, ringThickness: 0.115 }),

  // Android adaptive icon: art must stay inside the centre 66% safe zone,
  // because launchers crop the outer edge to whatever shape they use.
  'android-icon-foreground.png': drawIcon({
    size: 1024,
    background: null,
    ringRadius: 0.26,
    ringThickness: 0.088,
  }),
  'android-icon-background.png': solid(1024, NAVY),
  'android-icon-monochrome.png': drawIcon({
    size: 1024,
    background: null,
    ringRadius: 0.26,
    ringThickness: 0.088,
    monochrome: true,
  }),

  // Splash art sits on a background colour configured in app.json.
  'splash-icon.png': drawIcon({ size: 1024, background: null, ringRadius: 0.36, ringThickness: 0.12 }),

  'favicon.png': drawIcon({ size: 196, background: NAVY, ringRadius: 0.34, ringThickness: 0.115 }),
};

for (const [name, buffer] of Object.entries(outputs)) {
  writeFileSync(join(ASSETS, name), buffer);
  console.log(`${name.padEnd(32)} ${(buffer.length / 1024).toFixed(1)} KB`);
}
