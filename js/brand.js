/* =====================================================================
   NICHE brand guidelines v2  ·  route: brand/guidelines
   A long-scroll brand book with a sticky chapter index.
   Everything in this module is prefixed br_ (actions) or .br- (CSS).
   Hex values appear only as documentation (swatches, contrast maths,
   token listings); the page itself is drawn with tokens.
   ===================================================================== */
(() => {
'use strict';
const esc = N.esc, ic = N.ic, $ = N.$, $$ = N.$$;

/* ---------- colour maths (WCAG 2.x relative luminance) ---------- */
const hexRgb = h => { const v = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); };
const lum = h => { const [r, g, b] = hexRgb(h).map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const bestOn = h => ratio(h, '#101A15') >= ratio(h, '#FFFFFF') ? '#101A15' : '#FFFFFF';
const rgbStr = h => hexRgb(h).join(', ');

/* ---------- content ---------- */
const CH = [
  ['cover', '00', 'Cover'], ['essence', '01', 'Brand essence'], ['logo', '02', 'Logo'], ['arch', '03', 'The arch & awning'],
  ['colour', '04', 'Colour'], ['type', '05', 'Typography'], ['icons', '06', 'Iconography'], ['imagery', '07', 'Illustration & imagery'],
  ['ui', '08', 'UI components'], ['motion', '09', 'Motion'], ['voice', '10', 'Voice & tone'], ['apps', '11', 'Applications'], ['tokens', '12', 'Tokens'],
];

const CORE = [
  { n: 'Hedge', hex: '#0E3B2E', tok: '--hedge', role: 'Primary dark. The passport, the footer, the Checked badge.' },
  { n: 'Ink', hex: '#101A15', tok: '--ink', role: 'Text and primary buttons.' },
  { n: 'White', hex: '#FFFFFF', tok: '--bg · --surface', role: 'Pages, cards and forms.' },
  { n: 'Chalk', hex: '#F5F4F0', tok: '--sunk', role: 'Sunk surfaces and the app canvas.' },
  { n: 'Line', hex: '#E4E1DA', tok: '--line', role: 'Hairlines, dividers, card edges.' },
];
const ACCENTS = [
  { n: 'Violet', hex: '#5A31E4', tok: '--violet', role: 'Organiser side. Key actions on the marketing site.' },
  { n: 'Zest', hex: '#DDF85E', tok: '--zest', role: 'Trader highlight. Accents on hedge only.' },
  { n: 'Paprika', hex: '#FF5A36', tok: '--paprika', role: 'Warm food accent: stars, pins, small highlights. Never errors.' },
];
const PASTELS = [
  ['Mint', '#D5F2DF', '#0E5236', 'mint', 'Trader side'],
  ['Lilac', '#E9E2FF', '#3D1DA0', 'lilac', 'Organiser side'],
  ['Butter', '#FFF0A8', '#6B5300', 'butter', 'Admin side'],
  ['Peach', '#FFD8C9', '#8C2B12', 'peach', 'Food moments, warmth'],
  ['Sky', '#D8EAF8', '#0F4068', 'sky', 'Information, calm'],
];
const SEMANTIC = [
  ['Ready', 'ok', '#137443', '#DCF3E4', 'Valid, approved, all met'],
  ['Expiring', 'warn', '#9E5A00', '#FFEFCC', 'Due within 30 days, in review'],
  ['Missing', 'risk', '#C0321E', '#FFE2DB', 'Missing, expired, rejected'],
  ['Info', 'info', '#3D1DA0', '#E9E2FF', 'Neutral news, pending'],
];
const PAIRS = [
  ['Ink on White', '#101A15', '#FFFFFF', 'Body text, headlines'],
  ['Ink on Chalk', '#101A15', '#F5F4F0', 'Text on sunk surfaces'],
  ['Muted on White', '#69726C', '#FFFFFF', 'Secondary text and hints'],
  ['White on Ink', '#FFFFFF', '#101A15', 'Primary buttons, toasts'],
  ['On-hedge on Hedge', '#EEF6E9', '#0E3B2E', 'Passport, footer'],
  ['Zest on Hedge', '#DDF85E', '#0E3B2E', 'Checked badge, highlights'],
  ['White on Violet', '#FFFFFF', '#5A31E4', 'Organiser buttons'],
  ['Violet on White', '#5A31E4', '#FFFFFF', 'Links'],
  ['Ink on Zest', '#101A15', '#DDF85E', 'Zest buttons and chips'],
  ['Mint ink on Mint', '#0E5236', '#D5F2DF', 'Trader side'],
  ['Lilac ink on Lilac', '#3D1DA0', '#E9E2FF', 'Organiser side'],
  ['Butter ink on Butter', '#6B5300', '#FFF0A8', 'Admin side'],
  ['Peach ink on Peach', '#8C2B12', '#FFD8C9', 'Food moments'],
  ['Sky ink on Sky', '#0F4068', '#D8EAF8', 'Information'],
  ['Ready on its tint', '#137443', '#DCF3E4', 'Status: ready'],
  ['Expiring on its tint', '#9E5A00', '#FFEFCC', 'Status: expiring'],
  ['Missing on its tint', '#C0321E', '#FFE2DB', 'Status: missing'],
  ['Paprika on White', '#FF5A36', '#FFFFFF', 'Stars and pins only, never text'],
  ['Zest on White', '#DDF85E', '#FFFFFF', 'Never. Zest lives on hedge'],
];
const DARK_BASE = [['Background', '--bg', '#0C120F'], ['Surface', '--surface', '#131B17'], ['Sunk', '--sunk', '#18221D'], ['Line', '--line', '#26322C'], ['Ink', '--ink', '#EDF2EE'], ['Muted', '--muted', '#8E9993'], ['Violet', '--violet', '#7352FF'], ['Hedge', '--hedge', '#0E3B2E'], ['Zest', '--zest', '#DDF85E']];
const DARK_PAIRS = [['Mint', '#16382A', '#A6E6C0'], ['Lilac', '#251D4D', '#CFC3FF'], ['Butter', '#3A3212', '#F4DD7C'], ['Peach', '#40241A', '#FFBDA6'], ['Sky', '#142F45', '#AAD3F3'], ['Ready', '#12301F', '#5FD18F'], ['Expiring', '#35280F', '#F2B659'], ['Missing', '#3D1C16', '#FF8B78'], ['Info', '#251D4D', '#CFC3FF']];

/* ---------- small building blocks ---------- */
// brand-book wordmark: same construction as .wm, but its colours are variables so specimens can be fixed
const bwm = (cls = '', style = '') => `<span class="bwm ${cls}"${style ? ` style="${style}"` : ''} aria-hidden="true">n<span class="bi">ı</span>che</span>`;
const chap = (id, num, title, kicker, body, cls = '') => `<section class="br-ch ${cls}" id="br-ch-${id}" data-ch="${id}" aria-labelledby="br-h-${id}">
  <header class="br-ch-h rv"><span class="br-ch-n" aria-hidden="true">${num}</span><div class="stack" style="--g:14px"><p class="eyebrow">Chapter ${num}</p><h2 class="d-l" id="br-h-${id}" tabindex="-1">${title}</h2>${kicker ? `<p class="lead">${kicker}</p>` : ''}</div></header>
  ${body}</section>`;
const sub = (title, text = '', aside = '') => `<div class="br-sub"><div class="stack" style="--g:8px"><h3 class="d-s">${title}</h3>${text ? `<p class="ink-2 br-measure">${text}</p>` : ''}</div>${aside ? `<div class="br-sub-a">${aside}</div>` : ''}</div>`;
const copyBtn = (v, label = 'Copy', cls = 'btn-line') => `<button type="button" class="btn ${cls} btn-xs" data-act="br_copy" data-v="${esc(v)}">${ic('copy')}${esc(label)}</button>`;
const doDont = (dos, donts) => `<div class="br-dd"><div class="br-do"><p class="br-dd-h">${ic('check')}Do</p><ul>${dos.map(x => `<li>${x}</li>`).join('')}</ul></div><div class="br-dont"><p class="br-dd-h">${ic('x')}Don’t</p><ul>${donts.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
const fig = (label, content, note = '', cls = '') => `<figure class="br-fig ${cls}"><div class="br-fig-v">${content}</div><figcaption><b>${label}</b>${note ? `<span>${note}</span>` : ''}</figcaption></figure>`;
const replay = demo => `<button type="button" class="btn btn-line btn-xs" data-act="br_replay" data-demo="${demo}">${ic('refresh')}Replay</button>`;
const gap = (n = 28) => `<div style="height:${n}px" aria-hidden="true"></div>`;

/* =====================================================================
   00 COVER
   ===================================================================== */
function cover() {
  const tones = ['mint', 'lilac', 'butter', 'peach', 'sky', 'hedge'];
  return `<section class="br-cover" id="br-ch-cover" data-ch="cover" aria-labelledby="br-h-cover">
    <div class="br-cover-top"><span class="eyebrow">NICHE Platforms Ltd</span><span class="mono">Brand guidelines · v2 · September 2026</span></div>
    <h1 class="br-cover-wm" id="br-h-cover" tabindex="-1"><span class="sr">NICHE brand guidelines</span><span aria-hidden="true">${N.wm('wm-xl')}</span></h1>
    <p class="br-cover-t d-l">Brand <em>guidelines</em></p>
    <div class="br-rise br-cover-arches" data-rise aria-hidden="true">${tones.map((t, i) => `<span class="br-ra t-${t}" style="--i:${i}">${t === 'hedge' ? '<i class="t"></i><i class="b"></i>' : ''}</span>`).join('')}</div>
    <div class="br-cover-foot">
      <p class="lead">How NICHE looks, sounds and moves. One system for the website, the trader app, the organiser app, the admin panel and everything we print. Read it once from start to finish, then keep it open while you work.</p>
      <dl class="br-cover-meta">
        <div><dt>Version</dt><dd>2.0</dd></div>
        <div><dt>Updated</dt><dd>29 Sep 2026</dd></div>
        <div><dt>Owner</dt><dd>Brand &amp; Product Design</dd></div>
        <div><dt>Status</dt><dd>${N.chip('ok', 'Live')}</dd></div>
      </dl>
      <button type="button" class="btn btn-ink" data-act="br_jump" data-ch="essence">Start reading${ic('arrow-right')}</button>
    </div>
  </section>`;
}

/* =====================================================================
   01 BRAND ESSENCE
   ===================================================================== */
function essence() {
  const values = [
    ['Identity', 'id', 'mint', 'We know exactly who is behind every van, stall and event: real names, real businesses, real documents.'],
    ['Validation', 'shield', 'lilac', 'We check what matters before anyone books, from hygiene to insurance to gas, and we keep checking.'],
    ['Match', 'link', 'butter', 'We put the right trader in front of the right organiser, based on fit rather than who shouted loudest.'],
    ['Flow', 'activity', 'peach', 'We take the paperwork out of the way so the day itself runs smoothly, from application to last service.'],
  ];
  const scales = [
    ['Friendly', 'Formal', 28, 'We sound like a helpful market manager, not a council form.'],
    ['Playful', 'Serious', 58, 'Serious about safety, light in how we say it.'],
    ['Plain', 'Technical', 20, 'We turn regulations into the next thing to do.'],
    ['Warm', 'Cool', 30, 'Warm colour, warm words, calm under pressure.'],
  ];
  const tags = [
    ['Find your fit.', 'Master line', 'Brand campaigns, the website hero, merch, the footer.', 'hedge'],
    ['Ready to trade.', 'Trader line', 'Trader onboarding, the passport, renewal nudges.', 'mint'],
    ['Every pitch, checked.', 'Organiser line', 'Organiser sales, event pages, window stickers.', 'lilac'],
  ];
  return chap('essence', '01', 'The point of perfect <em>fit</em>', 'Most people read “niche” as smallness. We read it as the place where identity, purpose and environment line up. Everything in this book grows from that idea.', `
    <div class="br-essence-hero">
      <div class="blk blk-hedge br-quote">
        <p class="eyebrow">Why we are called NICHE</p>
        <p class="d-m">Most people read niche as small. We read it as <em>fit</em>.</p>
        <p class="muted">In nature, every species thrives once it finds its niche. In architecture, a niche is an arched alcove built to hold one thing perfectly.</p>
      </div>
      <div class="br-venn-wrap">
        <svg class="br-venn" viewBox="0 0 320 300" role="img" aria-label="Identity, purpose and environment overlap. The overlap is the niche.">
          <circle class="c1" cx="118" cy="112" r="88"/><circle class="c2" cx="202" cy="112" r="88"/><circle class="c3" cx="160" cy="186" r="88"/>
          <text x="84" y="92">Identity</text><text x="236" y="92">Purpose</text><text x="160" y="248">Environment</text>
          <path class="arch" d="M142 174v-22a18 18 0 0 1 36 0v22z"/><circle class="dt" cx="160" cy="146" r="4.5"/><circle class="db" cx="160" cy="164" r="4.5"/>
        </svg>
        <p class="small muted">NICHE sits where the three overlap. It is a fit engine, not a general marketplace.</p>
      </div>
    </div>
    ${gap(56)}
    <div class="grid g2 br-statements">
      <div class="card flat"><p class="eyebrow">Mission</p><p class="br-state">Make every food event in the UK simple to book, safe to trade at and worth turning up for.</p></div>
      <div class="card flat"><p class="eyebrow">Positioning</p><p class="br-state">For UK event organisers and the food traders they book, NICHE is <b>compliance-first infrastructure</b>: one checked passport per trader, one clear view per event, and matches made on fit. Unlike listing sites, we check before we connect.</p></div>
    </div>
    ${gap(72)}
    ${sub('Four values', 'Each value is a promise we can point to in the product. If a feature does not serve one of them, it waits.')}
    <div class="br-values">${values.map(([n, i, t, d], k) => `<article class="br-value arch blk-${t} rv" style="--i:${k}"><span class="mono">0${k + 1}</span><span class="br-value-ic">${ic(i, 'ic-lg')}</span><h4 class="d-s">${n}</h4><p>${d}</p></article>`).join('')}</div>
    ${gap(72)}
    ${sub('Personality', 'The marker shows where NICHE sits on each scale. Drag the handle to place a piece of copy or a layout and see whether it still sounds like us.')}
    <div class="grid g2 br-scales">${scales.map(([l, r, b, note]) => `<div class="br-scale" data-brand="${b}" data-l="${l}" data-r="${r}">
      <div class="br-scale-l"><b>${l}</b><b>${r}</b></div>
      <div class="br-scale-t"><span class="br-scale-mark" style="--x:${b}%"><em>NICHE</em></span><input type="range" min="0" max="100" value="${b}" data-input="br_pers" aria-label="${l} to ${r}"></div>
      <p class="br-scale-o small">${N.chip('ok', 'On brand')}<span>${note}</span></p>
    </div>`).join('')}</div>
    ${gap(72)}
    ${sub('Who we serve', 'Two audiences, one system. Each side has its own colour so people always know where they are.')}
    <div class="grid g2">
      <div class="blk blk-mint br-aud"><div class="row">${N.av('AG', 'hedge', 'lg')}<div><p class="eyebrow">Traders</p><h4 class="d-s">Food vans, stalls and caterers</h4></div></div>
        <dl class="br-aud-dl"><div><dt>Who</dt><dd>Often a team of one to five, trading most weekends and cooking the rest of the week.</dd></div><div><dt>They need</dt><dd>Fewer forms, earlier answers and events that suit their kit and their food.</dd></div><div><dt>We say</dt><dd>“Your passport does the paperwork. You do the cooking.”</dd></div></dl></div>
      <div class="blk blk-lilac br-aud"><div class="row">${N.av('RE', 'violet', 'lg')}<div><p class="eyebrow">Organisers</p><h4 class="d-s">Markets, festivals and fairs</h4></div></div>
        <dl class="br-aud-dl"><div><dt>Who</dt><dd>Teams booking anywhere from ten to two hundred traders a season.</dd></div><div><dt>They need</dt><dd>Confidence that every pitch is covered, less chasing, and a line-up that fits the crowd.</dd></div><div><dt>We say</dt><dd>“Every pitch, checked. Every trader, the right fit.”</dd></div></dl></div>
    </div>
    ${gap(72)}
    ${sub('Taglines', 'One master line and two side lines. Use one per surface, never stacked together.')}
    <div class="br-tags">${tags.map(([t, k, use, tone]) => `<div class="br-tag blk blk-${tone}"><p class="eyebrow">${k}</p><p class="d-m">${esc(t)}</p><p class="small br-tag-u">${use}</p>${copyBtn(t, 'Copy line', tone === 'hedge' ? 'btn-onhedge' : 'btn-line')}</div>`).join('')}</div>
  `);
}
/* =====================================================================
   02 LOGO
   ===================================================================== */
const appIcon = (size = 96, cls = '') => `<span class="br-icon ${cls}" style="--s:${size}px" aria-hidden="true"><span class="br-icon-a"><i class="t"></i><i class="b"></i></span></span>`;
function logo() {
  const versions = [
    ['On white', 'Full colour. Our default everywhere.', 'v-white'],
    ['On hedge', 'Zest and light lilac dots, soft white letters.', 'v-hedge'],
    ['Mono ink', 'One-colour print, forms, rubber stamps.', 'v-ink'],
    ['Mono white on violet', 'Organiser campaigns and merch.', 'v-violet'],
    ...PASTELS.map(([n, , , t]) => [`On ${n.toLowerCase()}`, `Mono, set in ${n.toLowerCase()} ink.`, `v-${t}`]),
  ];
  const misuse = [
    ['Don’t stretch or squash it', 'm-stretch'],
    ['Don’t recolour the dots', 'm-recolour'],
    ['Don’t remove the dots', 'm-nodots'],
    ['Don’t add shadows or effects', 'm-shadow'],
    ['Don’t set it on busy patterns', 'm-busy'],
    ['Don’t rotate it', 'm-rotate'],
  ];
  const sizes = [[128, '1024 px', 'App stores'], [88, '180 px', 'iOS home screen'], [64, '64 px', 'Android, PWA'], [32, '32 px', 'Favicon', 'fav'], [16, '16 px', 'Browser tab', 'fav']];
  return chap('logo', '02', 'Two dots, one <em>match</em>', 'The wordmark is lowercase, heavy and close-set, with one idea hidden in plain sight: the i has two dots. One for the trader, one for the organiser, and the stem between them is the match.', `
    <div class="br-logo-hero blk blk-sunk">
      <span class="br-logo-hero-wm" aria-hidden="true">${N.wm('wm-xl')}</span>
      <div class="br-logo-hero-meta"><span class="mtag">Figtree ExtraBold 800</span><span class="mtag">Tracking −5.5%</span><span class="mtag">Lowercase, dotless i</span><span class="mtag">Two dots</span></div>
    </div>
    ${gap(64)}
    ${sub('The two-dot story', 'Tap a part to isolate it. The trader lands from above, the organiser rises from below, and the stem of the i is where they meet.', replay('story'))}
    <div class="br-story" data-story>
      <div class="br-story-stage">
        <span class="bwm br-story-wm" aria-hidden="true"><span class="l">n</span><span class="bi2">ı<i class="d t"><span class="lab">The trader</span></i><i class="d b"><span class="lab">The organiser</span></i></span><span class="r">che</span></span>
      </div>
      <ol class="br-story-key">
        <li><button type="button" data-act="br_part" data-part="t"><span class="k t"></span><span><b>The trader</b><span>Green #5FBF3A. Growth and readiness. On dark it turns zest.</span></span></button></li>
        <li><button type="button" data-act="br_part" data-part="m"><span class="k m"></span><span><b>The match</b><span>The stem of the i. Nothing else in the mark carries meaning, so this does.</span></span></button></li>
        <li><button type="button" data-act="br_part" data-part="b"><span class="k b"></span><span><b>The organiser</b><span>Lilac #9B8CF2, below the baseline: the ground an event stands on.</span></span></button></li>
      </ol>
    </div>
    ${gap(72)}
    ${sub('Construction and clear space', 'Keep clear space on every side equal to the height of the lowercase n (its x-height). Nothing enters that zone: not text, not edges, not other logos.')}
    <div class="grid g-main br-constr">
      <div class="br-clear-wrap blk blk-sunk"><div class="br-clear">
        <span class="br-cn tl">x</span><span class="br-cn tr">x</span><span class="br-cn bl">x</span><span class="br-cn brr">x</span>
        ${bwm('br-clear-wm')}
      </div></div>
      <div class="stack" style="--g:14px">
        <div class="br-xn-wrap blk blk-sunk"><span class="br-xn" aria-hidden="true">n<span class="br-xh"><b>x</b></span></span><p class="small muted">x is the height of the n at the size you are using.</p></div>
        ${N.kv([['Typeface', 'Figtree 800'], ['Tracking', '−0.055em'], ['Dots', '0.2em circles'], ['Top dot', 'Green, above the stem'], ['Bottom dot', 'Lilac, below the baseline'], ['Artwork', 'Always the master file']])}
      </div>
    </div>
    ${gap(72)}
    ${sub('Minimum sizes', 'Below these sizes the dots blur into the letters. Switch to the app icon instead.')}
    <div class="grid g2">
      ${fig('Digital: 72 px wide', `<div class="br-min"><span class="br-min-w" data-minw="72px">${bwm('tight')}</span><span class="br-min-rule" style="width:72px"><b>72 px</b></span></div>`, 'Screens, email, social avatars.')}
      ${fig('Print: 20 mm wide', `<div class="br-min"><span class="br-min-w" data-minw="20mm">${bwm('tight')}</span><span class="br-min-rule" style="width:20mm"><b>20 mm</b></span></div>`, 'Business cards, stickers, labels.')}
    </div>
    ${gap(72)}
    ${sub('Colour versions', 'Full colour on white or hedge. On pastels and violet, go mono so the dots never fight the ground.')}
    <div class="br-versions">${versions.map(([n, d, cls]) => `<figure class="br-ver ${cls}"><div class="br-ver-v">${bwm()}</div><figcaption><b>${n}</b><span>${d}</span></figcaption></figure>`).join('')}</div>
    ${gap(72)}
    ${sub('App icon and favicon', 'An arch holding the two dots, on hedge. It carries the idea of the wordmark when there is no room for letters.')}
    <div class="br-icons-row">${sizes.map(([s, l, u, c]) => `<figure class="br-icon-fig">${appIcon(s, c || '')}<figcaption><b>${l}</b><span>${u}</span></figcaption></figure>`).join('')}
      <figure class="br-icon-fig br-tab-fig"><div class="br-tab">${appIcon(16, 'fav')}<span>NICHE · Find your fit</span>${ic('x', 'ic-sm')}</div><figcaption><b>In context</b><span>Browser tab</span></figcaption></figure>
    </div>
    ${gap(72)}
    ${sub('Misuse', 'The wordmark only works when it is left alone. These are the six mistakes we see most.')}
    <div class="br-misuse">${misuse.map(([l, c]) => `<figure class="br-mis ${c}"><div class="br-mis-v">${bwm()}</div><figcaption>${ic('x-circle')}${l}</figcaption></figure>`).join('')}</div>
  `);
}

/* =====================================================================
   03 THE ARCH & AWNING
   ===================================================================== */
const photo = (k, label) => `<div class="br-photo p-${k}" role="img" aria-label="${esc(label)}"><i></i><i></i><i></i></div>`;
function archChapter() {
  const scales = [
    ['Card, frame', 'Any width', '24px', '999px 999px 24px 24px'],
    ['Avatar', '38 px', '12px', '999px 999px 12px 12px'],
    ['Large avatar', '56 px', '16px', '999px 999px 16px 16px'],
    ['Date block', '56 × 64 px', '14px', '999px 999px 14px 14px'],
    ['Full arch', 'Alcoves, dividers', '0', '999px 999px 0 0'],
  ];
  const awnings = [['mint', 'Camden', 'Night market', 'Trader side'], ['lilac', 'Bristol', '9–11 Oct', 'Organiser side'], ['butter', 'Leeds', 'Summer festival', 'Admin, festivals'], ['peach', 'Brighton', 'Seafront', 'Food moments'], ['sky', 'York', 'Artisan market', 'Information'], ['hedge', 'Checked', 'Ready to trade', 'Hero moments only']];
  return chap('arch', '03', 'A place built to <em>fit</em>', 'In architecture, a niche is an arched alcove made to hold one thing perfectly. The arch is our brand device: a frame that says “this belongs here”. Its companion is the awning, the striped canopy of every market stall.', `
    <div class="grid g-main br-arch-top">
      <div class="blk blk-sunk br-arch-diag">
        <svg viewBox="0 0 360 430" role="img" aria-label="Arch construction: a semicircle with radius half the width, straight sides and 24 pixel base corners.">
          <path class="a" d="M60 170A120 120 0 0 1 300 170V356A24 24 0 0 1 276 380H84A24 24 0 0 1 60 356Z"/>
          <path class="g" d="M30 170H330"/><circle class="g" cx="180" cy="170" r="120"/>
          <path class="m" d="M180 170H300"/><circle class="c" cx="180" cy="170" r="4"/>
          <path class="m" d="M60 404H300M60 396v16M300 396v16"/>
          <circle class="k" cx="276" cy="356" r="24"/>
          <text x="240" y="160" text-anchor="middle">r = w ÷ 2</text><text x="180" y="426" text-anchor="middle">w</text><text x="34" y="160">springline</text><text x="306" y="396">24</text>
        </svg>
      </div>
      <div class="stack" style="--g:18px">
        <h3 class="d-s">Construction</h3>
        <ol class="br-steps">
          <li><b>Semicircle on top.</b> Its radius is always half the width, so the curve starts exactly where the sides begin.</li>
          <li><b>Straight sides.</b> The height is free: tall for portraits and alcoves, short for badges.</li>
          <li><b>Small base corners.</b> 24 px at card scale, 12 px at avatar scale. A full arch drops them to 0.</li>
        </ol>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Scale</th><th>Size</th><th>Base</th><th class="r">CSS</th></tr></thead><tbody>${scales.map(([n, s, b, css]) => `<tr><td><b>${n}</b></td><td class="mono">${s}</td><td class="mono">${b}</td><td class="r">${copyBtn('border-radius:' + css + ';', 'Copy', 'btn-ghost')}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </div>
    ${gap(72)}
    ${sub('Where the arch lives', 'Real components from the product. If something frames a person, a date, a photo or a promise, it is an arch.')}
    <div class="br-uses">
      ${fig('Avatars', `<div class="row" style="--g:10px;align-items:flex-end">${N.av('AG', 'mint', 'sm')}${N.av('AG', 'mint')}${N.av('MW', 'butter', 'lg')}${N.av('RE', 'lilac', 'xl')}</div>`, '12 px base at 38 px')}
      ${fig('Date blocks', `<div class="row" style="--g:10px">${N.evd('2026-10-02', 'side')}${N.evd('2026-10-09')}${N.evd('2026-10-20')}</div>`, 'Event lists and calendars')}
      ${fig('The Checked badge', `<div class="stack" style="--g:10px;align-items:flex-start">${N.checked()}${N.checked('Ready to trade')}</div>`, 'Only after documents are verified')}
      ${fig('The passport stamp', `<div class="stamp br-stamp-demo">${N.stamp('br-st')}</div>`, 'Lands when a passport is ready', 'br-fig-hedge')}
      ${fig('Empty states', N.empty('No applications yet', 'When traders apply, they appear here with their readiness.', '', 'inbox'), 'Calm, never a dead end')}
      ${fig('Photo frames', `<div class="br-frame arch">${photo('steam', 'A trader plating food in warm daylight')}</div>`, 'Portraits of traders at work')}
      ${fig('Section dividers', `<div class="br-divider" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i class="t-${['mint', 'lilac', 'butter', 'peach', 'sky'][i % 5]}"></i>`).join('')}</div>`, 'A row of full arches')}
      ${fig('Chips and bullets', `<div class="tags">${N.chip('ok', 'Ready')}${N.chip('warn', 'Expiring')}${N.chip('risk', 'Missing')}</div>`, 'The chip dot is a tiny arch')}
      ${fig('App icon', appIcon(72), 'Arch plus two dots')}
    </div>
    ${gap(72)}
    ${sub('The awning', 'Market-stall stripes with a scalloped edge. Stripes are 26 px wide and the scallops are 13 px half-circles hanging from the stripe line. Pair every awning with an arch.')}
    <div class="br-awnings">${awnings.map(([t, b, s, u]) => `<figure class="br-awn">${N.art(t, b, s)}<figcaption><b>${N.cap(t)}</b><span>${u}</span></figcaption></figure>`).join('')}</div>
    ${gap(40)}
    <div class="br-awn-spec blk blk-sunk">
      <div class="br-awn-zoom" aria-hidden="true"><span class="br-awn-strip"></span><span class="br-dim d1"><b>26 px</b></span><span class="br-dim d2"><b>13 px scallop</b></span></div>
      <div class="stack" style="--g:8px"><h4 class="h4">Awning rules</h4><p class="small ink-2">The stripe colour is the tone’s strong partner: hedge on mint, violet on lilac, paprika on butter and peach, sky ink on sky, zest on hedge. The awning covers the top third of a frame, never more.</p></div>
    </div>
    ${gap(56)}
    ${doDont(['Keep the top a true semicircle at every size.', 'Use one arch per idea: one person, one date, one promise.', 'Let photos fill the arch edge to edge.', 'Align a row of arches on a shared baseline.'], ['Squash the curve into an oval or a pointed gothic arch.', 'Flip it upside down or use it as a speech bubble.', 'Nest arches inside arches.', 'Run awning stripes behind text.'])}
  `);
}
/* =====================================================================
   04 COLOUR
   ===================================================================== */
const swatch = (c, cls = '') => `<button type="button" class="br-sw ${cls}" data-act="br_copy" data-v="${c.hex}" aria-label="Copy ${c.n}, ${c.hex}">
  <span class="br-sw-c" style="background:${c.hex};color:${bestOn(c.hex)}"><b>${c.n}</b><span class="br-sw-copy">${ic('copy', 'ic-sm')}Copy</span></span>
  <span class="br-sw-m"><span class="br-sw-hex mono">${c.hex}</span><span class="mono muted">RGB ${rgbStr(c.hex)}</span><span class="mono br-sw-tok">${c.tok}</span><span class="small ink-2">${c.role}</span></span></button>`;
const passChip = (r, min) => r >= min ? N.chip('ok', 'Pass') : N.chip('risk', 'Fail');
const PICK = [...CORE, ...ACCENTS, ...PASTELS.flatMap(([n, bg, ink]) => [{ n, hex: bg }, { n: n + ' ink', hex: ink }]), ...SEMANTIC.flatMap(([n, , fg, bg]) => [{ n, hex: fg }, { n: n + ' tint', hex: bg }])];
const pairResult = (fg, bg) => { const r = ratio(fg, bg); return `<div class="br-pc-sample" style="background:${bg};color:${fg}"><span class="br-pc-big">Aa</span><span>Upload renewal before 21 Oct</span></div>
  <div class="br-pc-out"><span class="num">${r.toFixed(2)}<small>:1</small></span><div class="tags"><span class="br-pc-k">AA ${passChip(r, 4.5)}</span><span class="br-pc-k">AA large ${passChip(r, 3)}</span><span class="br-pc-k">AAA ${passChip(r, 7)}</span></div></div>`; };
function colour() {
  const seg = [['White', '#FFFFFF', 42], ['Chalk', '#F5F4F0', 18], ['Hedge', '#0E3B2E', 12], ['Ink', '#101A15', 8], ['Mint', '#D5F2DF', 3], ['Lilac', '#E9E2FF', 3], ['Butter', '#FFF0A8', 3], ['Peach', '#FFD8C9', 3], ['Sky', '#D8EAF8', 3], ['Violet', '#5A31E4', 2.5], ['Zest', '#DDF85E', 1.5], ['Paprika', '#FF5A36', 1]];
  const sides = [
    ['trader', 'Trader', 'Mint + hedge', 'AG', 'Alice Green · AG Foods', ['Dashboard', 'My Passport', 'My Documents']],
    ['org', 'Organiser', 'Lilac + violet', 'RE', 'Olivia Reed · Reed Events', ['Dashboard', 'Applications', 'Manage Events']],
    ['admin', 'Admin', 'Butter + ink', 'SO', 'Sam Okafor · Niche team', ['Dashboard', 'Traders', 'Document Types']],
  ];
  return chap('colour', '04', 'Daylight, hedgerows and a little <em>zest</em>', 'A calm, mostly white palette with a deep hedge green, soft pastels for each side of the product and three small accents. Click any swatch to copy its hex.', `
    ${sub('Core', 'The quiet majority of every screen and every page.')}
    <div class="br-sws br-sws-core">${CORE.map(c => swatch(c, c.n === 'Hedge' || c.n === 'Ink' ? 'wide' : '')).join('')}</div>
    ${gap(40)}
    ${sub('Accents', 'Used sparingly, so they mean something when they appear.')}
    <div class="br-sws br-sws-acc">${ACCENTS.map(c => swatch(c)).join('')}</div>
    ${gap(72)}
    ${sub('Pastels and their inks', 'Every pastel comes with its own ink. Text on a pastel is always set in that pastel’s ink, never plain black.')}
    <div class="br-pastels">${PASTELS.map(([n, bg, ink, t, use]) => `<div class="br-pp" style="background:${bg};color:${ink}">
      <div class="br-pp-top"><b>${n}</b><span class="mono">${ratio(ink, bg).toFixed(1)}:1</span></div>
      <p class="br-pp-aa">Aa</p><p class="small">${use}</p>
      <div class="br-pp-hex"><button type="button" data-act="br_copy" data-v="${bg}" aria-label="Copy ${n} ${bg}">${bg}</button><button type="button" data-act="br_copy" data-v="${ink}" aria-label="Copy ${n} ink ${ink}">${ink}</button></div>
      <span class="mono br-pp-tok">--${t} · --${t}-ink</span></div>`).join('')}</div>
    ${gap(72)}
    ${sub('The side colour system', 'Each product area owns a colour pair, so people always know where they are. The pair drives the active nav item, the side chip, the stepper and the main button.')}
    <div class="br-sides">${sides.map(([k, l, pair, av, who, nav]) => `<div class="br-side s-${k}">
      <div class="br-side-h"><span class="side-tag">${l}</span><span class="mono muted">${pair}</span></div>
      <div class="acct">${N.av(av, k === 'trader' ? 'mint' : k === 'org' ? 'lilac' : 'butter', 'sm')}<span class="acct-b"><b>${who.split(' · ')[1]}</b><span>${who.split(' · ')[0]}</span></span></div>
      <div class="br-side-nav">${nav.map((x, i) => `<span class="${i === 1 ? 'on' : ''}">${ic(['grid', 'id', 'file'][i])}${x}</span>`).join('')}</div>
      <div class="row" style="--g:8px">${N.chip('side', l + ' side')}<button type="button" class="btn btn-side btn-xs" data-act="br_toast" data-msg="${l} actions use the ${l.toLowerCase()} side colour.">Primary action</button></div>
    </div>`).join('')}</div>
    ${gap(72)}
    ${sub('Semantic colours', 'Status is always shown with a word as well as a colour. Paprika is never used for errors.')}
    <div class="br-sem">${SEMANTIC.map(([n, cls, fg, bg, use]) => `<div class="br-sem-c"><div class="br-sem-sw"><button type="button" style="background:${fg}" data-act="br_copy" data-v="${fg}" aria-label="Copy ${n} ${fg}"></button><button type="button" style="background:${bg}" data-act="br_copy" data-v="${bg}" aria-label="Copy ${n} tint ${bg}"></button></div>
      <div class="stack" style="--g:8px"><div class="row between"><b>${n}</b><span class="mono muted">--${cls}</span></div>${N.chip(cls, n)}<div class="banner ${cls}">${ic(cls === 'ok' ? 'check-circle' : cls === 'warn' ? 'clock' : cls === 'risk' ? 'alert' : 'info')}<span class="small">${use}</span></div><span class="mono muted">${fg} on ${bg}</span></div></div>`).join('')}</div>
    ${gap(72)}
    ${sub('Proportion', 'Roughly 60% white and chalk, 20% hedge and ink, 15% pastels, 5% accents. If a screen feels loud, it has too much of the last two.')}
    <div class="br-prop" role="img" aria-label="Colour proportion: 60% white and chalk, 20% hedge and ink, 15% pastels, 5% accents">${seg.map(([n, h, w]) => `<span style="flex-basis:${w}%;background:${h}" title="${n}"></span>`).join('')}</div>
    <div class="br-prop-l"><span style="flex-basis:60%"><b>60%</b> White, chalk</span><span style="flex-basis:20%"><b>20%</b> Hedge, ink</span><span style="flex-basis:15%"><b>15%</b> Pastels</span><span style="flex-basis:5%"><b>5%</b></span></div>
    ${gap(72)}
    ${sub('Accessible pairings', 'Contrast ratios below are calculated live from the hex values with the WCAG 2.2 formula. Body text needs AA (4.5:1). Text over 24 px, or 19 px bold, needs 3:1.')}
    <div class="tbl-wrap br-a11y"><table class="tbl"><thead><tr><th>Sample</th><th>Pairing</th><th>Ratio</th><th>AA</th><th>AA large</th><th>AAA</th><th>Use</th></tr></thead><tbody>${PAIRS.map(([n, fg, bg, use]) => { const r = ratio(fg, bg); return `<tr><td><span class="br-a11y-s" style="background:${bg};color:${fg}">Aa</span></td><td><b>${n}</b><span class="mono muted br-a11y-hex">${fg} / ${bg}</span></td><td class="mono"><b>${r.toFixed(2)}:1</b></td><td>${passChip(r, 4.5)}</td><td>${passChip(r, 3)}</td><td>${passChip(r, 7)}</td><td class="small ink-2">${use}</td></tr>`; }).join('')}</tbody></table></div>
    ${gap(28)}
    <div class="br-pc card">
      <div class="stack" style="--g:6px"><h4 class="h4">Check your own pairing</h4><p class="small muted">Pick any two colours from the palette.</p></div>
      <div class="br-pc-sel">
        ${N.field({ label: 'Text colour', id: 'br-pc-fg', value: '#101A15', opts: PICK.map(c => [c.hex, `${c.n} · ${c.hex}`]), attrs: 'data-change="br_pair"' })}
        ${N.field({ label: 'Background', id: 'br-pc-bg', value: '#D5F2DF', opts: PICK.map(c => [c.hex, `${c.n} · ${c.hex}`]), attrs: 'data-change="br_pair"' })}
      </div>
      <div class="br-pc-res" id="br-pc-res">${pairResult('#101A15', '#D5F2DF')}</div>
    </div>
    ${gap(72)}
    ${sub('Dark theme', 'Hedge and zest stay the same. Surfaces become deep green-black, pastels become deep tints and their inks turn light. Every pairing keeps AA.', `<button type="button" class="btn btn-ink btn-sm" data-act="br_theme">${ic('moon')}Switch this page’s theme</button>`)}
    <div class="br-dark" style="background:#0C120F;color:#EDF2EE">
      <div class="br-dark-base">${DARK_BASE.map(([n, t, h]) => `<button type="button" class="br-dk" data-act="br_copy" data-v="${h}" aria-label="Copy ${n} ${h}"><span style="background:${h}"></span><b>${n}</b><span class="mono">${t}</span><span class="mono">${h}</span></button>`).join('')}</div>
      <div class="br-dark-pairs">${DARK_PAIRS.map(([n, bg, ink]) => `<button type="button" class="br-dkp" style="background:${bg};color:${ink}" data-act="br_copy" data-v="${bg} / ${ink}" aria-label="Copy dark ${n} pair"><b>${n}</b><span class="mono">${ink}</span><span class="mono">on ${bg}</span><span class="mono">${ratio(ink, bg).toFixed(1)}:1</span></button>`).join('')}</div>
    </div>
  `);
}

/* =====================================================================
   05 TYPOGRAPHY
   ===================================================================== */
const SCALE = [
  ['d-xl', 'Display XL', '52–128 px · 800 · −3.5%', 'Find your <em>fit</em>'],
  ['d-l', 'Display L', '40–80 px · 800 · −3%', 'Every pitch, <em>checked</em>'],
  ['d-m', 'Display M', '30–50 px · 800 · −2.5%', 'Ready to <em>trade</em>'],
  ['d-s', 'Display S', '24–32 px · 800 · −2.5%', 'Camden Night <em>Market</em>'],
  ['h-page', 'Page title', '30–42 px · 800', 'My <em>documents</em>'],
  ['h3', 'Heading 3', 'Figtree 20 px · 700', 'Documents expiring soon'],
  ['h4', 'Heading 4', 'Figtree 16.5 px · 700', 'Gas Safety Certificate'],
  ['lead', 'Lead', 'Figtree 17–19.5 px · 400 · 1.55', 'Build one passport and apply to any event in minutes.'],
  ['br-body', 'Body', 'Figtree 15.5 px · 400 · 1.55', 'Upload your renewal before 21 Oct to keep Leeds Summer Festival valid.'],
  ['small', 'Small', 'Figtree 13.5 px', 'Reviewed by Olivia Reed on 18 Sep'],
  ['mono', 'Mono', 'DM Mono 12.5 px · tabular', 'NCH-26-0100 · PITCH B7 · 21/10/2026'],
  ['eyebrow', 'Eyebrow', 'DM Mono 11.5 px · caps · +12%', 'Food trader passport'],
];
const TT = { text: 'Every pitch, checked.', size: 88, w: '800', it: true, bg: 'paper' };
function ttTrack(size) { return size >= 64 ? -0.035 : size >= 40 ? -0.03 : -0.025; }
function ttCSS(s) { return `font-family: "Fraunces", Georgia, serif;\nfont-weight: ${s.w};\nfont-size: ${s.size}px;\nletter-spacing: ${ttTrack(s.size)}em;\nline-height: ${s.size >= 64 ? .92 : 1};\nfont-variation-settings: "SOFT" 100, "WONK" 0;${s.it ? '\n/* last word: <em> with "WONK" 1, italic */' : ''}`; }
function ttHTML(s) {
  const words = esc(s.text.trim() || 'Find your fit.').split(' ');
  const last = words.pop();
  return (words.length ? words.join(' ') + ' ' : '') + (s.it ? `<em>${last}</em>` : last);
}
function type() {
  const weights = [400, 500, 600, 700, 800];
  return chap('type', '05', 'Soft serif, honest <em>sans</em>', 'Fraunces gives headlines warmth and weight. Figtree does the everyday work of reading and tapping. DM Mono handles anything you would check against a document.', `
    <div class="br-fams">
      <article class="br-fam br-fam-d blk blk-sunk">
        <div class="br-fam-h"><p class="eyebrow">Display</p><span class="mtag">Google Fonts</span></div>
        <p class="br-fam-aa" aria-hidden="true">A<em>a</em></p>
        <h4 class="br-fam-n">Fraunces</h4>
        <p class="br-fam-g" aria-hidden="true">ABCDEFGHIJKLM<br>abcdefghijklm<br>0123456789 £&amp;?!</p>
        <div class="tags"><span class="mtag">800</span><span class="mtag">SOFT 100</span><span class="mtag">WONK 0</span><span class="mtag">Italic WONK 1</span></div>
        <p class="small ink-2">Headlines of 24 px and above, and big numbers. Tracking −2.5% to −3.5%, tighter as it grows.</p>
      </article>
      <article class="br-fam br-fam-u blk blk-sunk">
        <div class="br-fam-h"><p class="eyebrow">Interface and body</p><span class="mtag">Google Fonts</span></div>
        <p class="br-fam-aa" aria-hidden="true">Aa</p>
        <h4 class="br-fam-n">Figtree</h4>
        <ul class="br-fam-w">${weights.map(w => `<li style="font-weight:${w}"><span class="mono muted">${w}</span>Ready to trade</li>`).join('')}</ul>
        <p class="small ink-2">Everything people read or tap: body, buttons, forms, tables, the wordmark itself.</p>
      </article>
      <article class="br-fam br-fam-m blk blk-sunk">
        <div class="br-fam-h"><p class="eyebrow">Utility</p><span class="mtag">Google Fonts</span></div>
        <p class="br-fam-aa" aria-hidden="true">Aa</p>
        <h4 class="br-fam-n">DM Mono</h4>
        <div class="br-fam-mono"><span class="eyebrow">Pitch number</span><span class="mono">B7</span><span class="eyebrow">Passport ID</span><span class="mono">NCH-26-0100</span><span class="eyebrow">Expires</span><span class="mono">21 OCT 2026</span></div>
        <p class="small ink-2">400 and 500. Labels, IDs, dates, pitch numbers. Labels go uppercase with +12% tracking.</p>
      </article>
    </div>
    ${gap(72)}
    ${sub('Type scale', 'Rendered with the real classes from niche.css. Display sizes are fluid between the two values shown.')}
    <div class="br-tscale">${SCALE.map(([c, n, s, t]) => `<div class="br-ts-row"><div class="br-ts-meta"><code>.${c === 'br-body' ? 'body' : c}</code><b>${n}</b><span class="mono muted">${s}</span></div><div class="br-ts-s"><p class="${c}">${t}</p></div></div>`).join('')}</div>
    ${gap(72)}
    ${sub('Type tester', 'Try a headline before you ship it. The slider stops at 24 px because Fraunces never goes smaller.')}
    <div class="br-tt" data-tt>
      <div class="br-tt-controls">
        ${N.field({ label: 'Headline', id: 'br-tt-text', value: TT.text, attrs: 'data-input="br_tt" data-k="text" maxlength="60"' })}
        <label class="field" for="br-tt-size"><span>Size <b class="mono" id="br-tt-sz">${TT.size} px</b></span><input type="range" class="br-range" id="br-tt-size" min="24" max="160" value="${TT.size}" data-input="br_tt" data-k="size"></label>
        <div class="field"><span>Weight</span>${N.seg('br_tt_w', [['600', '600'], ['700', '700'], ['800', '800'], ['900', '900']], TT.w)}</div>
        <div class="field"><span>Ground</span>${N.seg('br_tt_bg', [['paper', 'Paper'], ['hedge', 'Hedge'], ['lilac', 'Lilac'], ['butter', 'Butter']], TT.bg)}</div>
        ${N.toggle('br-tt-it', 'Italic on the last word', TT.it, 'data-change="br_tt"')}
      </div>
      <div class="br-tt-stage" data-bg="${TT.bg}"><p class="br-tt-out" id="br-tt-out" style="font-size:${TT.size}px;font-weight:${TT.w};letter-spacing:${ttTrack(TT.size)}em">${ttHTML(TT)}</p></div>
      <div class="br-tt-css"><pre class="mono" id="br-tt-css">${esc(ttCSS(TT))}</pre><button type="button" class="btn btn-line btn-xs" data-act="br_ttcopy">${ic('copy')}Copy CSS</button></div>
    </div>
    ${gap(72)}
    ${sub('Pairing rules')}
    <ol class="br-rules">
      <li><b>Serif for the headline, sans for the rest.</b> One Fraunces headline per view. Everything below it is Figtree.</li>
      <li><b>One italic word.</b> Italicise the single word that carries the meaning: “Every pitch, <em>checked</em>.”</li>
      <li><b>Mono for facts you can check.</b> Dates, IDs, pitch numbers, prices in tables. If it would appear on a certificate, it is mono.</li>
      <li><b>Sentence case everywhere.</b> Only mono labels go uppercase. Headlines, buttons and menus never do.</li>
    </ol>
    ${gap(40)}
    ${doDont(['Set headlines tight: −2.5% to −3.5% tracking, line height under 1.', 'Use tabular figures for anything in a column.', 'Keep body lines between 45 and 75 characters.'], ['Use Fraunces in buttons, labels or anything under 24 px.', 'Italicise more than one word in a headline.', 'Set whole sentences in uppercase mono.'])}
  `);
}
/* =====================================================================
   06 ICONOGRAPHY
   ===================================================================== */
function icons() {
  const names = Object.keys(N.ICONS);
  return chap('icons', '06', 'Clear lines, round <em>ends</em>', `${names.length} Lucide-style line icons drawn on a 24 px grid with a 1.9 stroke and round caps and joins. Click any icon to copy its name for <code>N.ic()</code>.`, `
    <div class="br-ic-demo">
      ${fig('Sizes', `<div class="row" style="--g:18px;align-items:flex-end">${[['ic-sm', 15], ['', 18], ['ic-lg', 22], ['ic-xl', 28]].map(([c, s]) => `<span class="br-ic-sz">${ic('truck', c)}<span class="mono">${s}</span></span>`).join('')}</div>`, '15 inline · 18 default · 22 large · 28 feature')}
      ${fig('Stroke', `<div class="row" style="--g:18px">${[1.4, 1.9, 2.6].map(w => `<span class="br-ic-sz br-stroke ${w === 1.9 ? 'on' : ''}" style="--sw:${w}">${ic('shield', 'ic-xl')}<span class="mono">${w}</span></span>`).join('')}</div>`, '1.9 at every size. Round caps, round joins.')}
      ${fig('The one exception', `<div class="stack" style="--g:8px">${N.stars(5)}<span class="small muted">Rating stars are filled paprika</span></div>`, 'Nothing else is ever filled')}
    </div>
    ${gap(40)}
    <div class="br-ic-bar"><label class="search" style="max-width:360px;width:100%">${ic('search')}<span class="sr">Filter icons</span><input type="search" placeholder="Filter icons, e.g. calendar" data-input="br_icf" autocomplete="off"></label><span class="mono muted" id="br-ic-n">${names.length} icons</span></div>
    <div class="br-ic-grid" id="br-ic-grid">${names.map(n => `<button type="button" class="br-ic" data-act="br_copy" data-v="${n}" data-name="${n}" title="Copy “${n}”">${ic(n)}<span class="mono">${n}</span></button>`).join('')}</div>
    <p class="br-ic-none muted" id="br-ic-none" hidden>No icon by that name. Try a simpler word like “file” or “user”.</p>
    ${gap(56)}
    ${doDont(['Draw on the 24 px grid with 2 px of padding.', 'Pair an icon with a word. Icon-only buttons need an aria-label.', 'Inherit colour from the text (currentColor).', 'Use the same icon for the same thing everywhere.'], ['Fill icons, add duotones or mix in another icon set.', 'Change the stroke to fit a size. Change the size instead.', 'Use an icon as the only way to show status.', 'Draw new icons without the 1.9 stroke and round ends.'])}
  `);
}

/* =====================================================================
   07 ILLUSTRATION & IMAGERY
   ===================================================================== */
function imagery() {
  const dos = [['steam', 'Steam and heat', 'Shoot at plate height as the food comes off the heat.'], ['hands', 'Hands at work', 'Wrapping, pouring, handing over. Crop tight.'], ['market', 'Real crowds in daylight', 'Busy pitches, natural light, people mid-moment.'], ['grill', 'Fire and char', 'Let the flames glow; keep the shadows deep.'], ['dusk', 'Night markets', 'String lights and warm faces after dark.']];
  const donts = ['Stock handshakes and posed thumbs-up', 'Empty stalls or closed shutters', 'Heavy filters, fake bokeh, HDR', 'Plastic food styling or cut-out food on white', 'Faces without permission'];
  return chap('imagery', '07', 'Real food, real <em>people</em>', 'Our pictures show the work: traders cooking, hands passing food across the counter, steam in daylight. We frame them in arches and let awnings set the scene.', `
    ${sub('Arch and awning compositions', 'Three layouts cover almost everything: the event hero, the trader portrait and the poster.')}
    <div class="br-comps">
      ${fig('Event hero', `<div class="art t-peach br-comp"><div class="br-comp-a arch-full">${photo('market', 'A busy street food market in daylight')}</div></div>`, 'Awning on top, one arch rising from the base')}
      ${fig('Trader portrait', `<div class="br-comp2 blk-hedge"><div class="br-frame arch">${photo('hands', 'A trader handing a wrap across the counter')}</div><div class="stack" style="--g:4px"><span class="eyebrow">Ready to trade</span><b class="br-comp2-t">Alice Green Foods</b>${N.checked()}</div></div>`, 'Arch frame, name, the Checked badge')}
      ${fig('Poster', `<div class="br-comp3 blk-lilac"><span class="br-comp3-h">Every pitch, <em>checked.</em></span><div class="br-comp3-a arch-full">${photo('dusk', 'A night market with string lights')}</div>${bwm('br-comp3-wm')}</div>`, 'Pastel ground, arch cut into the base')}
    </div>
    ${gap(72)}
    ${sub('Framing photos in arches', 'Fill the frame edge to edge. Keep faces and food in the lower two thirds, below the curve, so the arch never crops a head.')}
    <div class="br-framing">
      ${fig('Eyes near the springline', `<div class="br-frame arch br-guide">${photo('hands', 'A trader framed so the face sits below the curve')}<span class="br-guide-l"><b>springline</b></span></div>`, 'The curve starts at half the width')}
      ${fig('Food at the base', `<div class="br-frame arch br-guide g2">${photo('steam', 'Food in the bottom third of the frame')}<span class="br-guide-l"><b>focus zone</b></span></div>`, 'Hero dish in the bottom third')}
      ${fig('Not like this', `<div class="br-frame arch br-bad">${photo('dusk', 'Two people with their heads cut off by the curve of the arch')}<span class="br-bad-x">${ic('x')}</span></div>`, 'Heads cut off by the curve', 'br-fig-bad')}
    </div>
    ${gap(72)}
    ${sub('Photography direction', 'Candid, warm and specific. If you could swap the photo onto any other brand, it is the wrong photo.')}
    <div class="br-mood">${dos.map(([k, t, d]) => `<figure class="br-mood-i"><div class="br-frame arch">${photo(k, t)}</div><figcaption><span class="br-ok">${ic('check')}</span><span><b>${t}</b><span>${d}</span></span></figcaption></figure>`).join('')}</div>
    ${gap(28)}
    <div class="br-avoid card flat"><p class="br-dd-h br-dd-x">${ic('x')}Avoid</p><ul>${donts.map(d => `<li>${d}</li>`).join('')}</ul></div>
    ${gap(40)}
    ${doDont(['Shoot in daylight or warm practical light.', 'Ask permission and credit the trader by name.', 'Show the pitch, the van or the stall as it really is.'], ['Use AI images of food or people as if they were real.', 'Put text over faces or over the food.', 'Crop an arch frame at the base: the straight sides must reach the bottom.'])}
  `);
}

/* =====================================================================
   08 UI COMPONENTS
   ===================================================================== */
function ui() {
  const btns = [['btn-ink', 'Upload renewal'], ['btn-violet', 'Get started'], ['btn-hedge', 'View passport'], ['btn-zest', 'Ready to trade'], ['btn-side', 'Accept application'], ['btn-line', 'Save as draft'], ['btn-ghost', 'Cancel'], ['btn-danger', 'Withdraw application']];
  const rows = [['mw', 'camden', 98, 'info', 'Pending review'], ['tl', 'camden', 84, 'risk', '1 missing'], ['gs', 'brighton', 100, 'ok', 'All met'], ['st', 'brighton', 91, 'warn', '1 expiring']];
  const panel = (title, body, cls = '') => `<div class="br-ui ${cls}"><p class="br-ui-h">${title}</p>${body}</div>`;
  return chap('ui', '08', 'The kit, <em>live</em>', 'Every component below is the real thing from niche.css and core.js, not a picture of it. Click, type and toggle.', `
    ${panel('Buttons', `<div class="btn-row">${btns.map(([c, l]) => `<button type="button" class="btn ${c}" data-act="br_toast" data-msg="${esc(l)}: buttons say exactly what happens next.">${l}</button>`).join('')}</div>
      <div class="btn-row br-ui-sizes">${[['btn-lg', 'Large · 56'], ['', 'Default · 48'], ['btn-sm', 'Small · 40'], ['btn-xs', 'Extra small · 32']].map(([c, l]) => `<button type="button" class="btn btn-ink ${c}" data-act="br_toast" data-msg="${l} px button.">${ic('arrow-right')}${l}</button>`).join('')}<button type="button" class="icon-btn" aria-label="More options" data-act="br_toast" data-msg="Icon buttons always carry an aria-label.">${ic('more')}</button></div>`)}
    ${panel('Chips, tags and status', `<div class="tags">${N.chip('ok', 'Approved')}${N.chip('warn', 'Expiring')}${N.chip('risk', 'Missing')}${N.chip('info', 'In review')}${N.chip('plain', 'Draft')}${N.chip('violet', 'New')}${N.chip('zest', 'Top match')}${N.chip('side', 'Organiser')}${N.chip('ok lg', 'Ready to trade')}</div>
      <div class="tags" style="margin-top:12px">${N.checked()}<span class="tag">${ic('truck')}Food truck</span><span class="tag">${ic('zap')}16A</span><span class="mtag">PITCH B7</span><span class="count">3</span><span class="count warn">2</span><span class="count risk">1</span></div>`)}
    <div class="grid g2">
      ${panel('Form controls', `<div class="form-grid">
        ${N.field({ label: 'Business name', id: 'br-f-name', value: 'Alice Green Foods', req: true })}
        ${N.field({ label: 'Power supply', id: 'br-f-power', value: '16A', opts: ['13A', '16A', '32A'], hint: 'per pitch' })}
        ${N.field({ label: 'Menu note', id: 'br-f-note', type: 'textarea', rows: 2, ph: 'Tell organisers what you serve', full: true })}
        <div class="full stack" style="--g:12px">${N.toggle('br-f-tg', 'Email me before documents expire', true)}${N.checkbox('br-f-cb', 'I cook with LPG on site', true)}</div>
        <div class="full">${N.seg('br_demo_seg', [['all', 'All'], ['ready', 'Ready'], ['exp', 'Expiring'], ['miss', 'Missing']], 'ready')}</div>
        <label class="search full">${ic('search')}<span class="sr">Search</span><input type="search" placeholder="Search traders and events"></label>
        <div class="full row">${N.starInput('br_star', 4)}<span class="small muted">Tap to rate</span></div>
      </div>`)}
      ${panel('Progress and trust', `<div class="br-ui-trust">
        <div class="row" style="--g:18px">${N.ring(93)}<div class="stack" style="--g:4px"><b>93% ready</b><span class="small muted">1 document expiring</span>${N.rd(93)}</div></div>
        ${N.fhrs(5)}
        <div class="row" style="--g:10px">${N.stars(5)}<span class="small"><b>5.0</b> <span class="muted">· 12 reviews</span></span></div>
        ${N.stepper(['Business', 'Units', 'Documents', 'Review'], 2)}
      </div>`)}
    </div>
    <div class="grid g3 br-ui-cards">
      <article class="card br-ev-card">${N.art('lilac', 'Camden', 'Night market')}<div class="stack" style="--g:8px;padding:16px 4px 0"><div class="row between"><b class="h4">Camden Night Market</b>${N.chip('ok', 'All met')}</div><span class="small muted">Fri 2 Oct · Camden Lock Arches · 6 pitches left</span><button type="button" class="btn btn-side btn-sm" data-act="br_toast" data-msg="Applied with your passport. Reed Events usually replies within 2 days.">Apply with passport</button></div></article>
      <div class="stack" style="--g:12px"><div class="stat tone-mint"><span class="lbl">Checked traders</span><span class="num" data-v="1284">1,284</span><span class="s">+86 this month</span></div><div class="stat"><span class="lbl">Applications to review</span><span class="num">7</span><span class="s">Oldest 3 days ago</span></div></div>
      <div class="stack" style="--g:12px">
        <div class="banner ok">${ic('check-circle')}<span class="grow">All documents valid for Camden Night Market.</span></div>
        <div class="banner warn">${ic('clock')}<span class="grow">Renew your Gas Safety Certificate before 21 Oct.</span></div>
        <div class="banner risk">${ic('alert')}<span class="grow">Electrical Safety Certificate missing. Bristol needs it.</span></div>
        <div class="banner info">${ic('info')}<span class="grow">Reed Events asked 2 questions.</span></div>
      </div>
    </div>
    ${panel('Tabs and table', `<div class="row between" style="margin-bottom:14px">${N.tabsHTML([['all', 'All', 12], ['pending', 'Pending', 4], ['approved', 'Approved', 7], ['rejected', 'Rejected', 1]], 'pending', 'data-act="br_tab" data-k')}</div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Trader</th><th>Event</th><th>Readiness</th><th>Checks</th><th class="r">Action</th></tr></thead><tbody>${rows.map(([t, e, p, c, l]) => `<tr><td><div class="cell">${N.tav(t, 'sm')}<div><b>${esc(N.db.traders[t].biz)}</b><span class="s">${esc(N.db.traders[t].food)}</span></div></div></td><td class="small">${esc(N.db.events[e].name)}</td><td>${N.rd(p)}</td><td>${N.chip(c, l)}</td><td class="r"><button type="button" class="btn btn-line btn-xs" data-act="br_drawer">Review application</button></td></tr>`).join('')}</tbody></table></div>`)}
    <div class="grid g-main br-ui-pp">
      <div>${N.passportCard('ag', { sid: 'br' })}</div>
      ${panel('Overlays', `<p class="small ink-2">Drawers hold detail without losing your place. Modals ask one question. Toasts confirm what just happened and offer Undo when they can.</p>
        <div class="btn-row" style="margin-top:14px"><button type="button" class="btn btn-ink btn-sm" data-act="br_demo_toast">${ic('check-circle')}Show a toast</button><button type="button" class="btn btn-line btn-sm" data-act="br_demo_undo">Toast with Undo</button><button type="button" class="btn btn-line btn-sm" data-act="br_drawer">Open a drawer</button><button type="button" class="btn btn-line btn-sm" data-act="br_modal">Open a modal</button></div>
        <div style="margin-top:18px">${N.empty('Nothing to review', 'New applications land here. We’ll email you when one arrives.', '<button type="button" class="btn btn-side btn-sm" data-act="br_toast" data-msg="Invite traders opens the invite flow in the organiser app.">Invite traders</button>', 'inbox')}</div>`)}
    </div>
  `);
}
/* =====================================================================
   09 MOTION
   ===================================================================== */
const EASE = [
  ['Rise', 'cubic-bezier(.2,.8,.2,1)', [.2, .8, .2, 1], 700, 'Arches rising, reveals on scroll. Drawers use it at 400 ms.'],
  ['Land', 'cubic-bezier(.3,1.5,.5,1)', [.3, 1.5, .5, 1], 550, 'Stamps and pins: a small overshoot, then settle.'],
  ['Spring', 'cubic-bezier(.3,1.3,.5,1)', [.3, 1.3, .5, 1], 250, 'Toggles, star ratings, tiny confirmations.'],
  ['Count', 'cubic-bezier(.33,1,.68,1)', [.33, 1, .68, 1], 650, 'Number tweens. Readiness rings take 900 ms.'],
  ['Fade', 'ease', [.25, .1, .25, 1], 250, 'Modals, toasts, the scrim behind overlays.'],
];
const curve = ([a, b, c, d]) => { const p = (x, y) => `${(x * 100).toFixed(0)} ${(100 - y * 100).toFixed(0)}`; return `<svg class="br-curve" viewBox="-8 -58 116 170" aria-hidden="true"><path class="bx" d="M0 0H100V100H0Z"/><path class="cp" d="M0 100L${p(a, b)}M100 0L${p(c, d)}"/><path class="cv" d="M0 100C${p(a, b)} ${p(c, d)} 100 0"/><circle cx="0" cy="100" r="3.5"/><circle cx="100" cy="0" r="3.5"/></svg>`; };
function motion() {
  const RC = 2 * Math.PI * 52;
  const demo = (title, body, key, note, cls = '', auto = true) => `<article class="br-demo ${cls}"${auto ? ` data-autoplay="${key}"` : ''}><div class="br-demo-v">${body}</div><div class="br-demo-f"><div><b>${title}</b><span class="small muted">${note}</span></div>${replay(key)}</div></article>`;
  return chap('motion', '09', 'Things arrive, then <em>settle</em>', 'Motion in NICHE is short and physical. Arches rise like something being built, stamps land with a little weight, toggles spring. Nothing loops and nothing waits for an animation to finish.', `
    ${N.reduce ? `<div class="banner info">${ic('info')}<span class="grow">Your device asks for reduced motion, so these demos jump straight to their end state. That is exactly what the product does too.</span></div>${gap(24)}` : ''}
    <div class="br-princ">
      <div class="card flat"><span class="br-princ-n mono">01</span><h4 class="h3">Rise, don’t slide</h4><p class="small ink-2">New things come up from below by 24 px, the way an arch is built from the ground. Never from the side, never from above.</p></div>
      <div class="card flat"><span class="br-princ-n mono">02</span><h4 class="h3">Land with weight</h4><p class="small ink-2">Moments of trust, like a passport getting its stamp, overshoot slightly and settle. Save it for the moments that earn it.</p></div>
      <div class="card flat"><span class="br-princ-n mono">03</span><h4 class="h3">Stay out of the way</h4><p class="small ink-2">Under 700 ms, no loops, no waiting. With reduced motion switched on, everything still works and simply appears.</p></div>
    </div>
    ${gap(48)}
    <div class="row between" style="margin-bottom:18px"><h3 class="d-s">Live demos</h3><button type="button" class="btn btn-ink btn-sm" data-act="br_replay" data-demo="all">${ic('refresh')}Replay all</button></div>
    <div class="br-demos">
      ${demo('Arch rise', `<div class="br-rise br-mo-rise" data-rise>${['mint', 'lilac', 'butter', 'peach', 'sky'].map((t, i) => `<span class="br-ra t-${t}" style="--i:${i}"></span>`).join('')}</div>`, 'rise', '700 ms · 70 ms stagger · Rise')}
      ${demo('Stamp land', `<div class="stamp" id="br-mo-stamp">${N.stamp('br-st-mo')}</div>`, 'stamp', '550 ms · Land', 'br-demo-hedge')}
      ${demo('Toggle spring', `<div class="br-big-switch">${N.toggle('br-mo-tg', 'Renewal reminders', true)}</div>`, 'toggle', '250 ms · Spring', '', false)}
      ${demo('Number tween', `<div class="row" style="--g:20px"><div class="ring" id="br-mo-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" style="stroke-dasharray:${RC.toFixed(1)}px;stroke-dashoffset:${(RC * .07).toFixed(1)}px"/></svg><div class="t"><b><i class="br-rp" id="br-mo-rp" data-v="93">93</i>%</b><span>ready</span></div></div><div class="stack" style="--g:2px"><span class="num br-mo-num" id="br-mo-num" data-v="1284">1,284</span><span class="small muted">traders checked</span></div></div>`, 'tween', '650 ms count · 900 ms ring')}
    </div>
    ${gap(56)}
    ${sub('Timing', 'Five curves cover the whole product. Press Replay to race them.', replay('balls'))}
    <div class="tbl-wrap br-timing" data-autoplay="balls"><table class="tbl"><thead><tr><th>Curve</th><th>Name</th><th>Duration</th><th>Easing</th><th style="min-width:200px">Feel</th><th>Use</th></tr></thead><tbody>${EASE.map(([n, css, pts, ms, use]) => `<tr><td>${curve(pts)}</td><td><b>${n}</b></td><td class="mono">${ms} ms</td><td><code class="mono">${css}</code></td><td><span class="br-trk"><i style="animation-duration:${Math.max(ms, 250) * 1.6}ms;animation-timing-function:${css}"></i></span></td><td class="small ink-2">${use}</td></tr>`).join('')}</tbody></table></div>
  `);
}

/* =====================================================================
   10 VOICE & TONE
   ===================================================================== */
const LINT = [
  [/\bcertif(?:y|ied|ies|icate of compliance|ication)\b/gi, 'Say “checked”. NICHE checks documents; it does not certify them.'],
  [/\bguarantee[sd]?\b/gi, 'We can’t guarantee. Say what we checked and when.'],
  [/\borgani[z](?:er|ers|ation|ations|e|ed|ing)\b/gi, 'UK spelling: organiser, organisation.'],
  [/\bcolor(?:s|ed|ful)?\b/gi, 'UK spelling: colour.'],
  [/\blicense\b/gi, 'As a noun, UK spelling is licence.'],
  [/\bincomplete\b/gi, 'Say what is needed: “Needs info: answer 2 questions”.'],
  [/\bsubmit(?:ted)?\b/gi, 'Name the action: “Upload renewal”, “Send application”.'],
  [/\bclick here\b/gi, 'Link the words that describe where people are going.'],
  [/\bview details\b/gi, 'Say what happens next: “Review application”.'],
  [/\boops\b/gi, 'Skip the apology noise. Say what happened and what to do.'],
  [/\bcompliant\b/gi, 'Prefer “ready to trade” or “checked”.'],
  [/\b(?:slot|booth)s?\b/gi, 'We say pitch.'],
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, 'No emoji in product copy.'],
  [/\s[—–]\s/g, 'Avoid dash asides. Use a full stop, a comma or a colon.'],
];
const LINT_DEFAULT = 'Oops! Your profile is incomplete. Click here to submit your documents so every organizer can see you are certified.';
function lint(text) {
  let marked = esc(text); const hits = [];
  LINT.forEach(([re, msg]) => { re.lastIndex = 0; const found = text.match(re); if (found) { hits.push([msg, [...new Set(found.map(f => f.trim()))]]); marked = marked.replace(re, m => `\u0001${m}\u0002`); } });
  return { html: marked.replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>').replace(/\n/g, '<br>'), hits };
}
function lintOut(text) {
  const { html, hits } = lint(text);
  return `<div class="br-lint-view">${html || '<span class="muted">Type something to check it.</span>'}</div>
  <div class="br-lint-sum">${hits.length ? N.chip('warn', N.plural(hits.length, 'thing') + ' to fix') : N.chip('ok', 'Sounds like NICHE')}</div>
  ${hits.length ? `<ul class="br-lint-list">${hits.map(([m, w]) => `<li><span class="mtag">${esc(w.join(', '))}</span><span>${m}</span></li>`).join('')}</ul>` : ''}`;
}
function voice() {
  const princ = [['Plain', 'Short words, short sentences. “Upload”, not “submit documentation”.', 'mint'], ['Specific', 'Name the document, the date and the event. People act on specifics.', 'lilac'], ['Warm', 'Sound like a good market manager: friendly, direct and on your side.', 'butter'], ['Honest', 'We check, we don’t certify. Say what we know and when we checked it.', 'peach']];
  const swaps = [['Certified', 'Checked', 'We are a conduit, not a certifier.'], ['Guaranteed', 'Checked on 18 Sep', 'Dates are honest; guarantees are not.'], ['Compliant', 'Ready to trade', 'Say the outcome people care about.'], ['Organizer', 'Organiser', 'UK spelling, always.'], ['License (noun)', 'Licence', 'UK spelling for the noun.'], ['Slot, booth', 'Pitch', 'The word traders actually use.'], ['Profile completion', 'Readiness', 'Measure what matters for trading.'], ['Submit', 'Upload renewal', 'Buttons say what happens.']];
  const ba = [
    ['“Organizer #2”', `<b>Reed Events</b>`, 'Use real names, spelled the UK way.'],
    ['“Incomplete”', `${N.chip('warn', 'Needs info')} <span class="small">Answer 2 questions</span>`, 'Say what is missing and how to fix it.'],
    ['“invitation ac…”', `${N.chip('ok', 'Approved via invitation')} <span class="mtag">PITCH B7</span>`, 'Never truncate the important part.'],
    ['“LOW PRIORITY · Complete ‘all steps’ to unlock all events”', `<b>Renew your Gas Safety Certificate before 21 Oct</b>`, 'Name the document and the date.'],
    ['“Passport: 90% complete · 5 of 5 completed”', `<span class="rd">${N.bar(93, 'ok')}</span><b>93% ready</b><span class="small">· 1 document expiring</span>`, 'Numbers must agree and mean something.'],
    ['“Welcome back, organiser 👋 … Welcome back, Olivia”', `<b>Good afternoon, Olivia</b>`, 'Greet once, by name, without emoji.'],
    ['“Spring Street Food Series (Draft)”', `<b>Spring Street Food Series</b> ${N.chip('plain', 'Draft')}`, 'Status belongs in a chip, not in the name.'],
    ['“View Details”', `<button type="button" class="btn btn-line btn-xs" data-act="br_drawer">Review application</button>`, 'Buttons say what happens next.'],
  ];
  const pat = (title, rule, example) => `<article class="br-pat"><div class="stack" style="--g:6px"><p class="eyebrow">${title}</p><p class="br-pat-r">${rule}</p></div><div class="br-pat-x">${example}</div></article>`;
  return chap('voice', '10', 'Plain words, warm <em>tone</em>', 'We write the way a good market manager talks: clear about what is needed, warm about the people doing it, honest about what we know. UK English throughout.', `
    <div class="br-vprinc">${princ.map(([n, d, t], i) => `<div class="blk blk-${t} br-vp"><span class="mono">0${i + 1}</span><h4 class="d-s">${n}</h4><p>${d}</p></div>`).join('')}</div>
    ${gap(72)}
    ${sub('Words we use, words we avoid')}
    <div class="br-swaps">${swaps.map(([a, b, why]) => `<div class="br-swap"><span class="br-swap-a">${esc(a)}</span>${ic('arrow-right')}<span class="br-swap-b">${esc(b)}</span><span class="small muted br-swap-w">${why}</span></div>`).join('')}</div>
    ${gap(72)}
    ${sub('Before and after', 'Real corrections from the current product. The left column is what shipped; the right is how we write it now.')}
    <div class="tbl-wrap br-ba"><table class="tbl"><thead><tr><th>Before</th><th>After</th><th>Why</th></tr></thead><tbody>${ba.map(([b, a, w]) => `<tr><td><span class="br-before">${esc(b)}</span></td><td><div class="br-after">${a}</div></td><td class="small ink-2">${w}</td></tr>`).join('')}</tbody></table></div>
    ${gap(72)}
    ${sub('Microcopy patterns', 'The same five situations come up on every screen. Here is how each one sounds.')}
    <div class="br-pats">
      ${pat('Buttons', 'Verb plus object. Say exactly what happens when you press it.', `<div class="btn-row"><button type="button" class="btn btn-ink btn-sm" data-act="br_toast" data-msg="Renewal uploaded.">Upload renewal</button><button type="button" class="btn btn-side btn-sm" data-act="br_toast" data-msg="Application accepted.">Accept application</button><span class="br-no">Submit</span><span class="br-no">OK</span></div>`)}
      ${pat('Errors', 'What happened, then what to do. No blame, no codes, no “oops”.', `<div class="banner risk">${ic('alert')}<span class="grow">That file is 14 MB. Upload a photo or PDF under 10 MB.</span></div>`)}
      ${pat('Empty states', 'Say what will appear here and how to get it there.', N.empty('No saved events yet', 'Tap the heart on any event and it will wait for you here.', '<button type="button" class="btn btn-line btn-sm" data-act="br_toast" data-msg="Browse events opens the event search.">Browse events</button>', 'heart'))}
      ${pat('Notifications', 'Lead with the thing and the date. The detail goes underneath.', `<ul class="br-notif"><li><span class="dot warn"></span><div><b>Your Gas Safety Certificate expires on 21 Oct</b><span>Upload the renewal to keep Leeds Summer Festival valid · 3 h ago</span></div></li><li><span class="dot ok"></span><div><b>Approved for Bristol Harbour Food Festival</b><span>Pitch B7 · Harbour &amp; Castle Events · 4 days ago</span></div></li></ul>`)}
      ${pat('Toasts', 'Past tense, one line, with Undo whenever the action can be reversed.', `<button type="button" class="btn btn-line btn-sm" data-act="br_demo_undo">${ic('check-circle')}Show the toast</button><p class="small muted" style="margin-top:10px">“Application withdrawn from Camden Night Market. <u>Undo</u>”</p>`)}
    </div>
    ${gap(72)}
    ${sub('Copy check', 'Paste a line of copy. We flag the words we avoid and suggest what to say instead.')}
    <div class="br-lint card">
      ${N.field({ label: 'Your copy', id: 'br-lint-in', type: 'textarea', rows: 3, value: LINT_DEFAULT, attrs: 'data-input="br_lint"' })}
      <div id="br-lint-out" aria-live="polite">${lintOut(LINT_DEFAULT)}</div>
    </div>
  `);
}
/* =====================================================================
   11 APPLICATIONS  (objects use the fixed --pr-* artwork tokens so they
   look like the printed thing in either theme)
   ===================================================================== */
function qr(seed = 11) {
  let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const cells = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y;
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (finder) on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
    else if ((x === 7 && (y < 8 || y > 12)) || (y === 7 && (x < 8 || x > 12)) || (x === 13 && y < 8) || (y === 13 && x < 8)) on = false;
    else if (x === 6 || y === 6) on = (x + y) % 2 === 0;
    else on = rnd() > .5;
    cells.push(on ? '<i></i>' : '<b></b>');
  }
  return `<div class="br-qr" role="img" aria-label="QR code that opens the live passport">${cells.join('')}</div>`;
}
function apps() {
  const phoneApps = [['Maps', 'map', 'sky'], ['Camera', 'eye', 'ink'], ['Notes', 'edit', 'butter'], ['Weather', 'sun', 'sky'], ['Clock', 'clock', 'ink'], ['Photos', 'layers', 'peach'], ['niche'], ['Music', 'activity', 'peach'], ['Wallet', 'pound', 'ink'], ['Mail', 'mail', 'sky'], ['Calendar', 'calendar', 'white'], ['Settings', 'settings', 'chalk']];
  const ig = `<div class="br-ig">
      <div class="br-ig-h">${appIcon(30)}<div><b>nicheconnect</b><span>London, United Kingdom</span></div>${ic('more')}</div>
      <div class="br-ig-post"><span class="br-ig-wm">${bwm()}</span><div class="br-ig-arch"><p>Every pitch, <em>checked.</em></p><span>For organisers · Autumn 2026</span></div></div>
      <div class="br-ig-a">${ic('heart')}${ic('message')}${ic('send')}</div>
      <p class="br-ig-c"><b>1,284 likes</b></p><p class="br-ig-c"><b>nicheconnect</b> Every trader on NICHE arrives with their documents already checked. Find your fit.</p>
    </div>`;
  const sticker = `<div class="br-glass"><div class="br-sticker"><div class="br-sticker-in">${bwm()}<span class="br-sticker-ic">${ic('shield', 'ic-xl')}</span><b>Niche <em>Checked</em></b><span>Every food trader at this event has been checked by NICHE.</span><span class="mono">nicheconnect.co/check</span></div></div></div>`;
  const passport = `<div class="br-cards">
      <div class="br-pcard front"><div class="br-pcard-top">${bwm()}<span class="mono">NCH-26-0100</span></div>
        <div class="br-pcard-mid"><span class="br-pcard-av">AG</span><div><span class="br-pcard-k">Food Trader Passport</span><b>Alice Green Foods</b><span>Halal street food · Manchester</span></div></div>
        <div class="br-pcard-top"><span class="br-pcard-chk">${ic('shield')}Checked</span><span class="br-pcard-fh"><i>5</i>Hygiene rating</span></div></div>
      <div class="br-pcard back">${qr()}<div class="br-pcard-txt"><b>Scan for live status</b><span>Checked by NICHE on 29 Sep 2026. Status can change, so always scan.</span><span class="mono">nicheconnect.co/p/NCH-26-0100</span>${bwm('mono')}</div></div>
    </div>`;
  const mail = `<div class="br-mail">
      <div class="br-mail-h">${appIcon(34)}<div><p><b>NICHE</b> <span>hello@nicheconnect.co</span></p><p class="br-mail-s">Six events that fit you this October</p></div><span class="mono">09:00</span></div>
      <div class="br-mail-awn" aria-hidden="true"></div>
      <div class="br-mail-hero">${bwm()}<p class="br-mail-t">Six events that <em>fit</em> you</p><p class="br-mail-p">Your passport is 93% ready. These October events match your kit, your food and your documents.</p><span class="br-mail-btn">See your matches</span></div>
    </div>`;
  const card = `<div class="br-cards">
      <div class="br-bc front"><span class="br-bc-arch" aria-hidden="true"></span>${bwm()}<span class="mono">Find your fit.</span></div>
      <div class="br-bc back"><div class="br-bc-n"><b>Sam Okafor</b><span>Compliance lead</span></div><ul class="mono"><li>sam@nicheconnect.co</li><li>020 7946 0321</li><li>nicheconnect.co</li></ul>${bwm('mono')}</div>
    </div>`;
  const flag = `<div class="br-flagstage"><div class="br-flag"><span class="br-flag-dots" aria-hidden="true"><i></i><i></i></span><p>Find your <em>fit.</em></p><span class="mono">Traders welcome · Pitch 12</span>${bwm('mono')}</div><span class="br-pole" aria-hidden="true"></span></div>`;
  const merch = `<div class="br-merch">
      <div class="br-apron" role="img" aria-label="Hedge apron with the wordmark on the chest"><span class="br-apron-strap"></span><div class="br-apron-body">${bwm()}<span class="br-apron-pocket"><i></i><i></i></span></div></div>
      <div class="br-tote" role="img" aria-label="Butter tote bag reading Ready to trade"><span class="br-tote-h"></span><div class="br-tote-body"><p>Ready to <em>trade.</em></p>${bwm('mono')}</div></div>
    </div>`;
  const phone = `<div class="br-phone" role="img" aria-label="Phone home screen with the NICHE app icon"><div class="br-phone-scr">
      <div class="br-phone-sb"><span>14:20</span><span>5G</span></div>
      <div class="br-phone-grid">${phoneApps.map(([l, i, t]) => l === 'niche' ? `<span class="br-papp is-niche">${appIcon(40)}<em class="br-app-b">1</em><span>Niche</span></span>` : `<span class="br-papp"><span class="br-app-i a-${t}">${ic(i)}</span><span>${l}</span></span>`).join('')}</div>
      <div class="br-phone-dock">${['phone', 'message', 'globe', 'coffee'].map(i => `<span class="br-app-i a-${i === 'globe' ? 'sky' : i === 'phone' ? 'mint' : i === 'message' ? 'mint' : 'butter'}">${ic(i)}</span>`).join('')}</div>
    </div></div>`;
  return chap('apps', '11', 'Out in the <em>world</em>', 'The system on real objects: social, print, email, merch and the home screen. Every mockup here is built from the same tokens and parts as the product.', `
    <div class="br-apps">
      ${fig('Instagram post', ig, '1080 × 1080 · pastel ground, arch, one headline', 'br-app')}
      ${fig('Event window sticker', sticker, 'Die-cut arch · 120 × 150 mm vinyl', 'br-app')}
      ${fig('App icon on a home screen', phone, 'Hedge icon, two dots, clear at 40 px', 'br-app')}
      ${fig('Trader passport card', passport, '85.6 × 54 mm · front and back', 'br-app w2')}
      ${fig('Email header', mail, '600 px wide · awning strip, wordmark, one call to action', 'br-app')}
      ${fig('Business card', card, '85 × 55 mm · front and back', 'br-app w2')}
      ${fig('Pitch flag', flag, '600 × 1800 mm · violet, arch top', 'br-app')}
      ${fig('Apron and tote', merch, 'Screen-printed, one colour per item', 'br-app w3')}
    </div>
  `);
}
/* =====================================================================
   12 TOKENS
   ===================================================================== */
const TOKENS_LIGHT = `:root {
  /* surfaces and text */
  --bg: #FFFFFF; --surface: #FFFFFF; --sunk: #F5F4F0; --sunk-2: #ECEAE3;
  --line: #E4E1DA; --line-2: #CDC9BF;
  --ink: #101A15; --ink-2: #38433D; --muted: #69726C; --inv: #FFFFFF;
  /* brand */
  --hedge: #0E3B2E; --hedge-2: #17503F; --on-hedge: #EEF6E9; --on-hedge-2: #A7C3B5;
  --violet: #5A31E4; --violet-2: #4623C4; --on-violet: #FFFFFF;
  --zest: #DDF85E; --paprika: #FF5A36;
  /* pastels and their inks */
  --mint: #D5F2DF; --mint-ink: #0E5236;
  --lilac: #E9E2FF; --lilac-ink: #3D1DA0;
  --butter: #FFF0A8; --butter-ink: #6B5300;
  --peach: #FFD8C9; --peach-ink: #8C2B12;
  --sky: #D8EAF8; --sky-ink: #0F4068;
  /* status */
  --ok: #137443; --ok-bg: #DCF3E4;
  --warn: #9E5A00; --warn-bg: #FFEFCC;
  --risk: #C0321E; --risk-bg: #FFE2DB;
  --info: #3D1DA0; --info-bg: #E9E2FF;
  /* wordmark dots */
  --dot-trader: #5FBF3A; --dot-organiser: #9B8CF2;
  /* type */
  --f-display: "Fraunces", Georgia, serif;
  --f-ui: "Figtree", system-ui, sans-serif;
  --f-mono: "DM Mono", ui-monospace, monospace;
  /* radius */
  --r-sm: 10px; --r-md: 16px; --r-lg: 24px; --r-xl: 36px;
  --arch: 999px 999px var(--r-lg) var(--r-lg);
  /* motion */
  --ease-rise: cubic-bezier(.2,.8,.2,1);
  --ease-land: cubic-bezier(.3,1.5,.5,1);
  --ease-spring: cubic-bezier(.3,1.3,.5,1);
}`;
const TOKENS_DARK = `[data-theme="dark"] {
  /* surfaces and text */
  --bg: #0C120F; --surface: #131B17; --sunk: #18221D; --sunk-2: #1F2A24;
  --line: #26322C; --line-2: #36453C;
  --ink: #EDF2EE; --ink-2: #C3CCC6; --muted: #8E9993; --inv: #0C120F;
  /* brand (hedge and zest do not change) */
  --violet: #7352FF; --violet-2: #8A6DFF;
  /* pastels become deep tints, inks turn light */
  --mint: #16382A; --mint-ink: #A6E6C0;
  --lilac: #251D4D; --lilac-ink: #CFC3FF;
  --butter: #3A3212; --butter-ink: #F4DD7C;
  --peach: #40241A; --peach-ink: #FFBDA6;
  --sky: #142F45; --sky-ink: #AAD3F3;
  /* status */
  --ok: #5FD18F; --ok-bg: #12301F;
  --warn: #F2B659; --warn-bg: #35280F;
  --risk: #FF8B78; --risk-bg: #3D1C16;
  --info: #CFC3FF; --info-bg: #251D4D;
  /* wordmark dots on dark */
  --dot-trader: #DDF85E; --dot-organiser: #B6A8FF;
}`;
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Figtree:ital,wght@0,400..800;1,400..800&family=DM+Mono:wght@400;500&display=swap">';
const hl = css => esc(css)
  .replace(/(\/\*.*?\*\/)/g, '<span class="c">$1</span>')
  .replace(/(--[\w-]+)(:)/g, '<span class="k">$1</span>$2')
  .replace(/#[0-9A-Fa-f]{6}\b/g, h => `<span class="sw" style="background:${h}"></span><span class="v">${h}</span>`);
const SHIP = [
  'The wordmark is the master artwork, above minimum size, with clear space on every side.',
  'Every text pairing passes AA: 4.5:1 for body, 3:1 for large text.',
  'Fraunces only on headlines of 24 px and up, with one italic word at most.',
  'Colours come from tokens, and the side colour matches the product area.',
  'Copy says “checked”, never “certified” or “guaranteed”, in UK English.',
  'It works at 375 px wide, in dark theme and with reduced motion on.',
];
function tokens() {
  const pane = (title, css, key) => `<div class="br-code"><div class="br-code-h"><span class="mono">${title}</span><button type="button" class="btn btn-onhedge btn-xs" data-act="br_copyblock" data-k="${key}">${ic('copy')}Copy</button></div><pre><code>${hl(css)}</code></pre></div>`;
  return chap('tokens', '12', 'The system as <em>code</em>', 'Every colour, font, radius and curve in this book is a CSS custom property. Use the tokens and the light and dark themes come for free.', `
    <div class="row between" style="margin-bottom:16px"><span class="small muted">From <code>css/niche.css</code>. Swap the file, never the values inline.</span><button type="button" class="btn btn-ink btn-sm" data-act="br_copyblock" data-k="all">${ic('copy')}Copy light and dark</button></div>
    <div class="br-codes">${pane('Light · :root', TOKENS_LIGHT, 'light')}${pane('Dark · [data-theme="dark"]', TOKENS_DARK, 'dark')}</div>
    ${gap(28)}
    <div class="br-embed card"><div class="stack" style="--g:6px"><h4 class="h4">Google Fonts embed</h4><p class="small muted">Fraunces with its SOFT and WONK axes, Figtree 400 to 800, DM Mono 400 and 500.</p></div><pre class="mono br-embed-code">${esc(FONTS)}</pre><div>${copyBtn(FONTS, 'Copy embed line')}</div></div>
    ${gap(72)}
    ${sub('Before you ship anything', 'Six checks. Tick them off as you go.')}
    <div class="br-ship blk blk-sunk">
      <div class="br-ship-l">${SHIP.map((s, i) => N.checkbox('br-ship-' + i, esc(s), false, 'data-change="br_ship"')).join('')}</div>
      <div class="br-ship-s"><div class="br-ship-stamp"><div class="stamp" id="br-ship-stamp">${N.stamp('br-st-ship')}</div></div><p class="num" id="br-ship-n">0 of 6</p><p class="small muted" id="br-ship-t">Not ready yet. Work down the list.</p>${N.bar(0, 'ok')}</div>
    </div>
  `);
}
function outro() {
  return `<section class="br-outro blk blk-hedge">
    <div class="stack" style="--g:16px"><span aria-hidden="true">${N.wm('wm-lg on-dark')}</span><p class="d-m">Find your <em>fit.</em></p><p class="muted">Questions about the brand, or something this book does not cover? Ask the Brand &amp; Product Design team before you improvise.</p></div>
    <div class="btn-row"><button type="button" class="btn btn-zest" data-act="br_copy" data-v="brand@nicheconnect.co">${ic('mail')}brand@nicheconnect.co</button><button type="button" class="btn btn-onhedge" data-act="br_jump" data-ch="cover">${ic('chevron-up')}Back to the cover</button></div>
  </section>`;
}

/* =====================================================================
   PAGE
   ===================================================================== */
function index() {
  return `<nav class="br-index" aria-label="Brand guidelines chapters">
    <div class="br-index-h"><span class="eyebrow">Contents</span><span class="mono muted" id="br-pct">0%</span></div>
    <ol>${CH.map(([id, n, l]) => `<li><button type="button" data-act="br_jump" data-ch="${id}"${id === 'cover' ? ' class="on" aria-current="true"' : ''}><span class="mono">${n}</span><span>${l}</span></button></li>`).join('')}</ol>
    <div class="br-index-prog" aria-hidden="true"><i></i></div>
  </nav>`;
}
N.page('brand/guidelines', {
  app: 'brand',
  title: 'Brand guidelines',
  render() {
    return `<div class="br" data-br>
      <div class="wrap">${cover()}</div>
      <div class="wrap br-shell">
        ${index()}
        <div class="br-main">${[essence(), logo(), archChapter(), colour(), type(), icons(), imagery(), ui(), motion(), voice(), apps(), tokens()].join('')}${outro()}</div>
      </div>
    </div>`;
  },
  after(root) {
    const br = $('[data-br]', root); if (!br) return;
    const st = N.state.br || (N.state.br = {});
    if (st.io) st.io.disconnect();
    if (st.io2) st.io2.disconnect();
    if (st.onScroll) removeEventListener('scroll', st.onScroll);

    // chapter index follows the scroll
    const secs = $$('section[data-ch]', br), vis = {};
    st.io = new IntersectionObserver((es, obs) => {
      if (!document.contains(br)) { obs.disconnect(); return; }
      es.forEach(e => { vis[e.target.dataset.ch] = e.isIntersecting; });
      if (st.lock) return; // a click in the index is scrolling us; keep its chapter lit
      const cur = secs.find(s => vis[s.dataset.ch]); if (cur) setActive(cur.dataset.ch);
    }, { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach(s => st.io.observe(s));

    // reading progress
    const main = $('.br-main', br), bar = $('.br-index-prog i', br), pct = $('#br-pct', br);
    const onScroll = () => {
      if (!document.contains(br)) { removeEventListener('scroll', onScroll); if (st.onScroll === onScroll) st.onScroll = null; return; }
      const r = main.getBoundingClientRect(), total = Math.max(1, r.height - innerHeight * .6);
      const p = Math.max(0, Math.min(1, (innerHeight * .4 - r.top) / total));
      bar.style.transform = `scaleX(${p.toFixed(3)})`; pct.textContent = Math.round(p * 100) + '%';
    };
    st.onScroll = onScroll;
    addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // demos play once when they first come into view
    $$('[data-rise]', br).forEach(el => el.classList.add('br-armed'));
    st.io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { play(e.target.dataset.autoplay, e.target); st.io2.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    $$('[data-autoplay]', br).forEach(el => st.io2.observe(el));
    const cov = $('.br-cover-arches', br); if (cov) requestAnimationFrame(() => play('rise', cov));

    // minimum-size specimens are measured, not guessed
    sizeMins(br);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (document.contains(br)) sizeMins(br); });

    // segmented controls in the type tester
    br.addEventListener('seg', e => { const { key, v } = e.detail; if (key === 'br_tt_w') TT.w = v; else if (key === 'br_tt_bg') TT.bg = v; else return; ttApply(); });
    ttApply();
  },
});

function setActive(id) {
  const nav = $('.br-index'); if (!nav) return;
  let on = null;
  $$('[data-ch]', nav).forEach(b => { const a = b.dataset.ch === id; b.classList.toggle('on', a); if (a) { b.setAttribute('aria-current', 'true'); on = b; } else b.removeAttribute('aria-current'); });
  const ol = $('ol', nav);
  if (on && ol.scrollWidth > ol.clientWidth + 4) ol.scrollTo({ left: Math.max(0, on.parentElement.offsetLeft - 16), behavior: N.reduce ? 'auto' : 'smooth' });
}
function jump(id) {
  const t = document.getElementById('br-ch-' + id); if (!t) return;
  const st = N.state.br || (N.state.br = {});
  st.lock = id; clearTimeout(st.lockT); st.lockT = setTimeout(() => { st.lock = null; }, N.reduce ? 60 : 1100);
  t.scrollIntoView({ behavior: N.reduce ? 'auto' : 'smooth', block: 'start' });
  setActive(id);
  const h = document.getElementById('br-h-' + id);
  if (h) setTimeout(() => h.focus({ preventScroll: true }), N.reduce ? 0 : 600);
}
function sizeMins(br) {
  $$('[data-minw]', br).forEach(w => {
    const m = $('.bwm', w); if (!m) return;
    const probe = document.createElement('span'); probe.style.cssText = `position:absolute;visibility:hidden;display:block;width:${w.dataset.minw}`;
    w.appendChild(probe); const target = probe.getBoundingClientRect().width; probe.remove();
    m.style.fontSize = '100px'; const cur = m.getBoundingClientRect().width;
    if (cur && target) m.style.fontSize = (100 * target / cur).toFixed(2) + 'px';
  });
}
const restart = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
function play(demo, el) {
  const br = $('[data-br]'); if (!br) return;
  if (demo === 'rise') { const t = el ? (el.matches('[data-rise]') ? [el] : $('[data-rise]', el)) : $('.br-mo-rise', br); t.forEach(x => restart(x, 'go')); return; }
  if (demo === 'story') { restart($('.br-story', br), 'play'); return; }
  if (demo === 'stamp') { restart($('#br-mo-stamp', br), 'hit'); return; }
  if (demo === 'balls') { restart($('.br-timing', br), 'go'); return; }
  if (demo === 'toggle') { const i = $('#br-mo-tg', br); if (!i) return; if (i.checked) { i.checked = false; setTimeout(() => { i.checked = true; }, N.reduce ? 0 : 420); } else i.checked = true; return; }
  if (demo === 'tween') {
    const n = $('#br-mo-num', br), rp = $('#br-mo-rp', br), fg = $('#br-mo-ring .fg', br); if (!n) return;
    const RC = 2 * Math.PI * 52;
    n.dataset.v = 0; n.textContent = '0'; rp.dataset.v = 0; rp.textContent = '0';
    fg.style.transition = 'none'; fg.style.strokeDashoffset = RC.toFixed(1) + 'px'; void fg.getBoundingClientRect(); fg.style.transition = '';
    requestAnimationFrame(() => { fg.style.strokeDashoffset = (RC * .07).toFixed(1) + 'px'; N.tween(n, 1284, 650); N.tween(rp, 93, 900); });
    return;
  }
  if (demo === 'all') ['rise', 'stamp', 'toggle', 'tween', 'balls'].forEach(d => play(d));
}
function ttApply() {
  const out = $('#br-tt-out'); if (!out) return;
  out.innerHTML = ttHTML(TT);
  out.style.fontSize = TT.size + 'px'; out.style.fontWeight = TT.w; out.style.letterSpacing = ttTrack(TT.size) + 'em'; out.style.lineHeight = TT.size >= 64 ? '.92' : '1';
  out.style.setProperty('--emw', Math.max(500, +TT.w - 100));
  $('.br-tt-stage').dataset.bg = TT.bg;
  $('#br-tt-sz').textContent = TT.size + ' px';
  $('#br-tt-css').textContent = ttCSS(TT);
}
// long values: copy quietly with a short toast instead of echoing the whole block
function copyQuiet(v, label, sel) {
  const ok = () => N.toast(`Copied ${esc(label)}`, { icon: 'copy' });
  const fail = () => { if (sel) { const r = document.createRange(); r.selectNodeContents(sel); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } N.toast('Selected. Press Ctrl+C to copy.', { icon: 'copy' }); };
  try { navigator.clipboard.writeText(v).then(ok, fail); } catch (e) { fail(); }
}
const drawerHTML = () => `<div class="dr-head">${N.tav('mw', 'lg')}<div class="dr-ti"><h3>Masala Wheels</h3><p>Applied to Camden Night Market · 2 h ago</p></div><button type="button" class="icon-btn" data-close aria-label="Close">${ic('x')}</button></div>
  <div class="dr-body">
    <div class="banner info">${ic('info')}<span class="grow">This is a demo drawer from the brand book. Nothing here changes the prototype’s data.</span></div>
    <div><p class="dr-h">Readiness</p><div class="row" style="--g:16px">${N.ring(98)}<div class="stack" style="--g:4px;align-items:flex-start"><b>All requirements met</b><span class="small muted">Priya Shah · Gujarati street food · since 2018</span>${N.checked()}</div></div></div>
    <div><p class="dr-h">Checks for this event</p>${N.reqList(N.evalChecks('mw', 'camden'))}</div>
    <div><p class="dr-h">Their unit</p>${N.kv([['Unit', 'Converted van'], ['Footprint', '5 × 2 m'], ['Power', '16A'], ['Gas', 'LPG, certificate valid']])}</div>
  </div>
  <div class="dr-foot"><div class="btn-row"><button type="button" class="btn btn-side" data-act="br_demo_accept">Accept application</button><button type="button" class="btn btn-line" data-act="br_toast" data-msg="Ask a question opens a message to Priya Shah.">Ask a question</button><button type="button" class="btn btn-ghost" data-close>Close</button></div></div>`;
const modalHTML = () => `<div class="stack" style="--g:10px"><p class="eyebrow">Demo modal</p><h3>Withdraw your application?</h3><p class="muted">Reed Events will be told you are no longer applying to Camden Night Market. You can apply again until 30 Sep.</p></div>
  <div class="modal-foot"><button type="button" class="btn btn-ghost btn-sm" data-close>Keep application</button><button type="button" class="btn btn-danger btn-sm" data-act="br_demo_withdraw">Withdraw application</button></div>`;

/* ---------- actions ---------- */
Object.assign(N.act, {
  br_jump(el) { jump(el.dataset.ch); },
  br_copy(el) { N.copy(el.dataset.v); },
  br_copyblock(el) {
    const k = el.dataset.k, v = k === 'light' ? TOKENS_LIGHT : k === 'dark' ? TOKENS_DARK : TOKENS_LIGHT + '\n\n' + TOKENS_DARK;
    copyQuiet(v, k === 'all' ? 'light and dark tokens' : k + ' tokens', el.closest('.br-code')?.querySelector('pre'));
  },
  br_ttcopy() { copyQuiet(ttCSS(TT), 'type tester CSS', $('#br-tt-css')); },
  br_replay(el) { play(el.dataset.demo); },
  br_part(el) {
    const s = el.closest('.br-story'), p = el.dataset.part;
    s.dataset.focus = s.dataset.focus === p ? '' : p;
    $$('[data-part]', s).forEach(b => b.setAttribute('aria-pressed', String(s.dataset.focus === b.dataset.part)));
  },
  br_toast(el) { N.toast(esc(el.dataset.msg || 'Done.'), { icon: 'info' }); },
  br_demo_toast() { N.toast('Renewal uploaded. We’ll check it within one working day.'); },
  br_demo_undo() { N.toast('Application withdrawn from Camden Night Market.', { undo: () => N.toast('Application restored.') }); },
  br_drawer() { N.openDrawer(drawerHTML()); },
  br_modal() { N.openModal(modalHTML()); },
  br_demo_accept() { N.closeAll(); N.toast('Masala Wheels approved for Camden Night Market. Demo only, nothing was saved.'); },
  br_demo_withdraw() { N.closeAll(); N.toast('Application withdrawn. Reed Events has been told.', { undo: () => N.toast('Application restored.') }); },
  br_tab(el) { const list = el.closest('[role=tablist]'); $$('[role=tab]', list).forEach(b => b.setAttribute('aria-selected', String(b === el))); },
  br_theme() { const b = $('#themeBtn'); if (b) b.click(); },
});
Object.assign(N.input, {
  br_pers(el) {
    const box = el.closest('.br-scale'), b = +box.dataset.brand, d = +el.value - b, o = $('.br-scale-o', box);
    const chip = Math.abs(d) <= 12 ? N.chip('ok', 'On brand') : N.chip('warn', `Too ${(d > 0 ? box.dataset.r : box.dataset.l).toLowerCase()}`);
    o.firstElementChild.outerHTML = chip;
  },
  br_tt(el) { if (el.dataset.k === 'text') TT.text = el.value; else TT.size = +el.value; ttApply(); },
  br_icf(el) {
    const q = el.value.trim().toLowerCase(); let n = 0;
    $$('#br-ic-grid .br-ic').forEach(b => { const on = !q || b.dataset.name.includes(q); b.hidden = !on; if (on) n++; });
    $('#br-ic-n').textContent = q ? `${n} of ${Object.keys(N.ICONS).length} icons` : `${n} icons`;
    $('#br-ic-none').hidden = n > 0;
  },
  br_lint(el) { $('#br-lint-out').innerHTML = lintOut(el.value); },
});
Object.assign(N.change, {
  br_tt(el) { TT.it = el.checked; ttApply(); },
  br_pair() { $('#br-pc-res').innerHTML = pairResult($('#br-pc-fg').value, $('#br-pc-bg').value); },
  br_ship() {
    const box = $('.br-ship'), all = $$('input[type=checkbox]', box), n = all.filter(i => i.checked).length, done = n === all.length;
    $('#br-ship-n').textContent = `${n} of ${all.length}`;
    $('#br-ship-t').textContent = done ? 'Ready to ship. It fits.' : n ? `${all.length - n} to go.` : 'Not ready yet. Work down the list.';
    $('.bar i', box).style.width = (n / all.length * 100) + '%';
    const was = box.classList.contains('done'); box.classList.toggle('done', done);
    if (done && !was) { restart($('#br-ship-stamp'), 'hit'); N.toast('Ready to ship. Nice work.'); }
  },
});
})();
