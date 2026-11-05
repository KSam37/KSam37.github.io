/* Portfolio interactions. Everything here is progressive enhancement:
   the site is fully readable with JavaScript off. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  document.addEventListener('DOMContentLoaded', () => {
    theme(); navAndProgress(); reveal(); filters(); lightbox(); toc(); breakouts(); field();
  });

  // ------------------------------------------------------------ theme
  function theme() {
    const btn = $('.nav__theme');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = doc.dataset.theme === 'light' ? 'dark' : 'light';
      const apply = () => { doc.dataset.theme = next; try { localStorage.setItem('theme', next); } catch (e) {} };
      if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
      window.dispatchEvent(new Event('themechange'));
    });
  }

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

  // ------------------------------------------------------------ project filters
  function filters() {
    const chips = $$('.chip[data-filter]');
    if (!chips.length) return;
    const cards = $$('.card[data-tags]');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      const apply = () => {
        chips.forEach((c) => c.classList.toggle('is-on', c === chip));
        cards.forEach((c) => c.classList.toggle('is-hidden', f !== '*' && !c.dataset.tags.split(' ').includes(f)));
        cards.forEach((c) => c.classList.add('is-in'));
      };
      if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
    }));
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

  // ------------------------------------------------------------ hero strain field
  // A spring-mass lattice. The cursor indents it; an off-screen "actuator"
  // slowly inflates and relaxes. Edges are tinted by local strain, like a DIC map.
  function field() {
    const canvas = $('.hero__field');
    if (!canvas) return;
    const hero = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const rx = $('[data-readout="xy"]'), re = $('[data-readout="eps"]');
    let W = 0, H = 0, S = 36, cols = 0, rows = 0, nodes = [], dpr = 1;
    let ink = '236,235,231', acc = [255, 106, 43];
    const ptr = { x: -9999, y: -9999, on: false, px: -9999, py: -9999 };
    let running = false, visible = true, t0 = performance.now();

    const colors = () => {
      const cs = getComputedStyle(doc);
      ink = cs.getPropertyValue('--field').trim() || ink;
      const a = cs.getPropertyValue('--accent').trim();
      const m = a.match(/^#([0-9a-f]{6})$/i);
      if (m) acc = [0, 2, 4].map((i) => parseInt(m[1].substr(i, 2), 16));
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      S = W < 700 ? 30 : 38;
      cols = Math.ceil(W / S) + 3; rows = Math.ceil(H / S) + 3;
      const ox = (W - (cols - 1) * S) / 2, oy = (H - (rows - 1) * S) / 2;
      nodes = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = ox + i * S, y = oy + j * S;
        nodes.push({ rx: x, ry: y, x, y, vx: 0, vy: 0 });
      }
    };

    const step = (time) => {
      const t = (time - t0) / 1000;
      // two slow "actuators" inflating out of phase
      const a1 = { x: W * 0.78, y: H * 0.42, A: 22 * (0.5 + 0.5 * Math.sin(t * 0.9)), s: 190 };
      const a2 = { x: W * 0.12, y: H * 0.85, A: 14 * (0.5 + 0.5 * Math.sin(t * 0.9 + 2.2)), s: 150 };
      const R = 170, R2 = R * R;
      for (const n of nodes) {
        let tx = n.rx, ty = n.ry;
        for (const a of [a1, a2]) {
          const dx = n.rx - a.x, dy = n.ry - a.y, d = Math.hypot(dx, dy) || 1;
          const g = a.A * Math.exp(-(d * d) / (2 * a.s * a.s));
          tx += (dx / d) * g; ty += (dy / d) * g;
        }
        if (ptr.on) {
          const dx = n.x - ptr.x, dy = n.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / R) ** 2 * 4.2;
            n.vx += (dx / d) * f; n.vy += (dy / d) * f;
          }
        }
        n.vx = (n.vx + (tx - n.x) * 0.045) * 0.84;
        n.vy = (n.vy + (ty - n.y) * 0.045) * 0.84;
        n.x += n.vx; n.y += n.vy;
      }
    };

    const BINS = 6;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const paths = Array.from({ length: BINS }, () => new Path2D());
      let emax = 0;
      const edge = (a, b) => {
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const e = Math.abs(len / S - 1);
        if (e > emax) emax = e;
        const k = Math.min(BINS - 1, Math.floor(e * 28));
        paths[k].moveTo(a.x, a.y); paths[k].lineTo(b.x, b.y);
      };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const n = nodes[j * cols + i];
        if (i < cols - 1) edge(n, nodes[j * cols + i + 1]);
        if (j < rows - 1) edge(n, nodes[(j + 1) * cols + i]);
      }
      ctx.lineWidth = 1;
      for (let k = 0; k < BINS; k++) {
        const u = k / (BINS - 1);
        ctx.strokeStyle = k === 0 ? `rgba(${ink},0.085)` : `rgba(${acc[0]},${acc[1]},${acc[2]},${0.1 + u * 0.55})`;
        ctx.stroke(paths[k]);
      }
      // node markers near the pointer
      if (ptr.on) {
        ctx.fillStyle = `rgba(${acc[0]},${acc[1]},${acc[2]},0.9)`;
        for (const n of nodes) {
          const d = Math.hypot(n.x - ptr.x, n.y - ptr.y);
          if (d < 120) { const r = 1.6 * (1 - d / 120) + 0.4; ctx.fillRect(n.x - r, n.y - r, r * 2, r * 2); }
        }
        ctx.strokeStyle = `rgba(${ink},0.35)`;
        ctx.beginPath(); ctx.moveTo(ptr.x - 9, ptr.y); ctx.lineTo(ptr.x + 9, ptr.y); ctx.moveTo(ptr.x, ptr.y - 9); ctx.lineTo(ptr.x, ptr.y + 9); ctx.stroke();
      }
      if (re) re.innerHTML = `ε<sub>max</sub> ${emax.toFixed(3)}`;
      if (rx && ptr.on) rx.textContent = `x ${String(Math.round(ptr.x)).padStart(4, '0')} · y ${String(Math.round(ptr.y)).padStart(4, '0')}`;
    };

    const loop = (time) => {
      if (!running) return;
      step(time); draw();
      requestAnimationFrame(loop);
    };
    const start = () => { if (!running && visible && !document.hidden && !reduced) { running = true; requestAnimationFrame(loop); } };
    const stop = () => { running = false; };

    colors(); resize(); draw();
    if (reduced) return;

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true;
    });
    hero.addEventListener('pointerleave', () => { ptr.on = false; });
    addEventListener('resize', () => { resize(); });
    addEventListener('themechange', () => setTimeout(colors, 30));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
    start();
  }
})();
