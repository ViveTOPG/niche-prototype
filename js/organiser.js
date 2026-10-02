/* =====================================================================
   NICHE · Organiser app
   Demo user: Olivia Reed, Reed Events (organiser id 'reed').
   Reads and writes the shared N.db, so every decision here shows up in
   the trader and admin apps.
   ===================================================================== */
(() => {
'use strict';
const { db, esc, ic, $, $$ } = N;
const ME = 'reed', WHO = 'Olivia Reed';
const APP = 'org';

/* ---------- state ---------- */
const S = (k, d) => N.state[k] || (N.state[k] = typeof d === 'function' ? d() : d);
const sDash = () => S('org_dash', { prev: {}, hidden: {} });
const sApps = () => S('org_apps', () => ({ st: 'all', q: '', ev: 'all', sort: 'ready', sel: new Set() }));
const sEvApps = () => S('org_evApps', { st: 'all', bulk: null });
const sEl = () => S('org_el', { tab: 'eligible', q: '' });
const sMe = () => S('org_me', { tab: 'all', q: '', view: 'grid', page: 1 });
const sRev = () => S('org_rev', { ids: [], i: 0 });

/* ---------- data helpers ---------- */
const ev = id => db.events[id];
const T = tid => db.traders[tid];
const org = () => db.organisers[ME];
const myIds = () => Object.keys(db.events).filter(id => db.events[id].org === ME);
const byDate = (a, b) => N.dt(ev(a).date) - N.dt(ev(b).date);
const appsFor = eid => db.apps.filter(a => a.e === eid);
const myApps = () => db.apps.filter(a => ev(a.e) && ev(a.e).org === ME);
const findApp = id => db.apps.find(a => String(a.id) === String(id));
const pendingOf = eid => appsFor(eid).filter(a => a.st === 'pending').length;
const first = tid => T(tid).person.split(' ')[0];
const todayISO = () => { const d = N.TODAY; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isActive = e => ['upcoming', 'live'].includes(N.eventState(e));
const fillPct = e => Math.round((e.filled || 0) / Math.max(1, e.pitches || 1) * 100);
const feeText = e => e.fee?.model === 'commission' ? `${e.fee.pct}% commission on takings` : `${N.money(e.fee?.amount || 0)} pitch fee`;
const evDates = e => e.end && e.end !== e.date ? `${N.fShort(e.date)} – ${N.fLong(e.end)}` : N.fd(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const toGo = e => {
  const st = N.eventState(e), d = N.daysFrom(e.date);
  if (st === 'live') return 'On now';
  if (st === 'completed') return `Ended ${N.fShort(e.end || e.date)}`;
  return d > 1 ? `${d} days to go` : d === 1 ? 'Tomorrow' : 'Today';
};
const nowRec = note => ({ by: WHO, when: 'Today, ' + N.nowTime(), note });
const pushNote = (feed, n) => { const id = N.uid('n'); (db.notifications[feed] = db.notifications[feed] || []).unshift({ id, at: 0, unread: true, ...n }); return id; };
const dropNote = (feed, id) => { const l = db.notifications[feed]; if (!l) return; const i = l.findIndex(n => n.id === id); if (i > -1) l.splice(i, 1); };

const EV_STATE = { upcoming: ['info', 'Upcoming'], live: ['ok', 'Live now'], completed: ['plain', 'Completed'], draft: ['warn', 'Draft'], cancelled: ['risk', 'Cancelled'], postponed: ['warn', 'Postponed'] };
const evChip = e => N.statusChip(EV_STATE, N.eventState(e));
const APP_TABS = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['info', 'Incomplete']];

/* ---------- shared UI bits ---------- */
const searchBox = (id, ph, val, input) => `<label class="search org-search">${ic('search')}<span class="sr">${esc(ph)}</span><input type="search" id="${id}" placeholder="${esc(ph)}" value="${esc(val)}" data-input="${input}" autocomplete="off"></label>`;
const dots = cs => `<span class="org-dots">${cs.map(c => `<i class="${c.st === 'fail' ? 'risk' : c.st}" title="${esc(c.label)}: ${esc(c.val)}"></i>`).join('')}</span>`;
const reqCell = (tid, eid) => { const cs = N.evalChecks(tid, eid), s = N.sumChecks(cs); return `<div class="org-rq">${dots(cs)}${N.chip(s.cls, s.txt)}</div>`; };
const reqItems = e => {
  const r = e.req || {};
  const docs = e.docs ? Object.entries(e.docs).filter(([k, on]) => on && !['pli', 'fhc', 'gas', 'elec'].includes(k)).map(([k]) => ['file', N.docType(k)?.name || k]) : [];
  return [
    ['shield', `Food hygiene rating ${r.fhrs}${r.fhrs < 5 ? ' or above' : ''}`],
    ['shield', `Public liability cover of £${r.pli}m or more`],
    r.gas ? ['flame', 'Gas cooking allowed with a Gas Safety Certificate valid on event day'] : ['flame', 'No gas cooking on site'],
    r.allergen && ['info', 'Allergen information for all 14 allergens'],
    ['zap', r.power === 'None' ? 'No power supplied to pitches' : `${r.power} power per pitch`],
    r.elec && ['zap', 'Electrical Safety Certificate'],
    r.vegan && ['heart', 'Fully plant-based menu'],
    ...docs,
  ].filter(Boolean);
};
const reqListHTML = e => `<ul class="org-reqs">${reqItems(e).map(([i, l]) => `<li><span class="org-reqs-ic">${ic(i, 'ic-sm')}</span>${esc(l)}</li>`).join('')}</ul>`;
const fillHTML = e => `<div class="org-fill">${N.bar(fillPct(e), 'violet')}<span class="mono">${e.filled}/${e.pitches}</span></div>`;
const cbBtn = (on, act, attrs = '', label = 'Select') => `<button type="button" class="org-cb" role="checkbox" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}" ${attrs}>${ic(on === 'mixed' ? 'minus' : 'check')}</button>`;
const statTile = (key, label, val, sub, tone = '') => `<div class="stat ${tone}"><span class="lbl">${esc(label)}</span><b class="num" data-tw="${key}" data-to="${val}">${Number(val).toLocaleString('en-GB')}</b>${sub ? `<span class="s">${sub}</span>` : ''}</div>`;
function tweenStats(root) {
  const prev = sDash().prev;
  $$('[data-tw]', root).forEach(el => { const k = el.dataset.tw, to = +el.dataset.to, from = prev[k] ?? 0; prev[k] = to; if (from === to) return; el.dataset.v = from; el.textContent = from; N.tween(el, to); });
}
/* re-render one results container (search-as-you-type keeps focus in the input) */
const swap = (sel, html) => { const box = $(sel); if (box) { box.innerHTML = html; N.applyNotes(); } };

/* =====================================================================
   REVIEW DRAWER (shared by dashboard, event applications, all applications)
   ===================================================================== */
const DECLINE_DEFAULT = cs => { const f = cs.filter(c => c.st === 'fail'); return f.length ? `Doesn't meet: ${f.map(c => c.miss).join(', ')}.` : 'Line-up is full for this cuisine.'; };
const warnName = c => c.label.replace(/ valid on event day$/, '');
const nextPitch = eid => { const taken = appsFor(eid).filter(a => a.st === 'approved').map(a => String(a.pitch)); let i = 1; while (taken.includes(String(i))) i++; return String(i); };

/* decide(ids, status, note) → returns undo fn, or null if nothing changed */
function decide(ids, st, note) {
  const snaps = [], sent = [];
  [].concat(ids).forEach(id => {
    const a = findApp(id); if (!a || a.st === st) return;
    const e = ev(a.e);
    if (st === 'approved' && e.filled >= e.pitches) { N.toast(`All ${e.pitches} pitches at ${esc(e.name)} are filled. Add pitches in Edit first.`, { icon: 'alert' }); return; }
    snaps.push({ a, st: a.st, rec: a.rec, q: a.q, pitch: a.pitch, log: a.log ? a.log.slice() : undefined, e, filled: e.filled });
    if (st === 'approved') { e.filled = Math.min(e.pitches, e.filled + 1); if (!a.pitch) a.pitch = nextPitch(a.e); }
    else if (a.st === 'approved') e.filled = Math.max(0, e.filled - 1);
    const cs = N.evalChecks(a.t, a.e), w = cs.find(c => c.st === 'warn');
    const n = (note || '').trim() || (st === 'approved' ? (w ? `Accepted on condition that the ${warnName(w)} certificate is renewed before ${N.fShort(e.date)}.` : 'All requirements met.') : st === 'rejected' ? DECLINE_DEFAULT(cs) : 'Could you share a photo of your set-up and your menu prices?');
    a.st = st; a.rec = nowRec(n);
    (a.log = a.log || []).push({ st, ...a.rec });
    if (st === 'info') a.q = [n];
    if (a.t === db.me.trader) {
      const msg = { approved: ['ok', `Approved for ${e.name}`, `Pitch ${a.pitch} · Reed Events.`], rejected: ['warn', `Reed Events declined your application to ${e.name}`, n], info: ['warn', 'Reed Events asked a question', `${e.name} · ${n}`] }[st];
      if (msg) sent.push(pushNote('trader', { tone: msg[0], title: msg[1], text: msg[2], go: 'trader/applications' }));
    }
  });
  if (!snaps.length) return null;
  return () => {
    snaps.slice().reverse().forEach(s => { Object.assign(s.a, { st: s.st, rec: s.rec, q: s.q, pitch: s.pitch }); if (s.log) s.a.log = s.log; else delete s.a.log; s.e.filled = s.filled; });
    sent.forEach(id => dropNote('trader', id));
  };
}
const DECIDED = { approved: 'Accepted', rejected: 'Declined', info: 'Question sent to' };
function decideToast(ids, st, undo) {
  const list = [].concat(ids).map(findApp).filter(Boolean);
  const a = list[0], e = ev(a.e);
  const msg = list.length > 1 ? `${DECIDED[st]} ${N.plural(list.length, 'trader')}${st === 'approved' ? ` · ${esc(e.name)} is now ${fillPct(e)}% full` : ''}.`
    : st === 'approved' ? `Accepted <b>${esc(T(a.t).biz)}</b> for ${esc(e.name)} · pitch ${esc(a.pitch)}.`
    : st === 'rejected' ? `Declined <b>${esc(T(a.t).biz)}</b>. They'll see your note.`
    : `Question sent to <b>${esc(T(a.t).person)}</b> (prototype).`;
  N.toast(msg, { undo: () => { undo(); N.refresh(); if (N.drawerOpen() && $('#drawer').classList.contains('org-rev-dr')) drawReview(); N.toast('Decision undone.', { icon: 'history' }); } });
}

/* accepting someone who misses a rule needs an explicit "anyway" */
function guardAccept(ids, st, run) {
  if (st !== 'approved') { run(); return; }
  const bad = [].concat(ids).map(findApp).filter(a => a && !N.sumChecks(N.evalChecks(a.t, a.e)).can);
  if (!bad.length) { run(); return; }
  const one = bad.length === 1 && [].concat(ids).length === 1, a = bad[0];
  N.confirm({ title: one ? `Accept ${T(a.t).biz} anyway?` : `${N.plural(bad.length, 'trader')} miss a requirement`,
    text: one ? `They don't meet: ${esc(N.evalChecks(a.t, a.e).filter(c => c.st === 'fail').map(c => c.miss).join(', '))}. The rules you set for ${esc(ev(a.e).name)} say no.` : `${bad.map(x => esc(T(x.t).biz)).join(', ')} don't meet every rule for their event. Accept them anyway?`,
    confirm: 'Accept anyway', onConfirm: run });
}
function openReview(id, ids) {
  const r = sRev();
  r.ids = (ids && ids.length ? ids : [id]).map(String);
  if (!r.ids.includes(String(id))) r.ids.unshift(String(id));
  r.i = r.ids.indexOf(String(id));
  drawReview();
}
const answers = (a, t) => [
  ['What will you serve?', t.bio],
  ['Trading unit and size', a.unit || 'Gazebo stall · 3 × 3 m'],
  ['Power and water', `${t.power ? `Needs ${t.power}` : 'No power needed'} · ${t.gas ? 'cooks with LPG' : 'no gas'} · brings own water`],
  ['Typical price range', t.categories?.includes('Beverages') ? '£3–£6' : t.categories?.includes('Desserts') ? '£4–£8' : '£7–£12'],
];
function drawReview() {
  const r = sRev(), a = findApp(r.ids[r.i]);
  if (!a) { N.closeDrawer(); return; }
  const t = T(a.t), e = ev(a.e), cs = N.evalChecks(a.t, a.e), s = N.sumChecks(cs), rd = N.readiness(a.t);
  const warns = cs.filter(c => c.st === 'warn'), fails = cs.filter(c => c.st === 'fail');
  const banner = s.cls === 'ok' ? ['ok', 'check-circle', `Meets every requirement for ${e.name}.`]
    : s.cls === 'warn' ? ['warn', 'clock', `Meets the rules today, but ${warns.map(c => `${warnName(c)}: ${c.val}`).join('; ')}. You can accept with a condition.`]
    : ['risk', 'alert', `${s.txt}: ${fails.map(c => c.miss).join(', ')}.`];
  const log = (a.log && a.log.length ? a.log.slice().reverse() : a.rec ? [{ st: a.st, ...a.rec }] : []);
  const acceptLbl = a.st === 'approved' ? 'Accepted' : fails.length ? 'Accept anyway' : warns.length ? 'Accept with condition' : 'Accept';
  N.openDrawer(`
    <header class="dr-head">
      ${N.ring(rd, 'sm ' + (rd >= 90 ? '' : 'warn'), '')}
      <div class="dr-ti" tabindex="-1" autofocus><h3>${esc(t.biz)}</h3><p>${esc(t.person)} · ${esc(t.food)} · ${esc(t.city)}</p></div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button>
    </header>
    <div class="org-rev-nav">
      <div class="org-rev-ev">${N.evd(e.date, 'side')}<div><b>${esc(e.name)}</b><span>Applied ${N.rel(a.at).toLowerCase()} · ${N.statusChip(N.appLabel, a.st)}</span></div></div>
      <div class="org-rev-pg"><span class="mono">${r.i + 1} of ${r.ids.length}</span><button type="button" class="icon-btn sm" data-act="org_revMove" data-d="-1" ${r.i === 0 ? 'disabled' : ''} aria-label="Previous application (K)">${ic('chevron-up')}</button><button type="button" class="icon-btn sm" data-act="org_revMove" data-d="1" ${r.i >= r.ids.length - 1 ? 'disabled' : ''} aria-label="Next application (J)">${ic('chevron-down')}</button></div>
    </div>
    <div class="dr-body">
      <div class="banner ${banner[0]}" data-note="Each applicant is checked against this event's own requirements: met, missing, or expiring before event day.">${ic(banner[1])}<span class="grow">${esc(banner[2])}</span></div>
      <section><h4 class="dr-h">Requirements for this event</h4>${N.reqList(cs)}</section>
      <section><h4 class="dr-h">Trading unit</h4>${N.kv([['Unit', esc(a.unit || 'Gazebo stall · 3 × 3 m')], ['Power', esc(t.power || 'None')], ['Gas', t.gas ? 'LPG appliances' : 'No gas'], ['Hygiene rating', `${t.fhrs} · ${esc(N.FHRS[t.fhrs])}`], ['Liability cover', `£${t.pli}m`], ['Trading since', t.since]])}</section>
      <section><h4 class="dr-h">Their answers</h4><dl class="org-qa">${answers(a, t).map(([q, v]) => `<div><dt>${esc(q)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        ${a.st === 'info' && a.q ? `<div class="org-askd">${ic('message', 'ic-sm')}<div><b>Your question, waiting for ${esc(first(a.t))}</b>${a.q.map(q => `<span>${esc(q)}</span>`).join('')}</div></div>` : ''}</section>
      <section><h4 class="dr-h">Decision record</h4>
        <ol class="org-tl">${log.map(l => `<li class="${N.appLabel[l.st]?.[0] || ''}"><b>${esc(N.appLabel[l.st]?.[1] || l.st)}</b><span>${esc(l.by)} · ${esc(l.when)}</span>${l.note ? `<p>${esc(l.note)}</p>` : ''}</li>`).join('')}<li><b>Applied</b><span>${esc(t.person)} · ${N.rel(a.at)}</span></li></ol>
      </section>
      <label class="field"><span>Note for the record <span class="hint">Shared with the trader if you decline or ask a question</span></span><textarea class="ta" id="org_revNote" rows="3" placeholder="${esc(s.cls === 'warn' ? `e.g. Please upload the renewed ${warns[0] ? warnName(warns[0]) : ''} certificate before ${N.fShort(e.date)}.` : 'Add a note, or leave blank to use the standard wording.')}"></textarea></label>
    </div>
    <footer class="dr-foot">
      <div class="org-rev-btns" data-note="Decisions and notes are saved to a record, with undo and keyboard shortcuts.">
        <button type="button" class="btn btn-danger-line btn-sm" data-act="org_revDecide" data-st="rejected" ${a.st === 'rejected' ? 'disabled' : ''}>${ic('x')}${a.st === 'rejected' ? 'Declined' : 'Decline'}</button>
        <button type="button" class="btn btn-line btn-sm" data-act="org_revDecide" data-st="info" ${a.st === 'info' ? 'disabled' : ''}>${ic('message')}Ask a question</button>
        <button type="button" class="btn btn-side btn-sm" data-act="org_revDecide" data-st="approved" ${a.st === 'approved' ? 'disabled' : ''}>${ic('check')}${acceptLbl}</button>
      </div>
      <p class="org-keys"><kbd>J</kbd><kbd>K</kbd> move <kbd>A</kbd> accept <kbd>D</kbd> decline <kbd>Esc</kbd> close</p>
    </footer>`, 'org-rev-dr');
  $$('tr[data-id]').forEach(tr => tr.classList.toggle('sel', tr.dataset.id === String(a.id)));
}
const revOpen = () => N.drawerOpen() && $('#drawer').classList.contains('org-rev-dr');
function revMove(d) { const r = sRev(), i = r.i + d; if (i < 0 || i >= r.ids.length) { N.toast(d > 0 ? 'That was the last application in this list.' : 'This is the first application.', { icon: 'info' }); return; } r.i = i; drawReview(); }
function revDecide(st) {
  const r = sRev(), id = r.ids[r.i], note = $('#org_revNote')?.value || '';
  guardAccept(id, st, () => {
    const undo = decide(id, st, note); if (!undo) return;
    N.refresh();
    if (r.i < r.ids.length - 1) r.i++;
    drawReview();
    decideToast(id, st, undo);
  });
}
/* keyboard: J/K move, A accept, D decline (Esc is handled by core) */
document.addEventListener('keydown', e => {
  if (document.body.dataset.app !== APP || !revOpen() || N.modalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
  const k = e.key.toLowerCase();
  if (k === 'j') { e.preventDefault(); revMove(1); }
  else if (k === 'k') { e.preventDefault(); revMove(-1); }
  else if (k === 'a') { e.preventDefault(); if (findApp(sRev().ids[sRev().i])?.st !== 'approved') revDecide('approved'); }
  else if (k === 'd') { e.preventDefault(); if (findApp(sRev().ids[sRev().i])?.st !== 'rejected') revDecide('rejected'); }
});

Object.assign(N.act, {
  org_view(el) { const box = el.closest('[data-ids]'); openReview(el.dataset.id, box ? box.dataset.ids.split(',') : null); },
  org_revMove(el) { revMove(+el.dataset.d); },
  org_revDecide(el) { revDecide(el.dataset.st); },
  org_quick(el) { const { id, st } = el.dataset; guardAccept(id, st, () => { const undo = decide(id, st); if (!undo) return; N.refresh(); decideToast(id, st, undo); }); },
});

/* ---------- invite modal (event page + invite traders) ---------- */
const invited = (tid, eid) => db.invites.some(i => i.t === tid && i.e === eid && i.from === ME);
const applied = (tid, eid) => db.apps.some(a => a.t === tid && a.e === eid);
function openInvite(tid, eid) {
  const t = T(tid), e = ev(eid), m = N.matchScore(tid, eid);
  const msg = `Hi ${first(tid)}, we'd love ${t.biz} at ${e.name} on ${N.fShort(e.date)}. Your passport already meets our requirements, so you can apply in one tap.\n\nOlivia, Reed Events`;
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Invite to apply</p><h3>Invite ${esc(first(tid))} to ${esc(e.name)}</h3></div>
    <div class="org-inv-who">${N.tav(tid, 'lg')}<div><b>${esc(t.biz)}</b><span>${esc(t.person)} · ${esc(t.cuisine)} · ${esc(t.city)}</span></div><div class="org-match"><b class="num">${m}%</b><span>match</span></div></div>
    <form data-form="org_sendInvite" class="stack" style="--g:14px"><input type="hidden" name="t" value="${esc(tid)}"><input type="hidden" name="e" value="${esc(eid)}">
      ${N.field({ label: 'Message', id: 'org_invMsg', type: 'textarea', value: msg, rows: 6, hint: 'Sent by email and shown in their Invitations' })}
      <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">${ic('send')}Send invitation</button></div>
    </form>`);
}
N.forms.org_sendInvite = (f, d) => {
  const inv = { id: N.uid('i'), t: d.t, e: d.e, from: ME, at: 0, st: 'open', msg: (d.org_invMsg || '').trim() };
  db.invites.unshift(inv);
  const nid = d.t === db.me.trader ? pushNote('trader', { tone: 'info', title: `You've been invited to apply to ${ev(d.e).name}`, text: 'Reed Events sent an invitation.', go: 'trader/invitations' }) : null;
  N.closeModal(); N.refresh();
  N.toast(`Invitation sent to <b>${esc(T(d.t).person)}</b> (prototype email).`, { icon: 'send', undo: () => { const i = db.invites.indexOf(inv); if (i > -1) db.invites.splice(i, 1); if (nid) dropNote('trader', nid); N.refresh(); } });
};
N.act.org_invite = el => openInvite(el.dataset.t, el.dataset.e);

/* trader passport drawer (invite and eligible lists) */
N.act.org_passport = el => {
  const tid = el.dataset.t, eid = el.dataset.e, t = T(tid);
  N.openDrawer(`<header class="dr-head">${N.tav(tid, 'lg')}<div class="dr-ti"><h3>${esc(t.biz)}</h3><p>${esc(t.person)} · ${esc(t.food)} · ${esc(t.city)}</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
    <div class="dr-body">${N.passportCard(tid, { sid: 'org' })}
      ${eid && ev(eid) ? `<section><h4 class="dr-h">Against ${esc(ev(eid).name)}</h4>${N.reqList(N.evalChecks(tid, eid))}</section>` : ''}
      <section><h4 class="dr-h">About</h4><p class="ink-2">${esc(t.bio)}</p><div class="tags" style="margin-top:10px">${(t.tags || []).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></section></div>
    ${eid && ev(eid) ? `<footer class="dr-foot">${applied(tid, eid) ? `<span class="chip info">Already applied</span>` : invited(tid, eid) ? `<button type="button" class="btn btn-line btn-sm" disabled>${ic('check')}Invited</button>` : `<button type="button" class="btn btn-side btn-sm" data-act="org_invite" data-t="${tid}" data-e="${eid}">${ic('send')}Invite to ${esc(ev(eid).name)}</button>`}</footer>` : ''}`);
};

/* =====================================================================
   1 · DASHBOARD
   ===================================================================== */
function attention() {
  const out = [], hidden = sDash().hidden;
  myApps().filter(a => ['pending', 'info', 'approved'].includes(a.st) && isActive(ev(a.e))).forEach(a => {
    N.evalChecks(a.t, a.e).filter(c => c.st === 'warn').forEach(c => {
      const e = ev(a.e), t = T(a.t), open = a.st !== 'approved';
      out.push({ key: `w-${a.id}-${c.key}`, tone: 'warn', icon: 'clock',
        title: c.key === 'gas' ? `${t.biz}’s Gas Safety Certificate ${c.val.replace(/^Expires/, 'expires')} ${e.name}` : `${t.biz}: ${c.label} is ${c.val.toLowerCase()} for ${e.name}`,
        text: open ? `${N.appLabel[a.st][1]} · accept with a condition or ask for the renewal.` : `Accepted for pitch ${a.pitch}. Ask for the renewed certificate before event day.`,
        acts: open ? `<button type="button" class="btn btn-line btn-xs" data-act="org_view" data-id="${a.id}">Review</button>` : `<button type="button" class="btn btn-line btn-xs" data-act="org_remind" data-t="${a.t}" data-e="${a.e}">Ask for renewal</button>` });
    });
  });
  myIds().sort(byDate).forEach(id => {
    const e = ev(id), d = N.daysFrom(e.date);
    if (N.eventState(e) === 'upcoming' && d <= 45 && fillPct(e) < 40) out.push({ key: `f-${id}`, tone: 'risk', icon: 'users', title: `${e.name} is ${fillPct(e)}% full with ${N.plural(d, 'day')} to go`, text: `${e.pitches - e.filled} pitches open. Invite traders who already meet your rules.`, acts: `<button type="button" class="btn btn-side btn-xs" data-act="org_inviteFor" data-e="${id}">${ic('user-plus')}Invite traders</button>` });
    const dl = e.deadline ? N.daysFrom(e.deadline) : 99, p = pendingOf(id);
    if (isActive(e) && dl >= 0 && dl <= 2 && p) out.push({ key: `d-${id}`, tone: 'info', icon: 'calendar', title: `${e.name} closes to applications ${dl === 0 ? 'today' : dl === 1 ? 'tomorrow' : 'in 2 days'}`, text: `${N.plural(p, 'application')} still waiting for a decision.`, acts: `<button type="button" class="btn btn-line btn-xs" data-go="org/manage-events/${id}/applications">Review ${p}</button>` });
    if (e.status === 'draft') out.push({ key: `p-${id}`, tone: 'plain', icon: 'edit', title: `${e.name} is still a draft`, text: `Traders can't see it yet. ${N.fLong(e.date)} · ${e.pitches} pitches.`, acts: `<button type="button" class="btn btn-line btn-xs" data-go="org/manage-events/${id}/edit">Edit</button><button type="button" class="btn btn-side btn-xs" data-act="org_publish" data-e="${id}">Publish</button>` });
  });
  return out.filter(x => !hidden[x.key]);
}
function dashboard() {
  const ids = myIds(), apps = myApps(), pend = apps.filter(a => a.st === 'pending').sort((a, b) => a.at - b.at);
  const h = N.TODAY.getHours(), part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const act = ids.filter(id => isActive(ev(id))).sort(byDate);
  const byEv = {}; pend.forEach(a => byEv[a.e] = (byEv[a.e] || 0) + 1);
  const spots = act.reduce((s, id) => s + ev(id).pitches, 0), filled = act.reduce((s, id) => s + ev(id).filled, 0);
  const approved = apps.filter(a => a.st === 'approved').length, decided = apps.filter(a => ['approved', 'rejected'].includes(a.st)).length;
  const drafts = ids.filter(id => ev(id).status === 'draft').length;
  const recent = apps.slice().sort((a, b) => b.at - a.at).slice(0, 5);
  const att = attention();
  const top = Object.keys(db.traders).filter(t => T(t).status === 'approved').sort((a, b) => N.readiness(b) - N.readiness(a));

  return `${N.pageHead(`Good ${part}, Olivia`, `${N.fd(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })} · ${N.plural(act.length, 'event')} coming up`, `<button type="button" class="btn btn-line btn-sm" data-go="org/manage-events">${ic('calendar')}Manage events</button><button type="button" class="btn btn-side btn-sm" data-go="org/create-event">${ic('plus')}Create event</button>`, 'Reed Events')}

  <section class="blk blk-lilac org-decide" data-note="The live dashboard says 'Welcome back, organiser' in the header and 'Welcome back, Olivia' again in the page. The greeting now appears once, and the first block is what needs a decision.">
    <div class="org-decide-n">
      <p class="eyebrow">Needs a decision</p>
      <div class="org-decide-row"><b class="num org-big" data-tw="pend" data-to="${pend.length}">${pend.length}</b><p class="org-decide-t">${pend.length ? `${pend.length === 1 ? 'application is' : 'applications are'} waiting for you.<span>Oldest applied ${N.rel(pend[0].at).toLowerCase()}.</span>` : `You're all caught up.<span>New applications land here first.</span>`}</p></div>
    </div>
    <div class="org-decide-r">
      ${pend.length ? `<div class="org-evchips">${Object.keys(byEv).sort(byDate).map(id => `<button type="button" class="org-evchip" data-go="org/manage-events/${id}/applications"><span>${esc(ev(id).name)}</span><b>${byEv[id]}</b></button>`).join('')}</div>
      <div class="btn-row"><button type="button" class="btn btn-violet" data-act="org_reviewNow">${ic('inbox')}Review now</button><button type="button" class="btn btn-ghost btn-sm" data-go="org/applications">See all applications</button></div>`
      : `<div class="btn-row"><button type="button" class="btn btn-violet" data-act="org_inviteFor">${ic('user-plus')}Invite traders</button></div>`}
    </div>
  </section>

  <div class="stats">
    ${statTile('events', 'My events', ids.filter(id => ev(id).status !== 'cancelled').length, `${act.length} active · ${N.plural(drafts, 'draft')}`)}
    ${statTile('spots', 'Total spots', spots, `${filled} filled across active events`)}
    ${statTile('apps', 'Applications', apps.length, `${pend.length} pending · ${apps.filter(a => a.st === 'info').length} need info`)}
    ${statTile('ok', 'Accepted', approved, decided ? `${Math.round(approved / decided * 100)}% of decisions` : 'No decisions yet', 'tone-mint')}
  </div>

  <div class="grid g-main">
    <div class="stack" style="--g:22px;min-width:0">
      <section class="card">
        <div class="card-h"><h3>Active events</h3><button type="button" class="link" data-go="org/manage-events">All events${ic('arrow-right')}</button></div>
        ${act.length ? `<div class="org-evrows">${act.map(id => { const e = ev(id), p = pendingOf(id); return `<button type="button" class="org-evrow" data-go="org/manage-events/${id}">
          ${N.evd(e.date, 'side')}
          <span class="org-evrow-m"><b>${esc(e.name)}</b><span>${toGo(e)} · ${esc(e.city)}</span></span>
          <span class="org-evrow-f">${fillHTML(e)}<span class="xs muted">pitches filled</span></span>
          <span class="org-evrow-p">${p ? N.chip('info', `${p} pending`) : N.chip('plain', 'Up to date')}</span></button>`; }).join('')}</div>`
        : N.empty('No active events', 'Publish an event and it will show here with its fill rate.', `<button type="button" class="btn btn-side btn-sm" data-go="org/create-event">Create event</button>`, 'calendar')}
      </section>
      <section class="card">
        <div class="card-h"><h3>Recent applications</h3><button type="button" class="link" data-go="org/applications">View all${ic('arrow-right')}</button></div>
        <div class="list" data-ids="${recent.map(a => a.id).join(',')}">${recent.map(a => { const t = T(a.t); return `<div class="li">${N.tav(a.t)}<div class="li-main"><b>${esc(t.biz)}</b><span>${esc(ev(a.e).name)} · ${N.rel(a.at)}</span></div><div class="li-end">${N.statusChip(N.appLabel, a.st)}<button type="button" class="btn btn-line btn-xs" data-act="org_view" data-id="${a.id}">View</button></div></div>`; }).join('')}</div>
      </section>
    </div>
    <div class="stack" style="--g:22px;min-width:0">
      <section class="card">
        <div class="card-h"><h3>Needs attention</h3>${att.length ? `<span class="count warn">${att.length}</span>` : ''}</div>
        ${att.length ? `<ul class="org-attn">${att.slice(0, sDash().allAttn ? att.length : 4).map(x => `<li class="${x.tone}"><span class="org-attn-ic">${ic(x.icon, 'ic-sm')}</span><div class="org-attn-b"><b>${esc(x.title)}</b><span>${esc(x.text)}</span><div class="btn-row">${x.acts}</div></div><button type="button" class="icon-btn sm" data-act="org_dismiss" data-k="${x.key}" aria-label="Dismiss">${ic('x', 'ic-sm')}</button></li>`).join('')}</ul>${att.length > 4 ? `<button type="button" class="btn btn-ghost btn-sm btn-block org-more" data-act="org_attnMore">${sDash().allAttn ? 'Show fewer' : `Show all ${att.length}`}${ic(sDash().allAttn ? 'chevron-up' : 'chevron-down')}</button>` : ''}`
        : N.empty('Nothing needs you', 'Expiring documents, slow-filling events and drafts will show here.', '', 'check')}
      </section>
      <section class="card org-topcard">
        <div class="avs">${top.slice(0, 5).map(t => N.tav(t)).join('')}</div>
        <h3 class="h3">Invite top traders</h3>
        <p class="small muted">${top.length} traders have a complete, checked passport. Invite the ones that fit before your events fill up.</p>
        <button type="button" class="btn btn-ink btn-sm" data-go="org/invite-traders">Browse profile-complete traders${ic('arrow-right')}</button>
      </section>
    </div>
  </div>`;
}
N.page('org/dashboard', { app: APP, title: 'Dashboard', nav: 'org/dashboard', render: dashboard, after: tweenStats });

function publishEvent(id) {
  const e = ev(id); if (!e) return;
  if (!e.date || !e.name) { N.go(`org/manage-events/${id}/edit`); N.toast('Add a name and a date before publishing.', { icon: 'alert' }); return; }
  const was = e.status; e.status = 'published';
  const nid = pushNote('admin', { tone: 'ok', title: `Reed Events published ${e.name}`, text: `${e.pitches} pitches · ${N.fShort(e.date)}.`, go: 'admin/events', unread: false });
  N.refresh();
  N.toast(`<b>${esc(e.name)}</b> is published. Traders can apply now.`, { icon: 'rocket', undo: () => { e.status = was; dropNote('admin', nid); N.refresh(); } });
}
Object.assign(N.act, {
  org_reviewNow() {
    const s = sApps(); Object.assign(s, { st: 'pending', ev: 'all', q: '' }); s.sel.clear();
    N.go('org/applications');
    const ids = appsList().map(a => a.id);
    if (ids.length) openReview(ids[0], ids);
  },
  org_inviteFor(el) { const s = sInv(); if (el.dataset.e) s.e = el.dataset.e; s.page = 1; s.f = 'eligible'; N.go('org/invite-traders'); },
  org_remind(el) { N.toast(`Reminder sent to <b>${esc(T(el.dataset.t).person)}</b> to renew before ${esc(ev(el.dataset.e).name)} (prototype).`, { icon: 'send' }); },
  org_attnMore() { const d = sDash(); d.allAttn = !d.allAttn; N.refresh(); },
  org_dismiss(el) { const h = sDash().hidden, k = el.dataset.k; h[k] = true; N.refresh(); N.toast('Hidden from Needs attention.', { undo: () => { delete h[k]; N.refresh(); } }); },
  org_publish(el) { publishEvent(el.dataset.e); },
});

/* =====================================================================
   2 · BUSINESS INFO (verify your organisation)
   ===================================================================== */
const sBiz = () => S('org_biz', { step: 0 });
const CO_TYPES = [['ltd', 'Limited company'], ['sole', 'Sole trader'], ['partnership', 'Partnership'], ['charity', 'Charity'], ['council', 'Council']];
const countyOpts = (country, val) => [['', 'Choose a county'], ...db.states.filter(s => s.country === country).map(s => s.name), ...(val && !db.states.some(s => s.name === val && s.country === country) ? [val] : [])];
const VERIFY = { approved: ['ok', 'Approved'], pending: ['warn', 'In review'], rejected: ['risk', 'Changes needed'], none: ['plain', 'Not submitted'] };
/* stepper whose steps can be clicked to jump back (or forward when allowed) */
const clickSteps = (steps, i, act, max = steps.length - 1) => { let k = 0; return N.stepper(steps, i).replace(/<li class="([^"]*)">/g, (m, c) => { const n = k++; return n <= max ? `<li class="${c} org-step-click" data-act="${act}" data-s="${n}" role="button" aria-label="Go to step ${n + 1}: ${esc(steps[n])}">` : m; }); };
function bizPage() {
  const o = org(), s = sBiz(), [fn, ...ln] = o.person.split(' ');
  o.country = o.country || 'United Kingdom';
  o.social = o.social || { instagram: '@reedevents', facebook: 'facebook.com/reedevents', linkedin: '' };
  o.verifyDoc = o.verifyDoc || { file: `companies-house-${o.regNo}.pdf`, size: '212 KB', uploaded: '2025-11-02', checked: '2025-11-04' };
  const v = VERIFY[o.verify] || VERIFY.none;
  const steps = ['Basic details', 'Personal info', 'Compliance review'];
  const foot = (back, label = 'Save & continue') => `<div class="org-wiz-foot">${back ? `<button type="button" class="btn btn-ghost btn-sm" data-act="org_bizStep" data-s="${s.step - 1}">${ic('arrow-left')}Back</button>` : '<span></span>'}<span class="mono xs muted">Step ${s.step + 1} of 3</span><button type="submit" class="btn btn-ink btn-sm">${label}${ic('arrow-right')}</button></div>`;
  let body = '';
  if (s.step === 0) body = `<form class="card stack" data-form="org_biz0" style="--g:20px">
      <div><h3 class="h3">Basic details</h3><p class="small muted">As registered with Companies House or your council.</p></div>
      <div class="form-grid">
        ${N.field({ label: 'Company name', id: 'company', value: o.company, req: true })}
        ${N.field({ label: 'Trading name', id: 'trading', value: o.trading || o.company, hint: 'If different' })}
        ${N.field({ label: 'Registration number', id: 'regNo', value: o.regNo, hint: 'Companies House or charity number' })}
        ${N.field({ label: 'Company type', id: 'type', value: o.type, opts: CO_TYPES, req: true })}
        ${N.field({ label: 'Registered address', id: 'address', value: o.address, full: true, req: true })}
        ${N.field({ label: 'Country', id: 'country', value: o.country, opts: db.countries.filter(c => c.enabled).map(c => c.name), attrs: 'data-change="org_bizCountry"' })}
        <div id="org_bizCounty">${N.field({ label: 'County', id: 'county', value: o.county, opts: countyOpts(o.country, o.county) })}</div>
        ${N.field({ label: 'Website', id: 'website', value: o.website, ph: 'yourcompany.co.uk', full: true })}
      </div>
      <div class="stack" style="--g:10px"><span class="lbl">Social links</span><div class="org-social">
        <label class="search">${ic('instagram')}<span class="sr">Instagram</span><input name="instagram" value="${esc(o.social.instagram)}" placeholder="@handle"></label>
        <label class="search">${ic('facebook')}<span class="sr">Facebook</span><input name="facebook" value="${esc(o.social.facebook)}" placeholder="facebook.com/page"></label>
        <label class="search">${ic('linkedin')}<span class="sr">LinkedIn</span><input name="linkedin" value="${esc(o.social.linkedin)}" placeholder="linkedin.com/company/…"></label>
      </div></div>
      ${foot(false)}
    </form>`;
  else if (s.step === 1) body = `<form class="card stack" data-form="org_biz1" style="--g:20px">
      <div><h3 class="h3">Personal info</h3><p class="small muted">The person traders and the Niche team will talk to.</p></div>
      <div class="form-grid">
        ${N.field({ label: 'First name', id: 'first', value: fn, req: true })}
        ${N.field({ label: 'Last name', id: 'last', value: ln.join(' '), req: true })}
        ${N.field({ label: 'Role in organisation', id: 'role', value: o.role, ph: 'e.g. Operations director', full: true })}
        ${N.field({ label: 'Email', id: 'email', type: 'email', value: o.email, req: true })}
        ${N.field({ label: 'Phone', id: 'phone', type: 'tel', value: o.phone })}
      </div>
      ${foot(true)}
    </form>`;
  else {
    const d = o.verifyDoc, up = o.verify !== 'approved';
    body = `<section class="card stack" style="--g:20px">
      <div class="row between"><div><h3 class="h3">Compliance review</h3><p class="small muted">A Companies House certificate or a council letter proves the organisation is real.</p></div>${N.statusChip(VERIFY, o.verify)}</div>
      <div class="org-verify ${v[0]}">
        <span class="org-verify-arch">${ic(o.verify === 'approved' ? 'shield' : o.verify === 'rejected' ? 'alert' : 'clock', 'ic-lg')}</span>
        <div><b>${o.verify === 'approved' ? 'Verified organisation' : o.verify === 'rejected' ? 'The Niche team needs a clearer document' : 'Waiting for the Niche team'}</b>
        <span>${o.verify === 'approved' ? `Checked ${N.fLong(d.checked)} by Niche compliance. Traders see a verified badge on your events.` : o.verify === 'rejected' ? esc(o.rejectReason || 'Please upload a readable copy.') : `Submitted ${N.fLong(d.uploaded)}. Reviews usually take one working day.`}</span></div>
      </div>
      <div class="org-file">${ic('file')}<div><b>${esc(d.file)}</b><span>${esc(d.size)} · uploaded ${N.fLong(d.uploaded)}</span></div><button type="button" class="btn btn-line btn-xs" data-act="org_viewDoc">${ic('eye')}View verification document</button></div>
      ${up ? `<label class="drop">${ic('upload', 'ic-lg')}<b>Drop a new document here, or choose a file</b><span>PDF, JPG or PNG up to 10 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" data-change="org_bizFile"></label>
        <div class="row between"><button type="button" class="btn btn-ghost btn-sm" data-act="org_bizSample">${ic('file')}Use sample file</button><button type="button" class="btn btn-side btn-sm" data-act="org_bizSubmit">${ic('send')}Submit for review</button></div>`
      : `<div class="org-wiz-foot"><button type="button" class="btn btn-ghost btn-sm" data-act="org_bizStep" data-s="1">${ic('arrow-left')}Back</button><span></span><button type="button" class="btn btn-line btn-sm" data-act="org_bizResubmit">${ic('edit')}Edit & resubmit</button></div>`}
    </section>`;
  }
  return `${N.pageHead('Verify your organisation', 'Niche checks every organiser once, so traders know your events are real.', '', 'Profile setup')}
  <div class="org-biz-sum" data-note="Verification status sits above the form, so Olivia can see she is approved without opening step 3.">${N.oav(ME, 'lg')}<div><b>${esc(o.company)}</b><span>${esc(o.person)} · ${esc(o.role)} · member since ${N.fLong(o.joined)}</span></div>${N.statusChip(VERIFY, o.verify)}</div>
  <div class="org-steps">${clickSteps(steps, s.step, 'org_bizStep')}</div>
  ${body}`;
}
N.page('org/business-info', { app: APP, title: 'Profile setup', nav: 'org/business-info', render: bizPage });
N.forms.org_biz0 = (f, d) => {
  const o = org();
  Object.assign(o, { company: d.company.trim() || o.company, trading: d.trading.trim(), regNo: d.regNo.trim(), type: d.type, address: d.address.trim(), country: d.country, county: d.county, website: d.website.trim(), social: { instagram: d.instagram, facebook: d.facebook, linkedin: d.linkedin } });
  sBiz().step = 1; N.refresh(); window.scrollTo(0, 0); N.toast('Basic details saved.');
};
N.forms.org_biz1 = (f, d) => {
  const o = org();
  Object.assign(o, { person: `${d.first.trim()} ${d.last.trim()}`.trim() || o.person, role: d.role.trim(), email: d.email.trim(), phone: d.phone.trim() });
  sBiz().step = 2; N.refresh(); window.scrollTo(0, 0); N.toast('Personal info saved.');
};
N.change.org_bizCountry = el => { const box = $('#org_bizCounty'); if (box) box.innerHTML = N.field({ label: 'County', id: 'county', value: '', opts: countyOpts(el.value, '') }); };
N.change.org_bizFile = el => { const f = el.files && el.files[0]; if (!f) return; org().verifyDoc = { file: f.name, size: Math.max(1, Math.round(f.size / 1024)) + ' KB', uploaded: todayISO(), checked: null, fresh: true }; N.refresh(); N.toast(`Attached <b>${esc(f.name)}</b>. Submit it for review when ready.`, { icon: 'upload' }); };
Object.assign(N.act, {
  org_bizStep(el) { sBiz().step = +el.dataset.s; N.refresh(); },
  org_bizSample() { const o = org(); o.verifyDoc = { file: `companies-house-certificate-${o.regNo}.pdf`, size: '198 KB', uploaded: todayISO(), checked: null, fresh: true }; N.refresh(); N.toast('Sample certificate attached.', { icon: 'file' }); },
  org_bizSubmit() {
    const o = org(); const was = o.verify; o.verify = 'pending';
    const nid = pushNote('admin', { tone: 'warn', title: 'Reed Events submitted organisation details', text: `Organiser verification · ${o.verifyDoc.file}`, go: `admin/organisers/${ME}` });
    N.refresh(); N.toast('Sent to the Niche team. Reviews usually take one working day.', { icon: 'send', undo: () => { o.verify = was; dropNote('admin', nid); N.refresh(); } });
  },
  org_bizResubmit() {
    N.confirm({ title: 'Edit and resubmit?', text: 'Your events stay live, but your verified badge is paused until the Niche team checks the new details.', confirm: 'Edit & resubmit', onConfirm: () => {
      const o = org(), was = o.verify; o.verify = 'pending';
      const nid = pushNote('admin', { tone: 'warn', title: 'Reed Events resubmitted organisation details', text: 'Organiser verification · waiting for compliance review.', go: `admin/organisers/${ME}` });
      sBiz().step = 0; N.refresh();
      N.toast('Resubmitted. Update any details, then upload the document in step 3.', { undo: () => { o.verify = was; dropNote('admin', nid); N.refresh(); } });
    } });
  },
  org_viewDoc() {
    const o = org(), d = o.verifyDoc;
    N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">${esc(d.file)}</p><h3>Verification document</h3></div>
      <div class="org-cert"><p class="mono xs">Companies House · Certificate of incorporation</p><b>${esc(o.company).toUpperCase()}</b><p>Company number <span class="mono">${esc(o.regNo)}</span></p><p class="small">The Registrar of Companies for England and Wales hereby certifies that the company named above is incorporated as a ${esc((CO_TYPES.find(c => c[0] === o.type) || CO_TYPES[0])[1].toLowerCase())}.</p><p class="small muted">Registered office: ${esc(o.address)}</p><span class="org-cert-seal">${ic('shield', 'ic-xl')}</span></div>
      <div class="modal-foot"><button type="button" class="btn btn-line btn-sm" data-act="demoToast" data-msg="Downloads are switched off in the prototype.">${ic('download')}Download</button><button type="button" class="btn btn-ink btn-sm" data-close>Close</button></div>`, 'wide');
  },
});

/* =====================================================================
   3 · NOTIFICATIONS
   ===================================================================== */
const sNotif = () => S('org_notif', { tab: 'all' });
const TONE_IC = { info: 'info', warn: 'alert', ok: 'check-circle', risk: 'alert' };
function notifPage() {
  const all = db.notifications.org, s = sNotif(), unread = all.filter(n => n.unread).length;
  const list = s.tab === 'unread' ? all.filter(n => n.unread) : all;
  return `${N.pageHead('Notifications', unread ? `${N.plural(unread, 'unread update')} about your events and traders.` : 'You are up to date.', `<button type="button" class="btn btn-line btn-sm" data-act="org_readAll" ${unread ? '' : 'disabled'}>${ic('check')}Mark all as read</button>`)}
  <div class="toolbar">${N.tabsHTML([['all', 'All', all.length], ['unread', 'Unread', unread]], s.tab, 'data-act="org_ntab" data-v')}</div>
  <section class="card org-notes">${list.length ? `<ul class="list">${list.map(n => `<li class="li org-note ${n.unread ? 'unread' : ''}"><span class="org-note-ic ${n.tone}">${ic(TONE_IC[n.tone] || 'bell', 'ic-sm')}</span><div class="li-main"><b>${esc(n.title)}</b><span>${esc(n.text)} · ${N.rel(n.at)}</span></div><div class="li-end">${n.unread ? `<button type="button" class="btn btn-ghost btn-xs" data-act="org_readOne" data-id="${n.id}">Mark as read</button>` : ''}<button type="button" class="btn btn-line btn-xs" data-act="org_openNote" data-id="${n.id}">View details${ic('arrow-right')}</button></div></li>`).join('')}</ul>`
    : N.empty('No unread notifications', 'New applications, expiring documents and payments will show here.', `<button type="button" class="btn btn-line btn-sm" data-act="org_ntab" data-v="all">Show all</button>`, 'bell')}</section>`;
}
N.page('org/notifications', { app: APP, title: 'Notifications', nav: 'org/notifications', render: notifPage });
Object.assign(N.act, {
  org_ntab(el) { sNotif().tab = el.dataset.v; N.refresh(); },
  org_readAll() { const l = db.notifications.org.filter(n => n.unread); l.forEach(n => n.unread = false); N.refresh(); N.toast(`Marked ${N.plural(l.length, 'notification')} as read.`, { undo: () => { l.forEach(n => n.unread = true); N.refresh(); } }); },
  org_readOne(el) { const n = db.notifications.org.find(x => x.id === el.dataset.id); if (n) n.unread = false; N.refresh(); },
  org_openNote(el) {
    const n = db.notifications.org.find(x => x.id === el.dataset.id); if (!n) return; n.unread = false;
    const m = n.title.match(/^(.+?) applied to (.+)$/);
    if (m) { const t = Object.keys(db.traders).find(k => T(k).biz === m[1]), eid = Object.keys(db.events).find(k => ev(k).name === m[2]); const a = db.apps.find(x => x.t === t && x.e === eid); if (a) { N.go(`org/manage-events/${eid}/applications`); openReview(a.id, appsFor(eid).map(x => x.id)); return; } }
    if (/Smokehouse Tom/.test(n.title)) { const a = db.apps.find(x => x.t === 'st' && x.e === 'brighton'); if (a) { N.go('org/manage-events/brighton/applications'); openReview(a.id, appsFor('brighton').map(x => x.id)); return; } }
    N.go(n.go);
  },
});

/* =====================================================================
   4 · EVENT FORM (shared by Create event wizard and the Edit tab)
   Each form lives inside [data-scope="ce"|"ed"]; inputs write straight
   into that scope's draft so nothing is lost between steps.
   ===================================================================== */
const DOC_DEFAULT = { pli: true, fhc: true, fsra: true, fbr: true, l2: false, gas: true, elec: false };
const blankDraft = () => ({ name: '', type: '', about: '', cuisines: [], venue: '', address: '', city: '', country: 'United Kingdom', county: '', date: '', end: '', time: '', deadline: '', footfall: '', pitches: '', frontage: '', power: '16A', water: true, gas: true, feeModel: 'pitch', feeAmount: '', feePct: '', docs: { ...DOC_DEFAULT }, allergen: true, fhrs: '4', pli: '5' });
const draftFrom = e => ({ name: e.name || '', type: e.type || '', about: e.about || '', cuisines: [...(e.cuisines || [])], venue: e.venue || '', address: e.address || '', city: e.city || '', country: e.country || 'United Kingdom', county: e.county || '', date: e.date || '', end: e.end || '', time: e.time || '', deadline: e.deadline || '', footfall: e.footfall ?? '', pitches: e.pitches ?? '', frontage: e.frontage ?? '', power: e.req?.power || '16A', water: e.water !== false, gas: !!e.req?.gas, feeModel: e.fee?.model || 'pitch', feeAmount: e.fee?.amount ?? '', feePct: e.fee?.pct ?? '', docs: e.docs ? { ...DOC_DEFAULT, ...e.docs } : { ...DOC_DEFAULT, gas: !!e.req?.gas, elec: !!e.req?.elec }, allergen: e.req?.allergen !== false, fhrs: String(e.req?.fhrs ?? 4), pli: String(e.req?.pli ?? 5) });
const applyDraft = (d, e = {}) => Object.assign(e, {
  name: d.name.trim(), type: d.type, about: d.about.trim(), cuisines: d.cuisines.slice(),
  venue: d.venue.trim(), address: d.address.trim(), city: d.city.trim(), country: d.country, county: d.county, region: d.county,
  date: d.date, end: d.end || d.date, time: d.time.trim(), deadline: d.deadline,
  footfall: +d.footfall || 0, pitches: Math.max(1, +d.pitches || 1), frontage: +d.frontage || 3, water: !!d.water,
  fee: d.feeModel === 'commission' ? { model: 'commission', pct: +d.feePct || 0 } : { model: 'pitch', amount: +d.feeAmount || 0 },
  req: { fhrs: +d.fhrs, pli: +d.pli, gas: !!d.gas, allergen: !!d.allergen, power: d.power, elec: !!d.docs.elec },
  docs: { ...d.docs },
});
const sCE = () => S('org_ce', () => ({ step: 0, max: 0, d: blankDraft(), err: {} }));
const sEd = () => S('org_ed', { id: null, d: null, err: {} });
const scopeState = sc => sc === 'ed' ? sEd() : sCE();

const fld = (sc, st, k, o) => {
  const err = st.err[k];
  let h = N.field({ id: `${sc}_${k}`, value: st.d[k] ?? '', ...o, attrs: `data-${o.opts ? 'change' : 'input'}="org_f" data-k="${k}" ${err ? 'aria-invalid="true"' : ''} ${o.attrs || ''}` });
  if (err) h = h.replace(/<\/label>$/, `<span class="org-err" role="alert">${ic('alert', 'ic-sm')}${esc(err)}</span></label>`);
  return h;
};
const countyFld = (sc, st) => fld(sc, st, 'county', { label: 'County / State', req: true, opts: countyOpts(st.d.country, st.d.county) });
const feeBox = (sc, st) => st.d.feeModel === 'commission'
  ? fld(sc, st, 'feePct', { label: 'Commission on takings', type: 'number', ph: '12', hint: '% of each trader’s sales', attrs: 'min="0" max="50" step="0.5" inputmode="decimal"' })
  : fld(sc, st, 'feeAmount', { label: 'Pitch fee per trader', type: 'number', ph: '150', hint: '£ for the whole event', attrs: 'min="0" step="5" inputmode="numeric"' });

const secBasics = (sc, st) => { const opts = [...new Set([...db.tags.cuisines, 'Street food', 'Desserts', 'Bar', ...st.d.cuisines])]; return `<div class="form-grid">
    ${fld(sc, st, 'name', { label: 'Event name', req: true, ph: 'e.g. Camden Night Market' })}
    ${fld(sc, st, 'type', { label: 'Event type', req: true, opts: [['', 'Choose a type'], ...db.tags.eventTypes] })}
    ${fld(sc, st, 'about', { label: 'Short description shown to traders', type: 'textarea', req: true, full: true, rows: 3, ph: 'Where it is, who comes, what the pitches are like.', attrs: 'maxlength="320"' })}
  </div>
  <div class="stack" style="--g:10px"><span class="lbl">Cuisines wanted <span class="hint">Optional. Helps us suggest traders</span></span>
    <div class="org-picks" role="group" aria-label="Cuisines wanted">${opts.map(c => `<button type="button" class="org-pick" aria-pressed="${st.d.cuisines.includes(c)}" data-act="org_cuisine" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`; };
const secLocation = (sc, st) => `<div class="form-grid">
    ${fld(sc, st, 'venue', { label: 'Venue', ph: 'e.g. Granary Square' })}
    ${fld(sc, st, 'city', { label: 'Town or city', ph: 'e.g. London' })}
    ${fld(sc, st, 'address', { label: 'Address', ph: 'Street and postcode', full: true })}
    ${fld(sc, st, 'country', { label: 'Country', req: true, opts: [['', 'Choose a country'], ...db.countries.filter(c => c.enabled).map(c => c.name)] })}
    <div id="${sc}_countyBox">${countyFld(sc, st)}</div>
    ${fld(sc, st, 'date', { label: 'Start date', type: 'date', req: true })}
    ${fld(sc, st, 'end', { label: 'End date', type: 'date', hint: 'Leave blank for one day' })}
    ${fld(sc, st, 'time', { label: 'Opening times', ph: '12:00–22:00' })}
    ${fld(sc, st, 'deadline', { label: 'Application deadline', type: 'date' })}
  </div>`;
const secPitches = (sc, st) => { const d = st.d; return `<div class="form-grid org-g3">
    ${fld(sc, st, 'footfall', { label: 'Expected footfall', type: 'number', ph: '5000', attrs: 'min="0" step="100" inputmode="numeric"' })}
    ${fld(sc, st, 'pitches', { label: 'Number of pitches', type: 'number', req: true, ph: '20', attrs: 'min="1" inputmode="numeric"' })}
    ${fld(sc, st, 'frontage', { label: 'Frontage width', type: 'number', ph: '4', hint: 'metres', attrs: 'min="1" step="0.5" inputmode="decimal"' })}
  </div>
  <div class="org-sets">
    <div class="org-set"><span class="lbl">Power available per pitch</span>${N.seg('power', [['None', 'None'], ['13A', '13A'], ['16A', '16A'], ['32A', '32A']], d.power)}</div>
    <div class="org-set"><span class="lbl">On site</span><div class="row" style="--g:22px">${N.toggle(`${sc}_water`, 'Water available', d.water, 'data-change="org_f" data-k="water"')}${N.toggle(`${sc}_gas`, 'Gas cooking allowed', d.gas, 'data-change="org_f" data-k="gas"')}</div></div>
    <div class="org-set"><span class="lbl">How you charge traders</span>${N.seg('feeModel', [['pitch', 'Pitch fee'], ['commission', 'Commission']], d.feeModel)}<div id="${sc}_feeBox" class="org-feebox">${feeBox(sc, st)}</div></div>
  </div>
  <div class="org-rules">
    <div><h4 class="h4">Compliance documents</h4><p class="small muted">Switch on a document to enforce it. Traders without it can't apply.</p></div>
    <div class="org-docs">${db.docTypes.filter(t => t.status === 'active').map(t => `<div class="org-doc">${N.toggle(`${sc}_doc_${t.id}`, t.name, !!d.docs[t.id], `data-change="org_f" data-k="docs.${t.id}"`)}<span class="xs muted">${esc(t.desc)}</span><span class="mtag">${esc(t.level)}</span></div>`).join('')}
      <div class="org-doc">${N.toggle(`${sc}_allergen`, 'Allergen information (14 allergens)', d.allergen, 'data-change="org_f" data-k="allergen"')}<span class="xs muted">Written allergen details for every dish, as Natasha's Law expects.</span><span class="mtag">Business</span></div></div>
    <div class="org-sets">
      <div class="org-set"><span class="lbl">Minimum food hygiene rating</span>${N.seg('fhrs', [['3', '3'], ['4', '4'], ['5', '5']], d.fhrs)}</div>
      <div class="org-set"><span class="lbl">Minimum public liability cover</span>${N.seg('pli', [['2', '£2m'], ['5', '£5m'], ['10', '£10m']], d.pli)}</div>
    </div>
  </div>`; };

/* live "N traders already qualify" panel */
const approvedTraders = () => Object.keys(db.traders).filter(t => T(t).status === 'approved');
function qualifying(d) {
  const tmp = '__org_preview', e = applyDraft(d, { org: ME, status: 'draft', filled: 0, tone: 'lilac' });
  if (!e.date) e.date = e.end = N.addDays(todayISO(), 30);
  db.events[tmp] = e;
  try { return approvedTraders().filter(tid => N.sumChecks(N.evalChecks(tid, tmp)).can).sort((a, b) => N.readiness(b) - N.readiness(a)); } finally { delete db.events[tmp]; }
}
const liveInner = q => { const tot = approvedTraders().length; return `<p class="eyebrow">Live check</p>
  <div class="org-live-n"><b class="num">${q.length}</b><span>of ${tot} checked traders on Niche already meet these requirements</span></div>
  ${N.bar(q.length / Math.max(1, tot) * 100, 'violet')}
  <div class="avs">${q.slice(0, 7).map(t => N.tav(t, 'sm')).join('')}${q.length > 7 ? `<span class="av sm violet">+${q.length - 7}</span>` : ''}</div>
  <p class="xs">${q.length < 5 ? 'Very few traders qualify. Loosening power or cover rules would widen the pool.' : 'Tighter rules mean fewer, safer applicants. Change a rule and watch this number.'}</p>`; };
const livePanel = (sc, st) => { const q = qualifying(st.d); return `<aside class="org-live blk-lilac" id="${sc}_live" data-n="${q.length}" aria-live="polite" data-note="Requirements are set per event, and the organiser sees how many checked traders already qualify before publishing.">${liveInner(q)}</aside>`; };
function updateLive(sc) {
  const box = $(`#${sc}_live`); if (!box) return;
  const q = qualifying(scopeState(sc).d), old = +(box.dataset.n || 0);
  box.innerHTML = liveInner(q); box.dataset.n = q.length;
  const n = $('.num', box); n.dataset.v = old; n.textContent = old; N.tween(n, q.length, 450);
}

function setField(el) {
  const scEl = el.closest('[data-scope]'), k = el.dataset.k; if (!scEl || !k) return;
  const sc = scEl.dataset.scope, st = scopeState(sc), d = st.d;
  const v = el.type === 'checkbox' ? el.checked : el.value;
  if (k.startsWith('docs.')) d.docs[k.slice(5)] = v; else d[k] = v;
  st.dirty = true;
  if (st.err[k]) { delete st.err[k]; el.removeAttribute('aria-invalid'); el.closest('.field')?.querySelector('.org-err')?.remove(); }
  if (k === 'country') { d.county = ''; const box = $(`#${sc}_countyBox`); if (box) box.innerHTML = countyFld(sc, st); }
  if (['gas', 'allergen', 'date'].includes(k) || k.startsWith('docs.')) updateLive(sc);
}
N.input.org_f = setField; N.change.org_f = setField;

/* seg controls (bubbling 'seg' events from core) */
document.addEventListener('seg', e => {
  const { key, v } = e.detail, scEl = e.target.closest && e.target.closest('[data-scope]');
  if (scEl) {
    const sc = scEl.dataset.scope, st = scopeState(sc); st.d[key] = v; st.dirty = true;
    if (key === 'feeModel') { const b = $(`#${sc}_feeBox`); if (b) b.innerHTML = feeBox(sc, st); }
    updateLive(sc); return;
  }
  if (key === 'org_meView') { sMe().view = v; sMe().page = 1; swap('#org_meRes', meResults()); }
  if (key === 'org_rateMode') { sRate().mode = v; N.refresh(); }
});

const REQS = [
  { name: 'Enter an event name', type: 'Choose an event type', about: 'Tell traders what the event is about' },
  { country: 'Choose a country', county: 'Choose a county or state', date: 'Choose a start date' },
  { pitches: 'Enter how many pitches you have' },
];
function validate(st, steps, e) {
  const err = {}, d = st.d;
  steps.forEach(i => Object.entries(REQS[i] || {}).forEach(([k, m]) => { if (!String(d[k] ?? '').trim()) err[k] = m; }));
  if (steps.includes(1)) {
    if (d.end && d.date && d.end < d.date) err.end = 'End date must be on or after the start date';
    if (d.deadline && d.date && d.deadline > d.date) err.deadline = 'Close applications on or before the start date';
  }
  if (steps.includes(2)) {
    if (d.pitches !== '' && +d.pitches < 1) err.pitches = 'Enter at least 1 pitch';
    if (e && +d.pitches < e.filled) err.pitches = `You have already accepted ${e.filled} traders`;
  }
  st.err = err;
  return Object.keys(err).length ? REQS.findIndex((r, i) => steps.includes(i) && Object.keys(err).some(k => k in r || (i === 1 && ['end', 'deadline'].includes(k)))) : -1;
}
const focusErr = () => requestAnimationFrame(() => { const el = $('[aria-invalid="true"]'); if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: N.reduce ? 'auto' : 'smooth' }); } });

/* preview: the event card exactly as traders see it */
function traderCard(e) {
  const left = Math.max(0, e.pitches - (e.filled || 0));
  return `<article class="org-prev">
    ${N.art(e.tone || 'lilac', e.date ? N.fd(e.date, { day: 'numeric', month: 'short' }) : 'Date', e.city || 'City')}
    <div class="org-prev-b">
      <div class="row" style="--g:6px">${e.type ? `<span class="chip side">${esc(e.type)}</span>` : ''}${N.checked('Verified organiser')}</div>
      <h3 class="d-s">${esc(e.name || 'Untitled event')}</h3>
      <p class="small muted">${e.date ? evDates(e) : 'Date to be set'}${e.time ? ` · ${esc(e.time)}` : ''}</p>
      <p class="small">${ic('pin', 'ic-sm')} ${esc([e.venue, e.city].filter(Boolean).join(', ') || 'Venue to be set')}</p>
      <div class="org-prev-facts"><div><b>${e.fee?.model === 'commission' ? `${e.fee.pct}%` : N.money(e.fee?.amount || 0)}</b><span>${e.fee?.model === 'commission' ? 'commission' : 'pitch fee'}</span></div><div><b>${left}</b><span>pitches left</span></div><div><b>${e.footfall ? Number(e.footfall).toLocaleString('en-GB') : '—'}</b><span>expected visitors</span></div></div>
      ${e.about ? `<p class="ink-2">${esc(e.about)}</p>` : ''}
      ${e.cuisines?.length ? `<div class="tags">${e.cuisines.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div>` : ''}
      <div class="org-prev-foot"><span class="small muted">By ${esc(org().company)}${e.deadline ? ` · apply by ${N.fShort(e.deadline)}` : ''}</span><button type="button" class="btn btn-side btn-sm" disabled>Apply now</button></div>
    </div>
  </article>`;
}

/* =====================================================================
   5 · CREATE EVENT (4-step wizard)
   ===================================================================== */
const CE_STEPS = ['Event basics', 'Location & dates', 'Footfall & pitches', 'Preview & publish'];
function createPage() {
  const st = sCE(), sc = 'ce';
  const foot = `<div class="org-wiz-foot">${st.step ? `<button type="button" class="btn btn-ghost btn-sm" data-act="org_ceBack">${ic('arrow-left')}Back</button>` : '<span></span>'}<span class="mono xs muted">Step ${st.step + 1} of 4</span><button type="button" class="btn btn-ink btn-sm" data-act="org_ceNext">Next step${ic('arrow-right')}</button></div>`;
  const card = (title, sub, inner) => `<section class="card stack" style="--g:20px"><div><h3 class="h3">${title}</h3><p class="small muted">${sub}</p></div>${inner}${foot}</section>`;
  let body;
  if (st.step === 0) body = card('Event basics', 'What traders see first.', secBasics(sc, st));
  else if (st.step === 1) body = card('Location & dates', 'Where and when. Traders filter by county and date.', secLocation(sc, st));
  else if (st.step === 2) body = `<div class="grid g-side org-wiz-side">${card('Footfall & pitches', 'Pitch details and the rules every applicant is checked against.', secPitches(sc, st))}<div class="org-sticky">${livePanel(sc, st)}</div></div>`;
  else {
    const e = applyDraft(st.d, { org: ME, status: 'draft', filled: 0, tone: N.tone(st.d.name || 'x') }), q = qualifying(st.d);
    body = `<div class="grid g-main">
      <section class="stack" style="--g:12px;min-width:0"><p class="eyebrow">As traders will see it</p>${traderCard(e)}</section>
      <section class="stack" style="--g:16px;min-width:0">
        <div class="card stack" style="--g:14px"><div class="card-h" style="margin:0"><h3>Requirements</h3><button type="button" class="link" data-act="org_ceStep" data-s="2">Change${ic('edit')}</button></div>${reqListHTML(e)}
          <div class="banner info">${ic('users')}<span class="grow"><b>${q.length} checked traders</b> already meet these rules and will see this event as a match.</span></div></div>
        <div class="card stack" style="--g:12px"><h3 class="h3">Ready to go?</h3><p class="small muted">Publishing lists the event for traders straight away. A draft stays private to Reed Events.</p>
          <div class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-act="org_ceBack">${ic('arrow-left')}Back</button><button type="button" class="btn btn-line btn-sm" data-act="org_ceSave" data-status="draft">Save as draft</button><button type="button" class="btn btn-side btn-sm" data-act="org_ceSave" data-status="published">${ic('rocket')}Publish event</button></div></div>
      </section></div>`;
  }
  return `${N.pageHead('Create event', 'Set your rules once. Every applicant is checked against them automatically.', st.dirty ? `<button type="button" class="btn btn-ghost btn-sm" data-act="org_ceReset">${ic('refresh')}Start again</button>` : '', `Step ${st.step + 1} of 4 · ${CE_STEPS[st.step]}`)}
  <div class="org-steps">${clickSteps(CE_STEPS, st.step, 'org_ceStep', st.max)}</div>
  <div data-scope="ce" class="org-wiz">${body}</div>`;
}
N.page('org/create-event', { app: APP, title: 'Create event', nav: 'org/create-event', render: createPage });
function ceGo(step) { const st = sCE(); st.step = step; st.max = Math.max(st.max, step); N.refresh(); window.scrollTo(0, 0); }
Object.assign(N.act, {
  org_ceNext() { const st = sCE(), bad = validate(st, [st.step]); if (bad > -1) { N.refresh(); focusErr(); return; } ceGo(Math.min(3, st.step + 1)); },
  org_ceBack() { const st = sCE(); st.err = {}; ceGo(Math.max(0, st.step - 1)); },
  org_ceStep(el) { const st = sCE(), to = +el.dataset.s; if (to > st.step) { const bad = validate(st, [...Array(to).keys()].filter(i => i >= st.step)); if (bad > -1) { st.step = bad; N.refresh(); focusErr(); return; } } st.err = {}; ceGo(to); },
  org_ceReset() { N.confirm({ title: 'Start again?', text: 'This clears everything you have entered for this event.', confirm: 'Clear and start again', danger: true, onConfirm: () => { const old = N.state.org_ce; N.state.org_ce = null; N.refresh(); N.toast('Form cleared.', { undo: () => { N.state.org_ce = old; N.refresh(); } }); } }); },
  org_cuisine(el) { const st = scopeState(el.closest('[data-scope]').dataset.scope), c = el.dataset.v, l = st.d.cuisines, i = l.indexOf(c); if (i > -1) l.splice(i, 1); else l.push(c); st.dirty = true; el.setAttribute('aria-pressed', String(i < 0)); },
  org_ceSave(el) {
    const st = sCE(), status = el.dataset.status, bad = validate(st, [0, 1, 2]);
    if (bad > -1) { st.step = bad; N.refresh(); focusErr(); N.toast('A few details are missing.', { icon: 'alert' }); return; }
    const base = N.slug(st.d.name) || 'event'; let id = base, k = 2; while (db.events[id]) id = `${base}-${k++}`;
    db.events[id] = applyDraft(st.d, { org: ME, status, filled: 0, tone: N.tone(st.d.name) });
    const nid = status === 'published' ? pushNote('admin', { tone: 'ok', title: `Reed Events published ${st.d.name.trim()}`, text: `${db.events[id].pitches} pitches · ${N.fShort(st.d.date)}.`, go: 'admin/events', unread: false }) : null;
    const saved = st; N.state.org_ce = null;
    N.go(`org/manage-events/${id}`);
    N.toast(status === 'published' ? `<b>${esc(db.events[id].name)}</b> is published. Traders can apply now.` : `Saved <b>${esc(db.events[id].name)}</b> as a draft.`, { icon: status === 'published' ? 'rocket' : 'check-circle', undo: () => { delete db.events[id]; if (nid) dropNote('admin', nid); N.state.org_ce = saved; N.go('org/create-event'); } });
  },
});

/* =====================================================================
   6 · MANAGE EVENTS (list)
   ===================================================================== */
const ME_TABS = [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Closed'], ['cancelled', 'Cancelled']];
const RANK = { live: 0, upcoming: 1, postponed: 1, draft: 2, completed: 3, cancelled: 4 };
const meMatch = (e, tab) => tab === 'all' ? true : tab === 'published' ? e.status === 'published' : N.eventState(e) === tab;
function meList() {
  const s = sMe(), q = s.q.trim().toLowerCase();
  return myIds().filter(id => meMatch(ev(id), s.tab) && (!q || [ev(id).name, ev(id).city, ev(id).venue, ev(id).type].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => { const ra = RANK[N.eventState(ev(a))], rb = RANK[N.eventState(ev(b))]; return ra - rb || (ra >= 3 ? byDate(b, a) : byDate(a, b)); });
}
function meResults() {
  const s = sMe(), ids = meList(), per = s.view === 'grid' ? 6 : 8, pages = Math.max(1, Math.ceil(ids.length / per));
  s.page = Math.min(s.page, pages);
  const rows = ids.slice((s.page - 1) * per, s.page * per);
  if (!ids.length) return N.empty(s.q ? `No events match “${esc(s.q)}”` : 'No events here yet', s.q ? 'Try a city, venue or event type.' : 'Events you create show here with their status and fill rate.', `<button type="button" class="btn btn-side btn-sm" data-go="org/create-event">${ic('plus')}Create event</button>`, 'calendar');
  const body = s.view === 'grid'
    ? `<div class="org-evgrid">${rows.map((id, i) => { const e = ev(id), p = pendingOf(id); return `<article class="card org-evcard" ${i === 0 ? 'data-note="Event status is a chip, never part of the name, e.g. \'Spring Street Food Series (Draft)\'."' : ''}>
        <button type="button" class="org-evcard-art" data-go="org/manage-events/${id}" aria-label="Open ${esc(e.name)}">${N.art(e.tone || 'lilac', N.fd(e.date, { day: 'numeric', month: 'short' }), e.city)}</button>
        <div class="org-evcard-b">
          <div class="row between">${evChip(e)}<span class="mono xs muted">${toGo(e)}</span></div>
          <div><h3 class="h4">${esc(e.name)}</h3><p class="small muted">${evDates(e)} · ${esc(e.city)}</p></div>
          ${fillHTML(e)}
          <div class="row between">${p ? N.chip('info', `${p} to review`) : `<span class="xs muted">${N.plural(appsFor(id).length, 'application')}</span>`}<button type="button" class="btn btn-line btn-xs" data-go="org/manage-events/${id}">Manage${ic('arrow-right')}</button></div>
        </div></article>`; }).join('')}</div>`
    : `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Event</th><th>Status</th><th>Pitches filled</th><th>Pending</th><th class="r">Action</th></tr></thead><tbody>${rows.map(id => { const e = ev(id), p = pendingOf(id); return `<tr class="click" data-go="org/manage-events/${id}" tabindex="0">
        <td data-l="Event"><div class="cell">${N.evd(e.date, 'side')}<div><b>${esc(e.name)}</b><span class="s">${evDates(e)} · ${esc(e.city)}</span></div></div></td>
        <td data-l="Status">${evChip(e)}</td><td data-l="Pitches filled" style="min-width:150px">${fillHTML(e)}</td>
        <td data-l="Pending">${p ? N.chip('info', `${p} pending`) : '<span class="muted small">None</span>'}</td>
        <td class="r"><button type="button" class="btn btn-line btn-xs" data-go="org/manage-events/${id}">Manage</button></td></tr>`; }).join('')}</tbody></table></div>`;
  return body + N.pager(s.page, pages, 'data-act="org_mePage" data-p', ids.length, per);
}
function manageEvents() {
  const s = sMe(), all = myIds();
  return `${N.pageHead('Manage events', `${N.plural(all.length, 'event')} · ${all.filter(id => isActive(ev(id))).length} coming up`, `<button type="button" class="btn btn-side btn-sm" data-go="org/create-event">${ic('plus')}Create event</button>`)}
  <div class="toolbar"><div class="org-tabscroll">${N.tabsHTML(ME_TABS.map(([k, l]) => [k, l, all.filter(id => meMatch(ev(id), k)).length]), s.tab, 'data-act="org_meTab" data-v')}</div></div>
  <div class="toolbar"><div class="grp org-grow">${searchBox('org_meQ', 'Search events by name, city or venue', s.q, 'org_meQ')}</div><div class="grp">${N.seg('org_meView', [['grid', 'Grid'], ['list', 'List']], s.view)}</div></div>
  <div id="org_meRes">${meResults()}</div>`;
}
N.page('org/manage-events', { app: APP, title: 'Manage events', nav: 'org/manage-events', render: manageEvents });
N.input.org_meQ = el => { const s = sMe(); s.q = el.value; s.page = 1; swap('#org_meRes', meResults()); };
Object.assign(N.act, {
  org_meTab(el) { const s = sMe(); s.tab = el.dataset.v; s.page = 1; N.refresh(); },
  org_mePage(el) { sMe().page = +el.dataset.p; swap('#org_meRes', meResults()); $('#org_meRes')?.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' }); },
});

/* =====================================================================
   7 · EVENT DETAIL  (Overview / Applications / Eligible traders / Edit)
   ===================================================================== */
const evTabs = (id, tab) => { const base = `org/manage-events/${id}`; return N.utabs([[base, 'Overview'], [`${base}/applications`, 'Applications', appsFor(id).length], [`${base}/eligible`, 'Eligible traders', eligibleFor(id).length], [`${base}/edit`, 'Edit']], tab === 'overview' ? base : `${base}/${tab}`, 'data-go'); };
const eligibleFor = id => approvedTraders().filter(t => N.sumChecks(N.evalChecks(t, id)).can);
const shareUrl = id => `niche.events/reed/${id}`;

function eventPage(id, tab) {
  const e = ev(id);
  if (!e) return N.empty('Event not found', 'It may have been deleted or the link is wrong.', `<button type="button" class="btn btn-line btn-sm" data-go="org/manage-events">Back to events</button>`, 'calendar');
  if (e.org !== ME) return N.empty('This event belongs to another organiser', `${esc(N.orgName(id))} runs ${esc(e.name)}.`, `<button type="button" class="btn btn-line btn-sm" data-go="org/manage-events">Back to your events</button>`, 'lock');
  const p = pendingOf(id), st = N.eventState(e);
  const actions = st === 'draft' ? `<button type="button" class="btn btn-side btn-sm" data-act="org_publish" data-e="${id}">${ic('rocket')}Publish event</button>`
    : p && tab !== 'applications' ? `<button type="button" class="btn btn-side btn-sm" data-go="org/manage-events/${id}/applications">${ic('inbox')}Review ${N.plural(p, 'application')}</button>` : '';
  const body = tab === 'applications' ? evAppsTab(id) : tab === 'eligible' ? evEligibleTab(id) : tab === 'edit' ? evEditTab(id) : evOverview(id);
  return `${N.pageHead(esc(e.name), `${evDates(e)}${e.time ? ` · ${esc(e.time)}` : ''} · ${esc([e.venue, e.city].filter(Boolean).join(', '))}`, actions, esc(e.type || 'Event'))}
  <div class="row org-evmeta" style="--g:8px">${evChip(e)}${e.moved ? N.chip('warn', `Moved from ${N.fShort(e.moved)}`) : ''}${N.chip('plain', feeText(e))}<span class="mono xs muted">${toGo(e)}</span></div>
  ${st === 'cancelled' ? `<div class="banner risk">${ic('ban')}<span class="grow"><b>Cancelled.</b> ${esc(e.cancelReason || '')} Traders were told by email.</span><button type="button" class="btn btn-line btn-xs" data-act="org_restore" data-e="${id}">Restore event</button></div>` : ''}
  ${evTabs(id, tab)}
  ${body}`;
}
function evOverview(id) {
  const e = ev(id), apps = appsFor(id), c = k => apps.filter(a => a.st === k).length, dl = e.deadline ? N.daysFrom(e.deadline) : null, st = N.eventState(e);
  const pct = fillPct(e);
  return `<div class="grid g-main">
    <div class="stack" style="--g:22px;min-width:0">
      <section class="card"><div class="card-h"><h3>Event facts</h3><button type="button" class="link" data-go="org/manage-events/${id}/edit">Edit${ic('edit')}</button></div>
        ${N.kv([['Dates', evDates(e)], ['Opening times', esc(e.time || '—')], ['Venue', esc(e.venue || '—')], ['Town or city', `${esc(e.city || '—')}${e.county ? `, ${esc(e.county)}` : ''}`], ['Pitches filled', `${e.filled} of ${e.pitches}`], ['Expected footfall', e.footfall ? Number(e.footfall).toLocaleString('en-GB') : '—'], ['Frontage', `${e.frontage || '—'} m`], ['Fee model', esc(feeText(e))], ['Application deadline', e.deadline ? `${N.fLong(e.deadline)}${dl != null && dl >= 0 && st !== 'completed' ? ` · ${dl === 0 ? 'today' : dl === 1 ? 'tomorrow' : `in ${dl} days`}` : ''}` : '—']], 'k3')}
        ${e.about ? `<p class="ink-2 org-about">${esc(e.about)}</p>` : ''}</section>
      <section class="card"><div class="card-h"><h3>Requirements traders must meet</h3><button type="button" class="link" data-go="org/manage-events/${id}/edit">Change${ic('edit')}</button></div>${reqListHTML(e)}
        <p class="small muted" style="margin-top:12px">${N.plural(eligibleFor(id).length, 'checked trader')} on Niche meet${eligibleFor(id).length === 1 ? 's' : ''} every rule today. <button type="button" class="link" data-go="org/manage-events/${id}/eligible">See who</button></p></section>
    </div>
    <div class="stack" style="--g:22px;min-width:0">
      <section class="card org-fillcard"><div class="row" style="--g:18px">${N.ring(pct, pct >= 70 ? '' : 'violet', 'full')}<div class="stack" style="--g:4px"><b class="num" style="font-size:32px">${e.filled}<span class="muted" style="font-size:18px"> / ${e.pitches}</span></b><span class="small muted">pitches filled · ${e.pitches - e.filled} open</span></div></div>
        <ul class="org-breakdown">${[['approved', 'Accepted', 'ok'], ['pending', 'Pending review', 'info'], ['info', 'Needs info', 'warn'], ['rejected', 'Declined', 'risk']].map(([k, l, d]) => `<li><button type="button" data-act="org_evAppsFilter" data-e="${id}" data-v="${k}"><span class="dot ${d}"></span>${l}<b>${c(k)}</b></button></li>`).join('')}</ul></section>
      <section class="card"><h3 class="h4" style="margin-bottom:10px">Share link</h3>
        ${e.status === 'draft' ? `<p class="small muted">Publish the event to get a public link.</p>` : `<div class="org-share"><input class="inp sm" id="org_share" value="${shareUrl(id)}" readonly aria-label="Event link"><button type="button" class="btn btn-ink btn-xs" data-act="org_copyLink" data-e="${id}">${ic('copy')}Copy</button></div><p class="xs muted" style="margin-top:8px">Anyone with the link can view the event. Only checked traders can apply.</p>`}</section>
      <section class="card"><h3 class="h4" style="margin-bottom:10px">Actions</h3><div class="org-actlist">
        ${e.status === 'draft' ? `<button type="button" data-act="org_publish" data-e="${id}">${ic('rocket')}<span><b>Publish event</b><span>List it for traders now</span></span></button>` : ''}
        <button type="button" data-go="org/manage-events/${id}/edit">${ic('edit')}<span><b>Edit event</b><span>Details, pitches and rules</span></span></button>
        <button type="button" data-act="org_duplicate" data-e="${id}">${ic('copy')}<span><b>Duplicate</b><span>Start a draft with the same rules</span></span></button>
        ${['upcoming', 'live'].includes(st) ? `<button type="button" data-act="org_postpone" data-e="${id}">${ic('calendar')}<span><b>Postpone</b><span>Move to a new date and tell traders</span></span></button>
        <button type="button" class="danger" data-act="org_cancel" data-e="${id}">${ic('ban')}<span><b>Cancel event</b><span>Tell every applicant why</span></span></button>` : ''}
      </div></section>
    </div>
  </div>`;
}

/* ----- event: applications tab ----- */
function evAppRows(id) {
  const s = sEvApps();
  return appsFor(id).filter(a => s.st === 'all' || a.st === s.st).sort((a, b) => (a.st === 'pending' ? 0 : 1) - (b.st === 'pending' ? 0 : 1) || N.readiness(b.t) - N.readiness(a.t));
}
function evAppsTab(id) {
  const s = sEvApps(), e = ev(id), all = appsFor(id), rows = evAppRows(id);
  const ready = all.filter(a => a.st === 'pending' && N.sumChecks(N.evalChecks(a.t, id)).cls === 'ok');
  const open = e.pitches - e.filled, n = Math.min(ready.length, open);
  const bulk = !ready.length ? '' : s.bulk === id
    ? `<div class="org-bulk on" role="alert"><span>${ic('check-circle')}<span>Accept <b>${ready.slice(0, n).map(a => esc(T(a.t).biz)).join(', ')}</b>? ${n < ready.length ? `Only ${open} pitches are open, so the top ${n} by readiness go first.` : `This fills ${n} of ${open} open pitches.`}</span></span><span class="btn-row"><button type="button" class="btn btn-ghost btn-xs" data-act="org_bulkCancel">Cancel</button><button type="button" class="btn btn-side btn-xs" data-act="org_bulkGo" data-e="${id}">Accept ${n}</button></span></div>`
    : `<div class="org-bulk"><span>${ic('sparkle')}<span><b>${ready.length}</b> pending ${ready.length === 1 ? 'applicant meets' : 'applicants meet'} every requirement.</span></span><button type="button" class="btn btn-side btn-xs" data-act="org_bulkAsk" data-e="${id}" ${open ? '' : 'disabled'}>${ready.length === 1 ? `Accept ${esc(T(ready[0].t).biz)}` : `Accept all ${ready.length} that meet every requirement`}</button></div>`;
  return `<div class="toolbar">${N.tabsHTML(APP_TABS.map(([k, l]) => [k, l, k === 'all' ? all.length : all.filter(a => a.st === k).length]), s.st, 'data-act="org_evAppsTab" data-v')}</div>
  ${bulk}
  ${rows.length ? `<div class="tbl-wrap" data-note="Applications are a sortable table instead of a card grid, so 20 applicants can be compared at a glance."><table class="tbl stack-sm org-apptbl"><thead><tr><th>Trader</th><th>Readiness</th><th>Requirements</th><th>Applied</th><th>Status</th><th class="r">Decision</th></tr></thead>
    <tbody data-ids="${rows.map(a => a.id).join(',')}">${rows.map(a => appRow(a, false)).join('')}</tbody></table></div>`
  : N.empty('No applications here', s.st === 'all' ? 'Invite traders who meet your rules to get the first applications in.' : 'Nothing with this status yet.', s.st === 'all' ? `<button type="button" class="btn btn-side btn-sm" data-go="org/manage-events/${id}/eligible">${ic('user-plus')}Invite eligible traders</button>` : '', 'inbox')}`;
}
function appRow(a, withEvent, selOn) {
  const t = T(a.t), open = ['pending', 'info'].includes(a.st);
  return `<tr class="click" data-act="org_view" data-id="${a.id}" tabindex="0">
    ${selOn !== undefined ? `<td class="org-selcell">${cbBtn(String(selOn), 'org_sel', `data-id="${a.id}"`, `Select ${t.biz}`)}</td>` : ''}
    <td data-l="Trader"><div class="cell">${N.tav(a.t)}<div><b>${esc(t.biz)}</b><span class="s">${esc(t.person)} · ${esc(t.cuisine)}</span></div></div></td>
    ${withEvent ? `<td data-l="Event"><div class="org-evcell"><b>${esc(ev(a.e).name)}</b><span class="s">${N.fShort(ev(a.e).date)}</span></div></td>` : ''}
    <td data-l="Readiness">${N.rd(N.readiness(a.t))}</td>
    <td data-l="Requirements">${reqCell(a.t, a.e)}</td>
    <td data-l="Applied"><span class="small muted">${N.rel(a.at)}</span></td>
    <td data-l="Status">${N.statusChip(N.appLabel, a.st)}</td>
    <td class="r"><div class="org-quick">${open ? `<button type="button" class="icon-btn sm org-q ok" data-act="org_quick" data-id="${a.id}" data-st="approved" aria-label="Accept ${esc(t.biz)}" title="Accept">${ic('check')}</button><button type="button" class="icon-btn sm org-q risk" data-act="org_quick" data-id="${a.id}" data-st="rejected" aria-label="Decline ${esc(t.biz)}" title="Decline">${ic('x')}</button>` : ''}<button type="button" class="btn btn-line btn-xs" data-act="org_view" data-id="${a.id}">View</button></div></td>
  </tr>`;
}
Object.assign(N.act, {
  org_evAppsTab(el) { sEvApps().st = el.dataset.v; N.refresh(); },
  org_evAppsFilter(el) { sEvApps().st = el.dataset.v; N.go(`org/manage-events/${el.dataset.e}/applications`); },
  org_bulkAsk(el) { sEvApps().bulk = el.dataset.e; N.refresh(); },
  org_bulkCancel() { sEvApps().bulk = null; N.refresh(); },
  org_bulkGo(el) {
    const id = el.dataset.e, e = ev(id), open = e.pitches - e.filled;
    const ids = appsFor(id).filter(a => a.st === 'pending' && N.sumChecks(N.evalChecks(a.t, id)).cls === 'ok').sort((a, b) => N.readiness(b.t) - N.readiness(a.t)).slice(0, open).map(a => a.id);
    sEvApps().bulk = null;
    const undo = decide(ids, 'approved', 'All requirements met. Accepted in bulk.'); N.refresh();
    if (undo) decideToast(ids, 'approved', undo);
  },
});

/* ----- event: eligible traders tab ----- */
function elResults(id) {
  const s = sEl(), q = s.q.trim().toLowerCase(), hit = t => !q || [T(t).biz, T(t).company, T(t).person, T(t).email, T(t).cuisine].join(' ').toLowerCase().includes(q);
  if (s.tab === 'invited') {
    const inv = db.invites.filter(i => i.e === id && i.from === ME && hit(i.t));
    return inv.length ? `<div class="list card">${inv.map(i => { const t = T(i.t), ap = applied(i.t, id); return `<div class="li">${N.tav(i.t)}<div class="li-main"><b>${esc(t.biz)}</b><span>${esc(t.person)} · invited ${N.rel(i.at).toLowerCase()}${i.msg ? ` · “${esc(i.msg.split('\n')[0].slice(0, 70))}${i.msg.length > 70 ? '…' : ''}”` : ''}</span></div><div class="li-end">${ap ? N.chip('ok', 'Applied') : N.chip('info', 'Invite sent')}${ap ? '' : `<button type="button" class="btn btn-ghost btn-xs" data-act="org_remind" data-t="${i.t}" data-e="${id}">Send reminder</button>`}</div></div>`; }).join('')}</div>`
      : N.empty(q ? 'No invited traders match' : 'No invitations yet', 'Invite traders from the Eligible tab and track them here.', '', 'mail');
  }
  const list = eligibleFor(id).filter(hit).sort((a, b) => N.matchScore(b, id) - N.matchScore(a, id) || N.readiness(b) - N.readiness(a));
  return list.length ? `<div class="list card">${list.map(tid => { const t = T(tid), s2 = N.sumChecks(N.evalChecks(tid, id)); return `<div class="li">${N.tav(tid)}<div class="li-main"><b>${esc(t.biz)}</b><span>${esc(t.person)} · ${esc(t.cuisine)} · ${esc(t.city)}</span></div>
      <div class="li-end">${N.rd(N.readiness(tid))}${N.chip(s2.cls, s2.cls === 'ok' ? 'Meets every rule' : s2.txt)}<button type="button" class="btn btn-ghost btn-xs" data-act="org_passport" data-t="${tid}" data-e="${id}">Passport</button>${applied(tid, id) ? N.chip('plain', 'Applied') : invited(tid, id) ? `<button type="button" class="btn btn-line btn-xs" disabled>${ic('check')}Invited</button>` : `<button type="button" class="btn btn-side btn-xs" data-act="org_invite" data-t="${tid}" data-e="${id}">${ic('send')}Invite</button>`}</div></div>`; }).join('')}</div>`
    : N.empty(q ? `No eligible traders match “${esc(s.q)}”` : 'No traders meet every rule yet', q ? 'Try a business name, person or email.' : 'Loosen a requirement in Edit to widen the pool.', '', 'users');
}
function evEligibleTab(id) {
  const s = sEl(), inv = db.invites.filter(i => i.e === id && i.from === ME).length;
  return `<div class="toolbar"><div class="grp org-grow">${searchBox('org_elQ', 'Search traders by name, company or email...', s.q, 'org_elQ')}</div>${N.tabsHTML([['eligible', 'Eligible', eligibleFor(id).length], ['invited', 'Invited', inv]], s.tab, 'data-act="org_elTab" data-v')}</div>
  <p class="small muted">Approved traders whose passport meets every rule for ${esc(ev(id).name)}. Expiring documents are flagged, not hidden.</p>
  <div id="org_elRes" data-e="${id}">${elResults(id)}</div>`;
}
N.input.org_elQ = el => { sEl().q = el.value; const box = $('#org_elRes'); if (box) swap('#org_elRes', elResults(box.dataset.e)); };
N.act.org_elTab = el => { sEl().tab = el.dataset.v; N.refresh(); };

/* ----- event: edit tab ----- */
function evEditTab(id) {
  const e = ev(id), st = sEd(), sc = 'ed';
  if (st.id !== id || !st.d) Object.assign(st, { id, d: draftFrom(e), err: {}, dirty: false });
  const sec = (title, sub, inner) => `<section class="card stack" style="--g:18px"><div><h3 class="h3">${title}</h3><p class="small muted">${sub}</p></div>${inner}</section>`;
  return `<div data-scope="ed" class="grid g-side org-wiz-side">
    <div class="stack" style="--g:22px;min-width:0">
      ${sec('Event basics', 'What traders see first.', secBasics(sc, st))}
      ${sec('Location & dates', 'Changing the date tells accepted traders automatically.', secLocation(sc, st))}
      ${sec('Footfall & pitches', 'Rule changes apply to new applications. Accepted traders keep their pitch.', secPitches(sc, st))}
    </div>
    <div class="org-sticky stack" style="--g:16px">
      ${livePanel(sc, st)}
      <div class="card stack" style="--g:10px"><button type="button" class="btn btn-side btn-block" data-act="org_edSave" data-e="${id}">${ic('check')}Save changes</button><button type="button" class="btn btn-ghost btn-sm btn-block" data-act="org_edDiscard">Discard changes</button></div>
    </div>
  </div>`;
}
Object.assign(N.act, {
  org_edSave(el) {
    const id = el.dataset.e, e = ev(id), st = sEd();
    if (validate(st, [0, 1, 2], e) > -1) { N.refresh(); focusErr(); N.toast('Check the highlighted fields.', { icon: 'alert' }); return; }
    const snap = JSON.parse(JSON.stringify(e)), moved = e.date !== st.d.date;
    applyDraft(st.d, e); st.id = null;
    N.go(`org/manage-events/${id}`);
    N.toast(`Saved changes to <b>${esc(e.name)}</b>.${moved ? ` ${N.plural(appsFor(id).filter(a => a.st === 'approved').length, 'accepted trader')} told about the new date (prototype).` : ''}`, { undo: () => { Object.keys(e).forEach(k => delete e[k]); Object.assign(e, snap); sEd().id = null; N.refresh(); } });
  },
  org_edDiscard() { sEd().id = null; N.refresh(); N.toast('Changes discarded.', { icon: 'history' }); },
});

/* ----- event actions ----- */
Object.assign(N.act, {
  org_copyLink(el) { N.copy('https://' + shareUrl(el.dataset.e), $('#org_share')); },
  org_duplicate(el) {
    const src = ev(el.dataset.e), base = N.slug(src.name + ' copy'); let id = base, k = 2; while (db.events[id]) id = `${base}-${k++}`;
    const copy = JSON.parse(JSON.stringify(src));
    Object.assign(copy, { name: `Copy of ${src.name}`, status: 'draft', filled: 0, org: ME }); delete copy.moved; delete copy.cancelReason;
    db.events[id] = copy; sEd().id = null;
    N.go(`org/manage-events/${id}/edit`);
    N.toast(`Draft created from <b>${esc(src.name)}</b>. Change the name and date, then publish.`, { icon: 'copy', undo: () => { delete db.events[id]; N.go(`org/manage-events/${el.dataset.e}`); } });
  },
  org_postpone(el) {
    const id = el.dataset.e, e = ev(id), n = appsFor(id).filter(a => a.st === 'approved').length;
    N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">${esc(e.name)}</p><h3>Postpone to a new date</h3><p class="muted">Currently ${evDates(e)}. Accepted traders keep their pitches.</p></div>
      <form data-form="org_postpone" class="stack" style="--g:14px"><input type="hidden" name="e" value="${id}">
        <div class="form-grid">${N.field({ label: 'New start date', id: 'date', type: 'date', req: true, value: N.addDays(e.date, 7), attrs: `min="${N.addDays(todayISO(), 1)}"` })}${N.field({ label: 'Opening times', id: 'time', value: e.time || '' })}</div>
        ${N.field({ label: 'Message to traders', id: 'msg', type: 'textarea', rows: 3, value: `${e.name} is moving to a new date. Your pitch is held for you. Reply if the new date doesn't work.` })}
        ${N.checkbox('notify', `Email the ${N.plural(n, 'accepted trader')} and ${N.plural(pendingOf(id), 'pending applicant')}`, true)}
        <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Keep current date</button><button type="submit" class="btn btn-ink btn-sm">Postpone event</button></div></form>`);
  },
  org_cancel(el) {
    const id = el.dataset.e, e = ev(id), n = appsFor(id).filter(a => ['approved', 'pending', 'info'].includes(a.st)).length;
    N.confirm({ title: `Cancel ${e.name}?`, text: `${N.plural(n, 'trader')} with an accepted or open application will be told by email. You can restore the event later, but traders may have booked elsewhere.`, confirm: 'Cancel event', danger: true, input: { label: 'Reason (sent to traders)', ph: 'e.g. The venue has closed for repairs.', req: true }, onConfirm: reason => {
      const was = e.status; e.status = 'cancelled'; e.cancelReason = reason;
      const nid = appsFor(id).some(a => a.t === db.me.trader && a.st !== 'rejected') ? pushNote('trader', { tone: 'warn', title: `${e.name} has been cancelled`, text: reason, go: 'trader/applications' }) : null;
      N.refresh();
      N.toast(`<b>${esc(e.name)}</b> cancelled. ${N.plural(n, 'trader')} notified (prototype).`, { icon: 'ban', undo: () => { e.status = was; delete e.cancelReason; if (nid) dropNote('trader', nid); N.refresh(); } });
    } });
  },
  org_restore(el) { const e = ev(el.dataset.e); e.status = 'published'; delete e.cancelReason; N.refresh(); N.toast(`<b>${esc(e.name)}</b> is back on. Traders can see it again.`, { undo: () => { e.status = 'cancelled'; N.refresh(); } }); },
});
N.forms.org_postpone = (f, d) => {
  const e = ev(d.e); if (!d.date) return;
  const snap = { date: e.date, end: e.end, deadline: e.deadline, time: e.time, moved: e.moved };
  const shift = Math.round((N.dt(d.date) - N.dt(e.date)) / N.DAY);
  e.moved = e.moved || e.date; e.date = d.date; e.end = N.addDays(snap.end || snap.date, shift); if (e.deadline) e.deadline = N.addDays(e.deadline, shift); e.time = d.time || e.time;
  const nid = d.notify && appsFor(d.e).some(a => a.t === db.me.trader && a.st === 'approved') ? pushNote('trader', { tone: 'warn', title: `${e.name} moved to ${N.fShort(e.date)}`, text: d.msg || 'Your pitch is held for you.', go: 'trader/applications' }) : null;
  N.closeModal(); N.refresh();
  N.toast(`Moved to <b>${N.fLong(e.date)}</b>.${d.notify ? ' Traders emailed (prototype).' : ''}`, { icon: 'calendar', undo: () => { Object.assign(e, snap); if (!snap.moved) delete e.moved; if (nid) dropNote('trader', nid); N.refresh(); } });
};

const detail = (tab, suffix, label) => ({
  app: APP, nav: 'org/manage-events', example: `org/manage-events/camden${suffix}`,
  title: p => `${label ? label + ' · ' : ''}${ev(p.id)?.name || 'Event'}`,
  crumbs: p => [['Manage events', 'org/manage-events'], ...(label ? [[ev(p.id)?.name || 'Event', `org/manage-events/${p.id}`], [label]] : [[ev(p.id)?.name || 'Event']])],
  render: p => eventPage(p.id, tab),
  after: () => { if (tab !== 'applications') sEvApps().bulk = null; },
});
N.page('org/manage-events/:id', detail('overview', '', ''));
N.page('org/manage-events/:id/applications', detail('applications', '/applications', 'Applications'));
N.page('org/manage-events/:id/eligible', detail('eligible', '/eligible', 'Eligible traders'));
N.page('org/manage-events/:id/edit', detail('edit', '/edit', 'Edit'));

/* =====================================================================
   8 · ALL APPLICATIONS
   ===================================================================== */
const SORTS = [['ready', 'Readiness (highest first)'], ['new', 'Newest first'], ['name', 'Trader name (A–Z)'], ['event', 'Event date']];
function appsBase() { const s = sApps(); return myApps().filter(a => s.ev === 'all' || a.e === s.ev); }
function appsList() {
  const s = sApps(), q = s.q.trim().toLowerCase();
  const l = appsBase().filter(a => (s.st === 'all' || a.st === s.st) && (!q || [T(a.t).biz, T(a.t).person, T(a.t).email, T(a.t).cuisine, ev(a.e).name].join(' ').toLowerCase().includes(q)));
  const cmp = { ready: (a, b) => N.readiness(b.t) - N.readiness(a.t) || b.at - a.at, new: (a, b) => b.at - a.at, name: (a, b) => T(a.t).biz.localeCompare(T(b.t).biz), event: (a, b) => byDate(a.e, b.e) || N.readiness(b.t) - N.readiness(a.t) }[s.sort];
  return l.sort(cmp);
}
function appsResults() {
  const s = sApps(), rows = appsList(), sel = s.sel;
  [...sel].forEach(id => { if (!rows.some(a => String(a.id) === id)) sel.delete(id); });
  const allOn = rows.length && rows.every(a => sel.has(String(a.id))), someOn = rows.some(a => sel.has(String(a.id)));
  const th = (k, l) => `<th><button type="button" class="org-sort" data-act="org_appsSortBy" data-v="${k}" aria-pressed="${s.sort === k}">${l}${ic(s.sort === k ? 'chevron-down' : 'sliders', 'ic-sm')}</button></th>`;
  const selBar = sel.size ? `<div class="org-selbar" role="region" aria-label="Selection"><b>${sel.size} selected</b><div class="btn-row"><button type="button" class="btn btn-side btn-xs" data-act="org_selDecide" data-st="approved">${ic('check')}Accept</button><button type="button" class="btn btn-line btn-xs" data-act="org_selDecide" data-st="rejected">${ic('x')}Decline</button><button type="button" class="btn btn-line btn-xs" data-act="org_bulkEmail">${ic('mail')}Email</button><button type="button" class="btn btn-ghost btn-xs" data-act="org_selClear">Clear</button></div></div>` : '';
  if (!rows.length) return N.empty(s.q ? `No applications match “${esc(s.q)}”` : 'Nothing here', s.q ? 'Try a trader name, email or event.' : 'Applications with this status will show here.', s.st !== 'all' || s.ev !== 'all' ? `<button type="button" class="btn btn-line btn-sm" data-act="org_appsReset">Show all applications</button>` : '', 'inbox');
  return `${selBar}<div class="tbl-wrap" data-note="Applications are a sortable table instead of a card grid, so 20 applicants can be compared at a glance."><table class="tbl stack-sm org-apptbl"><thead><tr><th class="org-selcell">${cbBtn(allOn ? 'true' : someOn ? 'mixed' : 'false', 'org_selAll', '', 'Select all')}</th>${th('name', 'Trader')}${th('event', 'Event')}${th('ready', 'Readiness')}<th>Requirements</th>${th('new', 'Applied')}<th>Status</th><th class="r">Decision</th></tr></thead>
    <tbody data-ids="${rows.map(a => a.id).join(',')}">${rows.map(a => appRow(a, true, sel.has(String(a.id)))).join('')}</tbody></table></div>
    <p class="xs muted org-foot">${N.plural(rows.length, 'application')} · click a row to review, then use J and K to move through them.</p>`;
}
function applicationsPage() {
  const s = sApps(), base = appsBase(), evs = [...new Set(myApps().map(a => a.e))].sort(byDate);
  return `<button type="button" class="org-back" data-go="org/dashboard">${ic('arrow-left', 'ic-sm')}Back to dashboard</button>
  ${N.pageHead('All applications', 'Review and manage food traders applying for your events', `<button type="button" class="btn btn-line btn-sm" data-act="org_bulkEmail">${ic('mail')}Bulk email</button>`)}
  <div class="toolbar"><div class="org-tabscroll">${N.tabsHTML(APP_TABS.map(([k, l]) => [k, l, k === 'all' ? base.length : base.filter(a => a.st === k).length]), s.st, 'data-act="org_appsTab" data-v')}</div></div>
  <div class="toolbar"><div class="grp org-grow">${searchBox('org_appsQ', 'Search applications by trader, email or event', s.q, 'org_appsQ')}</div>
    <div class="grp"><label class="sr" for="org_appsEv">Event</label><select class="sel sm" id="org_appsEv" data-change="org_appsEv"><option value="all">All events</option>${evs.map(id => `<option value="${id}" ${s.ev === id ? 'selected' : ''}>${esc(ev(id).name)}</option>`).join('')}</select>
    <label class="sr" for="org_appsSort">Sort</label><select class="sel sm" id="org_appsSort" data-change="org_appsSort">${SORTS.map(([k, l]) => `<option value="${k}" ${s.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <div id="org_appsRes">${appsResults()}</div>`;
}
N.page('org/applications', { app: APP, title: 'Applications', nav: 'org/applications', render: applicationsPage });
const appsSwap = () => swap('#org_appsRes', appsResults());
N.input.org_appsQ = el => { sApps().q = el.value; appsSwap(); };
N.change.org_appsEv = el => { sApps().ev = el.value; sApps().sel.clear(); N.refresh(); };
N.change.org_appsSort = el => { sApps().sort = el.value; appsSwap(); };
Object.assign(N.act, {
  org_appsTab(el) { const s = sApps(); s.st = el.dataset.v; s.sel.clear(); N.refresh(); },
  org_appsSortBy(el) { sApps().sort = el.dataset.v; N.refresh(); },
  org_appsReset() { Object.assign(sApps(), { st: 'all', ev: 'all', q: '' }); sApps().sel.clear(); N.refresh(); },
  org_sel(el) { const sel = sApps().sel, id = el.dataset.id; if (sel.has(id)) sel.delete(id); else sel.add(id); appsSwap(); $(`#org_appsRes [data-act="org_sel"][data-id="${id}"]`)?.focus(); },
  org_selAll() { const s = sApps(), ids = appsList().map(a => String(a.id)), all = ids.every(id => s.sel.has(id)); ids.forEach(id => all ? s.sel.delete(id) : s.sel.add(id)); appsSwap(); },
  org_selClear() { sApps().sel.clear(); appsSwap(); },
  org_selDecide(el) {
    const s = sApps(), st = el.dataset.st, ids = [...s.sel].filter(id => findApp(id)?.st !== st);
    if (!ids.length) { N.toast(`Everything selected is already ${st === 'approved' ? 'accepted' : 'declined'}.`, { icon: 'info' }); return; }
    const run = () => { const undo = decide(ids, st); s.sel.clear(); N.refresh(); if (undo) decideToast(ids, st, undo); };
    if (st === 'rejected') N.confirm({ title: `Decline ${N.plural(ids.length, 'application')}?`, text: 'Each trader sees the standard note explaining which requirement they missed.', confirm: `Decline ${ids.length}`, danger: true, onConfirm: run });
    else guardAccept(ids, st, run);
  },
  org_bulkEmail() {
    const s = sApps(), onPage = N.cur.path === 'org/applications';
    const apps = onPage && s.sel.size ? [...s.sel].map(findApp).filter(Boolean) : onPage ? appsList() : myApps().filter(a => a.st === 'pending');
    const tids = [...new Set(apps.map(a => a.t))];
    const scope = onPage && s.sel.size ? 'selected applications' : `${(APP_TABS.find(t => t[0] === s.st) || APP_TABS[0])[1]} · ${s.ev === 'all' ? 'all events' : esc(ev(s.ev).name)}${s.q ? ` · “${esc(s.q)}”` : ''}`;
    if (!tids.length) { N.toast('No traders in the current filter to email.', { icon: 'info' }); return; }
    N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Bulk email</p><h3>Email ${N.plural(tids.length, 'trader')}</h3><p class="muted">Recipients follow the current filter: ${scope}.</p></div>
      <div class="org-recips"><div class="avs">${tids.slice(0, 8).map(t => N.tav(t, 'sm')).join('')}</div><span class="small">${tids.slice(0, 3).map(t => esc(T(t).biz)).join(', ')}${tids.length > 3 ? ` and ${tids.length - 3} more` : ''}</span></div>
      <form data-form="org_bulkEmail" class="stack" style="--g:14px"><input type="hidden" name="n" value="${tids.length}">
        ${N.field({ label: 'Subject', id: 'subject', req: true, value: 'An update about your application' })}
        ${N.field({ label: 'Message', id: 'message', type: 'textarea', rows: 5, req: true, ph: 'Write to every trader in this list. Their first name is added automatically.' })}
        <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-side btn-sm">${ic('send')}Send to ${tids.length}</button></div></form>`);
  },
});
N.forms.org_bulkEmail = (f, d) => { if (!d.subject.trim() || !d.message.trim()) return; N.closeModal(); N.toast(`Email sent to ${N.plural(+d.n, 'trader')} (prototype).`, { icon: 'send' }); };

/* =====================================================================
   9 · INVITE TRADERS
   ===================================================================== */
const invEvents = () => myIds().filter(id => ev(id).status === 'published' && isActive(ev(id))).sort(byDate);
const sInv = () => S('org_inv', { e: null, q: '', f: 'all', page: 1 });
function invList() {
  const s = sInv(), q = s.q.trim().toLowerCase();
  return approvedTraders().filter(tid => {
    const t = T(tid);
    if (q && ![t.biz, t.company, t.person, t.email, t.cuisine, t.city].join(' ').toLowerCase().includes(q)) return false;
    if (s.f === 'eligible') return N.sumChecks(N.evalChecks(tid, s.e)).can && !applied(tid, s.e);
    if (s.f === 'invited') return invited(tid, s.e);
    return true;
  }).sort((a, b) => N.matchScore(b, s.e) - N.matchScore(a, s.e) || N.readiness(b) - N.readiness(a));
}
function invResults() {
  const s = sInv(), list = invList(), per = 8, pages = Math.max(1, Math.ceil(list.length / per));
  s.page = Math.min(s.page, pages);
  if (!list.length) return N.empty(s.q ? `No traders match “${esc(s.q)}”` : s.f === 'invited' ? 'No one invited yet' : 'No traders here', s.q ? 'Try a business name, cuisine or city.' : 'Change the filter to see more traders.', '', 'users');
  return `<div class="org-tgrid">${list.slice((s.page - 1) * per, s.page * per).map(tid => {
    const t = T(tid), m = N.matchScore(tid, s.e), sm = N.sumChecks(N.evalChecks(tid, s.e)), ap = applied(tid, s.e), iv = invited(tid, s.e);
    return `<article class="card org-tcard">
      <div class="org-tcard-h">${N.tav(tid, 'lg')}<div class="org-match ${m >= 90 ? 'hi' : ''}"><b class="num">${m}%</b><span>match</span></div></div>
      <div><h3 class="h4">${esc(t.biz)}</h3><p class="small muted">${esc(t.person)} · ${esc(t.city)}</p></div>
      <div class="row" style="--g:6px"><span class="tag">${esc(t.cuisine)}</span>${N.chip(sm.cls, sm.cls === 'ok' ? 'Eligible' : sm.can ? `Eligible · ${sm.txt}` : `Not eligible · ${sm.txt}`)}</div>
      <div class="org-tcard-rd"><span class="xs muted">Readiness</span>${N.rd(N.readiness(tid))}</div>
      <div class="org-tcard-f"><button type="button" class="btn btn-ghost btn-xs" data-act="org_passport" data-t="${tid}" data-e="${s.e}">View passport</button>
        ${ap ? N.chip('plain', 'Applied') : iv ? `<button type="button" class="btn btn-line btn-xs" disabled>${ic('check')}Invited</button>` : `<button type="button" class="btn btn-side btn-xs" data-act="org_invite" data-t="${tid}" data-e="${s.e}" ${sm.can ? '' : 'title="Does not meet every rule yet"'}>${ic('send')}Invite</button>`}</div>
    </article>`; }).join('')}</div>
  <div class="pager"><span class="small muted">Showing ${(s.page - 1) * per + 1}–${Math.min(s.page * per, list.length)} of ${list.length}</span><div class="btn-row"><button type="button" class="btn btn-line btn-xs" data-act="org_invPage" data-p="${s.page - 1}" ${s.page <= 1 ? 'disabled' : ''}>${ic('chevron-left')}Prev</button><span class="mono xs">${s.page} / ${pages}</span><button type="button" class="btn btn-line btn-xs" data-act="org_invPage" data-p="${s.page + 1}" ${s.page >= pages ? 'disabled' : ''}>Next${ic('chevron-right')}</button></div></div>`;
}
function invitePage() {
  const s = sInv(), evs = invEvents();
  if (!evs.length) return `${N.pageHead('Invite traders', 'Invite checked traders to apply to your events.')}${N.empty('No published upcoming events', 'Publish an event first, then invite traders who meet its rules.', `<button type="button" class="btn btn-side btn-sm" data-go="org/create-event">Create event</button>`, 'calendar')}`;
  if (!evs.includes(s.e)) s.e = evs[0];
  const e = ev(s.e), elig = approvedTraders().filter(t => N.sumChecks(N.evalChecks(t, s.e)).can && !applied(t, s.e)).length;
  return `${N.pageHead('Invite traders', 'Pick an event and invite traders whose passport already meets its rules.', '', `${approvedTraders().length} profile-complete traders`)}
  <section class="card org-invhead" data-note="Every trader shows a match score for the chosen event, so invitations go to people who can actually trade there.">
    <div class="field"><span>Invite to</span><select class="sel" id="org_invEv" data-change="org_invEv">${evs.map(id => `<option value="${id}" ${id === s.e ? 'selected' : ''}>${esc(ev(id).name)} · ${N.fShort(ev(id).date)}</option>`).join('')}</select></div>
    <div class="org-invfacts">${N.evd(e.date, 'side')}<div><b>${e.pitches - e.filled} pitches open</b><span class="small muted">${fillPct(e)}% full · ${toGo(e)} · ${elig} eligible traders not yet applied</span></div></div>
  </section>
  <div class="toolbar"><div class="grp org-grow">${searchBox('org_invQ', 'Search traders by name, cuisine or city', s.q, 'org_invQ')}</div>
    <div class="grp"><label class="sr" for="org_invF">Status</label><select class="sel sm" id="org_invF" data-change="org_invF">${[['all', 'All statuses'], ['eligible', 'Eligible only'], ['invited', 'Invited']].map(([k, l]) => `<option value="${k}" ${s.f === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
  <div id="org_invRes">${invResults()}</div>`;
}
N.page('org/invite-traders', { app: APP, title: 'Invite traders', nav: 'org/invite-traders', render: invitePage });
N.input.org_invQ = el => { const s = sInv(); s.q = el.value; s.page = 1; swap('#org_invRes', invResults()); };
N.change.org_invEv = el => { const s = sInv(); s.e = el.value; s.page = 1; N.refresh(); };
N.change.org_invF = el => { const s = sInv(); s.f = el.value; s.page = 1; swap('#org_invRes', invResults()); };
N.act.org_invPage = el => { sInv().page = +el.dataset.p; swap('#org_invRes', invResults()); $('#org_invRes')?.scrollIntoView({ block: 'start', behavior: N.reduce ? 'auto' : 'smooth' }); };

/* =====================================================================
   10 · RATE TRADERS
   ===================================================================== */
const sRate = () => S('org_rate', { mode: 'event', open: null });
const RATE_PARTS = [['stars', 'Overall'], ['punct', 'Punctuality'], ['qual', 'Food quality'], ['comm', 'Communication']];
const myReview = (tid, eid) => db.reviews.find(r => r.dir === 'o2t' && r.from === ME && r.to === tid && r.e === eid);
const tradedAt = eid => appsFor(eid).filter(a => a.st === 'approved').map(a => a.t);
const rateForm = (tid, eid, withEventPick) => `<div class="org-rateform" data-t="${tid}" data-e="${eid || ''}">
    ${withEventPick ? withEventPick : ''}
    <div class="org-rategrid">${RATE_PARTS.map(([k, l]) => `<div class="org-rate-row"><span class="small">${l}</span>${N.starInput(k, 0)}</div>`).join('')}</div>
    <label class="field"><span>Comment <span class="hint">Shown on their passport</span></span><textarea class="ta" rows="2" data-k="text" placeholder="What went well, and what could be better?"></textarea></label>
    <div class="btn-row"><button type="button" class="btn btn-side btn-sm" data-act="org_saveRating">${ic('star')}Save rating</button></div>
  </div>`;
function ratePage() {
  const s = sRate();
  const evs = myIds().filter(id => tradedAt(id).length).sort((a, b) => { const ca = N.eventState(ev(a)) === 'completed', cb = N.eventState(ev(b)) === 'completed'; return (cb - ca) || (ca ? byDate(b, a) : byDate(a, b)); });
  if (s.open === null) s.open = evs.find(id => N.eventState(ev(id)) === 'completed' && tradedAt(id).some(t => !myReview(t, id))) || evs[0];
  let body;
  if (s.mode === 'event') body = `<div class="stack org-rate-evs" style="--g:12px">${evs.map(id => {
    const e = ev(id), done = N.eventState(e) === 'completed', ts = tradedAt(id), rated = ts.filter(t => myReview(t, id)).length, open = s.open === id && done;
    return `<section class="card org-rate-ev ${open ? 'open' : ''}">
      <button type="button" class="org-rate-h" data-act="org_rateOpen" data-e="${id}" aria-expanded="${open}" ${done ? '' : 'disabled'}>${N.evd(e.date, done ? 'side' : '')}<span class="org-rate-hm"><b>${esc(e.name)}</b><span>${evDates(e)} · ${N.plural(ts.length, 'trader')}</span></span>
        ${done ? N.chip(rated === ts.length ? 'ok' : 'warn', `${rated} of ${ts.length} rated`) : N.chip('plain', `Rate after ${N.fShort(e.end || e.date)}`)}${done ? ic(open ? 'chevron-up' : 'chevron-down') : ''}</button>
      ${open ? `<div class="org-rate-list">${ts.map(tid => { const t = T(tid), r = myReview(tid, id); return `<div class="org-rate-t">${N.tav(tid)}<div class="org-rate-tm"><b>${esc(t.biz)}</b><span>${esc(t.person)} · ${esc(t.food)}</span></div>
        <div class="org-rate-tb">${r ? `<div class="org-rated">${N.stars(r.stars)}<span class="xs muted">You rated ${N.fShort(r.when)}</span>${r.text ? `<p class="small">“${esc(r.text)}”</p>` : ''}<span class="xs muted">Punctuality ${r.punct ?? '—'} · Food ${r.qual ?? '—'} · Communication ${r.comm ?? '—'}</span></div>` : rateForm(tid, id)}</div></div>`; }).join('')}</div>` : ''}
    </section>`; }).join('')}</div>`;
  else {
    const tids = [...new Set(myApps().filter(a => a.st === 'approved').map(a => a.t))];
    const avg = tid => { const rs = db.reviews.filter(r => r.dir === 'o2t' && r.from === ME && r.to === tid); return rs.length ? rs.reduce((x, r) => x + r.stars, 0) / rs.length : null; };
    const last = tid => myApps().filter(a => a.t === tid && a.st === 'approved').map(a => a.e).sort(byDate).pop();
    body = `<div class="tbl-wrap"><table class="tbl stack-sm"><thead><tr><th>Trader</th><th>Events with you</th><th>Your average</th><th>Last event</th><th class="r"></th></tr></thead><tbody>${tids.sort((a, b) => (avg(b) ?? 0) - (avg(a) ?? 0)).map(tid => { const t = T(tid), a = avg(tid), l = last(tid); return `<tr>
      <td data-l="Trader"><div class="cell">${N.tav(tid)}<div><b>${esc(t.biz)}</b><span class="s">${esc(t.person)}</span></div></div></td>
      <td data-l="Events with you">${myApps().filter(x => x.t === tid && x.st === 'approved').length}</td>
      <td data-l="Your average">${a != null ? `<span class="row" style="--g:6px">${N.stars(a)}<span class="mono">${a.toFixed(1)}</span></span>` : '<span class="muted small">Not rated yet</span>'}</td>
      <td data-l="Last event">${l ? `${esc(ev(l).name)}<span class="s muted xs" style="display:block">${N.fShort(ev(l).date)}</span>` : '—'}</td>
      <td class="r"><button type="button" class="btn btn-line btn-xs" data-act="org_rateDrawer" data-t="${tid}">${ic('star')}Rate</button></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  return `${N.pageHead('Rate traders', 'Ratings build each trader’s passport. Rate after every event, while it’s fresh.', N.seg('org_rateMode', [['event', 'By event'], ['all', 'All traders']], s.mode))}${body}`;
}
N.page('org/rate', { app: APP, title: 'Rate traders', nav: 'org/rate', render: ratePage });
function saveRating(box) {
  const tid = box.dataset.t, eid = box.dataset.e || $('select', box)?.value, v = k => +($(`[data-stars="${k}"]`, box)?.dataset.v || 0);
  if (!eid) { N.toast('Choose the event first.', { icon: 'alert' }); return false; }
  if (!v('stars')) { N.toast('Choose an overall rating first.', { icon: 'alert' }); $('[data-stars="stars"] button', box)?.focus(); return false; }
  const prev = myReview(tid, eid);
  const r = { id: N.uid('r'), from: ME, to: tid, dir: 'o2t', e: eid, stars: v('stars'), punct: v('punct') || null, qual: v('qual') || null, comm: v('comm') || null, when: todayISO(), text: ($('[data-k="text"]', box)?.value || '').trim() };
  if (prev) db.reviews.splice(db.reviews.indexOf(prev), 1);
  db.reviews.unshift(r);
  N.toast(`Rated <b>${esc(T(tid).biz)}</b> ${r.stars} out of 5 for ${esc(ev(eid).name)}.`, { icon: 'star', undo: () => { const i = db.reviews.indexOf(r); if (i > -1) db.reviews.splice(i, 1); if (prev) db.reviews.unshift(prev); N.refresh(); } });
  return true;
}
Object.assign(N.act, {
  org_rateOpen(el) { const s = sRate(); s.open = s.open === el.dataset.e ? '' : el.dataset.e; N.refresh(); },
  org_saveRating(el) { const box = el.closest('.org-rateform'); if (saveRating(box)) { if (N.drawerOpen()) N.closeDrawer(); N.refresh(); } },
  org_rateDrawer(el) {
    const tid = el.dataset.t, t = T(tid), evs = myApps().filter(a => a.t === tid && a.st === 'approved' && N.eventState(ev(a.e)) === 'completed').map(a => a.e).sort(byDate).reverse();
    const pick = evs.length ? N.field({ label: 'Event', id: 'org_rateEv', opts: evs.map(id => [id, `${ev(id).name} · ${N.fShort(ev(id).date)}${myReview(tid, id) ? ' (rated, will replace)' : ''}`]) }) : '';
    N.openDrawer(`<header class="dr-head">${N.tav(tid, 'lg')}<div class="dr-ti"><h3>Rate ${esc(t.biz)}</h3><p>${esc(t.person)} · ${esc(t.food)}</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></header>
      <div class="dr-body">${evs.length ? rateForm(tid, '', pick) : N.empty('Nothing to rate yet', `You can rate ${esc(t.person)} once an event you shared has finished.`, '', 'star')}</div>`);
  },
});

/* =====================================================================
   11 · FEEDBACK
   ===================================================================== */
const FB_TYPES = [['Event issue', 'Something at one of your events', 'flag'], ['Website', 'Pages, sign-in or loading problems', 'globe'], ['Platform', 'Features, ideas and workflows', 'sparkle']];
function feedbackPage() {
  const mine = db.feedback.filter(f => f.from === WHO).sort((a, b) => b.at - a.at);
  return `${N.pageHead('Share your feedback about the platform', 'Tell us what works and what doesn’t. The Niche team reads every message.')}
  <div class="grid g-main">
    <form class="card stack" data-form="org_feedback" style="--g:18px">
      <div class="stack" style="--g:10px"><span class="lbl req">Feedback type</span><div class="radio-cards">${FB_TYPES.map(([v, s, i], k) => `<label class="rcard"><input type="radio" name="type" value="${v}" ${k === 2 ? 'checked' : ''}>${ic(i)}<b>${v}</b><span>${s}</span></label>`).join('')}</div></div>
      ${N.field({ label: 'Subject', id: 'subject', req: true, ph: 'One line that sums it up' })}
      ${N.field({ label: 'Your feedback', id: 'text', type: 'textarea', req: true, rows: 5, ph: 'What happened, and what would make it better?' })}
      <div class="btn-row"><button type="submit" class="btn btn-side">${ic('send')}Submit feedback</button></div>
    </form>
    <section class="card"><div class="card-h"><h3>Previous feedback</h3><span class="mono xs muted">${mine.length}</span></div>
      ${mine.length ? `<ul class="list">${mine.map(f => `<li class="li"><span class="org-note-ic ${f.status === 'resolved' ? 'ok' : 'info'}">${ic(f.status === 'resolved' ? 'check' : 'message', 'ic-sm')}</span><div class="li-main"><b>${esc(f.subject)}</b><span>${esc(f.type)} · ${N.rel(f.at)}</span></div><div class="li-end">${N.chip(f.status === 'resolved' ? 'ok' : 'info', f.status === 'resolved' ? 'Resolved' : 'Open')}</div></li>`).join('')}</ul>` : N.empty('No feedback yet', 'Anything you send shows here with its status.', '', 'message')}
    </section>
  </div>`;
}
N.page('org/feedback', { app: APP, title: 'Feedback', nav: 'org/feedback', render: feedbackPage });
N.forms.org_feedback = (f, d) => {
  if (!d.subject.trim() || !d.text.trim()) return;
  const fb = { id: N.uid('f'), from: WHO, role: 'Organiser', type: d.type || 'Platform', subject: d.subject.trim(), text: d.text.trim(), at: 0, status: 'open' };
  db.feedback.unshift(fb);
  const nid = pushNote('admin', { tone: 'info', title: 'New feedback from Olivia Reed', text: `${fb.type} · ${fb.subject}`, go: 'admin/feedback' });
  N.refresh();
  N.toast('Thanks. Your feedback is with the Niche team.', { icon: 'send', undo: () => { db.feedback.splice(db.feedback.indexOf(fb), 1); dropNote('admin', nid); N.refresh(); } });
};

/* =====================================================================
   12 · SUBSCRIPTION (NICHE Event Pass)
   ===================================================================== */
const INCLUDED = ['Search compliant traders instantly', 'Post events and receive matched applications', 'View full trader passports and documents', 'Direct messaging with shortlisted traders', 'Save favourites and build your roster', 'Booking confirmation & calendar management'];
function subscriptionPage() {
  const o = org(), joined = o.joined, freeUntil = '2026-11-01';
  const elapsed = Math.round((N.TODAY - N.dt(joined)) / N.DAY), left = N.daysFrom(freeUntil);
  const booked = myApps().filter(a => a.st === 'approved');
  const fees = booked.reduce((s, a) => s + (ev(a.e).fee?.model === 'pitch' ? ev(a.e).fee.amount || 0 : 0), 0);
  const would = Math.round(fees * 0.08);
  o.billing = o.billing || { name: o.person, email: o.email, address: o.address };
  return `${N.pageHead('Subscription', 'Your NICHE Event Pass and what it costs, in plain numbers.', '', 'Account')}
  <section class="blk blk-lilac org-pass" data-note="The live page lists the plan without saying when fees start. Year 1 end date, usage and the would-be commission are now shown together.">
    <div class="stack" style="--g:10px;min-width:0">
      <div class="row" style="--g:8px"><span class="chip violet">Year 1 · Active</span><span class="mono xs">Joined ${N.fLong(joined)}</span></div>
      <h2 class="d-m">NICHE Event Pass</h2>
      <p class="org-pass-t">Free until <b>${N.fLong(freeUntil)}</b>. From year 2, 8% commission on confirmed pitch fees booked through NICHE. Nothing else.</p>
      <div class="org-pass-bar">${N.bar(Math.min(100, elapsed / 365 * 100), 'violet')}<span class="mono xs">${left > 0 ? `${left} days of your free year left` : 'Free year finished'}</span></div>
    </div>
    <div class="org-claim"><span class="org-claim-arch">${ic('check', 'ic-lg')}</span><b>Free year claimed</b><span class="small">Claimed ${N.fLong(joined)}</span><button type="button" class="btn btn-white btn-sm" disabled>Claim your free year</button></div>
  </section>
  <div class="stats">
    ${statTile('sb1', 'Confirmed bookings', booked.length, 'Accepted traders across your events')}
    <div class="stat"><span class="lbl">Pitch fees booked</span><b class="num">£<span data-tw="sb2" data-to="${fees}">${fees.toLocaleString('en-GB')}</span></b><span class="s">Pitch-fee events only</span></div>
    <div class="stat tone-mint"><span class="lbl">Commission this year</span><b class="num">£0</b><span class="s">8% would be ${N.money(would)}. Year 1 is free.</span></div>
  </div>
  <div class="grid g2">
    <section class="card"><div class="card-h"><h3>What’s included</h3></div><ul class="org-incl">${INCLUDED.map(x => `<li>${ic('check', 'ic-sm')}${esc(x)}</li>`).join('')}</ul></section>
    <div class="stack" style="--g:22px;min-width:0">
      <section class="card"><div class="card-h"><h3>Billing contact</h3><button type="button" class="btn btn-line btn-xs" data-act="org_billing">${ic('edit')}Edit</button></div>${N.kv([['Name', esc(o.billing.name)], ['Email', esc(o.billing.email)], ['Company', esc(o.company)], ['Address', esc(o.billing.address)]])}</section>
      <section class="card"><div class="card-h"><h3>Invoices</h3></div>${N.empty('No invoices yet', `Your first invoice can only arrive after ${N.fLong(freeUntil)}, and only for pitches confirmed through NICHE.`, '', 'file')}</section>
    </div>
  </div>`;
}
N.page('org/subscription', { app: APP, title: 'Subscription', nav: 'org/subscription', render: subscriptionPage, after: tweenStats });
N.act.org_billing = () => {
  const b = org().billing;
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Subscription</p><h3>Billing contact</h3></div>
    <form data-form="org_billing" class="stack" style="--g:14px">${N.field({ label: 'Name', id: 'name', value: b.name, req: true })}${N.field({ label: 'Email for invoices', id: 'email', type: 'email', value: b.email, req: true })}${N.field({ label: 'Billing address', id: 'address', value: b.address })}
    <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="submit" class="btn btn-ink btn-sm">Save contact</button></div></form>`);
};
N.forms.org_billing = (f, d) => { const o = org(), was = { ...o.billing }; o.billing = { name: d.name.trim(), email: d.email.trim(), address: d.address.trim() }; N.closeModal(); N.refresh(); N.toast('Billing contact saved.', { undo: () => { o.billing = was; N.refresh(); } }); };

})();
