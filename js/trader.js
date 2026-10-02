/* =====================================================================
   NICHE \u00b7 Trader app
   Demo user: Alice Green, AG Foods Ltd (trader id "ag").
   Every page reads and writes the shared N.db, so the organiser and admin
   apps see what Alice does here: applications, uploads (pending for admin
   review), unit changes, reviews, feedback and plan changes.

   Sections: 1 helpers \u00b7 2 rules \u00b7 3 shared renderers \u00b7 4 overlays
             5 pages \u00b7 6 routes \u00b7 7 handlers
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic, $, $$ } = N;
const TID = 'ag';

/* =====================================================================
   1 \u00b7 HELPERS
   ===================================================================== */
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = iso(N.TODAY);
const S = (k, init) => N.state['tr_' + k] || (N.state['tr_' + k] = init());

const me = () => db.traders[TID];
const ev = id => db.events[id];
const myDocs = () => db.docs.filter(d => d.trader === TID);
const myApps = () => db.apps.filter(a => a.t === TID && ev(a.e));
const myUnits = () => db.units.filter(u => u.trader === TID);
const unitById = id => db.units.find(u => u.id === id);
const openInvites = () => db.invites.filter(i => i.t === TID && i.st === 'open' && ev(i.e));
const inviteFor = eid => openInvites().find(i => i.e === eid);
const appById = id => db.apps.find(a => String(a.id) === String(id));
const appFor = eid => myApps().find(a => a.e === eid && a.st !== 'withdrawn');
const orgName = eid => N.orgName(eid);
const orgPerson = eid => N.orgOf(eid).person;
const ppNo = () => 'NCH-26-' + String(100 + Object.keys(db.traders).indexOf(TID)).padStart(4, '0');
const nextAppId = () => db.apps.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0) + 1;
const isPast = a => !!a.done || a.st === 'withdrawn' || N.eventState(ev(a.e)) === 'completed';
const appKey = a => isPast(a) ? 'past' : a.st;
const byDate = (x, y) => N.dt(x.date) - N.dt(y.date);
const committed = () => myApps().filter(a => !isPast(a) && ['approved', 'pending', 'info'].includes(a.st)).sort((x, y) => byDate(ev(x.e), ev(y.e)));
const hasRated = eid => db.reviews.some(r => r.dir === 't2o' && r.from === TID && r.e === eid);

const evDates = e => e.end && e.end !== e.date ? `${N.fShort(e.date)} \u2013 ${N.fLong(e.end)}` : N.fLong(e.date);
const feeTxt = e => !e.fee ? 'Fee on request' : e.fee.model === 'commission' ? `${e.fee.pct}% commission` : `${N.money(e.fee.amount)} pitch fee`;
const pitchesLeft = e => Math.max(0, (e.pitches || 0) - (e.filled || 0));
const hoursAgoISO = h => iso(new Date(N.TODAY.getTime() + h * 36e5));
const m2 = n => Number(n || 0).toFixed(2);
const fileSize = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const secHead = (title, sub = '', action = '') => `<div class="tr-sec-h"><div><h2 class="h3">${title}</h2>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>${action}</div>`;
const closeBtn = () => `<button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button>`;
const photoInner = () => me().photo ? `<img src="${esc(me().photo)}" alt="">` : `<span>${esc(N.initials(me().person))}</span>`;

/* Alice's profile fields that the live app has but the shared seed data doesn't */
(() => {
  const t = me();
  const d = { address: '12 Ancoats Street', postcode: 'M4 5AB', country: 'United Kingdom', website: 'agfoods.demo', contactEmail: t.email, bizPhone: '0161 496 0012', regDate: '2016-03-03', inspected: '2025-06-14', radius: 60, pdfContact: false,
    history: [{ name: 'Manchester Food & Drink Festival', loc: 'Manchester', date: '2025-09-20' }, { name: 'Trafford Christmas Market', loc: 'Stretford', date: '2024-12-10' }] };
  Object.keys(d).forEach(k => { if (t[k] === undefined) t[k] = d[k]; });
})();

/* =====================================================================
   2 \u00b7 RULES (on top of the shared rules in core)
   ===================================================================== */
/* the same required set N.readiness uses, so the counts always match the ring */
const reqTypes = () => db.docTypes.filter(t => t.status === 'active' && (t.tier === 1 || (t.id === 'gas' && me().gas) || t.id === 'elec'));
function readyCounts() {
  const c = { valid: 0, pending: 0, expiring: 0, missing: 0, total: 0 };
  reqTypes().forEach(t => {
    const st = N.docState(db.docs.find(d => d.trader === TID && d.type === t.id));
    c.total++;
    if (st === 'valid') c.valid++; else if (st === 'pending') c.pending++; else if (st === 'expiring') c.expiring++; else c.missing++;
  });
  return c;
}

/* documents that do not exist yet are "virtual" rows keyed v:type:unit */
const virt = (type, unit) => ({ id: `v:${type}:${unit || ''}`, virtual: true, trader: TID, type, unit: unit || undefined, status: 'missing', exp: null, file: null, note: '' });
const resolveDoc = key => {
  if (String(key).startsWith('v:')) { const [, type, unit] = String(key).split(':'); return virt(type, unit); }
  return db.docs.find(d => d.id === key);
};
/* Tier 1 for the business/person, Tier 2 per unit that needs it (gas -> Gas Safety, power -> Electrical Safety) */
function docRows() {
  const rows = [], types = db.docTypes.filter(t => t.status === 'active');
  types.filter(t => t.tier === 1).forEach(t => rows.push({ tier: 1, t, d: db.docs.find(d => d.trader === TID && d.type === t.id) || virt(t.id) }));
  myUnits().forEach(u => types.filter(t => t.tier === 2).forEach(t => {
    const need = t.id === 'gas' ? u.gas : t.id === 'elec' ? !!u.power : true;
    if (need) rows.push({ tier: 2, t, u, d: db.docs.find(d => d.trader === TID && d.type === t.id && d.unit === u.id) || virt(t.id, u.id) });
  }));
  return rows.map(r => ({ ...r, st: N.docState(r.d) }));
}
const DOC_F = { valid: 'approved', pending: 'review', expiring: 'expiring', expired: 'expiring', missing: 'missing', rejected: 'rejected' };
const needs = (type, e) => type === 'gas' ? !!(e.req && e.req.gas) : type === 'elec' ? !!(e.req && e.req.elec) : true;

/* approved documents that run out before an event Alice is committed to */
function clashes() {
  const evs = committed().map(a => ({ a, e: ev(a.e) }));
  const out = [];
  myDocs().forEach(d => {
    if (!d.exp || d.status !== 'approved') return;
    const hit = evs.find(x => needs(d.type, x.e) && N.dt(d.exp) < N.dt(x.e.date));
    if (hit) out.push({ d, a: hit.a, e: hit.e, gap: Math.round((N.dt(hit.e.date) - N.dt(d.exp)) / N.DAY) });
  });
  return out.sort((x, y) => N.dt(x.d.exp) - N.dt(y.d.exp));
}
/* everything else that needs Alice, in the order she should do it */
function todos() {
  const out = [];
  myDocs().filter(d => d.status === 'pending').forEach(d => out.push({ icon: 'clock', tone: 'info', t: (N.docType(d.type) || {}).name || 'Document', s: 'In review by the Niche team', act: `data-act="tr_docView" data-doc="${esc(d.id)}"` }));
  docRows().filter(r => ['missing', 'rejected', 'expired'].includes(r.st)).forEach(r => {
    const hit = committed().map(a => ev(a.e)).find(e => needs(r.t.id, e));
    out.push({ icon: 'upload', tone: 'risk', t: r.t.name, s: `${r.st === 'missing' ? 'Not uploaded' : N.cap(r.st)}${hit ? ` \u00b7 ${hit.name} needs it` : ''}`, act: `data-act="tr_upload" data-doc="${esc(r.d.id)}"` });
  });
  myApps().filter(a => a.st === 'info' && !isPast(a)).forEach(a => out.push({ icon: 'message', tone: 'warn', t: `Answer ${N.plural((a.q || []).length || 1, 'question')}`, s: `${orgName(a.e)} \u00b7 ${ev(a.e).name}`, act: `data-act="tr_answer" data-id="${a.id}"` }));
  return out;
}

/* eligibility for one event, with the chip wording used everywhere */
function elig(eid) {
  const cs = N.evalChecks(TID, eid), s = N.sumChecks(cs);
  const fails = cs.filter(c => c.st === 'fail'), warns = cs.filter(c => c.st === 'warn');
  let chip;
  if (fails.length) chip = N.chip('risk tr-wrapchip', 'Not eligible: ' + fails.map(c => c.miss || c.label).join(', '));
  else if (warns.some(c => c.key === 'gas')) chip = N.chip('warn tr-wrapchip', 'Eligible \u00b7 renew Gas Safety first');
  else if (warns.length) chip = N.chip('warn tr-wrapchip', 'Eligible \u00b7 ' + warns.map(c => c.key === 'elec' ? `electrical certificate ${c.val.toLowerCase()}` : c.label.toLowerCase()).join(', '));
  else chip = N.chip('ok', 'Eligible');
  return { cs, s, fails, warns, chip, score: N.matchScore(TID, eid) };
}
const browsable = () => Object.keys(db.events).filter(id => { const e = ev(id); return e.status === 'published' && ['upcoming', 'live'].includes(N.eventState(e)); });

/* application wording: the chip says where it is, the next step says what happens next */
const APP_CHIP = { pending: ['info', 'Pending review'], info: ['warn', 'Needs your answer'], approved: ['ok', 'Approved'], rejected: ['risk', 'Not accepted'], withdrawn: ['plain', 'Withdrawn'], traded: ['plain', 'Traded'], closed: ['plain', 'Closed'] };
function appChip(a) {
  let k = a.st;
  if (a.st === 'approved' && isPast(a)) k = 'traded';
  else if (isPast(a) && !['withdrawn', 'rejected'].includes(a.st)) k = 'closed';
  const [c, l] = APP_CHIP[k] || ['plain', N.cap(k)];
  return N.chip(c, l);
}
function nextStep(a) {
  const e = ev(a.e), org = orgName(a.e);
  if (a.st === 'info') return `Answer ${N.plural((a.q || []).length || 1, 'question')}`;
  if (a.st === 'pending') return isPast(a) ? 'The event has finished' : a.answered ? `${org} is reading your answers` : `${org} reviews it next, usually within 3 days`;
  if (a.st === 'approved' && isPast(a)) return hasRated(a.e) ? 'Traded \u00b7 you rated this organiser' : 'Traded \u00b7 rate the organiser';
  if (a.st === 'approved') return `Pitch ${a.pitch || 'to be confirmed'} \u00b7 arrive before ${String(e.time || '').split('\u2013')[0] || 'opening'} on ${N.fShort(e.date)}`;
  if (a.st === 'rejected') return a.rec && a.rec.note ? `Reason: ${a.rec.note}` : `${org} chose other traders this time`;
  if (a.st === 'withdrawn') return 'You withdrew this application';
  return '';
}
function pipe(a) {
  const k = a.st;
  const reviewed = k === 'pending' ? (a.answered ? 'done' : 'now') : k === 'info' ? 'now' : 'done';
  const decision = k === 'approved' ? 'done' : (k === 'rejected' || k === 'withdrawn') ? 'bad' : '';
  const steps = [['Sent', 'done'], [k === 'info' ? 'Question' : 'Reviewed', reviewed], [k === 'rejected' ? 'Declined' : k === 'withdrawn' ? 'Withdrawn' : 'Decision', decision]];
  return `<ol class="tr-pipe" aria-label="Progress: ${steps.map(([l, s]) => `${l} ${s === 'done' ? 'done' : s === 'now' ? 'in progress' : s === 'bad' ? 'stopped' : 'to come'}`).join(', ')}">${steps.map(([l, s]) => `<li class="${s}"><i></i>${l}</li>`).join('')}</ol>`;
}

/* =====================================================================
   3 \u00b7 SHARED RENDERERS
   ===================================================================== */
function applyBtn(eid, size = 'btn-sm') {
  const e = ev(eid), app = appFor(eid);
  if (app) return `<button type="button" class="btn btn-line ${size}" data-act="tr_appOpen" data-id="${app.id}">View application</button>`;
  if (e.external) return `<button type="button" class="btn btn-line ${size}" data-act="tr_external" data-id="${esc(eid)}">Apply on organiser\u2019s site${ic('arrow-up-right')}</button>`;
  const s = N.sumChecks(N.evalChecks(TID, eid));
  if (!s.can && !inviteFor(eid)) return `<button type="button" class="btn btn-line ${size}" disabled>Not eligible</button>`;
  return `<button type="button" class="btn btn-side ${size}" data-go="trader/apply/${esc(eid)}">Apply now</button>`;
}
function appLi(a) {
  const e = ev(a.e);
  return `<button type="button" class="li click tr-li-btn" data-act="tr_appOpen" data-id="${a.id}">${N.evd(e.date)}<span class="li-main"><b>${esc(e.name)}</b><span>${esc(orgName(a.e))} \u00b7 ${esc(a.unit || 'Unit')} \u00b7 ${esc(N.rel(a.at))}</span><span class="tr-next ${a.st}">${esc(nextStep(a))}</span></span><span class="li-end">${appChip(a)}</span></button>`;
}
const planViz = u => {
  const max = Math.max(Number(u.w) || 1, Number(u.d) || 1), s = 56;
  const w = Math.max(18, Math.round((Number(u.w) || 1) / max * s)), d = Math.max(18, Math.round((Number(u.d) || 1) / max * s));
  const icon = /gazebo|stall|kiosk|cart/i.test(u.type || '') ? 'tent' : 'truck';
  return `<div class="tr-floor" aria-hidden="true"><span style="width:${w}px;height:${d}px">${ic(icon)}</span><i>${m2(u.w)} \u00d7 ${m2(u.d)}</i></div>`;
};

/* animate rings once per visit, not on every refresh */
function animateRings(root) {
  if (N.reduce) return;
  $$('.ring[data-p]', root).forEach(r => {
    const fg = r.querySelector('.fg'); if (!fg) return;
    fg.style.transition = 'none'; fg.style.strokeDashoffset = fg.style.strokeDasharray;
    requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.transition = ''; N.setRing(r, Number(r.dataset.p)); }));
  });
}

/* =====================================================================
   4 \u00b7 OVERLAYS (drawers and modals shared by several pages)
   ===================================================================== */

/* ---------- event details drawer ---------- */
function openEvent(eid) {
  const e = ev(eid); if (!e) return;
  const el = elig(eid), app = appFor(eid), inv = inviteFor(eid);
  N.openDrawer(`
  <header class="dr-head">${N.evd(e.date, 'side')}<div class="dr-ti"><h3>${esc(e.name)}</h3><p>${esc(e.venue)}, ${esc(e.city)} \u00b7 ${e.external ? 'External listing' : esc(orgName(eid))}</p></div>${closeBtn()}</header>
  <div class="dr-body">
    ${N.art(e.tone || 'mint', e.city, e.type)}
    ${inv ? `<div class="banner info">${ic('mail')}<span><b>${esc(db.organisers[inv.from].company)} invited you.</b> ${inv.msg ? esc(inv.msg) : ''}</span></div>` : ''}
    <p class="ink-2">${esc(e.about || '')}</p>
    <div class="tr-match">${N.ring(el.score, el.score >= 90 ? '' : 'warn', '')}<div><b>Match score ${el.score}%</b><span class="small muted">${el.fails.length ? `${N.plural(el.fails.length, 'requirement')} not met` : el.warns.length ? 'Meets the rules, with one thing to fix before the day' : 'Your passport meets every requirement'}</span></div>${app ? appChip(app) : el.chip}</div>
    ${N.kv([['Date', esc(evDates(e))], ['Hours', esc(e.time || '\u2014')], ['Venue', esc(e.venue)], ['Footfall', `${Number(e.footfall || 0).toLocaleString('en-GB')} expected`], ['Pitches left', `${pitchesLeft(e)} of ${e.pitches}`], ['Fee', esc(feeTxt(e))], ['Frontage', `Up to ${e.frontage || '\u2014'} m`], ['Applications close', N.fLong(e.deadline)]])}
    <details class="tr-details"><summary>View detailed eligibility criteria${ic('chevron-down')}</summary>${N.reqList(el.cs)}</details>
    ${e.cuisines ? `<div class="stack" style="--g:8px"><p class="dr-h" style="margin:0">Looking for</p><div class="tags">${e.cuisines.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div></div>` : ''}
  </div>
  <footer class="dr-foot"><div class="btn-row">${applyBtn(eid, '')}<button type="button" class="btn btn-ghost" data-close>Close</button></div></footer>`);
}

/* ---------- application drawer ---------- */
function openApp(id) {
  const a = appById(id); if (!a || !ev(a.e)) return;
  const e = ev(a.e), org = N.orgOf(a.e), qn = (a.q || []).length;
  const tl = [
    { t: 'Application sent', s: `${N.fLong(hoursAgoISO(a.at))} \u00b7 ${a.unit || 'Unit'}${a.via === 'invite' ? ' \u00b7 from an invitation' : ''}`, st: 'done' },
    qn ? { t: `${org.person} asked ${N.plural(qn, 'question')}`, s: a.q.join(' \u00b7 '), st: a.st === 'info' ? 'now' : 'done' } : null,
    a.answered ? { t: 'You answered', s: 'Sent to the organiser', st: 'done' } : null,
    a.st === 'pending' && !isPast(a) ? { t: 'Waiting for a decision', s: 'Organisers usually decide within 3 days', st: 'now' } : null,
    a.st === 'approved' ? { t: 'Approved', s: a.rec ? `${a.rec.by} \u00b7 ${a.rec.when}` : org.company, st: 'done' } : null,
    a.st === 'rejected' ? { t: 'Not accepted', s: a.rec ? `${a.rec.by} \u00b7 ${a.rec.when}` : org.company, st: 'bad' } : null,
    a.st === 'withdrawn' ? { t: 'You withdrew', s: 'The organiser was told straight away', st: 'bad' } : null,
    a.st === 'approved' && isPast(a) ? { t: 'Traded', s: N.fLong(e.date), st: 'done' } : null,
  ].filter(Boolean);
  const canWithdraw = !isPast(a) && ['pending', 'info', 'approved'].includes(a.st);
  const canRate = a.st === 'approved' && isPast(a) && e.org && !hasRated(a.e);
  N.openDrawer(`
  <header class="dr-head">${N.evd(e.date, 'side')}<div class="dr-ti"><h3>${esc(e.name)}</h3><p>${esc(orgName(a.e))} \u00b7 ${esc(evDates(e))}</p></div>${closeBtn()}</header>
  <div class="dr-body">
    <div class="tr-dr-status">${appChip(a)}<p>${esc(nextStep(a))}</p>${pipe(a)}</div>
    ${a.st === 'info' ? `<div class="banner warn">${ic('message')}<div class="grow stack" style="--g:6px"><b>${esc(org.person)} needs answers before deciding</b>${a.q.map(q => `<span>\u00b7 ${esc(q)}</span>`).join('')}</div></div>` : ''}
    <section><p class="dr-h">Timeline</p><ol class="tr-tline">${tl.map(x => `<li class="${x.st}"><i></i><div><b>${esc(x.t)}</b><span>${esc(x.s || '')}</span></div></li>`).join('')}</ol></section>
    ${a.rec ? `<section><p class="dr-h">Decision record</p><div class="tr-rec"><b>${a.st === 'rejected' ? 'Not accepted' : 'Approved'} by ${esc(a.rec.by)}</b><span class="mono">${esc(a.rec.when)}</span><p class="ink-2">${esc(a.rec.note || '')}</p></div></section>` : ''}
    <section><p class="dr-h">Details</p>${N.kv([['Pitch', a.pitch ? `Pitch ${esc(a.pitch)}` : '\u2014'], ['Unit', esc(a.unit || '\u2014')], ['Dates', esc(evDates(e))], ['Venue', `${esc(e.venue)}, ${esc(e.city)}`], ['Fee', esc(feeTxt(e))], ['Organiser contact', esc(org.person || '\u2014')]])}</section>
    ${a.answers && a.answers.length ? `<section><p class="dr-h">Your answers</p><ul class="list">${a.answers.map(x => `<li class="li" style="grid-template-columns:minmax(0,1fr)"><div class="li-main"><span>${esc(x.q)}</span><b>${esc(x.a || '\u2014')}</b></div></li>`).join('')}</ul></section>` : ''}
    ${a.msg ? `<section><p class="dr-h">Your message</p><blockquote class="tr-quote">${esc(a.msg)}</blockquote></section>` : ''}
  </div>
  <footer class="dr-foot"><div class="btn-row">
    ${a.st === 'info' ? `<button type="button" class="btn btn-side btn-sm" data-act="tr_answer" data-id="${a.id}">${ic('message')}Answer questions</button>` : ''}
    ${canRate ? `<button type="button" class="btn btn-side btn-sm" data-act="tr_rateOpen" data-id="${a.id}">${ic('star')}Rate organiser</button>` : ''}
    <button type="button" class="btn btn-line btn-sm" data-act="tr_evOpen" data-id="${esc(a.e)}">View event</button>
    ${canWithdraw ? `<button type="button" class="btn btn-danger-line btn-sm" data-act="tr_withdraw" data-id="${a.id}">Withdraw application</button>` : ''}
  </div></footer>`);
}

function openAnswer(id) {
  const a = appById(id); if (!a) return;
  const e = ev(a.e), qs = a.q && a.q.length ? a.q : ['Anything else the organiser should know?'];
  const ph = ['e.g. No, we carry 50 litres of fresh water', 'e.g. Around 60 wraps an hour with two staff', 'Your answer'];
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">${esc(orgName(a.e))} asked</p><h3>Answer ${N.plural(qs.length, 'question')}</h3><p class="muted">${esc(e.name)}. Your answers go straight to ${esc(orgPerson(a.e))} and your application moves back to review.</p></div>
  <form class="stack" style="--g:14px" data-form="tr_answer" data-id="${a.id}">
    ${qs.map((q, i) => N.field({ label: q, id: 'q' + i, type: 'textarea', rows: 2, req: true, ph: ph[i] || ph[2] })).join('')}
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">${ic('send')}Send answers</button></div>
  </form>`);
}

/* ---------- document drawer ---------- */
function openDocView(key) {
  const d = resolveDoc(key); if (!d) return;
  const t = N.docType(d.type), st = N.docState(d), u = d.unit ? unitById(d.unit) : null;
  const uses = committed().filter(a => needs(d.type, ev(a.e)));
  const n = d.exp ? N.daysFrom(d.exp) : null;
  const banner = {
    valid: ['ok', 'check-circle', 'Approved by the Niche team. Organisers see it as valid.'],
    expiring: ['warn', 'clock', `Expires in ${N.plural(n, 'day')}. Upload the renewal before ${N.fShort(d.exp)}.`],
    expired: ['risk', 'alert', 'Expired. Organisers see this document as missing.'],
    pending: ['info', 'clock', 'In review. We received your file and our team is checking it, usually within one working day.'],
    rejected: ['risk', 'x-circle', 'Rejected. Upload a clearer or up-to-date copy.'],
    missing: ['info', 'upload', 'Not uploaded yet.'],
  }[st];
  N.openDrawer(`
  <header class="dr-head"><span class="tr-ico t-mint">${ic('file')}</span><div class="dr-ti"><h3>${esc(t.name)}</h3><p>${esc(t.level)} level${u ? ' \u00b7 ' + esc(u.name) : ''}</p></div>${closeBtn()}</header>
  <div class="dr-body">
    <div class="banner ${banner[0]}">${ic(banner[1])}<span>${esc(banner[2])}</span></div>
    ${d.file ? `<div class="tr-filemock"><div class="tr-filemock-page" aria-hidden="true"><span class="h"></span><span></span><span></span><span class="short"></span><span></span><span class="short"></span><i>${ic('shield', 'ic-sm')}</i></div><p class="mono muted">${esc(d.file)}</p></div>` : ''}
    ${N.kv([['Status', N.docChip(st)], ['Expires', d.exp ? `${N.fLong(d.exp)}${n != null ? ` \u00b7 ${n < 0 ? `${-n} days ago` : `${n} days left`}` : ''}` : t.expiry ? '\u2014' : 'No expiry'], ['Uploaded', d.uploaded ? N.fLong(d.uploaded) : '\u2014'], ['Level', esc(t.level)], ['Unit', u ? esc(u.name) : '\u2014'], ['Details', esc(d.note || t.desc)]])}
    <section><p class="dr-h">Needed for</p>${uses.length ? `<ul class="list">${uses.map(a => { const e = ev(a.e); return `<li class="li">${N.evd(e.date)}<div class="li-main"><b>${esc(e.name)}</b><span>${esc(orgName(a.e))}</span></div><div class="li-end">${d.exp && N.dt(d.exp) < N.dt(e.date) && st !== 'pending' ? N.chip('risk', 'Expires first') : N.chip('ok', 'Covered')}</div></li>`; }).join('')}</ul>` : '<p class="small muted">None of your booked events depend on it right now.</p>'}</section>
  </div>
  <footer class="dr-foot"><div class="btn-row">
    <button type="button" class="btn btn-side btn-sm" data-act="tr_upload" data-doc="${esc(d.id)}">${ic('upload')}${d.virtual || st === 'missing' ? 'Upload' : 'Replace file'}</button>
    ${!d.virtual && st !== 'missing' ? `<button type="button" class="btn btn-danger-line btn-sm" data-act="tr_docDelete" data-doc="${esc(d.id)}">${ic('trash')}Delete document</button>` : ''}
  </div></footer>`);
}

/* ---------- upload modal: pick -> progress -> what we read -> save ---------- */
const CERT = { gas: 'GS-548213-27', elec: 'EICR-310882', pli: 'PL-448170', fhc: 'FHRS-MCR-20931', fsra: 'HACCP-2027-04', fbr: 'FBR-20931', l2: 'L2-HYG-77120' };
function suggestExp(d) {
  const t = N.docType(d.type);
  if (!t || !t.expiry) return '';
  if (d.type === 'gas') return '2027-10-21';
  if (d.type === 'l2') return N.addDays(TODAY, 365 * 3);
  const base = d.exp && N.daysFrom(d.exp) > -60 ? d.exp : TODAY;
  return N.addDays(base, 365);
}
let upTimer = null;
function openUpload(key) {
  const d = resolveDoc(key); if (!d) return;
  N.state.tr_up = { key, step: 'pick', file: null, size: 0, exp: suggestExp(d), cert: CERT[d.type] || '', token: null };
  drawUpload();
}
function drawUpload() {
  const U = N.state.tr_up; if (!U) return;
  const d = resolveDoc(U.key), t = N.docType(d.type), u = d.unit ? unitById(d.unit) : null;
  const replacing = !d.virtual && d.status !== 'missing';
  const head = `<div class="stack" style="--g:6px"><p class="eyebrow">${replacing ? 'Replace' : 'Upload'} \u00b7 ${esc(t.level)} level${u ? ' \u00b7 ' + esc(u.name) : ''}</p><h3>${esc(t.name)}</h3><p class="muted">${esc(t.desc)}</p></div>`;
  if (U.step === 'pick') {
    N.openModal(`${head}
    <label class="drop">${ic('upload', 'ic-lg')}<b>Drop your file here or browse</b><span>PDF, JPG or PNG up to 10 MB</span><input type="file" accept=".pdf,image/*" data-change="tr_file" aria-label="Choose a file to upload"></label>
    <div class="row between"><button type="button" class="link" data-act="tr_sampleFile">${ic('file')}Use a sample file</button><span class="xs muted">Files stay private until you apply.</span></div>`);
  } else if (U.step === 'up') {
    N.openModal(`${head}
    <div class="tr-upprog" role="status"><span class="tr-ico t-mint">${ic('file')}</span><b>${esc(U.file)}</b><span class="bar ok"><i id="trUpBar" style="width:0%"></i></span><span class="small muted"><span id="trUpPct">0%</span> \u00b7 <span id="trUpMsg">Uploading</span></span></div>`);
  } else {
    N.openModal(`${head}
    <div class="tr-upfile"><span class="tr-ico sm t-mint">${ic('file')}</span><div><b>${esc(U.file)}</b><span class="xs muted">${fileSize(U.size)} \u00b7 uploaded just now</span></div>${N.chip('ok', 'Received')}</div>
    <form class="stack" style="--g:14px" data-form="tr_upSave" data-input="tr_upExp">
      <p class="dr-h" style="margin:0">What we read from the file</p>
      <div class="form-grid">
        ${t.expiry ? N.field({ label: 'Expiry date', id: 'exp', type: 'date', value: U.exp, req: true, hint: 'Edit if we read it wrong' }) : ''}
        ${N.field({ label: 'Certificate number', id: 'cert', value: U.cert, full: !t.expiry })}
      </div>
      <p class="small tr-err" id="trUpWarn" hidden></p>
      <p class="xs muted">Our team checks the file against these details. It shows as <b>In review</b> until they approve it, usually within one working day.</p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="tr_upRestart">Choose another file</button><button type="submit" class="btn btn-side btn-sm">${ic('check')}Save and send for review</button></div>
    </form>`);
    checkUpExp(U.exp);
  }
}
function startUpload(name, size) {
  const U = N.state.tr_up; if (!U) return;
  Object.assign(U, { file: name, size, step: 'up', token: N.uid('t') });
  drawUpload();
  clearInterval(upTimer);
  const token = U.token; let p = 0;
  upTimer = setInterval(() => {
    if (!N.modalOpen() || !N.state.tr_up || N.state.tr_up.token !== token) { clearInterval(upTimer); return; }
    p = Math.min(100, p + (N.reduce ? 100 : 8 + Math.random() * 14));
    const bar = $('#trUpBar'), pct = $('#trUpPct'), msg = $('#trUpMsg');
    if (bar) bar.style.width = p + '%';
    if (pct) pct.textContent = Math.round(p) + '%';
    if (msg && p > 55) msg.textContent = 'Reading your certificate';
    if (p >= 100) {
      clearInterval(upTimer);
      setTimeout(() => { if (N.state.tr_up && N.state.tr_up.token === token && N.modalOpen()) { N.state.tr_up.step = 'read'; drawUpload(); } }, 380);
    }
  }, 110);
}
function checkUpExp(val) {
  const w = $('#trUpWarn'), U = N.state.tr_up; if (!w || !U) return;
  const d = resolveDoc(U.key);
  const hit = val ? committed().map(a => ev(a.e)).find(e => needs(d.type, e) && N.dt(val) < N.dt(e.date)) : null;
  const past = val && N.daysFrom(val) < 0;
  w.hidden = !(hit || past);
  w.textContent = past ? 'That date has already passed. Check the certificate is the renewed one.' : hit ? `This date is before ${hit.name} on ${N.fShort(hit.date)}. The organiser may ask for a newer certificate.` : '';
}

/* =====================================================================
   5 \u00b7 PAGES
   ===================================================================== */

/* ---------- 1 - dashboard ---------- */
const PART_GO = { 'Profile & bio': ['trader/profile', 'public'], 'Business info': ['trader/profile', 'business'], 'Trading unit': ['trader/units'], 'Documents': ['trader/documents'], 'Speciality tags': ['trader/profile', 'public'] };
const PART_HINT = { 'Profile & bio': 'Add a short bio', 'Business info': 'Add your company details', 'Trading unit': 'Activate a unit', 'Documents': 'Reach 90% readiness', 'Speciality tags': 'Pick at least one tag' };

function readyBlock() {
  const r = N.readiness(TID), c = readyCounts();
  const head = r >= 90 ? 'Ready to trade' : r >= 70 ? 'Nearly ready to trade' : 'Not ready to trade yet';
  return `<section class="tr-ready blk-hedge on-hedge" aria-label="Compliance readiness">
    <div class="row between"><span class="eyebrow">Compliance readiness</span><span class="mono muted">${ppNo()}</span></div>
    <div class="tr-ready-main">${N.ring(r, 'lg', 'ready')}<div class="stack" style="--g:8px"><p class="tr-ready-h">${head}</p><p class="small muted">Worked out from your ${c.total} required documents. Anything in review or expiring counts as half.</p></div></div>
    <ul class="tr-counts"><li><i class="tr-k ok"></i><b>${c.valid}</b>approved</li><li><i class="tr-k rev"></i><b>${c.pending}</b>in review</li><li><i class="tr-k exp"></i><b>${c.expiring}</b>expiring</li><li><i class="tr-k miss"></i><b>${c.missing}</b>missing</li></ul>
    <div class="btn-row"><button type="button" class="btn btn-zest btn-sm" data-go="trader/documents">Open my documents</button><button type="button" class="btn btn-onhedge btn-sm" data-go="trader/passport">See my passport</button></div>
  </section>`;
}
function completionCard() {
  const c = N.completion(TID), done = c.parts.filter(p => p.done).length;
  return `<section class="card tr-comp" data-note="${esc('The live admin Scores add up to 90%, so passports could never reach 100%. The weights now sum to 100%, and each section links to the page that finishes it.')}">
    <div class="row between" style="align-items:flex-start"><div class="stack" style="--g:4px"><p class="eyebrow">Passport completion</p><p class="num tr-big">${c.pct}<small>%</small></p></div>${N.chip(c.pct >= 100 ? 'ok' : 'side', `${done} of ${c.parts.length} sections`)}</div>
    ${N.bar(c.pct, 'ok')}
    <ul class="tr-parts">${c.parts.map(p => `<li><button type="button" data-act="tr_part" data-label="${esc(p.label)}"><span class="tr-part-ic ${p.done ? 'ok' : ''}">${ic(p.done ? 'check' : 'plus')}</span><span class="tr-part-l">${esc(p.label)}${p.done ? '' : `<span>${esc(PART_HINT[p.label] || 'To do')}</span>`}</span><span class="mono muted">${p.pct}%</span>${ic('chevron-right', 'ic-sm')}</button></li>`).join('')}</ul>
    <p class="xs muted">Section weights are set by the Niche team and add up to ${c.total}%.</p>
  </section>`;
}
function priorityCard() {
  const p = clashes()[0], list = todos().slice(0, 3);
  const main = p ? `<div class="tr-prio-main">
      <span class="tr-ico lg t-surface">${ic('alert', 'ic-lg')}</span>
      <div class="stack" style="--g:10px;min-width:0">
        <p class="eyebrow">Your priority \u00b7 due ${N.fShort(p.d.exp)}</p>
        <h2 class="d-s">Renew your ${esc(N.docType(p.d.type).name)}</h2>
        <p>It expires on <b>${N.fShort(p.d.exp)}</b>, ${N.plural(p.gap, 'day')} before <b>${esc(p.e.name)}</b> on ${N.fShort(p.e.date)}. Upload the new certificate so ${esc(orgName(p.a.e))} can keep your place.</p>
        <div class="btn-row"><button type="button" class="btn btn-ink btn-sm" data-act="tr_upload" data-doc="${esc(p.d.id)}">${ic('upload')}Upload renewal</button><span class="chip plain">${N.plural(Math.max(0, N.daysFrom(p.d.exp)), 'day')} left</span></div>
      </div></div>`
    : `<div class="tr-prio-main">
      <span class="tr-ico lg t-surface">${ic('check', 'ic-lg')}</span>
      <div class="stack" style="--g:10px;min-width:0"><p class="eyebrow">Your priority</p><h2 class="d-s">All clear</h2><p>Nothing expires before your booked events. We\u2019ll flag the next renewal 30 days ahead.</p></div></div>`;
  return `<section class="tr-prio ${p ? '' : 'clear'}" data-note="${esc("One priority with the reason and date replaces 'Action required \u00b7 LOW PRIORITY \u00b7 Complete all steps'. Smaller to-dos sit beside it, including the Level 2/3 certificate that is in review.")}">${main}
    <div class="tr-prio-side"><p class="eyebrow">Also on your list</p>${list.length ? `<ul class="tr-todo">${list.map(x => `<li><button type="button" ${x.act}><span class="tr-ico sm t-${x.tone}">${ic(x.icon)}</span><span class="tr-todo-t"><b>${esc(x.t)}</b><small>${esc(x.s)}</small></span>${ic('chevron-right', 'ic-sm')}</button></li>`).join('')}</ul>` : '<p class="small muted">Nothing else needs you right now.</p>'}</div>
  </section>`;
}
function dashboard() {
  const t = me(), h = N.TODAY.getHours();
  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const pend = myApps().filter(a => a.st === 'pending' && !isPast(a)), info = myApps().filter(a => a.st === 'info' && !isPast(a));
  const appr = myApps().filter(a => a.st === 'approved' && !isPast(a)).sort((x, y) => byDate(ev(x.e), ev(y.e)));
  const inv = openInvites();
  const stat = (go, icon, label, num, sub, numCls = '') => `<button type="button" class="stat tr-stat" data-go="${go}"><span class="row between"><span class="lbl">${label}</span>${ic(icon, 'ic-sm')}</span><span class="num ${numCls}">${num}</span><span class="s">${sub}</span></button>`;
  const recent = myApps().slice().sort((x, y) => y.at - x.at).slice(0, 5);
  const opps = browsable().filter(id => !ev(id).external && !appFor(id) && N.sumChecks(N.evalChecks(TID, id)).can).sort((x, y) => byDate(ev(x), ev(y))).slice(0, 4);
  const QUICK = [
    ['trader/invitations', 'mail', 'Invitations', 'View & respond', inv.length, 'lilac'],
    ['trader/applications', 'inbox', 'Applications', 'Track status', info.length, 'sky'],
    ['trader/documents', 'file', 'Documents', 'Upload & manage', 0, 'mint'],
    ['trader/units', 'truck', 'Trading units', 'Setup & edit', 0, 'butter'],
    ['trader/profile', 'user', 'Profile', 'Edit details', 0, 'peach'],
    ['trader/subscription', 'pound', 'Subscription', 'Plan & billing', 0, 'lilac'],
  ];
  return `
  ${N.pageHead(`${greet}, ${esc(t.person.split(' ')[0])}`, `Here\u2019s where ${esc(t.biz)} stands today.`, `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">${ic('search')}Browse events</button><button type="button" class="btn btn-side btn-sm" data-go="trader/passport">${ic('id')}My passport</button>`, N.fd(TODAY, { weekday: 'long', day: 'numeric', month: 'long' }))}
  <div class="tr-hero" data-note="${esc("Current dashboard shows 'Passport: 90% complete' next to '5 of 5 completed'. Readiness is now worked out from the documents, and completion from the admin-weighted sections, so the two numbers never contradict each other.")}">${readyBlock()}${completionCard()}</div>
  ${priorityCard()}
  <div class="stats">
    ${stat('trader/invitations', 'mail', 'Pending invitations', inv.length, inv.length ? `From ${esc([...new Set(inv.map(i => db.organisers[i.from].company))].join(' and '))}` : 'None waiting')}
    ${stat('trader/applications', 'clock', 'In review', pend.length, info.length ? `${N.plural(info.length, 'other needs', 'others need')} your answer` : 'Waiting for organisers')}
    ${stat('trader/applications', 'check-circle', 'Approved applications', appr.length, appr[0] ? `Next: ${esc(ev(appr[0].e).name)}, ${N.fShort(ev(appr[0].e).date)}` : 'No upcoming events yet')}
    ${stat('trader/passport', 'id', 'Passport status', t.status === 'approved' ? 'Approved' : N.cap(t.status), 'Visible to organisers', 'tr-numtxt')}
  </div>
  <div class="grid g-main">
    <section class="card" data-note="${esc("Organiser names replace 'Organizer #2', and each row says what happens next.")}">
      <div class="card-h"><div><h3>Recent activity</h3><p class="small muted">Your applications, newest first.</p></div><button type="button" class="btn btn-ghost btn-xs" data-go="trader/applications">View all${ic('arrow-right')}</button></div>
      <div class="list">${recent.map(appLi).join('') || N.empty('No applications yet', 'Browse events to send your first one.', '', 'inbox')}</div>
    </section>
    <section class="card">
      <div class="card-h"><div><h3>Open opportunities</h3><p class="small muted">Events you qualify for and haven\u2019t applied to.</p></div><button type="button" class="btn btn-ghost btn-xs" data-go="trader/events">Browse all${ic('arrow-right')}</button></div>
      ${opps.length ? `<div class="list">${opps.map(id => { const e = ev(id), el = elig(id); return `<div class="li">${N.evd(e.date, 'side')}<div class="li-main"><b>${esc(e.name)}</b><span>${esc(e.city)} \u00b7 ${esc(orgName(id))} \u00b7 ${N.plural(pitchesLeft(e), 'pitch', 'pitches')} left</span><span class="tr-chips" style="margin-top:6px">${el.chip}${inviteFor(id) ? N.chip('violet plain', 'Invited') : ''}</span></div><div class="li-end"><button type="button" class="btn btn-side btn-xs" data-go="trader/apply/${esc(id)}">Apply</button></div></div>`; }).join('')}</div>` : N.empty('Nothing new right now', 'When an event matches your passport, it shows up here first.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'search')}
    </section>
  </div>
  <section class="stack" style="--g:12px">
    ${secHead('Manage', 'Everything in your account, one tap away.')}
    <div class="tr-quick">${QUICK.map(([go, icon, t1, s, n, tone]) => `<button type="button" class="tr-qt" data-go="${go}"><span class="tr-ico t-${tone}">${ic(icon)}</span><span><b>${t1}</b><span class="s">${s}</span></span><span class="row" style="--g:6px">${n ? `<span class="count">${n}</span>` : ''}${ic('chevron-right', 'ic-sm')}</span></button>`).join('')}</div>
  </section>`;
}

/* ---------- 2 - passport ---------- */
const VIEWERS = [
  { org: 'reed', at: -26, via: 'Opened from your Leeds Summer Festival application' },
  { org: 'harbour', at: -150, via: 'Viewed before inviting you to Cardiff Christmas Market' },
  { org: 'northern', at: -310, via: 'Found you in trader search' },
];
function passportDoc() {
  const t = me(), r = N.readiness(TID), units = myUnits().filter(u => u.status === 'active');
  const rs = db.reviews.filter(x => x.dir === 'o2t' && x.to === TID);
  const rating = rs.length ? rs.reduce((s, x) => s + x.stars, 0) / rs.length : (t.rating || 0);
  const docs = docRows();
  const prev = myApps().filter(a => a.st === 'approved' && isPast(a)).map(a => ({ name: ev(a.e).name, where: ev(a.e).city, date: ev(a.e).date, by: orgName(a.e), verified: true }))
    .concat((t.history || []).map(h => ({ name: h.name, where: h.loc, date: h.date, by: 'Self-reported', verified: false }))).sort((x, y) => N.dt(y.date || '2000-01-01') - N.dt(x.date || '2000-01-01'));
  const specs = [t.cuisine, ...(t.categories || []), ...(t.tags || [])].filter(Boolean);
  return `<article class="tr-pp">
    <header class="tr-pp-cover on-hedge">
      <div class="row between"><div class="stack" style="--g:2px">${N.wm('wm-sm on-dark')}<span class="eyebrow">Food Trader Passport</span></div><span class="mono muted">${ppNo()}</span></div>
      <div class="tr-pp-id">
        <div class="tr-photo lg">${photoInner()}</div>
        <div class="stack" style="--g:10px">
          <h2 class="tr-pp-name">${esc(t.display || t.biz)}</h2>
          <p class="muted">${esc(t.person)} \u00b7 ${esc(t.food)}</p>
          <ul class="tr-pp-facts"><li>${ic('calendar', 'ic-sm')}Trading since <b>${t.since}</b></li><li>${ic('pin', 'ic-sm')}<b>${esc(t.city)}</b></li><li>${N.stars(rating)}<b>${rating ? rating.toFixed(1) : '\u2014'}</b> organiser rating</li></ul>
          <div class="row" style="--g:8px">${t.status === 'approved' ? N.checked('Approved') : N.chip('warn', N.cap(t.status))}</div>
        </div>
        ${N.ring(r, '', 'ready')}
      </div>
      ${r >= 90 ? `<div class="stamp tr-pp-stamp">${N.stamp('st-tr-pp')}</div>` : ''}
    </header>
    <div class="tr-pp-body">
      <section class="tr-pp-sec full"><p class="eyebrow">About</p><p class="tr-pp-bio">${esc(t.bio || 'No bio yet.')}</p></section>
      <section class="tr-pp-sec"><p class="eyebrow">Specialities</p><div class="tags">${specs.map(x => `<span class="tag">${esc(x)}</span>`).join('') || '<span class="small muted">None added yet</span>'}</div><p class="xs muted">Travels up to ${t.radius || 60} miles from ${esc(t.city)}</p></section>
      <section class="tr-pp-sec"><p class="eyebrow">Food hygiene</p>${N.fhrs(Number(t.fhrs), false)}<p class="xs muted">${esc(t.authority || 'Local authority')} \u00b7 last inspected ${N.fLong(t.inspected)}</p></section>
      <section class="tr-pp-sec full"><p class="eyebrow">Trading units</p>${units.length ? `<ul class="list">${units.map(u => `<li class="li">${planViz(u)}<div class="li-main"><b>${esc(u.name)}</b><span>${esc(u.type)} \u00b7 ${m2(u.w)} \u00d7 ${m2(u.d)} m</span><div class="tr-specs" style="margin-top:6px"><span class="tr-spec ${u.gas ? 'on' : ''}">${u.gas ? 'GAS' : 'NO GAS'}</span><span class="tr-spec ${u.power ? 'on' : ''}">${u.power ? esc(u.power) + ' POWER' : 'NO POWER'}</span><span class="tr-spec ${u.water ? 'on' : ''}">${u.water ? 'WATER' : 'NO WATER'}</span></div></div><div class="li-end"></div></li>`).join('')}</ul>` : '<p class="small muted">No active units.</p>'}</section>
      <section class="tr-pp-sec full"><p class="eyebrow">Compliance</p><ul class="tr-pp-docs">${docs.map(x => `<li><span><b>${esc(x.t.name)}</b><span class="xs muted">${esc(x.t.level)} level${x.u ? ' \u00b7 ' + esc(x.u.name) : ''}</span></span>${N.docChip(x.st)}<span class="mono">${x.d.exp ? 'to ' + N.fLong(x.d.exp) : x.t.expiry ? '\u2014' : 'No expiry'}</span></li>`).join('')}</ul></section>
      <section class="tr-pp-sec full"><p class="eyebrow">Previous events</p>${prev.length ? `<ul class="list">${prev.map(p => `<li class="li">${p.date ? N.evd(p.date) : ''}<div class="li-main"><b>${esc(p.name)}</b><span>${esc(p.where || '')} \u00b7 ${esc(p.by)}</span></div><div class="li-end">${p.verified ? N.checked('Verified') : N.chip('plain', 'Self-reported')}</div></li>`).join('')}</ul>` : '<p class="small muted">No events yet.</p>'}</section>
    </div>
  </article>`;
}
function passportPage() {
  const t = me(), sh = S('share', () => ({ active: true, days: 14 }));
  return `${N.pageHead('My passport', 'This is exactly what organisers see when you apply or share your link.', `<button type="button" class="btn btn-ghost btn-sm" data-go="site/passport">${ic('eye')}Preview public page</button><button type="button" class="btn btn-line btn-sm" data-act="tr_pdf">${ic('printer')}Export PDF</button><button type="button" class="btn btn-side btn-sm" data-act="tr_share">${ic('share')}Share passport</button>`)}
  <div class="grid g-side" style="align-items:start">
    ${passportDoc()}
    <aside class="stack" style="--g:16px">
      <section class="card stack" style="--g:10px"><div class="row between"><h3 class="h4">Share link</h3>${sh.active ? N.chip('ok', 'Active') : N.chip('plain', 'Off')}</div><p class="tr-linktxt">niche.co/p/${ppNo()}</p><p class="xs muted">${sh.active ? `Anyone with the link can view it until ${N.fLong(N.addDays(TODAY, sh.days))}.` : 'Turned off. Nobody can open the link.'}</p><button type="button" class="btn btn-line btn-sm" data-act="tr_share">${ic('link')}Manage link</button></section>
      <section class="card"><div class="card-h"><h3>Who viewed your passport</h3><span class="mtag">Last 30 days</span></div><ul class="list">${VIEWERS.filter(v => db.organisers[v.org]).map(v => `<li class="li">${N.oav(v.org, 'sm')}<div class="li-main"><b>${esc(db.organisers[v.org].company)}</b><span>${esc(v.via)}</span></div><span class="li-end mono muted">${N.fShort(hoursAgoISO(v.at))}</span></li>`).join('')}</ul></section>
      <section class="card stack" style="--g:10px"><h3 class="h4">Exported PDF</h3>${N.toggle('trPdfContact', 'Show my phone and email on the exported PDF', !!t.pdfContact, 'data-change="tr_pdfContact"')}<p class="xs muted">Off by default. Organisers you apply to always see your contact details.</p></section>
    </aside>
  </div>`;
}
function openShare() {
  const sh = S('share', () => ({ active: true, days: 14 })), link = `niche.co/p/${ppNo()}`;
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Share passport</p><h3>Send your passport to any organiser</h3><p class="muted">The link opens your passport as organisers see it. Your document files stay private until you apply.</p></div>
  <div class="tr-linkbox ${sh.active ? '' : 'off'}">${ic('link')}<input class="inp" id="trShareLink" value="${esc(link)}" readonly aria-label="Passport link"><button type="button" class="btn btn-ink btn-sm" data-act="tr_copyLink" ${sh.active ? '' : 'disabled'}>${ic('copy')}Copy</button></div>
  <div class="stack" style="--g:14px">
    ${N.toggle('trShareOn', 'Link is active', sh.active, 'data-change="tr_shareActive"')}
    <label class="field" for="trShareDays"><span>Link expires after</span><select class="sel" id="trShareDays" data-change="tr_shareDays" ${sh.active ? '' : 'disabled'}>${[7, 14, 30].map(n => `<option value="${n}" ${n === sh.days ? 'selected' : ''}>${n} days</option>`).join('')}</select></label>
    <p class="small muted">${sh.active ? `Works until <b>${N.fLong(N.addDays(TODAY, sh.days))}</b>. Turn it off at any time and the link stops working straight away.` : 'The link is off. Turn it on to share again. The address stays the same.'}</p>
  </div>
  <div class="modal-foot"><button type="button" class="btn btn-side btn-sm" data-close>Done</button></div>`);
}
function openPdf() {
  const t = me();
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Export PDF</p><h3>Your passport as a three-page PDF</h3><p class="muted">Useful for organisers who still book by email. It always matches your live passport.</p></div>
  <ol class="tr-pdfpages">
    <li><div class="tr-pdfpage" aria-hidden="true"><span class="hd"></span><span></span><span class="s"></span><span></span></div><b>1 \u00b7 Cover</b><small>Name, readiness, hygiene rating and specialities</small></li>
    <li><div class="tr-pdfpage" aria-hidden="true"><span></span><span class="s"></span><span></span><span class="s"></span><span></span><span class="s"></span></div><b>2 \u00b7 Documents</b><small>Every certificate with its status and expiry date</small></li>
    <li><div class="tr-pdfpage" aria-hidden="true"><span class="s"></span><span></span><span></span><span class="s"></span></div><b>3 \u00b7 Track record</b><small>Previous events, units and organiser reviews</small></li>
  </ol>
  <p class="small">${t.pdfContact ? `${ic('eye', 'ic-sm')} Your phone and email <b>are included</b>.` : `${ic('eye-off', 'ic-sm')} Your phone and email <b>are hidden</b>. Change this on your passport page or in Business details.`}</p>
  <div class="banner info">${ic('info')}<span>Downloads are switched off in this prototype. Copy your passport link instead: it always shows the latest version.</span></div>
  <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Close</button><button type="button" class="btn btn-side btn-sm" data-act="tr_copyLink">${ic('copy')}Copy passport link</button></div>`);
}

/* ---------- 3 - user guide ---------- */
const GUIDES = [
  { id: 'profile', title: 'Profile setup', mins: 3, icon: 'user', tone: 'mint', go: 'trader/profile', cta: 'Open profile setup', sub: 'What organisers see first.',
    status: () => me().bio && me().phone && me().company ? ['ok', 'Done'] : ['plain', 'Get started'],
    steps: [['Add your personal details', 'Your name, email and phone. Only organisers you apply to see your contact details.'], ['Fill in your business details', 'Trading name, registered company, address and your food hygiene rating.'], ['Write your public profile', 'A short bio, your cuisine and speciality tags. Organisers read this before anything else.'], ['Add past events', 'Events you traded at before Niche count towards your track record.']] },
  { id: 'units', title: 'Trading units', mins: 2, icon: 'truck', tone: 'butter', go: 'trader/units', cta: 'Open trading units', sub: 'Sizes, gas and power for every setup.',
    status: () => myUnits().some(u => u.status === 'active') ? ['ok', 'Done'] : ['warn', 'Needs setup'],
    steps: [['Add a unit', 'One for each setup you trade from: truck, trailer, gazebo or stall.'], ['Measure it', 'Width, depth and frontage in metres. Organisers match these to their pitches.'], ['Say what it needs', 'Gas cooking and power decide which safety certificates you need.'], ['Activate it', 'Only active units can be used in applications.']] },
  { id: 'compliance', title: 'Compliance', mins: 4, icon: 'shield', tone: 'sky', go: 'trader/documents', cta: 'Open my documents', sub: 'Documents that make you eligible.',
    status: () => N.readiness(TID) >= 90 ? ['ok', 'Approved'] : ['warn', 'Needs attention'],
    steps: [['Upload your core documents', 'Insurance, hygiene certificate, risk assessment, registration and training. Every event needs these.'], ['Add unit documents', 'Gas Safety for units that cook with gas, Electrical Safety for units that draw power.'], ['Wait for approval', 'In review means we have your file. Approved appears once our team checks it.'], ['Renew before expiry', 'We remind you 30 days ahead and show which events a lapse would affect.']] },
  { id: 'apply', title: 'Applying to events', mins: 3, icon: 'send', tone: 'lilac', go: 'trader/events', cta: 'Browse events', sub: 'From browsing to a confirmed pitch.',
    status: () => { const n = myApps().length; return n ? ['ok', `${N.plural(n, 'application')} sent`] : ['info', 'Start applying']; },
    steps: [['Browse with eligibility on', 'Each event shows whether your passport qualifies before you apply.'], ['Choose a unit and check the rules', 'We compare the organiser\u2019s rules with your documents and show a match score.'], ['Answer the organiser\u2019s questions', 'Short answers about water, covers and anything unusual.'], ['Track the decision', 'My applications shows each step and what happens next.']] },
  { id: 'reviews', title: 'Organiser reviews', mins: 2, icon: 'star', tone: 'peach', go: 'trader/reviews', cta: 'Open my reviews', sub: 'Ratings build trust both ways.',
    status: () => { const n = db.reviews.filter(r => r.dir === 'o2t' && r.to === TID).length; return n ? ['ok', N.plural(n, 'review')] : ['plain', 'No reviews yet']; },
    steps: [['Trade at an event', 'After each event, the organiser rates punctuality, food quality and communication.'], ['Rate them back', 'Your ratings help other traders pick events that deliver.'], ['Show it on your passport', 'Your average rating appears on your passport for every organiser.']] },
];
function guidePage() {
  const done = GUIDES.filter(g => g.status()[0] === 'ok').length;
  return `${N.pageHead('User guide', 'Short guides for each part of Niche. Most take under five minutes.')}
  <section class="card tr-qs">
    <div class="row between"><div class="stack" style="--g:4px"><p class="eyebrow">Quick start progress</p><p class="d-s">${done} of ${GUIDES.length} done</p></div>${N.ring(Math.round(done / GUIDES.length * 100), 'sm', '')}</div>
    <ol class="tr-qs-steps">${GUIDES.map(g => `<li class="${g.status()[0] === 'ok' ? 'done' : ''}"><span></span>${esc(g.title)}</li>`).join('')}</ol>
  </section>
  <div class="tr-guides">${GUIDES.map(g => { const [c, l] = g.status(); return `<article class="card tr-guide"><div class="row between" style="align-items:flex-start"><span class="tr-ico t-${g.tone}">${ic(g.icon)}</span>${N.chip(c, l)}</div><div class="stack" style="--g:4px"><p class="eyebrow">${g.mins} min guide</p><h3 class="h3">${esc(g.title)}</h3><p>${esc(g.sub)}</p></div><button type="button" class="btn btn-line btn-sm" data-act="tr_guide" data-id="${g.id}">Open guide${ic('arrow-right')}</button></article>`; }).join('')}</div>
  <section class="blk blk-mint tr-help"><div class="row" style="--g:16px"><span class="tr-ico lg t-surface">${ic('help', 'ic-lg')}</span><div class="stack" style="--g:4px"><h2 class="h3">Need help?</h2><p>Our team answers within one working day, Monday to Friday.</p></div></div><button type="button" class="btn btn-hedge" data-go="site/help">Contact support${ic('arrow-right')}</button></section>`;
}
function openGuide(id) {
  const g = GUIDES.find(x => x.id === id); if (!g) return;
  const [c, l] = g.status();
  N.openDrawer(`<header class="dr-head"><span class="tr-ico t-${g.tone}">${ic(g.icon)}</span><div class="dr-ti"><p class="eyebrow">${g.mins} min guide</p><h3>${esc(g.title)}</h3></div>${closeBtn()}</header>
  <div class="dr-body"><div class="row">${N.chip(c, l)}<span class="small muted">${esc(g.sub)}</span></div><ol class="tr-steps">${g.steps.map(([t, s], i) => `<li><i>${i + 1}</i><div><b>${esc(t)}</b><p>${esc(s)}</p></div></li>`).join('')}</ol></div>
  <footer class="dr-foot"><button type="button" class="btn btn-side" data-go="${g.go}">${esc(g.cta)}${ic('arrow-right')}</button></footer>`);
}

/* ---------- 4 - notifications ---------- */
function notificationsPage() {
  const f = S('notif', () => ({ tab: 'all' }));
  const all = db.notifications.trader.slice().sort((a, b) => b.at - a.at), unread = all.filter(n => n.unread);
  const list = f.tab === 'unread' ? unread : all;
  const tone = { warn: 'butter', info: 'lilac', ok: 'mint', risk: 'peach' }, icon = { warn: 'alert', info: 'bell', ok: 'check', risk: 'alert' };
  return `${N.pageHead('Notifications', unread.length ? `You have ${N.plural(unread.length, 'unread update')}.` : 'You\u2019re all caught up.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_notifAll" ${unread.length ? '' : 'disabled'}>${ic('check')}Mark all as read</button>`)}
  <div class="toolbar">${N.tabsHTML([['all', 'All', all.length], ['unread', 'Unread', unread.length]], f.tab, 'data-act="tr_notifTab" data-k')}</div>
  ${list.length ? `<ul class="tr-notes">${list.map(n => `<li class="tr-note ${n.unread ? 'unread' : ''}"><span class="tr-ico t-${tone[n.tone] || 'sky'}">${ic(icon[n.tone] || 'bell')}</span><div class="tr-note-b"><b>${esc(n.title)}</b><p>${esc(n.text)}</p><span class="mono muted">${N.rel(n.at)}${n.unread ? ' \u00b7 unread' : ''}</span></div><div class="tr-note-a">${n.unread ? `<button type="button" class="btn btn-ghost btn-xs" data-act="tr_notifRead" data-id="${esc(n.id)}">Mark as read</button>` : ''}<button type="button" class="btn btn-line btn-xs" data-act="tr_notifGo" data-id="${esc(n.id)}">View details${ic('arrow-right')}</button></div></li>`).join('')}</ul>`
    : N.empty('No unread notifications', 'New updates about your documents and applications appear here.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_notifTab" data-k="all">Show all</button>`, 'bell')}`;
}

/* ---------- 5 - profile ---------- */
const PTABS = [['personal', 'Personal details'], ['business', 'Business details'], ['public', 'Public profile'], ['history', 'Trader past history']];
const countyOpts = (country, val) => `<option value="">Choose a county</option>` + db.states.filter(s => s && s.name && (!s.country || s.country === country)).map(s => `<option ${s.name === val ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
const tog = (grp, v, on) => `<button type="button" class="tr-tog" data-act="tr_tog" data-grp="${grp}" data-v="${esc(v)}" aria-pressed="${on}">${ic(on ? 'check' : 'plus', 'ic-sm')}${esc(v)}</button>`;
const histRow = (h = {}) => `<div class="tr-hist-row"><input class="inp" name="h_name" value="${esc(h.name || '')}" placeholder="Event name" aria-label="Event name"><input class="inp" name="h_loc" value="${esc(h.loc || '')}" placeholder="Town or city" aria-label="Location"><input class="inp" type="date" name="h_date" value="${esc(h.date || '')}" aria-label="Date"><button type="button" class="icon-btn" data-act="tr_histDel" aria-label="Remove this event">${ic('trash')}</button></div>`;

function profPersonal() {
  const t = me();
  return `<section class="card stack" style="--g:20px">
    ${secHead('Personal details', 'Only organisers you apply to see your email and phone.')}
    <div class="tr-photo-row"><div class="tr-photo" id="trPhoto">${photoInner()}</div><div class="stack" style="--g:8px"><b>Profile photo</b><p class="small muted">Shown in the arch on your passport. Square photos work best.</p><div class="btn-row"><label class="btn btn-line btn-sm tr-filebtn">${ic('upload')}Change photo<input type="file" accept="image/*" data-change="tr_photo" aria-label="Change photo"></label>${t.photo ? `<button type="button" class="btn btn-ghost btn-sm" data-act="tr_photoRemove">Remove</button>` : ''}</div></div></div>
    <div class="form-grid">
      ${N.field({ label: 'Full name', id: 'p_person', value: t.person, req: true, full: true, attrs: 'autocomplete="name"' })}
      ${N.field({ label: 'Email', id: 'p_email', type: 'email', value: t.email, req: true, attrs: 'autocomplete="email"' })}
      ${N.field({ label: 'Phone', id: 'p_phone', type: 'tel', value: t.phone, attrs: 'autocomplete="tel"' })}
    </div>
  </section>`;
}
function profBusiness() {
  const t = me(), countries = db.countries.filter(c => c.enabled !== false).map(c => c.name);
  return `<section class="card stack" style="--g:14px">${secHead('PDF preferences', 'Choose what appears when you export your passport.')}${N.toggle('p_pdf', 'Show my phone number and email on my exported Passport PDF', !!t.pdfContact)}</section>
  <section class="card stack" style="--g:16px">${secHead('Company details')}<div class="form-grid">
    ${N.field({ label: 'Trading name', id: 'p_biz', value: t.biz, req: true })}
    ${N.field({ label: 'Registered company name', id: 'p_company', value: t.company, req: true })}
    ${N.field({ label: 'Website', id: 'p_website', value: t.website, ph: 'yourbusiness.co.uk', full: true, attrs: 'inputmode="url"' })}
  </div></section>
  <section class="card stack" style="--g:16px">${secHead('Address & contact')}<div class="form-grid">
    ${N.field({ label: 'Address line 1', id: 'p_address', value: t.address, full: true, req: true, attrs: 'autocomplete="address-line1"' })}
    ${N.field({ label: 'City', id: 'p_city', value: t.city, req: true })}
    ${N.field({ label: 'Country', id: 'p_country', value: t.country, opts: countries, attrs: 'data-change="tr_country"' })}
    <label class="field" for="p_county"><span>County / State</span><select class="sel" id="p_county" name="p_county">${countyOpts(t.country, t.county)}</select></label>
    ${N.field({ label: 'Postcode', id: 'p_postcode', value: t.postcode, attrs: 'autocomplete="postal-code"' })}
    ${N.field({ label: 'Contact email', id: 'p_contactEmail', type: 'email', value: t.contactEmail })}
    ${N.field({ label: 'Phone', id: 'p_bizPhone', type: 'tel', value: t.bizPhone })}
  </div></section>
  <section class="card stack" style="--g:16px">${secHead('Compliance info', 'Organisers check these against the Food Standards Agency register.')}<div class="form-grid">
    ${N.field({ label: 'Local authority', id: 'p_authority', value: t.authority, full: true })}
    ${N.field({ label: 'Date of registration', id: 'p_regDate', type: 'date', value: t.regDate })}
    ${N.field({ label: 'Date of last inspection', id: 'p_inspected', type: 'date', value: t.inspected })}
    <div class="field full"><span class="lbl">Food hygiene rating</span><div class="tr-fhrs" role="radiogroup" aria-label="Food hygiene rating">${[0, 1, 2, 3, 4, 5].map(n => `<label class="tr-fh"><input type="radio" name="p_fhrs" value="${n}" ${n === Number(t.fhrs) ? 'checked' : ''} data-change="tr_fhrsPick" aria-label="${n}: ${esc(N.FHRS[n])}"><span>${n}</span></label>`).join('')}</div><span class="small muted" id="trFhrsTxt">${esc(N.FHRS[t.fhrs])}. Changing this re-checks every event\u2019s rules.</span></div>
  </div></section>`;
}
function previewCard(v) {
  const t = me();
  return `<article class="tr-prev"><div class="row" style="--g:12px"><div class="tr-photo">${photoInner()}</div><div class="stack" style="--g:2px;min-width:0"><b>${esc(t.display || t.biz)}</b><span class="small muted">${esc(t.city)} \u00b7 ${esc(v.cuisine || '')}</span>${N.stars(t.rating || 0)}</div></div>
    <p class="tr-prev-bio">${esc(v.bio || 'Your bio appears here.')}</p>
    <div class="tags">${[...v.cats, ...v.tags].map(x => `<span class="tag">${esc(x)}</span>`).join('') || '<span class="xs muted">No tags yet</span>'}</div>
    <div class="row between"><span class="xs muted">${ic('pin', 'ic-sm')} Up to ${v.radius} miles</span>${N.rd(N.readiness(TID))}</div></article>`;
}
function profPublic() {
  const t = me(), P = N.state.tr_prof;
  if (!P.tags) P.tags = [...(t.tags || [])];
  if (!P.cats) P.cats = [...(t.categories || [])];
  const radius = t.radius || 60;
  return `<div class="tr-pub">
    <section class="card stack" style="--g:18px">
      ${secHead('Public profile', 'Organisers see this first. Keep it short and specific.')}
      ${N.field({ label: 'Bio', id: 'p_bio', type: 'textarea', value: t.bio, rows: 4, ph: 'What you cook, what makes it yours, and the events you shine at.', hint: 'Up to 280 characters', attrs: 'maxlength="280"' })}
      ${N.field({ label: 'Cuisine', id: 'p_cuisine', value: t.cuisine, opts: [...new Set([t.cuisine, ...db.tags.cuisines].filter(Boolean))] })}
      <div class="field"><span class="lbl">Food categories</span><div class="tr-toggles">${db.tags.foodCategories.map(c => tog('cats', c, P.cats.includes(c))).join('')}</div></div>
      <div class="field"><span class="lbl">Speciality tags <span class="hint">Counts towards passport completion</span></span><div class="tr-toggles">${db.tags.specialityTags.map(c => tog('tags', c, P.tags.includes(c))).join('')}</div></div>
      <div class="field"><span class="lbl">Service radius <span class="hint" id="trRadTxt">${radius} miles from ${esc(t.city)}</span></span><input type="range" class="tr-range" name="p_radius" min="5" max="200" step="5" value="${radius}" aria-label="Service radius in miles"></div>
    </section>
    <aside class="tr-prev-wrap"><p class="eyebrow">Live preview</p><div id="trPrev">${previewCard({ bio: t.bio, cuisine: t.cuisine, tags: P.tags, cats: P.cats, radius })}</div><p class="xs muted">How your card looks in organiser search.</p></aside>
  </div>`;
}
function profHistory() {
  const t = me(), hist = t.history || [];
  const niche = myApps().filter(a => a.st === 'approved' && isPast(a));
  return `<section class="card stack" style="--g:14px">
    ${secHead('Events before Niche', 'Add events you traded at outside Niche. They appear on your passport as self-reported.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_histAdd">${ic('plus')}Add event</button>`)}
    <div class="tr-hist-head" aria-hidden="true"><span>Event name</span><span>Location</span><span>Date</span><span></span></div>
    <div class="tr-hist" id="trHist">${hist.map(histRow).join('')}</div>
    <p class="small muted" id="trHistEmpty" ${hist.length ? 'hidden' : ''}>No events added yet.</p>
  </section>
  <section class="card stack" style="--g:10px">${secHead('Booked through Niche', 'Added automatically after each event. Organisers see these as verified.')}
    ${niche.length ? `<div class="list">${niche.map(a => { const e = ev(a.e); return `<div class="li">${N.evd(e.date)}<div class="li-main"><b>${esc(e.name)}</b><span>${esc(e.city)} \u00b7 ${esc(orgName(a.e))}</span></div><div class="li-end">${N.checked('Verified')}</div></div>`; }).join('')}</div>` : '<p class="small muted">Your first Niche event will appear here.</p>'}
  </section>`;
}
function profilePage() {
  const P = S('prof', () => ({ tab: 'personal', tags: null, cats: null }));
  const i = Math.max(0, PTABS.findIndex(t => t[0] === P.tab)), last = i === PTABS.length - 1;
  const body = { personal: profPersonal, business: profBusiness, public: profPublic, history: profHistory }[PTABS[i][0]]();
  return `${N.pageHead('Profile setup', 'What organisers see on your passport. Save each section as you go.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/passport">${ic('eye')}Preview passport</button>`)}
  ${N.utabs(PTABS, PTABS[i][0], 'data-act="tr_profTab" data-tab')}
  <form class="tr-form" data-form="tr_profile" data-tab="${PTABS[i][0]}" ${PTABS[i][0] === 'public' ? 'data-input="tr_prev" data-change="tr_prev"' : ''}>
    ${body}
    <div class="tr-form-foot"><button type="button" class="btn btn-ghost" data-act="tr_profStep" data-d="-1" ${i === 0 ? 'disabled' : ''}>${ic('arrow-left')}Back</button><button type="submit" class="btn btn-side">${last ? 'Save profile' : 'Save & continue'}${ic(last ? 'check' : 'arrow-right')}</button></div>
  </form>`;
}
function updatePreview() {
  const f = $('form[data-tab="public"]'), box = $('#trPrev'), P = N.state.tr_prof; if (!f || !box || !P) return;
  const v = { bio: f.elements.p_bio.value, cuisine: f.elements.p_cuisine.value, tags: P.tags || [], cats: P.cats || [], radius: Number(f.elements.p_radius.value) };
  box.innerHTML = previewCard(v);
  const r = $('#trRadTxt'); if (r) r.textContent = `${v.radius} miles from ${me().city}`;
}
function goProfileTab(tab) {
  const P = S('prof', () => ({ tab: 'personal', tags: null, cats: null }));
  P.tab = tab; P.tags = null; P.cats = null;
  if (N.cur.path === 'trader/profile') { N.refresh(); window.scrollTo(0, 0); } else N.go('trader/profile');
}

/* ---------- 6 - units ---------- */
function unitCard(u) {
  const apps = myApps().filter(a => a.unitId === u.id || a.unit === u.name).sort((x, y) => y.at - x.at);
  const docs = [u.gas && 'gas', u.power && 'elec'].filter(Boolean).filter(ty => N.docType(ty)).map(ty => { const d = db.docs.find(x => x.trader === TID && x.type === ty && x.unit === u.id) || virt(ty, u.id); return { t: N.docType(ty), d, st: N.docState(d) }; });
  const spec = (on, txt) => `<span class="tr-spec ${on ? 'on' : ''}">${esc(txt)}</span>`;
  return `<article class="card tr-unit ${u.status}">
    <div class="tr-unit-top">${planViz(u)}
      <div class="stack" style="--g:6px;min-width:0;flex:1">
        <div class="row between" style="--g:8px"><h3 class="h3">${esc(u.name)}</h3>${u.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Draft')}</div>
        <p class="small muted">${esc(u.type)} \u00b7 ${m2(u.w)} \u00d7 ${m2(u.d)} m${u.frontage ? ` \u00b7 ${m2(u.frontage)} m frontage` : ''} \u00b7 ${N.plural(Number(u.staff) || 0, 'person', 'people')} on the unit</p>
        <div class="tr-specs">${spec(true, `${m2(u.w)}\u00d7${m2(u.d)}M`)}${spec(u.gas, u.gas ? 'GAS' : 'NO GAS')}${spec(!!u.power, u.power ? `${u.power} POWER` : 'NO POWER')}${spec(u.water, u.water ? 'WATER' : 'NO WATER')}</div>
      </div>
    </div>
    <div class="tr-unit-sec"><p class="dr-h">Unit documents</p>${docs.length ? `<ul class="tr-unit-docs">${docs.map(x => `<li><span>${esc(x.t.name)}</span>${N.docChip(x.st)}<button type="button" class="btn btn-ghost btn-xs" data-act="${x.st === 'missing' ? 'tr_upload' : 'tr_docView'}" data-doc="${esc(x.d.id)}">${x.st === 'missing' ? 'Upload' : 'View'}</button></li>`).join('')}</ul>` : '<p class="small muted">None needed: this unit has no gas and no power.</p>'}</div>
    <div class="tr-unit-sec"><p class="dr-h">Application status</p>${apps.length ? `<ul class="tr-unit-apps">${apps.slice(0, 4).map(a => `<li><button type="button" data-act="tr_appOpen" data-id="${a.id}"><span>${esc(ev(a.e).name)}</span>${appChip(a)}</button></li>`).join('')}</ul>${apps.length > 4 ? `<button type="button" class="link small" data-go="trader/applications">and ${apps.length - 4} more</button>` : ''}` : `<p class="small muted">Not used in any application yet.${u.status === 'draft' ? ' Activate it to use it.' : ''}</p>`}</div>
    <footer class="tr-unit-foot"><button type="button" class="btn btn-line btn-sm" data-act="tr_unitEdit" data-id="${u.id}">${ic('edit')}Edit</button>${u.status === 'draft' ? `<button type="button" class="btn btn-side btn-sm" data-act="tr_unitActivate" data-id="${u.id}">${ic('check')}Activate</button>` : ''}<button type="button" class="btn btn-ghost btn-sm tr-del" data-act="tr_unitDel" data-id="${u.id}">${ic('trash')}Delete</button></footer>
  </article>`;
}
function unitsPage() {
  const units = myUnits();
  return `${N.pageHead('Trading units', 'Manage your physical setup sizes, power requirements and trading documents.', `<button type="button" class="btn btn-side btn-sm" data-act="tr_unitEdit">${ic('plus')}Add new unit</button>`)}
  ${units.length ? `<div class="tr-units" data-note="${esc('Each unit now shows its own safety documents and which applications use it, instead of a separate application-status screen.')}">${units.map(unitCard).join('')}</div>`
    : N.empty('No trading units yet', 'Add the truck, trailer or stall you trade from. Organisers use it to check your pitch fits.', `<button type="button" class="btn btn-side btn-sm" data-act="tr_unitEdit">${ic('plus')}Add new unit</button>`, 'truck')}`;
}
const UNIT_TYPES = ['Standalone food truck', 'Trailer', 'Gazebo / marquee', 'Market stall', 'Kiosk', 'Horsebox', 'Cart'];
function openUnit(id) {
  const x = id ? unitById(id) : null;
  const u = x || { name: '', type: 'Standalone food truck', w: 3, d: 3, frontage: 3, gas: false, power: null, water: false, staff: 2, cuisine: me().food, status: 'draft' };
  const types = UNIT_TYPES.includes(u.type) ? UNIT_TYPES : [u.type, ...UNIT_TYPES];
  N.openDrawer(`<header class="dr-head"><span class="tr-ico t-butter">${ic('truck')}</span><div class="dr-ti"><h3>${x ? 'Edit unit' : 'Add a trading unit'}</h3><p>Organisers use this to check your pitch fits.</p></div>${closeBtn()}</header>
  <form class="tr-drawer-form" data-form="tr_unit" data-id="${x ? x.id : ''}">
    <div class="dr-body">
      <div class="form-grid">
        ${N.field({ label: 'Unit name', id: 'u_name', value: u.name, req: true, full: true, ph: 'e.g. Alice Street Truck' })}
        ${N.field({ label: 'Type', id: 'u_type', value: u.type, opts: types, full: true })}
        ${N.field({ label: 'Width', id: 'u_w', type: 'number', value: u.w, req: true, hint: 'metres', attrs: 'min="0.5" max="30" step="0.1" inputmode="decimal"' })}
        ${N.field({ label: 'Depth', id: 'u_d', type: 'number', value: u.d, req: true, hint: 'metres', attrs: 'min="0.5" max="30" step="0.1" inputmode="decimal"' })}
        ${N.field({ label: 'Frontage', id: 'u_front', type: 'number', value: u.frontage || u.w, hint: 'metres of serving side', attrs: 'min="0.5" max="30" step="0.1" inputmode="decimal"' })}
        ${N.field({ label: 'Staff on unit', id: 'u_staff', type: 'number', value: u.staff || 1, attrs: 'min="1" max="20" step="1" inputmode="numeric"' })}
      </div>
      <div class="stack" style="--g:14px">
        <div class="field"><span class="lbl">Power</span><div class="tr-segfield">${N.seg('u_power', [['', 'None'], ['13A', '13A'], ['16A', '16A'], ['32A', '32A']], u.power || '')}<input type="hidden" name="u_power" value="${esc(u.power || '')}"></div><span class="hint">Units that draw power need an Electrical Safety Certificate.</span></div>
        <div class="tr-toggle-row">${N.toggle('u_gas', 'Cooks with gas', !!u.gas)}${N.toggle('u_water', 'Needs water', !!u.water)}</div>
        <p class="xs muted">Cooking with LPG needs a Gas Safety Certificate from a Gas Safe engineer.</p>
      </div>
      ${N.field({ label: 'Cuisine served', id: 'u_cuisine', value: u.cuisine || '', ph: 'e.g. Halal street food' })}
    </div>
    <footer class="dr-foot"><div class="btn-row" style="justify-content:flex-end"><button type="submit" name="mode" value="draft" class="btn btn-line">Save as draft</button><button type="submit" name="mode" value="active" class="btn btn-side">${ic('check')}Save & activate</button></div></footer>
  </form>`);
}

/* ---------- 7 - documents ---------- */
function timeline() {
  const SPAN = 90, pos = s => Math.max(0, Math.min(100, N.daysFrom(s) / SPAN * 100)), inWin = s => { const n = N.daysFrom(s); return n >= 0 && n <= SPAN; };
  const lanes = items => { const last = []; return items.map(it => { let l = last.findIndex(x => it.x - x >= 17); if (l < 0) l = last.length < 3 ? last.length : last.indexOf(Math.min(...last)); last[l] = it.x; return { ...it, lane: l }; }); };
  const evs = lanes(committed().filter(a => inWin(ev(a.e).date)).map(a => ({ a, e: ev(a.e), x: pos(ev(a.e).date) })));
  const docs = lanes(myDocs().filter(d => d.exp && d.status !== 'missing' && inWin(d.exp)).sort((x, y) => N.dt(x.exp) - N.dt(y.exp)).map(d => ({ d, x: pos(d.exp) })));
  const cl = clashes().filter(c => inWin(c.e.date) || inWin(c.d.exp));
  const months = [];
  for (let i = 1; i <= SPAN; i++) { const s = N.addDays(TODAY, i); if (s.endsWith('-01')) months.push(s); }
  const tone = a => a.st === 'approved' ? 'approved' : a.st === 'info' ? 'info' : 'pending';
  return `<section class="card tr-tl" aria-label="Document expiry dates against your events, next 90 days" data-note="${esc('New: a 90-day strip puts document expiry dates next to the events you are booked for, so a clash shows up before it costs a pitch.')}">
    <div class="card-h" style="margin:0"><div class="stack" style="--g:2px"><p class="eyebrow">Next 90 days</p><h3>Expiry dates against your events</h3></div><div class="tr-tl-key"><span><i class="ev"></i>Your events</span><span><i class="doc"></i>Document expiry</span></div></div>
    <div class="tr-tl-scroll"><div class="tr-tl-track">
      ${months.map(s => `<span class="tr-tl-m" style="left:${pos(s)}%"><span>${N.fd(s, { month: 'short' })}</span></span>`).join('')}
      <div class="tr-tl-axis"></div>
      <span class="tr-tl-today"><span>Today</span></span>
      ${cl.map(c => { const a = pos(c.d.exp), b = pos(c.e.date); return `<span class="tr-tl-gap" style="left:${a}%;width:${Math.max(1, b - a)}%" title="${esc(`${N.docType(c.d.type).name} lapses ${N.plural(c.gap, 'day')} before ${c.e.name}`)}"></span>`; }).join('')}
      ${evs.map(x => `<button type="button" class="tr-tl-ev ${tone(x.a)} ${x.x > 76 ? 'end' : ''}" style="left:${x.x}%;--lane:${x.lane}" data-act="tr_appOpen" data-id="${x.a.id}" aria-label="${esc(`${x.e.name}, ${N.fLong(x.e.date)}, ${APP_CHIP[x.a.st] ? APP_CHIP[x.a.st][1] : x.a.st}`)}"><span class="pl">${esc(x.e.name.split(' ')[0])} \u00b7 ${N.fShort(x.e.date)}</span></button><span class="tr-tl-dot ${tone(x.a)}" style="left:calc(${x.x}% )"></span>`).join('')}
      ${docs.map(x => `<button type="button" class="tr-tl-doc ${x.x > 70 ? 'end' : ''}" style="left:${x.x}%;--lane:${x.lane}" data-act="tr_docView" data-doc="${esc(x.d.id)}" aria-label="${esc(`${N.docType(x.d.type).name} expires ${N.fLong(x.d.exp)}`)}"><span class="pl">${esc(N.docType(x.d.type).name.replace(' Certificate', ''))} expires ${N.fShort(x.d.exp)}</span></button><span class="tr-tl-dot doc" style="left:${x.x}%"></span>`).join('')}
    </div></div>
    ${cl.length ? cl.map(c => `<div class="banner warn">${ic('alert')}<span class="grow"><b>${esc(N.docType(c.d.type).name)}</b> expires ${N.fShort(c.d.exp)}, ${N.plural(c.gap, 'day')} before <b>${esc(c.e.name)}</b> (${N.fShort(c.e.date)}).</span><button type="button" class="btn btn-ink btn-xs" data-act="tr_upload" data-doc="${esc(c.d.id)}">${ic('upload')}Upload renewal</button></div>`).join('')
      : `<div class="banner ok">${ic('check-circle')}<span>No document expires before an event you\u2019re booked for.</span></div>`}
  </section>`;
}
function docTr(r) {
  const { t, d, u, st } = r, n = d.exp ? N.daysFrom(d.exp) : null;
  const tone = { valid: 'ok', expiring: 'warn', expired: 'risk', pending: 'info', rejected: 'risk', missing: 'sky' }[st];
  const exp = d.exp ? `<span class="tr-exp"><b>${N.fLong(d.exp)}</b><span class="s ${st === 'expiring' ? 'warn' : st === 'expired' ? 'risk' : ''}">${n < 0 ? `Expired ${N.plural(-n, 'day')} ago` : `${N.plural(n, 'day')} left`}</span></span>` : `<span class="tr-exp"><span class="s">${t.expiry ? 'Not set' : 'No expiry'}</span></span>`;
  const acts = d.virtual || st === 'missing'
    ? `<button type="button" class="btn btn-side btn-xs" data-act="tr_upload" data-doc="${esc(d.id)}">${ic('upload')}Upload</button>`
    : `<button type="button" class="btn btn-ghost btn-xs" data-act="tr_docView" data-doc="${esc(d.id)}">${ic('eye')}View</button><button type="button" class="btn btn-line btn-xs" data-act="tr_upload" data-doc="${esc(d.id)}">Replace</button>`;
  return `<tr class="${['expiring', 'expired', 'rejected'].includes(st) ? 'tr-attn' : ''}">
    <td data-l="Document"><div class="cell"><span class="tr-ico sm t-${tone}">${ic(st === 'valid' ? 'check' : st === 'pending' ? 'clock' : st === 'missing' ? 'upload' : 'alert')}</span><div><b>${esc(t.name)}</b><span class="s">${u ? `${esc(u.name)} \u00b7 ${t.id === 'gas' ? 'cooks with gas' : t.id === 'elec' ? `${esc(u.power || '')} power` : ''}` : esc(d.file || t.desc)}</span>${r.tier === 1 ? '<span class="tr-req">Required</span>' : ''}</div></div></td>
    <td data-l="Level"><span class="mtag">${esc(t.level)}</span></td>
    <td data-l="Status">${N.docChip(st)}</td>
    <td data-l="Expiry">${exp}</td>
    <td data-l="Actions" class="r"><div class="tr-acts">${acts}</div></td>
  </tr>`;
}
function tierSection(tier, rows, total) {
  if (!rows.length) return '';
  const [h, s] = tier === 1 ? ['Tier 1: Core compliance', 'Universal documents required for every event.'] : ['Tier 2: Setup specific', 'Required based on your unit and equipment.'];
  return `<section class="stack" style="--g:12px">${secHead(h, s, `<span class="mtag">${rows.length === total ? N.plural(total, 'item') : `${rows.length} of ${total}`}</span>`)}
    <div class="tbl-wrap"><table class="tbl stack-sm tr-doctbl"><thead><tr><th>Document</th><th>Level</th><th>Status</th><th>Expiry</th><th class="r">Actions</th></tr></thead><tbody>${rows.map(docTr).join('')}</tbody></table></div></section>`;
}
function documentsPage() {
  const f = S('docs', () => ({ filter: 'all' }));
  const rows = docRows();
  const cnt = k => k === 'all' ? rows.length : rows.filter(r => DOC_F[r.st] === k).length;
  const tabs = [['all', 'All'], ['missing', 'Missing'], ['review', 'In review'], ['approved', 'Approved'], ['expiring', 'Expiring'], ['rejected', 'Rejected']].map(([k, l]) => [k, l, cnt(k)]);
  const shown = rows.filter(r => f.filter === 'all' || DOC_F[r.st] === f.filter);
  const t1 = rows.filter(r => r.tier === 1).length, t2 = rows.filter(r => r.tier === 2).length;
  return `${N.pageHead('My documents', 'Upload once. We check each file and remind you before anything expires.', `<button type="button" class="btn btn-side btn-sm" data-act="tr_upPick">${ic('upload')}Upload a document</button>`)}
  ${timeline()}
  <div class="toolbar">${N.tabsHTML(tabs, f.filter, 'data-act="tr_docFilter" data-k')}</div>
  <div class="banner info">${ic('info')}<span><b>In review</b> means we received your file. <b>Approved</b> appears once our team approves it.</span></div>
  ${shown.length ? tierSection(1, shown.filter(r => r.tier === 1), t1) + tierSection(2, shown.filter(r => r.tier === 2), t2)
    : N.empty('Nothing here', f.filter === 'rejected' ? 'None of your documents have been rejected.' : 'No documents match this filter.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_docFilter" data-k="all">Show all documents</button>`, 'file')}`;
}

/* ---------- 8 - browse events ---------- */
function evCard(id) {
  const e = ev(id), el = elig(id), app = appFor(id), inv = inviteFor(id), l = pitchesLeft(e);
  return `<article class="card tr-ev">
    ${N.evd(e.date, 'side')}
    <div class="tr-ev-main">
      <div class="tr-ev-t"><h3 class="h4">${esc(e.name)}</h3>${inv ? N.chip('violet plain', 'Invited') : ''}${e.external ? N.chip('plain', 'External') : ''}</div>
      <p class="small muted">${esc(e.venue)}, ${esc(e.city)} \u00b7 ${e.external ? 'Listed by the Niche team' : 'by ' + esc(orgName(id))} \u00b7 ${esc(evDates(e))}</p>
      <div class="tr-ev-meta"><span class="mtag">${esc(e.type)}</span><span class="mtag">${esc(feeTxt(e))}</span><span class="tr-left">${N.bar(e.pitches ? l / e.pitches * 100 : 0, l <= 3 ? 'warn' : 'ok')}${l} of ${e.pitches} pitches left</span></div>
      <div class="tr-chips">${app ? appChip(app) : el.chip}</div>
    </div>
    <div class="tr-ev-act"><button type="button" class="btn btn-ghost btn-sm" data-act="tr_evOpen" data-id="${esc(id)}">View details</button>${applyBtn(id)}</div>
  </article>`;
}
function eventResults() {
  const f = S('ev', () => ({ q: '', city: '', type: '', elig: false, sort: 'soon', page: 1 }));
  let ids = browsable();
  const q = f.q.trim().toLowerCase();
  if (q) ids = ids.filter(id => { const e = ev(id); return `${e.name} ${e.venue} ${e.city}`.toLowerCase().includes(q); });
  if (f.city) ids = ids.filter(id => ev(id).city === f.city);
  if (f.type) ids = ids.filter(id => ev(id).type === f.type);
  if (f.elig) ids = ids.filter(id => N.sumChecks(N.evalChecks(TID, id)).can);
  ids.sort(f.sort === 'left' ? (a, b) => pitchesLeft(ev(b)) - pitchesLeft(ev(a)) : (a, b) => byDate(ev(a), ev(b)));
  if (!ids.length) return N.empty('No events match', 'Try another city or event type, or turn off \u201cOnly events I\u2019m eligible for\u201d.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_evReset">Clear filters</button>`, 'search');
  const per = 6, pages = Math.max(1, Math.ceil(ids.length / per)); f.page = Math.min(Math.max(1, f.page), pages);
  return `<p class="small muted tr-count">${N.plural(ids.length, 'event')}${f.elig ? ' you qualify for' : ''}${q ? ` matching \u201c${esc(f.q.trim())}\u201d` : ''}</p>
  <div class="tr-evs">${ids.slice((f.page - 1) * per, f.page * per).map(evCard).join('')}</div>
  ${N.pager(f.page, pages, 'data-act="tr_evPage" data-p', ids.length, per)}`;
}
function eventsPage() {
  const f = S('ev', () => ({ q: '', city: '', type: '', elig: false, sort: 'soon', page: 1 }));
  const all = browsable(), cities = [...new Set(all.map(id => ev(id).city))].sort(), types = [...new Set(all.map(id => ev(id).type))].sort();
  return `${N.pageHead('Browse events', 'Every event shows whether your passport qualifies before you apply.')}
  <div class="card tr-evfilters" data-note="${esc("Eligibility is shown on every card with the exact reason, e.g. 'Not eligible: Electrical Safety Certificate', instead of finding out after applying.")}">
    <label class="search">${ic('search')}<span class="sr">Search events</span><input type="search" value="${esc(f.q)}" placeholder="Search by event name or venue" data-input="tr_evQ" autocomplete="off"></label>
    <select class="sel sm" data-change="tr_evCity" aria-label="City"><option value="">All cities</option>${cities.map(c => `<option ${c === f.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <select class="sel sm" data-change="tr_evType" aria-label="Event type"><option value="">All event types</option>${types.map(c => `<option ${c === f.type ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
    <div class="tr-evfilters-2">${N.toggle('trElig', 'Only events I\u2019m eligible for', f.elig, 'data-change="tr_evElig"')}<div class="row" style="--g:8px"><span class="small muted">Sort</span>${N.seg('tr_evSort', [['soon', 'Soonest'], ['left', 'Most pitches left']], f.sort)}</div></div>
  </div>
  <div id="trEvResults">${eventResults()}</div>`;
}
function openExternal(eid) {
  const e = ev(eid); if (!e) return;
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">External listing</p><h3>${esc(e.name)} takes applications on its own site</h3><p class="muted">The Niche team listed this event so you can find it. The organiser handles applications directly.</p></div>
  ${N.kv([['Website', esc(String(e.externalLink || '').replace(/^https?:\/\//, ''))], ['Email', esc(e.externalEmail || '\u2014')], ['Closes', N.fLong(e.deadline)], ['Your eligibility', elig(eid).chip]])}
  <div class="banner info">${ic('info')}<span>Links to other sites are switched off in this prototype. Copy the address to open it yourself.</span></div>
  <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Close</button><button type="button" class="btn btn-side btn-sm" data-act="tr_copyExt" data-id="${esc(eid)}">${ic('copy')}Copy organiser link</button></div>`);
}

/* ---------- 9 - apply ---------- */
function applyState(eid) {
  let A = N.state.tr_apply;
  if (!A || A.eid !== eid) A = N.state.tr_apply = { eid, step: 0, unit: null, invite: null, water: '', covers: '', notes: '', msg: '' };
  const inv = A.invite ? db.invites.find(i => i.id === A.invite && i.st === 'open') : inviteFor(eid);
  A.invite = inv ? inv.id : null;
  const active = myUnits().filter(u => u.status === 'active');
  if (!A.unit || !active.some(u => u.id === A.unit)) A.unit = (inv && active.some(u => u.id === inv.unit) ? inv.unit : active[0] && active[0].id) || null;
  return A;
}
function applySide(eid, el) {
  const e = ev(eid);
  return `<aside class="tr-apply-side stack" style="--g:14px">
    <div class="card tr-evsum">${N.art(e.tone || 'mint', e.city, e.type)}<div class="stack" style="--g:10px"><h3 class="h4">${esc(e.name)}</h3>${N.kv([['Date', esc(evDates(e))], ['Hours', esc(e.time || '\u2014')], ['Fee', esc(feeTxt(e))], ['Pitches left', `${pitchesLeft(e)} of ${e.pitches}`], ['Footfall', Number(e.footfall || 0).toLocaleString('en-GB')], ['Closes', N.fLong(e.deadline)]])}</div></div>
    ${el ? `<div class="card row" style="--g:14px">${N.ring(el.score, el.score >= 90 ? 'sm' : 'sm warn', '')}<div class="stack" style="--g:2px;min-width:0;flex:1"><b>Match score ${el.score}%</b><span class="small muted">Worked out from ${N.plural(el.cs.length, 'rule')}</span></div></div>` : ''}
    <div class="card"><p class="eyebrow">What happens next</p><ol class="tr-next-steps"><li><div><b>${esc(e.external ? 'The organiser' : orgName(eid))} reviews it</b><span>Usually within 3 days</span></div></li><li><div><b>You hear back here and by email</b><span>They may ask a question first</span></div></li><li><div><b>Pitch and load-in details</b><span>Sent once you\u2019re approved</span></div></li></ol></div>
  </aside>`;
}
function stepUnit(eid, A) {
  const e = ev(eid), units = myUnits();
  return `<div class="stack" style="--g:4px"><p class="eyebrow">Step 1 of 4</p><h2 class="h3">Choose the unit you\u2019ll bring</h2><p class="small muted">${esc(orgName(eid))} checks its size against a ${e.frontage || '\u2014'} m frontage. Only active units can be used.</p></div>
  ${units.length ? `<div class="radio-cards">${units.map(u => { const off = u.status !== 'active', fits = !e.frontage || Number(u.frontage || u.w) <= e.frontage; return `<label class="rcard ${off ? 'tr-off' : ''}"><input type="radio" name="unit" value="${u.id}" ${A.unit === u.id ? 'checked' : ''} ${off ? 'disabled' : ''} data-change="tr_applyUnit"><b>${esc(u.name)}</b><span>${esc(u.type)} \u00b7 ${m2(u.w)} \u00d7 ${m2(u.d)} m</span><span>${u.gas ? 'Gas' : 'No gas'} \u00b7 ${u.power ? esc(u.power) : 'no power'} \u00b7 ${u.water ? 'water' : 'no water'}</span><span class="tr-fit">${off ? 'Draft: activate it in Trading units' : fits ? '\u2713 Fits the frontage' : 'Wider than the frontage'}</span></label>`; }).join('')}</div>` : ''}
  ${!units.some(u => u.status === 'active') ? `<div class="banner warn">${ic('truck')}<span class="grow">You need an active unit to apply.</span><button type="button" class="btn btn-ink btn-xs" data-go="trader/units">Set up a unit</button></div>` : `<button type="button" class="link small" data-go="trader/units">${ic('edit')}Manage trading units</button>`}`;
}
function stepReq(eid, A, el, inv) {
  const u = unitById(A.unit), w = Math.round(100 / Math.max(1, el.cs.length));
  const docFor = { fhrs: 'Food Hygiene Certificate', pli: 'Public Liability Insurance', gas: 'Gas Safety Certificate', allergen: 'Allergen information', power: `${u ? u.name : 'Unit'} power`, elec: 'Electrical Safety Certificate', vegan: 'Menu' };
  const stChip = c => c.st === 'ok' ? N.chip('ok', 'Met') : c.st === 'warn' ? N.chip('warn tr-wrapchip', c.val) : N.chip('risk', 'Missing');
  return `<div class="stack" style="--g:4px"><p class="eyebrow">Step 2 of 4</p><h2 class="h3">Check the requirements</h2><p class="small muted">We compared ${esc(orgName(eid))}\u2019s rules with your passport. Nothing to upload unless something is missing.</p></div>
  <div class="tr-req-top">${N.ring(el.score, el.score >= 90 ? '' : 'warn', 'match')}<div><b>Overall match score</b><p class="small muted">${el.fails.length ? `${N.plural(el.fails.length, 'requirement')} not met yet.` : el.warns.length ? 'You meet the rules. One thing needs attention before the day.' : 'You meet every requirement for this event.'}</p></div></div>
  <div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Requirement</th><th>Document</th><th>Status</th><th class="r">Weight</th></tr></thead><tbody>${el.cs.map(c => `<tr><td data-l="Requirement"><b>${esc(c.label)}</b><div class="xs muted">${esc(c.val)}</div></td><td data-l="Document">${esc(docFor[c.key] || c.label)}</td><td data-l="Status">${stChip(c)}</td><td data-l="Weight" class="r mono">${w}%</td></tr>`).join('')}</tbody></table></div>
  ${el.warns.some(c => c.key === 'gas') ? `<div class="banner warn">${ic('clock')}<span class="grow">Your Gas Safety Certificate runs out before this event. You can still apply; upload the renewal before ${N.fShort(me().gas)}.</span><button type="button" class="btn btn-ink btn-xs" data-act="tr_upload" data-doc="${esc((db.docs.find(d => d.trader === TID && d.type === 'gas') || {}).id || '')}">Upload renewal</button></div>` : ''}
  ${el.fails.length && inv ? `<div class="banner info">${ic('mail')}<span>${esc(db.organisers[inv.from].company)} invited you, so you can still send this. They\u2019ll ask for ${esc(el.fails.map(c => c.miss).join(', '))} before confirming your pitch.</span></div>` : ''}`;
}
function stepQs(eid, A) {
  const u = unitById(A.unit);
  if (!A.water) A.water = u && u.water ? 'yes' : 'no';
  return `<div class="stack" style="--g:4px"><p class="eyebrow">Step 3 of 4</p><h2 class="h3">Answer ${esc(orgName(eid))}\u2019s questions</h2><p class="small muted">Short answers are fine. They go to ${esc(orgPerson(eid))} with your application.</p></div>
  <div class="stack" style="--g:18px">
    <div class="field"><span class="lbl">Do you need a water point?</span><div class="tr-segfield">${N.seg('ap_water', [['no', 'No, we bring our own'], ['yes', 'Yes, please']], A.water)}<input type="hidden" name="water" value="${esc(A.water)}"></div></div>
    ${N.field({ label: 'Roughly how many covers can you serve per hour?', id: 'covers', type: 'number', value: A.covers, ph: 'e.g. 60', req: true, attrs: 'min="1" max="2000" inputmode="numeric"' })}
    ${N.field({ label: 'Anything we should know?', id: 'notes', type: 'textarea', value: A.notes, ph: 'Access needs, generator noise, queue layout\u2026', rows: 3, hint: 'Optional' })}
  </div>`;
}
function officialDoc(eid, A, el) {
  const e = ev(eid), u = unitById(A.unit), t = me();
  const docs = docRows().filter(r => r.tier === 1 || (u && r.u && r.u.id === u.id));
  return `<figure class="tr-offdoc">
    <header>${N.wm('wm-sm')}<span class="mono muted">APPLICATION \u00b7 NCH-APP-${String(nextAppId()).padStart(5, '0')}</span></header>
    <dl><div><dt>Trader</dt><dd>${esc(t.display || t.biz)} (${esc(t.company)})</dd></div><div><dt>Passport</dt><dd>${ppNo()}</dd></div><div><dt>Event</dt><dd>${esc(e.name)} \u00b7 ${esc(evDates(e))}</dd></div><div><dt>Unit</dt><dd>${u ? `${esc(u.name)} \u00b7 ${m2(u.w)} \u00d7 ${m2(u.d)} m${u.power ? ' \u00b7 ' + esc(u.power) : ''}` : '\u2014'}</dd></div></dl>
    <ul>${docs.map(r => `<li><span>${esc(r.t.name)}</span>${N.docChip(r.st)}</li>`).join('')}</ul>
    <footer><span>Readiness ${N.readiness(TID)}% \u00b7 Match ${el.score}% \u00b7 Issued ${N.fLong(TODAY)}</span><span class="stamp">${N.stamp('st-tr-app')}</span></footer>
    <figcaption>Official Niche application document</figcaption>
  </figure>`;
}
function stepReview(eid, A, el, inv) {
  const u = unitById(A.unit), sure = inv && !el.fails.length && !el.warns.length;
  return `<div class="stack" style="--g:4px"><p class="eyebrow">Step 4 of 4</p><h2 class="h3">Review and send</h2><p class="small muted">${esc(orgName(eid))} receives the document below with your passport.</p></div>
  ${sure ? `<div class="banner ok">${ic('check-circle')}<span>${esc(db.organisers[inv.from].company)} invited you and you meet every rule, so your place is confirmed as soon as you send this.</span></div>` : ''}
  ${N.kv([['Unit', esc(u ? u.name : '\u2014')], ['Match score', `${el.score}%`], ['Water point', A.water === 'yes' ? 'Needed' : 'Not needed'], ['Covers per hour', esc(A.covers || '\u2014')]])}
  ${N.field({ label: `Message to ${orgPerson(eid)}`, id: 'msg', type: 'textarea', value: A.msg, ph: 'Say hello, mention past events or anything that makes you a good fit.', rows: 3, hint: 'Optional' })}
  ${officialDoc(eid, A, el)}`;
}
function applyPage(eid) {
  const e = ev(eid);
  if (!e) return N.empty('We couldn\u2019t find that event', 'The organiser may have removed it.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'calendar');
  const head = N.pageHead(`Apply to ${esc(e.name)}`, `${esc(evDates(e))} \u00b7 ${esc(e.venue)}, ${esc(e.city)} \u00b7 ${e.external ? 'External listing' : esc(orgName(eid))}`, `<button type="button" class="btn btn-ghost btn-sm" data-go="trader/events">${ic('arrow-left')}Back to events</button>`, 'Application');
  const app = appFor(eid);
  if (app) return `${head}<div class="grid g-main"><section class="card stack" style="--g:16px"><div class="row between">${appChip(app)}${pipe(app)}</div><h2 class="d-s">You applied on ${N.fLong(hoursAgoISO(app.at))}</h2><p class="ink-2">${esc(nextStep(app))}</p><div class="btn-row">${app.st === 'info' ? `<button type="button" class="btn btn-side btn-sm" data-act="tr_answer" data-id="${app.id}">Answer questions</button>` : ''}<button type="button" class="btn btn-line btn-sm" data-act="tr_appOpen" data-id="${app.id}">See full details</button><button type="button" class="btn btn-ghost btn-sm" data-go="trader/applications">My applications</button></div></section>${applySide(eid, null)}</div>`;
  if (e.external) return `${head}<div class="grid g-main"><section class="card stack" style="--g:16px"><div class="banner info">${ic('arrow-up-right')}<span>${esc(e.name)} takes applications on the organiser\u2019s own site.</span></div><p class="ink-2">${esc(e.about || '')}</p><h3 class="h4">Your eligibility</h3>${N.reqList(elig(eid).cs)}<div class="btn-row"><button type="button" class="btn btn-side btn-sm" data-act="tr_external" data-id="${esc(eid)}">Apply on organiser\u2019s site${ic('arrow-up-right')}</button></div></section>${applySide(eid, null)}</div>`;
  if (e.status !== 'published' || N.eventState(e) !== 'upcoming') return `${head}${N.empty('Applications are closed', 'This event is no longer taking applications.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse other events</button>`, 'calendar')}`;
  const A = applyState(eid), el = elig(eid), inv = inviteFor(eid);
  if (!el.s.can && !inv) return `${head}<div class="grid g-main"><section class="card stack" style="--g:16px"><div class="banner risk">${ic('alert')}<span><b>You can\u2019t apply yet.</b> ${esc(orgName(eid))} needs: ${esc(el.fails.map(c => c.miss).join(', '))}.</span></div><h2 class="h3">What\u2019s missing</h2>${N.reqList(el.cs)}<p class="small muted">Documents you upload count straight away while they\u2019re in review.</p><div class="btn-row"><button type="button" class="btn btn-side btn-sm" data-go="trader/documents">${ic('file')}Go to my documents</button><button type="button" class="btn btn-ghost btn-sm" data-go="trader/events">Browse other events</button></div></section>${applySide(eid, el)}</div>`;
  const steps = ['Choose unit', 'Check requirements', 'Answer questions', 'Review & send'];
  const body = [stepUnit, stepReq, stepQs, stepReview][A.step](eid, A, el, inv);
  return `${head}
  <div class="tr-apply">
    <div class="stack" style="--g:18px;min-width:0" id="trWiz">
      ${N.stepper(steps, A.step)}
      ${inv ? `<div class="banner info">${ic('mail')}<span><b>${esc(db.organisers[inv.from].company)} invited you.</b>${inv.msg ? ` \u201c${esc(inv.msg)}\u201d` : ''}</span></div>` : ''}
      <form class="card tr-wiz" data-form="tr_applyNext" data-input="tr_applyField" novalidate>
        ${body}
        <div class="tr-wiz-foot">${A.step ? `<button type="button" class="btn btn-ghost" data-act="tr_applyBack">${ic('arrow-left')}Back</button>` : '<span></span>'}${A.step < 3 ? `<button type="submit" class="btn btn-side" ${A.step === 0 && !A.unit ? 'disabled' : ''}>Continue${ic('arrow-right')}</button>` : `<button type="submit" class="btn btn-side">${ic('send')}Send application</button>`}</div>
      </form>
    </div>
    ${applySide(eid, el)}
  </div>`;
}

/* ---------- 10 - applications ---------- */
function applicationsPage() {
  const f = S('apps', () => ({ tab: 'all', per: 10, page: 1 }));
  const all = myApps().slice().sort((x, y) => y.at - x.at);
  const cnt = k => k === 'all' ? all.length : all.filter(a => appKey(a) === k).length;
  const tabs = [['all', 'All'], ['pending', 'Pending'], ['info', 'Needs info'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['past', 'Past']].map(([k, l]) => [k, l, cnt(k)]);
  const list = all.filter(a => f.tab === 'all' || appKey(a) === f.tab);
  const pages = Math.max(1, Math.ceil(list.length / f.per)); f.page = Math.min(Math.max(1, f.page), pages);
  const rows = list.slice((f.page - 1) * f.per, f.page * f.per);
  const review = cnt('pending') + cnt('info');
  return `${N.pageHead('My applications', 'Every application, where it is, and what happens next.', `<button type="button" class="btn btn-line btn-sm" data-act="tr_appsRefresh">${ic('refresh')}Refresh</button><button type="button" class="btn btn-side btn-sm" data-go="trader/events">${ic('search')}Browse events</button>`)}
  <div class="tr-sumstrip"><div><span class="num">${review}</span><span>Applications under review</span></div><i class="sep"></i><div><span class="num">${cnt('info')}</span><span>need your answer</span></div><i class="sep"></i><div><span class="num">${cnt('approved')}</span><span>approved and upcoming</span></div></div>
  <div class="toolbar">${N.tabsHTML(tabs, f.tab, 'data-act="tr_appsTab" data-k')}<label class="row small muted" style="--g:8px">Show<select class="sel sm" data-change="tr_appsPer" aria-label="Rows per page" style="width:auto">${[10, 20, 50, 100].map(n => `<option ${n === f.per ? 'selected' : ''}>${n}</option>`).join('')}</select>per page</label></div>
  ${rows.length ? `<div class="card tr-apps" data-note="${esc("Statuses say what happens next instead of 'Incomplete' or a truncated 'invitation ac\u2026'. Each row shows Sent \u2192 Reviewed \u2192 Decision and names the organiser.")}">
    ${rows.map(a => { const e = ev(a.e); return `<button type="button" class="tr-app" data-act="tr_appOpen" data-id="${a.id}">
      ${N.evd(e.date, isPast(a) ? '' : 'side')}
      <span class="tr-app-main"><b>${esc(e.name)}</b><span class="tr-app-org">${e.org ? N.oav(e.org, 'sm') : ''}${esc(orgName(a.e))}</span><span class="xs muted">${esc(evDates(e))} \u00b7 ${esc(a.unit || 'Unit')}</span></span>
      <span class="tr-app-st">${appChip(a)}${pipe(a)}<span class="tr-next xs">${esc(nextStep(a))}</span></span>
      <span class="btn btn-ghost btn-xs tr-app-more">More details${ic('chevron-right')}</span>
    </button>`; }).join('')}
  </div>${N.pager(f.page, pages, 'data-act="tr_appsPage" data-p', list.length, f.per)}`
    : N.empty(f.tab === 'info' ? 'No questions waiting' : 'No applications here', f.tab === 'all' ? 'Browse events and send your first application.' : 'Nothing in this tab right now.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'inbox')}`;
}

/* ---------- 11 - invitations ---------- */
function invCard(i) {
  const e = ev(i.e), o = db.organisers[i.from] || { company: orgName(i.e), person: '' }, u = unitById(i.unit), el = elig(i.e);
  return `<article class="card tr-inv">
    ${N.art(e.tone || 'mint', N.fd(e.date, { day: 'numeric', month: 'short' }), e.city)}
    <div class="tr-inv-body">
      <div class="row between" style="align-items:flex-start"><div class="row" style="--g:10px">${db.organisers[i.from] ? N.oav(i.from, 'sm') : ''}<div class="stack" style="--g:0"><b>${esc(o.company)}</b><span class="xs muted">${esc(o.person)} \u00b7 invited you ${esc(N.rel(i.at).toLowerCase())}</span></div></div>${el.chip}</div>
      <h3 class="h3">${esc(e.name)}</h3>
      ${N.kv([['Event', `${esc(e.name)}, ${esc(e.city)}`], ['Date', esc(evDates(e))], ['Unit', u ? esc(u.name) : 'Choose when you apply'], ['Reply by', N.fLong(e.deadline)]])}
      ${i.msg ? `<blockquote class="tr-quote">\u201c${esc(i.msg)}\u201d</blockquote>` : ''}
      <div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="tr_invDecline" data-id="${esc(i.id)}">Decline</button><button type="button" class="btn btn-side btn-sm" data-act="tr_invOpen" data-id="${esc(i.id)}">View & complete application${ic('arrow-right')}</button></div>
    </div>
  </article>`;
}
function invitationsPage() {
  const list = openInvites().sort((x, y) => y.at - x.at), answered = db.invites.filter(i => i.t === TID && i.st !== 'open' && ev(i.e));
  return `${N.pageHead('Invitations', 'Organisers who want you at their event. Reply before the deadline.')}
  ${list.length ? `<div class="tr-invs">${list.map(invCard).join('')}</div>` : N.empty('No open invitations', 'When an organiser invites you to an event, it appears here and in your notifications.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'mail')}
  ${answered.length ? `<section class="card"><div class="card-h"><h3>Answered</h3></div><div class="list">${answered.map(i => { const e = ev(i.e); return `<div class="li">${N.evd(e.date)}<div class="li-main"><b>${esc(e.name)}</b><span>${esc((db.organisers[i.from] || {}).company || '')}${i.reason ? ` \u00b7 \u201c${esc(i.reason)}\u201d` : ''}</span></div><div class="li-end">${i.st === 'accepted' ? N.chip('ok', 'Accepted') : N.chip('plain', 'Declined')}</div></div>`; }).join('')}</div></section>` : ''}`;
}

/* ---------- 12 - rate organisers ---------- */
function rateTargets() {
  return myApps().filter(a => a.st === 'approved' && ev(a.e).org && db.organisers[ev(a.e).org]).map(a => {
    const e = ev(a.e);
    return { a, e, org: e.org, past: isPast(a), review: db.reviews.find(r => r.dir === 't2o' && r.from === TID && r.to === e.org && r.e === a.e) };
  }).sort((x, y) => byDate(y.e, x.e));
}
function rateCard(x) {
  const o = db.organisers[x.org];
  const r = x.review;
  return `<article class="card tr-rate">
    <div class="row" style="--g:12px;flex-wrap:nowrap">${N.oav(x.org)}<div class="stack" style="--g:0;min-width:0;flex:1"><b>${esc(o.company)}</b><span class="small muted">${esc(x.e.name)} \u00b7 ${N.fShort(x.e.date)}</span></div>${r ? N.chip('ok', 'Rated') : x.past ? N.chip('warn', 'To rate') : N.chip('info', 'Upcoming')}</div>
    ${r ? `<div class="stack" style="--g:6px">${N.stars(r.stars)}<p class="small ink-2">${esc(r.text || 'No comment.')}</p><span class="xs muted">You rated them on ${N.fLong(r.when)}</span></div>`
      : `<p class="small muted">${x.past ? 'How did it go? Your rating helps other traders choose.' : 'You can rate now for how things have gone so far, and update it after the event.'}</p><button type="button" class="btn ${x.past ? 'btn-side' : 'btn-line'} btn-sm" data-act="tr_rateOpen" data-id="${x.a.id}" style="align-self:flex-start">${ic('star')}Rate ${esc(o.company)}</button>`}
  </article>`;
}
function ratePage() {
  const items = rateTargets(), todo = items.filter(x => !x.review && x.past), soon = items.filter(x => !x.review && !x.past), done = items.filter(x => x.review);
  const grp = (title, sub, arr) => arr.length ? `<section class="stack" style="--g:12px">${secHead(title, sub)}<div class="tr-rates">${arr.map(rateCard).join('')}</div></section>` : '';
  return `${N.pageHead('Rate organisers', 'Your ratings help other traders pick events that deliver what they promise.')}
  ${items.length ? grp('Ready to rate', 'Events you traded at.', todo) + grp('Coming up', 'Approved events you haven\u2019t traded at yet.', soon) + grp('Already rated', '', done)
    : N.empty('Nobody to rate yet', 'Once you\u2019re approved for an event, the organiser appears here.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'star')}`;
}
function openRate(appId) {
  const a = appById(appId); if (!a) return;
  const e = ev(a.e), o = db.organisers[e.org]; if (!o) return;
  const rows = [['overall', 'Overall'], ['comm', 'Communication'], ['day', 'Organisation on the day'], ['footfall', 'Footfall as promised']];
  N.openDrawer(`<header class="dr-head">${N.oav(e.org, 'lg')}<div class="dr-ti"><h3>Rate ${esc(o.company)}</h3><p>${esc(e.name)} \u00b7 ${esc(evDates(e))}</p></div>${closeBtn()}</header>
  <form class="tr-drawer-form" data-form="tr_rate" data-id="${a.id}">
    <div class="dr-body">
      <ul class="tr-rate-rows">${rows.map(([k, l]) => `<li><span${k === 'overall' ? ' class="req"' : ''}>${l}</span>${N.starInput('r_' + k, 0)}</li>`).join('')}</ul>
      <p class="tr-err" id="trRateErr" hidden>Choose an overall rating to continue.</p>
      ${N.field({ label: 'Comment', id: 'r_text', type: 'textarea', rows: 4, ph: 'What went well? What should they fix next time?', hint: 'Optional' })}
      <p class="xs muted">${esc(o.company)} sees your rating and comment. Other traders see the average.</p>
    </div>
    <footer class="dr-foot"><div class="btn-row" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-side">${ic('star')}Submit review</button></div></footer>
  </form>`);
}

/* ---------- 13 - my reviews ---------- */
function reviewsPage() {
  const rs = db.reviews.filter(r => r.dir === 'o2t' && r.to === TID).sort((x, y) => N.dt(y.when) - N.dt(x.when));
  const avg = rs.length ? rs.reduce((s, r) => s + Number(r.stars || 0), 0) / rs.length : 0;
  const cat = k => { const v = rs.filter(r => r[k] != null); return v.length ? v.reduce((s, r) => s + Number(r[k]), 0) / v.length : 0; };
  if (!rs.length) return `${N.pageHead('My reviews', 'What organisers say after you trade with them.')}${N.empty('No reviews yet', 'After each event, the organiser rates punctuality, food quality and communication. Reviews appear here and on your passport.', `<button type="button" class="btn btn-line btn-sm" data-go="trader/events">Browse events</button>`, 'star')}`;
  return `${N.pageHead('My reviews', 'What organisers say after you trade with them.')}
  <div class="grid g-main">
    <section class="card tr-score"><div class="stack" style="--g:6px"><p class="num">${avg.toFixed(1)}</p>${N.stars(avg)}</div><div class="stack" style="--g:6px"><h2 class="h3">Your organiser score</h2><p class="muted">Based on ${N.plural(rs.length, 'organiser review')}. It shows on your passport next to your name.</p></div></section>
    <section class="card stack" style="--g:14px"><h3 class="h4">By category</h3><ul class="tr-bars">${[['punct', 'Punctuality'], ['qual', 'Food quality'], ['comm', 'Communication']].map(([k, l]) => { const v = cat(k); return `<li><span>${l}</span>${N.bar(v / 5 * 100, v >= 4.5 ? 'ok' : v >= 3.5 ? 'warn' : 'risk')}<span class="mono">${v ? v.toFixed(1) : '\u2014'}</span></li>`; }).join('')}</ul></section>
  </div>
  <div class="tr-badges">
    ${avg >= 4.5 ? `<div class="tr-badge blk-mint"><span class="tr-ico t-surface">${ic('award')}</span><div><b>High trust score</b><p>Top 10% of traders in your category.</p></div></div>` : ''}
    ${cat('punct') >= 4.5 ? `<div class="tr-badge blk-lilac"><span class="tr-ico t-surface">${ic('clock')}</span><div><b>Reliable partner</b><p>Consistently high ratings for punctuality.</p></div></div>` : ''}
    <div class="tr-badge blk-butter"><span class="tr-ico t-surface">${ic('users')}</span><div><b>Impact</b><p>Your reviews help organisers find reliable partners.</p></div></div>
  </div>
  <section class="card"><div class="card-h"><h3>What organisers say</h3><span class="mtag">${N.plural(rs.length, 'review')}</span></div>
    <ul class="tr-says">${rs.map(r => { const o = db.organisers[r.from], e = ev(r.e); return `<li>${o ? N.oav(r.from) : N.av('?')}<div><div class="row between"><div class="stack" style="--g:0"><b>${esc(o ? o.company : 'Organiser')}</b><span class="small muted">${esc(o ? o.person : '')}${e ? ` \u00b7 ${esc(e.name)}` : ''} \u00b7 ${N.fLong(r.when)}</span></div>${N.stars(r.stars)}</div><p>${esc(r.text)}</p></div></li>`; }).join('')}</ul>
  </section>`;
}

/* ---------- 14 - feedback ---------- */
const FB_CHIP = { open: ['info', 'Open \u00b7 with our team'], resolved: ['ok', 'Resolved'], closed: ['plain', 'Closed'], progress: ['warn', 'In progress'] };
function feedbackPage() {
  const names = new Set(['Alice Green', me().person]);
  const mine = db.feedback.filter(f => names.has(f.from) && f.role === 'Trader').sort((x, y) => y.at - x.at);
  return `${N.pageHead('Submit feedback', 'Tell us about an event or anything on Niche. The team reads every message.')}
  <div class="tr-fb">
    <form class="card stack" style="--g:16px" data-form="tr_feedback">
      ${N.field({ label: 'Feedback type', id: 'fb_type', value: 'Event Issue', opts: [['Event Issue', 'Event issue'], ['Website / Platform', 'Website / platform']] })}
      ${N.field({ label: 'Subject', id: 'fb_subject', ph: 'What\u2019s this about?', req: true, attrs: 'maxlength="120"' })}
      ${N.field({ label: 'Your feedback', id: 'fb_text', type: 'textarea', ph: 'Share your thoughts...', req: true, rows: 6 })}
      <div class="btn-row" style="justify-content:flex-end"><button type="submit" class="btn btn-side">${ic('send')}Submit feedback</button></div>
    </form>
    <section class="card"><div class="card-h"><h3>Your previous feedback</h3><span class="mtag">${mine.length}</span></div>
      ${mine.length ? `<ul class="tr-fb-list">${mine.map(f => { const [c, l] = FB_CHIP[f.status] || ['plain', N.cap(f.status)]; return `<li><div class="row between"><b>${esc(f.subject)}</b>${N.chip(c, l)}</div><p>${esc(f.text)}</p><span class="xs muted">${esc(f.type)} \u00b7 ${N.rel(f.at)}</span></li>`; }).join('')}</ul>` : N.empty('Nothing sent yet', 'Your feedback and our replies appear here.', '', 'message')}
    </section>
  </div>`;
}

/* ---------- 15 - subscription ---------- */
const FREE_UNTIL = '2026-12-29';
const planPrice = p => p.price === 0 && p.then ? `Free until ${N.fLong(FREE_UNTIL)}, then \u00a3${p.then}/month` : p.price ? `\u00a3${p.price}/month` : 'Free forever';
function subscriptionPage() {
  const plans = db.plans.trader, curId = db.plans.current.trader, cur = plans.find(p => p.id === curId) || plans[0], sub = S('sub', () => ({ status: 'active' }));
  const idx = id => plans.findIndex(p => p.id === id);
  return `${N.pageHead('Subscription', 'Your plan, what it includes and your billing.')}
  <section class="blk blk-hedge tr-cur on-hedge">
    <div class="stack" style="--g:10px"><p class="eyebrow">Current plan</p><h2 class="d-m">${esc(cur.name)}</h2><p class="muted">${esc(cur.tag)}</p><p class="h4" style="color:var(--zest)">${esc(planPrice(cur))}</p></div>
    <div class="stack" style="--g:8px;align-items:flex-start">${sub.status === 'active' ? N.chip('zest', 'Active') : sub.status === 'paused' ? N.chip('warn', 'Paused') : N.chip('risk', 'Ends ' + N.fShort(FREE_UNTIL))}<span class="small muted">Renews ${N.fLong(FREE_UNTIL)}</span></div>
  </section>
  ${sub.status === 'paused' ? `<div class="banner warn">${ic('pause')}<span class="grow"><b>Your plan is paused.</b> Organisers still see your passport, but you can\u2019t apply to events until you resume.</span><button type="button" class="btn btn-ink btn-xs" data-act="tr_resume">Resume plan</button></div>` : ''}
  ${sub.status === 'cancelled' ? `<div class="banner risk">${ic('info')}<span class="grow"><b>${esc(cur.name)} ends on ${N.fLong(FREE_UNTIL)}.</b> You\u2019ll move to Lite. Your passport and documents stay.</span><button type="button" class="btn btn-ink btn-xs" data-act="tr_resume">Keep ${esc(cur.name)}</button></div>` : ''}
  <section class="stack" style="--g:12px">${secHead('Plans', 'Switch at any time. Changes apply straight away.')}
    <div class="tr-plans">${plans.map(p => { const isCur = p.id === cur.id, up = idx(p.id) > idx(cur.id); return `<article class="card tr-plan ${isCur ? 'cur' : ''}">
      <div class="row between"><h3 class="h3">${esc(p.name)}</h3>${isCur ? N.chip('side', 'Current') : p.popular ? N.chip('violet plain', 'Most popular') : ''}</div>
      <div class="price">${p.price ? `<span class="num">\u00a3${p.price}</span><span class="small muted">/month</span>` : `<span class="num">Free</span>${p.then ? `<span class="small muted">then \u00a3${p.then}/month</span>` : ''}`}</div>
      <p class="small muted">${esc(p.tag)}</p>
      <ul>${p.features.map(x => `<li>${x.endsWith(':') ? '<span></span>' : ic('check')}<span>${esc(x)}</span></li>`).join('')}</ul>
      ${isCur ? `<button type="button" class="btn btn-line btn-sm btn-block" disabled>Current plan</button>` : `<button type="button" class="btn ${up ? 'btn-side' : 'btn-line'} btn-sm btn-block" data-act="tr_plan" data-id="${esc(p.id)}">${p.managed ? 'Apply for Advance' : up ? `Upgrade to ${esc(p.name)}` : `Downgrade to ${esc(p.name)}`}</button>`}
    </article>`; }).join('')}</div>
  </section>
  <section class="blk blk-peach tr-launch"><div class="row" style="--g:16px"><span class="tr-ico lg t-surface">${ic('rocket', 'ic-lg')}</span><div class="stack" style="--g:4px"><h2 class="h3">Starting from scratch?</h2><p>NICHE Launch takes you from idea to first pitch, done for you.</p></div></div><button type="button" class="btn btn-ink" data-go="site/launch">See NICHE Launch${ic('arrow-right')}</button></section>
  <div class="grid g2">
    <section class="card stack" style="--g:12px"><h3 class="h4">Billing details</h3>${N.kv([['Billed to', esc(me().company)], ['Email', esc(me().contactEmail || me().email)], ['Payment method', 'None needed yet'], ['First payment', N.fLong(FREE_UNTIL)]])}<button type="button" class="btn btn-line btn-sm" data-act="demoToast" data-msg="You\u2019ll add a card before ${N.fLong(FREE_UNTIL)}. We\u2019ll remind you two weeks ahead." style="align-self:flex-start">${ic('pound')}Add payment method</button></section>
    <section class="card"><div class="card-h"><h3>Invoices</h3></div>${N.empty('No invoices yet', `You\u2019re in your free period. Your first invoice arrives on ${N.fLong(FREE_UNTIL)}.`, '', 'file')}</section>
  </div>
  <section class="card stack" style="--g:12px">${secHead('Pause or cancel plan', 'Pausing keeps everything but stops applications. Cancelling moves you to Lite at the end of the period.')}
    <div class="btn-row"><button type="button" class="btn btn-line btn-sm" data-act="tr_pause" ${sub.status !== 'active' ? 'disabled' : ''}>${ic('pause')}Pause plan</button><button type="button" class="btn btn-danger-line btn-sm" data-act="tr_cancel" ${sub.status === 'cancelled' ? 'disabled' : ''}>Cancel plan</button></div>
  </section>`;
}

/* =====================================================================
   6 \u00b7 ROUTES
   ===================================================================== */
const page = (path, def) => N.page(path, { app: 'trader', ...def, after(root, p) {
  const fresh = N.state.tr_seen !== N.cur.path; N.state.tr_seen = N.cur.path;
  if (fresh) animateRings(root);
} });
page('trader/dashboard', { title: 'Dashboard', nav: 'trader/dashboard', render: dashboard });
page('trader/passport', { title: 'My Passport', nav: 'trader/passport', render: passportPage });
page('trader/guide', { title: 'User Guide', nav: 'trader/guide', render: guidePage });
page('trader/notifications', { title: 'Notifications', nav: 'trader/notifications', render: notificationsPage });
page('trader/profile', { title: 'Profile Setup', nav: 'trader/profile', render: profilePage });
page('trader/business-info', { title: 'Business details', nav: 'trader/profile', crumbs: [['Profile setup', 'trader/profile'], ['Business details']], render: () => { S('prof', () => ({ tab: 'personal', tags: null, cats: null })).tab = 'business'; return profilePage(); } });
page('trader/units', { title: 'Trading Units', nav: 'trader/units', render: unitsPage });
page('trader/documents', { title: 'My Documents', nav: 'trader/documents', crumbs: [['Trader', 'trader/dashboard'], ['My Documents']], render: documentsPage });
page('trader/events', { title: 'Browse Events', nav: 'trader/events', render: eventsPage });
page('trader/apply/:id', { title: p => db.events[p.id] ? `Apply \u00b7 ${db.events[p.id].name}` : 'Apply', nav: 'trader/events', example: 'trader/apply/brighton', crumbs: p => [['Browse events', 'trader/events'], [db.events[p.id] ? db.events[p.id].name : 'Apply']], render: p => applyPage(p.id) });
page('trader/applications', { title: 'My Applications', nav: 'trader/applications', render: applicationsPage });
page('trader/invitations', { title: 'Invitations', nav: 'trader/invitations', render: invitationsPage });
page('trader/rate', { title: 'Rate Organisers', nav: 'trader/rate', render: ratePage });
page('trader/reviews', { title: 'My Reviews', nav: 'trader/reviews', render: reviewsPage });
page('trader/feedback', { title: 'Feedback', nav: 'trader/feedback', render: feedbackPage });
page('trader/subscription', { title: 'Subscription', nav: 'trader/subscription', render: subscriptionPage });

/* =====================================================================
   7 \u00b7 HANDLERS
   ===================================================================== */
const rerender = (sel, html) => { const box = $(sel); if (box) { box.innerHTML = html; N.applyNotes(); } };
const readNotif = pred => db.notifications.trader.forEach(n => { if (n.unread && pred(n)) n.unread = false; });
const orgNotify = (eid, title, text) => { const e = ev(eid); if (e && e.org && e.org === db.me.org && db.notifications.org) { const n = { id: N.uid('o'), at: 0, tone: 'info', title, text, go: 'org/applications', unread: true }; db.notifications.org.unshift(n); return n; } return null; };
const dropNotif = (list, n) => { if (!n || !list) return; const i = list.indexOf(n); if (i >= 0) list.splice(i, 1); };

Object.assign(N.act, {
  /* shared overlays */
  tr_evOpen(el) { openEvent(el.dataset.id); },
  tr_appOpen(el) { openApp(el.dataset.id); },
  tr_answer(el) { openAnswer(el.dataset.id); },
  tr_docView(el) { openDocView(el.dataset.doc); },
  tr_upload(el) { openUpload(el.dataset.doc); },
  tr_external(el) { openExternal(el.dataset.id); },
  tr_copyExt(el) { const e = ev(el.dataset.id); N.copy(String(e.externalLink || '').replace(/^https?:\/\//, '')); },

  /* dashboard */
  tr_part(el) { const g = PART_GO[el.dataset.label]; if (!g) return; if (g[1]) goProfileTab(g[1]); else N.go(g[0]); },

  /* documents */
  tr_docFilter(el) { S('docs', () => ({})).filter = el.dataset.k; N.refresh(); },
  tr_upPick() {
    const order = ['missing', 'expired', 'rejected', 'expiring', 'pending', 'valid'];
    const rows = docRows().sort((a, b) => order.indexOf(a.st) - order.indexOf(b.st));
    N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Upload a document</p><h3>Which document?</h3><p class="muted">The ones that need you are at the top.</p></div><ul class="tr-pick">${rows.map(r => `<li><button type="button" data-act="tr_upload" data-doc="${esc(r.d.id)}"><span><b>${esc(r.t.name)}</b><span class="xs muted">${r.u ? esc(r.u.name) : esc(r.t.level) + ' level'}</span></span>${N.docChip(r.st)}${ic('chevron-right', 'ic-sm')}</button></li>`).join('')}</ul>`);
  },
  tr_sampleFile() { const U = N.state.tr_up; if (!U) return; const d = resolveDoc(U.key); startUpload(`${N.slug(N.docType(d.type).name)}-2027.pdf`, 482133); },
  tr_upRestart() { const U = N.state.tr_up; if (!U) return; U.step = 'pick'; U.token = null; drawUpload(); },
  tr_docDelete(el) {
    const d = db.docs.find(x => x.id === el.dataset.doc); if (!d) return;
    const name = N.docType(d.type).name;
    N.confirm({ title: `Delete your ${name}?`, text: 'The file is removed and the document shows as not uploaded. Organisers will see it as missing until you upload it again.', confirm: 'Delete document', danger: true, onConfirm: () => {
      const before = { ...d };
      Object.assign(d, { status: 'missing', file: null, exp: null, uploaded: null, note: '' });
      if (d.type === 'gas') N.syncAlice();
      N.closeAll(); N.refresh();
      N.toast(`<b>${esc(name)}</b> deleted.`, { icon: 'trash', undo: () => { const i = db.docs.indexOf(d); if (i >= 0) db.docs.splice(i, 1, before); if (before.type === 'gas') N.syncAlice(); N.refresh(); } });
    } });
  },

  /* events */
  tr_evPage(el) { S('ev', () => ({})).page = Number(el.dataset.p); rerender('#trEvResults', eventResults()); const r = $('#trEvResults'); if (r) r.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' }); },
  tr_evReset() { N.state.tr_ev = { q: '', city: '', type: '', elig: false, sort: 'soon', page: 1 }; N.refresh(); },

  /* apply */
  tr_applyBack() { const A = N.state.tr_apply; if (!A) return; A.step = Math.max(0, A.step - 1); N.refresh(); const w = $('#trWiz'); if (w) w.scrollIntoView({ block: 'start' }); },

  /* applications */
  tr_appsTab(el) { const f = S('apps', () => ({ per: 10 })); f.tab = el.dataset.k; f.page = 1; N.refresh(); },
  tr_appsPage(el) { S('apps', () => ({ per: 10 })).page = Number(el.dataset.p); N.refresh(); },
  tr_appsRefresh(el) {
    if (el.classList.contains('tr-spin')) return;
    el.classList.add('tr-spin'); el.setAttribute('aria-busy', 'true');
    setTimeout(() => { el.classList.remove('tr-spin'); el.removeAttribute('aria-busy'); N.toast(`Up to date. Checked at ${N.nowTime()}.`, { icon: 'refresh' }); }, 900);
  },
  tr_withdraw(el) {
    const a = appById(el.dataset.id); if (!a) return;
    const e = ev(a.e), org = orgName(a.e);
    N.confirm({ title: `Withdraw from ${e.name}?`, text: a.st === 'approved' ? `You\u2019ll give up ${a.pitch ? 'pitch ' + esc(a.pitch) : 'your pitch'}. ${esc(org)} is told straight away.` : `${esc(org)} stops reviewing it. You can apply again while applications are open.`, confirm: 'Withdraw application', danger: true, onConfirm: () => {
      const prev = a.st; a.st = 'withdrawn';
      const n = orgNotify(a.e, `Alice Green withdrew from ${e.name}`, 'AG Foods \u00b7 the pitch is free again.');
      N.closeAll(); N.refresh();
      N.toast(`Application to <b>${esc(e.name)}</b> withdrawn.`, { icon: 'x-circle', undo: () => { a.st = prev; dropNotif(db.notifications.org, n); N.refresh(); } });
    } });
  },

  /* invitations */
  tr_invOpen(el) {
    const i = db.invites.find(x => x.id === el.dataset.id); if (!i) return;
    const u = unitById(i.unit);
    N.state.tr_apply = { eid: i.e, step: 0, unit: u && u.status === 'active' ? u.id : null, invite: i.id, water: '', covers: '', notes: '', msg: '' };
    N.go('trader/apply/' + i.e);
  },
  tr_invDecline(el) {
    const i = db.invites.find(x => x.id === el.dataset.id); if (!i) return;
    const e = ev(i.e), o = db.organisers[i.from] || { company: 'The organiser' };
    N.confirm({ title: `Decline ${e.name}?`, text: `${esc(o.company)} will see that you declined. Adding a reason is optional.`, confirm: 'Decline invitation', danger: true, input: { label: 'Reason (optional)', ph: 'e.g. We\u2019re already booked that weekend' }, onConfirm: reason => {
      i.st = 'declined'; i.reason = reason || '';
      N.refresh();
      N.toast(`Invitation to <b>${esc(e.name)}</b> declined.`, { icon: 'x-circle', undo: () => { i.st = 'open'; delete i.reason; N.refresh(); } });
    } });
  },

  /* rate */
  tr_rateOpen(el) { openRate(el.dataset.id); },

  /* notifications */
  tr_notifTab(el) { S('notif', () => ({})).tab = el.dataset.k; N.refresh(); },
  tr_notifAll() {
    const was = db.notifications.trader.filter(n => n.unread);
    was.forEach(n => n.unread = false); N.refresh();
    N.toast(`${N.plural(was.length, 'notification')} marked as read.`, { undo: () => { was.forEach(n => n.unread = true); N.refresh(); } });
  },
  tr_notifRead(el) { const n = db.notifications.trader.find(x => x.id === el.dataset.id); if (n) { n.unread = false; N.refresh(); } },
  tr_notifGo(el) { const n = db.notifications.trader.find(x => x.id === el.dataset.id); if (!n) return; n.unread = false; N.go(n.go || 'trader/dashboard'); },

  /* guide */
  tr_guide(el) { openGuide(el.dataset.id); },

  /* profile */
  tr_profTab(el) { goProfileTab(el.dataset.tab); },
  tr_profStep(el) { const P = S('prof', () => ({ tab: 'personal' })), i = PTABS.findIndex(t => t[0] === P.tab) + Number(el.dataset.d); if (PTABS[i]) goProfileTab(PTABS[i][0]); },
  tr_photoRemove() { delete me().photo; N.refresh(); N.toast('Photo removed.'); },
  tr_tog(el) {
    const P = N.state.tr_prof; if (!P) return;
    const grp = el.dataset.grp, v = el.dataset.v, arr = P[grp] || (P[grp] = []), on = !arr.includes(v);
    if (on) arr.push(v); else arr.splice(arr.indexOf(v), 1);
    el.setAttribute('aria-pressed', String(on));
    const use = el.querySelector('use'); if (use) use.setAttribute('href', on ? '#i-check' : '#i-plus');
    updatePreview();
  },
  tr_histAdd() { const box = $('#trHist'); if (!box) return; box.insertAdjacentHTML('beforeend', histRow()); const e = $('#trHistEmpty'); if (e) e.hidden = true; const inp = box.lastElementChild.querySelector('input'); if (inp) inp.focus(); },
  tr_histDel(el) { const row = el.closest('.tr-hist-row'); if (row) row.remove(); const box = $('#trHist'), e = $('#trHistEmpty'); if (box && e) e.hidden = !!box.children.length; },

  /* units */
  tr_unitEdit(el) { openUnit(el.dataset.id); },
  tr_unitActivate(el) {
    const u = unitById(el.dataset.id); if (!u) return;
    u.status = 'active'; N.refresh();
    N.toast(`<b>${esc(u.name)}</b> is active. You can use it in applications.`, { undo: () => { u.status = 'draft'; N.refresh(); } });
  },
  tr_unitDel(el) {
    const u = unitById(el.dataset.id); if (!u) return;
    const used = myApps().filter(a => (a.unitId === u.id || a.unit === u.name) && !isPast(a) && ['pending', 'info', 'approved'].includes(a.st));
    N.confirm({ title: `Delete ${u.name}?`, text: used.length ? `It\u2019s used in ${N.plural(used.length, 'live application')} (${esc(used.map(a => ev(a.e).name).join(', '))}). Those stay as they are, but you can\u2019t use this unit again.` : 'This removes the unit from your passport. Its documents stay in My documents.', confirm: 'Delete unit', danger: true, onConfirm: () => {
      const i = db.units.indexOf(u); db.units.splice(i, 1); N.refresh();
      N.toast(`<b>${esc(u.name)}</b> deleted.`, { icon: 'trash', undo: () => { db.units.splice(i, 0, u); N.refresh(); } });
    } });
  },

  /* passport */
  tr_share() { openShare(); },
  tr_pdf() { openPdf(); },
  tr_copyLink() { N.copy(`niche.co/p/${ppNo()}`, $('#trShareLink')); },

  /* subscription */
  tr_plan(el) {
    const plans = db.plans.trader, p = plans.find(x => x.id === el.dataset.id), cur = plans.find(x => x.id === db.plans.current.trader); if (!p || !cur) return;
    const up = plans.indexOf(p) > plans.indexOf(cur);
    const text = p.managed ? `\u00a3${p.price}/month with no free period. Our team calls you within one working day to set things up.`
      : up ? `${esc(p.name)} keeps your free period until ${N.fLong(FREE_UNTIL)}, then costs ${p.then ? '\u00a3' + p.then + '/month' : 'nothing'}. You can switch back at any time.`
      : `You\u2019ll lose ${esc(cur.features.filter(f => !f.endsWith(':')).slice(0, 2).join(' and ').toLowerCase())}. Your passport and documents stay.`;
    N.confirm({ title: `${p.managed ? 'Apply for' : up ? 'Upgrade to' : 'Downgrade to'} ${p.name}?`, text, confirm: p.managed ? 'Apply for Advance' : `${up ? 'Upgrade' : 'Downgrade'} to ${p.name}`, danger: !up, onConfirm: () => {
      const prev = db.plans.current.trader; db.plans.current.trader = p.id; N.refresh();
      N.toast(`You\u2019re now on <b>${esc(p.name)}</b>.`, { icon: 'check-circle', undo: () => { db.plans.current.trader = prev; N.refresh(); } });
    } });
  },
  tr_pause() {
    N.confirm({ title: 'Pause your plan?', text: 'Organisers still see your passport, but you can\u2019t apply to events until you resume. You can pause for up to 3 months for free.', confirm: 'Pause plan', onConfirm: () => { S('sub', () => ({})).status = 'paused'; N.refresh(); N.toast('Plan paused.', { icon: 'pause', undo: () => { N.state.tr_sub.status = 'active'; N.refresh(); } }); } });
  },
  tr_cancel() {
    const cur = db.plans.trader.find(x => x.id === db.plans.current.trader) || { name: 'your plan' };
    N.confirm({ title: `Cancel ${cur.name}?`, text: `You\u2019ll move to Lite on ${N.fLong(FREE_UNTIL)}. Your passport and documents stay, and you can come back at any time.`, confirm: 'Cancel plan', danger: true, onConfirm: () => { S('sub', () => ({})).status = 'cancelled'; N.refresh(); N.toast('Plan cancelled.', { icon: 'x-circle', undo: () => { N.state.tr_sub.status = 'active'; N.refresh(); } }); } });
  },
  tr_resume() { S('sub', () => ({})).status = 'active'; N.refresh(); N.toast('Your plan is active again.'); },
});

Object.assign(N.change, {
  tr_file(el) { const f = el.files && el.files[0]; if (!f) return; if (f.size > 10 * 1048576) { N.toast('That file is over 10 MB. Try a smaller scan or photo.', { icon: 'alert' }); return; } startUpload(f.name, f.size); },
  tr_photo(el) {
    const f = el.files && el.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { N.toast('Choose a JPG or PNG image.', { icon: 'alert' }); return; }
    const r = new FileReader();
    r.onload = () => { me().photo = r.result; const box = $('#trPhoto'); if (box) box.innerHTML = photoInner(); N.toast('Photo updated.'); };
    r.readAsDataURL(f);
  },
  tr_country(el) { const s = $('#p_county'); if (s) s.innerHTML = countyOpts(el.value, ''); },
  tr_fhrsPick(el) { const t = $('#trFhrsTxt'); if (t) t.textContent = `${N.FHRS[el.value]}. Changing this re-checks every event\u2019s rules.`; },
  tr_prev() { updatePreview(); },
  tr_evCity(el) { const f = S('ev', () => ({})); f.city = el.value; f.page = 1; rerender('#trEvResults', eventResults()); },
  tr_evType(el) { const f = S('ev', () => ({})); f.type = el.value; f.page = 1; rerender('#trEvResults', eventResults()); },
  tr_evElig(el) { const f = S('ev', () => ({})); f.elig = el.checked; f.page = 1; rerender('#trEvResults', eventResults()); },
  tr_applyUnit(el) { const A = N.state.tr_apply; if (!A) return; A.unit = el.value; const b = el.form && el.form.querySelector('[type=submit]'); if (b) b.disabled = false; },
  tr_appsPer(el) { const f = S('apps', () => ({})); f.per = Number(el.value); f.page = 1; N.refresh(); },
  tr_pdfContact(el) { me().pdfContact = el.checked; N.toast(el.checked ? 'Your phone and email will show on the exported PDF.' : 'Your phone and email are hidden on the exported PDF.', { icon: el.checked ? 'eye' : 'eye-off' }); },
  tr_shareActive(el) { const sh = S('share', () => ({ days: 14 })); sh.active = el.checked; openShare(); N.toast(el.checked ? 'Passport link turned on.' : 'Passport link turned off. It stops working straight away.', { icon: 'link' }); if (N.cur.path === 'trader/passport') N.refresh(); },
  tr_shareDays(el) { const sh = S('share', () => ({ active: true })); sh.days = Number(el.value); openShare(); if (N.cur.path === 'trader/passport') N.refresh(); },
});

Object.assign(N.input, {
  tr_evQ(el) { const f = S('ev', () => ({})); f.q = el.value; f.page = 1; rerender('#trEvResults', eventResults()); },
  tr_prev() { updatePreview(); },
  tr_applyField(el) { const A = N.state.tr_apply; if (A && el.name && ['water', 'covers', 'notes', 'msg'].includes(el.name)) A[el.name] = el.value; },
  tr_upExp(el) { if (el.name === 'exp') { if (N.state.tr_up) N.state.tr_up.exp = el.value; checkUpExp(el.value); } },
});

Object.assign(N.forms, {
  /* upload: file becomes "pending" for the admin team to approve */
  tr_upSave(form, data) {
    const U = N.state.tr_up; if (!U) return;
    let d = resolveDoc(U.key); const t = N.docType(d.type);
    const before = d.virtual ? null : { ...d };
    if (d.virtual) { const nd = { id: N.uid('d'), trader: TID, type: d.type }; if (d.unit) nd.unit = d.unit; db.docs.push(nd); d = nd; }
    Object.assign(d, { status: 'pending', exp: t.expiry ? (data.exp || null) : null, uploaded: TODAY, file: U.file, note: data.cert ? `Certificate ${data.cert}` : (d.note || '') });
    if (d.type === 'gas') N.syncAlice();
    const readBefore = db.notifications.trader.filter(n => n.unread && n.title.includes(t.name));
    readNotif(n => n.title.includes(t.name));
    const adm = { id: N.uid('a'), at: 0, tone: 'info', title: `Alice Green uploaded ${/^[aeiou]/i.test(t.name) ? 'an' : 'a'} ${t.name}`, text: 'AG Foods \u00b7 waiting for document review.', go: 'admin/traders/ag', unread: true };
    if (db.notifications.admin) db.notifications.admin.unshift(adm);
    N.state.tr_up = null;
    N.closeAll(); N.refresh();
    N.toast(`<b>${esc(t.name)}</b> sent for review. We\u2019ll tell you when it\u2019s approved.`, { icon: 'upload', undo: () => {
      const i = db.docs.indexOf(d);
      if (before) db.docs.splice(i, 1, before); else if (i >= 0) db.docs.splice(i, 1);
      readBefore.forEach(n => n.unread = true);
      dropNotif(db.notifications.admin, adm);
      N.syncAlice(); N.refresh();
    } });
  },

  tr_answer(form, data) {
    const a = appById(form.dataset.id); if (!a) return;
    const qs = a.q && a.q.length ? a.q : ['Anything else the organiser should know?'];
    const prev = { st: a.st, answered: a.answered, answers: a.answers };
    a.answers = qs.map((q, i) => ({ q, a: (data['q' + i] || '').trim() }));
    a.answered = true; a.st = 'pending';
    const e = ev(a.e);
    readNotif(n => n.title.includes('asked') && n.text.includes(e.name));
    const n = orgNotify(a.e, `Alice Green answered your questions`, `${e.name} \u00b7 ${N.plural(qs.length, 'answer')} \u00b7 ready to review.`);
    N.closeAll(); N.refresh();
    N.toast(`Answers sent to <b>${esc(orgName(a.e))}</b>. Your application is back in review.`, { icon: 'send', undo: () => { Object.assign(a, prev); dropNotif(db.notifications.org, n); N.refresh(); } });
  },

  tr_profile(form, data) {
    const t = me(), tab = form.dataset.tab, P = S('prof', () => ({ tab: 'personal' }));
    const str = k => String(data[k] == null ? '' : data[k]).trim();
    if (tab === 'personal') Object.assign(t, { person: str('p_person') || t.person, email: str('p_email') || t.email, phone: str('p_phone') });
    if (tab === 'business') Object.assign(t, { pdfContact: !!data.p_pdf, biz: str('p_biz') || t.biz, company: str('p_company') || t.company, website: str('p_website'), address: str('p_address'), city: str('p_city') || t.city, country: str('p_country'), county: str('p_county'), postcode: str('p_postcode').toUpperCase(), contactEmail: str('p_contactEmail'), bizPhone: str('p_bizPhone'), authority: str('p_authority'), regDate: str('p_regDate'), inspected: str('p_inspected'), fhrs: data.p_fhrs != null ? Number(data.p_fhrs) : t.fhrs });
    if (tab === 'public') Object.assign(t, { bio: str('p_bio'), cuisine: str('p_cuisine') || t.cuisine, tags: [...(P.tags || t.tags || [])], categories: [...(P.cats || t.categories || [])], radius: Number(data.p_radius) || t.radius });
    if (tab === 'history') t.history = $$('.tr-hist-row', form).map(r => ({ name: r.querySelector('[name=h_name]').value.trim(), loc: r.querySelector('[name=h_loc]').value.trim(), date: r.querySelector('[name=h_date]').value })).filter(h => h.name);
    const label = { personal: 'Personal details', business: 'Business details', public: 'Public profile', history: 'Past events' }[tab];
    const i = PTABS.findIndex(x => x[0] === tab);
    if (i < PTABS.length - 1) { goProfileTab(PTABS[i + 1][0]); N.toast(`${label} saved.`); }
    else { P.tags = null; P.cats = null; N.refresh(); N.toast('Profile saved. Organisers see the changes on your passport now.'); }
  },

  tr_unit(form, data, e) {
    const mode = (e && e.submitter && e.submitter.value) || 'active';
    const num = (k, def) => { const v = parseFloat(data[k]); return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : def; };
    const vals = { name: String(data.u_name || '').trim() || 'Untitled unit', type: data.u_type, w: num('u_w', 3), d: num('u_d', 3), frontage: num('u_front', num('u_w', 3)), gas: !!data.u_gas, power: data.u_power || null, water: !!data.u_water, staff: Math.round(num('u_staff', 1)), cuisine: String(data.u_cuisine || '').trim(), status: mode === 'draft' ? 'draft' : 'active' };
    const x = form.dataset.id ? unitById(form.dataset.id) : null;
    if (x) {
      const old = x.name;
      Object.assign(x, vals);
      if (old !== x.name) myApps().forEach(a => { if (a.unit === old) a.unit = x.name; });
    } else db.units.push({ id: N.uid('u'), trader: TID, ...vals });
    N.closeDrawer(); N.refresh();
    N.toast(vals.status === 'active' ? `<b>${esc(vals.name)}</b> saved and active. You can use it in applications.` : `<b>${esc(vals.name)}</b> saved as a draft.`, { icon: 'truck' });
  },

  /* apply wizard: validate the current step, then move on or send */
  tr_applyNext(form) {
    const A = N.state.tr_apply; if (!A) return;
    if (A.step === 0 && !(unitById(A.unit) || {}).status) { N.toast('Choose an active unit to continue.', { icon: 'alert' }); return; }
    if (A.step === 2) {
      const c = form.elements.covers;
      if (c && (!c.value || Number(c.value) < 1)) { c.setCustomValidity('Enter roughly how many covers you serve per hour.'); c.reportValidity(); c.setCustomValidity(''); return; }
    }
    if (A.step < 3) { A.step++; N.refresh(); const w = $('#trWiz'); if (w) w.scrollIntoView({ block: 'start' }); return; }
    sendApplication();
  },

  tr_rate(form) {
    const a = appById(form.dataset.id); if (!a) return;
    const v = k => Number((form.querySelector(`[data-stars="r_${k}"]`) || {}).dataset?.v || 0);
    if (!v('overall')) { const err = $('#trRateErr'); if (err) err.hidden = false; return; }
    const e = ev(a.e), o = db.organisers[e.org];
    const r = { id: N.uid('r'), from: TID, to: e.org, dir: 't2o', e: a.e, stars: v('overall'), comm: v('comm') || null, day: v('day') || null, footfall: v('footfall') || null, when: TODAY, text: String(form.elements.r_text.value || '').trim() };
    db.reviews.push(r);
    N.closeAll(); N.refresh();
    N.toast(`Thanks. Your review of <b>${esc(o.company)}</b> is live.`, { icon: 'star', undo: () => { const i = db.reviews.indexOf(r); if (i >= 0) db.reviews.splice(i, 1); N.refresh(); } });
  },

  tr_feedback(form, data) {
    const f = { id: N.uid('f'), from: me().person, role: 'Trader', type: data.fb_type || 'Event Issue', subject: String(data.fb_subject || '').trim(), text: String(data.fb_text || '').trim(), at: 0, status: 'open' };
    if (!f.subject || !f.text) return;
    db.feedback.unshift(f);
    N.refresh();
    N.toast('Feedback sent. The Niche team usually replies within one working day.', { icon: 'send', undo: () => { const i = db.feedback.indexOf(f); if (i >= 0) db.feedback.splice(i, 1); N.refresh(); } });
  },
});

function sendApplication() {
  const A = N.state.tr_apply; if (!A) return;
  const e = ev(A.eid), u = unitById(A.unit), el = elig(A.eid);
  const inv = A.invite ? db.invites.find(i => i.id === A.invite && i.st === 'open') : inviteFor(A.eid);
  if (!el.s.can && !inv) { N.toast('This event\u2019s requirements aren\u2019t met yet.', { icon: 'alert' }); return; }
  const sure = inv && !el.fails.length && !el.warns.length;
  const org = N.orgOf(A.eid);
  const app = { id: nextAppId(), t: TID, e: A.eid, st: sure ? 'approved' : 'pending', at: 0, unit: u ? u.name : 'Unit', unitId: A.unit, msg: String(A.msg || '').trim(),
    answers: [{ q: 'Do you need a water point?', a: A.water === 'yes' ? 'Yes' : 'No' }, { q: 'Covers per hour', a: String(A.covers || '') }, ...(A.notes ? [{ q: 'Anything we should know?', a: A.notes }] : [])] };
  if (inv) { app.via = 'invite'; inv.st = 'accepted'; }
  if (sure) { app.rec ={ by: org.person, when: N.fShort(TODAY), note: 'Accepted from your invitation. Pitch number follows with load-in times.' }; }
  db.apps.push(app);
  const n = orgNotify(A.eid, sure ? `Alice Green accepted your invitation to ${e.name}` : `Alice Green applied to ${e.name}`, `AG Foods \u00b7 readiness ${N.readiness(TID)}% \u00b7 match ${el.score}%.`);
  N.state.tr_apply = null;
  const f = S('apps', () => ({ tab: 'all', per: 10, page: 1 })); f.tab = 'all'; f.page = 1;
  N.go('trader/applications');
  N.toast(sure ? `You\u2019re in. <b>${esc(org.company)}</b> confirmed your place at ${esc(e.name)}.` : `Application sent to <b>${esc(org.company)}</b> for ${esc(e.name)}.`, { icon: 'send', undo: () => {
    const i = db.apps.indexOf(app); if (i >= 0) db.apps.splice(i, 1);
    if (inv) inv.st = 'open';
    dropNotif(db.notifications.org, n);
    N.refresh();
  } });
}

/* seg controls: keep hidden form fields in sync, and drive the events sort */
document.addEventListener('seg', e => {
  const { key, v } = e.detail || {};
  const box = e.target.closest && e.target.closest('.tr-segfield');
  const h = box && box.querySelector('input[type=hidden]');
  if (h) { h.value = v; h.dispatchEvent(new Event('input', { bubbles: true })); }
  if (key === 'tr_evSort') { const f = S('ev', () => ({})); f.sort = v; f.page = 1; rerender('#trEvResults', eventResults()); }
});
/* star inputs in the rating drawer: hide the error once a rating is chosen */
document.addEventListener('stars', e => { if (e.detail && e.detail.name === 'r_overall') { const err = $('#trRateErr'); if (err) err.hidden = true; } });

})();
