/* CHI 2027 — mobile web prototype. Hash-routed, no build step. */
(function () {
  const ICONS = window.CHI_ICONS;
  const { CATS, CAT, PILLARS, DAYS, TYPES, PROGRAMS, FLOORS, ROOM, EVENTS, EVENT, PRESENTERS, ROLES, TOPICS, INFO } = window.CHI;
  const FX = window.FX, Creative = window.Creative;

  const app = document.getElementById('app');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- state ---------- */
  const KEY = 'chi27-proto-v1';
  const blank = () => ({ mode: null, user: null, schedule: [], checks: {} });
  let S = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return blank(); } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; /* private mode or storage full — keep in memory */ } };

  const newSetup = () => ({ step: 0, name: '', email: '', role: null, mix: [1 / 3, 1 / 3, 1 / 3], topics: [] });
  const UI = { evDay: 0, evCat: null, evType: null, dashDay: 0, flipped: false, setup: newSetup() };

  /* ---------- small pieces ---------- */
  const G = {
    arrow: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    back: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    plus: '<svg class="g g-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    check: '<svg class="g g-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    qr: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor"/></svg>',
    close: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    pin: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.500" r="2.200" fill="currentColor"/></svg>',
    edit: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.500 8.500l-4-4L4 16v4zM13 7l4 4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    lock: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  };

  function icon(id, cls) {
    const i = ICONS[id];
    return `<svg class="ico ${cls || ''}" viewBox="${i.vb}" fill="currentColor"${i.even ? ' fill-rule="evenodd"' : ''} aria-hidden="true">${i.body}</svg>`;
  }
  function onColor(hex) {
    const c = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.2 ? '#000' : '#fff';
  }
  const dayLabel = d => `${DAYS[d].dow} May ${DAYS[d].d}`;
  const mins = t => +t.slice(0, 2) * 60 + +t.slice(3);
  const floorOf = roomId => FLOORS[ROOM[roomId].floorIndex];
  const whereLabel = roomId => `${ROOM[roomId].name} · ${floorOf(roomId).name}`;

  function mixBar(mix, legend) {
    const s = mix[0] + mix[1] + mix[2] || 1;
    const p = mix.map(v => Math.round(v / s * 100));
    return `<div class="mix"><div class="mix__bar">${['g', 'r', 'b'].map((k, i) => (mix[i] / s < 0.004 ? '' : `<span style="flex:${mix[i] / s};background:var(--${k})"></span>`)).join('')}</div>${
      legend ? `<ul class="mix__legend">${PILLARS.map((pl, i) => `<li><i style="background:${pl.color}"></i>${pl.name}<b>${p[i]}%</b></li>`).join('')}</ul>` : ''}</div>`;
  }

  const logo = href => `<a class="logo" href="${href}" aria-label="CHI 2027"><b>CHI</b><span>27</span><i><s></s><s></s><s></s></i></a>`;
  function bar(opts) {
    opts = opts || {};
    const cur = current(), n = S.schedule.length;
    // desktop shows the menu inline; phones and tablets get the hamburger
    const nav = `<nav class="bar__nav" aria-label="Main">${NAV.map(([r, name]) => `<a href="#/${r}"${cur === r ? ' class="is-cur" aria-current="page"' : ''}>${name}${r === 'dashboard' ? `<em data-sched-count${n ? '' : ' hidden'}>${n}</em>` : ''}</a>`).join('')}${S.user ? '' : `<button class="btn btn--primary btn--sm" data-go="join">Join</button>`}</nav>`;
    return `<header class="bar ${opts.cls || ''}">
      ${opts.back != null ? `<button class="iconbtn" data-act="back" data-to="${opts.back}" aria-label="Back">${G.back}</button>` : logo(opts.onboarding ? '#/' : '#/home')}
      ${opts.right != null ? opts.right : nav + `<button class="burger" data-act="menu" aria-label="Open menu" aria-haspopup="dialog"><i></i><i></i></button>`}
    </header>`;
  }
  const wide = window.matchMedia('(min-width: 760px)');
  const split = window.matchMedia('(min-width: 900px)');
  const secHead = (title, extra) => `<div class="sec-h"><h2>${title}</h2>${extra || ''}</div>`;

  /* ---------- schedule ---------- */
  const myPresentations = () => (S.user && S.user.presenter && PRESENTERS[S.user.email] ? PRESENTERS[S.user.email].presentations : []);
  const presentingAt = id => myPresentations().find(p => p.event === id);
  const inSched = id => S.schedule.includes(id);
  const sortEv = (a, b) => a.day - b.day || mins(a.start) - mins(b.start);

  function addBtn(id) {
    if (presentingAt(id)) return `<span class="add add--locked" title="You’re presenting here">${G.lock}</span>`;
    const on = inSched(id);
    return `<button class="add ${on ? 'is-on' : ''}" data-act="toggle" data-id="${id}" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} my schedule">${G.plus}${G.check}</button>`;
  }
  function toggleSched(id) {
    const had = S.user ? interestsOf(S.user).map(x => x.id) : [];
    const on = !inSched(id);
    S.schedule = on ? S.schedule.concat(id) : S.schedule.filter(x => x !== id);
    save();
    $$(`.add[data-id="${id}"]`).forEach(b => {
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', (on ? 'Remove from' : 'Add to') + ' my schedule');
      if (on) { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    });
    const e = EVENT[id];
    const has = S.user ? interestsOf(S.user).map(x => x.id) : [];
    const gained = has.find(x => !had.includes(x));
    const link = current() === 'dashboard' ? null : { label: 'View', go: 'dashboard' };
    if (on) {
      const clash = S.schedule.map(x => EVENT[x]).find(o => o.id !== id && o.day === e.day && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
      toast(gained ? `${CAT[gained].name} joins your badge — ${ALSO_EVENTS} events saved` : clash ? `Added — overlaps with “${clash.title}”` : `Added to ${dayLabel(e.day)}`, link);
      UI.dashDay = e.day;
    } else toast('Removed from your schedule');
    if (current() === 'dashboard') {
      Dashboard.paintSchedule();
      if (has.join() !== had.join()) Dashboard.paintProfile();
    }
    updateBurger();
  }

  function evCard(e, opts) {
    opts = opts || {};
    const c = CAT[e.cat];
    const mine = presentingAt(e.id);
    return `<article class="ev" style="--c:${c.color}" data-act="event" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(e.title)}">
      <div class="ev__ico">${icon(e.cat)}</div>
      <div class="ev__body">
        <p class="lbl ev__meta"><span>${opts.day ? DAYS[e.day].dow + ' ' : ''}${e.start}–${e.end}</span><span>${TYPES[e.type]}</span></p>
        <h3>${esc(e.title)}</h3>
        <p class="ev__where">${ROOM[e.room].name}</p>
        ${mine ? `<span class="tag tag--solid">You’re presenting</span>` : ''}${e.apply ? `<span class="tag">Apply to join</span>` : ''}
      </div>
      ${addBtn(e.id)}
    </article>`;
  }

  /* ---------- toast / sheet / menu ---------- */
  const toastEl = document.getElementById('toast');
  let toastT = 0;
  function toast(msg, action) {
    toastEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button data-go="${action.go}">${action.label}</button>` : ''}`;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  }

  const sheetEl = document.getElementById('sheet');
  let sheetReturn = null;
  function openSheet(html) {
    sheetReturn = document.activeElement;
    sheetEl.innerHTML = `<div class="sheet__scrim" data-act="close-sheet"></div><div class="sheet__panel" role="dialog" aria-modal="true"><button class="iconbtn sheet__x" data-act="close-sheet" aria-label="Close">${G.close}</button>${html}</div>`;
    sheetEl.hidden = false;
    requestAnimationFrame(() => sheetEl.classList.add('is-on'));
    const x = $('.sheet__x', sheetEl); x && x.focus({ preventScroll: true });
  }
  function closeSheet(now) {
    if (sheetEl.hidden) return;
    sheetEl.classList.remove('is-on');
    const done = () => { sheetEl.hidden = true; sheetEl.innerHTML = ''; };
    now ? done() : setTimeout(done, 320);
    if (sheetReturn && sheetReturn.focus && !now) sheetReturn.focus({ preventScroll: true });
  }

  function eventSheet(id) {
    const e = EVENT[id], c = CAT[e.cat], mine = presentingAt(id);
    const onMap = parts()[0] === 'map'; // already on the map: no need to send them there
    openSheet(`<div class="evd" style="--c:${c.color}">
      <div class="evd__top"><div class="evd__ico">${icon(e.cat)}</div><p class="lbl">${TYPES[e.type]}<br><span>${c.name}</span></p></div>
      <h2>${esc(e.title)}</h2>
      ${mine ? `<p class="tag tag--solid">You’re presenting · ${mine.slot}</p>` : ''}
      <p class="evd__blurb">${esc(e.blurb)}</p>
      <dl class="kv">
        <div><dt>When</dt><dd>${dayLabel(e.day)}<br>${e.start} – ${e.end}</dd></div>
        <div><dt>Where</dt><dd>${ROOM[e.room].name}<br>${floorOf(e.room).name}</dd></div>
        <div><dt>Who</dt><dd>${esc(e.people)}</dd></div>
        <div><dt>Access</dt><dd>${e.apply ? 'Attendees and visitors · separate application required' : 'Open to attendees and visitors'}</dd></div>
      </dl>
      <div class="evd__actions">
        ${mine ? '' : `<button class="btn btn--primary ${inSched(id) ? 'is-on' : ''}" data-act="toggle-sheet" data-id="${id}">${inSched(id) ? 'In my schedule — remove' : 'Add to my schedule'}</button>`}
        ${onMap ? '' : `<button class="btn btn--ghost" data-go="map/room/${e.room}">${G.pin} Find the room</button>`}
      </div>
    </div>`);
  }

  const menuEl = document.getElementById('menu');
  const NAV = [['home', 'Home'], ['events', 'Events'], ['map', 'Map'], ['about', 'About'], ['dashboard', 'My Dashboard']];
  function openMenu() {
    const cur = current();
    const who = S.user ? `Signed in as <b>${esc(S.user.name)}</b>` : 'Browsing in <b>guest mode</b>';
    menuEl.innerHTML = `<div class="menu__top">${logo('#/home')}<button class="burger is-open" data-act="close-menu" aria-label="Close menu"><i></i><i></i></button></div>
      <nav class="menu__nav">${NAV.map(([r, n], i) => `<a href="#/${r}" class="${cur === r ? 'is-cur' : ''}" style="--i:${i}"><span class="lbl">0${i + 1}</span><b>${n}</b>${r === 'dashboard' && S.schedule.length ? `<em>${S.schedule.length}</em>` : ''}</a>`).join('')}</nav>
      <div class="menu__foot" style="--i:6">
        <p>${who}</p>
        <div>${S.user ? `<button class="btn btn--ghost btn--sm" data-act="logout">Log out</button>` : `<button class="btn btn--primary btn--sm" data-go="join">Join Conference</button>`}
        <button class="btn btn--text btn--sm" data-act="reset">Reset prototype</button></div>
        <p class="lbl dim">${INFO.dates} · ${INFO.city}</p>
      </div>`;
    menuEl.hidden = false;
    requestAnimationFrame(() => menuEl.classList.add('is-on'));
  }
  function closeMenu(now) {
    if (menuEl.hidden) return;
    menuEl.classList.remove('is-on');
    const done = () => { menuEl.hidden = true; menuEl.innerHTML = ''; };
    now ? done() : setTimeout(done, 380);
  }
  function updateBurger() {
    $$('[data-sched-count]').forEach(el => { el.textContent = S.schedule.length; el.hidden = !S.schedule.length; });
  }

  /* ---------- interest scoring ---------- */
  // a domain's score = how close its mix sits to the person's mix + points from the topics they picked;
  // the two highest are the person's primary and secondary interest
  function rank(mix, topics) {
    const sc = {};
    CATS.forEach(c => {
      const m = c.mix.map(v => v / 100);
      sc[c.id] = 10 * (1 - Math.hypot(m[0] - mix[0], m[1] - mix[1], m[2] - mix[2]) / 1.2);
    });
    topics.forEach(n => { const t = TOPICS.find(x => x.name === n); if (t) { sc[t.a] += 6; sc[t.b] += 3; } });
    return CATS.map(c => c.id).sort((a, b) => sc[b] - sc[a]);
  }
  // Everyone starts with those two. A further domain joins the badge once the person has saved
  // ALSO_EVENTS events from it to their schedule (ALSO_MAX further domains at most).
  const ALSO_EVENTS = 3, ALSO_MAX = 2;
  function interestsOf(u) {
    const n = {};
    S.schedule.forEach(id => { const e = EVENT[id]; if (e) n[e.cat] = (n[e.cat] || 0) + 1; });
    const also = CATS.map(c => c.id).filter(id => id !== u.primary && id !== u.secondary && n[id] >= ALSO_EVENTS)
      .sort((a, b) => n[b] - n[a]).slice(0, ALSO_MAX);
    return [{ id: u.primary, kind: 'Primary' }, { id: u.secondary, kind: 'Secondary' }].concat(also.map(id => ({ id, kind: 'Also' })));
  }
  // creative-badge settings, always in a known shape. bio is the person's own sentence; '' means "use the suggested one".
  function creativeOf(u) {
    const c = u.creative || {};
    let h = 0; for (const ch of u.name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    u.creative = {
      v: 2, bio: c.v === 2 && typeof c.bio === 'string' ? c.bio : '', seed: c.seed || 1 + (h % 900),
      images: (Array.isArray(c.images) ? c.images : []).filter(Creative.okImage).slice(0, Creative.MAX_IMAGES),
    };
    return u.creative;
  }
  // uploaded images are shrunk and kept in this browser only
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        const x = c.getContext('2d');
        x.fillStyle = '#1e1e1e'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('unreadable')); };
      img.src = url;
    });
  }
  async function addImages(files) {
    const cr = creativeOf(S.user);
    let bad = 0;
    for (const f of Array.from(files)) {
      if (cr.images.length >= Creative.MAX_IMAGES) break;
      if (!/^image\//.test(f.type)) { bad++; continue; }
      try {
        cr.images.push(await shrink(f));
        if (!save()) { cr.images.pop(); toast('No room left on this device for that image'); break; }
      } catch (e) { bad++; }
    }
    if (bad) toast(bad === 1 ? 'One file wasn’t an image we could read' : `${bad} files weren’t images we could read`);
    Dashboard.paintEditor();
  }
  function recommend(limit) {
    const u = S.user;
    let pool = EVENTS.filter(e => !inSched(e.id) && !presentingAt(e.id));
    const w = e => (u ? (e.cat === u.primary ? 5 : e.cat === u.secondary ? 2.5 : 0) : 0) + (e.type === 'keynote' ? 1.5 : 0);
    return pool.map(e => [w(e), e]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0] || sortEv(a[1], b[1])).slice(0, limit).map(x => x[1]);
  }

  /* ======================================================================
     Screens
     ====================================================================== */

  /* ---------- 1. Landing ---------- */
  const Landing = {
    html() {
      const u = S.user;
      return `<section class="landing">
        ${bar({ onboarding: true, right: '<span class="lbl dim">ACM SIGCHI</span>', cls: 'bar--clear' })}
        <div class="landing__title">
          <p class="lbl">Conference on Human Factors<br>in Computing Systems</p>
          <h1>CHI<br>2027</h1>
        </div>
        <div class="landing__stage">
          <canvas class="pix" id="pix" aria-hidden="true"></canvas>
          <p class="lbl landing__now"><i id="pixdot"></i><span id="pixname">&nbsp;</span></p>
        </div>
        <div class="landing__foot">
          <dl class="facts">
            <div><dt class="lbl">When</dt><dd>${INFO.dates}</dd></div>
            <div><dt class="lbl">Where</dt><dd>${INFO.city}<small>${INFO.venue}</small></dd></div>
          </dl>
          ${u ? `<button class="btn btn--primary" data-go="dashboard">Continue as ${esc(u.name.split(' ')[0])} ${G.arrow}</button>
                 <button class="btn btn--text" data-go="home">Go to the conference home</button>`
              : `<button class="btn btn--primary" data-go="join">Join Conference ${G.arrow}</button>
                 <button class="btn btn--text" data-go="login">Already have an account? <u>Log in</u></button>`}
        </div>
      </section>`;
    },
    mount() {
      const ids = CATS.map(c => c.id).sort(() => Math.random() - 0.5);
      const f = FX.field($('#pix'), {
        ids, cy: () => (split.matches ? 0.5 : 0.6),
        onChange(id) {
          const n = $('#pixname'), d = $('#pixdot');
          if (!n) return;
          n.textContent = CAT[id].name; d.style.background = CAT[id].color;
          n.classList.remove('flip'); void n.offsetWidth; n.classList.add('flip');
        },
      });
      return () => f.destroy();
    },
  };

  /* ---------- 2. Join: attendee / visitor / guest ---------- */
  const Join = {
    html() {
      return `<section class="join stagger">
        ${bar({ back: '', right: '', cls: 'bar--clear' })}
        <h1 class="display">How are you<br>joining us?</h1>
        <button class="role" data-act="mode" data-mode="attendee" style="--c:var(--g)">
          <span class="lbl">Attendee</span>
          <span class="role__glyph"><i class="sq"></i><i class="ci"></i></span>
          <b>I’m attending CHI.</b>
          <span class="role__line">Plan around sessions and meet people with shared interests.</span>
          <span class="role__go">${G.arrow}</span>
        </button>
        <button class="role" data-act="mode" data-mode="visitor" style="--c:var(--r)">
          <span class="lbl">Visitor</span>
          <span class="role__glyph"><i class="ci"></i><i class="ci ci--o"></i></span>
          <b>I’m a visitor.</b>
          <span class="role__line">Explore talks, demos, meet-ups and receptions — all open to visitors.</span>
          <span class="role__go">${G.arrow}</span>
        </button>
        <div class="join__guest">
          <button class="btn btn--text" data-act="mode" data-mode="guest">Just looking around? <u>Continue as guest</u></button>
        </div>
      </section>`;
    },
  };

  /* ---------- 3. Setup: badge + interest questions ---------- */
  const STEPS = ['you', 'role', 'mix', 'topics'];
  const TRI = { A: [0.5, 0.16], B: [0.1, 0.84], C: [0.9, 0.84] }; // communities / methods / behaviors
  const Setup = {
    html() {
      if (!S.mode || S.mode === 'guest') S.mode = 'attendee';
      return `<section class="setup">
        ${bar({ back: '@setup', right: `<span class="lbl dim" id="stepno"></span>`, cls: 'bar--clear' })}
        <div class="prog" id="prog">${STEPS.map(() => '<i></i>').join('')}</div>
        <div class="setup__body" id="step"></div>
        <div class="setup__foot">
          <button class="btn btn--primary" id="next" data-act="next"></button>
        </div>
      </section>`;
    },
    mount() { Setup.paint(1); },
    stepHTML(step) {
      const su = UI.setup, visitor = S.mode === 'visitor';
      if (step === 'you') return `
        <h1 class="display">First,<br>your badge.</h1>
        <label class="field"><span class="lbl">Name</span><input id="f-name" data-in="name" autocomplete="name" autocapitalize="words" placeholder="What should we call you?" value="${esc(su.name)}"></label>
        <label class="field"><span class="lbl">Email${visitor ? ' — optional' : ''}</span><input id="f-email" data-in="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="${visitor ? 'you@example.org' : 'The email you registered with'}" value="${esc(su.email)}"></label>
        <div id="match"></div>
        ${visitor ? '' : `<p class="hint">Presenting a paper, poster or demo? Use your registration email and your slots are added for you. <button class="link" data-act="demo-email">Try a sample presenter</button></p>`}`;
      if (step === 'role') return `
        <h1 class="display">What brings<br>you to CHI?</h1>
        <div class="opts" role="radiogroup">${ROLES.map((r, i) => `<button class="opt ${su.role === r.id ? 'is-on' : ''}" role="radio" aria-checked="${su.role === r.id}" data-act="role" data-id="${r.id}" style="--i:${i}"><i></i><b>${r.name}</b><span class="lbl">${r.tag}</span></button>`).join('')}</div>`;
      if (step === 'mix') return `
        <h1 class="display">Mix your CHI.</h1>
        <p class="lede">Drag the dot toward what you’re most curious about.</p>
        <div class="tri" id="tri">
          <div class="tri__fill"></div>
          <div class="tri__grain"></div>
          ${PILLARS.map((p, i) => `<button class="tri__v tri__v--${p.id}" data-act="tri-snap" data-k="${i}"><b>${p.name}</b><span class="lbl" id="tri-p${i}"></span></button>`).join('')}
          <div class="tri__puck" id="puck" role="slider" tabindex="0" aria-label="Interest mix"></div>
        </div>
        <div id="trimix"></div>`;
      return `
        <h1 class="display">What makes you<br>stop scrolling?</h1>
        <p class="lede">Pick up to five. <span class="lbl" id="topicn"></span></p>
        <div class="chips">${TOPICS.map((t, i) => `<button class="chip ${su.topics.includes(t.name) ? 'is-on' : ''}" data-act="topic" data-name="${esc(t.name)}" aria-pressed="${su.topics.includes(t.name)}" style="--i:${i}">${t.name}</button>`).join('')}</div>`;
    },
    paint(dir) {
      const su = UI.setup, step = STEPS[su.step];
      const body = $('#step');
      body.className = 'setup__body stagger ' + (dir < 0 ? 'from-left' : 'from-right');
      body.innerHTML = Setup.stepHTML(step);
      $$('#prog i').forEach((el, i) => el.classList.toggle('is-on', i <= su.step));
      $('#stepno').textContent = `${su.step + 1} / ${STEPS.length}`;
      $('#next').innerHTML = (su.step === STEPS.length - 1 ? 'Reveal my icon' : 'Continue') + ' ' + G.arrow;
      app.scrollTop = 0;
      if (step === 'you') Setup.paintMatch();
      if (step === 'mix') Setup.mountTri();
      if (step === 'topics') Setup.paintTopics();
      Setup.gate();
    },
    gate() {
      const su = UI.setup, step = STEPS[su.step];
      const ok = step === 'you' ? su.name.trim().length > 0 : step === 'role' ? !!su.role : true;
      $('#next').disabled = !ok;
    },
    paintMatch() {
      const el = $('#match'); if (!el) return;
      const p = S.mode === 'attendee' && PRESENTERS[UI.setup.email.trim().toLowerCase()];
      el.innerHTML = p ? `<p class="match"><span>${G.check}</span><span><b>Presenter record found.</b> ${p.presentations.length} presentation${p.presentations.length > 1 ? 's' : ''} (${p.presentations.map(x => x.kind.toLowerCase()).join(' + ')}) will be added to your schedule.</span></p>` : '';
    },
    paintTopics() {
      const n = UI.setup.topics.length;
      $('#topicn').textContent = `${n} / 5`;
      $$('.chips .chip').forEach(c => { c.disabled = n >= 5 && !c.classList.contains('is-on'); });
    },
    mountTri() {
      const el = $('#tri'), puck = $('#puck');
      const { A, B, C } = TRI;
      const place = () => {
        const [a, b, c] = UI.setup.mix;
        puck.style.left = (a * A[0] + b * B[0] + c * C[0]) * 100 + '%';
        puck.style.top = (a * A[1] + b * B[1] + c * C[1]) * 100 + '%';
        puck.style.background = FX.mixColor(UI.setup.mix);
        UI.setup.mix.forEach((v, i) => { $('#tri-p' + i).textContent = Math.round(v * 100) + '%'; });
        $('#trimix').innerHTML = mixBar(UI.setup.mix);
      };
      const setFrom = (clientX, clientY) => {
        const r = el.getBoundingClientRect();
        const px = (clientX - r.left) / r.width, py = (clientY - r.top) / r.height;
        const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
        let a = ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / d;
        let b = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / d;
        let c = 1 - a - b;
        a = Math.max(0, a); b = Math.max(0, b); c = Math.max(0, c);
        const s = a + b + c || 1;
        UI.setup.mix = [a / s, b / s, c / s];
        place();
      };
      let drag = false;
      el.addEventListener('pointerdown', e => {
        if (e.target.closest('.tri__v')) return;
        drag = true; el.setPointerCapture(e.pointerId); puck.classList.add('is-drag'); setFrom(e.clientX, e.clientY);
      });
      el.addEventListener('pointermove', e => { if (drag) setFrom(e.clientX, e.clientY); });
      const end = () => { drag = false; puck.classList.remove('is-drag'); };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      puck.addEventListener('keydown', e => {
        const k = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2 }[e.key];
        if (k == null) return;
        e.preventDefault(); Setup.nudge(k, 0.08); place();
      });
      Setup.placeTri = place;
      place();
    },
    nudge(k, amt) {
      const m = UI.setup.mix.slice();
      m[k] += amt;
      const s = m[0] + m[1] + m[2];
      UI.setup.mix = m.map(v => v / s);
    },
    finish() {
      const su = UI.setup;
      const ranked = rank(su.mix, su.topics);
      const email = su.email.trim().toLowerCase();
      const pres = S.mode === 'attendee' && PRESENTERS[email];
      const prev = S.user;
      S.user = { name: su.name.trim(), email, role: su.role, primary: ranked[0], secondary: ranked[1], mix: su.mix, topics: su.topics, presenter: !!pres, creative: prev ? prev.creative : undefined };
      if (pres) pres.presentations.forEach(p => { if (!inSched(p.event)) S.schedule.push(p.event); });
      save();
      UI.setup = newSetup();
      go('icon');
    },
  };

  /* ---------- 4. Icon reveal ---------- */
  const Reveal = {
    html() {
      const u = S.user;
      if (!u) return `<section class="reveal"><p class="lede">No badge yet.</p><button class="btn btn--primary" data-go="join">Join Conference</button></section>`;
      const p = CAT[u.primary], s = CAT[u.secondary];
      return `<section class="reveal" id="reveal" style="--c:${p.color};--c2:${s.color}">
        ${bar({ onboarding: true, right: '<span class="lbl dim">Your icon</span>', cls: 'bar--clear' })}
        <p class="lbl reveal__kicker" id="rvk">Reading your answers…</p>
        <button class="reveal__stage" data-act="replay" aria-label="Replay the reveal">
          <canvas id="rv" aria-hidden="true"></canvas>
          <span class="reveal__svg">${icon(u.primary)}</span>
        </button>
        <div class="reveal__main">
          <p class="lbl">Primary interest</p>
          <h1>${p.name}</h1>
        </div>
        <div class="reveal__second">
          <span class="reveal__ico2">${icon(u.secondary)}</span>
          <div><p class="lbl">With a streak of</p><h2>${s.name}</h2></div>
        </div>
        <div class="reveal__mix">${mixBar(u.mix, true)}</div>
        <div class="reveal__foot">
          <button class="btn btn--primary" data-go="dashboard">Go to my dashboard ${G.arrow}</button>
          <button class="btn btn--text" data-act="retake">Not quite you? <u>Retake</u></button>
        </div>
      </section>`;
    },
    mount() {
      if (!S.user) return;
      let fx = null;
      const run = () => {
        const root = $('#reveal'); if (!root) return;
        root.classList.remove('is-done');
        $('#rvk').textContent = 'Reading your answers…';
        fx && fx.destroy();
        fx = FX.reveal($('#rv'), {
          id: S.user.primary, mix: S.user.mix,
          onDone() { root.classList.add('is-done'); $('#rvk').textContent = `${S.user.name.split(' ')[0]}, this is you at CHI`; },
        });
      };
      Reveal.replay = run;
      run();
      return () => fx && fx.destroy();
    },
  };

  /* ---------- 5. Log in ---------- */
  const Login = {
    html() {
      return `<section class="login stagger">
        ${bar({ back: '', right: '<span class="lbl dim">Log in</span>', cls: 'bar--clear' })}
        <h1 class="display">Welcome<br>back.</h1>
        <form id="loginform" novalidate>
          <label class="field"><span class="lbl">Email</span><input id="l-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="you@example.org"></label>
          <label class="field"><span class="lbl">Password</span><input id="l-pass" type="password" autocomplete="current-password" placeholder="••••••••"></label>
          <p class="err" id="l-err" role="alert"></p>
          <p class="hint">Prototype: any password works. <button type="button" class="link" data-act="demo-login">Use a sample presenter account</button></p>
          <div class="login__foot">
            <button class="btn btn--primary" type="submit">Log in ${G.arrow}</button>
            <button class="btn btn--ghost" type="button" data-act="mode" data-mode="guest">Continue as guest</button>
          </div>
        </form>
      </section>`;
    },
    mount() {
      $('#loginform').addEventListener('submit', e => {
        e.preventDefault();
        const email = $('#l-email').value.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) { $('#l-err').textContent = 'Enter the email you registered with.'; $('#l-email').focus(); return; }
        const pres = PRESENTERS[email];
        if (!(S.user && S.user.email === email)) {
          let h = 0; for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
          const cats = pres ? pres.presentations.map(p => EVENT[p.event].cat) : [];
          const primary = cats[0] || CATS[h % 12].id;
          const secondary = cats.find(c => c !== primary) || CATS[(h + 5) % 12].id;
          const nm = pres ? pres.name : email.split('@')[0].split(/[._-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          S.user = { name: nm, email, role: 'researcher', primary, secondary: secondary === primary ? 'design' : secondary, mix: CAT[primary].mix.map(v => v / 100), topics: [], presenter: !!pres };
        }
        S.mode = 'attendee';
        if (pres) pres.presentations.forEach(p => { if (!inSched(p.event)) S.schedule.push(p.event); });
        save();
        go('dashboard');
        toast(`Welcome back, ${S.user.name.split(' ')[0]}`);
      });
    },
  };

  /* ---------- ticket ----------
     A stand-in QR code: it has a real code's finder squares, timing lines and alignment block so it reads as one,
     but the rest is a pattern drawn from the email address, so it is the same every time for the same person
     and scans as nothing. */
  function fakeQR(seed) {
    const N = 25, m = Array.from({ length: N }, () => Array(N).fill(null));
    let h = 2166136261; for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const finder = (r0, c0) => {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        const y = r0 + r, x = c0 + c; if (y < 0 || x < 0 || y >= N || x >= N) continue;
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        m[y][x] = r >= 0 && r <= 6 && c >= 0 && c <= 6 && ring !== 2;
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) m[18 + r][18 + c] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x] === null) m[y][x] = rnd() < 0.5;
    let path = '';
    m.forEach((row, y) => row.forEach((on, x) => { if (on) path += `M${x + 4} ${y + 4}h1v1h-1z`; }));
    return `<svg class="ticket__qr" viewBox="0 0 33 33" role="img" aria-label="Ticket code" shape-rendering="crispEdges"><rect width="33" height="33" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }
  function ticketSheet() {
    const u = S.user; if (!u) return;
    const kind = S.mode === 'visitor' ? 'Visitor' : u.presenter ? 'Presenter' : 'Attendee';
    const seed = (u.email || u.name || 'guest').toLowerCase();
    let n = 0; for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
    const id = `CHI27-${kind[0]}-${n.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
    openSheet(`<div class="ticket">
      <p class="lbl">CHI 2027 · ${kind}</p>
      <h2>${esc(u.name)}</h2>
      ${fakeQR(seed)}
      <p class="ticket__id lbl">${id}</p>
      <dl class="kv">
        <div><dt>When</dt><dd>${INFO.dates}</dd></div>
        <div><dt>Where</dt><dd>${INFO.venue}</dd></div>
      </dl>
      <p class="hint">Show this at registration and session doors.</p>
    </div>`);
  }

  /* ---------- 6. Dashboard (account page) ---------- */
  const Dashboard = {
    html() {
      const u = S.user;
      return `${bar()}<section class="dash">
        <div class="dash__side">
        ${secHead('Profile')}
        ${u ? `<div id="dash-profile">${Dashboard.badge()}</div>` : `<div class="guestcard">
            <p class="lbl">Guest mode</p>
            <h3>You’re browsing without a badge.</h3>
            <p>Create one to get your icon, matched events and — if you’re presenting — your slots.</p>
            <button class="btn btn--primary" data-go="join">Join Conference ${G.arrow}</button>
          </div>`}
        </div>
        <div class="dash__main">
        ${u && S.mode !== 'visitor' ? secHead('My Presentations') + `<div id="dash-pres">${Dashboard.presHTML()}</div>` : ''}
        ${secHead('My Schedule', `<button class="link" data-go="events">Browse all</button>`)}
        <div id="dash-sched"></div>
        ${secHead('Events that might interest you')}
        <div id="dash-recs">${Dashboard.recsHTML()}</div>
        </div>
        <p class="dash__end lbl dim">${INFO.dates} · ${INFO.venue}</p>
      </section>`;
    },
    mount() {
      Dashboard.paintSchedule();
      Dashboard.mountProfile();
      return () => Dashboard.unmountProfile && Dashboard.unmountProfile();
    },
    // the simple badge (front) and the creative badge (back); a click flips it
    badge() {
      const u = S.user, ints = interestsOf(u);
      creativeOf(u);
      const role = (ROLES.find(r => r.id === u.role) || {}).tag || 'Attendee';
      const kind = S.mode === 'visitor' ? 'Visitor' : u.presenter ? 'Presenter' : 'Attendee';
      const flipped = !!UI.flipped;
      return `<div class="badge ${flipped ? 'is-flipped' : ''}" id="badge" tabindex="0" role="button" aria-pressed="${flipped}" aria-label="Your badge. Activate to flip between the simple side and the creative side.">
        <div class="badge__inner">
          <div class="badge__face badge__front"${flipped ? ' inert' : ''}>
            <div class="badge__row lbl"><span>CHI 2027</span><span>${kind}</span><span>May 10–14</span></div>
            <div class="badge__icons">${ints.map(x => `<span class="badge__ico" style="--c:${CAT[x.id].color}" title="${CAT[x.id].name}">${icon(x.id)}</span>`).join('')}</div>
            <h3>${esc(u.name)}</h3>
            <p class="badge__sub">${role}${u.email ? ' · ' + esc(u.email) : ''}</p>
          </div>
          <div class="badge__face badge__back"${flipped ? '' : ' inert'}>
            <div class="cb" id="cb" role="img" aria-label="${esc(Creative.bioText(u, ints))}"></div>
            <button class="badge__edit" data-act="cb-edit" aria-label="Edit creative badge">${G.edit}</button>
          </div>
        </div>
      </div>
      <div class="dash__mix">${mixBar(u.mix, true)}</div>
      <div class="dash__ticket"><button class="btn btn--primary" data-act="ticket">${G.qr} Show my ticket</button></div>
      <div class="dash__actions"><button class="btn btn--ghost btn--sm" data-act="retake">Retake interests</button><button class="btn btn--ghost btn--sm" data-go="icon">Show my icon</button><button class="btn btn--text btn--sm" data-act="logout">Log out</button></div>`;
    },
    // the editor for the creative side, shown in the sheet with a small live preview
    editorHTML() {
      const u = S.user, cr = creativeOf(u), ints = interestsOf(u);
      const suggested = Creative.defaultBio(u, ints), text = cr.bio || suggested;
      const n = Creative.bioWords(text).length, full = cr.images.length >= Creative.MAX_IMAGES;
      return `<div class="cbe">
        <h2>Creative badge</h2>
        <div class="cbe__preview"><div class="cb" id="cb-prev"></div></div>
        <label class="cbe__field"><span class="lbl">Bio <em id="cb-count" class="${n >= Creative.BIO_WORDS ? 'is-full' : ''}">${n} / ${Creative.BIO_WORDS} words</em></span>
          <textarea id="cb-bio" rows="3" maxlength="180" autocomplete="off" spellcheck="false" placeholder="${esc(suggested)}">${esc(text)}</textarea></label>
        <button class="link cbe__reset" data-act="cb-reset"${cr.bio ? '' : ' hidden'}>Use the suggested sentence</button>
        <div class="cbe__field"><span class="lbl">Images <em>${cr.images.length} / ${Creative.MAX_IMAGES} · kept on this device</em></span>
          <div class="cbe__imgs">${cr.images.map((src, i) => `<span class="cbe__thumb" style="background-image:url(${src})"><button data-act="cb-rm" data-i="${i}" aria-label="Remove image ${i + 1}">${G.close}</button></span>`).join('')}
            ${full ? '' : `<button class="cbe__add" data-act="cb-add" aria-label="Add images">${G.plus}</button><input type="file" id="cb-file" accept="image/*" multiple hidden>`}</div></div>
        <div class="cbe__row"><button class="btn btn--ghost" data-act="cb-shuffle">Shuffle</button><button class="btn btn--primary" data-act="close-sheet">Done</button></div>
      </div>`;
    },
    openEditor() {
      if (!S.user) return;
      Dashboard.flip(true);
      openSheet(Dashboard.editorHTML());
      Dashboard.drawCreative();
    },
    paintEditor() {
      const el = $('.cbe');
      if (el) el.outerHTML = Dashboard.editorHTML();
      Dashboard.drawCreative();
    },
    paintProfile() {
      const el = $('#dash-profile'); if (!el || !S.user) return;
      el.innerHTML = Dashboard.badge();
      Dashboard.mountProfile();
    },
    // draws the collage on the badge and, when the editor is open, in its preview
    drawCreative() {
      if (!S.user) return;
      const ints = interestsOf(S.user);
      ['#cb', '#cb-prev'].forEach(sel => { const el = $(sel); if (el) Creative.render(el, S.user, ints); });
    },
    mountProfile() {
      if (Dashboard.unmountProfile) Dashboard.unmountProfile();
      Dashboard.unmountProfile = null;
      const b = $('#badge');
      if (!b) return;
      Dashboard.drawCreative();
      Creative.ready.then(Dashboard.drawCreative);
      let raf = 0;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(Dashboard.drawCreative); });
      ro.observe(b);
      b.addEventListener('click', e => { if (!e.target.closest('.badge__edit')) Dashboard.flip(); });
      b.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === b) { e.preventDefault(); Dashboard.flip(); } });
      // one small nod on first sight, to show the badge has another side
      if (!UI.peeked && !UI.flipped && !FX.reduced) { UI.peeked = true; b.classList.add('peek'); setTimeout(() => b.classList.remove('peek'), 2300); }
      Dashboard.unmountProfile = () => { ro.disconnect(); cancelAnimationFrame(raf); };
    },
    flip(to) {
      const b = $('#badge'); if (!b) return;
      UI.flipped = to == null ? !UI.flipped : !!to;
      b.classList.remove('peek');
      b.classList.toggle('is-flipped', UI.flipped);
      b.setAttribute('aria-pressed', UI.flipped);
      const front = $('.badge__front', b), back = $('.badge__back', b);
      if (front) front.inert = UI.flipped;
      if (back) back.inert = !UI.flipped;
    },
    presHTML() {
      const list = myPresentations();
      if (!list.length) return `<div class="linkcard">
        <p><b>Nothing to present — yet.</b> If you have a paper, poster or demo, link the email you registered with and your slots, rooms and requirements appear here.</p>
        <form id="linkform" class="inline"><input id="link-email" type="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="Registration email" aria-label="Registration email" value="${esc(S.user.email || '')}"><button class="btn btn--primary btn--sm" type="submit">Link</button></form>
        <p class="err" id="link-err" role="alert"></p>
        <button class="link" data-act="demo-link">Try a sample presenter</button>
      </div>`;
      return list.map(p => {
        const e = EVENT[p.event], c = CAT[e.cat];
        const done = p.needs.filter((_, i) => S.checks[p.id + ':' + i]).length;
        return `<article class="pres" style="--c:${c.color};--on:${onColor(c.color)}">
          <header><span class="tag tag--c">${p.kind}</span><span class="lbl">${dayLabel(e.day)}</span></header>
          <h3>${esc(p.title)}</h3>
          <dl class="kv">
            <div><dt>Time</dt><dd>${p.slot.split(' · ')[0]}</dd></div>
            <div><dt>Place</dt><dd>${ROOM[e.room].name}${p.slot.includes(' · ') ? '<br>' + p.slot.split(' · ')[1] : ''}<br><span class="dim">${floorOf(e.room).name}</span></dd></div>
            <div class="kv__wide"><dt>${p.kind === 'Paper' ? 'Session' : 'Part of'}</dt><dd>${esc(e.title)} · ${e.start}–${e.end}</dd></div>
          </dl>
          <details ${done < p.needs.length ? 'open' : ''}>
            <summary><span>What you need to do</span><span class="lbl" data-count="${p.id}">${done}/${p.needs.length}</span></summary>
            <ul class="checks">${p.needs.map((n, i) => `<li><label><input type="checkbox" data-check="${p.id}:${i}" ${S.checks[p.id + ':' + i] ? 'checked' : ''}><i>${G.check}</i><span>${esc(n)}</span></label></li>`).join('')}</ul>
          </details>
          <button class="btn btn--ghost btn--sm" data-go="map/room/${e.room}">${G.pin} Find the room</button>
        </article>`;
      }).join('');
    },
    paintSchedule() {
      const el = $('#dash-sched'); if (!el) return;
      const items = S.schedule.map(id => EVENT[id]).filter(Boolean).sort(sortEv);
      const counts = DAYS.map((_, d) => items.filter(e => e.day === d).length);
      const today = items.filter(e => e.day === UI.dashDay);
      if (wide.matches) {
        // tablet and desktop: the whole week side by side
        el.innerHTML = `<div class="week">${DAYS.map((d, i) => {
          const list = items.filter(e => e.day === i);
          return `<div class="week__col"><div class="week__h"><span class="lbl">${d.dow}</span><b>${d.d}</b>${list.length ? `<i>${list.length}</i>` : ''}</div>${list.length ? list.map(e => {
            const mine = presentingAt(e.id);
            const clash = list.find(o => o !== e && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
            return `<div class="wk ${mine ? 'is-mine' : ''}" style="--c:${CAT[e.cat].color}" data-act="event" data-id="${e.id}" tabindex="0" role="button">
              <p class="lbl">${e.start}–${e.end}</p>
              <h3>${esc(mine ? mine.title : e.title)}</h3>
              <p class="wk__where">${ROOM[e.room].name}</p>
              ${mine ? `<span class="tag tag--solid">Presenting · ${mine.kind}</span>` : `<button class="iconbtn wk__x" data-act="toggle" data-id="${e.id}" aria-label="Remove from my schedule">${G.close}</button>`}
              ${clash ? `<p class="tl__clash lbl">Overlaps</p>` : ''}
            </div>`;
          }).join('') : `<button class="week__empty" data-act="browse-day" data-day="${i}">${G.plus}<span>Browse ${d.dow}</span></button>`}</div>`;
        }).join('')}</div>`;
        return;
      }
      el.innerHTML = `<div class="days" role="tablist">${DAYS.map((d, i) => `<button class="day ${i === UI.dashDay ? 'is-on' : ''}" data-act="dash-day" data-day="${i}" role="tab" aria-selected="${i === UI.dashDay}"><span class="lbl">${d.dow}</span><b>${d.d}</b>${counts[i] ? `<i>${counts[i]}</i>` : ''}</button>`).join('')}</div>
        ${today.length ? `<ol class="tl">${today.map((e, i) => {
          const mine = presentingAt(e.id);
          const clash = today.find(o => o !== e && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
          return `<li class="tl__item ${mine ? 'is-mine' : ''}" style="--c:${CAT[e.cat].color};--i:${i}">
            <div class="tl__time lbl"><b>${e.start}</b>${e.end}</div>
            <div class="tl__card" data-act="event" data-id="${e.id}" tabindex="0" role="button">
              <p class="lbl">${mine ? `<span class="tag tag--solid">Presenting · ${mine.kind}</span>` : TYPES[e.type]}</p>
              <h3>${esc(mine ? mine.title : e.title)}</h3>
              <p class="tl__where">${icon(e.cat)}${whereLabel(e.room)}${mine ? ' · ' + mine.slot.split(' · ')[0] : ''}</p>
              ${clash ? `<p class="tl__clash lbl">Overlaps with ${esc(clash.title)}</p>` : ''}
            </div>
            ${mine ? '' : `<button class="iconbtn tl__x" data-act="toggle" data-id="${e.id}" aria-label="Remove from my schedule">${G.close}</button>`}
          </li>`;
        }).join('')}</ol>` : `<div class="empty"><div class="empty__px"><i></i><i></i><i></i></div><p>Nothing on ${DAYS[UI.dashDay].dow} yet.</p><button class="btn btn--ghost btn--sm" data-act="browse-day">Browse ${DAYS[UI.dashDay].dow}’s events</button></div>`}`;
      const first = $('.tl__item', el);
      if (first) $$('.tl__item', el).forEach(li => li.classList.add('rise'));
    },
    recsHTML() {
      const recs = recommend(8);
      if (!recs.length) {
        const fallback = EVENTS.filter(e => e.type !== 'papers' && !inSched(e.id)).slice(0, 6);
        return `<div class="recs">${fallback.map(Dashboard.recCard).join('')}</div>`;
      }
      return `<div class="recs">${recs.map(Dashboard.recCard).join('')}</div>`;
    },
    recCard(e) {
      const c = CAT[e.cat];
      const u = S.user;
      const why = u && e.cat === u.primary ? 'Primary interest' : u && e.cat === u.secondary ? 'Secondary interest' : e.type === 'keynote' ? 'Everyone’s there' : 'Open to all';
      return `<article class="rec" style="--c:${c.color};--on:${onColor(c.color)}" data-act="event" data-id="${e.id}" tabindex="0" role="button">
        <div class="rec__top"><span class="rec__ico">${icon(e.cat)}</span><span class="lbl">${why}</span></div>
        <h3>${esc(e.title)}</h3>
        <p class="lbl rec__meta">${DAYS[e.day].dow} ${e.start}–${e.end}<br>${ROOM[e.room].name}</p>
        ${addBtn(e.id)}
      </article>`;
    },
  };

  /* ---------- 7. Home ---------- */
  const Home = {
    html() {
      const days = Math.ceil((new Date(INFO.start) - Date.now()) / 864e5);
      return `${bar()}<section class="home">
        <div class="hero">
          <div class="wall" id="wall">${CATS.map((c, i) => `<button class="tile" style="--c:${c.color};--i:${i}" data-act="domain" data-cat="${c.id}" aria-label="${c.name} events">${icon(c.id)}</button>`).join('')}</div>
          <div class="hero__title">
            <p class="lbl">ACM CHI Conference on Human Factors in Computing Systems</p>
            <h1>CHI 2027<span>Bridges</span></h1>
            ${S.user ? '' : `<div class="home__join">
              <button class="btn btn--primary" data-go="join">Join CHI 2027 ${G.arrow}</button>
            </div>`}
          </div>
        </div>

        <div class="when">
          <div><p class="lbl">When</p><p class="when__big">May 10–14</p><p class="dim">Monday to Friday, 2027</p></div>
          <div><p class="lbl">Where</p><p class="when__big">Pittsburgh</p><p class="dim">${INFO.venue}</p></div>
          <div class="when__row">
            ${days > 0 ? `<p class="count"><b>${days}</b><span class="lbl">days<br>to go</span></p>` : `<p class="count"><b>Now</b><span class="lbl">on</span></p>`}
            <button class="btn btn--ghost btn--sm" data-go="map">${G.pin} Open the map</button>
          </div>
        </div>

        ${secHead('About CHI 2027')}
        <div class="about-s">
          <p class="lede">CHI is the leading international conference on human–computer interaction. For five days in May, researchers, designers and makers meet in Pittsburgh to share how people and technology shape each other.</p>
          <p>This year’s theme is <b>bridges</b> — after the city’s yellow river crossings, and the connections CHI builds between disciplines, communities and ideas.</p>
          <ul class="pillars">${PILLARS.map(p => `<li><i style="background:${p.color}"></i><b>${p.name}</b><span>${p.line}</span></li>`).join('')}</ul>
          <button class="btn btn--ghost btn--sm" data-go="about">More about CHI ${G.arrow}</button>
        </div>

        ${secHead('Discover CHI')}
        <div class="progs">${PROGRAMS.map((p, i) => {
          const n = EVENTS.filter(e => e.type === p.type).length;
          return `<details class="prog-row" name="prog">
            <summary><span class="lbl">${String(i + 1).padStart(2, '0')}</span><b>${p.name}</b><em class="lbl">${n}</em><i></i></summary>
            <div><p>${p.line}</p><button class="btn btn--ghost btn--sm" data-act="type" data-type="${p.type}">See ${p.name.toLowerCase()} ${G.arrow}</button></div>
          </details>`;
        }).join('')}</div>

        ${secHead('Browse by domain')}
        <div class="domains">${CATS.map(c => `<button class="domain" style="--c:${c.color}" data-act="domain" data-cat="${c.id}">${icon(c.id)}<span>${c.name}</span></button>`).join('')}</div>

        ${footer()}
      </section>`;
    },
    mount() {
      const tiles = $$('#wall .tile');
      const flip = () => {
        const t = tiles[Math.floor(Math.random() * tiles.length)];
        t.classList.toggle('is-inv');
      };
      [1, 4, 6, 11].forEach(i => tiles[i] && tiles[i].classList.add('is-inv'));
      if (FX.reduced) return;
      const iv = setInterval(flip, 900);
      return () => clearInterval(iv);
    },
  };
  function footer() {
    return `<footer class="foot">
      ${logo('#/home')}
      <p>${INFO.dates}<br>${INFO.venue}<br>${INFO.address}</p>
      <p class="lbl dim">CHI is sponsored by ACM SIGCHI.<br>Prototype — sessions, rooms and people are sample content.</p>
    </footer>`;
  }

  /* ---------- 8. Events ---------- */
  const Events = {
    html() {
      return `${bar()}<section class="events">
        <div class="events__head">
          <h1 class="display">Events</h1>
          <div class="days days--sticky" id="ev-days"></div>
          <div class="fchips" id="ev-cats">
            <button class="fchip" data-act="ev-cat" data-cat="">All domains</button>
            ${CATS.map(c => `<button class="fchip" style="--c:${c.color}" data-act="ev-cat" data-cat="${c.id}">${icon(c.id)}${c.name}</button>`).join('')}
          </div>
        </div>
        <div id="ev-list"></div>
        ${footer()}
      </section>`;
    },
    mount() {
      Events.paint();
      const on = $('#ev-cats .is-on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
    },
    paint() {
      const all = EVENTS.filter(e => (!UI.evCat || e.cat === UI.evCat) && (!UI.evType || e.type === UI.evType));
      const counts = DAYS.map((_, d) => all.filter(e => e.day === d).length);
      $('#ev-days').innerHTML = DAYS.map((d, i) => `<button class="day ${i === UI.evDay ? 'is-on' : ''} ${counts[i] ? '' : 'is-empty'}" data-act="ev-day" data-day="${i}" role="tab" aria-selected="${i === UI.evDay}"><span class="lbl">${d.dow}</span><b>${d.d}</b>${(UI.evCat || UI.evType) && counts[i] ? `<i>${counts[i]}</i>` : ''}</button>`).join('');
      $$('#ev-cats .fchip').forEach(b => b.classList.toggle('is-on', (b.dataset.cat || null) === UI.evCat));
      const list = all.filter(e => e.day === UI.evDay).sort(sortEv);
      const slots = [];
      list.forEach(e => { const s = slots[slots.length - 1]; if (s && s.start === e.start) s.items.push(e); else slots.push({ start: e.start, items: [e] }); });
      const filt = UI.evType ? `<button class="fchip is-on fchip--x" data-act="ev-type-clear">${TYPES[UI.evType]} ${G.close}</button>` : '';
      $('#ev-list').innerHTML = `<p class="events__sum lbl"><span>${dayLabel(UI.evDay)} · ${list.length} event${list.length === 1 ? '' : 's'}</span>${filt}</p>` + (list.length
        ? slots.map((s, i) => `<div class="slot rise" style="--i:${i}"><p class="slot__t lbl">${s.start}</p><div class="slot__items">${s.items.map(e => evCard(e)).join('')}</div></div>`).join('')
        : `<div class="empty"><div class="empty__px"><i></i><i></i><i></i></div><p>No matching events on ${DAYS[UI.evDay].dow}.</p>${counts.some(Boolean) ? `<button class="btn btn--ghost btn--sm" data-act="ev-next">Jump to the next one</button>` : `<button class="btn btn--ghost btn--sm" data-act="ev-clear">Clear filters</button>`}</div>`);
    },
  };

  /* ---------- 9. About ---------- */
  const About = {
    html() {
      return `${bar()}<section class="about stagger">
        <p class="lbl">About</p>
        <h1 class="display">Where people<br>and technology<br>meet.</h1>
        <p class="lede">The ACM CHI Conference on Human Factors in Computing Systems is the leading international conference on human–computer interaction.</p>
        <p>CHI 2027 comes to Pittsburgh — a city that moved from steel to culture and technology — under the theme <b>bridges</b>. The week brings together papers, posters, interactive demos, panels, workshops and meet-ups, all under one roof at the ${INFO.venue}, the first LEED-certified convention center in North America.</p>

        ${secHead('Three threads')}
        <p>Everything at CHI pulls on three threads. They are also the three brand colours.</p>
        <ul class="pillars pillars--big">${PILLARS.map(p => `<li><i style="background:${p.color}"></i><b>${p.name}</b><span>${p.line}</span></li>`).join('')}</ul>

        ${secHead('Twelve domains')}
        <p>Each domain is a different mix of the three threads — which is where its colour comes from. Tap one to see its events.</p>
        <div class="mixes">${CATS.map(c => `<button class="mixrow" style="--c:${c.color}" data-act="domain" data-cat="${c.id}">${icon(c.id)}<span><b>${c.name}</b>${mixBar(c.mix)}</span></button>`).join('')}</div>

        ${secHead('Ways to take part')}
        <ul class="kinds">${PROGRAMS.map(p => `<li><b>${p.name}</b><span>${p.short}</span></li>`).join('')}</ul>
        <p class="hint">Everything is open to attendees and visitors.</p>

        ${secHead('The venue')}
        <dl class="kv kv--stack">
          <div><dt>Dates</dt><dd>${INFO.dates} · Monday to Friday</dd></div>
          <div><dt>Venue</dt><dd>${INFO.venue}<br><span class="dim">${INFO.address}</span></dd></div>
          <div><dt>General chairs</dt><dd>Amy Ogan and Anind Dey</dd></div>
        </dl>
        <button class="btn btn--ghost" data-go="map">${G.pin} Explore the map</button>
        ${footer()}
      </section>`;
    },
  };

  /* ======================================================================
     Router + actions
     ====================================================================== */
  const SCREENS = { '': Landing, join: Join, setup: Setup, icon: Reveal, login: Login, dashboard: Dashboard, home: Home, events: Events, about: About };
  /* Scroll-linked reveals. As a section scrolls up from the bottom edge, its heading types out letter by letter
     and its content fades up; everything is fully shown by the time it reaches the middle of the screen.
     Each piece plays once: it never goes backwards, and once fully shown it stays shown, including when the
     reader comes back to the page later in the same visit (until the page is reloaded).
     Sections already in the top three-quarters of the screen when a page opens are left alone,
     and nothing moves until the reader's first scroll. */
  const ScrollReveal = (() => {
    const on = !FX.reduced;
    let heads = [], items = [], scrolled = false, frame = 0;
    const seen = new Set(); // keys of headings and items already fully shown
    const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    // 0 when the element's top is at the bottom edge, 1 once it reaches the middle
    // (or the highest point it can reach, for anything near the end of a short page)
    function progress(el, box) {
      if (!scrolled) return 0;
      const top = el.getBoundingClientRect().top;
      const end = Math.max(box.top + box.height / 2, top - (app.scrollHeight - app.clientHeight - app.scrollTop));
      return clamp((box.bottom - top) / Math.max(1, box.bottom - end));
    }
    function update() {
      frame = 0;
      const box = app.getBoundingClientRect();
      heads = heads.filter(h => h.el.isConnected && !h.done);
      items = items.filter(it => it.el.isConnected && !it.done);
      heads.forEach(h => {
        const p = Math.max(h.p, progress(h.el, box)); // never goes backwards
        if (p === h.p && h.k >= 0) return;
        h.p = p;
        const k = Math.round(p * h.chars.length);
        h.k = k;
        h.chars.forEach((c, i) => { c.classList.toggle('on', i < k); c.classList.toggle('cur', p > 0 && i === k); });
        h.lbl && (h.lbl.style.opacity = clamp(p * 4));
        h.rest.forEach(x => { x.style.opacity = clamp((p - 0.75) * 4); });
        if (p >= 1) { h.done = true; seen.add(h.key); h.lbl && (h.lbl.style.opacity = ''); h.rest.forEach(x => { x.style.opacity = ''; }); }
      });
      items.forEach(it => {
        const p = Math.max(it.p, progress(it.el, box));
        if (p === it.p) return;
        it.p = p;
        it.el.style.opacity = p >= 1 ? '' : p;
        it.el.style.transform = p >= 1 ? '' : `translateY(${((1 - p) * 18).toFixed(1)}px)`;
        if (p >= 1) { it.done = true; seen.add(it.key); }
      });
    }
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    if (on) {
      app.addEventListener('scroll', () => { scrolled = true; queue(); }, { passive: true });
      window.addEventListener('resize', queue);
    }
    return {
      scan(root) {
        if (!on) return;
        heads = []; items = []; scrolled = false;
        if (app.scrollHeight - app.clientHeight < 40) return; // page doesn't really scroll: show everything
        const box = app.getBoundingClientRect(), line = box.top + box.height * 0.75;
        const below = el => el.getBoundingClientRect().top >= line;
        const page = location.hash || '#/';
        root.querySelectorAll('.sec-h').forEach(sh => {
          const h2 = sh.querySelector('h2');
          if (!h2 || !below(sh)) return;
          const text = h2.textContent, key = page + '|h|' + text;
          if (seen.has(key)) return;
          h2.setAttribute('aria-label', text);
          h2.innerHTML = [...text].map(ch => `<span class="ch" aria-hidden="true">${esc(ch)}</span>`).join('');
          const rest = [...sh.children].filter(x => x !== h2 && !x.classList.contains('lbl'));
          heads.push({ el: sh, key, chars: [...h2.children], lbl: sh.querySelector(':scope > .lbl'), rest, k: -1, p: 0 });
        });
        root.querySelectorAll('.about-s, .progs, .domains, .recs').forEach((list, li) => {
          [...list.children].forEach((c, i) => {
            const key = page + '|i|' + li + '.' + i;
            if (!seen.has(key) && below(c)) items.push({ el: c, key, p: -1 });
          });
        });
        update();
      },
    };
  })();

  let leave = null;
  const parts = () => location.hash.replace(/^#\/?/, '').split('/');
  const current = () => parts()[0] || '';

  function render() {
    const p = parts(), name = p[0] || '';
    const screen = SCREENS[name] || Landing;
    if (leave) { try { leave(); } catch (e) { /* ignore */ } leave = null; }
    closeSheet(true); closeMenu(true);
    app.className = 'app app--' + (SCREENS[name] ? name || 'landing' : 'landing');
    app.innerHTML = screen.html(p.slice(1));
    app.scrollTop = 0;
    leave = (screen.mount && screen.mount(p.slice(1))) || null;
    ScrollReveal.scan(app);
  }
  function go(r) { if (location.hash === '#/' + r) render(); else location.hash = '#/' + r; }

  const ACT = {
    menu: openMenu,
    'close-menu': () => closeMenu(),
    'close-sheet': () => closeSheet(),
    back(el) {
      if (el.dataset.to === '@setup') {
        if (UI.setup.step > 0) { UI.setup.step--; Setup.paint(-1); } else go('join');
      } else go(el.dataset.to);
    },
    mode(el) {
      const m = el.dataset.mode;
      el.classList.add('is-picked');
      setTimeout(() => {
        if (m === 'guest') { S.mode = 'guest'; S.user = null; save(); go('home'); toast('Guest mode — join any time from the menu'); }
        else { S.mode = m; save(); UI.setup = newSetup(); go('setup'); }
      }, el.classList.contains('role') && !FX.reduced ? 340 : 0);
    },
    next() {
      const su = UI.setup;
      if (su.step < STEPS.length - 1) { su.step++; Setup.paint(1); } else Setup.finish();
    },
    role(el) {
      UI.setup.role = el.dataset.id;
      $$('.opt').forEach(o => { const on = o === el; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', on); });
      Setup.gate();
    },
    'tri-snap'(el) {
      const k = +el.dataset.k, m = [0.12, 0.12, 0.12]; m[k] = 0.76;
      UI.setup.mix = m; $('#puck').classList.add('is-snap'); Setup.placeTri();
      setTimeout(() => { const p = $('#puck'); p && p.classList.remove('is-snap'); }, 400);
    },
    topic(el) {
      const t = UI.setup.topics, n = el.dataset.name, i = t.indexOf(n);
      if (i >= 0) t.splice(i, 1); else if (t.length < 5) t.push(n);
      const on = t.includes(n);
      el.classList.toggle('is-on', on); el.setAttribute('aria-pressed', on);
      Setup.paintTopics();
    },
    'demo-email'() {
      const su = UI.setup;
      su.email = 'alex.rivera@example.org'; if (!su.name.trim()) su.name = 'Alex Rivera';
      $('#f-email').value = su.email; $('#f-name').value = su.name;
      Setup.paintMatch(); Setup.gate();
    },
    'demo-login'() { $('#l-email').value = 'alex.rivera@example.org'; $('#l-pass').value = 'prototype'; $('#l-err').textContent = ''; },
    'demo-link'() { $('#link-email').value = 'sam.okonkwo@example.org'; },
    replay() { Reveal.replay && Reveal.replay(); },
    retake() {
      const u = S.user;
      UI.setup = Object.assign(newSetup(), u ? { name: u.name, email: u.email, role: u.role, mix: u.mix.slice(), topics: (u.topics || []).slice(), step: 1 } : {});
      if (!S.mode || S.mode === 'guest') S.mode = 'attendee';
      go('setup');
    },
    logout() { S.user = null; S.mode = null; save(); go(''); toast('Logged out'); },
    reset() { S = blank(); save(); UI.setup = newSetup(); UI.evCat = UI.evType = null; UI.evDay = UI.dashDay = 0; go(''); toast('Prototype reset'); },
    'cb-edit'() { Dashboard.openEditor(); },
    'cb-add'() { const f = $('#cb-file'); f && f.click(); },
    'cb-rm'(el) { creativeOf(S.user).images.splice(+el.dataset.i, 1); save(); Dashboard.paintEditor(); },
    'cb-reset'() { creativeOf(S.user).bio = ''; save(); Dashboard.paintEditor(); },
    'cb-shuffle'() {
      const cr = creativeOf(S.user), faces = $$('#cb, #cb-prev');
      cr.seed = cr.seed % 9000 + 1; save();
      faces.forEach(el => el.classList.add('is-swap'));
      setTimeout(() => { Dashboard.drawCreative(); faces.forEach(el => el.classList.remove('is-swap')); }, FX.reduced ? 0 : 160);
    },
    toggle(el) { toggleSched(el.dataset.id); },
    ticket() { ticketSheet(); },
    'toggle-sheet'(el) {
      toggleSched(el.dataset.id);
      const on = inSched(el.dataset.id);
      el.classList.toggle('is-on', on);
      el.textContent = on ? 'In my schedule — remove' : 'Add to my schedule';
    },
    event(el) { eventSheet(el.dataset.id); },
    'dash-day'(el) { UI.dashDay = +el.dataset.day; Dashboard.paintSchedule(); },
    'browse-day'(el) { UI.evDay = el.dataset.day != null ? +el.dataset.day : UI.dashDay; UI.evCat = UI.evType = null; go('events'); },
    'ev-day'(el) { UI.evDay = +el.dataset.day; Events.paint(); },
    'ev-cat'(el) {
      UI.evCat = el.dataset.cat || null;
      Events.jumpIfEmpty(); Events.paint();
      el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    },
    'ev-type-clear'() { UI.evType = null; Events.paint(); },
    'ev-clear'() { UI.evType = UI.evCat = null; Events.paint(); },
    'ev-next'() { Events.jumpIfEmpty(true); Events.paint(); },
    domain(el) { UI.evCat = el.dataset.cat; UI.evType = null; Events.jumpIfEmpty(); go('events'); },
    type(el) { UI.evType = el.dataset.type; UI.evCat = null; Events.jumpIfEmpty(); go('events'); },
  };
  Events.jumpIfEmpty = function () {
    const match = e => (!UI.evCat || e.cat === UI.evCat) && (!UI.evType || e.type === UI.evType);
    if (EVENTS.some(e => match(e) && e.day === UI.evDay)) return;
    for (let k = 1; k <= 5; k++) { const d = (UI.evDay + k) % 5; if (EVENTS.some(e => match(e) && e.day === d)) { UI.evDay = d; return; } }
  };

  document.addEventListener('click', e => {
    const goEl = e.target.closest('[data-go]');
    const actEl = e.target.closest('[data-act]');
    // innermost wins when both are present
    if (goEl && (!actEl || actEl.contains(goEl))) { e.preventDefault(); closeSheet(true); go(goEl.dataset.go); return; }
    if (actEl) {
      const fn = ACT[actEl.dataset.act] || (window.APP.actions && window.APP.actions[actEl.dataset.act]);
      if (fn) { e.preventDefault(); fn(actEl, e); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!sheetEl.hidden) closeSheet(); else if (!menuEl.hidden) closeMenu(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.in) { UI.setup[t.dataset.in] = t.value; Setup.gate(); if (t.dataset.in === 'email') Setup.paintMatch(); }
    if (t.id === 'cb-bio' && S.user) {
      // hold the sentence to the word cap as it is typed or pasted
      const cap = Creative.BIO_WORDS, words = t.value.split(/\s+/).filter(Boolean);
      if (words.length > cap) t.value = words.slice(0, cap).join(' ');
      else if (words.length === cap && /\s$/.test(t.value)) t.value = t.value.replace(/\s+$/, '');
      const cr = creativeOf(S.user), ints = interestsOf(S.user);
      const mine = t.value.replace(/\s+/g, ' ').trim();
      cr.bio = mine && mine !== Creative.defaultBio(S.user, ints) ? mine : ''; // '' = follow the suggested sentence
      save();
      const n = Math.min(words.length, cap), c = $('#cb-count'), r = $('.cbe__reset');
      if (c) { c.textContent = `${n} / ${cap} words`; c.classList.toggle('is-full', n >= cap); }
      if (r) r.hidden = !cr.bio;
      const face = $('#cb'); if (face) face.setAttribute('aria-label', Creative.bioText(S.user, ints));
      Dashboard.drawCreative();
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'cb-file' && S.user) { addImages(t.files); return; }
    if (t.dataset && t.dataset.check) {
      S.checks[t.dataset.check] = t.checked; save();
      const pid = t.dataset.check.split(':')[0];
      const boxes = $$(`[data-check^="${pid}:"]`);
      const c = $(`[data-count="${pid}"]`); if (c) c.textContent = `${boxes.filter(b => b.checked).length}/${boxes.length}`;
    }
  });
  document.addEventListener('submit', e => {
    if (e.target.id !== 'linkform') return;
    e.preventDefault();
    const email = $('#link-email').value.trim().toLowerCase();
    const pres = PRESENTERS[email];
    if (!pres) { $('#link-err').textContent = 'No presenter record for that email. Check it matches your registration.'; return; }
    S.user.email = email; S.user.presenter = true;
    pres.presentations.forEach(p => { if (!inSched(p.event)) S.schedule.push(p.event); });
    UI.dashDay = EVENT[pres.presentations[0].event].day;
    save(); render();
    toast(`${pres.presentations.length} presentation${pres.presentations.length > 1 ? 's' : ''} added to your schedule`);
    const sec = $('#dash-pres'); sec && sec.scrollIntoView({ block: 'center' });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.setup input')) { e.preventDefault(); const n = $('#next'); if (n && !n.disabled) n.click(); }
  });

  window.APP = { screens: SCREENS, actions: {}, icon, esc, toast, openSheet, closeSheet, eventSheet, addBtn, evCard, go, bar, G, state: () => S, dayLabel, floorOf, presentingAt };

  wide.addEventListener('change', () => { if (current() === 'dashboard') Dashboard.paintSchedule(); });
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', render);
})();
