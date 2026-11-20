/* Pixel graphics: rasterises the domain icons into grids and animates them on canvas. */
(function () {
  const ICONS = window.CHI_ICONS;
  const { BRAND, CAT } = window.CHI;
  const M = 96; // master raster size
  const masters = {};
  const gridCache = {};
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FX = { reduced };

  function loadMaster(id) {
    return new Promise(resolve => {
      const i = ICONS[id];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${i.vb}" width="${M}" height="${M}" fill="#000"${i.even ? ' fill-rule="evenodd"' : ''}>${i.body}</svg>`;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = M;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0, M, M);
        const d = x.getImageData(0, 0, M, M).data;
        const a = new Float32Array(M * M);
        for (let p = 0; p < M * M; p++) a[p] = d[p * 4 + 3] / 255;
        masters[id] = a;
        resolve();
      };
      img.onerror = () => { masters[id] = new Float32Array(M * M); resolve(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  FX.ready = Promise.all(Object.keys(ICONS).map(loadMaster));

  /** Coverage grid (0..1) of an icon at n × n. */
  FX.grid = function (id, n) {
    const key = id + ':' + n;
    if (gridCache[key]) return gridCache[key];
    const src = masters[id];
    const g = new Float32Array(n * n);
    if (!src) return g;
    for (let y = 0; y < n; y++) {
      const y0 = Math.floor(y * M / n), y1 = Math.max(y0 + 1, Math.floor((y + 1) * M / n));
      for (let x = 0; x < n; x++) {
        const x0 = Math.floor(x * M / n), x1 = Math.max(x0 + 1, Math.floor((x + 1) * M / n));
        let s = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s += src[yy * M + xx];
        g[y * n + x] = s / ((y1 - y0) * (x1 - x0));
      }
    }
    return (gridCache[key] = g);
  };

  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const BR = [hex(BRAND.g), hex(BRAND.r), hex(BRAND.b)];
  // Brand blue is too dark to read as a pixel on black — lift it slightly for particles only.
  const BR_LIT = [BR[0], BR[1], [40, 60, 255]];

  /** Weighted blend of the three brand colours. w = [communities, methods, behaviors]. */
  FX.mixColor = function (w) {
    const s = (w[0] + w[1] + w[2]) || 1;
    const c = [0, 1, 2].map(k => (BR_LIT[0][k] * w[0] + BR_LIT[1][k] * w[1] + BR_LIT[2][k] * w[2]) / s);
    // normalise so the blend stays vivid on black
    const mx = Math.max(c[0], c[1], c[2]) || 1;
    return rgb(c.map(v => v * (235 / mx)));
  };

  function pickBrand(w, r) {
    const s = w[0] + w[1] + w[2];
    let t = r * s;
    if ((t -= w[0]) < 0) return 0;
    if ((t -= w[1]) < 0) return 1;
    return 2;
  }
  // cheap deterministic hash → 0..1
  function h2(a, b) {
    let x = Math.imul(a + 374761393, 668265263) ^ Math.imul(b + 1274126177, 2246822519);
    x = Math.imul(x ^ (x >>> 13), 3266489917);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height, ctx };
  }

  /**
   * Morphing pixel field — cycles through domain icons as a dot-matrix mosaic.
   * opts: { ids, interval, cols, onChange(id) }
   */
  FX.field = function (canvas, opts) {
    const ids = opts.ids;
    const N = opts.n || 22; // icon grid resolution
    let dim = fit(canvas);
    let idx = 0, prev = ids[ids.length - 1], cur = ids[0];
    let tStart = -1e9, raf = 0, timer = 0, dead = false;
    let seed = 1;
    let ptr = null;

    function next() {
      prev = cur;
      idx = (idx + 1) % ids.length;
      cur = ids[idx];
      seed++;
      tStart = performance.now();
      opts.onChange && opts.onChange(cur);
    }

    function draw(now) {
      if (dead) return;
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      const { w, h, ctx } = dim;
      // the icon takes at most ~3/4 of the width and ~2/3 of the height
      const cell = Math.min(w / (N + 8), (h * (opts.fill || 0.66)) / N);
      if (!(cell >= 2)) { dim = fit(canvas); return; } // not laid out yet (hidden tab, zero-size canvas)
      const COLS = Math.ceil(w / cell) + 1;
      const rows = Math.ceil(h / cell) + 1;
      const ox = (w - COLS * cell) / 2;
      const ix0 = Math.round((COLS - N) / 2);
      const cyf = typeof opts.cy === 'function' ? opts.cy() : (opts.cy || 0.5);
      const iy0 = Math.max(0, Math.round(rows * cyf - N / 2));
      const ga = FX.grid(prev, N), gb = FX.grid(cur, N);
      const ca = hex(CAT[prev].color), cb = hex(CAT[cur].color);
      const mixB = CAT[cur].mix;
      const tick = Math.floor(now / 1100);
      ctx.clearRect(0, 0, w, h);

      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          const x = ox + cx * cell + cell / 2, y = cy * cell + cell / 2;
          const gx = cx - ix0, gy = cy - iy0;
          const inside = gx >= 0 && gy >= 0 && gx < N && gy < N;
          let v = 0, t = 1, col = cb, brandIdx = -1;
          if (inside) {
            const k = gy * N + gx;
            const delay = h2(k, seed) * 650;
            t = reduced ? 1 : clamp((now - tStart - delay) / 520);
            const e = ease(t);
            v = lerp(ga[k], gb[k], e);
            col = lerpC(ca, cb, e);
            if (t > 0 && t < 1) brandIdx = pickBrand(mixB, h2(k, seed + 99));
          }
          // pointer play: cells near the finger break back into the three brand colours
          let off = 0, near = 0;
          if (ptr) {
            const dx = x - ptr.x, dy = y - ptr.y, d = Math.hypot(dx, dy), R = cell * 5;
            if (d < R) { near = 1 - d / R; off = near * near * cell * 0.9; }
          }
          if (v > 0.1) {
            const shimmer = reduced ? 1 : 0.94 + 0.06 * Math.sin(now / 520 + cx * 0.7 + cy * 0.45);
            let s = cell * (0.28 + 0.62 * v) * shimmer;
            let c = col;
            if (brandIdx >= 0) c = BR_LIT[brandIdx];
            if (near > 0.25) { c = BR_LIT[pickBrand([1, 1, 1], h2(cx, cy))]; s *= 1 - near * 0.35; }
            let px = x, py = y;
            if (off) { const a = Math.atan2(y - ptr.y, x - ptr.x); px += Math.cos(a) * off; py += Math.sin(a) * off; }
            ctx.fillStyle = rgb(c);
            if (v < 0.62 || near > 0.25) { ctx.beginPath(); ctx.arc(px, py, s / 2, 0, 6.2832); ctx.fill(); }
            else ctx.fillRect(px - s / 2, py - s / 2, s, s);
          } else {
            // background lattice + the odd stray brand pixel
            const stray = !reduced && h2(cx * 131 + cy, tick) < 0.012;
            if (stray) {
              ctx.fillStyle = rgb(BR_LIT[pickBrand([1, 1, 1], h2(cx, cy + tick))]);
              const s = cell * 0.5;
              ctx.fillRect(x - s / 2, y - s / 2, s, s);
            } else if (near > 0.05) {
              ctx.fillStyle = rgb(BR_LIT[pickBrand([1, 1, 1], h2(cx, cy))]);
              ctx.globalAlpha = near;
              ctx.beginPath(); ctx.arc(x, y, cell * 0.22, 0, 6.2832); ctx.fill();
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = '#2b2b2b';
              ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
            }
          }
        }
      }
    }

    function move(e) {
      const r = canvas.getBoundingClientRect();
      ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    const leave = () => { ptr = null; };
    const onResize = () => { dim = fit(canvas); };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });
    window.addEventListener('resize', onResize);

    FX.ready.then(() => {
      if (dead) return;
      tStart = performance.now();
      opts.onChange && opts.onChange(cur);
      raf = requestAnimationFrame(draw);
      timer = setInterval(next, opts.interval || 2800);
    });

    return {
      destroy() {
        dead = true; cancelAnimationFrame(raf); clearInterval(timer);
        window.removeEventListener('resize', onResize);
      },
    };
  };

  /**
   * Icon reveal — brand-colour pixels gather, resolve from coarse to fine, then hand over to the crisp SVG.
   * opts: { id, mix, onDone }
   */
  FX.reveal = function (canvas, opts) {
    const N = 24;
    let dead = false, raf = 0, done = false;
    const dim = fit(canvas);
    const { w, h, ctx } = dim;
    const size = Math.min(w, h);
    const cell = size / N;
    const x0 = (w - size) / 2, y0 = (h - size) / 2;
    const target = hex(CAT[opts.id].color);
    let parts = [];

    function build() {
      const g = FX.grid(opts.id, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = g[y * N + x];
        if (v < 0.4) continue;
        const k = y * N + x;
        const ang = h2(k, 7) * 6.2832, rad = (0.25 + h2(k, 8) * 0.55) * size;
        const b6x = Math.floor(x / 6) * 6 + 3, b6y = Math.floor(y / 6) * 6 + 3;
        const b3x = Math.floor(x / 3) * 3 + 1.5, b3y = Math.floor(y / 3) * 3 + 1.5;
        parts.push({
          ang, rad, spin: (h2(k, 9) - 0.5) * 1.6,
          p1: [x0 + b6x * cell, y0 + b6y * cell],
          p2: [x0 + b3x * cell, y0 + b3y * cell],
          p3: [x0 + (x + 0.5) * cell, y0 + (y + 0.5) * cell],
          j: h2(k, 10),
          c: BR_LIT[pickBrand(opts.mix, h2(k, 11))],
        });
      }
    }

    const T = { a: 650, b: 1250, c: 1450, d: 1950, e: 2100, f: 2650, end: 2900 };
    let t0 = 0;
    function frame(now) {
      if (dead) return;
      if (!t0) t0 = now;
      const t = reduced ? T.end : now - t0;
      ctx.clearRect(0, 0, w, h);
      const cxm = w / 2, cym = h / 2;
      for (const p of parts) {
        const a = p.ang + p.spin * Math.min(t, T.b) / 600;
        const sx = cxm + Math.cos(a) * p.rad, sy = cym + Math.sin(a) * p.rad;
        const jit = p.j * 180;
        let x, y, s, c = p.c;
        if (t < T.c) {
          const e = ease(clamp((t - T.a - jit) / (T.b - T.a - 180)));
          x = lerp(sx, p.p1[0], e); y = lerp(sy, p.p1[1], e);
          s = lerp(cell * 0.55, cell * 6 - 3, e);
          ctx.globalAlpha = clamp(t / 300) * (e > 0.98 ? 1 : 0.9);
        } else if (t < T.e) {
          const e = ease(clamp((t - T.c - jit) / (T.d - T.c - 180)));
          x = lerp(p.p1[0], p.p2[0], e); y = lerp(p.p1[1], p.p2[1], e);
          s = lerp(cell * 6 - 3, cell * 3 - 2, e);
          ctx.globalAlpha = 1;
        } else {
          const e = ease(clamp((t - T.e - jit) / (T.f - T.e - 180)));
          x = lerp(p.p2[0], p.p3[0], e); y = lerp(p.p2[1], p.p3[1], e);
          s = lerp(cell * 3 - 2, cell + 0.6, e);
          c = lerpC(p.c, target, e);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = rgb(c);
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      if (t >= T.end) {
        if (!done) { done = true; opts.onDone && opts.onDone(); }
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    FX.ready.then(() => { if (dead) return; build(); raf = requestAnimationFrame(frame); });
    return { destroy() { dead = true; cancelAnimationFrame(raf); } };
  };

  window.FX = FX;
})();
