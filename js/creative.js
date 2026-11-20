/* Creative badge — a typographic collage.
 *
 * Built from five things: the person's name, a short bio (capped), their interest areas,
 * any images they upload, and a handful of random graphics. Words and graphics are flowed
 * like a paragraph, then sized so the composition fills the badge and never leaves it.
 * The same seed always gives the same arrangement; "Shuffle" changes the seed.
 */
(function () {
  const ICONS = window.CHI_ICONS;
  const { CAT } = window.CHI;
  const FX = window.FX;

  const BIO_WORDS = 10;   // word cap for the short bio
  const MAX_IMAGES = 3;
  const FONT = '"Roboto Condensed", Roboto, system-ui, sans-serif';
  const GAP = 0.2, LH = 1.04, ROW = 0.12; // token gap, line height, row gap — all in em

  // how each interest is said in the sentence
  const SHORT = {
    ai: 'AI + HCI', access: 'Accessibility', health: 'Health', edu: 'Education', social: 'Social Computing', design: 'Design',
    physical: 'Physical Interaction', spatial: 'Spatial Interaction', dataviz: 'Data Viz', playful: 'Play', privacy: 'Privacy', society: 'Society + Ethics',
  };

  // graphics: minimum width in em; `max` caps how far one stretches; `fixed` ones never stretch
  const GFX = {
    block: { min: 1.9 },             // interest colour block with its icon
    ghost: { min: 1.3, fixed: true },// interest icon with an offset outline
    img: { min: 1.3, max: 3 },       // uploaded image
    stack: { min: 1.5, max: 3 },     // three stepped outlines
    pair: { min: 1.78, fixed: true },// outlined square + circle
    rgb: { min: 0.3, fixed: true },  // the three brand squares
    bar: { min: 2 },                 // brand gradient with the person's mix as a puck
    scribble: { min: 1.8, max: 5 },
    checker: { min: 1.3, max: 3.9 },
    ellipse: { min: 1.1, max: 2.2 },
    wire: { min: 1.7, max: 3.4 },    // wireframe box
    dots: { min: 0.95, fixed: true },// an interest icon as a dot matrix
    glitch: { min: 1.4, max: 3.6 },  // striped swatch in the interest colours
  };
  const FILLERS = ['bar', 'scribble', 'stack', 'checker', 'ellipse', 'wire', 'glitch'];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, R) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  const okImage = s => typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  const icon = (id, cls) => { const i = ICONS[id]; return `<svg class="${cls || ''}" viewBox="${i.vb}"${i.even ? ' fill-rule="evenodd"' : ''} aria-hidden="true">${i.body}</svg>`; };

  /** The bio, trimmed to the word cap. */
  function bioWords(text) { return String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, BIO_WORDS); }

  /** What the badge says, as plain text. */
  function sentence(u, ints) {
    const bio = bioWords(u.creative && u.creative.bio).join(' ');
    return `Hi! I am ${u.name}${bio ? ', ' + bio + ',' : ''} attending CHI 27 for ${ints.map(x => SHORT[x.id]).join(' + ')}`;
  }

  /* ---------- 1. compose: words, with graphics dealt into the gaps ---------- */
  function compose(u, ints, seed) {
    const R = rng(seed * 7919 + 13);
    const cr = u.creative || {};
    const T = [];
    const word = (text, o) => T.push(Object.assign({ k: 'w', text, st: '' }, o));
    const slot = () => T.push({ k: 'slot' });

    word('Hi!', { st: 'it' });
    word('I'); slot();
    word('am'); slot();
    u.name.trim().split(/\s+/).slice(0, 5).forEach(n => word(n, { st: 'it', name: true }));
    slot();
    const bio = bioWords(cr.bio);
    bio.forEach((b, i) => { word(b, { st: R() < 0.3 ? 'it' : '' }); if (i % 3 === 2 && i < bio.length - 1) slot(); });
    if (bio.length) slot();
    word('attending', { st: 'it' });
    slot();
    word('CHI', { st: 'b' });
    T.push({ k: 'g', type: 'rgb', glue: true, inline: true });
    word('27', { st: 'sm', glue: true });
    word('for');
    ints.forEach((x, i) => {
      const label = SHORT[x.id], ws = label.split(' ');
      const tight = label.length <= 9; // short labels ("AI + HCI", "Data Viz") never split across lines
      if (i) word('+');
      ws.forEach((w, j) => word(w, { glue: j === 0 ? i > 0 : tight }));
      slot();
    });

    // one flourish under a word
    const italics = T.filter(t => t.k === 'w' && t.st === 'it' && t.text.length > 3);
    if (italics.length) italics[Math.floor(R() * italics.length)].under = scribble(R, true);

    // the deck: every interest and every uploaded image is guaranteed a place; random graphics take what is left
    const flip = R() < 0.5 ? 0 : 1;
    const must = ints.map((x, i) => ({ k: 'g', type: (i + flip) % 2 ? 'block' : 'ghost', id: x.id }));
    (cr.images || []).filter(okImage).slice(0, MAX_IMAGES).forEach(src => must.push({ k: 'g', type: 'img', src }));
    shuffle(must, R);
    const extras = shuffle(['stack', 'pair', 'bar', 'scribble', 'checker', 'ellipse', 'wire', 'dots', 'glitch'], R);

    const slots = shuffle(T.map((t, i) => (t.k === 'slot' ? i : -1)).filter(i => i >= 0), R);
    const put = {};
    must.forEach((g, i) => { const at = slots[i % slots.length]; (put[at] = put[at] || []).push(g); });
    slots.slice(must.length).forEach(at => { if (extras.length && R() < 0.62) put[at] = [{ k: 'g', type: extras.pop() }]; });

    const out = [];
    T.forEach((t, i) => { if (t.k !== 'slot') out.push(t); else (put[i] || []).forEach(g => out.push(dress(g, R, ints, u))); });
    return out;
  }

  // per-graphic details that must stay the same between layout passes
  function dress(g, R, ints, u) {
    g.gr = 1 + Math.floor(R() * 3);
    if (g.type === 'img' || g.type === 'glitch' || g.type === 'checker' || g.type === 'stack') g.rot = +((R() - 0.5) * 7).toFixed(1);
    g.dy = +((R() - 0.5) * 0.14).toFixed(2);
    if (g.type === 'scribble') g.d = scribble(R, false);
    if (g.type === 'dots' || g.type === 'glitch') g.id = g.id || ints[Math.floor(R() * ints.length)].id;
    if (g.type === 'glitch') g.id2 = ints[(ints.findIndex(x => x.id === g.id) + 1) % ints.length].id;
    if (g.type === 'block') g.side = R() < 0.7 ? 'right' : 'left';
    if (g.type === 'bar') { const m = u.mix || [1 / 3, 1 / 3, 1 / 3], s = m[0] + m[1] + m[2] || 1; g.p = (m[1] * 0.5 + m[2]) / s; g.c = FX.mixColor(m); }
    return g;
  }

  // a hand-drawn line in a 100 × 40 box; `flourish` is the looping underline
  function scribble(R, flourish) {
    const j = k => (R() - 0.5) * k;
    const pts = flourish
      ? [[0, 30 + j(6)], [62 + j(14), 7 + j(6)], [95, 13 + j(6)], [34 + j(12), 34 + j(4)], [7, 30 + j(6)], [58 + j(12), 23 + j(6)], [100, 25 + j(6)]]
      : (() => { const n = 4 + Math.floor(R() * 3), p = [[1, 20 + j(16)]]; for (let i = 1; i <= n; i++) p.push([(i / n) * 96 - (i % 2 ? 0 : 20 * R()), 5 + R() * 30]); p.push([99, 12 + R() * 16]); return p; })();
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  /* ---------- 2. measure ---------- */
  const mctx = document.createElement('canvas').getContext('2d');
  const wcache = {};
  function widthOf(t) {
    if (t.k === 'g') return GFX[t.type].min;
    const key = t.st + '|' + t.text;
    if (wcache[key] == null) {
      mctx.font = `${t.st === 'it' ? 'italic ' : ''}${t.st === 'b' ? 700 : 400} 100px ${FONT}`;
      wcache[key] = mctx.measureText(t.text).width / 100 * (t.st === 'sm' ? 0.5 : 1) + 0.02;
    }
    return wcache[key];
  }

  /* ---------- 3. break into lines, 4. find the size that fills the badge ---------- */
  function breakLines(tokens, We) {
    const units = [];
    tokens.forEach(t => { if (t.glue && units.length) units[units.length - 1].push(t); else units.push([t]); });
    const lines = [];
    let cur = [], w = 0;
    for (const unit of units) {
      const uw = unit.reduce((a, t) => a + widthOf(t), 0) + GAP * (unit.length - 1);
      if (uw > We) return null; // a word is wider than the badge at this size
      if (cur.length && w + GAP + uw > We) { lines.push(cur); cur = []; w = 0; }
      w += (cur.length ? GAP : 0) + uw;
      cur.push(...unit);
    }
    if (cur.length) lines.push(cur);
    return lines;
  }
  function fitSize(tokens, W, H) {
    for (let s = Math.min(160, H / 2.4); s >= 11; s -= 0.5) {
      const lines = breakLines(tokens, W / s);
      if (lines && (lines.length * LH + (lines.length - 1) * ROW) * s <= H) return s;
    }
    return 11;
  }

  // a line with nothing stretchy gets a filler graphic if there is room, so lines reach across the badge
  function fill(lines, We, seed, ints, u) {
    const R = rng(seed * 104729 + 71);
    const used = new Set();
    lines.forEach(l => l.forEach(t => { if (t.k === 'g') used.add(t.type); }));
    const pool = shuffle(FILLERS.slice(), R).sort((a, b) => used.has(a) - used.has(b));
    return lines.map(line => {
      const copy = line.slice();
      if (copy.some(t => t.k === 'g' && !GFX[t.type].fixed)) return copy;
      const used = copy.reduce((a, t) => a + widthOf(t), 0) + GAP * (copy.length - 1);
      const type = pool.find(p => GFX[p].min + GAP <= We - used);
      if (!type) return copy;
      pool.push(pool.splice(pool.indexOf(type), 1)[0]); // move to the back so fillers vary line to line
      const spots = [];
      for (let i = 0; i <= copy.length; i++) if (i === copy.length || !copy[i].glue) spots.push(i);
      copy.splice(spots[Math.floor(R() * spots.length)], 0, dress({ k: 'g', type }, R, ints, u));
      return copy;
    });
  }

  /* ---------- 5. draw ---------- */
  function gfxHTML(t) {
    const g = GFX[t.type];
    const st = [`--min:${g.min}em`, `--gr:${t.gr || 1}`];
    if (g.max) st.push(`--max:${g.max}em`);
    if (t.rot) st.push(`--rot:${t.rot}deg`);
    if (t.dy) st.push(`--dy:${t.dy}em`);
    let inner = '';
    switch (t.type) {
      case 'block': st.push(`--c:${CAT[t.id].color}`); inner = icon(t.id, t.side === 'left' ? 'l' : ''); break;
      case 'ghost': st.push(`--c:${CAT[t.id].color}`); inner = icon(t.id, 'o') + icon(t.id, 'f'); break;
      case 'img': st.push(`background-image:url(${t.src})`); break;
      case 'stack': inner = '<i></i><i></i><i></i>'; break;
      case 'pair': inner = '<i></i><i></i>'; break;
      case 'rgb': inner = '<i></i><i></i><i></i>'; break;
      case 'bar': st.push(`--p:${(t.p * 100).toFixed(1)}%`, `--mixc:${t.c}`); inner = '<i></i>'; break;
      case 'scribble': inner = `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${t.d}"/></svg>`; break;
      case 'wire': inner = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10H78V40H0ZM22 0H100V30H22ZM0 10 22 0M78 10 100 0M78 40 100 30M0 40 22 30M0 10 78 40"/></svg>'; break;
      case 'dots': {
        st.push(`--c:${CAT[t.id].color}`);
        const n = 9, grid = FX.grid(t.id, n);
        let c = '';
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = grid[y * n + x]; if (v > 0.35) c += `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="${(0.2 + 0.28 * v).toFixed(2)}"/>`; }
        inner = `<svg viewBox="0 0 ${n} ${n}" aria-hidden="true">${c}</svg>`;
        break;
      }
      case 'glitch': st.push(`--c:${CAT[t.id].color}`, `--c2:${CAT[t.id2].color}`); break;
    }
    return `<span class="cb__g g-${t.type}${g.fixed ? '' : ' el'}" style="${st.join(';')}">${inner}</span>`;
  }
  const wordHTML = t => `<span class="cb__w ${t.st}">${esc(t.text)}${t.under ? `<svg class="cb__under" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${t.under}"/></svg>` : ''}</span>`;
  const JUST = ['space-between', 'space-between', 'space-between', 'flex-end', 'flex-start'];
  const SOLO = ['flex-end', 'flex-start', 'center'];
  function lineHTML(line, R) {
    let html = '', run = [], items = 0;
    const flush = () => { if (run.length) { html += `<span class="cb__run">${run.join('')}</span>`; run = []; items++; } };
    line.forEach(t => {
      if (t.k === 'w') run.push(wordHTML(t));
      else if (t.inline && run.length) run.push(gfxHTML(t));
      else { flush(); html += gfxHTML(t); items++; }
    });
    flush();
    const just = items === 1 ? SOLO[Math.floor(R() * SOLO.length)] : JUST[Math.floor(R() * JUST.length)];
    return `<div class="cb__line" style="justify-content:${just}">${html}</div>`;
  }

  /** Lay the collage out inside `el` (the badge face). Returns false if the element has no size yet. */
  function render(el, u, ints) {
    const cs = getComputedStyle(el);
    const W = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(W > 60 && H > 60)) return false;
    const seed = (u.creative && u.creative.seed) || 1;
    let tokens = compose(u, ints, seed);
    const bottom = el.clientHeight - parseFloat(cs.paddingBottom);
    let s = fitSize(tokens, W, H);
    // never end on a line that is only graphics: drop them and let the type grow instead
    for (let k = 0; k < 3; k++) {
      const ls = breakLines(tokens, W / s), last = ls && ls[ls.length - 1];
      if (!ls || ls.length < 2 || last.some(t => t.k === 'w')) break;
      tokens = tokens.filter(t => !last.includes(t));
      s = fitSize(tokens, W, H);
    }
    for (let pass = 0; pass < 14; pass++) {
      const lines = breakLines(tokens, W / s);
      if (lines) {
        const R = rng(seed * 31 + 5);
        el.style.setProperty('--s', s.toFixed(2) + 'px');
        el.innerHTML = fill(lines, W / s, seed, ints, u).map(line => lineHTML(line, R)).join('');
        const rows = Array.from(el.children), last = rows[rows.length - 1];
        const tooTall = last.offsetTop + last.offsetHeight > bottom + 1;
        const tooWide = rows.some(r => { const a = r.firstElementChild, b = r.lastElementChild; return b.offsetLeft + b.offsetWidth - a.offsetLeft > W + 1; });
        if (!tooTall && !tooWide) return true;
      }
      s *= 0.96;
    }
    return true;
  }

  const ready = document.fonts && document.fonts.load
    ? Promise.all(['400 40px "Roboto Condensed"', 'italic 400 40px "Roboto Condensed"', '700 40px "Roboto Condensed"'].map(f => document.fonts.load(f))).then(() => { for (const k in wcache) delete wcache[k]; }).catch(() => {})
    : Promise.resolve();

  window.Creative = { render, sentence, bioWords, okImage, ready, BIO_WORDS, MAX_IMAGES };
})();
