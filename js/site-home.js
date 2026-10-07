/* =====================================================================
   Homepage + 404
   ===================================================================== */
(() => {
const { db, ic, esc } = N;
const H = N.state.home = N.state.home || { side: 'trader', demoApproved: {}, sent: false, elTab: 'eligible', elQ: '', invited: {} };

/* readiness calculator (trader) and requirement builder (organiser) */
const RC = [
  { id: 'fhrs', label: 'Food hygiene rating', short: 'hygiene rating', share: .97, w: 25, on: true },
  { id: 'pli', label: 'Public liability insurance', short: 'public liability insurance', share: .95, w: 25, on: true },
  { id: 'fbr', label: 'Food business registration', short: 'food business registration', share: .5, w: 10, on: true },
  { id: 'allergen', label: 'Allergen information', short: 'allergen information', share: .7, w: 15, on: false },
  { id: 'l2', label: 'Level 2/3 hygiene certificate', short: 'Level 2/3 certificate', share: .6, w: 15, on: false },
  { id: 'gas', label: 'Gas Safety Certificate', short: 'Gas Safety Certificate', share: .45, w: 10, on: false },
];
const TOTAL_EVENTS = 312;
const RB = { fhrs: 4, pli: 5, gas: true, allergen: true, cuisine: new Set() };
const CUIS = { 'Street food': { share: .46, ids: ['ag', 'mw', 'tl', 'st', 'tb', 'fs', 'bb', 'cs', 'bs'] }, 'Plant-based': { share: .14, ids: ['gb', 'fs', 'kb'] }, 'Desserts': { share: .12, ids: ['gs', 'cr'] }, 'Bakery': { share: .09, ids: ['wo'] }, 'Coffee': { share: .08, ids: ['jc', 'cs'] } };
const F_FHRS = { 3: .99, 4: .93, 5: .78 }, F_PLI = { 2: 1, 5: .84, 10: .31 };

const DEMO = [
  { id: 'd1', av: 'SB', tone: 'peach', name: "Smokey's BBQ", when: 'Applied 2 hours ago', p: 95 },
  { id: 'd2', av: 'MW', tone: 'butter', name: 'Masala Wheels', when: 'Applied 5 hours ago', p: 98 },
  { id: 'd3', av: 'TL', tone: 'lilac', name: 'Taco Loco', when: 'Applied yesterday', p: 84, miss: '£2m cover' },
];

const HERO = {
  trader: { title: 'One passport.<br>Every <em>event.</em>', sub: 'Upload your hygiene rating, insurance and certificates once. NICHE keeps them current and sends them to any organiser in one tap.', cta: ['Create my passport', 'site/register'], cta2: ['Find events', 'site/events'], fine: 'Free for 3 months, then one flat price. No per-application fees.' },
  org: { title: 'Every trader,<br><em>already</em> checked.', sub: 'Set your requirements once. Every applicant arrives checked against them, with a readiness score and a record of your decision.', cta: ['List my event', 'org/create-event'], cta2: ['See the organiser app', 'org/dashboard'], fine: 'Free for 12 months, then pay only on confirmed bookings.' },
};
function hero() {
  const h = HERO[H.side], T = H.side === 'trader';
  return `<section class="hx" id="hx" data-side="${H.side}">
    <div class="hx-panel" data-note="The hero is a working tool. Traders see how many events they could apply to today; organisers see how many traders already meet their rules. The switch recolours the panel: zest for traders, lilac for organisers.">
      <span class="hx-arch" aria-hidden="true"></span>
      <div class="hx-copy">
        <div class="hx-switch" role="tablist" aria-label="Choose your side">
          <button type="button" role="tab" data-act="hm_side" data-s="trader" aria-selected="${T}">I'm a trader</button>
          <button type="button" role="tab" data-act="hm_side" data-s="org" aria-selected="${!T}">I'm an organiser</button>
          <span class="hx-thumb" aria-hidden="true"></span>
        </div>
        <h1 class="hx-title" id="hxTitle">${h.title}</h1>
        <p class="hx-sub" id="hxSub">${h.sub}</p>
        <div class="btn-row hx-ctas"><button type="button" class="btn btn-lg hx-btn" id="hxCta" data-go="${h.cta[1]}">${h.cta[0]}</button><button type="button" class="btn btn-lg hx-btn-line" id="hxCta2" data-go="${h.cta2[1]}">${h.cta2[0]}</button></div>
        <p class="hx-fine" id="hxFine">${h.fine}</p>
      </div>
      <div class="hx-tools">
        <div class="hx-tool ${T ? '' : 'off'}" id="hxT" ${T ? '' : 'inert aria-hidden="true"'}>
          <div class="hx-head"><span class="eyebrow">Readiness check</span><span class="sample">Sample figures</span></div>
          <div class="hx-out">${N.ring(0, '', 'ready')}<div class="stack" style="--g:2px"><span class="l">You could apply to</span><span class="num" id="hmEvents">0</span><span class="l">events on NICHE today</span></div></div>
          <p class="hx-q">What do you already have?</p>
          <div class="hx-checks">${RC.map(r => `<label class="check"><input type="checkbox" data-change="hm_rc" data-rc="${r.id}" ${r.on ? 'checked' : ''}><span class="box">${ic('check')}</span><span>${r.label}</span><span class="pct">${Math.round(r.share * 100)}% of events</span></label>`).join('')}</div>
          <div class="hx-next" id="hmNext"></div>
          <button type="button" class="btn btn-ink btn-block" data-go="site/register">Build my passport</button>
        </div>
        <div class="hx-tool ${T ? 'off' : ''}" id="hxO" ${T ? 'inert aria-hidden="true"' : ''}>
          <div class="hx-head"><span class="eyebrow">Requirement builder</span><span class="sample">Sample figures</span></div>
          <div class="hx-fld"><span>Food hygiene rating</span>${N.seg('hm_fhrs', [[3, '3 or above'], [4, '4 or above'], [5, '5 only']], RB.fhrs)}</div>
          <div class="hx-fld"><span>Public liability cover</span>${N.seg('hm_pli', [[2, '£2m'], [5, '£5m'], [10, '£10m']], RB.pli)}</div>
          <div class="row" style="--g:22px">${N.toggle('hmGas', 'Gas Safety', RB.gas, 'data-change="hm_rb"')}${N.toggle('hmAll', 'Allergen info', RB.allergen, 'data-change="hm_rb"')}</div>
          <div class="hx-fld"><span>Looking for</span><div class="cz">${Object.keys(CUIS).map(c => `<button type="button" data-act="hm_cz" data-c="${c}" aria-pressed="${RB.cuisine.has(c)}">${c}</button>`).join('')}</div></div>
          <div class="hx-res"><span class="num" id="hmCount">0</span><span class="l">traders on NICHE already meet these requirements</span></div>
          <div class="hx-match" id="hmList"></div>
          <button type="button" class="btn btn-ink btn-block" data-go="org/create-event">List my event, free</button>
        </div>
      </div>
    </div>
  </section>
  <div class="h-types marquee" aria-hidden="true"><div class="mq" style="--mq-dur:60s">${[...Array(2)].map(() => ['Street food markets', 'Music festivals', 'Christmas markets', 'Wedding fairs', 'Food truck rallies', 'Night markets', 'Charity galas', 'Pop-up kitchens', 'Corporate events', 'Seasonal markets'].map(w => `<span>${w}</span>`).join('')).join('')}</div></div>`;
}

function pain() {
  const a = ['Chasing PDFs over email', 'Insurance that expired yesterday', 'The same certificate, sent 12 times', 'Applications with missing documents', 'Rebuilding your profile for every event'];
  const b = ['Gas certificates nobody checked', 'No record of why you said no', 'Allergen info on a napkin', 'Spreadsheets of trader contacts', 'A pitch lost to one lapsed document'];
  const row = (list, rev) => `<div class="marquee"><div class="mq ${rev ? 'rev' : ''}" style="--mq-dur:${rev ? 52 : 46}s">${[...list, ...list].map(t => `<span class="pain-card"><i>${ic('x')}</i>${t}</span>`).join('')}</div></div>`;
  return `<section class="sec" style="padding-bottom:clamp(40px,6vw,80px)" data-note="The live hero said 'We fix that' inside a scroll animation. Here the problems scroll past as cards, so the promise lands in one glance.">
    <div class="wrap sec-head center rv"><p class="eyebrow">Sound familiar?</p><h2 class="d-m">Event paperwork is broken for both sides.</h2></div>
    <div class="pain rv">${row(a)}${row(b, true)}</div>
    <div class="wrap fix rv"><span class="fix-arch">${ic('check')}</span><h2 class="d-l">We fix <em>that.</em></h2></div>
  </section>`;
}

function sides() {
  const rows = DEMO.map(d => { const done = H.demoApproved[d.id]; return `<div class="demo-row ${done ? 'done' : ''}">${N.av(d.av, d.tone, 'sm')}<div class="stack" style="--g:0;min-width:0"><b style="font-size:14px">${d.name}</b><span class="s">${d.miss ? 'Missing: ' + d.miss : d.when}</span></div>${N.rd(d.p)}${done ? `<span class="chip ok">Approved</span>` : `<button type="button" class="btn btn-ink btn-xs" data-act="hm_approve" data-id="${d.id}" ${d.miss ? 'disabled title="Missing a required document"' : ''}>Approve</button>`}</div>`; }).join('');
  return `<section class="sec" style="padding-top:0" id="sides">
    <div class="wrap">
      <div class="sec-head center rv"><p class="eyebrow">One platform</p><h2 class="d-l">Two sides of <em>every</em> event.</h2></div>
      <div class="sides">
        <article class="side-card blk-lilac rv">
          <p class="eyebrow">For organisers · markets, festivals, food shows, councils</p>
          <h3>Fill your event with traders you can assess, confidently and quickly.</h3>
          <ol class="side-steps"><li>List your event and set your compliance requirements</li><li>Receive applications from traders with complete, structured profiles</li><li>Review, compare and approve, with a full decision record for your files</li></ol>
          <div class="demo-box" id="hmDemo"><div class="row between"><div class="row" style="--g:6px"><span class="tag">${ic('filter')}All compliant</span><span class="tag">${ic('sliders')}Readiness</span></div><span class="mono muted">TRY IT</span></div>${rows}</div>
          <div><button type="button" class="btn btn-violet" data-go="org/create-event">List my event, free to start</button></div>
        </article>
        <article class="side-card blk-mint rv">
          <p class="eyebrow">For traders · food vans, stalls, caterers, bar & craft vendors</p>
          <h3>Build one approved profile. Apply to any event in minutes.</h3>
          <ol class="side-steps"><li>Upload your documents once: hygiene rating, insurance, allergens</li><li>NICHE keeps them current and flags expiry</li><li>Apply with one tap, already proven compliant</li></ol>
          <div class="demo-box" id="hmSend">${H.sent ? `<div class="sent"><span class="ok-ic">${ic('check')}</span><div class="stack" style="--g:2px"><b>Passport sent successfully</b><span class="small muted">Your complete compliance profile has been sent securely to London Food Fest. You meet all their requirements.</span></div></div><div class="sent-foot"><span class="mono muted">STATUS: APPROVED</span><span class="checked">${ic('check')}Ready to trade</span></div><button type="button" class="btn btn-ghost btn-xs" data-act="hm_resend" style="align-self:flex-start">${ic('refresh')}Run it again</button>` : `<div class="row" style="--g:12px">${N.tav('gb')}<div class="stack" style="--g:2px;min-width:0"><b>Green Bowl</b><span class="small muted">Passport ${N.readiness('gb')}% ready · 7 documents checked</span></div></div><div class="row between" style="border-top:1px solid var(--line);padding-top:12px"><div class="stack" style="--g:0"><span class="mono muted">APPLYING TO</span><b>London Food Fest</b></div><button type="button" class="btn btn-hedge btn-sm" data-act="hm_send">${ic('send')}Send passport</button></div>`}</div>
          <div><button type="button" class="btn btn-hedge" data-go="site/register">Create my Food Trader Passport, free</button></div>
        </article>
      </div>
    </div>
  </section>`;
}

function updateCalc(root = document) {
  const ring = $('#hxT .ring', root);
  if (ring) {
    const pct = RC.filter(r => r.on).reduce((s, r) => s + r.w, 0);
    const evs = add => Math.round(TOTAL_EVENTS * RC.filter(r => !r.on && r.id !== add).reduce((p, r) => p * (1 - r.share), 1));
    const now = evs(null);
    N.setRing(ring, pct); N.tween($('#hmEvents', root), now);
    const off = RC.filter(r => !r.on), next = $('#hmNext', root);
    if (!off.length) next.innerHTML = `${ic('check-circle')}<span>That's everything. Every event on NICHE is open to you.</span>`;
    else if (!RC[0].on || !RC[1].on) next.innerHTML = `${ic('alert')}<span>Almost every organiser asks for a <b>hygiene rating</b> and <b>public liability insurance</b>. Start with those two.</span>`;
    else { const best = off.map(r => ({ r, gain: evs(r.id) - now })).sort((a, b) => b.gain - a.gain)[0]; next.innerHTML = `${ic('zap')}<span>Next best step: add your <b>${best.r.short}</b> to open <b>${best.gain}</b> more events.</span>`; }
  }
  const cnt = $('#hmCount', root);
  if (cnt) {
    let n = 1240 * F_FHRS[RB.fhrs] * F_PLI[RB.pli] * (RB.gas ? .9 : 1) * (RB.allergen ? .88 : 1);
    if (RB.cuisine.size) n *= [...RB.cuisine].reduce((s, c) => s + CUIS[c].share, 0);
    N.tween(cnt, Math.round(n));
    const m = Object.entries(db.traders).filter(([id, t]) => t.status === 'approved' && t.fhrs >= RB.fhrs && t.pli >= RB.pli && (!RB.allergen || t.allergen) && (!RB.cuisine.size || [...RB.cuisine].some(c => CUIS[c].ids.includes(id)))).sort((a, b) => N.readiness(b[0]) - N.readiness(a[0]));
    $('#hmList', root).innerHTML = m.length ? `<div class="avs">${m.slice(0, 4).map(([id]) => N.tav(id, 'sm')).join('')}</div><span>Top matches: <b>${m.slice(0, 2).map(([, t]) => esc(t.biz)).join('</b> and <b>')}</b>${m.length > 2 ? ` + ${m.length - 2} more` : ''}</span>` : `<span>None of the sample traders match. Loosen a requirement.</span>`;
  }
}
const $ = N.$, $$ = N.$$;

function statement() {
  const words = 'A niche is the point of perfect fit, where identity, purpose and environment align.'.split(' ');
  return `<section class="sec"><div class="wrap"><p class="eyebrow" style="margin-bottom:18px">Why we're called NICHE</p><p class="statement" id="hmStatement">${words.map(w => `<span class="${/fit/.test(w) ? 'em' : ''}">${w} </span>`).join('')}</p><div class="btn-row" style="margin-top:28px"><button type="button" class="btn btn-line" data-go="site/about">Read what NICHE means</button></div></div></section>`;
}

function pricing() {
  return `<section class="sec" style="padding-top:0">
    <div class="wrap">
      <div class="sec-head rv"><p class="eyebrow">Pricing</p><h2 class="d-l">Start free. Stay ready. <em>Apply</em> everywhere.</h2><p class="lead">Traders get 3 months free, then simple flat pricing with no per-application fees, ever. Organisers get a full year free, then pay only on confirmed bookings.</p></div>
      <div class="pt">
        <article class="pt-card blk-mint rv"><span class="arch-deco"></span><p class="eyebrow">Traders start free</p><span class="num">3 months</span><p style="max-width:40ch">Full access from day one. Build your profile, get approved and apply to real events. No payment needed. Then from £15 a month.</p><div class="btn-row"><button type="button" class="btn btn-hedge" data-go="site/pricing-trader">See trader plans</button></div></article>
        <article class="pt-card blk-lilac rv"><span class="arch-deco"></span><p class="eyebrow">Organisers start free</p><span class="num">12 months</span><p style="max-width:40ch">List events and book profile-complete traders at no cost. From year two you only pay 8% once a booking is confirmed.</p><div class="btn-row"><button type="button" class="btn btn-violet" data-go="site/pricing-organiser">See the Event Pass</button></div></article>
      </div>
      <p class="small muted" style="margin-top:16px;text-align:center">Whichever side you're on, you can prove the value to yourself first.</p>
    </div>
  </section>`;
}

function preview() {
  const e = db.events.camden;
  const elig = Object.keys(db.traders).filter(id => db.traders[id].status === 'approved' && N.sumChecks(N.evalChecks(id, 'camden')).can);
  const list = elig.filter(id => (H.elTab === 'invited') === !!H.invited[id]).filter(id => { const q = H.elQ.toLowerCase(); const t = db.traders[id]; return !q || (t.biz + t.person + t.email).toLowerCase().includes(q); });
  return `<section class="sec" style="padding-top:0">
    <div class="wrap grid g-main" style="--g:clamp(24px,4vw,56px);align-items:center">
      <div class="browser rv" data-note="The dashboard preview is live: search, switch tabs and invite traders. It uses the same data as the organiser app.">
        <div class="browser-bar"><i></i><i></i><i></i><span class="url">${ic('lock', 'ic-sm')}nicheconnect.co/organiser/events/camden/eligible</span></div>
        <div class="browser-body">
          <div class="row between"><div class="stack" style="--g:2px"><b style="font-family:var(--f-display);font-size:24px;font-weight:var(--w-display)">Eligible traders</b><span class="small muted">${elig.length} traders fit ${esc(e.name)}</span></div>${N.tabsHTML([['eligible', 'Eligible', elig.filter(i => !H.invited[i]).length], ['invited', 'Invited', elig.filter(i => H.invited[i]).length]], H.elTab, 'data-hm-tab')}</div>
          <label class="search">${ic('search')}<input type="search" placeholder="Search traders by name, company or email..." data-input="hm_elq" value="${esc(H.elQ)}" aria-label="Search traders"></label>
          <div class="stack" id="hmEl" style="--g:8px">${elList(list)}</div>
        </div>
      </div>
      <div class="stack rv" style="--g:18px">
        <p class="eyebrow">For organisers</p>
        <h2 class="d-m">See exactly who's <em>ready</em> to trade.</h2>
        <p class="lead">Every applicant arrives with transparent eligibility data. Review, approve and record in minutes.</p>
        <ul class="stack" style="--g:10px">${['No more chasing missing documents.', "See each trader's readiness score at a glance.", 'Filter and compare applicants by compliance status.', 'One structured record of every review decision.'].map(t => `<li class="row" style="--g:10px;flex-wrap:nowrap;align-items:flex-start"><span class="chip ok plain" style="padding:0 7px">${ic('check', 'ic-sm')}</span><span>${t}</span></li>`).join('')}</ul>
        <div class="btn-row"><button type="button" class="btn btn-violet" data-go="org/dashboard">Open the organiser demo</button></div>
      </div>
    </div>
  </section>`;
}
function elList(list) {
  return list.slice(0, 4).map(id => { const t = db.traders[id]; return `<div class="el-row">${N.tav(id)}<div class="stack" style="--g:0;min-width:0"><b>${esc(t.biz)}</b><span class="s">${esc(t.person)} · ${esc(t.email)}</span></div>${H.invited[id] ? `<span class="chip info">Invited</span>` : `<button type="button" class="btn btn-line btn-xs" data-act="hm_invite" data-id="${id}">${ic('send')}Invite</button>`}</div>`; }).join('') || N.empty('No traders here yet', H.elTab === 'invited' ? 'Invite a trader from the Eligible tab.' : 'Try a different search.', '', 'users');
}

function trust() {
  const items = [['mint', 'user', 'Who owns the data?', 'You do. Your Food Trader Passport belongs to you. You decide which events receive your application and can delete it at any time.'], ['lilac', 'eye', 'What can organisers see?', 'Your full profile only when you apply or accept an invitation. Until then your core documents stay private.'], ['butter', 'lock', 'How is it protected?', 'Documents are encrypted at rest and in transit. Organisers can only open what they need to review your application.'], ['peach', 'shield', 'UK GDPR', 'Built from the ground up for UK GDPR, with data minimisation and clear retention rules for everything you share.']];
  return `<section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-head split rv"><div><p class="eyebrow">Transparency first</p><h2 class="d-l">Your data. <em>Your</em> profile.</h2><p class="lead">We don't sell your data. We structure it so you can prove your eligibility to the organisers you choose.</p></div><button type="button" class="btn btn-line" data-go="site/data-trust">Read our Data Trust promise</button></div>
    <div class="trust">${items.map(([t, i, h, p]) => `<article class="trust-card blk-${t} rv"><span class="ti">${ic(i, 'ic-lg')}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</div>
  </div></section>`;
}

function carousels() {
  const evs = Object.entries(db.events).filter(([, e]) => ['upcoming', 'live'].includes(N.eventState(e))).sort((a, b) => N.dt(a[1].date) - N.dt(b[1].date));
  const trs = Object.entries(db.traders).filter(([, t]) => t.status === 'approved').sort((a, b) => (b[1].rating || 0) - (a[1].rating || 0));
  return `<section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-head split rv"><div><p class="eyebrow">Featured events</p><h2 class="d-m">Food events across the UK looking for traders</h2></div><div class="row"><div class="car-nav"><button type="button" data-act="hm_car" data-t="hmEv" data-d="-1" aria-label="Previous events">${ic('arrow-left')}</button><button type="button" data-act="hm_car" data-t="hmEv" data-d="1" aria-label="Next events">${ic('arrow-right')}</button></div><button type="button" class="btn btn-line btn-sm" data-go="site/events">All events</button></div></div>
    <div class="carousel" id="hmEv" data-note="Event cards show pitches left and status as a chip. Names no longer carry '(Draft)' or '(External)'.">${evs.map(([id, e]) => { const left = e.pitches - e.filled; return `<button type="button" class="ev-card" data-go="site/events/${id}">${N.art(e.tone, N.fd(e.date, { day: '2-digit' }) + ' ' + N.fd(e.date, { month: 'short' }), e.city)}<div class="ev-card-b"><div class="ev-meta">${e.external ? N.chip('plain', 'External') : N.chip('ok', 'Accepting traders')}<span>${esc(e.type)}</span></div><b>${esc(e.name)}</b><span class="small muted">${esc(e.venue)} · ${esc(N.orgName(id))}</span>${N.bar(e.filled / e.pitches * 100, 'violet')}<span class="small muted">${left} of ${e.pitches} pitches left</span></div></button>`; }).join('')}</div>
    <div class="sec-head split rv" style="margin-top:clamp(56px,7vw,96px)"><div><p class="eyebrow">Top traders on NICHE</p><h2 class="d-m">Traders trusted by the UK's best events</h2></div><div class="row"><div class="car-nav"><button type="button" data-act="hm_car" data-t="hmTr" data-d="-1" aria-label="Previous traders">${ic('arrow-left')}</button><button type="button" data-act="hm_car" data-t="hmTr" data-d="1" aria-label="Next traders">${ic('arrow-right')}</button></div><button type="button" class="btn btn-line btn-sm" data-go="site/traders">All traders</button></div></div>
    <div class="carousel" id="hmTr">${trs.map(([id, t]) => `<button type="button" class="tr-card" data-go="site/traders/${id}">${N.tav(id, 'xl')}<div class="stack" style="--g:2px"><b style="font-size:18px">${esc(t.biz)}</b><span class="eyebrow">${esc(t.person)}</span></div><p>${esc(t.bio)}</p><div class="tags">${t.tags.slice(0, 2).map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div><div class="row between"><span class="chip ok plain">Hygiene ${t.fhrs}</span>${t.rating ? N.stars(t.rating) : ''}</div></button>`).join('')}</div>
  </div></section>`;
}

function quotes() {
  const q = [['lilac', 'We used to spend Monday chasing insurance certificates. Now we open the applications that already fit.', 'Market manager', 'London · pilot partner'], ['mint', 'I uploaded everything once. The reminder about my gas certificate saved a whole weekend of trading.', 'Street food trader', 'Manchester'], ['butter', 'The decision record means I can show the council why every trader was booked.', 'Festival operator', 'Bristol']];
  return `<section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sec-head rv"><p class="eyebrow">What people say</p><h2 class="d-m">Built with traders and organisers in the pilot</h2></div>
    <div class="quotes" data-note="The live site credits quotes to Glastonbury, London Street Food Fest and others. Those were replaced with clearly marked sample quotes. Add real pilot quotes once you have written permission.">${q.map(([t, text, who, where]) => `<figure class="quote blk-${t} rv"><span class="sample-tag">Sample quote</span><blockquote>“${text}”</blockquote><figcaption class="who">${N.av(who.split(' ').map(w => w[0]).join(''), t === 'lilac' ? 'violet' : 'hedge', 'sm')}<span><b>${who}</b><br>${where}</span></figcaption></figure>`).join('')}</div>
  </div></section>`;
}

function finalCta() {
  return `<section class="sec" style="padding-top:0"><div class="wrap"><div class="final rv">
    <span class="arches-deco" aria-hidden="true"><i></i><i></i><i></i></span>
    <p class="eyebrow" style="color:inherit;opacity:.75">Join the pilot</p>
    <h2 class="d-l">Turn readiness into your <em>advantage.</em></h2>
    <p>Traders: build a passport that works for every event. Organisers: shortlist checked, event-ready traders in minutes.</p>
    <div class="btn-row"><button type="button" class="btn btn-zest btn-lg" data-go="site/register">Join the pilot</button><button type="button" class="btn btn-lg btn-line-inv" data-act="hm_demo">Book a demo</button></div>
    <p class="fine">Your compliance profile belongs to you. We just make it work harder. <button type="button" data-go="site/data-trust">Read our Data Trust promise</button></p>
  </div></div></section>`;
}

N.page('site/home', {
  app: 'site', title: 'Home',
  render() { return hero() + pain() + sides() + statement() + preview() + pricing() + trust() + carousels() + quotes() + finalCta(); },
  after(root) {
    updateCalc(root);
    // scroll-filled statement
    const st = $('#hmStatement', root);
    if (st) {
      const spans = [...st.children];
      if (N.reduce) spans.forEach(s => s.classList.add('on'));
      else { const onScroll = () => { if (!document.body.contains(st)) { removeEventListener('scroll', onScroll); return; } const r = st.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35))); const n = Math.round(p * spans.length); spans.forEach((s, i) => s.classList.toggle('on', i < n)); }; addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
    }
  },
});

/* keep scroll position when re-rendering the homepage */
N.refreshKeep = () => { const y = scrollY; N.render(true); scrollTo(0, y); };

Object.assign(N.act, {
  hm_side(el) {
    const side = el.dataset.s; if (side === H.side) return; H.side = side;
    const sec = $('#hx'), h = HERO[side]; if (!sec) return;
    sec.dataset.side = side;
    $$('.hx-switch [role=tab]', sec).forEach(b => b.setAttribute('aria-selected', String(b.dataset.s === side)));
    const t = $('#hxTitle'), sub = $('#hxSub');
    t.innerHTML = h.title; sub.textContent = h.sub; $('#hxFine').textContent = h.fine;
    const c1 = $('#hxCta'), c2 = $('#hxCta2'); c1.textContent = h.cta[0]; c1.dataset.go = h.cta[1]; c2.textContent = h.cta2[0]; c2.dataset.go = h.cta2[1];
    [t, sub].forEach(e => { e.classList.remove('hx-swap'); void e.offsetWidth; e.classList.add('hx-swap'); });
    [['#hxT', 'trader'], ['#hxO', 'org']].forEach(([sel, k]) => { const el = $(sel), on = side === k; el.classList.toggle('off', !on); el.toggleAttribute('inert', !on); if (on) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', 'true'); });
    updateCalc(); N.applyNotes();
  },
  hm_approve(el) { H.demoApproved[el.dataset.id] = true; N.refreshKeep(); N.toast(`Approved <b>${esc(DEMO.find(d => d.id === el.dataset.id).name)}</b>. Decision saved to your record.`, { undo: () => { delete H.demoApproved[el.dataset.id]; N.refreshKeep(); } }); },
  hm_send() { H.sent = true; N.refreshKeep(); },
  hm_resend() { H.sent = false; N.refreshKeep(); },
  hm_cz(el) { const c = el.dataset.c; RB.cuisine.has(c) ? RB.cuisine.delete(c) : RB.cuisine.add(c); el.setAttribute('aria-pressed', String(RB.cuisine.has(c))); updateCalc(); },
  hm_invite(el) { H.invited[el.dataset.id] = true; N.refreshKeep(); N.toast(`Invitation sent to <b>${esc(db.traders[el.dataset.id].biz)}</b> for Camden Night Market.`, { undo: () => { delete H.invited[el.dataset.id]; N.refreshKeep(); } }); },
  hm_car(el) { const c = $('#' + el.dataset.t); if (c) c.scrollBy({ left: (+el.dataset.d) * Math.min(c.clientWidth * .8, 680), behavior: N.reduce ? 'auto' : 'smooth' }); },
  hm_demo() { N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Book a demo</p><h3>See NICHE with your own event</h3></div><form data-form="hm_demo" class="stack" style="--g:14px">${N.field({ label: 'Your name', id: 'dmName', req: true })}${N.field({ label: 'Work email', id: 'dmEmail', type: 'email', req: true })}${N.field({ label: 'Organisation', id: 'dmOrg' })}${N.field({ label: 'I am a', id: 'dmRole', opts: ['Event organiser', 'Food trader', 'Council or venue', 'Other'] })}<div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-violet btn-sm">Request a demo</button></div></form>`); },
});
N.forms.hm_demo = (f, d) => { N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">Request received</p><h3>Thanks, ${esc((d.dmName || '').split(' ')[0] || 'there')}</h3><p class="muted">On the live site this goes to the NICHE team, who reply within one working day to find a time.</p><p class="small muted">Prototype: nothing was sent.</p></div><div class="modal-foot"><button type="button" class="btn btn-ink btn-sm" data-close>Done</button></div>`); };
Object.assign(N.change, { hm_rc(el) { RC.find(r => r.id === el.dataset.rc).on = el.checked; updateCalc(); }, hm_rb(el) { if (el.id === 'hmGas') RB.gas = el.checked; if (el.id === 'hmAll') RB.allergen = el.checked; updateCalc(); } });
N.input.hm_elq = el => { H.elQ = el.value; const elig = Object.keys(db.traders).filter(id => db.traders[id].status === 'approved' && N.sumChecks(N.evalChecks(id, 'camden')).can); const list = elig.filter(id => (H.elTab === 'invited') === !!H.invited[id]).filter(id => { const q = H.elQ.toLowerCase(); const t = db.traders[id]; return !q || (t.biz + t.person + t.email).toLowerCase().includes(q); }); $('#hmEl').innerHTML = elList(list); };
// tabs inside the dashboard preview (registered once)
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-hm-tab]'); if (b) { H.elTab = b.dataset.hmTab; N.refreshKeep(); } });
document.addEventListener('seg', e => {
  const { key, v } = e.detail;
  if (key === 'hm_fhrs') { RB.fhrs = +v; updateCalc(); }
  if (key === 'hm_pli') { RB.pli = +v; updateCalc(); }
});

/* ---------- 404 ---------- */
N.page('site/404', {
  app: 'site', title: 'Page not found',
  render() { return `<section class="nf"><div class="wrap-s"><div class="nf-arch">${N.art('butter', '404', 'empty pitch')}</div><h1 class="d-l">This pitch is <em>empty.</em></h1><p class="lead" style="margin:16px auto 28px;text-align:center">The page you were looking for has packed up and gone home. Try the homepage or browse events looking for traders.</p><div class="btn-row" style="justify-content:center"><button type="button" class="btn btn-ink" data-go="site/home">Go to the homepage</button><button type="button" class="btn btn-line" data-go="site/events">Browse events</button></div></div></section>`; },
});
})();
