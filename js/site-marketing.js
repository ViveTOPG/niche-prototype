/* =====================================================================
   NICHE prototype \u00b7 marketing pages
   How it works (trader + organiser), how verification works, trader and
   organiser pricing, NICHE Launch, the Food Trader Passport, About.
   Page state lives in N.state.mk_*; actions, forms and inputs are mk_*.
   ===================================================================== */
(() => {
'use strict';
const { esc, ic, db, $, $$ } = N;
const S = (k, init) => N.state[k] || (N.state[k] = init());
const pad = n => String(n).padStart(2, '0');
const behave = () => (N.reduce ? 'auto' : 'smooth');
const note = t => `data-note="${esc(t)}"`;

/* ---------- scroll effects: one listener, pages register what they need ---------- */
const live = { spy: null, words: null };
let raf = 0;
const stickyOffset = el => (parseFloat(getComputedStyle(el).top) || 0) + el.offsetHeight;
function tick() {
  raf = 0;
  const s = live.spy;
  if (s && !s.bar.isConnected) live.spy = null;
  else if (s) {
    const line = stickyOffset(s.bar) + 80;
    let cur = s.chaps[0] && s.chaps[0].dataset.mkChap;
    s.chaps.forEach(c => { if (c.getBoundingClientRect().top <= line) cur = c.dataset.mkChap; });
    if (cur !== s.cur) {
      s.cur = cur;
      $$('button[data-ch]', s.bar).forEach(b => {
        const on = b.dataset.ch === cur;
        b.classList.toggle('on', on);
        b.setAttribute('aria-current', on ? 'step' : 'false');
        if (on && s.track.scrollWidth > s.track.clientWidth) s.track.scrollTo({ left: b.offsetLeft - 16, behavior: behave() });
      });
    }
  }
  const w = live.words;
  if (w && !w.el.isConnected) live.words = null;
  else if (w) {
    const r = w.el.getBoundingClientRect(), vh = innerHeight;
    const p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
    const n = Math.round(p * w.spans.length);
    if (n !== w.n) { w.n = n; w.spans.forEach((sp, i) => sp.classList.toggle('on', i < n)); }
  }
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll, { passive: true });

/* ---------- shared pieces ---------- */
const mock = (label, body, cls = '') => `<div class="mk-mock ${cls}"><div class="mk-mock-bar" aria-hidden="true"><span class="mk-dots"><i></i><i></i><i></i></span><span class="mono">${label}</span></div><div class="mk-mock-body">${body}</div></div>`;
const marquee = (words, dur = 48) => {
  const half = `<div>${words.map((w, i) => `<span class="w">${esc(w)}</span><span class="arch-dot ${i % 2 ? 'v' : 'g'}"></span>`).join('')}</div>`;
  return `<div class="marquee mk-mq" aria-hidden="true"><div class="mq" style="--mq-dur:${dur}s">${half}${half}</div></div>`;
};
const cta = ({ title, text = '', btns, tone = 'hedge', n = '' }) => `<section class="wrap sec-s"><div class="blk blk-${tone} mk-cta rv" ${n ? note(n) : ''}><h2 class="d-l">${title}</h2>${text ? `<p class="lead">${text}</p>` : ''}<div class="btn-row">${btns}</div></div></section>`;
const sent = (title, text) => `<div class="mk-sent"><div class="mk-sent-ic">${ic('check')}</div><h3>${title}</h3><p class="muted">${text}</p><p class="mono muted">Prototype: nothing was sent.</p><div class="modal-foot"><button type="button" class="btn btn-ink btn-sm" data-close>Done</button></div></div>`;
const segBtns = (act, opts, val, label) => `<div class="seg" role="group" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" data-act="${act}" data-v="${esc(v)}" aria-pressed="${String(v) === String(val)}">${esc(l)}</button>`).join('')}</div>`;
const pressOnly = (el, sel) => $$(sel, el.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === el)));
const docRow = (cls, icon, name, meta, end = '', extra = '') => `<li class="mk-doc ${cls}"><span class="mk-doc-ic" aria-hidden="true">${ic(icon)}</span><div class="mk-doc-m"><b>${name}</b><span>${meta}</span>${extra}</div><div class="mk-doc-end">${end}</div></li>`;

/* hero for both "how it works" pages */
function roleHero(role) {
  const tr = role === 'trader';
  const art = tr
    ? `${N.art('mint', 'Build once', 'apply everywhere', 'arch mk-art-main')}
       <div class="mk-float mk-f1">${N.checked()}</div>
       <div class="mk-float mk-f2 card">${N.av('LS', 'mint', 'sm')}<div><b>Camden Night Market</b><span class="s">Approved \u00b7 pitch 12</span></div></div>
       <div class="mk-float mk-f3 card">${N.ring(96, 'sm', '')}<div><b>96% event-ready</b><span class="s">Gas Safety renews in 22 days</span></div></div>`
    : `${N.art('lilac', 'Curate', 'your line-up', 'arch mk-art-main')}
       <div class="mk-float mk-f1 card"><div class="mk-fill-card"><b>Street Food Summer Fest</b>${N.bar(80, 'violet')}<span class="s">12 of 15 traders approved</span></div></div>
       <div class="mk-float mk-f2">${N.checked('All checked')}</div>
       <div class="mk-float mk-f3 card">${N.av('BB', 'peach', 'sm')}<div><b>The Burger Boys</b><span class="s">Accepted in one click</span></div></div>`;
  return `<section class="wrap mk-hero">
    <div class="mk-hero-grid">
      <div class="mk-hero-copy rv">
        <p class="eyebrow">How it works \u00b7 ${tr ? 'For traders' : 'For organisers'}</p>
        <h1 class="d-l">${tr ? 'Event-ready, <em>automatically.</em>' : 'Curate events with absolute <em>precision.</em>'}</h1>
        <p class="lead">${tr
          ? 'Niche is the compliance-first platform connecting UK food traders and event organisers. Traders build a Food Trader Passport and apply everywhere. Organisers see exactly who\u2019s ready, without chasing a single document.'
          : 'See how Niche removes the admin from event curation. From automated compliance checks to one-click approvals, this is the smart way to build your food line-up.'}</p>
        <div class="mk-duo"><p><span class="arch-dot g" aria-hidden="true"></span><span><b>Traders:</b> build once, apply everywhere.</span></p><p><span class="arch-dot v" aria-hidden="true"></span><span><b>Organisers:</b> review confidently, approve faster.</span></p></div>
        <div class="mk-role ${tr ? '' : 'org'}" role="group" aria-label="Show how it works for" ${note('The live page links to the organiser version from a separate button. A pressed-state switch makes the two journeys obvious and one tap apart.')}>
          <button type="button" aria-pressed="${tr}" ${tr ? '' : 'data-go="site/how-it-works-trader"'}>${ic('truck')}I\u2019m a Trader</button>
          <button type="button" aria-pressed="${!tr}" ${tr ? 'data-go="site/how-it-works-organiser"' : ''}>${ic('calendar')}I\u2019m an Organiser</button>
        </div>
        <ul class="mk-trust" aria-label="At a glance">${['Free', 'UK-based', 'GDPR', 'No card'].map(t => `<li>${ic('check', 'ic-sm')}${t}</li>`).join('')}</ul>
      </div>
      <figure class="mk-hero-art rv" aria-hidden="true">${art}</figure>
    </div>
  </section>`;
}

/* chapters with a sticky chapter bar */
const chapBar = chs => `<nav class="mk-chapbar" aria-label="Chapters"><div class="mk-chapbar-in">${chs.map((c, i) => `<button type="button" data-act="mk_chap" data-ch="${i + 1}" class="${i ? '' : 'on'}" aria-current="${i ? 'false' : 'step'}"><i>${i + 1}</i>${esc(c.short)}</button>`).join('')}</div></nav>`;
function chapter(c, i) {
  const n = i + 1, tag = c.ordered ? 'ol' : 'ul';
  const list = c.feats ? `<div class="mk-kf"><p class="eyebrow">${c.featsTitle || 'Key features'}</p><${tag}>${c.feats.map((f, k) => `<li><span class="mk-kf-i" aria-hidden="true">${c.ordered ? k + 1 : ic('check')}</span><span>${f}</span></li>`).join('')}</${tag}></div>` : '';
  return `<section class="mk-chap" aria-labelledby="mk-ch-${n}-t">
    <div class="wrap"><div class="blk blk-${c.tone} mk-chap-in ${i % 2 ? 'flip' : ''} rv" id="mk-ch-${n}" data-mk-chap="${n}" ${c.note ? note(c.note) : ''}>
      <div class="mk-chap-copy">
        <div class="mk-chap-top"><span class="mk-chnum" aria-hidden="true">${pad(n)}</span><p class="eyebrow">Chapter ${n} of ${c.of}</p></div>
        <h2 class="d-m" id="mk-ch-${n}-t">${c.title}</h2>
        <p class="lead">${c.lead}</p>
        ${list}${c.extra || ''}
      </div>
      <div class="mk-chap-mock">${c.mock}</div>
    </div></div>
  </section>`;
}
const chapters = (chs, n) => `<div class="mk-chaps" ${note(n)}>${chapBar(chs)}${chs.map((c, i) => chapter({ ...c, of: chs.length }, i)).join('')}</div>`;
function setupSpy(root) {
  const bar = $('.mk-chapbar', root);
  if (!bar) return;
  live.spy = { bar, track: $('.mk-chapbar-in', bar), chaps: $$('[data-mk-chap]', root), cur: null };
  tick();
}

/* =====================================================================
   1 \u00b7 HOW IT WORKS FOR TRADERS
   ===================================================================== */
/* ch1 \u00b7 profile */
const PROF_AREAS = ['London, UK', 'Manchester, UK', 'Birmingham, UK', 'Bristol, UK', 'Leeds, UK', 'Glasgow, UK', 'Cardiff, UK'];
const PROF_TAGS = ['Halal', 'Vegan', 'Vegetarian', 'Gluten-free', 'Organic'];
const profState = () => S('mk_prof', () => ({ name: 'Lotus Street Kitchen', cuisine: 'Asian Fusion', area: 'London, UK', contact: 'hello@lotusstreet.demo', tags: ['Halal'], cstat: 'ok' }));
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const profScore = s => (s.name.trim() ? 20 : 0) + (s.cuisine ? 20 : 0) + (s.area ? 20 : 0) + (validEmail(s.contact) ? 20 : 0) + Math.min(s.tags.length, 2) * 10;
const cstatChip = c => c === 'ok' ? N.chip('ok', 'Approved') : c === 'wait' ? N.chip('info', 'Verifying\u2026') : N.chip('risk', 'Check the email');
const tagsHTML = tags => tags.length ? tags.map(t => `<span class="tag">${esc(t)}</span>`).join('') : '<span class="small muted">Add a speciality tag below</span>';
function profMock() {
  const s = profState(), sc = profScore(s);
  return mock('Trader app \u00b7 Profile setup', `<div class="mk-prof-wrap" data-mk-prof>
    <div class="mk-prof">
      <div class="mk-prof-head"><span class="av lg mint" data-b="ini" aria-hidden="true">${esc(N.initials(s.name) || '?')}</span><div><b data-b="name">${esc(s.name.trim() || 'Your business name')}</b><span class="small muted">What organisers see</span></div>${N.checked()}</div>
      <dl class="mk-prof-kv">
        <div><dt>Service area</dt><dd data-b="area">${esc(s.area)}</dd></div>
        <div><dt>Cuisine</dt><dd data-b="cuisine">${esc(s.cuisine)}</dd></div>
        <div><dt>Contact</dt><dd data-b="cstat">${cstatChip(s.cstat)}</dd></div>
      </dl>
      <div class="tags" data-b="tags">${tagsHTML(s.tags)}</div>
      <div class="mk-strength"><span>Profile strength</span>${N.bar(sc, sc >= 90 ? 'ok' : 'warn')}<b data-b="score">${sc}%</b></div>
    </div>
    <div class="mk-edit" data-input="mk_prof">
      ${N.field({ label: 'Business name', id: 'mk_p_name', value: s.name, attrs: 'data-k="name" maxlength="40" autocomplete="off"' })}
      ${N.field({ label: 'Cuisine', id: 'mk_p_cuisine', value: s.cuisine, opts: db.tags.cuisines, attrs: 'data-k="cuisine"' })}
      ${N.field({ label: 'Service area', id: 'mk_p_area', value: s.area, opts: PROF_AREAS, attrs: 'data-k="area"' })}
      ${N.field({ label: 'Contact email', id: 'mk_p_contact', type: 'email', value: s.contact, attrs: 'data-k="contact" autocomplete="off"' })}
      <div class="field full"><span>Speciality tags <span class="hint">Pick up to 3</span></span><div class="mk-pills">${PROF_TAGS.map(t => `<button type="button" class="mk-pill" data-act="mk_tag" data-t="${t}" aria-pressed="${s.tags.includes(t)}">${t}</button>`).join('')}</div></div>
    </div>
  </div>`);
}
let contactTimer = 0;
function paintProf(k) {
  const box = $('[data-mk-prof]');
  if (!box) return;
  const s = profState(), sc = profScore(s), b = n => $(`[data-b="${n}"]`, box);
  b('ini').textContent = N.initials(s.name) || '?';
  b('name').textContent = s.name.trim() || 'Your business name';
  b('area').textContent = s.area;
  b('cuisine').textContent = s.cuisine;
  b('cstat').innerHTML = cstatChip(s.cstat);
  b('tags').innerHTML = tagsHTML(s.tags);
  b('score').textContent = sc + '%';
  const bar = $('.mk-strength .bar', box);
  bar.className = 'bar ' + (sc >= 90 ? 'ok' : 'warn');
  bar.firstElementChild.style.width = sc + '%';
  const hit = k === 'tags' ? b('tags') : (k === 'area' || k === 'cuisine') ? b(k).parentElement : null;
  if (hit && !N.reduce) { hit.classList.remove('mk-flash'); void hit.offsetWidth; hit.classList.add('mk-flash'); }
}
N.input.mk_prof = el => {
  const k = el.dataset.k;
  if (!k) return;
  const s = profState();
  s[k] = el.value;
  if (k === 'contact') {
    s.cstat = 'wait';
    clearTimeout(contactTimer);
    contactTimer = setTimeout(() => { s.cstat = validEmail(s.contact) ? 'ok' : 'bad'; paintProf(); }, 900);
  }
  paintProf(k);
};

/* ch2 \u00b7 documents hub */
const docsState = () => S('mk_docs', () => ({ pli: 'pending', gas: 'missing' }));
function docRows() {
  const s = docsState(), ok = N.chip('ok', 'Approved'), pend = N.chip('info', 'Pending');
  const gas = s.gas === 'missing'
    ? docRow('miss', 'flame', 'LPG / Gas Safety Certificate', 'Required for hot food', `<button type="button" class="btn btn-ink btn-xs" data-act="mk_upload">${ic('upload')}Upload</button>`)
    : s.gas === 'uploading'
      ? docRow('pend', 'flame', 'LPG / Gas Safety Certificate', 'Uploading gas-safety-record.pdf\u2026', '', '<span class="bar thin violet mk-prog"><i></i></span>')
      : docRow(s.gas === 'approved' ? 'ok' : 'pend', 'flame', 'LPG / Gas Safety Certificate', s.gas === 'approved' ? 'Checked today \u00b7 valid to Oct 2027' : 'Uploaded just now', s.gas === 'approved' ? ok : pend);
  return docRow('ok', 'award', 'Food Hygiene Certificate', 'Expires Oct 2027', ok)
    + docRow(s.pli === 'approved' ? 'ok' : 'pend', 'shield-plain', 'Public Liability Insurance', s.pli === 'approved' ? 'Checked today \u00b7 \u00a35m cover' : 'Uploaded today', s.pli === 'approved' ? ok : pend)
    + gas;
}
const canReview = () => { const s = docsState(); return s.pli === 'pending' || s.gas === 'pending'; };
function docsMock() {
  return mock('Trader app \u00b7 My documents', `
    <div class="banner info">${ic('info')}<span><b>Required:</b> Food Hygiene Certificate and Public Liability Insurance. Add an LPG certificate if you cook with gas.</span></div>
    <ul class="mk-docs" data-mk-docs aria-live="polite">${docRows()}</ul>
    <div class="row between">
      <button type="button" class="btn btn-line btn-sm" data-act="mk_review" data-mk-review ${canReview() ? '' : 'disabled'}>${ic('zap')}Fast-forward the review</button>
      <button type="button" class="btn btn-ghost btn-sm" data-act="mk_docreset">${ic('refresh')}Reset</button>
    </div>`);
}
function paintDocs() {
  const box = $('[data-mk-docs]');
  if (!box) return;
  box.innerHTML = docRows();
  const r = $('[data-mk-review]');
  if (r) r.disabled = !canReview();
}
const docLegend = `<div class="mk-legend-box"><p class="eyebrow">What each status means</p><ul class="mk-legend">
  <li>${N.chip('info', 'Pending')}<span>Under review by the Niche team</span></li>
  <li>${N.chip('ok', 'Approved')}<span>Ready for event applications</span></li>
  <li>${N.chip('risk', 'Rejected')}<span>Invalid or expired</span></li></ul></div>`;

/* ch3 \u00b7 discovery & application (sample events from N.db.events) */
const DISC_BASE = { camden: { st: 'approved', pitch: '12' }, bristol: { st: 'approved', pitch: 'B7' }, manchester: { st: 'pending' } };
const discState = () => S('mk_disc', () => ({ q: '', loc: '', when: '', cui: '', applied: JSON.parse(JSON.stringify(DISC_BASE)) }));
const discEvents = () => Object.entries(db.events)
  .filter(([, e]) => e.status === 'published' && !e.external && N.daysFrom(e.date) >= 0)
  .sort((a, b) => N.dt(a[1].date) - N.dt(b[1].date));
function discFilter() {
  const s = discState(), q = s.q.trim().toLowerCase();
  return discEvents().filter(([, e]) => {
    if (q && !`${e.name} ${e.city} ${e.venue} ${e.type}`.toLowerCase().includes(q)) return false;
    if (s.loc && e.region !== s.loc) return false;
    if (s.cui && !e.cuisines.includes(s.cui)) return false;
    if (s.when === '14' && N.daysFrom(e.date) > 14) return false;
    if (s.when && s.when !== '14' && N.dt(e.date).getMonth() !== Number(s.when)) return false;
    return true;
  });
}
function discRow([id, e]) {
  const a = discState().applied[id], left = e.pitches - e.filled;
  const end = !a
    ? `<button type="button" class="btn btn-ink btn-xs" data-act="mk_apply" data-id="${id}">Apply to attend</button>`
    : a.st === 'approved'
      ? N.chip('ok', a.pitch ? `Approved \u00b7 pitch ${a.pitch}` : 'Approved')
      : `<button type="button" class="btn btn-line btn-xs mk-applied" data-act="mk_apply" data-id="${id}" aria-label="Applied to ${esc(e.name)}. Select to withdraw.">${ic('check')}<span>Applied</span></button>`;
  return `<li class="li">${N.evd(e.date, 'side')}<div class="li-main"><b>${esc(e.name)}</b><span>${esc(e.city)} \u00b7 ${esc(e.cuisines.join(', '))} \u00b7 ${N.plural(left, 'pitch', 'pitches')} left</span></div><div class="li-end">${end}</div></li>`;
}
const discEmpty = () => `<li>${N.empty('No events match', 'Try a wider date range or another cuisine.', '<button type="button" class="btn btn-line btn-sm" data-act="mk_discreset">Clear filters</button>', 'search')}</li>`;
function discMock() {
  const s = discState(), evs = discEvents();
  const regions = [...new Set(evs.map(([, e]) => e.region))].sort();
  const cuisines = [...new Set(evs.flatMap(([, e]) => e.cuisines))].sort();
  const list = discFilter();
  const sel = (label, k, opts) => `<label class="field"><span>${label}</span><select class="sel sm" data-k="${k}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(s[k]) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  return mock('Trader app \u00b7 Browse events', `
    <div class="mk-disc-ctl" data-input="mk_disc">
      <label class="search">${ic('search')}<span class="sr">Search events</span><input type="search" data-k="q" value="${esc(s.q)}" placeholder="Search events, cities or venues" autocomplete="off"></label>
      <div class="mk-disc-f">
        ${sel('Location', 'loc', [['', 'Anywhere'], ...regions.map(r => [r, r])])}
        ${sel('Date', 'when', [['', 'Any date'], ['14', 'Next 14 days'], ['9', 'October'], ['10', 'November'], ['11', 'December']])}
        ${sel('Cuisine required', 'cui', [['', 'Any cuisine'], ...cuisines.map(c => [c, c])])}
      </div>
    </div>
    <div class="row between"><span class="small muted" data-mk-count aria-live="polite">${N.plural(list.length, 'event')}</span><span class="xs muted">Your passport goes with every application</span></div>
    <ul class="list mk-disc-list" data-mk-disc>${list.length ? list.map(discRow).join('') : discEmpty()}</ul>`);
}
function paintDisc() {
  const box = $('[data-mk-disc]');
  if (!box) return;
  const list = discFilter();
  box.innerHTML = list.length ? list.map(discRow).join('') : discEmpty();
  const c = $('[data-mk-count]');
  if (c) c.textContent = N.plural(list.length, 'event');
}
N.input.mk_disc = el => { const k = el.dataset.k; if (!k) return; discState()[k] = el.value; paintDisc(); };

/* ch4 \u00b7 trader dashboard (fed by chapter 3) */
const dashState = () => S('mk_dash', () => ({ f: 'all' }));
const dashData = () => Object.entries(discState().applied).map(([id, a]) => ({ id, e: db.events[id], ...a })).sort((x, y) => N.dt(x.e.date) - N.dt(y.e.date));
function dashInner() {
  const all = dashData(), f = dashState().f;
  const ok = all.filter(x => x.st === 'approved'), pe = all.filter(x => x.st === 'pending');
  const list = f === 'approved' ? ok : f === 'pending' ? pe : all;
  return `<div class="mk-dash-stats">
      <div class="stat tone-sky"><span class="lbl">Upcoming</span><b class="num">${all.length}</b></div>
      <div class="stat tone-mint"><span class="lbl">Approved</span><b class="num">${ok.length}</b></div>
      <div class="stat tone-butter"><span class="lbl">Pending</span><b class="num">${pe.length}</b></div>
    </div>
    ${segBtns('mk_dash', [['all', 'All upcoming'], ['approved', 'Approved'], ['pending', 'Pending']], f, 'Filter your events')}
    <ul class="list">${list.length ? list.map(x => `<li class="li">${N.evd(x.e.date, 'side')}<div class="li-main"><b>${esc(x.e.name)}</b><span>${esc(x.e.venue)} \u00b7 ${esc(x.e.city)}</span></div><div class="li-end">${x.st === 'approved' ? N.chip('ok', x.pitch ? 'Pitch ' + x.pitch : 'Approved') : N.chip('info', 'Pending review')}</div></li>`).join('') : `<li>${N.empty('Nothing here yet', 'Apply to an event in chapter 3 and it lands here.', '', 'calendar')}</li>`}</ul>`;
}
function dashMock() {
  const day = N.TODAY.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return mock('Trader app \u00b7 Dashboard', `<div class="mk-dash-top"><div><p class="eyebrow">${day}</p><b class="mk-hi">Your trading schedule</b></div><button type="button" class="btn btn-hedge btn-sm" data-go="trader/dashboard">Open dashboard${ic('arrow-right')}</button></div><div class="stack" data-mk-dash>${dashInner()}</div>`);
}
function paintDash() { const box = $('[data-mk-dash]'); if (box) box.innerHTML = dashInner(); }

N.page('site/how-it-works-trader', {
  app: 'site', title: 'How it works for traders',
  render() {
    const chs = [
      { short: 'Build your profile', tone: 'mint', title: 'Build your <em>profile</em>', lead: 'Your Niche profile is your digital storefront. Organisers review it to decide if you\u2019re the right fit, so the more detail you add, the higher your approval rate.', feats: ['Define your core cuisine type', 'Set your primary service area', 'Update contact information securely'], mock: profMock(), note: 'The live chapters show static screenshots. Here the profile card updates as you type, so traders see exactly what organisers will see.' },
      { short: 'The documents hub', tone: 'butter', title: 'The documents <em>hub</em>', lead: 'Say goodbye to emailing PDFs to every organiser. Upload each certificate once, our team reviews it, and every application you send carries it automatically.', feats: ['Upload once, reuse for every application', 'Expiry dates tracked to the day', 'A clear status on every document'], extra: docLegend, mock: docsMock() },
      { short: 'Advanced discovery', tone: 'sky', title: 'Advanced discovery and <em>application</em>', lead: 'Find the events that suit your food and apply straight from the listing. Your passport goes with every application, so there\u2019s nothing to fill in twice.', feats: ['Filter by location, date or cuisine', 'Apply to attend from the listing', 'Instant notifications on approval or rejection'], mock: discMock(), note: 'Filters and \u201cApply to attend\u201d run on the prototype\u2019s real sample events, and applications flow into chapter 4\u2019s dashboard.' },
      { short: 'The trader dashboard', tone: 'lilac', title: 'The trader <em>dashboard</em>', lead: 'Manage your entire trading schedule from a single dashboard: what\u2019s coming up, what\u2019s approved and what still needs you.', feats: ['Upcoming, approved and pending events in one view', 'Expiry warnings before they cost you a pitch', 'Invitations from organisers who want you'], mock: dashMock() },
    ];
    return `${roleHero('trader')}
      ${marquee(['Food vans', 'Street food stalls', 'Caterers', 'Coffee carts', 'Horsebox bars', 'Dessert bikes', 'Pizza ovens', 'Pop-up kitchens'])}
      ${chapters(chs, 'The live page is one long scroll with no way to jump ahead. The sticky chapter bar tracks where you are and jumps between the four chapters.')}
      ${cta({ title: 'Take <em>control</em> of your food business.', text: 'Build your Food Trader Passport once, and every application you send is ready before you are.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/register">Create my passport${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="trader/dashboard">Open the trader demo</button>` })}`;
  },
  after(root) { setupSpy(root); },
});

/* =====================================================================
   2 \u00b7 HOW IT WORKS FOR ORGANISERS
   ===================================================================== */
/* ch1 \u00b7 create custom events */
const CFG_DATE = '2026-10-24', BOOKED = 8, POOL = ['mw', 'st', 'bs', 'tl'];
const cfgState = () => S('mk_cfg', () => ({ cap: 12, cuisine: 'Diverse', hyg: true, pli: true, gas: true }));
function poolEval(tid) {
  const s = cfgState(), t = db.traders[tid];
  if (s.cuisine !== 'Diverse' && t.cuisine !== s.cuisine) return ['plain', 'Filtered out \u00b7 cuisine'];
  if (s.hyg && t.fhrs < 5) return ['risk', `Blocked \u00b7 hygiene rating ${t.fhrs}`];
  if (s.pli && t.pli < 5) return ['risk', `Blocked \u00b7 \u00a3${t.pli}m cover`];
  if (s.gas && t.gas && N.dt(t.gas) < N.dt(CFG_DATE)) return ['risk', `Blocked \u00b7 gas expires ${N.fShort(t.gas)}`];
  return ['ok', 'Can apply'];
}
const poolHTML = () => POOL.map(tid => { const t = db.traders[tid], [c, l] = poolEval(tid); return `<li class="li">${N.tav(tid, 'sm')}<div class="li-main"><b>${esc(t.biz)}</b><span>${esc(t.cuisine)} \u00b7 hygiene ${t.fhrs} \u00b7 \u00a3${t.pli}m cover</span></div><div class="li-end">${N.chip(c, l)}</div></li>`; }).join('');
const poolSum = () => { const n = POOL.filter(t => poolEval(t)[0] === 'ok').length; return `<b>${n} of ${POOL.length}</b> sample applicants can apply. Anyone who misses a rule can\u2019t send an application.`; };
const slotsHTML = cap => Array.from({ length: cap }, (_, i) => `<i class="${i < BOOKED ? 'b' : ''}"></i>`).join('');
const slotLine = cap => `${BOOKED} approved \u00b7 ${cap - BOOKED} open \u00b7 applications close at ${cap}`;
function cfgMock() {
  const s = cfgState();
  return mock('Organiser app \u00b7 Create event', `<div class="mk-cfg" data-mk-cfg>
    <div class="mk-cfg-top">${N.evd(CFG_DATE, 'side')}<div class="li-main"><b>Harvest Night Market</b><span>Victoria Park, London</span></div>${N.chip('warn', 'Draft')}</div>
    <div class="mk-cfg-grid">
      <div class="field"><span>Capacity slots</span><div class="mk-stepper"><button type="button" data-act="mk_cap" data-d="-1" aria-label="One fewer slot">${ic('minus')}</button><output data-mk-cap aria-live="polite">${s.cap}</output><button type="button" data-act="mk_cap" data-d="1" aria-label="One more slot">${ic('plus')}</button></div></div>
      ${N.field({ label: 'Cuisine', id: 'mk_cfg_cui', value: s.cuisine, opts: [['Diverse', 'Diverse'], ['Indian', 'Indian'], ['BBQ', 'BBQ'], ['Mexican', 'Mexican']], attrs: 'data-change="mk_cfg" data-k="cuisine"' })}
    </div>
    <div class="mk-slots" data-mk-slots aria-hidden="true">${slotsHTML(s.cap)}</div>
    <p class="small muted" data-mk-slotline>${slotLine(s.cap)}</p>
    <div class="mk-reqs"><p class="eyebrow">Required certifications</p>
      ${N.toggle('mk_cfg_hyg', 'Hygiene rating', s.hyg, 'data-change="mk_cfg" data-k="hyg"')}
      ${N.toggle('mk_cfg_pli', 'Public liability', s.pli, 'data-change="mk_cfg" data-k="pli"')}
      ${N.toggle('mk_cfg_gas', 'Gas safety', s.gas, 'data-change="mk_cfg" data-k="gas"')}
    </div>
    <div class="mk-pool"><p class="eyebrow">Sample applicants</p><ul class="list" data-mk-pool>${poolHTML()}</ul><p class="small" data-mk-poolsum aria-live="polite">${poolSum()}</p></div>
  </div>`);
}
function paintCfg() {
  const box = $('[data-mk-cfg]');
  if (!box) return;
  const s = cfgState();
  $('[data-mk-cap]', box).textContent = s.cap;
  $('[data-mk-slots]', box).innerHTML = slotsHTML(s.cap);
  $('[data-mk-slotline]', box).textContent = slotLine(s.cap);
  $('[data-mk-pool]', box).innerHTML = poolHTML();
  $('[data-mk-poolsum]', box).innerHTML = poolSum();
}
N.change.mk_cfg = el => { const k = el.dataset.k; if (!k) return; cfgState()[k] = el.type === 'checkbox' ? el.checked : el.value; paintCfg(); };

/* ch2 \u00b7 automated compliance */
const cmplState = () => S('mk_cmpl', () => ({ v: 'ready' }));
function cmplInner() {
  const hyg = docRow('ok', 'award', 'Food Hygiene Certificate', 'Rating 5 \u00b7 matched on the FSA register', N.chip('ok', 'Approved'));
  if (cmplState().v === 'ready') return `<div class="mk-who">${N.tav('mw')}<div class="li-main"><b>Masala Wheels</b><span>Applied to Harvest Night Market</span></div>${N.checked()}</div>
    <ul class="mk-docs">${hyg}${docRow('ok', 'shield-plain', 'Public Liability Insurance', '\u00a35m cover \u00b7 valid to Mar 2027', N.chip('ok', 'Approved'))}</ul>
    <div class="banner ok">${ic('check-circle')}<span>Meets every requirement you set. Ready for your decision.</span></div>`;
  return `<div class="mk-who">${N.av('NN', 'sky')}<div class="li-main"><b>Northern Noodle Bar</b><span>Tried to apply to Harvest Night Market</span></div>${N.chip('risk', 'Flagged')}</div>
    <ul class="mk-docs">${hyg}${docRow('bad', 'shield-plain', 'Public Liability Insurance', 'Expired 26 Sep 2026', N.chip('risk', 'Expired'))}</ul>
    <div class="banner risk">${ic('alert')}<span>Flagged. This trader can\u2019t apply until a valid policy is uploaded, so your requirement holds.</span></div>`;
}
const cmplMock = () => mock('Organiser app \u00b7 Applicant compliance', `${segBtns('mk_cmpl', [['ready', 'Ready applicant'], ['flag', 'Expired document']], cmplState().v, 'Sample applicant')}<div class="stack" data-mk-cmpl aria-live="polite">${cmplInner()}</div>`);

/* ch3 \u00b7 review & approve */
const revState = () => S('mk_rev', () => ({ d: '' }));
const decHTML = d => d === 'accept'
  ? `<div class="stamp hit">${N.stamp('mk-acc-st')}</div><div class="stack" style="--g:6px"><b>Accepted. Pitch 13 of 15 is theirs.</b><span class="small">The Burger Boys get an email with their pitch details. Prototype: nothing was sent.</span><button type="button" class="link" data-act="mk_undo">${ic('refresh')}Undo</button></div>`
  : d === 'reject'
    ? `<span class="mk-dec-x">${ic('x')}</span><div class="stack" style="--g:6px"><b>Rejected.</b><span class="small">The Burger Boys get an email letting them know. Prototype: nothing was sent.</span><button type="button" class="link" data-act="mk_undo">${ic('refresh')}Undo</button></div>`
    : '';
function revMock() {
  const d = revState().d;
  return mock('Organiser app \u00b7 Applications', `<div class="mk-app ${d ? 'is-' + d : ''}" data-mk-app>
    <div class="mk-app-body">
      <div class="mk-app-head">${N.av('BB', 'peach', 'lg')}<div class="li-main"><b>The Burger Boys</b><span>Street food \u00b7 3\u00d73 gazebo</span></div>${N.ring(100, 'sm', '')}</div>
      <div class="tags">${['Hygiene rating 5', '\u00a35m cover', 'Gas Safety valid', 'Allergens listed'].map(t => `<span class="tag">${ic('check')}${t}</span>`).join('')}</div>
      <p class="small muted">Applied 2 h ago to Street Food Summer Fest \u00b7 12 of 15 pitches filled</p>
    </div>
    <div class="mk-app-act"><button type="button" class="btn btn-line btn-sm" data-act="mk_pp">${ic('eye')}View passport</button><span class="grow"></span><button type="button" class="btn btn-danger-line btn-sm" data-act="mk_decide" data-d="reject">Reject</button><button type="button" class="btn btn-hedge btn-sm" data-act="mk_decide" data-d="accept">${ic('check')}Accept</button></div>
    <div class="mk-dec" aria-live="polite">${decHTML(d)}</div>
  </div>`);
}
function paintRev(focus) {
  const box = $('[data-mk-app]');
  if (!box) return;
  const d = revState().d;
  box.className = `mk-app ${d ? 'is-' + d : ''}`;
  $('.mk-dec', box).innerHTML = decHTML(d);
  if (focus) { const f = d ? $('[data-act="mk_undo"]', box) : $('[data-act="mk_decide"][data-d="accept"]', box); if (f) f.focus({ preventScroll: true }); }
  paintOdash();
}

/* ch4 \u00b7 organiser dashboard */
const ODASH = {
  upcoming: [
    { name: 'Camden Night Market', date: '2026-10-02', place: 'Camden Lock Arches, London', n: 14, of: 20 },
    { name: 'Brighton Seafront Food Fest', date: '2026-10-13', place: 'Madeira Drive, Brighton', n: 9, of: 20 },
    { name: 'Street Food Summer Fest', date: '2027-07-10', place: 'Victoria Park, London', n: 12, of: 15, live: true },
  ],
  ongoing: [{ name: 'Harbourside Weekend Market', date: '2026-09-27', place: 'Day 3 of 3 \u00b7 Bristol', n: 18, of: 18 }],
  past: [
    { name: 'Greenwich Summer Market', date: '2026-08-16', place: 'Greenwich Market, London', n: 18, of: 18 },
    { name: 'Bristol Winter Market', date: '2026-02-14', place: 'Queen Square, Bristol', n: 16, of: 16 },
  ],
};
const odashState = () => S('mk_odash', () => ({ t: 'upcoming' }));
function odashInner() {
  const t = odashState().t, extra = revState().d === 'accept' ? 1 : 0;
  const chip = { upcoming: N.chip('info', 'Upcoming'), ongoing: N.chip('ok', 'Ongoing'), past: N.chip('plain', 'Completed') }[t];
  return `<div class="tabs" role="tablist" aria-label="Your events">${[['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['past', 'Past']].map(([k, l]) => `<button type="button" role="tab" aria-selected="${k === t}" data-act="mk_otab" data-k="${k}">${l}<span class="n">${ODASH[k].length}</span></button>`).join('')}</div>
    <ul class="list" role="tabpanel">${ODASH[t].map(x => { const n = x.n + (x.live ? extra : 0); return `<li class="li">${N.evd(x.date, 'side')}<div class="li-main"><b>${esc(x.name)}</b><span>${esc(x.place)}</span><span class="mk-fill">${N.bar(n / x.of * 100, n >= x.of ? 'ok' : 'violet')}<b>${n}/${x.of}</b> traders approved</span></div><div class="li-end">${chip}</div></li>`; }).join('')}</ul>`;
}
const odashMock = () => mock('Organiser app \u00b7 Dashboard', `<div class="mk-dash-top"><div><p class="eyebrow">Reed Events</p><b class="mk-hi">Your events</b></div><button type="button" class="btn btn-violet btn-sm" data-go="org/dashboard">Open dashboard${ic('arrow-right')}</button></div><div class="stack" data-mk-odash>${odashInner()}</div>`);
function paintOdash() { const box = $('[data-mk-odash]'); if (box) box.innerHTML = odashInner(); }

N.page('site/how-it-works-organiser', {
  app: 'site', title: 'How it works for organisers',
  render() {
    const chs = [
      { short: 'Create custom events', tone: 'lilac', title: 'Create custom <em>events</em>', lead: 'Set your rules once and Niche applies them to every application: how many pitches, which cuisines and which certificates.', feats: ['Set exact capacity to prevent overbooking', 'Filter applicants by cuisine to balance your offering', 'Enforce mandatory certifications'], mock: cfgMock(), note: 'Switching a required certificate on or off re-checks real sample traders, which shows the trade-off between strict rules and a full line-up.' },
      { short: 'Automated compliance', tone: 'mint', title: 'Automated <em>compliance</em>', lead: 'Checking PDFs and chasing emails is a thing of the past. Our team reviews trader documents on the platform, so every applicant arrives with transparent eligibility data.', featsTitle: 'How it works', ordered: true, feats: ['Traders upload their documents to their passport', 'The Niche team reviews every document', 'Rejected or expired documents are flagged and can\u2019t bypass your requirements'], mock: cmplMock() },
      { short: 'Review & approve', tone: 'peach', title: 'Review and <em>approve</em>', lead: 'Open any applicant\u2019s passport in one click, then accept or reject without leaving the event listing. Traders hear back automatically.', feats: ['Detailed pop-up view of trader passports', 'Accept or reject within the event listing', 'Automated email alerts to traders'], mock: revMock(), note: 'Accept and Reject animate into a decision with undo, mirroring the real review flow and its email alert. Accepting also updates the dashboard in chapter 4.' },
      { short: 'Organiser dashboard', tone: 'sky', title: 'The organiser <em>dashboard</em>', lead: 'Every event you run, at a glance: how full each line-up is and what still needs a decision.', feats: ['Upcoming, ongoing and past events in tabs', 'Approved traders tracked against capacity', 'Straight into the applications waiting for you'], mock: odashMock() },
    ];
    return `${roleHero('org')}
      ${marquee(db.tags.eventTypes.slice(0, 9), 52)}
      ${chapters(chs, 'The live page is one long scroll with no way to jump ahead. The sticky chapter bar tracks where you are and jumps between the four chapters.')}
      ${cta({ tone: 'violet', title: 'Host better events with zero <em>hassle.</em>', text: 'Free for your first year. Set your rules, invite traders and approve your line-up in one place.', n: '\u201cBook a demo\u201d opens a short form in place instead of sending organisers to an email link.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="org/create-event">Create event${ic('arrow-right')}</button><button type="button" class="btn mk-btn-onv btn-lg" data-act="mk_demo">Book a demo</button>` })}`;
  },
  after(root) { setupSpy(root); },
});

/* =====================================================================
   3 \u00b7 HOW VERIFICATION WORKS
   ===================================================================== */
const STEP_NAMES = ['Present and readable', 'Complete for the event\u2019s requirements', 'In date, with expiry tracked to the day', 'Matched to a public register'];
const SAMPLES = {
  gas: { tab: 'Gas Safety Certificate', icon: 'flame', kind: 'LPG Gas Safety Record', issuer: 'Gas Safe registered engineer', rows: [['Business', 'AG Foods Ltd'], ['Unit', 'Alice Street Truck'], ['Appliances', '2 hobs, 1 fryer'], ['Engineer no.', '548213'], ['Expires', '21 Oct 2026']],
    steps: [['ok', 'Two pages, every field legible'], ['ok', 'Covers every gas appliance on this unit'], ['ok', 'Valid to 21 Oct 2026, 22 days from today'], ['ok', 'Engineer 548213 found on the Gas Safe Register']] },
  pli: { tab: 'Public Liability Insurance', icon: 'shield-plain', kind: 'Certificate of insurance', issuer: 'Public and products liability', rows: [['Insured', 'Northern Noodle Bar Ltd'], ['Policy no.', 'PL-220913'], ['Limit of indemnity', '\u00a35,000,000'], ['Expires', '26 Sep 2026']],
    steps: [['ok', 'One page, every field legible'], ['ok', '\u00a35m cover meets the event\u2019s \u00a35m minimum'], ['fail', 'Expired 26 Sep 2026, 3 days ago. Flagged to the trader.'], ['skip', 'Not run. The check stops at the first failure.']] },
  fhrs: { tab: 'Food Hygiene rating', icon: 'award', kind: 'Food hygiene rating', issuer: 'Manchester City Council', fhrs: 5, rows: [['Business', 'AG Foods Ltd'], ['Inspected', '14 Jun 2025']],
    steps: [['ok', 'Rating letter and sticker both legible'], ['ok', 'Business name and address match the passport'], ['ok', 'Current rating from the last inspection'], ['ok', 'Rating 5 confirmed on the FSA register']] },
};
const runState = () => S('mk_run', () => ({ pick: 'gas', i: -1, done: false }));
let runTimer = 0;
const running = () => { const s = runState(); return s.i >= 0 && !s.done; };
function paperHTML() {
  const smp = SAMPLES[runState().pick];
  return `<div class="mk-paper ${running() ? 'scan' : ''}"><div class="row between"><span class="mono muted">${esc(smp.issuer)}</span><span class="mk-paper-ic">${ic(smp.icon)}</span></div><h4>${esc(smp.kind)}</h4>${smp.fhrs ? N.fhrs(smp.fhrs) : ''}<dl>${smp.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><span class="mk-sig" aria-hidden="true"></span></div>`;
}
function stepsHTML() {
  const s = runState(), smp = SAMPLES[s.pick];
  return STEP_NAMES.map((n, k) => {
    let cls = '', inner = '', sub = 'Waiting';
    if (s.i >= 0 && k < s.i) { const [st, txt] = smp.steps[k]; cls = st; sub = txt; inner = ic(st === 'ok' ? 'check' : st === 'fail' ? 'x' : 'minus'); }
    else if (running() && k === s.i) { cls = 'run'; sub = 'Checking\u2026'; }
    return `<li class="${cls}"><span class="mk-st-ic" aria-hidden="true">${inner}</span><div><b>${n}</b><span class="s">${sub}</span></div></li>`;
  }).join('');
}
function resultHTML() {
  const s = runState(), smp = SAMPLES[s.pick];
  if (!s.done) return `<span class="small muted">${running() ? 'Running four checks\u2026' : 'Pick a sample document, then run the check.'}</span>`;
  return smp.steps.some(x => x[0] === 'fail')
    ? `<div class="banner risk">${ic('flag')}<span class="grow"><b>Flagged: not in date.</b> No Checked badge. The trader has been asked to upload a renewal, and applications that need this document are on hold.</span></div>`
    : `<div class="mk-pass"><div class="stamp hit">${N.stamp('mk-run-st')}</div><div class="stack" style="--g:8px">${N.checked()}<span class="small">Present, complete, in date and matched to the register.</span></div></div>`;
}
function paintRun() {
  const box = $('[data-mk-run]');
  if (!box) return;
  $('[data-mk-paper]', box).innerHTML = paperHTML();
  $('[data-mk-steps]', box).innerHTML = stepsHTML();
  $('[data-mk-result]', box).innerHTML = resultHTML();
  const b = $('[data-act="mk_run"]', box);
  b.disabled = running();
  $('span', b).textContent = runState().done ? 'Run it again' : 'Run the check';
}
function runNext() {
  const s = runState(), smp = SAMPLES[s.pick], n = STEP_NAMES.length;
  if (!$('[data-mk-run]')) { s.i = -1; s.done = false; return; }
  const st = smp.steps[s.i][0];
  s.i++;
  if (st === 'fail' || s.i >= n) { s.i = n; s.done = true; }
  paintRun();
  if (!s.done) runTimer = setTimeout(runNext, N.reduce ? 0 : 850);
}

N.page('site/how-verification-works', {
  app: 'site', title: 'How verification works',
  render() {
    const s = runState();
    clearTimeout(runTimer);
    if (!s.done) s.i = -1;
    const col = (tone, icon, title, sub, items, bullet) => `<article class="mk-col blk-${tone}"><span class="mk-col-ic" aria-hidden="true">${ic(icon, 'ic-lg')}</span><h3>${title}</h3><p class="mk-col-sub">${sub}</p><ul>${items.map(t => `<li>${ic(bullet)}<span>${t}</span></li>`).join('')}</ul></article>`;
    return `<section class="wrap mk-hero">
      <div class="mk-hero-grid">
        <div class="mk-hero-copy rv">
          <p class="eyebrow">How verification works</p>
          <h1 class="d-l">We check the paperwork. You make the <em>call.</em></h1>
          <p class="lead">NICHE is a conduit, not a certifier. Being clear about that protects everyone: organisers know exactly what they\u2019re relying on, and traders know what stays their responsibility.</p>
          <div class="btn-row"><button type="button" class="btn btn-ink btn-lg" data-act="mk_scrollto" data-to="mk-run">${ic('shield')}Run a sample check</button><button type="button" class="btn btn-line btn-lg" data-go="site/data-trust">How we handle your data</button></div>
        </div>
        <figure class="mk-hero-art rv" aria-hidden="true">
          <div class="mk-vstage arch"><div class="stamp">${N.stamp('mk-vst')}</div></div>
          <div class="mk-float mk-f1 card">${N.checked()}<span class="small">Present \u00b7 complete \u00b7 in date</span></div>
          <div class="mk-float mk-f3 card"><span class="mk-fl-ic">${ic('clock')}</span><div><b>Gas Safety expires 21 Oct</b><span class="s">Tracked to the day</span></div></div>
        </figure>
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="mk-cols rv" ${note('The live site never says what NICHE checks and what it doesn\u2019t. Three colour-coded columns make the limits of the Checked badge explicit.')}>
        ${col('mint', 'check-circle', 'What we check', 'For each document, automatically:', ['It\u2019s present and readable', 'It\u2019s complete for the event\u2019s requirements', 'It\u2019s in date, with expiry tracked to the day'], 'check')}
        ${col('sky', 'link', 'What we cross-reference', 'Against public registers where available:', ['Food Hygiene ratings (FSA)', 'Gas Safe Register', 'Companies House'], 'search')}
        ${col('peach', 'user', 'What stays with you', 'Some things only you can decide:', ['NICHE doesn\u2019t certify that a unit is safe or compliant', 'Traders warrant their own documents', 'Organisers make the final decision'], 'arrow-right')}
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="mk-badge rv">
        <div class="stack" style="--g:16px"><p class="eyebrow">The Checked badge</p>${N.checked()}<h2 class="d-m">What the badge <em>means</em></h2><p class="lead">A Checked badge means the documents are present, complete and in date, and matched to public records where we can. It is not a safety certification or a guarantee. The organiser\u2019s own due diligence still applies.</p></div>
        <div class="mk-means">
          <div class="mk-mean ok"><p class="eyebrow">It means</p><ul>${['Every required document is on file', 'Each one is complete and readable', 'Nothing has expired', 'Matched to public registers where they exist'].map(t => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul></div>
          <div class="mk-mean no"><p class="eyebrow">It doesn\u2019t mean</p><ul>${['The unit has been inspected by us', 'The food is safe to eat', 'A guarantee of any kind', 'You can skip your own checks'].map(t => `<li>${ic('x')}<span>${t}</span></li>`).join('')}</ul></div>
        </div>
      </div>
    </section>

    <section class="wrap sec-s" id="mk-run">
      <div class="blk blk-lilac mk-runblk rv" ${note('A step-by-step check, including a failure, sets honest expectations about what \u201cChecked\u201d covers before anyone relies on it.')}>
        <div class="sec-head"><p class="eyebrow">Try it</p><h2 class="d-m">Run a <em>check</em></h2><p class="lead">Pick a sample document and watch the four checks run. One of them fails, so you can see what a flag looks like.</p></div>
        <div class="stack" style="--g:22px" data-mk-run>
          ${segBtns('mk_runpick', Object.entries(SAMPLES).map(([k, v]) => [k, v.tab]), s.pick, 'Sample document')}
          <div class="mk-run">
            <div data-mk-paper>${paperHTML()}</div>
            <div class="stack" style="--g:14px">
              <ol class="mk-steps" data-mk-steps aria-live="polite">${stepsHTML()}</ol>
              <div class="mk-result" data-mk-result aria-live="polite">${resultHTML()}</div>
              <div><button type="button" class="btn btn-ink" data-act="mk_run">${ic('shield')}<span>${s.done ? 'Run it again' : 'Run the check'}</span></button></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    ${cta({ title: 'Paperwork checked. The decision stays <em>yours.</em>', text: 'See a passport the way organisers see it, or read how we look after trader data.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/passport">See a live passport${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/data-trust">Data trust</button>` })}`;
  },
});

/* =====================================================================
   4 \u00b7 TRADER PRICING
   ===================================================================== */
const plans = () => db.plans.trader;
const priceNow = (p, ph) => ph === 'later' && p.then ? p.then : p.price;
const priceSub = (p, ph) => p.id === 'lite' ? 'Free forever' : p.managed ? 'a month \u00b7 no free period' : ph === 'later' ? 'a month from month 4' : `a month for 3 months, then \u00a3${p.then}`;
const PLAN_UI = { lite: ['sunk', 'btn-ink', 'Self-serve'], growth: ['mint', 'btn-hedge', 'Self-serve'], pro: ['lilac', 'btn-violet', 'Self-serve'], advance: ['hedge', 'btn-zest', 'Fully managed'] };
function planCard(p, ph) {
  const [tone, btn, kind] = PLAN_UI[p.id] || PLAN_UI.lite, v = priceNow(p, ph);
  return `<article class="mk-plan t-${tone} ${p.popular ? 'is-pop' : ''}">
    ${p.popular ? '<span class="chip zest mk-pop">Most popular</span>' : ''}
    <header class="mk-plan-h">
      <p class="eyebrow">${kind}</p>
      <h3 class="mk-plan-n">${esc(p.name)}</h3>
      <p class="mk-price"><span class="cur">\u00a3</span><span class="num" data-mk-price="${p.id}" data-v="${v}">${v}</span>${p.id === 'lite' ? '' : '<span class="per">/mo</span>'}</p>
      <p class="small mk-plan-sub" data-mk-sub="${p.id}">${esc(priceSub(p, ph))}</p>
    </header>
    <p class="mk-plan-tag">${esc(p.tag)}</p>
    ${p.managed ? '<blockquote class="mk-adv-q">We find events, complete applications, manage your social media, handle every organiser conversation, and keep your documents renewed. You don\u2019t log in. You just trade.</blockquote>' : ''}
    <button type="button" class="btn ${btn} btn-block" data-act="${p.managed ? 'mk_adv' : 'mk_plan'}" data-id="${p.id}">${esc(p.cta)}</button>
    <ul class="mk-plan-f">${p.features.map(f => /plus:$/.test(f) ? `<li class="plus">${esc(f)}</li>` : `<li>${ic('check', 'ic-sm')}<span>${esc(f)}</span></li>`).join('')}</ul>
  </article>`;
}
const GLANCE = [
  ['NICHE Growth', '\u00a30/month, then \u00a315/mo', 'Free 3 months', 'Get found. Stay ready. Trade more.', 'mint', ''],
  ['NICHE Pro', '\u00a30/month, then \u00a329/mo', 'Free 3 months', 'Win the pitches that matter.', 'lilac', ''],
  ['NICHE Advance', '\u00a3239/month', 'No free period', 'You cook. We handle the rest.', 'hedge', ''],
  ['NICHE Launch', '\u00a31,239', 'One-off service', 'From idea to trading, done for you.', 'peach', 'site/launch'],
  ['NICHE Event Pass', '8% commission (Yr 2+)', 'Free Year 1', 'Zero paperwork. Book with confidence.', 'sky', 'site/pricing-organiser'],
];
const CMP = [
  ['Passport & profile', [['Trader passport & business profile', 'y', 'y', 'Enhanced'], ['Document upload & storage', 'Limited', 'Unlimited', 'Unlimited'], ['Shareable passport link', 'n', 'y', 'y']]],
  ['Compliance management', [['Readiness states: valid, expiring, missing', 'View only', 'y', 'y'], ['Expiry alerts & renewal reminders', 'n', 'y', 'y'], ['Document reuse across applications', 'n', 'y', 'y'], ['AI-assisted document extraction (year 2+)', 'n', 'n', 'y']]],
  ['Event applications', [['Apply to events', 'y', 'y', 'y'], ['Track application status', 'n', 'y', 'y'], ['Eligibility-filtered discovery', 'n', 'n', 'y']]],
  ['Discovery, visibility & intelligence', [['Event discovery & matching', 'Limited', 'y', 'y'], ['Smart event-fit insights', 'n', 'n', 'y'], ['Priority visibility to organisers', 'n', 'n', 'y'], ['Reliability score & benchmarking', 'n', 'n', 'y']]],
  ['Workflow & support (year 2+)', [['Email support', 'y', 'y', 'y'], ['Priority support', 'n', 'n', 'y'], ['Calendar sync', 'n', 'y', 'y']]],
];
const CMP_PLANS = [['lite', 'Lite', '\u00a30 \u00b7 free forever'], ['growth', 'Growth', '\u00a30, then \u00a315/mo'], ['pro', 'Pro', '\u00a30, then \u00a329/mo']];
const cmpCell = v => v === 'y' ? `<span class="mk-yes">${ic('check')}<span class="sr">Included</span></span>` : v === 'n' ? '<span class="mk-no"><span aria-hidden="true">\u2013</span><span class="sr">Not included</span></span>' : `<span class="mk-txt">${esc(v)}</span>`;
const TFAQ = [
  ['How does billing work?', 'Lite is free forever. Growth and Pro cost nothing for your first 3 months, then bill monthly at \u00a315 or \u00a329. NICHE Advance bills \u00a3239 a month from the start, and any extra applications at \u00a312 each are added to that month\u2019s bill.'],
  ['What happens after the 3 free months?', 'We remind you before your free months end. Add a card to stay on Growth or Pro. If you don\u2019t, your account moves to Lite, your passport and documents stay put, and you\u2019re never charged.'],
  ['Can I cancel or change plan?', 'Yes, at any time from your Subscription page. A paid plan runs to the end of the month you\u2019ve paid for, then moves to Lite. Upgrades start straight away.'],
  ['Do I need a card to start?', 'No. Lite, Growth and Pro all start without a card. You only add one if you choose to keep a paid plan after month 3.'],
];
const faq = items => `<div class="mk-faq">${items.map(([q, a], i) => `<details ${i ? '' : 'open'}><summary>${esc(q)}${ic('plus')}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;

N.page('site/pricing-trader', {
  app: 'site', title: 'Trader pricing',
  render() {
    const ph = S('mk_price', () => ({ phase: 'launch' })).phase;
    const cmp = S('mk_cmp', () => ({ plan: 'growth', closed: {} }));
    const anyOpen = CMP.some((g, i) => !cmp.closed[i]);
    return `<section class="wrap mk-phero">
      <div class="sec-head center rv">
        <p class="eyebrow">Trader pricing</p>
        <h1 class="d-l">Stop rebuilding your credentials for every <em>event.</em></h1>
        <p class="lead">For independent food traders who are active or getting ready to trade. Growth and Pro are free for your first 3 months.</p>
        <div ${note('A launch-offer switch shows what each plan costs now and from month 4, so the \u00a30 headline can\u2019t mislead. The live hero is just the label \u201cTrader pricing\u201d; the headline now leads with the benefit from the live subhead.')}>${segBtns('mk_phase', [['launch', 'First 3 months'], ['later', 'From month 4']], ph, 'Show prices for')}</div>
      </div>
      <div class="mk-plans rv">${plans().map(p => planCard(p, ph)).join('')}</div>
      <p class="mk-plans-foot small muted">No card needed to start. <button type="button" class="link" data-go="site/launch">Starting from scratch? See NICHE Launch${ic('arrow-right')}</button></p>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head split rv"><div><p class="eyebrow">Pricing summary</p><h2 class="d-m">At a <em>glance</em></h2></div><p class="muted" style="max-width:44ch">Every NICHE product on one page, including the done-for-you services and the organiser Event Pass.</p></div>
      <div class="tbl-wrap rv" ${note('Renamed from the live \u201cAt a glance \u2014 pricing summary\u201d. Launch and Event Pass rows now link to their own pages.')}><table class="tbl stack-sm mk-glance">
        <thead><tr><th>Tier</th><th>Price</th><th>Launch offer</th><th>Tagline</th></tr></thead>
        <tbody>${GLANCE.map(([t, p, o, g, tone, go]) => `<tr><td data-l="Tier"><span class="mk-tier"><span class="mk-tdot blk-${tone}" aria-hidden="true"></span><b>${t}</b></span></td><td data-l="Price"><span class="mono">${p}</span></td><td data-l="Launch offer">${N.chip(o === 'No free period' || o === 'One-off service' ? 'plain' : 'ok', o)}</td><td data-l="Tagline">${go ? `<button type="button" class="link" data-go="${go}">${g}${ic('arrow-right')}</button>` : `<span class="ink-2">${g}</span>`}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="small" style="margin-top:14px"><button type="button" class="link" data-go="site/launch">Starting from scratch? See NICHE Launch${ic('arrow-right')}</button></p>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head split rv"><div><p class="eyebrow">Compare plans</p><h2 class="d-m">What you get at every <em>tier</em></h2></div><button type="button" class="btn btn-line btn-sm" data-act="mk_grpall" data-open="${anyOpen}">${anyOpen ? 'Collapse all' : 'Expand all'}</button></div>
      <div class="mk-cmp" data-plan="${cmp.plan}" ${note('The live comparison is one long table that overflows on phones. Grouped, collapsible rows with a sticky header and a plan switcher fit a 375px screen. Also: the live Lite card lists \u201cRenewal reminders\u201d but this table marks them unavailable on Lite. Confirm which is right.')}>
        <div class="mk-cmp-head">
          <div class="mk-cmp-first"><span class="eyebrow mk-desk">Features</span><div class="mk-mob">${segBtns('mk_cmpplan', CMP_PLANS.map(([k, l]) => [k, l]), cmp.plan, 'Plan to show')}</div></div>
          ${CMP_PLANS.map(([k, l, pr]) => `<div class="mk-cmp-col p-${k}"><b>${l}</b><span class="mono">${pr}</span></div>`).join('')}
        </div>
        ${CMP.map(([g, rows], gi) => `<div class="mk-cmp-grp">
          <button type="button" class="mk-cmp-gh" data-act="mk_grp" aria-expanded="${!cmp.closed[gi]}" aria-controls="mk-cg-${gi}" data-g="${gi}">${ic('chevron-down')}<span class="eyebrow">${g}</span><span class="mono">${N.plural(rows.length, 'feature')}</span></button>
          <div class="mk-cmp-gb" id="mk-cg-${gi}" ${cmp.closed[gi] ? 'hidden' : ''}>${rows.map(([f, ...v]) => `<div class="mk-cmp-row"><span class="mk-cmp-f">${esc(f)}</span>${v.map((x, k) => `<span class="p-${CMP_PLANS[k][0]}"><span class="sr">${CMP_PLANS[k][1]}: </span>${cmpCell(x)}</span>`).join('')}</div>`).join('')}</div>
        </div>`).join('')}
      </div>
      <p class="small muted" style="margin-top:14px">NICHE Advance is a managed service, so we run your account for you. <button type="button" class="link" data-act="mk_adv">Apply for Advance</button></p>
    </section>

    <section class="wrap sec-s">
      <div class="mk-faq-wrap rv" ${note('The live pricing page has no FAQ. These answers are proposed wording; confirm the billing and cancellation policy before launch.')}>
        <div class="sec-head"><p class="eyebrow">Questions</p><h2 class="d-m">Billing, <em>simply</em></h2><p class="muted">Anything else? <button type="button" class="link" data-go="site/help">Visit the help centre</button></p></div>
        ${faq(TFAQ)}
      </div>
    </section>

    ${cta({ title: 'Start on Lite. Upgrade when you\u2019re <em>ready.</em>', text: 'Build your passport free today, and try Growth or Pro free for 3 months when you want more.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/register">Start free${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/how-it-works-trader">See how it works</button>` })}`;
  },
});

/* =====================================================================
   5 \u00b7 ORGANISER PRICING
   ===================================================================== */
const calcState = () => S('mk_calc', () => ({ fee: 150, pitches: 20, events: 6 }));
const calcFmt = { fee: v => N.money(v), pitches: v => String(v), events: v => String(v) };
const fillPct = (v, min, max) => ((v - min) / (max - min) * 100).toFixed(1) + '%';
const range = (k, label, min, max, step) => { const v = calcState()[k]; return `<label class="mk-range" for="mk_r_${k}"><span class="mk-range-top"><span>${label}</span><output data-mk-o="${k}" for="mk_r_${k}">${calcFmt[k](v)}</output></span><input type="range" id="mk_r_${k}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}" style="--p:${fillPct(v, min, max)}"><span class="mk-range-sc mono" aria-hidden="true"><span>${calcFmt[k](min)}</span><span>${calcFmt[k](max)}</span></span></label>`; };
const calcNums = () => { const s = calcState(), gross = s.fee * s.pitches * s.events; return { gross, comm: Math.round(gross * 0.08), per: Math.round(s.fee * s.pitches * 0.08), pitch: (s.fee * 0.08).toFixed(2) }; };
N.input.mk_calc = el => {
  const k = el.dataset.k;
  if (!k) return;
  const s = calcState();
  s[k] = Number(el.value);
  el.style.setProperty('--p', fillPct(s[k], Number(el.min), Number(el.max)));
  const o = $(`[data-mk-o="${k}"]`);
  if (o) o.textContent = calcFmt[k](s[k]);
  const c = calcNums();
  ['comm', 'gross', 'per'].forEach(n => N.tween($(`[data-mk-c="${n}"]`), c[n], 450));
  const p = $('[data-mk-c="pitch"]');
  if (p) p.textContent = c.pitch;
};
const INCLUDED = [['search', 'Search compliant traders instantly', 'mint'], ['calendar-plus', 'Post events and receive matched applications', 'lilac'], ['id', 'View full trader passports and documents', 'butter'], ['message', 'Direct messaging with shortlisted traders', 'peach'], ['heart', 'Save favourites and build your roster', 'sky'], ['calendar', 'Booking confirmation & calendar management', 'mint']];
const VS = [
  ['Email every trader for PDFs, then chase the ones who forget', 'Documents arrive with every application, already checked'],
  ['Check expiry dates by hand, one certificate at a time', 'Expiry tracked to the day and flagged before your event'],
  ['Copy details into a spreadsheet and hope it stays current', 'Every applicant in one list, filtered by your rules'],
  ['Reply to each applicant one by one', 'Accept or reject in one click, traders notified automatically'],
  ['No record of who approved what, or why', 'A record of every decision, ready if anyone asks'],
];

N.page('site/pricing-organiser', {
  app: 'site', title: 'Organiser pricing',
  render() {
    const c = calcNums();
    return `<section class="wrap mk-hero">
      <div class="mk-hero-grid">
        <div class="mk-hero-copy rv">
          <p class="eyebrow">Organiser pricing \u00b7 NICHE Event Pass</p>
          <h1 class="d-l">The smarter way to fill your <em>event.</em></h1>
          <p class="mk-sub">Zero paperwork. Book with confidence.</p>
          <p class="lead">NICHE Event Pass is for market managers, festival operators and private hire coordinators. Find, review and book compliant food traders instantly.</p>
          <div class="btn-row"><button type="button" class="btn btn-violet btn-lg" data-go="site/register">Claim your free year${ic('arrow-right')}</button><button type="button" class="btn btn-line btn-lg" data-act="mk_scrollto" data-to="mk-calc">Work out your costs</button></div>
        </div>
        <div class="mk-offer rv" ${note('Year 1 and year 2 sit side by side, so the free year and the 8% commission read as one offer instead of two separate blocks.')}>
          <div class="mk-offer-h"><p class="eyebrow">Launch offer</p><b>NICHE Event Pass</b></div>
          <div class="blk blk-mint"><p class="eyebrow">Year 1</p><p class="mk-offer-n"><span class="num">\u00a30</span><span>for 12 months</span></p><p class="small">Full platform access, no fees, no commission. Completely free for your first year.</p></div>
          <div class="blk blk-lilac"><p class="eyebrow">Year 2 onwards</p><p class="mk-offer-n"><span class="num">8%</span><span>commission</span></p><p class="small">On confirmed pitch fees booked through NICHE. No monthly subscription. No setup fee. You only pay when a booking is confirmed.</p></div>
        </div>
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head rv"><p class="eyebrow">What\u2019s included</p><h2 class="d-m">Everything you need to book <em>well</em></h2></div>
      <ul class="mk-inc rv">${INCLUDED.map(([i, t, tone]) => `<li><span class="mk-i blk-${tone}" aria-hidden="true">${ic(i)}</span><span>${t}</span></li>`).join('')}</ul>
      <div class="btn-row" style="margin-top:24px"><button type="button" class="btn btn-violet btn-lg" data-go="site/register">Claim your free year${ic('arrow-right')}</button></div>
    </section>

    <section class="wrap sec-s" id="mk-calc">
      <div class="blk blk-butter rv" data-input="mk_calc" ${note('Organisers ask what 8% means in pounds. The calculator turns their own pitch fees into a year-2 figure, next to the \u00a30 first year.')}>
        <div class="mk-calc-in">
          <div class="stack" style="--g:22px">
            <div class="stack" style="--g:12px"><p class="eyebrow">Event Pass calculator</p><h2 class="d-m">What does 8% mean for <em>you?</em></h2><p class="lead">Move the sliders to match your events. Year 1 stays free, whatever you book.</p></div>
            ${range('fee', 'Average pitch fee', 20, 1000, 10)}
            ${range('pitches', 'Pitches per event', 1, 80, 1)}
            ${range('events', 'Events per year', 1, 52, 1)}
          </div>
          <div class="mk-calc-out" aria-live="polite">
            <div class="mk-calc-y"><p class="eyebrow">Year 1</p><p class="num mk-big">\u00a30</p><span class="small">Full platform access, no fees, no commission</span></div>
            <div class="mk-calc-y"><p class="eyebrow">Year 2 onwards, at 8%</p><p class="num mk-big">\u00a3<span data-mk-c="comm" data-v="${c.comm}">${c.comm.toLocaleString('en-GB')}</span></p><span class="small">a year, on \u00a3<span data-mk-c="gross" data-v="${c.gross}">${c.gross.toLocaleString('en-GB')}</span> of confirmed pitch fees</span></div>
            <dl class="mk-calc-kv">
              <div><dt>Per event</dt><dd>\u00a3<span data-mk-c="per" data-v="${c.per}">${c.per.toLocaleString('en-GB')}</span></dd></div>
              <div><dt>Per pitch</dt><dd>\u00a3<span data-mk-c="pitch">${c.pitch}</span></dd></div>
              <div><dt>Subscription</dt><dd>\u00a30</dd></div>
              <div><dt>Setup fee</dt><dd>\u00a30</dd></div>
            </dl>
            <p class="xs muted">Estimate only. Commission applies to confirmed pitch fees booked through NICHE.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head rv"><p class="eyebrow">Why switch</p><h2 class="d-m">Spreadsheets and email vs <em>NICHE</em></h2></div>
      <div class="mk-vs rv" role="table" aria-label="Spreadsheets and email compared with NICHE">
        <div class="mk-vs-h" role="row"><div class="old" role="columnheader">${ic('files')}Spreadsheets & email</div><div class="new" role="columnheader">${N.wm('wm-sm on-dark')}</div></div>
        ${VS.map(([o, n]) => `<div class="mk-vs-r" role="row"><div class="old" role="cell"><span class="mk-vs-l">Spreadsheets & email</span>${ic('x')}<span>${o}</span></div><div class="new" role="cell"><span class="mk-vs-l">NICHE</span>${ic('check')}<span>${n}</span></div></div>`).join('')}
      </div>
    </section>

    ${cta({ tone: 'violet', title: 'Your first year is on <em>us.</em>', text: 'Free for 12 months. After that, you only pay when a booking is confirmed.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/register">Claim your free year${ic('arrow-right')}</button><button type="button" class="btn mk-btn-onv btn-lg" data-go="site/how-it-works-organiser">See how it works</button>` })}`;
  },
});

/* =====================================================================
   6 \u00b7 NICHE LAUNCH
   ===================================================================== */
const LSTEPS = [
  { short: 'Your concept', who: 'You', title: 'You tell us your concept, cuisine and goals', text: 'One conversation about what you want to cook, who you want to feed and where you want to trade. It sets the brief for everything that follows.', get: ['Clear brief', 'Target events', 'Launch plan'] },
  { short: 'Registration', who: 'We', title: 'We register your business and sort your compliance', text: 'We register your food business with your council, set up Companies House, and source the compliance documents organisers ask for.', get: ['Council registration', 'Companies House', 'Compliance documents'] },
  { short: 'Brand', who: 'We', title: 'We build your brand: logo, menu, cards', text: 'A full identity that works on a van, a gazebo banner and a phone screen, with a menu that reads from the back of a queue.', get: ['Logo', 'Menu design', 'Business cards'] },
  { short: 'Website', who: 'We', title: 'We build your website', text: 'A mobile-friendly site on your own domain, with your menu, your story and where to find you next.', get: ['Mobile-friendly website', 'Your own domain'] },
  { short: 'Passport', who: 'We', title: 'We build your NICHE Passport', text: 'Every document from step two goes into your Food Trader Passport, checked and ready for organisers to see.', get: ['Food Trader Passport', 'Checked documents'] },
  { short: 'First events', who: 'We', title: 'We apply to your first events', text: 'We shortlist events that suit your concept and submit your first two or three applications for you.', get: ['Event shortlist', '2\u20133 applications submitted'] },
  { short: 'Start trading', who: 'You', title: 'You start trading', text: 'You turn up and cook. Operational and kitchen setup guidance comes with you, and every asset we made is yours.', get: ['Kitchen setup guidance', 'All assets yours'] },
];
const LAUNCH_INC = ['Food business registration with your council', 'All compliance documents sourced', 'Full brand identity (logo & menu)', 'Mobile-friendly website & domain', 'Companies House registration', 'First 2\u20133 event applications submitted', 'Operational & kitchen setup guidance'];
const stepState = () => S('mk_step', () => ({ i: 0 }));
function stepPanel() {
  const i = stepState().i, s = LSTEPS[i];
  return `<div class="mk-path-panel ${s.who === 'You' ? 'you' : 'we'}" role="tabpanel" id="mk-step-panel" aria-labelledby="mk-step-${i}">
    <span class="mk-path-big" aria-hidden="true">${pad(i + 1)}</span>
    <div class="stack" style="--g:12px">
      <span class="chip ${s.who === 'You' ? 'violet' : 'zest'}">${s.who === 'You' ? 'You do this' : 'We do this'}</span>
      <h3 class="d-s">${s.title}</h3>
      <p>${s.text}</p>
      <div class="tags">${s.get.map(g => `<span class="tag">${ic('check')}${g}</span>`).join('')}</div>
    </div>
    <div class="mk-path-nav">
      <span class="mono">Step ${i + 1} of ${LSTEPS.length}</span>
      <div class="row" style="--g:6px"><button type="button" class="icon-btn mk-nav-b" data-act="mk_stepnav" data-d="-1" aria-label="Previous step" ${i ? '' : 'disabled'}>${ic('arrow-left')}</button><button type="button" class="icon-btn mk-nav-b" data-act="mk_stepnav" data-d="1" aria-label="Next step" ${i < LSTEPS.length - 1 ? '' : 'disabled'}>${ic('arrow-right')}</button></div>
    </div>
  </div>`;
}
const stepsNav = () => { const i = stepState().i; return LSTEPS.map((s, k) => `<li role="presentation"><button type="button" role="tab" id="mk-step-${k}" aria-controls="mk-step-panel" aria-selected="${k === i}" class="${k < i ? 'done' : ''}" data-act="mk_step" data-i="${k}"><span class="mk-arch-mk">${pad(k + 1)}</span><span class="mk-path-t">${s.short}</span></button></li>`).join(''); };
function paintSteps() {
  const box = $('[data-mk-path]');
  if (!box) return;
  const i = stepState().i, ol = $('.mk-path-steps', box);
  ol.style.setProperty('--k', i / (LSTEPS.length - 1));
  ol.innerHTML = stepsNav();
  $('[data-mk-panel]', box).innerHTML = stepPanel();
}
function launchForm() {
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(N.TODAY); d.setDate(1); d.setMonth(d.getMonth() + 1 + i); return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); });
  N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">NICHE Launch \u00b7 \u00a31,239 one-off</p><h3>Start your business</h3><p class="muted">Tell us what you want to build. The Launch team replies with next steps and a start date.</p></div>
    <form data-form="mk_launch" class="form-grid">
      ${N.field({ label: 'Your name', id: 'mk_l_name', req: true, attrs: 'autocomplete="name"' })}
      ${N.field({ label: 'Email', id: 'mk_l_email', type: 'email', req: true, attrs: 'autocomplete="email"' })}
      ${N.field({ label: 'Phone', id: 'mk_l_phone', type: 'tel', attrs: 'autocomplete="tel"' })}
      ${N.field({ label: 'Cuisine', id: 'mk_l_cuisine', opts: [['', 'Choose a cuisine'], ...db.tags.cuisines.map(c => [c, c]), ['Other', 'Something else']] })}
      ${N.field({ label: 'Your concept', id: 'mk_l_concept', type: 'textarea', rows: 3, req: true, full: true, ph: 'For example: Keralan dosa from a converted horsebox, aimed at markets and festivals.' })}
      ${N.field({ label: 'When do you want to start trading?', id: 'mk_l_month', opts: months, full: true })}
      <div class="modal-foot full"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-ink btn-sm">Send my enquiry</button></div>
    </form>`);
}

N.page('site/launch', {
  app: 'site', title: 'NICHE Launch',
  render() {
    const i = stepState().i;
    return `<section class="wrap mk-hero">
      <div class="mk-hero-grid">
        <div class="mk-hero-copy rv">
          <p class="eyebrow">NICHE Launch \u00b7 For new food businesses</p>
          <h1 class="d-l">From idea to trading, we build it all for <em>you.</em></h1>
          <p class="lead">Business registration, brand identity, website, compliance and your first event applications. Done in weeks.</p>
          <div class="btn-row"><button type="button" class="btn btn-ink btn-lg" data-act="mk_launch">Start your business${ic('arrow-right')}</button><button type="button" class="btn btn-line btn-lg" data-act="mk_scrollto" data-to="mk-steps">See the seven steps</button></div>
          <ul class="mk-trust"><li>${ic('check', 'ic-sm')}One-off \u00a31,239</li><li>${ic('check', 'ic-sm')}Not a subscription</li><li>${ic('check', 'ic-sm')}All assets yours</li></ul>
        </div>
        <figure class="mk-hero-art rv" aria-hidden="true">
          ${N.art('peach', 'Launch', 'idea to trading', 'arch mk-art-main')}
          <div class="mk-float mk-f1 card"><span class="mk-fl-ic">${ic('palette')}</span><div><b>Brand identity</b><span class="s">Logo, menu and cards</span></div></div>
          <div class="mk-float mk-f2 card"><span class="mk-fl-ic">${ic('globe')}</span><div><b>Website live</b><span class="s">On your own domain</span></div></div>
          <div class="mk-float mk-f3">${N.checked('Passport ready')}</div>
        </figure>
      </div>
    </section>
    ${marquee(['Council registration', 'Companies House', 'Compliance documents', 'Logo', 'Menu', 'Business cards', 'Website', 'Domain', 'NICHE Passport', 'First events'], 56)}

    <section class="wrap sec" id="mk-steps">
      <div class="sec-head rv"><p class="eyebrow">How it works</p><h2 class="d-m">Seven steps from idea to first <em>pitch</em></h2><p class="lead">You do the first and the last. We handle everything in between. Select a step to see what you get.</p></div>
      <div class="mk-path rv" data-mk-path ${note('The live page lists the seven steps as plain text. The path shows who does each step and what you get from it.')}>
        <ol class="mk-path-steps" role="tablist" aria-label="Launch steps" style="--k:${i / (LSTEPS.length - 1)}">${stepsNav()}</ol>
        <div data-mk-panel>${stepPanel()}</div>
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="mk-lo rv" ${note('The live page says \u201cTypical total \u00a3950\u2013\u00a31,100 including third-party costs\u201d, which is lower than the \u00a31,239 fee. Confirm the right figure before launch.')}>
        <div class="blk blk-hedge mk-lo-main">
          <p class="eyebrow">One-off service</p>
          <h2 class="d-m">NICHE <em>Launch</em></h2>
          <p class="mk-lo-d">Everything a new food business needs to go from zero to trading, done for you, start to finish.</p>
          <p class="mk-lo-price"><span class="num">\u00a31,239</span></p>
          <p class="mono mk-lo-sub">Not a subscription \u00b7 All assets yours from day one</p>
          <button type="button" class="btn btn-zest btn-lg" data-act="mk_launch">Start your business${ic('arrow-right')}</button>
        </div>
        <div class="blk blk-peach mk-lo-inc">
          <p class="eyebrow">Includes</p>
          <ul>${LAUNCH_INC.map(t => `<li><span class="mk-kf-i" aria-hidden="true">${ic('check')}</span><span>${t}</span></li>`).join('')}</ul>
          <p class="small mk-lo-fine">Third-party costs (insurance, domain, Companies House fee) are passed through at cost.</p>
        </div>
      </div>
    </section>

    ${cta({ title: 'Ready when <em>you</em> are.', text: 'Already trading? Build your passport yourself on Lite, free forever.', btns: `<button type="button" class="btn btn-zest btn-lg" data-act="mk_launch">Start your business${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/pricing-trader">Compare trader plans</button>` })}`;
  },
});

/* =====================================================================
   7 \u00b7 WHAT IS THE FOOD TRADER PASSPORT?
   ===================================================================== */
const LEVELS = {
  Business: { tone: 'mint', icon: 'building', who: 'AG Foods Ltd', where: 'Held once and shared by every unit you run.' },
  Unit: { tone: 'butter', icon: 'truck', who: 'Alice Street Truck', where: 'One set per physical unit, so a second van gets its own. Fire safety records sit here too.' },
  Person: { tone: 'lilac', icon: 'user', who: 'Alice Green', where: 'Follows the person, so training moves with them between units.' },
};
const lvlState = () => S('mk_lvl', () => ({ v: 'Business' }));
const docsAt = lv => db.docTypes.filter(d => d.level === lv && d.status === 'active');
function lvlPanel() {
  const v = lvlState().v, L = LEVELS[v], docs = docsAt(v);
  return `<div class="mk-lv-panel" aria-live="polite">
    <div class="row" style="--g:12px"><span class="mk-i blk-${L.tone}" aria-hidden="true">${ic(L.icon)}</span><div class="li-main"><p class="eyebrow">Attached at the ${v.toLowerCase()} \u00b7 ${esc(L.who)}</p><b class="h3">${N.plural(docs.length, 'document')}</b></div></div>
    <p class="muted">${L.where}</p>
    <ul class="mk-lv-docs">${docs.map(d => `<li><span class="mk-doc-ic" aria-hidden="true">${ic('file')}</span><div class="mk-doc-m"><b>${esc(d.name)}</b><span>${esc(d.desc)}</span></div>${d.expiry ? N.chip('info', 'Tracked to the day') : N.chip('plain', 'No expiry')}</li>`).join('')}</ul>
  </div>`;
}
function lvlDiagram() {
  const v = lvlState().v, cnt = lv => docsAt(lv).length;
  const arch = lv => `<button type="button" class="mk-lv-arch ${lv.toLowerCase()}" data-act="mk_level" data-lv="${lv}" aria-pressed="${v === lv}">${ic(LEVELS[lv].icon, 'ic-lg')}<b>${lv}</b><span>${esc(LEVELS[lv].who)}</span><span class="count">${cnt(lv)}</span></button>`;
  return `<div class="mk-nest ${v === 'Business' ? 'sel' : ''}">
    <button type="button" class="mk-lv-biz" data-act="mk_level" data-lv="Business" aria-pressed="${v === 'Business'}">${ic('building')}<span><b>Business</b> \u00b7 ${esc(LEVELS.Business.who)}</span><span class="count">${cnt('Business')}</span></button>
    <div class="mk-nest-in">${arch('Unit')}${arch('Person')}</div>
  </div>`;
}

N.page('site/what-is-passport', {
  app: 'site', title: 'What is the Food Trader Passport?',
  render() {
    const points = [
      ['mint', 'Everything an organiser asks for', 'Identity, trading units, cuisine, service radius and every compliance document, held as structured information rather than loose attachments.', ''],
      ['butter', 'Documents attach where they belong', 'Gas safety, electrical and fire records sit at each physical unit. Insurance and registration sit at the business. Hygiene training sits with the person.', ''],
      ['lilac', 'Expiry tracking that warns you early', 'Hard-expiry documents are tracked to the day. Review-date items prompt you before they go stale, so you never lose a pitch to a lapsed certificate.', `<div class="mk-tl" aria-hidden="true"><span class="ok">Valid</span><span class="warn">Reminder</span><span class="risk">Expires</span></div>`],
    ];
    return `<section class="wrap mk-hero">
      <div class="mk-hero-grid">
        <div class="mk-hero-copy rv">
          <p class="eyebrow">The Food Trader Passport</p>
          <h1 class="d-l">Trust, captured once, and kept <em>current.</em></h1>
          <p class="lead">One structured profile holds everything an organiser asks for. Keep it up to date once, and every application you send carries it.</p>
          <div class="btn-row"><button type="button" class="btn btn-hedge btn-lg" data-go="site/register">Build your passport${ic('arrow-right')}</button><button type="button" class="btn btn-line btn-lg" data-go="site/passport">See a live passport</button></div>
        </div>
        <figure class="mk-pp-stage rv" ${note('The hero uses the same passport component as the trader app, so the page shows the real product instead of an illustration.')}>
          <div class="stamp hit mk-pp-seal" aria-hidden="true">${N.stamp('mk-pp-st')}</div>
          ${N.passportCard('ag', { stamp: false })}
          <span class="mk-pp-chip">${ic('clock')}Expiry tracked to the day</span>
        </figure>
      </div>
    </section>

    <section class="wrap sec-s">
      <ol class="mk-points rv">${points.map(([tone, h, t, x], i) => `<li class="mk-point blk-${tone}"><span class="mk-n">${i + 1}</span><h2 class="h3">${h}</h2><p>${t}</p>${x}</li>`).join('')}</ol>
    </section>

    <section class="wrap sec">
      <div class="sec-head rv"><p class="eyebrow">Three levels</p><h2 class="d-m">Every document has a <em>home</em></h2><p class="lead">Select a level to see which documents attach there. Upload once at the right level and it covers everything underneath.</p></div>
      <div class="mk-lv-wrap rv" ${note('The live page explains business, unit and person levels in a paragraph. Selecting a level shows exactly which document types attach there, straight from the admin document list.')}>
        <div data-mk-lvdiag>${lvlDiagram()}</div>
        <div data-mk-lvpanel>${lvlPanel()}</div>
      </div>
    </section>

    ${cta({ title: 'Build it once. Use it <em>everywhere.</em>', text: 'Your passport is free on every plan.', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/register">Build your passport${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/passport">See a live passport</button>` })}`;
  },
});

/* =====================================================================
   8 \u00b7 ABOUT
   ===================================================================== */
const QUOTE = 'A niche is more than a space. It\u2019s the point where identity, purpose and environment';
const PILLARS = [
  { k: 'identity', label: 'Identity', tone: 'mint', title: 'Who you are as a food business', text: 'The Food Trader Passport is not just a document folder. It is a trader\u2019s professional profile: structured, portable and shareable. Who you are as a food business.',
    vis: () => `<div class="mk-mini">${N.tav('mw', 'lg')}<div class="li-main"><b>${esc(db.traders.mw.biz)}</b><span>${esc(db.traders.mw.food)} \u00b7 ${esc(db.traders.mw.city)} \u00b7 since ${db.traders.mw.since}</span></div></div><div class="tags">${db.traders.mw.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}<span class="tag">${ic('link')}Shareable link</span></div>` },
  { k: 'validation', label: 'Validation', tone: 'sky', title: 'What\u2019s true today', text: 'Every document is checked for presence, completeness and date before an organiser relies on it. Expiry is tracked to the day, so a certificate that lapses mid-season is flagged before it costs anyone a pitch.',
    vis: () => `${N.reqList([{ st: 'ok', label: 'Present and readable', val: '7 documents' }, { st: 'ok', label: 'Complete', val: 'All fields' }, { st: 'warn', label: 'In date', val: 'Gas renews 21 Oct' }])}<div>${N.checked()}</div>` },
  { k: 'match', label: 'Match', tone: 'butter', title: 'Where you fit', text: 'Each event sets its own requirements: hygiene rating, insurance cover, gas and power. NICHE measures every passport against them and shows a readiness score, so traders apply where they qualify and organisers see who fits at a glance.',
    vis: () => `<div class="row" style="--g:16px">${N.ring(N.matchScore('mw', 'camden'), 'violet', 'match')}<div class="li-main"><b>Masala Wheels \u00d7 Camden Night Market</b><span>Every requirement met</span></div></div>${N.reqList(N.evalChecks('mw', 'camden').slice(0, 3))}` },
  { k: 'flow', label: 'Flow', tone: 'peach', title: 'From application to pitch', text: 'Apply, review, decide, trade. Every step happens in one place, and every decision is recorded with who made it and why. No lost emails, and no guessing where an application stands.',
    vis: () => `${N.stepper(['Apply', 'Review', 'Decide', 'Trade'], 3)}<div class="mk-rec">${ic('history')}<span><b>Approved by Olivia Reed \u00b7 18 Sep</b><br>All documents valid on event day.</span></div>` },
];
const atabState = () => S('mk_atab', () => ({ k: 'identity' }));
function atabPanel() {
  const k = atabState().k, i = PILLARS.findIndex(p => p.k === k), p = PILLARS[i];
  return `<div class="mk-atab" role="tabpanel" id="mk-atab-panel" aria-labelledby="mk-atab-${p.k}">
    <div class="stack" style="--g:14px"><span class="mk-path-big" aria-hidden="true">${pad(i + 1)}</span><h3 class="d-s">${p.title}</h3><p class="lead">${p.text}</p></div>
    <div class="mk-atab-vis blk-${p.tone}">${p.vis()}</div>
  </div>`;
}
const atabs = () => `<div class="tabs mk-atabs" role="tablist" aria-label="How NICHE shows up in the platform">${PILLARS.map((p, i) => `<button type="button" role="tab" id="mk-atab-${p.k}" aria-controls="mk-atab-panel" aria-selected="${p.k === atabState().k}" data-act="mk_atab" data-k="${p.k}"><span class="n">${pad(i + 1)}</span>${p.label}</button>`).join('')}</div>`;

N.page('site/about', {
  app: 'site', title: 'About us',
  render() {
    const words = QUOTE.split(' ');
    return `<section class="wrap mk-hero">
      <div class="mk-hero-grid">
        <div class="mk-hero-copy rv">
          <p class="eyebrow">About NICHE</p>
          <h1 class="d-l">What NICHE really <em>means.</em></h1>
          <p class="lead">Most people read \u201cniche\u201d as smallness: a niche market, a niche product. That is not what we mean.</p>
          <p class="mk-body">A niche is the point of perfect fit, where identity, purpose and environment align. In nature, every species thrives when it finds its niche. NICHE is built on the same idea: helping traders and organisers find the right fit.</p>
        </div>
        <figure class="mk-dict rv" aria-label="Dictionary definition of niche">
          <p class="mk-dict-w">niche</p>
          <p class="mono">/ni\u02d0\u0283/ \u00b7 noun</p>
          <ol>
            <li><span class="mono">1</span><span>A shallow recess in a wall, often arched, made to hold something that fits it exactly.</span></li>
            <li><span class="mono">2</span><span>In ecology, the place where a species fits its environment and thrives.</span></li>
            <li class="ours"><span class="mono">3</span><span>The point of perfect fit. <b>Our meaning.</b></span></li>
          </ol>
          <span class="mk-dict-dots" aria-hidden="true"><i></i><i></i></span>
        </figure>
      </div>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head rv"><p class="eyebrow">Why it fits our business</p><h2 class="d-m">Built to find the right <em>fit</em></h2></div>
      <div class="mk-why rv">
        <article class="blk blk-mint"><span class="mk-col-ic" aria-hidden="true">${ic('truck', 'ic-lg')}</span><h3 class="h3">For traders</h3><p>Every food trader has a natural market position: a cuisine type, a setup style, an event category, a trading radius. NICHE helps them find the events where they belong, with a structured compliance profile that shows they are ready.</p></article>
        <article class="blk blk-lilac"><span class="mk-col-ic" aria-hidden="true">${ic('calendar', 'ic-lg')}</span><h3 class="h3">For organisers</h3><p>Every event has specific requirements: venue type, food categories, compliance standards, experience level. NICHE helps organisers find the traders who fit precisely, without sifting through incomplete applications.</p></article>
        <article class="blk blk-butter"><span class="mk-col-ic" aria-hidden="true">${ic('arch', 'ic-lg')}</span><h3 class="h3">For the platform</h3><p>NICHE is not a general marketplace. It is a fit engine that connects the right traders with the right opportunities through structured compliance, eligibility and transparent matching.</p></article>
      </div>
    </section>

    <section class="wrap sec mk-quote-sec" ${note('A scroll-driven statement in the Umano style gives the brand idea one calm moment instead of another card grid. Words fill in as you scroll.')}>
      <p class="eyebrow">What we believe a niche is</p>
      <blockquote class="mk-quote" data-mk-words>${words.map(w => `<span class="w">${esc(w)}</span>`).join(' ')} <em class="w">align.</em></blockquote>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head rv"><p class="eyebrow">How this shows up in the platform</p><h2 class="d-m">Four ideas, built into every <em>screen</em></h2></div>
      <div class="rv" data-mk-atabs ${note('The four platform ideas sit in tabs, each with a working visual built from the prototype\u2019s real rules, instead of four identical text cards.')}>${atabs()}<div data-mk-atab>${atabPanel()}</div></div>
    </section>

    <section class="wrap sec-s">
      <div class="sec-head rv"><p class="eyebrow">What we believe</p></div>
      <ul class="mk-beliefs rv">
        <li><span class="arch-dot g" aria-hidden="true"></span><span>Every trader deserves to trade where they naturally <em>thrive.</em></span></li>
        <li><span class="arch-dot v" aria-hidden="true"></span><span>Every organiser deserves applicants who arrive with their information in <em>order.</em></span></li>
        <li><span class="arch-dot z" aria-hidden="true"></span><span>Every compliance record built on NICHE builds toward a clearer market position, faster access and better <em>decisions.</em></span></li>
      </ul>
    </section>

    ${cta({ title: 'Because when people find their rightful niche, everything just <em>works.</em>', btns: `<button type="button" class="btn btn-zest btn-lg" data-go="site/register">Find your fit${ic('arrow-right')}</button><button type="button" class="btn btn-onhedge btn-lg" data-go="site/events">Browse events</button>` })}`;
  },
  after(root) {
    const q = $('[data-mk-words]', root);
    if (!q || N.reduce) return;
    q.classList.add('mk-scrub');
    live.words = { el: q, spans: $$('.w', q), n: -1 };
    tick();
  },
});

/* =====================================================================
   ACTIONS & FORMS
   ===================================================================== */
Object.assign(N.act, {
  mk_scrollto(el) { const t = document.getElementById(el.dataset.to); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - 110, behavior: behave() }); },
  mk_chap(el) {
    const t = document.getElementById('mk-ch-' + el.dataset.ch), bar = el.closest('.mk-chapbar');
    if (!t || !bar) return;
    scrollTo({ top: t.getBoundingClientRect().top + scrollY - stickyOffset(bar) - 16, behavior: behave() });
  },

  /* trader how it works */
  mk_tag(el) {
    const s = profState(), t = el.dataset.t, i = s.tags.indexOf(t);
    if (i >= 0) s.tags.splice(i, 1);
    else if (s.tags.length >= 3) { N.toast('Pick up to 3 tags. Remove one first.', { icon: 'info' }); return; }
    else s.tags.push(t);
    el.setAttribute('aria-pressed', String(i < 0));
    paintProf('tags');
  },
  mk_upload() {
    const s = docsState();
    if (s.gas !== 'missing') return;
    s.gas = 'uploading';
    paintDocs();
    setTimeout(() => { if (s.gas !== 'uploading') return; s.gas = 'pending'; paintDocs(); if ($('[data-mk-docs]')) N.toast('Gas Safety Certificate uploaded. The Niche team reviews it next.', { icon: 'upload' }); }, N.reduce ? 0 : 1400);
  },
  mk_review() {
    const s = docsState(), n = (s.pli === 'pending') + (s.gas === 'pending');
    if (!n) return;
    if (s.pli === 'pending') s.pli = 'approved';
    if (s.gas === 'pending') s.gas = 'approved';
    paintDocs();
    N.toast(`The Niche team approved ${N.plural(n, 'document')}. In real life this usually takes one working day.`);
  },
  mk_docreset() { const s = docsState(); s.pli = 'pending'; s.gas = 'missing'; paintDocs(); },
  mk_apply(el) {
    const s = discState(), id = el.dataset.id, e = db.events[id], a = s.applied[id];
    if (a && a.st === 'pending') { delete s.applied[id]; paintDisc(); paintDash(); N.toast(`Application to ${esc(e.name)} withdrawn.`, { icon: 'info' }); return; }
    if (a) return;
    s.applied[id] = { st: 'pending' };
    paintDisc(); paintDash();
    N.toast(`Applied to <b>${esc(e.name)}</b>. Your passport went with it.`);
    setTimeout(() => {
      const cur = discState().applied[id];
      if (!cur || cur.st !== 'pending') return;
      cur.st = 'approved';
      cur.pitch = String(2 + Object.values(s.applied).filter(x => x.st === 'approved').length * 3);
      paintDisc(); paintDash();
      if ($('[data-mk-disc]')) N.toast(`${esc(N.orgName(id))} approved you for <b>${esc(e.name)}</b>. Pitch ${cur.pitch}.`, { icon: 'bell' });
    }, N.reduce ? 1200 : 2600);
  },
  mk_discreset() {
    const s = discState();
    s.q = s.loc = s.when = s.cui = '';
    $$('.mk-disc-ctl [data-k]').forEach(c => { c.value = ''; });
    paintDisc();
  },
  mk_dash(el) { dashState().f = el.dataset.v; paintDash(); },

  /* organiser how it works */
  mk_cap(el) {
    const s = cfgState(), n = s.cap + Number(el.dataset.d);
    if (n < BOOKED) { N.toast(`${BOOKED} traders are already approved, so capacity can\u2019t go below ${BOOKED}.`, { icon: 'info' }); return; }
    if (n > 40) { N.toast('This demo stops at 40 pitches.', { icon: 'info' }); return; }
    s.cap = n;
    paintCfg();
  },
  mk_cmpl(el) { cmplState().v = el.dataset.v; pressOnly(el, 'button'); const b = $('[data-mk-cmpl]'); if (b) b.innerHTML = cmplInner(); },
  mk_decide(el) { revState().d = el.dataset.d; if (N.drawerOpen()) N.closeDrawer(); paintRev(true); },
  mk_undo() { revState().d = ''; paintRev(true); N.toast('Decision undone. The Burger Boys are back in your queue.', { icon: 'refresh' }); },
  mk_pp() {
    N.openDrawer(`<div class="dr-head">${N.av('BB', 'peach', 'lg')}<div class="dr-ti"><h3>The Burger Boys</h3><p>Street food \u00b7 Leeds \u00b7 trading since 2019</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
      <div class="dr-body">
        <div class="row between">${N.checked()}<span class="mono muted">Passport NCH-26-0419</span></div>
        <div class="blk blk-mint mk-dr-fhrs">${N.fhrs(5)}</div>
        <div><p class="dr-h">Trading unit</p>${N.kv([['Unit', '3 \u00d7 3 m gazebo'], ['Power', '16A'], ['Cooking', 'LPG, 2 burners'], ['Staff on the day', '3']])}</div>
        <div><p class="dr-h">Documents</p>${N.reqList([{ st: 'ok', label: 'Public Liability Insurance', val: '\u00a35m \u00b7 to 14 Mar 2027' }, { st: 'ok', label: 'Food Hygiene rating', val: '5 \u00b7 FSA register' }, { st: 'ok', label: 'Gas Safety Certificate', val: 'To 2 Feb 2027' }, { st: 'ok', label: 'Allergen information', val: 'Updated Sep 2026' }, { st: 'ok', label: 'Level 2 Food Hygiene', val: '3 staff' }])}</div>
        <p class="small muted">Checked means present, complete and in date, and matched to public records where we can. Your own due diligence still applies.</p>
      </div>
      <div class="dr-foot"><div class="btn-row"><button type="button" class="btn btn-danger-line" data-act="mk_decide" data-d="reject">Reject</button><button type="button" class="btn btn-hedge" data-act="mk_decide" data-d="accept">${ic('check')}Accept</button></div></div>`);
  },
  mk_otab(el) { odashState().t = el.dataset.k; paintOdash(); const b = $(`[data-act="mk_otab"][data-k="${el.dataset.k}"]`); if (b) b.focus({ preventScroll: true }); },
  mk_demo() {
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">For organisers</p><h3>Book a demo</h3><p class="muted">Tell us about your events and we\u2019ll walk you through Niche with your own line-up in mind.</p></div>
      <form data-form="mk_demo" class="form-grid">
        ${N.field({ label: 'Your name', id: 'mk_d_name', req: true, attrs: 'autocomplete="name"' })}
        ${N.field({ label: 'Work email', id: 'mk_d_email', type: 'email', req: true, attrs: 'autocomplete="email"' })}
        ${N.field({ label: 'Organisation', id: 'mk_d_org', req: true, attrs: 'autocomplete="organization"' })}
        ${N.field({ label: 'Events a year', id: 'mk_d_n', opts: ['1\u20135', '6\u201320', '21\u201350', 'More than 50'] })}
        ${N.field({ label: 'What would you like to see?', id: 'mk_d_msg', type: 'textarea', rows: 3, full: true, ph: 'For example: how applications arrive, or how insurance is checked.' })}
        <div class="modal-foot full"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-violet btn-sm">Request a demo</button></div>
      </form>`);
  },

  /* verification */
  mk_runpick(el) { clearTimeout(runTimer); const s = runState(); s.pick = el.dataset.v; s.i = -1; s.done = false; pressOnly(el, 'button'); paintRun(); },
  mk_run() { clearTimeout(runTimer); const s = runState(); s.i = 0; s.done = false; paintRun(); runTimer = setTimeout(runNext, N.reduce ? 0 : 900); },

  /* trader pricing */
  mk_phase(el) {
    const s = S('mk_price', () => ({ phase: 'launch' }));
    s.phase = el.dataset.v;
    pressOnly(el, 'button');
    plans().forEach(p => { N.tween($(`[data-mk-price="${p.id}"]`), priceNow(p, s.phase), 500); const sub = $(`[data-mk-sub="${p.id}"]`); if (sub) sub.textContent = priceSub(p, s.phase); });
  },
  mk_plan(el) {
    const p = plans().find(x => x.id === el.dataset.id);
    if (!p) return;
    N.state.mk_choice = p.id;
    const sum = p.then ? `Free for 3 months, then \u00a3${p.then} a month. Change or cancel any time.` : 'Free forever. Build your passport and start applying today.';
    N.openModal(`<div class="stack" style="--g:10px"><p class="eyebrow">You picked</p><h3>NICHE ${esc(p.name)}</h3><p class="muted">${sum}</p></div>
      <ul class="mk-modal-list">${p.features.filter(f => !/plus:$/.test(f)).slice(0, 4).map(f => `<li>${ic('check')}<span>${esc(f)}</span></li>`).join('')}</ul>
      <div class="banner info">${ic('info')}<span>No card needed to start. You choose your plan again when you create your account.</span></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Keep comparing</button><button type="button" class="btn btn-violet btn-sm" data-go="site/register">Create my account${ic('arrow-right')}</button></div>`);
  },
  mk_adv() {
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">NICHE Advance \u00b7 \u00a3239/month</p><h3>Apply for Advance</h3><p class="muted">A fully managed service for established food traders. Tell us about your business and what you\u2019d like us to take on.</p></div>
      <form data-form="mk_adv" class="form-grid">
        ${N.field({ label: 'Your name', id: 'mk_a_name', req: true, attrs: 'autocomplete="name"' })}
        ${N.field({ label: 'Business name', id: 'mk_a_biz', req: true, attrs: 'autocomplete="organization"' })}
        ${N.field({ label: 'Email', id: 'mk_a_email', type: 'email', req: true, attrs: 'autocomplete="email"' })}
        ${N.field({ label: 'Phone', id: 'mk_a_phone', type: 'tel', attrs: 'autocomplete="tel"' })}
        ${N.field({ label: 'Events you trade a year', id: 'mk_a_events', opts: ['Fewer than 10', '10\u201325', '26\u201350', 'More than 50'], full: true })}
        <fieldset class="full mk-fs"><legend class="lbl">What should we take on?</legend><div class="mk-checks">${['Finding events', 'Completing applications', 'Social media', 'Organiser conversations', 'Document renewals'].map((t, i) => N.checkbox('mk_a_t' + i, esc(t), true)).join('')}</div></fieldset>
        <p class="xs muted full">15% commission on off-platform bookings. Extra applications at \u00a312 each.</p>
        <div class="modal-foot full"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-hedge btn-sm">Send my application</button></div>
      </form>`);
  },
  mk_grp(el) {
    const g = el.dataset.g, open = el.getAttribute('aria-expanded') !== 'true', body = document.getElementById(el.getAttribute('aria-controls'));
    const cmp = S('mk_cmp', () => ({ plan: 'growth', closed: {} }));
    el.setAttribute('aria-expanded', String(open));
    if (body) body.hidden = !open;
    cmp.closed[g] = !open;
    const all = $('[data-act="mk_grpall"]'), anyOpen = $$('.mk-cmp-gh').some(b => b.getAttribute('aria-expanded') === 'true');
    if (all) { all.dataset.open = String(anyOpen); all.textContent = anyOpen ? 'Collapse all' : 'Expand all'; }
  },
  mk_grpall(el) {
    const open = el.dataset.open !== 'true', cmp = S('mk_cmp', () => ({ plan: 'growth', closed: {} }));
    $$('.mk-cmp-gh').forEach(b => { b.setAttribute('aria-expanded', String(open)); const body = document.getElementById(b.getAttribute('aria-controls')); if (body) body.hidden = !open; cmp.closed[b.dataset.g] = !open; });
    el.dataset.open = String(open);
    el.textContent = open ? 'Collapse all' : 'Expand all';
  },
  mk_cmpplan(el) {
    S('mk_cmp', () => ({ plan: 'growth', closed: {} })).plan = el.dataset.v;
    pressOnly(el, 'button');
    const box = el.closest('.mk-cmp');
    if (box) box.dataset.plan = el.dataset.v;
  },

  /* launch */
  mk_step(el) { stepState().i = Number(el.dataset.i); paintSteps(); const b = $(`#mk-step-${el.dataset.i}`); if (b) b.focus({ preventScroll: true }); },
  mk_stepnav(el) {
    const s = stepState(), n = s.i + Number(el.dataset.d);
    if (n < 0 || n >= LSTEPS.length) return;
    s.i = n;
    paintSteps();
    const b = $(`.mk-path-nav [data-d="${el.dataset.d}"]`);
    if (b && !b.disabled) b.focus({ preventScroll: true }); else { const t = $(`#mk-step-${n}`); if (t) t.focus({ preventScroll: true }); }
  },
  mk_launch() { launchForm(); },

  /* passport */
  mk_level(el) {
    lvlState().v = el.dataset.lv;
    const d = $('[data-mk-lvdiag]'), p = $('[data-mk-lvpanel]');
    if (d) d.innerHTML = lvlDiagram();
    if (p) p.innerHTML = lvlPanel();
    const b = $(`[data-mk-lvdiag] [data-lv="${el.dataset.lv}"]`);
    if (b) b.focus({ preventScroll: true });
  },

  /* about */
  mk_atab(el) {
    atabState().k = el.dataset.k;
    const box = $('[data-mk-atabs]');
    if (!box) return;
    $$('[role="tab"]', box).forEach(b => b.setAttribute('aria-selected', String(b === el)));
    $('[data-mk-atab]', box).innerHTML = atabPanel();
  },
});

N.forms.mk_demo = (f, d) => N.openModal(sent(`Thanks, ${esc(d.mk_d_name || 'there')}.`, `In the live product the Niche team would email ${esc(d.mk_d_email)} to book a time for ${esc(d.mk_d_org || 'your team')}.`));
N.forms.mk_adv = (f, d) => N.openModal(sent(`Application received, ${esc(d.mk_a_name || 'there')}.`, `In the live product the Advance team would call to talk through what ${esc(d.mk_a_biz || 'your business')} needs.`));
N.forms.mk_launch = (f, d) => N.openModal(sent(`Thanks, ${esc(d.mk_l_name || 'there')}.`, `In the live product the Launch team would reply to ${esc(d.mk_l_email)} about starting in ${esc(d.mk_l_month)}.`));
})();
