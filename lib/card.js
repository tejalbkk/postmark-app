// Postcard renderer shared by the editor, the opening page and previews.
// Everything is drawn as HTML strings; user text always goes through esc().
//
// Cards are portrait and wrap the photo: the photo window keeps the photo's own
// shape (clamped between 9:16 and 4:5), and each style adds its own border or
// ticket strip around it. Sizes are in cqw (1% of the card's width).
let cur = { s: { photoURL: '', message: '' }, t: null, g: null };
export const TEMPLATES = [
  { id: 'classic', name: 'Classic cream' }, { id: 'vintage', name: 'Vintage deckle' }, { id: 'stamp', name: 'Perforated' },
  { id: 'letter', name: 'Photo stamp' }, { id: 'cinema', name: 'Movie night' }, { id: 'gig', name: 'Gig poster' },
  { id: 'stub', name: 'Ticket stub' }, { id: 'date', name: 'Save the date' }, { id: 'member', name: 'Member ticket' },
];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export const MAX_MESSAGE = 200;
export const MIN_RATIO = 9 / 16;
export const MAX_RATIO = 4 / 5;
export const DEFAULT_RATIO = 3 / 4;
export function clampRatio(r) {
  const n = Number(r);
  if (!isFinite(n) || n <= 0) return DEFAULT_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, n));
}

// Photo window per style: side inset x, top inset t, bottom inset b (all cqw).
const GEO = {
  classic: { x: 4.5, t: 4.5, b: 4.5 },
  vintage: { x: 6, t: 6, b: 6 },
  stamp: { x: 8.5, t: 8.5, b: 8.5 },
  letter: { x: 0, t: 0, b: 0 },
  cinema: { x: 9, t: 9, b: 9 },
  gig: { x: 11, t: 13, b: 13 },
  stub: { x: 7, t: 7, b: 28 },
  date: { x: 9, t: 9, b: 9 },
  member: { x: 0, t: 0, b: 28 },
};
function geometry(template, ratio) {
  const g = GEO[template] || GEO.classic;
  const pw = 100 - 2 * g.x;
  const ph = pw / clampRatio(ratio);
  const H = g.t + ph + g.b; // card height in cqw
  return { ...g, pw, ph, H, W: 300, Hu: H * 3 }; // outline units: 3 per cqw
}

export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------- card parts ---------- */
let pmId = 0;
function postmark(kind) {
  const id = 'pm' + (++pmId);
  const waves = [22, 36, 50, 64].map((y) => { let d = `M0 ${y}`; for (let i = 0; i < 8; i++) d += ` q7.5 ${i % 2 ? 6 : -6} 15 0`; return `<path d="${d}"/>`; }).join('');
  const ring = kind === 'waves' ? '' : `<circle cx="150" cy="45" r="37"/><circle cx="150" cy="45" r="29" stroke-width="1.4"/>
    <defs><path id="${id}" d="M150 45 m-33 0 a33 33 0 1 1 66 0 a33 33 0 1 1 -66 0"/></defs>
    <text font-size="8.5" letter-spacing="2.2"><textPath href="#${id}">POSTED WITH LOVE · POSTMARK ·</textPath></text>
    <text x="150" y="44" font-size="13" text-anchor="middle">${cur.t.day} ${cur.t.mon}</text>
    <text x="150" y="58" font-size="10" text-anchor="middle">${cur.t.year}</text>`;
  return `<svg class="pm" viewBox="0 0 200 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.2">${waves}${ring}</g></svg>`;
}
function stamp() { return `<div class="stamp"><div class="stamp-img" style="background-image:url('${cur.s.photoURL}')"></div><span class="stamp-val"><b>${cur.t.wds}</b>${cur.t.day} ${cur.t.mon}</span></div>`; }
let wordCount = 0;
function words(msg) {
  let i = 0;
  const html = esc(msg).split('\n').map((line) => line.split(/\s+/).filter(Boolean).map((w) => `<span class="w" style="--i:${i++}">${w}</span>`).join(' ')).join('<br>');
  wordCount = i; return html;
}
function msgSize(base) {
  const n = cur.s.message.length; const k = n < 60 ? 1.15 : n < 110 ? 1 : n < 160 ? 0.9 : 0.82;
  const tall = Math.min(1.25, Math.max(1, (cur.g ? cur.g.H : 135) / 135)); // taller cards get bigger writing
  return (base * k * tall).toFixed(2) + 'cqw';
}

function now(s) {
  let d = new Date(s && s.sentAt ? s.sentAt : Date.now()); if (isNaN(d)) d = new Date();
  let tz = s && s.tz; try { if (tz) new Intl.DateTimeFormat('en', { timeZone: tz }); } catch (e) { tz = undefined; }
  const o = tz ? { timeZone: tz } : {}; const f = (opt, loc = 'en') => d.toLocaleString(loc, { ...o, ...opt });
  const day = +f({ day: 'numeric' }); const ord = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
  return {
    day, ord, year: +f({ year: 'numeric' }), mon: f({ month: 'short' }).toUpperCase(), month: f({ month: 'long' }), wd: f({ weekday: 'long' }), wds: f({ weekday: 'short' }).toUpperCase(),
    hm: d.toLocaleTimeString('en-GB', { ...o, hour: '2-digit', minute: '2-digit' }), t12: d.toLocaleTimeString('en-US', { ...o, hour: 'numeric', minute: '2-digit' }),
  };
}
let sealId = 0;
function seal(text) {
  const id = 'sl' + (++sealId), t = cur.t;
  return `<div class="stamp seal"><svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor"><circle cx="50" cy="50" r="46" stroke-width="3"/><circle cx="50" cy="50" r="33" stroke-width="1.6"/></g>
  <defs><path id="${id}" d="M50 50 m-39.5 0 a39.5 39.5 0 1 1 79 0 a39.5 39.5 0 1 1 -79 0"/></defs>
  <text font-size="10" letter-spacing="2.2"><textPath href="#${id}">${text}</textPath></text>
  <text x="50" y="47" text-anchor="middle" font-size="12" letter-spacing="1.5">${t.wds}</text>
  <text x="50" y="63" text-anchor="middle" font-size="13.5">${t.day} ${t.mon}</text></svg></div>`;
}
function barcode(seed) {
  const r = mulberry(seed); let p = 0; const stops = [];
  while (p < 100) { const w = 0.8 + r() * 3.2, g = 0.8 + r() * 2.4; stops.push(`currentColor ${p.toFixed(1)}% ${(p + w).toFixed(1)}%`, `transparent ${(p + w).toFixed(1)}% ${(p + w + g).toFixed(1)}%`); p += w + g; }
  return `<div class="barcode" style="background:linear-gradient(to right,${stops.join(',')})"></div>`;
}
// Flourish drawn on its side so it runs across the card.
const ORN = `<svg viewBox="0 0 80 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><g transform="translate(80 0) rotate(90)"><path d="M10 9 C2 14,2 22,10 26 S18 36,10 40 S2 50,10 54 S18 64,10 71"/><path d="M10 26c-3 3-6 1-5-2M10 40c3 3 6 1 5-2M10 54c-3 3-6 1-5-2"/><path d="M10 9c-2-4-6-2-4 1l4 4 4-4c2-3-2-5-4-1z" fill="currentColor"/><path d="M10 71c-2-4-6-2-4 1l4 4 4-4c2-3-2-5-4-1z" fill="currentColor"/><circle cx="4" cy="33" r="1" fill="currentColor"/><circle cx="16" cy="47" r="1" fill="currentColor"/><circle cx="4" cy="61" r="1" fill="currentColor"/></g></svg>`;

/* ---------- card outlines, drawn in W×Hu units (3 units per cqw) ---------- */
function concave(W, H, r, i) {
  const R = r + i, a = Math.sqrt(R * R - i * i).toFixed(2);
  return `M${a} ${i}L${W - a} ${i}A${R} ${R} 0 0 0 ${W - i} ${a}L${W - i} ${H - a}A${R} ${R} 0 0 0 ${W - a} ${H - i}L${a} ${H - i}A${R} ${R} 0 0 0 ${i} ${H - a}L${i} ${a}A${R} ${R} 0 0 0 ${a} ${i}Z`;
}
function bites(W, H, cy, br, rc, scallop) {
  let bottom;
  if (scallop) { const n = 26, st = W / n; bottom = `V${H - 5}`; for (let k = 1; k <= n; k++) bottom += `A${st / 2} ${st / 2} 0 0 1 ${(W - k * st).toFixed(2)} ${H - 5}`; }
  else bottom = `V${H - rc}A${rc} ${rc} 0 0 1 ${W - rc} ${H}H${rc}A${rc} ${rc} 0 0 1 0 ${H - rc}`;
  return `M${rc} 0H${W - rc}A${rc} ${rc} 0 0 1 ${W} ${rc}V${cy - br}A${br} ${br} 0 0 0 ${W} ${cy + br}${bottom}V${cy + br}A${br} ${br} 0 0 0 0 ${cy - br}V${rc}A${rc} ${rc} 0 0 1 ${rc} 0Z`;
}
function torn(W, H, seed) {
  const r = mulberry(seed); let d = `M0 ${(3 + r() * 4).toFixed(1)}`;
  for (let x = 4; x <= W; x += 4) d += `L${x} ${(1.5 + r() * 5 + (r() < 0.08 ? 3 : 0)).toFixed(1)}`;
  for (let x = W; x >= 0; x -= 4) d += `L${x} ${(H - 1.5 - r() * 5 - (r() < 0.08 ? 3 : 0)).toFixed(1)}`;
  return d + 'Z';
}
const SHAPES = {
  cinema: (g) => concave(g.W, g.Hu, 22, 0),
  date: (g) => concave(g.W, g.Hu, 16, 0),
  stub: (g) => bites(g.W, g.Hu, g.Hu - 21.5 * 3, 13, 9),
  member: (g) => bites(g.W, g.Hu, g.Hu - 21 * 3, 10, 10, true),
  gig: (g, i) => torn(g.W, g.Hu, 21 + i * 9),
};
function maskURL(d, W, H) { return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`; }
function setMask(el, m) { for (const p of ['maskImage', 'webkitMaskImage']) el.style[p] = m; for (const p of ['maskSize', 'webkitMaskSize']) el.style[p] = '100% 100%'; for (const p of ['maskRepeat', 'webkitMaskRepeat']) el.style[p] = 'no-repeat'; }
function frame(paths) { const g = cur.g; return `<svg class="frame" viewBox="0 0 ${g.W} ${g.Hu.toFixed(1)}" preserveAspectRatio="none" aria-hidden="true">${paths.map(([d, w]) => `<path d="${d}" stroke-width="${w}"/>`).join('')}</svg>`; }
const cinemaFrame = () => frame([[concave(cur.g.W, cur.g.Hu, 22, 7), 1.6], [concave(cur.g.W, cur.g.Hu, 22, 11), 0.8]]);
const dateFrame = () => frame([[concave(cur.g.W, cur.g.Hu, 16, 6), 1.2]]);

function front(s) {
  const photo = `<div class="photo" style="background-image:url('${s.photoURL}')"></div>`;
  const box = (inner, isSeal) => `<div class="stampbox${isSeal ? ' has-seal' : ''}">${inner}</div>`;
  const postage = box(stamp());
  switch (s.template) {
    case 'vintage': return `<div class="face front">${photo}<div class="grain"></div>${postage}</div>`;
    case 'stamp': return `<div class="face front">${photo}${postage}</div>`;
    case 'letter': return `<div class="face front">${photo}<div class="l-border"></div>${postage}</div>`;
    case 'cinema': return `<div class="face front"><div class="grain"></div>${cinemaFrame()}${photo}${box(seal('ADMIT ONE · ADMIT ONE · '), 1)}</div>`;
    case 'gig': return `<div class="face front"><div class="halftone"></div>${photo}<div class="gig-box"></div>${box(seal('ONE NIGHT ONLY · ONE NIGHT ONLY · '), 1)}</div>`;
    case 'stub': return `<div class="face front"><div class="grain"></div>${photo}<div class="perf"></div><div class="stub-strip"><span>ADMIT ONE</span>${barcode(5)}</div>${box(seal('ADMIT ONE · ADMIT ONE · '), 1)}</div>`;
    case 'date': return `<div class="face front"><div class="grain"></div>${dateFrame()}${photo}${box(seal('SAVE THE DATE · SAVE THE DATE · '), 1)}</div>`;
    case 'member': return `<div class="face front">${photo}<div class="mem-fade"></div><div class="mem-line"></div><div class="mem-strip"><span>Postcard</span><small>MEMBER TICKET</small></div>${box(seal('MEMBER TICKET · MEMBER TICKET · '), 1)}</div>`;
    default: return `<div class="face front">${photo}${postage}</div>`;
  }
}
function back(s) {
  const to = esc(s.to.trim() || 'you'), from = esc(s.from.trim() || 'me'), t = cur.t;
  const msg = words(s.message.trim() || 'Thinking of you.');
  const after = `style="--after:${wordCount * 55 + 500}ms"`;
  switch (s.template) {
    case 'classic': return `<div class="face back">
      <div class="c-head"><div class="b-title">Thinking<br>of you</div>${postmark('waves')}</div>
      <div class="b-sub">for ${to}</div>
      <div class="b-msg" style="font-size:${msgSize(4.3)}">${msg}</div>
      <div class="b-sign reveal" ${after}>— ${from}</div></div>`;
    case 'vintage': return `<div class="face back"><div class="grain"></div>
      <div class="v-top">${postmark('round')}${stamp()}</div>
      <div class="b-head">DEAR ${to.toUpperCase()},</div>
      <div class="b-msg" style="font-size:${msgSize(4.7)}">${msg}</div>
      <div class="b-sign reveal" ${after}>love, ${from}</div></div>`;
    case 'stamp': return `<div class="face back">
      ${postmark('round')}
      <div class="b-msg" style="font-size:${msgSize(4.5)}">${msg}</div>
      <div class="b-lines"><div class="ln">to ${to}</div><div class="ln">thinking of you</div><div class="ln reveal" ${after}>love, ${from}</div></div></div>`;
    case 'letter': return `<div class="face back">
      <div class="l-head"><div class="b-title">Post card for ${to}</div>${stamp()}${postmark('waves')}</div>
      <div class="b-msg" style="font-size:${msgSize(7.4)}">${msg}</div>
      <div class="l-foot"><div class="b-field">From: <em>${from}</em></div><div class="b-field">Sent: <em>${t.day} ${t.mon}</em></div>${postmark('round')}</div></div>`;
    case 'cinema': return `<div class="face back"><div class="grain"></div>${cinemaFrame()}
      <div class="cin-orn">${ORN}</div>
      <div class="cin-body"><div class="cin-msg" style="font-size:${msgSize(7)}">${msg}</div><div class="cin-time reveal" ${after}>${t.hm}</div><div class="cin-for reveal" ${after}>for ${to} · from ${from}</div></div>
      <div class="cin-orn">${ORN}</div></div>`;
    case 'gig': return `<div class="face back"><div class="halftone"></div><div class="gig-grid">
      <div class="g-row g-top"><div>${t.wds}<br>${t.day} ${t.mon}</div><div>A postcard for<br>${to}</div><div>Sent at<br>${t.hm}</div></div>
      <div class="g-main"><div class="g-msg" style="font-size:${msgSize(7.6)}">${msg}</div></div>
      <div class="g-row g-bot reveal" ${after}><div>From<br>${from}</div><div>★ One night only ★</div><div>Admit<br>one</div></div></div></div>`;
    case 'stub': return `<div class="face back"><div class="grain"></div>
      <div class="stub-main"><div class="s-date">${t.wd} ${t.day} ${t.mon}</div><div class="s-title">For ${to}</div><div class="s-msg" style="font-size:${msgSize(5.4)}">${msg}</div><div class="s-from reveal" ${after}>From ${from}</div></div>
      <div class="perf"></div><div class="stub-strip"><span>ADMIT ONE</span>${barcode(9)}</div></div>`;
    case 'date': return `<div class="face back"><div class="grain"></div>${dateFrame()}
      <div class="d-strip">• SENT WITH LOVE •</div>
      <div class="d-band"><span class="d-script">for ${to}</span></div>
      <div class="d-msg"><div style="font-size:${msgSize(5.6)}">${msg}</div></div>
      <div class="d-foot reveal" ${after}><div class="d-day"><i>${t.wd}</i><b>${t.mon} ${t.day}<sup>${t.ord}</sup></b></div><div class="d-from">with love,<br><b>${from}</b></div></div>
      <div class="d-strip">• SENT WITH LOVE •</div></div>`;
    case 'member': return `<div class="face back">
      <div class="m-top"><span class="m-eyebrow">✦ Postcard · for ${to}</span><div class="m-msg" style="font-size:${msgSize(7.8)}">${msg}</div></div>
      <div class="mem-line"></div>
      <div class="m-meta reveal" ${after}><div><small>DATE</small>${t.wd},<br>${t.month} ${t.day}</div><div><small>TIME</small>${t.t12}</div><div><small>FROM</small>${from}</div></div></div>`;
  }
  return '';
}
function deckle(seed, H) {
  const r = mulberry(seed); const p = []; const jx = () => r() * 1.6, jy = () => r() * 1.6 * (100 / H);
  for (let x = 0; x <= 100; x += 2.4) p.push(`${x.toFixed(1)}% ${jy().toFixed(2)}%`);
  for (let y = 0; y <= 100; y += 1.6) p.push(`${(100 - jx()).toFixed(2)}% ${y.toFixed(1)}%`);
  for (let x = 100; x >= 0; x -= 2.4) p.push(`${x.toFixed(1)}% ${(100 - jy()).toFixed(2)}%`);
  for (let y = 100; y >= 0; y -= 1.6) p.push(`${jx().toFixed(2)}% ${y.toFixed(1)}%`);
  return `polygon(${p.join(',')})`;
}
function cardHTML(s, { flipped = false, frontOnly = false } = {}) {
  const g = geometry(s.template, s.ratio);
  cur = { s, t: now(s), g };
  const vars = `aspect-ratio:100/${g.H.toFixed(3)};--px:${g.x}cqw;--pt:${g.t}cqw;--pb:${g.b}cqw;--pw:${g.pw}cqw;--ph:${g.ph.toFixed(3)}cqw`;
  return `<div class="card t-${s.template}${flipped ? ' flipped' : ''}" style="${vars}">${front(s)}${frontOnly ? '' : back(s)}</div>`;
}
function mount(el, s, opts) {
  el.innerHTML = cardHTML(s, opts);
  const g = cur.g;
  el.style.setProperty('--ar', (100 / g.H).toFixed(4));
  if (s.template === 'vintage') el.querySelectorAll('.face').forEach((f, i) => { const c = deckle(11 + i * 5, g.H); f.style.clipPath = c; f.style.webkitClipPath = c; });
  const shape = SHAPES[s.template];
  if (shape) el.querySelectorAll('.face').forEach((f, i) => setMask(f, maskURL(shape(g, i), g.W, g.Hu.toFixed(1))));
  if (s.template === 'cinema') {
    const w = g.pw * 3, h = g.ph * 3;
    el.querySelectorAll('.front .photo').forEach((p) => setMask(p, maskURL(concave(w, h, 16, 0), w, h.toFixed(1))));
  }
  return el.firstElementChild;
}
export function lastWordCount() { return wordCount; }
export { cardHTML, mount, esc };
