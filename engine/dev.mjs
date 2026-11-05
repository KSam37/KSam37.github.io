// Live preview: builds the site (drafts included), serves it at
// http://localhost:4000, and rebuilds + refreshes the browser whenever you
// save an article, an image, or site.yaml.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { build, report, ROOT, OUT } from './build.mjs';

const PORT = Number(process.env.PORT) || 4000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain',
};
const clients = new Set();

async function rebuild() {
  try {
    const r = await build({ drafts: true, dev: true });
    console.clear?.();
    console.log(`  Preview: http://localhost:${PORT}   (Ctrl+C to stop)`);
    report(r);
    for (const c of clients) c.write('data: reload\n\n');
  } catch (e) {
    console.error('\n  BUILD FAILED\n  ' + e.message + '\n');
  }
}

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': hi\n\n');
    clients.add(res); req.on('close', () => clients.delete(res));
    return;
  }
  let file = path.join(OUT, url);
  if (!file.startsWith(OUT)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404, { 'Content-Type': TYPES['.html'] }); fs.createReadStream(path.join(OUT, '404.html')).pipe(res); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, async () => {
  await rebuild();
  if (process.argv.includes('--open')) {
    exec(process.platform === 'win32' ? `start "" http://localhost:${PORT}` : `open http://localhost:${PORT}`);
  }
});

// watch content
let timer = null;
const kick = (f) => {
  if (f && /(^|[\\/])(_site|node_modules|\.git)([\\/]|$)/.test(f)) return;
  clearTimeout(timer); timer = setTimeout(rebuild, 250);
};
for (const p of ['site.yaml', 'projects', 'files', 'engine/assets']) {
  const full = path.join(ROOT, p);
  if (fs.existsSync(full)) fs.watch(full, { recursive: true }, (_e, f) => kick(f));
}
