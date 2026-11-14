/* Portfolio interactions. Everything here is progressive enhancement:
   the site is fully readable with JavaScript off. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  document.addEventListener('DOMContentLoaded', () => {
    navAndProgress(); reveal(); lightbox(); toc(); breakouts();
    lattices(); spy(); rail(); copy();
    setTimeout(() => doc.classList.add('is-ready'), 60);   // a timer, so the intro still runs if the tab loads in the background
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

    // wide figures break out of the text column and would slide over the sticky contents list,
    // so the list fades out while one of them is passing it
    const box = $('.toc'), wides = $$('.fig--wide, .fig--full, .figrow--wide');
    if (!box || !wides.length) return;
    let ticking = false;
    const check = () => {
      ticking = false;
      const t = box.getBoundingClientRect();
      if (!t.width) return;                         // hidden on narrow screens
      const hit = wides.some((f) => { const r = f.getBoundingClientRect(); return r.left < t.right && r.bottom > t.top - 24 && r.top < t.bottom + 24; });
      box.classList.toggle('is-away', hit);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    addEventListener('resize', check);
    check();
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

  // ------------------------------------------------------------ compliant lattice
  // A triangular truss of point masses. Each node is tied to its rest position and
  // to its six neighbours, and the motion is damped enough that the structure eases
  // into shape without ringing. Two soft loads press on it: one drifts slowly on its
  // own, the other tracks the cursor closely. Members warm slightly
  // toward the accent where they carry strain. Touch devices and reduced-motion
  // users get a single settled frame.
  function lattices() { $$('canvas[data-lattice]').forEach(lattice); }

  function lattice(canvas) {
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const isHero = canvas.dataset.lattice === 'hero';
    const still = reduced || !matchMedia('(pointer: fine)').matches;

    const KN = 0.12, KA = 0.02, DAMP = 0.86;       // neighbour stiffness, anchor stiffness, damping
    const BINS = 6;
    let W = 0, H = 0, P = 46, N = 0, E = 0;
    let x0, y0, ux, uy, vx, vy, ax, ay, ea, eb;
    let running = false, visible = false, tick = 0;
    // loads: [0] drifts on its own, [1] follows the cursor. A is the current strength, tA its target.
    const loads = [{ x: 0, y: 0, A: 1, tA: 1, R: 300, F: 0.2 }, { x: 0, y: 0, tx: 0, ty: 0, A: 0, tA: 0, R: 190, F: 0.3 }];

    const build = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      P = W < 700 ? 28 : W < 1200 ? 32 : 36;
      const RH = P * 0.866;
      const cols = Math.ceil(W / P) + 3, rows = Math.ceil(H / RH) + 3;
      N = cols * rows;
      x0 = new Float32Array(N); y0 = new Float32Array(N);
      ux = new Float32Array(N); uy = new Float32Array(N); vx = new Float32Array(N); vy = new Float32Array(N);
      ax = new Float32Array(N); ay = new Float32Array(N);
      const a = [], b = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, odd = j & 1;
        x0[k] = (i + odd * 0.5) * P - P; y0[k] = j * RH - RH;
        if (i + 1 < cols) { a.push(k); b.push(k + 1); }
        if (j + 1 < rows) {
          const dl = odd ? i : i - 1, dr = odd ? i + 1 : i;
          if (dl >= 0) { a.push(k); b.push((j + 1) * cols + dl); }
          if (dr < cols) { a.push(k); b.push((j + 1) * cols + dr); }
        }
      }
      ea = Int32Array.from(a); eb = Int32Array.from(b); E = ea.length;
    };

    const step = (t) => {
      // the drifting load moves on a slow closed path; the cursor load eases toward the pointer
      const d = loads[0], p = loads[1];
      d.x = W * ((isHero ? 0.62 : 0.6) + 0.26 * Math.sin(t * 0.00016));
      d.y = H * (0.45 + 0.28 * Math.sin(t * 0.00023 + 1.3));
      p.x += (p.tx - p.x) * 0.2; p.y += (p.ty - p.y) * 0.2; p.A += (p.tA - p.A) * 0.1;

      for (let e = 0; e < E; e++) {
        const a = ea[e], b = eb[e];
        const dx = (ux[b] - ux[a]) * KN, dy = (uy[b] - uy[a]) * KN;
        ax[a] += dx; ay[a] += dy; ax[b] -= dx; ay[b] -= dy;
      }
      for (const s of loads) {
        if (s.A < 0.01) continue;
        const R2 = s.R * s.R, F = s.F * s.A;
        for (let k = 0; k < N; k++) {
          const dx = x0[k] - s.x, dy = y0[k] - s.y, d2 = dx * dx + dy * dy;
          if (d2 > R2 || d2 < 1) continue;
          const dist = Math.sqrt(d2), f = 1 - dist / s.R, g = F * f * f * (dist / s.R) * 4;   // zero at the centre: no kink
          ax[k] += (dx / dist) * g; ay[k] += (dy / dist) * g;
        }
      }
      for (let k = 0; k < N; k++) {
        vx[k] = (vx[k] + ax[k] - KA * ux[k]) * DAMP; vy[k] = (vy[k] + ay[k] - KA * uy[k]) * DAMP;
        ux[k] += vx[k]; uy[k] += vy[k]; ax[k] = 0; ay[k] = 0;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const ps = Array.from({ length: BINS }, () => new Path2D());
      for (let e = 0; e < E; e++) {
        const a = ea[e], b = eb[e];
        const xa = x0[a] + ux[a], ya = y0[a] + uy[a], xb = x0[b] + ux[b], yb = y0[b] + uy[b];
        const s = Math.abs(Math.hypot(xb - xa, yb - ya) / P - 1);
        const bin = s < 0.012 ? 0 : Math.min(BINS - 1, 1 + (((s - 0.012) * 120) | 0));   // small strains stay neutral
        ps[bin].moveTo(xa, ya); ps[bin].lineTo(xb, yb);
      }
      ctx.lineWidth = 0.8;
      for (let i = 0; i < BINS; i++) {
        const t = i / (BINS - 1);
        ctx.strokeStyle = i === 0 ? 'rgba(236,235,231,0.09)' : `rgba(255,${(150 - 44 * t) | 0},${(96 - 53 * t) | 0},${(0.16 + 0.42 * t).toFixed(3)})`;
        ctx.stroke(ps[i]);
      }
      ctx.fillStyle = 'rgba(236,235,231,0.17)';
      for (let k = 0; k < N; k++) ctx.fillRect(x0[k] + ux[k] - 0.8, y0[k] + uy[k] - 0.8, 1.6, 1.6);
    };

    const settle = () => { for (let i = 0; i < 240; i++) step(0); draw(); };
    // with no cursor on it the structure only drifts, so every other frame is enough
    const loop = (t) => {
      if (!running) return;
      if (loads[1].A > 0.02 || (tick++ & 1)) { step(t); draw(); }
      requestAnimationFrame(loop);
    };
    const start = () => { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(loop); } };

    build(); settle();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); settle(); }, 150); });
    if (still) return;

    host.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect(), p = loads[1];
      p.tx = e.clientX - r.left; p.ty = e.clientY - r.top;
      if (p.tA === 0 && p.A < 0.02) { p.x = p.tx; p.y = p.ty; }
      p.tA = 1;
    });
    host.addEventListener('pointerleave', () => { loads[1].tA = 0; });
    document.addEventListener('visibilitychange', () => (document.hidden ? (running = false) : start()));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : (running = false); }, { threshold: 0.02 }).observe(host);
  }

  // ------------------------------------------------------------ nav scroll-spy
  function spy() {
    const links = $$('.nav [data-spy]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const by = new Map(links.map((a) => [a.dataset.spy, a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-on'));
        by.get(e.target.id)?.classList.add('is-on');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    by.forEach((_, id) => { const s = document.getElementById(id); s && io.observe(s); });
  }

  // ------------------------------------------------------------ experience rail fills as you scroll
  function rail() {
    const el = $('[data-rail]');
    if (!el) return;
    const items = $$('.exp', el);
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = el.getBoundingClientRect(), mark = innerHeight * 0.62;
      el.style.setProperty('--p', Math.max(0, Math.min(1, (mark - r.top) / r.height)).toFixed(4));
      items.forEach((it) => it.classList.toggle('is-on', it.getBoundingClientRect().top + 30 < mark));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  // ------------------------------------------------------------ copy email
  function copy() {
    $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const was = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('is-done');
        setTimeout(() => { btn.textContent = was; btn.classList.remove('is-done'); }, 1600);
      } catch { location.href = `mailto:${btn.dataset.copy}`; }
    }));
  }
})();
