import { mulberry, clampRatio } from './card.js';

// Sample sunset in portrait 3:4 (drawn, so it needs no download).
export function sampleSunset() {
  const W = 1050, H = 1400;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); const R = mulberry(7); const hz = 820;
  const sky = g.createLinearGradient(0, 0, 0, hz);
  [[0, '#1f2a55'], [0.3, '#4f4686'], [0.58, '#b85b7c'], [0.8, '#ef8f67'], [1, '#ffd49b']].forEach(([s, col]) => sky.addColorStop(s, col));
  g.fillStyle = sky; g.fillRect(0, 0, W, hz);
  const sx = 640, sy = hz - 34;
  const glow = g.createRadialGradient(sx, sy, 0, sx, sy, 640);
  glow.addColorStop(0, 'rgba(255,232,180,.95)'); glow.addColorStop(0.14, 'rgba(255,190,125,.55)'); glow.addColorStop(1, 'rgba(255,140,110,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, hz);
  for (let i = 0; i < 11; i++) { g.fillStyle = `rgba(${110 + R() * 40 | 0},${60 + R() * 30 | 0},${110 + R() * 30 | 0},${0.22 + R() * 0.2})`; g.beginPath(); g.ellipse(R() * W, 140 + R() * 520, 140 + R() * 220, 10 + R() * 16, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#fff4d8'; g.beginPath(); g.arc(sx, sy, 70, 0, Math.PI * 2); g.fill();
  const sea = g.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, '#de8670'); sea.addColorStop(0.2, '#7c4d77'); sea.addColorStop(1, '#171c3a');
  g.fillStyle = sea; g.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 90; i++) { const t = i / 90; const y = hz + 4 + Math.pow(t, 1.5) * (H - hz - 20); const w = (1 - t) * 170 + 30 + R() * 80; g.fillStyle = `rgba(255,222,175,${0.6 * (1 - t)})`; g.fillRect(sx - w / 2 + (R() - 0.5) * 40 * t * 3, y, w, 2 + t * 5); }
  g.fillStyle = '#1b1430'; g.beginPath(); g.moveTo(0, hz - 170); g.bezierCurveTo(110, hz - 210, 200, hz - 120, 290, hz - 80); g.bezierCurveTo(360, hz - 46, 410, hz - 14, 460, hz + 4); g.lineTo(0, hz + 4); g.closePath(); g.fill();
  g.fillRect(170, hz - 262, 18, 110); g.beginPath(); g.moveTo(164, hz - 262); g.lineTo(194, hz - 262); g.lineTo(179, hz - 290); g.fill();
  g.fillStyle = 'rgba(255,230,170,.9)'; g.fillRect(172, hz - 253, 14, 8);
  g.strokeStyle = 'rgba(30,20,45,.8)'; g.lineWidth = 3; g.lineCap = 'round';
  [[780, 300, 1], [850, 345, 0.8], [720, 370, 0.7]].forEach(([x, y, s]) => { g.beginPath(); g.moveTo(x - 18 * s, y - 6 * s); g.quadraticCurveTo(x - 8 * s, y - 10 * s, x, y); g.quadraticCurveTo(x + 8 * s, y - 10 * s, x + 18 * s, y - 6 * s); g.stroke(); });
  return c;
}

export function extractColors(canvas) {
  const s = document.createElement('canvas'); s.width = 40; s.height = 40; const g = s.getContext('2d'); g.drawImage(canvas, 0, 0, 40, 40);
  const d = g.getImageData(0, 0, 40, 40).data; const b = {};
  for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], bb = d[i + 2]; const k = (r >> 5) << 6 | (gg >> 5) << 3 | (bb >> 5); (b[k] || (b[k] = [0, 0, 0, 0])); b[k][0] += r; b[k][1] += gg; b[k][2] += bb; b[k][3]++; }
  const list = Object.values(b).sort((a, c) => c[3] - a[3]).map((v) => [v[0] / v[3], v[1] / v[3], v[2] / v[3]]);
  const pick = []; for (const c of list) { if (pick.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 70)) pick.push(c); if (pick.length === 4) break; }
  while (pick.length < 4) { const p = pick[pick.length - 1] || [60, 50, 80]; pick.push(p.map((v) => Math.min(255, v * 1.3 + 20))); }
  pick.sort((a, c) => (a[0] + a[1] + a[2]) - (c[0] + c[1] + c[2]));
  return pick.map((c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
}

// Link-preview image for chat apps (they need a wide 1200×630 image): the portrait
// postcard tilted on its own colours, with the written back peeking out behind it.
// Kept as a small JPEG because WhatsApp skips preview images much over 300 KB.
export async function makePreviewBlob(photoURL, colors, ratio) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = photoURL; });
  const W = 1200, H = 630, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = colors && colors.length === 4 ? colors : ['#2a2340', '#c4607a', '#f29a6b', '#5b4a8a'];
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, col[2]); bg.addColorStop(0.45, col[1]); bg.addColorStop(1, col[0]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  const pr = clampRatio(ratio || img.naturalWidth / img.naturalHeight);
  const ph = 470, pw = Math.round(ph * pr), pad = 18;
  const cw = pw + pad * 2, ch = ph + pad * 2;

  // back of the card, behind and to the right
  g.save();
  g.translate(W / 2 + 70, H / 2 + 6);
  g.rotate(7 * Math.PI / 180);
  g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  g.fillStyle = '#f8f0da'; g.fillRect(-cw / 2, -ch / 2, cw, ch);
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(60,48,30,.28)'; g.lineWidth = 2;
  for (let y = -ch / 2 + 150; y < ch / 2 - 40; y += 42) { g.beginPath(); g.moveTo(-cw / 2 + 40, y); g.lineTo(cw / 2 - 40, y); g.stroke(); }
  g.restore();

  // front of the card
  g.save();
  g.translate(W / 2 - 50, H / 2);
  g.rotate(-4 * Math.PI / 180);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 60; g.shadowOffsetY = 26;
  g.fillStyle = '#f8f0da'; g.fillRect(-cw / 2, -ch / 2, cw, ch);
  g.shadowColor = 'transparent';
  const k = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
  const sw = pw / k, sh = ph / k;
  g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, -pw / 2, -ph / 2, pw, ph);
  // round stamp with a heart, top right of the photo
  g.translate(pw / 2 - 66, -ph / 2 + 66);
  g.rotate(10 * Math.PI / 180);
  g.strokeStyle = 'rgba(255,250,240,.95)';
  g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 46, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 35, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,250,240,.95)';
  g.beginPath(); g.moveTo(0, 15);
  g.bezierCurveTo(-23, 0, -18, -18, 0, -9);
  g.bezierCurveTo(18, -18, 23, 0, 0, 15);
  g.fill();
  g.restore();

  for (const q of [0.82, 0.72, 0.6, 0.5]) {
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
    if (blob && blob.size < 260 * 1024) return blob;
    if (q === 0.5) return blob;
  }
}
