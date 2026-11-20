/* Map: 2D place view (crowd by domain, zoom into people) + 3D breakout view (floors and rooms). */
(function () {
  const { CAT, CLUSTERS, FLOORS, ROOM, EVENTS, DAYS, FIRST, LAST, LOOKING, TYPES } = window.CHI;
  const A = window.APP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const W = 1000, H = 1500, YOU = { x: 500, y: 965 };
  // the area that must be visible at the widest zoom: every cluster with its label
  const FIT = { x0: 130, y0: 330, x1: 870, y1: 1390 };
  const ZMAX = 6, ZPEOPLE = 2;
  const st = { view: '2d', floor: null, room: null, filter: null };

  // seeded random so the crowd is stable between visits
  function rng(seed) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  const PEOPLE = [];
  (function () {
    const r = rng(27);
    CLUSTERS.forEach((c, ci) => {
      for (let i = 0; i < c.n; i++) {
        const a = r() * 6.2832, d = 18 + Math.sqrt(r()) * (34 + c.n * 3.2);
        PEOPLE.push({
          id: 'p' + ci + '-' + i, cat: c.cat, ci,
          x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.85,
          name: FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)],
          note: LOOKING[Math.floor(r() * LOOKING.length)],
        });
      }
    });
  })();

  /* ---------- base map artwork ---------- */
  function artwork() {
    const r = rng(5);
    // the street grid runs well past the venue so wide (desktop) and tall (phone) screens are both covered
    const xs = [], ys = [];
    for (let x = -2200; x <= 3320; x += 230) xs.push(x);
    for (let y = -1350; y <= 3150; y += 250) ys.push(y);
    let blocks = '';
    for (let yi = 0; yi < ys.length - 1; yi++) for (let xi = 0; xi < xs.length - 1; xi++) {
      const x = xs[xi] + 18, y = ys[yi] + 18, w = xs[xi + 1] - xs[xi] - 36, h = ys[yi + 1] - ys[yi] - 36;
      if (ys[yi] === -350 || ys[yi] === -100) continue; // river
      blocks += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="m-block"/>`;
      if (xs[xi] < -600 || xs[xi] > 1500 || ys[yi] < 150 || ys[yi] > 1700) continue; // detail only near the venue
      const n = 2 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) {
        const bw = 40 + r() * 70, bh = 40 + r() * 90;
        blocks += `<rect x="${(x + 10 + r() * (w - bw - 20)).toFixed(0)}" y="${(y + 10 + r() * (h - bh - 20)).toFixed(0)}" width="${bw.toFixed(0)}" height="${bh.toFixed(0)}" class="m-bldg"/>`;
      }
    }
    const bridges = [-590, -130, 330, 560, 790, 1250, 1710].map(x => `<g class="m-bridge"><line x1="${x}" y1="-350" x2="${x}" y2="150"/></g>`).join('');
    return `<g transform="rotate(-12 500 760)">
      <rect x="-2600" y="-1700" width="6300" height="5200" class="m-road"/>
      <rect x="-2600" y="-332" width="6300" height="464" class="m-river"/>
      <g class="m-waves">${[-220, -100, 20].map(y => `<line x1="-2600" y1="${y}" x2="3700" y2="${y}"/>`).join('')}</g>
      ${blocks}
      <rect x="118" y="1168" width="194" height="214" class="m-park"/>
      <rect x="808" y="418" width="194" height="214" class="m-park"/>
      ${bridges}
      <rect x="312" y="640" width="496" height="268" class="m-cc"/>
      <g class="m-ccgrid">${[0, 1, 2, 3, 4, 5, 6].map(i => `<line x1="${374 + i * 62}" y1="640" x2="${374 + i * 62}" y2="908"/>`).join('')}</g>
      <text x="560" y="868" class="m-cclabel" text-anchor="middle">Convention Center</text>
      <text x="560" y="385" class="m-label" text-anchor="middle">Liberty Ave</text>
      <text x="560" y="1136" class="m-label" text-anchor="middle">Penn Ave</text>
      <text x="200" y="-90" class="m-label m-label--river">Allegheny River</text>
      <text x="85" y="1000" class="m-label" transform="rotate(-90 85 1000)">10th St</text>
    </g>`;
  }

  /* ---------- screen ---------- */
  const MapScreen = {
    html(arg) {
      if (arg && arg[0] === 'room' && ROOM[arg[1]]) { st.view = '3d'; st.room = arg[1]; st.floor = ROOM[arg[1]].floor; }
      const present = CLUSTERS.map(c => c.cat);
      return `<section class="map" id="map" data-view="${st.view}">
        ${A.bar({ cls: 'bar--float' })}
        <div class="seg map__switch" role="tablist">
          <button role="tab" data-act="map-view" data-v="2d">Place</button>
          <button role="tab" data-act="map-view" data-v="3d">Breakout</button>
          <i></i>
        </div>

        <div class="m2d" id="m2d">
          <svg id="msvg" aria-hidden="true"><g id="mworld">${artwork()}</g></svg>
          <div class="marks" id="marks">
            <div class="mark mark--you" data-x="${YOU.x}" data-y="${YOU.y}"><span>${A.G.pin}</span><em>You</em></div>
            ${CLUSTERS.map((c, i) => `<button class="mark mark--cluster" data-act="map-cluster" data-i="${i}" data-cat="${c.cat}" data-x="${c.x}" data-y="${c.y}" style="--c:${CAT[c.cat].color}" aria-label="${CAT[c.cat].name}: ${c.n} people — zoom in"><span>${A.icon(c.cat)}<b>${c.n}</b></span><em>${CAT[c.cat].name.replace(' + ', ' +<br>')}</em></button>`).join('')}
            ${PEOPLE.map((p, i) => `<button class="mark mark--dot" data-act="map-person" data-i="${i}" data-cat="${p.cat}" data-x="${p.x.toFixed(1)}" data-y="${p.y.toFixed(1)}" style="--c:${CAT[p.cat].color};--d:${(i % 9) * 22}ms" aria-label="${p.name}, ${CAT[p.cat].name}"><span></span></button>`).join('')}
          </div>
          <div class="map__status"><b id="mmode">Crowd overview</b><span>${PEOPLE.length} people · ${CLUSTERS.length} groups</span></div>
          <p class="map__hint mono" id="mhint">Pinch or tap + to zoom</p>
          <div class="map__ctl">
            <button data-act="map-zoom" data-d="1" aria-label="Zoom in">+</button>
            <button data-act="map-zoom" data-d="-1" aria-label="Zoom out">−</button>
            <button data-act="map-home" aria-label="Recentre">${A.G.pin}</button>
          </div>
          <div class="fchips map__chips" id="mchips">
            <button class="fchip is-on" data-act="map-filter" data-cat="">Everyone</button>
            ${present.map(id => `<button class="fchip" style="--c:${CAT[id].color}" data-act="map-filter" data-cat="${id}">${A.icon(id)}${CAT[id].name}</button>`).join('')}
          </div>
          <div class="map__card" id="mcard" hidden></div>
        </div>

        <div class="m3d" id="m3d">
          <div class="iso" id="iso">
            <div class="iso__scene" id="scene">
              ${FLOORS.map((f, i) => `<div class="floor" data-floor="${f.id}" style="--k:${i}">
                <button class="floor__plate" data-act="map-floor" data-floor="${f.id}" aria-label="${f.name}, ${f.label}"></button>
                <span class="floor__tag">${f.id}</span>
                ${f.rooms.map(r => `<button class="room" data-act="map-room" data-room="${r.id}" aria-label="${r.name}" style="left:${r.x}%;top:${(r.y / 64 * 100).toFixed(2)}%;width:${r.w}%;height:${(r.h / 64 * 100).toFixed(2)}%;--c:${roomColor(r.id)}"><span>${r.code}</span></button>`).join('')}
              </div>`).join('')}
            </div>
          </div>
          <div class="lv" id="lv">
            ${FLOORS.slice().reverse().map(f => `<button data-act="map-floor" data-floor="${f.id}">${f.id}</button>`).join('')}
            <button data-act="map-floor" data-floor="" class="lv__all">All</button>
          </div>
          <div class="map__ctl map__ctl--3d">
            <button data-act="map-zoom3" data-d="1" aria-label="Zoom in">+</button>
            <button data-act="map-zoom3" data-d="-1" aria-label="Zoom out">−</button>
          </div>
          <p class="map__hint map__hint--3d mono">Drag to rotate · tap a level</p>
          <div class="map__panel" id="mpanel"></div>
        </div>
      </section>`;
    },
    mount() {
      const off2 = mount2d();
      const off3 = mount3d();
      setView(st.view, true);
      return () => { off2(); off3(); };
    },
  };

  function roomColor(id) {
    const n = {};
    EVENTS.forEach(e => { if (e.room === id) n[e.cat] = (n[e.cat] || 0) + 1; });
    const top = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
    return top ? CAT[top].color : '#6a6a6a';
  }

  function setView(v, instant) {
    st.view = v;
    const m = $('#map'); if (!m) return;
    m.dataset.view = v;
    $$('.map__switch button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    if (v === '3d') paint3d();
  }

  /* ---------- 2D ---------- */
  let V = null; // live view state
  function mount2d() {
    const box = $('#m2d'), world = $('#mworld'), svg = $('#msvg'), marks = $$('#marks .mark');
    const pos = marks.map(m => ({ el: m, x: +m.dataset.x, y: +m.dataset.y }));
    const v = V = { z: 1, cx: 500, cy: 760, vw: 1, vh: 1, base: 1, raf: 0, anim: 0, home: { x: 500, y: 760 }, placed: false };

    function measure() {
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height) return;
      v.vw = r.width; v.vh = r.height; v.left = r.left; v.top = r.top;
      // fit the crowd into the space left free by the floating controls, whatever the screen shape
      const top = 200, bottom = 84;
      v.base = Math.max(0.3, Math.min(v.vw / (FIT.x1 - FIT.x0), (v.vh - top - bottom) / (FIT.y1 - FIT.y0)));
      v.home = { x: (FIT.x0 + FIT.x1) / 2, y: (FIT.y0 + FIT.y1) / 2 - (top - bottom) / 2 / v.base };
      if (!v.placed || v.z <= 1.001) { v.cx = v.home.x; v.cy = v.home.y; v.placed = true; }
      svg.setAttribute('viewBox', `0 0 ${v.vw} ${v.vh}`);
      clampView(); draw();
    }
    function clampView() {
      v.z = Math.min(ZMAX, Math.max(1, v.z));
      // the centre of the view stays inside the mapped area; the street grid extends beyond it
      v.cx = Math.min(W, Math.max(0, v.cx));
      v.cy = Math.min(H, Math.max(0, v.cy));
    }
    function draw() {
      const s = v.base * v.z, tx = v.vw / 2 - v.cx * s, ty = v.vh / 2 - v.cy * s;
      world.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`);
      for (const p of pos) p.el.style.transform = `translate(${(p.x * s + tx).toFixed(1)}px,${(p.y * s + ty).toFixed(1)}px)`;
      const zoomed = v.z >= ZPEOPLE;
      if (box.classList.contains('is-zoomed') !== zoomed) {
        box.classList.toggle('is-zoomed', zoomed);
        $('#mmode').textContent = zoomed ? 'Nearby people' : 'Crowd overview';
        $('#mhint').textContent = zoomed ? 'Tap a person' : 'Pinch or tap + to zoom';
        if (!zoomed) hideCard();
      }
    }
    const schedule = () => { if (!v.raf) v.raf = requestAnimationFrame(() => { v.raf = 0; draw(); }); };

    function zoomAt(f, px, py) {
      // keep the world point under (px,py) fixed while zooming
      const s0 = v.base * v.z;
      const wx = v.cx + (px - v.vw / 2) / s0, wy = v.cy + (py - v.vh / 2) / s0;
      v.z = Math.min(ZMAX, Math.max(1, v.z * f));
      const s1 = v.base * v.z;
      v.cx = wx - (px - v.vw / 2) / s1; v.cy = wy - (py - v.vh / 2) / s1;
      clampView(); schedule();
    }
    function flyTo(x, y, z, ms) {
      cancelAnimationFrame(v.anim);
      const a = { z: v.z, x: v.cx, y: v.cy }, t0 = performance.now(), dur = window.FX.reduced ? 0 : (ms || 520);
      const step = now => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - t, 3);
        v.z = a.z + (z - a.z) * e; v.cx = a.x + (x - a.x) * e; v.cy = a.y + (y - a.y) * e;
        clampView(); draw();
        if (t < 1) v.anim = requestAnimationFrame(step);
      };
      v.anim = requestAnimationFrame(step);
    }
    v.flyTo = flyTo; v.zoomAt = zoomAt;

    // gestures
    const pts = new Map();
    let moved = 0, pinch = 0, lastTap = 0;
    const local = e => ({ x: e.clientX - v.left, y: e.clientY - v.top });
    function down(e) {
      if (e.target.closest('.map__ctl, .map__chips, .map__card, .map__status')) return;
      cancelAnimationFrame(v.anim);
      const r = box.getBoundingClientRect(); v.left = r.left; v.top = r.top;
      pts.set(e.pointerId, local(e));
      moved = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    }
    function move(e) {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = local(e);
      pts.set(e.pointerId, cur);
      if (pts.size === 1) {
        const dx = cur.x - prev.x, dy = cur.y - prev.y, s = v.base * v.z;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 4) { v.cx -= dx / s; v.cy -= dy / s; clampView(); schedule(); box.classList.add('is-drag'); }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = d; moved = 99;
      }
    }
    function up(e) {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId); pinch = 0; box.classList.remove('is-drag');
      if (moved <= 4 && !e.target.closest('.mark--cluster, .mark--dot')) {
        const now = performance.now();
        if (now - lastTap < 320) { flyZoom(1.8, p.x, p.y); lastTap = 0; } else { lastTap = now; hideCard(); }
      }
    }
    function flyZoom(f, px, py) {
      const s0 = v.base * v.z, z1 = Math.min(ZMAX, Math.max(1, v.z * f)), s1 = v.base * z1;
      const wx = v.cx + (px - v.vw / 2) / s0, wy = v.cy + (py - v.vh / 2) / s0;
      flyTo(wx - (px - v.vw / 2) / s1, wy - (py - v.vh / 2) / s1, z1, 320);
    }
    v.flyZoom = flyZoom;
    const wheel = e => { e.preventDefault(); const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.0022), p.x, p.y); };
    const swallow = e => { if (moved > 4) { e.stopPropagation(); e.preventDefault(); } };

    box.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    box.addEventListener('wheel', wheel, { passive: false });
    box.addEventListener('click', swallow, true);
    window.addEventListener('resize', measure);
    measure();
    applyFilter();

    return () => {
      cancelAnimationFrame(v.raf); cancelAnimationFrame(v.anim);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('resize', measure);
      V = null;
    };
  }

  function applyFilter() {
    $$('#marks .mark[data-cat]').forEach(m => m.classList.toggle('is-dim', !!st.filter && m.dataset.cat !== st.filter));
    $$('#mchips .fchip').forEach(b => b.classList.toggle('is-on', (b.dataset.cat || null) === st.filter));
  }
  function hideCard() { const c = $('#mcard'); if (c && !c.hidden) { c.hidden = true; $$('.mark--dot.is-sel').forEach(d => d.classList.remove('is-sel')); } }

  /* ---------- 3D ---------- */
  const R3 = { rz: -40, zoom: 1 };
  function mount3d() {
    const iso = $('#iso');
    const apply = () => { iso.style.setProperty('--rz', R3.rz + 'deg'); iso.style.setProperty('--zoom', R3.zoom); };
    apply();
    R3.apply = apply;
    const pts = new Map();
    let moved = 0, pinch = 0;
    function down(e) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } }
    function move(e) {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = { x: e.clientX, y: e.clientY };
      pts.set(e.pointerId, cur);
      if (pts.size === 1) {
        const dx = cur.x - prev.x;
        moved += Math.abs(dx) + Math.abs(cur.y - prev.y);
        if (moved > 6) { R3.rz -= dx * 0.4; iso.classList.add('is-drag'); apply(); }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) { R3.zoom = Math.min(2.4, Math.max(0.7, R3.zoom * d / pinch)); apply(); }
        pinch = d; moved = 99;
      }
    }
    function up(e) { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); pinch = 0; iso.classList.remove('is-drag'); }
    const swallow = e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } };
    const wheel = e => { e.preventDefault(); R3.zoom = Math.min(2.4, Math.max(0.7, R3.zoom * Math.exp(-e.deltaY * 0.002))); apply(); };
    iso.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    iso.addEventListener('click', swallow, true);
    iso.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }

  function paint3d() {
    const scene = $('#scene'); if (!scene) return;
    const fi = st.floor ? FLOORS.findIndex(f => f.id === st.floor) : -1;
    scene.classList.toggle('has-sel', fi >= 0);
    $$('.floor', scene).forEach((el, i) => {
      el.classList.toggle('is-sel', i === fi);
      el.classList.toggle('is-above', fi >= 0 && i > fi);
      el.classList.toggle('is-below', fi >= 0 && i < fi);
    });
    $$('.room', scene).forEach(r => r.classList.toggle('is-sel', r.dataset.room === st.room));
    $$('#lv button').forEach(b => b.classList.toggle('is-on', (b.dataset.floor || null) === st.floor));

    const panel = $('#mpanel');
    if (st.room) {
      const r = ROOM[st.room], f = FLOORS[r.floorIndex];
      const evs = EVENTS.filter(e => e.room === r.id);
      panel.innerHTML = `<div class="panel__h"><button class="iconbtn" data-act="map-room" data-room="" aria-label="Back to ${f.name}">${A.G.back}</button><div><p class="mono">${f.name} · ${f.label}</p><h3>${r.name}</h3></div></div>
        <div class="panel__list">${evs.length ? evs.map(e => `<div class="pev" style="--c:${CAT[e.cat].color}" data-act="event" data-id="${e.id}" role="button" tabindex="0">
            <span class="pev__ico">${A.icon(e.cat)}</span>
            <span class="pev__t"><span class="mono">${DAYS[e.day].dow} ${e.start}–${e.end} · ${TYPES[e.type]}</span><b>${A.esc(e.title)}</b></span>
            ${A.addBtn(e.id)}
          </div>`).join('') : '<p class="dim panel__none">Nothing scheduled here — a good place to catch your breath.</p>'}</div>`;
    } else if (fi >= 0) {
      const f = FLOORS[fi];
      panel.innerHTML = `<div class="panel__h"><div><p class="mono">${f.label}</p><h3>${f.name}</h3></div><span class="mono dim">${f.rooms.length} spaces</span></div>
        <div class="panel__rooms">${f.rooms.map(r => { const n = EVENTS.filter(e => e.room === r.id).length; return `<button class="proom" data-act="map-room" data-room="${r.id}" style="--c:${roomColor(r.id)}"><i></i><b>${r.name}</b><span class="mono">${n ? n + ' event' + (n > 1 ? 's' : '') : '—'}</span></button>`; }).join('')}</div>`;
    } else {
      panel.innerHTML = `<div class="panel__h"><div><p class="mono">David L. Lawrence Convention Center</p><h3>Four levels, one roof</h3></div></div>
        <div class="panel__rooms">${FLOORS.slice().reverse().map(f => `<button class="proom" data-act="map-floor" data-floor="${f.id}" style="--c:#fff"><i></i><b>${f.name} · ${f.label}</b><span class="mono">${f.rooms.length} spaces</span></button>`).join('')}</div>`;
    }
    panel.classList.remove('rise'); void panel.offsetWidth; panel.classList.add('rise');
  }

  /* ---------- actions ---------- */
  Object.assign(A.actions, {
    'map-view'(el) { setView(el.dataset.v); },
    'map-zoom'(el) { if (V) V.flyZoom(+el.dataset.d > 0 ? 1.7 : 1 / 1.7, V.vw / 2, V.vh / 2); },
    'map-home'() { if (V) { st.filter = null; applyFilter(); V.flyTo(V.home.x, V.home.y, 1); } },
    'map-cluster'(el) { const c = CLUSTERS[+el.dataset.i]; V && V.flyTo(c.x, c.y, 2.5, 620); },
    'map-filter'(el) {
      st.filter = el.dataset.cat || null; applyFilter();
      if (!V) return;
      if (st.filter) { const c = CLUSTERS.find(x => x.cat === st.filter); V.flyTo(c.x, c.y, 2.5, 620); } else V.flyTo(V.home.x, V.home.y, 1);
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    },
    'map-person'(el) {
      const p = PEOPLE[+el.dataset.i], c = CAT[p.cat], card = $('#mcard');
      $$('.mark--dot.is-sel').forEach(d => d.classList.remove('is-sel'));
      el.classList.add('is-sel');
      card.style.setProperty('--c', c.color);
      card.innerHTML = `<span class="pcard__ico">${A.icon(p.cat)}</span><div><b>${p.name}</b><span class="mono">${c.name}</span><p>${p.note}</p></div><button class="btn btn--primary btn--sm" data-act="map-wave" data-i="${el.dataset.i}">Say hi</button>`;
      card.hidden = false; card.classList.remove('rise'); void card.offsetWidth; card.classList.add('rise');
    },
    'map-wave'(el) { A.toast(`You waved at ${PEOPLE[+el.dataset.i].name.split(' ')[0]}`); hideCard(); },
    'map-floor'(el) { const f = el.dataset.floor || null; st.floor = st.floor === f && !st.room ? null : f; st.room = null; paint3d(); },
    'map-room'(el) { const id = el.dataset.room || null; st.room = id; if (id) st.floor = ROOM[id].floor; paint3d(); },
    'map-zoom3'(el) { R3.zoom = Math.min(2.4, Math.max(0.7, R3.zoom * (+el.dataset.d > 0 ? 1.25 : 0.8))); R3.apply(); },
  });

  A.screens.map = MapScreen;
})();
