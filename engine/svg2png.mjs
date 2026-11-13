// Render an SVG diagram to a PNG the site can use:
//   node engine/svg2png.mjs <in.svg> <out.png> [width=2400] [--light]
// --light swaps the site's dark palette for a light one (used for the "name.print.png" PDF versions).
import fs from 'node:fs';
import sharp from 'sharp';
const args = process.argv.slice(2);
const light = args.includes('--light');
const [src, out, width = '2400'] = args.filter((a) => a !== '--light');
if (!src || !out) { console.error('usage: node engine/svg2png.mjs <in.svg> <out.png> [width] [--light]'); process.exit(1); }
const LIGHT = [
  ['#0b0c0e', '#ffffff'], ['#0e0f12', '#ffffff'], ['#111216', '#f6f7f9'],
  ['#ecebe7', '#15171a'], ['#a7aab1', '#4a4f58'], ['#8a8e97', '#5d626b'], ['#6c7079', '#7a808a'],
  ['#ff8a57', '#c9480f'], ['#ff6a2b', '#e2571c'],
  [/rgba\(255, ?255, ?255, ?\.\d+\)/g, 'rgba(0,0,0,.28)'],
];
let svg = fs.readFileSync(src, 'utf8');
if (light) for (const [a, b] of LIGHT) svg = typeof a === 'string' ? svg.split(a).join(b) : svg.replace(a, b);
const buf = Buffer.from(svg);
const meta = await sharp(buf).metadata();
const info = await sharp(buf, { density: Math.ceil(72 * (+width / meta.width)) }).resize(+width).png({ compressionLevel: 9 }).toFile(out);
console.log(out, `${info.width}x${info.height}`, `${Math.round(info.size / 1024)} kB`);
