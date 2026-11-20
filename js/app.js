/* CHI 2027 — mobile web prototype. Hash-routed, no build step. */
(function () {
  const ICONS = window.CHI_ICONS;
  const { CATS, CAT, PILLARS, DAYS, TYPES, PROGRAMS, FLOORS, ROOM, EVENTS, EVENT, PRESENTERS, ROLES, TOPICS, INFO } = window.CHI;
  const FX = window.FX;

  const app = document.getElementById('app');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- state ---------- */
  const KEY = 'chi27-proto-v1';
  const blank = () => ({ mode: null, user: null, schedule: [], checks: {} });
  let S = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return blank(); } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private mode — keep in memory */ } };

  const newSetup = () => ({ step: 0, name: '', email: '', role: null, mix: [1 / 3, 1 / 3, 1 / 3], topics: [] });
  const UI = { evDay: 0, evCat: null, evType: null, dashDay: 0, setup: newSetup() };

  /* ---------- small pieces ---------- */
  const G = {
    arrow: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    back: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    plus: '<svg class="g g-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    check: '<svg class="g g-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6"/></svg>',
    close: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    pin: '<svg class="g" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.800 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.500" r="2.200" fill="currentColor"/></svg>',
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
  const secHead = (n, title, extra) => `<div class="sec-h"><span class="mono">${n}</span><h2>${title}</h2>${extra || ''}</div>`;

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
    if (on) {
      const clash = S.schedule.map(x => EVENT[x]).find(o => o.id !== id && o.day === e.day && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
      toast(clash ? `Added — overlaps with “${clash.title}”` : `Added to ${dayLabel(e.day)}`, current() === 'dashboard' ? null : { label: 'View', go: 'dashboard' });
      UI.dashDay = e.day;
    } else toast('Removed from your schedule');
    if (current() === 'dashboard') Dashboard.paintSchedule();
    updateBurger();
  }

  function evCard(e, opts) {
    opts = opts || {};
    const c = CAT[e.cat];
    const mine = presentingAt(e.id);
    return `<article class="ev" style="--c:${c.color}" data-act="event" data-id="${e.id}" tabindex="0" role="button" aria-label="${esc(e.title)}">
      <div class="ev__ico">${icon(e.cat)}</div>
      <div class="ev__body">
        <p class="mono ev__meta"><span>${opts.day ? DAYS[e.day].dow + ' ' : ''}${e.start}–${e.end}</span><span>${TYPES[e.type]}</span></p>
        <h3>${esc(e.title)}</h3>
        <p class="ev__where">${ROOM[e.room].name}</p>
        ${mine ? `<span class="tag tag--solid">You’re presenting</span>` : ''}${e.open && S.mode === 'visitor' ? `<span class="tag">Open to visitors</span>` : ''}
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
    openSheet(`<div class="evd" style="--c:${c.color}">
      <div class="evd__top"><div class="evd__ico">${icon(e.cat)}</div><p class="mono">${TYPES[e.type]}<br><span>${c.name}</span></p></div>
      <h2>${esc(e.title)}</h2>
      ${mine ? `<p class="tag tag--solid">You’re presenting · ${mine.slot}</p>` : ''}
      <p class="evd__blurb">${esc(e.blurb)}</p>
      <dl class="kv">
        <div><dt>When</dt><dd>${dayLabel(e.day)}<br>${e.start} – ${e.end}</dd></div>
        <div><dt>Where</dt><dd>${ROOM[e.room].name}<br>${floorOf(e.room).name}</dd></div>
        <div><dt>Who</dt><dd>${esc(e.people)}</dd></div>
        ${e.open ? '<div><dt>Access</dt><dd>Open to visitors</dd></div>' : ''}
      </dl>
      <div class="evd__actions">
        ${mine ? '' : `<button class="btn btn--primary ${inSched(id) ? 'is-on' : ''}" data-act="toggle-sheet" data-id="${id}">${inSched(id) ? 'In my schedule — remove' : 'Add to my schedule'}</button>`}
        <button class="btn btn--ghost" data-go="map/room/${e.room}">${G.pin} Find the room</button>
      </div>
    </div>`);
  }

  const menuEl = document.getElementById('menu');
  const NAV = [['home', 'Home'], ['events', 'Events'], ['map', 'Map'], ['about', 'About'], ['dashboard', 'My Dashboard']];
  function openMenu() {
    const cur = current();
    const who = S.user ? `Signed in as <b>${esc(S.user.name)}</b>` : 'Browsing in <b>guest mode</b>';
    menuEl.innerHTML = `<div class="menu__top">${logo('#/home')}<button class="burger is-open" data-act="close-menu" aria-label="Close menu"><i></i><i></i></button></div>
      <nav class="menu__nav">${NAV.map(([r, n], i) => `<a href="#/${r}" class="${cur === r ? 'is-cur' : ''}" style="--i:${i}"><span class="mono">0${i + 1}</span><b>${n}</b>${r === 'dashboard' && S.schedule.length ? `<em>${S.schedule.length}</em>` : ''}</a>`).join('')}</nav>
      <div class="menu__foot" style="--i:6">
        <p>${who}</p>
        <div>${S.user ? `<button class="btn btn--ghost btn--sm" data-act="logout">Log out</button>` : `<button class="btn btn--primary btn--sm" data-go="join">Join Conference</button>`}
        <button class="btn btn--text btn--sm" data-act="reset">Reset prototype</button></div>
        <p class="mono dim">${INFO.dates} · ${INFO.city}</p>
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
  function rank(mix, topics) {
    const sc = {};
    CATS.forEach(c => {
      const m = c.mix.map(v => v / 100);
      sc[c.id] = 10 * (1 - Math.hypot(m[0] - mix[0], m[1] - mix[1], m[2] - mix[2]) / 1.2);
    });
    topics.forEach(n => { const t = TOPICS.find(x => x.name === n); if (t) { sc[t.a] += 6; sc[t.b] += 3; } });
    return CATS.map(c => c.id).sort((a, b) => sc[b] - sc[a]);
  }
  function recommend(limit) {
    const u = S.user;
    let pool = EVENTS.filter(e => !inSched(e.id) && !presentingAt(e.id));
    if (S.mode === 'visitor') pool = pool.filter(e => e.open);
    const w = e => (u ? (e.cat === u.primary ? 5 : e.cat === u.secondary ? 2.5 : 0) : 0) + (e.type === 'keynote' ? 1.5 : 0) + (e.open ? 0.5 : 0);
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
        ${bar({ onboarding: true, right: '<span class="mono dim">ACM SIGCHI</span>', cls: 'bar--clear' })}
        <div class="landing__title">
          <p class="mono">Conference on Human Factors<br>in Computing Systems</p>
          <h1>CHI<br>2027</h1>
        </div>
        <div class="landing__stage">
          <canvas class="pix" id="pix" aria-hidden="true"></canvas>
          <p class="mono landing__now"><i id="pixdot"></i><span id="pixname">&nbsp;</span></p>
        </div>
        <div class="landing__foot">
          <dl class="facts">
            <div><dt class="mono">When</dt><dd>${INFO.dates}</dd></div>
            <div><dt class="mono">Where</dt><dd>${INFO.city}<small>${INFO.venue}</small></dd></div>
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
        ${bar({ back: '', right: '<span class="mono dim">Join</span>', cls: 'bar--clear' })}
        <h1 class="display">How are you<br>joining us?</h1>
        <button class="role" data-act="mode" data-mode="attendee" style="--c:var(--g)">
          <span class="mono">Attendee</span>
          <span class="role__glyph"><i class="sq"></i><i class="ci"></i></span>
          <b>I’m attending CHI.</b>
          <span class="role__line">Plan around sessions and meet people with shared interests.</span>
          <span class="role__go">${G.arrow}</span>
        </button>
        <button class="role" data-act="mode" data-mode="visitor" style="--c:var(--r)">
          <span class="mono">Visitor</span>
          <span class="role__glyph"><i class="ci"></i><i class="ci ci--o"></i></span>
          <b>I’m a visitor.</b>
          <span class="role__line">Browse community activities that are open to visitors.</span>
          <span class="role__go">${G.arrow}</span>
        </button>
        <button class="role role--slim" data-act="mode" data-mode="guest" style="--c:var(--b-lit)">
          <span class="mono">Guest mode</span>
          <b>Just looking around.</b>
          <span class="role__line">No account. Go straight to the conference home.</span>
          <span class="role__go">${G.arrow}</span>
        </button>
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
        ${bar({ back: '@setup', right: `<span class="mono dim" id="stepno"></span>`, cls: 'bar--clear' })}
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
        <label class="field"><span class="mono">Name</span><input id="f-name" data-in="name" autocomplete="name" autocapitalize="words" placeholder="What should we call you?" value="${esc(su.name)}"></label>
        <label class="field"><span class="mono">Email${visitor ? ' — optional' : ''}</span><input id="f-email" data-in="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="${visitor ? 'you@example.org' : 'The email you registered with'}" value="${esc(su.email)}"></label>
        <div id="match"></div>
        ${visitor ? '' : `<p class="hint">Presenting a paper, poster or demo? Use your registration email and your slots are added for you. <button class="link" data-act="demo-email">Try a sample presenter</button></p>`}`;
      if (step === 'role') return `
        <h1 class="display">What brings<br>you to CHI?</h1>
        <div class="opts" role="radiogroup">${ROLES.map((r, i) => `<button class="opt ${su.role === r.id ? 'is-on' : ''}" role="radio" aria-checked="${su.role === r.id}" data-act="role" data-id="${r.id}" style="--i:${i}"><i></i><b>${r.name}</b><span class="mono">${r.tag}</span></button>`).join('')}</div>`;
      if (step === 'mix') return `
        <h1 class="display">Mix your CHI.</h1>
        <p class="lede">Drag the dot toward what you’re most curious about.</p>
        <div class="tri" id="tri">
          <div class="tri__fill"></div>
          <div class="tri__grain"></div>
          ${PILLARS.map((p, i) => `<button class="tri__v tri__v--${p.id}" data-act="tri-snap" data-k="${i}"><b>${p.name}</b><span class="mono" id="tri-p${i}"></span></button>`).join('')}
          <div class="tri__puck" id="puck" role="slider" tabindex="0" aria-label="Interest mix"></div>
        </div>
        <div id="trimix"></div>`;
      return `
        <h1 class="display">What makes you<br>stop scrolling?</h1>
        <p class="lede">Pick up to five. <span class="mono" id="topicn"></span></p>
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
      S.user = { name: su.name.trim(), email, role: su.role, primary: ranked[0], secondary: ranked[1], mix: su.mix, topics: su.topics, presenter: !!pres };
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
        ${bar({ onboarding: true, right: '<span class="mono dim">Your icon</span>', cls: 'bar--clear' })}
        <p class="mono reveal__kicker" id="rvk">Reading your answers…</p>
        <button class="reveal__stage" data-act="replay" aria-label="Replay the reveal">
          <canvas id="rv" aria-hidden="true"></canvas>
          <span class="reveal__svg">${icon(u.primary)}</span>
        </button>
        <div class="reveal__main">
          <p class="mono">Primary interest</p>
          <h1>${p.name}</h1>
        </div>
        <div class="reveal__second">
          <span class="reveal__ico2">${icon(u.secondary)}</span>
          <div><p class="mono">With a streak of</p><h2>${s.name}</h2></div>
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
        ${bar({ back: '', right: '<span class="mono dim">Log in</span>', cls: 'bar--clear' })}
        <h1 class="display">Welcome<br>back.</h1>
        <form id="loginform" novalidate>
          <label class="field"><span class="mono">Email</span><input id="l-email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" placeholder="you@example.org"></label>
          <label class="field"><span class="mono">Password</span><input id="l-pass" type="password" autocomplete="current-password" placeholder="••••••••"></label>
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

  /* ---------- 6. Dashboard (account page) ---------- */
  const Dashboard = {
    html() {
      const u = S.user;
      return `${bar()}<section class="dash">
        <div class="dash__side">
        ${secHead('01', 'Profile')}
        ${u ? Dashboard.badge() : `<div class="guestcard">
            <p class="mono">Guest mode</p>
            <h3>You’re browsing without a badge.</h3>
            <p>Create one to get your icon, matched events and — if you’re presenting — your slots.</p>
            <button class="btn btn--primary" data-go="join">Join Conference ${G.arrow}</button>
          </div>`}
        </div>
        <div class="dash__main">
        ${u && S.mode !== 'visitor' ? secHead('02', 'My Presentations') + `<div id="dash-pres">${Dashboard.presHTML()}</div>` : ''}
        ${secHead(u && S.mode !== 'visitor' ? '03' : '02', 'My Schedule', `<button class="link" data-go="events">Browse all</button>`)}
        <div id="dash-sched"></div>
        ${secHead(u && S.mode !== 'visitor' ? '04' : '03', 'Events that might interest you')}
        <div id="dash-recs">${Dashboard.recsHTML()}</div>
        </div>
        <p class="dash__end mono dim">${INFO.dates} · ${INFO.venue}</p>
      </section>`;
    },
    mount() { Dashboard.paintSchedule(); },
    badge() {
      const u = S.user, p = CAT[u.primary], s = CAT[u.secondary];
      const role = (ROLES.find(r => r.id === u.role) || {}).tag || 'Attendee';
      return `<div class="badge" style="--c:${p.color};--on:${onColor(p.color)};--c2:${s.color}">
        <div class="badge__row mono"><span>CHI 2027 · ${S.mode === 'visitor' ? 'Visitor' : u.presenter ? 'Presenter' : 'Attendee'}</span><span>May 10–14</span></div>
        <div class="badge__icon">${icon(u.primary)}</div>
        <h3>${esc(u.name)}</h3>
        <p class="badge__sub">${role}${u.email ? ' · ' + esc(u.email) : ''}</p>
        <div class="badge__ints">
          <span class="int int--1">${icon(u.primary)}<span><small class="mono">Primary</small>${p.name}</span></span>
          <span class="int int--2">${icon(u.secondary)}<span><small class="mono">Secondary</small>${s.name}</span></span>
        </div>
      </div>
      <div class="dash__mix">${mixBar(u.mix, true)}</div>
      <div class="dash__actions"><button class="btn btn--ghost btn--sm" data-act="retake">Retake interests</button><button class="btn btn--ghost btn--sm" data-go="icon">Show my icon</button><button class="btn btn--text btn--sm" data-act="logout">Log out</button></div>`;
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
          <header><span class="tag tag--c">${p.kind}</span><span class="mono">${dayLabel(e.day)}</span></header>
          <h3>${esc(p.title)}</h3>
          <dl class="kv">
            <div><dt>Time</dt><dd>${p.slot.split(' · ')[0]}</dd></div>
            <div><dt>Place</dt><dd>${ROOM[e.room].name}${p.slot.includes(' · ') ? '<br>' + p.slot.split(' · ')[1] : ''}<br><span class="dim">${floorOf(e.room).name}</span></dd></div>
            <div class="kv__wide"><dt>${p.kind === 'Paper' ? 'Session' : 'Part of'}</dt><dd>${esc(e.title)} · ${e.start}–${e.end}</dd></div>
          </dl>
          <details ${done < p.needs.length ? 'open' : ''}>
            <summary><span>What you need to do</span><span class="mono" data-count="${p.id}">${done}/${p.needs.length}</span></summary>
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
          return `<div class="week__col"><div class="week__h"><span class="mono">${d.dow}</span><b>${d.d}</b>${list.length ? `<i>${list.length}</i>` : ''}</div>${list.length ? list.map(e => {
            const mine = presentingAt(e.id);
            const clash = list.find(o => o !== e && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
            return `<div class="wk ${mine ? 'is-mine' : ''}" style="--c:${CAT[e.cat].color}" data-act="event" data-id="${e.id}" tabindex="0" role="button">
              <p class="mono">${e.start}–${e.end}</p>
              <h3>${esc(mine ? mine.title : e.title)}</h3>
              <p class="wk__where">${ROOM[e.room].name}</p>
              ${mine ? `<span class="tag tag--solid">Presenting · ${mine.kind}</span>` : `<button class="iconbtn wk__x" data-act="toggle" data-id="${e.id}" aria-label="Remove from my schedule">${G.close}</button>`}
              ${clash ? `<p class="tl__clash mono">Overlaps</p>` : ''}
            </div>`;
          }).join('') : `<button class="week__empty" data-act="browse-day" data-day="${i}">${G.plus}<span>Browse ${d.dow}</span></button>`}</div>`;
        }).join('')}</div>`;
        return;
      }
      el.innerHTML = `<div class="days" role="tablist">${DAYS.map((d, i) => `<button class="day ${i === UI.dashDay ? 'is-on' : ''}" data-act="dash-day" data-day="${i}" role="tab" aria-selected="${i === UI.dashDay}"><span class="mono">${d.dow}</span><b>${d.d}</b>${counts[i] ? `<i>${counts[i]}</i>` : ''}</button>`).join('')}</div>
        ${today.length ? `<ol class="tl">${today.map((e, i) => {
          const mine = presentingAt(e.id);
          const clash = today.find(o => o !== e && mins(o.start) < mins(e.end) && mins(e.start) < mins(o.end));
          return `<li class="tl__item ${mine ? 'is-mine' : ''}" style="--c:${CAT[e.cat].color};--i:${i}">
            <div class="tl__time mono"><b>${e.start}</b>${e.end}</div>
            <div class="tl__card" data-act="event" data-id="${e.id}" tabindex="0" role="button">
              <p class="mono">${mine ? `<span class="tag tag--solid">Presenting · ${mine.kind}</span>` : TYPES[e.type]}</p>
              <h3>${esc(mine ? mine.title : e.title)}</h3>
              <p class="tl__where">${icon(e.cat)}${whereLabel(e.room)}${mine ? ' · ' + mine.slot.split(' · ')[0] : ''}</p>
              ${clash ? `<p class="tl__clash mono">Overlaps with ${esc(clash.title)}</p>` : ''}
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
        const fallback = EVENTS.filter(e => e.open && !inSched(e.id)).slice(0, 6);
        return `<div class="recs">${fallback.map(Dashboard.recCard).join('')}</div>`;
      }
      return `<div class="recs">${recs.map(Dashboard.recCard).join('')}</div>`;
    },
    recCard(e) {
      const c = CAT[e.cat];
      const u = S.user;
      const why = u && e.cat === u.primary ? 'Primary interest' : u && e.cat === u.secondary ? 'Secondary interest' : e.type === 'keynote' ? 'Everyone’s there' : 'Open to all';
      return `<article class="rec" style="--c:${c.color};--on:${onColor(c.color)}" data-act="event" data-id="${e.id}" tabindex="0" role="button">
        <div class="rec__top"><span class="rec__ico">${icon(e.cat)}</span><span class="mono">${why}</span></div>
        <h3>${esc(e.title)}</h3>
        <p class="mono rec__meta">${DAYS[e.day].dow} ${e.start}–${e.end}<br>${ROOM[e.room].name}</p>
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
            <p class="mono">ACM CHI Conference on Human Factors in Computing Systems</p>
            <h1>CHI 2027<span>Bridges</span></h1>
          </div>
        </div>

        <div class="when">
          <div><p class="mono">When</p><p class="when__big">May 10–14</p><p class="dim">Monday to Friday, 2027</p></div>
          <div><p class="mono">Where</p><p class="when__big">Pittsburgh</p><p class="dim">${INFO.venue}</p></div>
          <div class="when__row">
            ${days > 0 ? `<p class="count"><b>${days}</b><span class="mono">days<br>to go</span></p>` : `<p class="count"><b>Now</b><span class="mono">on</span></p>`}
            <button class="btn btn--ghost btn--sm" data-go="map">${G.pin} Open the map</button>
          </div>
        </div>

        ${secHead('01', 'About CHI 2027')}
        <div class="about-s">
          <p class="lede">CHI is the leading international conference on human–computer interaction. For five days in May, researchers, designers and makers meet in Pittsburgh to share how people and technology shape each other.</p>
          <p>This year’s theme is <b>bridges</b> — after the city’s yellow river crossings, and the connections CHI builds between disciplines, communities and ideas.</p>
          <ul class="pillars">${PILLARS.map(p => `<li><i style="background:${p.color}"></i><b>${p.name}</b><span>${p.line}</span></li>`).join('')}</ul>
          <button class="btn btn--ghost btn--sm" data-go="about">More about CHI ${G.arrow}</button>
        </div>

        ${secHead('02', 'Discover CHI')}
        <div class="progs">${PROGRAMS.map((p, i) => {
          const n = EVENTS.filter(e => e.type === p.type).length;
          return `<details class="prog-row" name="prog">
            <summary><span class="mono">${String(i + 1).padStart(2, '0')}</span><b>${p.name}</b><em class="mono">${n}</em><i></i></summary>
            <div><p>${p.line}</p><button class="btn btn--ghost btn--sm" data-act="type" data-type="${p.type}">See ${p.name.toLowerCase()} ${G.arrow}</button></div>
          </details>`;
        }).join('')}</div>

        ${secHead('03', 'Browse by domain')}
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
      <nav>${NAV.map(([r, n]) => `<a href="#/${r}">${n}</a>`).join('')}</nav>
      <p class="mono dim">CHI is sponsored by ACM SIGCHI.<br>Prototype — sessions, rooms and people are sample content.</p>
      <button class="link" data-act="reset">Reset prototype</button>
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
      $('#ev-days').innerHTML = DAYS.map((d, i) => `<button class="day ${i === UI.evDay ? 'is-on' : ''} ${counts[i] ? '' : 'is-empty'}" data-act="ev-day" data-day="${i}" role="tab" aria-selected="${i === UI.evDay}"><span class="mono">${d.dow}</span><b>${d.d}</b>${(UI.evCat || UI.evType) && counts[i] ? `<i>${counts[i]}</i>` : ''}</button>`).join('');
      $$('#ev-cats .fchip').forEach(b => b.classList.toggle('is-on', (b.dataset.cat || null) === UI.evCat));
      const list = all.filter(e => e.day === UI.evDay).sort(sortEv);
      const slots = [];
      list.forEach(e => { const s = slots[slots.length - 1]; if (s && s.start === e.start) s.items.push(e); else slots.push({ start: e.start, items: [e] }); });
      const filt = UI.evType ? `<button class="fchip is-on fchip--x" data-act="ev-type-clear">${TYPES[UI.evType]} ${G.close}</button>` : '';
      $('#ev-list').innerHTML = `<p class="events__sum mono"><span>${dayLabel(UI.evDay)} · ${list.length} event${list.length === 1 ? '' : 's'}</span>${filt}</p>` + (list.length
        ? slots.map((s, i) => `<div class="slot rise" style="--i:${i}"><p class="slot__t mono">${s.start}</p><div class="slot__items">${s.items.map(e => evCard(e)).join('')}</div></div>`).join('')
        : `<div class="empty"><div class="empty__px"><i></i><i></i><i></i></div><p>No matching events on ${DAYS[UI.evDay].dow}.</p>${counts.some(Boolean) ? `<button class="btn btn--ghost btn--sm" data-act="ev-next">Jump to the next one</button>` : `<button class="btn btn--ghost btn--sm" data-act="ev-clear">Clear filters</button>`}</div>`);
    },
  };

  /* ---------- 9. About ---------- */
  const About = {
    html() {
      return `${bar()}<section class="about stagger">
        <p class="mono">About</p>
        <h1 class="display">Where people<br>and technology<br>meet.</h1>
        <p class="lede">The ACM CHI Conference on Human Factors in Computing Systems is the leading international conference on human–computer interaction.</p>
        <p>CHI 2027 comes to Pittsburgh — a city that moved from steel to culture and technology — under the theme <b>bridges</b>. The week brings together papers, posters, interactive demos, panels, workshops and meet-ups, all under one roof at the ${INFO.venue}, the first LEED-certified convention center in North America.</p>

        ${secHead('01', 'Three threads')}
        <p>Everything at CHI pulls on three threads. They are also the three brand colours.</p>
        <ul class="pillars pillars--big">${PILLARS.map(p => `<li><i style="background:${p.color}"></i><b>${p.name}</b><span>${p.line}</span></li>`).join('')}</ul>

        ${secHead('02', 'Twelve domains')}
        <p>Each domain is a different mix of the three threads — which is where its colour comes from. Tap one to see its events.</p>
        <div class="mixes">${CATS.map(c => `<button class="mixrow" style="--c:${c.color}" data-act="domain" data-cat="${c.id}">${icon(c.id)}<span><b>${c.name}</b>${mixBar(c.mix)}</span></button>`).join('')}</div>

        ${secHead('03', 'The venue')}
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
    toggle(el) { toggleSched(el.dataset.id); },
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
  });
  document.addEventListener('change', e => {
    const t = e.target;
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
