/* =====================================================================
   Colour palettes: switch the whole prototype between brand colour options.
   The choice sits on <body data-palette="…"> and css/palettes.css does the rest.
   ===================================================================== */
(() => {
'use strict';
const { ic, esc } = N;
const PALETTES = [
  { id: 'original', name: 'NICHE Original', desc: 'Forest, green and lavender from your current logo', sw: ['#124734', '#6BC04B', '#948FCF', '#A8A4E0'] },
  { id: 'fresh', name: 'Fresh Green', desc: 'Lighter and brighter, green-led with purple accents', sw: ['#2E7D32', '#A3D55F', '#6A63C4', '#C9C6EF'] },
  { id: 'royal', name: 'Royal Purple', desc: 'Purple-led, with your green as the highlight', sw: ['#2B2566', '#5B52C8', '#6BC04B', '#A8A4E0'] },
  { id: 'forest', name: 'Forest & Lilac', desc: 'The v2 look: hedge green, violet and pastels', sw: ['#0E3B2E', '#5A31E4', '#DDF85E', '#E9E2FF'] },
  { id: 'vzp', name: 'Violet, Zest & Paprika', desc: 'The bold three-colour trial', sw: ['#5A31E4', '#DDF85E', '#FF5A36', '#1C1340'] },
];
N.palettes = PALETTES;
const KEY = 'niche-palette';
let cur = 'original';
try { const s = localStorage.getItem(KEY); if (s && PALETTES.some(p => p.id === s)) cur = s; } catch (e) { /* storage unavailable */ }
document.body.dataset.palette = cur;

const find = id => PALETTES.find(p => p.id === id) || PALETTES[0];
function paintButton() {
  const b = document.getElementById('palBtn'); if (!b) return;
  const p = find(cur);
  b.querySelector('.pal-dots').innerHTML = p.sw.slice(0, 3).map(c => `<i style="background:${c}"></i>`).join('');
  b.querySelector('.pl').textContent = p.name;
  b.setAttribute('aria-label', `Colour palette: ${p.name}. Change palette`);
}
function apply(id, announce) {
  cur = find(id).id;
  document.body.dataset.palette = cur;
  try { localStorage.setItem(KEY, cur); } catch (e) { /* storage unavailable */ }
  paintButton();
  N.$$('.palpanel [data-pal]').forEach(o => o.setAttribute('aria-pressed', String(o.dataset.pal === cur)));
  if (announce) N.toast(`Colours: <b>${esc(find(cur).name)}</b>`, { icon: 'palette' });
}
N.setPalette = apply;

function openPanel(btn) {
  const r = btn.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'palpanel'; el.setAttribute('data-pop', ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Colour palettes');
  el.innerHTML = `<h4>Colour options</h4><p>Switch the website and all three apps to show the client each look.</p>
    ${PALETTES.map(p => `<button type="button" class="po" data-act="pal_set" data-pal="${p.id}" aria-pressed="${p.id === cur}"><span class="sws">${p.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><span><b>${esc(p.name)}</b><span class="d">${esc(p.desc)}</span></span>${ic('check', 'ck')}</button>`).join('')}
    <div class="foot">Shortcut: press <b>C</b> to cycle through the options. The brand guidelines page keeps the documented v2 palette.</div>`;
  document.body.appendChild(el);
  const w = el.offsetWidth;
  el.style.top = (r.bottom + 6) + 'px';
  el.style.left = Math.max(10, Math.min(r.right - w, innerWidth - w - 10)) + 'px';
}
let wasOpen = false;
document.addEventListener('pointerdown', () => { wasOpen = !!document.querySelector('.palpanel'); }, true);
Object.assign(N.act, {
  pal_toggle(el) { if (wasOpen) { wasOpen = false; return; } openPanel(el); },
  pal_set(el) { apply(el.dataset.pal, true); },
});
/* C cycles palettes (ignored while typing) */
document.addEventListener('keydown', e => {
  if (e.key !== 'c' && e.key !== 'C') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
  const i = PALETTES.findIndex(p => p.id === cur);
  apply(PALETTES[(i + 1) % PALETTES.length].id, true);
});
/* the button exists in index.html; paint it once icons are injected */
const ready = () => paintButton();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
