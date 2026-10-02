/* =====================================================================
   NICHE admin panel (js/admin.js)
   The Niche team's operator tool: approvals, document review, listings,
   reference data and platform settings. Everything reads and writes the
   shared N.db, so each decision here shows up in the trader and
   organiser apps straight away.
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic } = N;
const $ = N.$;
const TODAY = N.TODAY.toISOString().slice(0, 10);
const ADMIN = () => db.me.admin.name;

/* =====================================================================
   STATE, REGIONS, SMALL UI HELPERS
   ===================================================================== */
const S = (k, d) => { const key = 'adm_' + k; if (!N.state[key]) N.state[key] = typeof d === 'function' ? d() : (d ?? {}); return N.state[key]; };

/* a region is a part of a page that re-renders on its own (search, tabs, paging) so inputs keep focus */
const REG = {};
const region = (k, fn) => { REG[k] = fn; return `<div class="adm-region" id="admr-${k}">${fn()}</div>`; };
const redraw = (k, focusSel) => {
  const el = document.getElementById('admr-' + k); if (!el || !REG[k]) return;
  el.innerHTML = REG[k]();
  if (focusSel) el.querySelector(focusSel)?.focus({ preventScroll: true });
  N.applyNotes();
};

const norm = s => String(s ?? '').toLowerCase();
const hit = (q, ...fs) => {
  q = norm(q).trim(); if (!q) return true;
  const q2 = q.replace(/\s+/g, '');
  return fs.some(f => { const v = norm(f); return v.includes(q) || (q2.length > 2 && v.replace(/\s+/g, '').includes(q2)); });
};
const paged = (arr, page, per) => { const pages = Math.max(1, Math.ceil(arr.length / per)); page = Math.min(Math.max(1, page || 1), pages); return { rows: arr.slice((page - 1) * per, page * per), page, pages, total: arr.length, per }; };
const pagerHTML = (k, p) => N.pager(p.page, p.pages, `data-act="adm_pg" data-k="${k}" data-v`, p.total, p.per);
const tabs = (k, items, f = 'tab') => N.tabsHTML(items, S(k)[f], `data-act="adm_tab" data-k="${k}" data-f="${f}" data-v`);
const searchBox = (k, ph) => `<label class="search adm-search">${ic('search')}<span class="sr">${esc(ph)}</span><input type="search" value="${esc(S(k).q || '')}" placeholder="${esc(ph)}" data-input="adm_q" data-k="${k}" autocomplete="off"></label>`;
const selectBox = (k, f, opts, label) => { const v = S(k)[f]; return `<label class="adm-sel"><span class="sr">${esc(label)}</span><select class="sel sm" data-change="adm_f" data-k="${k}" data-f="${f}">${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`; };
const B = (label, attrs = '', cls = 'btn-line', icon = '') => { const cmp = icon && cls.includes('adm-cmp'); return `<button type="button" class="btn btn-xs ${cls}" ${attrs}${cmp ? ` aria-label="${esc(label)}" title="${esc(label)}"` : ''}>${icon ? ic(icon) : ''}<span class="adm-bl">${esc(label)}</span></button>`; };
const cbox = (state, label, attrs) => `<button type="button" class="adm-cb" role="checkbox" aria-checked="${state}" aria-label="${esc(label)}" ${attrs}>${ic(state === 'mixed' ? 'minus' : 'check')}</button>`;
const arch = (icon, tone = '', cls = '') => `<span class="adm-archic ${tone} ${cls}" aria-hidden="true">${ic(icon)}</span>`;
const TONE = { ok: 'mint', warn: 'butter', risk: 'peach', info: 'lilac' };
const muted = t => `<span class="muted">${esc(t)}</span>`;
const daysAgo = s => Math.max(0, -N.daysFrom(s));
const ago = s => { const n = daysAgo(s); return n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`; };
const inDays = n => n < -1 ? `${-n} days ago` : n === -1 ? 'yesterday' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
const hoursToDate = h => N.addDays(TODAY, Math.round(h / 24));
const formErr = (form, msg, name) => {
  form.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
  const p = form.querySelector('.adm-err'); if (p) { p.hidden = false; p.innerHTML = ic('alert') + `<span>${esc(msg)}</span>`; }
  const f = name && form.elements[name]; if (f) { f.setAttribute('aria-invalid', 'true'); f.focus(); }
  return false;
};
const notFound = (what, back) => N.empty(`This ${what} doesn't exist`, 'It may have been removed. Go back to the list to find another.', `<button type="button" class="btn btn-line btn-sm" data-go="${back}">${ic('arrow-left')}Back to the list</button>`, 'search');
const backLink = (to, label) => `<button type="button" class="link adm-back" data-go="${to}">${ic('arrow-left')}${esc(label)}</button>`;

/* ---------- platform settings live in the shared db so other apps can read them ---------- */
const SET = () => db.settings || (db.settings = { name: 'Niche', email: 'support@nicheconnect.co', phone: '020 7946 0180', reviewDays: 1, remind: [30, 14, 7], blockExpired: true, traderFree: 3, orgFree: 12, orgCommission: 8, advanceCommission: 15, maintenance: false });

/* ---------- admin audit log (this session) ---------- */
const LOG = () => S('log', () => []);
const log = (key, text, tone = 'ok', icon = 'check') => { const e = { key, text, tone, icon, time: N.nowTime() }; LOG().unshift(e); return e; };
const unlog = e => { const L = LOG(), i = L.indexOf(e); if (i > -1) L.splice(i, 1); };
const tlFrom = (key, dated) => [
  ...LOG().filter(l => l.key === key).map(l => ({ text: l.text, tone: l.tone, icon: l.icon, when: 'Today, ' + l.time, sub: 'By ' + ADMIN() })),
  ...dated.sort((a, b) => String(b.date).localeCompare(String(a.date))).map(x => ({ ...x, when: x.when || N.fLong(x.date) })),
];
const timeline = items => items.length ? `<ol class="adm-tl">${items.map(x => `<li><span class="adm-tl-i ${TONE[x.tone] || x.tone || ''}">${ic(x.icon || 'activity')}</span><div class="adm-tl-b"><b>${esc(x.text)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div><time class="mono">${esc(x.when)}</time></li>`).join('')}</ol>` : N.empty('Nothing yet', 'Actions will show up here.', '', 'history');

/* ---------- cross-app messages ---------- */
const tellTrader = (tid, n) => { if (tid !== db.me.trader) return null; const note = { id: N.uid('n'), at: 0, unread: true, go: 'trader/documents', ...n }; db.notifications.trader.unshift(note); return note; };
const tellOrg = (oid, n) => { if (!oid || oid !== db.me.org) return null; const note = { id: N.uid('o'), at: 0, unread: true, go: 'org/manage-events', ...n }; db.notifications.org.unshift(note); return note; };
const untell = (list, note) => { if (!note) return; const i = list.indexOf(note); if (i > -1) list.splice(i, 1); };
/* mark the admin notifications for something as read once nothing is left to decide */
const settle = go => { const hits = db.notifications.admin.filter(n => n.go === go && n.unread); hits.forEach(n => n.unread = false); return () => hits.forEach(n => n.unread = true); };

/* =====================================================================
   DOMAIN HELPERS
   ===================================================================== */
const T = id => db.traders[id];
const O = id => db.organisers[id];
const E = id => db.events[id];
const tyName = id => N.docType(id)?.name || 'Document';
const traderID = tid => `NCH-26-${String(100 + Object.keys(db.traders).indexOf(tid)).padStart(4, '0')}`;
const orgID = oid => `ORG-${String(O(oid).regNo || '').slice(-4) || '0000'}`;
const pendingDocs = tid => db.docs.filter(d => d.status === 'pending' && (!tid || d.trader === tid));
const pendingTraders = () => Object.entries(db.traders).filter(([, t]) => t.status === 'pending');
const orgList = () => Object.entries(db.organisers).filter(([, o]) => !o.removed);
const pendingOrgs = () => orgList().filter(([, o]) => o.verify === 'pending');
const traderSettled = tid => T(tid).status !== 'pending' && !pendingDocs(tid).length;
const activeEvents = () => Object.entries(db.events).filter(([, e]) => e.status === 'published' && ['upcoming', 'live'].includes(N.eventState(e)));
const cityOpts = list => [['all', 'All cities'], ...[...new Set(list)].sort().map(c => [c, c])];

/* ---------- documents (real records + read-only summaries for long-standing traders) ---------- */
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
function virtualDoc(tid, ty) {
  const V = S('vdocs'), key = tid + ':' + ty.id;
  if (V[key]) return V[key];
  const t = T(tid), h = hash(key);
  const exp = ty.id === 'gas' ? t.gas : ty.expiry ? N.addDays(TODAY, 75 + h % 420) : null;
  const rejected = t.status === 'rejected' && ty.id === 'fbr';
  const notes = { pli: `£${t.pli}m cover`, fhc: `Rating ${t.fhrs}`, fsra: 'HACCP plan, reviewed yearly', fbr: `Registered with ${t.authority || t.city + ' City Council'}`, l2: `${t.person} + staff`, gas: 'LPG · Gas Safe engineer', elec: `PAT tested · ${t.power || '13A'}` };
  return (V[key] = { id: 'v-' + tid + '-' + ty.id, trader: tid, type: ty.id, status: rejected ? 'rejected' : 'approved', exp, uploaded: N.addDays(t.joined, h % 20), file: `${N.slug(t.biz)}-${ty.id}.pdf`, note: notes[ty.id] || '', reason: rejected ? t.rejectReason : undefined, virtual: true });
}
const findDoc = id => db.docs.find(d => d.id === id) || Object.values(S('vdocs')).find(d => d.id === id);
const materialise = d => { if (!d.virtual) return d; delete S('vdocs')[d.trader + ':' + d.type]; delete d.virtual; db.docs.push(d); return d; };
const DOC_ORDER = { pending: 0, rejected: 1, expired: 2, expiring: 3, missing: 4, valid: 5, na: 6 };
function docsView(tid) {
  const t = T(tid), real = db.docs.filter(d => d.trader === tid), synth = tid !== db.me.trader && t.status !== 'pending';
  const rows = real.map(d => ({ d, ty: N.docType(d.type) || { id: d.type, name: 'Removed document type', tier: '–', level: '–' }, st: N.docState(d) }));
  db.docTypes.filter(ty => ty.status === 'active' && !real.some(d => d.type === ty.id)).forEach(ty => {
    if (ty.id === 'gas' && !t.gas) rows.push({ d: null, ty, st: 'na' });
    else if (synth) { const d = virtualDoc(tid, ty); rows.push({ d, ty, st: N.docState(d) }); }
    else rows.push({ d: null, ty, st: 'missing' });
  });
  return rows.sort((a, b) => DOC_ORDER[a.st] - DOC_ORDER[b.st]);
}
const docChip = st => st === 'na' ? N.chip('plain', 'Not needed') : N.docChip(st);

function decideDoc(id, status, reason) {
  const d = materialise(findDoc(id)), t = T(d.trader), name = tyName(d.type);
  const prev = { status: d.status, reason: d.reason, reviewed: d.reviewed };
  const before = N.readiness(d.trader);
  d.status = status; d.reviewed = { by: ADMIN(), on: TODAY };
  if (reason) d.reason = reason; else delete d.reason;
  if (d.trader === db.me.trader) N.syncAlice();
  const note = tellTrader(d.trader, status === 'approved'
    ? { tone: 'ok', title: `${name} approved`, text: 'Checked by the Niche team. It now counts towards your readiness.' }
    : { tone: 'warn', title: `${name} needs a new upload`, text: reason });
  const le = log('t:' + d.trader, `${name} ${status}${reason ? ` · “${reason}”` : ''}`, status === 'approved' ? 'ok' : 'risk', status === 'approved' ? 'check' : 'x');
  const unsettle = traderSettled(d.trader) ? settle('admin/traders/' + d.trader) : () => {};
  return {
    d, t, name, before, after: N.readiness(d.trader),
    undo() { d.status = prev.status; if (prev.reason) d.reason = prev.reason; else delete d.reason; if (prev.reviewed) d.reviewed = prev.reviewed; else delete d.reviewed; if (d.trader === db.me.trader) N.syncAlice(); untell(db.notifications.trader, note); unlog(le); unsettle(); },
  };
}

function setTrader(tid, status, extra = {}) {
  const t = T(tid), prev = { status: t.status, rejectReason: t.rejectReason, suspendReason: t.suspendReason };
  t.status = status; delete t.rejectReason; delete t.suspendReason; Object.assign(t, extra);
  const words = { approved: 'Account approved', rejected: 'Account rejected', suspended: 'Account suspended' };
  const why = extra.rejectReason || extra.suspendReason;
  const le = log('t:' + tid, words[status] + (why ? ` · “${why}”` : ''), status === 'approved' ? 'ok' : 'risk', status === 'approved' ? 'check' : 'x');
  const unsettle = traderSettled(tid) ? settle('admin/traders/' + tid) : () => {};
  return () => { t.status = prev.status; ['rejectReason', 'suspendReason'].forEach(k => { if (prev[k]) t[k] = prev[k]; else delete t[k]; }); unlog(le); unsettle(); };
}

function setOrg(oid, patch, text, tone = 'ok', icon = 'check') {
  const o = O(oid), prev = {};
  Object.keys(patch).forEach(k => { prev[k] = o[k]; if (patch[k] === undefined) delete o[k]; else o[k] = patch[k]; });
  const le = log('o:' + oid, text, tone, icon);
  return () => { Object.keys(prev).forEach(k => { if (prev[k] === undefined) delete o[k]; else o[k] = prev[k]; }); unlog(le); };
}

/* ---------- units ---------- */
function unitsOf(tid) {
  const own = db.units.filter(u => u.trader === tid); if (own.length) return own;
  const t = T(tid), a = db.apps.find(x => x.t === tid && x.unit), [name, size] = a ? a.unit.split(' · ') : [];
  return [{ id: 'gen-' + tid, trader: tid, name: name || `${t.biz} unit`, type: name || 'Trading unit', size: size || null, gas: !!t.gas, power: t.power, water: false, status: t.status === 'approved' ? 'active' : 'draft', cuisine: t.food, staff: 2, generic: true }];
}

/* ---------- events ---------- */
const EV_ST = { upcoming: ['ok', 'Published'], live: ['ok', 'Live now'], completed: ['plain', 'Completed'], cancelled: ['risk', 'Cancelled'], postponed: ['warn', 'Postponed'], draft: ['plain', 'Draft'] };
const evChip = e => N.statusChip(EV_ST, N.eventState(e));
const evDates = e => e.end && e.end !== e.date ? `${N.fShort(e.date)} – ${N.fLong(e.end)}` : N.fLong(e.date);
const AVG_TAKINGS = 1500;
const evRevenue = e => e.status === 'cancelled' ? 0 : e.fee?.model === 'commission' ? Math.round((e.filled || 0) * AVG_TAKINGS * (e.fee.pct || 0) / 100) : (e.fee?.amount || 0) * (e.filled || 0);
const orgRevenue = oid => Object.values(db.events).filter(e => e.org === oid).reduce((a, e) => a + evRevenue(e), 0);
const extChip = () => `<span class="chip adm-ext">External</span>`;

/* =====================================================================
   GENERIC ACTIONS (search, filters, tabs, paging, overlays)
   ===================================================================== */
Object.assign(N.input, {
  adm_q(el) { const s = S(el.dataset.k); s.q = el.value; s.page = 1; redraw(el.dataset.k); },
});
Object.assign(N.change, {
  adm_f(el) { const s = S(el.dataset.k); s[el.dataset.f] = el.value; s.page = 1; redraw(el.dataset.k); },
});
Object.assign(N.act, {
  adm_tab(el) { const k = el.dataset.k, f = el.dataset.f || 'tab', s = S(k); s[f] = el.dataset.v; s.page = 1; if ('edit' in s) s.edit = null; if ('err' in s) s.err = ''; redraw(k, `[data-act="adm_tab"][data-v="${el.dataset.v}"]`); },
  adm_pg(el) {
    const k = el.dataset.k; S(k).page = Number(el.dataset.v); redraw(k, `.pg[aria-current="true"]`);
    const r = document.getElementById('admr-' + k); if (r && r.getBoundingClientRect().top < 80) r.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' });
  },
  adm_ut(el) { S('ut')[el.dataset.k] = el.dataset.v; N.refresh(); $(`.utabs [data-v="${el.dataset.v}"]`)?.focus({ preventScroll: true }); },
  adm_review(el) { S('ut')[el.dataset.key] = el.dataset.tab; N.go(el.dataset.to); },
  adm_closeModal() { N.closeModal(); },
  adm_scrollTo(el) { document.getElementById(el.dataset.t)?.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' }); },
});

/* =====================================================================
   1. DASHBOARD
   ===================================================================== */
const KIND = { trader: 'New trader', doc: 'Document', org: 'Organiser' };
function queueItems() {
  const items = [];
  pendingTraders().forEach(([id, t]) => items.push({ kind: 'trader', key: 't:' + id, av: N.tav(id), title: t.person, sub: `${t.biz} · new trader in ${t.city}`, since: t.joined, to: 'admin/traders/' + id, tab: 'business' }));
  const byT = {};
  pendingDocs().forEach(d => (byT[d.trader] = byT[d.trader] || []).push(d));
  Object.entries(byT).forEach(([tid, ds]) => {
    const t = T(tid);
    items.push({ kind: 'doc', key: 't:' + tid, av: N.tav(tid), title: ds.length === 1 ? `${t.person} · ${tyName(ds[0].type)}` : `${t.person} · ${ds.length} documents`, sub: ds.length === 1 ? `${t.biz} · ${ds[0].file}` : ds.map(d => tyName(d.type)).join(', '), since: ds.map(d => d.uploaded).sort()[0], to: 'admin/traders/' + tid, tab: 'documents', one: ds.length === 1 ? ds[0].id : null });
  });
  pendingOrgs().forEach(([id, o]) => items.push({ kind: 'org', key: 'o:' + id, av: N.oav(id), title: o.company, sub: `Organiser compliance review · ${o.person}`, since: o.verifySent || o.joined, to: 'admin/organisers/' + id, tab: 'documents' }));
  return items.sort((a, b) => a.since.localeCompare(b.since));
}
function queueRegion() {
  const s = S('dq'), all = queueItems(), target = SET().reviewDays;
  const cnt = k => all.filter(x => k === 'all' || x.kind === k).length;
  const rows = all.filter(x => s.tab === 'all' || x.kind === s.tab);
  return `${tabs('dq', [['all', 'All', cnt('all')], ['trader', 'Traders', cnt('trader')], ['doc', 'Documents', cnt('doc')], ['org', 'Organisers', cnt('org')]])}
  ${rows.length ? `<ul class="list adm-q">${rows.map(x => {
    const d = daysAgo(x.since), late = d > target;
    return `<li class="li">${x.av}<div class="li-main"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span><span class="adm-wait ${late ? 'late' : ''}">${ic('clock', 'ic-sm')}Waiting ${d === 0 ? 'since today' : N.plural(d, 'day')}${late ? ' · over target' : ''}</span></div>
      <div class="li-end">${N.chip('adm-k-' + x.kind, KIND[x.kind])}${x.one ? B('Approve', `data-act="adm_docOk" data-id="${x.one}"`, 'btn-line', 'check') : ''}${B('Review', `data-act="adm_review" data-to="${x.to}" data-key="${x.key}" data-tab="${x.tab}"`, 'btn-side', 'arrow-right')}</div></li>`;
  }).join('')}</ul>` : N.empty('Nothing waiting', 'Every trader, document and organiser has a decision. New items land here as soon as they arrive.', '', 'check-circle')}`;
}

/* sign-ups per week: earlier weeks carry sample volume, real joins in this data set are added on top */
const WEEKS = [['2026-08-03', 4, 1], ['2026-08-10', 6, 0], ['2026-08-17', 3, 0], ['2026-08-24', 7, 0], ['2026-08-31', 5, 1], ['2026-09-07', 6, 0], ['2026-09-14', 3, 1], ['2026-09-21', 2, 0]];
function chartCard() {
  const wk = WEEKS.map(([w, t, o]) => { const end = N.addDays(w, 7), inW = s => s >= w && s < end; return { w, t: t + Object.values(db.traders).filter(x => inW(x.joined)).length, o: o + Object.values(db.organisers).filter(x => inW(x.joined)).length }; });
  const sum = a => a.reduce((n, x) => n + x.t + x.o, 0), last4 = sum(wk.slice(-4)), prev4 = sum(wk.slice(0, 4));
  const top = Math.max(5, Math.ceil(Math.max(...wk.map(x => x.t + x.o)) / 5) * 5);
  const trend = last4 - prev4;
  let month = '';
  const lab = w => { const m = N.fd(w, { month: 'short' }), d = N.fd(w, { day: 'numeric' }); if (m !== month) { month = m; return `${d} ${m}`; } return d; };
  return `<section class="card adm-chartcard">
    <div class="card-h"><div><h3>Sign-ups per week</h3><p class="small muted">Traders and organisers, last 8 weeks</p></div><div class="adm-headline"><span class="num">${last4}</span><span class="small muted">last 4 weeks · ${trend === 0 ? 'level with the 4 before' : `${trend > 0 ? '+' : '−'}${Math.abs(trend)} on the 4 before`}</span></div></div>
    <figure class="adm-chart">
      <div class="adm-grid" aria-hidden="true"><span data-v="${top}"></span><span data-v="${top / 2}"></span><span data-v="0"></span></div>
      <div class="adm-bars">${wk.map(x => `<div class="adm-col" tabindex="0" aria-label="Week of ${N.fLong(x.w)}: ${N.plural(x.t, 'trader')}, ${N.plural(x.o, 'organiser')}"><div class="adm-plot"><div class="adm-stack" style="height:${((x.t + x.o) / top * 100).toFixed(1)}%">${x.o ? `<i class="o" style="flex:${x.o}"></i>` : ''}${x.t ? `<i class="t" style="flex:${x.t}"></i>` : ''}</div></div><span class="adm-x" aria-hidden="true">${lab(x.w)}</span><span class="adm-tt" aria-hidden="true"><b>Week of ${N.fShort(x.w)}</b>${N.plural(x.t, 'trader')}<br>${N.plural(x.o, 'organiser')}</span></div>`).join('')}</div>
      <figcaption class="adm-legend"><span><i class="t"></i>Traders</span><span><i class="o"></i>Organisers</span></figcaption>
    </figure>
    <table class="sr"><caption>Sign-ups per week</caption><thead><tr><th>Week of</th><th>Traders</th><th>Organisers</th></tr></thead><tbody>${wk.map(x => `<tr><td>${N.fLong(x.w)}</td><td>${x.t}</td><td>${x.o}</td></tr>`).join('')}</tbody></table>
  </section>`;
}

function expiring() {
  const out = [];
  db.docs.forEach(d => { if (d.status !== 'approved' || !d.exp) return; const n = N.daysFrom(d.exp); if (n >= -7 && n <= 30) out.push({ key: d.id, tid: d.trader, type: d.type, exp: d.exp, n }); });
  Object.entries(db.traders).forEach(([tid, t]) => {
    if (!t.gas || db.docs.some(d => d.trader === tid && d.type === 'gas')) return;
    const n = N.daysFrom(t.gas); if (n >= -7 && n <= 30) out.push({ key: tid + '-gas', tid, type: 'gas', exp: t.gas, n });
  });
  return out.sort((a, b) => a.n - b.n);
}
function expiringCard() {
  const list = expiring(), R = S('dash').rem || (S('dash').rem = {});
  const open = list.filter(x => !R[x.key]).length;
  return `<section class="card" data-note="Expiring documents across every trader are listed here with a one-click reminder, so nobody turns up to an event with an expired gas certificate.">
    <div class="card-h"><div><h3>Expiring soon</h3><p class="small muted">Approved documents that run out in the next 30 days</p></div>${open > 1 ? B(`Remind all ${open}`, 'data-act="adm_remindAll"', 'btn-line', 'send') : ''}</div>
    ${list.length ? `<ul class="list">${list.map(x => { const t = T(x.tid), sent = R[x.key]; return `<li class="li"><span class="adm-days ${x.n <= 7 ? 'risk' : x.n <= 14 ? 'warn' : ''}"><b>${Math.max(x.n, 0)}</b>${Math.abs(x.n) === 1 ? 'day' : 'days'}</span><div class="li-main"><b>${esc(t.person)} · ${esc(tyName(x.type))}</b><span>${esc(t.biz)} · ${x.n < 0 ? 'expired' : 'expires'} ${N.fLong(x.exp)}</span></div><div class="li-end">${sent ? N.chip('ok', 'Reminder sent') : B('Send reminder', `data-act="adm_remind" data-key="${x.key}" data-t="${x.tid}" data-ty="${x.type}"`, 'btn-line', 'send')}</div></li>`; }).join('')}</ul>` : N.empty('Nothing expiring', 'No approved document runs out in the next 30 days.', '', 'shield')}
  </section>`;
}
function recentEventsCard() {
  const evs = Object.entries(db.events).filter(([, e]) => N.eventState(e) !== 'completed').sort(([, a], [, b]) => a.date.localeCompare(b.date)).slice(0, 6);
  return `<section class="card"><div class="card-h"><div><h3>Recent events</h3><p class="small muted">Next on the calendar</p></div>${B('View all', 'data-go="admin/events"', 'btn-ghost', 'arrow-right')}</div>
    <ul class="list">${evs.map(([id, e]) => `<li class="li">${N.evd(e.date, 'side')}<button type="button" class="li-main adm-libtn" data-act="adm_evView" data-id="${id}"><b>${esc(e.name)}</b><span>${esc(N.orgName(id))} · ${esc(e.city)} · ${e.filled}/${e.pitches} pitches</span></button><div class="li-end">${e.external ? extChip() : ''}${evChip(e)}</div></li>`).join('')}</ul></section>`;
}
const kpi = (lbl, n, sub, tone, attrs) => `<button type="button" class="stat adm-kpi ${tone}" ${attrs}><span class="lbl">${esc(lbl)}</span><span class="num" data-tw="${n}">${n}</span><span class="s">${esc(sub)}</span></button>`;

N.page('admin/dashboard', {
  app: 'admin', title: 'Dashboard', nav: 'admin/dashboard',
  render() {
    S('dq', { tab: 'all' });
    const q = queueItems(), nPend = pendingTraders().length + pendingOrgs().length + pendingDocs().length;
    const late = q.filter(x => daysAgo(x.since) > SET().reviewDays).length, orgs = orgList();
    const h = N.TODAY.getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const sub = nPend ? `${N.plural(nPend, 'decision')} waiting${late ? `, ${late} of them over the ${N.plural(SET().reviewDays, 'working day')} target` : ''}. Oldest first.` : 'Nothing is waiting for a decision.';
    return `${N.pageHead(`${greet}, <em>${esc(ADMIN().split(' ')[0])}</em>`, sub, `<button type="button" class="btn btn-line btn-sm" data-go="admin/create-external">${ic('calendar-plus')}Create external event</button>`, N.TODAY.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
    ${SET().maintenance ? `<div class="banner risk">${ic('alert')}<div class="grow"><b>Maintenance mode is on.</b> Traders and organisers see a holding page.</div><button type="button" class="btn btn-xs btn-line" data-go="admin/settings">Open settings</button></div>` : ''}
    <div class="stats adm-kpis">
      ${kpi('Total traders', Object.keys(db.traders).length, `Platform users · ${Object.values(db.traders).filter(t => t.status === 'approved').length} approved`, '', 'data-go="admin/traders"')}
      ${kpi('Pending approvals', nPend, 'Needs attention: traders, documents, organisers', nPend ? 'tone-butter' : 'tone-mint', 'data-act="adm_toQueue"')}
      ${kpi('Organisers', orgs.length, `Platform hosts · ${orgs.filter(([, o]) => o.status === 'active').length} active`, '', 'data-go="admin/organisers"')}
      ${kpi('Active events', activeEvents().length, 'Published now and not yet finished', '', 'data-go="admin/events"')}
    </div>
    <div class="grid g-main adm-dash">
      <section class="card" id="adm-queue" data-note="Pending approvals now include documents waiting for review and organiser compliance checks, not just new accounts. Items over the review target are flagged."><div class="card-h"><div><h3>Pending approvals</h3><p class="small muted">Review target: ${N.plural(SET().reviewDays, 'working day')}. Oldest first.</p></div></div>${region('dq', queueRegion)}</section>
      <div class="stack" style="--g:22px;min-width:0">${chartCard()}${expiringCard()}</div>
    </div>
    ${recentEventsCard()}`;
  },
  after(root) {
    const d = S('dash'); if (d.seen) return; d.seen = true;
    root.querySelectorAll('.adm-kpi [data-tw]').forEach(el => { el.dataset.v = 0; N.tween(el, Number(el.dataset.tw)); });
  },
});
Object.assign(N.act, {
  adm_toQueue() { $('#adm-queue')?.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' }); },
  adm_remind(el) { S('dash').rem[el.dataset.key] = true; N.refresh(); N.toast(`Reminder sent to <b>${esc(T(el.dataset.t).person)}</b> about their ${esc(tyName(el.dataset.ty))}.`, { icon: 'send' }); },
  adm_remindAll() { const R = S('dash').rem, list = expiring().filter(x => !R[x.key]); list.forEach(x => R[x.key] = true); N.refresh(); N.toast(`${N.plural(list.length, 'reminder')} sent.`, { icon: 'send' }); },
});

/* =====================================================================
   2. NOTIFICATIONS
   ===================================================================== */
function notesRegion() {
  const s = S('notes'), all = db.notifications.admin, unread = all.filter(n => n.unread), rows = s.tab === 'unread' ? unread : all;
  const silent = `<div class="adm-silent">${arch('shield', 'mint', 'lg')}<div><b>Platform secure &amp; silent</b><p>Nothing unread. New sign-ups, uploads and compliance requests appear here.</p></div></div>`;
  return `<div class="adm-bar-row">${tabs('notes', [['all', 'All', all.length], ['unread', 'Unread', unread.length]])}</div>
  ${!unread.length ? silent : ''}
  ${rows.length ? `<section class="card"><ul class="list">${rows.map(n => `<li class="li adm-note ${n.unread ? 'is-unread' : ''}">${arch(n.tone === 'warn' ? 'alert' : n.tone === 'ok' ? 'check-circle' : 'bell', TONE[n.tone] || 'lilac')}<div class="li-main"><b>${esc(n.title)}</b><span>${esc(n.text)} · ${N.rel(n.at)}</span></div><div class="li-end">${n.unread ? N.chip('side', 'New') + B('Mark as read', `data-act="adm_nRead" data-id="${n.id}"`, 'btn-ghost') : ''}${B('Open', `data-act="adm_nOpen" data-id="${n.id}"`, 'btn-line', 'arrow-right')}</div></li>`).join('')}</ul></section>` : ''}`;
}
N.page('admin/notifications', {
  app: 'admin', title: 'Notifications', nav: 'admin/notifications',
  render() {
    S('notes', { tab: 'all' });
    const unread = db.notifications.admin.filter(n => n.unread).length;
    return `${N.pageHead('Notifications', 'System events across traders, organisers and events. Open one to act on it.', unread ? `<button type="button" class="btn btn-line btn-sm" data-act="adm_nAll">${ic('check')}Mark all as read</button>` : '', 'Overview')}
    ${region('notes', notesRegion)}`;
  },
});
Object.assign(N.act, {
  adm_nRead(el) { const n = db.notifications.admin.find(x => x.id === el.dataset.id); if (n) n.unread = false; N.refresh(); },
  adm_nOpen(el) { const n = db.notifications.admin.find(x => x.id === el.dataset.id); if (!n) return; n.unread = false; N.go(n.go); },
  adm_nAll() { const hits = db.notifications.admin.filter(n => n.unread); hits.forEach(n => n.unread = false); N.refresh(); N.toast(`${N.plural(hits.length, 'notification')} marked as read.`, { undo() { hits.forEach(n => n.unread = true); N.refresh(); } }); },
});

/* =====================================================================
   3. TRADERS LIST
   ===================================================================== */
function trRegion() {
  const s = S('traders');
  const base = Object.entries(db.traders).filter(([, t]) => (s.city === 'all' || t.city === s.city) && hit(s.q, t.person, t.biz, t.email, t.phone, t.city));
  const cnt = k => k === 'all' ? base.length : base.filter(([, t]) => t.status === k).length;
  const items = [['all', 'All', cnt('all')], ['pending', 'Pending', cnt('pending')], ['approved', 'Approved', cnt('approved')], ['rejected', 'Rejected', cnt('rejected')]];
  if (cnt('suspended') || s.tab === 'suspended') items.push(['suspended', 'Suspended', cnt('suspended')]);
  const rows = base.filter(([, t]) => s.tab === 'all' || t.status === s.tab)
    .sort(([, a], [, b]) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.joined.localeCompare(a.joined));
  const p = paged(rows, s.page, 10); s.page = p.page;
  s.sel = s.sel.filter(id => T(id)?.status === 'pending');
  const pendOnPage = p.rows.filter(([, t]) => t.status === 'pending').map(([id]) => id);
  const allOn = pendOnPage.length && pendOnPage.every(id => s.sel.includes(id)), someOn = pendOnPage.some(id => s.sel.includes(id));
  const row = ([id, t]) => {
    const pend = t.status === 'pending', nd = pendingDocs(id).length, on = s.sel.includes(id);
    return `<tr class="click ${on ? 'sel' : ''}" data-go="admin/traders/${id}" tabindex="0">
      <td class="adm-cbcell">${pend ? cbox(String(on), `Select ${t.person}`, `data-act="adm_trSel" data-id="${id}"`) : ''}</td>
      <td data-l="Trader"><div class="cell">${N.tav(id)}<div><b>${esc(t.person)}</b><span class="s">${esc(t.biz)} · ${esc(t.email)}</span></div></div></td>
      <td data-l="Location">${esc(t.city)}</td>
      <td data-l="Joined"><span class="mono">${N.fLong(t.joined)}</span></td>
      <td data-l="Status"><div class="adm-chips">${N.statusChip(N.traderStatus, t.status)}${nd ? N.chip('info', `${nd} doc${nd > 1 ? 's' : ''} in review`) : ''}</div></td>
      <td class="r"><div class="adm-acts">${B('View', `data-go="admin/traders/${id}"`, 'btn-ghost adm-cmp', 'eye')}${pend ? B('Reject', `data-act="adm_trReject" data-id="${id}"`, 'btn-danger-line') + B('Approve', `data-act="adm_trApprove" data-id="${id}"`, 'btn-side', 'check') : ''}</div></td>
    </tr>`;
  };
  return `<div class="adm-bar-row" data-note="Status tabs show live counts that follow the search and city filter. Pending traders can be ticked and approved together.">${tabs('traders', items)}</div>
  ${s.sel.length ? `<div class="adm-bulk" role="region" aria-label="Bulk actions"><b>${N.plural(s.sel.length, 'trader')} selected</b><span class="grow"></span><button type="button" class="btn btn-xs adm-on-ink" data-act="adm_trSelClear">Clear</button><button type="button" class="btn btn-xs btn-zest" data-act="adm_trBulk">${ic('check')}Approve ${N.plural(s.sel.length, 'trader')}</button></div>` : ''}
  ${p.total ? `<div class="tbl-wrap"><table class="tbl stack-sm adm-tbl"><thead><tr><th class="adm-cbcell">${pendOnPage.length ? cbox(allOn ? 'true' : someOn ? 'mixed' : 'false', 'Select every pending trader on this page', `data-act="adm_trSelAll" data-ids="${pendOnPage.join(',')}"`) : ''}</th><th class="adm-wcol">Trader</th><th>Location</th><th>Date joined</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${p.rows.map(row).join('')}</tbody></table></div>${pagerHTML('traders', p)}`
    : N.empty('No traders match', 'Try a different name, email or phone number, or clear the city filter.', `<button type="button" class="btn btn-line btn-sm" data-act="adm_clear" data-k="traders">Clear filters</button>`, 'search')}`;
}
N.page('admin/traders', {
  app: 'admin', title: 'Traders', nav: 'admin/traders',
  render() {
    S('traders', { q: '', city: 'all', tab: 'all', page: 1, sel: [] });
    const n = Object.keys(db.traders).length, pend = pendingTraders().length;
    return `${N.pageHead('Traders management', `${N.plural(n, 'trader')} on the platform. ${pend ? `${pend} waiting for approval.` : 'Nobody is waiting for approval.'}`, '', 'Management')}
    <div class="adm-toolbar">${searchBox('traders', 'Search name, email, phone...')}${selectBox('traders', 'city', cityOpts(Object.values(db.traders).map(t => t.city)), 'City')}</div>
    ${region('traders', trRegion)}`;
  },
});
Object.assign(N.act, {
  adm_clear(el) { const s = S(el.dataset.k); s.q = ''; s.city = 'all'; s.tab = 'all'; s.page = 1; if ('country' in s) s.country = 'all'; if ('vpend' in s) s.vpend = false; N.refresh(); },
  adm_trSel(el) { const s = S('traders'), id = el.dataset.id; s.sel = s.sel.includes(id) ? s.sel.filter(x => x !== id) : [...s.sel, id]; redraw('traders', `[data-act="adm_trSel"][data-id="${id}"]`); },
  adm_trSelAll(el) { const s = S('traders'), ids = el.dataset.ids.split(','), all = ids.every(id => s.sel.includes(id)); s.sel = all ? s.sel.filter(x => !ids.includes(x)) : [...new Set([...s.sel, ...ids])]; redraw('traders', '[data-act="adm_trSelAll"]'); },
  adm_trSelClear() { S('traders').sel = []; redraw('traders'); },
  adm_trBulk() {
    const s = S('traders'), ids = s.sel.filter(id => T(id)?.status === 'pending'), undos = ids.map(id => setTrader(id, 'approved'));
    s.sel = []; N.refresh();
    N.toast(`${N.plural(ids.length, 'trader')} approved. They can now apply to events.`, { undo() { undos.forEach(u => u()); N.refresh(); } });
  },
  adm_trApprove(el) {
    const tid = el.dataset.id, t = T(tid), undo = setTrader(tid, 'approved'), left = pendingDocs(tid).length;
    N.refresh();
    N.toast(`<b>${esc(t.person)}</b> is approved and can apply to events.${left ? ` ${N.plural(left, 'document')} still in review.` : ''}`, { undo() { undo(); N.refresh(); } });
  },
  adm_trReject(el) {
    const tid = el.dataset.id, t = T(tid);
    N.confirm({
      title: `Reject ${t.person}?`, text: `${esc(t.biz)} gets an email with your reason and can reapply once it's fixed.`, confirm: 'Reject trader', danger: true,
      input: { label: 'Reason (sent to the trader)', ph: 'e.g. Your food business registration is unreadable. Please upload a clearer scan.', req: true },
      onConfirm(v) { const undo = setTrader(tid, 'rejected', { rejectReason: v }); N.refresh(); N.toast(`<b>${esc(t.person)}</b> was rejected. We've emailed your reason.`, { icon: 'x-circle', undo() { undo(); N.refresh(); } }); },
    });
  },
  adm_trSuspend(el) {
    const tid = el.dataset.id, t = T(tid);
    N.confirm({
      title: `Suspend ${t.person}?`, text: `${esc(t.biz)} is hidden from organisers and can't apply to events. Confirmed bookings stay in place until you decide otherwise.`, confirm: 'Suspend trader', danger: true,
      input: { label: 'Reason (internal note, required)', ph: 'e.g. Complaint from Reed Events about food safety at Greenwich.', req: true },
      onConfirm(v) { const undo = setTrader(tid, 'suspended', { suspendReason: v }); N.refresh(); N.toast(`<b>${esc(t.person)}</b> is suspended.`, { icon: 'ban', undo() { undo(); N.refresh(); } }); },
    });
  },
  adm_trReactivate(el) {
    const tid = el.dataset.id, t = T(tid);
    N.confirm({ title: `Re-activate ${t.person}?`, text: 'They can sign in, appear in searches and apply to events again.', confirm: 'Re-activate trader', onConfirm() { const undo = setTrader(tid, 'approved'); N.refresh(); N.toast(`<b>${esc(t.person)}</b> is active again.`, { undo() { undo(); N.refresh(); } }); } });
  },
});

/* =====================================================================
   4. TRADER DETAIL
   ===================================================================== */
function docRow({ d, ty, st }, tid) {
  const miss = !d || st === 'missing' || st === 'na';
  const reqKey = tid + ':' + ty.id, asked = S('req')[reqKey];
  const dates = miss ? `<span class="s">${st === 'na' ? 'No gas appliances on file' : 'Not uploaded yet'}</span>`
    : `<span class="s">Uploaded ${N.fLong(d.uploaded)}</span>${d.exp ? `<span class="s ${st === 'expiring' ? 'warn' : st === 'expired' ? 'risk' : ''}">Expires ${N.fLong(d.exp)} · ${inDays(N.daysFrom(d.exp))}</span>` : '<span class="s">No expiry</span>'}`;
  let acts = '';
  if (st === 'missing') acts = asked ? N.chip('plain', 'Upload requested') : B('Request upload', `data-act="adm_docReq" data-t="${tid}" data-ty="${ty.id}"`, 'btn-line', 'send');
  else if (!miss) {
    acts = B('View', `data-act="adm_docView" data-id="${d.id}"`, 'btn-ghost', 'eye');
    if (d.status === 'pending') acts += B('Reject', `data-act="adm_docNo" data-id="${d.id}"`, 'btn-danger-line') + B('Approve', `data-act="adm_docOk" data-id="${d.id}"`, 'btn-side', 'check');
    else if (d.status === 'approved') acts += B('Reject', `data-act="adm_docNo" data-id="${d.id}"`, 'btn-ghost adm-danger');
    else if (d.status === 'rejected') acts += B('Approve', `data-act="adm_docOk" data-id="${d.id}"`, 'btn-ghost', 'check');
  }
  return `<div class="adm-doc is-${st}">
    ${arch(miss ? (st === 'na' ? 'minus' : 'upload') : 'file', st === 'pending' ? 'lilac' : st === 'rejected' || st === 'expired' ? 'peach' : st === 'expiring' ? 'butter' : st === 'valid' ? 'mint' : '', 'sm')}
    <div class="adm-doc-m"><b>${esc(ty.name)}</b><span class="s">Tier ${ty.tier} · ${esc(ty.level)} level${d?.file && !miss ? ` · <span class="mono">${esc(d.file)}</span>` : ''}</span>${d?.reason && st === 'rejected' ? `<span class="s adm-risk">“${esc(d.reason)}”</span>` : ''}</div>
    <div class="adm-doc-d">${dates}</div>
    <div class="adm-doc-s">${docChip(st)}</div>
    <div class="adm-acts">${acts}</div>
  </div>`;
}

function trBusiness(tid, t) {
  const up = [t.joined, ...db.docs.filter(d => d.trader === tid && d.uploaded).map(d => d.uploaded)].sort().pop();
  return `<div class="grid g-main">
    <section class="card"><div class="card-h"><h3>Business</h3></div>
      ${N.kv([['Trading name', esc(t.display || t.biz)], ['Company name', esc(t.company)], ['Food hygiene rating', `${t.fhrs}/5 · ${esc(N.FHRS[t.fhrs])}`], ['Local authority', esc(t.authority || `${t.city} City Council`)], ['Contact email', esc(t.email)], ['Business phone', esc(t.phone)], ['Website', t.website ? esc(t.website) : muted('Not provided')], ['Registration date', N.fLong(t.joined)], ['Business address', t.address ? esc(t.address) : muted(`Not provided · trades from ${t.city}`)], ['What they sell', esc(t.food)]])}
    </section>
    <div class="stack" style="--g:22px">
      <section class="card blk-mint adm-fhrs">${N.fhrs(t.fhrs)}<p class="xs">Checked against ${esc(t.authority || `${t.city} City Council`)} records</p></section>
      <section class="card"><div class="card-h"><h3>Tags &amp; categories</h3></div>
        <div class="stack" style="--g:12px">
          <div><p class="dr-h">Cuisine</p><div class="tags"><span class="tag">${esc(t.cuisine || '—')}</span></div></div>
          <div><p class="dr-h">Food categories</p><div class="tags">${(t.categories || []).map(c => `<span class="tag">${esc(c)}</span>`).join('') || muted('None')}</div></div>
          <div><p class="dr-h">Speciality tags</p><div class="tags">${(t.tags || []).map(c => `<span class="tag">${ic('tag')}${esc(c)}</span>`).join('') || muted('None')}</div></div>
        </div>
      </section>
      <section class="card"><div class="card-h"><h3>Trader details</h3></div>${N.kv([['Trader ID', `<span class="mono">${traderID(tid)}</span>`], ['Joined', N.fLong(t.joined)], ['Last updated', N.fLong(up)], ['Power needed', esc(t.power || 'None')]])}</section>
    </div>
  </div>`;
}

function trUnits(tid) {
  const us = unitsOf(tid);
  return `<div class="grid g2">${us.map(u => {
    const ud = db.docs.filter(d => d.unit === u.id);
    return `<article class="card adm-unit">
      <div class="adm-unit-h">${arch(/gazebo|marquee|stall|cart/i.test(u.type) ? 'tent' : 'truck', 'butter')}<div><b>${esc(u.name)}</b><span class="s">${esc(u.type)}</span></div>${N.chip(u.status === 'active' ? 'ok' : 'plain', u.status === 'active' ? 'Active' : 'Draft')}</div>
      ${N.kv([['Size', u.w ? `${u.w} × ${u.d} m` : esc(u.size || 'Not given')], ['Power', esc(u.power || 'None')], ['Gas', u.gas ? 'LPG cooking' : 'No gas'], ['Water', u.water ? 'Needs a water point' : 'Self-sufficient'], ['Staff on site', String(u.staff || '—')], ['Serves', esc(u.cuisine || '—')]])}
      ${ud.length ? `<div class="tags">${ud.map(d => `<span class="tag">${esc(tyName(d.type))} · ${esc(({ valid: 'Approved', expiring: 'Expiring', pending: 'In review', missing: 'Not uploaded', rejected: 'Rejected', expired: 'Expired' })[N.docState(d)])}</span>`).join('')}</div>` : ''}
      ${u.generic ? '<p class="xs muted">Summary from their applications. Full unit details appear when they add the unit to their profile.</p>' : ''}
    </article>`;
  }).join('')}</div>`;
}

function trDocs(tid, t) {
  const rows = docsView(tid), pend = rows.filter(r => r.st === 'pending'), need = rows.filter(r => r.st !== 'na'), ok = need.filter(r => ['valid', 'expiring'].includes(r.st));
  return `<div class="stack" style="--g:14px" data-note="Trader review shows every document with approve and reject in one place. Rejections need a reason, which is sent to the trader.">
    <div class="toolbar"><p class="small muted"><b class="ink-2">${ok.length} of ${need.length}</b> verified${pend.length ? ` · ${pend.length} waiting for you` : ''}${tid === db.me.trader ? ` · readiness ${N.readiness(tid)}%` : ''}</p>${pend.length > 1 ? B(`Approve all ${pend.length} in review`, `data-act="adm_docAll" data-id="${tid}"`, 'btn-side', 'check') : ''}</div>
    <div class="adm-docs">${rows.map(r => docRow(r, tid)).join('')}</div>
    ${tid !== db.me.trader && t.status !== 'pending' ? '<p class="xs muted">Files for long-standing traders are summarised from their passport.</p>' : ''}
  </div>`;
}

function trHistory(tid) {
  const apps = db.apps.filter(a => a.t === tid).sort((a, b) => b.at - a.at);
  const revs = db.reviews.filter(r => r.to === tid && r.dir === 'o2t');
  const dated = [{ date: T(tid).joined, text: 'Created a trader account', icon: 'user-plus', tone: 'butter' }, ...db.docs.filter(d => d.trader === tid && d.uploaded).map(d => ({ date: d.uploaded, text: `Uploaded ${tyName(d.type)}`, icon: 'upload', tone: 'info' }))];
  return `<div class="grid g-main">
    <section class="card"><div class="card-h"><h3>Applications</h3><span class="small muted">${N.plural(apps.length, 'application')}</span></div>
      ${apps.length ? `<div class="tbl-wrap adm-flat"><table class="tbl stack-sm"><thead><tr><th>Event</th><th>Organiser</th><th>Applied</th><th>Outcome</th></tr></thead><tbody>${apps.map(a => { const e = E(a.e); return `<tr class="click" data-act="adm_evView" data-id="${a.e}" tabindex="0"><td data-l="Event"><div class="cell">${N.evd(e.date)}<div><b>${esc(e.name)}</b><span class="s">${esc(a.unit || 'Unit not given')}</span></div></div></td><td data-l="Organiser">${esc(N.orgName(a.e))}</td><td data-l="Applied"><span class="mono">${N.rel(a.at)}</span></td><td data-l="Outcome"><div class="adm-chips">${N.statusChip(N.appLabel, a.st)}${a.done ? N.chip('plain', 'Traded') : ''}${a.pitch ? `<span class="mtag">Pitch ${esc(a.pitch)}</span>` : ''}</div>${a.rec?.note ? `<span class="s adm-block">${esc(a.rec.note)}</span>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`
        : N.empty('No applications yet', 'They haven’t applied to an event.', '', 'inbox')}
    </section>
    <div class="stack" style="--g:22px">
      <section class="card"><div class="card-h"><h3>Reviews from organisers</h3></div>
        ${revs.length ? `<ul class="list">${revs.map(r => `<li class="adm-rev">${N.stars(r.stars)}<p>“${esc(r.text)}”</p><span class="small muted">${esc(O(r.from)?.company || '')} · ${esc(E(r.e)?.name || '')} · ${N.fLong(r.when)}</span></li>`).join('')}</ul>` : '<p class="small muted">No reviews yet.</p>'}
      </section>
      <section class="card"><div class="card-h"><h3>Account activity</h3></div>${timeline(tlFrom('t:' + tid, dated))}</section>
    </div>
  </div>`;
}

N.page('admin/traders/:id', {
  app: 'admin', nav: 'admin/traders', example: 'admin/traders/jc',
  title: p => N.db.traders[p.id]?.person || 'Trader',
  crumbs: p => [['Traders', 'admin/traders'], [N.db.traders[p.id]?.person || 'Not found']],
  render(p) {
    const tid = p.id, t = T(tid);
    if (!t) return notFound('trader', 'admin/traders');
    const tab = S('ut')['t:' + tid] || 'business';
    const rows = docsView(tid), pend = rows.filter(r => r.st === 'pending'), need = rows.filter(r => r.st !== 'na'), ok = need.filter(r => ['valid', 'expiring'].includes(r.st));
    const comp = N.completion(tid), units = unitsOf(tid);
    const acts = {
      pending: B('Reject', `data-act="adm_trReject" data-id="${tid}"`, 'btn-danger-line btn-sm') + B('Approve trader', `data-act="adm_trApprove" data-id="${tid}"`, 'btn-side btn-sm', 'check'),
      approved: B('Suspend', `data-act="adm_trSuspend" data-id="${tid}"`, 'btn-danger-line btn-sm', 'ban'),
      rejected: B('Approve trader', `data-act="adm_trApprove" data-id="${tid}"`, 'btn-side btn-sm', 'check'),
      suspended: B('Re-activate', `data-act="adm_trReactivate" data-id="${tid}"`, 'btn-side btn-sm', 'refresh'),
    }[t.status] || '';
    const banner = t.status === 'pending' ? `<div class="banner info">${ic('info')}<div class="grow">Joined ${ago(t.joined)}. ${pend.length ? `Check the ${N.plural(pend.length, 'document')} in review, then approve or reject the account.` : 'Approve or reject the account.'}</div>${pend.length ? B('Review documents', `data-act="adm_ut" data-k="t:${tid}" data-v="documents"`, 'btn-line') : ''}</div>`
      : t.status === 'rejected' ? `<div class="banner risk">${ic('x-circle')}<div class="grow"><b>Rejected.</b> ${esc(t.rejectReason || 'No reason recorded.')}</div></div>`
      : t.status === 'suspended' ? `<div class="banner risk">${ic('ban')}<div class="grow"><b>Suspended.</b> ${esc(t.suspendReason || 'No reason recorded.')} Hidden from organisers until re-activated.</div></div>` : '';
    const pane = { business: () => trBusiness(tid, t), units: () => trUnits(tid), documents: () => trDocs(tid, t), history: () => trHistory(tid) }[tab] || (() => trBusiness(tid, t));
    return `${backLink('admin/traders', 'Back to traders')}
    <section class="card adm-hero">
      ${N.tav(tid, 'xl')}
      <div class="adm-hero-b">
        <p class="eyebrow">Trader · ${traderID(tid)}</p>
        <div class="adm-hero-t"><h1 class="h-page">${esc(t.person)}</h1>${N.statusChip(N.traderStatus, t.status)}</div>
        <p class="ink-2"><b>${esc(t.biz)}</b> · ${esc(t.bio || t.food)}</p>
        <ul class="adm-meta"><li>${ic('mail')}${esc(t.email)}</li><li>${ic('phone')}${esc(t.phone)}</li><li>${ic('pin')}${esc(t.city)}</li><li>${ic('clock')}Trading since ${t.since}</li></ul>
      </div>
      <div class="btn-row adm-hero-a">${acts}</div>
    </section>
    ${banner}
    <div class="stats">
      <div class="stat"><span class="lbl">Units</span><span class="num">${units.length}</span><span class="s">${units.filter(u => u.status === 'active').length} active</span></div>
      <div class="stat"><span class="lbl">Documents verified</span><span class="num">${ok.length}<small>/${need.length}</small></span>${N.bar(need.length ? ok.length / need.length * 100 : 0, ok.length === need.length ? 'ok' : 'warn')}<span class="s">${pend.length ? `${pend.length} in review` : 'Nothing waiting'}</span></div>
      <div class="stat tone-butter"><span class="lbl">Passport complete</span><span class="num">${comp.pct}%</span><span class="s">${comp.parts.filter(x => x.done).length} of ${comp.parts.length} sections done</span></div>
      <div class="stat"><span class="lbl">Joined</span><span class="num adm-num-s">${N.fShort(t.joined)}</span><span class="s">${N.fd(t.joined, { year: 'numeric' })} · ${ago(t.joined)}</span></div>
    </div>
    ${N.utabs([['business', 'Business'], ['units', 'Units', units.length], ['documents', 'Documents', pend.length || null], ['history', 'History']], tab, `data-act="adm_ut" data-k="t:${tid}" data-v`)}
    <div class="adm-pane">${pane()}</div>`;
  },
});

/* ---------- document review ---------- */
function paper({ issuer, title, holder, rows, ref }) {
  return `<div class="adm-paper" aria-hidden="true">
    <div class="adm-paper-h"><span class="adm-paper-seal">${ic('shield')}</span><div><b>${esc(issuer)}</b><span>${esc(title)}</span></div></div>
    <div class="adm-paper-b">
      <p class="adm-paper-k">Issued to</p><p class="adm-paper-v">${esc(holder)}</p>
      ${rows.map(([k, v]) => `<div class="adm-paper-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
      <i class="adm-ln" style="width:94%"></i><i class="adm-ln" style="width:81%"></i><i class="adm-ln" style="width:88%"></i><i class="adm-ln" style="width:56%"></i>
    </div>
    <div class="adm-paper-f"><span class="mono">${esc(ref)}</span><span class="adm-paper-sig">${esc(holder.split(' ')[0])}</span></div>
  </div>`;
}
const ISSUER = { pli: 'Event Cover Mutual (demo)', fhc: null, fsra: 'Food safety management plan', fbr: null, l2: 'Food Safety Training Centre (demo)', gas: 'Gas Safe registered engineer', elec: 'Electrical safety inspection' };
function docChecks(d, t, ty) {
  const out = [{ label: 'Name matches the account', val: t.company, st: 'ok' }, { label: 'Readable scan', val: d.reason && /unread|clearer|blurr/i.test(d.reason) ? 'Text is hard to read' : 'Text found on every page', st: d.reason && /unread|clearer|blurr/i.test(d.reason) ? 'fail' : 'ok' }];
  if (ty.expiry || d.exp) { const n = d.exp ? N.daysFrom(d.exp) : null; out.push({ label: 'Expiry date', val: d.exp ? `${N.fLong(d.exp)} · ${inDays(n)}` : 'Not found', st: n == null || n < 0 ? 'fail' : n <= 30 ? 'warn' : 'ok' }); }
  if (d.type === 'pli') { const m = /£(\d+)m/.exec(d.note || ''), v = m ? Number(m[1]) : null; out.push({ label: 'Cover of £5m or more', val: v ? `£${v}m${v < 5 ? ' · most events need £5m' : ''}` : 'Not found', st: v >= 5 ? 'ok' : 'warn' }); }
  if (d.type === 'fhc') out.push({ label: 'Hygiene rating', val: `${t.fhrs} · ${N.FHRS[t.fhrs]}`, st: t.fhrs >= 3 ? 'ok' : 'warn' });
  return out;
}
function docModal(id) {
  const d = findDoc(id); if (!d) return;
  const t = T(d.trader), ty = N.docType(d.type) || { name: 'Document', tier: '–', level: '–', expiry: !!d.exp }, st = N.docState(d);
  const council = t.authority || `${t.city} City Council`;
  N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">${esc(t.biz)} · Tier ${ty.tier} · ${esc(ty.level)} level</p><h3>${esc(ty.name)}</h3><div class="row" style="--g:8px">${docChip(st)}<span class="mono muted">${esc(d.file)}</span></div></div>
    <div class="adm-docview">
      ${paper({ issuer: ISSUER[d.type] || council, title: ty.name, holder: d.type === 'l2' ? t.person : t.company, rows: [['Detail', d.note || '—'], ['Valid until', d.exp ? N.fLong(d.exp) : 'No expiry']], ref: `REF ${String(hash(d.id)).padStart(5, '0')}-${d.type.toUpperCase()}` })}
      <div class="stack" style="--g:16px">
        <div><p class="dr-h">Extracted fields</p>${N.kv([['Holder', esc(d.type === 'l2' ? t.person : t.company)], ['Detail', esc(d.note || '—')], ['Uploaded', N.fLong(d.uploaded)], ['Expires', d.exp ? N.fLong(d.exp) : 'No expiry']], 'adm-kv1')}</div>
        <div><p class="dr-h">Automatic checks</p>${N.reqList(docChecks(d, t, ty))}</div>
      </div>
    </div>
    ${d.reason && st === 'rejected' ? `<div class="banner risk">${ic('x-circle')}<div class="grow"><b>Rejected:</b> ${esc(d.reason)}</div></div>` : ''}
    ${d.reviewed ? `<p class="xs muted">Last decision by ${esc(d.reviewed.by)} on ${N.fLong(d.reviewed.on)}.</p>` : ''}
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Close</button>${d.status !== 'rejected' ? `<button type="button" class="btn btn-danger-line btn-sm" data-act="adm_docNo" data-id="${d.id}">Reject</button>` : ''}${d.status !== 'approved' ? `<button type="button" class="btn btn-side btn-sm" data-act="adm_docOk" data-id="${d.id}">${ic('check')}Approve document</button>` : ''}</div>`, 'wide');
}
const readinessNote = r => r.d.trader === db.me.trader && r.before !== r.after ? ` Readiness ${r.before}% → ${r.after}%.` : '';
Object.assign(N.act, {
  adm_docView(el) { docModal(el.dataset.id); },
  adm_docOk(el) {
    const r = decideDoc(el.dataset.id, 'approved');
    N.closeModal(); N.refresh();
    N.toast(`${esc(r.name)} approved for <b>${esc(r.t.person)}</b>.${readinessNote(r)}`, { undo() { r.undo(); N.refresh(); } });
  },
  adm_docNo(el) {
    const d = findDoc(el.dataset.id), t = T(d.trader), name = tyName(d.type);
    N.confirm({
      title: `Reject ${name}?`, text: `${esc(t.person)} gets an email with your reason and can upload a new file.`, confirm: 'Reject document', danger: true,
      input: { label: 'Reason (sent to the trader)', ph: d.type === 'pli' ? 'e.g. The policy shows £2m cover. Most events need at least £5m.' : 'e.g. The scan is cut off at the bottom. Please upload the full page.', req: true },
      onConfirm(v) { const r = decideDoc(d.id, 'rejected', v); N.refresh(); N.toast(`${esc(name)} rejected. We've emailed ${esc(t.person)} your reason.${readinessNote(r)}`, { icon: 'x-circle', undo() { r.undo(); N.refresh(); } }); },
    });
  },
  adm_docAll(el) {
    const tid = el.dataset.id, ids = pendingDocs(tid).map(d => d.id), rs = ids.map(id => decideDoc(id, 'approved'));
    N.refresh();
    N.toast(`${N.plural(rs.length, 'document')} approved for <b>${esc(T(tid).person)}</b>.`, { undo() { rs.reverse().forEach(r => r.undo()); N.refresh(); } });
  },
  adm_docReq(el) { S('req')[el.dataset.t + ':' + el.dataset.ty] = true; N.refresh(); N.toast(`Asked <b>${esc(T(el.dataset.t).person)}</b> to upload their ${esc(tyName(el.dataset.ty))}.`, { icon: 'send' }); },
});

/* =====================================================================
   5. ORGANISERS LIST
   ===================================================================== */
const orgStatusChip = o => o.removed ? N.chip('risk', 'Removed') : o.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Inactive');
const verifyChip = o => o.verify === 'approved' ? N.checked('Verified') : o.verify === 'rejected' ? N.chip('risk', 'Verification rejected') : N.chip('warn', 'Verification pending');
function orgRegion() {
  const s = S('orgs');
  const base = orgList().filter(([, o]) => (s.city === 'all' || o.city === s.city) && hit(s.q, o.company, o.person, o.email, o.phone, o.city));
  const cnt = k => k === 'all' ? base.length : base.filter(([, o]) => o.status === k).length;
  const vp = base.filter(([, o]) => o.verify === 'pending').length;
  const rows = base.filter(([, o]) => (s.tab === 'all' || o.status === s.tab) && (!s.vpend || o.verify === 'pending')).sort(([, a], [, b]) => (a.verify === 'pending' ? 0 : 1) - (b.verify === 'pending' ? 0 : 1) || a.company.localeCompare(b.company));
  const p = paged(rows, s.page, 10); s.page = p.page;
  return `<div class="adm-bar-row">${tabs('orgs', [['all', 'All', cnt('all')], ['active', 'Active', cnt('active')], ['inactive', 'Inactive', cnt('inactive')]])}<button type="button" class="chip lg adm-fchip" aria-pressed="${!!s.vpend}" data-act="adm_orgV">${ic('shield-plain', 'ic-sm')}Verification pending<span class="adm-fn">${vp}</span></button></div>
  ${p.total ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th class="adm-wcol">Organiser / company</th><th>Contact info</th><th>Location</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${p.rows.map(([id, o]) => `<tr class="click" data-go="admin/organisers/${id}" tabindex="0">
    <td data-l="Organiser / company"><div class="cell">${N.oav(id)}<div><b>${esc(o.company)}</b><span class="s">${esc(o.person)} · ${esc(o.role || 'Organiser')}</span></div></div></td>
    <td data-l="Contact info"><div class="adm-contact"><span>${ic('mail', 'ic-sm')}${esc(o.email)}</span><span>${ic('phone', 'ic-sm')}${esc(o.phone)}</span></div></td>
    <td data-l="Location">${esc(o.city)}<span class="s adm-block">${esc(o.county || '')}</span></td>
    <td data-l="Status"><div class="adm-chips">${orgStatusChip(o)}${verifyChip(o)}</div></td>
    <td class="r">${B('View details', `data-go="admin/organisers/${id}"`, 'btn-line', 'arrow-right')}</td>
  </tr>`).join('')}</tbody></table></div>${pagerHTML('orgs', p)}`
    : N.empty('No organisers match', 'Try another name or email, or turn off the verification filter.', `<button type="button" class="btn btn-line btn-sm" data-act="adm_clear" data-k="orgs">Clear filters</button>`, 'building')}`;
}
N.page('admin/organisers', {
  app: 'admin', title: 'Organisers', nav: 'admin/organisers',
  render() {
    S('orgs', { q: '', city: 'all', tab: 'all', vpend: false, page: 1 });
    const n = orgList().length, vp = pendingOrgs().length;
    return `${N.pageHead('Organisers management', `${N.plural(n, 'organiser')} host events on Niche. ${vp ? `${N.plural(vp, 'compliance review')} waiting.` : 'Every organiser is verified.'}`, '', 'Management')}
    <div class="adm-toolbar">${searchBox('orgs', 'Search company, name, email...')}${selectBox('orgs', 'city', cityOpts(orgList().map(([, o]) => o.city)), 'City')}</div>
    ${region('orgs', orgRegion)}`;
  },
});
N.act.adm_orgV = () => { const s = S('orgs'); s.vpend = !s.vpend; s.page = 1; redraw('orgs', '[data-act="adm_orgV"]'); };

/* =====================================================================
   6. ORGANISER DETAIL
   ===================================================================== */
function orgDocs(oid) {
  const o = O(oid), up = o.verifySent || o.joined, sl = N.slug(o.company);
  return [
    { k: 'inc', name: 'Certificate of incorporation', sub: `Companies House · ${o.regNo}`, file: `${sl}-incorporation.pdf`, up, exp: null, issuer: 'Companies House (demo copy)' },
    { k: 'pli', name: 'Public liability insurance', sub: '£10m event organiser cover', file: `${sl}-pli-2026.pdf`, up, exp: N.addDays(up, 364), issuer: 'Event Cover Mutual (demo)' },
    { k: 'id', name: 'Director proof of identity', sub: `${o.person} · passport`, file: `${N.slug(o.person)}-id.pdf`, up, exp: '2031-03-14', issuer: 'Identity check' },
  ];
}
const ORG_DOC_ST = { pending: 'pending', approved: 'valid', rejected: 'rejected' };

function orgOverview(oid, o, evs, apps) {
  const [first, ...rest] = o.person.split(' ');
  const approved = new Set(apps.filter(a => a.st === 'approved').map(a => a.t)).size;
  const figs = [['Total events', evs.length], ['Applications received', apps.length], ['Approved traders', approved], ['Average rating', o.rating ? o.rating.toFixed(1) : '—'], ['Estimated revenue', N.money(orgRevenue(oid))]];
  const handle = N.slug(o.company).replace(/-/g, '');
  const social = [['globe', 'Website', o.website || null], ['instagram', 'Instagram', o.website ? '@' + handle : null], ['linkedin', 'LinkedIn', o.website ? 'linkedin.com/company/' + N.slug(o.company) : null], ['facebook', 'Facebook', null]];
  return `<section class="card adm-figs">${figs.map(([l, v]) => `<div><span class="lbl">${esc(l)}</span><b class="num">${esc(String(v))}</b></div>`).join('')}</section>
  <div class="grid g-main">
    <div class="stack" style="--g:22px">
      <section class="card"><div class="card-h"><h3>Company &amp; contact profile</h3></div>${N.kv([['First name', esc(first)], ['Last name', esc(rest.join(' '))], ['Company / trading name', esc(o.company)], ['Registration number', `<span class="mono">${esc(o.regNo)}</span>`], ['Company type', o.type === 'ltd' ? 'Private limited company' : esc(o.type || '—')], ['Email', esc(o.email)], ['Phone', esc(o.phone)], ['Registered address', esc(o.address)]])}</section>
      <section class="card"><div class="card-h"><h3>Recent events created</h3>${B('View all', `data-act="adm_ut" data-k="o:${oid}" data-v="events"`, 'btn-ghost', 'arrow-right')}</div>
        ${evs.length ? `<ul class="list">${evs.slice(0, 3).map(([id, e]) => `<li class="li">${N.evd(e.date, 'side')}<button type="button" class="li-main adm-libtn" data-act="adm_evView" data-id="${id}"><b>${esc(e.name)}</b><span>${esc(e.city)} · ${e.filled}/${e.pitches} pitches</span></button><div class="li-end">${evChip(e)}</div></li>`).join('')}</ul>` : '<p class="small muted">No events yet.</p>'}
      </section>
    </div>
    <div class="stack" style="--g:22px">
      <section class="card"><div class="card-h"><h3>Social &amp; web footprint</h3></div><ul class="adm-social">${social.map(([icn, l, v]) => `<li>${arch(icn, v ? 'sky' : '', 'sm')}<div><b>${l}</b><span class="s">${v ? esc(v) : 'Not linked'}</span></div>${v ? B('Open', `data-act="demoToast" data-msg="Opens ${esc(l)} in a new tab on the live site."`, 'btn-ghost', 'arrow-up-right') : ''}</li>`).join('')}</ul></section>
      <section class="card"><div class="card-h"><h3>Account access &amp; security</h3></div>
        <div class="adm-setrows">
          <div class="adm-setrow"><div><b>User active</b><span class="s">Inactive users can't sign in or publish events.</span></div>${N.toggle('adm_oact_' + oid, o.status === 'active' ? 'Active' : 'Inactive', o.status === 'active' && !o.removed, `data-change="adm_orgActive" data-id="${oid}" ${o.removed ? 'disabled' : ''}`)}</div>
          <div class="adm-setrow"><div><b>Assigned roles</b><span class="s">Controls what they can see and do.</span></div><div class="tags"><span class="chip side">Organiser</span></div></div>
          <div class="adm-setrow"><div><b>Two-step sign-in</b><span class="s">Code by text message</span></div>${o.verify === 'approved' ? N.chip('ok', 'On') : N.chip('warn', 'Not set up')}</div>
          <div class="adm-setrow"><div><b>Last signed in</b><span class="s">From ${esc(o.city)}, United Kingdom</span></div><span class="mono">${oid === db.me.org ? 'Today, 09:12' : N.fLong(N.addDays(TODAY, -2))}</span></div>
        </div>
        <div class="btn-row" style="margin-top:12px">${B('Send password reset', `data-act="adm_pwReset" data-id="${oid}"`, 'btn-line', 'key')}</div>
      </section>
    </div>
  </div>`;
}
function orgBusiness(oid, o) {
  const free = N.addDays(o.joined, SET().orgFree * 30.4 | 0);
  const vOk = o.verify === 'approved';
  return `<div class="grid g-main">
    <section class="card"><div class="card-h"><h3>Business information</h3></div>${N.kv([['Company name', esc(o.company)], ['Company type', o.type === 'ltd' ? 'Private limited company' : esc(o.type || '—')], ['Registration number', `<span class="mono">${esc(o.regNo)}</span>`], ['VAT number', muted('Not provided')], ['Registered address', esc(o.address)], ['County', esc(o.county || '—')], ['Main contact', `${esc(o.person)} · ${esc(o.role || 'Organiser')}`], ['Website', o.website ? esc(o.website) : muted('Not provided')], ['Joined Niche', N.fLong(o.joined)], ['Organiser ID', `<span class="mono">${orgID(oid)}</span>`]])}</section>
    <div class="stack" style="--g:22px">
      <section class="card"><div class="card-h"><h3>Plan</h3>${N.chip('side', 'Event Pass')}</div>${N.kv([['Free until', N.fLong(free)], ['From year 2', `${SET().orgCommission}% of confirmed bookings`]], 'adm-kv1')}</section>
      <section class="card"><div class="card-h"><h3>Companies House check</h3></div>${N.reqList([{ label: 'Company is active', val: esc(o.regNo), st: 'ok' }, { label: 'Director name matches', val: o.person, st: 'ok' }, { label: 'Registered address matches', val: o.city, st: 'ok' }, { label: 'Compliance documents', val: vOk ? 'Approved' : o.verify === 'rejected' ? 'Rejected' : 'In review', st: vOk ? 'ok' : o.verify === 'rejected' ? 'fail' : 'warn' }])}</section>
    </div>
  </div>`;
}
function orgEvents(evs) {
  return evs.length ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Event</th><th>City</th><th>Pitches</th><th>Applications</th><th>Status</th></tr></thead><tbody>${evs.map(([id, e]) => { const pct = e.pitches ? Math.round(e.filled / e.pitches * 100) : 0; return `<tr class="click" data-act="adm_evView" data-id="${id}" tabindex="0"><td data-l="Event"><div class="cell">${N.evd(e.date, 'side')}<div><b>${esc(e.name)}</b><span class="s">${evDates(e)}</span></div></div></td><td data-l="City">${esc(e.city)}</td><td data-l="Pitches"><span class="adm-fill">${N.bar(pct, pct >= 80 ? 'ok' : '')}<span class="mono">${e.filled}/${e.pitches}</span></span></td><td data-l="Applications"><span class="mono">${db.apps.filter(a => a.e === id).length}</span></td><td data-l="Status">${evChip(e)}</td></tr>`; }).join('')}</tbody></table></div>`
    : N.empty('No events yet', 'Events they create appear here.', '', 'calendar');
}
function orgDocsPane(oid, o) {
  const st = ORG_DOC_ST[o.verify] || 'pending';
  const head = o.verify === 'pending' ? `Submitted ${N.fLong(o.verifySent || o.joined)} · waiting ${N.plural(daysAgo(o.verifySent || o.joined), 'day')}. Check all three documents, then decide.`
    : o.verify === 'approved' ? `Approved${o.verifiedOn ? ` on ${N.fLong(o.verifiedOn)}` : ''}. Their events show the Niche checked badge.`
    : `Rejected: ${esc(o.verifyReason || 'no reason recorded')}. Waiting for new documents.`;
  return `<div class="stack" style="--g:14px" data-note="Organiser compliance review now sits next to the documents it depends on, with a required reason for rejections.">
    <section class="card adm-verify is-${o.verify}">
      ${arch('shield', o.verify === 'approved' ? 'mint' : o.verify === 'rejected' ? 'peach' : 'butter')}
      <div class="adm-verify-b"><h3 class="h4">Compliance review</h3><p class="small ink-2">${head}</p></div>
      <div class="btn-row">${o.verify === 'approved' ? N.checked('Verified') + B('Reopen review', `data-act="adm_orgVerReopen" data-id="${oid}"`, 'btn-ghost') : `${o.verify === 'pending' ? B('Reject compliance review', `data-act="adm_orgVerNo" data-id="${oid}"`, 'btn-danger-line btn-sm') : ''}${B('Approve compliance review', `data-act="adm_orgVerOk" data-id="${oid}"`, 'btn-side btn-sm', 'check')}`}</div>
    </section>
    <div class="adm-docs">${orgDocs(oid).map(d => `<div class="adm-doc is-${st}">${arch('file', st === 'valid' ? 'mint' : st === 'rejected' ? 'peach' : 'lilac', 'sm')}<div class="adm-doc-m"><b>${esc(d.name)}</b><span class="s">${esc(d.sub)} · <span class="mono">${esc(d.file)}</span></span></div><div class="adm-doc-d"><span class="s">Uploaded ${N.fLong(d.up)}</span><span class="s">${d.exp ? `Expires ${N.fLong(d.exp)}` : 'No expiry'}</span></div><div class="adm-doc-s">${N.docChip(st)}</div><div class="adm-acts">${B('View', `data-act="adm_orgDocView" data-id="${oid}" data-k="${d.k}"`, 'btn-ghost', 'eye')}</div></div>`).join('')}</div>
  </div>`;
}
function orgTimeline(oid) {
  const o = O(oid), dated = [{ date: o.joined, text: 'Created an organiser account', icon: 'user-plus', tone: 'lilac' }];
  if (o.verify) dated.push({ date: o.verifySent || o.joined, text: 'Submitted compliance documents', sub: '3 files', icon: 'upload', tone: 'info' });
  Object.entries(db.events).filter(([, e]) => e.org === oid).forEach(([, e]) => {
    const pub = [N.addDays(e.date, -60), o.joined].sort().pop(), when = pub > TODAY ? N.addDays(TODAY, -1) : pub;
    dated.push({ date: when, text: `${e.status === 'draft' ? 'Drafted' : 'Published'} ${e.name}`, sub: `${e.pitches} pitches · ${e.city}`, icon: 'calendar', tone: 'butter' });
    if (N.eventState(e) === 'completed') dated.push({ date: e.end || e.date, text: `Ran ${e.name}`, sub: `${e.filled} traders`, icon: 'check-circle', tone: 'ok' });
  });
  db.apps.filter(a => E(a.e)?.org === oid && ['approved', 'rejected'].includes(a.st)).forEach(a => dated.push({ date: hoursToDate(a.at), text: `${a.st === 'approved' ? 'Approved' : 'Rejected'} ${T(a.t).biz} for ${E(a.e).name}`, icon: a.st === 'approved' ? 'check' : 'x', tone: a.st === 'approved' ? 'ok' : 'risk' }));
  return tlFrom('o:' + oid, dated).slice(0, 16);
}

N.page('admin/organisers/:id', {
  app: 'admin', nav: 'admin/organisers', example: 'admin/organisers/harbour',
  title: p => N.db.organisers[p.id]?.company || 'Organiser',
  crumbs: p => [['Organisers', 'admin/organisers'], [N.db.organisers[p.id]?.company || 'Not found']],
  render(p) {
    const oid = p.id, o = O(oid);
    if (!o) return notFound('organiser', 'admin/organisers');
    const tab = S('ut')['o:' + oid] || 'overview';
    const evs = Object.entries(db.events).filter(([, e]) => e.org === oid).sort(([, a], [, b]) => b.date.localeCompare(a.date));
    const apps = db.apps.filter(a => E(a.e)?.org === oid);
    const upcoming = evs.filter(([, e]) => ['upcoming', 'live'].includes(N.eventState(e))).length;
    const acts = o.removed ? B('Restore organiser', `data-act="adm_orgRestore" data-id="${oid}"`, 'btn-side btn-sm', 'refresh')
      : (o.status === 'active' ? B('Suspend account', `data-act="adm_orgSuspend" data-id="${oid}"`, 'btn-line btn-sm', 'pause') : B('Activate account', `data-act="adm_orgActivate" data-id="${oid}"`, 'btn-side btn-sm', 'check')) + B('Remove organiser', `data-act="adm_orgRemove" data-id="${oid}"`, 'btn-danger-line btn-sm', 'trash');
    const pane = { overview: () => orgOverview(oid, o, evs, apps), business: () => orgBusiness(oid, o), events: () => orgEvents(evs), documents: () => orgDocsPane(oid, o), payments: () => `<section class="card">${N.empty('No payments yet', `${esc(o.company)} is on the Event Pass. Year 1 has no fees, so nothing is charged until ${N.fLong(N.addDays(o.joined, 365))}. From year 2 Niche takes ${SET().orgCommission}% of confirmed bookings.`, '', 'pound')}</section>`, activity: () => `<section class="card"><div class="card-h"><h3>Activity log</h3><span class="small muted">Newest first</span></div>${timeline(orgTimeline(oid))}</section>` }[tab] || (() => orgOverview(oid, o, evs, apps));
    return `${backLink('admin/organisers', 'Back to organisers')}
    <section class="card adm-hero">
      ${N.oav(oid, 'xl')}
      <div class="adm-hero-b">
        <p class="eyebrow">Organiser · ${orgID(oid)}</p>
        <div class="adm-hero-t"><h1 class="h-page">${esc(o.company)}</h1><div class="adm-chips">${orgStatusChip(o)}${verifyChip(o)}</div></div>
        <ul class="adm-meta"><li>${ic('user')}${esc(o.person)} · ${esc(o.role || 'Organiser')}</li><li>${ic('pin')}${esc(o.city)}</li><li>${ic('calendar')}Joined ${N.fLong(o.joined)}</li><li>${ic('id')}<span class="mono">${orgID(oid)}</span></li></ul>
      </div>
      <div class="btn-row adm-hero-a">${acts}</div>
    </section>
    ${o.removed ? `<div class="banner risk">${ic('trash')}<div class="grow"><b>Removed.</b> Hidden from every list. Their events stay on record for traders who booked them.</div></div>` : o.status !== 'active' ? `<div class="banner warn">${ic('pause')}<div class="grow"><b>Suspended.</b> They can't sign in, publish events or review applications.</div></div>` : ''}
    ${o.verify === 'pending' && tab !== 'documents' && !o.removed ? `<div class="banner warn">${ic('shield-plain')}<div class="grow">Compliance review waiting since ${N.fLong(o.verifySent || o.joined)}.</div>${B('Review documents', `data-act="adm_ut" data-k="o:${oid}" data-v="documents"`, 'btn-line')}</div>` : ''}
    <div class="stats">
      <div class="stat"><span class="lbl">Events</span><span class="num">${evs.length}</span><span class="s">${upcoming} upcoming</span></div>
      <div class="stat"><span class="lbl">Rating</span><span class="num">${o.rating ? o.rating.toFixed(1) : '—'}</span>${o.rating ? N.stars(o.rating) : '<span class="s">No reviews yet</span>'}</div>
      <div class="stat tone-butter"><span class="lbl">Revenue (estimated)</span><span class="num">${N.money(orgRevenue(oid))}</span><span class="s">Pitch fees and commission on bookings</span></div>
    </div>
    ${N.utabs([['overview', 'Overview'], ['business', 'Business info'], ['events', 'Events', evs.length], ['documents', 'Documents', 3], ['payments', 'Payments', 0], ['activity', 'Activity log']], tab, `data-act="adm_ut" data-k="o:${oid}" data-v`)}
    <div class="adm-pane">${pane()}</div>`;
  },
});
function orgSuspend(oid) {
  const o = O(oid);
  N.confirm({ title: `Suspend ${o.company}?`, text: 'Their live events stay listed, but they can’t sign in, publish new events or review applications until you activate the account again.', confirm: 'Suspend account', danger: true, onConfirm() { const u = setOrg(oid, { status: 'inactive' }, 'Account suspended', 'risk', 'pause'); N.refresh(); N.toast(`<b>${esc(o.company)}</b> is suspended.`, { icon: 'pause', undo() { u(); N.refresh(); } }); } });
}
function orgActivate(oid) {
  const o = O(oid);
  N.confirm({ title: `Activate ${o.company}?`, text: 'They can sign in, publish events and review applications again.', confirm: 'Activate account', onConfirm() { const u = setOrg(oid, { status: 'active' }, 'Account activated'); N.refresh(); N.toast(`<b>${esc(o.company)}</b> is active again.`, { undo() { u(); N.refresh(); } }); } });
}
Object.assign(N.act, {
  adm_orgSuspend(el) { orgSuspend(el.dataset.id); },
  adm_orgActivate(el) { orgActivate(el.dataset.id); },
  adm_orgRemove(el) {
    const oid = el.dataset.id, o = O(oid), n = Object.values(db.events).filter(e => e.org === oid).length;
    N.confirm({
      title: `Remove ${o.company}?`, text: `Their account is closed and hidden from every list. ${N.plural(n, 'event')} stay on record for traders who booked them.`, confirm: 'Remove organiser', danger: true,
      onConfirm() { const u = setOrg(oid, { removed: true, status: 'inactive' }, 'Organiser removed', 'risk', 'trash'); N.go('admin/organisers'); N.toast(`<b>${esc(o.company)}</b> was removed.`, { icon: 'trash', undo() { u(); N.refresh(); } }); },
    });
  },
  adm_orgRestore(el) { const oid = el.dataset.id, o = O(oid), u = setOrg(oid, { removed: undefined, status: 'active' }, 'Organiser restored'); N.refresh(); N.toast(`<b>${esc(o.company)}</b> is back on the platform.`, { undo() { u(); N.refresh(); } }); },
  adm_orgVerOk(el) {
    const oid = el.dataset.id, o = O(oid), u1 = setOrg(oid, { verify: 'approved', verifyReason: undefined, verifiedOn: TODAY }, 'Compliance review approved'), u2 = settle('admin/organisers/' + oid);
    N.closeModal(); N.refresh();
    N.toast(`<b>${esc(o.company)}</b> is verified. Their events now show the Niche checked badge.`, { undo() { u1(); u2(); N.refresh(); } });
  },
  adm_orgVerNo(el) {
    const oid = el.dataset.id, o = O(oid);
    N.confirm({
      title: `Reject ${o.company}’s compliance review?`, text: 'They get an email with your reason and can upload new documents. Their events stay unverified until then.', confirm: 'Reject review', danger: true,
      input: { label: 'Reason (sent to the organiser)', ph: 'e.g. The insurance certificate is in a different company name.', req: true },
      onConfirm(v) { const u1 = setOrg(oid, { verify: 'rejected', verifyReason: v }, `Compliance review rejected · “${v}”`, 'risk', 'x'), u2 = settle('admin/organisers/' + oid); N.refresh(); N.toast(`Compliance review rejected. We've emailed ${esc(o.person)}.`, { icon: 'x-circle', undo() { u1(); u2(); N.refresh(); } }); },
    });
  },
  adm_orgVerReopen(el) { const oid = el.dataset.id, u = setOrg(oid, { verify: 'pending', verifiedOn: undefined }, 'Compliance review reopened', 'info', 'refresh'); N.refresh(); N.toast('Review reopened. It’s back in the approvals queue.', { undo() { u(); N.refresh(); } }); },
  adm_orgDocView(el) {
    const oid = el.dataset.id, o = O(oid), d = orgDocs(oid).find(x => x.k === el.dataset.k), st = ORG_DOC_ST[o.verify] || 'pending';
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">${esc(o.company)} · compliance</p><h3>${esc(d.name)}</h3><div class="row" style="--g:8px">${N.docChip(st)}<span class="mono muted">${esc(d.file)}</span></div></div>
      <div class="adm-docview">${paper({ issuer: d.issuer, title: d.name, holder: d.k === 'id' ? o.person : o.company, rows: [['Detail', d.sub], ['Valid until', d.exp ? N.fLong(d.exp) : 'No expiry']], ref: `REF ${o.regNo}` })}
      <div class="stack" style="--g:16px"><div><p class="dr-h">Extracted fields</p>${N.kv([['Holder', esc(d.k === 'id' ? o.person : o.company)], ['Detail', esc(d.sub)], ['Uploaded', N.fLong(d.up)], ['Expires', d.exp ? N.fLong(d.exp) : 'No expiry']], 'adm-kv1')}</div>
      <div><p class="dr-h">Automatic checks</p>${N.reqList([{ label: 'Name matches Companies House', val: o.company, st: 'ok' }, { label: 'Readable scan', val: 'Text found on every page', st: 'ok' }, ...(d.exp ? [{ label: 'Valid for 30 days or more', val: N.fLong(d.exp), st: N.daysFrom(d.exp) > 30 ? 'ok' : 'warn' }] : [])])}</div></div></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Close</button>${o.verify === 'pending' ? `<button type="button" class="btn btn-danger-line btn-sm" data-act="adm_orgVerNo" data-id="${oid}">Reject compliance review</button><button type="button" class="btn btn-side btn-sm" data-act="adm_orgVerOk" data-id="${oid}">${ic('check')}Approve compliance review</button>` : ''}</div>`, 'wide');
  },
  adm_pwReset(el) { N.toast(`Password reset link sent to <b>${esc(O(el.dataset.id).email)}</b>.`, { icon: 'key' }); },
});
N.change.adm_orgActive = el => { const on = el.checked; el.checked = !on; (on ? orgActivate : orgSuspend)(el.dataset.id); };

/* =====================================================================
   7. EVENTS
   ===================================================================== */
function evActions(id, big) {
  const e = E(id), st = N.eventState(e), sz = big ? 'btn-sm' : 'btn-xs';
  const b = (l, act, cls, icn) => `<button type="button" class="btn ${sz} ${cls}${big ? '' : ' adm-cmp'}" data-act="${act}" data-id="${id}"${big ? '' : ` aria-label="${l}" title="${l}"`}>${ic(icn)}<span class="adm-bl">${l}</span></button>`;
  const out = [];
  if (!big) out.push(b('View', 'adm_evView', 'btn-ghost', 'eye'));
  if (['upcoming', 'live', 'draft'].includes(st)) out.push(b('Postpone', 'adm_evPostpone', 'btn-line', 'clock'), b('Cancel', 'adm_evCancel', 'btn-danger-line', 'ban'));
  if (st === 'postponed') { if (big) out.push(b('Change date', 'adm_evPostpone', 'btn-line', 'clock')); out.push(b('Restore', 'adm_evRestore', 'btn-line', 'refresh'), b('Cancel', 'adm_evCancel', 'btn-danger-line', 'ban')); }
  if (st === 'cancelled') out.push(b('Restore', 'adm_evRestore', 'btn-line', 'refresh'));
  return out.join('');
}
const EV_GROUP = { live: 0, upcoming: 0, postponed: 0, draft: 1, completed: 2, cancelled: 3 };
function evRegion() {
  const s = S('events');
  const base = Object.entries(db.events).filter(([id, e]) => (s.city === 'all' || e.city === s.city) && hit(s.q, e.name, e.venue, e.city, N.orgName(id)));
  const is = (e, k) => k === 'all' ? true : k === 'published' ? e.status === 'published' : N.eventState(e) === k;
  const cnt = k => base.filter(([, e]) => is(e, k)).length;
  const items = [['all', 'All', cnt('all')], ['published', 'Published', cnt('published')], ['upcoming', 'Upcoming', cnt('upcoming')], ['completed', 'Completed', cnt('completed')], ['cancelled', 'Cancelled', cnt('cancelled')]];
  if (cnt('postponed') || s.tab === 'postponed') items.push(['postponed', 'Postponed', cnt('postponed')]);
  if (cnt('draft') || s.tab === 'draft') items.push(['draft', 'Draft', cnt('draft')]);
  const rows = base.filter(([, e]) => is(e, s.tab)).sort(([, a], [, b]) => {
    const ga = EV_GROUP[N.eventState(a)], gb = EV_GROUP[N.eventState(b)];
    return ga - gb || (ga >= 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  });
  if (s.flash) { const i = rows.findIndex(([id]) => id === s.flash); if (i > -1) s.page = Math.floor(i / 10) + 1; }
  const p = paged(rows, s.page, 10); s.page = p.page;
  return `<div class="adm-bar-row">${tabs('events', items)}</div>
  ${p.total ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th class="adm-wcol">Event</th><th>Organiser</th><th>City</th><th>Pitches filled</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${p.rows.map(([id, e]) => {
    const st = N.eventState(e), pct = e.pitches ? Math.round(e.filled / e.pitches * 100) : 0;
    return `<tr class="click ${s.flash === id ? 'adm-flash' : ''}" data-act="adm_evView" data-id="${id}" tabindex="0">
      <td data-l="Event"><div class="cell">${N.evd(e.date, ['cancelled', 'completed'].includes(st) ? '' : 'side')}<div><b>${esc(e.name)}</b><span class="s">${esc(e.venue)} · ${evDates(e)}</span></div></div></td>
      <td data-l="Organiser">${e.org ? `<div class="cell">${N.oav(e.org, 'sm')}<span>${esc(O(e.org).company)}</span></div>` : `<span class="muted">${ic('link', 'ic-sm')} External</span>`}</td>
      <td data-l="City">${esc(e.city)}</td>
      <td data-l="Pitches filled"><span class="adm-fill">${N.bar(pct, pct >= 80 ? 'ok' : '')}<span class="mono">${e.filled}/${e.pitches}</span></span></td>
      <td data-l="Status"><div class="adm-chips">${evChip(e)}${e.external ? extChip() : ''}</div></td>
      <td class="r"><div class="adm-acts">${evActions(id)}</div></td>
    </tr>`;
  }).join('')}</tbody></table></div>${pagerHTML('events', p)}`
    : N.empty('No events match', 'Try another name or venue, or clear the filters.', `<button type="button" class="btn btn-line btn-sm" data-act="adm_clear" data-k="events">Clear filters</button>`, 'calendar')}`;
}
N.page('admin/events', {
  app: 'admin', title: 'Events', nav: 'admin/events',
  render() {
    S('events', { q: '', city: 'all', tab: 'all', page: 1 });
    return `${N.pageHead('Events management', `${N.plural(activeEvents().length, 'event')} published and still to come. Postponing or cancelling emails every trader with a booking.`, `<button type="button" class="btn btn-side btn-sm" data-go="admin/create-external">${ic('plus')}Create external event</button>`, 'Management')}
    <div class="adm-toolbar">${searchBox('events', 'Search event name + venue...')}${selectBox('events', 'city', cityOpts(Object.values(db.events).map(e => e.city)), 'City')}</div>
    <div data-note="Cancel and postpone now ask for a reason, which goes to every trader with a booking and to the organiser. Both can be undone with Restore.">${region('events', evRegion)}</div>`;
  },
  after(root) {
    const s = S('events'); if (!s.flash) return;
    setTimeout(() => root.querySelector('tr.adm-flash')?.scrollIntoView({ block: 'center', behavior: N.reduce ? 'auto' : 'smooth' }), 80);
    setTimeout(() => { s.flash = null; }, 2600);
  },
});

function evDrawer(id) {
  const e = E(id); if (!e) return;
  S('events').open = id;
  const st = N.eventState(e), booked = db.apps.filter(a => a.e === id && a.st === 'approved'), open = db.apps.filter(a => a.e === id && ['pending', 'info'].includes(a.st)).length;
  const fee = e.fee?.model === 'commission' ? `${e.fee.pct}% commission` : e.fee?.amount ? `${N.money(e.fee.amount)} per pitch` : 'Not listed';
  const r = e.req || {};
  const reqs = [r.fhrs != null && `Hygiene rating ${r.fhrs}+`, r.pli && `£${r.pli}m public liability`, r.gas ? 'Gas Safety if cooking with LPG' : 'No gas cooking', r.allergen && 'Allergen information', r.power && `${r.power} power per pitch`, r.elec && 'Electrical Safety Certificate', r.vegan && 'Plant-based menus only'].filter(Boolean);
  const acts = evActions(id, true);
  N.openDrawer(`<div class="dr-head">${N.evd(e.date, 'side')}<div class="dr-ti"><h3>${esc(e.name)}</h3><p>${esc(e.venue)} · ${esc(e.city)}</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="dr-body">
    <div class="row" style="--g:8px">${evChip(e)}${e.external ? `<span class="chip adm-ext">External listing</span>` : ''}${e.featured ? N.chip('zest', 'Featured on homepage') : ''}<span class="tag">${esc(e.type || 'Event')}</span></div>
    ${st === 'cancelled' ? `<div class="banner risk">${ic('ban')}<div class="grow"><b>Cancelled.</b> ${esc(e.cancelReason || 'No reason recorded.')}</div></div>` : ''}
    ${st === 'postponed' ? `<div class="banner warn">${ic('clock')}<div class="grow"><b>Postponed${e.prevDate ? ` from ${N.fLong(e.prevDate)}` : ''}.</b> ${esc(e.postponeReason || '')}</div></div>` : ''}
    ${N.kv([['Dates', evDates(e)], ['Time', esc(e.time || '—')], ['Organiser', e.org ? `<button type="button" class="link" data-go="admin/organisers/${e.org}">${esc(O(e.org).company)}</button>` : 'External listing'], ['Pitches filled', `${e.filled} of ${e.pitches}`], ['Pitch fee', fee], ['Expected footfall', e.footfall ? e.footfall.toLocaleString('en-GB') : '—'], ['Apply by', N.fLong(e.deadline)], ['County', esc(e.county || '—')]])}
    ${e.about ? `<section><p class="dr-h">About</p><p class="ink-2">${esc(e.about)}</p></section>` : ''}
    <section><p class="dr-h">Trader requirements</p><div class="tags">${reqs.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></section>
    ${e.external ? `<section><p class="dr-h">External listing</p><div class="stack" style="--g:8px">${e.externalLink ? `<span class="small">${ic('link', 'ic-sm')} <span class="mono">${esc(e.externalLink)}</span></span>` : ''}${e.externalEmail ? `<span class="small">${ic('mail', 'ic-sm')} ${esc(e.externalEmail)}</span>` : ''}<p class="small muted">Traders apply on the organiser's own site. Niche shows the listing and the requirements.</p></div></section>`
      : `<section><p class="dr-h">Booked traders · ${booked.length}</p>${booked.length ? `<ul class="list">${booked.map(a => `<li class="li">${N.tav(a.t, 'sm')}<button type="button" class="li-main adm-libtn" data-go="admin/traders/${a.t}"><b>${esc(T(a.t).biz)}</b><span>${esc(T(a.t).person)}</span></button><div class="li-end">${a.pitch ? `<span class="mtag">Pitch ${esc(a.pitch)}</span>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted">No confirmed bookings yet.</p>'}${open ? `<p class="small muted" style="margin-top:8px">${N.plural(open, 'application')} waiting for the organiser.</p>` : ''}</section>`}
  </div>
  <div class="dr-foot">${acts ? `<div class="btn-row">${acts}</div>` : '<p class="small muted">Completed events can’t be changed.</p>'}</div>`);
}
const reEv = id => { N.refresh(); if (N.drawerOpen() && S('events').open === id) evDrawer(id); };
function evSnap(e) { return ['date', 'end', 'deadline', 'status', 'prevDate', 'prevStatus', 'postponeReason', 'cancelReason'].reduce((o, k) => (o[k] = e[k], o), {}); }
function evRestoreSnap(e, snap) { Object.entries(snap).forEach(([k, v]) => { if (v === undefined) delete e[k]; else e[k] = v; }); }
Object.assign(N.act, {
  adm_evView(el) { evDrawer(el.dataset.id); },
  adm_evPostpone(el) {
    const id = el.dataset.id, e = E(id), booked = db.apps.filter(a => a.e === id && a.st === 'approved').length;
    const def = [N.addDays(e.date, 14), N.addDays(TODAY, 7)].sort().pop();
    N.openModal(`<form class="stack" style="--g:18px" data-form="adm_postpone" novalidate><input type="hidden" name="id" value="${id}">
      <div class="stack" style="--g:6px"><p class="eyebrow">Postpone event</p><h3>${esc(e.name)}</h3><p class="muted">Now on ${evDates(e)}. ${booked ? `${N.plural(booked, 'trader')} with a booking` : 'Everyone who applied'} ${e.org ? `and ${esc(O(e.org).company)} ` : ''}will get the new date and your reason.</p></div>
      <div class="form-grid">${N.field({ label: 'New start date', id: 'ev_date', type: 'date', value: def, req: true, attrs: `min="${N.addDays(TODAY, 1)}"` })}<div class="field"><span>Length</span><p class="adm-static">${N.plural(Math.round((N.dt(e.end || e.date) - N.dt(e.date)) / N.DAY) + 1, 'day')}, same as before</p></div>
      ${N.field({ label: 'Reason', id: 'ev_reason', type: 'textarea', rows: 3, req: true, full: true, ph: 'e.g. Storm warning for the weekend. Same venue, same pitches.' })}</div>
      <p class="adm-err" hidden></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Keep current date</button><button type="submit" class="btn btn-ink btn-sm">${ic('clock')}Postpone event</button></div></form>`);
  },
  adm_evCancel(el) {
    const id = el.dataset.id, e = E(id), booked = db.apps.filter(a => a.e === id && a.st === 'approved').length, open = db.apps.filter(a => a.e === id && ['pending', 'info'].includes(a.st)).length;
    N.confirm({
      title: `Cancel ${e.name}?`, text: `${N.plural(booked, 'trader')} with a booking and ${N.plural(open, 'open application')} will be emailed your reason.${e.org ? ` ${esc(O(e.org).company)} is told too.` : ''} You can restore it later.`, confirm: 'Cancel event', danger: true,
      input: { label: 'Reason (sent to traders)', ph: 'e.g. The venue has withdrawn permission for this date.', req: true },
      onConfirm(v) {
        const snap = evSnap(e); e.prevStatus = e.status; e.status = 'cancelled'; e.cancelReason = v;
        const note = tellOrg(e.org, { tone: 'warn', title: `Niche cancelled ${e.name}`, text: v });
        reEv(id); N.toast(`<b>${esc(e.name)}</b> is cancelled. Traders have been emailed.`, { icon: 'ban', undo() { evRestoreSnap(e, snap); untell(db.notifications.org, note); reEv(id); } });
      },
    });
  },
  adm_evRestore(el) {
    const id = el.dataset.id, e = E(id), snap = evSnap(e), was = N.eventState(e);
    if (was === 'cancelled') { e.status = e.prevStatus && e.prevStatus !== 'cancelled' ? e.prevStatus : 'published'; delete e.cancelReason; }
    else { e.status = 'published'; delete e.postponeReason; }
    reEv(id);
    N.toast(was === 'cancelled' ? `<b>${esc(e.name)}</b> is back on. Traders have been told.` : `<b>${esc(e.name)}</b> is published on its new date, ${N.fLong(e.date)}.`, { undo() { evRestoreSnap(e, snap); reEv(id); } });
  },
});
N.forms.adm_postpone = (form, data) => {
  const e = E(data.id), nd = data.ev_date, why = (data.ev_reason || '').trim();
  if (!nd) return formErr(form, 'Pick a new start date.', 'ev_date');
  if (nd <= TODAY) return formErr(form, 'The new date has to be after today.', 'ev_date');
  if (nd === e.date) return formErr(form, 'That is the current date. Pick a different one.', 'ev_date');
  if (!why) return formErr(form, 'Add a reason. Traders see it in their email.', 'ev_reason');
  const snap = evSnap(e), shift = Math.round((N.dt(nd) - N.dt(e.date)) / N.DAY), len = Math.round((N.dt(e.end || e.date) - N.dt(e.date)) / N.DAY);
  e.prevDate = e.prevDate || e.date; e.date = nd; e.end = N.addDays(nd, len); if (e.deadline) e.deadline = N.addDays(e.deadline, shift);
  e.status = 'postponed'; e.postponeReason = why;
  const note = tellOrg(e.org, { tone: 'warn', title: `Niche postponed ${e.name} to ${N.fShort(nd)}`, text: why });
  N.closeModal(); reEv(data.id);
  N.toast(`<b>${esc(e.name)}</b> moved to ${N.fLong(nd)}. Traders have been emailed.`, { icon: 'clock', undo() { evRestoreSnap(e, snap); untell(db.notifications.org, note); reEv(data.id); } });
};

/* =====================================================================
   8. CREATE EXTERNAL EVENT
   ===================================================================== */
const EXT0 = () => ({ name: '', type: 'Food festival', start: '', end: '', venue: '', city: '', email: '', link: 'https://', country: 'United Kingdom', county: '', pitches: '20', desc: '' });
const countyOpts = (country, val) => [['', 'Choose a county or state'], ...db.states.filter(s => s.country === country).map(s => [s.name, s.name])].map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('');
function extPreview(d) {
  const tone = N.tone(d.name || 'x'), host = /^https:\/\/([^/]+)/.exec(d.link || '')?.[1];
  const dates = d.start ? (d.end && d.end !== d.start ? `${N.fShort(d.start)} – ${N.fLong(d.end)}` : N.fLong(d.start)) : 'Dates to be added';
  return `<article class="card adm-evcard">
    ${N.art(tone, d.start ? N.fd(d.start, { day: 'numeric', month: 'short' }) : 'Date', d.city || 'City')}
    <div class="adm-evcard-b">
      <div class="row" style="--g:6px">${extChip()}${d.featured ? N.chip('zest', 'Featured') : ''}${d.type ? `<span class="tag">${esc(d.type)}</span>` : ''}</div>
      <h3 class="h3">${esc(d.name || 'Event name')}</h3>
      <p class="small muted adm-ico">${ic('pin', 'ic-sm')}${esc([d.venue, d.city].filter(Boolean).join(' · ') || 'Venue and city')}</p>
      <p class="small muted adm-ico">${ic('calendar', 'ic-sm')}${esc(dates)}</p>
      ${d.desc ? `<p class="small ink-2">${esc(d.desc.length > 140 ? d.desc.slice(0, 140) + '…' : d.desc)}</p>` : ''}
      <span class="btn btn-ink btn-sm btn-block" aria-hidden="true">Apply on organiser’s site${ic('arrow-up-right')}</span>
      <p class="xs muted mono">${esc(host || 'organiser website')}</p>
    </div>
  </article>`;
}
N.page('admin/create-external', {
  app: 'admin', title: 'Create external event', nav: 'admin/create-external',
  render() {
    const s = S('ext', { draft: EXT0() }), d = s.draft, countries = db.countries.filter(c => c.enabled !== false);
    return `${N.pageHead('Create external event', 'List an event run outside Niche. Traders see the requirements here and apply on the organiser’s own site.', '', 'Management')}
    <div class="adm-ext">
      <form class="card stack" style="--g:18px" data-form="adm_ext" data-input="adm_extPrev" data-change="adm_extPrev" novalidate>
        <div class="form-grid">
          ${N.field({ label: 'Event name', id: 'name', value: d.name, req: true, full: true, ph: 'e.g. Birmingham Vegan Fair' })}
          ${N.field({ label: 'Event type', id: 'type', value: d.type, opts: db.tags.eventTypes })}
          ${N.field({ label: 'Pitches', id: 'pitches', type: 'number', value: d.pitches, req: true, attrs: 'min="1" max="500"' })}
          ${N.field({ label: 'Start date', id: 'start', type: 'date', value: d.start, req: true, attrs: `min="${TODAY}"` })}
          ${N.field({ label: 'End date', id: 'end', type: 'date', value: d.end, req: true, attrs: `min="${TODAY}"` })}
          ${N.field({ label: 'Venue', id: 'venue', value: d.venue, ph: 'e.g. Digbeth Arena' })}
          ${N.field({ label: 'City', id: 'city', value: d.city, ph: 'e.g. Birmingham' })}
          <label class="field" for="country"><span class="req">Country</span><select class="sel" id="country" name="country" data-change="adm_extCountry">${countries.map(c => `<option value="${esc(c.name)}" ${c.name === d.country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
          <label class="field" for="county"><span class="req">County / State</span><select class="sel" id="county" name="county">${countyOpts(d.country, d.county)}</select></label>
          ${N.field({ label: 'Organiser email', id: 'email', type: 'email', value: d.email, ph: 'hello@organiser.co.uk' })}
          ${N.field({ label: 'External link', id: 'link', type: 'url', value: d.link, ph: 'https://...', hint: 'Where traders apply' })}
          ${N.field({ label: 'Description', id: 'desc', type: 'textarea', value: d.desc, rows: 4, full: true, ph: 'What it is, who it’s for and anything traders should know.' })}
          <div class="full">${N.checkbox('featured', 'Show on homepage ‘Featured events’', !!d.featured)}</div>
        </div>
        <p class="adm-err" hidden></p>
        <div class="btn-row adm-end"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_extReset">Clear form</button><button type="submit" class="btn btn-side">${ic('calendar-plus')}Create external event</button></div>
      </form>
      <aside class="adm-ext-side"><p class="eyebrow">Live preview</p><div id="adm-ext-prev">${extPreview(d)}</div>
        <div class="banner info">${ic('info')}<span>External events are published straight away with an External badge. Requirements default to hygiene 4+, £5m liability and allergen information.</span></div>
      </aside>
    </div>`;
  },
});
Object.assign(N.change, {
  adm_extPrev(el) { const form = el.closest('form'); if (!form) return; const d = N.formData(form); S('ext').draft = d; const pv = $('#adm-ext-prev'); if (pv) pv.innerHTML = extPreview(d); el.removeAttribute?.('aria-invalid'); },
  adm_extCountry(el) { el.form.elements.county.innerHTML = countyOpts(el.value, ''); N.change.adm_extPrev(el); },
});
N.input.adm_extPrev = el => N.change.adm_extPrev(el);
N.act.adm_extReset = () => { S('ext').draft = EXT0(); N.refresh(); };
N.forms.adm_ext = (form, d) => {
  const name = (d.name || '').trim(), link = (d.link || '').trim(), email = (d.email || '').trim();
  if (!name) return formErr(form, 'Give the event a name.', 'name');
  if (!d.start) return formErr(form, 'Add a start date.', 'start');
  if (d.start < TODAY) return formErr(form, 'The start date is in the past.', 'start');
  if (!d.end) return formErr(form, 'Add an end date. Use the start date for one-day events.', 'end');
  if (d.end < d.start) return formErr(form, 'The end date is before the start date.', 'end');
  if (!(Number(d.pitches) >= 1)) return formErr(form, 'Enter how many pitches there are (at least 1).', 'pitches');
  if (!d.country) return formErr(form, 'Choose a country.', 'country');
  if (!d.county) return formErr(form, 'Choose a county or state.', 'county');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return formErr(form, 'That organiser email doesn’t look right.', 'email');
  const hasLink = link && link !== 'https://';
  if (hasLink && !/^https:\/\/[^\s/.]+\.[^\s]+$/.test(link)) return formErr(form, 'The external link must start with https:// and be a full web address.', 'link');
  let id = N.slug(name) || 'event', n = 2; while (db.events[id]) id = N.slug(name) + '-' + n++;
  db.events[id] = {
    name, type: d.type || 'Food festival', venue: (d.venue || '').trim() || 'Venue to be confirmed', city: (d.city || '').trim() || d.county, county: d.county, country: d.country,
    region: d.country === 'United Kingdom' ? 'UK' : d.country, date: d.start, end: d.end, time: 'See organiser website',
    pitches: Number(d.pitches), filled: 0, footfall: 0, frontage: 4, fee: { model: 'pitch', amount: 0 }, org: null, external: true,
    externalLink: hasLink ? link : '', externalEmail: email, status: 'published', featured: !!d.featured,
    req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: [], tone: N.tone(name),
    about: (d.desc || '').trim() || 'Listed by the Niche team. Applications go through the organiser’s own website.',
    deadline: [N.addDays(d.start, -14), TODAY].sort().pop(), createdBy: ADMIN(), createdOn: TODAY,
  };
  S('ext').draft = EXT0();
  Object.assign(S('events', {}), { q: '', city: 'all', tab: 'all', page: 1, flash: id });
  N.go('admin/events');
  N.toast(`<b>${esc(name)}</b> is live as an external listing${d.featured ? ' and featured on the homepage' : ''}.`, { icon: 'calendar-plus', undo() { delete db.events[id]; N.refresh(); } });
};

/* =====================================================================
   9. COUNTRIES
   ===================================================================== */
function coRegion() {
  const s = S('countries'), rows = db.countries.filter(c => hit(s.q, c.name, c.code, c.phone));
  return rows.length ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Country</th><th>Code</th><th>Phone code</th><th>Added</th><th>Verification</th><th class="r">Actions</th></tr></thead><tbody>${rows.map(c => {
    const nDiv = db.states.filter(x => x.country === c.name).length;
    return `<tr>
      <td data-l="Country"><div class="cell">${arch('globe', c.enabled !== false ? 'sky' : '', 'sm')}<div><b>${esc(c.name)}</b><span class="s">${N.plural(nDiv, 'division')}</span></div>${c.enabled !== false ? N.chip('ok', 'Enabled') : N.chip('plain', 'Disabled')}</div></td>
      <td data-l="Code"><span class="mtag">${esc(c.code)}</span></td>
      <td data-l="Phone code"><span class="mono">${esc(c.phone)}</span></td>
      <td data-l="Added"><span class="mono">${N.fLong(c.added)}</span></td>
      <td data-l="Verification">${N.toggle('adm_cv_' + c.id, 'Enable for organiser verification', !!c.verify, `data-change="adm_coVerify" data-id="${c.id}"`)}</td>
      <td class="r"><div class="adm-acts">${B('Edit', `data-act="adm_coEdit" data-id="${c.id}"`, 'btn-ghost adm-cmp', 'edit')}${B('Delete', `data-act="adm_coDel" data-id="${c.id}"`, 'btn-ghost adm-danger adm-cmp', 'trash')}</div></td>
    </tr>`;
  }).join('')}</tbody></table></div>` : N.empty('No countries found', 'Try another name or ISO code, or add a new country.', '', 'globe');
}
function coModal(id) {
  const c = id ? db.countries.find(x => x.id === id) : { name: '', code: '', phone: '+', enabled: true, verify: false };
  N.openModal(`<form class="stack" style="--g:18px" data-form="adm_country" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <div class="stack" style="--g:6px"><p class="eyebrow">Platform countries</p><h3>${id ? `Edit ${esc(c.name)}` : 'New country'}</h3></div>
    <div class="form-grid">${N.field({ label: 'Country name', id: 'c_name', value: c.name, req: true, full: true, ph: 'e.g. France' })}${N.field({ label: 'ISO code', id: 'c_code', value: c.code, req: true, ph: 'FR', hint: '2 letters', attrs: 'maxlength="2" autocapitalize="characters"' })}${N.field({ label: 'Phone code', id: 'c_phone', value: c.phone, req: true, ph: '+33' })}</div>
    <div class="stack" style="--g:12px">${N.toggle('c_enabled', 'Enable on the platform', c.enabled !== false)}${N.toggle('c_verify', 'Enable for organiser verification', !!c.verify)}</div>
    <p class="adm-err" hidden></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Cancel</button><button type="submit" class="btn btn-side btn-sm">${id ? 'Save changes' : 'Add country'}</button></div></form>`);
}
N.page('admin/countries', {
  app: 'admin', title: 'Countries', nav: 'admin/countries',
  render() {
    S('countries', { q: '' });
    return `${N.pageHead('Platform countries', 'Where traders and organisers can register. Verification decides which countries organisers can be verified in.', `<button type="button" class="btn btn-side btn-sm" data-act="adm_coNew">${ic('plus')}New country</button>`, 'Location')}
    <div class="adm-toolbar">${searchBox('countries', 'Search countries by name or code...')}</div>
    ${region('countries', coRegion)}`;
  },
});
Object.assign(N.act, {
  adm_coNew() { coModal(null); },
  adm_coEdit(el) { coModal(el.dataset.id); },
  adm_coDel(el) {
    const c = db.countries.find(x => x.id === el.dataset.id), divs = db.states.filter(x => x.country === c.name);
    N.confirm({
      title: `Delete ${c.name}?`, text: `${divs.length ? `Its ${N.plural(divs.length, 'county or state', 'counties and states')} are removed too. ` : ''}Traders and organisers can no longer pick it. You can undo this for a few seconds.`, confirm: 'Delete country', danger: true,
      onConfirm() {
        const i = db.countries.indexOf(c), snap = db.states.slice();
        db.countries.splice(i, 1); db.states.splice(0, db.states.length, ...db.states.filter(x => x.country !== c.name));
        N.refresh(); N.toast(`${esc(c.name)} deleted.`, { icon: 'trash', undo() { db.countries.splice(i, 0, c); db.states.splice(0, db.states.length, ...snap); N.refresh(); } });
      },
    });
  },
});
N.change.adm_coVerify = el => { const c = db.countries.find(x => x.id === el.dataset.id); c.verify = el.checked; N.toast(`Organiser verification is ${c.verify ? 'on' : 'off'} for ${esc(c.name)}.`, { undo() { c.verify = !c.verify; N.refresh(); } }); };
N.forms.adm_country = (form, d) => {
  const name = (d.c_name || '').trim(), code = (d.c_code || '').trim().toUpperCase(), phone = (d.c_phone || '').trim();
  if (!name) return formErr(form, 'Enter the country name.', 'c_name');
  if (!/^[A-Z]{2}$/.test(code)) return formErr(form, 'The ISO code is two letters, like FR.', 'c_code');
  if (!/^\+\d{1,4}$/.test(phone)) return formErr(form, 'The phone code starts with + and has up to 4 digits, like +33.', 'c_phone');
  const other = db.countries.find(x => x.id !== d.id && (x.code === code || x.name.toLowerCase() === name.toLowerCase()));
  if (other) return formErr(form, `${other.name} (${other.code}) is already on the platform.`, other.code === code ? 'c_code' : 'c_name');
  if (d.id) {
    const c = db.countries.find(x => x.id === d.id), prev = { ...c }, oldName = c.name;
    Object.assign(c, { name, code, phone, enabled: !!d.c_enabled, verify: !!d.c_verify });
    if (oldName !== name) db.states.forEach(s => { if (s.country === oldName) s.country = name; });
    N.closeModal(); N.refresh(); N.toast(`${esc(name)} updated.`, { undo() { Object.assign(c, prev); if (oldName !== name) db.states.forEach(s => { if (s.country === name) s.country = oldName; }); N.refresh(); } });
  } else {
    const c = { id: code.toLowerCase(), name, code, phone, added: TODAY, enabled: !!d.c_enabled, verify: !!d.c_verify };
    db.countries.push(c); N.closeModal(); N.refresh();
    N.toast(`${esc(name)} added. Add its counties or states next.`, { undo() { db.countries.splice(db.countries.indexOf(c), 1); N.refresh(); } });
  }
};

/* =====================================================================
   10. COUNTY / STATES
   ===================================================================== */
const DIV_T = { 'Greater London': 'Region', 'Greater Manchester': 'Metropolitan county', 'West Yorkshire': 'Metropolitan county', 'South Yorkshire': 'Metropolitan county', 'West Midlands': 'Metropolitan county', 'Merseyside': 'Metropolitan county', 'Tyne and Wear': 'Metropolitan county', 'Bristol': 'Unitary authority', 'South Glamorgan': 'Preserved county', 'Glasgow City': 'Council area', 'City of Edinburgh': 'Council area' };
const DIV_TYPES = ['County', 'Metropolitan county', 'Unitary authority', 'Region', 'Council area', 'Preserved county', 'State', 'Province'];
const divType = s => s.type || DIV_T[s.name] || 'County';
const divUse = name => Object.values(db.events).filter(e => e.county === name).length + Object.values(db.traders).filter(t => t.county === name).length + Object.values(db.organisers).filter(o => o.county === name).length;
function stRegion() {
  const s = S('states'), rows = db.states.filter(x => (s.country === 'all' || x.country === s.country) && hit(s.q, x.name, divType(x)));
  const p = paged(rows, s.page, 10); s.page = p.page;
  return p.total ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Division name</th><th>Country</th><th>In use</th><th class="r">Actions</th></tr></thead><tbody>${p.rows.map(x => { const u = divUse(x.name); return `<tr>
    <td data-l="Division name"><div class="cell">${arch('map', 'sky', 'sm')}<div><b>${esc(x.name)}</b><span class="s">${esc(divType(x))}</span></div></div></td>
    <td data-l="Country">${esc(x.country)}</td>
    <td data-l="In use"><span class="small ${u ? 'ink-2' : 'muted'}">${u ? N.plural(u, 'record') : 'Not used yet'}</span></td>
    <td class="r"><div class="adm-acts">${B('Edit', `data-act="adm_stEdit" data-id="${x.id}"`, 'btn-ghost adm-cmp', 'edit')}${B('Delete', `data-act="adm_stDel" data-id="${x.id}"`, 'btn-ghost adm-danger adm-cmp', 'trash')}</div></td>
  </tr>`; }).join('')}</tbody></table></div>${pagerHTML('states', p)}` : N.empty('No divisions found', 'Try another name or type, or add a new division.', '', 'map');
}
function stModal(id) {
  const x = id ? db.states.find(s => s.id === id) : { name: '', country: S('states').country !== 'all' ? S('states').country : 'United Kingdom' };
  N.openModal(`<form class="stack" style="--g:18px" data-form="adm_state" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <div class="stack" style="--g:6px"><p class="eyebrow">County · administrative divisions</p><h3>${id ? `Edit ${esc(x.name)}` : 'New state / division'}</h3></div>
    <div class="form-grid">${N.field({ label: 'Division name', id: 's_name', value: x.name, req: true, full: true, ph: 'e.g. Northumberland' })}${N.field({ label: 'Country', id: 's_country', value: x.country, opts: db.countries.map(c => c.name) })}${N.field({ label: 'Type', id: 's_type', value: id ? divType(x) : 'County', opts: DIV_TYPES })}</div>
    <p class="adm-err" hidden></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Cancel</button><button type="submit" class="btn btn-side btn-sm">${id ? 'Save changes' : 'Add division'}</button></div></form>`);
}
N.page('admin/states', {
  app: 'admin', title: 'County', nav: 'admin/states',
  render() {
    S('states', { q: '', country: 'all', page: 1 });
    return `${N.pageHead('Administrative divisions', `${N.plural(db.states.length, 'county or state', 'counties and states')} that events, traders and organisers can be placed in.`, `<button type="button" class="btn btn-side btn-sm" data-act="adm_stNew">${ic('plus')}New state / division</button>`, 'County · administrative divisions')}
    <div class="adm-toolbar">${searchBox('states', 'Search divisions by name or type...')}${selectBox('states', 'country', [['all', 'All countries'], ...db.countries.map(c => [c.name, c.name])], 'Country')}</div>
    ${region('states', stRegion)}`;
  },
});
Object.assign(N.act, {
  adm_stNew() { stModal(null); },
  adm_stEdit(el) { stModal(el.dataset.id); },
  adm_stDel(el) {
    const x = db.states.find(s => s.id === el.dataset.id), u = divUse(x.name);
    N.confirm({ title: `Delete ${x.name}?`, text: u ? `${N.plural(u, 'event, trader or organiser record', 'event, trader and organiser records')} use it. They keep the name, but nobody can pick it any more.` : 'Nobody uses it yet.', confirm: 'Delete division', danger: true, onConfirm() { const i = db.states.indexOf(x); db.states.splice(i, 1); N.refresh(); N.toast(`${esc(x.name)} deleted.`, { icon: 'trash', undo() { db.states.splice(i, 0, x); N.refresh(); } }); } });
  },
});
N.forms.adm_state = (form, d) => {
  const name = (d.s_name || '').trim();
  if (!name) return formErr(form, 'Enter the division name.', 's_name');
  if (db.states.some(s => s.id !== d.id && s.country === d.s_country && s.name.toLowerCase() === name.toLowerCase())) return formErr(form, `${name} is already listed for ${d.s_country}.`, 's_name');
  if (d.id) {
    const x = db.states.find(s => s.id === d.id), prev = { ...x };
    Object.assign(x, { name, country: d.s_country, type: d.s_type });
    N.closeModal(); N.refresh(); N.toast(`${esc(name)} updated.`, { undo() { Object.keys(x).forEach(k => delete x[k]); Object.assign(x, prev); N.refresh(); } });
  } else {
    const x = { id: N.uid('s'), name, country: d.s_country, type: d.s_type };
    db.states.push(x);
    const s = S('states'); s.q = ''; s.country = d.s_country; s.page = Math.ceil(db.states.filter(y => y.country === d.s_country).length / 10);
    N.closeModal(); N.refresh(); N.toast(`${esc(name)} added to ${esc(d.s_country)}.`, { undo() { db.states.splice(db.states.indexOf(x), 1); N.refresh(); } });
  }
};

/* =====================================================================
   11. FEEDBACK
   ===================================================================== */
const fbKind = f => /event/i.test(f.type) ? 'event'
  : /website/i.test(f.type) && !/platform/i.test(f.type) ? 'website'
  : /platform/i.test(f.type) && !/website/i.test(f.type) ? 'platform'
  : /mobile|safari|browser|upload|page|link|site|load/i.test(`${f.subject} ${f.text}`) ? 'website' : 'platform';
const FB_L = { event: 'Event issue', website: 'Website', platform: 'Platform' };
function fbRegion() {
  const s = S('fb'), base = db.feedback.filter(f => s.status === 'all' || f.status === s.status);
  const cnt = k => base.filter(f => k === 'all' || fbKind(f) === k).length;
  const rows = base.filter(f => s.tab === 'all' || fbKind(f) === s.tab).sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.at - a.at);
  return `<div class="adm-bar-row">${tabs('fb', [['all', 'All', cnt('all')], ['event', 'Event issue', cnt('event')], ['website', 'Website', cnt('website')], ['platform', 'Platform', cnt('platform')]])}${selectBox('fb', 'status', [['all', 'Open and resolved'], ['open', 'Open only'], ['resolved', 'Resolved only']], 'Status')}</div>
  ${rows.length ? `<div class="adm-fb">${rows.map(f => { const k = fbKind(f); return `<article class="card adm-fbc is-${f.status}">
    <header class="adm-fbc-h">${N.av(N.initials(f.from), N.tone(f.from), 'sm')}<div><b>${esc(f.from)}</b><span class="s">${esc(f.role)} · ${N.rel(f.at)}</span></div>${N.chip('adm-k-' + k, FB_L[k])}</header>
    <h3 class="h4">${esc(f.subject)}</h3><p class="small ink-2">${esc(f.text)}</p>
    ${(f.replies || []).map(r => `<div class="adm-reply">${ic('send', 'ic-sm')}<div><span class="xs muted">You replied · Today, ${esc(r.time)}</span><p class="small">${esc(r.text)}</p></div></div>`).join('')}
    <footer class="adm-fbc-f">${f.status === 'open' ? N.chip('warn', 'Open') : N.chip('ok', 'Resolved')}<span class="grow"></span>${B('Reply', `data-act="adm_fbReply" data-id="${f.id}"`, 'btn-ghost', 'message')}${f.status === 'open' ? B('Mark resolved', `data-act="adm_fbToggle" data-id="${f.id}"`, 'btn-line', 'check') : B('Reopen', `data-act="adm_fbToggle" data-id="${f.id}"`, 'btn-line', 'refresh')}</footer>
  </article>`; }).join('')}</div>` : N.empty('No feedback here', s.status === 'open' ? 'Everything in this category is resolved.' : 'Nothing matches these filters.', '', 'message')}`;
}
N.page('admin/feedback', {
  app: 'admin', title: 'Feedback', nav: 'admin/feedback',
  render() {
    S('fb', { tab: 'all', status: 'all' });
    const open = db.feedback.filter(f => f.status === 'open').length;
    return `${N.pageHead('All submitted feedback', `From traders and organisers. ${open ? `${N.plural(open, 'item')} open.` : 'Everything is resolved.'}`, `<button type="button" class="btn btn-line btn-sm" data-act="adm_fbRefresh">${ic('refresh')}Refresh</button>`, 'System')}
    ${region('fb', fbRegion)}`;
  },
});
Object.assign(N.act, {
  adm_fbRefresh(el) {
    el.classList.add('adm-spin'); el.disabled = true;
    setTimeout(() => { redraw('fb'); el.classList.remove('adm-spin'); el.disabled = false; N.toast(`Feedback is up to date. ${N.plural(db.feedback.filter(f => f.status === 'open').length, 'item')} open.`, { icon: 'refresh' }); }, N.reduce ? 50 : 900);
  },
  adm_fbToggle(el) {
    const f = db.feedback.find(x => x.id === el.dataset.id), prev = f.status;
    f.status = prev === 'open' ? 'resolved' : 'open'; N.refresh();
    N.toast(f.status === 'resolved' ? `Marked resolved: ${esc(f.subject)}` : `Reopened: ${esc(f.subject)}`, { undo() { f.status = prev; N.refresh(); } });
  },
  adm_fbReply(el) {
    const f = db.feedback.find(x => x.id === el.dataset.id);
    N.openModal(`<form class="stack" style="--g:16px" data-form="adm_reply" novalidate><input type="hidden" name="id" value="${f.id}">
      <div class="stack" style="--g:6px"><p class="eyebrow">Reply to ${esc(f.from)} · ${esc(f.role)}</p><h3>${esc(f.subject)}</h3><p class="small muted">“${esc(f.text)}”</p></div>
      ${N.field({ label: 'Subject', id: 'r_subject', value: 'Re: ' + f.subject })}
      ${N.field({ label: 'Message', id: 'r_body', type: 'textarea', rows: 5, req: true, value: `Hi ${f.from.split(' ')[0]},\n\nThanks for telling us. `, ph: 'Write your reply' })}
      ${f.status === 'open' ? N.checkbox('r_resolve', 'Mark as resolved after sending', true) : ''}
      <p class="adm-err" hidden></p>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Cancel</button><button type="submit" class="btn btn-side btn-sm">${ic('send')}Send reply</button></div></form>`);
  },
});
N.forms.adm_reply = (form, d) => {
  const f = db.feedback.find(x => x.id === d.id), body = (d.r_body || '').trim();
  if (body.length < 12) return formErr(form, 'Write a reply before sending.', 'r_body');
  (f.replies = f.replies || []).push({ text: body, time: N.nowTime() });
  if (d.r_resolve) f.status = 'resolved';
  N.closeModal(); N.refresh(); N.toast('Reply sent (prototype).', { icon: 'send' });
};

/* =====================================================================
   12. TAGS & CATEGORIES
   ===================================================================== */
const TAGK = { cuisines: ['Cuisines', 'cuisine'], eventTypes: ['Event types', 'event type'], foodCategories: ['Food categories', 'food category'], specialityTags: ['Speciality tags', 'speciality tag'] };
function tagUse(k, name) {
  const tr = Object.values(db.traders), ev = Object.values(db.events);
  if (k === 'cuisines') return { t: tr.filter(t => t.cuisine === name).length, e: ev.filter(e => (e.cuisines || []).includes(name)).length };
  if (k === 'eventTypes') return { t: 0, e: ev.filter(e => e.type === name).length };
  if (k === 'foodCategories') return { t: tr.filter(t => (t.categories || []).includes(name)).length, e: 0 };
  return { t: tr.filter(t => (t.tags || []).includes(name)).length, e: 0 };
}
const useText = u => u.t || u.e ? [u.t && N.plural(u.t, 'trader'), u.e && N.plural(u.e, 'event')].filter(Boolean).join(' · ') : 'Not used yet';
function renameRefs(k, from, to) {
  const swap = arr => arr && arr.map(x => x === from ? to : x);
  Object.values(db.traders).forEach(t => { if (k === 'cuisines' && t.cuisine === from) t.cuisine = to; if (k === 'foodCategories') t.categories = swap(t.categories); if (k === 'specialityTags') t.tags = swap(t.tags); });
  Object.values(db.events).forEach(e => { if (k === 'cuisines') e.cuisines = swap(e.cuisines); if (k === 'eventTypes' && e.type === from) e.type = to; });
}
function tagsRegion() {
  const s = S('tags'), k = s.tab, list = db.tags[k], [label, one] = TAGK[k];
  const max = Math.max(1, ...list.map(n => { const u = tagUse(k, n); return u.t + u.e; }));
  return `${N.tabsHTML(Object.entries(TAGK).map(([key, [l]]) => [key, l, db.tags[key].length]), k, 'data-act="adm_tab" data-k="tags" data-f="tab" data-v')}
  <section class="card stack" style="--g:16px">
    <form class="adm-addtag" data-form="adm_tagAdd" novalidate><label class="field"><span class="sr">Add new ${one}</span><input class="inp" name="name" placeholder="Add new ${one}..." maxlength="40" autocomplete="off" value="${esc(s.draft || '')}" ${s.err ? 'aria-invalid="true"' : ''}></label><button class="btn btn-side" type="submit">${ic('plus')}Add</button></form>
    ${s.err ? `<p class="adm-err">${ic('alert')}<span>${esc(s.err)}</span></p>` : ''}
    <div class="toolbar"><p class="small muted">${N.plural(list.length, one)} · usage counts traders and events that use each one</p></div>
    <ul class="adm-tags" data-note="Each tag shows how many traders and events use it, so you can see the impact before renaming or deleting. Renaming updates every trader and event that uses it.">${list.map((n, i) => {
      const u = tagUse(k, n), w = (u.t + u.e) / max * 100;
      if (s.edit === i) return `<li class="adm-tag is-edit"><form class="adm-tag-f" data-form="adm_tagRename" novalidate><input type="hidden" name="i" value="${i}"><label class="grow"><span class="sr">New name for ${esc(n)}</span><input class="inp sm" name="name" value="${esc(n)}" maxlength="40" required></label><button class="btn btn-xs btn-side" type="submit">Save</button><button type="button" class="btn btn-xs btn-ghost" data-act="adm_tagCancel">Cancel</button></form></li>`;
      return `<li class="adm-tag ${s.flash === n ? 'adm-flash' : ''}"><div class="adm-tag-m"><b>${esc(n)}</b><span class="s">${useText(u)}</span><span class="bar thin"><i style="width:${w}%"></i></span></div><button type="button" class="icon-btn sm" data-act="adm_tagEdit" data-i="${i}" aria-label="Rename ${esc(n)}">${ic('edit')}</button><button type="button" class="icon-btn sm adm-danger" data-act="adm_tagDel" data-i="${i}" aria-label="Delete ${esc(n)}">${ic('trash')}</button></li>`;
    }).join('')}</ul>
  </section>`;
}
N.page('admin/tags', {
  app: 'admin', title: 'Tags & categories', nav: 'admin/tags',
  render() {
    const s = S('tags', { tab: 'cuisines', edit: null, err: '', draft: '' }); s.edit = null; s.err = '';
    return `${N.pageHead('Tags &amp; categories', 'The lists traders and organisers pick from. Changes show up in every filter and form.', '', 'System')}
    ${region('tags', tagsRegion)}`;
  },
});
Object.assign(N.act, {
  adm_tagEdit(el) { const s = S('tags'); s.edit = Number(el.dataset.i); s.err = ''; redraw('tags', '.adm-tag-f input[name="name"]'); $('.adm-tag-f input[name="name"]')?.select(); },
  adm_tagCancel() { S('tags').edit = null; redraw('tags'); },
  adm_tagDel(el) {
    const s = S('tags'), k = s.tab, i = Number(el.dataset.i), name = db.tags[k][i], u = tagUse(k, name);
    N.confirm({ title: `Delete “${name}”?`, text: u.t || u.e ? `${useText(u)} use it today. They keep it, but nobody can pick it any more.` : 'Nobody uses it yet.', confirm: 'Delete tag', danger: true, onConfirm() { db.tags[k].splice(i, 1); redraw('tags'); N.toast(`“${esc(name)}” deleted from ${esc(TAGK[k][0].toLowerCase())}.`, { icon: 'trash', undo() { db.tags[k].splice(i, 0, name); redraw('tags'); } }); } });
  },
});
N.forms.adm_tagAdd = (form, d) => {
  const s = S('tags'), k = s.tab, name = (d.name || '').trim().replace(/\s+/g, ' ');
  s.draft = name; s.err = '';
  if (!name) s.err = `Type a ${TAGK[k][1]} first.`;
  else if (db.tags[k].some(x => x.toLowerCase() === name.toLowerCase())) s.err = `“${name}” is already in ${TAGK[k][0].toLowerCase()}.`;
  else { db.tags[k].push(name); s.draft = ''; s.flash = name; N.toast(`“${esc(name)}” added to ${esc(TAGK[k][0].toLowerCase())}.`, { undo() { const i = db.tags[k].indexOf(name); if (i > -1) db.tags[k].splice(i, 1); redraw('tags'); } }); }
  redraw('tags', '.adm-addtag input[name="name"]');
};
N.forms.adm_tagRename = (form, d) => {
  const s = S('tags'), k = s.tab, i = Number(d.i), from = db.tags[k][i], to = (d.name || '').trim().replace(/\s+/g, ' ');
  if (!to) return formErr(form, 'Enter a name.', 'name');
  if (to === from) { s.edit = null; redraw('tags'); return; }
  if (db.tags[k].some((x, j) => j !== i && x.toLowerCase() === to.toLowerCase())) { s.err = `“${to}” already exists.`; redraw('tags', '.adm-tag-f input[name="name"]'); return; }
  db.tags[k][i] = to; renameRefs(k, from, to); s.edit = null; s.err = ''; s.flash = to; redraw('tags');
  N.toast(`Renamed “${esc(from)}” to “${esc(to)}” everywhere it’s used.`, { undo() { db.tags[k][i] = from; renameRefs(k, to, from); redraw('tags'); } });
};

/* =====================================================================
   13. DOCUMENT TYPES
   ===================================================================== */
const LEVEL_IC = { Business: 'building', Unit: 'truck', Person: 'user' };
function dtRegion() {
  return `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th class="adm-wcol">Document name</th><th>Tier</th><th>Attaches to</th><th>Status</th><th>Requires expiry</th><th class="r">Actions</th></tr></thead><tbody>${db.docTypes.map(t => {
    const used = db.docs.filter(d => d.type === t.id && d.status !== 'missing').length;
    return `<tr class="${t.status !== 'active' ? 'adm-dim' : ''}">
      <td data-l="Document name"><div class="cell">${arch('file', t.tier === 1 ? 'butter' : 'sky', 'sm')}<div><b>${esc(t.name)}</b><span class="s adm-clamp">${esc(t.desc || '')}${used ? ` · ${N.plural(used, 'file')} uploaded` : ''}</span></div></div></td>
      <td data-l="Tier">${t.tier === 1 ? N.chip('side', 'Tier 1 · Required') : N.chip('plain', 'Tier 2 · When relevant')}</td>
      <td data-l="Attaches to"><span class="adm-ico small">${ic(LEVEL_IC[t.level] || 'file', 'ic-sm')}${esc(t.level)}</span></td>
      <td data-l="Status">${t.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Inactive')}</td>
      <td data-l="Requires expiry">${t.expiry ? `<span class="small">Yes · ${t.remind || 30}-day reminder</span>` : '<span class="small muted">No</span>'}</td>
      <td class="r"><div class="adm-acts">${B('Edit', `data-act="adm_dtEdit" data-id="${t.id}"`, 'btn-ghost adm-cmp', 'edit')}${B(t.status === 'active' ? 'Deactivate' : 'Activate', `data-act="adm_dtToggle" data-id="${t.id}"`, 'btn-line adm-cmp', t.status === 'active' ? 'pause' : 'check')}${B('Delete', `data-act="adm_dtDel" data-id="${t.id}"`, 'btn-ghost adm-danger adm-cmp', 'trash')}</div></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}
function dtDrawer(id) {
  const t = id ? db.docTypes.find(x => x.id === id) : { name: '', tier: 1, level: 'Business', expiry: true, remind: 30, desc: '', every: true };
  const rc = (name, v, cur, title, sub) => `<label class="rcard"><input type="radio" name="${name}" value="${v}" ${String(v) === String(cur) ? 'checked' : ''}><b>${title}</b><span>${sub}</span></label>`;
  N.openDrawer(`<form class="adm-drform" data-form="adm_dt" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <div class="dr-head">${arch('files', 'butter')}<div class="dr-ti"><h3>${id ? 'Edit document type' : 'New document type'}</h3><p>${id ? esc(t.name) : 'Traders see it in their document checklist.'}</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
    <div class="dr-body">
      ${N.field({ label: 'Document name', id: 'dt_name', value: t.name, req: true, ph: 'e.g. Allergen Information Matrix' })}
      <fieldset class="adm-fs"><legend class="lbl">Tier</legend><div class="radio-cards">${rc('dt_tier', 1, t.tier, 'Tier 1', 'Required for every trader')}${rc('dt_tier', 2, t.tier, 'Tier 2', 'Only for some units or events')}</div></fieldset>
      <fieldset class="adm-fs"><legend class="lbl">Attaches to</legend><div class="radio-cards">${rc('dt_level', 'Business', t.level, 'Business', 'One per company')}${rc('dt_level', 'Unit', t.level, 'Unit', 'One per truck, trailer or stall')}${rc('dt_level', 'Person', t.level, 'Person', 'One per staff member')}</div></fieldset>
      <div class="stack" style="--g:14px">
        ${N.toggle('dt_expiry', 'Requires an expiry date', t.expiry)}
        ${N.field({ label: 'Send the first reminder this many days before expiry', id: 'dt_remind', type: 'number', value: t.remind ?? 30, attrs: 'min="1" max="120"' })}
        ${N.toggle('dt_every', 'Required for every event', t.every ?? t.tier === 1)}
      </div>
      ${N.field({ label: 'Description', id: 'dt_desc', type: 'textarea', value: t.desc, rows: 3, ph: 'What it is and who needs it. Traders see this text.' })}
      <div class="banner info">${ic('info')}<span>Tier 1 documents count towards every trader’s readiness. Adding one lowers readiness for traders who haven’t uploaded it yet.</span></div>
      <p class="adm-err" hidden></p>
    </div>
    <div class="dr-foot"><div class="btn-row adm-end"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">${id ? 'Save changes' : 'Create document type'}</button></div></div>
  </form>`);
}
N.page('admin/documents', {
  app: 'admin', title: 'Document types', nav: 'admin/documents',
  render() {
    const act = db.docTypes.filter(t => t.status === 'active');
    return `${N.pageHead('Platform document types', `${N.plural(act.length, 'active type')}, ${act.filter(t => t.tier === 1).length} required for every trader. These drive every trader’s document checklist and readiness score.`, `<button type="button" class="btn btn-side btn-sm" data-act="adm_dtNew">${ic('plus')}New document type</button>`, 'System')}
    <div data-note="Deleting a document type that traders already use would break their passports, so the panel offers to deactivate it instead.">${region('dt', dtRegion)}</div>`;
  },
});
function toggleDt(id) {
  const t = db.docTypes.find(x => x.id === id), prev = t.status, before = N.readiness(db.me.trader);
  t.status = prev === 'active' ? 'inactive' : 'active';
  const after = N.readiness(db.me.trader);
  N.refresh(); N.toast(`${esc(t.name)} is ${t.status === 'active' ? 'active. Traders are asked for it again' : 'inactive. Traders are no longer asked for it'}.${before !== after ? ` Alice Green’s readiness ${before}% → ${after}%.` : ''}`, { undo() { t.status = prev; N.refresh(); } });
}
Object.assign(N.act, {
  adm_dtNew() { dtDrawer(null); },
  adm_dtEdit(el) { dtDrawer(el.dataset.id); },
  adm_dtToggle(el) { toggleDt(el.dataset.id); },
  adm_dtDel(el) {
    const t = db.docTypes.find(x => x.id === el.dataset.id), used = db.docs.filter(d => d.type === t.id).length;
    if (used) N.confirm({ title: 'Delete document type?', text: `${esc(t.name)} is attached to ${N.plural(used, 'trader document')}. Deleting it would pull them out of traders’ passports, so ${t.status === 'active' ? 'deactivate it instead. Traders stop being asked for it and existing files stay on record.' : 'it stays inactive instead.'}`, confirm: t.status === 'active' ? 'Deactivate instead' : 'Keep it inactive', onConfirm() { if (t.status === 'active') toggleDt(t.id); } });
    else N.confirm({ title: 'Delete document type?', text: `${esc(t.name)} is removed for good. No trader has uploaded one yet.`, confirm: 'Delete document type', danger: true, onConfirm() { const i = db.docTypes.indexOf(t); db.docTypes.splice(i, 1); N.refresh(); N.toast(`${esc(t.name)} deleted.`, { icon: 'trash', undo() { db.docTypes.splice(i, 0, t); N.refresh(); } }); } });
  },
});
N.forms.adm_dt = (form, d) => {
  const name = (d.dt_name || '').trim(), remind = Number(d.dt_remind || 30);
  if (!name) return formErr(form, 'Give the document type a name.', 'dt_name');
  if (db.docTypes.some(t => t.id !== d.id && t.name.toLowerCase() === name.toLowerCase())) return formErr(form, `${name} already exists.`, 'dt_name');
  if (d.dt_expiry && !(remind >= 1 && remind <= 120)) return formErr(form, 'Reminders can start between 1 and 120 days before expiry.', 'dt_remind');
  const vals = { name, tier: Number(d.dt_tier) || 1, level: d.dt_level || 'Business', expiry: !!d.dt_expiry, remind, every: !!d.dt_every, desc: (d.dt_desc || '').trim() };
  const before = N.readiness(db.me.trader);
  if (d.id) {
    const t = db.docTypes.find(x => x.id === d.id), prev = { ...t };
    Object.assign(t, vals); N.closeDrawer(); N.refresh();
    const after = N.readiness(db.me.trader);
    N.toast(`${esc(name)} saved.${before !== after ? ` Alice Green’s readiness ${before}% → ${after}%.` : ''}`, { undo() { Object.keys(t).forEach(k => delete t[k]); Object.assign(t, prev); N.refresh(); } });
  } else {
    let id = N.slug(name) || 'doc', n = 2; while (N.docType(id)) id = N.slug(name) + '-' + n++;
    const t = { id, status: 'active', ...vals };
    db.docTypes.push(t); N.closeDrawer(); N.refresh();
    const after = N.readiness(db.me.trader);
    N.toast(`${esc(name)} created. ${vals.tier === 1 ? 'Every trader is now asked for it.' : 'Traders see it when it applies to them.'}${before !== after ? ` Alice Green’s readiness ${before}% → ${after}%.` : ''}`, { undo() { db.docTypes.splice(db.docTypes.indexOf(t), 1); N.refresh(); } });
  }
};

/* =====================================================================
   14. ROLES
   ===================================================================== */
const PERMS = [['Traders', [['traders.view', 'View traders'], ['traders.approve', 'Approve and reject traders']]], ['Organisers', [['orgs.view', 'View organisers'], ['orgs.approve', 'Approve organiser compliance']]], ['Events', [['events.manage', 'Manage, postpone and cancel events']]], ['Documents', [['docs.verify', 'Verify documents']]], ['Settings', [['settings.edit', 'Edit platform settings']]]];
const ALLP = PERMS.flatMap(([, ps]) => ps.map(([k]) => k));
const DEFP = { admin: ALLP, reviewer: ['traders.view', 'orgs.view', 'docs.verify'], support: ['traders.view', 'orgs.view'] };
const APP_ROLES = ['organiser', 'trader'];
const SYS_ROLES = ['admin', ...APP_ROLES];
const permsOf = r => r.perms || DEFP[r.id] || [];
function roRegion() {
  const s = S('roles'), rows = db.roles.filter(r => hit(s.q, r.name, r.desc));
  return rows.length ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Role</th><th>Description</th><th>Status</th><th>Added</th><th class="r">Actions</th></tr></thead><tbody>${rows.map(r => {
    const sys = SYS_ROLES.includes(r.id), app = APP_ROLES.includes(r.id), n = permsOf(r).length;
    return `<tr class="${r.status !== 'active' ? 'adm-dim' : ''}">
      <td data-l="Role"><div class="cell">${arch(r.id === 'admin' ? 'key' : app ? 'users' : 'shield-plain', r.id === 'admin' ? 'butter' : app ? 'lilac' : 'sky', 'sm')}<div><b>${esc(r.name)}${sys ? ' <span class="mtag">System</span>' : ''}</b><span class="s">${app ? 'App role · no admin access' : `${n} of ${ALLP.length} admin permissions`}</span></div></div></td>
      <td data-l="Description"><span class="small ink-2">${esc(r.desc)}</span></td>
      <td data-l="Status">${r.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Inactive')}</td>
      <td data-l="Added"><span class="mono">${N.fLong(r.added)}</span></td>
      <td class="r"><div class="adm-acts">${B('Edit', `data-act="adm_roEdit" data-id="${r.id}"`, 'btn-ghost adm-cmp', 'edit')}${sys ? `<span class="adm-lock" title="System roles can't be deactivated or deleted">${ic('lock', 'ic-sm')}Protected</span>` : B(r.status === 'active' ? 'Deactivate' : 'Activate', `data-act="adm_roToggle" data-id="${r.id}"`, 'btn-line adm-cmp', r.status === 'active' ? 'pause' : 'check') + B('Delete', `data-act="adm_roDel" data-id="${r.id}"`, 'btn-ghost adm-danger adm-cmp', 'trash')}</div></td>
    </tr>`;
  }).join('')}</tbody></table></div>` : N.empty('No roles found', 'Try another name or description.', '', 'key');
}
function roDrawer(id) {
  const r = id ? db.roles.find(x => x.id === id) : { name: '', desc: '', status: 'active' }, app = APP_ROLES.includes(id), isAdmin = id === 'admin', mine = permsOf(r);
  N.openDrawer(`<form class="adm-drform" data-form="adm_role" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <div class="dr-head">${arch('key', 'butter')}<div class="dr-ti"><h3>${id ? `Edit ${esc(r.name)}` : 'New role'}</h3><p>Roles decide what each Niche team member can do in this panel.</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
    <div class="dr-body">
      ${N.field({ label: 'Role name', id: 'ro_name', value: r.name, req: true, ph: 'e.g. Events coordinator', attrs: SYS_ROLES.includes(id) ? 'readonly' : '' })}
      ${N.field({ label: 'Description', id: 'ro_desc', type: 'textarea', rows: 2, value: r.desc, ph: 'What this role is for' })}
      ${SYS_ROLES.includes(id) ? '' : N.toggle('ro_active', 'Active', r.status === 'active')}
      ${app ? `<div class="banner info">${ic('info')}<span>This role signs in to the ${id === 'organiser' ? 'organiser' : 'trader'} app. It has no admin permissions.</span></div>` : `<section><p class="dr-h">Permissions</p>${isAdmin ? '<p class="small muted" style="margin-bottom:10px">The Admin role always has every permission.</p>' : ''}<div class="adm-perms">${PERMS.map(([g, ps]) => `<fieldset class="adm-permg"><legend>${g}</legend>${ps.map(([k, l]) => N.checkbox('perm_' + k, esc(l), mine.includes(k), isAdmin ? 'disabled' : '')).join('')}</fieldset>`).join('')}</div></section>`}
      <p class="adm-err" hidden></p>
    </div>
    <div class="dr-foot"><div class="btn-row adm-end"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">${id ? 'Save role' : 'Create role'}</button></div></div>
  </form>`);
}
N.page('admin/roles', {
  app: 'admin', title: 'Roles', nav: 'admin/roles',
  render() {
    S('roles', { q: '' });
    return `${N.pageHead('Platform roles', 'Who can do what. Admin, Organiser and Trader are system roles and can’t be removed.', `<button type="button" class="btn btn-side btn-sm" data-act="adm_roNew">${ic('plus')}New role</button>`, 'System')}
    <div class="adm-toolbar">${searchBox('roles', 'Search roles by name or description...')}</div>
    ${region('roles', roRegion)}`;
  },
});
Object.assign(N.act, {
  adm_roNew() { roDrawer(null); },
  adm_roEdit(el) { roDrawer(el.dataset.id); },
  adm_roToggle(el) { const r = db.roles.find(x => x.id === el.dataset.id), prev = r.status; r.status = prev === 'active' ? 'inactive' : 'active'; N.refresh(); N.toast(`${esc(r.name)} is ${r.status}.`, { undo() { r.status = prev; N.refresh(); } }); },
  adm_roDel(el) {
    const r = db.roles.find(x => x.id === el.dataset.id);
    N.confirm({ title: `Delete ${r.name}?`, text: 'Team members with this role lose its permissions straight away.', confirm: 'Delete role', danger: true, onConfirm() { const i = db.roles.indexOf(r); db.roles.splice(i, 1); N.refresh(); N.toast(`${esc(r.name)} deleted.`, { icon: 'trash', undo() { db.roles.splice(i, 0, r); N.refresh(); } }); } });
  },
});
N.forms.adm_role = (form, d) => {
  const name = (d.ro_name || '').trim();
  if (!name) return formErr(form, 'Give the role a name.', 'ro_name');
  if (db.roles.some(r => r.id !== d.id && r.name.toLowerCase() === name.toLowerCase())) return formErr(form, `A role called ${name} already exists.`, 'ro_name');
  const perms = d.id === 'admin' ? ALLP : ALLP.filter(k => d['perm_' + k]);
  if (d.id) {
    const r = db.roles.find(x => x.id === d.id), prev = { ...r };
    Object.assign(r, { name, desc: (d.ro_desc || '').trim() });
    if (!APP_ROLES.includes(r.id)) r.perms = perms;
    if (!SYS_ROLES.includes(r.id)) r.status = d.ro_active ? 'active' : 'inactive';
    N.closeDrawer(); N.refresh(); N.toast(`${esc(name)} saved.`, { undo() { Object.keys(r).forEach(k => delete r[k]); Object.assign(r, prev); N.refresh(); } });
  } else {
    if (!perms.length) return formErr(form, 'Tick at least one permission.', null);
    let id = N.slug(name) || 'role', n = 2; while (db.roles.some(r => r.id === id)) id = N.slug(name) + '-' + n++;
    const r = { id, name, desc: (d.ro_desc || '').trim() || 'Custom role.', status: d.ro_active ? 'active' : 'inactive', added: TODAY, perms };
    db.roles.push(r); N.closeDrawer(); N.refresh();
    N.toast(`${esc(name)} created with ${N.plural(perms.length, 'permission')}.`, { undo() { db.roles.splice(db.roles.indexOf(r), 1); N.refresh(); } });
  }
};

/* =====================================================================
   15. SCORES (passport completion weights)
   ===================================================================== */
const scDraft = () => { const s = S('scores'); if (!s.draft) s.draft = db.scores.map(x => ({ ...x, pct: Number(x.pct) })); return s.draft; };
const scKey = a => JSON.stringify(a.map(x => [x.id, x.label, Number(x.pct), x.url]));
const scDirty = () => scKey(scDraft()) !== scKey(db.scores);
function meterHTML() {
  const d = scDraft(), total = d.reduce((a, x) => a + (Number(x.pct) || 0), 0), ok = total === 100, ch = scDirty(), scale = Math.max(total, 100);
  return `<div class="adm-total-h">
      <div><p class="eyebrow">Total weight</p><p class="num adm-total-n ${ok ? 'is-ok' : 'is-warn'}">${total}%</p></div>
      <div class="adm-total-s">${ok ? N.chip('ok', 'Adds up to 100%') : N.chip('warn', total < 100 ? `${100 - total}% short of 100%` : `${total - 100}% over 100%`)}<p class="small muted">${ok ? (ch ? 'Save to apply the new weights to every passport.' : 'A complete passport reaches 100%.') : `A fully complete passport would only reach ${Math.min(total, 100)}%. Adjust the percentages, then save.`}</p></div>
      <div class="btn-row">${ch ? '<button type="button" class="btn btn-ghost btn-sm" data-act="adm_scDiscard">Discard changes</button>' : ''}<button type="button" class="btn btn-side btn-sm" data-act="adm_scSave" ${ok && ch ? '' : 'disabled'}>${ic('check')}Save weights</button></div>
    </div>
    <div class="adm-meter ${ok ? 'is-ok' : 'is-warn'}" role="img" aria-label="Total ${total}% of 100%">${d.map(x => `<i style="width:${((Number(x.pct) || 0) / scale * 100).toFixed(2)}%" title="${esc(x.label)} · ${x.pct}%"></i>`).join('')}<b class="adm-meter-100" style="left:${(100 / scale * 100).toFixed(2)}%"><span>100%</span></b></div>`;
}
function scRegion() {
  const s = S('scores'), rows = scDraft().filter(x => hit(s.q, x.label, x.url));
  const p = paged(rows, s.page, Number(s.per) || 10); s.page = p.page;
  return p.total ? `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Label</th><th>Percentage</th><th>Redirect URL</th><th class="r">Actions</th></tr></thead><tbody>${p.rows.map(x => `<tr>
    <td data-l="Label"><b>${esc(x.label)}</b>${x.isNew ? ' ' + N.chip('info', 'Unsaved') : ''}</td>
    <td data-l="Percentage"><label class="adm-pct"><span class="sr">Percentage for ${esc(x.label)}</span><input class="inp sm" type="number" inputmode="numeric" min="0" max="100" step="1" value="${Number(x.pct)}" data-input="adm_scPct" data-id="${x.id}"><span aria-hidden="true">%</span></label></td>
    <td data-l="Redirect URL"><span class="mono">${esc(x.url || '—')}</span></td>
    <td class="r"><div class="adm-acts">${B('Edit', `data-act="adm_scEdit" data-id="${x.id}"`, 'btn-ghost adm-cmp', 'edit')}${B('Delete', `data-act="adm_scDel" data-id="${x.id}"`, 'btn-ghost adm-danger adm-cmp', 'trash')}</div></td>
  </tr>`).join('')}</tbody></table></div>${pagerHTML('scores', p)}` : N.empty('No scores found', 'Try another label or URL.', '', 'percent');
}
function scModal(id) {
  const x = id ? scDraft().find(y => y.id === id) : { label: '', pct: 0, url: '/trader/' };
  N.openModal(`<form class="stack" style="--g:18px" data-form="adm_sc" novalidate><input type="hidden" name="id" value="${esc(id || '')}">
    <div class="stack" style="--g:6px"><p class="eyebrow">Score management</p><h3>${id ? `Edit ${esc(x.label)}` : 'New score'}</h3><p class="small muted">Each score is one section of the passport. Traders tap it to go to the page where they complete it.</p></div>
    <div class="form-grid">${N.field({ label: 'Label', id: 'sc_label', value: x.label, req: true, full: true, ph: 'e.g. Allergen matrix' })}${N.field({ label: 'Percentage', id: 'sc_pct', type: 'number', value: x.pct, req: true, attrs: 'min="0" max="100"' })}${N.field({ label: 'Redirect URL', id: 'sc_url', value: x.url, ph: '/trader/documents' })}</div>
    <p class="adm-err" hidden></p>
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Cancel</button><button type="submit" class="btn btn-side btn-sm">${id ? 'Update score' : 'Add score'}</button></div></form>`);
}
N.page('admin/scores', {
  app: 'admin', title: 'Scores', nav: 'admin/scores',
  render() {
    S('scores', { q: '', per: '10', page: 1, draft: null });
    return `${N.pageHead('Score management', 'Weights for each section of the Food Trader Passport. Traders see completion as a percentage, so the weights must add up to exactly 100%.', `<button type="button" class="btn btn-side btn-sm" data-act="adm_scNew">${ic('plus')}New score</button>`, 'System')}
    <div data-note="Scores on the live site add up to 90%, so no passport can reach 100%. The total is now shown and must equal 100% before saving."><section class="card adm-total" id="adm-sc-meter">${meterHTML()}</section></div>
    <div class="adm-toolbar">${searchBox('scores', 'Search scores by label or URL...')}${selectBox('scores', 'per', [['10', '10 per page'], ['20', '20 per page'], ['50', '50 per page'], ['100', '100 per page']], 'Rows per page')}</div>
    ${region('scores', scRegion)}`;
  },
});
const scMeter = () => { const m = $('#adm-sc-meter'); if (m) m.innerHTML = meterHTML(); };
N.input.adm_scPct = el => { const x = scDraft().find(y => y.id === el.dataset.id); if (!x) return; x.pct = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0))); scMeter(); };
Object.assign(N.act, {
  adm_scNew() { scModal(null); },
  adm_scEdit(el) { scModal(el.dataset.id); },
  adm_scDel(el) {
    const d = scDraft(), x = d.find(y => y.id === el.dataset.id);
    N.confirm({ title: `Delete ${x.label}?`, text: `Its ${x.pct}% comes off the total. Nothing changes for traders until you save the weights.`, confirm: 'Delete score', danger: true, onConfirm() { const i = d.indexOf(x); d.splice(i, 1); N.refresh(); N.toast(`${esc(x.label)} removed from the draft.`, { icon: 'trash', undo() { d.splice(i, 0, x); N.refresh(); } }); } });
  },
  adm_scDiscard() { S('scores').draft = null; N.refresh(); N.toast('Changes discarded.'); },
  adm_scSave() {
    const d = scDraft(), prev = db.scores.map(x => ({ ...x }));
    db.scores.splice(0, db.scores.length, ...d.map(({ isNew, ...x }) => ({ ...x, pct: Number(x.pct) })));
    S('scores').draft = null; N.refresh();
    N.toast(`Weights saved. A complete passport now reaches 100%. Alice Green’s passport shows ${N.completion('ag').pct}%.`, { undo() { db.scores.splice(0, db.scores.length, ...prev); S('scores').draft = null; N.refresh(); } });
  },
});
N.forms.adm_sc = (form, v) => {
  const label = (v.sc_label || '').trim(), pct = Number(v.sc_pct), url = (v.sc_url || '').trim(), d = scDraft();
  if (!label) return formErr(form, 'Give the score a label.', 'sc_label');
  if (d.some(x => x.id !== v.id && x.label.toLowerCase() === label.toLowerCase())) return formErr(form, `${label} already exists.`, 'sc_label');
  if (!(pct >= 0 && pct <= 100) || v.sc_pct === '') return formErr(form, 'The percentage is a whole number from 0 to 100.', 'sc_pct');
  if (url && !url.startsWith('/')) return formErr(form, 'Use a path inside Niche that starts with /, like /trader/documents.', 'sc_url');
  if (v.id) Object.assign(d.find(x => x.id === v.id), { label, pct: Math.round(pct), url });
  else d.push({ id: N.uid('sc'), label, pct: Math.round(pct), url, isNew: true });
  N.closeModal(); N.refresh();
  const total = d.reduce((a, x) => a + Number(x.pct), 0);
  N.toast(`${esc(label)} ${v.id ? 'updated' : 'added'}. ${total === 100 ? 'The total is 100%, so you can save.' : `The total is ${total}%. Balance it to 100%, then save.`}`, { icon: 'percent' });
};

/* =====================================================================
   16. TERMS & CONDITIONS
   ===================================================================== */
const ROLE_L = { admin: 'Admin', organiser: 'Organiser', trader: 'Trader' };
const nextVer = r => Math.max(0, ...db.tnc.filter(x => x.role === r).map(x => Number(x.version))) + 1;
const tncBody = t => t.content
  ? t.content.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
  : `<h4>1. What changed</h4><p>${esc(t.summary)}</p><h4>2. Your account</h4><p>You are responsible for keeping your details and documents accurate and up to date. Niche may pause an account while documents are reviewed.</p><h4>3. Documents and data</h4><p>Documents you upload are checked by the Niche team and shared only with organisers you apply to or who invite you.</p><h4>4. Fees</h4><p>Fees are set out on the pricing page for your plan. We give 30 days’ notice of any change.</p><h4>5. Ending your account</h4><p>You can close your account at any time from settings. Confirmed bookings stay in place unless you cancel them.</p>`;
function tncRegion() {
  const s = S('tnc'), ver = String(s.q || '').trim().replace(/^v/i, '');
  const list = db.tnc.filter(t => t.role === s.role && (!ver || String(t.version) === ver) && (s.status === 'all' || t.status === s.status)).sort((a, b) => b.version - a.version);
  const any = db.tnc.some(t => t.role === s.role);
  return `<section class="card"><div class="card-h"><h3>Terms &amp; conditions history — ${ROLE_L[s.role]}</h3><span class="small muted">${N.plural(list.length, 'version')}</span></div>
    ${list.length ? `<ul class="list">${list.map(t => `<li class="li adm-tnc"><span class="adm-ver ${t.status === 'active' ? 'on' : ''}"><small>v</small>${t.version}</span><div class="li-main"><b>${esc(t.title)}</b><span>Published ${N.fLong(t.date)} · ${esc(t.summary)}</span></div><div class="li-end">${t.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Inactive')}${B('View', `data-act="adm_tncView" data-id="${t.id}"`, 'btn-ghost', 'eye')}${t.status !== 'active' ? B('Activate', `data-act="adm_tncActivate" data-id="${t.id}"`, 'btn-line', 'check') : ''}</div></li>`).join('')}</ul>`
      : N.empty('No terms & conditions found', any ? 'Nothing matches these filters. Try another version number or status.' : `There are no ${ROLE_L[s.role].toLowerCase()} terms yet. Create the first version so ${s.role === 'admin' ? 'team members' : s.role + 's'} accept them when they sign in.`, `<button type="button" class="btn btn-side btn-sm" data-act="adm_tncNew" data-role="${s.role}">${ic('plus')}Create terms &amp; conditions</button>`, 'book')}
  </section>`;
}
function tncDrawer(role) {
  const n = nextVer(role);
  N.openDrawer(`<form class="adm-drform" data-form="adm_tnc" novalidate>
    <div class="dr-head">${arch('book', 'butter')}<div class="dr-ti"><h3>New terms &amp; conditions</h3><p>Published versions can’t be edited. Create a new version instead.</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
    <div class="dr-body">
      <div class="form-grid">
        ${N.field({ label: 'Role', id: 'tn_role', value: role, opts: Object.entries(ROLE_L), attrs: 'data-change="adm_tncRole"' })}
        ${N.field({ label: 'Version', id: 'tn_ver', value: n, hint: 'Set automatically', attrs: 'readonly' })}
        ${N.field({ label: 'Title', id: 'tn_title', value: `${ROLE_L[role]} terms v${n}`, req: true, full: true })}
        ${N.field({ label: 'Summary of changes', id: 'tn_sum', full: true, ph: 'One line people see before they accept' })}
        ${N.field({ label: 'Content', id: 'tn_body', type: 'textarea', rows: 12, req: true, full: true, ph: 'Paste the full terms. Leave a blank line between paragraphs.' })}
      </div>
      ${N.toggle('tn_active', 'Make this the active version now', true)}
      <p class="small muted">The active version is shown to everyone with this role, and they are asked to accept it next time they sign in. The current active version becomes inactive.</p>
      <p class="adm-err" hidden></p>
    </div>
    <div class="dr-foot"><div class="btn-row adm-end"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">Save terms</button></div></div>
  </form>`, 'wide');
}
N.page('admin/tnc', {
  app: 'admin', title: 'T & C management', nav: 'admin/tnc',
  render() {
    S('tnc', { role: 'trader', q: '', status: 'all' });
    return `${N.pageHead('Platform T &amp; C management', 'Versioned terms for each role. Only one version per role is active at a time.', `<button type="button" class="btn btn-side btn-sm" data-act="adm_tncNew">${ic('plus')}New T&amp;C</button>`, 'System')}
    <div class="adm-toolbar">${selectBox('tnc', 'role', Object.entries(ROLE_L), 'Role')}<label class="search adm-search adm-search-s">${ic('filter')}<span class="sr">Filter version</span><input type="search" inputmode="numeric" value="${esc(S('tnc').q || '')}" placeholder="Filter version (e.g. 1)" data-input="adm_q" data-k="tnc" autocomplete="off"></label>${selectBox('tnc', 'status', [['all', 'All statuses'], ['active', 'Active only'], ['inactive', 'Inactive only']], 'Status')}</div>
    ${region('tnc', tncRegion)}`;
  },
});
Object.assign(N.act, {
  adm_tncNew(el) { tncDrawer(el.dataset.role || S('tnc').role); },
  adm_tncView(el) {
    const t = db.tnc.find(x => x.id === el.dataset.id);
    N.openModal(`<div class="stack" style="--g:8px"><p class="eyebrow">${ROLE_L[t.role]} · version ${t.version} · ${N.fLong(t.date)}</p><h3>${esc(t.title)}</h3><div>${t.status === 'active' ? N.chip('ok', 'Active') : N.chip('plain', 'Inactive')}</div></div>
      <div class="prose adm-tnc-body">${tncBody(t)}</div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Close</button>${t.status !== 'active' ? `<button type="button" class="btn btn-side btn-sm" data-act="adm_tncActivate" data-id="${t.id}">${ic('check')}Activate this version</button>` : ''}</div>`, 'wide');
  },
  adm_tncActivate(el) {
    const t = db.tnc.find(x => x.id === el.dataset.id), cur = db.tnc.find(x => x.role === t.role && x.status === 'active');
    N.confirm({
      title: `Activate version ${t.version}?`, text: `${cur ? `Version ${cur.version} becomes inactive. ` : ''}Every ${esc(t.role)} is asked to accept version ${t.version} next time they sign in.`, confirm: 'Activate version',
      onConfirm() { const snap = db.tnc.filter(x => x.role === t.role).map(x => [x, x.status]); db.tnc.forEach(x => { if (x.role === t.role) x.status = x === t ? 'active' : 'inactive'; }); N.refresh(); N.toast(`${esc(t.title)} is now active.`, { undo() { snap.forEach(([x, st]) => x.status = st); N.refresh(); } }); },
    });
  },
});
N.change.adm_tncRole = el => { const f = el.form, n = nextVer(el.value); f.elements.tn_ver.value = n; f.elements.tn_title.value = `${ROLE_L[el.value]} terms v${n}`; };
N.forms.adm_tnc = (form, d) => {
  const title = (d.tn_title || '').trim(), body = (d.tn_body || '').trim();
  if (!title) return formErr(form, 'Give this version a title.', 'tn_title');
  if (body.length < 40) return formErr(form, 'Paste the full terms. This looks too short.', 'tn_body');
  const role = d.tn_role, snap = db.tnc.filter(x => x.role === role).map(x => [x, x.status]);
  const t = { id: N.uid('t'), role, version: nextVer(role), status: d.tn_active ? 'active' : 'inactive', date: TODAY, title, summary: (d.tn_sum || '').trim() || body.split(/[.\n]/)[0].slice(0, 120), content: body };
  if (d.tn_active) db.tnc.forEach(x => { if (x.role === role) x.status = 'inactive'; });
  db.tnc.push(t);
  Object.assign(S('tnc'), { role, q: '', status: 'all' });
  N.closeDrawer(); N.refresh();
  N.toast(`${esc(title)} saved${d.tn_active ? ' and active' : ' as inactive'}.`, { undo() { db.tnc.splice(db.tnc.indexOf(t), 1); snap.forEach(([x, st]) => x.status = st); N.refresh(); } });
};

/* =====================================================================
   17. SETTINGS
   ===================================================================== */
const TPL = [
  { id: 'approved', name: 'Trader approved', when: 'When you approve a trader account', subject: 'You’re approved on Niche', body: ['Good news: the Niche team has checked your details and your account is approved.', 'Your Food Trader Passport is live. Organisers can now see it, and you can apply to events in a couple of taps.'], cta: 'Browse events' },
  { id: 'rejected', name: 'Trader rejected', when: 'When you reject a trader, with your reason', subject: 'Your Niche application needs a change', body: ['Thanks for signing up. We couldn’t approve your account yet, for this reason:', '“Your food business registration is unreadable. Please upload a clearer scan.”', 'Fix it and we’ll check again, usually within one working day.'], cta: 'Update my documents' },
  { id: 'expiring', name: 'Document expiring', when: 'Before a document expires, on each reminder day', subject: 'Your Gas Safety Certificate expires on 21 Oct', body: ['Your Gas Safety Certificate for Alice Street Truck expires on 21 October 2026.', 'Upload the renewal before then to keep your Leeds Summer Festival booking valid.'], cta: 'Upload renewal' },
  { id: 'decision', name: 'Application decision', when: 'When an organiser approves or rejects an application', subject: 'Camden Night Market: you’re in', body: ['Reed Events approved your application for Camden Night Market on 2 October 2026.', 'Pitch 12 · load-in from 15:00. The organiser’s trader pack is attached.'], cta: 'View booking' },
];
function tplModal(id) {
  const t = TPL.find(x => x.id === id), c = SET();
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Email template · ${esc(t.when)}</p><h3>${esc(t.name)}</h3></div>
    <div class="adm-mail">
      <div class="adm-mail-meta"><span><b>From</b> ${esc(c.name)} &lt;${esc(c.email)}&gt;</span><span><b>To</b> Alice Green &lt;trader1@niche.com&gt;</span><span><b>Subject</b> ${esc(t.subject)}</span></div>
      <div class="adm-mail-body"><div class="adm-mail-h">${N.wm('wm-sm')}</div><p>Hi Alice,</p>${t.body.map(p => `<p>${esc(p)}</p>`).join('')}<span class="btn btn-ink btn-sm" aria-hidden="true">${esc(t.cta)}</span><p class="xs muted">Questions? Reply to this email or call ${esc(c.phone)}.</p></div>
    </div>
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="adm_closeModal">Close</button><button type="button" class="btn btn-line btn-sm" data-act="adm_tplTest" data-id="${t.id}">${ic('send')}Send me a test</button></div>`, 'wide');
}
const numField = (label, id, v, suf, hint = '', attrs = '') => `<label class="field" for="${id}"><span>${esc(label)}${hint ? ` <span class="hint">${esc(hint)}</span>` : ''}</span><span class="adm-suf"><input class="inp" id="${id}" name="${id}" type="number" value="${esc(v)}" ${attrs}><span>${esc(suf)}</span></span></label>`;
N.page('admin/settings', {
  app: 'admin', title: 'Settings', nav: 'admin/settings',
  render() {
    const c = SET(), s = S('set', { dirty: false }); s.dirty = false;
    const nav = [['adm-set-platform', 'settings', 'Platform'], ['adm-set-compliance', 'shield-plain', 'Compliance'], ['adm-set-plans', 'pound', 'Plans & fees'], ['adm-set-emails', 'mail', 'Notifications'], ['adm-set-maint', 'alert', 'Maintenance']];
    return `${N.pageHead('Settings', 'Platform details, compliance rules, plans and emails. Changes apply to every trader and organiser.', '', 'System')}
    ${c.maintenance ? `<div class="banner risk">${ic('alert')}<div class="grow"><b>Maintenance mode is on.</b> Traders and organisers see a holding page. Admins keep full access.</div></div>` : ''}
    <div class="adm-set" data-note="The live Settings page says 'Settings coming soon'. This is a proposed first version covering platform details, compliance rules, plans and fees, email templates and maintenance mode.">
      <nav class="adm-setnav" aria-label="Settings sections">${nav.map(([t, icn, l]) => `<button type="button" data-act="adm_scrollTo" data-t="${t}">${ic(icn)}${esc(l)}</button>`).join('')}</nav>
      <div class="stack" style="--g:22px;min-width:0">
        <form class="stack" style="--g:22px" data-form="adm_settings" data-input="adm_setDirty" data-change="adm_setDirty" novalidate>
          <section class="card" id="adm-set-platform"><div class="card-h"><div><h3>Platform</h3><p class="small muted">Shown in emails, the footer and the help centre.</p></div></div>
            <div class="form-grid">${N.field({ label: 'Platform name', id: 's_name', value: c.name, req: true })}${N.field({ label: 'Support email', id: 's_email', type: 'email', value: c.email, req: true })}${N.field({ label: 'Support phone', id: 's_phone', type: 'tel', value: c.phone })}</div>
          </section>
          <section class="card" id="adm-set-compliance"><div class="card-h"><div><h3>Compliance</h3><p class="small muted">How fast documents are reviewed and how expiry is handled.</p></div></div>
            <div class="stack" style="--g:18px">
              ${N.field({ label: 'Document review target', id: 's_review', value: c.reviewDays, opts: [[0, 'Same working day'], [1, '1 working day'], [2, '2 working days'], [3, '3 working days']], hint: 'Items over target are flagged on the dashboard' })}
              <fieldset class="adm-fs"><legend class="lbl">Send expiry reminders</legend><div class="row" style="--g:18px">${[30, 14, 7].map(n => N.checkbox('s_r' + n, `${n} days before`, c.remind.includes(n))).join('')}</div></fieldset>
              <div class="adm-setrow"><div><b>Block applications when a required document is expired</b><span class="s">Traders can’t apply until they upload a valid renewal. Organisers never see an expired passport.</span></div>${N.toggle('s_block', 'On', c.blockExpired)}</div>
            </div>
          </section>
          <section class="card" id="adm-set-plans"><div class="card-h"><div><h3>Plans &amp; fees</h3><p class="small muted">Free periods and commission. Changes apply to new sign-ups.</p></div></div>
            <div class="form-grid">${numField('Trader free period', 's_tfree', c.traderFree, 'months', 'Growth and Pro', 'min="0" max="24"')}${numField('Organiser free period', 's_ofree', c.orgFree, 'months', 'Event Pass', 'min="0" max="36"')}${numField('Organiser commission', 's_ocomm', c.orgCommission, '%', 'From year 2', 'min="0" max="30" step="0.5"')}${numField('Advance off-platform commission', 's_acomm', c.advanceCommission, '%', 'NICHE Advance', 'min="0" max="40" step="0.5"')}</div>
          </section>
          <section class="card" id="adm-set-emails"><div class="card-h"><div><h3>Notifications</h3><p class="small muted">Emails Niche sends automatically.</p></div></div>
            <ul class="list">${TPL.map(t => `<li class="li">${arch('mail', 'butter', 'sm')}<div class="li-main"><b>${esc(t.name)}</b><span>${esc(t.when)} · “${esc(t.subject)}”</span></div><div class="li-end">${B('Preview', `data-act="adm_tplView" data-id="${t.id}"`, 'btn-line', 'eye')}</div></li>`).join('')}</ul>
          </section>
          <div class="adm-savebar ${s.dirty ? 'on' : ''}" id="adm-savebar"><span class="adm-sb-t">No unsaved changes</span><span class="grow"></span><button type="button" class="btn btn-sm adm-on-ink" data-act="adm_setReset">Discard</button><button type="submit" class="btn btn-zest btn-sm" disabled>Save changes</button></div>
        </form>
        <section class="card adm-maint ${c.maintenance ? 'is-on' : ''}" id="adm-set-maint"><div class="adm-setrow"><div><h3 class="h4">Maintenance mode</h3><span class="s">Shows traders and organisers a holding page while you make changes. Admins keep access.</span></div>${N.toggle('s_maint', c.maintenance ? 'On' : 'Off', c.maintenance, 'data-change="adm_maint"')}</div></section>
      </div>
    </div>`;
  },
});
N.change.adm_setDirty = N.input.adm_setDirty = () => {
  S('set').dirty = true; const bar = $('#adm-savebar'); if (!bar) return;
  bar.classList.add('on'); bar.querySelector('.adm-sb-t').textContent = 'You have unsaved changes'; bar.querySelector('[type=submit]').disabled = false;
};
N.change.adm_maint = el => {
  const on = el.checked; el.checked = !on;
  if (on) N.confirm({ title: 'Turn on maintenance mode?', text: 'Traders and organisers see a holding page and can’t sign in until you turn it off. Use it only for planned work.', confirm: 'Turn on maintenance mode', danger: true, onConfirm() { SET().maintenance = true; N.refresh(); N.toast('Maintenance mode is on.', { icon: 'alert', undo() { SET().maintenance = false; N.refresh(); } }); } });
  else { SET().maintenance = false; N.refresh(); N.toast('Maintenance mode is off. The platform is open again.'); }
};
Object.assign(N.act, {
  adm_setReset() { S('set').dirty = false; N.refresh(); N.toast('Changes discarded.'); },
  adm_tplView(el) { tplModal(el.dataset.id); },
  adm_tplTest(el) { N.toast(`Test email sent to ${esc(db.me.admin.email)}.`, { icon: 'send' }); },
});
N.forms.adm_settings = (form, d) => {
  const email = (d.s_email || '').trim(), name = (d.s_name || '').trim(), n = k => Number(d[k]);
  if (!name) return formErr(form, 'The platform needs a name.', 's_name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return formErr(form, 'Enter a valid support email.', 's_email');
  if (!(n('s_tfree') >= 0 && n('s_tfree') <= 24)) return formErr(form, 'The trader free period is 0 to 24 months.', 's_tfree');
  if (!(n('s_ofree') >= 0 && n('s_ofree') <= 36)) return formErr(form, 'The organiser free period is 0 to 36 months.', 's_ofree');
  if (!(n('s_ocomm') >= 0 && n('s_ocomm') <= 30)) return formErr(form, 'Organiser commission is 0% to 30%.', 's_ocomm');
  if (!(n('s_acomm') >= 0 && n('s_acomm') <= 40)) return formErr(form, 'Advance commission is 0% to 40%.', 's_acomm');
  const c = SET(), prev = { ...c, remind: [...c.remind] };
  Object.assign(c, { name, email, phone: (d.s_phone || '').trim(), reviewDays: n('s_review'), remind: [30, 14, 7].filter(x => d['s_r' + x]), blockExpired: !!d.s_block, traderFree: n('s_tfree'), orgFree: n('s_ofree'), orgCommission: n('s_ocomm'), advanceCommission: n('s_acomm') });
  S('set').dirty = false; N.refresh();
  N.toast('Settings saved. They apply across the platform now.', { undo() { Object.assign(c, prev); N.refresh(); } });
};
})();
