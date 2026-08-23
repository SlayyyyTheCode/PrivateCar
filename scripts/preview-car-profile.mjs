/**
 * Rasterises the car silhouettes to a PNG so the profile can be eyeballed
 * without a GPU. The outline is what decides whether the model reads as a car,
 * so being able to look at it directly is worth a small script.
 *
 * Run with `npm run car:preview`.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Node strips the type annotations for us, so the profile module can be
// imported straight from TypeScript with no build step.
const { CAR_DIMENSIONS, bodyOutline, greenhouseOutline, glassOutline, wheelPlacements } = await import(
  pathToFileURL(join(ROOT, 'src/ui/carProfile.ts')).href
);

// ---------------------------------------------------------------------------
// PNG writer (same minimal encoder as the icon generator)
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
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
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
// Polygon fill
// ---------------------------------------------------------------------------

function inside(polygon, x, y) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const SHAPES = Object.keys(CAR_DIMENSIONS);
const CELL_W = 460;
const CELL_H = 230;
const COLS = 2;
const ROWS = Math.ceil(SHAPES.length / COLS);
const W = CELL_W * COLS;
const H = CELL_H * ROWS;

const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i += 1) {
  rgba[i * 4] = 0x0a;
  rgba[i * 4 + 1] = 0x12;
  rgba[i * 4 + 2] = 0x20;
  rgba[i * 4 + 3] = 0xff;
}

function paint(x, y, [r, g, b]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  rgba[o] = r;
  rgba[o + 1] = g;
  rgba[o + 2] = b;
  rgba[o + 3] = 0xff;
}

SHAPES.forEach((shape, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const originX = col * CELL_W;
  const originY = row * CELL_H;

  const d = CAR_DIMENSIONS[shape];
  const scale = (CELL_W - 60) / d.length;
  const toPx = ([x, y]) => [
    originX + CELL_W / 2 + x * scale,
    originY + CELL_H - 40 - y * scale,
  ];

  const body = bodyOutline(shape).map(toPx);
  const green = greenhouseOutline(shape).map(toPx);
  const glass = glassOutline(shape).map(toPx);

  for (let y = originY; y < originY + CELL_H; y += 1) {
    for (let x = originX; x < originX + CELL_W; x += 1) {
      if (inside(glass, x + 0.5, y + 0.5)) paint(x, y, [0x11, 0x1c, 0x2c]);
      else if (inside(green, x + 0.5, y + 0.5)) paint(x, y, [0x4f, 0xb6, 0x86]);
      else if (inside(body, x + 0.5, y + 0.5)) paint(x, y, [0x5f, 0xd6, 0x9a]);
    }
  }

  // Wheels, so the arches can be checked for clearance.
  for (const wheel of wheelPlacements(shape)) {
    const [cx, cy] = toPx([wheel.x, wheel.radius + 0.0]);
    const r = wheel.radius * scale;
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
      for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (dist <= r) paint(x, y, dist > r * 0.6 ? [0x16, 0x1b, 0x24] : [0xb9, 0xc4, 0xd4]);
      }
    }
  }

  // Ground line.
  const [, groundY] = toPx([0, 0]);
  for (let x = originX + 20; x < originX + CELL_W - 20; x += 1) paint(x, Math.round(groundY), [0x2e, 0x4a, 0x6e]);
});

const out = join(ROOT, 'car-profile-preview.png');
writeFileSync(out, encodePng(W, H, rgba));
console.log('wrote', out, `${W}x${H}`, SHAPES.join(', '));
