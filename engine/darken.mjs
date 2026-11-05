// Make white-background images sit on the dark site.
//
//   node engine/darken.mjs cutout <image.png> [threshold]
//       Photos on a plain white backdrop: flood-fills the white background from the
//       edges and makes it transparent (soft edge). Threshold 0-255, default 238;
//       raise it if the object is being eaten, lower it if a halo remains.
//
//   node engine/darken.mjs invert <image.png>
//       Diagrams and plots: flips lightness (white -> near-black, black text -> white)
//       while keeping hues, so red stays red and blue stays blue.
//
// The original is moved to _unused/originals/ next to the image, and the result is
// written in its place (as .png), so article references keep working.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [mode, file, thrArg] = process.argv.slice(2);
if (!['cutout', 'invert'].includes(mode) || !file) {
  console.log('usage: node engine/darken.mjs cutout|invert <image> [threshold]');
  process.exit(1);
}

const src = path.resolve(file);
const dir = path.dirname(src);
const keep = path.join(dir, '_unused', 'originals');
fs.mkdirSync(keep, { recursive: true });
const backup = path.join(keep, path.basename(src));
if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);
const out = src.replace(/\.[^.]+$/, '.png');

const { data, info } = await sharp(backup).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info, n = W * H;

if (mode === 'cutout') {
  const THR = Number(thrArg || 238);
  const bgish = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    return Math.min(r, g, b) >= THR && Math.max(r, g, b) - Math.min(r, g, b) < 18;
  };
  const bg = new Uint8Array(n), q = [];
  const push = (i) => { if (!bg[i] && bgish(i)) { bg[i] = 1; q.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i / W) | 0;
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  let m = new Float32Array(n);
  for (let i = 0; i < n; i++) m[i] = bg[i] ? 0 : 1;
  for (let pass = 0; pass < 2; pass++) {           // feather the edge
    const o = new Float32Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && X < W && Y >= 0 && Y < H) { s += m[Y * W + X]; c++; }
      }
      o[y * W + x] = s / c;
    }
    m = o;
  }
  for (let i = 0; i < n; i++) data[i * 4 + 3] = Math.round(Math.min(data[i * 4 + 3] / 255, m[i]) * 255);
} else {
  const hue2 = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  for (let i = 0; i < n * 4; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6;
    }
    l = 0.07 + (1 - l) * 0.86;                      // white -> site background, black -> soft white
    let R, G, B;
    if (!s) { R = G = B = l; } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      R = hue2(p, q, h + 1 / 3); G = hue2(p, q, h); B = hue2(p, q, h - 1 / 3);
    }
    data[i] = R * 255; data[i + 1] = G * 255; data[i + 2] = B * 255;
  }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out + '.tmp');
fs.renameSync(out + '.tmp', out);
if (out !== src) fs.unlinkSync(src);
console.log(`${mode}: ${path.basename(out)}  (original kept in _unused/originals/)`);
