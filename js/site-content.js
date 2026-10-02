/* =====================================================================
   NICHE prototype · site content module
   Blog + guides, public events, trader directory + profiles, public
   passport, data trust, help centre, privacy + terms, and the auth
   flows (login, register, forgot/reset password, complete profile).
   Names: state N.state.ct_*, actions/forms/change/input ct_*, CSS .ct-*
   ===================================================================== */

/* ---------- shared helpers (N.ct) ---------- */
(() => {
'use strict';
const { esc, ic } = N;
const CT = N.ct = {};
const S = CT.S = (k, init = {}) => (N.state[k] = N.state[k] || init);

CT.back = (path, label) => `<button type="button" class="ct-back" data-go="${path}">${ic('arrow-left', 'ic-sm')}${esc(label)}</button>`;
CT.link = (path, label) => `<a href="#${path.replace(/\//g, '.')}" data-go="${path}">${esc(label)}</a>`;
CT.reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/* escape text and wrap matches of q in <mark> */
CT.hl = (text, q) => {
  const t = String(text ?? ''); q = String(q || '').trim();
  if (!q) return esc(t);
  return t.split(new RegExp(`(${CT.reEsc(q)})`, 'gi')).map((p, i) => i % 2 ? `<mark>${esc(p)}</mark>` : esc(p)).join('');
};
CT.has = (q, ...fields) => { q = String(q || '').trim().toLowerCase(); return !q || fields.join(' ').toLowerCase().includes(q); };
CT.notes = () => { if (N.notes) N.applyNotes(); };
CT.notFound = (title, text, path, label) => `<section class="wrap sec">${N.empty(title, esc(text), `<button type="button" class="btn btn-ink btn-sm" data-go="${path}">${esc(label)}</button>`, 'search')}</section>`;
CT.authTop = (path = 'site/home', label = 'Back to website') => `<header class="ct-auth-top"><button type="button" data-go="site/home" aria-label="Niche home">${N.wm('wm-sm')}</button>${CT.back(path, label)}</header>`;
CT.scrollTo = id => { const t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: N.reduce ? 'auto' : 'smooth', block: 'start' }); };

/* segmented controls: core fires a bubbling "seg" event; modules register by key */
CT.seg = {};
document.addEventListener('seg', e => { const f = e.detail && CT.seg[e.detail.key]; if (f) f(e.detail.v, e); });

/* scroll-spy for tables of contents ([data-ct-spy] + sections [data-spy]) and reading progress */
let spyRaf = 0;
CT.spy = () => {
  const bar = document.querySelector('.ct-progress i'), read = document.querySelector('[data-ct-read]');
  if (bar && read) {
    const r = read.getBoundingClientRect(), span = Math.max(1, r.height - innerHeight * .5);
    bar.style.width = (Math.min(1, Math.max(0, (innerHeight * .25 - r.top) / span)) * 100).toFixed(1) + '%';
  }
  if (!document.querySelector('[data-ct-spy]')) return;
  const secs = [...document.querySelectorAll('[data-spy]')].filter(s => s.getClientRects().length);
  if (!secs.length) return;
  let cur = secs[0].id;
  for (const s of secs) { if (s.getBoundingClientRect().top <= 170) cur = s.id; else break; }
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = secs[secs.length - 1].id;
  document.querySelectorAll('[data-toc]').forEach(b => { const on = b.dataset.toc === cur; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const sel = document.querySelector('[data-ct-spysel]');
  if (sel && sel.value !== cur && [...sel.options].some(o => o.value === cur)) sel.value = cur;
};
addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(() => { spyRaf = 0; CT.spy(); }); }, { passive: true });

/* resend-style countdown that survives re-renders (looks the button up by id each tick) */
const timers = {};
CT.countdown = (id, until, label) => {
  clearInterval(timers[id]);
  const tick = () => {
    const b = document.getElementById(id);
    if (!b) { clearInterval(timers[id]); return; }
    const left = Math.ceil((until - Date.now()) / 1000);
    if (left <= 0) { clearInterval(timers[id]); b.disabled = false; b.textContent = label; }
    else { b.disabled = true; b.textContent = `${label} in ${left}s`; }
  };
  tick(); timers[id] = setInterval(tick, 1000);
};

/* passwords: show/hide toggle + strength meter */
const PW_TXT = ['Use 8 or more characters with a mix of letters, numbers and symbols.', 'Weak: make it longer and mix in numbers or symbols.', 'Fair: add a number, a capital or a symbol.', 'Good: a few more characters makes it even safer.', 'Strong password.'];
CT.pwScore = v => {
  if (!v) return 0;
  let p = 0;
  if (v.length >= 8) p++;
  if (v.length >= 12) p++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) p++;
  if (/\d/.test(v)) p++;
  if (/[^A-Za-z0-9]/.test(v)) p++;
  if (v.length < 8) return 1;
  return p >= 5 ? 4 : p >= 4 ? 3 : p >= 3 ? 2 : 1;
};
CT.meter = id => `<div class="ct-meter" id="${id}" data-l="0"><span aria-hidden="true"><i></i><i></i><i></i><i></i></span><b aria-live="polite">${PW_TXT[0]}</b></div>`;
CT.setMeter = (id, v) => { const m = document.getElementById(id); const l = CT.pwScore(v); if (m) { m.dataset.l = l; m.querySelector('b').textContent = PW_TXT[l]; } return l; };
CT.pw = (id, label, { auto = 'current-password', meter = '', attrs = '', ph = '' } = {}) => `<div class="field">
  <label class="lbl req" for="${id}">${esc(label)}</label>
  <span class="ct-pw"><input class="inp" type="password" id="${id}" name="${id}" autocomplete="${auto}" placeholder="${esc(ph)}" required ${meter ? `data-input="ct_pwMeter" data-meter="${meter}"` : ''} ${attrs}><button type="button" class="icon-btn sm" data-act="ct_pwEye" data-for="${id}" aria-label="Show password" aria-pressed="false">${ic('eye')}</button></span>
  ${meter ? CT.meter(meter) : ''}
</div>`;
CT.matchCheck = () => {
  const a = document.getElementById('ctPw1'), b = document.getElementById('ctPw2'), out = document.getElementById('ctMatch');
  if (!a || !b || !out) return true;
  if (!b.value) { out.innerHTML = ''; out.className = 'ct-match'; return false; }
  const ok = a.value === b.value;
  out.className = 'ct-match ' + (ok ? 'ok' : 'risk');
  out.innerHTML = `${ic(ok ? 'check-circle' : 'x-circle', 'ic-sm')}${ok ? 'Passwords match' : 'Passwords don’t match yet'}`;
  return ok;
};

Object.assign(N.act, {
  ct_toc(el) { CT.scrollTo(el.dataset.id); },
  ct_pwEye(el) {
    const inp = document.getElementById(el.dataset.for); if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    el.setAttribute('aria-pressed', String(show));
    el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    el.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  },
  ct_copy(el) { N.copy(el.dataset.url); },
});
N.change.ct_tocSel = el => CT.scrollTo(el.value);
N.input.ct_pwMeter = el => { CT.setMeter(el.dataset.meter, el.value); CT.matchCheck(); };
N.input.ct_pwMatch = () => CT.matchCheck();
})();

/* =====================================================================
   BLOG · site/blog and site/blog/:slug
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const CT = N.ct, S = CT.S, L = CT.link;

const CATS = ['Getting started', 'Starting out', 'Money & pricing', 'For organisers', 'Compliance'];
const ART = { 'documents-checklist-2026': ['2026', 'Checklist'], 'start-street-food-business': ['Day 1', 'Starting out'], 'what-traders-make': ['£', 'The maths'], 'vet-food-traders': ['Vet', 'Organisers'], 'curating-food-lineup': ['Mix', 'Line-up'], 'natashas-law-events': ['14', 'Allergens'] };
const posts = () => [...db.blog].sort((a, b) => b.date.localeCompare(a.date));

CT.postArt = (p, tone, cls = '') => { const [b, s] = ART[p.slug] || [`${p.mins} min`, p.cat]; return N.art(tone || p.tone, b, s, cls); };
CT.postMeta = p => `<div class="ct-meta"><span>${ic('calendar', 'ic-sm')}${N.fLong(p.date)}</span><span>${ic('clock', 'ic-sm')}${p.mins} min read</span><span>${ic('users', 'ic-sm')}${esc(p.aud)}</span></div>`;
CT.postCard = (p, feat = false) => `<article class="ct-post ${feat ? 'feat ct-t-' + p.tone : ''}" data-go="site/blog/${p.slug}">
  ${CT.postArt(p, feat ? 'hedge' : p.tone)}
  <div class="ct-post-b">
    <div class="row" style="--g:6px"><span class="chip plain ct-cat">${esc(p.cat)}</span>${feat ? '<span class="chip violet plain">Featured</span>' : ''}</div>
    <h3>${esc(p.title)}</h3>
    <p class="ex">${esc(p.excerpt)}</p>
    ${CT.postMeta(p)}
    <button type="button" class="ct-readmore" data-go="site/blog/${p.slug}">Read guide ${ic('arrow-right', 'ic-sm')}</button>
  </div>
</article>`;
CT.passportCTA = () => `<aside class="ct-cta" data-note="Each guide ends with one relevant next step (build the passport) instead of a generic newsletter box, so reading turns into sign-ups.">
  <div class="ct-cta-arch">${ic('id', 'ic-xl')}</div>
  <div class="stack" style="--g:10px">
    <p class="eyebrow">Food Trader Passport</p>
    <h2 class="d-s">Build your passport once. Apply to any event.</h2>
    <p>Upload each document once. We check it, track every expiry date and show organisers a verified record whenever you apply.</p>
    <div class="btn-row"><button type="button" class="btn btn-zest" data-go="site/register">Build your passport ${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge" data-go="site/passport">See a sample passport</button></div>
  </div>
</aside>`;

/* ---------- list ---------- */
const bst = () => S('ct_blog', { q: '', cat: 'all' });
const blogList = () => { const st = bst(); return posts().filter(p => (st.cat === 'all' || p.cat === st.cat) && CT.has(st.q, p.title, p.excerpt, p.cat, p.aud)); };
const countTxt = () => `${blogList().length} of ${db.blog.length} articles`;
const blogResults = () => {
  const list = blogList(), st = bst();
  if (!list.length) return N.empty('No guides match', `Nothing found${st.q.trim() ? ` for “${esc(st.q.trim())}”` : ''}${st.cat !== 'all' ? ` in ${esc(st.cat)}` : ''}. Try a broader word or another category.`, '<button type="button" class="btn btn-line btn-sm" data-act="ct_blogClear">Clear filters</button>', 'search');
  return `<div class="ct-posts">${list.map((p, i) => CT.postCard(p, i === 0)).join('')}</div>`;
};
const paintBlog = () => {
  const r = document.getElementById('ctBlogRes'); if (!r) return;
  r.innerHTML = blogResults();
  const c = document.getElementById('ctBlogCount'); if (c) c.textContent = countTxt();
  document.querySelectorAll('#ctBlogCats [data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === bst().cat)));
  CT.notes();
};

N.page('site/blog', {
  app: 'site', title: 'Blog',
  render() {
    const st = bst(), n = c => db.blog.filter(p => c === 'all' || p.cat === c).length;
    return `<section class="wrap ct-page">
      <div class="ct-hero">
        <div class="stack" style="--g:18px">
          <p class="eyebrow">The NICHE guide</p>
          <h1 class="d-l">Straight answers for food traders and event <em>organisers</em>.</h1>
          <p class="lead">Starting out, getting booked, staying compliant and running a great food line-up: the practical side of the UK food-events business, without the jargon.</p>
        </div>
        <div class="ct-shelf" aria-hidden="true">
          <span class="ct-t-mint" style="--h:74%">${ic('id', 'ic-xl')}</span>
          <span class="ct-t-lilac" style="--h:100%">${ic('shield', 'ic-xl')}</span>
          <span class="ct-t-butter" style="--h:62%">${ic('pound', 'ic-xl')}</span>
          <span class="ct-t-peach" style="--h:86%">${ic('users', 'ic-xl')}</span>
        </div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-bar" role="search" data-note="Search and category chips filter instantly with a live count, instead of reloading a new page for each category.">
        <div class="ct-bar-row">
          <label class="search">${ic('search')}<span class="sr">Search articles</span><input type="search" id="ctBlogQ" placeholder="Search articles" value="${esc(st.q)}" data-input="ct_blogQ" autocomplete="off"></label>
          <span class="ct-count" id="ctBlogCount" aria-live="polite">${countTxt()}</span>
        </div>
        <div class="ct-chips" id="ctBlogCats" aria-label="Filter by category">${[['all', 'All categories'], ...CATS.map(c => [c, c])].map(([v, l]) => `<button type="button" class="ct-fchip" data-act="ct_blogCat" data-c="${esc(v)}" aria-pressed="${st.cat === v}">${esc(l)}<span class="n">${n(v)}</span></button>`).join('')}</div>
      </div>
      <div id="ctBlogRes" data-note="The newest match becomes a large featured card; every card shows category, audience and read time so readers pick the right guide at a glance.">${blogResults()}</div>
    </section>`;
  },
});
Object.assign(N.act, {
  ct_blogCat(el) { bst().cat = el.dataset.c; paintBlog(); },
  ct_blogClear() { Object.assign(bst(), { q: '', cat: 'all' }); const i = document.getElementById('ctBlogQ'); if (i) i.value = ''; paintBlog(); },
  ct_useful(el) {
    const box = el.closest('.ct-useful'); if (!box) return;
    box.innerHTML = `<span class="row" style="--g:8px">${ic('check-circle')}<b>Thanks for the feedback.</b></span><span class="small muted">${el.dataset.v === 'yes' ? 'Glad it helped.' : 'We’ll use it to improve this guide.'}</span>`;
  },
});
N.input.ct_blogQ = el => { bst().q = el.value; paintBlog(); };

/* ---------- articles ---------- */
const DOC_ROWS = [
  ['Food business registration', 'Business', 'No expiry. Update it if your details change'],
  ['Public liability insurance', 'Business', 'Every 12 months'],
  ['Employer’s liability insurance', 'Business', 'Every 12 months'],
  ['Food hygiene rating', 'Business', 'Replaced after each council inspection'],
  ['Level 2 food hygiene certificate', 'Person', 'Refresh every 3 years (recommended)'],
  ['Food safety management plan (HACCP / SFBB)', 'Business', 'Review yearly and after menu changes'],
  ['Gas safety certificate', 'Unit', 'Every 12 months'],
  ['Electrical safety (PAT and installation)', 'Unit', 'Usually every 12 months'],
  ['Fire risk assessment and extinguisher service', 'Unit', 'Review and service yearly'],
  ['Allergen matrix', 'Business', 'Whenever a recipe or supplier changes'],
];
const LVL_TONE = { Business: 'mint', Unit: 'butter', Person: 'lilac' };
const QUICK = ['Food business registration', 'Public liability insurance', 'Employer’s liability (if you have staff)', 'Food hygiene rating', 'Level 2 food hygiene training', 'Food safety management plan', 'Gas safety certificate (LPG)', 'Electrical safety / PAT', 'Fire risk assessment and extinguishers', 'Allergen information'];
const quickN = () => { const q = S('ct_quick', {}); return QUICK.filter((_, i) => q[i]).length; };
const quickHTML = () => { const q = S('ct_quick', {}), n = quickN(); return `<div class="ct-quick">${QUICK.map((l, i) => N.checkbox(`ctQuick${i}`, esc(l), !!q[i], `data-change="ct_quick" data-i="${i}"`)).join('')}</div>
  <div class="ct-quick-n"><span id="ctQuickN"><b>${n}</b> of ${QUICK.length} ready</span>${N.bar(n / QUICK.length * 100, 'ok')}</div>`; };

const ARTICLES = {
  'documents-checklist-2026': {
    lede: `Organisers ask for paperwork because they carry some of the risk of every trader on their site. The good news is that the list is predictable. Get these documents in order and most UK events will accept you; after that, staying compliant is mostly about knowing your renewal dates.`,
    secs: () => [
      ['at-a-glance', 'The checklist at a glance', `<p>Requirements vary by event and by council, so always read the trader pack. This is what most organisers ask for in 2026. Tick what you already have as you read.</p>${quickHTML()}`],
      ['registration', '1. Food business registration', `<p>Every food business in the UK must register with its local authority at least 28 days before it starts trading. Registration is free and the council cannot refuse it. If you trade from a van, trailer or stall, register with the council for the place where the unit is kept when it is not in use, not every town you trade in.</p><p>Registration does not expire, but you should update it if your address, type of food or business structure changes. Organisers usually ask for your registration reference or the council’s confirmation email.</p>`],
      ['insurance', '2. Insurance', `<p><strong>Public liability insurance</strong> is not a legal requirement, but almost every organiser insists on it. It covers claims from members of the public who are injured, or whose property is damaged, because of your business. £5 million of cover is the norm; larger festivals, councils and wedding venues sometimes ask for £10 million. Check that the policy names what you actually do, including cooking with gas, and covers the event dates.</p><p><strong>Employer’s liability insurance</strong> is a legal requirement in most cases if you employ anyone, including part-time, casual or seasonal staff, with cover of at least £5 million. Both policies usually renew every 12 months.</p>`],
      ['hygiene', '3. Food hygiene rating', `<p>In England, Wales and Northern Ireland, your council inspects your business and gives it a rating from 0 to 5 under the Food Standards Agency’s Food Hygiene Rating Scheme. Scotland runs its own scheme with Pass or Improvement Required results. Most organisers ask for a 4 or 5, and some premium events only take a 5.</p><p>Ratings do not expire; they are replaced after each inspection. If you are newly registered and still waiting for your first visit, say so on your application. Many organisers will accept that alongside your other documents.</p>`],
      ['training', '4. Food hygiene training', `<p>Anyone who handles food must be supervised and trained in food hygiene to a level that suits their job. In practice, organisers look for a Level 2 Food Safety and Hygiene for Catering certificate for everyone working on the unit, and often Level 3 for the person in charge. The certificates have no legal expiry date, but refreshing them every three years is standard good practice and many organisers expect it.</p>`],
      ['plan', '5. Food safety management plan', `<p>You must have a written food safety management system based on HACCP principles: what could go wrong with your food, how you control it and how you check. The Food Standards Agency’s Safer Food, Better Business pack suits most street food menus in England and Wales; CookSafe (Scotland) and Safe Catering (Northern Ireland) do the same job. Review it at least once a year and whenever you change your menu or equipment.</p><p>Some organisers also ask for a general health and safety risk assessment for your unit, covering hot surfaces, queues, cables and manual handling.</p>`],
      ['gas', '6. Gas safety', `<p>If you cook with LPG, organisers will ask for a gas safety certificate for your unit. It should come from a Gas Safe registered engineer qualified to work on LPG in mobile catering units, and most events want it dated within the last 12 months. Keep a copy on the unit as well as in your passport: site safety officers often ask to see it before you light up.</p>`],
      ['electrical', '7. Electrical safety', `<p>If you plug in, expect to show that your equipment is safe. That usually means PAT testing for portable appliances and, for vans and trailers with fixed wiring, an installation check by a qualified electrician. Most organisers treat both as annual. If you bring your own generator, check the event allows it before you arrive.</p>`],
      ['fire', '8. Fire safety', `<p>Organisers are responsible for the fire risk assessment for the whole site, and many will ask for yours covering your unit. Carry the right extinguishers for what you cook: a wet chemical extinguisher for fryers and a fire blanket as a minimum, plus a CO2 extinguisher if you use electrical equipment. Have them serviced every year and keep the tags in date.</p>`],
      ['allergens', '9. Allergen information', `<p>UK law names 14 allergens: celery, cereals containing gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, tree nuts, peanuts, sesame, soya and sulphur dioxide (sulphites). For food you make to order, you must be able to tell customers which of these are in each dish. A written allergen matrix, updated whenever a recipe or supplier changes, is the simplest way to do it, and most organisers now ask to see one.</p><p>Natasha’s Law adds more. If you pack food before a customer orders it and sell it from the same unit, such as wrapped sandwiches or boxed brownies, it counts as prepacked for direct sale and needs a label with the full ingredients list and the allergens emphasised. Our ${L('site/blog/natashas-law-events', 'guide to Natasha’s Law at events')} goes into detail.</p>`],
      ['attaches', 'What attaches to what', `<p>Some documents belong to your business, some to a particular unit and some to a person. Knowing which is which saves time when you add a second van or take on staff: a new unit needs its own gas and electrical checks, and a new staff member needs their own training certificate.</p>
        <div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Document</th><th>Attaches to</th><th>Typically renews</th></tr></thead><tbody>${DOC_ROWS.map(([d, a, r]) => `<tr><td data-l="Document"><b>${esc(d)}</b></td><td data-l="Attaches to"><span class="chip plain ct-tchip ct-t-${LVL_TONE[a]}">${a}</span></td><td data-l="Typically renews">${esc(r)}</td></tr>`).join('')}</tbody></table></div>`],
      ['one-place', 'Keep it all in one place', `<p>Most rejections are not about missing documents but about expired ones. Keep scans of everything together, note every expiry date and set reminders four weeks ahead. That is exactly what the ${L('site/what-is-passport', 'Food Trader Passport')} does: upload each document once, our team checks it, and every organiser you apply to sees a current, verified record. ${L('site/how-verification-works', 'Here’s how verification works')}.</p>`],
    ],
  },
  'start-street-food-business': {
    lede: `Most new traders start with the van. The ones who last start with the menu, the paperwork and a realistic first season. This is the order that saves money.`,
    secs: () => [
      ['menu', 'Start with the menu, not the van', `<p>Pick four to six dishes you can cook fast, price well and serve the same way every time. Queues move at the speed of your slowest dish, so cut anything that takes more than a couple of minutes to plate. Test the menu on friends, then at a small community market, before you spend on kit.</p><p>Your menu decides your unit. A fryer means gas or a large power supply; a coffee setup needs water and plenty of power. Buy the unit that fits the menu, not the other way round.</p>`],
      ['legal', 'Get legal before you buy', `<p>Register with your local authority at least 28 days before you trade, book Level 2 food hygiene training for everyone on the unit, write your food safety plan and arrange public liability insurance. If you will cook with LPG, pay for a Gas Safe check on any second-hand unit before you hand over the money. Our ${L('site/blog/documents-checklist-2026', '2026 documents checklist')} covers each step.</p>`],
      ['first-pitches', 'Find your first pitches', `<p>Start with smaller markets where fees are lower and organisers give honest feedback, then work up to festivals once your service is quick. Record takings, customers and waste at every event: after a season, that record tells you which events to repeat and what to charge.</p><p>If you would rather have a hand with all of this, ${L('site/launch', 'NICHE Launch')} takes you from idea to first pitch.</p>`],
    ],
  },
  'what-traders-make': {
    lede: `Headline averages hide huge differences between events. A simple model of customers, spend and costs gets you much closer to your own number.`,
    secs: () => [
      ['model', 'Start with customers, not averages', `<p>Takings are customers served multiplied by average spend. To estimate customers, start with the organiser’s expected footfall, take the share of visitors likely to buy food, and divide by the number of traders selling something similar. Then check the result against how many people you can physically serve per hour.</p><p>For example: 6,000 visitors, one in four buys food, shared across ten food traders, gives about 150 customers each. At £10 average spend, that is roughly £1,500 in takings. The numbers are illustrative; use the event’s own footfall and your own serving speed.</p>`],
      ['costs', 'Then take off the costs', `<p>Subtract the pitch fee or commission, ingredients, packaging, staff, fuel and gas. On a 12% commission event, £1,500 of takings costs £180 in fees; on a £320 pitch fee, you need a strong day just to cover the pitch. Many street food traders aim to keep ingredient costs to around a third of the menu price.</p>`],
      ['decides', 'The four things that decide it', `<ul><li>Footfall that actually eats: a food festival crowd buys more food than a music crowd of the same size.</li><li>Competition on your dish: two burger vans side by side split one queue.</li><li>Serving speed: at peak times, your hourly capacity caps your takings.</li><li>The fee model: commission shares the risk of a quiet day; a pitch fee rewards a busy one.</li></ul><p>Every listing in ${L('site/events', 'Events')} shows the fee model, expected footfall and pitches left, so you can run the numbers before you apply.</p>`],
    ],
  },
  'vet-food-traders': {
    lede: `When you book a food trader, you take on a little of their risk. Checking the right documents, against the right dates, keeps that risk small.`,
    secs: () => [
      ['core', 'Check the documents that carry the risk', `<p>For every hot food trader, ask for their food business registration, public liability insurance at the level your venue requires, their current food hygiene rating and, if they cook with LPG, a gas safety certificate. Add an allergen matrix and a food safety management plan for anyone serving high-risk food.</p>`],
      ['dates', 'Check dates against the event, not today', `<p>A certificate that is valid when the trader applies can expire before your event. Always compare expiry dates with your event day, and ask for renewals in writing before you confirm a pitch.</p>`],
      ['flags', 'Red flags', `<ul><li>Names that don’t match between the insurance certificate and the business registration.</li><li>Cover below the level your venue or council requires.</li><li>A hygiene rating you can’t find on the Food Standards Agency website.</li><li>Blurry scans, cropped dates or documents that look edited.</li></ul><p>On Niche, our team checks every document when it is uploaded, and each applicant arrives with a pass, expiring or missing result against your event’s rules. ${L('site/how-verification-works', 'See how verification works')}.</p>`],
    ],
  },
  'curating-food-lineup': {
    lede: `A good food line-up keeps people on site for longer. It balances variety, dietary needs, price points and queues, and it respects the practical limits of your site.`,
    secs: () => [
      ['crowd', 'Start from the crowd', `<p>Families want quick, mild options and something sweet. Evening crowds want bold flavours and a bar. Almost every audience needs at least one vegan, one gluten-free and one halal option, and people notice when they are missing.</p>`],
      ['clashes', 'Avoid clashes and cover the whole day', `<p>Limit how many traders sell the same main dish, spread your price points, and include dessert and coffee so people stay after they eat. For a ten-pitch event, a useful starting mix is six savoury mains, two desserts, one coffee and one drinks trader, adjusted for your crowd.</p>`],
      ['practical', 'Plan the practical side early', `<p>Ask every applicant for pitch size, power, gas and water needs before you plan the layout. One 32A trader can change your power plan, and a row of fryers by the entrance changes your queues. Niche shows each trader’s unit size, power and gas use on their passport, so you plan with real numbers. ${L('site/traders', 'Browse traders')}.</p>`],
    ],
  },
  'natashas-law-events': {
    lede: `Allergen rules at events are simpler than they look. The key is knowing which of your foods count as prepacked for direct sale.`,
    secs: () => [
      ['what', 'What Natasha’s Law covers', `<p>Since 1 October 2021, food that is prepacked for direct sale (PPDS) must carry a label with the name of the food and a full ingredients list, with the 14 allergens emphasised. At events, PPDS means food packed on the unit before a customer orders it and sold from the same unit, such as wrapped sandwiches, boxed brownies or pots of salad in a grab-and-go fridge.</p>`],
      ['made-to-order', 'Food made to order', `<p>Food you cook or assemble when a customer orders it is not PPDS, but you must still be able to tell customers which of the 14 allergens it contains. You can do this verbally as long as a clear notice tells customers to ask. A written allergen matrix, updated whenever a recipe or supplier changes, keeps answers consistent across your whole team.</p>`],
      ['organisers', 'What organisers should check', `<p>Ask every trader for a current allergen matrix, and for PPDS labels if they sell grab-and-go items. Check that allergens are part of their staff briefing. On Niche, allergen information is part of every passport and is checked against your event’s rules when a trader applies. See the full ${L('site/blog/documents-checklist-2026', 'documents checklist')}.</p>`],
    ],
  },
};

N.page('site/blog/:slug', {
  app: 'site', example: 'site/blog/documents-checklist-2026',
  title: p => db.blog.find(b => b.slug === p.slug)?.title || 'Guide',
  render(p) {
    const post = db.blog.find(b => b.slug === p.slug);
    if (!post || !ARTICLES[post.slug]) return CT.notFound('We couldn’t find that guide', 'It may have moved. Browse all guides instead.', 'site/blog', 'All guides');
    const A = ARTICLES[post.slug], secs = A.secs();
    const related = posts().filter(b => b.slug !== post.slug).sort((a, b) => (b.aud === post.aud) - (a.aud === post.aud) || b.date.localeCompare(a.date)).slice(0, 3);
    const url = `https://www.nicheconnect.co/blog/${post.slug}`;
    return `<div class="ct-progress" aria-hidden="true"><i></i></div>
    <section class="wrap ct-page">
      ${CT.back('site/blog', 'All guides')}
      <header class="ct-ahead ct-t-${post.tone}">
        <div class="stack" style="--g:16px">
          <div class="row" style="--g:6px"><span class="chip plain">${esc(post.cat)}</span><span class="chip plain">${esc(post.aud)}</span></div>
          <h1 class="d-m">${esc(post.title)}</h1>
          <p class="lead">${esc(post.excerpt)}</p>
          ${CT.postMeta(post)}
          <div class="btn-row"><button type="button" class="btn btn-line btn-sm" data-act="ct_copy" data-url="${url}">${ic('link')}Copy link</button></div>
        </div>
        ${CT.postArt(post, post.tone, 'ct-archart')}
      </header>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-article">
        <aside class="ct-toc-wrap">
          <nav class="ct-toc" data-ct-spy aria-label="On this page" data-note="Sticky contents with scroll-spy: long compliance guides become scannable and the reader always knows where they are.">
            <p class="eyebrow">On this page</p>
            ${secs.map(([id, h]) => `<button type="button" data-act="ct_toc" data-id="${id}" data-toc="${id}">${esc(h)}</button>`).join('')}
            <button type="button" class="ct-toc-cta" data-go="site/register">${ic('id')}<span><b>Build your passport</b><span>Free on the Lite plan</span></span></button>
          </nav>
        </aside>
        <div class="ct-toc-m"><label class="field"><span>Jump to a section</span><select class="sel" data-change="ct_tocSel" data-ct-spysel>${secs.map(([id, h]) => `<option value="${id}">${esc(h)}</option>`).join('')}</select></label></div>
        <div class="ct-body" data-ct-read>
          <article class="prose">
            <p class="ct-lede">${A.lede}</p>
            ${secs.map(([id, h, html]) => `<section id="${id}" data-spy><h2>${esc(h)}</h2>${html}</section>`).join('')}
          </article>
          ${CT.passportCTA()}
          <div class="ct-useful"><b>Was this guide useful?</b><div class="btn-row"><button type="button" class="btn btn-line btn-sm" data-act="ct_useful" data-v="yes">${ic('thumbs')}Yes</button><button type="button" class="btn btn-ghost btn-sm" data-act="ct_useful" data-v="no">Not really</button></div></div>
        </div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="sec-head split"><div><p class="eyebrow">Keep reading</p><h2 class="d-s">Related guides</h2></div><button type="button" class="btn btn-line btn-sm" data-go="site/blog">All guides ${ic('arrow-right', 'ic-sm')}</button></div>
      <div class="ct-posts">${related.map(r => CT.postCard(r)).join('')}</div>
    </section>`;
  },
  after() { CT.spy(); },
});

N.change.ct_quick = el => {
  const q = S('ct_quick', {}); q[el.dataset.i] = el.checked;
  const n = quickN(), out = document.getElementById('ctQuickN');
  if (out) { out.innerHTML = `<b>${n}</b> of ${QUICK.length} ready`; const bar = out.parentElement.querySelector('.bar i'); if (bar) bar.style.width = (n / QUICK.length * 100) + '%'; }
  if (n === QUICK.length && el.checked) N.toast('All ten ready. Put them in your passport and apply anywhere.');
};
})();

/* =====================================================================
   EVENTS · site/events and site/events/:id
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const CT = N.ct, S = CT.S;

const EV = () => Object.entries(db.events).filter(([, e]) => e.status !== 'draft');
const left = e => Math.max(0, e.pitches - e.filled);
CT.evStatus = e => N.eventState(e) === 'completed' ? 'completed' : e.external ? 'external' : (left(e) <= 0 || N.daysFrom(e.deadline) < 0) ? 'closed' : 'open';
CT.evChip = e => ({ completed: N.chip('plain', 'Completed'), external: N.chip('info', 'External'), closed: N.chip('warn', 'Applications closed'), open: N.chip('ok', 'Accepting traders') })[CT.evStatus(e)];
const fee = e => e.fee.model === 'pitch' ? `${N.money(e.fee.amount)} pitch fee` : `${e.fee.pct}% commission`;
const multi = e => e.end && e.end !== e.date;
const dates = e => multi(e) ? `${N.fShort(e.date)} – ${N.fLong(e.end)}` : N.fd(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const art = (e, cls = '') => N.art(e.tone, N.fd(e.date, { day: 'numeric', month: 'short' }), multi(e) ? `to ${N.fShort(e.end)}` : N.fd(e.date, { weekday: 'long' }), cls);
const deadline = e => { const d = N.daysFrom(e.deadline); return d < 0 ? 'Applications closed' : d === 0 ? 'Applications close today' : d === 1 ? 'Applications close tomorrow' : `Apply by ${N.fShort(e.deadline)}`; };
const url = id => `https://www.nicheconnect.co/events/${id}`;

CT.evCard = ([id, e]) => {
  const st = CT.evStatus(e), done = st === 'completed', l = left(e), pct = Math.round(e.filled / e.pitches * 100), soon = !done && N.daysFrom(e.deadline) >= 0 && N.daysFrom(e.deadline) <= 3;
  return `<article class="ct-ev" data-go="site/events/${id}">
    <div class="ct-ev-art">${art(e)}<span class="ct-ev-st">${CT.evChip(e)}</span></div>
    <div class="ct-ev-b">
      <p class="eyebrow">${esc(e.type)}</p>
      <h3><button type="button" data-go="site/events/${id}">${esc(e.name)}</button></h3>
      <p class="ct-ev-l">${ic('pin', 'ic-sm')}<span>${esc(e.venue)}, ${esc(e.city)}</span></p>
      <p class="ct-ev-l">${ic('building', 'ic-sm')}<span>${esc(N.orgName(id))}</span></p>
      ${done ? `<p class="ct-ev-l">${ic('users', 'ic-sm')}<span>${e.filled} traders took part</span></p>` : `<div class="ct-pl"><div class="ct-pl-t"><span><b>${l}</b> of ${e.pitches} pitches left</span><span class="muted">${pct}% booked</span></div>${N.bar(pct, l / e.pitches <= .25 ? 'warn' : 'violet')}</div>`}
      <div class="ct-ev-foot"><span class="mtag">${fee(e)}</span><span class="small ${soon ? 'ct-soon' : 'muted'}">${done ? 'Finished ' + N.fShort(e.end || e.date) : deadline(e)}</span></div>
    </div>
  </article>`;
};

/* ---------- browse ---------- */
const PER = 6;
const est = () => S('ct_ev', { q: '', city: 'all', type: 'all', month: 'all', open: false, sort: 'soon', page: 1 });
const done = ([, e]) => CT.evStatus(e) === 'completed';
const SORTS = {
  soon: (a, b) => done(a) - done(b) || (done(a) ? b[1].date.localeCompare(a[1].date) : a[1].date.localeCompare(b[1].date)),
  deadline: (a, b) => done(a) - done(b) || a[1].deadline.localeCompare(b[1].deadline),
  pitches: (a, b) => done(a) - done(b) || left(b[1]) - left(a[1]),
};
const evList = () => {
  const st = est();
  return EV().filter(([, e]) => CT.has(st.q, e.name, e.venue)
    && (st.city === 'all' || e.city === st.city)
    && (st.type === 'all' || e.type === st.type)
    && (st.month === 'all' || e.date.startsWith(st.month))
    && (!st.open || ['open', 'external'].includes(CT.evStatus(e)))).sort(SORTS[st.sort] || SORTS.soon);
};
const evResults = () => {
  const st = est(), list = evList(), pages = Math.max(1, Math.ceil(list.length / PER));
  st.page = Math.min(Math.max(1, st.page), pages);
  if (!list.length) return N.empty('No events match these filters', `Try another month or city${st.open ? ', or switch off “Accepting traders only”' : ''}.${st.q.trim() ? ` Nothing matched “${esc(st.q.trim())}”.` : ''}`, '<button type="button" class="btn btn-line btn-sm" data-act="ct_evClear">Clear all filters</button>', 'calendar');
  return `<div class="ct-evs">${list.slice((st.page - 1) * PER, st.page * PER).map(CT.evCard).join('')}</div>${N.pager(st.page, pages, 'data-act="ct_evPage" data-p', list.length, PER)}`;
};
const evCount = () => `${evList().length} of ${EV().length} events`;
const paintEvents = scroll => {
  const r = document.getElementById('ctEvRes'); if (!r) return;
  r.innerHTML = evResults();
  const c = document.getElementById('ctEvCount'); if (c) c.textContent = evCount();
  document.querySelectorAll('#ctEvMonths [data-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === est().month)));
  if (scroll) CT.scrollTo('ctEvTop');
  CT.notes();
};

N.page('site/events', {
  app: 'site', title: 'Events',
  render() {
    const st = est(), all = EV();
    const up = all.filter(([, e]) => CT.evStatus(e) !== 'completed');
    const cities = [...new Set(all.map(([, e]) => e.city))].sort();
    const types = [...new Set(all.map(([, e]) => e.type))].sort();
    const months = [...new Set(all.map(([, e]) => e.date.slice(0, 7)))].sort();
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    return `<section class="wrap ct-page">
      <div class="ct-hero">
        <div class="stack" style="--g:18px">
          <p class="eyebrow">Events</p>
          <h1 class="d-l">Discover food events across the UK <em>looking</em> for traders</h1>
          <p class="lead">Markets, festivals and fairs with open pitches. Every listing shows the fee, the footfall and exactly which documents you’ll need, before you apply.</p>
        </div>
        <div class="ct-stats3" data-note="Live totals up front tell a trader in two seconds whether it is worth browsing, rather than landing on an unexplained grid.">
          <div class="ct-es ct-t-lilac"><span class="num">${up.length}</span><span>upcoming events</span></div>
          <div class="ct-es ct-t-mint"><span class="num">${up.reduce((a, [, e]) => a + left(e), 0)}</span><span>pitches still open</span></div>
          <div class="ct-es ct-t-butter"><span class="num">${new Set(up.map(([, e]) => e.city)).size}</span><span>cities</span></div>
        </div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-bar" role="search" data-note="All filters sit in one bar above the grid. “Accepting traders only” hides finished events, which the live site mixes into results.">
        <div class="ct-bar-row">
          <label class="search">${ic('search')}<span class="sr">Search events</span><input type="search" id="ctEvQ" placeholder="Search by event name or venue" value="${esc(st.q)}" data-input="ct_evQ" autocomplete="off"></label>
          <label class="sr" for="ctEvCity">City</label><select class="sel" id="ctEvCity" data-change="ct_evF" data-k="city">${opt('all', 'All cities', st.city)}${cities.map(c => opt(c, c, st.city)).join('')}</select>
          <label class="sr" for="ctEvType">Event type</label><select class="sel" id="ctEvType" data-change="ct_evF" data-k="type">${opt('all', 'All event types', st.type)}${types.map(c => opt(c, c, st.type)).join('')}</select>
        </div>
        <div class="ct-bar-row between">
          <div class="ct-chips" id="ctEvMonths" aria-label="Filter by month">${[['all', 'Any month'], ...months.map(m => [m, N.fd(m + '-01', { month: 'short', year: 'numeric' })])].map(([v, l]) => `<button type="button" class="ct-fchip" data-act="ct_evMonth" data-m="${v}" aria-pressed="${st.month === v}">${esc(l)}</button>`).join('')}</div>
          ${N.toggle('ctEvOpen', 'Accepting traders only', st.open, 'data-change="ct_evOpen"')}
        </div>
      </div>
      <div class="ct-resbar" id="ctEvTop">
        <span class="ct-count" id="ctEvCount" aria-live="polite">${evCount()}</span>
        <label class="row small" style="--g:8px"><span class="muted">Sort</span><select class="sel sm" data-change="ct_evF" data-k="sort">${opt('soon', 'Soonest first', st.sort)}${opt('deadline', 'Deadline', st.sort)}${opt('pitches', 'Most pitches left', st.sort)}</select></label>
      </div>
      <div id="ctEvRes">${evResults()}</div>
    </section>
    <section class="wrap ct-sec">
      <div class="blk blk-lilac ct-band">
        <div class="stack" style="--g:10px"><p class="eyebrow">Organisers</p><h2 class="d-s">Running an event? List it free for your first year.</h2><p>Every applicant arrives with their documents already checked against your rules.</p></div>
        <div class="btn-row"><button type="button" class="btn btn-violet" data-go="site/how-it-works-organiser">How it works</button><button type="button" class="btn btn-line" data-go="site/pricing-organiser">Organiser pricing</button></div>
      </div>
    </section>`;
  },
});
Object.assign(N.act, {
  ct_evMonth(el) { const st = est(); st.month = el.dataset.m; st.page = 1; paintEvents(); },
  ct_evPage(el) { est().page = +el.dataset.p; paintEvents(true); },
  ct_evClear() { Object.assign(est(), { q: '', city: 'all', type: 'all', month: 'all', open: false, page: 1 }); N.refresh(); },
});
N.input.ct_evQ = el => { const st = est(); st.q = el.value; st.page = 1; paintEvents(); };
N.change.ct_evF = el => { const st = est(); st[el.dataset.k] = el.value; st.page = 1; paintEvents(); };
N.change.ct_evOpen = el => { const st = est(); st.open = el.checked; st.page = 1; paintEvents(); };

/* ---------- detail ---------- */
const needs = e => {
  const r = e.req, out = [];
  out.push(['star', `Food hygiene rating ${r.fhrs}${r.fhrs < 5 ? ' or above' : ''}`, 'Checked against the Food Standards Agency register']);
  out.push(['shield', `Public liability insurance, £${r.pli}m or more`, 'Must be valid on the event day']);
  out.push(r.gas ? ['flame', 'Gas Safety Certificate', 'If you cook with LPG. Issued by a Gas Safe engineer, within 12 months'] : ['ban', 'No gas cooking on this site', 'Electric, cold or pre-cooked food only']);
  if (r.allergen) out.push(['list', 'Allergen information for the 14 allergens', 'A written allergen matrix for your menu']);
  out.push(['zap', `Power: ${r.power} per pitch`, 'Bring equipment that runs on this supply']);
  if (r.elec) out.push(['check-circle', 'Electrical Safety Certificate', 'PAT and installation checks for your unit']);
  if (r.vegan) out.push(['sparkle', 'Fully plant-based menu', 'No meat, fish, dairy or eggs']);
  return out;
};
const orgCard = (id, e) => {
  if (!e.org) return `<div class="card stack" style="--g:14px">
    <p class="eyebrow">Listed by</p>
    <div class="row" style="--g:12px">${N.av('N', 'hedge', 'lg')}<div class="stack" style="--g:2px"><b class="h4">The Niche team</b><span class="small muted">External listing</span></div></div>
    <p class="small ink-2">The organiser runs their own applications for this event. Questions go to <b>${esc(e.externalEmail)}</b>.</p>
    <a class="btn btn-line btn-sm" href="${esc(e.externalLink)}" target="_blank" rel="noopener noreferrer">Visit the organiser’s site ${ic('arrow-up-right', 'ic-sm')}</a>
  </div>`;
  const o = db.organisers[e.org], more = EV().filter(([k, x]) => x.org === e.org && k !== id && CT.evStatus(x) !== 'completed').slice(0, 3);
  return `<div class="card stack" style="--g:14px">
    <p class="eyebrow">Organised by</p>
    <div class="row" style="--g:12px">${N.oav(e.org, 'lg')}<div class="stack" style="--g:2px"><b class="h4">${esc(o.company)}</b><span class="small muted">${esc(o.person)} · ${esc(o.role)}</span></div></div>
    <div class="row" style="--g:8px">${N.stars(o.rating)}<b>${o.rating.toFixed(1)}</b><span class="small muted">rating from traders</span></div>
    <div class="row" style="--g:6px">${o.verify === 'approved' ? N.chip('ok', 'Verified organiser') : N.chip('warn', 'Verification in progress')}<span class="chip plain">${esc(o.city)}</span><span class="chip plain">On Niche since ${N.fd(o.joined, { month: 'short', year: 'numeric' })}</span></div>
    ${more.length ? `<div class="stack" style="--g:2px"><span class="small muted">More from ${esc(o.company)}</span>${more.map(([k, x]) => `<button type="button" class="ct-mini" data-go="site/events/${k}">${N.evd(x.date)}<span><b>${esc(x.name)}</b><span class="small muted">${esc(x.city)} · ${left(x)} pitches left</span></span></button>`).join('')}</div>` : ''}
  </div>`;
};
const cta = (id, e, size = 'btn-lg', tone = 'btn-hedge') => {
  const st = CT.evStatus(e);
  if (st === 'open') return `<button type="button" class="btn ${tone} ${size}" data-go="trader/apply/${id}">Apply with your passport ${ic('arrow-right')}</button>`;
  if (st === 'external') return `<a class="btn ${tone} ${size}" href="${esc(e.externalLink)}" target="_blank" rel="noopener noreferrer">Apply on the organiser’s site ${ic('arrow-up-right')}</a>`;
  if (st === 'closed') return `<button type="button" class="btn ${tone} ${size}" disabled>Applications closed</button>`;
  return `<button type="button" class="btn ${tone === 'btn-hedge' ? 'btn-ink' : tone} ${size}" data-go="site/events">Browse upcoming events ${ic('arrow-right')}</button>`;
};
const map = e => `<div class="ct-map" role="img" aria-label="Map of ${esc(e.venue)}, ${esc(e.city)}">
  <i class="park"></i><i class="water"></i><i class="rd rd1"></i><i class="rd rd2"></i><i class="rd rd3"></i>
  <span class="ct-pin">${ic('pin')}</span>
  <div class="ct-map-lbl"><b>${esc(e.venue)}</b><span>${esc(e.city)}, ${esc(e.county)}</span></div>
</div>`;

N.page('site/events/:id', {
  app: 'site', example: 'site/events/camden',
  title: p => db.events[p.id]?.name || 'Event',
  render(p) {
    const id = p.id, e = db.events[id];
    if (!e || e.status === 'draft') return CT.notFound('We couldn’t find that event', 'It may have been removed by the organiser. Browse all events instead.', 'site/events', 'All events');
    const st = CT.evStatus(e), done = st === 'completed', l = left(e), pct = Math.round(e.filled / e.pitches * 100), days = N.daysFrom(e.deadline);
    const crew = db.apps.filter(a => a.e === id && a.st === 'approved' && db.traders[a.t]?.status === 'approved').map(a => a.t);
    const more = EV().filter(([k, x]) => k !== id && CT.evStatus(x) !== 'completed').sort((a, b) => (b[1].region === e.region) - (a[1].region === e.region) || a[1].date.localeCompare(b[1].date)).slice(0, 3);
    const facts = [
      ['calendar', 'Date & time', `<b>${dates(e)}</b><span class="small muted">${esc(e.time)}</span>`],
      ['pin', 'Venue', `<b>${esc(e.venue)}</b><span class="small muted">${esc(e.city)}, ${esc(e.county)}</span>`],
      ['store', 'Pitches', done ? `<b>${e.filled} traders</b><span class="small muted">Event finished</span>` : `<b>${l} of ${e.pitches} left</b>${N.bar(pct, l / e.pitches <= .25 ? 'warn' : 'violet')}`],
      ['users', 'Expected footfall', `<b>${e.footfall.toLocaleString('en-GB')} visitors</b><span class="small muted">${multi(e) ? 'Across all days' : 'On the day'}</span>`],
      [e.fee.model === 'pitch' ? 'pound' : 'percent', 'Fee model', e.fee.model === 'pitch' ? `<b>${N.money(e.fee.amount)} pitch fee</b><span class="small muted">Paid to the organiser once approved</span>` : `<b>${e.fee.pct}% commission</b><span class="small muted">Of your takings on the day</span>`],
      ['clock', 'Application deadline', `<b>${N.fLong(e.deadline)}</b><span class="small ${!done && days >= 0 && days <= 3 ? 'ct-soon' : 'muted'}">${done || days < 0 ? 'Closed' : days === 0 ? 'Closes today' : N.plural(days, 'day') + ' left'}</span>`],
    ];
    return `<section class="wrap ct-page">
      ${CT.back('site/events', 'All events')}
      <div class="ct-evhero ct-t-${e.tone}">
        <div class="stack" style="--g:16px">
          <div class="row" style="--g:6px">${CT.evChip(e)}<span class="chip plain">${esc(e.type)}</span></div>
          <h1 class="d-l">${esc(e.name)}</h1>
          <p class="lead">${esc(e.venue)}, ${esc(e.city)} · ${dates(e)}</p>
          <div class="btn-row">${cta(id, e)}${done ? '' : `<button type="button" class="btn btn-white btn-lg" data-act="ct_elig" data-id="${id}">${ic('shield')}Check my eligibility</button>`}<button type="button" class="btn btn-ghost" data-act="ct_copy" data-url="${url(id)}">${ic('share')}Share event</button></div>
        </div>
        <div class="ct-evhero-art">${art(e, 'ct-archart')}</div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-facts" data-note="The six facts traders decide on (date, venue, pitches left, footfall, fee model, deadline) sit in one scannable row instead of being spread through the description.">${facts.map(([icn, k, v]) => `<div class="ct-fact"><span class="eyebrow">${ic(icn, 'ic-sm')}${k}</span>${v}</div>`).join('')}</div>
      <div class="grid g-side ct-evmain">
        <div class="stack" style="--g:40px;min-width:0">
          <section class="stack" style="--g:14px">
            <h2 class="d-s">About this event</h2>
            <div class="prose"><p>${esc(e.about)}</p></div>
            <div class="stack" style="--g:8px"><span class="eyebrow">Cuisines wanted</span><div class="tags">${e.cuisines.map(c => `<span class="tag">${ic('utensils')}${esc(c)}</span>`).join('')}</div></div>
          </section>
          <section class="stack" style="--g:14px" data-note="Requirements are listed up front and checkable against your passport in one tap, before you start an application.">
            <div class="row between"><h2 class="d-s">What you’ll need</h2>${done ? '' : `<button type="button" class="btn btn-line btn-sm" data-act="ct_elig" data-id="${id}">${ic('shield', 'ic-sm')}Check my eligibility</button>`}</div>
            <ul class="ct-needs ct-t-${e.tone}">${needs(e).map(([icn, t, s]) => `<li><span class="ct-ni">${ic(icn)}</span><span><b>${esc(t)}</b><span class="s">${esc(s)}</span></span></li>`).join('')}</ul>
            <p class="small muted">Your Food Trader Passport is checked against every item above when you apply, using the event date rather than today’s.</p>
          </section>
          ${crew.length ? `<section class="stack" style="--g:14px"><h2 class="d-s">${done ? 'Traders who took part' : 'Confirmed so far'}</h2><div class="ct-crew">${crew.map(t => `<button type="button" data-go="site/traders/${t}">${N.tav(t, 'sm')}${esc(db.traders[t].display || db.traders[t].biz)}</button>`).join('')}</div></section>` : ''}
          <section class="stack" style="--g:14px">
            <div class="row between"><h2 class="d-s">Where it is</h2><button type="button" class="btn btn-ghost btn-sm" data-act="ct_directions" data-v="${esc(e.venue)}">${ic('map', 'ic-sm')}Get directions</button></div>
            ${map(e)}
          </section>
        </div>
        <aside class="ct-side">
          <div class="ct-pitch">
            <div class="row between"><span class="eyebrow">Your pitch</span>${CT.evChip(e)}</div>
            <div><span class="num" style="font-size:44px">${e.fee.model === 'pitch' ? N.money(e.fee.amount) : e.fee.pct + '%'}</span><p class="muted small">${e.fee.model === 'pitch' ? 'pitch fee' : 'commission on takings'} · ${e.frontage} m frontage</p></div>
            ${done ? '' : `<div class="stack" style="--g:6px"><div class="row between small"><span>${l} of ${e.pitches} pitches left</span><span class="muted">${deadline(e)}</span></div>${N.bar(pct)}</div>`}
            ${cta(id, e, 'btn-block', 'btn-zest')}
            ${done ? '' : `<button type="button" class="btn btn-onhedge btn-block" data-act="ct_elig" data-id="${id}">Check my eligibility</button>`}
          </div>
          ${orgCard(id, e)}
        </aside>
      </div>
    </section>
    ${more.length ? `<section class="wrap ct-sec"><div class="sec-head split"><div><p class="eyebrow">Also looking for traders</p><h2 class="d-s">More events</h2></div><button type="button" class="btn btn-line btn-sm" data-go="site/events">All events ${ic('arrow-right', 'ic-sm')}</button></div><div class="ct-evs">${more.map(CT.evCard).join('')}</div></section>` : ''}`;
  },
});

Object.assign(N.act, {
  ct_directions(el) { N.toast(`Prototype: this opens ${esc(el.dataset.v)} in your maps app.`, { icon: 'map' }); },
  ct_elig(el) {
    const id = el.dataset.id, e = db.events[id], t = db.traders.ag;
    const cs = N.evalChecks('ag', id), sum = N.sumChecks(cs), score = N.matchScore('ag', id), st = CT.evStatus(e);
    const msg = !sum.can ? 'Fix the missing items before you apply. Organisers see exactly the same checks.' : sum.cls === 'warn' ? 'You can apply now. Renew anything flagged before the event day.' : 'Your passport meets every requirement for this event.';
    const foot = !sum.can ? `<button type="button" class="btn btn-hedge btn-block" data-go="trader/documents">Fix it in My Documents ${ic('arrow-right')}</button>`
      : st === 'open' ? `<button type="button" class="btn btn-hedge btn-block" data-go="trader/apply/${id}">Apply with your passport ${ic('arrow-right')}</button>`
      : st === 'external' ? `<a class="btn btn-hedge btn-block" href="${esc(e.externalLink)}" target="_blank" rel="noopener noreferrer">Apply on the organiser’s site ${ic('arrow-up-right')}</a>`
      : `<button type="button" class="btn btn-line btn-block" data-go="site/events">Find another event</button>`;
    N.openDrawer(`<div class="dr-head">${N.tav('ag', 'lg')}<div class="dr-ti"><h3>Your eligibility</h3><p>${esc(t.display)} · ${esc(e.name)}</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
      <div class="dr-body">
        <div class="row" style="--g:18px;flex-wrap:nowrap">${N.ring(score, sum.cls === 'ok' ? '' : 'warn', 'match')}<div class="stack" style="--g:8px"><span class="chip ${sum.cls} lg">${esc(sum.txt)}</span><p class="small ink-2">${msg}</p></div></div>
        <div><p class="dr-h">Checked against ${N.fLong(e.date)}, the event day</p>${N.reqList(cs)}</div>
        <div class="banner info">${ic('info')}<div class="grow small">Demo: you are viewing as Alice Green, the sample trader. A certificate that expires before the event day shows as a warning, even if it is valid today.</div></div>
      </div>
      <div class="dr-foot">${foot}</div>`);
  },
});
})();

/* =====================================================================
   TRADERS · site/traders, site/traders/:id and the public passport
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const CT = N.ct, S = CT.S;

const TR = () => Object.entries(db.traders).filter(([, t]) => t.status === 'approved');
const nameOf = t => t.display || t.biz;
const PUBLIC_BIO = { cw: 'Pies, stews and proper British comfort food, made in Newcastle.' }; // replaces an internal note in the sample data
const bio = (id, t) => PUBLIC_BIO[id] || t.bio;
const HIST = [
  { name: 'Manchester Street Feast', loc: 'Manchester', date: '2025-08-15' },
  { name: 'Great Northern Food Festival', loc: 'Leeds', date: '2025-07-20' },
  { name: 'Summer Streets Pop-Up Market', loc: 'Liverpool', date: '2025-06-01' },
];
CT.pastEvents = tid => [
  ...db.apps.filter(a => a.t === tid && a.st === 'approved' && N.eventState(db.events[a.e]) === 'completed').map(a => ({ id: a.e, name: db.events[a.e].name, loc: db.events[a.e].city, date: db.events[a.e].date })),
  ...(tid === 'ag' ? HIST : []),
].sort((a, b) => b.date.localeCompare(a.date));
CT.hyg = v => `<span class="ct-hyg" title="Food hygiene rating ${v}: ${esc(N.FHRS[v])}"><b>${v}</b><span>Hygiene<br>${esc(N.FHRS[v])}</span></span>`;
const unitCard = u => `<div class="ct-unit"><span class="ct-unit-ic">${ic('truck', 'ic-lg')}</span><div class="stack" style="--g:6px;min-width:0"><b class="h4">${esc(u.name)}</b><span class="small muted">${esc(u.type)}</span><div class="tags"><span class="mtag">${u.w.toFixed(2)}m × ${u.d.toFixed(2)}m</span><span class="mtag">${u.gas ? 'Gas' : 'No gas'}</span><span class="mtag">${esc(u.power || 'No power')}</span><span class="mtag">${N.plural(u.staff, 'staff member')}</span></div></div></div>`;

CT.trCard = ([id, t]) => {
  const ready = N.readiness(id);
  return `<article class="ct-tr" data-go="site/traders/${id}">
    <div class="ct-tr-band ct-t-${t.tone}"><span class="ct-tr-cu">${esc(t.cuisine)}</span>${ready >= 90 ? N.checked() : ''}</div>
    <div class="ct-tr-b">
      ${N.tav(id, 'xl')}
      <h3><button type="button" data-go="site/traders/${id}">${esc(nameOf(t))}</button></h3>
      <p class="small muted">${esc(t.person)} · ${esc(t.city)} · since ${t.since}</p>
      <p class="ct-tr-bio">${esc(bio(id, t))}</p>
      ${t.tags.length ? `<div class="tags">${t.tags.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
      <div class="ct-tr-foot">${CT.hyg(t.fhrs)}<span class="row" style="--g:6px">${t.rating ? `${N.stars(t.rating)}<b class="small">${t.rating.toFixed(1)}</b>` : '<span class="small muted">No ratings yet</span>'}</span></div>
    </div>
  </article>`;
};

/* ---------- directory ---------- */
const tst = () => S('ct_tr', { q: '', cuisine: 'all', tags: [], sort: 'rating' });
const trList = () => {
  const st = tst();
  const by = { rating: (a, b) => (b[1].rating || 0) - (a[1].rating || 0) || N.readiness(b[0]) - N.readiness(a[0]), ready: (a, b) => N.readiness(b[0]) - N.readiness(a[0]), az: (a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])) };
  return TR().filter(([id, t]) => CT.has(st.q, nameOf(t), t.biz, t.person, t.food, t.city, t.cuisine, bio(id, t))
    && (st.cuisine === 'all' || t.cuisine === st.cuisine)
    && st.tags.every(g => t.tags.includes(g))).sort(by[st.sort] || by.rating);
};
const trResults = () => {
  const list = trList(), st = tst();
  if (!list.length) return N.empty('No traders match', `Try fewer speciality tags${st.q.trim() ? ` or a different search than “${esc(st.q.trim())}”` : ''}.`, '<button type="button" class="btn btn-line btn-sm" data-act="ct_trClear">Clear filters</button>', 'users');
  return `<div class="ct-trs">${list.map(CT.trCard).join('')}</div>`;
};
const trCount = () => `${trList().length} of ${TR().length} traders`;
const paintTraders = () => {
  const r = document.getElementById('ctTrRes'); if (!r) return;
  r.innerHTML = trResults();
  const c = document.getElementById('ctTrCount'); if (c) c.textContent = trCount();
  document.querySelectorAll('#ctTrTags [data-t]').forEach(b => b.setAttribute('aria-pressed', String(tst().tags.includes(b.dataset.t))));
  CT.notes();
};

N.page('site/traders', {
  app: 'site', title: 'Traders',
  render() {
    const st = tst(), all = TR();
    const cuisines = [...new Set(all.map(([, t]) => t.cuisine))].sort();
    const rated = all.filter(([, t]) => t.rating), avg = rated.reduce((a, [, t]) => a + t.rating, 0) / Math.max(1, rated.length);
    const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
    return `<section class="wrap ct-page">
      <div class="ct-hero">
        <div class="stack" style="--g:18px">
          <p class="eyebrow">Top traders on Niche</p>
          <h1 class="d-l">Traders trusted by the UK’s best <em>events</em></h1>
          <p class="lead">Every trader here has a Food Trader Passport checked by our team. Search by cuisine, dietary speciality or city, then invite them to your event.</p>
        </div>
        <div class="ct-stats3">
          <div class="ct-es ct-t-mint"><span class="num">${all.length}</span><span>approved traders</span></div>
          <div class="ct-es ct-t-lilac"><span class="num">${all.filter(([id]) => N.readiness(id) >= 90).length}</span><span>Checked, 90%+ ready</span></div>
          <div class="ct-es ct-t-peach"><span class="num">${avg.toFixed(1)}</span><span>average organiser rating</span></div>
        </div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-bar" role="search" data-note="Speciality chips combine (Halal + Vegan, say) with cuisine and sort, so an organiser can build a shortlist in seconds.">
        <div class="ct-bar-row">
          <label class="search">${ic('search')}<span class="sr">Search traders</span><input type="search" id="ctTrQ" placeholder="Search by name, food or city" value="${esc(st.q)}" data-input="ct_trQ" autocomplete="off"></label>
          <label class="sr" for="ctTrCu">Cuisine</label><select class="sel" id="ctTrCu" data-change="ct_trF" data-k="cuisine">${opt('all', 'All cuisines', st.cuisine)}${cuisines.map(c => opt(c, c, st.cuisine)).join('')}</select>
          <label class="sr" for="ctTrSort">Sort</label><select class="sel" id="ctTrSort" data-change="ct_trF" data-k="sort">${opt('rating', 'Top rated', st.sort)}${opt('ready', 'Most ready', st.sort)}${opt('az', 'A to Z', st.sort)}</select>
        </div>
        <div class="ct-bar-row between">
          <div class="ct-chips" id="ctTrTags" aria-label="Filter by speciality">${db.tags.specialityTags.map(g => `<button type="button" class="ct-fchip" data-act="ct_trTag" data-t="${esc(g)}" aria-pressed="${st.tags.includes(g)}">${esc(g)}<span class="n">${all.filter(([, t]) => t.tags.includes(g)).length}</span></button>`).join('')}</div>
          <span class="ct-count" id="ctTrCount" aria-live="polite">${trCount()}</span>
        </div>
      </div>
      <div id="ctTrRes" data-note="The Checked seal only appears at 90%+ passport readiness, so organisers can trust it at a glance. Hygiene rating and organiser stars sit on every card.">${trResults()}</div>
    </section>
    <section class="wrap ct-sec">
      <div class="blk blk-lilac ct-band">
        <div class="stack" style="--g:10px"><p class="eyebrow">For organisers</p><h2 class="d-s">Invite traders who already meet your rules.</h2><p>Filter by hygiene rating, power and cuisine, then send an invitation in one click.</p></div>
        <div class="btn-row"><button type="button" class="btn btn-violet" data-go="org/invite-traders">Invite traders</button><button type="button" class="btn btn-line" data-go="site/how-verification-works">How verification works</button></div>
      </div>
    </section>`;
  },
});
Object.assign(N.act, {
  ct_trTag(el) { const st = tst(), g = el.dataset.t; st.tags = st.tags.includes(g) ? st.tags.filter(x => x !== g) : [...st.tags, g]; paintTraders(); },
  ct_trClear() { Object.assign(tst(), { q: '', cuisine: 'all', tags: [] }); N.refresh(); },
  ct_invite(el) { N.go('org/invite-traders'); N.toast(`Pick an event to invite ${esc(el.dataset.n)} to.`, { icon: 'user-plus' }); },
  ct_askPassport(el) { N.toast(`${esc(el.dataset.n)} shares their full passport when they apply or accept your invitation.`, { icon: 'lock' }); },
});
N.input.ct_trQ = el => { tst().q = el.value; paintTraders(); };
N.change.ct_trF = el => { tst()[el.dataset.k] = el.value; paintTraders(); };

/* ---------- profile ---------- */
const reviewCard = r => {
  const o = db.organisers[r.from], e = db.events[r.e];
  const sub = r.punct ? `<div class="ct-subs">${[['Punctuality', r.punct], ['Food quality', r.qual], ['Communication', r.comm]].map(([k, v]) => `<div><span>${k} · ${v}/5</span>${N.bar(v * 20, 'ok')}</div>`).join('')}</div>` : '';
  return `<figure class="ct-review">
    <div class="row between">${N.stars(r.stars)}<span class="mono muted">${N.fLong(r.when)}</span></div>
    <blockquote>“${esc(r.text)}”</blockquote>
    ${sub}
    <figcaption class="row" style="--g:10px">${N.oav(r.from, 'sm')}<span class="small"><b>${esc(o.person)}</b>, ${esc(o.company)}<br><span class="muted">${esc(e.name)}</span></span></figcaption>
  </figure>`;
};

N.page('site/traders/:id', {
  app: 'site', example: 'site/traders/ag',
  title: p => { const t = db.traders[p.id]; return t ? nameOf(t) : 'Trader'; },
  render(p) {
    const id = p.id, t = db.traders[id];
    if (!t) return CT.notFound('We couldn’t find that trader', 'The profile may have been removed. Browse all traders instead.', 'site/traders', 'All traders');
    if (t.status !== 'approved') return `<section class="wrap ct-page">${CT.back('site/traders', 'All traders')}${N.empty(`${nameOf(t)} isn’t public yet`, 'This trader’s passport is still being checked by our team. Their profile appears here once they are approved.', '<button type="button" class="btn btn-ink btn-sm" data-go="site/traders">Browse approved traders</button>', 'lock')}</section>`;
    const ready = N.readiness(id), units = db.units.filter(u => u.trader === id && u.status === 'active');
    const past = CT.pastEvents(id), reviews = db.reviews.filter(r => r.dir === 'o2t' && r.to === id);
    const specs = [...t.tags, t.cuisine, ...t.categories];
    return `<section class="wrap ct-page">
      ${CT.back('site/traders', 'All traders')}
      <header class="ct-profhead ct-t-${t.tone}" data-note="The header leads with what organisers check first: Checked seal, approval, rating and a direct Invite action, framed by the arch avatar.">
        ${N.tav(id, 'xl')}
        <div class="stack" style="--g:12px;min-width:0">
          <div class="row" style="--g:6px">${ready >= 90 ? N.checked() : ''}${N.chip('ok', 'Approved')}<span class="chip plain">${esc(t.cuisine)}</span></div>
          <h1 class="d-l">${esc(nameOf(t))}</h1>
          <p class="lead">${esc(t.person)} · ${esc(t.food)} · ${esc(t.city)} · trading since ${t.since}</p>
          <div class="row" style="--g:8px">${t.rating ? `${N.stars(t.rating)}<b>${t.rating.toFixed(1)}</b><span class="small">organiser rating</span>` : '<span class="small">No organiser ratings yet</span>'}</div>
        </div>
        <div class="btn-row ct-profhead-cta">
          <button type="button" class="btn btn-violet" data-act="ct_invite" data-n="${esc(nameOf(t))}">${ic('user-plus')}Invite to your event</button>
          ${id === 'ag' ? `<button type="button" class="btn btn-white" data-go="site/passport">${ic('id')}View full passport</button>` : `<button type="button" class="btn btn-white" data-act="ct_askPassport" data-n="${esc(t.person)}">${ic('lock')}Full passport on request</button>`}
        </div>
      </header>
    </section>
    <section class="wrap ct-sec">
      <div class="grid g-side" style="--g:clamp(28px,4vw,56px)">
        <div class="stack" style="--g:44px;min-width:0">
          <section class="stack" style="--g:12px"><h2 class="d-s">About</h2><div class="prose"><p>${esc(bio(id, t))} ${esc(t.person)} has traded since ${t.since} and is based in ${esc(t.city)}.</p></div></section>
          <section class="stack" style="--g:12px"><h2 class="d-s">Specialities</h2><div class="tags">${specs.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></section>
          <section class="stack" style="--g:12px"><h2 class="d-s">Trading units</h2>${units.length ? units.map(unitCard).join('') : `<div class="ct-unit"><span class="ct-unit-ic">${ic('truck', 'ic-lg')}</span><div class="stack" style="--g:4px"><b class="h4">1 trading unit</b><span class="small muted">${esc(t.categories.join(' and '))} · needs ${esc(t.power || 'no')} power · ${t.gas ? 'cooks with LPG' : 'no gas on board'}</span></div></div>`}</section>
          <section class="stack ct-t-mint ct-hygblock" style="--g:12px" data-note="The official 0 to 5 hygiene scale is shown in full with the trader’s score raised as an arch, so organisers read it the same way as the sticker in a shop window.">
            <h2 class="d-s">Food hygiene rating</h2>
            ${N.fhrs(t.fhrs)}
            <p class="small">Rated by the local authority under the Food Standards Agency scheme.${t.authority ? ` Inspected by ${esc(t.authority)}.` : ''}</p>
          </section>
          <section class="stack" style="--g:12px"><h2 class="d-s">Previous events</h2>${past.length ? `<ul class="ct-past">${past.map(ev => `<li>${N.evd(ev.date)}<span class="stack" style="--g:0"><b>${esc(ev.name)}</b><span class="small muted">${esc(ev.loc)} · ${N.fLong(ev.date)}</span></span>${ev.id ? `<button type="button" class="btn btn-ghost btn-xs" data-go="site/events/${ev.id}">View</button>` : '<span class="mtag">Completed</span>'}</li>`).join('')}</ul>` : '<p class="muted">No completed Niche events yet.</p>'}</section>
          <section class="stack" style="--g:14px"><h2 class="d-s">What organisers say</h2>${reviews.length ? reviews.map(reviewCard).join('') : N.empty('No reviews yet', 'Organisers can rate this trader after an event they both took part in.', '', 'star')}</section>
        </div>
        <aside class="ct-side">
          <div class="card stack" style="--g:16px">
            <div class="row" style="--g:16px;flex-wrap:nowrap">${N.ring(ready, ready >= 90 ? '' : 'warn', 'ready')}<div class="stack" style="--g:6px"><b>Passport readiness</b><span class="small muted">${ready >= 90 ? 'Enough valid documents to earn the Checked seal.' : 'Some documents are in review or due for renewal.'}</span></div></div>
            ${N.kv([['Cuisine', esc(t.cuisine)], ['Hygiene', `${t.fhrs} · ${esc(N.FHRS[t.fhrs])}`], ['Liability cover', `£${t.pli}m`], ['Power', esc(t.power || 'None')], ['Gas', t.gas ? 'LPG, certified' : 'No gas'], ['Allergen info', t.allergen ? 'Up to date' : 'Not uploaded']])}
            <button type="button" class="btn btn-violet btn-block" data-act="ct_invite" data-n="${esc(nameOf(t))}">Invite to your event</button>
            ${id === 'ag' ? '<button type="button" class="btn btn-line btn-block" data-go="site/passport">View full passport</button>' : ''}
          </div>
        </aside>
      </div>
    </section>`;
  },
});

/* ---------- public passport (Alice Green) ---------- */
const PP_URL = 'https://www.nicheconnect.co/passport/alice-green-foods';
const pst = () => S('ct_pp', { active: true, exp: '30' });
const ppState = () => {
  const st = pst();
  if (!st.active) return ['warn', 'Link switched off. Visitors see a “passport unavailable” page until you turn it back on.'];
  return ['ok', st.exp === 'never' ? 'Anyone with the link can view your passport until you switch it off.' : `Anyone with the link can view your passport until ${N.fLong(N.addDays('2026-09-29', +st.exp))}.`];
};
const paintPpState = () => { const el = document.getElementById('ctPpState'); if (!el) return; const [cls, txt] = ppState(); el.className = 'banner ' + cls; el.innerHTML = `${ic(cls === 'ok' ? 'link' : 'lock')}<div class="grow small">${txt}</div>`; };

N.page('site/passport', {
  app: 'site', title: 'Trader passport',
  render() {
    const id = 'ag', t = db.traders.ag, ready = N.readiness(id);
    const units = db.units.filter(u => u.trader === id && u.status === 'active');
    const docs = N.docsOf(id), states = docs.map(d => N.docState(d)), past = CT.pastEvents(id);
    const cnt = k => states.filter(s => s === k).length;
    const reviews = db.reviews.filter(r => r.dir === 'o2t' && r.to === id);
    const pno = 'NCH-26-' + String(100 + Object.keys(db.traders).indexOf(id)).padStart(4, '0');
    const viewed = N.TODAY.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const readyTxt = [cnt('valid') && `${cnt('valid')} approved`, cnt('pending') && `${cnt('pending')} in review`, cnt('expiring') && `${cnt('expiring')} expiring soon`, cnt('missing') && `${cnt('missing')} not uploaded`].filter(Boolean).join(' · ');
    return `<section class="wrap ct-page">
      <div class="ct-pp-bar" data-note="Share and Export sit above the document. Sharing has an on/off switch and an expiry, so the trader stays in control of who can view.">
        <div class="stack" style="--g:4px"><p class="eyebrow">Public passport</p><p class="small muted">Shared by Alice Green. This is exactly what an organiser sees from a passport link.</p></div>
        <div class="btn-row"><button type="button" class="btn btn-line btn-sm" data-act="ct_ppShare">${ic('share')}Share Passport</button><button type="button" class="btn btn-ink btn-sm" data-act="ct_ppPdf">${ic('download')}Export PDF</button></div>
      </div>
      <article class="ct-doc" aria-label="Trader passport for ${esc(t.display)}">
        <header class="ct-doc-head">
          <div class="stack" style="--g:14px;min-width:0">
            <div class="row between"><span class="eyebrow">Trader passport</span><span class="mono ct-pno">${pno}</span></div>
            <h1 class="d-l">${esc(t.display)}</h1>
            <p class="ct-doc-sub">Trading since ${t.since} · ${esc(t.city)}, UK</p>
            <div class="row" style="--g:6px"><span class="chip zest">Approved</span>${ready >= 90 ? N.checked() : ''}<span class="chip plain ct-onh">${esc(t.food)}</span></div>
          </div>
          <div class="ct-doc-photo">${N.art(t.tone, N.initials(t.display), `Est. ${t.since}`, 'ct-photo')}<div class="stamp">${N.stamp('ct-pp-stamp')}</div></div>
        </header>
        <div class="ct-metrics" data-note="Three trust signals in one row: organiser rating, passport readiness and the official hygiene rating.">
          <div class="ct-metric"><div class="stack" style="--g:6px"><span class="eyebrow">Organiser’s rating</span><span class="num">${t.rating.toFixed(1)}</span>${N.stars(t.rating)}<span class="xs muted">From ${N.plural(reviews.length, 'organiser review')}</span></div></div>
          <div class="ct-metric">${N.ring(ready, ready >= 90 ? '' : 'warn', '')}<div class="stack" style="--g:6px;min-width:0"><span class="eyebrow">Passport readiness</span><span class="small ink-2">${readyTxt}</span></div></div>
          <div class="ct-metric">${CT.hyg(t.fhrs)}</div>
        </div>
        <div class="ct-doc-body" data-note="Designed as a document, not a dashboard: it prints and shares well, with status and expiry beside every certificate so organisers never have to ask.">
          <section class="ct-dsec"><h2>${ic('user', 'ic-sm')}About</h2><p>${esc(t.bio)}</p></section>
          <section class="ct-dsec"><h2>${ic('tag', 'ic-sm')}Specialities</h2><div class="tags">${[...t.tags, t.cuisine, t.food].map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></section>
          <section class="ct-dsec"><h2>${ic('award', 'ic-sm')}UK Food Standards</h2>${N.fhrs(t.fhrs)}<p class="xs muted" style="margin-top:10px">Rated by ${esc(t.authority)}. Last inspection 14 June 2025.</p></section>
          <section class="ct-dsec"><h2>${ic('truck', 'ic-sm')}Trading units (${units.length})</h2><div class="stack" style="--g:10px">${units.map(unitCard).join('')}</div></section>
          <section class="ct-dsec full"><h2>${ic('shield', 'ic-sm')}Compliance</h2>
            <div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Document</th><th>Covers</th><th>Status</th><th class="r">Expires</th></tr></thead><tbody>${docs.map(d => { const ty = N.docType(d.type), st = N.docState(d), u = d.unit && db.units.find(x => x.id === d.unit); return `<tr><td data-l="Document"><b>${esc(ty.name)}</b>${d.note && st !== 'missing' ? `<div class="xs muted">${esc(d.note)}</div>` : ''}</td><td data-l="Covers">${esc(u ? u.name : ty.level)}</td><td data-l="Status">${N.docChip(st)}</td><td data-l="Expires" class="r mono">${st === 'missing' ? '—' : d.exp ? N.fNum(d.exp) : 'No expiry'}</td></tr>`; }).join('')}</tbody></table></div>
          </section>
          <section class="ct-dsec full"><h2>${ic('calendar', 'ic-sm')}Previous events</h2>
            <div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Event</th><th>Location</th><th class="r">Date</th></tr></thead><tbody>${past.map(ev => `<tr><td data-l="Event"><b>${esc(ev.name)}</b></td><td data-l="Location">${esc(ev.loc)}</td><td data-l="Date" class="r mono">${N.fNum(ev.date)}</td></tr>`).join('')}</tbody></table></div>
          </section>
        </div>
        <footer class="ct-doc-foot"><span>${N.wm('wm-sm mono')}</span><span>Niche · Trader Passport</span><span>Viewed on ${viewed}</span><span>info@nicheconnect.co</span><span>07831 635145</span><span>www.nicheconnect.co</span></footer>
      </article>
    </section>`;
  },
});

Object.assign(N.act, {
  ct_ppShare() {
    const st = pst(), [cls, txt] = ppState();
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">Share passport</p><h3>Send organisers one link</h3><p class="muted">Anyone with the link sees this page: profile, hygiene rating, units, document status and expiry dates. They can’t download your files.</p></div>
      <div class="ct-linkbox"><input class="inp" id="ctPpLink" value="${PP_URL}" readonly aria-label="Passport link"><button type="button" class="btn btn-ink" data-act="ct_ppCopy">${ic('copy')}Copy</button></div>
      <div class="ct-share-set">
        ${N.toggle('ctPpActive', 'Link active', st.active, 'data-change="ct_ppActive"')}
        <label class="field"><span>Link expires</span><select class="sel" data-change="ct_ppExp">${[['7', 'In 7 days'], ['30', 'In 30 days'], ['90', 'In 90 days'], ['never', 'Never']].map(([v, l]) => `<option value="${v}" ${st.exp === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="banner ${cls}" id="ctPpState">${ic(cls === 'ok' ? 'link' : 'lock')}<div class="grow small">${txt}</div></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Close</button><button type="button" class="btn btn-hedge btn-sm" data-act="ct_ppSave">Save sharing settings</button></div>`);
  },
  ct_ppCopy() { N.copy(PP_URL, document.getElementById('ctPpLink')); },
  ct_ppSave() { N.closeModal(); N.toast(pst().active ? 'Sharing settings saved. Your link is live.' : 'Sharing settings saved. Your link is switched off.', { icon: 'link' }); },
  ct_ppPdf() {
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">Export PDF</p><h3>Your passport as a two-page PDF</h3><p class="muted">Downloads are blocked in this prototype viewer, so here is what the export contains.</p></div>
      <div class="ct-pdf">
        <div class="ct-pg" aria-hidden="true"><div class="hd"></div><div class="ct-pg-row"><i></i><i></i><i></i></div><i style="width:80%"></i><i style="width:64%"></i><i style="width:72%"></i><div class="ct-pg-box"></div><i style="width:56%"></i><em>1</em></div>
        <div class="ct-pg" aria-hidden="true"><i style="width:40%"></i>${'<div class="ct-pg-tr"><i></i><i></i><i></i></div>'.repeat(6)}<i style="width:38%;margin-top:6px"></i>${'<div class="ct-pg-tr"><i></i><i></i></div>'.repeat(4)}<span class="ct-pg-qr"></span><em>2</em></div>
        <ul class="ct-pdf-list">
          <li><b>Page 1</b>Name, passport number and Checked stamp, organiser rating, readiness, hygiene rating, about, specialities and trading units.</li>
          <li><b>Page 2</b>Compliance table with status and expiry dates, previous events, and a QR code that opens the live passport, so organisers always see current dates.</li>
          <li><b>Format</b>A4 portrait, prints cleanly in black and white. File name: alice-green-foods-passport.pdf.</li>
        </ul>
      </div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Close</button><button type="button" class="btn btn-ink btn-sm" data-act="ct_ppCopy">${ic('copy')}Copy link instead</button></div>`, 'wide');
  },
});
N.change.ct_ppActive = el => { pst().active = el.checked; paintPpState(); };
N.change.ct_ppExp = el => { pst().exp = el.value; paintPpState(); };
})();

/* =====================================================================
   DATA TRUST · site/data-trust
   ===================================================================== */
(() => {
'use strict';
const { esc, ic } = N;
const CT = N.ct, S = CT.S;

const PRINCIPLES = [
  ['mint', 'key', 'You own your data', 'Your passport, documents and trading history belong to your business. Download them or take them elsewhere whenever you like.'],
  ['lilac', 'eye', 'You decide who sees it', 'Organisers see your documents only when you apply or accept their invitation. Nothing is public unless you list your profile.'],
  ['butter', 'shield', 'Checked by people', 'Trained members of the Niche team verify every document. Access is limited to the people whose job needs it.'],
  ['peach', 'lock', 'Locked down by default', 'Encrypted in transit and at rest, with permission-based access and a log of every time a document is opened.'],
];
const SEE = [
  ['user', 'Business name, city, cuisine and bio', ['public', 'other', 'applied', 'team']],
  ['star', 'Hygiene rating and organiser ratings', ['public', 'other', 'applied', 'team']],
  ['shield', 'Readiness score and requirement checks', ['applied', 'team']],
  ['file', 'Your compliance documents', ['applied', 'team']],
  ['phone', 'Phone number and email address', ['applied', 'team']],
  ['lock', 'Card and bank details', []],
];
const VIEWS = [['public', 'Anyone online'], ['other', 'Other organisers'], ['applied', 'Organisers you apply to'], ['team', 'Niche team']];
const VIEW_TXT = {
  public: 'Only the profile you choose to list in the trader directory. Unlisted traders are invisible to the public.',
  other: 'Your public profile and the Checked seal if you have earned it. They can invite you, but can’t open your documents.',
  applied: 'Everything they need to book you safely, for the event you applied to or were invited to.',
  team: 'Everything except payment details, so we can verify documents and help when you ask. Card details stay with our payment provider.',
};
const FAQ = [
  ['Who owns my data?', 'You do. Your passport, documents and trading history belong to your business. We store and check them so you can reuse them, and you can download or delete them at any time.'],
  ['What can organisers see?', 'Only when you apply to their event or accept their invitation can an organiser see your documents and contact details. Everyone else sees your public profile, and only if you choose to list one.'],
  ['Can I delete my account and data?', 'Yes. Delete your account from Settings or by emailing info@nicheconnect.co. Your documents are removed within 30 days. We keep legal records, such as invoices, only for as long as the law requires.'],
  ['Is my data encrypted?', 'Yes. Your data is encrypted in transit and at rest, and access is permission-based, so people only see what their role needs. Every time a document is opened, it is logged.'],
  ['Do you sell my data?', 'No. We never sell personal data or share it with advertisers. Niche makes money from subscriptions and booking commission, not from your information.'],
  ['Who checks my documents?', 'Trained members of the Niche verification team. They compare names, dates and cover levels with your profile and with public records such as the Food Standards Agency hygiene register, then approve the document or tell you exactly what to fix.'],
];
CT.acc = (items, open = 0) => `<div class="ct-acc">${items.map(([q, a], i) => `<details ${i === open ? 'open' : ''}><summary><span>${q}</span><span class="ct-plus" aria-hidden="true">${ic('plus', 'ic-sm')}</span></summary><div class="ct-ans"><p>${a}</p></div></details>`).join('')}</div>`;

const seeList = v => SEE.map(([icn, l, who]) => { const on = who.includes(v); return `<li class="${on ? '' : 'off'}"><span class="ct-si">${ic(on ? icn : 'lock', 'ic-sm')}</span><span>${esc(l)}</span><span class="st">${on ? 'Visible' : 'Hidden'}</span></li>`; }).join('');
CT.seg.ct_see = v => {
  S('ct_dt', { view: 'applied' }).view = v;
  const ul = document.getElementById('ctSeeList'), p = document.getElementById('ctSeeTxt');
  if (ul) ul.innerHTML = seeList(v);
  if (p) p.textContent = VIEW_TXT[v];
};

N.page('site/data-trust', {
  app: 'site', title: 'Data Trust & Security',
  render() {
    const st = S('ct_dt', { view: 'applied' });
    return `<section class="wrap ct-page">
      <div class="ct-hero">
        <div class="stack" style="--g:18px">
          <p class="eyebrow">Data trust</p>
          <h1 class="d-l">Data Trust &amp; <em>Security</em></h1>
          <p class="lead">Your documents prove your business is safe to trade. We look after them carefully, and they always stay yours.</p>
          <div class="btn-row"><button type="button" class="btn btn-ink" data-act="ct_toc" data-id="ctFaq">Read the questions</button><button type="button" class="btn btn-line" data-go="site/privacy">Privacy policy</button></div>
        </div>
        <div class="ct-vault" aria-hidden="true">
          <div class="ct-vault-arch">${ic('lock')}</div>
          <span class="ct-vchip a"><span class="dot ok"></span>Public liability · encrypted</span>
          <span class="ct-vchip b">${ic('eye', 'ic-sm')}Shared only when you apply</span>
          <span class="ct-vchip c">${ic('check-circle', 'ic-sm')}Checked by a person</span>
        </div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-princ">${PRINCIPLES.map(([tone, icn, h, p]) => `<article class="ct-pc ct-t-${tone}"><span class="ct-ico">${ic(icn, 'ic-lg')}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>
    </section>
    <section class="wrap sec-s">
      <div class="ct-see">
        <div class="stack" style="--g:14px">
          <p class="eyebrow">Who sees what</p>
          <h2 class="d-m">See your profile through <em>their</em> eyes.</h2>
          <p class="lead">Pick a viewer to see exactly what they can open. This is how permissions work on the real platform.</p>
        </div>
        <div class="ct-see-card" data-note="An interactive “who sees what” view replaces a wall of policy text and answers the most common trader worry directly: can organisers see my documents?">
          ${N.seg('ct_see', VIEWS, st.view)}
          <p class="small ink-2" id="ctSeeTxt" aria-live="polite" style="margin:14px 0 4px">${VIEW_TXT[st.view]}</p>
          <ul class="ct-see-list" id="ctSeeList">${seeList(st.view)}</ul>
        </div>
      </div>
    </section>
    <section class="wrap sec-s" id="ctFaq">
      <div class="grid g-main" style="--g:clamp(24px,5vw,64px);align-items:start">
        <div class="stack" style="--g:14px"><p class="eyebrow">Questions</p><h2 class="d-m">What traders and organisers ask us</h2>${CT.acc(FAQ)}</div>
        <div class="card flat stack" style="--g:12px"><span class="ct-ico ct-t-lilac" style="background:var(--lilac)">${ic('mail', 'ic-lg')}</span><h3 class="h3">Something else on your mind?</h3><p class="small ink-2">Ask our team about data, access or deletion. We reply within one working day.</p><button type="button" class="btn btn-line btn-sm" data-go="site/help">Contact support</button></div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="blk blk-hedge ct-close" data-note="The closing line from the live page is kept, but set as a single confident statement with the two next steps beside it.">
        <div class="ct-close-arch">${ic('shield', 'ic-xl')}</div>
        <h2 class="d-m">Your compliance profile belongs to you. We just make it work <em>harder</em>.</h2>
        <div class="btn-row"><button type="button" class="btn btn-zest btn-lg" data-go="site/register">Build your passport</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/how-verification-works">How verification works</button></div>
      </div>
    </section>`;
  },
});
})();

/* =====================================================================
   HELP CENTRE · site/help
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const CT = N.ct, S = CT.S;

const CATS = [['start', 'Getting started', 'rocket', 'mint'], ['docs', 'Passport & documents', 'id', 'lilac'], ['apply', 'Applying to events', 'calendar', 'butter'], ['org', 'For organisers', 'building', 'sky'], ['billing', 'Billing & plans', 'pound', 'peach'], ['account', 'Account & security', 'lock', 'mint']];
const QA = [
  ['start', 'What is Niche?', 'Niche connects food traders with event organisers across the UK. Traders build one Food Trader Passport with their documents and apply to events in a few taps. Organisers see applicants who have already been checked against their event’s rules.', ['site/how-it-works-trader', 'How it works for traders']],
  ['start', 'Is Niche free to join?', 'Yes. Traders can use the Lite plan free forever, and Growth and Pro are free for the first three months. Organisers pay nothing in their first year with the Event Pass.', ['site/pricing-trader', 'See trader pricing']],
  ['start', 'How long does account approval take?', 'Our team reviews new traders and organisers within one working day. We email you when you are approved, or tell you exactly what to fix if something is missing.'],
  ['docs', 'Which documents do I need to upload?', 'Most events ask for food business registration, public liability insurance, your food hygiene rating, Level 2 food hygiene training and a food safety plan. If you cook with gas, you need a gas safety certificate for each unit.', ['site/blog/documents-checklist-2026', 'Read the 2026 checklist']],
  ['docs', 'What happens when a document is about to expire?', 'We remind you 30 days, 7 days and 1 day before any document expires. Upload the renewal and our team checks it, usually the same working day. Applications to events after the expiry date show a warning until you do.'],
  ['docs', 'Why was my document rejected?', 'The most common reasons are a blurry scan, a name that doesn’t match your business, or cover below the level shown. The rejection email gives the exact reason. Upload a corrected copy from My Documents.', ['site/how-verification-works', 'How verification works']],
  ['apply', 'How do I apply to an event?', 'Open the event, check the requirements list, choose the trading unit you will bring and press Apply with your passport. The organiser sees your passport and a pass or fail against every requirement.', ['site/events', 'Browse events']],
  ['apply', 'What does “External” mean on an event?', 'External events are listed by the Niche team but the organiser runs their own applications. Press Apply on the organiser’s site to go to their form. You can still share your passport link with them.'],
  ['apply', 'Can I withdraw an application?', 'Yes, from My Applications at any time before the organiser decides. Once you are approved, contact the organiser directly, because their cancellation terms apply.'],
  ['org', 'How do I invite traders to my event?', 'Open Invite Traders, filter by cuisine, hygiene rating or location, and send an invitation to your event. Traders see which of your requirements they already meet before they accept.', ['site/traders', 'Browse traders']],
  ['org', 'How are applicants checked before I see them?', 'Every document is reviewed by our team when it is uploaded, then compared with your event’s rules when a trader applies. You see a clear pass, expiring or missing result for each requirement, checked against your event day.'],
  ['billing', 'How does the trader free period work?', 'Growth and Pro are free for your first three months. After that, Growth is £15 a month and Pro is £29 a month. You can switch or cancel at any time from Subscription.', ['site/pricing-trader', 'Compare trader plans']],
  ['billing', 'What does Niche cost organisers?', 'The Event Pass is free for your first year. From year two, we charge 8% commission on bookings confirmed through Niche.', ['site/pricing-organiser', 'Organiser pricing']],
  ['account', 'How do I reset my password?', 'Choose Forgot password on the log-in page and enter your email. We send a link that works for 60 minutes.', ['site/forgot-password', 'Reset your password']],
  ['account', 'Can I delete my account and my data?', 'Yes. Delete it from Settings or email info@nicheconnect.co. Documents are removed within 30 days; we keep only the records the law requires.', ['site/data-trust', 'Data trust & security']],
];
const TRY = ['gas certificate', 'expire', 'invite', 'commission', 'password'];
const hst = () => S('ct_help', { q: '', cat: 'all', sent: null });
const helpList = () => { const st = hst(); return QA.filter(([c, q, a]) => (st.cat === 'all' || c === st.cat) && CT.has(st.q, q, a)); };
const helpCount = () => { const st = hst(), n = helpList().length, cat = CATS.find(c => c[0] === st.cat); return `${N.plural(n, st.q.trim() ? 'answer' : 'question')}${cat ? ` in ${cat[1]}` : ''}${st.q.trim() ? ` for “${st.q.trim()}”` : ''}`; };
const helpResults = () => {
  const st = hst(), q = st.q.trim(), list = helpList();
  if (!list.length) return N.empty('No answers found', `We couldn’t find anything for “${esc(q)}”. Try another word, or ask the team directly.`, '<div class="btn-row"><button type="button" class="btn btn-ink btn-sm" data-act="ct_toc" data-id="ctContact">Ask the team</button><button type="button" class="btn btn-line btn-sm" data-act="ct_helpClear">Clear search</button></div>', 'help');
  return `<div class="ct-acc ct-hl">${list.map(([c, qq, a, link], i) => { const cat = CATS.find(x => x[0] === c); return `<details ${q && i === 0 ? 'open' : ''}><summary><span class="stack" style="--g:4px"><span class="ct-qcat">${esc(cat[1])}</span><span>${CT.hl(qq, q)}</span></span><span class="ct-plus" aria-hidden="true">${ic('plus', 'ic-sm')}</span></summary><div class="ct-ans"><p>${CT.hl(a, q)}</p>${link ? `<button type="button" class="link" data-go="${link[0]}">${esc(link[1])}${ic('arrow-right')}</button>` : ''}</div></details>`; }).join('')}</div>`;
};
const paintHelp = () => {
  const r = document.getElementById('ctHelpRes'); if (!r) return;
  r.innerHTML = helpResults();
  const c = document.getElementById('ctHelpCount'); if (c) c.textContent = helpCount();
  document.querySelectorAll('#ctHelpTiles [data-c]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.c === hst().cat)));
  CT.notes();
};
const contactForm = () => `<form data-form="ct_contact" class="stack" style="--g:18px">
  <div class="stack" style="--g:6px"><h3 class="h3">Send us a message</h3><p class="small muted">Fields marked * are required.</p></div>
  <div class="form-grid">
    ${N.field({ label: 'Your name', id: 'ctCName', req: true, attrs: 'autocomplete="name"' })}
    ${N.field({ label: 'Email', id: 'ctCEmail', type: 'email', req: true, ph: 'you@business.co.uk', attrs: 'autocomplete="email"' })}
    <fieldset class="ct-fs full"><legend class="lbl req">I am a</legend><div class="ct-radio">${[['trader', 'Food trader'], ['organiser', 'Event organiser'], ['other', 'Something else']].map(([v, l], i) => `<label><input type="radio" name="ctCWho" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
    ${N.field({ label: 'Topic', id: 'ctCTopic', req: true, full: true, opts: [['', 'Choose a topic'], ...CATS.map(c => c[1]), 'Something else'] })}
    ${N.field({ label: 'Message', id: 'ctCMsg', type: 'textarea', req: true, full: true, rows: 5, ph: 'Tell us what happened and which event or document it relates to.' })}
  </div>
  <div class="row between"><p class="xs muted">We only use your details to reply to you.</p><button type="submit" class="btn btn-violet">Send message ${ic('send')}</button></div>
</form>`;
const sentView = s => `<div class="ct-sent" role="status">
  <span class="ct-sent-ic">${ic('check', 'ic-xl')}</span>
  <h3 class="d-s">Thanks, ${esc(s.name.split(' ')[0])}. Message received.</h3>
  <p class="ink-2">We’d normally reply to <b>${esc(s.email)}</b> within one working day about “${esc(s.topic)}”.</p>
  <div class="banner info">${ic('info')}<div class="grow small">Prototype: nothing was sent.</div></div>
  <button type="button" class="btn btn-line btn-sm" data-act="ct_contactAgain">Send another message</button>
</div>`;

N.page('site/help', {
  app: 'site', title: 'Help centre',
  render() {
    const st = hst();
    return `<section class="wrap ct-page">
      <div class="ct-helphero">
        <p class="eyebrow">Help centre</p>
        <h1 class="d-l">How can we <em>help</em>?</h1>
        <p class="lead">Answers for traders and organisers, from your first document to your fiftieth event.</p>
        <label class="ct-bigsearch" data-note="Search filters answers as you type and highlights the matching words, so people find the answer without scrolling a long page.">${ic('search', 'ic-lg')}<span class="sr">Search help</span><input type="search" id="ctHelpQ" placeholder="Search questions, e.g. gas certificate" value="${esc(st.q)}" data-input="ct_helpQ" autocomplete="off"></label>
        <div class="ct-pop"><span class="small">Popular:</span>${TRY.map(t => `<button type="button" data-act="ct_helpTry" data-q="${t}">${t}</button>`).join('')}</div>
      </div>
    </section>
    <section class="wrap ct-sec">
      <div class="ct-tiles" id="ctHelpTiles" aria-label="Browse by topic" data-note="Topic tiles filter the questions below in place, colour-coded like the rest of the site, rather than sending people to separate pages.">
        ${CATS.map(([k, l, icn, tone]) => `<button type="button" class="ct-tile ct-t-${tone}" data-act="ct_helpCat" data-c="${k}" aria-pressed="${st.cat === k}"><span class="ct-ico">${ic(icn)}</span><b>${esc(l)}</b><span>${N.plural(QA.filter(x => x[0] === k).length, 'question')}</span></button>`).join('')}
      </div>
      <div class="ct-resbar"><span class="ct-count" id="ctHelpCount" aria-live="polite">${esc(helpCount())}</span><button type="button" class="btn btn-ghost btn-sm" data-act="ct_helpClear">${ic('refresh', 'ic-sm')}Show all</button></div>
      <div id="ctHelpRes">${helpResults()}</div>
    </section>
    <section class="wrap sec-s">
      <div class="sec-head split"><div><p class="eyebrow">Guides</p><h2 class="d-s">Go deeper with the NICHE guide</h2></div><button type="button" class="btn btn-line btn-sm" data-go="site/blog">All guides ${ic('arrow-right', 'ic-sm')}</button></div>
      <div class="ct-guides">${db.blog.slice(0, 4).map(p => `<button type="button" class="ct-guide ct-t-${p.tone}" data-go="site/blog/${p.slug}"><span class="eyebrow">${esc(p.cat)}</span><b>${esc(p.title)}</b><span class="small">${p.mins} min read ${ic('arrow-right', 'ic-sm')}</span></button>`).join('')}</div>
    </section>
    <section class="wrap ct-sec" id="ctContact">
      <div class="ct-contact">
        <div class="blk blk-lilac stack" style="--g:14px">
          <p class="eyebrow">Contact support</p>
          <h2 class="d-m">Still stuck? Talk to a <em>person</em>.</h2>
          <p>Our support team is based in the UK and answers every message.</p>
          <ul class="ct-hours">
            <li>${ic('clock')}<span><b>Monday to Friday</b>9:00 to 17:30, excluding bank holidays</span></li>
            <li>${ic('mail')}<span><b>info@nicheconnect.co</b>We reply within one working day</span></li>
            <li>${ic('phone')}<span><b>07831 635145</b>For urgent event-day issues</span></li>
          </ul>
          <div class="btn-row"><button type="button" class="btn btn-violet btn-sm" data-act="ct_copy" data-url="info@nicheconnect.co">${ic('copy')}Copy email address</button></div>
        </div>
        <div class="card" id="ctContactBox">${st.sent ? sentView(st.sent) : contactForm()}</div>
      </div>
    </section>`;
  },
});
Object.assign(N.act, {
  ct_helpCat(el) { const st = hst(); st.cat = st.cat === el.dataset.c ? 'all' : el.dataset.c; paintHelp(); },
  ct_helpTry(el) { hst().q = el.dataset.q; const i = document.getElementById('ctHelpQ'); if (i) i.value = el.dataset.q; paintHelp(); },
  ct_helpClear() { Object.assign(hst(), { q: '', cat: 'all' }); const i = document.getElementById('ctHelpQ'); if (i) i.value = ''; paintHelp(); },
  ct_contactAgain() { hst().sent = null; const b = document.getElementById('ctContactBox'); if (b) { b.innerHTML = contactForm(); b.querySelector('input')?.focus(); } },
});
N.input.ct_helpQ = el => { hst().q = el.value; paintHelp(); };
N.forms.ct_contact = (form, d) => {
  const st = hst();
  st.sent = { name: (d.ctCName || '').trim() || 'there', email: (d.ctCEmail || '').trim(), topic: d.ctCTopic || 'your question' };
  const b = document.getElementById('ctContactBox'); if (b) b.innerHTML = sentView(st.sent);
  N.toast('Message received. Prototype: nothing was sent.', { icon: 'send' });
};
})();

/* =====================================================================
   LEGAL · site/privacy and site/terms
   Plain-English prototype summaries; section numbers follow the live site.
   ===================================================================== */
(() => {
'use strict';
const { esc, ic } = N;
const CT = N.ct, S = CT.S;

const s = (id, n, h, p, sub) => ({ id, n, h, p, sub });
const PRIVACY = [
  s('intro', '', 'Introduction', ['This policy explains how NICHE Platforms Ltd (“NICHE”, “we”, “us”) collects and uses personal data when you use nicheconnect.co and the NICHE platform. It applies to food traders, event organisers and anyone visiting the site.', 'We have written it in plain English. If anything is unclear, contact us and we will explain.']),
  s('p1', '1', 'Who we are and how to contact us', ['NICHE Platforms Ltd is a company registered in England and Wales. We are the controller of your personal data under UK GDPR and the Data Protection Act 2018.', 'You can contact us about anything in this policy at info@nicheconnect.co or on 07831 635145. We are registered with the Information Commissioner’s Office (ICO) as a data controller.']),
  s('p2', '2', 'What personal data we collect', ['We only collect what we need to run the platform and keep events safe.'], [
    s('p2-1', '2.1', 'Data provided directly by you', ['Account details such as your name, email address, phone number and password. Business details including trading name, company number, address, cuisine, trading units and speciality tags.', 'Compliance documents you upload, such as insurance certificates, hygiene ratings and gas safety certificates, and any messages you send through the platform.']),
    s('p2-2', '2.2', 'Data collected automatically', ['When you use the platform we record technical information such as your IP address, browser type, device, the pages you view and when you visit.', 'We also keep a log of key actions, such as applications submitted and documents approved, so we can show an accurate history and investigate problems.']),
    s('p2-3', '2.3', 'Data from third parties', ['We may check the information you give us against public sources, such as the Food Standards Agency hygiene rating register and Companies House.', 'If you pay for a plan, our payment provider tells us whether the payment succeeded. We never see your full card number.']),
  ]),
  s('p3', '3', 'How we use your personal data', ['We only use personal data where UK GDPR gives us a lawful basis. The bases we rely on are set out below.'], [
    s('p3-1', '3.1', 'Performance of a contract', ['We use your data to create and run your account, build your Food Trader Passport or organiser profile, process applications and invitations, and take payment for subscriptions. Without it we cannot provide the service you signed up for.']),
    s('p3-2', '3.2', 'Legitimate interests (Article 6(1)(f) UK GDPR)', ['We verify documents, prevent fraud, keep the platform secure and improve our features using aggregated usage data. We also send service messages such as expiry reminders.', 'We balance these interests against your rights, and you can object at any time.']),
    s('p3-3', '3.3', 'Legal obligations (Article 6(1)(c))', ['We keep financial records for tax purposes and respond to lawful requests from regulators, courts and law enforcement.']),
    s('p3-4', '3.4', 'Consent (Article 6(1)(a))', ['We ask for your consent before sending marketing emails and before setting non-essential cookies. You can withdraw consent at any time from your account settings or the cookie banner; this does not affect anything we did before.']),
  ]),
  s('p4', '4', 'How we share your data', ['We never sell your personal data.'], [
    s('p4-1', '4.1', 'With other users', ['Organisers see your passport, documents and contact details only when you apply to their event or accept their invitation.', 'Your public profile (business name, city, cuisine, bio, hygiene rating and ratings) is visible to anyone if you choose to list it in the trader directory.']),
    s('p4-2', '4.2', 'With service providers', ['We use trusted providers for hosting, file storage, email delivery, payments and customer support. They process data only on our instructions, under written contracts that require them to keep it secure.']),
    s('p4-3', '4.3', 'For legal and safety reasons', ['We may share information with the police, local authorities or regulators where the law requires it, or where it is needed to protect someone’s safety, for example after a food safety incident at an event.']),
    s('p4-4', '4.4', 'Business transfers', ['If NICHE is sold, merged or restructured, your data may transfer to the new owner. They would have to keep using it in line with this policy, and we would tell you before anything changed.']),
  ]),
  s('p5', '5', 'Compliance document handling', ['Documents you upload are checked by trained members of the NICHE team, who confirm that names, dates and cover levels match your profile.', 'Documents are stored encrypted and are visible only to you, our verification team and organisers you apply to. When a document expires or you replace it, the old version is archived and removed from your passport.']),
  s('p6', '6', 'Data retention', ['We keep your account data for as long as your account is open. If you close your account, we delete or anonymise your profile and documents within 30 days.', 'Some records must be kept longer, such as financial records, which we keep for six years for tax purposes. Anonymised statistics may be kept because they no longer identify you.']),
  s('p7', '7', 'Your rights under UK GDPR', ['You have the right to access your data, correct it, have it deleted, restrict or object to how we use it, and receive a copy in a portable format. Where we rely on consent, you can withdraw it at any time.', 'To use any of these rights, email info@nicheconnect.co. We will reply within one month and, in most cases, will not charge a fee.']),
  s('p8', '8', 'Data security', ['Data is encrypted in transit and at rest. Access inside NICHE is limited by role, so staff only see what their job needs, and every time a document is opened it is logged.', 'We use multi-factor authentication for staff accounts and test our systems regularly. If a breach puts your rights at risk, we will tell you and the ICO as the law requires.']),
  s('p9', '9', 'Cookies and tracking technologies', ['We use a small number of cookies to keep the platform working and, with your consent, to understand how it is used.'], [
    s('p9-1', '9.1', 'What are cookies', ['Cookies are small text files stored on your device when you visit a website. They let the site remember things, such as whether you are logged in.']),
    s('p9-2', '9.2', 'Cookies we use', ['Strictly necessary cookies keep you signed in and protect forms from misuse; these cannot be switched off. Analytics cookies, which we only set with your consent, show us which pages are used so we can improve them. We do not use advertising cookies.']),
    s('p9-3', '9.3', 'Managing cookies', ['You can change your choices at any time from the cookie settings link in the footer. You can also block or delete cookies in your browser, although some parts of the platform may stop working.']),
  ]),
  s('p10', '10', 'International data transfers', ['We store data in the UK wherever we can. Where a provider processes data outside the UK, we make sure it is protected by UK adequacy regulations or the UK International Data Transfer Agreement, and we can give you details on request.']),
  s('p11', '11', 'Children’s privacy', ['NICHE is a business platform for adults. You must be 18 or over to create an account, and we do not knowingly collect data from children. If we learn that we have, we will delete it.']),
  s('p12', '12', 'Changes to this privacy policy', ['We may update this policy as the platform changes or the law develops. We will post the new version here with a new date and, if the changes are significant, email you before they take effect.']),
  s('p13', '13', 'Contact and complaints', ['If you have a question or complaint about how we use your data, email info@nicheconnect.co and we will try to resolve it.', 'You also have the right to complain to the Information Commissioner’s Office at ico.org.uk or on 0303 123 1113.']),
];

const TERMS = [
  s('intro', '', 'Introduction', ['These terms set out the rules for using NICHE. They form a legal agreement between you and NICHE Platforms Ltd, so please read them carefully.']),
  s('t1', '1', 'Introduction and acceptance of terms', ['By creating an account or using the platform, you agree to these terms and to our privacy policy. If you use NICHE on behalf of a business, you confirm you have authority to bind that business.', 'If you do not agree, do not use the platform.']),
  s('t2', '2', 'Definitions', ['“Platform” means the NICHE website, apps and related services. “Trader” means a food business using NICHE to find and apply to events. “Organiser” means a person or business using NICHE to list events and book traders.', '“Passport” means a trader’s profile, documents and compliance record. “Booking” means a trader’s place at an event, confirmed by an organiser through the platform.']),
  s('t3', '3', 'Eligibility and account registration', [], [
    s('t3-1', '3.1', 'Eligibility', ['You must be at least 18 and able to enter a binding contract. Traders must run a food business that is registered, or being registered, with a UK local authority.']),
    s('t3-2', '3.2', 'Account creation', ['You must give accurate information and keep it up to date. Keep your password safe: you are responsible for activity on your account. Tell us straight away if you think someone else has used it.']),
    s('t3-3', '3.3', 'Trader accounts', ['Traders must upload genuine, current compliance documents and replace them before they expire. We may pause your passport or applications if a required document is missing, expired or cannot be verified.']),
    s('t3-4', '3.4', 'Organiser accounts', ['Organisers must be verified by the NICHE team before publishing events. Event listings must be accurate, including fees, pitch sizes, power supply and the documents you require.']),
  ]),
  s('t4', '4', 'The platform and services', [], [
    s('t4-1', '4.1', 'Nature of the platform', ['NICHE is a marketplace that connects traders and organisers. We are not a party to the agreement between a trader and an organiser for an event, and we do not run events ourselves.']),
    s('t4-2', '4.2', 'No guarantee of matching or selection', ['We do not guarantee that a trader will be accepted to any event, or that an organiser will fill every pitch. Organisers make their own selection decisions.']),
    s('t4-3', '4.3', 'Compliance information', ['We check documents against the information shown on them and against public sources where available. Verification reduces risk but is not a guarantee: organisers remain responsible for their own event safety checks, and traders for their own legal compliance.']),
    s('t4-4', '4.4', 'Service modifications', ['We may add, change or remove features to improve the platform. If a change significantly reduces a paid service, we will tell you in advance and you may cancel.']),
  ]),
  s('t5', '5', 'Subscriptions, fees and payment', [], [
    s('t5-1', '5.1', 'Subscription plans', ['Traders can use the free Lite plan, or Growth and Pro, which are free for three months and then charged monthly. NICHE Advance is a managed service with its own monthly fee. Organisers use the Event Pass. Current prices are on our pricing pages.']),
    s('t5-2', '5.2', 'Fees', ['Plan fees are charged monthly in advance, in pounds sterling. Extra applications on NICHE Advance cost £12 each.']),
    s('t5-3', '5.3', 'Payment', ['Payments are taken by our payment provider using the method you choose. If a payment fails, we will try again and may pause paid features until it succeeds.']),
    s('t5-4', '5.4', 'Refunds', ['You can cancel at any time and your plan runs to the end of the period you have paid for. We do not refund part-months, except where the law requires it or where we have made a significant error.']),
    s('t5-5', '5.5', 'Commission', ['Organisers pay no commission in their first year. From year two, an 8% commission applies to bookings confirmed through the platform.', 'NICHE Advance traders pay 15% commission on bookings we secure for them off-platform.']),
  ]),
  s('t6', '6', 'Acceptable use', ['Do not upload false or altered documents, impersonate another business, harass other users, scrape the platform, or move a booking found on NICHE off the platform to avoid fees.', 'We may remove content or suspend accounts that break these rules.']),
  s('t7', '7', 'Intellectual property', [], [
    s('t7-1', '7.1', 'NICHE’s rights', ['The platform, our brand, the Food Trader Passport design and our software belong to NICHE Platforms Ltd. You may not copy or reuse them without our written permission.']),
    s('t7-2', '7.2', 'User content', ['You keep ownership of the content and documents you upload. You give us a licence to store, display and share them as needed to run the platform, for example showing your profile in the directory or sending your passport to an organiser you apply to.']),
    s('t7-3', '7.3', 'Feedback', ['If you send us ideas or suggestions, we may use them to improve NICHE without owing you anything.']),
  ]),
  s('t8', '8', 'Data protection and privacy', ['We handle personal data in line with UK GDPR and our privacy policy. Organisers who receive a trader’s personal data through NICHE become responsible for using it lawfully, and only for the event concerned.']),
  s('t9', '9', 'Third-party services', ['The platform links to services we do not control, such as payment providers, organisers’ own websites for external events and public databases. Their own terms apply and we are not responsible for them.']),
  s('t10', '10', 'Disclaimers', ['We provide the platform “as is”. We work hard to keep it available and accurate, but cannot promise it will always be uninterrupted or error-free.', 'Nothing in these terms affects your statutory rights.']),
  s('t11', '11', 'Limitation of liability', ['We are not liable for losses arising from events themselves, such as cancellations, weather, poor trading or disputes between traders and organisers. Our total liability to you in any 12-month period is limited to the fees you paid us in that period.', 'We do not exclude liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to exclude.']),
  s('t12', '12', 'Indemnification', ['You agree to cover losses and reasonable costs we incur because you broke these terms, uploaded false documents or broke the law while using the platform.']),
  s('t13', '13', 'Termination', [], [
    s('t13-1', '13.1', 'By user', ['You can close your account at any time from Settings or by emailing info@nicheconnect.co. Paid plans stop renewing at the end of the current period.']),
    s('t13-2', '13.2', 'By NICHE', ['We may suspend or close an account that breaks these terms, provides false documents or has not paid fees due. Where possible, we will give notice and a chance to fix the problem first.']),
    s('t13-3', '13.3', 'Effect of termination', ['When an account closes, your profile is removed from the directory and organisers can no longer view your passport. Fees already due remain payable, and some records are kept as described in our privacy policy.']),
  ]),
  s('t14', '14', 'Governing law and dispute resolution', ['These terms are governed by the law of England and Wales. If there is a dispute, please contact us first so we can try to resolve it.', 'If we cannot, the courts of England and Wales have jurisdiction, although consumers may also bring claims in the part of the UK where they live.']),
  s('t15', '15', 'General', [], [
    s('t15-1', '15.1', 'Entire agreement', ['These terms, our privacy policy and any plan-specific terms are the whole agreement between you and NICHE.']),
    s('t15-2', '15.2', 'Amendments', ['We may update these terms. We will give at least 30 days’ notice of significant changes by email or in the platform; continuing to use NICHE after that means you accept them.']),
    s('t15-3', '15.3', 'Severability', ['If a court finds any part of these terms unenforceable, the rest stays in force.']),
    s('t15-4', '15.4', 'Waiver', ['If we do not enforce a right straight away, we can still enforce it later.']),
    s('t15-5', '15.5', 'Assignment', ['You may not transfer your account or these terms without our consent. We may transfer them to a company that takes over our business, and will tell you if we do.']),
  ]),
];

const DOCS = {
  privacy: { title: 'Privacy <em>policy</em>', plain: 'Privacy policy', lead: 'How NICHE collects, uses and protects personal data for traders, organisers and visitors.', updated: '1 June 2026', secs: PRIVACY, other: ['site/terms', 'Terms of service'] },
  terms: { title: 'Terms of <em>service</em>', plain: 'Terms of service', lead: 'The rules for using NICHE, including accounts, fees, commission and what happens if things go wrong.', updated: '1 June 2026', secs: TERMS, other: ['site/privacy', 'Privacy policy'] },
};
const label = x => x.n ? (x.n.includes('.') ? `${x.n} ${x.h}` : `${x.n}. ${x.h}`) : x.h;
const text = x => [x.h, ...(x.p || []), ...(x.sub || []).flatMap(y => [y.h, ...y.p])];
const lst = kind => S('ct_legal_' + kind, { q: '' });
const matches = (kind, x) => CT.has(lst(kind).q, ...text(x));
const body = kind => {
  const D = DOCS[kind], q = lst(kind).q.trim(), secs = D.secs.filter(x => matches(kind, x));
  if (!secs.length) return N.empty('No sections match', `Nothing in the ${esc(D.plain.toLowerCase())} mentions “${esc(q)}”. Try a shorter word.`, `<button type="button" class="btn btn-line btn-sm" data-act="ct_legalClear" data-kind="${kind}">Clear search</button>`, 'search');
  return secs.map(x => `<section class="ct-lsec" id="${kind}-${x.id}" data-spy>
    <h2>${CT.hl(label(x), q)}</h2>
    ${(x.p || []).map(t => `<p>${CT.hl(t, q)}</p>`).join('')}
    ${(x.sub || []).map(y => `<div class="ct-lsub" id="${kind}-${y.id}" data-spy><h3>${CT.hl(label(y), q)}</h3>${y.p.map(t => `<p>${CT.hl(t, q)}</p>`).join('')}</div>`).join('')}
  </section>`).join('');
};
const toc = kind => DOCS[kind].secs.map(x => { const on = matches(kind, x); return `<button type="button" data-act="ct_toc" data-id="${kind}-${x.id}" data-toc="${kind}-${x.id}" ${on ? '' : 'disabled'}>${esc(label(x))}</button>${(x.sub || []).map(y => `<button type="button" class="sub" data-act="ct_toc" data-id="${kind}-${y.id}" data-toc="${kind}-${y.id}" ${on ? '' : 'disabled'}>${esc(label(y))}</button>`).join('')}`; }).join('');
const count = kind => { const D = DOCS[kind], q = lst(kind).q.trim(), n = D.secs.filter(x => matches(kind, x)).length; return q ? `${n} of ${D.secs.length} sections mention “${q}”` : `${D.secs.length} sections`; };
const paint = kind => {
  const doc = document.getElementById('ctLDoc'); if (!doc) return;
  doc.innerHTML = body(kind);
  const t = document.getElementById('ctLToc'); if (t) t.innerHTML = toc(kind);
  const c = document.getElementById('ctLCount'); if (c) c.textContent = count(kind);
  CT.spy(); CT.notes();
};

const legalPage = kind => {
  const D = DOCS[kind], st = lst(kind);
  return `<section class="wrap ct-page">
    <div class="ct-lhead">
      <div class="stack" style="--g:14px"><p class="eyebrow">Legal</p><h1 class="d-l">${D.title}</h1><p class="lead">${D.lead}</p><p class="mono muted">Last updated ${D.updated}</p></div>
      <div class="banner warn">${ic('alert')}<div class="grow"><b>Prototype: plain-English summaries.</b> Replace with your solicitor-approved wording.</div></div>
    </div>
  </section>
  <section class="wrap ct-sec">
    <div class="ct-legal">
      <aside class="ct-ltoc-wrap">
        <div class="ct-ltoc" data-ct-spy data-note="Sticky contents with scroll-spy: the section you are reading stays highlighted, and every numbered section from the live policy is one click away.">
          <p class="eyebrow">Contents</p>
          <nav id="ctLToc" aria-label="Contents">${toc(kind)}</nav>
        </div>
        <button type="button" class="btn btn-line btn-sm ct-lother" data-go="${D.other[0]}">Read the ${D.other[1].toLowerCase()} ${ic('arrow-right', 'ic-sm')}</button>
      </aside>
      <div class="stack" style="--g:8px;min-width:0">
        <div class="ct-lsearch" data-note="Keyword search filters the document to matching sections and highlights every hit, so “refund” or “cookies” takes one step instead of a long scroll.">
          <label class="search">${ic('search')}<span class="sr">Search this document</span><input type="search" placeholder="Search document keywords..." value="${esc(st.q)}" data-input="ct_legalQ" data-kind="${kind}" autocomplete="off"></label>
          <span class="ct-count" id="ctLCount" aria-live="polite">${esc(count(kind))}</span>
        </div>
        <div class="ct-toc-m"><label class="field"><span>Jump to a section</span><select class="sel" data-change="ct_tocSel" data-ct-spysel>${D.secs.map(x => `<option value="${kind}-${x.id}">${esc(label(x))}</option>${(x.sub || []).map(y => `<option value="${kind}-${y.id}">&nbsp;&nbsp;${esc(label(y))}</option>`).join('')}`).join('')}</select></label></div>
        <article class="ct-ldoc ct-hl" id="ctLDoc">${body(kind)}</article>
      </div>
    </div>
  </section>`;
};

N.page('site/privacy', { app: 'site', title: 'Privacy policy', render: () => legalPage('privacy'), after() { CT.spy(); } });
N.page('site/terms', { app: 'site', title: 'Terms of service', render: () => legalPage('terms'), after() { CT.spy(); } });
N.input.ct_legalQ = el => { lst(el.dataset.kind).q = el.value; paint(el.dataset.kind); };
N.act.ct_legalClear = el => { const k = el.dataset.kind; lst(k).q = ''; const i = document.querySelector(`[data-input="ct_legalQ"][data-kind="${k}"]`); if (i) i.value = ''; paint(k); };
})();

/* =====================================================================
   AUTH · site/login, site/register, site/forgot-password,
   site/reset-password, site/complete-profile (all bare split screens)
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const CT = N.ct, S = CT.S;

/* ---------- right-hand panels ---------- */
const quotePanel = () => `<div class="ct-panel" data-note="The brand panel carries the arch and awning art plus a clearly labelled sample quote, instead of a stock photo.">
  ${N.art('panel', 'Find your fit', 'Niche', 'ct-panel-art')}
  <span class="ct-float f1"><span class="dot ok"></span>Gas Safety · valid to 21 Oct 2026</span>
  <span class="ct-float f2">${N.checked()}</span>
  <figure class="ct-quote">
    <span class="chip plain">Sample quote</span>
    <blockquote>“Managing our street food business has never been this simple.”</blockquote>
    <figcaption class="row" style="--g:10px">${N.av('ST', 'mint')}<span class="stack" style="--g:0"><b>Sample trader</b><span class="small muted">London</span></span></figcaption>
  </figure>
</div>`;
const rolePanel = role => {
  if (role === 'trader') return `<div class="ct-panel mint"><div class="stack" style="--g:10px" data-note="The right-hand panel follows the chosen role: a sample passport for traders, pre-checked applicants for organisers."><p class="eyebrow">For traders</p><h2 class="d-m">One passport. <em>Every</em> event.</h2><p>Upload once and apply to any event in minutes. Organisers see your checked documents straight away.</p></div>${N.passportCard('ag', { max: 4, sid: 'reg' })}</div>`;
  if (role === 'organiser') return `<div class="ct-panel lilac"><div class="stack" style="--g:10px" data-note="The right-hand panel follows the chosen role: a sample passport for traders, pre-checked applicants for organisers."><p class="eyebrow">For organisers</p><h2 class="d-m">Applicants arrive <em>pre-checked</em>.</h2><p>Every requirement is compared with your event day before you open an application.</p></div>
    <div class="ct-applist">${[['mw', 'All met', 'ok'], ['gs', 'All met', 'ok'], ['tl', '£2m cover, needs £5m', 'risk']].map(([t, s, c]) => `<div class="ct-app">${N.tav(t)}<span class="stack" style="--g:0;min-width:0"><b>${esc(db.traders[t].biz)}</b><span class="small muted">${esc(db.traders[t].food)}</span></span>${N.chip(c, s)}</div>`).join('')}</div></div>`;
  return quotePanel();
};

/* ---------- login ---------- */
const DEMOS = [
  ['trader/dashboard', 'Login as trader', 'Alice Green', 'Browse events, apply, answer invitations, manage units & documents', 'mint', N.av('AG', 'hedge', 'lg')],
  ['org/dashboard', 'Login as organiser', 'Reed Events', 'Create events, review applications, invite & rate traders', 'lilac', N.av('RE', 'violet', 'lg')],
  ['admin/dashboard', 'Login as admin', 'Niche team', 'Approve traders & organisers, verify documents, manage listings', 'butter', N.av('N', 'peach', 'lg')],
];
N.page('site/login', {
  app: 'site', bare: true, title: 'Log in',
  render() {
    return `<div class="ct-split">
      <div class="ct-split-l">
        ${CT.authTop()}
        <div class="ct-auth-body">
          <div class="stack" style="--g:12px"><p class="eyebrow">Log in</p><h1 class="d-l">Explore the <em>demo</em>.</h1><p class="lead">No sign-up needed. Pick a profile and jump straight in. Everything you do shows up for the other profiles.</p></div>
          <div class="ct-demos" data-note="Demo profiles are one tap and say what each role can do. The real email log-in stays below so the production pattern can still be reviewed.">${DEMOS.map(([p, eb, n, d, tone, av]) => `<button type="button" class="ct-demo ct-t-${tone}" data-act="ct_demo" data-path="${p}" data-who="${esc(n)}">${av}<span class="stack" style="--g:3px;min-width:0"><span class="eyebrow">${eb}</span><b>${n}</b><span class="s">${d}</span></span><span class="go">${ic('arrow-right')}</span></button>`).join('')}</div>
          <div class="ct-or"><span>or log in to your account</span></div>
          <form data-form="ct_login" class="stack" style="--g:14px">
            ${N.field({ label: 'Email', id: 'ctLEmail', type: 'email', req: true, ph: 'you@business.co.uk', attrs: 'autocomplete="email"' })}
            ${CT.pw('ctLPw', 'Password')}
            <div class="row between">${N.checkbox('ctLKeep', 'Keep me logged in', true)}<button type="button" class="link" data-go="site/forgot-password">Forgot password?</button></div>
            <div id="ctLoginMsg" aria-live="polite"></div>
            <button type="submit" class="btn btn-ink btn-lg btn-block">Log in</button>
            <p class="small muted ct-center-t">New to Niche? <button type="button" class="link" data-go="site/register">Create an account</button></p>
          </form>
        </div>
      </div>
      <div class="ct-split-r">${quotePanel()}</div>
    </div>`;
  },
});
N.act.ct_demo = el => { N.go(el.dataset.path); N.toast(`Logged in as ${esc(el.dataset.who)}. This is demo data.`, { icon: 'log-in' }); };
N.forms.ct_login = () => {
  const m = document.getElementById('ctLoginMsg');
  if (m) m.innerHTML = `<div class="banner info">${ic('info')}<div class="grow small"><b>In this prototype, use a demo profile above.</b> Real accounts aren’t connected, so nothing was checked or sent.</div><button type="button" class="btn btn-ink btn-xs" data-act="ct_demo" data-path="trader/dashboard" data-who="Alice Green">Try Alice</button></div>`;
};

/* ---------- register ---------- */
const rst = () => S('ct_reg', { step: 0, role: null, name: '', email: '', phone: '', sentAt: 0 });
const regRole = st => `<div class="stack" style="--g:10px"><p class="eyebrow">Step 1 of 3</p><h1 class="d-m">How will you use <em>Niche</em>?</h1><p class="ink-2">Pick one. You can add the other side later from your settings.</p></div>
  <div class="ct-roles" role="radiogroup" aria-label="Account type" data-note="Role comes first as two big arch cards, so the rest of sign-up can be tailored to traders or organisers.">
    ${[['trader', 'Trader', 'I sell food at events', 'truck', 'mint', 'Build one passport and apply to events in minutes.'], ['organiser', 'Organiser', 'I run events', 'calendar', 'lilac', 'Get pre-checked applicants and fill pitches faster.']].map(([v, l, h, icn, tone, d]) => `<button type="button" class="ct-role ct-t-${tone}" role="radio" aria-checked="${st.role === v}" data-act="ct_regRole" data-v="${v}"><span class="ct-role-tick">${ic('check', 'ic-sm')}</span><span class="ct-role-ic">${ic(icn, 'ic-xl')}</span><span class="eyebrow">${l}</span><b>${h}</b><span class="small">${d}</span></button>`).join('')}
  </div>
  <button type="button" class="btn btn-ink btn-lg" data-act="ct_regNext" ${st.role ? '' : 'disabled'}>Continue ${ic('arrow-right')}</button>`;
const regDetails = st => `<div class="stack" style="--g:10px"><p class="eyebrow">Step 2 of 3 · ${st.role === 'organiser' ? 'Organiser' : 'Trader'} account</p><h1 class="d-m">Your account <em>details</em></h1><p class="ink-2">We use these to sign you in and send event updates.</p></div>
  <form data-form="ct_reg" class="stack" style="--g:16px" data-note="Password strength shows as you type, and the Terms and Privacy links open the real pages without losing what you have typed.">
    <div class="form-grid">
      ${N.field({ label: 'Full name', id: 'ctRName', req: true, value: st.name, full: true, attrs: 'autocomplete="name" data-input="ct_regKeep" data-k="name"' })}
      ${N.field({ label: 'Email', id: 'ctREmail', type: 'email', req: true, value: st.email, ph: 'you@business.co.uk', attrs: 'autocomplete="email" data-input="ct_regKeep" data-k="email"' })}
      ${N.field({ label: 'Phone', id: 'ctRPhone', type: 'tel', value: st.phone, ph: '07700 900000', hint: 'for event-day updates', attrs: 'autocomplete="tel" data-input="ct_regKeep" data-k="phone"' })}
      <div class="full">${CT.pw('ctRPw', 'Password', { auto: 'new-password', meter: 'ctRMeter' })}</div>
    </div>
    ${N.checkbox('ctRTerms', `I agree to the <button type="button" class="link" data-go="site/terms">Terms of Service</button> and <button type="button" class="link" data-go="site/privacy">Privacy Policy</button>`, false, 'required')}
    <div id="ctRErr" aria-live="polite"></div>
    <div class="row between"><button type="button" class="btn btn-ghost" data-act="ct_regBack">${ic('arrow-left')}Back</button><button type="submit" class="btn btn-ink btn-lg">Create account</button></div>
  </form>`;
const regVerify = st => `<div class="stack" style="--g:10px"><p class="eyebrow">Step 3 of 3</p><h1 class="d-m">Check your <em>inbox</em></h1><p class="ink-2">We sent a 6-digit code to <b>${esc(st.email)}</b>. It works for 10 minutes.</p></div>
  <form data-form="ct_otp" class="stack" style="--g:18px">
    <fieldset class="ct-fs"><legend class="lbl">Verification code</legend><div class="ct-otp" data-note="Six separate arch-shaped boxes that auto-advance, accept a pasted code and step back on Backspace.">${[0, 1, 2, 3, 4, 5].map(i => `<input type="text" inputmode="numeric" maxlength="6" autocomplete="${i === 0 ? 'one-time-code' : 'off'}" aria-label="Digit ${i + 1} of 6" data-input="ct_otp">`).join('')}</div></fieldset>
    <div class="banner info">${ic('info')}<div class="grow small">Prototype: nothing was sent. Any 6 digits will work.</div></div>
    <div class="row between"><button type="button" class="btn btn-ghost btn-sm" id="ctResend" data-act="ct_resend">Resend code</button><button type="submit" class="btn btn-ink btn-lg" id="ctOtpGo" disabled>Verify email</button></div>
    <button type="button" class="link small" data-act="ct_regBack">Wrong email? Go back and change it</button>
  </form>`;

N.page('site/register', {
  app: 'site', bare: true, title: 'Create an account',
  render() {
    const st = rst();
    return `<div class="ct-split">
      <div class="ct-split-l">
        ${CT.authTop()}
        <div class="ct-auth-body">
          ${N.stepper(['Choose your role', 'Account details', 'Verify email'], st.step)}
          ${[regRole, regDetails, regVerify][st.step](st)}
          <p class="small muted">Already have an account? <button type="button" class="link" data-go="site/login">Log in</button></p>
        </div>
      </div>
      <div class="ct-split-r">${rolePanel(st.role)}</div>
    </div>`;
  },
  after(root) {
    const st = rst();
    if (st.step === 2) { CT.countdown('ctResend', st.sentAt + 30000, 'Resend code'); root.querySelector('.ct-otp input')?.focus(); }
    if (st.step === 1 && !st.name) root.querySelector('#ctRName')?.focus();
  },
});
Object.assign(N.act, {
  ct_regRole(el) { rst().role = el.dataset.v; N.refresh(); },
  ct_regNext() { const st = rst(); if (!st.role) return; st.step = 1; N.refresh(); },
  ct_regBack() { const st = rst(); st.step = Math.max(0, st.step - 1); N.refresh(); },
  ct_resend() { rst().sentAt = Date.now(); CT.countdown('ctResend', rst().sentAt + 30000, 'Resend code'); N.toast('New code on its way. Prototype: nothing was sent.', { icon: 'mail' }); },
});
N.input.ct_regKeep = el => { rst()[el.dataset.k] = el.value; };
N.forms.ct_reg = (form, d) => {
  const st = rst(), err = form.querySelector('#ctRErr');
  if (!d.ctRTerms) { err.innerHTML = `<div class="banner risk">${ic('alert')}<div class="grow small">Please agree to the Terms of Service and Privacy Policy to continue.</div></div>`; return; }
  if (CT.pwScore(d.ctRPw || '') < 2) { err.innerHTML = `<div class="banner risk">${ic('alert')}<div class="grow small">Choose a stronger password: at least 8 characters, mixing letters with numbers or symbols.</div></div>`; form.querySelector('#ctRPw')?.focus(); return; }
  Object.assign(st, { name: d.ctRName.trim(), email: d.ctREmail.trim(), phone: (d.ctRPhone || '').trim(), step: 2, sentAt: Date.now() });
  N.refresh();
  N.toast('Code sent. Prototype: nothing was sent, enter any 6 digits.', { icon: 'mail' });
};

/* 6-digit code: auto-advance, paste, backspace */
const otpInputs = el => [...el.closest('.ct-otp').querySelectorAll('input')];
const otpSync = all => {
  const full = all.every(i => /^\d$/.test(i.value));
  all.forEach(i => i.classList.toggle('on', !!i.value));
  const b = document.getElementById('ctOtpGo'); if (b) b.disabled = !full;
  if (full) setTimeout(() => { const f = all[0].closest('form'); if (f && document.contains(f)) f.requestSubmit(); }, 250);
};
const otpFill = (all, from, digits) => { digits.split('').forEach((c, k) => { if (all[from + k]) all[from + k].value = c; }); all[Math.min(from + digits.length, all.length - 1)].focus(); };
N.input.ct_otp = el => {
  const all = otpInputs(el), i = all.indexOf(el), v = el.value.replace(/\D/g, '');
  if (v.length > 1) otpFill(all, i, v.slice(0, all.length - i));
  else { el.value = v; if (v && all[i + 1]) all[i + 1].focus(); }
  otpSync(all);
};
document.addEventListener('keydown', e => {
  const el = e.target && e.target.closest && e.target.closest('.ct-otp input'); if (!el) return;
  const all = otpInputs(el), i = all.indexOf(el);
  if (e.key === 'Backspace' && !el.value && i > 0) { e.preventDefault(); all[i - 1].value = ''; all[i - 1].focus(); otpSync(all); }
  else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); all[i - 1].focus(); }
  else if (e.key === 'ArrowRight' && i < all.length - 1) { e.preventDefault(); all[i + 1].focus(); }
});
document.addEventListener('paste', e => {
  const el = e.target && e.target.closest && e.target.closest('.ct-otp input'); if (!el) return;
  const d = ((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, '').slice(0, 6); if (!d) return;
  e.preventDefault(); const all = otpInputs(el); otpFill(all, 0, d); otpSync(all);
});
N.forms.ct_otp = form => {
  const code = [...form.querySelectorAll('.ct-otp input')].map(i => i.value).join('');
  if (!/^\d{6}$/.test(code)) return;
  const st = rst();
  Object.assign(S('ct_cp', { role: 'trader', v: {} }), { role: st.role === 'organiser' ? 'organiser' : 'trader', name: st.name });
  N.state.ct_reg = null;
  N.go('site/complete-profile');
  N.toast('Email verified. Welcome to Niche.');
};

/* ---------- forgot password ---------- */
const fst = () => S('ct_fp', { sent: false, email: '', at: 0 });
N.page('site/forgot-password', {
  app: 'site', bare: true, title: 'Forgot password',
  render() {
    const st = fst();
    return `<div class="ct-center">
      ${CT.authTop('site/login', 'Back to log in')}
      <div class="ct-center-card" data-note="A single focused card with one field, then a clear “check your inbox” state with resend and a way to fix a typo.">
        ${st.sent ? `<span class="ct-center-ic ct-t-mint" data-note="The arch icon changes with the state (key, then envelope) so the step change is obvious at a glance.">${ic('mail', 'ic-xl')}</span>
          <div class="stack" style="--g:8px"><h1 class="d-m">Check your <em>inbox</em></h1><p class="ink-2">If an account exists for <b>${esc(st.email)}</b>, a reset link is on its way. It works for 60 minutes.</p></div>
          <div class="banner info">${ic('info')}<div class="grow small">Prototype: nothing was sent.</div></div>
          <button type="button" class="btn btn-ink btn-lg btn-block" data-go="site/reset-password">Open the reset page (demo) ${ic('arrow-right')}</button>
          <div class="row between"><button type="button" class="btn btn-ghost btn-sm" id="ctFpResend" data-act="ct_fpResend">Resend email</button><button type="button" class="btn btn-ghost btn-sm" data-act="ct_fpChange">Use a different email</button></div>
          <p class="xs muted">Not there after a few minutes? Check your spam or promotions folder. Emails come from info@nicheconnect.co.</p>`
        : `<span class="ct-center-ic ct-t-lilac" data-note="The arch icon changes with the state (key, then envelope) so the step change is obvious at a glance.">${ic('key', 'ic-xl')}</span>
          <div class="stack" style="--g:8px"><h1 class="d-m">Forgot your <em>password</em>?</h1><p class="ink-2">Enter the email you use for Niche and we’ll send you a link to set a new one.</p></div>
          <form data-form="ct_fp" class="stack" style="--g:14px">${N.field({ label: 'Email', id: 'ctFpEmail', type: 'email', req: true, value: st.email, ph: 'you@business.co.uk', attrs: 'autocomplete="email"' })}<button type="submit" class="btn btn-ink btn-lg btn-block">Send reset link</button></form>
          <p class="small muted">Remembered it? <button type="button" class="link" data-go="site/login">Log in</button></p>`}
      </div>
    </div>`;
  },
  after(root) { const st = fst(); if (st.sent) CT.countdown('ctFpResend', st.at + 30000, 'Resend email'); else root.querySelector('#ctFpEmail')?.focus(); },
});
N.forms.ct_fp = (form, d) => { Object.assign(fst(), { sent: true, email: d.ctFpEmail.trim(), at: Date.now() }); N.refresh(); };
Object.assign(N.act, {
  ct_fpResend() { fst().at = Date.now(); CT.countdown('ctFpResend', fst().at + 30000, 'Resend email'); N.toast('Sent again. Prototype: nothing was sent.', { icon: 'mail' }); },
  ct_fpChange() { fst().sent = false; N.refresh(); },
});

/* ---------- reset password ---------- */
N.page('site/reset-password', {
  app: 'site', bare: true, title: 'Reset password',
  render() {
    const st = S('ct_rp', { done: false });
    return `<div class="ct-center">
      ${CT.authTop('site/login', 'Back to log in')}
      <div class="ct-center-card" data-note="The success state confirms what happened (other devices signed out) and offers one next step: log in.">
        ${st.done ? `<span class="ct-center-ic ct-t-mint">${ic('check-circle', 'ic-xl')}</span>
          <div class="stack" style="--g:8px"><h1 class="d-m">Password <em>updated</em></h1><p class="ink-2">You can now log in with your new password. For safety, we’ve signed you out on other devices.</p></div>
          <div class="banner info">${ic('info')}<div class="grow small">Prototype: nothing was saved.</div></div>
          <button type="button" class="btn btn-ink btn-lg btn-block" data-act="ct_rpDone">Log in ${ic('arrow-right')}</button>`
        : `<span class="ct-center-ic ct-t-butter">${ic('lock', 'ic-xl')}</span>
          <div class="stack" style="--g:8px"><h1 class="d-m">Set a new <em>password</em></h1><p class="ink-2">Choose something you haven’t used on Niche before.</p></div>
          <form data-form="ct_rp" class="stack" style="--g:16px" data-note="A live strength meter and match check tell people what is wrong before they submit, not after.">
            ${CT.pw('ctPw1', 'New password', { auto: 'new-password', meter: 'ctRpMeter' })}
            ${CT.pw('ctPw2', 'Confirm new password', { auto: 'new-password', attrs: 'data-input="ct_pwMatch"' })}
            <p class="ct-match" id="ctMatch" aria-live="polite"></p>
            <div id="ctRpErr" aria-live="polite"></div>
            <button type="submit" class="btn btn-ink btn-lg btn-block">Update password</button>
          </form>`}
      </div>
    </div>`;
  },
  after(root) { root.querySelector('#ctPw1')?.focus(); },
});
N.forms.ct_rp = (form, d) => {
  const err = form.querySelector('#ctRpErr');
  const say = t => { err.innerHTML = `<div class="banner risk">${ic('alert')}<div class="grow small">${t}</div></div>`; };
  if (CT.pwScore(d.ctPw1 || '') < 2) { say('Choose a stronger password: at least 8 characters, mixing letters with numbers or symbols.'); form.querySelector('#ctPw1').focus(); return; }
  if (d.ctPw1 !== d.ctPw2) { say('The two passwords don’t match.'); form.querySelector('#ctPw2').focus(); return; }
  S('ct_rp').done = true; N.refresh();
};
N.act.ct_rpDone = () => { N.state.ct_rp = null; N.state.ct_fp = null; N.go('site/login'); };

/* ---------- complete profile ---------- */
const UNITS = [['truck', 'Food truck'], ['box', 'Trailer'], ['tent', 'Gazebo stall'], ['store', 'Cart or kiosk'], ['coffee', 'Horsebox']];
const REQ = {
  trader: [['ctCpTrading', 'Trading name'], ['ctCpCompany', 'Company name'], ['ctCpCity', 'City'], ['ctCpCuisine', 'Main cuisine'], ['ctCpUnit', 'First unit type']],
  organiser: [['ctCpOrg', 'Organisation name'], ['ctCpReg', 'Registration number'], ['ctCpOCity', 'City'], ['ctCpType', 'Typical event type']],
};
const cst = () => S('ct_cp', { role: 'trader', v: {} });
const cpDone = () => { const st = cst(); return REQ[st.role].map(([k, l]) => [k, l, !!String(st.v[k] ?? '').trim()]); };
const cpPaint = () => {
  const list = cpDone(), n = list.filter(x => x[2]).length, pct = Math.round(n / list.length * 100);
  const fill = document.getElementById('ctCpFill'); if (fill) fill.style.height = pct + '%';
  document.querySelectorAll('[data-ct-cppct]').forEach(e => { e.textContent = pct + '%'; });
  const mb = document.querySelector('.ct-cp-mob .bar i'); if (mb) mb.style.width = pct + '%';
  list.forEach(([k, , ok]) => document.querySelector(`[data-ct-ck="${k}"]`)?.classList.toggle('on', ok));
};
CT.seg.ct_cpRole = v => { cst().role = v; N.refresh(); };

N.page('site/complete-profile', {
  app: 'site', bare: true, title: 'Complete your profile',
  render() {
    const st = cst(), isT = st.role === 'trader', v = st.v, first = (st.name || '').trim().split(' ')[0];
    const f = (o) => N.field({ ...o, value: v[o.id] ?? o.value ?? '', req: true });
    const fields = isT ? `<div class="form-grid">
        ${f({ label: 'Trading name', id: 'ctCpTrading', ph: 'The name customers see', full: true })}
        ${f({ label: 'Company name', id: 'ctCpCompany', ph: 'e.g. Green Foods Ltd' })}
        ${f({ label: 'City', id: 'ctCpCity', ph: 'e.g. Manchester', attrs: 'autocomplete="address-level2"' })}
        ${f({ label: 'Main cuisine', id: 'ctCpCuisine', full: true, opts: [['', 'Choose a cuisine'], ...db.tags.cuisines] })}
      </div>
      <fieldset class="ct-fs"><legend class="lbl req">First unit type</legend><div class="radio-cards">${UNITS.map(([icn, l]) => `<label class="rcard"><input type="radio" name="ctCpUnit" value="${l}" ${v.ctCpUnit === l ? 'checked' : ''} required>${ic(icn)}<b>${l}</b></label>`).join('')}</div></fieldset>
      <div class="ct-gas">${N.toggle('ctCpGas', 'Do you cook with gas?', v.ctCpGas ?? true)}<span class="small muted">If yes, we’ll ask for a Gas Safety Certificate for each unit that uses LPG.</span></div>`
    : `<div class="form-grid">
        ${f({ label: 'Organisation name', id: 'ctCpOrg', ph: 'e.g. Reed Events', full: true })}
        ${f({ label: 'Registration number', id: 'ctCpReg', ph: 'e.g. 10000014', hint: 'Companies House number' })}
        ${f({ label: 'City', id: 'ctCpOCity', ph: 'e.g. London', attrs: 'autocomplete="address-level2"' })}
        ${f({ label: 'Typical event type', id: 'ctCpType', full: true, opts: [['', 'Choose an event type'], ...db.tags.eventTypes] })}
      </div>`;
    return `<div class="ct-split">
      <div class="ct-split-l">
        ${CT.authTop('site/home', 'Finish later')}
        <div class="ct-auth-body">
          <div class="stack" style="--g:12px">
            <p class="eyebrow">Complete your profile</p>
            <h1 class="d-m">${first ? `Nice to meet you, <em>${esc(first)}</em>.` : `Let’s set up your <em>profile</em>.`}</h1>
            <p class="ink-2">${isT ? 'A few details about your business. You’ll add documents next, from your dashboard.' : 'A few details about your organisation. Our team verifies it before your first event goes live.'}</p>
          </div>
          <div class="row between" data-note="One form adapts to trader or organiser without starting again, and a progress arch fills as each answer is given.">${N.seg('ct_cpRole', [['trader', 'Trader'], ['organiser', 'Organiser']], st.role)}<span class="ct-count">Takes about a minute</span></div>
          <div class="ct-cp-mob"><span class="small"><b data-ct-cppct>0%</b> complete</span>${N.bar(0, 'ok')}</div>
          <form data-form="ct_cp" data-input="ct_cp" data-change="ct_cp" class="stack" style="--g:18px">
            ${fields}
            <div class="row between"><button type="button" class="btn btn-ghost" data-act="ct_cpSkip">Skip for now</button><button type="submit" class="btn btn-ink btn-lg">${isT ? 'Finish and open dashboard' : 'Finish and add business info'} ${ic('arrow-right')}</button></div>
          </form>
        </div>
      </div>
      <div class="ct-split-r"><div class="ct-panel ct-cp-panel">
        <div class="stack" style="--g:8px"><p class="eyebrow">${isT ? 'Your trader profile' : 'Your organiser profile'}</p><span class="ct-parch-n" data-ct-cppct>0%</span></div>
        <div class="ct-parch" aria-hidden="true"><i id="ctCpFill"></i><span>${ic(isT ? 'truck' : 'calendar', 'ic-xl')}</span></div>
        <ul class="ct-cplist" data-note="The checklist ticks off each answer live, so people see exactly what is left before they finish.">${REQ[st.role].map(([k, l]) => `<li data-ct-ck="${k}"><span class="ct-ck">${ic('check', 'ic-sm')}</span>${l}</li>`).join('')}</ul>
        <p class="small ct-cp-next">${isT ? 'Next: upload your documents to reach the Checked seal at 90% readiness.' : 'Next: our team verifies your organisation, usually within one working day.'}</p>
      </div></div>
    </div>`;
  },
  after() { cpPaint(); },
});
const cpKeep = el => { if (!el.name) return; cst().v[el.name] = el.type === 'checkbox' ? el.checked : el.value; cpPaint(); };
N.input.ct_cp = cpKeep;
N.change.ct_cp = cpKeep;
N.act.ct_cpSkip = () => { const t = cst().role === 'trader'; N.go(t ? 'trader/dashboard' : 'org/dashboard'); N.toast('You can finish your profile any time from Profile Setup.', { icon: 'info' }); };
N.forms.ct_cp = () => {
  const t = cst().role === 'trader';
  N.go(t ? 'trader/dashboard' : 'org/business-info');
  N.toast(t ? 'Profile saved. Next, add your documents. Prototype: nothing was saved to a real account.' : 'Organisation saved. Add your business details next. Prototype: nothing was saved to a real account.');
};
})();
