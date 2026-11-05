/* Portfolio interactions. Everything here is progressive enhancement:
   the site is fully readable with JavaScript off. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  document.addEventListener('DOMContentLoaded', () => {
    navAndProgress(); reveal(); lightbox(); toc(); breakouts(); field();
  });

  // ------------------------------------------------------------ nav + progress
  function navAndProgress() {
    const nav = $('.nav'), bar = $('.progress span');
    let ticking = false;
    const update = () => {
      const y = scrollY, max = doc.scrollHeight - innerHeight;
      nav && nav.classList.toggle('is-stuck', y > 8);
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // ------------------------------------------------------------ reveal
  function reveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduced) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  // ------------------------------------------------------------ lightbox
  function lightbox() {
    const box = $('.lightbox');
    const links = $$('[data-lightbox]');
    if (!box || !links.length) return;
    const im = $('img', box), cap = $('figcaption', box);
    let i = 0, last = null;
    const show = (n) => {
      i = (n + links.length) % links.length;
      const a = links[i];
      im.src = a.getAttribute('href');
      im.alt = a.querySelector('img')?.alt || '';
      cap.textContent = a.dataset.caption || '';
      const multi = links.length > 1;
      $('.lightbox__prev', box).hidden = !multi; $('.lightbox__next', box).hidden = !multi;
    };
    const open = (n) => {
      last = document.activeElement; show(n); box.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-open'));
      document.body.style.overflow = 'hidden'; $('.lightbox__close', box).focus();
    };
    const close = () => {
      box.classList.remove('is-open'); document.body.style.overflow = '';
      setTimeout(() => { box.hidden = true; im.removeAttribute('src'); }, 250); last && last.focus();
    };
    links.forEach((a, n) => a.addEventListener('click', (e) => { e.preventDefault(); open(n); }));
    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__prev', box).addEventListener('click', () => show(i - 1));
    $('.lightbox__next', box).addEventListener('click', () => show(i + 1));
    box.addEventListener('click', (e) => { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
    addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });
  }

  // ------------------------------------------------------------ table of contents scroll-spy
  function toc() {
    const links = $$('.toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const heads = $$('.prose h2[data-section]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-on'));
        byId.get(e.target.id)?.classList.add('is-on');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    heads.forEach((h) => io.observe(h));
  }

  // ------------------------------------------------------------ wide / full-bleed figures
  function breakouts() {
    const prose = $('.prose');
    if (!prose || !$('.fig--wide, .fig--full, .figrow--wide', prose)) return;
    const set = () => {
      prose.style.setProperty('--pl', `${prose.getBoundingClientRect().left}px`);
      prose.style.setProperty('--vw', `${doc.clientWidth}px`);
    };
    set(); addEventListener('resize', set);
  }

  // ------------------------------------------------------------ hero stress field
  // A fine grid displaced by smooth radial fields from point sources: one drifts
  // slowly on its own, one follows the cursor. Lines warm toward the accent
  // colour where the field is strongest, fading smoothly with distance.
  function field() {
    const canvas = $('.hero__field');
    if (!canvas) return;
    const hero = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const STEP = 8;                       // sample spacing along each line (px)
    let W = 0, H = 0, LINE = 2, nx = 0, ny = 0, px, py, pi, dpr = 1;
    let acc = '255,106,43';
    const src = [
      { x: 0, y: 0, A: 0, s: 180 },       // ambient
      { x: 0, y: 0, A: 0, s: 120, tx: 0, ty: 0, tA: 0 }, // pointer
    ];
    let running = false, visible = true;

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      LINE = W < 700 ? 3 : 2;             // grid pitch = LINE * STEP (24px / 16px)
      nx = Math.ceil(W / STEP) + 3; ny = Math.ceil(H / STEP) + 3;
      px = new Float32Array(nx * ny); py = new Float32Array(nx * ny); pi = new Float32Array(nx * ny);
    };

    const BINS = 7;
    const paths = () => Array.from({ length: BINS }, () => new Path2D());

    const frame = (t) => {
      // ambient source drifts on a slow Lissajous path between the name and the portrait
      const a = src[0];
      a.x = W * (0.6 + 0.07 * Math.sin(t * 0.00011));
      a.y = H * (0.3 + 0.14 * Math.sin(t * 0.00017 + 1.3));
      // one slow breath (~14 s) drives the source pulse and the global swell together
      const breath = Math.sin(t * 0.00045);
      a.A = 6 + 2.4 * breath;
      a.s = 180 + 22 * breath;
      const swell = 0.0045 * breath, cx = W * 0.55, cy = H * 0.5;
      const wt = t * 0.0002, wa = 2.6 + 0.8 * breath;     // low-frequency shear warp
      // pointer source eases toward the cursor
      const p = src[1];
      p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08; p.A += (p.tA - p.A) * 0.05;

      const ox = -STEP, oy = -STEP;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i, x = ox + i * STEP, y = oy + j * STEP;
          let dx = (x - cx) * swell + wa * Math.sin(y / 260 + wt),
              dy = (y - cy) * swell + wa * Math.sin(x / 310 - wt * 0.8), I = 0;
          for (const s of src) {
            if (s.A < 0.05) continue;
            const rx = x - s.x, ry = y - s.y, r2 = rx * rx + ry * ry, q = r2 / (s.s * s.s);
            if (q > 9) continue;
            const r = Math.sqrt(r2) || 1, e = Math.exp(-0.5 * q);
            // radial displacement peaks at r = s, zero at the source: no kink
            const u = s.A * (r / s.s) * Math.exp(0.5) * e;
            dx += (rx / r) * u; dy += (ry / r) * u;
            I += (s.A / 8) * e;
          }
          px[k] = x + dx; py[k] = y + dy; pi[k] = I;
        }
      }

      ctx.clearRect(0, 0, W, H);
      const ps = paths();
      const seg = (k1, k2) => {
        const b = Math.min(BINS - 1, Math.floor(((pi[k1] + pi[k2]) * 0.5) * BINS * 1.15));
        ps[b].moveTo(px[k1], py[k1]); ps[b].lineTo(px[k2], py[k2]);
      };
      for (let j = 0; j < ny; j += LINE) for (let i = 0; i < nx - 1; i++) seg(j * nx + i, j * nx + i + 1);
      for (let i = 0; i < nx; i += LINE) for (let j = 0; j < ny - 1; j++) seg(j * nx + i, (j + 1) * nx + i);
      ctx.lineWidth = 0.75;
      for (let b = 0; b < BINS; b++) {
        ctx.strokeStyle = b === 0 ? 'rgba(236,235,231,0.055)' : `rgba(${acc},${(0.055 + 0.265 * b / (BINS - 1)).toFixed(3)})`;
        ctx.stroke(ps[b]);
      }
    };

    const loop = (t) => { if (!running) return; frame(t); requestAnimationFrame(loop); };
    const start = () => { if (!running && visible && !document.hidden && !reduced) { running = true; requestAnimationFrame(loop); } };
    const stop = () => { running = false; };

    resize(); frame(0);
    if (reduced) return;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect(), p = src[1];
      p.tx = e.clientX - r.left; p.ty = e.clientY - r.top;
      if (p.tA === 0) { p.x = p.tx; p.y = p.ty; }
      p.tA = 8;
    });
    hero.addEventListener('pointerleave', () => { src[1].tA = 0; });
    addEventListener('resize', () => { resize(); frame(performance.now()); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
    start();
  }
})();
