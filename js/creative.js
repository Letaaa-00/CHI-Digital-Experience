/* Creative badge — a typographic collage.
 *
 * The bio is one editable sentence ("Hi! I am Helen Chen attending CHI 27 for AI + HCI + Design").
 * Its words are set in short rows, packed closely, with graphics dealt in beside them: the person's
 * interest icons, their uploaded images and a few random marks. The name is set largest. Big pieces
 * are tucked into the gaps the ragged rows leave. The finished cluster is scaled to sit comfortably
 * inside the badge and centred in the middle of it — it never fills the card edge to edge.
 *
 * Two rules for the graphics: no graphic ever lies on top of another (each keeps GAP of air around it),
 * and each interest's icon appears once, in one form: filled with an offset outline, cut out of a colour
 * block, or as a dot matrix. There are no outline-only icons.
 *
 * Everything is worked out in em (1 em = the base type size), then drawn in pixels.
 * The same seed always gives the same arrangement; "Shuffle" changes the seed.
 */
(function () {
  const ICONS = window.CHI_ICONS;
  const { CAT } = window.CHI;
  const FX = window.FX;

  const BIO_WORDS = 20;   // word cap for the bio sentence
  const MAX_IMAGES = 3;
  const FONT = '"Roboto Condensed", Roboto, system-ui, sans-serif';
  const ASC = 0.928, CAP = 0.711, XH = 0.528; // Roboto Condensed metrics, in em (line-height 1.172)
  const SP = 0.24;        // space between words
  const LEAD = 0.02;      // extra air between rows
  const GAP = 0.16;       // the least air between two graphics: they never touch, let alone overlap
  const BAR_DOT = 0.49;   // how far the mix dot hangs below the brand bar

  // how each interest is said in the suggested sentence
  const SHORT = {
    ai: 'AI + HCI', access: 'Accessibility', health: 'Health', edu: 'Education', social: 'Social Computing', design: 'Design',
    physical: 'Physical Interaction', spatial: 'Spatial Interaction', dataviz: 'Data Viz', playful: 'Play', privacy: 'Privacy', society: 'Society + Ethics',
  };

  // Graphics that sit in a row beside the words. Sizes in em: width range, height, and
  // b = how far the bottom edge drops below the baseline.
  const INLINE = {
    block:   { w: [2.6, 3.3], h: 1.4,  b: 0.1 },   // interest colour block with its icon
    stack:   { w: [2.1, 2.5], h: 1.5,  b: 0.28 },  // three stepped outlines
    pair:    { w: [1.92, 1.92], h: 0.92, b: 0.02 }, // outlined square + circle
    glitch:  { w: [2.3, 3.0], h: 1.05, b: 0.3 },   // striped swatch in the interest colours
    photo:   { w: [1.6, 2.0], h: 1.36, b: 0.06 },  // an uploaded image
    checker: { w: [1.7, 2.5], h: 0.86, b: 0.04 },
    wire:    { w: [2.2, 2.9], h: 1.15, b: 0.12 },  // wireframe box
    bar:     { w: [2.9, 3.6], h: 0.36, b: -0.2 },  // brand gradient, the person's mix as a dot (which hangs BAR_DOT below it)
    dots:    { w: [1.3, 1.3], h: 1.3,  b: 0.14 },  // an interest icon as a dot matrix
    scrawl:  { w: [2.4, 3.4], h: 1.0,  b: 0.16 },  // a thin hand-drawn line
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (R, a) => a[Math.floor(R() * a.length)];
  const between = (R, a, b) => a + R() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function shuffle(arr, R) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  const okImage = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  const icon = (id, cls) => { const i = ICONS[id]; return `<svg class="${cls || ''}" viewBox="${i.vb}"${i.even ? ' fill-rule="evenodd"' : ''} aria-hidden="true">${i.body}</svg>`; };
  const clean = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');

  /* ---------- the sentence ---------- */
  const bioWords = text => String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, BIO_WORDS);
  /** The suggested bio: name and interests in one line. */
  function defaultBio(u, ints) {
    let out = `Hi! I am ${String(u.name || '').trim()} attending CHI 27 for`, n = out.split(/\s+/).length;
    ints.forEach((x, i) => {
      const add = (i ? '+ ' : '') + SHORT[x.id], k = add.split(' ').length;
      if (i < 2 || n + k <= BIO_WORDS) { out += ' ' + add; n += k; }
    });
    return out;
  }
  /** What the badge says: the person's own sentence, or the suggested one. */
  function bioText(u, ints) {
    const own = bioWords(u.creative && u.creative.bio).join(' ');
    return own || defaultBio(u, ints);
  }

  /* ---------- 1. words: who is the name, what goes together ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  const wcache = {};
  function measure(text, st) {
    const key = st + '|' + text;
    if (wcache[key] == null) {
      mctx.font = `${st === 'it' ? 'italic ' : ''}${st === 'b' ? 700 : 400} 100px ${FONT}`;
      wcache[key] = mctx.measureText(text).width / 100 + 0.015;
    }
    return wcache[key];
  }

  function parse(text, u, ints, R) {
    const nameParts = new Set(String(u.name || '').split(/\s+/).map(clean).filter(p => p.length > 1));
    const words = bioWords(text).map(t => ({ k: 'w', text: t, st: '', z: 1 }));
    words.forEach((w, i) => {
      const c = clean(w.text);
      if (nameParts.has(c)) { w.role = 'name'; w.st = 'it'; }
      else if (c === 'chi') { w.role = 'chi'; w.st = 'b'; w.z = 1.15; }
      else if (i && words[i - 1].role === 'chi' && /^['’]?\d{2,4}[.,!]?$/.test(w.text)) { w.role = 'num'; w.z = 0.56; }
      else if (i === 0 && /^(hi|hey|hello|hola|yo)\b/i.test(w.text)) w.st = 'it';
      else if (/ing[.,!]?$/i.test(w.text) && w.text.length > 5) w.st = 'it';
      else if (c.length > 2 && R() < 0.12) w.st = 'it';
    });
    // short interest labels ("AI + HCI", "Data Viz") never split across rows
    ints.forEach(x => {
      const label = SHORT[x.id], parts = label.split(' ');
      if (parts.length < 2 || label.length > 10) return;
      for (let i = 0; i + parts.length <= words.length; i++) {
        if (parts.every((p, j) => words[i + j].text.replace(/[.,!]$/, '').toLowerCase() === p.toLowerCase())) { for (let j = 1; j < parts.length; j++) words[i + j].tail = true; break; }
      }
    });
    // one hand-drawn flourish under a longer word
    const long = words.filter(w => !w.role && clean(w.text).length >= 5);
    const target = long.length ? pick(R, long) : words.filter(w => w.role === 'name').pop();
    if (target) target.swoosh = true;
    words.forEach(w => { w.w = measure(w.text, w.st) * w.z; });
    return words;
  }

  // units are what a row may not break: the whole name, "CHI ▮ 27", "+ Design", a short label
  function unitsOf(words) {
    const units = [];
    words.forEach((w, i) => {
      const prev = units[units.length - 1], before = words[i - 1];
      const glue = prev && ((w.role === 'name' && prev.name) || w.role === 'num' || w.tail || (before.text === '+' && !prev.name));
      if (glue) prev.items.push(w); else units.push({ items: [w], name: w.role === 'name' });
    });
    return units;
  }

  /* ---------- 2. graphics ---------- */
  function inline(type, R, ints, u, extra) {
    const d = INLINE[type];
    const g = Object.assign({ k: 'g', type, w: between(R, d.w[0], d.w[1]), h: d.h, b: d.b }, extra);
    if (type === 'scrawl') g.d = scribble(R, false);
    if (type === 'dots' || type === 'glitch') g.id = g.id || pick(R, ints).id;
    if (type === 'glitch') g.id2 = ints[(ints.findIndex(x => x.id === g.id) + 1) % ints.length].id;
    if (type === 'block') g.side = R() < 0.7 ? 'right' : 'left';
    if (type === 'bar') { const m = u.mix || [1 / 3, 1 / 3, 1 / 3], s = m[0] + m[1] + m[2] || 1; g.p = (m[1] * 0.5 + m[2]) / s; g.c = FX.mixColor(m); }
    return g;
  }
  // a hand-drawn line in a 100 × 40 box; `flourish` is the looping underline
  function scribble(R, flourish) {
    const j = k => (R() - 0.5) * k;
    const pts = flourish
      ? [[4, 26 + j(6)], [60 + j(14), 6 + j(5)], [94, 12 + j(6)], [34 + j(12), 33 + j(4)], [8, 30 + j(5)], [56 + j(12), 22 + j(6)], [98, 24 + j(6)]]
      : (() => { const n = 4 + Math.floor(R() * 3), p = [[1, 20 + j(16)]]; for (let i = 1; i <= n; i++) p.push([(i / n) * 96 - (i % 2 ? 0 : 20 * R()), 5 + R() * 30]); p.push([99, 12 + R() * 16]); return p; })();
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  /* ---------- 3. rows ---------- */
  function gapOf(a, b, z) {
    if (b.role === 'num') return 0.05;
    if (b.type === 'rgb') return 0.12 * z;
    return SP * z;
  }
  // lays a row's items left to right; words scale with the row, graphics keep their size
  function rowWidth(row) {
    let x = 0;
    row.items.forEach((it, j) => {
      if (j) x += gapOf(row.items[j - 1], it, row.z);
      it.rx = x;
      it.rw = it.k === 'w' ? it.w * (it.role === 'num' ? 1 : row.z) : it.w;
      x += it.rw;
    });
    return (row.w = x);
  }
  // The flourish under the k-th item of a row, measured from the row's left end and its baseline. It reaches
  // a little past its word on both sides, but stops short of a graphic standing next to the word.
  function swooshOf(row, k) {
    const it = row.items[k], z = row.z, prev = row.items[k - 1], next = row.items[k + 1];
    const l = prev && prev.k === 'g' ? Math.max(0, Math.min(0.3 * z, gapOf(prev, it, z) - GAP)) : 0.3 * z;
    const r = next && next.k === 'g' ? Math.max(0, Math.min(0.4 * z, gapOf(it, next, z) - GAP)) : 0.4 * z;
    return { x: it.rx - l, w: it.rw + l + r, up: 0.1 * z, down: 0.56 * z };
  }

  function buildRows(units, Wmax, deck, R) {
    const rows = [];
    const uw = (u, z) => rowWidth({ items: u.items, z });
    const take = maxW => { const j = deck.findIndex(g => g.w <= maxW); return j < 0 ? null : deck.splice(j, 1)[0]; };
    const nameUnit = units.find(u => u.name);
    const nameZ = w => clamp(Wmax * 0.97 / w, 1.15, 1.7);
    const otherMax = nameUnit ? Math.max(1, nameZ(uw(nameUnit, 1)) - 0.18) : 1.3; // nothing else outgrows the name
    const ends = (row, g) => {
      const a = row.items[0].k === 'g', b = row.items[row.items.length - 1].k === 'g';
      if (a && !b) row.items.push(g); else if (b && !a) row.items.unshift(g); else if (R() < 0.5) row.items.unshift(g); else row.items.push(g);
    };
    let i = 0;
    while (i < units.length) {
      const u = units[i];
      if (u.name) {
        // The name gets a row to itself, set as large as the block allows. A very long name takes two rows.
        let parts = [u];
        if (uw(u, 1.15) > Wmax * 1.12 && u.items.length > 1) {
          let best = 1, bestW = Infinity;
          for (let k = 1; k < u.items.length; k++) { const m = Math.max(uw({ items: u.items.slice(0, k) }, 1), uw({ items: u.items.slice(k) }, 1)); if (m < bestW) { bestW = m; best = k; } }
          parts = [{ items: u.items.slice(0, best) }, { items: u.items.slice(best) }];
        }
        parts.forEach(p => {
          const row = { items: p.items.slice(), z: nameZ(uw(p, 1)), name: true };
          const spare = Wmax - rowWidth(row) - SP * row.z;
          if (spare > 1.3 && R() < 0.8) { const g = take(spare); if (g) ends(row, g); }
          rows.push(row);
        });
        i++;
        continue;
      }
      const row = { items: [], z: 1 }, cuts = [];
      let g = R() < 0.88 ? take(Wmax * 0.5) : null;
      let used = g ? g.w : 0;
      const first = i;
      while (i < units.length && !units[i].name) {
        const w = uw(units[i], 1), need = w + (used ? SP : 0);
        if (used + need > Wmax) {
          if (i > first) break;                                   // the row is full
          if (g) { deck.unshift(g); g = null; used = 0; continue; } // make room: hand the graphic back
          row.z = Wmax / w;                                       // one very long word: set it smaller
        }
        row.items.push(...units[i].items);
        cuts.push(row.items.length);
        used += need;
        i++;
      }
      if (g) row.items.splice(cuts.length > 1 && R() < 0.42 ? pick(R, cuts.slice(0, -1)) : R() < 0.5 ? 0 : row.items.length, 0, g);
      const spare = Wmax - rowWidth(row) - SP;
      if (spare > 1.3 && R() < 0.6) { const g2 = take(spare); if (g2) ends(row, g2); }
      // a short row takes a graphic, or is set larger, so the block stays dense
      if (rowWidth(row) < Wmax * 0.62 && !row.items.some(it => it.k === 'g')) { const g3 = take(Wmax - row.w - SP); if (g3) ends(row, g3); }
      if (rowWidth(row) < Wmax * 0.82 && row.z === 1 && R() < 0.6) {
        for (const z of [1.3, 1.2, 1.1]) { if (z > otherMax) continue; row.z = z; if (rowWidth(row) <= Wmax) break; row.z = 1; }
      }
      rows.push(row);
    }
    // anything that must appear and has not found a row yet
    deck.filter(g => g.must).forEach(g => {
      deck.splice(deck.indexOf(g), 1);
      const fits = rows.filter(r => !r.name && Wmax - rowWidth(r) - SP >= g.w);
      if (fits.length) ends(pick(R, fits), g);
      else { const last = rows[rows.length - 1]; if (last.only && Wmax - rowWidth(last) - SP >= g.w) last.items.push(g); else rows.push({ items: [g], z: 1, only: true }); }
    });
    return rows;
  }

  // sideways: rows keep a ragged edge; downwards: rows sit as close as their contents allow
  function arrange(rows, scheme, R) {
    rows.forEach(rowWidth);
    const Wb = Math.max(...rows.map(r => r.w));
    rows.forEach((r, i) => {
      const slack = Wb - r.w, inset = slack > 1 && R() < 0.3 ? 0.2 * R() : 0;
      const t = scheme === 'right' ? 1 - inset : scheme === 'left' ? inset : scheme === 'zig' ? (i % 2 ? 1 - inset : inset) : 0.5 + (R() - 0.5) * 0.6;
      r.x = slack * t;
    });
    let y = 0;
    rows.forEach((r, i) => {
      const gs = r.items.filter(it => it.k === 'g'), ws = r.items.filter(it => it.k === 'w');
      r.asc = Math.max(ws.length ? CAP * r.z + 0.1 : 0, ...gs.map(g => g.h - g.b - 0.14));
      r.desc = Math.max(ws.length ? 0.2 * r.z : 0, ...gs.map(g => (g.type === 'bar' ? 0.3 : g.b)), ws.some(w => w.role === 'num') ? 0.7 : 0, ws.some(w => w.swoosh) ? 0.58 * r.z : 0);
      // what the row's graphics (and a flourish under one of its words) cover, measured from its baseline
      r.ink = [];
      r.items.forEach((it, k) => {
        if (it.k === 'g') r.ink.push({ x0: r.x + it.rx, x1: r.x + it.rx + it.rw, up: it.h - it.b, down: it.b + (it.type === 'bar' ? BAR_DOT : 0) });
        else if (it.swoosh) { const s = swooshOf(r, k); r.ink.push({ x0: r.x + s.x, x1: r.x + s.x + s.w, up: s.up, down: s.down }); }
      });
      y += i ? rows[i - 1].desc + r.asc + LEAD : r.asc;
      // a tall graphic may reach up into the space under the words above it, but never into another graphic:
      // where two would meet, this row moves down just far enough to leave GAP between them
      if (i) {
        const p = rows[i - 1];
        let push = 0;
        r.ink.forEach(a => p.ink.forEach(b => { if (a.x0 < b.x1 + GAP && b.x0 < a.x1 + GAP) push = Math.max(push, p.base + b.down + GAP - (y - a.up)); }));
        y += push;
      }
      r.base = y;
    });
    return Wb;
  }

  /* ---------- 4. pack the big pieces into the gaps ---------- */
  const hits = (a, b, pad) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
  function bounds(boxes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    boxes.forEach(b => { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // the area a piece really covers: the brand bar's dot hangs below it, a tilted photo's corners stick out
  function ink(o) {
    if (o.type === 'bar') return { x: o.x, y: o.y, w: o.w, h: o.h + BAR_DOT };
    if (o.rot) { const s = Math.sin(Math.abs(o.rot) * Math.PI / 180), dx = o.h * s / 2, dy = o.w * s / 2; return { x: o.x - dx, y: o.y - dy, w: o.w + 2 * dx, h: o.h + 2 * dy }; }
    return o;
  }
  // Finds a place for a big piece where it touches nothing: clear of every word and of every other graphic.
  function pack(big, boxes, rows, Wlimit, R) {
    const ext = bounds(boxes), cands = [];
    const obst = boxes.map(o => ({ word: o.kind === 'w', r: ink(o) }));
    const own = ink({ x: 0, y: 0, w: big.w, h: big.h, rot: big.rot }), W = own.w, H = own.h; // the room the piece needs
    // beside a row, in the gap its ragged end leaves
    rows.forEach(r => {
      const top = r.base - CAP * r.z;
      [r.x - SP - W, r.x + r.w + SP].forEach(x => {
        [top - 0.16, r.base + 0.12 - H, r.base - XH * r.z / 2 - H / 2].forEach(y => cands.push({ x, y }));
      });
    });
    // against any one piece: beside it, above it or under it
    obst.forEach(o => {
      const q = o.r, g = (o.word ? 0.12 : GAP) + 0.02;
      [q.x - g - W, q.x + q.w + g].forEach(x => [q.y, q.y + q.h - H, q.y + (q.h - H) / 2].forEach(y => cands.push({ x, y })));
      [q.y - g - H, q.y + q.h + g].forEach(y => [q.x, q.x + q.w - W].forEach(x => cands.push({ x, y })));
    });
    // on top of the cluster or beneath it: let the piece settle against whatever is in its column
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const x = ext.x + (ext.w - W) * t;
      const col = obst.filter(o => o.r.x < x + W + 0.14 && x - 0.14 < o.r.x + o.r.w);
      if (!col.length) return;
      cands.push({ x, y: Math.min(...col.map(o => o.r.y)) - 0.14 - H });
      cands.push({ x, y: Math.max(...col.map(o => o.r.y + o.r.h)) + 0.14 });
    });
    let best = null;
    cands.forEach(c => {
      const b = { x: c.x, y: c.y, w: W, h: H };
      if (obst.some(o => hits(b, o.r, o.word ? 0.12 : GAP))) return;
      const nw = Math.max(ext.x + ext.w, b.x + b.w) - Math.min(ext.x, b.x), nh = Math.max(ext.y + ext.h, b.y + b.h) - Math.min(ext.y, b.y);
      const cost = nw * nh - ext.w * ext.h + Math.max(0, nw - Wlimit) * 40 + R() * 0.6; // prefer a gap inside the cluster
      if (!best || cost < best.cost) best = { cost, x: c.x - own.x, y: c.y - own.y };
    });
    return best;
  }

  /* ---------- the whole composition, in em ---------- */
  function compose(u, ints, seed, Wmax) {
    const R = rng(seed * 7919 + 13);
    const cr = u.creative || {};
    const words = parse(bioText(u, ints), u, ints, R);
    const units = unitsOf(words);

    // every interest and every image is guaranteed a place; the brand bar always appears; the rest is chance.
    // Each interest's icon appears once: one of the first two as a big filled icon with an offset outline
    // (its box holds both), the other cut out of a colour block, any further ones as dot matrices.
    const images = (cr.images || []).filter(okImage).slice(0, MAX_IMAGES);
    const flip = R() < 0.5, deck = [], bigs = [];
    ints.forEach((x, i) => {
      if (i < 2 && (i === 0) !== flip) { const s = between(R, 2.3, 2.75); bigs.push({ type: 'icon', id: x.id, w: s, h: s }); }
      else deck.push(inline(i < 2 ? 'block' : 'dots', R, ints, u, { id: x.id, must: true }));
    });
    images.forEach((src, i) => {
      if (i === 0) bigs.push({ type: 'photo', src, w: between(R, 2.1, 2.6), h: between(R, 1.6, 1.95), rot: R() < 0.3 ? +((R() - 0.5) * 7).toFixed(1) : 0 });
      else deck.push(inline('photo', R, ints, u, { src, must: true }));
    });
    deck.push(inline('bar', R, ints, u, { must: true }));
    shuffle(deck, R);
    shuffle(['stack', 'pair', 'glitch', 'checker', 'wire', 'scrawl'], R).forEach(t => deck.push(inline(t, R, ints, u)));

    const rows = buildRows(units, Wmax, deck, R);
    // the brand squares ride on "CHI"
    rows.forEach(r => { const k = r.items.findIndex(it => it.role === 'chi'); if (k >= 0) r.items.splice(k + 1, 0, { k: 'g', type: 'rgb', w: 0.28, h: 0.94, b: 0.02 }); });
    const Wb = arrange(rows, pick(R, ['right', 'right', 'right', 'left', 'left', 'zig', 'zig', 'mid']), R);

    const boxes = [];
    rows.forEach(r => r.items.forEach((it, k) => {
      if (it.k === 'w') {
        const z = it.role === 'num' ? it.z : it.z * r.z, base = r.base + (it.role === 'num' ? 0.44 : 0);
        const b = { kind: 'w', text: it.text, st: it.st, z, base, x: r.x + it.rx, w: it.rw, y: base - CAP * z, h: (CAP + 0.18) * z };
        boxes.push(b);
        if (it.swoosh) { const s = swooshOf(r, k); boxes.push({ kind: 'g', type: 'swoosh', d: scribble(R, true), x: r.x + s.x, y: r.base - s.up, w: s.w, h: s.up + s.down }); }
      } else {
        boxes.push(Object.assign({}, it, { kind: 'g', x: r.x + it.rx, y: r.base + it.b - it.h }));
      }
    }));

    // the big pieces go in last, each where it touches nothing already placed; failing that, under everything
    bigs.forEach(big => {
      const spot = pack(big, boxes, rows, Math.max(Wb, Wmax) * 1.1, R);
      const all = bounds(boxes.map(ink));
      boxes.push(Object.assign({ kind: 'g' }, big, spot ? { x: spot.x, y: spot.y } : { x: all.x, y: all.y + all.h + 0.3 }));
    });

    const all = bounds(boxes.map(ink)); // measured by what is really covered, so the cluster sits dead centre
    boxes.forEach(b => { b.x -= all.x; b.y -= all.y; if (b.kind === 'w') b.base -= all.y; });
    return { boxes, W: all.w, H: all.h };
  }

  /* ---------- 5. draw ---------- */
  function draw(b, s, ox, oy) {
    const px = v => v.toFixed(1) + 'px';
    if (b.kind === 'w') return `<span class="cb__w ${b.st}" style="left:${px(ox + b.x * s)};top:${px(oy + (b.base - ASC * b.z) * s)};font-size:${px(b.z * s)}">${esc(b.text)}</span>`;
    const st = [`left:${px(ox + b.x * s)}`, `top:${px(oy + b.y * s)}`, `width:${px(b.w * s)}`, `height:${px(b.h * s)}`];
    if (b.rot) st.push(`transform:rotate(${b.rot}deg)`);
    let inner = '';
    switch (b.type) {
      case 'block': st.push(`--c:${CAT[b.id].color}`); inner = icon(b.id, b.side === 'left' ? 'l' : ''); break;
      case 'icon': st.push(`--c:${CAT[b.id].color}`); inner = icon(b.id, 'o') + icon(b.id, 'f'); break;
      case 'photo': st.push(`background-image:url(${b.src})`); break;
      case 'stack': case 'rgb': inner = '<i></i><i></i><i></i>'; break;
      case 'pair': inner = '<i></i><i></i>'; break;
      case 'bar': st.push(`--p:${(b.p * 100).toFixed(1)}%`, `--mixc:${b.c}`); inner = '<i></i>'; break;
      case 'swoosh': case 'scrawl': inner = `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${b.d}"/></svg>`; break;
      case 'wire': inner = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10H78V40H0ZM22 0H100V30H22ZM0 10 22 0M78 10 100 0M78 40 100 30M0 40 22 30M0 10 78 40"/></svg>'; break;
      case 'dots': {
        st.push(`--c:${CAT[b.id].color}`);
        const n = 9, grid = FX.grid(b.id, n);
        let c = '';
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = grid[y * n + x]; if (v > 0.35) c += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="${(0.2 + 0.28 * v).toFixed(2)}"/>`; }
        inner = `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true">${c}</svg>`;
        break;
      }
      case 'glitch': st.push(`--c:${CAT[b.id].color}`, `--c2:${CAT[b.id2].color}`); break;
    }
    return `<span class="cb__g g-${b.type}" style="${st.join(';')}">${inner}</span>`;
  }

  /** Lay the collage out inside `el` (a badge face). Returns false if the element has no size yet. */
  function render(el, u, ints) {
    const cw = el.clientWidth, ch = el.clientHeight;
    if (!(cw > 40 && ch > 40)) return false;
    const seed = (u.creative && u.creative.seed) || 1;
    // The cluster may use this much of the card; the base type never grows past `cap`.
    const maxW = cw * 0.86, maxH = ch * 0.72, cap = cw * 0.098;
    // try a few row widths and keep the one that lets the type be largest
    const start = 7.8 + rng(seed)() * 1.2;
    let best = null;
    for (let k = 0; k < 4; k++) {
      const c = compose(u, ints, seed, start + k * 0.9);
      const s = Math.min(maxW / c.W, maxH / c.H);
      if (!best || s > best.s + 0.01) best = { s, c };
      if (s >= cap) break;
    }
    const s = Math.max(7, Math.min(best.s, cap)), c = best.c;
    const ox = (cw - c.W * s) / 2, oy = (ch - c.H * s) / 2; // centred in the middle of the card
    el.style.setProperty('--s', s.toFixed(2) + 'px');
    el.innerHTML = c.boxes.map(b => draw(b, s, ox, oy)).join('');
    return true;
  }

  const ready = document.fonts && document.fonts.load
    ? Promise.all(['400 40px "Roboto Condensed"', 'italic 400 40px "Roboto Condensed"', '700 40px "Roboto Condensed"'].map(f => document.fonts.load(f))).then(() => { for (const k in wcache) delete wcache[k]; }).catch(() => {})
    : Promise.resolve();

  window.Creative = { render, bioText, defaultBio, bioWords, okImage, ready, BIO_WORDS, MAX_IMAGES };
})();
