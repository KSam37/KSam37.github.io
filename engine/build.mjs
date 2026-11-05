// Portfolio site builder.
//   node engine/build.mjs            production build -> _site/
//   node engine/build.mjs --drafts   include projects marked `draft: true`
//
// Reads site.yaml, projects/<slug>/article.md (+ images beside it), files/,
// and writes a static site into _site/. Images are resized to responsive WebP.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Marked } from 'marked';
import YAML from 'yaml';
import sharp from 'sharp';
import * as T from './templates.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, '_site');
const ENGINE = path.join(ROOT, 'engine');

const IMG_EXT = /\.(jpe?g|png|webp|gif|tiff?|avif)$/i;
const VID_EXT = /\.(mp4|webm|mov)$/i;
const WIDTHS = [800, 1600, 2400];

// ---------------------------------------------------------------- helpers
const exists = (p) => fs.existsSync(p);
const read = (p) => fs.readFileSync(p, 'utf8');
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });
const write = (p, s) => { mkdir(path.dirname(p)); fs.writeFileSync(p, s); };
// cached output is reused only if it was written after the source last changed.
// ctime counts too, so a file moved or restored with an old mtime is still rebuilt.
const newer = (out, src) => {
  if (!exists(out)) return false;
  const s = fs.statSync(src);
  return fs.statSync(out).mtimeMs >= Math.max(s.mtimeMs, s.ctimeMs);
};
export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseFrontmatter(src, file) {
  const m = src.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing the --- front matter block at the top`);
  let data;
  try { data = YAML.parse(m[1]) || {}; }
  catch (e) { throw new Error(`${file}: front matter is not valid YAML\n  ${e.message}`); }
  return { data, body: m[2] };
}

// ---------------------------------------------------------------- images
// Returns { w, h, src, srcset, full, anim, png, video }
async function processMedia(srcPath, outDir, urlDir) {
  const name = path.basename(srcPath);
  const stem = name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '-');
  mkdir(outDir);

  if (VID_EXT.test(name)) {
    const out = path.join(outDir, name);
    if (!newer(out, srcPath)) fs.copyFileSync(srcPath, out);
    return { video: true, src: `${urlDir}/${name}` };
  }

  const meta = await sharp(srcPath, { animated: true }).metadata();
  const anim = (meta.pages || 1) > 1;
  // account for EXIF rotation (phone photos)
  const rotated = (meta.orientation || 1) >= 5;
  const W = rotated ? meta.height : meta.width;
  const H0 = rotated ? meta.width : meta.height;
  const pageH = anim ? (meta.pageHeight || H0) : H0;

  if (anim) {
    const w = Math.min(W, 1400);
    const out = path.join(outDir, `${stem}-${w}.webp`);
    if (!newer(out, srcPath)) {
      await sharp(srcPath, { animated: true }).resize({ width: w }).webp({ quality: 72, effort: 4 }).toFile(out);
    }
    const u = `${urlDir}/${stem}-${w}.webp`;
    return { w, h: Math.round(pageH * w / W), src: u, srcset: `${u} ${w}w`, full: u, anim: true };
  }

  const widths = [...new Set([...WIDTHS.filter((w) => w < W), Math.min(W, WIDTHS.at(-1))])];
  const png = /\.png$/i.test(name);
  const set = [];
  for (const w of widths) {
    const out = path.join(outDir, `${stem}-${w}.webp`);
    if (!newer(out, srcPath)) {
      await sharp(srcPath).rotate().resize({ width: w, withoutEnlargement: true })
        .webp(png ? { quality: 90, alphaQuality: 100 } : { quality: 80 }).toFile(out);
    }
    set.push([w, `${urlDir}/${stem}-${w}.webp`]);
  }
  // light = opaque, near-white border (diagram on white -> gets a plate);
  // a transparent or dark image sits straight on the dark page instead.
  let light = false;
  if (png) {
    const { data: px } = await sharp(srcPath).rotate().resize(24, 24, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let sum = 0, cnt = 0, clear = 0, tot = 0;
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (x && y && x < 23 && y < 23) continue;
      const i = (y * 24 + x) * 4; tot++;
      if (px[i + 3] < 128) { clear++; continue; }
      sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]; cnt++;
    }
    light = clear < tot * 0.3 && cnt > 0 && sum / cnt > 200;
  }
  const mid = set.find(([w]) => w >= 1600) || set.at(-1);
  return {
    w: W, h: pageH, png, light,
    src: mid[1],
    srcset: set.map(([w, u]) => `${u} ${w}w`).join(', '),
    full: set.at(-1)[1],
  };
}

async function ogImage(srcPath, outFile) {
  if (newer(outFile, srcPath)) return;
  mkdir(path.dirname(outFile));
  await sharp(srcPath, { animated: false }).rotate()
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toFile(outFile);
}

// ---------------------------------------------------------------- markdown
function makeMarkdown(ctx) {
  // ctx: { media: Map(name -> info), used: Set, fig: {n}, toc: [], warn(msg) }
  const md = new Marked({ gfm: true });

  const lookup = (href) => {
    const key = decodeURIComponent(href).replace(/^\.\//, '');
    const info = ctx.media.get(key) || ctx.media.get(key.toLowerCase());
    if (!info) { ctx.warn(`image "${key}" is referenced but not in the folder`); return null; }
    ctx.used.add(info.file);
    return info;
  };

  const mods = (title) => new Set(String(title || '').toLowerCase().split(/[\s,]+/).filter(Boolean));

  const mediaTag = (info, alt, sizes, eager = false) => {
    if (info.video) {
      return `<video src="${info.src}" autoplay muted loop playsinline preload="metadata" aria-label="${esc(alt)}"></video>`;
    }
    return `<img src="${info.src}" srcset="${info.srcset}" sizes="${sizes}" width="${info.w}" height="${info.h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  };

  const figure = (tok, sizes, inRow) => {
    const info = lookup(tok.href);
    const m = mods(tok.title);
    const caption = tok.text || '';
    if (!info) return `<figure class="fig fig--missing"><div>Missing image: ${esc(tok.href)}</div></figure>`;
    const plate = (info.light && !m.has('noplate')) || m.has('plate');
    const cls = ['fig'];
    if (!inRow) for (const k of ['wide', 'full', 'small']) if (m.has(k)) cls.push(`fig--${k}`);
    if (plate) cls.push('fig--plate');
    const n = ++ctx.fig.n;
    const ratio = info.video ? 16 / 9 : info.w / info.h;
    // rows share a height via aspect ratio; single figures never upscale past the source
    const style = inRow ? ` style="--r:${ratio.toFixed(4)}"`
      : (!info.video && !m.has('full') && !m.has('wide') && (info.w < 1000 || m.has('small')))
        ? ` style="max-width:${Math.min(info.w, m.has('small') ? 440 : 1e9) + (plate ? 64 : 0)}px"` : '';
    const inner = info.video
      ? `<div class="fig__media">${mediaTag(info, caption, sizes)}</div>`
      : `<a class="fig__media" href="${info.full}" data-lightbox data-caption="${esc(caption)}">${mediaTag(info, caption, sizes)}</a>`;
    const cap = caption && !m.has('nocaption')
      ? `<figcaption><span class="fig__no">Fig. ${String(n).padStart(2, '0')}</span>${md.parseInline(caption)}</figcaption>` : '';
    return `<figure class="${cls.join(' ')}"${style}>${inner}${cap}</figure>`;
  };

  md.use({
    renderer: {
      paragraph(token) {
        const toks = token.tokens || [];
        const imgs = toks.filter((t) => t.type === 'image');
        const onlyImages = imgs.length > 0 && toks.every((t) => t.type === 'image' || t.type === 'br' ||
          (t.type === 'text' && /^\s*$/.test(t.raw)));
        if (!onlyImages) return `<p>${this.parser.parseInline(toks)}</p>\n`;
        if (imgs.length === 1) {
          const m = mods(imgs[0].title);
          const sizes = m.has('full') ? '100vw' : m.has('wide') ? '(min-width: 1200px) 1200px, 100vw' : '(min-width: 800px) 760px, 100vw';
          return figure(imgs[0], sizes) + '\n';
        }
        const wide = imgs.some((t) => /\b(wide|full)\b/i.test(t.title || ''));
        const sizes = `(min-width: 800px) ${Math.round((wide ? 1200 : 760) / Math.min(imgs.length, 3) * 1.2)}px, 100vw`;
        return `<div class="figrow figrow--${imgs.length}${wide ? ' figrow--wide' : ''}">${imgs.map((t) => figure(t, sizes, true)).join('')}</div>\n`;
      },
      image(token) {
        const info = lookup(token.href);
        if (!info) return '';
        return mediaTag(info, token.text, '760px');
      },
      heading(token) {
        const html = this.parser.parseInline(token.tokens);
        const id = slugify(token.text) || `s${ctx.toc.length + 1}`;
        if (token.depth === 2) {
          ctx.toc.push({ id, html });
          const no = String(ctx.toc.length).padStart(2, '0');
          return `<h2 id="${id}" data-section><span class="h-no">${no}</span>${html}</h2>\n`;
        }
        const d = Math.min(Math.max(token.depth, 3), 4);
        return `<h${d} id="${id}">${html}</h${d}>\n`;
      },
      link(token) {
        const text = this.parser.parseInline(token.tokens);
        const ext = /^https?:\/\//.test(token.href);
        return `<a href="${esc(token.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      },
      blockquote(token) {
        return `<blockquote class="callout">${this.parser.parse(token.tokens)}</blockquote>\n`;
      },
    },
  });
  return md;
}

// ---------------------------------------------------------------- projects
async function loadProjects({ drafts, warn, base }) {
  const dir = path.join(ROOT, 'projects');
  const slugs = fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name);

  const projects = [];
  for (const slug of slugs) {
    const pdir = path.join(dir, slug);
    const file = path.join(pdir, 'article.md');
    const rel = `projects/${slug}/article.md`;
    if (!exists(file)) { warn(`projects/${slug}/ has no article.md, skipped`); continue; }
    const { data, body } = parseFrontmatter(read(file), rel);
    if (data.draft && !drafts) continue;
    const pw = (m) => warn(`${rel}: ${m}`);

    for (const k of ['title', 'summary', 'date']) if (!data[k]) pw(`missing "${k}" in front matter`);

    // media in folder (top level only; _unused/ and other subfolders are ignored)
    const media = new Map();
    const files = fs.readdirSync(pdir).filter((f) => IMG_EXT.test(f) || VID_EXT.test(f));
    const urlDir = `${base}projects/${slug}/media`;
    for (const f of files) {
      const p = path.join(pdir, f);
      const mb = fs.statSync(p).size / 1e6;
      if (mb > 20) pw(`${f} is ${mb.toFixed(0)} MB, consider exporting it smaller`);
      const info = { ...(await processMedia(p, path.join(OUT, 'projects', slug, 'media'), urlDir)), file: f, path: p };
      media.set(f, info);
      media.set(f.toLowerCase(), info);
    }

    const ctx = { media, used: new Set(), fig: { n: 0 }, toc: [], warn: pw };
    const md = makeMarkdown(ctx);
    const clean = body.replace(/<!--[\s\S]*?-->/g, '');
    const html = md.parse(clean)
      .replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

    // cover
    let cover = null;
    if (data.cover) {
      cover = media.get(data.cover) || media.get(String(data.cover).toLowerCase());
      if (!cover) pw(`cover "${data.cover}" not found in folder`);
      else ctx.used.add(cover.file);
    }
    if (!cover) {
      const first = [...media.values()].find((m) => !m.video);
      if (first) { cover = first; if (data.cover === undefined) pw('no "cover" set, using first image'); }
    }
    if (cover && !cover.video) {
      await ogImage(cover.path, path.join(OUT, 'projects', slug, 'og.jpg'));
    }

    const unused = files.filter((f) => !ctx.used.has(f));
    if (unused.length) pw(`not used in the article (move to _unused/ if intentional): ${unused.join(', ')}`);

    const words = clean.replace(/!\[[^\]]*\]\([^)]*\)/g, '').split(/\s+/).filter(Boolean).length;
    const dateStr = String(data.date ?? '');
    projects.push({
      slug, ...data, html, toc: ctx.toc, cover, figures: ctx.fig.n,
      tags: data.tags || [], metrics: data.metrics || [], links: data.links || [],
      sortKey: dateStr, readMin: Math.max(1, Math.round(words / 230)),
    });
  }

  projects.sort((a, b) => (b.order ?? 0) - (a.order ?? 0) || b.sortKey.localeCompare(a.sortKey));
  return projects;
}

// ---------------------------------------------------------------- main
export async function build({ drafts = false, dev = false } = {}) {
  const t0 = Date.now();
  const warnings = [];
  const warn = (m) => warnings.push(m);

  const site = YAML.parse(read(path.join(ROOT, 'site.yaml')));
  site.base = site.base || '/';
  const base = site.base;
  mkdir(OUT);

  // static assets
  for (const f of ['style.css', 'main.js']) {
    write(path.join(OUT, 'assets', f), read(path.join(ENGINE, 'assets', f)));
  }
  copyDir(path.join(ROOT, 'files'), path.join(OUT, 'files'));
  write(path.join(OUT, '.nojekyll'), '');

  // headshot
  if (site.headshot && exists(path.join(ROOT, site.headshot))) {
    site.headshotInfo = await processMedia(path.join(ROOT, site.headshot), path.join(OUT, 'assets', 'img'), `${base}assets/img`);
    await ogImage(path.join(ROOT, site.headshot), path.join(OUT, 'assets', 'og.jpg'));
  }

  const projects = await loadProjects({ drafts, warn, base });
  const opts = { site, projects, dev };

  write(path.join(OUT, 'index.html'), T.home(opts));
  write(path.join(OUT, '404.html'), T.notFound(opts));
  projects.forEach((p, i) => {
    const next = projects[(i + 1) % projects.length];
    const prev = projects[(i - 1 + projects.length) % projects.length];
    write(path.join(OUT, 'projects', p.slug, 'index.html'), T.project({ ...opts, p, next, prev, index: i }));
    // keep old links (projects/<slug>.html) working
    write(path.join(OUT, 'projects', `${p.slug}.html`), T.redirect(`${base}projects/${p.slug}/`));
  });

  // sitemap + robots
  const origin = (site.url || '').replace(/\/$/, '');
  if (origin) {
    const urls = ['', ...projects.map((p) => `projects/${p.slug}/`)];
    write(path.join(OUT, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${origin}${base}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
    write(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}${base}sitemap.xml\n`);
  }

  return { projects, warnings, ms: Date.now() - t0 };
}

function copyDir(src, dst) {
  if (!exists(src)) return;
  mkdir(dst);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!newer(d, s)) fs.copyFileSync(s, d);
  }
}

export function report({ projects, warnings, ms }) {
  console.log(`\n  Built ${projects.length} project page(s) in ${(ms / 1000).toFixed(1)}s -> _site/`);
  for (const p of projects) console.log(`   • ${p.slug}${p.draft ? '  (draft)' : ''}  ${p.figures} fig, ~${p.readMin} min read`);
  if (warnings.length) {
    console.log(`\n  ${warnings.length} note(s):`);
    for (const w of warnings) console.log(`   ! ${w}`);
  }
  console.log('');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const drafts = process.argv.includes('--drafts');
  build({ drafts }).then(report).catch((e) => { console.error('\n  BUILD FAILED\n  ' + e.message + '\n'); process.exit(1); });
}
