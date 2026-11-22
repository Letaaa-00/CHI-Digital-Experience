/* Map: the levels of the David L. Lawrence Convention Center as a floor plan.
   The first time the map is opened a short animation shows every level as an exploded 3D stack, picks out
   Level 2 (where you are) and settles into its 2D plan, and the controls fade in around it. Once that has
   played, the map opens straight on the 2D plan. A 3D / 2D switch flips between the plan and a 3D view focused on that level.
   Rooms are coloured by the domain of what's on in them now (or next). People on your level show as one icon per group when
   zoomed out; zooming in spreads each group into coloured dots, following the zoom continuously. Tap a group
   to zoom into it, tap a dot to see who it is, or tap anywhere else in a room to see what's on there now and how
   full it is. Each room's plan label carries five dots showing how full it is right now: amber when it's almost
   full, all five red when it's full.
   The level list on the left switches between levels; in 3D, tapping another level moves to it too.

   Everything is drawn into one SVG from a small orthographic camera, so the 3D view, the 2D plan and every
   step between them are the same scene seen from different angles. */
(function () {
  const { CATS, CAT, FLOORS, ROOM, EVENTS, DAYS, TYPES, FIRST, LAST, LOOKING } = window.CHI;
  const A = window.APP;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- scene ---------- */
  const PW = 120, PH = 50;            // the site, in plan units: river along the top, Penn Ave along the bottom
  const SLAB = 3, WALL = 4.5;         // floor-slab thickness and the wall height of an ordinary meeting room
  const TALLEST = Math.max(...FLOORS.flatMap(f => f.rooms.concat(f.spaces).map(a => a.tall || 1)));
  // an area's outline: its own shape where it has one, otherwise its rectangle
  const outline = a => a.pts || [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x, a.y + a.h]];
  const GAP = 40;                     // vertical spacing between levels in the exploded and 3D views
  const MINE = 1;                     // you are on Level 2
  const YOU = { x: 40.5, y: 8 };      // in the Level 2 concourse, between the escalators
  const DEG = Math.PI / 180;
  const VIEW3D = { yaw: -30 * DEG, pitch: 56 * DEG };
  const SPREAD = [1.45, 2.3];         // zoom range over which groups open up into individual dots

  const rng = seed => { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- what's on now ----------
     During the conference this is the real time in Pittsburgh. Before or after it, the map shows a preview
     at a fixed moment (Tuesday 11:30), so the room cards always have something to show. */
  const DEMO = { day: 1, time: '11:30' };
  let clockAt = 0, clockVal = null;
  function clock() {
    if (Date.now() - clockAt < 1000) return clockVal;
    clockAt = Date.now();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map(p => [p.type, p.value]));
    const day = +parts.year === 2027 && +parts.month === 5 ? DAYS.findIndex(d => d.d === +parts.day) : -1;
    return (clockVal = day >= 0 ? { day, time: `${parts.hour}:${parts.minute}`, live: true } : { ...DEMO, live: false });
  }
  // how many people are in a room right now. There is no live feed yet, so this is a stand-in: steady for a
  // given room and half-hour, busy while something is on, quiet otherwise; the exhibit halls are open all day.
  const hash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  // events that draw a set crowd for as long as they run: the AI demos fill Hall B, Usable Privacy nearly fills 303
  const CROWD = { e41: 1, e13: 0.95 };
  function occupancy(rm, now, on) {
    if (!rm.cap) return null;
    const slot = now.time.slice(0, 2) + (now.time.slice(3) < '30' ? 'a' : 'b'), h = hash('#' + rm.id + now.day + slot);
    const set = on.find(e => CROWD[e.id]);
    const pct = set ? CROWD[set.id] : on.length ? Math.min(1, 0.55 + h * 0.6) : /^hall/.test(rm.id) ? 0.2 + h * 0.2 : h * 0.1;
    const n = Math.round(pct * rm.cap);
    const full = n >= rm.cap, near = !full && pct >= 0.85;
    // five dots: one per fifth of the room, at least one if anyone is there, all five only when it's full
    const dots = full ? 5 : Math.min(4, Math.max(n > 0 ? 1 : 0, Math.round((n / rm.cap) * 5)));
    return { n, cap: rm.cap, pct: n / rm.cap, full, near, dots, state: full ? 'Full' : near ? 'Almost full' : pct >= 0.55 ? 'Filling up' : 'Plenty of room' };
  }
  function roomNow(id) {
    const now = clock(), evs = EVENTS.filter(e => e.room === id).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    const on = evs.filter(e => e.day === now.day && e.start <= now.time && now.time < e.end);
    const next = evs.find(e => e.day > now.day || (e.day === now.day && e.start > now.time));
    return { now, on, next, occ: occupancy(ROOM[id], now, on) };
  }

  // a room takes the colour of what's on in it now, or of the next thing on there; grey when nothing is
  const roomCat = id => { const { on, next } = roomNow(id); return on.length ? on[0].cat : next ? next.cat : null; };

  // people on your level, in small mixed groups: a few per room, a few in the concourse. Each group leans towards
  // one domain (a room's groups mostly towards what's on there) with others mixed in; its icon shows the majority.
  const GROUPS = [], PEOPLE = [];
  (function () {
    const r = rng(27), f = FLOORS[MINE];
    const pick = (not) => { let c; do c = CATS[Math.floor(r() * CATS.length)].id; while (c === not); return c; };
    // the k-th of K groups in an area sits in its own slice along the area's long side, clear of the edges
    const group = (box, main, k = 0, K = 1, mixed = 0.25) => {
      const long = box.w >= box.h, len = (long ? box.w : box.h) / K;
      const cx = long ? box.x + len * (k + 0.5) : box.x + box.w / 2, cy = long ? box.y + box.h / 2 : box.y + len * (k + 0.5);
      const jx = (long ? len : box.w) * 0.18, jy = (long ? box.h : len) * 0.18;
      const g = { x: cx + (r() - 0.5) * jx, y: cy + (r() - 0.5) * jy + (long ? box.h * 0.08 : 0), n: (box.busy ? 12 : 4) + Math.floor(r() * 5) };
      const rad = Math.min(long ? len : box.w, long ? box.h : len) * 0.2;
      for (let i = 0; i < g.n; i++) {
        const a = r() * 6.2832, d = 1.2 + Math.sqrt(r()) * rad;
        const x = Math.min(box.x + box.w - 1.5, Math.max(box.x + 1.5, g.x + Math.cos(a) * d));
        const y = Math.min(box.y + box.h - 1.5, Math.max(box.y + 1.5, g.y + Math.sin(a) * d * 0.8));
        PEOPLE.push({ cat: r() < mixed ? pick(main) : main, x, y, g: GROUPS.length });
      }
      // the group's icon is whichever domain most of its people share
      const n = {};
      PEOPLE.filter(p => p.g === GROUPS.length).forEach(p => { n[p.cat] = (n[p.cat] || 0) + 1; });
      g.cat = Object.keys(n).sort((a, b) => n[b] - n[a])[0];
      GROUPS.push(g);
    };
    // in a room, the groups lean towards what's on there except the last, which leans elsewhere;
    // a full room has two big groups
    f.rooms.forEach(room => {
      const cat = roomCat(room.id) || pick(), occ = roomNow(room.id).occ, full = !!(occ && occ.full);
      const K = full ? 2 : room.w * room.h > 900 ? 3 : 2;
      for (let k = 0; k < K; k++) group({ ...room, busy: full }, k < K - 1 ? cat : pick(cat), k, K);
    });
    f.spaces.filter(s => !s.kind).forEach(s => { for (let k = 0; k < 3; k++) group(s, pick(), k, 3, 0.4); });
    PEOPLE.forEach(p => {
      p.name = FIRST[Math.floor(r() * FIRST.length)] + ' ' + LAST[Math.floor(r() * LAST.length)];
      p.note = LOOKING[Math.floor(r() * LOOKING.length)];
    });
    // keep the group mark where its people actually are
    GROUPS.forEach((g, gi) => {
      const ps = PEOPLE.filter(p => p.g === gi);
      g.x = ps.reduce((a, p) => a + p.x, 0) / ps.length; g.y = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    });
  })();

  /* ---------- camera ----------
     P holds everything that animates: camera angles, level spacing, how visible each level is,
     how far the other levels have been pushed away, and the reader's own zoom and pan. */
  const st = { view: '2d', floor: MINE, room: null, filter: null, pick: null }; // pick: the room whose card is open
  let P = null;
  let portrait = false; // on tall screens the plan is turned a quarter so the long side runs down the screen
  const planYaw = () => (portrait ? -90 * DEG : 0);

  function preset(kind, floor) {
    const others = i => i !== floor;
    const flat = FLOORS.map(() => 0), focus = floor;
    if (kind === 'stack') return { yaw: VIEW3D.yaw, pitch: VIEW3D.pitch, gap: 3, focus, vis: flat.slice(), lift: flat.slice(), fitAll: 1, people: 0, labels: 0, z: 0.9, px: 0, py: 0 };
    if (kind === 'exploded') return { yaw: VIEW3D.yaw, pitch: VIEW3D.pitch, gap: GAP, focus, vis: FLOORS.map(() => 1), lift: flat.slice(), fitAll: 1, people: 0, labels: 1, z: 1, px: 0, py: 0 };
    if (kind === 'pick') return { ...preset('exploded', floor), vis: FLOORS.map((_, i) => (others(i) ? 0.2 : 1)) };
    // 3d: the level in focus, with the others faint and pushed a little further apart so they don't crowd it
    if (kind === '3d') return { yaw: VIEW3D.yaw, pitch: VIEW3D.pitch, gap: GAP, focus, vis: FLOORS.map((_, i) => (others(i) ? 0.16 : 1)), lift: FLOORS.map((_, i) => (i > floor ? 14 : i < floor ? -8 : 0)), fitAll: portrait ? 0.1 : 0.5, people: 1, labels: 1, z: 1, px: 0, py: 0 };
    // 2d: looking straight down at one level; the others have moved out of the way
    return { yaw: planYaw(), pitch: 0, gap: GAP, focus, vis: FLOORS.map((_, i) => (others(i) ? 0 : 1)), lift: FLOORS.map((_, i) => (i > floor ? 40 : i < floor ? -40 : 0)), fitAll: 0, people: 1, labels: 1, z: 1, px: 0, py: 0 };
  }
  function mix(a, b, t) {
    const o = {};
    for (const k in b) o[k] = Array.isArray(b[k]) ? b[k].map((v, i) => lerp(a[k][i], v, t)) : lerp(a[k], b[k], t);
    return o;
  }

  // world → screen for a parameter set, fitted into the free area of the screen.
  // The plan keeps clear of the controls on both sides; the 3D view sits lower and can use the full width.
  function camera(p, areas) {
    const k = Math.min(1, p.pitch / VIEW3D.pitch), area = {};
    for (const key in areas.plan) area[key] = lerp(areas.plan[key], areas.tilted[key], k);
    const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
    const base = i => (i - p.focus) * p.gap + p.lift[i];
    const raw = (x, y, z) => {
      const X = x - PW / 2, Y = y - PH / 2;
      const rx = X * cy - Y * sy, ry = X * sy + Y * cy;
      return [rx, ry * cp - z * sp, ry * sp + z * cp];
    };
    // fit: blend between framing every level and framing just the one in focus
    const bounds = list => {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      list.forEach(i => {
        const z = base(i), pl = FLOORS[i].plate;
        [[pl.x, pl.y], [pl.x + pl.w, pl.y], [pl.x + pl.w, pl.y + pl.h], [pl.x, pl.y + pl.h]].forEach(([x, y]) => [z - SLAB, z + WALL * TALLEST].forEach(zz => {
          const [a, b] = raw(x, y, zz); x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
        }));
      });
      return [x0, y0, x1, y1];
    };
    // the level in focus can sit between two levels while moving from one to the other
    const lo = Math.floor(p.focus), hi = Math.ceil(p.focus), b0 = bounds([lo]), b1 = hi === lo ? b0 : bounds([hi]);
    const all = bounds(FLOORS.map((_, i) => i)), one = b0.map((v, k) => lerp(v, b1[k], p.focus - lo));
    const bb = all.map((v, k) => lerp(one[k], v, p.fitAll));
    const aw = area.x1 - area.x0, ah = area.y1 - area.y0;
    const s0 = Math.max(0.5, Math.min(aw / (bb[2] - bb[0]), ah / (bb[3] - bb[1])));
    const vcx = (area.x0 + area.x1) / 2, vcy = (area.y0 + area.y1) / 2, mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
    const s = s0 * p.z;
    const proj = (x, y, z) => {
      const [a1, b1, d] = raw(x, y, z);
      return [vcx + (a1 - mx) * s + p.px, vcy + (b1 - my) * s + p.py, d];
    };
    return { proj, base, s, vcx, vcy, cy, sy };
  }

  /* ---------- screen ---------- */
  const MapScreen = {
    html(arg) {
      st.room = null; st.floor = MINE; st.filter = null; st.view = '2d';
      if (arg && arg[0] === 'room' && ROOM[arg[1]]) { st.room = arg[1]; st.floor = ROOM[arg[1]].floorIndex; }
      const cats = CATS.filter(c => GROUPS.some(g => g.cat === c.id));
      // on a first visit the controls stay out of sight until the arrival animation has settled into the plan
      return `<section class="map${A.seen('map') ? '' : ' is-first'}" id="map" data-view="2d" aria-label="Venue map">
        ${A.bar({ cls: 'bar--float' })}
        <div class="fp" id="fp">
          <svg class="fp__svg" id="fpsvg" aria-hidden="true"></svg>
          <div class="fp__people" id="fppl">
            ${PEOPLE.map((p, i) => `<span class="pd" data-cat="${p.cat}" style="--c:${CAT[p.cat].color}"><i role="button" tabindex="-1" data-act="map-person" data-i="${i}" aria-label="${A.esc(p.name)}, ${CAT[p.cat].name}"></i></span>`).join('')}
            ${GROUPS.map((g, i) => `<span class="pg" data-cat="${g.cat}" style="--c:${CAT[g.cat].color}"><span role="button" tabindex="-1" data-act="map-group" data-i="${i}" aria-label="${g.n} people, ${CAT[g.cat].name} — zoom in">${A.icon(g.cat)}</span></span>`).join('')}
            <span class="pp--you"><span>${A.G.pin}</span><em>You</em></span>
          </div>
        </div>
        <div class="map__side">
          <div class="lv" id="lv" role="tablist" aria-label="Levels">
            ${FLOORS.map((f, i) => ({ f, i })).reverse().map(({ f, i }) => `<button role="tab" data-act="map-floor" data-f="${i}" aria-label="${f.name}, ${f.label}${i === MINE ? ' — you are here' : ''}">L${i + 1}${i === MINE ? '<i aria-hidden="true"></i>' : ''}</button>`).join('')}
          </div>
          <button class="map__locate" data-act="map-locate" aria-label="Show my location">${A.G.pin}</button>
        </div>
        <div class="seg map__switch" role="tablist" aria-label="Map view">
          <button role="tab" data-act="map-view" data-v="3d">3D</button>
          <button role="tab" data-act="map-view" data-v="2d">2D</button>
          <i></i>
        </div>
        <div class="fchips map__chips" id="mchips">
          <button class="fchip is-on" data-act="map-filter" data-cat="">Everyone</button>
          ${cats.map(c => `<button class="fchip" style="--c:${c.color}" data-act="map-filter" data-cat="${c.id}">${A.icon(c.id)}${c.name}</button>`).join('')}
        </div>
        <div class="map__card" id="mcard" hidden></div>
      </section>`;
    },
    mount() { return mountPlan(); },
  };

  /* ---------- rendering ---------- */
  let R = null; // live renderer
  function mountPlan() {
    const box = $('#fp'), svg = $('#fpsvg');
    const dots = $$('#fppl .pd'), groups = $$('#fppl .pg'), you = $('#fppl .pp--you');
    const r = R = { vw: 1, vh: 1, frame: 0, tween: 0, intro: !A.seen('map') }; // the arrival plays until it has been seen once

    function measure() {
      const b = box.getBoundingClientRect();
      if (!b.width) return;
      r.vw = b.width; r.vh = b.height; r.left = b.left; r.top = b.top;
      // keep the plan clear of the floating controls
      const wide = r.vw >= 1100;
      const plan = { x0: wide ? 120 : 76, x1: r.vw - (wide ? 120 : 24), y0: wide ? 170 : 168, y1: r.vh - (wide ? 100 : 96) };
      r.areas = { plan, tilted: wide ? plan : { x0: 12, x1: r.vw - 12, y0: 150, y1: r.vh - 96 } };
      r.area = plan;
      const was = portrait;
      portrait = (r.area.y1 - r.area.y0) > (r.area.x1 - r.area.x0) * 1.1;
      if (P && was !== portrait && st.view === '2d' && !r.intro) P = { ...P, yaw: planYaw() };
      svg.setAttribute('viewBox', `0 0 ${r.vw} ${r.vh}`);
      draw();
    }

    const pt = q => q[0].toFixed(1) + ',' + q[1].toFixed(1);
    const poly = (pts, attrs) => `<polygon points="${pts.map(pt).join(' ')}" ${attrs}/>`;

    function draw() {
      r.frame = 0;
      if (!P) return;
      const c = camera(P, r.areas), out = [];
      const tilt = Math.min(1, P.pitch / VIEW3D.pitch); // 0 in the plan, 1 in full 3D
      const flat = tilt < 0.5;
      FLOORS.forEach((f, i) => {
        const o = P.vis[i];
        if (o < 0.01) return;
        const z = c.base(i), pl = f.plate, dim = rid => st.filter && roomCat(rid) !== st.filter;
        const quad = (x, y, w, h, zz) => [c.proj(x, y, zz), c.proj(x + w, y, zz), c.proj(x + w, y + h, zz), c.proj(x, y + h, zz)];
        const at = (a, zz) => outline(a).map(([x, y]) => c.proj(x, y, zz));
        const screenBox = a => {
          const q = at(a, z);
          return { x0: Math.min(...q.map(v => v[0])), x1: Math.max(...q.map(v => v[0])), y0: Math.min(...q.map(v => v[1])), y1: Math.max(...q.map(v => v[1])) };
        };
        // in 3D, any other level can be tapped to move to it
        const ghost = i !== st.floor && tilt > 0.5 && !r.intro;
        out.push(`<g opacity="${o.toFixed(3)}"${ghost ? ` class="fp-ghost" data-act="map-floor" data-f="${i}" aria-label="${f.name}"` : ''}>`);

        // slab edges, split into bands under the rooms that sit on each outside wall
        if (tilt > 0.02) {
          const X0 = pl.x, Y0 = pl.y, X1 = pl.x + pl.w, Y1 = pl.y + pl.h;
          [
            { n: [0, 1], along: 'x', at: Y1, from: X0, to: X1 },
            { n: [1, 0], along: 'y', at: X1, from: Y0, to: Y1 },
            { n: [0, -1], along: 'x', at: Y0, from: X0, to: X1 },
            { n: [-1, 0], along: 'y', at: X0, from: Y0, to: Y1 },
          ].forEach(sd => {
            if (sd.n[0] * c.sy + sd.n[1] * c.cy <= 0.001) return; // faces away
            const near = rm => (sd.along === 'x' ? Math.abs((sd.n[1] > 0 ? rm.y + rm.h : rm.y) - sd.at) <= 3 : Math.abs((sd.n[0] > 0 ? rm.x + rm.w : rm.x) - sd.at) <= 3);
            const cuts = [[sd.from, sd.to, null]];
            f.rooms.filter(near).forEach(rm => cuts.push(sd.along === 'x' ? [rm.x, rm.x + rm.w, rm] : [rm.y, rm.y + rm.h, rm]));
            const at = t => (sd.along === 'x' ? [t, sd.at] : [sd.at, t]);
            cuts.forEach(([t0, t1, rm]) => {
              const [x0, y0] = at(t0), [x1, y1] = at(t1);
              const q = [c.proj(x0, y0, z), c.proj(x1, y1, z), c.proj(x1, y1, z - SLAB), c.proj(x0, y0, z - SLAB)];
              const cat = rm && roomCat(rm.id);
              out.push(poly(q, `fill="${cat ? CAT[cat].color : '#2c2c2c'}"${cat && dim(rm.id) ? ' fill-opacity=".25"' : ''}`));
            });
          });
        }

        // floor plate, shared spaces, rooms
        out.push(poly(quad(pl.x, pl.y, pl.w, pl.h, z), 'class="fp-plate"'));
        f.spaces.forEach(sp => out.push(poly(at(sp, z), `class="fp-space fp-space--${sp.kind || 'open'}"`)));
        f.rooms.forEach(rm => {
          const cat = roomCat(rm.id), col = cat ? CAT[cat].color : '#9a9a9a', d = dim(rm.id), sel = st.room === rm.id;
          const tap = i === st.floor ? ` class="fp-room" data-act="map-room" data-room="${rm.id}"` : '';
          out.push(poly(at(rm, z), `${tap} fill="${col}" fill-opacity="${d ? 0.06 : cat ? 0.3 : 0.1}" stroke="${d ? '#555' : col}" stroke-width="${sel ? 3.5 : 2}" stroke-linejoin="round"`));
        });

        // walls: light, see-through panels, as tall as each space is, drawn back to front
        if (tilt > 0.02) {
          const walls = [];
          f.rooms.concat(f.spaces.filter(sp => sp.kind === 'core' || sp.kind === 'room' || sp.kind === 'hall')).forEach(rm => {
            const pts = outline(rm), hgt = WALL * (rm.tall || 1) * tilt;
            pts.forEach(([x0, y0], k) => {
              const [x1, y1] = pts[(k + 1) % pts.length];
              if (x0 === x1 && y0 === y1) return;
              const q = [c.proj(x0, y0, z), c.proj(x1, y1, z), c.proj(x1, y1, z + hgt), c.proj(x0, y0, z + hgt)];
              walls.push({ q, d: (q[0][2] + q[1][2]) / 2 });
            });
          });
          walls.sort((a, b) => a.d - b.d).forEach(w => out.push(poly(w.q, 'class="fp-wall"')));
        }

        // highlighted room (from "Find the room"), and the room whose card is open
        if (st.room && ROOM[st.room].floorIndex === i) out.push(poly(at(ROOM[st.room], z + 0.01), 'class="fp-sel"'));
        if (st.pick && ROOM[st.pick].floorIndex === i) out.push(poly(at(ROOM[st.pick], z + 0.02), 'class="fp-pick"'));

        // labels: room names only (the colour carries the domain)
        if (P.labels > 0.01) {
          out.push(`<g opacity="${P.labels.toFixed(3)}">`);
          const fits = (t, px, bw) => t.length * px + 14 < bw;
          f.rooms.forEach(rm => {
            const b = screenBox(rm), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
            if (!fits(rm.code, 7.6, bw) || bh < 22) return;
            // rectangles are labelled in their top-left corner on the plan; shaped rooms (and every room in 3D) in the middle
            const corner = flat && !rm.pts;
            const x = corner ? b.x0 + 7 : (b.x0 + b.x1) / 2, y = corner ? b.y0 + 16 : (b.y0 + b.y1) / 2 + 4;
            out.push(`<text class="fp-code" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${corner ? 'start' : 'middle'}">${A.esc(rm.code)}</text>`);
            const occ = flat && i === st.floor && roomNow(rm.id).occ;
            if (occ && bw >= 46 && bh >= 30) {
              const gap = 8, x0 = corner ? x + 2.5 : x - gap * 2, cy = y + 9, cls = occ.full ? ' is-full' : occ.near ? ' is-near' : '';
              for (let k = 0; k < 5; k++) out.push(`<circle class="fp-occ${k < occ.dots ? ' is-on' + cls : ''}" cx="${(x0 + k * gap).toFixed(1)}" cy="${cy.toFixed(1)}" r="2.6"/>`);
            }
          });
          if (flat) f.spaces.forEach(sp => {
            const b = screenBox(sp);
            if (!fits(sp.code, 7.4, b.x1 - b.x0) || b.y1 - b.y0 < 18) return;
            out.push(`<text class="fp-space-t" x="${(b.x0 + 7).toFixed(1)}" y="${(b.y0 + 14).toFixed(1)}">${sp.code}</text>`);
          });

          if (flat && i === st.floor) {
            const fade = clamp01(1 - tilt * 2).toFixed(2);
            // the surroundings, written along the outside of the site so the plan reads in either orientation
            [['ALLEGHENY RIVER', PW / 2, -3.2, 0], ['PENN AVE', PW / 2, PH + 3.2, 0], ['10TH ST', -3.2, PH / 2, 1], ['11TH ST', PW + 3.2, PH / 2, 1]].forEach(([t, x, y, vert]) => {
              const q = c.proj(x, y, z), e0 = c.proj(vert ? x : 0, vert ? 0 : y, z), e1 = c.proj(vert ? x : 1, vert ? 1 : y, z);
              let ang = Math.atan2(e1[1] - e0[1], e1[0] - e0[0]) / DEG;
              if (ang > 90) ang -= 180;
              if (ang < -90) ang += 180;
              out.push(`<text class="fp-street${t.includes('RIVER') ? ' fp-street--river' : ''}" x="${q[0].toFixed(1)}" y="${q[1].toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${ang.toFixed(1)} ${q[0].toFixed(1)} ${q[1].toFixed(1)})" opacity="${fade}">${t}</text>`);
            });
          }
          // level name along the front edge of the slab, like a label painted on its side
          if (tilt > 0.2) {
            const s0 = c.proj(pl.x, pl.y + pl.h, z), s1 = c.proj(pl.x + 1, pl.y + pl.h, z), s2 = c.proj(pl.x, pl.y + pl.h, z - SLAB);
            const ux = s1[0] - s0[0], uy = s1[1] - s0[1], vx = (s2[0] - s0[0]) / SLAB, vy = (s2[1] - s0[1]) / SLAB;
            out.push(`<text class="fp-level" transform="matrix(${ux.toFixed(4)} ${uy.toFixed(4)} ${vx.toFixed(4)} ${vy.toFixed(4)} ${s0[0].toFixed(1)} ${s0[1].toFixed(1)})" x="${pl.w - 2}" y="${(SLAB * 0.76).toFixed(2)}" font-size="${(SLAB * 0.66).toFixed(2)}" text-anchor="end" opacity="${tilt.toFixed(2)}">${f.name.toUpperCase()}</text>`);
          }
          out.push('</g>');
        }
        out.push('</g>');
      });
      // in 3D the level in focus takes taps first where another level overlaps it on screen
      if (tilt > 0.5) {
        const f = FLOORS[st.floor], z = c.base(st.floor), at = a => outline(a).map(([x, y]) => c.proj(x, y, z));
        out.push(`<g class="fp-hit">${poly(at(f.plate), '')}${f.rooms.map(rm => poly(at(rm), `data-act="map-room" data-room="${rm.id}"`)).join('')}</g>`);
      }
      svg.innerHTML = out.join('');

      // people on your level: groups when zoomed out, opening into dots as you zoom in
      const pv = P.vis[MINE] * P.people, zM = c.base(MINE) + 0.4;
      const t = smooth(SPREAD[0], SPREAD[1], P.z);
      box.style.setProperty('--pv', pv.toFixed(3));
      box.style.setProperty('--spread', t.toFixed(3));
      box.style.setProperty('--ps', (1 - 0.3 * tilt).toFixed(3)); // marks shrink a little in 3D
      box.classList.toggle('is-spread', t > 0.6);             // dots can be tapped once they have opened up
      box.classList.toggle('no-people', pv < 0.5);
      if (r.card === 'person' && (pv < 0.5 || t < 0.6)) hideCard();
      const gq = GROUPS.map(g => c.proj(g.x, g.y, zM));
      groups.forEach((el, k) => { el.style.transform = `translate(${gq[k][0].toFixed(1)}px,${gq[k][1].toFixed(1)}px)`; });
      dots.forEach((el, k) => {
        const p = PEOPLE[k], q = c.proj(p.x, p.y, zM), g = gq[p.g];
        el.style.transform = `translate(${lerp(g[0], q[0], t).toFixed(1)}px,${lerp(g[1], q[1], t).toFixed(1)}px)`;
      });
      const y = c.proj(YOU.x, YOU.y, zM);
      you.style.transform = `translate(${y[0].toFixed(1)}px,${y[1].toFixed(1)}px)`;
    }
    const redraw = () => { if (!r.frame) r.frame = requestAnimationFrame(draw); };
    r.redraw = redraw;

    /* tweening between parameter sets */
    // A tween always runs to the end. If the reader drags, pinches or scrolls while it runs, they take over
    // zoom and pan from that moment and the tween carries on with everything else (angle, level, fading),
    // so the view can never be left stranded between two levels.
    function tweenTo(target, ms, done, curve) {
      cancelAnimationFrame(r.tween);
      r.hands = false;
      const from = P, t0 = performance.now(), dur = window.FX.reduced ? 0 : ms, f = curve || easeInOut;
      const step = now => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        const next = mix(from, target, f(t));
        if (r.hands) { next.z = P.z; next.px = P.px; next.py = P.py; }
        P = next; draw();
        if (t < 1) r.tween = requestAnimationFrame(step); else if (done) done();
      };
      r.tween = requestAnimationFrame(step);
    }
    r.tweenTo = tweenTo;

    // the arrival sequence: stack → exploded → pick your level → settle into its plan
    function intro() {
      if (window.FX.reduced) { endIntro(); return; }
      P = preset('stack', st.floor);
      tweenTo({ ...preset('exploded', st.floor), labels: 0 }, 1000, () => setTimeout(() => {
        if (!r.intro) return;
        tweenTo(preset('pick', st.floor), 600, () => setTimeout(() => {
          if (!r.intro) return;
          tweenTo(preset('2d', st.floor), 1300, settled);
        }, 250));
      }, 250), ease);
    }
    // the arrival is over (played through, or skipped with a tap). On a first visit this is when the
    // controls fade in around the plan: the 3D / 2D switch, the level list and the filter chips.
    function settled() {
      r.intro = false; box.classList.remove('is-intro');
      const m = $('#map');
      if (m && m.classList.contains('is-first')) { m.classList.replace('is-first', 'is-ready'); A.markSeen('map'); }
    }
    function endIntro() {
      if (!r.intro) return;
      settled();
      cancelAnimationFrame(r.tween);
      P = preset('2d', st.floor); draw();
    }
    r.endIntro = endIntro;

    /* gestures: drag to pan, pinch or wheel to zoom (around the pointer) */
    const pts = new Map();
    let moved = 0, pinch = 0;
    const local = e => ({ x: e.clientX - r.left, y: e.clientY - r.top });
    function clampPan() {
      const lim = Math.max(r.vw, r.vh) * 0.6 * P.z;
      P.px = Math.max(-lim, Math.min(lim, P.px)); P.py = Math.max(-lim, Math.min(lim, P.py));
    }
    function zoomAt(f, x, y) {
      const z1 = Math.min(5, Math.max(0.6, P.z * f)), k = z1 / P.z;
      const { vcx, vcy } = camera(P, r.areas); // zoom around the pointer, relative to the current view's centre
      P = { ...P, z: z1, px: (x - vcx) - ((x - vcx) - P.px) * k, py: (y - vcy) - ((y - vcy) - P.py) * k };
      r.hands = true; clampPan(); redraw();
    }
    function down(e) {
      if (e.target.closest('.map__side, .map__chips, .map__switch, .bar')) return;
      if (r.intro) { endIntro(); return; } // a tap skips the arrival animation
      r.hands = true; // take over zoom and pan; a level change already under way still finishes
      const b = box.getBoundingClientRect(); r.left = b.left; r.top = b.top;
      pts.set(e.pointerId, local(e)); moved = 0;
      if (pts.size === 2) { const [a, b2] = [...pts.values()]; pinch = Math.hypot(a.x - b2.x, a.y - b2.y); }
    }
    function move(e) {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = local(e);
      pts.set(e.pointerId, cur);
      if (pts.size === 1) {
        const dx = cur.x - prev.x, dy = cur.y - prev.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 4) { P = { ...P, px: P.px + dx, py: P.py + dy }; r.hands = true; clampPan(); redraw(); box.classList.add('is-drag'); }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = d; moved = 99;
      }
    }
    function up(e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId); pinch = 0; box.classList.remove('is-drag');
      if (moved <= 4 && !e.target.closest('[data-act]')) hideCard();
    }
    const swallow = e => { if (moved > 4) { e.stopPropagation(); e.preventDefault(); } };
    const wheel = e => { e.preventDefault(); if (r.intro) endIntro(); const p = local(e); zoomAt(Math.exp(-e.deltaY * 0.0022), p.x, p.y); };

    box.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    box.addEventListener('wheel', wheel, { passive: false });
    box.addEventListener('click', swallow, true);
    window.addEventListener('resize', measure);

    box.classList.toggle('is-intro', r.intro);
    setView('2d');
    paintLevels();
    if (!r.intro) P = preset('2d', st.floor); // seen before: no arrival, straight to the plan
    measure();
    applyFilter();
    if (r.intro) intro();

    return () => {
      cancelAnimationFrame(r.frame); cancelAnimationFrame(r.tween); r.intro = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('resize', measure);
      R = null;
    };
  }

  function setView(v) {
    st.view = v;
    const m = $('#map'); if (!m) return;
    m.dataset.view = v;
    $$('.map__switch button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
  }
  function paintLevels() {
    $$('#lv button').forEach(b => { const on = +b.dataset.f === st.floor; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
  }
  function hideCard() {
    const c = $('#mcard'); if (!c || c.hidden) return;
    c.hidden = true; c.classList.remove('is-room'); if (R) R.card = false;
    $$('#fppl .pd.is-sel').forEach(d => d.classList.remove('is-sel'));
    if (st.pick) { st.pick = null; if (R) R.redraw(); }
  }
  function goFloor(i) {
    if (!R) return;
    R.endIntro(); hideCard();
    st.floor = i; paintLevels();
    R.tweenTo(preset(st.view, i), 900);
  }
  function applyFilter() {
    $$('#fppl [data-cat]').forEach(d => d.classList.toggle('is-dim', !!st.filter && d.dataset.cat !== st.filter));
    $$('#mchips .fchip').forEach(b => b.classList.toggle('is-on', (b.dataset.cat || null) === st.filter));
    if (R) R.redraw();
  }

  const closeBtn = `<button class="mcard__x" data-act="map-close" aria-label="Close">${A.G.close}</button>`;

  /* ---------- actions ---------- */
  Object.assign(A.actions, {
    'map-view'(el) {
      if (!R || (el.dataset.v === st.view && !R.intro)) return;
      R.endIntro();
      setView(el.dataset.v);
      R.tweenTo(preset(el.dataset.v, st.floor), el.dataset.v === '3d' ? 900 : 1000);
    },
    'map-locate'() {
      if (!R) return;
      R.endIntro();
      st.floor = MINE; paintLevels(); hideCard();
      // centre on you: find where you sit with no zoom or pan, then zoom in and pan that offset away
      const base = preset(st.view, st.floor), c = camera(base, R.areas), q = c.proj(YOU.x, YOU.y, c.base(MINE) + 0.4);
      const z = st.view === '3d' ? 1.8 : 2.4;
      R.tweenTo({ ...base, z, px: -(q[0] - c.vcx) * z, py: -(q[1] - c.vcy) * z }, 800);
    },
    'map-floor'(el) { if (+el.dataset.f !== st.floor || (R && R.intro)) goFloor(+el.dataset.f); },
    'map-group'(el) {
      // zoom into a group until it has opened into dots, centred on it
      if (!R) return;
      const g = GROUPS[+el.dataset.i], base = preset(st.view, st.floor), c = camera(base, R.areas);
      const q = c.proj(g.x, g.y, c.base(MINE) + 0.4), z = Math.max(P.z, SPREAD[1] + 0.5);
      R.tweenTo({ ...base, z, px: -(q[0] - c.vcx) * z, py: -(q[1] - c.vcy) * z }, 700);
    },
    'map-person'(el) {
      const p = PEOPLE[+el.dataset.i], c = CAT[p.cat], card = $('#mcard');
      $$('#fppl .pd.is-sel').forEach(d => d.classList.remove('is-sel'));
      el.parentNode.classList.add('is-sel');
      card.style.setProperty('--c', c.color);
      card.innerHTML = `<span class="pcard__ico">${A.icon(p.cat)}</span><div><b>${A.esc(p.name)}</b><span class="lbl">${c.name}</span><p>${A.esc(p.note)}</p></div><button class="btn btn--primary btn--sm" data-act="map-wave" data-i="${el.dataset.i}">Say hi</button>${closeBtn}`;
      if (st.pick) { st.pick = null; R && R.redraw(); }
      card.classList.remove('is-room');
      card.hidden = false; if (R) R.card = 'person';
      card.classList.remove('rise'); void card.offsetWidth; card.classList.add('rise');
    },
    'map-room'(el) {
      // at any zoom: dots sit above the rooms, so a tap on a dot still goes to that person
      if (!R || R.intro) return;
      const rm = ROOM[el.dataset.room], f = FLOORS[rm.floorIndex], cat = roomCat(rm.id), { now, on, next, occ } = roomNow(rm.id);
      const row = (e, tag) => `<button class="rcard__ev" data-act="event" data-id="${e.id}" style="--c:${CAT[e.cat].color}">
          <span class="lbl">${tag} · ${tag === 'Now' ? '' : DAYS[e.day].dow + ' '}${e.start}–${e.end} · ${TYPES[e.type]}</span><b>${A.esc(e.title)}</b><span class="rcard__go">${A.G.arrow}</span></button>`;
      const num = v => v.toLocaleString('en-US');
      const occHtml = occ ? `<div class="rcard__occ${occ.full ? ' is-full' : occ.near ? ' is-near' : ''}"><div class="rcard__dots" aria-hidden="true">${[0, 1, 2, 3, 4].map(k => `<i${k < occ.dots ? ' class="is-on"' : ''}></i>`).join('')}</div>
          <p><b>${occ.full ? 'Full' : num(occ.n)}</b> ${occ.full ? `· ${num(occ.n)} of ${num(occ.cap)} people` : `of ${num(occ.cap)} people · <em>${occ.state}</em>`}</p></div>` : '';
      const card = $('#mcard');
      $$('#fppl .pd.is-sel').forEach(d => d.classList.remove('is-sel'));
      card.style.setProperty('--c', cat ? CAT[cat].color : '#9a9a9a');
      card.innerHTML = `${closeBtn}<div class="rcard__h"><i></i><div><b>${A.esc(rm.name)}</b><span class="lbl">${f.name} · ${now.live ? 'Now' : 'Preview'} · ${DAYS[now.day].dow} ${now.time}</span></div></div>
        ${occHtml}
        ${on.length ? on.map(e => row(e, 'Now')).join('') : '<p class="rcard__none">Nothing on right now.</p>'}
        ${next ? row(next, 'Next') : on.length ? '' : '<p class="rcard__none dim">Nothing else scheduled here.</p>'}`;
      card.classList.add('is-room');
      card.hidden = false; R.card = 'room';
      card.classList.remove('rise'); void card.offsetWidth; card.classList.add('rise');
      st.pick = rm.id; R.redraw();
    },
    'map-close'() { hideCard(); },
    'map-wave'(el) { A.toast(`You waved at ${PEOPLE[+el.dataset.i].name.split(' ')[0]}`); hideCard(); },
    'map-filter'(el) {
      st.filter = el.dataset.cat || null; applyFilter();
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    },
  });

  A.screens.map = MapScreen;
})();
