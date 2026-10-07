/* =====================================================================
   NICHE prototype core
   Everything every page shares: utilities, sample data, rules, UI
   helpers, overlays, router, shells, action delegation.
   Modules (site-*.js, trader.js, organiser.js, admin.js, brand.js)
   register pages with N.page(...) and actions with Object.assign(N.act,{...}).
   ===================================================================== */
window.N = (() => {
'use strict';
const N = {};

/* ---------- utilities ---------- */
const $ = N.$ = (s, r = document) => r.querySelector(s);
const $$ = N.$$ = (s, r = document) => [...r.querySelectorAll(s)];
N.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
N.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
N.TODAY = new Date('2026-09-29T14:20:00');
const DAY = N.DAY = 864e5;
N.dt = s => new Date(String(s).length <= 10 ? s + 'T12:00:00' : s);
N.daysFrom = s => Math.round((N.dt(s) - N.TODAY) / DAY);
N.fd = (s, o) => N.dt(s).toLocaleDateString('en-GB', o);
N.fShort = s => s ? N.fd(s, { day: 'numeric', month: 'short' }) : '—';
N.fLong = s => s ? N.fd(s, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
N.fNum = s => s ? N.fd(s, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
N.addDays = (s, n) => { const x = N.dt(s); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
N.rel = h => { h = Math.abs(h); if (h < 1) return 'Just now'; if (h < 24) return `${Math.round(h)} h ago`; const d = Math.round(h / 24); return d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : `${Math.round(d / 30)} mo ago`; };
N.plural = (n, w, p) => `${n} ${n === 1 ? w : (p || w + 's')}`;
N.nowTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
N.money = n => '£' + Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 });
N.uid = (p = 'x') => p + Math.random().toString(36).slice(2, 8);
N.slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
N.initials = s => String(s).replace(/&|Ltd|Co\b/gi, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
N.cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);

/* ---------- icons (Lucide-style, 24 grid) ---------- */
const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M5 12h14M12 5v14"/>', minus: '<path d="M5 12h14"/>',
  'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>', 'arrow-left': '<path d="M19 12H5M12 19l-7-7 7-7"/>', 'arrow-up-right': '<path d="M7 17 17 7M8 7h9v9"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>', 'chevron-left': '<path d="m15 18-6-6 6-6"/>', 'chevron-down': '<path d="m6 9 6 6 6-6"/>', 'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>', 'calendar-plus': '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18M12 13v6M9 16h6"/>',
  file: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h5.5M15.5 13h-7M15.5 17h-7"/>', files: '<path d="M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6z"/><path d="M15 2v4h4M4 7v13a2 2 0 0 0 2 2h9"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V13h6v9"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  id: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><circle cx="8.5" cy="11" r="2.3"/><path d="M5 16.5c.8-1.5 2-2.2 3.5-2.2s2.7.7 3.5 2.2M15 9.5h3.5M15 13h3.5"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>', download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>', 'shield-plain': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', 'user-plus': '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13.3-6M19 14v6M16 17h6"/>',
  building: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M9 21.5v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>',
  store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9M9 21v-5h6v5"/>',
  truck: '<path d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  tent: '<path d="M3.5 21 12 4l8.5 17M8 21l4-8 4 8M2 21h20"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>', phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19"/>', link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', 'eye-off': '<path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.3M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock: '<rect x="4" y="11" width="16" height="10.5" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', key: '<circle cx="7.5" cy="15.5" r="5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>', share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>', filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>', sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>', heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>', trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0Z"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>', 'bar-chart': '<path d="M12 20V10M18 20V4M6 20v-4"/>', trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>', 'help': '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', 'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/>', rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>', box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  ruler: '<path d="M21.3 15.3 8.7 2.7a1 1 0 0 0-1.4 0L2.7 7.3a1 1 0 0 0 0 1.4l12.6 12.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="m7.5 10.5 2-2M10.5 13.5l2-2M13.5 16.5l2-2"/>',
  'pound': '<path d="M18 7c0-2.8-2.2-5-5-5S8 4.2 8 7v10c0 2.2-1.8 4-4 4h14M5 13h9"/>', percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>', coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  thumbs: '<path d="M7 10v12M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', ban: '<circle cx="12" cy="12" r="9.5"/><path d="m5.3 5.3 13.4 13.4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>', activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>', 'check-circle': '<circle cx="12" cy="12" r="9.5"/><path d="m8 12 3 3 5-6"/>', 'x-circle': '<circle cx="12" cy="12" r="9.5"/><path d="m15 9-6 6M9 9l6 6"/>',
  instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><path d="M17.5 6.5h.01"/>', linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>', tiktok: '<path d="M16 3a5 5 0 0 0 5 5v4a9 9 0 0 1-5-1.6V16a6 6 0 1 1-6-6v4a2 2 0 1 0 2 2V3z"/>',
  arch: '<path d="M5 21V10a7 7 0 0 1 14 0v11"/><path d="M3 21h18"/>', palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2c0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.3A5.6 5.6 0 0 0 22 10c0-4.4-4.5-8-10-8z"/>',
  type: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>', 'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
};
N.ICONS = ICONS;
N.ic = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const ic = N.ic;
function injectIcons() {
  const svg = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</defs></svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}

/* =====================================================================
   SAMPLE DATA (shared by all three apps so actions show up everywhere)
   ===================================================================== */
const FHRS = N.FHRS = { 0: 'Urgent improvement necessary', 1: 'Major improvement necessary', 2: 'Improvement necessary', 3: 'Generally satisfactory', 4: 'Good', 5: 'Very good' };
const db = N.db = {
  me: { trader: 'ag', org: 'reed', admin: { name: 'Sam Okafor', email: 'admin@niche.com' } },
  organisers: {
    reed:     { company: 'Reed Events', person: 'Olivia Reed', email: 'olivia@reedevents.demo', phone: '07700 800014', city: 'London', county: 'Greater London', address: '14 Camden Lock Place, London NW1 8AF', regNo: '10000014', type: 'ltd', role: 'Operations director', status: 'active', verify: 'approved', joined: '2025-11-02', rating: 4.8, website: 'reedevents.demo', tone: 'lilac' },
    northern: { company: 'Northern Markets Ltd', person: 'Grace Patel', email: 'northern@niche.demo', phone: '07700 800022', city: 'York', county: 'North Yorkshire', address: '1 High Street, York YO1 7HU', regNo: '10000022', type: 'ltd', role: 'Market manager', status: 'active', verify: 'approved', joined: '2026-09-25', rating: 5.0, website: '', tone: 'sky' },
    harbour:  { company: 'Harbour & Castle Events', person: 'Rhys Morgan', email: 'rhys@harbourcastle.demo', phone: '07700 800021', city: 'Cardiff', county: 'South Glamorgan', address: '3 Mermaid Quay, Cardiff CF10 5BZ', regNo: '10000021', type: 'ltd', role: 'Founder', status: 'active', verify: 'pending', joined: '2026-08-30', rating: 4.6, website: 'harbourcastle.demo', tone: 'peach' },
  },
  events: {
    camden:     { name: 'Camden Night Market', type: 'Night market', venue: 'Camden Lock Arches', city: 'London', county: 'Greater London', region: 'London', date: '2026-10-02', end: '2026-10-02', time: '17:00–23:00', pitches: 20, filled: 14, footfall: 4500, frontage: 4, fee: { model: 'pitch', amount: 150 }, org: 'reed', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'Asian Fusion', 'Desserts'], tone: 'lilac', about: 'Friday-night street food under the railway arches. Covered pitches, 16A hook-ups and a shared wash-up point.', deadline: '2026-09-30' },
    manchester: { name: 'Manchester Street Feast', type: 'Street food festival', venue: 'Northern Quarter Yard', city: 'Manchester', county: 'Greater Manchester', region: 'North', date: '2026-10-05', end: '2026-10-06', time: '12:00–22:00', pitches: 10, filled: 8, footfall: 6000, frontage: 5, fee: { model: 'commission', pct: 12 }, org: 'reed', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'BBQ'], tone: 'butter', about: 'A two-day street food takeover in the Northern Quarter with a curated ten-pitch line-up.', deadline: '2026-10-01' },
    bristol:    { name: 'Bristol Harbour Food Festival', type: 'Food festival', venue: 'Harbourside Amphitheatre', city: 'Bristol', county: 'Bristol', region: 'South West', date: '2026-10-09', end: '2026-10-11', time: '11:00–20:00', pitches: 20, filled: 11, footfall: 12000, frontage: 6, fee: { model: 'pitch', amount: 320 }, org: 'harbour', status: 'published', req: { fhrs: 5, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'Seafood', 'Desserts'], tone: 'sky', about: 'Harbourside festival over three days. Waterfront pitches with heavy footfall.', deadline: '2026-10-02' },
    brighton:   { name: 'Brighton Seafront Food Fest', type: 'Food festival', venue: 'Madeira Drive', city: 'Brighton', county: 'East Sussex', region: 'South East', date: '2026-10-13', end: '2026-10-13', time: '11:00–21:00', pitches: 20, filled: 9, footfall: 8000, frontage: 4, fee: { model: 'pitch', amount: 180 }, org: 'reed', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'Desserts', 'Coffee'], tone: 'peach', about: 'Promenade food festival facing the beach. Power is limited to 16A per pitch.', deadline: '2026-10-06' },
    york:       { name: 'York Artisan Food Market', type: 'Artisan market', venue: 'Parliament Street', city: 'York', county: 'North Yorkshire', region: 'North', date: '2026-10-20', end: '2026-10-20', time: '09:00–16:00', pitches: 20, filled: 12, footfall: 3500, frontage: 3, fee: { model: 'pitch', amount: 90 }, org: 'northern', status: 'published', req: { fhrs: 5, pli: 5, gas: false, allergen: true, power: '13A', elec: false }, cuisines: ['Bakery', 'Artisan'], tone: 'mint', about: 'City-centre artisan market. Stall-only site with 13A sockets and no gas cooking.', deadline: '2026-10-13' },
    leeds:      { name: 'Leeds Summer Festival', type: 'Music festival', venue: 'Roundhay Park', city: 'Leeds', county: 'West Yorkshire', region: 'North', date: '2026-10-25', end: '2026-10-26', time: '12:00–23:00', pitches: 20, filled: 6, footfall: 15000, frontage: 6, fee: { model: 'commission', pct: 15 }, org: 'reed', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'Bar'], tone: 'butter', about: 'Park festival with two music stages and a twenty-pitch food court.', deadline: '2026-10-15' },
    birmingham: { name: 'Birmingham Vegan Fair', type: 'Vegan fair', venue: 'Digbeth Arena', city: 'Birmingham', county: 'West Midlands', region: 'Midlands', date: '2026-11-09', end: '2026-11-09', time: '10:00–18:00', pitches: 40, filled: 18, footfall: 7000, frontage: 4, fee: { model: 'pitch', amount: 120 }, org: null, external: true, externalLink: 'https://birminghamveganfair.demo', externalEmail: 'hello@bvf.demo', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', vegan: true }, cuisines: ['Vegan'], tone: 'mint', about: 'The Midlands’ largest plant-based fair. Fully vegan menus only. Listed by the Niche team; applications go through the organiser’s own site.', deadline: '2026-10-26' },
    cotswolds:  { name: 'Cotswolds Summer Wedding Fair', type: 'Wedding fair', venue: 'Barnsley Barn', city: 'Cirencester', county: 'Gloucestershire', region: 'South West', date: '2026-11-24', end: '2026-11-24', time: '10:00–16:00', pitches: 12, filled: 5, footfall: 900, frontage: 4, fee: { model: 'pitch', amount: 200 }, org: 'reed', status: 'published', req: { fhrs: 5, pli: 10, gas: true, allergen: true, power: '13A', elec: true }, cuisines: ['Desserts', 'Coffee', 'Bar'], tone: 'lilac', about: 'Wedding fair in a converted barn, where couples book caterers for next year.', deadline: '2026-11-10' },
    cardiff:    { name: 'Cardiff Christmas Market', type: 'Christmas market', venue: 'Working Street', city: 'Cardiff', county: 'South Glamorgan', region: 'Wales', date: '2026-12-04', end: '2026-12-23', time: '10:00–20:00', pitches: 60, filled: 31, footfall: 20000, frontage: 3, fee: { model: 'pitch', amount: 950 }, org: 'harbour', status: 'published', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: true }, cuisines: ['Street food', 'Desserts', 'Bar'], tone: 'peach', about: 'Four weeks of Christmas market in the city centre, with chalets and trailer pitches.', deadline: '2026-11-06' },
    spring:     { name: 'Spring Street Food Series', type: 'Street food festival', venue: 'Granary Square', city: 'London', county: 'Greater London', region: 'London', date: '2027-02-22', end: '2027-02-22', time: '12:00–21:00', pitches: 25, filled: 0, footfall: 5000, frontage: 4, fee: { model: 'pitch', amount: 140 }, org: 'reed', status: 'draft', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food'], tone: 'mint', about: 'Monthly London street food series starting in February.', deadline: '2027-02-08' },
    greenwich:  { name: 'Greenwich Summer Market', type: 'Night market', venue: 'Greenwich Market', city: 'London', county: 'Greater London', region: 'London', date: '2026-08-16', end: '2026-08-16', time: '12:00–22:00', pitches: 18, filled: 18, footfall: 5200, frontage: 4, fee: { model: 'pitch', amount: 130 }, org: 'reed', status: 'completed', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food'], tone: 'sky', about: 'Summer evening market in the historic covered market.', deadline: '2026-08-01' },
    bristolw:   { name: 'Bristol Winter Market', type: 'Christmas market', venue: 'Queen Square', city: 'Bristol', county: 'Bristol', region: 'South West', date: '2026-02-14', end: '2026-02-15', time: '10:00–19:00', pitches: 16, filled: 16, footfall: 6000, frontage: 3, fee: { model: 'pitch', amount: 160 }, org: 'reed', status: 'completed', req: { fhrs: 4, pli: 5, gas: true, allergen: true, power: '16A', elec: false }, cuisines: ['Street food', 'Desserts'], tone: 'lilac', about: 'Winter weekend market in Queen Square.', deadline: '2026-01-31' },
  },
  traders: {
    ag: { biz: 'AG Foods', company: 'AG Foods Ltd', display: 'Alice Green Foods', person: 'Alice Green', email: 'trader1@niche.com', phone: '07700 900001', city: 'Manchester', county: 'Greater Manchester', since: 2016, food: 'Halal street food', cuisine: 'Middle Eastern', tags: ['Halal', 'Award-winning'], categories: ['Hot food'], fhrs: 5, authority: 'Manchester City Council', pli: 5, gas: '2026-10-21', allergen: true, power: '16A', status: 'approved', joined: '2025-06-10', rating: 5.0, bio: 'Award-winning halal street food: slow-cooked lamb wraps, charred chicken and loaded fries.', tone: 'mint', score: null },
    mw: { biz: 'Masala Wheels', company: 'Masala Wheels Ltd', person: 'Priya Shah', email: 'priya@niche.demo', phone: '07700 900004', city: 'Leicester', since: 2018, food: 'Gujarati street food', cuisine: 'Indian', tags: ['Halal', 'Family recipe'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-04-02', allergen: true, power: '16A', status: 'approved', joined: '2025-07-01', rating: 4.9, score: 98, bio: 'Family recipes from Gujarat, cooked fresh to order.', tone: 'butter' },
    tl: { biz: 'Taco Loco', company: 'Taco Loco Ltd', person: 'Maria Lopez', email: 'maria@niche.demo', phone: '07700 900009', city: 'London', since: 2021, food: 'Mexican street food', cuisine: 'Mexican', tags: ['Gluten-free'], categories: ['Hot food'], fhrs: 5, pli: 2, gas: '2027-01-15', allergen: true, power: '13A', status: 'pending', joined: '2026-09-24', rating: null, score: 84, bio: 'Corn tortillas pressed on site, slow-cooked fillings.', tone: 'peach' },
    gs: { biz: 'Gelato Sofia', company: 'Gelato Sofia Ltd', person: 'Sofia Rossi', email: 'sofia@niche.demo', phone: '07700 900006', city: 'Brighton', since: 2019, food: 'Small-batch gelato', cuisine: 'Italian', tags: ['Family recipe'], categories: ['Desserts'], fhrs: 5, pli: 5, gas: null, allergen: true, power: '13A', status: 'approved', joined: '2025-08-12', rating: 4.9, score: 100, bio: 'Small-batch Italian gelato and sorbets.', tone: 'lilac' },
    st: { biz: 'Smokehouse Tom', company: 'Smokehouse Tom Ltd', person: 'Tom Hughes', email: 'tom@niche.demo', phone: '07700 900005', city: 'Sheffield', since: 2015, food: 'Low-and-slow BBQ', cuisine: 'BBQ', tags: ['Award-winning'], categories: ['Hot food'], fhrs: 5, pli: 10, gas: '2026-10-10', allergen: true, power: '16A', status: 'approved', joined: '2025-05-20', rating: 4.7, score: 91, bio: 'Low-and-slow brisket, pulled pork and smoked wings.', tone: 'peach' },
    tb: { biz: 'Tokyo Bites', company: 'Tokyo Bites Ltd', person: 'Kenji Tanaka', email: 'kenji@niche.demo', phone: '07700 900007', city: 'London', since: 2020, food: 'Katsu, gyoza and ramen', cuisine: 'Japanese', tags: ['Organic'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-02-01', allergen: false, power: '16A', status: 'approved', joined: '2025-09-02', rating: 4.5, score: 86, bio: 'Katsu, gyoza and ramen bowls.', tone: 'sky' },
    gb: { biz: 'Green Bowl', company: 'Green Bowl Ltd', person: 'Hannah Green', email: 'hannah@niche.demo', phone: '07700 900008', city: 'Bristol', since: 2020, food: 'Plant-based bowls', cuisine: 'Vegan', tags: ['Vegan', 'Gluten-free'], categories: ['Hot food', 'Cold food'], fhrs: 5, pli: 5, gas: null, allergen: true, power: '16A', vegan: true, status: 'approved', joined: '2025-07-19', rating: 4.8, score: 100, bio: 'Plant-based bowls, wraps and smoothies.', tone: 'mint' },
    pp: { biz: 'Pizza Pilot', company: 'Pizza Pilot Ltd', person: 'Oliver Bennett', email: 'oliver@niche.demo', phone: '07700 900010', city: 'Bath', since: 2017, food: 'Wood-fired pizza', cuisine: 'Italian', tags: ['Award-winning'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: null, allergen: true, power: '13A', status: 'approved', joined: '2025-06-30', rating: 4.9, score: 97, bio: 'Neapolitan pizza from a wood-fired trailer oven.', tone: 'butter' },
    cs: { biz: 'Chai & Samosa', company: 'Chai & Samosa Ltd', person: 'Aisha Khan', email: 'aisha@niche.demo', phone: '07700 900011', city: 'Birmingham', since: 2019, food: 'Chai, samosas and chaat', cuisine: 'Indian', tags: ['Halal', 'Vegetarian'], categories: ['Hot food', 'Beverages'], fhrs: 5, pli: 5, gas: '2027-03-12', allergen: true, power: '13A', status: 'approved', joined: '2025-10-03', rating: 4.8, score: 96, bio: 'Masala chai, samosas and chaat.', tone: 'peach' },
    cr: { biz: 'Crêpe Station', company: 'Crêpe Station Ltd', person: 'Lucas Martin', email: 'lucas@niche.demo', phone: '07700 900012', city: 'London', since: 2018, food: 'Breton crêpes', cuisine: 'French', tags: ['Family recipe'], categories: ['Desserts'], fhrs: 5, pli: 5, gas: '2027-06-30', allergen: true, power: '16A', status: 'approved', joined: '2025-11-11', rating: 4.6, score: 95, bio: 'Sweet and savoury Breton crêpes.', tone: 'lilac' },
    wo: { biz: 'Wild Oats Bakery', company: 'Wild Oats Bakery Ltd', person: 'Emma Wilson', email: 'emma@niche.demo', phone: '07700 900013', city: 'York', since: 2016, food: 'Sourdough and bakes', cuisine: 'Bakery', tags: ['Organic'], categories: ['Bakery'], fhrs: 5, pli: 5, gas: null, allergen: true, power: '13A', status: 'approved', joined: '2025-06-01', rating: 5.0, score: 99, bio: 'Sourdough, brownies and celebration cakes.', tone: 'butter' },
    fs: { biz: 'Falafel Street', company: 'Falafel Street Ltd', person: 'Zara Ahmed', email: 'zara@niche.demo', phone: '07700 900015', city: 'Manchester', since: 2021, food: 'Falafel wraps and bowls', cuisine: 'Middle Eastern', tags: ['Halal', 'Vegan'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-05-18', allergen: true, power: '16A', vegan: true, status: 'approved', joined: '2025-12-05', rating: 4.7, score: 97, bio: 'Falafel wraps, hummus bowls and fresh juices.', tone: 'mint' },
    bb: { biz: 'Burger Barn', company: 'Burger Barn Ltd', person: 'Noah Evans', email: 'noah@niche.demo', phone: '07700 900016', city: 'Liverpool', since: 2019, food: 'Smash burgers', cuisine: 'American', tags: ['Award-winning'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-02-20', allergen: true, power: '32A', status: 'approved', joined: '2026-01-14', rating: 4.4, score: 90, bio: 'Smash burgers and loaded fries. Needs a 32A hook-up.', tone: 'peach' },
    bs: { biz: 'Bob Spice Kitchen', company: 'BSK Ltd', person: 'Bob Brown', email: 'bob@niche.demo', phone: '07700 900002', city: 'Leeds', since: 2014, food: 'Indian street food', cuisine: 'Indian', tags: ['Gluten-free'], categories: ['Hot food'], fhrs: 4, pli: 5, gas: '2027-01-30', allergen: true, power: '16A', status: 'approved', joined: '2025-05-02', rating: 4.3, score: 88, bio: 'Specialises in Indian street food.', tone: 'butter' },
    cw: { biz: 'Carol White Street Kitchen', company: 'White Foods Ltd', person: 'Carol White', email: 'carol@niche.demo', phone: '07700 900003', city: 'Newcastle', since: 2017, food: 'British comfort food', cuisine: 'British', tags: ['Organic'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2026-10-04', allergen: true, power: '16A', status: 'approved', joined: '2025-05-15', rating: 4.5, score: 78, bio: 'Trader with expiring documents.', tone: 'sky' },
    db: { biz: 'David Black Street Kitchen', company: 'DBSK Ltd', person: 'David Black', email: 'david@niche.demo', phone: '07700 900017', city: 'Glasgow', since: 2023, food: 'Scottish street food', cuisine: 'British', tags: [], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-03-01', allergen: true, power: '16A', status: 'rejected', joined: '2026-09-20', rating: null, score: 60, bio: 'New trader. Registration document could not be read.', tone: 'lilac', rejectReason: 'Food business registration was unreadable. Please upload a clearer scan.' },
    jc: { biz: "Carter's Coffee Co", company: "Carter's Coffee Co Ltd", person: 'James Carter', email: 'james@niche.demo', phone: '07700 900014', city: 'Leeds', since: 2019, food: 'Speciality coffee', cuisine: 'Coffee', tags: ['Organic'], categories: ['Beverages'], fhrs: 5, pli: 5, gas: null, allergen: true, power: '13A', status: 'pending', joined: '2026-09-25', rating: null, score: 0, bio: 'Speciality coffee from a converted horsebox.', tone: 'butter' },
    kb: { biz: 'Kerala Kitchen', company: 'Kerala Kitchen Ltd', person: 'Anil Menon', email: 'anil@niche.demo', phone: '07700 900018', city: 'London', since: 2022, food: 'South Indian dosa', cuisine: 'Indian', tags: ['Vegan', 'Gluten-free'], categories: ['Hot food'], fhrs: 5, pli: 5, gas: '2027-07-01', allergen: true, power: '16A', status: 'approved', joined: '2026-03-02', rating: 4.8, score: 94, bio: 'Crispy dosa, sambar and coconut chutney.', tone: 'mint' },
  },
  units: [
    { id: 'u1', trader: 'ag', name: 'Alice Street Truck', type: 'Standalone food truck', w: 4, d: 4, gas: true, power: '16A', water: false, status: 'active', cuisine: 'Halal street food', staff: 2 },
    { id: 'u2', trader: 'ag', name: 'Market Gazebo', type: 'Gazebo / marquee', w: 4, d: 4, gas: false, power: null, water: false, status: 'draft', cuisine: 'Halal street food', staff: 2 },
  ],
  docTypes: [
    { id: 'pli', name: 'Public Liability Insurance', tier: 1, level: 'Business', expiry: true, status: 'active', desc: 'Cover of at least £5m is standard for UK events.' },
    { id: 'fhc', name: 'Food Hygiene Certificate', tier: 1, level: 'Business', expiry: true, status: 'active', desc: 'Your FSA food hygiene rating and last inspection.' },
    { id: 'fsra', name: 'Food Safety Risk Assessment', tier: 1, level: 'Business', expiry: true, status: 'active', desc: 'HACCP-based food safety plan, reviewed yearly.' },
    { id: 'fbr', name: 'Food Business Registration', tier: 1, level: 'Business', expiry: false, status: 'active', desc: 'Registration with your local authority.' },
    { id: 'l2', name: 'Level 2/3 Food Hygiene Certificate', tier: 1, level: 'Person', expiry: true, status: 'active', desc: 'Food hygiene training for everyone handling food.' },
    { id: 'gas', name: 'Gas Safety Certificate', tier: 2, level: 'Unit', expiry: true, status: 'active', desc: 'Required if you cook with LPG. Issued by a Gas Safe engineer.' },
    { id: 'elec', name: 'Electrical Safety Certificate', tier: 2, level: 'Unit', expiry: true, status: 'active', desc: 'PAT and installation checks for units that draw power.' },
  ],
  // Alice's documents (trader app); admin verifies anything "pending"
  docs: [
    { id: 'd1', trader: 'ag', type: 'pli', status: 'approved', exp: '2027-02-28', uploaded: '2026-03-01', file: 'pli-hiscox-2026.pdf', note: '£5m cover · policy PL-448170' },
    { id: 'd2', trader: 'ag', type: 'fhc', status: 'approved', exp: '2027-06-14', uploaded: '2025-06-20', file: 'fhrs-5-manchester.pdf', note: 'Rating 5 · inspected 14 Jun 2025' },
    { id: 'd3', trader: 'ag', type: 'fsra', status: 'approved', exp: '2027-05-01', uploaded: '2026-05-02', file: 'haccp-plan-2026.pdf', note: 'Reviewed May 2026' },
    { id: 'd4', trader: 'ag', type: 'fbr', status: 'approved', exp: null, uploaded: '2024-03-03', file: 'fbr-manchester.pdf', note: 'Ref. FBR-20931' },
    { id: 'd5', trader: 'ag', type: 'l2', status: 'pending', exp: '2029-09-27', uploaded: '2026-09-28', file: 'level2-alice-green.pdf', note: 'Alice Green + 1 staff member' },
    { id: 'd6', trader: 'ag', type: 'gas', unit: 'u1', status: 'approved', exp: '2026-10-21', uploaded: '2025-10-22', file: 'gas-safe-record.pdf', note: 'LPG · 2 hobs, 1 fryer · engineer 548213' },
    { id: 'd7', trader: 'ag', type: 'elec', unit: 'u1', status: 'missing', exp: null, uploaded: null, file: null, note: '' },
    // other traders' documents waiting for admin review
    { id: 'd20', trader: 'jc', type: 'pli', status: 'pending', exp: '2027-09-01', uploaded: '2026-09-25', file: 'carter-pli.pdf', note: '£5m cover' },
    { id: 'd21', trader: 'jc', type: 'fhc', status: 'pending', exp: '2027-09-01', uploaded: '2026-09-25', file: 'carter-fhrs.pdf', note: 'Rating 5' },
    { id: 'd22', trader: 'jc', type: 'fbr', status: 'pending', exp: null, uploaded: '2026-09-25', file: 'carter-fbr.pdf', note: 'Leeds City Council' },
    { id: 'd23', trader: 'tl', type: 'pli', status: 'pending', exp: '2027-04-30', uploaded: '2026-09-24', file: 'tacoloco-pli.pdf', note: '£2m cover' },
    { id: 'd24', trader: 'cw', type: 'gas', status: 'approved', exp: '2026-10-04', uploaded: '2025-10-05', file: 'cw-gas.pdf', note: 'Expires in 5 days' },
  ],
  apps: [
    { id: 1, t: 'mw', e: 'camden', st: 'pending', at: -2, unit: 'Converted van · 5 × 2 m' },
    { id: 2, t: 'tl', e: 'camden', st: 'pending', at: -5, unit: 'Gazebo stall · 3 × 3 m' },
    { id: 3, t: 'gs', e: 'brighton', st: 'pending', at: -20, unit: 'Gelato cart · 2 × 1.5 m' },
    { id: 4, t: 'st', e: 'brighton', st: 'pending', at: -26, unit: 'Smoker trailer · 5 × 2.5 m' },
    { id: 5, t: 'ag', e: 'manchester', st: 'pending', at: -49, unit: 'Alice Street Truck' },
    { id: 6, t: 'tb', e: 'manchester', st: 'pending', at: -52, unit: 'Gazebo stall · 3 × 6 m' },
    { id: 7, t: 'gb', e: 'leeds', st: 'pending', at: -70, unit: 'Horsebox bar · 3 × 2 m' },
    { id: 8, t: 'ag', e: 'leeds', st: 'info', at: -30, unit: 'Alice Street Truck', q: ['Do you need a water point on site?', 'Roughly how many covers can you serve per hour?'] },
    { id: 9, t: 'ag', e: 'camden', st: 'approved', at: -200, unit: 'Alice Street Truck', pitch: '12', rec: { by: 'Olivia Reed', when: '18 Sep', note: 'All documents valid on event day.' } },
    { id: 10, t: 'gb', e: 'camden', st: 'approved', at: -210, pitch: '4' },
    { id: 11, t: 'st', e: 'camden', st: 'approved', at: -230, pitch: '7' },
    { id: 12, t: 'pp', e: 'camden', st: 'approved', at: -260, pitch: '15' },
    { id: 13, t: 'cr', e: 'brighton', st: 'approved', at: -150, pitch: '3' },
    { id: 14, t: 'wo', e: 'brighton', st: 'approved', at: -160, pitch: '6' },
    { id: 15, t: 'mw', e: 'manchester', st: 'approved', at: -300, pitch: '2' },
    { id: 16, t: 'cs', e: 'manchester', st: 'approved', at: -310, pitch: '5' },
    { id: 17, t: 'fs', e: 'leeds', st: 'approved', at: -120, pitch: '1' },
    { id: 18, t: 'pp', e: 'leeds', st: 'approved', at: -125, pitch: '2' },
    { id: 19, t: 'tb', e: 'camden', st: 'rejected', at: -190, rec: { by: 'Olivia Reed', when: '19 Sep', note: 'Allergen matrix missing after the menu change.' } },
    { id: 20, t: 'bb', e: 'brighton', st: 'rejected', at: -170, rec: { by: 'Olivia Reed', when: '22 Sep', note: 'Needs 32A. The seafront site supplies 16A only.' } },
    { id: 21, t: 'ag', e: 'bristol', st: 'approved', at: -100, unit: 'Alice Street Truck', pitch: 'B7', via: 'invite' },
    { id: 22, t: 'ag', e: 'greenwich', st: 'approved', at: -1100, unit: 'Alice Street Truck', pitch: '9', done: true },
    { id: 23, t: 'ag', e: 'cotswolds', st: 'rejected', at: -400, unit: 'Alice Street Truck', rec: { by: 'Olivia Reed', when: '2 Sep', note: 'This fair needs £10m public liability cover.' } },
    { id: 24, t: 'ag', e: 'bristolw', st: 'approved', at: -5500, unit: 'Alice Street Truck', pitch: '3', done: true },
    { id: 25, t: 'gb', e: 'greenwich', st: 'approved', at: -1150, pitch: '2', done: true },
    { id: 26, t: 'st', e: 'greenwich', st: 'approved', at: -1160, pitch: '5', done: true },
  ],
  invites: [
    { id: 'i1', t: 'ag', e: 'cardiff', from: 'harbour', at: -6, unit: 'u1', st: 'open', msg: 'We loved your line-up at Bristol. Would you like a chalet pitch?' },
    { id: 'i2', t: 'ag', e: 'brighton', from: 'reed', at: -40, unit: 'u1', st: 'open', msg: 'We have two seafront pitches left and your passport matches.' },
    { id: 'i3', t: 'kb', e: 'leeds', from: 'reed', at: -20, st: 'open' },
  ],
  // organiser -> trader ratings, trader -> organiser ratings
  reviews: [
    { id: 'r1', from: 'reed', to: 'ag', dir: 'o2t', e: 'greenwich', stars: 5, when: '2026-09-25', text: 'Excellent trader, very professional and great food.', punct: 5, qual: 5, comm: 5 },
    { id: 'r2', from: 'reed', to: 'st', dir: 'o2t', e: 'greenwich', stars: 4, when: '2026-08-20', text: 'Great queue management, arrived a little late.', punct: 3, qual: 5, comm: 4 },
    { id: 'r3', from: 'ag', to: 'reed', dir: 't2o', e: 'greenwich', stars: 5, when: '2026-08-18', text: 'Clear load-in times and a great crowd.' },
  ],
  notifications: {
    trader: [
      { id: 'n1', at: -3, tone: 'warn', title: 'Your Gas Safety Certificate expires on 21 Oct', text: 'Upload the renewal to keep Leeds Summer Festival valid.', go: 'trader/documents', unread: true },
      { id: 'n2', at: -6, tone: 'info', title: "You've been invited to apply to Cardiff Christmas Market", text: 'Harbour & Castle Events sent an invitation.', go: 'trader/invitations', unread: true },
      { id: 'n3', at: -30, tone: 'warn', title: 'Reed Events asked 2 questions', text: 'Leeds Summer Festival · answer to keep your application moving.', go: 'trader/applications', unread: true },
      { id: 'n4', at: -100, tone: 'ok', title: 'Approved for Bristol Harbour Food Festival', text: 'Pitch B7 · Harbour & Castle Events.', go: 'trader/applications', unread: false },
      { id: 'n5', at: -200, tone: 'ok', title: 'Approved for Camden Night Market', text: 'Pitch 12 · Reed Events.', go: 'trader/applications', unread: false },
      { id: 'n6', at: -30, tone: 'info', title: 'Level 2/3 certificate received', text: 'Our team is reviewing it. This usually takes one working day.', go: 'trader/documents', unread: false },
    ],
    org: [
      { id: 'o1', at: -2, tone: 'info', title: 'Masala Wheels applied to Camden Night Market', text: 'All requirements met · readiness 98%.', go: 'org/applications', unread: true },
      { id: 'o2', at: -20, tone: 'warn', title: "Smokehouse Tom's Gas Safety Certificate expires 10 Oct", text: 'That is 3 days before Brighton Seafront Food Fest.', go: 'org/applications', unread: true },
      { id: 'o3', at: -48, tone: 'ok', title: 'Approval confirmed for Hannah Green', text: 'Green Bowl · Camden Night Market · pitch 4.', go: 'org/applications', unread: false },
      { id: 'o4', at: -72, tone: 'info', title: 'Your Event Pass year 1 is active', text: 'No fees until 1 Nov 2026.', go: 'org/subscription', unread: false },
    ],
    admin: [
      { id: 'a1', at: -1, tone: 'info', title: 'James Carter signed up as a trader', text: "Carter's Coffee Co · 3 documents to review.", go: 'admin/traders/jc', unread: true },
      { id: 'a2', at: -28, tone: 'info', title: 'Alice Green uploaded a Level 2/3 certificate', text: 'AG Foods · waiting for document review.', go: 'admin/traders/ag', unread: true },
      { id: 'a3', at: -30, tone: 'warn', title: 'Harbour & Castle Events is waiting for compliance review', text: 'Organiser verification · submitted 30 Aug.', go: 'admin/organisers/harbour', unread: true },
      { id: 'a4', at: -120, tone: 'ok', title: 'Northern Markets published York Artisan Food Market', text: '20 pitches · 20 Oct.', go: 'admin/events', unread: false },
    ],
  },
  feedback: [
    { id: 'f1', from: 'Olivia Reed', role: 'Organiser', type: 'Website / Platform', subject: 'Bulk-approving applications would save time.', text: 'When 10+ traders meet every rule I would like to approve them in one go.', at: -80, status: 'open' },
    { id: 'f2', from: 'Olivia Reed', role: 'Organiser', type: 'Event Issue', subject: 'Would love more bins near the trader area.', text: 'Greenwich Summer Market: bins ran out by 7pm.', at: -600, status: 'resolved' },
    { id: 'f3', from: 'Alice Green', role: 'Trader', type: 'Event Issue', subject: 'The event layout made it hard to find the entrance.', text: 'Load-in gate was not signposted at Greenwich.', at: -700, status: 'open' },
    { id: 'f4', from: 'Tom Hughes', role: 'Trader', type: 'Website / Platform', subject: 'Document upload failed on mobile Safari.', text: 'Uploading a photo of my certificate stalled at 90%.', at: -40, status: 'open' },
  ],
  countries: [
    { id: 'gb', name: 'United Kingdom', code: 'GB', phone: '+44', added: '2025-04-01', verify: true, enabled: true },
    { id: 'ie', name: 'Ireland', code: 'IE', phone: '+353', added: '2026-06-12', verify: false, enabled: true },
  ],
  states: ['Greater London', 'Greater Manchester', 'West Yorkshire', 'North Yorkshire', 'South Yorkshire', 'East Sussex', 'West Sussex', 'Bristol', 'Gloucestershire', 'Somerset', 'Devon', 'Cornwall', 'Kent', 'Surrey', 'Essex', 'West Midlands', 'Merseyside', 'Tyne and Wear', 'South Glamorgan', 'Glasgow City', 'City of Edinburgh', 'Leicestershire', 'Nottinghamshire', 'Oxfordshire', 'Cambridgeshire', 'Norfolk', 'Hampshire', 'Lancashire', 'Cheshire', 'Derbyshire', 'County Dublin', 'County Cork'].map((n, i) => ({ id: 's' + i, name: n, country: i >= 30 ? 'Ireland' : 'United Kingdom' })),
  tags: {
    cuisines: ['Asian Fusion', 'Indian', 'Italian', 'Mexican', 'Middle Eastern', 'BBQ', 'Japanese', 'Caribbean', 'Vegan', 'French', 'British', 'American', 'Bakery', 'Coffee'],
    eventTypes: ['Night market', 'Street food festival', 'Food festival', 'Artisan market', 'Christmas market', 'Wedding fair', 'Music festival', 'Vegan fair', 'Corporate event', 'Charity gala', 'Pop-up kitchen'],
    foodCategories: ['Hot food', 'Cold food', 'Beverages', 'Desserts', 'Bakery', 'Bar'],
    specialityTags: ['Halal', 'Vegan', 'Vegetarian', 'Gluten-free', 'Organic', 'Award-winning', 'Family recipe', 'Kosher'],
  },
  roles: [
    { id: 'admin', name: 'Admin', desc: 'Full platform access, approvals and settings.', status: 'active', added: '2025-04-01' },
    { id: 'organiser', name: 'Organiser', desc: 'Creates events, reviews applications, rates traders.', status: 'active', added: '2025-04-01' },
    { id: 'trader', name: 'Trader', desc: 'Builds a passport, applies to events, rates organisers.', status: 'active', added: '2025-04-01' },
    { id: 'reviewer', name: 'Compliance reviewer', desc: 'Verifies documents. No access to settings.', status: 'active', added: '2026-02-10' },
    { id: 'support', name: 'Support', desc: 'Reads accounts and feedback. Cannot approve.', status: 'inactive', added: '2026-05-22' },
  ],
  // passport completion weights (the current live site sums to 90%, so passports stop at 90%)
  scores: [
    { id: 'sc1', label: 'Profile & bio', pct: 20, url: '/trader/profile' },
    { id: 'sc2', label: 'Business info', pct: 15, url: '/trader/business-info' },
    { id: 'sc3', label: 'Trading unit', pct: 25, url: '/trader/units' },
    { id: 'sc4', label: 'Documents', pct: 30, url: '/trader/documents' },
    { id: 'sc5', label: 'Speciality tags', pct: 10, url: '/trader/profile' },
  ],
  tnc: [
    { id: 't1', role: 'trader', version: 3, status: 'active', date: '2026-06-01', title: 'Trader terms v3', summary: 'Adds document reuse consent and the NICHE Advance service.' },
    { id: 't2', role: 'trader', version: 2, status: 'inactive', date: '2025-11-01', title: 'Trader terms v2', summary: 'Subscription tiers and renewal reminders.' },
    { id: 't3', role: 'organiser', version: 2, status: 'active', date: '2026-04-15', title: 'Organiser terms v2', summary: 'Event Pass: free year 1, 8% commission from year 2.' },
    { id: 't4', role: 'organiser', version: 1, status: 'inactive', date: '2025-04-01', title: 'Organiser terms v1', summary: 'Launch terms.' },
  ],
  blog: [
    { slug: 'documents-checklist-2026', cat: 'Getting started', date: '2026-09-02', mins: 8, aud: 'For traders', title: 'What documents do you need to trade at a UK food event? The 2026 checklist', excerpt: 'Registration, insurance, gas, allergens, hygiene: the full list, what expires when, and which level of your business each one attaches to.', tone: 'mint' },
    { slug: 'start-street-food-business', cat: 'Starting out', date: '2026-08-28', mins: 9, aud: 'For traders', title: 'How to start a street food business in the UK: from idea to first pitch', excerpt: 'The real order of operations, from concept and registration to kit, licences, insurance and finding your first events.', tone: 'butter' },
    { slug: 'what-traders-make', cat: 'Money & pricing', date: '2026-08-20', mins: 6, aud: 'For traders', title: 'How much do food traders really make at UK events? (Averages lie. Here’s the maths.)', excerpt: 'A simple model to estimate your own takings and profit at any event, and the four things that decide whether you make money.', tone: 'peach' },
    { slug: 'vet-food-traders', cat: 'For organisers', date: '2026-08-14', mins: 7, aud: 'For organisers', title: 'How to vet food traders for your event without drowning in paperwork', excerpt: 'Booking food traders means taking on a little of other people’s risk. Check the right things efficiently and know the red flags.', tone: 'lilac' },
    { slug: 'curating-food-lineup', cat: 'For organisers', date: '2026-08-07', mins: 5, aud: 'For organisers', title: 'Curating the right food line-up: getting the mix right for your event', excerpt: 'A great line-up balances variety, dietary needs, price points, queues and the practical needs of every trader.', tone: 'sky' },
    { slug: 'natashas-law-events', cat: 'Compliance', date: '2026-07-31', mins: 6, aud: 'Traders & organisers', title: "Natasha's Law at events: the allergen rules both traders and organisers need to know", excerpt: 'Understand PPDS, written allergen information, and what traders and organisers need to check at events.', tone: 'mint' },
  ],
  plans: {
    trader: [
      { id: 'lite', name: 'Lite', price: 0, then: null, tag: 'Get found. Create your trader passport and start applying.', note: 'Free forever', cta: 'Start free', features: ['Food Trader Passport profile', 'Basic business profile', 'Document upload (limited)', 'Browse public events (limited)', 'Apply to events', 'Renewal reminders', 'Event discovery & matching'] },
      { id: 'growth', name: 'Growth', price: 0, then: 15, tag: 'Stay compliant and apply with confidence. For active traders.', note: 'Then £15/month after 3 months', cta: 'Choose Growth', features: ['Everything in Lite, plus:', 'Unlimited document upload & storage', 'Full compliance readiness states', 'Expiry alerts & renewal reminders', 'Document reuse across applications', 'Apply to events + track status', 'Food trader passport'] },
      { id: 'pro', name: 'Pro', price: 0, then: 29, tag: 'Get discovered and win work. For traders who want to grow bookings.', note: 'Then £29/month after 3 months', cta: 'Choose Pro', popular: true, features: ['Everything in Growth, plus:', 'Eligibility-filtered event discovery', 'Smart event-fit matching insights', 'Priority visibility to organisers', 'Reliability score & benchmarking', "Trader insights: what's missing to improve", 'Enhanced organiser-facing profile'] },
      { id: 'advance', name: 'NICHE Advance', price: 239, then: null, tag: 'Fully managed service for established food traders.', note: 'No free period', cta: 'Apply for Advance', managed: true, features: ['We find events and complete applications', 'We manage your social media', 'We handle every organiser conversation', 'We keep your documents renewed', '15% commission on off-platform bookings', 'Extra applications at £12 each'] },
    ],
    current: { trader: 'growth', org: 'eventpass' },
  },
  ui: { attn: {} },
};

/* ---------- rules ---------- */
N.docType = id => db.docTypes.find(d => d.id === id);
N.docState = d => {
  if (!d || d.status === 'missing') return 'missing';
  if (d.status === 'rejected') return 'rejected';
  if (d.status === 'pending') return 'pending';
  if (d.exp && N.daysFrom(d.exp) < 0) return 'expired';
  if (d.exp && N.daysFrom(d.exp) <= 30) return 'expiring';
  return 'valid';
};
N.docsOf = tid => db.docs.filter(d => d.trader === tid);
/* compliance readiness: share of required documents that are valid (expiring and in-review count half) */
N.readiness = tid => {
  if (tid !== 'ag') return db.traders[tid]?.score ?? 0;
  const req = db.docTypes.filter(t => t.status === 'active' && (t.tier === 1 || (t.id === 'gas' && db.traders.ag.gas) || t.id === 'elec'));
  let s = 0;
  req.forEach(t => { const d = db.docs.find(x => x.trader === tid && x.type === t.id); const st = N.docState(d); s += st === 'valid' ? 1 : (st === 'expiring' || st === 'pending') ? .5 : 0; });
  return Math.round(s / req.length * 100);
};
/* passport completion: admin-weighted sections (Scores page) */
N.completion = tid => {
  const done = { 'Profile & bio': true, 'Business info': true, 'Trading unit': db.units.some(u => u.trader === tid && u.status === 'active'), 'Documents': N.readiness(tid) >= 90, 'Speciality tags': (db.traders[tid]?.tags || []).length > 0 };
  const total = db.scores.reduce((a, s) => a + Number(s.pct), 0);
  const got = db.scores.reduce((a, s) => a + (done[s.label] ? Number(s.pct) : 0), 0);
  return { pct: Math.round(got / Math.max(total, 1) * 100), total, got, parts: db.scores.map(s => ({ ...s, done: !!done[s.label] })) };
};
N.syncAlice = () => { const g = db.docs.find(d => d.trader === 'ag' && d.type === 'gas'); db.traders.ag.gas = g && g.status !== 'missing' ? g.exp : null; };
const PW = { '13A': 1, '16A': 2, '32A': 3 };
N.evalChecks = (tid, eid) => {
  const t = db.traders[tid], e = db.events[eid], r = e.req, out = [];
  out.push({ key: 'fhrs', label: `Food hygiene rating ${r.fhrs}${r.fhrs < 5 ? ' or above' : ''}`, val: `${t.fhrs} · ${FHRS[t.fhrs]}`, st: t.fhrs >= r.fhrs ? 'ok' : 'fail', miss: `Hygiene rating ${r.fhrs}` });
  out.push({ key: 'pli', label: `Public liability £${r.pli}m or more`, val: `£${t.pli}m cover`, st: t.pli >= r.pli ? 'ok' : 'fail', miss: `£${r.pli}m cover` });
  if (r.gas) {
    if (!t.gas) out.push({ key: 'gas', label: 'Gas Safety Certificate', val: 'No gas appliances', st: 'ok' });
    else { const gap = Math.round((N.dt(t.gas) - N.dt(e.date)) / DAY); out.push({ key: 'gas', label: 'Gas Safety valid on event day', val: gap < 0 ? `Expires ${N.fShort(t.gas)}, ${N.plural(-gap, 'day')} before` : `Valid to ${N.fShort(t.gas)}`, st: gap < 0 ? 'warn' : 'ok', miss: 'Gas Safety renewal' }); }
  } else if (t.gas) out.push({ key: 'gas', label: 'No gas cooking on site', val: 'Cooks with LPG', st: 'fail', miss: 'No-gas site' });
  if (r.allergen) out.push({ key: 'allergen', label: 'Allergen information (14 allergens)', val: t.allergen ? 'Up to date' : 'Not uploaded', st: t.allergen ? 'ok' : 'fail', miss: 'Allergen information' });
  out.push({ key: 'power', label: `Power: ${r.power} per pitch`, val: t.power ? `Needs ${t.power}` : 'No power needed', st: !t.power || PW[t.power] <= PW[r.power] ? 'ok' : 'fail', miss: `Site has ${r.power} only` });
  if (r.elec) { const el = tid === 'ag' ? N.docState(db.docs.find(d => d.trader === 'ag' && d.type === 'elec')) : 'valid'; out.push({ key: 'elec', label: 'Electrical Safety Certificate', val: el === 'valid' ? 'Valid' : el === 'missing' ? 'Not uploaded' : N.cap(el), st: el === 'valid' ? 'ok' : el === 'missing' ? 'fail' : 'warn', miss: 'Electrical Safety Certificate' }); }
  if (r.vegan) out.push({ key: 'vegan', label: 'Fully plant-based menu', val: t.vegan ? 'Plant-based' : 'Serves meat', st: t.vegan ? 'ok' : 'fail', miss: 'Plant-based menu' });
  return out;
};
N.sumChecks = cs => { const f = cs.filter(c => c.st === 'fail').length, w = cs.filter(c => c.st === 'warn').length; return f ? { cls: 'risk', txt: `${f} missing`, can: false } : w ? { cls: 'warn', txt: `${w} expiring`, can: true } : { cls: 'ok', txt: 'All met', can: true }; };
N.matchScore = (tid, eid) => { const cs = N.evalChecks(tid, eid); const s = cs.reduce((a, c) => a + (c.st === 'ok' ? 1 : c.st === 'warn' ? .5 : 0), 0); return Math.round(s / cs.length * 100); };
N.orgOf = eid => db.events[eid].org ? db.organisers[db.events[eid].org] : { company: 'External listing', person: '—' };
N.orgName = eid => db.events[eid].org ? db.organisers[db.events[eid].org].company : 'External listing';
N.eventState = e => e.status === 'draft' ? 'draft' : e.status === 'cancelled' ? 'cancelled' : e.status === 'postponed' ? 'postponed' : e.status === 'completed' || N.daysFrom(e.end || e.date) < 0 ? 'completed' : N.daysFrom(e.date) <= 0 ? 'live' : 'upcoming';
N.appLabel = { pending: ['info', 'Pending review'], info: ['warn', 'Needs info'], approved: ['ok', 'Approved'], rejected: ['risk', 'Rejected'], withdrawn: ['plain', 'Withdrawn'] };
N.traderStatus = { approved: ['ok', 'Approved'], pending: ['warn', 'Pending'], rejected: ['risk', 'Rejected'], suspended: ['risk', 'Suspended'] };

/* =====================================================================
   UI HELPERS (return HTML strings)
   ===================================================================== */
const esc = N.esc;
const TONES = ['mint', 'lilac', 'butter', 'peach', 'sky'];
N.tone = s => TONES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
N.wm = (cls = '') => `<span class="wm ${cls}">n<span class="wi">ı</span>che</span>`;
N.chip = (cls, text) => `<span class="chip ${cls}">${esc(text)}</span>`;
N.statusChip = (map, key) => { const m = map[key] || ['plain', key]; return N.chip(m[0], m[1]); };
N.docChip = st => ({ valid: N.chip('ok', 'Approved'), expiring: N.chip('warn', 'Expiring'), pending: N.chip('info', 'In review'), rejected: N.chip('risk', 'Rejected'), expired: N.chip('risk', 'Expired'), missing: N.chip('plain', 'Not uploaded') }[st]);
N.av = (text, tone = 'mint', size = '') => `<span class="av ${tone} ${size}" aria-hidden="true">${esc(text)}</span>`;
N.tav = (tid, size = '') => { const t = db.traders[tid]; return N.av(N.initials(t.biz), t.tone, size); };
N.oav = (oid, size = '') => { const o = db.organisers[oid]; return N.av(N.initials(o.company), o.tone, size); };
const RC = 2 * Math.PI * 52;
N.ring = (p, cls = '', label = 'ready') => `<div class="ring ${cls}" data-p="${p}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" style="stroke-dasharray:${RC.toFixed(1)}px;stroke-dashoffset:${(RC * (1 - p / 100)).toFixed(1)}px"/></svg><div class="t"><b>${p}%</b>${label ? `<span>${label}</span>` : ''}</div></div>`;
N.setRing = (el, p) => { const fg = el.querySelector('.fg'); fg.style.strokeDashoffset = (RC * (1 - p / 100)).toFixed(1) + 'px'; el.querySelector('.t b').textContent = p + '%'; };
N.bar = (p, cls = '') => `<span class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></span>`;
N.rd = p => `<span class="rd">${N.bar(p, p >= 90 ? 'ok' : p >= 80 ? 'warn' : 'risk')}${p}%</span>`;
N.stars = (n, max = 5) => `<span class="stars" aria-label="${n} out of ${max}">${Array.from({ length: max }, (_, i) => `<svg class="ic ${i < Math.round(n) ? '' : 'off'}" aria-hidden="true"><use href="#i-star"/></svg>`).join('')}</span>`;
N.starInput = (name, val = 0) => `<span class="star-input" data-stars="${name}" data-v="${val}" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= val ? 'on' : ''}" data-star="${i}" aria-label="${i} star${i > 1 ? 's' : ''}">${ic('star')}</button>`).join('')}</span>`;
N.fhrs = (v, label = true) => `<div class="fhrs" role="img" aria-label="Food hygiene rating ${v} out of 5, ${FHRS[v]}">${label ? '<span class="fhrs-l">Food hygiene rating</span>' : ''}<div class="fhrs-row">${[0, 1, 2, 3, 4, 5].map(n => `<i class="${n === v ? 'on' : ''}">${n}</i>`).join('')}</div><span class="fhrs-v">${FHRS[v]}</span></div>`;
N.evd = (s, cls = '') => `<span class="evd ${cls}"><span>${N.fd(s, { month: 'short' })}</span><b>${N.fd(s, { day: '2-digit' })}</b></span>`;
N.art = (tone, big, small, cls = '') => `<div class="art t-${tone} ${cls}"><div class="art-arch"><div><b>${esc(big)}</b>${small ? `<span>${esc(small)}</span>` : ''}</div></div></div>`;
N.empty = (title, text, action = '', icon = 'inbox') => `<div class="empty"><div class="arch-ill">${ic(icon, 'ic-lg')}</div><b>${esc(title)}</b><p>${text}</p>${action}</div>`;
N.tabsHTML = (items, active, attr) => `<div class="tabs" role="tablist">${items.map(([k, l, n]) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${k === active}">${esc(l)}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
N.utabs = (items, active, attr) => `<div class="utabs" role="tablist">${items.map(([k, l, n]) => `<button type="button" role="tab" ${attr}="${k}" aria-selected="${k === active}">${esc(l)}${n != null ? `<span class="count">${n}</span>` : ''}</button>`).join('')}</div>`;
N.stepper = (steps, i) => `<ol class="stepper">${steps.map((s, k) => `<li class="${k < i ? 'done' : k === i ? 'on' : ''}"><i>${k < i ? ic('check', 'ic-sm') : k + 1}</i>${esc(s)}</li>`).join('')}</ol>`;
N.pager = (page, pages, attr, total, per) => pages <= 1 ? (total != null ? `<div class="pager"><span class="small muted">${N.plural(total, 'result')}</span></div>` : '') : `<div class="pager"><span class="small muted">${total != null ? `Showing ${(page - 1) * per + 1}–${Math.min(page * per, total)} of ${total}` : ''}</span><div class="pages"><button type="button" class="pg" ${attr}="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${ic('chevron-left')}</button>${Array.from({ length: pages }, (_, i) => `<button type="button" class="pg" ${attr}="${i + 1}" aria-current="${i + 1 === page}">${i + 1}</button>`).join('')}<button type="button" class="pg" ${attr}="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">${ic('chevron-right')}</button></div></div>`;
N.kv = (pairs, cls = '') => `<dl class="kv ${cls}">${pairs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
N.reqList = cs => `<ul class="req-list">${cs.map(c => `<li class="${c.st}"><span class="rq-ic">${ic(c.st === 'ok' ? 'check' : c.st === 'warn' ? 'clock' : 'x')}</span><span>${esc(c.label)}</span><span class="rq-v">${esc(c.val)}</span></li>`).join('')}</ul>`;
N.checked = (label = 'Checked') => `<span class="checked">${ic('shield')}${esc(label)}</span>`;
N.stamp = id => `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><path id="${id}" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs><circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M40 84V58a20 20 0 0 1 40 0v26" fill="none" stroke="currentColor" stroke-width="2"/><text fill="currentColor" style="font-family:var(--f-mono);font-size:10px;font-weight:500;letter-spacing:1.5px"><textPath href="#${id}" textLength="276">READY TO TRADE · NICHE CHECKED ·</textPath></text><path d="M49 66l8 8 15-17" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
N.field = ({ label, id, type = 'text', value = '', ph = '', req = false, hint = '', opts = null, full = false, rows = 4, attrs = '' }) => {
  const control = opts ? `<select class="sel" id="${id}" name="${id}" ${req ? 'required' : ''} ${attrs}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`
    : type === 'textarea' ? `<textarea class="ta" id="${id}" name="${id}" rows="${rows}" placeholder="${esc(ph)}" ${req ? 'required' : ''} ${attrs}>${esc(value)}</textarea>`
    : `<input class="inp" id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(ph)}" ${req ? 'required' : ''} ${attrs}>`;
  return `<label class="field ${full ? 'full' : ''}" for="${id}"><span class="${req ? 'req' : ''}">${esc(label)}${hint ? ` <span class="hint">${esc(hint)}</span>` : ''}</span>${control}</label>`;
};
N.toggle = (id, label, on = false, attrs = '') => `<label class="switch"><input type="checkbox" id="${id}" name="${id}" ${on ? 'checked' : ''} ${attrs}><span class="trk"></span>${esc(label)}</label>`;
N.checkbox = (id, label, on = false, attrs = '') => `<label class="check"><input type="checkbox" id="${id}" name="${id}" ${on ? 'checked' : ''} ${attrs}><span class="box">${ic('check')}</span><span>${label}</span></label>`;
N.seg = (key, opts, val, attr = 'data-seg') => `<div class="seg" ${attr}="${key}">${opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(val)}">${esc(l)}</button>`).join('')}</div>`;
N.formData = form => Object.fromEntries([...new FormData(form).entries()]);
N.passportCard = (tid, opts = {}) => {
  const t = db.traders[tid], docs = N.docsOf(tid).filter(d => d.status !== 'missing');
  return `<article class="passport ${opts.cls || ''}">
    <header class="row between"><div class="stack" style="--g:2px">${N.wm('wm-sm on-dark')}<span class="eyebrow">Food Trader Passport</span></div><span class="mono muted">NCH-26-${String(100 + Object.keys(db.traders).indexOf(tid)).padStart(4, '0')}</span></header>
    <div class="row" style="--g:14px">${N.tav(tid, 'lg')}<div class="stack" style="--g:2px"><b style="font-family:var(--f-display);font-weight:var(--w-display);font-size:28px;letter-spacing:-.02em;line-height:1">${esc(t.display || t.biz)}</b><span class="muted small">${esc(t.person)} · ${esc(t.food)} · since ${t.since}</span></div></div>
    <div style="color:var(--on-hedge)">${N.fhrs(t.fhrs)}</div>
    <ul class="pp-docs">${docs.slice(0, opts.max || 5).map(d => { const st = N.docState(d); return `<li><span class="dot ${st === 'valid' ? 'ok' : st === 'expiring' ? 'warn' : st === 'pending' ? 'info' : 'risk'}"></span>${esc(N.docType(d.type).name)}<span class="mono">${st === 'pending' ? 'in review' : d.exp ? 'to ' + N.fShort(d.exp) + ' ' + N.fd(d.exp, { year: '2-digit' }) : 'no expiry'}</span></li>`; }).join('')}</ul>
    ${opts.stamp !== false ? `<div class="stamp ${opts.hit ? 'hit' : ''}" style="position:absolute;right:18px;bottom:18px;width:96px">${N.stamp('st-' + tid + (opts.sid || ''))}</div>` : ''}
  </article>`;
};

/* =====================================================================
   OVERLAYS
   ===================================================================== */
let drawer, scrim, modal, tip, lastFocus = null;
function focusIn(el) { requestAnimationFrame(() => { const f = el.querySelector('[autofocus]') || el.querySelector('input:not([type=hidden]), textarea, select, button:not(.modal-x):not([data-close])') || el.querySelector('button'); (f || el).focus({ preventScroll: true }); }); }
N.openDrawer = (html, cls = '') => { if (!drawer.classList.contains('on')) lastFocus = document.activeElement; drawer.className = 'drawer on ' + cls; drawer.innerHTML = html; scrim.classList.add('on'); focusIn(drawer); N.applyNotes(); };
N.drawerOpen = () => drawer.classList.contains('on');
N.closeDrawer = () => { drawer.classList.remove('on'); if (!modal.classList.contains('on')) scrim.classList.remove('on'); $$('tr.sel').forEach(r => r.classList.remove('sel')); };
N.openModal = (html, cls = '') => { if (!modal.classList.contains('on')) lastFocus = document.activeElement; modal.className = 'modal on ' + cls; modal.innerHTML = `<button type="button" class="icon-btn modal-x" data-close aria-label="Close">${ic('x')}</button>` + html; scrim.classList.add('on'); focusIn(modal); };
N.modalOpen = () => modal.classList.contains('on');
N.closeModal = () => { modal.classList.remove('on'); if (!N.drawerOpen()) scrim.classList.remove('on'); };
N.closeAll = () => { N.closeModal(); N.closeDrawer(); closePops(); $$('.mobile-menu').forEach(m => m.remove()); $$('.rail.open').forEach(r => r.classList.remove('open')); if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); lastFocus = null; };
/* confirm step built into the page (window.confirm is blocked in the viewer) */
let confirmCb = null;
N.confirm = ({ title, text = '', confirm = 'Confirm', danger = false, input = null, onConfirm }) => {
  confirmCb = onConfirm;
  N.openModal(`<div class="stack" style="--g:10px"><h3>${esc(title)}</h3>${text ? `<p class="muted">${text}</p>` : ''}</div>${input ? `<label class="field"><span>${esc(input.label)}</span><textarea class="ta" id="confirmInput" rows="3" placeholder="${esc(input.ph || '')}" ${input.req ? 'required' : ''}></textarea></label>` : ''}<div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Cancel</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-ink'} btn-sm" data-act="__confirm">${esc(confirm)}</button></div>`);
};
function closePops() { $$('[data-pop]').forEach(p => p.remove()); $$('.nav-item.open').forEach(n => n.classList.remove('open')); }
N.closePops = closePops;
N.toast = (msg, opt = {}) => {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `${ic(opt.icon || 'check-circle')}<span>${msg}</span>${opt.undo ? '<button type="button">Undo</button>' : ''}`;
  box.appendChild(el);
  let done = false;
  const kill = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  if (opt.undo) el.querySelector('button').addEventListener('click', () => { opt.undo(); kill(); });
  setTimeout(kill, opt.undo ? 6500 : 3800);
  while (box.children.length > 3) box.firstElementChild.remove();
};
N.tween = (el, to, dur = 650) => {
  if (!el) return; const from = Number(el.dataset.v || 0); el.dataset.v = to;
  if (N.reduce) { el.textContent = Math.round(to).toLocaleString('en-GB'); return; }
  const t0 = performance.now(); cancelAnimationFrame(el._raf);
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-GB'); if (k < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
};
N.copy = (v, input) => {
  const ok = () => N.toast(`Copied <b>${esc(v)}</b>`, { icon: 'copy' });
  const fail = () => { if (input) input.select(); N.toast('Press Ctrl+C to copy.', { icon: 'copy' }); };
  try { navigator.clipboard.writeText(v).then(ok, fail); } catch (e) { fail(); }
};

/* =====================================================================
   ROUTER
   Paths look like "site/home", "trader/documents", "org/manage-events/camden".
   Hash is written as "#trader.documents" (dots) so deep links stay plain.
   ===================================================================== */
const routes = [];
N.routes = routes;
/* def: { app:'site'|'trader'|'org'|'admin'|'brand', title, nav, crumbs:[[label,path]...], render(params,q) -> html, after(root,params) , bare:bool } */
N.page = (pattern, def) => { const keys = []; const re = new RegExp('^' + pattern.replace(/:([a-z]+)/gi, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'); routes.push({ pattern, re, keys, def }); };
N.state = {};             // per-page UI state modules can use: N.state[path] = {...}
N.cur = { path: 'site/home', params: {}, def: null };
function match(path) { for (const r of routes) { const m = path.match(r.re); if (m) { const params = {}; r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1])); return { r, params }; } } return null; }
N.go = (path, opts = {}) => {
  path = String(path).replace(/^#/, '').replace(/^\//, '');
  if (!match(path)) path = 'site/404';
  N.closeAll(); N.cur.path = path;
  try { history.replaceState(null, '', '#' + path.replace(/\//g, '.')); } catch (e) { /* sandboxed viewer */ }
  N.render();
  if (!opts.keepScroll) window.scrollTo(0, 0);
};
N.refresh = () => N.render(true);
N.render = (keep) => {
  const m = match(N.cur.path) || match('site/404');
  const { r, params } = m; const def = r.def; N.cur.params = params; N.cur.def = def;
  const app = def.app || 'site';
  document.body.dataset.app = app;
  document.body.dataset.route = N.cur.path.replace(/\//g, '-');
  const root = $('#root');
  let inner = '';
  try { inner = def.render(params) ?? ''; } catch (err) { console.error(err); inner = `<div class="wrap sec">${N.empty('This screen failed to draw', esc(err.message), '', 'alert')}</div>`; }
  if (app === 'site' || app === 'brand') root.innerHTML = def.bare ? inner : siteChrome(inner, app);
  else root.innerHTML = appShell(app, def, inner);
  $$('.proto-tabs [data-proto]').forEach(b => b.classList.toggle('on', b.dataset.proto === app));
  document.title = (def.title ? (typeof def.title === 'function' ? def.title(params) : def.title) + ' · ' : '') + 'Niche';
  if (def.after) { try { def.after(root, params); } catch (err) { console.error(err); } }
  N.afterRender(root);
  N.applyNotes();
};
N.afterRender = root => {
  // reveal-on-scroll for .rv elements (they stay visible without JS)
  const els = $$('.rv', root);
  if (!els.length || N.reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  document.documentElement.classList.add('js-rv');
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(e => { const r = e.getBoundingClientRect(); if (r.top < innerHeight) e.classList.add('in'); else io.observe(e); });
};

/* ---------- site chrome ---------- */
N.siteNavConfig = [
  { label: 'Organisers', items: [['site/how-it-works-organiser', 'calendar', 'How it works', 'Create events, get checked applicants, approve in one click.', 'lilac'], ['site/pricing-organiser', 'pound', 'Pricing', 'Free for your first year. 8% on confirmed bookings after.', 'butter'], ['site/how-verification-works', 'shield', 'How verification works', 'What we check, what we cross-reference, what stays with you.', 'mint']], foot: ['org/dashboard', 'Open the organiser demo'] },
  { label: 'Traders', items: [['site/how-it-works-trader', 'truck', 'How it works', 'Build one profile, apply to any event in minutes.', 'mint'], ['site/pricing-trader', 'pound', 'Pricing', 'Lite, Growth, Pro and the fully managed Advance.', 'butter'], ['site/what-is-passport', 'id', 'What is the Food Trader Passport?', 'Trust, captured once and kept current.', 'lilac'], ['site/launch', 'rocket', 'Starting from scratch? NICHE Launch', 'From idea to trading, done for you.', 'peach']], foot: ['trader/dashboard', 'Open the trader demo'] },
];
function siteHeader() {
  return `<header class="site-nav"><div class="site-nav-in">
    <button type="button" data-go="site/home" aria-label="Niche home">${N.wm()}</button>
    <nav class="site-links" aria-label="Website">
      ${N.siteNavConfig.map((g, i) => `<div class="nav-item" data-nav-item="${i}"><button type="button" data-act="navToggle" data-i="${i}" aria-expanded="false">${g.label}${ic('chevron-down')}</button><div class="mega">${g.items.map(([p, icn, l, s, tone]) => `<button type="button" data-go="${p}"><span class="mi blk-${tone}">${ic(icn)}</span><span><b>${l}</b><span class="s">${s}</span></span></button>`).join('')}<button type="button" class="foot" data-go="${g.foot[0]}">${g.foot[1]}${ic('arrow-right')}</button></div></div>`).join('')}
      <div class="nav-item"><button type="button" data-go="site/events">Events</button></div>
      <div class="nav-item"><button type="button" data-go="site/about">About us</button></div>
      <div class="nav-item"><button type="button" data-go="site/help">Help</button></div>
      <div class="nav-item"><button type="button" data-go="site/blog">Blog</button></div>
    </nav>
    <div class="site-cta">
      <button type="button" class="btn btn-ghost btn-sm" data-go="site/login">Log in</button>
      <button type="button" class="btn btn-violet btn-sm" data-go="site/register">Get started</button>
      <button type="button" class="icon-btn menu-btn" data-act="mobileMenu" aria-label="Open menu">${ic('menu')}</button>
    </div>
  </div></header>`;
}
function siteFooter() {
  const col = (h, items) => `<div><h4>${h}</h4><ul>${items.map(([p, l]) => `<li><button type="button" data-go="${p}">${l}</button></li>`).join('')}</ul></div>`;
  return `<footer class="site-foot"><div class="wrap">
    <div class="foot-grid">
      <div class="stack" style="--g:14px">${N.wm('wm-lg on-dark')}<p class="muted" style="max-width:36ch">The compliance-first platform connecting exceptional food traders with top-tier event organisers across the UK.</p>
        <span class="eyebrow">Connect with us</span><div class="socials">${['instagram', 'linkedin', 'facebook', 'tiktok'].map(s => `<button type="button" aria-label="${N.cap(s)}" data-act="demoToast" data-msg="Social links open the live profile on the real site.">${ic(s)}</button>`).join('')}</div></div>
      ${col('Platform', [['site/events', 'Browse events'], ['site/traders', 'Browse traders'], ['site/pricing-trader', 'Trader pricing'], ['site/pricing-organiser', 'Organiser pricing'], ['site/launch', 'NICHE Launch'], ['site/about', 'About us']])}
      ${col('Support', [['site/help', 'Help centre'], ['site/blog/documents-checklist-2026', 'Compliance guide'], ['site/how-verification-works', 'How verification works'], ['site/data-trust', 'Data trust'], ['site/help', 'Contact us']])}
      ${col('Legal', [['site/privacy', 'Privacy policy'], ['site/terms', 'Terms of service'], ['site/privacy', 'Cookie policy'], ['brand/guidelines', 'Brand guidelines']])}
    </div>
    <div class="foot-big" aria-hidden="true">find your fit</div>
    <div class="foot-base mono"><span>© 2026 NICHE PLATFORMS LTD. ALL RIGHTS RESERVED.</span><span>info@nicheconnect.co · Designed in London</span></div>
  </div></footer>`;
}
function siteChrome(inner, app) { return `${siteHeader()}<main class="site-main" id="main">${inner}</main>${app === 'brand' ? '' : siteFooter()}`; }
N.mobileMenu = () => {
  const el = document.createElement('div'); el.className = 'mobile-menu'; el.setAttribute('role', 'dialog');
  el.innerHTML = `<button type="button" class="icon-btn" data-close style="position:absolute;top:20px;right:20px" aria-label="Close menu">${ic('x')}</button>${N.siteNavConfig.map(g => `<p class="grp">${g.label}</p>${g.items.map(([p, , l]) => `<button type="button" class="mm" data-go="${p}">${l}</button>`).join('')}`).join('')}<p class="grp">Niche</p>${[['site/events', 'Events'], ['site/about', 'About us'], ['site/help', 'Help'], ['site/blog', 'Blog'], ['site/login', 'Log in']].map(([p, l]) => `<button type="button" class="mm" data-go="${p}">${l}</button>`).join('')}<button type="button" class="btn btn-violet btn-lg" data-go="site/register" style="margin-top:18px">Get started</button>`;
  document.body.appendChild(el);
};

/* ---------- app shells ---------- */
N.apps = {
  trader: { label: 'Trader', user: () => ({ av: N.tav('ag'), name: db.traders.ag.company, sub: 'Alice Green · Growth plan' }), home: 'trader/dashboard', groups: [
    ['Overview', [['trader/dashboard', 'grid', 'Dashboard'], ['trader/passport', 'id', 'My Passport'], ['trader/guide', 'book', 'User Guide'], ['trader/notifications', 'bell', 'Notifications', () => db.notifications.trader.filter(n => n.unread).length]]],
    ['Profile & setup', [['trader/profile', 'user', 'Profile Setup'], ['trader/units', 'truck', 'Trading Units'], ['trader/documents', 'file', 'My Documents', () => db.docs.filter(d => d.trader === 'ag' && ['expiring', 'missing', 'rejected'].includes(N.docState(d))).length, 'warn']]],
    ['Events', [['trader/events', 'search', 'Browse Events'], ['trader/applications', 'inbox', 'My Applications', () => db.apps.filter(a => a.t === 'ag' && a.st === 'info').length, 'warn'], ['trader/invitations', 'mail', 'Invitations', () => db.invites.filter(i => i.t === 'ag' && i.st === 'open').length]]],
    ['Reputation', [['trader/rate', 'star', 'Rate Organisers'], ['trader/reviews', 'award', 'My Reviews']]],
    ['Account', [['trader/feedback', 'message', 'Feedback'], ['trader/subscription', 'pound', 'Subscription']]],
  ], tabbar: [['trader/dashboard', 'grid', 'Home'], ['trader/documents', 'file', 'Docs'], ['trader/events', 'search', 'Events'], ['trader/applications', 'inbox', 'Applied'], ['trader/passport', 'id', 'Passport']] },
  org: { label: 'Organiser', user: () => ({ av: N.oav('reed'), name: db.organisers.reed.company, sub: 'Olivia Reed · Event Pass' }), home: 'org/dashboard', groups: [
    ['Overview', [['org/dashboard', 'grid', 'Dashboard'], ['org/business-info', 'building', 'Profile Setup'], ['org/notifications', 'bell', 'Notifications', () => db.notifications.org.filter(n => n.unread).length]]],
    ['Events', [['org/create-event', 'calendar-plus', 'Create Event'], ['org/manage-events', 'calendar', 'Manage Events'], ['org/applications', 'inbox', 'Applications', () => db.apps.filter(a => db.events[a.e].org === 'reed' && a.st === 'pending').length], ['org/invite-traders', 'user-plus', 'Invite Traders']]],
    ['Traders', [['org/rate', 'star', 'Rate Traders']]],
    ['Account', [['org/feedback', 'message', 'Feedback'], ['org/subscription', 'pound', 'Subscription']]],
  ], tabbar: [['org/dashboard', 'grid', 'Home'], ['org/manage-events', 'calendar', 'Events'], ['org/applications', 'inbox', 'Review'], ['org/invite-traders', 'user-plus', 'Invite'], ['org/create-event', 'plus', 'Create']] },
  admin: { label: 'Admin', user: () => ({ av: N.av('SO', 'butter'), name: 'Niche admin', sub: 'admin@niche.com' }), home: 'admin/dashboard', groups: [
    ['Overview', [['admin/dashboard', 'grid', 'Dashboard'], ['admin/notifications', 'bell', 'Notifications', () => db.notifications.admin.filter(n => n.unread).length]]],
    ['Management', [['admin/traders', 'truck', 'Traders', () => Object.values(db.traders).filter(t => t.status === 'pending').length, 'warn'], ['admin/organisers', 'building', 'Organisers', () => Object.values(db.organisers).filter(o => o.verify === 'pending').length, 'warn'], ['admin/events', 'calendar', 'Events'], ['admin/create-external', 'calendar-plus', 'Create External Event']]],
    ['Location', [['admin/countries', 'globe', 'Countries'], ['admin/states', 'map', 'County']]],
    ['System', [['admin/feedback', 'message', 'Feedback', () => db.feedback.filter(f => f.status === 'open').length], ['admin/tags', 'tag', 'Tags & Categories'], ['admin/documents', 'files', 'Document Types'], ['admin/roles', 'key', 'Roles'], ['admin/scores', 'percent', 'Scores'], ['admin/tnc', 'book', 'T & C Management'], ['admin/settings', 'settings', 'Settings']]],
  ], tabbar: [['admin/dashboard', 'grid', 'Home'], ['admin/traders', 'truck', 'Traders'], ['admin/organisers', 'building', 'Orgs'], ['admin/events', 'calendar', 'Events'], ['admin/settings', 'settings', 'More']] },
};
function navCount(fn, cls) { if (!fn) return ''; const n = fn(); return n ? `<span class="count ${cls || ''}">${n}</span>` : ''; }
function appShell(app, def, inner) {
  const A = N.apps[app], u = A.user(), active = def.nav || N.cur.path;
  const crumbs = def.crumbs ? (typeof def.crumbs === 'function' ? def.crumbs(N.cur.params) : def.crumbs) : null;
  const title = typeof def.title === 'function' ? def.title(N.cur.params) : def.title;
  const others = Object.keys(N.apps).filter(k => k !== app);
  return `<div class="app">
  <aside class="rail" id="rail">
    <div class="rail-top"><button type="button" data-go="site/home" aria-label="Back to website">${N.wm('wm-sm')}</button><span class="side-tag">${A.label}</span></div>
    <button type="button" class="acct" data-act="acctMenu">${u.av}<span class="acct-b"><b>${esc(u.name)}</b><span>${esc(u.sub)}</span></span>${ic('chevron-down', 'ic-sm')}</button>
    <nav aria-label="${A.label}">${A.groups.map(([g, items]) => `<p class="rail-grp">${g}</p><div class="rail-nav">${items.map(([p, icn, l, cnt, cls]) => `<button type="button" data-go="${p}" class="${active === p ? 'on' : ''}">${ic(icn)}<span>${l}</span>${navCount(cnt, cls)}</button>`).join('')}</div>`).join('')}</nav>
    <div class="rail-foot">${others.map(o => `<button type="button" class="rail-link" data-go="${N.apps[o].home}">${ic('users')}Switch to ${N.apps[o].label.toLowerCase()} demo</button>`).join('')}<button type="button" class="rail-link" data-go="site/home">${ic('arrow-left')}Back to website</button><button type="button" class="rail-link" data-act="signOut">${ic('log-out')}Sign out</button></div>
  </aside>
  <div class="work">
    <header class="work-top">
      <button type="button" class="icon-btn mob-only" data-act="openRail" aria-label="Open navigation">${ic('menu')}</button>
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs ? crumbs.map(([l, p], i) => i === crumbs.length - 1 ? `<b>${esc(l)}</b>` : `<button type="button" data-go="${p}">${esc(l)}</button>${ic('chevron-right', 'ic-sm')}`).join('') : `<span>${A.label}</span>${ic('chevron-right', 'ic-sm')}<b>${esc(title || '')}</b>`}</nav>
      <div class="work-tools"><label class="search hide-sm" style="width:240px">${ic('search')}<span class="sr">Search</span><input type="search" placeholder="Search ${app === 'trader' ? 'events' : app === 'org' ? 'traders and events' : 'everything'}" data-input="globalSearch" autocomplete="off"></label><button type="button" class="icon-btn" data-act="bell" aria-label="Notifications">${ic('bell')}${db.notifications[app].some(n => n.unread) ? '<i class="bdot"></i>' : ''}</button>${u.av}</div>
    </header>
    <div class="work-body" id="work">${inner}</div>
  </div>
  <nav class="tabbar" aria-label="${A.label} shortcuts">${A.tabbar.map(([p, icn, l]) => `<button type="button" data-go="${p}" class="${active === p ? 'on' : ''}">${ic(icn)}<span>${l}</span></button>`).join('')}</nav>
</div>`;
}
N.pageHead = (title, sub = '', actions = '', eyebrow = '') => `<div class="page-head"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1 class="h-page">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>${actions ? `<div class="btn-row">${actions}</div>` : ''}</div>`;

/* =====================================================================
   ACTION DELEGATION
   data-go="path"                 navigate
   data-act="name"                N.act[name](el, event)
   <form data-form="name">        N.forms[name](form, data, event)  (submit is always prevented)
   data-change="name"             N.change[name](el, event)        (change events)
   data-input="name"              N.input[name](el, event)         (input events)
   data-note="text"               design-note pin when notes are on
   ===================================================================== */
N.act = {}; N.forms = {}; N.change = {}; N.input = {};
Object.assign(N.act, {
  __confirm() { const v = $('#confirmInput'); if (v && v.required && !v.value.trim()) { v.focus(); return; } const cb = confirmCb; confirmCb = null; N.closeModal(); cb && cb(v ? v.value.trim() : undefined); },
  navToggle(el) { const item = el.closest('.nav-item'), was = item.classList.contains('open'); closePops(); if (!was) { item.classList.add('open'); el.setAttribute('aria-expanded', 'true'); } },
  mobileMenu() { N.mobileMenu(); },
  openRail() { $('#rail')?.classList.add('open'); scrim.classList.add('on'); },
  demoToast(el) { N.toast(esc(el.dataset.msg || 'Done.'), { icon: 'info' }); },
  signOut() { N.go('site/login'); N.toast('Signed out of the demo account.'); },
  acctMenu(el) {
    if ($('[data-pop].acct-pop')) { closePops(); return; }
    const app = document.body.dataset.app;
    el.insertAdjacentHTML('afterend', `<div class="pop acct-pop" data-pop style="top:auto;left:14px;right:14px;width:auto;position:absolute;margin-top:4px"><h4>Switch demo account</h4><ul>${Object.entries(N.apps).map(([k, A]) => `<li style="cursor:pointer" data-go="${A.home}"><span class="dot ${k === app ? 'ok' : ''}"></span><div>${A.label}<span>${k === 'trader' ? 'Alice Green · AG Foods Ltd' : k === 'org' ? 'Olivia Reed · Reed Events' : 'Niche team · approvals'}</span></div></li>`).join('')}</ul></div>`);
    el.parentElement.style.position = 'relative';
  },
  bell(el) {
    if ($('[data-pop].bell-pop')) { closePops(); return; }
    const app = document.body.dataset.app, list = db.notifications[app] || [];
    el.parentElement.insertAdjacentHTML('beforeend', `<div class="pop bell-pop" data-pop role="dialog" aria-label="Notifications"><div class="row between" style="padding:6px 8px 0 12px"><h4 style="padding:0">Notifications</h4><button type="button" class="btn btn-ghost btn-xs" data-act="markAllRead">Mark all as read</button></div><ul>${list.slice(0, 5).map(n => `<li style="cursor:pointer" data-go="${n.go}"><span class="dot ${n.tone}"></span><div>${n.unread ? '<b>' : ''}${esc(n.title)}${n.unread ? '</b>' : ''}<span>${esc(n.text)} · ${N.rel(n.at)}</span></div></li>`).join('')}</ul><button type="button" class="btn btn-line btn-sm btn-block" data-go="${app}/notifications" style="margin-top:6px">View all notifications</button></div>`);
  },
  markAllRead() { const app = document.body.dataset.app; (db.notifications[app] || []).forEach(n => n.unread = false); closePops(); N.refresh(); N.toast('All notifications marked as read.'); },
});
N.input.globalSearch = el => {
  const q = el.value.trim().toLowerCase(), app = document.body.dataset.app, box = el.closest('.work-tools');
  $$('[data-pop].search-pop').forEach(p => p.remove());
  if (q.length < 2) return;
  const hit = s => String(s || '').toLowerCase().includes(q);
  const res = [];
  Object.entries(db.events).forEach(([id, e]) => { if (hit(e.name) || hit(e.city) || hit(e.venue)) res.push(['Event', e.name, `${N.fLong(e.date)} · ${e.city}`, app === 'admin' ? 'admin/events' : app === 'org' ? (e.org === db.me.org ? `org/manage-events/${id}` : `site/events/${id}`) : `trader/apply/${id}`, 'calendar']); });
  Object.entries(db.traders).forEach(([id, t]) => { if (hit(t.biz) || hit(t.person) || hit(t.email) || hit(t.food)) res.push(['Trader', t.biz, `${t.person} · ${t.food}`, app === 'admin' ? `admin/traders/${id}` : app === 'org' ? 'org/invite-traders' : `site/traders/${id}`, 'truck']); });
  if (app === 'admin') Object.entries(db.organisers).forEach(([id, o]) => { if (hit(o.company) || hit(o.person) || hit(o.email)) res.push(['Organiser', o.company, `${o.person} · ${o.city}`, `admin/organisers/${id}`, 'building']); });
  routes.forEach(r => { if (r.def.app === app && !r.pattern.includes(':')) { const t = typeof r.def.title === 'function' ? '' : r.def.title; if (t && hit(t)) res.push(['Page', t, N.apps[app].label + ' app', r.pattern, 'arrow-up-right']); } });
  box.insertAdjacentHTML('beforeend', `<div class="pop search-pop" data-pop role="listbox" aria-label="Search results" style="left:0;right:auto;width:min(420px,calc(100vw - 32px))"><h4>${res.length ? N.plural(res.length, 'result') : 'No results'} for “${esc(el.value.trim())}”</h4><ul>${res.slice(0, 8).map(([k, t, sub, go, icn]) => `<li style="cursor:pointer;grid-template-columns:24px minmax(0,1fr)" data-go="${go}">${ic(icn, 'ic-sm')}<div><b>${esc(t)}</b><span>${k} · ${esc(sub)}</span></div></li>`).join('') || `<li style="grid-template-columns:1fr"><div><span>Try an event name, a city, or a trader.</span></div></li>`}</ul></div>`);
};

function starClick(btn) { const box = btn.closest('[data-stars]'); const v = +btn.dataset.star; box.dataset.v = v; $$('button', box).forEach(b => b.classList.toggle('on', +b.dataset.star <= v)); box.dispatchEvent(new CustomEvent('stars', { bubbles: true, detail: { name: box.dataset.stars, v } })); }
function segClick(btn) { const seg = btn.closest('[data-seg]'); $$('button', seg).forEach(b => b.setAttribute('aria-pressed', String(b === btn))); seg.dispatchEvent(new CustomEvent('seg', { bubbles: true, detail: { key: seg.dataset.seg, v: btn.dataset.v } })); }

function wire() {
  document.addEventListener('click', e => {
    const t = e.target;
    const pin = t.closest('.pin'); if (pin) { e.preventDefault(); e.stopPropagation(); tip.hidden ? showTip(pin) : hideTip(); return; }
    if (!t.closest('[data-pop]') && !t.closest('[data-input="globalSearch"]') && !t.closest('[data-act="bell"]') && !t.closest('[data-act="acctMenu"]') && !t.closest('.nav-item')) closePops();
    if (t.closest('[data-close]')) { e.preventDefault(); N.closeAll(); return; }
    if (t === scrim) { N.closeAll(); return; }
    const st = t.closest('[data-star]'); if (st) { starClick(st); return; }
    const sg = t.closest('[data-seg] > button'); if (sg) { segClick(sg); return; }
    const act = t.closest('[data-act]'); if (act && !act.disabled && !act.classList.contains('is-disabled')) { const f = N.act[act.dataset.act]; if (f) { e.preventDefault(); f(act, e); return; } }
    const g = t.closest('[data-go]'); if (g && !g.disabled) { e.preventDefault(); N.go(g.dataset.go); return; }
  });
  document.addEventListener('submit', e => { e.preventDefault(); const f = e.target, h = N.forms[f.dataset.form]; if (h) h(f, N.formData(f), e); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && N.change[el.dataset.change]) N.change[el.dataset.change](e.target, e); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && N.input[el.dataset.input]) N.input[el.dataset.input](e.target, e); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!tip.hidden) { hideTip(); return; } N.closeAll(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[data-go], tr[data-act], li[data-go], div[data-go][tabindex]')) { e.preventDefault(); e.target.click(); }
    if (N.onKey) N.onKey(e);
  });
  document.addEventListener('dragover', e => { const d = e.target.closest && e.target.closest('.drop'); if (d) d.classList.add('over'); });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('.drop'); if (d) d.classList.remove('over'); });
  document.addEventListener('mouseover', e => { const p = e.target.closest && e.target.closest('.pin'); if (p) showTip(p); });
  document.addEventListener('mouseout', e => { const p = e.target.closest && e.target.closest('.pin'); if (p && !p.contains(e.relatedTarget)) hideTip(); });
  addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });
}

/* ---------- design notes ---------- */
N.notes = false;
N.applyNotes = () => {
  $$('.pin').forEach(p => p.remove()); hideTip();
  document.body.classList.toggle('notes-on', N.notes);
  if (!N.notes) return;
  let n = 0;
  $$('[data-note]').forEach(el => { if (!el.getClientRects().length) return; n++; const b = document.createElement('button'); b.type = 'button'; b.className = 'pin'; b.textContent = n; b.dataset.tip = el.dataset.note; b.setAttribute('aria-label', `Design note ${n}: ${el.dataset.note}`); el.appendChild(b); });
};
function showTip(pin) { tip.textContent = pin.dataset.tip; tip.hidden = false; const r = pin.getBoundingClientRect(), w = Math.min(320, innerWidth - 32); tip.style.maxWidth = w + 'px'; tip.style.left = Math.min(Math.max(16, r.left), innerWidth - w - 16) + 'px'; let top = r.bottom + 8; tip.style.top = top + 'px'; const th = tip.getBoundingClientRect().height; if (top + th > innerHeight - 16) tip.style.top = Math.max(16, r.top - th - 8) + 'px'; }
function hideTip() { if (tip) tip.hidden = true; }

/* ---------- sitemap ---------- */
N.sitemap = () => {
  const groups = {};
  routes.forEach(r => { if (r.pattern.includes(':') && !r.def.example) return; const app = r.def.app || 'site'; (groups[app] = groups[app] || []).push(r); });
  const names = { site: 'Website', trader: 'Trader app', org: 'Organiser app', admin: 'Admin panel', brand: 'Brand' };
  N.openModal(`<div class="stack" style="--g:6px"><p class="eyebrow">Every screen in this prototype</p><h3>All pages</h3></div><div class="sitemap">${Object.entries(groups).map(([k, rs]) => `<div><h4>${names[k] || k}</h4>${rs.map(r => { const path = r.def.example || r.pattern; const t = typeof r.def.title === 'function' ? r.def.title(Object.fromEntries(r.keys.map((k2, i) => [k2, path.split('/')[r.pattern.split('/').indexOf(':' + k2)]]))) : r.def.title; return `<button type="button" data-go="${path}">${esc(t || path)}</button>`; }).join('')}</div>`).join('')}</div>`, 'wide');
};

/* =====================================================================
   BOOT
   ===================================================================== */
N.boot = () => {
  injectIcons();
  drawer = $('#drawer'); scrim = $('#scrim'); modal = $('#modal'); tip = $('#tip');
  wire();
  $('#notesBtn').addEventListener('click', () => { N.notes = !N.notes; $('#notesBtn').setAttribute('aria-pressed', String(N.notes)); N.applyNotes(); if (N.notes) N.toast('Design notes on. Hover or tap a numbered arch.', { icon: 'info' }); });
  $('#mapBtn').addEventListener('click', N.sitemap);
  N.syncAlice();
  const start = (location.hash || '').slice(1).replace(/\./g, '/');
  N.cur.path = start && match(start) ? start : 'site/home';
  N.render();
};
return N;
})();
