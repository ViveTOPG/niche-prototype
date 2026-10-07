/* =====================================================================
   Landing page (site/home): motion-first homepage built around the
   original logo's two dots. Green dot = traders, purple dot = organisers.
   Hero: the two dots (flat, 2D) open onto the hero motion graphic
   (hero-motion/, rendered to MP4), playing full screen. They
   rest at its corners and fly down with the scroll to become the Trader and
   Organiser circles.
   Motion: GSAP + ScrollTrigger (cdnjs) and Lenis (jsDelivr), used on this
   page only and torn down on every route change. Without them (or with
   reduced motion) the page renders as a static, fully usable layout.
   ===================================================================== */
(() => {
'use strict';
const { $, $$, ic, esc, db } = N;

/* The hero video: the live site's own hero sequence (niche-live-demo.netlify.app), rendered frame by frame. */
const VIDEO = { wide: 'assets/niche-hero-16x9', tall: 'assets/niche-hero-9x16', still: 21.0 }; // .mp4 + .jpg poster (the "Find your perfect pitch." frame)
const tallScreen = () => matchMedia('(max-width: 760px)').matches;

/* ---------- the original logo, rebuilt exactly as the live site draws it ----------
   Box 1460:625; logo-without-dots.png at top 12%, height 60.32%, object-fit contain;
   green dot (#58a63b) left 25.2% top 0.8%, purple dot (#948fcf) left 25.2% top 84.48%, both 6.38% wide. */
const LOGO = 'assets/logo-without-dots.png';
N.logo = (cls = '') => `<span class="nlogo ${cls}" role="img" aria-label="Niche"><img class="nl-img" src="${LOGO}" alt="" draggable="false"><i class="nl-dot nl-t"></i><i class="nl-dot nl-o"></i></span>`;

const S = N.state.lp = N.state.lp || { aud: null, intro: false };
const LP = { alive: false, offs: [], ios: [], loops: new Set() };
const hasG = () => !!(window.gsap && window.ScrollTrigger);
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); LP.offs.push(() => t.removeEventListener(ev, fn, o)); };
const protoOff = () => { const p = $('.proto'); return p && getComputedStyle(p).position === 'sticky' ? p.offsetHeight : 0; };
const fineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
const words = (s, cls = '') => s.split(' ').map(w => `<span class="wd"><span class="${cls}">${w}</span></span>`).join(' ');
const ini = s => s.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const dd = s => N.fd(s, { day: '2-digit', month: 'short' }).toUpperCase();

/* ---------- sample data for the rings ---------- */
const EVENTS = () => Object.entries(db.events).filter(([, e]) => e.status === 'published').map(([id, e]) => ({ id, ...e }));
const TRADERS = () => Object.entries(db.traders).filter(([, t]) => t.status === 'approved' && (t.score || 0) >= 85).map(([id, t]) => ({ id, ...t }));
const fill = (list, min) => { const out = []; while (out.length < min) out.push(...list); return out; };

/* demo images from the live NICHE demo (niche-demo-backend …/static/demo): each event's first and second photo, each trader's logo */
const EVENT_IMG = { camden: ['night-festival', 'farmers-market'], manchester: ['food-truck-rodeo', 'market-stalls-1'], bristol: ['street-food-plaza', 'paella-pan'], brighton: ['food-festival-green', 'night-festival'], york: ['market-stalls-2', 'food-truck-rodeo'], leeds: ['festival-tents', 'street-food-plaza'], birmingham: ['food-truck-row', 'farmers-market'], cotswolds: ['farmers-market', 'market-stalls-2'], cardiff: ['market-stalls-1', 'festival-tents'] };
const TRADER_LOGO = { mw: 'masala-wheels', gs: 'gelato-sofia', st: 'smokehouse-tom', tb: 'tokyo-bites', gb: 'green-bowl', pp: 'pizza-pilot', cs: 'chai-and-samosa', cr: 'crepe-station', wo: 'wild-oats-bakery', fs: 'falafel-street', bb: 'burger-barn', bs: 'bob-spice-kitchen' };
const evImg = (id, i, n) => { const set = EVENT_IMG[id]; return set ? `assets/demo/events/${set[Math.floor(i / n) % set.length]}.jpg` : ''; };

const evCard = (e, i, all) => {
  const open = Math.max(0, e.pitches - e.filled), img = evImg(e.id, i, new Set(all.map(x => x.id)).size);
  return `<button type="button" class="rc rc-ev v${i % 5}${img ? ' has-img' : ''}" data-go="site/events/${e.id}" data-label="${esc(e.name)}" data-sub="${esc(e.city)} · ${N.fd(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}" aria-label="${esc(e.name)}, ${esc(e.city)}: ${open} pitches open"><span class="rc-in">
    ${img ? `<img class="rc-ph" src="${img}" alt="" decoding="async" draggable="false">` : '<span class="rc-aw" aria-hidden="true"></span>'}
    <span class="rc-meta"><span>${dd(e.date)}</span><span>${esc(e.city)}</span></span>
    <span class="rc-bot"><span class="rc-num">${open}</span><span class="rc-cap">pitches open</span>
    <span class="rc-name">${esc(e.name)}</span></span></span></button>`;
};
const trCard = (t, i) => {
  const logo = TRADER_LOGO[t.id];
  return `<button type="button" class="rc rc-tr v${i % 5}" data-go="site/traders/${t.id}" data-label="${esc(t.biz)}" data-sub="${esc(t.food)} · ${esc(t.city)}" aria-label="${esc(t.biz)}, ${esc(t.food)}: passport ${t.score}% complete"><span class="rc-in">
    <span class="rc-meta"><span>${esc(t.city)}</span><span>Since ${t.since}</span></span>
    ${logo ? `<span class="rc-logo"><img src="assets/demo/logos/${logo}.svg" alt="" decoding="async" draggable="false"></span>` : `<span class="rc-mono" style="--p:${t.score}"><b>${ini(t.biz)}</b></span>`}
    <span class="rc-name">${esc(t.biz)}</span><span class="rc-food">${esc(t.food)}</span>
    <span class="rc-pass" style="--p:${t.score}"><span class="rc-bar"><i></i></span><span class="rc-chip">${ic('check')}Passport ${t.score}%</span></span></span></button>`;
};

/* ---------- step visuals (CSS-animated when the step card gets .play) ---------- */
const VZ = {
  passport: () => `<div class="vz vz-pass" aria-hidden="true"><div class="pp">
    <div class="pp-h"><span class="pp-av">AG</span><span class="pp-n"><b>Alice Green Foods</b><small>Food Trader Passport</small></span></div>
    <div class="pp-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="tr"/><circle cx="60" cy="60" r="52" class="fg" pathLength="100"/></svg><span><b data-count="100">0</b><small>% ready</small></span></div>
    <ul class="pp-ch">${['Hygiene 5', '£5m insurance', 'Gas safe', 'Allergens'].map((c, i) => `<li style="--d:${i}">${ic('check')}${c}</li>`).join('')}</ul></div></div>`,
  apply: () => `<div class="vz vz-apply" aria-hidden="true"><div class="ap">
    <span class="ap-aw"></span>
    <div class="ap-b"><small class="mono">FRI 02 OCT · LONDON</small><b>Camden Night Market</b><span class="ap-ok">${ic('check')}You meet every requirement</span></div>
    <span class="ap-btn"><span class="a">Apply with passport</span><span class="b">${ic('check')}Applied</span></span></div><span class="ap-tap"></span></div>`,
  booked: () => `<div class="vz vz-book" aria-hidden="true"><div class="bk"><small class="mono">YOU'RE BOOKED</small><b>Pitch <span data-count="12">0</span></b><small>Camden Night Market · Fri 2 Oct · 17:00</small></div><span class="bk-stamp">Approved</span></div>`,
  rules: () => `<div class="vz vz-rules" aria-hidden="true"><div class="rq"><small class="mono">NEW EVENT</small><b>Camden Night Market</b><ul>${['Hygiene rating 4+', '£5m public liability', 'Gas safety certificate', '16A power'].map((r, i) => `<li style="--d:${i}"><span>${r}</span><i class="tg"></i></li>`).join('')}</ul></div></div>`,
  checked: () => `<div class="vz vz-check" aria-hidden="true"><div class="ck">${[['Masala Wheels', 'Gujarati street food'], ['Gelato Sofia', 'Small-batch gelato'], ['Wild Oats Bakery', 'Sourdough and bakes']].map(([n, f], i) => `<div class="ck-r" style="--d:${i}"><span class="ck-av">${ini(n)}</span><span class="ck-n"><b>${n}</b><small>${f}</small></span><span class="ck-s"><i class="sp"></i><span class="ok">${ic('check')}Checked</span></span></div>`).join('')}</div></div>`,
  approve: () => `<div class="vz vz-appr" aria-hidden="true"><div class="pm"><small class="mono">PITCH MAP · CAMDEN</small><div class="pm-g">${Array.from({ length: 12 }, (_, i) => `<span class="${[0, 1, 3, 5, 6, 9, 10].includes(i) ? 'f' : ''}${i === 7 ? ' tgt' : ''}">${i + 1}</span>`).join('')}</div><span class="pm-btn"><span class="a">Approve Masala Wheels</span><span class="b">${ic('check')}Approved · Pitch 8</span></span></div></div>`,
};

const AUD = {
  trader: {
    eye: 'For food traders', ring: words('Food events across the UK,') + ' ' + words('looking for traders.', 'em'),
    cards: () => fill(EVENTS(), 16).map(evCard), more: ['site/events', 'Browse all events'],
    steps: [['Build your passport once.', 'Hygiene, insurance, gas and allergens. Checked and kept current.', 'passport'], ['Apply in one tap.', 'Your passport goes with every application.', 'apply'], ['Get booked.', 'Approvals, pitch numbers and reminders in one place.', 'booked']],
    say: ['One passport.', 'Every event.'],
    dot: ['Create your passport', 'site/register'],
    links: [['trader/dashboard', 'Open the trader demo'], ['site/pricing-trader', 'Trader pricing'], ['site/what-is-passport', 'What is the passport?']],
    fine: 'Your compliance profile belongs to you.',
  },
  org: {
    eye: 'For event organisers', ring: words('Traders trusted by') + ' ' + words('the UK’s best events.', 'em'),
    cards: () => fill(TRADERS(), 16).map(trCard), more: ['site/traders', 'Browse traders'],
    steps: [['Post your event.', 'Set your rules once: hygiene, insurance, gas and power.', 'rules'], ['Applicants arrive checked.', 'Every document is verified before it reaches you.', 'checked'], ['Approve in one click.', 'Pick, pitch and confirm. Paperwork included.', 'approve']],
    say: ['Every trader,', 'already checked.'],
    dot: ['List your event', 'site/register'],
    links: [['org/dashboard', 'Open the organiser demo'], ['site/pricing-organiser', 'Organiser pricing'], ['act:hm_demo', 'Book a demo']],
    fine: 'Free for your first year. 8% on confirmed bookings after.',
  },
};

/* ---------- markup ---------- */
function nav() {
  return `<header class="lp-nav" data-tone="light">
    <button type="button" class="lp-pill lp-menu" data-act="lp_menu" aria-label="Open menu" aria-haspopup="dialog"><i aria-hidden="true"></i>Menu</button>
    <button type="button" class="lp-navlogo" data-go="site/home" aria-label="Niche home">${N.logo('lp-nl')}</button>
    <div class="lp-navr">
      <div class="lp-seg" role="group" aria-label="Show the page for" ${S.aud ? '' : 'hidden'}><button type="button" data-act="lp_pick" data-aud="trader" aria-pressed="${S.aud === 'trader'}">Traders</button><button type="button" data-act="lp_pick" data-aud="org" aria-pressed="${S.aud === 'org'}">Organisers</button></div>
      <button type="button" class="lp-pill lp-login" data-go="site/login">Log in</button>
      <button type="button" class="lp-pill lp-cta" data-go="site/register">Get started</button>
    </div></header>`;
}
function hero() {
  const src = tallScreen() ? VIDEO.tall : VIDEO.wide;
  return `<section class="lp-hero" id="lpHero" data-tone="light" aria-labelledby="lpH1">
    <h1 class="sr" id="lpH1">Find your perfect pitch.</h1>
    <div class="lp-card" id="lpCard" data-note="A 23.5 s motion graphic made for this page in the two-dot language: events need food, the paperwork piles up, the green dot (traders) turns it into a passport, the purple dot (organisers) sees who is ready, one tap brings them together, free on both sides. 60 fps, 16:9 on desktop and phone-shaped on mobile, looping seamlessly.">
      <video id="lpVid" src="${src}.mp4" poster="${src}.jpg" muted autoplay loop playsinline preload="auto" aria-label="NICHE: food traders and event organisers, checked and matched"></video>
      <button type="button" class="lp-vbtn" id="lpVbtn" aria-label="Pause video"></button>
    </div>
    <div class="lp-cue mono" aria-hidden="true"><span>Scroll</span><i></i></div>
  </section>`;
}
function chooser() {
  return `<section class="lp-choose" id="lpChoose" data-tone="light" aria-labelledby="lpChT">
    <i class="lp-sweep t" aria-hidden="true"></i><i class="lp-sweep o" aria-hidden="true"></i>
    <div class="lp-ch-head"><p class="lp-eye mono">Two sides. One platform.</p><h2 class="lp-h2" id="lpChT">Which side are you on?</h2></div>
    <div class="lp-dots">
      <button type="button" class="lp-pick t" data-act="lp_pick" data-aud="trader" data-cursor="Pick" aria-pressed="${S.aud === 'trader'}"><span class="pk-in"><b>Trader</b><small>I sell food at events</small></span></button>
      <button type="button" class="lp-pick o" data-act="lp_pick" data-aud="org" data-cursor="Pick" aria-pressed="${S.aud === 'org'}"><span class="pk-in"><b>Organiser</b><small>I run food events</small></span></button>
    </div>
    <p class="lp-ch-hint mono" aria-hidden="true">Tap a dot. The page below changes for you.</p>
  </section>`;
}
function audHTML(k) {
  const A = AUD[k];
  const linkBtn = ([p, l]) => p.startsWith('act:') ? `<button type="button" class="lp-link" data-act="${p.slice(4)}">${l}</button>` : `<button type="button" class="lp-link" data-go="${p}">${l}</button>`;
  return `<section class="lp-ring-sec" data-tone="dark" aria-labelledby="lpRingT">
      <div class="lp-ring-head"><p class="lp-eye mono">${A.eye}</p><h2 class="lp-h2 lp-split" id="lpRingT">${A.ring}</h2></div>
      <div class="lp-stage" id="lpStage" data-cursor="Drag" data-note="A 3D ring like weichie.com: it turns on its own, follows a drag with momentum and speeds up as you scroll. Cards use the prototype's sample ${k === 'trader' ? 'events' : 'traders'} and open their pages."><div class="lp-ring">${A.cards().join('')}</div></div>
      <div class="lp-ring-foot"><p class="lp-ring-lab" id="lpRingLab" aria-live="polite"></p><button type="button" class="lp-btn" data-go="${A.more[0]}">${A.more[1]}${ic('arrow-right')}</button></div>
    </section>
    <section class="lp-steps-sec" data-tone="dark" aria-label="How it works"><p class="lp-eye mono lp-center">How it works</p><div class="lp-steps">${A.steps.map(([t, s, v], i) => `<article class="lp-step s${i}" style="--i:${i}"><div class="st-txt"><span class="st-n mono">0${i + 1}</span><h3>${t}</h3><p>${s}</p></div><div class="st-vz">${VZ[v]()}</div></article>`).join('')}</div></section>
    <section class="lp-state" data-tone="dark"><p class="lp-says">${A.say.map(l => `<span class="ln">${l.split(' ').map(w => `<span class="w">${w}</span>`).join(' ')}</span>`).join('')}</p></section>
    <section class="lp-final" data-tone="dark">
      <button type="button" class="lp-bigdot" data-go="${A.dot[1]}" data-cursor="Go"><span>${A.dot[0]}</span>${ic('arrow-right')}</button>
      <div class="lp-final-links">${A.links.map(linkBtn).join('')}</div>
      <p class="lp-fine">${A.fine}</p>
    </section>`;
}
function foot() {
  const L = [['site/events', 'Events'], ['site/traders', 'Traders'], ['site/how-it-works-trader', 'For traders'], ['site/how-it-works-organiser', 'For organisers'], ['site/about', 'About us'], ['site/help', 'Help'], ['site/blog', 'Blog'], ['site/data-trust', 'Data trust'], ['site/privacy', 'Privacy'], ['site/terms', 'Terms'], ['brand/guidelines', 'Brand guidelines'], ['site/home-classic', 'Previous homepage']];
  return `<footer class="lp-foot" data-tone="dark">
    <nav class="lp-foot-links" aria-label="Footer">${L.map(([p, l]) => `<button type="button" data-go="${p}">${l}</button>`).join('')}</nav>
    ${N.logo('lp-foot-logo inv')}
    <div class="lp-foot-base mono"><span>© 2026 NICHE PLATFORMS LTD. ALL RIGHTS RESERVED.</span><span>info@nicheconnect.co</span></div>
  </footer>`;
}

/* =====================================================================
   3D ring (weichie-style): concave cylinder of cards, the viewer inside
   ===================================================================== */
function Ring(stage) {
  const ringEl = $('.lp-ring', stage), cards = $$('.rc', stage), lab = $('#lpRingLab'), n = cards.length, step = 360 / n;
  const AUTO = N.reduce ? 0 : -5.5, TILT = -3;
  let R = 1000, rot = 0, vel = AUTO, drag = false, lastX = 0, lastT = 0, downX = 0, moved = 0, front = -1, vis = true, lastScroll = 0;
  function layout() {
    const W = stage.clientWidth, mob = W < 700;
    const cw = mob ? Math.min(W * .58, 250) : Math.min(Math.max(W * .2, 230), 320), ch = cw * 1.32;
    R = (cw * 1.1) * n / (2 * Math.PI);
    stage.style.setProperty('--cw', cw + 'px'); stage.style.setProperty('--ch', ch + 'px');
    stage.style.perspective = Math.round(R * (mob ? 1.15 : 1)) + 'px';
    cards.forEach((c, i) => { c.style.transform = `rotateY(${i * step}deg) translateZ(${-R}px)`; });
    paint();
  }
  function paint() {
    const tr = TILT * Math.PI / 180;
    ringEl.style.transform = `translate3d(0,${(-R * Math.sin(tr)).toFixed(1)}px,${R.toFixed(1)}px) rotateX(${TILT}deg) rotateY(${rot.toFixed(3)}deg)`;
    let best = 999, bi = 0;
    cards.forEach((c, i) => {
      const a = ((i * step + rot) % 360 + 540) % 360 - 180, ab = Math.abs(a);
      const hide = ab > 70; if (c._h !== hide) { c._h = hide; c.style.visibility = hide ? 'hidden' : ''; c.tabIndex = ab > 40 ? -1 : 0; }
      if (!hide) c.style.setProperty('--f', Math.max(0, Math.min(1, (ab - 30) / 40)).toFixed(3));
      if (ab < best) { best = ab; bi = i; }
    });
    if (bi !== front) { front = bi; const c = cards[bi]; if (lab) { lab.classList.remove('sw'); void lab.offsetWidth; lab.classList.add('sw'); lab.innerHTML = `<b>${c.dataset.label}</b><span>${c.dataset.sub}</span>`; } }
  }
  function frame(dt) {
    if (!vis) return;
    if (!drag) {
      vel += (AUTO - vel) * (1 - Math.pow(.95, dt * 60));
      rot += vel * dt;
      const sv = LP.lenis ? LP.lenis.velocity : 0; if (sv) rot -= sv * .045;
    }
    paint();
  }
  const degPerPx = () => 180 / (Math.PI * R);
  const down = e => { if (e.button > 0) return; drag = true; lastX = downX = e.clientX; lastT = performance.now(); moved = 0; vel = 0; stage.classList.add('drag'); };
  const move = e => {
    if (!drag) return;
    const dx = e.clientX - lastX, now = performance.now(), dtt = Math.max(1, now - lastT) / 1000;
    lastX = e.clientX; lastT = now; moved = Math.max(moved, Math.abs(e.clientX - downX));
    const d = dx * degPerPx(); rot += d; vel = vel * .7 + (d / dtt) * .3;
  };
  const up = () => { if (!drag) return; drag = false; stage.classList.remove('drag'); if (performance.now() - lastT > 120) vel = AUTO; vel = Math.max(-140, Math.min(140, vel)); };
  on(stage, 'pointerdown', down); on(window, 'pointermove', move); on(window, 'pointerup', up); on(window, 'pointercancel', up);
  on(stage, 'click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); moved = 0; } }, true);
  on(stage, 'dragstart', e => e.preventDefault());
  /* keyboard: arrows turn the ring one card */
  on(stage, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); rot += (e.key === 'ArrowLeft' ? 1 : -1) * step; vel = AUTO; } });
  const io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(stage); LP.ios.push(io);
  layout();
  on(window, 'resize', layout);
  return { frame, layout, destroy() { io.disconnect(); } };
}

/* =====================================================================
   Page controller
   ===================================================================== */
function loop() {
  let last = performance.now();
  const step = () => { const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; LP.loops.forEach(f => f(dt)); };
  /* on the GSAP ticker everything (tweens, Lenis, canvas, DOM dots) updates in the same tick, so nothing lags a frame */
  if (window.gsap) { LP.tickLoop = () => { if (LP.alive) step(); }; gsap.ticker.add(LP.tickLoop); return; }
  const tick = () => { if (!LP.alive) return; step(); LP.raf = requestAnimationFrame(tick); };
  LP.raf = requestAnimationFrame(tick);
}

/* =====================================================================
   Hero: the logo's two dots (flat, 2D).
   Opening: they pop in side by side and jelly-bounce, swing like a pendulum
   (one floods its half of the screen, pinches to a line, the other floods
   back), then purple floods the screen and recedes into its dot at the
   bottom-right corner, uncovering the video playing full screen.
   Rest: green at the top-left corner, purple at the bottom-right.
   Scroll: they fly down and become the Trader and Organiser circles.
   ===================================================================== */
const ease = { io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, out: x => 1 - Math.pow(1 - x, 3) };
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = v => Math.max(0, Math.min(1, v));
const GREEN = '#58A63B', PURPLE = '#948FCF';
const dotR = () => { const W = innerWidth, mob = W < 760; return { t: mob ? W * .068 : Math.min(W * .029, 44), o: mob ? W * .058 : Math.min(W * .025, 38) }; };

/* the opening, drawn on a canvas so overlaps can cut holes (XOR), like the reference */
function IntroCanvas(hero) {
  const cv = document.createElement('canvas'); cv.className = 'lp-intro-cv'; cv.setAttribute('aria-hidden', 'true');
  LP.root.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, X = 0, Y = 0, dpr = 1;
  function size() { const r = hero.getBoundingClientRect(); X = r.left; Y = r.top; W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2); cv.style.left = X + 'px'; cv.style.top = Y + 'px'; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  size();
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); };
  function capsule(x, y, r, j, pop) {          /* a dot that can stretch upwards into a pill (jelly) */
    const w = r * 2 * (1 - .26 * j) * pop, h = r * 2 * (1 + .85 * j) * pop, cy = y - r * .85 * j * pop;
    ctx.beginPath(); ctx.roundRect(x - w / 2, cy - h / 2, w, h, w / 2);
  }
  /* radius paced to what the eye sees (tuned frame by frame): slow while the edge is on screen, quick once it is past the edges */
  const grow = (a, b, u, k) => a + (b - a) * Math.pow(u, k);           // a small circle growing big
  const shrink = (a, b, u, k) => b + (a - b) * Math.pow(1 - u, k);     // a big circle shrinking small, landing at zero speed
  const sine = u => -(Math.cos(Math.PI * u) - 1) / 2;
  function draw(O) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const mob = W < 760, r = mob ? Math.min(W * .075, 30) : Math.min(W * .026, 40), cx = W / 2, cy = H / 2;
    const gx = cx - r, px = cx + r, big = Math.hypot(W, H) * 1.25, Rb = W * 3;
    const fill = c => { ctx.fillStyle = c; ctx.fill(); };
    const hole = (x, y, rr, c) => { ctx.globalCompositeOperation = 'xor'; circle(x, y, rr); ctx.fillStyle = c; ctx.fill(); ctx.globalCompositeOperation = 'source-over'; };   // own colour outside the flood, a cut-out inside it
    if (O.rc > 0) {                                /* purple gathers back into its dot at the bottom-right corner, uncovering the video from the top-left */
      const a = LP.anchor, u = O.rc, tx = a ? a.o[0] - X : W - 60, ty = a ? a.o[1] - Y : H - 60, tr = a ? a.ro : r;
      circle(lerp(cx, tx, sine(u)), lerp(cy, ty, sine(u)), shrink(big, tr, u, 1.5)); fill(PURPLE);
      return;
    }
    if (O.fl > 0) {                                /* purple floods the whole screen; green is a hole that refills from its centre */
      const u = O.fl;
      circle(lerp(px, cx, sine(u)), cy, grow(r, big, u, 1.5)); fill(PURPLE);
      hole(gx, cy, r, GREEN);
      if (O.back > 0) { circle(gx, cy, r * O.back); fill(GREEN); }
      return;
    }
    if (O.dR > 0) {                                /* A': green shrinks back into its dot, its right edge sliding home */
      const u = O.dR;
      const R = shrink(big, r, u, 2); circle(lerp(px, cx, sine(u)) - R, cy, R); fill(GREEN); hole(px, cy, r, PURPLE);
      return;
    }
    if (O.cX > 0) {                                /* B': out of the line green opens left, its right edge reaching purple's centre */
      const v = O.cX, xl = lerp(gx, -40, v), xr = lerp(gx, px, v);
      ctx.save(); circle(xl + Rb, cy, Rb); ctx.clip(); circle(xr - big, cy, big); fill(GREEN); ctx.restore(); hole(px, cy, r, PURPLE);
      return;
    }
    if (O.bX > 0) {                                /* B: purple's right edge sweeps in until it is a line through green's centre */
      const xr = lerp(W + 40, gx, O.bX);
      ctx.save(); circle(xr - Rb, cy, Rb); ctx.clip(); circle(gx + big, cy, big); fill(PURPLE); ctx.restore(); hole(gx, cy, r, GREEN);
      return;
    }
    if (O.aR > 0) {                                /* A: purple blooms to the right; its left edge slides onto green's centre, cutting green in half */
      const u = O.aR, R = grow(r, big, u, 2), edge = lerp(cx, gx, sine(Math.min(1, u * 1.6)));
      circle(edge + R, cy, R); fill(PURPLE); hole(gx, cy, r, GREEN);
      return;
    }
    capsule(gx, cy, r, O.jT, O.popT); fill(GREEN);  /* pop in + jelly */
    capsule(px, cy, r, O.jO, O.popO); fill(PURPLE);
  }
  return { draw, size, el: cv, remove() { cv.remove(); } };
}

/* the two dots as a fixed overlay, positioned every frame from the video, the scroll and the chooser */
function Dots() {
  const fly = $('#lpFly'), el = { t: $('.lp-dot.t', fly), o: $('.lp-dot.o', fly) };
  const card = $('#lpCard'), hero = $('#lpHero'), choose = $('#lpChoose'), picks = { t: $('.lp-pick.t', choose), o: $('.lp-pick.o', choose) };
  const O = LP.O;
  let t = 0;
  const P = { x: -1e4, y: -1e4 };
  const S = { t: { x: 0, y: 0, vx: 0, vy: 0, init: false }, o: { x: 0, y: 0, vx: 0, vy: 0, init: false } };
  function frame(dt) {
    if (!N.reduce) t += dt;
    const W = innerWidth, mob = W < 760, R = dotR();
    const cr = card.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    const q = LP.motion && LP.chooseST ? LP.chooseST.progress : 0, qe = ease.io(q);
    const live = O.intro >= 1;                       // the opening has handed over to the DOM dots
    fly.style.opacity = (live || O.hand > 0) && q < .999 && hr.bottom > -400 ? '1' : '0';
    choose.classList.toggle('arrived', !LP.motion || q >= .999);
    /* rest: green at the video's top-left corner (clear of the floating nav), purple at its bottom-right */
    const inset = mob ? 30 : 54, navClear = mob ? 70 : 92, bottom = Math.min(cr.bottom, innerHeight);   // phones: the prototype bar pushes the hero below the fold, so rest on the visible edge
    const breathe = (ph, a) => Math.sin(t * 1.5 + ph) * a;
    const A = { t: [cr.left + inset + breathe(0, 1.5), cr.top + inset + navClear + breathe(.6, 2.5)], o: [cr.right - inset + breathe(2, 1.5), bottom - inset + breathe(2.6, 2.5)] };
    LP.anchor = { o: A.o, ro: R.o };              // where the opening's purple flood gathers, exactly where the dot rests
    /* where the opening leaves green: the centre of the hero */
    const HW = hr.width, ir = HW < 760 ? Math.min(HW * .075, 30) : Math.min(HW * .026, 40), C = [hr.left + HW / 2, hr.top + hr.height / 2];   // same size and place as the canvas dot
    const I = { t: [C[0] - ir, C[1]], o: A.o };
    const pr = { t: picks.t.getBoundingClientRect(), o: picks.o.getBoundingClientRect() };
    ['t', 'o'].forEach(k => {
      const settle = k === 't' ? ease.io(clamp01(O.gSettle)) : 1;
      let x = lerp(I[k][0], A[k][0], settle), y = lerp(I[k][1], A[k][1], settle);
      let size = k === 't' ? lerp(ir, R.t, settle) : R.o * O.pPop;
      /* a gentle lean toward the cursor while resting */
      if (live && q <= 0) { const dx = P.x - x, dy = P.y - y, d = Math.hypot(dx, dy), reach = R[k] * 3.2; if (d < reach) { const f = (1 - d / reach) * .2; x += dx * f; y += dy * f; } }
      /* fly into the chooser circle */
      const tr = pr[k], tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
      x = lerp(x, tx, qe); y = lerp(y, ty, qe); size = lerp(size, tr.width / 2, qe);
      const s = S[k];
      if (!s.init || !live || q > 0 || N.reduce) { s.vx = s.init ? (x - s.x) / Math.max(dt, .001) : 0; s.vy = s.init ? (y - s.y) / Math.max(dt, .001) : 0; s.x = x; s.y = y; s.init = true; }
      else { const k1 = 160, c1 = 19; s.vx += ((x - s.x) * k1 - s.vx * c1) * dt; s.vy += ((y - s.y) * k1 - s.vy * c1) * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
      const sp = Math.hypot(s.vx, s.vy), st = q > 0 ? 0 : Math.min(.22, sp / 3200), ang = Math.atan2(s.vy, s.vx);
      const jelly = k === 'o' ? O.pSq : 0;             // purple touches down with a soft jelly
      const e = el[k];
      e.style.width = e.style.height = (size * 2).toFixed(1) + 'px';
      e.style.transform = `translate3d(${(s.x - size).toFixed(1)}px,${(s.y - size).toFixed(1)}px,0) rotate(${ang}rad) scale(${(1 + st).toFixed(3)},${(1 - st * .5).toFixed(3)}) rotate(${-ang}rad) scale(${(1 + jelly).toFixed(3)},${(1 - jelly).toFixed(3)})`;
      e.style.opacity = k === 'o' && O.pPop <= 0 ? '0' : '1';
    });
  }
  on(window, 'pointermove', e => { P.x = e.clientX; P.y = e.clientY; });
  return { frame };
}

function heroVideo() {
  const v = $('#lpVid'), btn = $('#lpVbtn'), hero = $('#lpHero');
  if (!v) return;
  const icon = paused => paused ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5h2v9H5zM9 3.5h2v9H9z" fill="currentColor"/></svg>';
  let user = N.reduce;            // paused by the viewer (or by reduced motion)
  const paint = () => { btn.innerHTML = icon(v.paused); btn.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video'); };
  const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  if (N.reduce) { v.removeAttribute('autoplay'); v.pause(); const seek = () => { try { v.currentTime = VIDEO.still; } catch (e) { /* not ready */ } }; if (v.readyState >= 1) seek(); else v.addEventListener('loadedmetadata', seek, { once: true }); }
  on(v, 'play', paint); on(v, 'pause', paint); paint();
  on(btn, 'click', e => { e.stopPropagation(); if (v.paused) { user = false; play(); } else { user = true; v.pause(); } });
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { if (!user) play(); } else v.pause(); });
  io.observe(hero); LP.ios.push(io);
  /* the hero motion graphic is light all the way through (paper, the logo green, the logo purple), so the nav stays dark-on-light */
  const bgDark = () => false;
  on(v, 'timeupdate', () => heroTone());
  LP.vid = { bgDark, restart() { try { v.currentTime = 0; } catch (e) { /* not ready */ } if (!user) play(); } };
}

function intro(G) {
  const O = LP.O; Object.assign(O, { intro: 0, hand: 0, popT: 0, popO: 0, jT: 0, jO: 0, aR: 0, bX: 0, cX: 0, dR: 0, fl: 0, back: 0, rc: 0, gSettle: 0, pPop: 0, pSq: 0 });
  const root = LP.root, hero = $('#lpHero'), card = $('#lpCard');
  const navEl = $('.lp-nav', root), cue = $('.lp-cue', root);
  const cv = IntroCanvas(hero); LP.introCv = cv;
  const paint = () => { if (LP.introCv) cv.draw(O); };
  G.set(card, { autoAlpha: 0 }); G.set(navEl, { autoAlpha: 0, y: -14 }); G.set(cue, { autoAlpha: 0, y: 14 });
  const tl = G.timeline({ defaults: { ease: 'power3.inOut' }, onUpdate: paint, onComplete: done });
  tl.to(O, { popT: 1, duration: .6, ease: 'back.out(1.7)' }, .1)                         // the two dots pop in, side by side
    .to(O, { popO: 1, duration: .6, ease: 'back.out(1.7)' }, .2)
    .to(O, { jO: 1, duration: .28, ease: 'power2.out' }, .55)                            // jelly: purple stretches up into a pill...
    .to(O, { jO: 0, duration: .8, ease: 'elastic.out(1, .6)' }, .83)                     // ...and settles with one soft overshoot
    .to(O, { jT: 1, duration: .28, ease: 'power2.out' }, .67)                            // green answers
    .to(O, { jT: 0, duration: .75, ease: 'elastic.out(1, .6)' }, .95)
    /* pendulum: the circles' radii carry their own easing (see draw), so these clocks run steady */
    .to(O, { aR: 1, duration: .8, ease: 'none' }, 1.72)                                  // purple blooms right, cutting green in half
    .to(O, { bX: 1, duration: .38, ease: 'sine.in' }, 2.52)                              // it swings back in, gathering speed into the line...
    .to(O, { cX: 1, duration: .36, ease: 'sine.out' }, 2.9)                              // ...and green swings out of it to the left
    .to(O, { dR: 1, duration: .8, ease: 'none' }, 3.26)                                  // green gathers back into its dot
    .to(O, { fl: 1, duration: .95, ease: 'none' }, 4.1)                                  // purple floods the whole screen, green is a hole in it
    .to(O, { back: 1, duration: .38, ease: 'power3.out' }, 4.88)                         // ...which refills with green from its centre
    .set(card, { autoAlpha: 1 }, 5.06)                                                   // the video is ready underneath, fully covered
    .call(() => LP.vid && LP.vid.restart(), null, 5.06)
    .set(O, { hand: 1 }, 5.28)                                                           // the DOM dots take over, above the canvas
    .to(O, { rc: 1, duration: 1.15, ease: 'none' }, 5.28)                                // purple gathers into its dot at the bottom-right corner, uncovering the video
    .to(O, { gSettle: 1, duration: 1.15, ease: 'none' }, 5.28)                           // green glides to the top-left corner
    .add(() => { O.pPop = 1; if (LP.introCv) { LP.introCv.remove(); LP.introCv = null; } }, 6.43)
    .to(O, { pSq: .08, duration: .12, ease: 'sine.out' }, 6.43)                          // a soft touch-down
    .to(O, { pSq: 0, duration: .6, ease: 'elastic.out(1, .55)' }, 6.55)
    .to(navEl, { autoAlpha: 1, y: 0, duration: .9, ease: 'expo.out' }, 5.9)
    .to(cue, { autoAlpha: 1, y: 0, duration: .9, ease: 'expo.out' }, 6.15)
    .set(O, { intro: 1 }, 6.43);
  function done() {
    S.intro = true; Object.assign(O, { intro: 1, hand: 1, rc: 1, gSettle: 1, pPop: 1, pSq: 0 });
    if (LP.introCv) { LP.introCv.remove(); LP.introCv = null; }
    G.set(card, { autoAlpha: 1 });
    if (LP.lenis) LP.lenis.start();
  }
  if (LP.lenis) LP.lenis.stop();
  const skip = () => { if (tl.progress() < 1) { tl.progress(1); done(); } };
  ['wheel', 'touchstart', 'keydown'].forEach(ev => on(window, ev, skip, { passive: true }));
  on(hero, 'pointerdown', skip);
  paint();
  LP.introTL = tl;
}

/* the dots fly down with the scroll and become the chooser circles */
function scrollFX(ST) {
  LP.chooseST = ST.create({ trigger: '#lpChoose', start: 'top bottom', end: () => `top ${protoOff() + 1}px`, invalidateOnRefresh: true });
}

/* the hero takes the tone of the video's current background (green or white scenes) */
function heroTone() {
  const hero = LP.root && $('#lpHero', LP.root); if (!hero) return;
  const dark = !LP.vid || LP.vid.bgDark();
  if ((hero.dataset.tone === 'dark') !== dark) { hero.dataset.tone = dark ? 'dark' : 'light'; tone(); }
}

/* nav colour follows whatever section sits under it */
function tone() {
  const navEl = LP.root && $('.lp-nav', LP.root); if (!navEl) return;
  const r = navEl.getBoundingClientRect(), y = r.top + r.height / 2;
  const hit = document.elementsFromPoint(innerWidth / 2, y).find(e => !e.closest('.lp-nav') && e.closest('[data-tone]'));
  navEl.dataset.tone = hit ? hit.closest('[data-tone]').dataset.tone : 'light';
}

/* =====================================================================
   Menu: a few destinations as dots. It opens as a circle from the Menu
   button; a picked dot floods the screen in its colour and the page
   opens through it.
   ===================================================================== */
function menuItems() {
  const org = S.aud === 'org';
  return [
    ['site/events', 'Events', 't'],
    ['site/traders', 'Traders', 'o'],
    [org ? 'site/how-it-works-organiser' : 'site/how-it-works-trader', 'How it works', 't'],
    [org ? 'site/pricing-organiser' : 'site/pricing-trader', 'Pricing', 'o'],
    ['site/about', 'About', 't'],
  ];
}
function openMenu(btn) {
  if (!LP.alive || $('.lp-menu-ov')) return;
  const G = window.gsap, motion = LP.motion;
  const r = btn.getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
  const ov = document.createElement('div');
  ov.className = 'lp-menu-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Menu');
  ov.innerHTML = `<button type="button" class="lp-mclose" data-act="lp_menu_close" aria-label="Close menu"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    <p class="lp-meye mono">Menu</p>
    <nav class="lp-mdots" aria-label="Main">${menuItems().map(([p, l, c], i) => `<button type="button" class="lp-mdot ${c}" data-act="lp_menu_go" data-path="${p}" style="--i:${i}"><span class="mi"><span class="mono">0${i + 1}</span><b>${l}</b></span></button>`).join('')}</nav>
    <div class="lp-mfoot"><button type="button" class="lp-pill" data-act="lp_menu_go" data-path="site/login">Log in</button><button type="button" class="lp-pill lp-cta" data-act="lp_menu_go" data-path="site/register">Get started</button></div>`;
  ov.style.setProperty('--ox', ox + 'px'); ov.style.setProperty('--oy', oy + 'px');
  LP.root.appendChild(ov);
  LP.menu = { ov, btn, ox, oy };
  if (LP.lenis) LP.lenis.stop();
  const dots = $$('.lp-mdot', ov), bits = $$('.lp-meye, .lp-mfoot, .lp-mclose', ov);
  const R = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) + 30;
  if (motion) {
    G.timeline()
      .fromTo(ov, { clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(${R}px at ${ox}px ${oy}px)`, duration: .75, ease: 'expo.inOut' })
      .fromTo(dots, { scale: 0, rotate: -18 }, { scale: 1, rotate: 0, duration: .9, ease: 'back.out(1.6)', stagger: .07 }, .38)
      .fromTo($$('.mi', ov), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, ease: 'expo.out', stagger: .07 }, .55)
      .fromTo(bits, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'expo.out', stagger: .06 }, .6);
  }
  /* hover: the dot under the cursor grows and leans toward it, the others step back */
  const st = dots.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));
  const move = e => dots.forEach((d, i) => { const b = d.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2), dist = Math.hypot(dx, dy), reach = b.width * .8, f = dist < reach ? 1 - dist / reach : 0; st[i].tx = dx * .16 * f; st[i].ty = dy * .16 * f; });
  ov.addEventListener('pointermove', move);
  ov.addEventListener('pointerleave', () => st.forEach(s => { s.tx = s.ty = 0; }));
  const lean = () => dots.forEach((d, i) => { const s = st[i]; if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) < .05) return; s.x += (s.tx - s.x) * .14; s.y += (s.ty - s.y) * .14; d.style.setProperty('--mx', s.x.toFixed(2) + 'px'); d.style.setProperty('--my', s.y.toFixed(2) + 'px'); });
  LP.loops.add(lean); LP.menu.lean = lean;
  const key = e => { if (e.key === 'Escape') closeMenu(); };
  document.addEventListener('keydown', key); LP.menu.key = key;
  setTimeout(() => dots[0] && dots[0].focus({ preventScroll: true }), motion ? 500 : 0);
}
function closeMenu(instant) {
  const m = LP.menu; if (!m) return;
  LP.menu = null;
  LP.loops.delete(m.lean); document.removeEventListener('keydown', m.key);
  const done = () => { m.ov.remove(); if (LP.lenis) LP.lenis.start(); if (m.btn && document.contains(m.btn)) m.btn.focus({ preventScroll: true }); };
  if (instant || !LP.motion) { done(); return; }
  const R = Math.hypot(Math.max(m.ox, innerWidth - m.ox), Math.max(m.oy, innerHeight - m.oy)) + 30;
  gsap.timeline({ onComplete: done })
    .to($$('.lp-mdot', m.ov), { scale: 0, duration: .35, ease: 'power2.in', stagger: .04 })
    .to($$('.lp-meye, .lp-mfoot, .lp-mclose', m.ov), { autoAlpha: 0, duration: .25 }, 0)
    .fromTo(m.ov, { clipPath: `circle(${R}px at ${m.ox}px ${m.oy}px)` }, { clipPath: `circle(0px at ${m.ox}px ${m.oy}px)`, duration: .6, ease: 'expo.inOut' }, .2);
}
/* a picked dot floods the screen in its colour and the page opens through it */
function menuGo(el) {
  const path = el.dataset.path, m = LP.menu;
  if (!m || !LP.motion) { closeMenu(true); N.go(path); return; }
  const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  const colour = el.classList.contains('o') ? '#948FCF' : '#58A63B';
  const w = document.createElement('div'); w.className = 'lp-pagewipe'; w.style.background = el.classList.contains('lp-mdot') ? colour : '#124734';
  document.body.appendChild(w);
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 30;
  gsap.timeline()
    .fromTo(w, { clipPath: `circle(${b.width / 2}px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)`, duration: .7, ease: 'expo.in' })
    .add(() => { closeMenu(true); N.go(path); })
    .to(w, { autoAlpha: 0, duration: .45, ease: 'power1.out', onComplete: () => w.remove() }, '+=.05');
}

function chooserFX() {
  const sec = $('#lpChoose'), picks = $$('.lp-pick', sec);
  const st = picks.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));
  on(sec, 'pointermove', e => {
    let hov = '';
    picks.forEach((p, i) => {
      const r = p.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, dist = Math.hypot(dx, dy), reach = r.width * .85;
      const f = dist < reach ? 1 - dist / reach : 0; st[i].tx = dx * .18 * f; st[i].ty = dy * .18 * f;
      if (dist < r.width / 2 || (sec.dataset.hover === p.dataset.aud && dist < r.width * .64)) hov = p.dataset.aud;   // a little hysteresis so the sweep never flickers
    });
    if (sec.dataset.hover !== hov) sec.dataset.hover = hov;
  });
  on(sec, 'pointerleave', () => { st.forEach(s => { s.tx = s.ty = 0; }); sec.dataset.hover = ''; });
  LP.loops.add(() => picks.forEach((p, i) => { const s = st[i]; if (Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) < .05) return; s.x += (s.tx - s.x) * .12; s.y += (s.ty - s.y) * .12; p.style.setProperty('--mx', s.x.toFixed(2) + 'px'); p.style.setProperty('--my', s.y.toFixed(2) + 'px'); }));
}

function cursor() {
  if (!fineHover) return;
  const c = $('#lpCur'), lab = $('span', c);
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, shown = false;
  const check = target => {
    const z = target && target.closest && target.closest('[data-cursor]:not([data-cursor=""])');
    const want = !!(z && LP.root.contains(z));
    if (want) { const t = z.dataset.cursor; if (lab.textContent !== t) lab.textContent = t; c.classList.toggle('lt', !!z.closest('[data-tone="dark"]')); }
    if (want !== shown) { shown = want; c.classList.toggle('on', want); if (want) { x = tx; y = ty; } }
  };
  let moved = false;
  on(window, 'pointermove', e => { tx = e.clientX; ty = e.clientY; moved = true; check(e.target); });
  on(window, 'scroll', () => { if (moved) check(document.elementFromPoint(tx, ty)); }, { passive: true });
  LP.loops.add(() => { if (!shown) return; x += (tx - x) * .22; y += (ty - y) * .22; c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; });
}

function magnet(el, strength = .3) {
  if (!el || !fineHover) return;
  const zone = el.parentElement; let x = 0, y = 0, tx = 0, ty = 0;
  on(zone, 'pointermove', e => { const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), reach = r.width * 1.2, d = Math.hypot(dx, dy); const f = d < reach ? 1 - d / reach : 0; tx = dx * strength * f; ty = dy * strength * f; });
  on(zone, 'pointerleave', () => { tx = ty = 0; });
  LP.loops.add(() => { if (Math.abs(tx - x) + Math.abs(ty - y) < .05) return; x += (tx - x) * .12; y += (ty - y) * .12; el.style.setProperty('--mx', x.toFixed(2) + 'px'); el.style.setProperty('--my', y.toFixed(2) + 'px'); });
}

const countUp = el => { const to = +el.dataset.count; if (N.reduce || !window.gsap) { el.textContent = to; return; } const o = { v: 0 }; gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }); };
const play = s => { if (s.classList.contains('play')) return; s.classList.add('play'); $$('[data-count]', s).forEach(countUp); };

function audInit() {
  const box = $('#lpAud'); if (!box || !box.firstElementChild) return;
  const stage = $('#lpStage', box);
  if (stage) { LP.ring = Ring(stage); LP.ringLoop = dt => LP.ring && LP.ring.frame(dt); LP.loops.add(LP.ringLoop); }
  magnet($('.lp-bigdot', box), .28);
  const G = window.gsap, ST = window.ScrollTrigger;
  if (!LP.motion) { $$('.lp-step', box).forEach(play); $$('.lp-says .w', box).forEach(w => w.classList.add('on')); return; }
  LP.audCtx = G.context(() => {
    const ws = $$('.lp-split .wd > span', box);
    G.from(ws, { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: '#lpRingT', start: 'top 85%' } });
    G.from(stage, { autoAlpha: 0, y: 80, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: stage, start: 'top 90%' } });
    const steps = $$('.lp-step', box);
    steps.forEach((s, i) => {
      ST.create({ trigger: s, start: 'top 72%', onEnter: () => play(s), onEnterBack: () => play(s) });
      G.from($$('.st-txt > *', s), { y: 40, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: s, start: 'top 75%' } });
      if (steps[i + 1]) G.to(s, { scale: .92, '--dim': .55, ease: 'none', scrollTrigger: { trigger: steps[i + 1], start: 'top bottom', end: () => `top ${protoOff() + 90}px`, scrub: true } });
    });
    const sw = $$('.lp-says .w', box);
    G.fromTo(sw, { opacity: .14 }, { opacity: 1, ease: 'none', stagger: .5, scrollTrigger: { trigger: '.lp-state', start: 'top 70%', end: 'bottom 55%', scrub: true } });
    G.from('.lp-bigdot', { scale: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.lp-final', start: 'top 80%' } });
  }, box);
}
function killAud() {
  if (LP.audCtx) { LP.audCtx.revert(); LP.audCtx = null; }
  if (LP.ringLoop) { LP.loops.delete(LP.ringLoop); LP.ringLoop = null; }
  if (LP.ring) { LP.ring.destroy(); LP.ring = null; }
}
function setAud(k) {
  S.aud = k;
  const box = $('#lpAud');
  killAud();
  box.dataset.aud = k; LP.root.dataset.aud = k;
  box.innerHTML = audHTML(k);
  $$('.lp-pick, .lp-seg [data-aud]', LP.root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aud === k)));
  $('.lp-seg', LP.root).hidden = false;
  audInit();
  N.applyNotes();
}
function pickAud(k, from) {
  if (!LP.alive) return;
  const r = from ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x = r.left + r.width / 2, y = r.top + r.height / 2, box = $('#lpAud');
  const land = (again = 2) => { const y0 = box.getBoundingClientRect().top + scrollY - protoOff(); if (LP.lenis) { LP.lenis.resize(); LP.lenis.scrollTo(y0, { immediate: true, force: true }); } else scrollTo(0, y0); if (again) requestAnimationFrame(() => land(again - 1)); };
  if (!LP.motion) { setAud(k); land(); $('#lpRingT') && $('#lpRingT').focus?.(); return; }
  const G = window.gsap, ST = window.ScrollTrigger;
  const wipe = document.createElement('div'); wipe.className = 'lp-wipe ' + k; wipe.innerHTML = `<span>${k === 'trader' ? 'For traders' : 'For organisers'}</span>`;
  document.body.appendChild(wipe);
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 20;
  G.timeline({ onComplete: () => wipe.remove() })
    .fromTo(wipe, { clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)`, duration: .8, ease: 'expo.in' })
    .from($('span', wipe), { yPercent: 60, autoAlpha: 0, duration: .5, ease: 'expo.out' }, .45)
    .add(() => { setAud(k); ST.refresh(); land(); tone(); })
    .to(wipe, { clipPath: `circle(0px at 50% 0%)`, duration: .9, ease: 'expo.inOut', onStart: () => land(0) }, '+=.15');
}

function setupLenis() {
  if (!window.Lenis) return;
  const l = new Lenis({ lerp: .1, smoothWheel: true, prevent: node => !!(node && node.closest && node.closest('.mobile-menu,.lp-menu-ov,.modal,.drawer,.palpanel,[data-lenis-prevent]')) });
  l.on('scroll', () => { ScrollTrigger.update(); });
  LP.tick = time => l.raf(time * 1000);
  gsap.ticker.add(LP.tick); gsap.ticker.lagSmoothing(0);
  LP.lenis = l;
}

LP.init = root => {
  LP.alive = true; LP.root = $('#lp', root);
  const G = window.gsap, ST = window.ScrollTrigger;
  LP.motion = hasG() && !N.reduce;
  LP.root.classList.toggle('lp-static', !LP.motion);
  LP.O = { intro: 1, hand: 1, rc: 1, gSettle: 1, pPop: 1, pSq: 0 };
  heroVideo();
  LP.dots = Dots();
  LP.loops.add(dt => { if (!document.hidden) LP.dots.frame(dt); });
  chooserFX(); cursor();
  if (LP.motion) {
    G.registerPlugin(ST);
    setupLenis();
    LP.ctx = G.context(() => { scrollFX(ST); if (!S.intro) intro(G); }, LP.root);
    on(window, 'scroll', tone, { passive: true });
  } else on(window, 'scroll', tone, { passive: true });
  if (S.aud) audInit();
  loop();
  heroTone();
  tone();
  if (LP.motion) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (LP.alive) ST.refresh(); }); }
};
LP.destroy = () => {
  LP.alive = false;
  cancelAnimationFrame(LP.raf);
  if (LP.tickLoop) { gsap.ticker.remove(LP.tickLoop); LP.tickLoop = null; }
  if (LP.introTL) { LP.introTL.kill(); LP.introTL = null; S.intro = true; }
  killAud();
  LP.loops.clear();
  LP.offs.forEach(f => f()); LP.offs = [];
  LP.ios.forEach(io => io.disconnect()); LP.ios = [];
  if (LP.ctx) { LP.ctx.revert(); LP.ctx = null; }
  if (LP.tick) { gsap.ticker.remove(LP.tick); LP.tick = null; gsap.ticker.lagSmoothing(500, 33); }
  if (LP.lenis) { LP.lenis.destroy(); LP.lenis = null; }
  if (LP.menu) closeMenu(true);
  $$('.lp-wipe, .lp-menu-ov').forEach(w => w.remove());
  if (LP.introCv) { LP.introCv.remove(); LP.introCv = null; }
  LP.dots = null; LP.vid = null; LP.chooseST = null; LP.anchor = null;
};
N.lp = LP;

/* tear the page down before any other screen draws */
const baseRender = N.render;
N.render = keep => { if (LP.alive) LP.destroy(); return baseRender(keep); };

Object.assign(N.act, {
  lp_menu(el) { openMenu(el); },
  lp_menu_close() { closeMenu(); },
  lp_menu_go(el) { menuGo(el); },
  lp_pick(el) { pickAud(el.dataset.aud, el.closest('.lp-seg') ? null : el); },
});

/* ---------- route: the new landing replaces site/home; the previous homepage stays at site/home-classic ---------- */
const LANDING = {
  app: 'site', title: 'Home', bare: true,
  render() { return `<div class="lp" id="lp" data-aud="${S.aud || ''}">${nav()}<div class="lp-fly" id="lpFly" aria-hidden="true"><i class="lp-dot t"></i><i class="lp-dot o"></i></div>${hero()}${chooser()}<div class="lp-aud" id="lpAud" data-aud="${S.aud || ''}">${S.aud ? audHTML(S.aud) : ''}</div>${foot()}<div class="lp-cur" id="lpCur" aria-hidden="true"><span></span></div></div>`; },
  after(root) { LP.init(root); },
};
const home = N.routes.find(r => r.pattern === 'site/home');
if (home) { N.page('site/home-classic', { ...home.def, title: 'Previous homepage' }); home.def = LANDING; }
else N.page('site/home', LANDING);
})();
