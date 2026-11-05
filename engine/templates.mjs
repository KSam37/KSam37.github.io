// HTML templates. Plain template literals — no framework.
import { esc } from './build.mjs';

const pad = (n) => String(n).padStart(2, '0');
const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const year = (p) => p.period || String(p.date ?? '').slice(0, 4);
const tagSlug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-');

const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap';

const icon = {
  arrow: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M4 9l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  theme: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor"/></svg>',
};

function head({ site, title, description, og, canonical, dev }) {
  const b = site.base;
  const origin = (site.url || '').replace(/\/$/, '');
  const ogUrl = og ? `${origin}${og}` : '';
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="${esc(site.name)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${ogUrl ? `<meta property="og:image" content="${ogUrl}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
${canonical && origin ? `<link rel="canonical" href="${origin}${canonical}">` : ''}
<meta name="color-scheme" content="dark light">
<script>(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=t}catch(e){}})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${b}assets/style.css">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#0c0d0f'/><path d='M14 46 32 18l18 28' fill='none' stroke='#ff6a2b' stroke-width='5'/><circle cx='32' cy='18' r='5' fill='#ff6a2b'/></svg>`)}">
<script src="${b}assets/main.js" defer></script>
${dev ? `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>` : ''}
</head>`;
}

function nav({ site, home }) {
  const b = site.base;
  const h = home ? '' : b;
  return `<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"><span></span></div>
<nav class="nav" aria-label="Primary">
  <div class="nav__inner">
    <a class="nav__brand" href="${b}" aria-label="${esc(site.name)}, home">
      <span class="nav__mark" aria-hidden="true"></span>
      <span class="nav__name">${esc(site.name)}</span>
    </a>
    <div class="nav__links">
      <a href="${h}#work">Work</a>
      <a href="${h}#experience" class="hide-sm">Experience</a>
      <a href="${h}#publications" class="hide-sm">Publications</a>
      <a href="${h}#contact" class="hide-xs">Contact</a>
      <a class="nav__cv" href="${b}${site.resume}" target="_blank" rel="noopener">Résumé ${icon.arrow}</a>
      <button class="nav__theme" type="button" aria-label="Toggle light and dark theme">${icon.theme}</button>
    </div>
  </div>
</nav>`;
}

function footer({ site }) {
  return `<footer class="footer">
  <div class="wrap footer__inner">
    <span>${esc(site.name)} — ${esc(site.role)}</span>
    <span class="mono">${esc(site.location || '')} · © ${new Date().getFullYear()}</span>
  </div>
</footer>
<div class="lightbox" hidden aria-modal="true" role="dialog" aria-label="Image viewer">
  <button class="lightbox__close" type="button" aria-label="Close">×</button>
  <button class="lightbox__prev" type="button" aria-label="Previous image">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lightbox__next" type="button" aria-label="Next image">›</button>
</div>`;
}

function img(info, { alt = '', sizes = '100vw', eager = false, cls = '', style = '' } = {}) {
  if (!info) return '';
  if (info.video) return `<video src="${info.src}" autoplay muted loop playsinline class="${cls}"></video>`;
  return `<img class="${cls}" src="${info.src}" srcset="${info.srcset}" sizes="${sizes}" width="${info.w}" height="${info.h}" alt="${esc(alt)}"${style ? ` style="${style}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

// How the big image at the top of a project page is shown:
//   bleed  — large landscape photo, fills the width
//   framed — small or portrait photo, shown whole on a blurred copy of itself
//   plate  — diagram / render (PNG), shown whole on a light sheet
const heroMode = (p) => {
  if (['bleed', 'framed', 'plate'].includes(p.cover_style)) return p.cover_style;
  if (p.cover.png) return 'plate';
  return p.cover.w >= 1800 && p.cover.w / p.cover.h >= 1.25 ? 'bleed' : 'framed';
};
const coverStyle = (p) => (p.cover_position ? `object-position:${esc(p.cover_position)}` : '');

// ---------------------------------------------------------------- home
export function home({ site, projects, dev }) {
  const b = site.base;
  const hero = site.hero || {};
  const allTags = [...new Set(projects.flatMap((p) => p.tags))];

  const cards = projects.map((p, i) => `
      <a class="card reveal" href="${b}projects/${p.slug}/" data-tags="${p.tags.map(tagSlug).join(' ')}">
        <div class="card__media${p.cover?.png ? ' is-plate' : ''}" style="view-transition-name:p-${p.slug}">
          ${img(p.cover, { alt: p.title, sizes: '(min-width: 1100px) 560px, (min-width: 700px) 50vw, 100vw', style: coverStyle(p) })}
          <span class="card__go">${icon.arrow}</span>
        </div>
        <div class="card__body">
          <div class="card__meta mono"><span>${pad(i + 1)}</span><span>${esc(p.org || '')}</span><span>${esc(year(p))}</span></div>
          <h3 class="card__title">${esc(p.title)}</h3>
          <p class="card__summary">${esc(p.summary || '')}</p>
          ${p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        </div>
      </a>`).join('');

  const exp = list(site.experience).map((e) => `
      <li class="xp reveal">
        <div class="xp__when mono">${esc(e.when || '')}</div>
        <div class="xp__what">
          <h3>${esc(e.org)}</h3>
          <p class="xp__role">${esc(e.role || '')}${e.unit ? ` <span>· ${esc(e.unit)}</span>` : ''}</p>
          ${list(e.points).length ? `<ul>${list(e.points).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        </div>
        <div class="xp__where mono">${esc(e.place || '')}</div>
      </li>`).join('');

  const edu = list(site.education).map((e) => `
      <li class="edu reveal">
        <span class="mono">${esc(e.when || '')}</span>
        <strong>${esc(e.school)}</strong>
        <span>${esc(e.degree || '')}</span>
      </li>`).join('');

  const pubs = list(site.publications).map((p, i) => `
      <li class="pub reveal">
        <span class="pub__no mono">[${i + 1}]</span>
        <div>
          <p class="pub__title">${esc(p.title)}</p>
          <p class="pub__authors">${esc(p.authors || '').replace(esc(site.short_name || 'Kirschner'), `<strong>${esc(site.short_name || 'Kirschner')}</strong>`)}</p>
          <p class="pub__venue mono">${esc(p.venue || '')}${p.note ? ` · ${esc(p.note)}` : ''}</p>
        </div>
        ${p.url ? `<a class="pub__link" href="${esc(p.url)}" target="_blank" rel="noopener">Read ${icon.arrow}</a>` : ''}
      </li>`).join('');

  const skills = list(site.skills).map((s) => `
      <div class="skill reveal">
        <h3 class="mono">${esc(s.group)}</h3>
        <ul>${list(s.items).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`).join('');

  const links = site.links || {};
  const linkRow = [
    links.linkedin && `<a href="${esc(links.linkedin)}" target="_blank" rel="noopener">LinkedIn ${icon.arrow}</a>`,
    links.scholar && `<a href="${esc(links.scholar)}" target="_blank" rel="noopener">Google Scholar ${icon.arrow}</a>`,
    links.github && `<a href="${esc(links.github)}" target="_blank" rel="noopener">GitHub ${icon.arrow}</a>`,
    `<a href="${b}${site.resume}" target="_blank" rel="noopener">Résumé (PDF) ${icon.arrow}</a>`,
  ].filter(Boolean).join('\n        ');

  const hs = site.headshotInfo;

  return `${head({ site, title: `${site.name} — ${site.role}`, description: site.description || hero.headline, og: hs ? `${b}assets/og.jpg` : '', canonical: b, dev })}
<body class="page-home">
${nav({ site, home: true })}
<header class="hero" id="top">
  <canvas class="hero__field" aria-hidden="true"></canvas>
  <div class="hero__fade" aria-hidden="true"></div>
  <div class="wrap hero__grid">
    <div class="hero__text">
      <ul class="hero__creds mono">${list(hero.credentials).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      <h1 class="hero__name">${esc(site.name)}</h1>
      <p class="hero__headline">${esc(hero.headline || '')}</p>
      <p class="hero__intro">${esc(hero.intro || '')}</p>
      <div class="hero__cta">
        <a class="btn btn--solid" href="#work">See the work ${icon.down}</a>
        <a class="btn" href="${b}${site.resume}" target="_blank" rel="noopener">Résumé ${icon.arrow}</a>
        <a class="btn btn--ghost" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
      </div>
    </div>
    ${hs ? `<figure class="hero__portrait">
      <div class="hero__frame">${img(hs, { alt: `Portrait of ${site.name}`, sizes: '(min-width: 900px) 380px, 70vw', eager: true, style: site.headshot_position ? `object-position:${esc(site.headshot_position)}` : '' })}</div>
      ${site.headshot_caption ? `<figcaption class="mono">${esc(site.headshot_caption)}</figcaption>` : ''}
    </figure>` : ''}
  </div>
  ${hero.currently ? `<div class="wrap"><p class="hero__now"><span class="pulse" aria-hidden="true"></span><span class="mono">Now</span>${esc(hero.currently)}</p></div>` : ''}
  <div class="hero__readout mono" aria-hidden="true"><span data-readout="xy">x 0000 · y 0000</span><span data-readout="eps">ε<sub>max</sub> 0.000</span></div>
</header>

<main id="main">
  <section class="section" id="work">
    <div class="wrap">
      <header class="section__head reveal">
        <span class="section__no mono">01</span>
        <h2>Selected work</h2>
        <p class="section__note mono">${projects.length} projects · newest first</p>
      </header>
      ${allTags.length > 1 ? `<div class="filters reveal" role="group" aria-label="Filter projects">
        <button type="button" class="chip is-on" data-filter="*">All</button>
        ${allTags.map((t) => `<button type="button" class="chip" data-filter="${tagSlug(t)}">${esc(t)}</button>`).join('\n        ')}
      </div>` : ''}
      <div class="cards">${cards}
      </div>
    </div>
  </section>

  <section class="section" id="experience">
    <div class="wrap">
      <header class="section__head reveal">
        <span class="section__no mono">02</span>
        <h2>Experience</h2>
        <p class="section__note mono">Research · industry · government</p>
      </header>
      <ol class="xps">${exp}
      </ol>
      ${edu ? `<h3 class="subhead mono reveal">Education</h3><ul class="edus">${edu}</ul>` : ''}
      ${skills ? `<h3 class="subhead mono reveal">Toolkit</h3><div class="skills">${skills}</div>` : ''}
    </div>
  </section>

  <section class="section" id="publications">
    <div class="wrap">
      <header class="section__head reveal">
        <span class="section__no mono">03</span>
        <h2>Publications</h2>
        ${links.scholar ? `<a class="section__note mono" href="${esc(links.scholar)}" target="_blank" rel="noopener">Google Scholar ${icon.arrow}</a>` : ''}
      </header>
      <ol class="pubs">${pubs}
      </ol>
    </div>
  </section>

  <section class="section contact" id="contact">
    <div class="wrap">
      <p class="mono contact__eyebrow reveal">04 — Contact</p>
      <h2 class="contact__title reveal">${esc(site.contact_line || "Let's build something.")}</h2>
      <a class="contact__mail reveal" href="mailto:${esc(site.email)}">${esc(site.email)}<span>${icon.arrow}</span></a>
      <div class="contact__links reveal">
        ${linkRow}
      </div>
    </div>
  </section>
</main>
${footer({ site })}
</body>
</html>
`;
}

// ---------------------------------------------------------------- project
export function project({ site, p, next, index, projects, dev }) {
  const b = site.base;
  const spec = [
    ['Role', p.role],
    ['Organization', p.org],
    ['Period', year(p)],
    ['Team', list(p.team).join(', ')],
    ['Tools', list(p.tools).join(' · ')],
  ].filter(([, v]) => v);
  const links = list(p.links);
  const metrics = list(p.metrics);
  const og = p.cover && !p.cover.video ? `${b}projects/${p.slug}/og.jpg` : '';

  return `${head({ site, title: `${p.title} — ${site.name}`, description: p.summary || '', og, canonical: `${b}projects/${p.slug}/`, dev })}
<body class="page-project">
${nav({ site })}
<main id="main">
<article class="proj">
  <header class="proj__head wrap">
    <a class="crumb mono" href="${b}#work">← Index <span>/ ${pad(index + 1)} of ${pad(projects.length)}</span></a>
    ${p.tags.length ? `<ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <h1 class="proj__title">${esc(p.title)}</h1>
    ${p.lede || p.summary ? `<p class="proj__lede">${esc(p.lede || p.summary)}</p>` : ''}
    <dl class="spec">
      ${spec.map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${esc(v)}</dd></div>`).join('\n      ')}
      ${links.length ? `<div><dt class="mono">Links</dt><dd class="spec__links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${icon.arrow}</a>`).join('')}</dd></div>` : ''}
    </dl>
  </header>

  ${p.cover && !p.hide_cover ? `<div class="proj__hero wrap-wide">
    <div class="proj__hero-media is-${heroMode(p)}" style="view-transition-name:p-${p.slug}">
      ${heroMode(p) === 'framed' ? `<img class="proj__hero-bg" src="${p.cover.src}" alt="" aria-hidden="true">` : ''}
      ${img(p.cover, { alt: p.cover_caption || p.title, sizes: '(min-width: 1400px) 1320px, 100vw', eager: true, cls: 'proj__hero-img', style: heroMode(p) === 'bleed' ? coverStyle(p) : '' })}
    </div>
    ${p.cover_caption ? `<p class="proj__hero-cap mono">${esc(p.cover_caption)}</p>` : ''}
  </div>` : ''}

  ${metrics.length ? `<div class="wrap"><dl class="metrics metrics--${Math.min(metrics.length, 4)}">
    ${metrics.map((m) => `<div class="metric reveal"><dt class="metric__v">${esc(m.value)}</dt><dd class="metric__k">${esc(m.label)}</dd></div>`).join('\n    ')}
  </dl></div>` : ''}

  <div class="proj__body wrap">
    ${p.toc.length > 1 ? `<nav class="toc" aria-label="Sections">
      <p class="toc__label mono">Contents</p>
      <ol>${p.toc.map((t, i) => `<li><a href="#${t.id}"><span class="mono">${pad(i + 1)}</span>${t.html}</a></li>`).join('')}</ol>
      <p class="toc__meta mono">~${p.readMin} min read · ${p.figures} figures</p>
    </nav>` : '<div></div>'}
    <div class="prose">
${p.html}
    </div>
  </div>
</article>

${next && next.slug !== p.slug ? `<aside class="next wrap">
  <a class="next__card" href="${b}projects/${next.slug}/">
    <div class="next__text">
      <span class="mono">Next project →</span>
      <h2>${esc(next.title)}</h2>
      <p>${esc(next.summary || '')}</p>
    </div>
    <div class="next__media${next.cover?.png ? ' is-plate' : ''}" style="view-transition-name:p-${next.slug}">${img(next.cover, { alt: next.title, sizes: '(min-width: 900px) 520px, 100vw', style: coverStyle(next) })}</div>
  </a>
</aside>` : ''}
</main>
${footer({ site })}
</body>
</html>
`;
}

export function notFound({ site, dev }) {
  return `${head({ site, title: `Not found — ${site.name}`, description: 'Page not found', dev })}
<body class="page-404">
${nav({ site })}
<main id="main" class="wrap nf">
  <p class="mono">Error 404</p>
  <h1>This page doesn't exist.</h1>
  <p><a class="btn btn--solid" href="${site.base}">Back to the index</a></p>
</main>
${footer({ site })}
</body>
</html>
`;
}

export const redirect = (to) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Moved</title><meta http-equiv="refresh" content="0; url=${to}"><link rel="canonical" href="${to}"></head><body><a href="${to}">Moved here</a></body></html>\n`;
